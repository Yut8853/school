/* 受講契約の最終確認 → Stripe Checkout
 * <form id="cf-final" data-checkout-endpoint="..."> に Google Apps Script のウェブアプリURL（面談予約と同じURL）を入れる。
 * 同意のチェックのあと、Apps Script で Checkout Session を作成し、返ってきた決済ページのURLへ移動する。 */
(function () {
  var form = document.getElementById('cf-final');
  if (!form) { return; }
  var btn = document.getElementById('cf-pay');
  var err = document.getElementById('cf-err');
  form.addEventListener('submit', function (e) {
    e.preventDefault();
    if (!form.checkValidity()) { form.reportValidity(); return; }
    var endpoint = form.getAttribute('data-checkout-endpoint');
    err.hidden = true;
    if (!endpoint) {
      console.warn('confirm.html の <form id="cf-final"> に data-checkout-endpoint を設定してください。');
      err.hidden = false; err.focus(); return;
    }
    btn.disabled = true;
    fetch(endpoint, { method: 'POST', headers: { 'Content-Type': 'text/plain;charset=utf-8' }, body: JSON.stringify({ action: 'checkout' }) })
      .then(function (r) { return r.json(); })
      .then(function (j) {
        if (j && j.ok && j.url) { window.location.href = j.url; return; }
        btn.disabled = false; err.hidden = false; err.focus();
      })
      .catch(function () { btn.disabled = false; err.hidden = false; err.focus(); });
  });
})();
