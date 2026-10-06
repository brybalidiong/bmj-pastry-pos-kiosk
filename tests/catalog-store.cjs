const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

function kiosk(saved = new Map()) {
  const localStorage = {
    getItem: key => saved.has(key) ? saved.get(key) : null,
    setItem: (key, value) => saved.set(key, String(value)),
    removeItem: key => saved.delete(key),
  };
  const context = vm.createContext({ window: { localStorage } });
  for (const name of ['products.js', 'order-store.js']) {
    vm.runInContext(fs.readFileSync(path.join(__dirname, '..', 'assets', 'js', name), 'utf8'), context, { filename: name });
  }
  return { store: context.window.BMJPOS, saved };
}

const { store, saved } = kiosk();
const products = store.getProducts();
assert.equal(products.length, 12);
for (const name of ['Butter Croissant', 'Chocolate Croissant', 'Cinnamon Roll', 'Blueberry Danish', 'Chocolate Éclair', 'Mini Cheesecake']) {
  assert.ok(products.some(product => product.name === name), `${name} remains in the menu`);
}
for (const category of ['Pastries', 'Desserts', 'Breads', 'Coffee']) {
  assert.ok(products.some(product => product.category === category), `${category} is available`);
}

const croissant = products.find(product => product.name === 'Butter Croissant');
const soldOut = products.find(product => product.baseStock === 0);
assert.equal(store.getAvailableStock(soldOut.id), 0);
assert.throws(() => store.addItem(soldOut.id), /sold out|available stock/);

const original = store.getAvailableStock(croissant.id);
store.addItem(croissant.id);
store.addItem(croissant.id);
let cart = store.getCart();
assert.equal(cart.itemCount, 2);
assert.equal(cart.items[0].quantity, 2);
assert.equal(cart.items[0].lineSubtotal, 170);
assert.equal(cart.total, 170);
assert.equal(store.getAvailableStock(croissant.id), original - 2);
assert.equal(JSON.parse(saved.get(store.CART_KEY)).total, 170);
assert.equal(kiosk(saved).store.getCart().total, 170, 'saved cart survives a script reload');
assert.equal(saved.has(store.INVENTORY_KEY), false, 'draft does not commit inventory');

store.changeQuantity(croissant.id, -1);
assert.equal(store.getAvailableStock(croissant.id), original - 1);
store.removeItem(croissant.id);
assert.equal(store.getAvailableStock(croissant.id), original);
assert.equal(store.getCart().itemCount, 0);

for (let index = 0; index < original; index++) store.addItem(croissant.id);
assert.equal(store.getAvailableStock(croissant.id), 0);
assert.throws(() => store.addItem(croissant.id), /sold out|available stock/);
assert.throws(() => store.changeQuantity(croissant.id, 1), /available/);
store.abandonOrder();
assert.equal(store.getAvailableStock(croissant.id), original);
assert.equal(saved.has(store.INVENTORY_KEY), false, 'abandonment does not commit inventory');

store.addItem(croissant.id);
cart = store.getCart();
const sale = store.finalizeSale(cart.orderId, { simulated: true, method: 'card', paidCentavos: 8500, changeCentavos: 0 });
assert.equal(sale.status, 'completed');
assert.equal(sale.total, 85);
assert.equal(store.getAvailableStock(croissant.id), original - 1);
assert.equal(store.getCart().itemCount, 0);
assert.equal(store.getSale(cart.orderId).payment.method, 'card');
assert.equal(store.finalizeSale(cart.orderId).alreadyFinalized, true);
assert.equal(store.getAvailableStock(croissant.id), original - 1, 'retry must not deduct again');

console.log('PASS catalog, draft totals, stock limits/restoration, abandonment, sale commit and idempotency');
