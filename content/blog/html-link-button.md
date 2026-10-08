---
{
  "title": "リンクとボタン、見た目が同じでも役割は違う",
  "description": "ページを移動するならリンク、その場で操作するならボタン。迷いやすい使い分けを短いコード例で整理します。",
  "category": "HTML / CSS",
  "label": "HTML",
  "date": "2026-10-08",
  "tags": [
    "HTML",
    "アクセシビリティ"
  ],
  "featured": false
}
---

四角い背景が付いているからボタン、というわけではありません。HTMLの要素は、見た目ではなく、押したあとに起きることから選びます。

## 別のページへ移動するときはリンク

店舗の予約ページへ移動するなら、`href`を持つ`a`要素を使います。

```html
<a class="reservation-link" href="reservation.html">
  来店予約ページへ
</a>
```

リンクなら、別のタブで開いたり、移動先のURLをコピーしたりできます。ブラウザが用意している操作を、そのまま使えるのが利点です。

## その場の操作にはボタン

説明を開く、メニューを閉じる、フォームを送信する。こうした操作には`button`要素を使います。フォームの送信に使わないボタンは、`type="button"`を指定します。

```html
<button type="button" aria-expanded="false" aria-controls="details">
  詳しい説明を開く
</button>
<div id="details" hidden>
  <p>商品の素材とお手入れ方法です。</p>
</div>
```

この例は、開閉操作を実装する前のHTMLです。実際に開閉させるには、JavaScriptで`hidden`と`aria-expanded`を一緒に更新します。

## divをクリックできるようにする前に

`div`にクリック処理を付けるだけでは、ボタンと同じ操作性にはなりません。キーボードで移動できるか、何の操作なのかが読み上げられるかなど、追加の対応が必要になります。

標準のリンクやボタンを使える場面では、まずその要素を選びましょう。

## 見た目はCSSで整える

リンクにも、余白や背景色を付けられます。キーボード操作時のフォーカス表示は消さないようにします。

```css
.reservation-link {
  display: inline-flex;
  align-items: center;
  min-height: 44px;
  padding: 12px 24px;
  background: #141414;
  color: #fff;
  border-radius: 999px;
}

.reservation-link:focus-visible {
  outline: 3px solid #be330c;
  outline-offset: 4px;
}
```

## 確認してみよう

自分のサイトにあるクリックできる要素を、移動と操作に分けてみてください。次にTabキーで順に移動し、リンクはEnter、ボタンはEnterとSpaceで操作できるか確認します。

参考：[MDNのa要素](https://developer.mozilla.org/ja/docs/Web/HTML/Element/a)、[MDNのbutton要素](https://developer.mozilla.org/ja/docs/Web/HTML/Element/button)。

[Semantic HTMLの無料レッスンへ](lesson.html)
