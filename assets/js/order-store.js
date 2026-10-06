/*
 * Checkout integration contract (load products.js before this non-module script):
 *
 * window.BMJPOS.CART_KEY === 'bmjPosCart.v1'. The JSON at that localStorage key
 * is the current draft and is directly readable by checkout. Its shape is:
 * {
 *   version: 1, orderId: 'BMJ-...', status: 'draft', currency: 'PHP',
 *   updatedAt: ISO-8601 string,
 *   items: [{ productId, name, category, unitPrice, quantity, lineSubtotal }],
 *   itemCount: number, total: number
 * }
 * Prices, line subtotals, and total are numbers in whole Philippine pesos.
 * itemCount is the sum of quantities, not the count of distinct product lines.
 * The draft's orderId remains stable as the customer edits the cart.
 * getCart() also returns this shape and creates an empty draft when needed.
 *
 * The draft only reserves stock for display on this order page. On confirmed
 * payment, checkout must call window.BMJPOS.finalizeSale(cart.orderId) ONCE.
 * That call rechecks stock, writes the completed sale and reduced stock under
 * INVENTORY_KEY, and clears the draft. Repeating it with the same orderId is
 * safe and returns alreadyFinalized: true. If checkout is cancelled, call
 * abandonOrder(); it clears the draft without touching permanent inventory.
 * Never call finalizeSale when merely navigating to order review/payment.
 *
 * INVENTORY_KEY is 'bmjPosInventory.v1'. It contains
 * {version:1, updatedAt, stockByProductId:{id:qty}, completedOrders:{orderId:sale}}.
 * A sale is {orderId,status:'completed',completedAt,currency,items,itemCount,total}.
 * This browser-local implementation is appropriate for a single kiosk demo.
 * A shared deployment should implement finalizeSale as one backend transaction
 * using orderId as its idempotency key so multiple kiosks cannot oversell.
 */
(function () {
  'use strict';

  const CART_KEY = 'bmjPosCart.v1';
  const INVENTORY_KEY = 'bmjPosInventory.v1';
  const VERSION = 1;
  const CURRENCY = 'PHP';
  const catalog = window.BMJ_PRODUCTS;

  if (!Array.isArray(catalog)) {
    throw new Error('BMJPOS needs products.js to load before order-store.js.');
  }

  const productsById = new Map();
  for (const product of catalog) {
    if (!product || typeof product.id !== 'string' || !/^[a-z0-9-]+$/.test(product.id) ||
        typeof product.name !== 'string' || !product.name.trim() ||
        typeof product.category !== 'string' || !product.category.trim() ||
        !Number.isSafeInteger(product.price) || product.price < 0 ||
        !Number.isSafeInteger(product.baseStock) || product.baseStock < 0 ||
        typeof product.emoji !== 'string' || typeof product.artBg !== 'string' ||
        productsById.has(product.id)) {
      throw new Error('products.js contains an invalid or duplicate product.');
    }
    productsById.set(product.id, product);
  }

  function storage() {
    try {
      const result = window.localStorage;
      if (!result) throw new Error('localStorage is unavailable');
      return result;
    } catch (cause) {
      throw new Error('Browser storage is unavailable. Open the POS through a local web server and allow site storage.');
    }
  }

  function readJson(key) {
    let raw;
    try {
      raw = storage().getItem(key);
    } catch (cause) {
      throw new Error('Cannot read browser storage. Check site storage permissions and try again.');
    }
    if (raw === null) return null;
    try {
      const parsed = JSON.parse(raw);
      if (parsed === null) throw new Error('null is not a POS record');
      return parsed;
    } catch (cause) {
      throw new Error('Saved POS data at "' + key + '" is damaged JSON. Ask staff to repair or clear that key.');
    }
  }

  function writeJson(key, value) {
    try {
      storage().setItem(key, JSON.stringify(value));
    } catch (cause) {
      throw new Error('Could not save POS data. Check available browser storage before continuing.');
    }
  }

  function removeKey(key) {
    try {
      storage().removeItem(key);
    } catch (cause) {
      throw new Error('Could not clear the draft cart. Check browser storage permissions.');
    }
  }

  function isRecord(value) {
    return value !== null && typeof value === 'object' && !Array.isArray(value);
  }

  function isIsoDate(value) {
    return typeof value === 'string' && !Number.isNaN(Date.parse(value));
  }

  function clone(value) {
    return JSON.parse(JSON.stringify(value));
  }

  function requireProduct(id) {
    const product = typeof id === 'string' ? productsById.get(id) : undefined;
    if (!product) throw new Error('Unknown product ID: ' + String(id) + '. Refresh the menu and try again.');
    return product;
  }

  function assertLine(item, context, matchCatalog) {
    if (!isRecord(item) || typeof item.productId !== 'string' ||
        !/^[a-z0-9-]+$/.test(item.productId) ||
        typeof item.name !== 'string' || !item.name.trim() ||
        typeof item.category !== 'string' || !item.category.trim() ||
        !Number.isSafeInteger(item.unitPrice) || item.unitPrice < 0) {
      throw new Error(context + ' has an invalid item.');
    }
    if (!Number.isSafeInteger(item.quantity) || item.quantity < 1 ||
        !Number.isSafeInteger(item.lineSubtotal) ||
        item.lineSubtotal !== item.unitPrice * item.quantity) {
      throw new Error(context + ' has invalid quantity or subtotal for ' + item.name + '.');
    }
    if (matchCatalog) {
      const product = requireProduct(item.productId);
      if (item.name !== product.name || item.category !== product.category ||
          item.unitPrice !== product.price) {
        throw new Error(context + ' has outdated item data for ' + product.name + '. Ask staff to repair the saved cart.');
      }
    }
  }

  function assertItemsAndTotals(value, context, matchCatalog) {
    if (!Array.isArray(value.items) || !Number.isSafeInteger(value.itemCount) ||
        !Number.isSafeInteger(value.total) || value.itemCount < 0 || value.total < 0) {
      throw new Error(context + ' has invalid totals or items.');
    }
    const seen = new Set();
    let itemCount = 0;
    let total = 0;
    for (const item of value.items) {
      assertLine(item, context, matchCatalog);
      if (seen.has(item.productId)) throw new Error(context + ' has a duplicate product line.');
      seen.add(item.productId);
      itemCount += item.quantity;
      total += item.lineSubtotal;
    }
    if (!Number.isSafeInteger(itemCount) || !Number.isSafeInteger(total) ||
        value.itemCount !== itemCount || value.total !== total) {
      throw new Error(context + ' totals do not match its item quantities.');
    }
  }

  function assertDraft(cart) {
    if (!isRecord(cart) || cart.version !== VERSION ||
        typeof cart.orderId !== 'string' || !/^BMJ-[A-Za-z0-9-]+$/.test(cart.orderId) ||
        cart.status !== 'draft' || cart.currency !== CURRENCY ||
        !isIsoDate(cart.updatedAt)) {
      throw new Error('Saved draft cart is invalid. Ask staff to repair or clear ' + CART_KEY + '.');
    }
    assertItemsAndTotals(cart, 'Saved draft cart', true);
    return cart;
  }

  function assertSale(sale, id) {
    if (!isRecord(sale) || sale.orderId !== id || sale.status !== 'completed' ||
        sale.currency !== CURRENCY || !isIsoDate(sale.completedAt)) {
      throw new Error('Saved completed sale ' + id + ' is invalid. Ask staff to inspect ' + INVENTORY_KEY + '.');
    }
    // Completed orders retain their original item and price snapshots even if
    // the menu changes later.
    assertItemsAndTotals(sale, 'Saved completed sale ' + id, false);
  }

  function inventory() {
    const value = readJson(INVENTORY_KEY);
    if (value === null) {
      return { version: VERSION, updatedAt: new Date().toISOString(), stockByProductId: {}, completedOrders: {} };
    }
    if (!isRecord(value) || value.version !== VERSION || !isIsoDate(value.updatedAt) ||
        !isRecord(value.stockByProductId) || !isRecord(value.completedOrders)) {
      throw new Error('Saved inventory is invalid. Ask staff to inspect ' + INVENTORY_KEY + '.');
    }
    for (const [id, quantity] of Object.entries(value.stockByProductId)) {
      requireProduct(id);
      if (!Number.isSafeInteger(quantity) || quantity < 0) {
        throw new Error('Saved inventory has invalid stock for ' + id + '.');
      }
    }
    for (const [id, sale] of Object.entries(value.completedOrders)) assertSale(sale, id);
    return value;
  }

  function committedStock(product, savedInventory) {
    return Object.prototype.hasOwnProperty.call(savedInventory.stockByProductId, product.id)
      ? savedInventory.stockByProductId[product.id]
      : product.baseStock;
  }

  function newOrderId() {
    const random = window.crypto && typeof window.crypto.randomUUID === 'function'
      ? window.crypto.randomUUID().replace(/-/g, '')
      : Math.random().toString(36).slice(2, 12);
    return 'BMJ-' + Date.now() + '-' + random;
  }

  function emptyDraft() {
    return {
      version: VERSION,
      orderId: newOrderId(),
      status: 'draft',
      currency: CURRENCY,
      updatedAt: new Date().toISOString(),
      items: [],
      itemCount: 0,
      total: 0,
    };
  }

  function draft() {
    const saved = readJson(CART_KEY);
    if (saved === null) {
      const fresh = emptyDraft();
      writeJson(CART_KEY, fresh);
      return fresh;
    }
    assertDraft(saved);
    const savedInventory = inventory();
    if (Object.prototype.hasOwnProperty.call(savedInventory.completedOrders, saved.orderId)) {
      // Inventory commit succeeded but draft clearing was interrupted.
      removeKey(CART_KEY);
      const fresh = emptyDraft();
      writeJson(CART_KEY, fresh);
      return fresh;
    }
    return saved;
  }

  function withTotals(cart, items) {
    return {
      ...cart,
      updatedAt: new Date().toISOString(),
      items,
      itemCount: items.reduce((sum, item) => sum + item.quantity, 0),
      total: items.reduce((sum, item) => sum + item.lineSubtotal, 0),
    };
  }

  function lineFor(product, quantity) {
    return {
      productId: product.id,
      name: product.name,
      category: product.category,
      unitPrice: product.price,
      quantity,
      lineSubtotal: product.price * quantity,
    };
  }

  function getProducts() {
    return catalog.map((product) => ({ ...product }));
  }

  function getCart() {
    return clone(draft());
  }

  function getAvailableStock(id) {
    const product = requireProduct(id);
    const savedInventory = inventory();
    const cart = draft();
    const inCart = cart.items.find((item) => item.productId === id);
    return Math.max(0, committedStock(product, savedInventory) - (inCart ? inCart.quantity : 0));
  }

  function addItem(id) {
    const product = requireProduct(id);
    if (getAvailableStock(id) < 1) {
      throw new Error(product.name + ' is sold out or all available stock is already in your cart.');
    }
    const cart = draft();
    const existing = cart.items.find((item) => item.productId === id);
    const items = existing
      ? cart.items.map((item) => item.productId === id ? lineFor(product, item.quantity + 1) : item)
      : [...cart.items, lineFor(product, 1)];
    const updated = withTotals(cart, items);
    assertDraft(updated);
    writeJson(CART_KEY, updated);
    return clone(updated);
  }

  function changeQuantity(id, delta) {
    const product = requireProduct(id);
    if (!Number.isSafeInteger(delta) || delta === 0) {
      throw new Error('Quantity change must be a nonzero whole number.');
    }
    const cart = draft();
    const existing = cart.items.find((item) => item.productId === id);
    if (!existing) throw new Error(product.name + ' is not in the cart.');
    const nextQuantity = existing.quantity + delta;
    if (!Number.isSafeInteger(nextQuantity) || nextQuantity < 0) {
      throw new Error('Cannot reduce ' + product.name + ' below zero.');
    }
    if (delta > 0 && getAvailableStock(id) < delta) {
      throw new Error('Only ' + getAvailableStock(id) + ' more ' + product.name + ' available.');
    }
    const items = nextQuantity === 0
      ? cart.items.filter((item) => item.productId !== id)
      : cart.items.map((item) => item.productId === id ? lineFor(product, nextQuantity) : item);
    const updated = withTotals(cart, items);
    assertDraft(updated);
    writeJson(CART_KEY, updated);
    return clone(updated);
  }

  function removeItem(id) {
    const product = requireProduct(id);
    const cart = draft();
    if (!cart.items.some((item) => item.productId === id)) {
      throw new Error(product.name + ' is not in the cart.');
    }
    const updated = withTotals(cart, cart.items.filter((item) => item.productId !== id));
    assertDraft(updated);
    writeJson(CART_KEY, updated);
    return clone(updated);
  }

  function abandonOrder() {
    const cart = draft();
    removeKey(CART_KEY);
    return { ...clone(cart), status: 'abandoned', updatedAt: new Date().toISOString() };
  }

  function finalizeSale(orderId) {
    if (typeof orderId !== 'string' || !/^BMJ-[A-Za-z0-9-]+$/.test(orderId)) {
      throw new Error('Provide the draft cart orderId when finalizing a completed sale.');
    }
    const savedInventory = inventory();
    if (Object.prototype.hasOwnProperty.call(savedInventory.completedOrders, orderId)) {
      const saved = savedInventory.completedOrders[orderId];
      const rawDraft = readJson(CART_KEY);
      if (rawDraft && rawDraft.orderId === orderId) removeKey(CART_KEY);
      return { ...clone(saved), alreadyFinalized: true };
    }
    const cart = draft();
    if (cart.orderId !== orderId) {
      throw new Error('Order ID does not match the active draft cart. Reload checkout and use its current orderId.');
    }
    if (cart.items.length === 0) throw new Error('Cannot finalize an empty cart.');

    const nextStock = { ...savedInventory.stockByProductId };
    for (const item of cart.items) {
      const product = requireProduct(item.productId);
      const remaining = committedStock(product, savedInventory);
      if (item.quantity > remaining) {
        throw new Error('Insufficient stock for ' + product.name + ': ' + remaining + ' remains. Adjust the cart before charging.');
      }
      nextStock[product.id] = remaining - item.quantity;
    }

    const sale = {
      orderId,
      status: 'completed',
      completedAt: new Date().toISOString(),
      currency: CURRENCY,
      items: clone(cart.items),
      itemCount: cart.itemCount,
      total: cart.total,
    };
    // One localStorage write commits both the stock and idempotency record.
    writeJson(INVENTORY_KEY, {
      version: VERSION,
      updatedAt: sale.completedAt,
      stockByProductId: nextStock,
      completedOrders: { ...savedInventory.completedOrders, [orderId]: sale },
    });
    removeKey(CART_KEY);
    return { ...clone(sale), alreadyFinalized: false };
  }

  window.BMJPOS = Object.freeze({
    CART_KEY,
    INVENTORY_KEY,
    getProducts,
    getCart,
    getAvailableStock,
    addItem,
    changeQuantity,
    removeItem,
    abandonOrder,
    finalizeSale,
  });
})();
