// BMJ Pastry's kiosk catalog. Prices are whole Philippine pesos.
// baseStock is the initial physical stock; items in a draft cart do not change it.
window.BMJ_PRODUCTS = Object.freeze([
  { id: 'butter-croissant', name: 'Butter Croissant', category: 'Pastries', price: 85, baseStock: 12, emoji: '🥐', artBg: '#fff0dc' },
  { id: 'chocolate-croissant', name: 'Chocolate Croissant', category: 'Pastries', price: 95, baseStock: 10, emoji: '🥐', artBg: '#f3e9e5' },
  { id: 'cinnamon-roll', name: 'Cinnamon Roll', category: 'Pastries', price: 90, baseStock: 9, emoji: '🍩', artBg: '#f6e6dd' },
  { id: 'blueberry-danish', name: 'Blueberry Danish', category: 'Pastries', price: 105, baseStock: 8, emoji: '🫐', artBg: '#e6edfc' },
  { id: 'chocolate-eclair', name: 'Chocolate Éclair', category: 'Desserts', price: 110, baseStock: 7, emoji: '🍫', artBg: '#efe4de' },
  { id: 'mini-cheesecake', name: 'Mini Cheesecake', category: 'Desserts', price: 125, baseStock: 6, emoji: '🍰', artBg: '#f7e7ee' },
  { id: 'sourdough-loaf', name: 'Sourdough Loaf', category: 'Breads', price: 160, baseStock: 7, emoji: '🍞', artBg: '#f6ead9' },
  { id: 'garlic-bread', name: 'Garlic Bread', category: 'Breads', price: 95, baseStock: 9, emoji: '🥖', artBg: '#f3eedc' },
  { id: 'milk-bread', name: 'Milk Bread', category: 'Breads', price: 75, baseStock: 12, emoji: '🍞', artBg: '#f8e9dd' },
  { id: 'americano', name: 'Americano', category: 'Coffee', price: 100, baseStock: 15, emoji: '☕', artBg: '#eaded8' },
  { id: 'cafe-latte', name: 'Café Latte', category: 'Coffee', price: 130, baseStock: 10, emoji: '☕', artBg: '#efe4d6' },
  { id: 'iced-mocha', name: 'Iced Mocha', category: 'Coffee', price: 145, baseStock: 0, emoji: '🧋', artBg: '#e7dfdf' },
].map((product) => Object.freeze({
  ...product,
  image: 'assets/images/products/' + product.id + '.jpg',
})));
