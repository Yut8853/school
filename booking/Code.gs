/**
 * 0→1 Web制作スクール：面談予約（Google Apps Script）
 *
 * ・公開する日時は「毎日19:00〜20:00」「20:00〜21:00」の2枠だけ（各1時間）。
 * ・その時間にカレンダーへ別の予定が入っていれば、サイトには「予定あり」と表示されます。
 * ・予約が入ると、講師のGoogleカレンダーに予定を作成し、申込者へ招待（Google Meetつき）を送ります。
 *
 * 設定は CONFIG だけを書き換えてください。
 */
const CONFIG = {
  CALENDAR_ID: 'factory0611@gmail.com', // 予約を入れるカレンダー
  TIMEZONE: 'Asia/Tokyo',
  SLOTS: ['19:00', '20:00'],            // 1時間枠の開始時刻（19時以降の2枠）
  DURATION_MIN: 60,                     // 1枠の長さ（分）
  DAYS_AHEAD: 14,                       // 何日先まで予約を受け付けるか
  MIN_NOTICE_HOURS: 24,                 // 何時間前まで予約できるか
  WEEKDAYS: [0, 1, 2, 3, 4, 5, 6],      // 受け付ける曜日（0=日 … 6=土）
  USE_MEET: true,                       // Google Meet のURLを自動で付ける（「サービス」で Google Calendar API を追加）
  NOTIFY_OWNER: true,                   // 予約が入ったら講師にメールで知らせる
  TITLE: '面談（0→1 Web制作スクール）',

  // --- Stripe Checkout（受講料の決済） ---
  // シークレットキーはコードに書かず、「プロジェクトの設定」→「スクリプト プロパティ」に STRIPE_SECRET_KEY として保存する
  STRIPE_PRICE_ID: 'price_1UNUysR5onbGewe4tmLFoOBA', // サンドボックス：HP作成スクール（398,000円）。本番では本番用価格IDに差し替える
  SITE_URL: 'https://example.com'        // TODO: 本番サイトのURL（末尾の / は不要）
};

/** 空き状況を返す：GET ?action=slots → { ok: true, slots: { "2026-10-08": ["19:00","20:00"], ... } } */
function doGet(e) {
  const action = (e && e.parameter && e.parameter.action) || 'slots';
  if (action !== 'slots') {
    return json_({ ok: false, error: 'unknown_action' });
  }
  return json_({ ok: true, slots: listFreeSlots_() });
}

/** 予約を受け付ける：POST（本文はJSON。Content-Type は text/plain で送る） */
function doPost(e) {
  const lock = LockService.getScriptLock();
  if (!lock.tryLock(20000)) {
    return json_({ ok: false, error: 'busy' });
  }
  try {
    const p = JSON.parse((e && e.postData && e.postData.contents) || '{}');
    if (p.action === 'checkout') {
      return createCheckoutSession_();
    }
    if (p.website) {
      return json_({ ok: true }); // ボット対策（見えない入力欄に値があれば何もしない）
    }
    const name = String(p.name || '').trim().slice(0, 80);
    const email = String(p.email || '').trim().slice(0, 200);
    const tel = String(p.tel || '').trim().slice(0, 40);
    const message = String(p.message || '').trim().slice(0, 2000);
    const date = String(p.date || '');
    const time = String(p.time || '');
    if (!name || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      return json_({ ok: false, error: 'invalid_input' });
    }
    if (!/^\d{4}-\d{2}-\d{2}$/.test(date) || CONFIG.SLOTS.indexOf(time) < 0) {
      return json_({ ok: false, error: 'invalid_slot' });
    }
    const free = listFreeSlots_();
    if (!free[date] || free[date].indexOf(time) < 0) {
      return json_({ ok: false, error: 'taken' }); // 直前に埋まった・予定が入った
    }
    const start = at_(date, time);
    const end = new Date(start.getTime() + CONFIG.DURATION_MIN * 60000);
    const desc = [
      'お名前：' + name,
      'メール：' + email,
      '電話：' + (tel || '―'),
      '',
      'ご相談内容：',
      message || '―',
      '',
      '（サイトの面談予約フォームから登録）'
    ].join('\n');
    let meetUrl = '';
    if (CONFIG.USE_MEET && typeof Calendar !== 'undefined') {
      const ev = Calendar.Events.insert({
        summary: CONFIG.TITLE + '：' + name + ' 様',
        description: desc,
        start: { dateTime: start.toISOString(), timeZone: CONFIG.TIMEZONE },
        end: { dateTime: end.toISOString(), timeZone: CONFIG.TIMEZONE },
        attendees: [{ email: email, displayName: name }],
        conferenceData: { createRequest: { requestId: Utilities.getUuid(), conferenceSolutionKey: { type: 'hangoutsMeet' } } }
      }, CONFIG.CALENDAR_ID, { conferenceDataVersion: 1, sendUpdates: 'all' });
      meetUrl = ev.hangoutLink || '';
    } else {
      CalendarApp.getCalendarById(CONFIG.CALENDAR_ID).createEvent(CONFIG.TITLE + '：' + name + ' 様', start, end,
        { description: desc, guests: email, sendInvites: true });
    }
    if (CONFIG.NOTIFY_OWNER) {
      const when = Utilities.formatDate(start, CONFIG.TIMEZONE, 'M月d日（E）HH:mm');
      MailApp.sendEmail(Session.getEffectiveUser().getEmail(), '【0→1】面談の予約が入りました：' + when, desc + (meetUrl ? '\n\nMeet：' + meetUrl : ''));
    }
    return json_({ ok: true, start: start.toISOString(), meetUrl: meetUrl });
  } catch (err) {
    return json_({ ok: false, error: 'server_error' });
  } finally {
    lock.releaseLock();
  }
}

/** Stripe Checkout のセッションを作成し、決済ページのURLを返す（{ ok: true, url: "https://checkout.stripe.com/..." }） */
function createCheckoutSession_() {
  const secretKey = PropertiesService.getScriptProperties().getProperty('STRIPE_SECRET_KEY');
  if (!secretKey) {
    return json_({ ok: false, error: 'stripe_not_configured' });
  }
  // TODO: 継続課金にする場合は "subscription"。受講料は一括の支払いなので "payment"
  const mode = 'payment';
  const params = {
    // Checkout Studio で設定した値（fixed_by_ui）
    // ui_mode は省略し、Stripe のホスト型 Checkout（既定値）を使用する。
    'billing_address_collection': 'auto',
    'phone_number_collection[enabled]': 'false',
    'automatic_tax[enabled]': 'false',
    'allow_promotion_codes': 'false',
    'submit_type': 'auto',
    'payment_method_types[0]': 'card',
    'locale': 'ja',
    // 仮の値（sample_only）：STRIPE_INTEGRATION_TODO.md を見て差し替える
    'mode': mode,
    'success_url': CONFIG.SITE_URL + '/thanks.html?session_id={CHECKOUT_SESSION_ID}',
    'cancel_url': CONFIG.SITE_URL + '/confirm.html',
    'line_items[0][price]': CONFIG.STRIPE_PRICE_ID,
    'line_items[0][quantity]': '1',
    // 分割払い（日本発行のクレジットカード）。カード番号を入力すると、決済ページで回数を選べるようになる
    'payment_method_options[card][installments][enabled]': 'true'
  };
  if (mode === 'subscription') {
    params['payment_method_collection'] = 'always';
  }
  // APIのバージョンは指定しない（アカウントの既定のバージョンが使われます）
  const res = UrlFetchApp.fetch('https://api.stripe.com/v1/checkout/sessions', {
    method: 'post',
    headers: { Authorization: 'Bearer ' + secretKey },
    payload: params,
    muteHttpExceptions: true
  });
  const body = JSON.parse(res.getContentText() || '{}');
  if (res.getResponseCode() >= 300 || !body.url) {
    console.error(res.getContentText());
    return json_({ ok: false, error: 'stripe_error' });
  }
  return json_({ ok: true, url: body.url });
}

/** 公開枠のうち、カレンダーに予定が入っていない枠だけを返す */
function listFreeSlots_() {
  const cal = CalendarApp.getCalendarById(CONFIG.CALENDAR_ID);
  const now = new Date();
  const out = {};
  for (let i = 0; i <= CONFIG.DAYS_AHEAD; i++) {
    const d = new Date(now.getTime() + i * 86400000);
    const key = Utilities.formatDate(d, CONFIG.TIMEZONE, 'yyyy-MM-dd');
    const wd = Number(Utilities.formatDate(d, CONFIG.TIMEZONE, 'u')) % 7; // u：1=月 … 7=日
    if (CONFIG.WEEKDAYS.indexOf(wd) < 0) {
      continue;
    }
    const free = [];
    CONFIG.SLOTS.forEach(function (t) {
      const start = at_(key, t);
      const end = new Date(start.getTime() + CONFIG.DURATION_MIN * 60000);
      if (start.getTime() - now.getTime() < CONFIG.MIN_NOTICE_HOURS * 3600000) {
        return;
      }
      const busy = cal.getEvents(start, end).length > 0; // 予定（終日の予定を含む）が1件でもあれば「予定あり」
      if (!busy) {
        free.push(t);
      }
    });
    out[key] = free;
  }
  return out;
}

function at_(dateKey, hhmm) {
  return Utilities.parseDate(dateKey + ' ' + hhmm, CONFIG.TIMEZONE, 'yyyy-MM-dd HH:mm');
}

function json_(obj) {
  return ContentService.createTextOutput(JSON.stringify(obj)).setMimeType(ContentService.MimeType.JSON);
}

/** 動作確認用：スクリプトエディタで実行すると、空き状況がログに出ます */
function testListSlots() {
  Logger.log(JSON.stringify(listFreeSlots_(), null, 2));
}
