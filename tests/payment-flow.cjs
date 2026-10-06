// Run with NODE_PATH pointing to a Playwright installation: node tests/payment-flow.cjs
const assert = require('node:assert/strict');
const http = require('node:http');
const fs = require('node:fs');
const path = require('node:path');
const { chromium } = require('playwright');
const root = path.resolve(__dirname, '..');
const server = http.createServer((req, res) => {
  const file = path.resolve(root, '.' + decodeURIComponent(req.url.split('?')[0] === '/' ? '/index.html' : req.url.split('?')[0]));
  if (!file.startsWith(root + path.sep)) { res.writeHead(403).end(); return; }
  fs.readFile(file, (error, bytes) => {
    if (error) { res.writeHead(404).end(); return; }
    res.setHeader('Content-Type', {'.html':'text/html', '.js':'application/javascript', '.css':'text/css', '.png':'image/png', '.jpg':'image/jpeg'}[path.extname(file)] || 'text/plain');
    res.end(bytes);
  });
});
(async () => {
  await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
  const base = 'http://127.0.0.1:' + server.address().port;
  const browser = await chromium.launch({headless: true, channel: process.env.BMJ_BROWSER || 'msedge'});
  try {
    const context = await browser.newContext();
    await context.route('https://fonts.googleapis.com/**', route => route.abort());
    await context.route('https://fonts.gstatic.com/**', route => route.abort());
    const page = await context.newPage();
    const errors = [];
    page.on('pageerror', error => errors.push(error.message));
    await page.addInitScript(() => {
      window.soundFrequencies = [];
      const Audio = window.AudioContext;
      if (Audio) window.AudioContext = class extends Audio {
        createOscillator() {
          const osc = super.createOscillator();
          const start = osc.start.bind(osc);
          osc.start = (...args) => { window.soundFrequencies.push(osc.frequency.value); start(...args); };
          return osc;
        }
      };
    });
    async function seed() {
      await page.goto(base);
      await page.waitForFunction(() => !!window.BMJPOS);
      await page.evaluate(() => {
        localStorage.clear();
      });
      await page.reload();
      const productId = await page.evaluate(() => BMJPOS.getProducts().find(item => item.price === 85).id);
      await page.locator('#product-grid [data-product-id="' + productId + '"]').click();
      await page.locator('#product-grid [data-product-id="' + productId + '"]').click();
      await page.locator('#review-link').click();
      await page.waitForFunction(() => document.getElementById('review-total')?.textContent.includes('170.00'));
      assert.match(await page.locator('#review-total').innerText(), /170\.00/);
      await page.locator('#continue-payment').click();
      await page.waitForFunction(() => document.querySelector('[data-order-total]')?.textContent.includes('170.00'));
      assert.match(await page.locator('[data-order-total]').innerText(), /170\.00/);
    }
    async function receipt(paid, change) {
      await page.waitForFunction(() => !document.getElementById('payment-next').hidden);
      assert.match(await page.locator('#payment-status').innerText(), /Payment Successful/);
      assert.match(await page.locator('#payment-status').innerText(), /Simulated .* payment\. Amount paid:/);
      assert.equal(await page.locator('#payment-status').evaluate(node => node.classList.contains('is-success')), true);
      assert.equal(await page.locator('#payment-progress').evaluate(el => el.value), 100);
      assert.equal((await page.evaluate(() => soundFrequencies)).filter(n => [660,880].includes(n)).length, 2);
      const sale = await page.evaluate(() => Object.values(JSON.parse(localStorage.getItem(BMJPOS.INVENTORY_KEY)).completedOrders)[0]);
      assert.equal(sale.total, 170);
      assert.equal(sale.payment.paidCentavos, paid * 100);
      assert.equal(sale.payment.changeCentavos, change * 100);
      const again = await page.evaluate(id => BMJPOS.finalizeSale(id), sale.orderId);
      assert.equal(again.alreadyFinalized, true);
      await page.locator('#payment-next').click();
      await page.waitForFunction(() => document.querySelector('[data-sale="total"]')?.textContent.includes('170.00'));
      assert.match(await page.locator('[data-sale="total"]').innerText(), /170\.00/);
      await page.locator('#receipt-link').click();
      await page.waitForFunction(() => document.querySelectorAll('#receipt-items .receipt-item').length === 1);
      assert.equal(await page.locator('#receipt-items .receipt-item').count(), 1);
      assert.match(await page.locator('[data-sale="change"]').innerText(), new RegExp(change + '\\.00'));
      await page.reload();
      assert.equal(await page.locator('#receipt-items .receipt-item').count(), 1);
      await page.locator('#receipt-done').click();
      await page.locator('#feedback-skip').click();
      await page.waitForURL(base + '/index.html');
      await page.waitForFunction(() => !!window.BMJPOS);
      assert.equal(await page.evaluate(() => BMJPOS.getCart().itemCount), 0);
    }
    await seed();
    await page.getByRole('link', {name: /Cash/}).click();
    for (const value of ['', '-1', 'abc', '1.999', '100']) {
      await page.locator('#cash-input').fill(value);
      await page.locator('#simulate-payment').click();
      assert.equal(await page.locator('#payment-next').isVisible(), false);
      assert.equal(await page.locator('#cash-input').inputValue(), value);
      assert.equal(await page.evaluate(() => BMJPOS.getCart().total), 170);
    }
    assert.match(await page.locator('#payment-status').innerText(), /Insufficient amount.*170\.00/);
    assert.ok((await page.evaluate(() => soundFrequencies)).includes(220));
    await page.locator('#cash-input').fill('170');
    await page.locator('#simulate-payment').click();
    await receipt(170, 0);
    console.log('PASS cash invalid/100 rejected with preserved input and error audio; 170 succeeds, change 0, receipt and inventory idempotency');
    await seed();
    await page.getByRole('link', {name: /Cash/}).click();
    await page.locator('#cash-input').fill('200');
    await page.locator('#simulate-payment').click();
    await receipt(200,30);
    console.log('PASS cash 200 succeeds, change 30');
    for (const method of ['card','qr']) {
      await seed();
      await page.goto(base + '/pages/' + method + '-payment.html');
      if (method === 'qr') assert.equal(await page.locator('.payment-qr').evaluate(el => el.complete && el.naturalWidth > 0), true);
      if (process.env.BMJ_SCREENSHOTS) await page.screenshot({path: path.join(process.env.BMJ_SCREENSHOTS, method + '.png'), fullPage: true});
      await page.locator('#simulate-payment').click();
      assert.equal(await page.locator('body').evaluate(el => el.classList.contains('is-processing')), true);
      await page.waitForFunction(() => document.getElementById('payment-progress').value > 0);
      const mid = await page.locator('#payment-progress').evaluate(el => el.value);
      assert.ok(mid > 0 && mid < 100);
      await page.waitForFunction(() => !document.getElementById('payment-next').hidden);
      const back = page.locator('.inline-actions a').first();
      assert.equal(await back.getAttribute('href'), null);
      assert.equal(await back.getAttribute('aria-disabled'), 'true');
      const completedUrl = page.url();
      await back.evaluate(element => element.click());
      assert.equal(page.url(), completedUrl);
      await receipt(170,0);
      console.log('PASS ' + method + ' incremental progress, disabled Back, success audio, success and receipt');
    }
    await seed();
    await page.goto(base + '/pages/card-payment.html');
    await page.locator('#simulate-payment').click();
    await page.evaluate(() => BMJPOS.addItem(BMJPOS.getProducts().find(item => item.price === 85).id));
    await page.waitForFunction(() => document.getElementById('payment-status').textContent.includes('changed during processing'));
    assert.equal(await page.locator('#payment-next').isVisible(), false);
    assert.equal(await page.evaluate(() => BMJPOS.getCart().total), 255);
    await page.reload();
    assert.match(await page.locator('.amount-banner [data-order-total]').innerText(), /255\.00/);
    await page.goto(base + '/pages/payment-success.html?order=BMJ-invalid');
    assert.equal(await page.locator('.success-card').isVisible(), false);
    await page.goto(base);
    await page.evaluate(() => localStorage.clear());
    await page.goto(base + '/pages/payment-processing.html');
    assert.equal(await page.locator('#simulate-payment').isDisabled(), true);
    assert.deepEqual(errors, []);
    console.log('PASS changed-order rejection, refreshed totals, direct-success guard, empty-cart guard; no browser JS errors');
    await context.close();
  } finally { await browser.close(); server.close(); }
})().catch(error => { console.error(error); server.close(); process.exitCode = 1; });
