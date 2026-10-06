/* Stripe Payment Link または Apps Script の Checkout Session に接続する。 */
(function () {
  var form = document.getElementById('cf-final');
  if (!form) { return; }
  var btn = document.getElementById('cf-pay');
  var err = document.getElementById('cf-err');
  var pending = false;

  function stripeUrl(value, host) {
    try {
      var url = new URL(value);
      return url.protocol === 'https:' && url.hostname === host &&
        !url.username && !url.password && !url.port;
    } catch (_) { return false; }
  }
  function fail() {
    pending = false;
    btn.disabled = false;
    form.removeAttribute('aria-busy');
    err.hidden = false;
    err.focus();
  }
  form.addEventListener('submit', function (e) {
    e.preventDefault();
    if (pending) { return; }
    if (!form.checkValidity()) { form.reportValidity(); return; }
    err.hidden = true;
    var link = (form.getAttribute('data-payment-link') || '').trim();
    var endpoint = (form.getAttribute('data-checkout-endpoint') || '').trim();
    if (link) {
      if (!stripeUrl(link, 'buy.stripe.com')) { fail(); return; }
      pending = true;
      btn.disabled = true;
      window.location.assign(link);
      return;
    }
    if (!/^https:\/\/script\.google\.com\/macros\/s\/[^/?#]+\/exec$/.test(endpoint)) {
      fail(); return;
    }
    pending = true;
    btn.disabled = true;
    form.setAttribute('aria-busy', 'true');
    fetch(endpoint, {
      method: 'POST',
      headers: { 'Content-Type': 'text/plain;charset=utf-8' },
      body: JSON.stringify({ action: 'checkout' })
    })
      .then(function (r) { if (!r.ok) { throw new Error('checkout_failed'); } return r.json(); })
      .then(function (j) {
        if (!j || !j.ok || !stripeUrl(j.url, 'checkout.stripe.com')) {
          throw new Error('invalid_checkout');
        }
        window.location.assign(j.url);
      })
      .catch(fail);
  });
  window.addEventListener('pageshow', function () {
    pending = false;
    btn.disabled = false;
    form.removeAttribute('aria-busy');
  });
})();
