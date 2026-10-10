---
{
  "editorialVersion": 1,
  "topicId": "js-text-output",
  "audience": "HTML・CSSを少し書ける",
  "format": "小さな制作課題",
  "primaryQuestion": "入力した文字をHTMLとして解釈させずに表示するには",
  "outcome": "textContentで表示専用の要素を更新し、空欄とタグに似た文字を確認できる",
  "sources": [
    {
      "url": "https://developer.mozilla.org/en-US/docs/Web/API/Node/textContent",
      "checkedOn": "2026-10-10",
      "claim": "textContentは文字列を設定し、設定先の子要素を置き換える。innerHTMLとの違い。"
    }
  ],
  "title": "入力した文字をそのまま表示する、textContentの使い方",
  "description": "入力欄の文字をページに表示する小さなプレビューを作ります。架空の展示作品名を題材に、HTMLとして解釈させない表示方法、空欄の扱い、更新する範囲の決め方を確認します。",
  "category": "JavaScript",
  "label": "JAVASCRIPT",
  "date": "2026-10-07",
  "tags": [
    "JavaScript",
    "textContent",
    "入力値"
  ],
  "featured": false,
  "draft": false
}
---

作品名を入力すると、隣の見本にもその名前が出る。そんな小さなプレビューでも、「文字として表示するのか」「HTMLの部品として組み立てるのか」を決める必要があります。今回は架空の写真展示で、作品名の表示を試す練習ページを作ります。

入力内容は保存も送信もしません。ブラウザー内で仮の名前を表示するだけの例です。自分の本名や公開前の作品情報を使う必要はなく、「窓辺の光」のような練習用の文字で試せます。

## 作品名をHTMLとして組み立てない

文字を表示する目的で、入力値をそのまま`innerHTML`へ渡すと、タグに似た部分までHTMLとして解釈される可能性があります。作品名に記号を使いたいだけなのに、表示の構造を変える入口を作ることになります。

ここでは`textContent`を使います。[MDNのtextContentの説明](https://developer.mozilla.org/en-US/docs/Web/API/Node/textContent)で、文字列の設定とinnerHTMLとの違いを確認できます。たとえば`<b>朝</b>`という入力は、太字の「朝」を作る指示ではなく、その記号を含む文字列として扱います。

この選択は、今回の表示先でHTMLとして解釈させないためのものです。保存先の検証やURLの扱いまで一括して解決する仕組みではありません。別の用途へ入力を渡す場合は、その用途に合った確認が必要です。

## 表示専用の要素を一つ用意する

次の断片を練習用HTMLのbody内へ置きます。「作品名：」という固定の見出しと、変化する値を別の要素に分けています。表示する文字が長くなる場合に備え、表示先は途中で折り返せるようにします。

```html
<label for="work-name">作品名（40文字以内）</label>
<input id="work-name" type="text" maxlength="40">
<button id="preview-name" type="button" disabled>表示を試す</button>
<p role="status">作品名：<span id="name-result">未入力</span></p>
<style>
  #name-result { overflow-wrap: anywhere; }
</style>
```

ラベルと入力欄の対応は、[labelで項目名を残す記事](blog-form-label.html)と同じ考え方です。プレビューのためにラベルを省かず、何を入力する欄かを常に読めるようにします。

## ボタンを押したときだけ表示を更新する

次のコードは、上のHTMLより後のscript要素内へ置いてください。JavaScriptファイルに分ける場合は、HTMLの解析後に実行されるように読み込みを設定します。入力のたびに更新する方式ではなく、今回はボタンを押した結果として表示を変えます。

```js
const input = document.querySelector('#work-name');
const button = document.querySelector('#preview-name');
const result = document.querySelector('#name-result');

if (input && button && result) {
  button.addEventListener('click', () => {
    const name = input.value.trim();
    result.textContent = name || '未入力';
  });
  button.disabled = false;
} else {
  console.error('作品名プレビューの要素を確認してください。');
}
```

`trim()`で前後の空白を除き、残りが空なら「未入力」と表示します。作品名の途中の空白は残ります。この扱いは今回の練習の仕様なので、前後の空白にも意味がある入力へ無条件に流用しないでください。

textContentの設定先に子要素があれば、それも置き換わります。段落全体を更新すると固定の「作品名：」まで消えるため、変更するのはspanだけです。ボタンや説明を含む大きな箱へまとめて設定しないことも、確認のポイントになります。

## 15分を目安に、四つの入力で表示を比べる

「窓辺の光」、空欄、空白だけ、`<b>朝</b>`の四つを順に入力し、ボタンを押します。通常の名前はそのまま、空欄と空白だけは「未入力」、最後の例は山括弧を含む文字として見えることを確認します。

続いてTabで入力欄からボタンへ進み、キーボードでも表示を変えられるか試します。結果の読み上げを確認できる環境なら、その伝わり方も記録してください。未確認の操作は実施済みとせず、次の確認項目に残します。入力と結果の関係をさらに扱うには、[JavaScriptの無料レッスン](lesson-javascript.html)を参照できます。
