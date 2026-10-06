# Payment flow

Serve this directory with `python -m http.server 8080` and open
http://localhost:8080. Site storage must be enabled. No app packages are required.

Menu → Order Summary → Payment Method → Cash/Card/QR → gradual processing →
inline success → Continue → Payment Success → Receipt → New Transaction (live menu).
After a QR or card simulation completes, its in-page Back control is disabled;
Continue remains available for the success and receipt screens.

## Integration

All payment screens reuse `BMJPOS.getCart()` and the existing `bmjPosCart.v1`
localStorage draft. Total comes from product prices multiplied by quantities;
there are currently no additional charges. Totals refresh on focus, page
restoration, and storage events. Changed, empty, or invalid orders cannot complete.

Cash accepts keyboard/keypad entry and quick amounts. Decimal values are parsed
to integer centavos. Empty, negative, non-numeric, unsafe, or more-than-two-decimal
inputs are rejected. Insufficient cash retains the input and blocks completion.
Change is entered cash minus total. Card and QR simulation controls advance in
5% steps over about two seconds. The card tap animation respects reduced motion.
No card numbers, PINs, or other credentials are collected.

The local QR PNG encodes exactly:
https://drive.google.com/file/d/1FhgxVQ48w0vB-vwmzrVGHQRsqd5S9y0s/view?usp=sharing

It has medium error correction and a four-module quiet zone. Opening this file
does not make or confirm payment; the separate simulation button does.

Quiet Web Audio tones provide feedback. Audio is unlocked by clicking a
simulation button. Checkout continues if sound is unavailable.

Completion uses existing idempotent `BMJPOS.finalizeSale()` to save inventory and
sale together, then clear the draft. Validated payment metadata (`simulated`,
`method`, `paidCentavos`, `changeCentavos`) lives on that completed sale. No second
cart/payment store was added. Existing callers without payment metadata remain
compatible. Success and receipt load the sale with `BMJPOS.getSale()` using the
order ID in the URL. Invalid direct success URLs cannot show successful payment.
Receipt items, totals, date (Asia/Manila), method, paid amount, and change come
from the sale. Print opens the browser print dialog; New Transaction opens the
live menu. The old new-transaction sample page is retained.

## Verification

`tests/payment-flow.cjs` uses Playwright and installed Microsoft Edge. Set
`NODE_PATH` to your Playwright installation and run `node tests/payment-flow.cjs`.
Optional `BMJ_BROWSER=chrome` uses Chrome; `BMJ_SCREENSHOTS` selects an existing
directory for payment screenshots. Playwright is a test-only tool.

Tests use two 85-peso pastries (total 170): invalid/100 cash rejected, 170 cash
accepted with zero change, 200 cash accepted with 30 change, gradual card/QR
progress, success/receipt navigation, receipt reload, audio oscillator triggers,
inventory idempotency, changed-order rejection, refreshed totals, direct-success
protection, empty-order protection, and browser JavaScript errors. Headless audio
checks verify signal generation, not audible speaker output.

The QR image was generated with development-only python-qrcode 8.2 and independently
decoded with zxing-cpp 3.1.1 to verify the exact URL. No QR library is required at
runtime. See [generator documentation](https://github.com/lincolnloop/python-qrcode).
The tools were downloaded to the parent workspace's `.tools/qr` directory.

There is no existing build/lint/test package configuration. Syntax checks use
`node --check assets/js/payments.js` and `node --check assets/js/order-store.js`.

This is a single-browser simulation. localStorage is editable and sales are not
shared across kiosks. No banking/payment gateway or server backend exists. A
future multi-kiosk deployment needs a server transaction, as described in the
existing order-store contract.
