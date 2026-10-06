// Shared navigation for the static UI preview. Transaction behavior comes later.
const steps = [
  { label: 'Products', shortLabel: 'Shop', href: 'index.html' },
  { label: 'Order', shortLabel: 'Order', href: 'order-summary.html' },
  { label: 'Method', shortLabel: 'Method', href: 'payment-method.html' },
  { label: 'Payment', shortLabel: 'Pay', href: 'payment-processing.html' },
  { label: 'Success', shortLabel: 'Done', href: 'payment-success.html' },
  { label: 'Receipt', shortLabel: 'Receipt', href: 'receipt.html' },
];

const currentStep = Number(document.body.dataset.step || 1);
const sidebar = document.getElementById('site-navigation');

if (sidebar) {
  const links = steps.map((step, index) => {
    const number = String(index + 1).padStart(2, '0');
    const active = currentStep === index + 1;
    const currentAttribute = active ? ' aria-current="page"' : '';
    const activeClass = active ? ' active' : '';

    return '<a class="nav-item' + activeClass + '" href="' + step.href + '"' +
      currentAttribute + '><span class="nav-number" aria-hidden="true">' +
      number + '</span><span class="nav-label-full">' + step.label +
      '</span><span class="nav-label-short">' + step.shortLabel + '</span></a>';
  }).join('');

  sidebar.innerHTML =
    '<a class="sidebar-brand" href="index.html" aria-label="BMJ Pastry home">' +
      '<span class="brand-mark" aria-hidden="true">BMJ</span>' +
      '<span class="brand-lockup"><span class="brand-name">BMJ Pastry</span>' +
      '<span class="brand-context">Point of Sale</span></span>' +
    '</a>' +
    '<p class="sidebar-section-label">Transaction</p>' +
    '<nav class="sidebar-nav" aria-label="Transaction pages">' + links + '</nav>' +
    '<div class="sidebar-footer"><span class="footer-dot" aria-hidden="true"></span>' +
      '<div><strong>UI skeleton</strong><span>Static design preview</span></div></div>';
}
