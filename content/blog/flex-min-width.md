---
{
  "editorialVersion": 1,
  "topicId": "flex-min-width",
  "audience": "HTML・CSSを少し書ける",
  "format": "手順解説",
  "primaryQuestion": "Flexboxの長い文字がはみ出すときどこを直すか",
  "outcome": "直接の子の最小幅と折り返しを分けて確認できる",
  "sources": [
    {
      "url": "https://developer.mozilla.org/en-US/docs/Web/CSS/min-width",
      "checkedOn": "2026-10-15",
      "claim": "Flexアイテムの自動最小幅は内容由来のサイズになる場合がある。"
    },
    {
      "url": "https://developer.mozilla.org/en-US/docs/Web/CSS/overflow-wrap",
      "checkedOn": "2026-10-15",
      "claim": "anywhereは通常分割できない文字列にはみ出し防止の折り返し機会を与える。"
    }
  ],
  "title": "Flexbox内の長い文字を収める：最小幅と折り返しを分ける",
  "description": "横並びのカードで長い英字だけが枠から出るときに。架空の資料名カードを使い、Flexboxの子要素の最小幅と文字の折り返しを分けて調べ、必要な内容を隠さずに表示する方法を紹介します。",
  "category": "HTML / CSS",
  "label": "HTML / CSS",
  "date": "2026-10-15",
  "tags": [
    "Flexbox内の長い文字を収める"
  ],
  "featured": false,
  "draft": false,
  "targetQuery": "Flexbox内の長い文字を収める",
  "stage": "学習",
  "author": "editorial"
}
---

短い資料名なら収まるのに、長い英字を入れるとカードが横へ広がる。Flexbox内の長い文字を収めるには、子要素が縮める幅と、文字列が折り返せる位置を分けて調べます。文字を小さくし続ける前に、この二点を確認しましょう。

Flexboxは子要素を横方向や縦方向へ並べるCSSの仕組みです。ここではHTMLとCSSを少し書ける人向けに、架空の資料室のカードを使います。画像やリンクを含まない、表示だけの小さな例です。

## はみ出す文字を残したまま、横並びの親を探す

問題を調べる間は、長い資料名を短く置き換えないようにします。短い名前で収まっても、元の内容を表示できるかは未確認のままだからです。まず`display: flex`が付いた親と、その直接の子を探します。

次のHTMLは本文の一部です。手元の練習ページのbodyへ置き、続くCSSを適用してください。単独のHTML文書に必要なheadなどは省略しています。

```html
<div class="resource-card">
  <span class="resource-card__type">資料</span>
  <div class="resource-card__body">
    <p>RegionalNaturalHistoryObservationArchive2026</p>
  </div>
</div>
```

ここでは種類の表示と本文の二つが、横並びになる直接の子です。本文の中のpだけを調整しても、その外側の幅の制約が残る場合があります。どの箱を縮めたいのか、HTMLの関係から特定します。

## 本文の箱が縮めるように、最小幅を見直す

[MDNのmin-widthの説明](https://developer.mozilla.org/en-US/docs/Web/CSS/min-width)では、Flexアイテムの自動の最小幅が内容由来のサイズになる場合が説明されています。長く切れ目のない文字列が、箱の縮小を妨げる手掛かりになります。

以下は修正後のCSSです。本文の直接の子に`min-width: 0`を付け、内容から決まる最小幅に止められず縮められるようにします。カード自体に大きな固定幅を付けている場合などは、別途その指定の確認も必要です。

```css
.resource-card {
  display: flex;
  gap: 1rem;
  max-width: 28rem;
  padding: 1rem;
  border: 1px solid #333;
}
.resource-card__type {
  flex: 0 0 auto;
}
.resource-card__body {
  flex: 1 1 auto;
  min-width: 0;
  overflow-wrap: anywhere;
}
.resource-card__body p {
  margin: 0;
}
```

`min-width: 0`は文字を自動で小さくする指定ではありません。箱が小さくなっても中の文字を折り返せなければ、文字がはみ出す可能性は残ります。

## 文字を折り返して、全文を読めるようにする

上の例の`overflow-wrap: anywhere`は、長い英字などが収まらないときに途中で折り返せるようにします。[MDNのoverflow-wrapの説明](https://developer.mozilla.org/en-US/docs/Web/CSS/overflow-wrap)で、この値の働きを確認できます。

本文を切り取る`overflow: hidden`だけを使うと、見た目のはみ出しが消えても資料名の末尾を読めなくなることがあります。このカードでは全文を伝えたいので、隠すより折り返す案を選びます。高さも固定せず、行が増えた分の領域を持たせます。

既存のCSSに`white-space: nowrap`など折り返しを止める指定があれば、それも調査対象です。二つの指定を追加すればすべてのはみ出しが直る、という判断はしないでください。入れ子の外側にも制約がある場合は、親子を一段ずつたどります。

## 20分を目安に、二つの指定を外して比べる

修正後の例を練習ページへ置き、短い日本語と長い英字で表示を確認します。次に`overflow-wrap`だけを一時的に外し、文字がどう変わるかを観察します。戻した後に`min-width`を外して比較してください。anywhere自体も最小幅の計算に影響するため、この例では後者を外しても見た目が変わらないことがあります。

両方を外した状態とも比べ、何を変更したときに箱や文字が変わったかを書きます。320px程度の狭い画面と広い画面で、資料名の末尾が読めるか確認しましょう。実機を含む確認項目は、[スマートフォン表示の点検記事](blog-responsive-check.html)にまとめています。

練習の完成条件は、全文が読めることと、箱の幅と文字の折り返しを分けて説明できることです。続けて配置を練習する場合は、[無料レッスン](lesson.html)の課題を利用できます。
