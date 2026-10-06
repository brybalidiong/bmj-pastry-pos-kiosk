// Order-page rendering and interactions. Inventory and draft-cart rules live in order-store.js.
(() => {
  'use strict';

  const store = window.BMJPOS;
  const products = store.getProducts();
  const byId = new Map(products.map((product) => [product.id, product]));
  const grid = document.getElementById('product-grid');
  const search = document.getElementById('catalog-search-input');
  const resultCount = document.getElementById('catalog-result-count');
  const emptyResults = document.getElementById('catalog-empty');
  const categoryRow = document.querySelector('.chip-row');
  const cartItems = document.getElementById('cart-items');
  const cartCount = document.getElementById('cart-count');
  const cartTotal = document.getElementById('cart-total');
  const feedback = document.getElementById('cart-feedback');
  const reviewLink = document.getElementById('review-link');
  const money = new Intl.NumberFormat('en-PH', { style: 'currency', currency: 'PHP' });
  let category = 'All';

  function element(tag, className, content) {
    const node = document.createElement(tag);
    if (className) node.className = className;
    if (content !== undefined) node.textContent = content;
    return node;
  }

  function normalized(value) {
    return value.toLocaleLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
  }

  function renderProducts() {
    const quantities = new Map(store.getCart().items.map((item) => [item.productId, item.quantity]));
    const term = normalized(search.value.trim());
    const visible = products.filter((product) =>
      (category === 'All' || product.category === category) &&
      (!term || normalized(product.name + ' ' + product.category).includes(term))
    );
    const fragment = document.createDocumentFragment();

    visible.forEach((product) => {
      const quantity = quantities.get(product.id) || 0;
      const available = store.getAvailableStock(product.id);
      const soldOut = available === 0 && quantity === 0;
      const limitReached = available === 0 && quantity > 0;
      const card = element('button', 'product-card' + (quantity ? ' is-selected' : '') +
        (soldOut ? ' is-sold-out' : '') + (limitReached ? ' is-limit-reached' : ''));
      card.type = 'button';
      card.dataset.productId = product.id;
      card.disabled = available === 0;
      card.setAttribute('aria-label', `${product.name}, ${money.format(product.price)}, ` +
        (soldOut ? 'sold out' : limitReached ? `${quantity} in cart, no more available` : `${available} available, add to order`));

      if (quantity > 0) card.append(element('span', 'product-count', String(quantity)));
      const art = element('span', 'product-art');
      art.style.setProperty('--art-bg', product.artBg);
      const emoji = element('span', 'product-emoji', product.emoji);
      emoji.setAttribute('aria-hidden', 'true');
      art.append(emoji);
      card.append(art);

      const meta = element('span', 'product-meta');
      meta.append(element('span', 'product-category', product.category));
      meta.append(element('span', 'product-stock stock-badge',
        soldOut ? 'Sold out' : limitReached ? 'All in your cart' : `${available} available`));
      card.append(meta);

      const bottom = element('span', 'product-bottom');
      bottom.append(element('span', 'product-name', product.name));
      bottom.append(element('span', 'product-price', money.format(product.price)));
      card.append(bottom);
      fragment.append(card);
    });

    grid.replaceChildren(fragment);
    emptyResults.hidden = visible.length !== 0;
    resultCount.textContent = `${visible.length} product${visible.length === 1 ? '' : 's'}`;
  }

  function cartAction(label, action, product, content, extraClass = '') {
    const button = element('button', 'touch-button' + (extraClass ? ' ' + extraClass : ''), content);
    button.type = 'button';
    button.dataset.action = action;
    button.dataset.productId = product.id;
    button.setAttribute('aria-label', `${label} ${product.name}`);
    return button;
  }

  function renderCart() {
    const cart = store.getCart();
    const fragment = document.createDocumentFragment();

    if (cart.items.length === 0) {
      const empty = element('div', 'empty-cart');
      const icon = element('span', 'empty-cart-icon', '🛒');
      icon.setAttribute('aria-hidden', 'true');
      empty.append(icon, element('strong', '', 'Your order is empty'),
        element('p', '', 'Tap a product to add it to your order.'));
      fragment.append(empty);
    } else {
      cart.items.forEach((item) => {
        const product = byId.get(item.productId);
        if (!product) return;
        const row = element('div', 'cart-item');
        row.dataset.productId = product.id;
        const top = element('div', 'cart-item-top');
        const details = element('div');
        const art = element('span', 'cart-item-art', product.emoji);
        art.setAttribute('aria-hidden', 'true');
        const labels = element('span');
        labels.append(element('strong', '', product.name),
          element('small', '', `${money.format(item.unitPrice)} each`));
        details.append(art, labels);
        top.append(details, cartAction('Remove', 'remove', product, '×', 'remove'));

        const bottom = element('div', 'cart-item-bottom');
        const controls = element('div', 'qty-control');
        controls.append(cartAction('Decrease', 'decrease', product, '−'),
          element('span', '', String(item.quantity)));
        const increase = cartAction('Increase', 'increase', product, '+', 'plus');
        increase.disabled = store.getAvailableStock(product.id) === 0;
        if (increase.disabled) increase.setAttribute('aria-label', `${product.name} quantity limit reached`);
        controls.append(increase);
        bottom.append(controls, element('span', 'line-price', money.format(item.lineSubtotal)));
        row.append(top, bottom);
        fragment.append(row);
      });
    }

    cartItems.replaceChildren(fragment);
    cartCount.textContent = `${cart.itemCount} item${cart.itemCount === 1 ? '' : 's'}`;
    cartTotal.textContent = money.format(cart.total);
    reviewLink.classList.toggle('is-disabled', cart.itemCount === 0);
    reviewLink.setAttribute('aria-disabled', String(cart.itemCount === 0));
  }

  function render() {
    renderProducts();
    renderCart();
  }

  function setFeedback(message, isError = false) {
    feedback.textContent = message;
    feedback.classList.toggle('is-error', isError);
  }

  function updateCart(action, productId) {
    const product = byId.get(productId);
    if (!product) return;
    try {
      if (action === 'add') store.addItem(productId);
      if (action === 'increase') store.changeQuantity(productId, 1);
      if (action === 'decrease') store.changeQuantity(productId, -1);
      if (action === 'remove') store.removeItem(productId);
      render();
      const verb = action === 'add' || action === 'increase' ? 'added to' :
        action === 'remove' ? 'removed from' : 'reduced in';
      setFeedback(`${product.name} ${verb} your order.`);
      if (action !== 'add') {
        const next = cartItems.querySelector(`[data-product-id="${productId}"] [data-action="${action}"]`) ||
          grid.querySelector(`[data-product-id="${productId}"]`);
        if (next && !next.disabled) next.focus({ preventScroll: true });
      }
    } catch (error) {
      setFeedback(error.message || 'Could not update your order.', true);
      render();
    }
  }

  grid.addEventListener('click', (event) => {
    const card = event.target.closest('.product-card');
    if (card && !card.disabled) updateCart('add', card.dataset.productId);
  });

  cartItems.addEventListener('click', (event) => {
    const button = event.target.closest('[data-action]');
    if (button && !button.disabled) updateCart(button.dataset.action, button.dataset.productId);
  });

  search.addEventListener('input', renderProducts);
  categoryRow.addEventListener('click', (event) => {
    const chip = event.target.closest('[data-category]');
    if (!chip) return;
    category = chip.dataset.category;
    categoryRow.querySelectorAll('[data-category]').forEach((button) => {
      const active = button === chip;
      button.classList.toggle('is-active', active);
      button.setAttribute('aria-pressed', String(active));
    });
    renderProducts();
  });

  reviewLink.addEventListener('click', (event) => {
    if (store.getCart().itemCount === 0) {
      event.preventDefault();
      setFeedback('Add an item before reviewing your order.', true);
    }
  });

  window.addEventListener('storage', (event) => {
    if (event.key === store.CART_KEY || event.key === store.INVENTORY_KEY) {
      render();
      setFeedback('Order and availability updated.');
    }
  });

  render();
  if (store.getCart().itemCount > 0) setFeedback('Your saved order is ready to continue.');
})();
