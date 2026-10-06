// Shared chrome and sample-state switching for the static UI preview.
const stages = [
  { key: 'order', label: 'Order' },
  { key: 'review', label: 'Review' },
  { key: 'payment', label: 'Payment' },
  { key: 'receipt', label: 'Receipt' },
];

const stage = document.body.dataset.stage || 'order';
const currentIndex = stages.findIndex((item) => item.key === stage);
const completedThrough = stage === 'success' ? 2 : currentIndex - 1;
const header = document.getElementById('site-header');

if (header) {
  const progress = stages.map((item, index) => {
    const isActive = index === currentIndex;
    const isComplete = index <= completedThrough;
    const className = isActive ? ' is-active' : (isComplete ? ' is-complete' : '');
    const marker = isComplete ? '✓' : String(index + 1);
    const current = isActive ? ' aria-current="step"' : '';

    return '<span class="progress-step' + className + '"' + current + '>' +
      '<span class="progress-number" aria-hidden="true">' + marker + '</span>' +
      '<span>' + item.label + '</span></span>';
  }).join('');

  header.innerHTML =
    '<div class="site-header-inner">' +
      '<a class="brand" href="index.html" aria-label="BMJ Pastry home">' +
        '<span class="brand-mark" aria-hidden="true">BMJ</span>' +
        '<span class="brand-copy"><span class="brand-name">BMJ Pastry</span>' +
        '<span class="brand-context">Self-service kiosk · UI preview</span></span>' +
      '</a>' +
      '<nav class="progress-nav" aria-label="Checkout progress">' + progress + '</nav>' +
    '</div>';
}

// These values only switch the visible sample data between payment mockups.
const params = new URLSearchParams(window.location.search);
const methodKey = ['cash', 'qr', 'card'].includes(params.get('method'))
  ? params.get('method')
  : 'cash';
const sampleMethods = {
  cash: { label: 'Cash', paid: '₱500.00', change: '₱130.00' },
  qr: { label: 'QR Payment', paid: '₱370.00', change: '₱0.00' },
  card: { label: 'Credit / Debit Card', paid: '₱370.00', change: '₱0.00' },
};
const sample = sampleMethods[methodKey];

document.querySelectorAll('[data-preview-method]').forEach((node) => {
  node.textContent = sample.label;
});
document.querySelectorAll('[data-preview-paid]').forEach((node) => {
  node.textContent = sample.paid;
});
document.querySelectorAll('[data-preview-change]').forEach((node) => {
  node.textContent = sample.change;
});

const receiptLink = document.getElementById('receipt-link');
if (receiptLink) {
  receiptLink.href = 'receipt.html?method=' + methodKey;
}

if (document.body.dataset.page === 'cash' && params.get('state') === 'insufficient') {
  const cashInput = document.getElementById('cash-input');
  const cashError = document.getElementById('cash-error');
  const cashChange = document.getElementById('cash-change');
  if (cashInput) {
    cashInput.value = '₱100.00';
    cashInput.classList.add('is-error');
  }
  if (cashError) cashError.hidden = false;
  if (cashChange) {
    cashChange.classList.add('is-pending');
    cashChange.querySelector('strong').textContent = '—';
    cashChange.querySelector('small').textContent = 'Enter at least ₱370.00';
  }
  document.querySelectorAll('.quick-row .is-selected').forEach((node) => {
    node.classList.remove('is-selected');
  });
  const cashPayLink = document.getElementById('cash-pay-link');
  if (cashPayLink) {
    cashPayLink.removeAttribute('href');
    cashPayLink.setAttribute('aria-disabled', 'true');
    cashPayLink.classList.remove('button-primary');
    cashPayLink.classList.add('button-muted');
  }
  const cashStateLink = document.getElementById('cash-state-link');
  if (cashStateLink) {
    cashStateLink.href = 'payment-processing.html';
    cashStateLink.textContent = 'Return to valid cash example';
  }
}
