/* お申し込み・面談予約フォーム（静的版）
 * 受講の申し込み：<form id="ap-form" data-endpoint="..."> にJSONをPOST
 * 面談の予約　　：<form id="ap-form" data-booking-endpoint="..."> に Google Apps Script のURLを入れる（booking/README.md）
 * 送信先が未設定のあいだは、完了画面には進まず「送信できませんでした」を表示します。 */
(function () {
  var $ = function (s, r) { return (r || document).querySelector(s); };
  var $$ = function (s, r) { return Array.prototype.slice.call((r || document).querySelectorAll(s)); };
  var form = $('#ap-form');
  var BOOK = form.getAttribute('data-booking-endpoint') || '';
  var OPEN = ['19:00', '20:00'];
  var HOURS = ['10:00', '11:00', '12:00', '13:00', '14:00', '15:00', '16:00', '17:00', '18:00', '19:00', '20:00'];
  var WD = ['日', '月', '火', '水', '木', '金', '土'];
  var pad = function (n) { return (n < 10 ? '0' : '') + n; };
  var iso = function (d) { return d.getFullYear() + '-' + pad(d.getMonth() + 1) + '-' + pad(d.getDate()); };
  var days = [];
  for (var i = 1; i <= 14; i++) { var dd = new Date(); dd.setDate(dd.getDate() + i); days.push(dd); }
  var state = { mode: 'apply', status: '', goals: [], tried: false, sending: false, day: iso(days[0]), slot: '', avail: null };
  var f = { name: $('#f-name'), email: $('#f-email'), tel: $('#f-tel'), month: $('#f-month'), msg: $('#f-msg'), agree: $('#f-agree') };
  var meet = function () { return state.mode === 'question'; };

  function show(n) {
    $$('[data-step]').forEach(function (el) { el.hidden = String(n) !== el.getAttribute('data-step'); });
    ['st1', 'st2', 'st3'].forEach(function (id, k) { $('#' + id).className = (k + 1 === n) ? 'on' : (k + 1 < n ? 'done' : ''); });
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }
  function press(list, on) { list.forEach(function (b) { var v = b === on; b.classList.toggle('on', v); b.setAttribute('aria-pressed', v ? 'true' : 'false'); }); }
  function modeView() {
    $$('[data-meet-only]').forEach(function (el) { el.hidden = !meet(); });
    $$('[data-apply-only]').forEach(function (el) { el.hidden = meet(); });
  }
  function isFree(dk, t) {
    if (OPEN.indexOf(t) < 0) { return false; }
    if (state.avail) { return (state.avail[dk] || []).indexOf(t) > -1; }
    var n = parseInt(dk.slice(-2), 10);
    return !((n % 3 === 0 && t === '19:00') || (n % 5 === 0 && t === '20:00'));
  }
  function fmtSlot(k) {
    if (!k) { return '―'; }
    var d = new Date(k.slice(0, 10) + 'T00:00:00'), h = parseInt(k.slice(11, 13), 10);
    return (d.getMonth() + 1) + '月' + d.getDate() + '日（' + WD[d.getDay()] + '） ' + h + ':00〜' + (h + 1) + ':00';
  }
  function renderBooking() {
    var dbox = $('#bk-days'), sbox = $('#bk-slots');
    if (!dbox) { return; }
    dbox.innerHTML = ''; sbox.innerHTML = '';
    days.forEach(function (d) {
      var k = iso(d), b = document.createElement('button');
      b.type = 'button'; b.className = 'bk-d' + (k === state.day ? ' on' : ''); b.setAttribute('aria-pressed', k === state.day ? 'true' : 'false');
      b.innerHTML = '<span class="bk-dw">' + WD[d.getDay()] + '</span><b>' + (d.getMonth() + 1) + '/' + d.getDate() + '</b>';
      b.addEventListener('click', function () { state.day = k; renderBooking(); });
      dbox.appendChild(b);
    });
    HOURS.forEach(function (t) {
      var ok = isFree(state.day, t), k = state.day + 'T' + t, h = parseInt(t, 10), b = document.createElement('button');
      b.type = 'button'; b.disabled = !ok; b.className = 'bk-s' + (ok ? '' : ' busy') + (state.slot === k ? ' on' : '');
      b.setAttribute('aria-pressed', state.slot === k ? 'true' : 'false');
      b.innerHTML = '<span class="bk-time">' + t + '〜' + (h + 1) + ':00</span><span class="bk-st">' + (ok ? (state.slot === k ? '選択中' : '空き') : '予定あり') + '</span>';
      if (ok) { b.addEventListener('click', function () { state.slot = k; renderBooking(); validate(); }); }
      sbox.appendChild(b);
    });
    $('#bk-note').textContent = BOOK ? 'オンライン（Google Meet）で1時間。表示されている「空き」の枠から選べます。' : 'オンライン（Google Meet）で1時間。※いまはデモ表示です（予約の送信先が未設定です）。';
  }
  function loadSlots() {
    if (!BOOK) { return; }
    fetch(BOOK + '?action=slots').then(function (r) { return r.json(); }).then(function (j) {
      if (j && j.ok) { state.avail = j.slots; renderBooking(); }
    }).catch(function () {});
  }

  $$('[data-mode]').forEach(function (b) {
    b.addEventListener('click', function () { state.mode = b.getAttribute('data-mode'); press($$('[data-mode]'), b); modeView(); validate(); });
  });
  $$('[data-status]').forEach(function (b) {
    b.addEventListener('click', function () { state.status = b.getAttribute('data-status'); press($$('[data-status]'), b); });
  });
  $$('[data-goal]').forEach(function (b) {
    b.addEventListener('click', function () {
      var g = b.getAttribute('data-goal'), k = state.goals.indexOf(g);
      if (k > -1) { state.goals.splice(k, 1); } else { state.goals.push(g); }
      b.classList.toggle('on', k < 0); b.setAttribute('aria-pressed', k < 0 ? 'true' : 'false');
    });
  });

  function validate() {
    var ok = {
      name: f.name.value.trim().length > 0,
      email: /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(f.email.value.trim()),
      slot: !meet() || !!state.slot,
      agree: f.agree.checked
    };
    var all = ok.name && ok.email && ok.slot && ok.agree;
    if (state.tried) {
      ['name', 'email'].forEach(function (k) { f[k].classList.toggle('is-err', !ok[k]); f[k].setAttribute('aria-invalid', ok[k] ? 'false' : 'true'); });
      $$('[data-err]').forEach(function (p) { var k = p.getAttribute('data-err'); p.hidden = ok[k] !== false; });
      $('#ap-err').hidden = all;
    }
    return all;
  }
  [f.name, f.email, f.tel, f.msg].forEach(function (el) { el.addEventListener('input', validate); });
  f.agree.addEventListener('change', validate);

  function firstInvalid() {
    if (!f.name.value.trim()) { return f.name; }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(f.email.value.trim())) { return f.email; }
    if (meet() && !state.slot) { return $('#bk-slots .bk-s:not([disabled])') || $('#bk-days .bk-d'); }
    if (!f.agree.checked) { return f.agree; }
    return null;
  }
  function fill() {
    var v = {
      mode: meet() ? '面談を予約する' : '受講を申し込む', slot: fmtSlot(state.slot),
      name: f.name.value, email: f.email.value, tel: f.tel.value || '―', month: f.month.value || '―',
      status: state.status || '―', goals: state.goals.length ? state.goals.join('、') : '―', msg: f.msg.value || '―'
    };
    $$('[data-c]').forEach(function (dd) { dd.textContent = v[dd.getAttribute('data-c')]; });
    modeView();
  }
  $('#ap-next').addEventListener('click', function () {
    state.tried = true;
    if (!validate()) { var el = firstInvalid(); if (el) { el.focus(); } return; }
    fill(); show(2);
  });
  form.addEventListener('submit', function (e) { e.preventDefault(); $('#ap-next').click(); });
  $('#ap-back').addEventListener('click', function () { show(1); });

  function resetSend() {
    var b = $('#ap-send');
    state.sending = false; b.disabled = false;
    $('.s-on', b).hidden = false; $('.s-ing', b).hidden = true; $('.i-on', b).hidden = false; $('.i-ing', b).hidden = true;
  }
  function done() {
    $('#done-title').textContent = meet() ? '面談のご予約を受け付けました' : 'お申し込みを受け付けました';
    $('#done-text').textContent = (f.name.value ? f.name.value + 'さん、' : '') + (meet()
      ? fmtSlot(state.slot) + 'で面談のご予約を受け付けました。Googleカレンダーの招待とオンライン会議のURLを、ご入力のメールアドレスへお送りします。'
      : 'お申し込みありがとうございます。ご入力のメールアドレスへ、確認のメールをお送りします。');
    modeView(); show(3);
  }
  $('#ap-send').addEventListener('click', function () {
    if (state.sending) { return; }
    var endpoint = meet() ? BOOK : form.getAttribute('data-endpoint');
    var err = $('#send-err');
    err.hidden = true;
    state.sending = true;
    var b = $('#ap-send');
    b.disabled = true;
    $('.s-on', b).hidden = true; $('.s-ing', b).hidden = false; $('.i-on', b).hidden = true; $('.i-ing', b).hidden = false;
    if (!endpoint) {
      console.warn('apply.html の <form id="ap-form"> に送信先URL（data-endpoint / data-booking-endpoint）を設定してください。');
      setTimeout(function () { resetSend(); err.hidden = false; err.focus(); }, 600);
      return;
    }
    var payload = meet()
      ? { name: f.name.value.trim(), email: f.email.value.trim(), tel: f.tel.value.trim(), message: f.msg.value.trim(), date: state.slot.slice(0, 10), time: state.slot.slice(11, 16), website: (form.elements.website || {}).value || '' }
      : { mode: 'apply', name: f.name.value.trim(), email: f.email.value.trim(), tel: f.tel.value.trim(), month: f.month.value, status: state.status, goals: state.goals, message: f.msg.value.trim(), agree: f.agree.checked, page: location.href, sentAt: new Date().toISOString() };
    fetch(endpoint, { method: 'POST', headers: { 'Content-Type': meet() ? 'text/plain;charset=utf-8' : 'application/json', 'Accept': 'application/json' }, body: JSON.stringify(payload) })
      .then(function (r) { if (!r.ok) { throw new Error('HTTP ' + r.status); } return r.json().catch(function () { return { ok: true }; }); })
      .then(function (j) {
        if (j && j.ok === false) {
          resetSend();
          if (j.error === 'taken') { state.slot = ''; state.avail = null; loadSlots(); show(1); err.hidden = true; $('#e-slot').textContent = '選んだ枠が直前に埋まりました。別の枠を選んでください。'; $('#e-slot').hidden = false; return; }
          err.hidden = false; err.focus(); return;
        }
        done();
      })
      .catch(function () { resetSend(); err.hidden = false; err.focus(); });
  });

  modeView(); renderBooking(); loadSlots();
})();
