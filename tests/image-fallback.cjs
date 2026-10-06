// NODE_PATH must point to Playwright; installed Edge is the default browser.
const assert = require('node:assert/strict');
const http = require('node:http');
const fs = require('node:fs');
const path = require('node:path');
const { chromium } = require('playwright');
const root = path.resolve(__dirname, '..');
const server = http.createServer((req, res) => {
  const file = path.resolve(root, '.' + (req.url === '/' ? '/index.html' : req.url));
  if (!file.startsWith(root + path.sep)) { res.writeHead(403).end(); return; }
  fs.readFile(file, (error, data) => {
    if (error) { res.writeHead(404).end(); return; }
    res.setHeader('Content-Type', {'.html':'text/html', '.js':'application/javascript', '.css':'text/css', '.jpg':'image/jpeg'}[path.extname(file)] || 'text/plain');
    res.end(data);
  });
});
(async () => {
  await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
  const base = 'http://127.0.0.1:' + server.address().port;
  const browser = await chromium.launch({headless:true, channel:process.env.BMJ_BROWSER || 'msedge'});
  try {
    for (const width of [1280,768,390,360]) {
      for (const scenario of ['missing','mixed','all-present','placeholder-fails']) {
        const context = await browser.newContext({viewport:{width,height:900}});
        await context.route('https://fonts.googleapis.com/**', route => route.abort());
        await context.route('https://fonts.gstatic.com/**', route => route.abort());
        const page = await context.newPage();
        const errors = [];
        page.on('pageerror', error => errors.push(error.message));
        const requests = new Map();
        let release;
        const gate = new Promise(resolve => { release = resolve; });
        await context.route('**/assets/images/products/*.jpg', async route => {
          const file = route.request().url().split('/').pop();
          requests.set(file, (requests.get(file) || 0) + 1);
          await gate;
          if (file === 'placeholder.jpg') {
            if (scenario === 'placeholder-fails') return route.fulfill({status:404,body:''});
            return route.continue();
          }
          if (scenario === 'all-present' || (scenario === 'mixed' && ['butter-croissant.jpg','chocolate-croissant.jpg'].includes(file))) {
            const wide = file === 'butter-croissant.jpg';
            // Synthetic rectangles exercise extreme aspect ratios; these are not product photos.
            return route.fulfill({contentType:'image/svg+xml',body:`<svg xmlns="http://www.w3.org/2000/svg" width="${wide ? 1200 : 80}" height="${wide ? 80 : 1200}"><rect width="100%" height="100%" fill="#ddd4c6"/></svg>`});
          }
          if (scenario === 'mixed' && file === 'cinnamon-roll.jpg') return route.fulfill({status:200,contentType:'image/jpeg',body:'invalid image bytes'});
          if (scenario === 'mixed' && file === 'blueberry-danish.jpg') return route.abort('failed');
          return route.fulfill({status:404,body:''});
        });
        await page.goto(base, {waitUntil:'domcontentloaded'});
        await page.waitForFunction(() => document.querySelectorAll('.product-card').length === 12);
        const geometry = () => page.evaluate(() => Array.from(document.querySelectorAll('.product-card')).map(card => {
          const art = card.querySelector('.product-art');
          const bounds = node => { const r = node.getBoundingClientRect(); return [r.x,r.y,r.width,r.height]; };
          return {id:card.dataset.productId,card:bounds(card),art:bounds(art),name:card.querySelector('.product-name').textContent,price:card.querySelector('.product-price').textContent,label:card.getAttribute('aria-label')};
        }));
        const before = await geometry();
        assert.equal(await page.locator('.product-image').evaluateAll(nodes => nodes.every(node => getComputedStyle(node).visibility === 'hidden')), true);
        release();
        await page.waitForFunction(() => Array.from(document.querySelectorAll('.product-art')).every(node => ['loaded','fallback-loaded','unavailable'].includes(node.dataset.imageState)));
        assert.deepEqual(await geometry(), before, 'Image loading must not change geometry or product information');
        const images = await page.locator('.product-image').evaluateAll(nodes => nodes.map(node => {
          const r = node.getBoundingClientRect();
          const a = node.parentElement.getBoundingClientRect();
          return {state:node.parentElement.dataset.imageState,alt:node.alt,name:node.closest('.product-card').querySelector('.product-name').textContent,visible:getComputedStyle(node).visibility,fit:getComputedStyle(node).objectFit,inside:r.x>=a.x && r.y>=a.y && r.right<=a.right+1 && r.bottom<=a.bottom+1,decoded:node.naturalWidth>0};
        }));
        assert.ok(images.every(image => image.alt === image.name && image.inside && image.fit === 'cover'));
        assert.equal(images.filter(image => image.state === 'loaded').length, scenario === 'all-present' ? 12 : scenario === 'mixed' ? 2 : 0);
        assert.ok(images.every(image => scenario === 'placeholder-fails' ? image.visible === 'hidden' && image.state === 'unavailable' : image.visible === 'visible' && image.decoded));
        assert.ok(Array.from(requests.values()).every(count => count <= 12), 'Fallback requests must be bounded');
        assert.deepEqual(errors, []);
        if (width === 1280 && scenario === 'missing' && process.env.BMJ_SCREENSHOTS) await page.screenshot({path:path.join(process.env.BMJ_SCREENSHOTS,'product-fallback.png'),fullPage:true});
        await context.close();
        console.log(`PASS ${width}px ${scenario}: stable wrappers/cards/grid, preserved details/alt, contained images, bounded requests`);
      }
    }
  } finally { await browser.close(); server.close(); }
})().catch(error => { console.error(error); server.close(); process.exitCode = 1; });
