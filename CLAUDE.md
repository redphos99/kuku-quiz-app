# CLAUDE.md

このファイルは、このリポジトリでコードを扱う際に Claude Code (claude.ai/code) へ向けたガイダンスを提供します。

## プロジェクト概要

くくれんしゅう（掛け算九九練習アプリ） — 子ども向けの九九ドリルアプリ。React 19 + TypeScript、Vite でビルド。バックエンドはなく、データ（設定・練習記録）はすべてブラウザの `localStorage` に保存される。PWA（Service Worker + manifest）としてオフライン起動にも対応し、`gh-pages` 経由で GitHub Pages にデプロイ。どのサブパスでも動くよう相対パスでビルドしている。

UI の文言は日本語で、小さな子ども向けに意図的にやさしく書かれている（ひらがな多め、やわらかい言い回し — 例えば不正解は赤ではなくオレンジで表示し、「incorrect」のような冷たい表現ではなく「おしい！」のような言い回しを使う）。ユーザー向け文言を変更する際は、このトーンを保つこと。

## 技術スタック

- **React 19** + **TypeScript**（`strict` 有効、`noUnusedLocals`／`noUnusedParameters` も有効）
- **Vite 8**（`@vitejs/plugin-react`）— ビルドツール兼開発サーバー
- **Vitest 5** — ユニットテスト
- **gh-pages** — `dist/` を GitHub Pages の `gh-pages` ブランチへ公開
- ルーティングライブラリ・状態管理ライブラリ・UI コンポーネントライブラリは使用していない（画面遷移は `App.tsx` の自前ステートマシン、状態は `useState`／`useRef` のみ）
- バックエンド・API・データベースなし。永続化は `localStorage` のみ
- PWA: 素の Service Worker（`public/sw.js`、フレームワーク不使用）と `manifest.webmanifest`

## ディレクトリ構造

```
.
├── index.html                 エントリ HTML
├── public/                    そのまま配信される静的ファイル
│   ├── manifest.webmanifest   PWA マニフェスト
│   ├── sw.js                  Service Worker（オンライン時は最新取得、オフライン時はキャッシュから起動）
│   └── icon*.png / icon.svg   アプリアイコン
├── src/
│   ├── main.tsx                エントリポイント（React のマウント）
│   ├── App.tsx                 画面遷移を管理するステートマシン
│   ├── types.ts                共有の型定義（QuizSettings・Question・AnswerLog・QuizRecord など）
│   ├── quiz.ts                 出題生成・フォーマット関数
│   ├── quiz.test.ts            quiz.ts のユニットテスト
│   ├── stages.ts               ステップれんしゅうのステージ定義・クリア判定・解放条件
│   ├── stages.test.ts          stages.ts のユニットテスト
│   ├── analysis.ts             ぶんせき画面の集計（にがてマップ・よくある間違い・週ごとの推移）
│   ├── analysis.test.ts        analysis.ts のユニットテスト
│   ├── storage.ts              localStorage の読み書き（唯一 localStorage に触れるモジュール）
│   ├── styles.css              全体スタイル
│   ├── screens/                画面コンポーネント（Screen の各バリアントに対応）
│   │   ├── HomeScreen.tsx      最初の画面（ステップれんしゅう／じゆうれんしゅう を選ぶ、記録への入口）
│   │   ├── SettingsScreen.tsx  じゆうれんしゅうの設定画面（段・出題数・順序の選択、開始）
│   │   ├── StageScreen.tsx     ステップ一覧画面（ステージのクリア状況・開始）
│   │   ├── QuizScreen.tsx      練習画面（出題・回答・テンキー／キーボード入力・タイマー）
│   │   ├── ResultScreen.tsx    結果画面（正答率・所要時間・まちがえ直し導線）
│   │   ├── HistoryScreen.tsx   記録一覧画面
│   │   └── AnalysisScreen.tsx  ぶんせき画面（にがてマップ・よくある間違い・のびの推移）
│   └── components/
│       ├── Numpad.tsx          画面下部のテンキー
│       ├── AnswerReview.tsx    まちがえた問題／時間がかかった問題の一覧表示
│       └── TrendChart.tsx      週ごとの推移を表す折れ線グラフ（素の SVG、ライブラリ不使用）
├── package.json / package-lock.json
├── tsconfig.json
└── vite.config.ts              base: './'（相対パス）、vitest 設定を含む
```

## コマンド

```
npm run dev       # 開発サーバー起動（localhost:5173）
npm run build     # tsc --noEmit で型チェック → vite build で dist/ に出力
npm run preview   # ビルド済み dist/ を配信（Service Worker はここか本番でのみ動作し、dev では動かない）
npm test          # vitest run（ウォッチモードではなく単発実行）
npm run deploy    # build 後、dist/ を gh-pages ブランチに公開
```

単一のテストファイルだけ実行する場合: `npx vitest run src/quiz.test.ts`。テストは `src/quiz.ts`・`src/stages.ts`・`src/analysis.ts` の純粋なロジックを対象にしている。

## アーキテクチャ

**画面遷移は `src/App.tsx` 内の単一のステートマシンで管理している。** ルーターは使っておらず、`App` が1つの `Screen` 合併型（`home | settings | stages | quiz | result | history | analysis`。起動時は `home`）を保持し、`screen.name` で分岐する。各画面コンポーネントは「dumb/controlled」で、props を受け取りコールバック（`onStart`、`onFinish`、`onQuit` など）を呼ぶだけで、遷移そのものは持たない。新しい画面を追加するときは `Screen` 合併型にバリアントを足し、`switch` にケースを追加する。

**練習の内容は `Plan` 合併型（`free`＝じゆうれんしゅう／`stage`＝ステップ／`retry`＝まちがえ直し。`retry` は元の練習を `from` に持つ）で表し、問題列は `startQuiz` で `Plan` から生成して `QuizScreen` に渡す。** `quiz` 画面は `key={screen.round}` によってラウンドごとに再マウントされる。`startQuiz` が呼ばれるたびに（「もういちど」「まちがえ直し」を含む）`round` がインクリメントされ、`QuizScreen` は内部状態（タイマー・出題インデックス・回答履歴）を手動リセットするのではなく、強制的に再初期化される。

**まちがえた問題の再出題フロー:** `retry` の `Plan` では、その問題リストがそのままの順序で出題され、生成される `QuizRecord` には `mode: 'retry'` のタグが付く（ステップのやりなおしなら `stageId` も付くが、クリアにはならない）。`quiz.ts` の `missedQuestions()` が、完了した1回分の誤答をその問題リストへ重複なくまとめる。やりなおしの結果も通常どおり記録されるが、「時間がかかった問題」の表示からは除外される（正確なルールは `README.md` の仕様メモを参照）。`mode: 'retry'` によるこの出し分けは `ResultScreen`／`HistoryScreen` を確認すること。

**ステップれんしゅう:** ステージ定義（`STAGES`）・出題（`stageQuestions`）・クリア判定（`isClearRecord`＝全問正解かつ目標タイム以内、やりなおしは対象外）・解放条件（`requires`）は `src/stages.ts` にまとめている。進み具合は別に保存せず、`stageId` 付きの記録から `stageProgress()` で都度計算する。目標タイムは `SECONDS_PER_QUESTION`（1問あたり秒数 × 問題数）で決まり、変えると過去の記録のクリア判定も変わる点に注意。

**ぶんせき:** 集計はすべて `src/analysis.ts` の純粋関数（`problemStats`／`commonMistakes`／`weeklyTrend` と、マップの濃さを決める `accuracyLevel`／`speedLevel`）で行い、`AnalysisScreen` は表示だけを持つ。まちがえ直し（`mode: 'retry'`）の記録は集計から除く。集計結果は保存せず、画面を開くたびに記録から計算する。

**`src/quiz.ts`・`src/stages.ts`・`src/analysis.ts` は純粋なロジック層であり、ユニットテストの対象**（`quiz.test.ts`／`stages.test.ts`／`analysis.test.ts`）。出題プールの生成（`generateQuestions`。段×乗数の全プールを一巡してから繰り返し、ランダム順では隣接する重複を避ける）と、各種フォーマット関数（`formatDuration`、`formatClock`、`formatDate`、`formatRange`、`formatSeconds`）を担う。出題選定やフォーマットに関する新しいロジックは、画面コンポーネント内に直書きせずここに置き、テスト可能な状態を保つこと。

**`src/storage.ts` は `localStorage` に触れる唯一のモジュール**で、読み込み時は必ず防御的に検証している（`isRecord`／`isAnswerLog` の型ガード）。壊れたデータや想定外の JSON は例外を投げず「データなし」として扱う。新しい永続化データを追加する際もこのパターンに従うこと（読み込み時に検証、書き込みエラー（容量超過・プライベートモードなど）は握りつぶす、保存データの形を信用しない）。

**回答時間の計測**は、`QuizScreen` 内で問題ごとに `questionShownAt`（問題が変わるたびリセット）と回答時刻の差分として、また1回分の練習全体は `startedAt`／`endedAt` の ref として管理している。これらは再レンダリングを発生させずにレンダーをまたいで値を保持する必要があるため、React の state ではなく ref を使っている。タイミング関連のロジックを編集する際は state ではなく ref のまま保つこと。

**テンキー入力を主とした設計**: `QuizScreen` は画面上の `Numpad` と物理キーボード（数字キー・Backspace/Delete・Enter）の両方を、同じ `addDigit`／`deleteDigit`／`submit`／`advance` ハンドラで受け付ける。これらは `latest` ref を通じて常に最新の状態に保たれており、（一度だけ登録される）`keydown` リスナーが古い状態を参照し続けることを防いでいる。

## コードに反映済みの仕様上の決定事項

これらはもともと要件定義書で「実装時に決定」とされていた未決事項で、実装時に解決されたもの（全リストは `README.md` を参照）。特に、知らずに「直してしまう」と挙動が変わってしまう可能性がある点:

- 選んだ段に対して `questionCount` がプールサイズを超える場合、プールを一巡してからシャッフルし直して繰り返す仕様であり、バグではなく意図した挙動。
- 記録が保存されるのは*完了した*練習のみで、途中でやめた場合は何も保存されない。
- 正解時は約0.9秒後に自動で次へ進み、不正解時は「つぎへ」の明示的な確認を待つ。
- 前回セッションの `questionCount`／`range`／`order` は保存され、次回起動時のデフォルト値として再利用される。
