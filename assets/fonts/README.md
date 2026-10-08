# ローカル配信フォント

Google Fonts APIのCSSを読み込まず、同じオリジンから配信します。
768px以下では日本語Webフォントを読み込まず、既存のHiragino / Yu Gothic / sans-serifフォールバックを使用します。英字はGeist / Geist Monoを使用します。
769px以上ではZen Kaku Gothic Newも使用します。すべて `font-display: optional` で、読み込みが間に合わない訪問ではシステムフォントで表示を続けます。

## 出典・ライセンス

- Zen Kaku Gothic New: https://github.com/google/fonts/tree/main/ofl/zenkakugothicnew （Regular / Medium / Bold / BlackのTTF）
- Geist: https://fonts.gstatic.com/s/geist/v5/gyByhwUxId8gMEwcGFWNOITd.woff2
- Geist Mono: https://fonts.gstatic.com/s/geistmono/v6/or3nQ6H-1_WfwkMZI_qYFrcdmhHkjko.woff2
- いずれもSIL Open Font License 1.1。各 `OFL-*.txt` を同梱しています。

2026-10-08取得。日本語はサイトのHTML・JS・CSSにある文字とASCIIにサブセット化しています。英字の2ファイルは配信元のLatin可変フォントをそのまま使用しています。

## 日本語本文を追加したとき

新しい文字がサブセットにない場合はシステムフォントで補われます。書体をそろえるには以下を実行してください。

1. 上記公式配布元の `ZenKakuGothicNew-Regular.ttf` / `Medium.ttf` / `Bold.ttf` / `Black.ttf` を、一時フォルダーへ `regular.ttf` / `medium.ttf` / `bold.ttf` / `black.ttf` の名前で保存。
2. Python仮想環境に `fonttools==4.60.2` と `brotli==1.2.0` をインストール。
3. `python scripts/build-fonts.py /path/to/source-directory`
4. `npm run build && npm run check`

生成したWOFF2とCSSを一緒に公開してください。
