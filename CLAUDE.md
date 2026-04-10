# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## プロジェクト概要

pnpm workspaces + Turbo によるモノレポ構成の Chrome 拡張機能開発リポジトリ。メインの拡張機能は **Tab Switcher** — VSCode 風の MRU（最近使用した順）タブ切り替えツール。WXT、React 19、MUI 9、Shadow DOM オーバーレイで構築。

## コマンド

```bash
# ルート（Turbo が全ワークスペースを統括）
pnpm run dev          # 全 dev サーバー起動
pnpm run build        # 全パッケージ/拡張機能ビルド
pnpm run test         # 全テスト実行
pnpm run lint         # Lint（Biome）
pnpm run lint:fix     # Lint 自動修正
pnpm run format       # フォーマット（Biome）

# 拡張機能単体（extensions/tab-switcher/ で実行）
pnpm run dev          # WXT dev サーバー（ホットリロード対応）
pnpm run build        # WXT プロダクションビルド → .output/chrome-mv3/
pnpm run compile      # TypeScript 型チェックのみ
pnpm run test         # Vitest（ユニット + Storybook テスト）
pnpm run storybook    # Storybook dev サーバー（ポート 6006）

# 単一テストファイルの実行
cd extensions/tab-switcher && npx vitest run src/utils/fuzzyMatch.test.ts
```

## アーキテクチャ

### ワークスペース構成

- `extensions/tab-switcher/` — メイン拡張機能（WXT + React）
- `extensions/sample/` — 最小構成のサンプル拡張機能
- `packages/shared/` — Chrome ストレージユーティリティ（`getStorageItem`, `setStorageItem`）
- `packages/ui/` — MUI ダーク/ライトテーマ、ThemeProvider、CssBaseline の再エクスポート

### Tab Switcher 拡張機能

**エントリポイント**（WXT 規約に従い `src/entrypoints/` に配置）:
- `background.ts` — Service Worker。`TabHistoryManager` を初期化し、Chrome タブイベントの監視、キーボードコマンドの処理、Content Script へのメッセージルーティングを行う。
- `content.ts` — Content Script。Shadow DOM 内に `OverlayManager` を生成し、スイッチャー/検索オーバーレイを表示。`KeyboardHandler` でキーボード入力を処理。

**Background → Content メッセージ**: `SHOW_SWITCHER`, `SHOW_SEARCH`, `TAB_CLOSED`, `MOVE_FOCUS_DOWN`
**Content → Background メッセージ**: `SWITCH_TO_TAB`, `CLOSE_TAB`, `GET_ALL_TABS`, `OVERLAY_CLOSED`

**主要クラス**:
- `TabHistoryManager`（`src/background/`）— タブの MRU タイムスタンプを管理
- `OverlayManager`（`src/content/`）— Shadow DOM + React + Emotion キャッシュによる CSS 分離オーバーレイ
- `KeyboardHandler`（`src/content/`）— 修飾キー（Cmd/Ctrl）のリリース検出でスイッチャー確定

**React コンポーネント**（`src/components/`）:
- `TabSwitcher` — MRU リスト + キーボードナビゲーション。`onReady` コールバックでハンドルを公開
- `SearchOverlay` — `fzf` ライブラリによるファジー検索。テキスト入力に自動フォーカス
- `TabCard` — タブリストアイテム。favicon とマッチ範囲のハイライト表示

### 主要な設計判断

- **Shadow DOM 分離**: ホストページとの CSS 競合を防ぐため、オーバーレイを Shadow DOM 内にレンダリング。Emotion キャッシュを Shadow Root に注入。
- **修飾キーリリースで確定**: スイッチャーモードでは修飾キー（Cmd/Ctrl）を離すと選択確定。VSCode の Ctrl+Tab 動作を再現。
- **メッセージベースの疎結合**: Background と Content Script 間の通信は型付き Chrome メッセージのみ（`src/types/messages.ts`）。

## 技術スタック

- **pnpm 10.8** / **Turbo** — パッケージマネージャー & モノレポオーケストレーション
- **WXT 0.19** — ブラウザ拡張機能フレームワーク（Chrome MV3）
- **TypeScript 6** / **React 19** / **MUI 9** / **Emotion** — UI
- **Vitest 4** — テスト（ユニットテストは jsdom、Storybook テストは Playwright/Chromium）
- **Storybook 10** — コンポーネント開発
- **Biome** — Lint & フォーマット（シングルクォート、2スペースインデント、100文字幅）
