---
{
  "editorialVersion": 1,
  "topicId": "js-filter-empty",
  "audience": "HTML・CSSを少し書ける",
  "format": "手順解説",
  "primaryQuestion": "一致するデータがない場合をどう判定するか",
  "outcome": "全件・一致・0件の三条件を確かめる",
  "sources": [
    {
      "url": "https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Array/filter",
      "checkedOn": "2026-10-17",
      "claim": "条件に合う要素の新しい配列と空配列の返却。"
    },
    {
      "url": "https://developer.mozilla.org/en-US/docs/Glossary/Truthy",
      "checkedOn": "2026-10-17",
      "claim": "空配列もtruthyとして扱われること。"
    }
  ],
  "title": "JavaScriptのfilterで一覧を絞る：二つの条件と0件を分ける",
  "description": "カテゴリを選ぶと一覧が空になる処理を、条件ごとに確認します。架空の貸出道具データを使い、カテゴリと貸出可否を組み合わせ、0件を空配列の長さで判定する練習です。",
  "category": "JavaScript",
  "label": "JAVASCRIPT",
  "date": "2026-10-17",
  "tags": [
    "JavaScript",
    "filter",
    "条件分岐"
  ],
  "featured": false,
  "draft": false,
  "targetQuery": "JavaScriptのfilterで一覧を絞る",
  "stage": "学習",
  "author": "editorial"
}
---

カテゴリだけなら結果があるのに、別の条件を加えると一覧が空になる。JavaScriptのfilterで一覧を絞るときは、一つずつの条件と、結果が0件だった場合の扱いを分けて確かめます。

今回は架空の工作室の貸出道具を、カテゴリと貸出可否で選びます。画面の入力や通信は使わず、手元のJavaScript実行環境でデータ処理を確認します。外部のサービスや実在する在庫とは接続しません。

## 二つの条件を、一文ずつ決める

カテゴリは「すべて」なら制限なし、名前を指定したらそのカテゴリだけにします。もう一つは「貸出可能だけ」という条件で、trueなら借りられる道具だけ、falseなら貸出中も含めます。

条件を先に日本語で書くのは、「どちらかを満たす」のか「両方を満たす」のかを区別するためです。今回ほしいのは両方を満たすもの。カテゴリが違っても貸出可能なら表示する、という仕様ではありません。

次のコードは単独で実行できます。配列は複数の値を順に持つ入れ物で、各道具は名前などの項目を持つオブジェクトとして記述しています。

## 条件を別名にしてから、両方を要求する

```javascript
const tools = [
  { name: "はさみ", category: "紙", available: true },
  { name: "カッター", category: "紙", available: false },
  { name: "木づち", category: "木", available: true }
];
function selectTools(category, onlyAvailable) {
  return tools.filter((tool) => {
    const categoryMatches = category === "すべて" || tool.category === category;
    const availabilityMatches = !onlyAvailable || tool.available;
    return categoryMatches && availabilityMatches;
  });
}
const result = selectTools("紙", true);
console.log(result.map((tool) => tool.name));
console.log(result.length === 0 ? "該当する道具はありません" : `${result.length}件`);
```

`&&`は両方の条件を満たす場合、`||`は少なくとも一方を満たす場合に使っています。onlyAvailableはここではtrueかfalseを渡す約束です。画面から受け取った文字列をそのまま渡す処理ではありません。

[MDNのfilterの説明](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Array/filter)では、条件を通った要素を新しい配列に集め、一件もなければ空配列を返すことを確認できます。今回の最初の結果は「はさみ」一件です。

## 空の配列を、そのまま条件にしない

`if (result)`だけでは、一件以上あるかを判定できません。空の配列も条件式ではtrueとして扱われるためです。[MDNのTruthyの解説](https://developer.mozilla.org/en-US/docs/Glossary/Truthy)で、この性質を確認できます。

修正では`result.length === 0`とし、要素数を調べます。「金属」を指定した場合、このデータには該当カテゴリがないので0件です。これは処理の失敗ではなく、条件に一致する要素がない結果です。

通信失敗まで0件として表示することは、今回の例では扱いません。後で外部データを使うなら、取得に失敗した状態と正常に取得して0件だった状態を分ける設計が必要です。

## 20分を目安に、条件の組み合わせを表で確かめる

呼び出しを変える前に、次の期待結果を書いてください。「すべて・false」は三件、「紙・false」は二件、「紙・true」は一件、「金属・true」は0件です。一組ずつ実行し、件数だけでなく道具名も比較します。

次に木づちのavailableをfalseへ変え、「木・true」が0件になるか確かめます。データはあるのに条件で除かれる場合を、存在しないカテゴリとは別に試すためです。元の三件が削除されていないことも確認しましょう。

結果の予想を言葉にする練習は、[コードを説明する記事](blog-explain-code.html)も参考になります。[JavaScriptの無料レッスン](lesson-javascript.html)へ進む前に、今回は複数条件と空配列の判定だけを完成させます。
