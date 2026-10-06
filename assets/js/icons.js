// BMJ picnic icon set: one consistent outline style, rendered locally without fonts.
(() => {
  'use strict';
  const paths = Object.freeze({
  "basket": "<path d=\"M3 10h18l-2 11H5L3 10Z M7 10l3-7 M17 10l-3-7 M8 14v3 M12 14v3 M16 14v3\"/>",
  "bread": "<path d=\"M5 20V9a7 7 0 0 1 14 0v11H5Z M8 9l2-2 M11 12l2-2 M14 15l2-2\"/>",
  "croissant": "<path d=\"M3 18c1-6 3-11 9-11s8 5 9 11l-5-2c-2 2-6 2-8 0l-5 2Z M8 8l-1 7 M16 8l1 7 M12 7v9\"/>",
  "pastry": "<path d=\"M5 5h14v14H5Z M5 5l4 4 M19 5l-4 4 M5 19l4-4 M19 19l-4-4\"/><circle cx=\"12\" cy=\"12\" r=\"4\"/>",
  "cake": "<path d=\"m4 11 12-6 4 6v9H4v-9Z M4 11h16 M4 16h16 M16 5V3\"/>",
  "cup": "<path d=\"M4 8h12v9a3 3 0 0 1-3 3H7a3 3 0 0 1-3-3V8Z M16 10h2a3 3 0 0 1 0 6h-2 M7 3v2 M11 2v3\"/>",
  "search": "<circle cx=\"10\" cy=\"10\" r=\"6\"/><path d=\"m15 15 5 5\"/>",
  "cash": "<rect x=\"2\" y=\"5\" width=\"20\" height=\"14\" rx=\"2\"/><circle cx=\"12\" cy=\"12\" r=\"3\"/><path d=\"M5 9v6 M19 9v6\"/>",
  "qr": "<path d=\"M3 3h6v6H3Z M15 3h6v6h-6Z M3 15h6v6H3Z M15 15h3v3h3v3h-6v-3 M21 12v3 M12 3v3 M12 12h3 M12 18v3\"/>",
  "card": "<rect x=\"2\" y=\"4\" width=\"20\" height=\"16\" rx=\"2\"/><path d=\"M2 9h20 M6 15h4 M15 15h3\"/>",
  "check": "<path d=\"m5 12 4 4L19 6\"/>",
  "contactless": "<path d=\"M7 8a6 6 0 0 1 0 8 M11 5a10 10 0 0 1 0 14 M15 2a14 14 0 0 1 0 20\"/>",
  "trash": "<path d=\"M3 6h18 M8 6V3h8v3 M5 6l1 15h12l1-15 M10 10v7 M14 10v7\"/>",
  "plus": "<path d=\"M12 5v14 M5 12h14\"/>",
  "minus": "<path d=\"M5 12h14\"/>",
  "backspace": "<path d=\"M9 5h12v14H9l-7-7 7-7Z M12 9l6 6 M18 9l-6 6\"/>",
  "arrow-right": "<path d=\"M4 12h16 M14 6l6 6-6 6\"/>",
  "arrow-left": "<path d=\"M20 12H4 M10 6l-6 6 6 6\"/>",
  "print": "<path d=\"M6 8V3h12v5 M6 17H3V8h18v9h-3 M6 14h12v7H6Z M17 11h1\"/>"
});
  function svg(name) {
    const path = paths[name] || paths.basket;
    return '<svg class="picnic-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.65" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" focusable="false">' + path + '</svg>';
  }
  function create(name) {
    const wrapper = document.createElement('span');
    wrapper.innerHTML = svg(name);
    return wrapper.firstElementChild;
  }
  window.BMJIcons = Object.freeze({ svg, create });
  document.querySelectorAll('[data-icon]').forEach(node => {
    node.replaceChildren(create(node.dataset.icon));
  });
})();
