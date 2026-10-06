# BMJ Pastry POS

Static HTML/CSS preview for a touchscreen pastry-shop web kiosk. Open
`index.html` in a browser. No package installation or backend is needed to
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

- `index.html`: populated sample order
- `pages/new-transaction.html`: empty order after a reset
- `pages/order-summary.html`: review table
- `pages/payment-method.html`: cash, QR, and card choices
- `pages/payment-processing.html`: cash keypad and quick amounts
- `pages/payment-processing.html?state=insufficient`: insufficient cash example
- `pages/qr-payment.html`: QR placeholder and instructions
- `pages/card-payment.html`: card reader and processing example
- `pages/payment-success.html`: confirmation
- `pages/receipt.html`: digital receipt

All amounts and transaction details are sample data. The product cards, cart
controls, keypad, payment actions, and print control are visual previews. Page
links allow the team to inspect the flow; no order or payment is recorded.

## Project structure

```text
IT415-Midterms/
├── index.html                 # kiosk entry screen
├── pages/                    # remaining checkout screens
├── assets/
│   ├── css/                  # shared styles and feature styles
│   └── js/                   # shared page shell and preview state
├── .gitignore
└── README.md
```

## Shared files and planned feature ownership

- `assets/css/styles.css` and `assets/js/shell.js`: shared kiosk shell, typography, colors,
  progress navigation, and sample-state display.
- `feature/catalog-cart`: `index.html`, `pages/new-transaction.html`,
  `assets/css/catalog.css`.
- `feature/checkout-payments`: `pages/order-summary.html`,
  `pages/payment-method.html`, `pages/payment-processing.html`,
  `pages/qr-payment.html`, `pages/card-payment.html`, `assets/css/checkout.css`.
- `feature/sales-receipts`: `pages/payment-success.html`,
  `pages/receipt.html`, `assets/css/receipts.css`.

The common shell is kept on main so the three feature branches can work in
separate files.
