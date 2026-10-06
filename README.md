# BMJ Pastry POS

Static HTML/CSS preview for a touchscreen pastry-shop web kiosk. Open
index.html in a browser. No package installation or backend is needed to
preview the layout.

The screens follow the format shown in IT415 - Sample UI.pdf: a product grid
beside the cart, an order review, large payment choices, touch-sized payment
controls, confirmation, and a digital receipt. The visual design follows the
team's Online Invigilation System: Poppins, navy #1D3461, pale #f4f7fb,
rounded white cards, and restrained shadows.

The order screen also takes layout inspiration from the supplied cafe POS image:
a left checkout rail on wide kiosk screens, a contained menu with search and
category controls, product cards, and a separate cart summary. The same pastry
items, prices, order total, and checkout screens remain in place. On narrow
screens, the rail becomes the top progress header. Search is a visual preview.

## Preview screens

- index.html: populated sample order
- new-transaction.html: empty order after a reset
- order-summary.html: review table
- payment-method.html: cash, QR, and card choices
- payment-processing.html: cash keypad and quick amounts
- payment-processing.html?state=insufficient: insufficient cash example
- qr-payment.html: QR placeholder and instructions
- card-payment.html: card reader and processing example
- payment-success.html: confirmation
- receipt.html: digital receipt

All amounts and transaction details are sample data. The product cards, cart
controls, keypad, payment actions, and print control are visual previews. Page
links allow the team to inspect the flow; no order or payment is recorded.

## Shared files and planned feature ownership

- assets/styles.css and assets/shell.js: shared kiosk shell, typography, colors,
  progress navigation, and sample-state display.
- feature/catalog-cart: index.html, new-transaction.html, assets/catalog.css.
- feature/checkout-payments: order-summary.html, payment-method.html,
  payment-processing.html, qr-payment.html, card-payment.html, assets/checkout.css.
- feature/sales-receipts: payment-success.html, receipt.html, assets/receipts.css.

The common shell is kept on main so the three feature branches can work in
separate files.
