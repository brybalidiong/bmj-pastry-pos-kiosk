(function () {
  'use strict';
  const store = window.BMJPOS;
  const page = document.body.dataset.page;
  const money = value => new Intl.NumberFormat('en-PH', { style: 'currency', currency: 'PHP' }).format(value);
  const status = document.getElementById('payment-status');
  const payButton = document.getElementById('simulate-payment');
  const input = document.getElementById('cash-input');
  const progress = document.getElementById('payment-progress');
  const progressLabel = document.getElementById('progress-label');
  const next = document.getElementById('payment-next');
  const back = document.querySelector('.inline-actions a[href="payment-method.html"]');
  const actionRow = document.querySelector('.inline-actions, .keypad-actions');
  if (status && actionRow) actionRow.before(status);
  let cart;
  let processing = false;
  let completed = false;
  let timer;
  let audio;

  // Parse decimal currency as integer centavos, without floating-point subtraction.
  function cashCentavos(value) {
    if (!/^\d+(\.\d{1,2})?$/.test(value.trim())) return null;
    const [pesos, fraction = ''] = value.trim().split('.');
    const result = Number(pesos) * 100 + Number(fraction.padEnd(2, '0'));
    return Number.isSafeInteger(result) ? result : null;
  }

  function unlockSound() {
    try {
      const Audio = window.AudioContext || window.webkitAudioContext;
      if (Audio && !audio) audio = new Audio();
      if (audio && audio.state === 'suspended') audio.resume().catch(() => {});
    } catch { /* Feedback remains visible if audio is unavailable. */ }
  }

  function sound(success) {
    if (audio && audio.state === 'suspended') {
      audio.resume().then(() => { if (audio.state === 'running') sound(success); }).catch(() => {});
      return;
    }
    if (!audio || audio.state !== 'running') return;
    try {
      const start = audio.currentTime;
      (success ? [660, 880] : [220]).forEach((frequency, index) => {
        const oscillator = audio.createOscillator();
        const gain = audio.createGain();
        const at = start + index * 0.11;
        oscillator.frequency.value = frequency;
        gain.gain.setValueAtTime(0, at);
        gain.gain.linearRampToValueAtTime(0.045, at + 0.015);
        gain.gain.exponentialRampToValueAtTime(0.001, at + 0.12);
        oscillator.connect(gain);
        gain.connect(audio.destination);
        oscillator.start(at);
        oscillator.stop(at + 0.13);
      });
    } catch { /* Sound must never block checkout. */ }
  }

  function message(text, error = false, success = false) {
    status.textContent = text;
    status.classList.toggle('is-error', error);
    status.classList.toggle('is-success', success);
    if (input) input.classList.toggle('is-error', error);
  }

  function setProgress(value) {
    if (!progress) return;
    progress.value = value;
    progressLabel.textContent = value + '%';
  }

  function fingerprint(order) {
    return JSON.stringify([order.orderId, order.items, order.total]);
  }

  function refresh() {
    if (completed) return;
    try {
      if (!store) throw new Error('Order services could not load. Reload this page.');
      const current = store.getCart();
      const changed = cart && fingerprint(current) !== fingerprint(cart);
      if (changed && processing) {
        clearInterval(timer);
        processing = false;
        document.body.classList.remove('is-processing');
        setProgress(0);
        if (input) input.disabled = false;
      }
      cart = current;
      document.querySelectorAll('[data-order-total]').forEach(node => { node.textContent = money(cart.total); });
      const empty = !cart.itemCount;
      if (payButton) payButton.disabled = empty || processing;
      document.querySelectorAll('.method-card').forEach(node => {
        node.setAttribute('aria-disabled', String(empty));
      });
      if (empty) message('Your order is empty. Return to products to add pastries.', true);
      else if (changed) message('Your order changed. Review the updated amount before paying.');
      else if (!processing) message(page === 'card' ? 'Ready to tap card' : page === 'qr' ? 'Ready to simulate QR payment' : 'Enter the cash amount to simulate payment.');
      updateChange();
      return !empty && !changed;
    } catch (error) {
      clearInterval(timer);
      processing = false;
      document.body.classList.remove('is-processing');
      if (payButton) payButton.disabled = true;
      if (input) input.disabled = false;
      cart = null;
      document.querySelectorAll('[data-order-total]').forEach(node => { node.textContent = '—'; });
      message(error.message, true);
      return false;
    }
  }

  function updateChange() {
    if (!input || !cart) return;
    const paid = cashCentavos(input.value);
    const valid = paid !== null && paid >= cart.total * 100;
    const banner = document.getElementById('cash-change');
    banner.classList.toggle('is-pending', !valid);
    banner.querySelector('strong').textContent = valid ? money((paid - cart.total * 100) / 100) : '—';
    banner.querySelector('small').textContent = valid ? money(paid / 100) + ' − ' + money(cart.total) : 'Enter at least ' + money(cart.total);
  }

  function complete(payment, expected) {
    try {
      if (fingerprint(store.getCart()) !== expected) throw new Error('Your order changed during processing. Review the amount and try again.');
      const sale = store.finalizeSale(cart.orderId, payment);
      if (!sale.payment) throw new Error('This order has no payment record. Please ask staff for help.');
      completed = true;
      if ((page === 'qr' || page === 'card') && back) {
        // A completed simulated sale cannot return to payment method selection.
        back.removeAttribute('href');
        back.setAttribute('aria-disabled', 'true');
        back.classList.add('button-muted');
        back.tabIndex = -1;
      }
      const method = { cash: 'cash', qr: 'QR', card: 'card' }[page];
      const paid = money(sale.payment.paidCentavos / 100);
      const change = page === 'cash' ? ' Change: ' + money(sale.payment.changeCentavos / 100) + '.' : '';
      message(`✓ Payment Successful — Simulated ${method} payment. Amount paid: ${paid}.${change}`, false, true);
      next.href = 'payment-success.html?order=' + encodeURIComponent(sale.orderId);
      next.hidden = false;
      next.focus();
      sound(true);
      document.querySelectorAll('.keypad button, .quick-row button').forEach(node => { node.disabled = true; });
      if (input) input.disabled = true;
    } catch (error) {
      message(error.message, true);
      sound(false);
      if (payButton) payButton.disabled = false;
      if (input) input.disabled = false;
      setProgress(0);
    } finally {
      processing = false;
      document.body.classList.remove('is-processing');
    }
  }

  if (page === 'success' || page === 'receipt') {
    try {
      const sale = store.getSale(new URLSearchParams(location.search).get('order'));
      if (!sale || !sale.payment || sale.payment.simulated !== true) throw new Error('No completed simulated payment was found. Return to your order.');
      const values = {
        order: sale.orderId, total: money(sale.total),
        method: {cash: 'Cash', card: 'Card', qr: 'QR Payment'}[sale.payment.method],
        paid: money(sale.payment.paidCentavos / 100), change: money(sale.payment.changeCentavos / 100),
        date: new Intl.DateTimeFormat('en-PH', {dateStyle: 'medium', timeStyle: 'short', timeZone: 'Asia/Manila'}).format(new Date(sale.completedAt)),
      };
      document.querySelectorAll('[data-sale]').forEach(node => { node.textContent = values[node.dataset.sale]; });
      const items = document.getElementById('receipt-items');
      if (items) sale.items.forEach(item => {
        const row = document.createElement('div');
        row.className = 'receipt-item';
        const details = document.createElement('div');
        const name = document.createElement('strong');
        name.textContent = item.name;
        const quantity = document.createElement('small');
        quantity.textContent = item.quantity + ' × ' + money(item.unitPrice);
        const subtotal = document.createElement('strong');
        subtotal.textContent = money(item.lineSubtotal);
        details.append(name, quantity);
        row.append(details, subtotal);
        items.append(row);
      });
      const receipt = document.getElementById('receipt-link');
      if (receipt) receipt.href = 'receipt.html?order=' + encodeURIComponent(sale.orderId);
      document.getElementById('print-receipt')?.addEventListener('click', () => window.print());
    } catch (error) {
      document.querySelector('.success-card, .receipt-layout').hidden = true;
      message(error.message, true);
    }
    return;
  }

  document.querySelectorAll('.method-card').forEach(node => node.addEventListener('click', event => {
    if (!refresh()) event.preventDefault();
  }));
  input?.addEventListener('input', () => { updateChange(); message('Enter the cash amount to simulate payment.'); });
  document.querySelectorAll('.quick-row button').forEach(node => node.addEventListener('click', () => {
    if (!cart || processing || completed) return;
    input.value = node.dataset.amount === 'exact' ? cart.total.toFixed(2) : node.dataset.amount;
    updateChange();
  }));
  document.querySelectorAll('.keypad button').forEach(node => node.addEventListener('click', () => {
    if (processing || completed) return;
    const key = node.textContent.trim();
    input.value = key === 'Clear' ? '' : key === '⌫' ? input.value.slice(0, -1) : input.value + key;
    input.dispatchEvent(new Event('input'));
  }));
  payButton?.addEventListener('click', () => {
    if (processing || completed) return;
    unlockSound();
    if (!refresh()) return;
    const paid = page === 'cash' ? cashCentavos(input.value) : cart.total * 100;
    if (paid === null || paid < cart.total * 100) {
      message(paid === null ? 'Enter a valid, non-negative cash amount with up to two decimal places.' : 'Insufficient amount. Please enter at least ' + money(cart.total) + '.', true);
      sound(false);
      input.focus();
      return;
    }
    const payment = {simulated: true, method: page, paidCentavos: paid, changeCentavos: paid - cart.total * 100};
    const expected = fingerprint(cart);
    processing = true;
    payButton.disabled = true;
    if (input) input.disabled = true;
    document.body.classList.add('is-processing');
    message(page === 'card' ? 'Scanning Card…' : 'Processing Payment…');
    setProgress(0);
    let value = 0;
    timer = setInterval(() => {
      value += 5;
      setProgress(value);
      if (value === 100) {
        clearInterval(timer);
        complete(payment, expected);
      }
    }, 100);
  });
  window.addEventListener('storage', event => {
    if (!event.key || [store?.CART_KEY, store?.INVENTORY_KEY].includes(event.key)) refresh();
  });
  window.addEventListener('pageshow', refresh);
  window.addEventListener('focus', refresh);
  refresh();
})();
