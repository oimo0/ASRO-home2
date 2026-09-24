# Kuup AI (frontend)

`Kuup AI powered by ASRO` の画面UIです。GitHub Pagesで配信し、AI処理・認証・履歴保存は自宅サーバー上の [`somenAI`](https://github.com/oimo0/somenAI) APIへHTTPSで接続します。

## GitHub Pages

リポジトリの **Settings → Pages → Build and deployment** で次を選択します。

- Source: `Deploy from a branch`
- Branch: `main`
- Folder: `/ (root)`

公開先は `https://oimo0.github.io/somenAIPages/` です。

## API接続先

`config.js` のURLを、Cloudflare TunnelなどでHTTPS公開したAPI URLへ合わせます。

```js
window.SOMENAI_API_BASE = 'https://somenapi.asro.jp';
```

サーバー側の `.env` は次のように設定します。GitHub Pagesのパス `/somenAIPages/` はoriginに含めません。

```env
FRONTEND_ORIGIN=https://oimo0.github.io
```

ブラウザーにはログイン用トークンだけを保存します。Gemini APIキーとGroq APIキーはサーバー側だけに置き、このリポジトリには入れません。

## 画面と機能

- ChatGPT風のシンプルなレスポンシブUI
- 低・中・高のモデル切り替えとモデル別残り回数
- 学習モード、Web検索（自動・常時・OFF）の設定
- Web検索・SchoolLink・計算中の状態表示と参照元カード
- Markdown表、コード、引用、簡易グラフ、生成画像の表示
- Cloudflare AI画像生成モード

テーマ色は設定から5色を選択でき、端末に保存します。iPad縦画面とSplit Viewではサイドバーが引き出し式になります。VisualViewportに合わせて入力欄を配置し、画面キーボード表示時も会話部分をスクロールできます。入力文字の青い枠はなくし、入力欄全体の控えめな境界変化に置き換えています。
