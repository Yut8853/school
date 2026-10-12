# 安全なデプロイとSEO確認

1. `npm ci && npm run build && node scripts/copy-dist.mjs` で `dist/` を生成する。Vercelでは `vercel.json` のbuildCommandがこれを行う。
2. `dist/` に `data/`, `content/`, `booking/`, `docs/`, `.git/`, `node_modules/`, `*.md` がないことを確認する。
3. **デプロイ前に `assets/` と `reports/` の画像・PDF・HTML等を必ず目視確認すること。** これらは公開用ファイルなので秘密情報を置かない。
4. デプロイ後 `https://school.junkbranding.com/data/competitors.json`, `/booking/Code.gs`, `/AGENTS.md`, `/PRICING_POLICY_NOTES.md`, `/content/blog/reviews/` がすべて404となることを確認する。
5. 旧デプロイで公開されていた場合、Vercelの旧デプロイURLやキャッシュ、外部キャッシュに残る可能性がある。旧URLの無効化と必要に応じた関係者連絡・情報変更を検討する。
6. Google Search Consoleで非公開ファイルのインデックス状況を確認。削除ツールは一時的な非表示なので、まず404/410を確認する。
7. サイトマップ・canonical・OGP・RSS・構造化データ・申込機能が本番で動作することを確認する。
8. 個別OGP PNG画像は、画像を生成・実在確認した記事だけfrontmatterの`socialImage`を指定する。未指定では共通画像を使う。架空URLを指定しない。
9. 新記事に講師著者を設定する際は`author: instructor`と`instructorReviewed: true`を講師本人のレビュー後に限り設定する。
10. Google Search ConsoleおよびGA4で流入・検索語・無料相談までの行動を計測する。
