---
{
  "editorialVersion": 1,
  "topicId": "fieldset-legend",
  "audience": "HTML・CSSを少し書ける",
  "format": "手順解説",
  "primaryQuestion": "選択肢全体への質問と各選択肢をどう関連付けるか",
  "outcome": "二つの質問を別グループにする",
  "sources": [
    {
      "url": "https://www.w3.org/WAI/tutorials/forms/grouping/",
      "checkedOn": "2026-10-17",
      "claim": "fieldsetとlegendによる入力部品のグループ化。"
    },
    {
      "url": "https://developer.mozilla.org/en-US/docs/Web/HTML/Reference/Elements/input/radio",
      "checkedOn": "2026-10-17",
      "claim": "同じnameのラジオボタンの排他選択、ラベル、キーボード操作。"
    }
  ],
  "title": "ラジオボタンをfieldsetでまとめる：質問と選択肢の関係を残す",
  "description": "「午前」「午後」だけが並ぶと、何について選んでいるか分からなくなります。架空の体験会を使い、fieldsetとlegendで質問ごとにまとめ、nameとlabelの役割も分けて確認します。",
  "category": "アクセシビリティ",
  "label": "ACCESSIBILITY",
  "date": "2026-10-17",
  "tags": [
    "フォーム",
    "fieldset",
    "ラジオボタン"
  ],
  "featured": false,
  "draft": false,
  "targetQuery": "ラジオボタンをfieldsetでまとめる",
  "stage": "学習",
  "author": "editorial"
}
---

選択肢には名前を付けたのに、「午前」が何の時間か分からない。ラジオボタンをfieldsetでまとめると、選択肢全体への質問と、一つずつの答えを分けて表せます。

ラジオボタンは、同じグループから一つを選ぶ入力部品です。題材は架空の製本体験会で、参加時間と表紙の色を選びます。送信や予約処理を持たない、選択の練習用HTMLです。

## 質問の名前と、答えの名前を別々に用意する

「参加時間を選んでください」が質問、「午前」「午後」が答えです。答えだけにlabelを付けても、全体の質問とのまとまりが必要になります。

`fieldset`は関連する入力部品をまとめ、`legend`はそのまとまりの名前を表します。[W3C WAIのフォームのグループ化の説明](https://www.w3.org/WAI/tutorials/forms/grouping/)で、この組み合わせを確認できます。

見た目を枠で囲むだけならdivでも作れますが、今回の目的は質問と部品の関係をHTMLで表すことです。見出しのような文字を近くへ置いただけで、関連付けまで終えたと思わないようにします。

## 一つの質問を、一つのfieldsetにする

次はbodyに置く断片です。既存の練習用HTMLへ追加できます。legendをfieldsetの最初に置き、その後へ選択肢を並べます。

```html
<fieldset>
  <legend>参加時間</legend>
  <p><input type="radio" id="time-am" name="session" value="am">
    <label for="time-am">午前</label></p>
  <p><input type="radio" id="time-pm" name="session" value="pm">
    <label for="time-pm">午後</label></p>
</fieldset>
<fieldset>
  <legend>表紙の色</legend>
  <p><input type="radio" id="cover-blue" name="cover" value="blue">
    <label for="cover-blue">青</label></p>
  <p><input type="radio" id="cover-green" name="cover" value="green">
    <label for="cover-green">緑</label></p>
</fieldset>
```

各inputのidは別々にし、対応するlabelのforと一致させます。選択肢そのものの名前の付け方は、[labelの関連付けを確認する記事](blog-form-label.html)も参照してください。legendを加えても、各選択肢のlabelは必要です。

## nameとfieldsetは、同じ役割ではない

同じフォーム内のラジオボタンでは、同じnameを持つものが一つの選択グループになります。ここでは時間がsession、色がcoverです。fieldsetを二つに分けただけで、nameの重複による意図しないグループ化が直るわけではありません。

失敗例は、四つすべてをname="choice"にすることです。午前を選んだ後に青を選ぶと、時間の選択まで外れてしまいます。修正では質問ごとにnameを分け、一つの質問の中では同じnameにそろえます。

[MDNのラジオボタンの説明](https://developer.mozilla.org/en-US/docs/Web/HTML/Reference/Elements/input/radio)でも、nameによるグループと一つの選択の関係を確認できます。valueは選択を識別する値で、利用者に見える文字はlabelに書きます。

## 15分を目安に、二つの質問を順に操作する

最初に午前、次に青を選び、両方の質問に回答が残るか確かめます。その後、午後へ変え、午前だけが外れて青は残るかを見てください。これで質問の中と質問同士の関係を別々に確認できます。

続いてキーボードでグループへ移動し、矢印キーによる選択を試します。現在位置の表示を消さず、labelの文字を押しても選べるかを確認してください。読み上げ環境では質問名と選択肢が伝わるかも調べ、試せなかった環境は記録に残します。

[無料レッスン](lesson.html)で入力部品を扱う場合も、まずこの二つのグループだけで練習できます。今回の完成は選択関係の確認までで、申込受付の完成ではありません。実際のフォームへ進む際は、必須入力やエラー、送信後の結果を別途設計してください。
