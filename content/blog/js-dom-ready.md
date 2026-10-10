---
{
  "editorialVersion": 1,
  "topicId": "js-dom-ready",
  "audience": "HTML・CSSを少し書ける",
  "format": "失敗の直し方",
  "primaryQuestion": "HTMLにあるボタンをJavaScriptが見つけられないのはなぜか",
  "outcome": "読み込み失敗・idの違い・実行順を切り分け、外部スクリプトをdeferで読み込める",
  "sources": [
    {
      "url": "https://developer.mozilla.org/en-US/docs/Web/HTML/Reference/Elements/script",
      "checkedOn": "2026-10-10",
      "claim": "外部の通常スクリプトに対するdeferの実行時期とasyncとの違い。"
    },
    {
      "url": "https://developer.mozilla.org/en-US/docs/Web/API/Document/querySelector",
      "checkedOn": "2026-10-10",
      "claim": "一致する要素がなければnullを返す。"
    }
  ],
  "title": "ボタンが反応しないとき、JavaScriptの読み込み順を確かめよう",
  "description": "HTMLにボタンがあるのにJavaScriptから見つからない。架空の工房案内を例に、ファイルの読み込み、idの一致、実行のタイミングを順に調べ、deferで直す手順を紹介します。",
  "category": "JavaScript",
  "label": "JAVASCRIPT",
  "date": "2026-10-07",
  "tags": [
    "JavaScript",
    "defer",
    "読み込み順"
  ],
  "featured": false,
  "draft": false
}
---

ボタンを押しても何も起きず、Consoleにはnullに関するエラーが出る。コードの綴りが合っていても、実行する時点でボタンがまだ用意されていない場合があります。架空の木工工房の案内ページで、作業時間を表示するボタンを題材に、調べる順番を整理します。

今回は普通の外部JavaScriptファイルを一つ読み込む練習です。通信で後から部品を追加する画面や、フレームワークの初期化は扱いません。HTMLとJavaScriptの担当を分けて、どちらの準備が先に必要かを考えましょう。

## ファイル・名前・タイミングの順に調べる

最初にブラウザーの開発者ツールで、JavaScriptファイルの読み込みが失敗していないかを確認します。ファイル名や保存場所が違えば、中のコードを変えても実行されません。次にHTMLのidと、JavaScriptで指定した名前を見比べます。

`querySelector('#show-hours')`は、そのidを持つ要素を探します。[MDNのquerySelectorの説明](https://developer.mozilla.org/en-US/docs/Web/API/Document/querySelector)にある通り、一致する要素がなければ結果は`null`です。これは「ボタンが取得できていない」という手がかりであり、原因が読み込み順だと確定したわけではありません。

名前も合っているなら実行位置を確認します。head内で通常の外部スクリプトをそのまま読み込むと、bodyのボタンを読み取る前に処理が始まることがあります。エラーを消すために待ち時間を適当に追加する前に、読み込む順番を直します。

## 外部スクリプトにdeferを付ける

次のHTMLを練習用のindex.htmlに保存し、同じフォルダへhours.jsを置きます。ボタンは処理を登録するまで無効にしてあり、初期化できていない状態で押せるようにはしません。

```html
<!doctype html>
<html lang="ja">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>工房の作業時間</title>
  <script src="hours.js" defer></script>
</head>
<body>
  <h1>工房の作業時間</h1>
  <p>通常の作業時間は10時から17時です。</p>
  <button id="show-hours" type="button" disabled>作業時間を確認する</button>
  <p id="hours-result" role="status"></p>
</body>
</html>
```

[MDNのscriptの説明](https://developer.mozilla.org/en-US/docs/Web/HTML/Reference/Elements/script)では、deferを付けた外部の通常スクリプトはHTMLの解析後に実行されます。asyncは読み込みが終わり次第実行する指定なので、この目的で置き換えません。また、srcのない通常のインラインスクリプトにdeferを付けても同じ効果はありません。

## 要素を確認してから操作を登録する

hours.jsには次のコードを保存します。要素の不足があればConsoleへ理由を出し、両方そろった場合だけボタンを有効にします。時間そのものはHTMLにも置き、JavaScriptが動かなくても読める構成です。

```js
const button = document.querySelector('#show-hours');
const result = document.querySelector('#hours-result');

if (!button || !result) {
  console.error('作業時間のボタンまたは表示先が見つかりません。');
} else {
  button.addEventListener('click', () => {
    result.textContent = '通常の作業時間は10時から17時です。';
  });
  button.disabled = false;
}
```

イベントは、クリックなどの操作が起きたという通知です。この例はページの読み込み時に一度だけ処理を登録します。同じ初期化を何度も呼ぶ部品に移植するなら、重複登録や部品を外す際の後始末を別に設計してください。

## 15分を目安に、原因を一つずつ変えて確かめる

まず正しい二つのファイルで表示を開き、クリックで文章が出るか確かめます。次に練習用コピーでidだけを変更し、Consoleに不足のメッセージが出ることを確認して元へ戻します。最後にJavaScriptを無効にしても、通常の作業時間が読めるかを見ます。

ファイル名とidを同時に変えると、どの変更が原因か分からなくなります。[入力を変えて結果を予想する記事](blog-explain-code.html)のように、変更と予想を一組ずつ残しましょう。画面操作へ進む練習には、[JavaScriptの無料レッスン](lesson-javascript.html)も使えます。
