# Stripe 連携：残りの作業（STRIPE_INTEGRATION_TODO）

Stripe Checkout（Stripeがホストする決済ページ）で、受講料398,000円を受け付ける仕組みを追加しました。
現在は **Stripe Payment Link** へ直接移動する方式です。決済にApps Scriptは不要です。代替方式として、Checkout Sessionを作る処理も [booking/Code.gs](booking/Code.gs) に用意しています。

## 現在の接続状況（2026-10-06）

ユーザー提供のStripe画面で確認したサンドボックスの商品：
- 商品：HP作成スクール（398,000円）
- 商品ID：`prod_VOHXWpf0QgAUPE`
- 価格ID：`price_1UNUysR5onbGewe4tmLFoOBA`（`booking/Code.gs` に設定済み）
- 本番用として提供された決済リンク：`https://buy.stripe.com/eVq28t87e9VBaKXgfwf3a01`（`confirm.html` の `data-payment-link` に設定済み）。
- 以前のテスト決済リンク：`https://buy.stripe.com/test_14A5kFevQ0Pmaa5dlp7Zu00`（サイトでは使用していません）。
- 本番リンクの商品・金額・有効状態、セキュリティチェックの完了状況：未確認。
- サイト公開・Stripe上でのテスト決済完了の確認：未実施。

上記の価格IDはテスト環境のものです。現在のPayment Link方式ではこのIDは使用しません。Apps Script方式へ切り替えて本番で使う場合は、本番環境の価格ID・キーを設定してください。

## Apps Script が未作成の場合：Payment Link で接続

1. Stripeで「0→1 Web制作スクール 受講料」（398,000円・JPY・一回払い）の決済リンクを作成します。最初はテスト環境で確認してください。
2. `confirm.html` の `data-payment-link=""` に `https://buy.stripe.com/…` を設定します。設定されていれば Apps Script より優先されます。シークレットキーは不要です。
3. 本番受付前に最終確認ページの受講開始日・実費・受講条件・キャンセル条件を確定します。
4. Payment Link側の決済完了画面を使用できます。公開URLが決まったら、必要に応じて `thanks.html` へのリダイレクトを設定します。
5. 支払いの確定はStripeダッシュボードで確認してください。完了ページへのアクセスだけでは支払い済みと判断しません。分割払いはPayment Link側でも別途設定・確認が必要です。

以下は Apps Script で Checkout Session を作る場合の設定です。

## Values to Replace

次の値は仮のものです。本番公開の前に、必ず差し替えてください。

**Files containing placeholders:**
- [booking/Code.gs](booking/Code.gs)（`CONFIG` と `createCheckoutSession_()`）
- [confirm.html](confirm.html)（`data-checkout-endpoint`）

| Field | Current Value | What to Set |
|-------|--------------|-------------|
| mode | `payment` | 受講料は一括の支払いなので `payment` のままでよい。継続課金にする場合だけ `subscription` |
| success_url | `https://example.com/thanks.html?session_id={CHECKOUT_SESSION_ID}` | `CONFIG.SITE_URL` を本番サイトのURLにする。`{CHECKOUT_SESSION_ID}` はそのまま残す |
| cancel_url | `https://example.com/confirm.html` | `CONFIG.SITE_URL` を本番サイトのURLにする（決済をやめたときに最終確認ページへ戻る） |
| line_items[].price | `price_1UNUysR5onbGewe4tmLFoOBA`（テスト） | Stripeダッシュボード（https://dashboard.stripe.com/prices）で受講料398,000円（JPY・一括）の価格を作り、その価格ID（`price_` で始まる）を `CONFIG.STRIPE_PRICE_ID` に入れる |
| data-checkout-endpoint | （空） | `confirm.html` の `<form id="cf-final" … data-checkout-endpoint="">` に、Apps Script のウェブアプリURL（面談予約と同じURL）を入れる |

## Configured Parameters

Webサイト用の Checkout に合わせた設定です。

**Files containing these parameters:**
- [booking/Code.gs](booking/Code.gs)（`createCheckoutSession_()`）

| Parameter | Value |
|-----------|-------|
| ui_mode | 省略（ホスト型の既定値を使用） |
| billing_address_collection | `auto` |
| phone_number_collection | `{ enabled: false }` |
| automatic_tax | `{ enabled: false }` |
| allow_promotion_codes | `false` |
| submit_type | `auto` |
| payment_method_types | `card` |
| locale | `ja` |
| payment_method_collection | `always`（mode が `subscription` のときだけ送る設定。今回は `payment` なので送っていません） |
| payment_method_options[card][installments][enabled] | `true`（分割払い。Checkout Studio の設定ではなく、運営者の要望で追加） |

### 確認してほしい点

- **Web向け設定：** `ui_mode` は既定値を使用し、モバイルアプリ用の `origin_context` と `integration_identifier` は送信しません。
- **分割払い：** Checkout Session に `payment_method_options[card][installments][enabled]=true` を付けて、分割払いを有効にしています。次の条件をすべて満たすと、決済ページでカード番号を入力したあとに、支払い回数を選ぶ欄が表示されます。
  - Stripeのアカウントが日本のアカウントであること
  - 通貨が日本円であること（受講料の価格をJPYで作る）
  - 日本で発行された**クレジットカード**であること（デビットカード・プリペイドカードは対象外）
  - 選べる回数は、カード会社によって異なります
  - 表示されない場合は、Stripeダッシュボードの「設定」→「決済手段」で、カードの分割払いが有効になっているか確認してください
  - 分割払いの手数料は申込者がカード会社に支払います。運営側の決済手数料は一括払いと同じです

## Setup

### 1. Stripe のシークレットキーを保存する

1. Stripeダッシュボードの「開発者」→「APIキー」（https://dashboard.stripe.com/test/apikeys）で、シークレットキー（`sk_test_...`）をコピーします。
2. Apps Script のプロジェクト（面談予約と同じもの）で「プロジェクトの設定」→「スクリプト プロパティ」を開きます。
3. プロパティ `STRIPE_SECRET_KEY` に、コピーしたキーを保存します。

キーはコードやHTMLには書かないでください（https://docs.stripe.com/keys-best-practices）。本番では `sk_live_...` に差し替えます。

### 2. 価格を作る

Stripeダッシュボードの「商品カタログ」で、商品「0→1 Web制作スクール 受講料」、価格 398,000円（JPY・一括）を作成し、価格IDを `CONFIG.STRIPE_PRICE_ID` に入れます。

### 3. デプロイを更新する

`booking/Code.gs` を Apps Script に貼り付け直し、「デプロイ」→「デプロイを管理」→ 編集 →「新しいバージョン」で更新します。URLは変わりません。

## 追加・変更したファイル

```
booking/Code.gs        Checkout Session を作る処理（createCheckoutSession_）を追加。POST { action: "checkout" } で決済ページのURLを返す
confirm.html           「同意して、決済へ進む」フォームを、Apps Script 経由で Stripe に移動する形に変更
assets/js/confirm.js   上のフォームの送信処理（新規）
thanks.html            決済完了ページ（success_url の移動先・新規・検索除外）
```

## How it works

1. 申込者がフォームを送信 → 運営側が内容を確認し、受講契約の最終確認ページ（`confirm.html`）のURLをメールで送る
2. 申込者が最終確認ページで内容に同意し、「同意して、決済へ進む」を押す
3. `confirm.js` が Apps Script に `{ action: "checkout" }` を送る
4. Apps Script が Stripe の API で Checkout Session を作り、決済ページのURLを返す
5. ブラウザが Stripe の決済ページに移動し、申込者がカード情報を入力して支払う
6. 支払いが終わると `thanks.html` に戻る。キャンセルした場合は `confirm.html` に戻る

受講料の金額はサーバー側（価格ID）で決まるため、ブラウザから金額を書き換えることはできません。

## Testing

テストモードのキー（`sk_test_...`）で、次のテスト用カード番号を使って確認できます。有効期限は未来の日付、CVCは任意の3桁です。

| カード | 番号 |
|---|---|
| 支払い成功 | 4242 4242 4242 4242 |
| 支払い失敗（残高不足） | 4000 0000 0000 9995 |
| 3Dセキュア認証あり | 4000 0027 6000 3184 |

一覧：https://docs.stripe.com/testing

分割払いの表示を確かめるテスト用カード番号は、Stripeの分割払いのドキュメントにあります：https://docs.stripe.com/payments/jp-installments/accept-a-payment#testing

## Next steps

- **支払いの確認：** Stripeダッシュボードの「設定」→「メール通知」で、支払い成功時に通知が届くようにします。Apps Script は受け取るリクエストのヘッダーを読めないため、Webhook の署名を検証できません。支払い完了をもとに自動で処理（受講開始の登録など）をしたい場合は、Webhook を受けられる別のサーバー（Cloud Functions など）を用意してください。
- **領収書：** 「設定」→「カスタマーメール」で、支払い成功時の領収書メールを有効にします。
- **最終確認ページの空欄：** `confirm.html` の受講開始日・実費・受講条件・キャンセル条件の `[ ]` を埋めてから、本番のキーに切り替えてください。
- **アクセスの制限（任意）：** いまは最終確認ページのURLを知っていれば誰でも決済ページを開けます（金額は固定なので、受講料以外が請求されることはありません）。申込者だけに限りたい場合は、メールで送るURLに確認用のコードを付け、Apps Script でそのコードを確かめる処理を追加します。

## Resources

- https://support.stripe.com
- https://docs.stripe.com/mcp
