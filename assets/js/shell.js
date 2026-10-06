// Shared kiosk chrome and checkout progress.
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
const homeHref = document.body.dataset.homeHref || 'index.html';
const brandMarkSrc = new URL('assets/images/bmj-pastry-mark.svg', new URL(homeHref, window.location.href)).href;
const favicon = document.createElement('link');
favicon.rel = 'icon';
favicon.type = 'image/svg+xml';
favicon.href = brandMarkSrc;
document.head.append(favicon);

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
      '<a class="brand" href="' + homeHref + '" aria-label="BMJ Pastry home">' +
        '<span class="brand-mark has-logo" aria-hidden="true"><img src="' + brandMarkSrc + '" alt="" width="46" height="46"></span>' +
        '<span class="brand-copy"><span class="brand-name">BMJ Pastry</span>' +
        '<span class="brand-context">Self-service kiosk · Prototype</span></span>' +
      '</a>' +
      '<span class="progress-caption">Checkout flow</span>' +
      '<nav class="progress-nav" aria-label="Checkout progress">' + progress + '</nav>' +
      '<div class="sidebar-footer"><span class="sidebar-footer-dot" aria-hidden="true"></span> Touchscreen checkout</div>' +
    '</div>';
}
