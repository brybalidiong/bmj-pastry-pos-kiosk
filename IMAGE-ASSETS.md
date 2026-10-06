# Product image assets

The live menu configures each product's `image` in `assets/js/products.js` as
`assets/images/products/<product-id>.jpg`. Add the correct photographs at these
paths without changing the renderer. Paths are relative to the live index page.

## Current file inventory

All paths below are inside `assets/images/products/`.

| Product | Configured filename | Image file currently present |
| --- | --- | --- |
| Butter Croissant | butter-croissant.jpg | No |
| Chocolate Croissant | chocolate-croissant.jpg | No |
| Cinnamon Roll | cinnamon-roll.jpg | No |
| Blueberry Danish | blueberry-danish.jpg | No |
| Chocolate Éclair | chocolate-eclair.jpg | No |
| Mini Cheesecake | mini-cheesecake.jpg | No |
| Sourdough Loaf | sourdough-loaf.jpg | No |
| Garlic Bread | garlic-bread.jpg | No |
| Milk Bread | milk-bread.jpg | No |
| Americano | americano.jpg | No |
| Café Latte | cafe-latte.jpg | No |
| Iced Mocha | iced-mocha.jpg | No |
| Neutral fallback | placeholder.jpg | Yes |

The placeholder is a neutral background with “Product photo coming soon” text.
It contains no pastry photograph, cartoon, emoji, icon, or broken-image symbol.
Only the placeholder was added; missing final photograph files are not fabricated.

## Loading and layout

`catalog.js` creates each image inside the existing `.product-art` wrapper.
The image stays invisible until successfully decoded and has the product name
as its alt text. The product button's existing accessible name is preserved.
On a load/decode failure, the source switches once to the local placeholder.
If the placeholder also fails, the image remains invisible over the neutral
wrapper, with no further retries and no broken-image icon.

Images are absolutely positioned inside the unchanged responsive wrapper,
clipped to its existing rounded edges, and use `object-fit: cover`.
Image intrinsic dimensions cannot expand/collapse the wrapper, card, or grid.
Different aspect ratios are cropped without distortion. Existing cart thumbnails
and all order/payment data remain unchanged.

## Verification

Run `node tests/image-fallback.cjs` with `NODE_PATH` pointing to Playwright.
Installed Edge is the default browser; `BMJ_BROWSER=chrome` selects Chrome.
Optional `BMJ_SCREENSHOTS` selects an existing screenshot directory.

Browser tests cover missing paths (404), failed requests, undecodable image bytes,
successfully decoded synthetic wide/tall images, all images present, all absent,
mixed results, and a missing fallback. At 1280, 768, 390, and 360 pixels they
compare card/wrapper dimensions and grid positions before and after loading,
verify containment and visibility, preserve product information and alt text,
and check bounded requests and browser JavaScript errors.
`tests/payment-flow.cjs` separately checks product selection, cart, review,
all three simulated payments, and receipts.

The image-loading paths and fallback behavior were verified. Actual product
photography could not be visually verified because the final image assets have
not yet been added. Successfully loaded aspect-ratio fixtures are synthetic
rectangles, not final product photography.
