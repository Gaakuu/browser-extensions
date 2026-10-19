# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## プロジェクト概要

pnpm workspaces + Turbo によるモノレポ構成の Chrome 拡張機能開発リポジトリ。メインの拡張機能は **Tab Switcher** — VSCode 風の MRU（最近使用した順）タブ切り替えツール。WXT、React 19、MUI 9 で構築し、ツールバーのパネル（action popup）に表示する。

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
- `popup/` — ツールバーのパネル。`_execute_action`（⌘⇧Space）で開く。MRU 一覧と検索を兼ねる
- `background.ts` — Service Worker。タブのアクティブ化を MRU に記録し、`previous-tab`（直前のタブへ）と `search-tabs`（検索モードでパネルを開く）のコマンドを処理する
- `options/` — ショートカットの案内

**主要モジュール**:
- `core/mru.ts` — MRU の並べ替え（純粋関数）。拡張が見たアクティブ化の順 → 未記録のタブは `tab.lastAccessed`
- `core/MruStore.ts` — MRU の順番を `chrome.storage.session` に置く（Service Worker が止まっても消えない）
- `core/holdToConfirm.ts` — 修飾キーを押したまま開き、離したら確定する判定
- `components/TabSwitcherPopup.tsx` — 一覧・検索（`fzf`）・キーボード操作

### 主要な設計判断

- **Content Script を使わない**: chrome:// ・新しいタブ・ウェブストアでは差し込めないため、どのページでも動くツールバーのパネルにした。別ウィンドウは使わない
- **状態は storage.session**: MV3 の Service Worker は 30 秒ほどで止まるので、メモリに MRU を持たない
- **修飾キーリリースで確定**: パネル内で押していない修飾キーの keyup を「押したまま開いた」とみなし、すべて離したら確定。文字を打ったら確定しない

### Node のバージョン

jsdom 29 のため Node 22.13 以上が要る。ルートの `package.json` で Volta が 22.22 に固定している。Volta の pnpm を使うときは `VOLTA_FEATURE_PNPM=1` を付けると固定した Node でスクリプトが動く。

## 技術スタック

- **pnpm 10.8** / **Turbo** — パッケージマネージャー & モノレポオーケストレーション
- **WXT 0.19** — ブラウザ拡張機能フレームワーク（Chrome MV3）
- **TypeScript 6** / **React 19** / **MUI 9** / **Emotion** — UI
- **Vitest 4** — テスト（ユニットテストは jsdom、Storybook テストは Playwright/Chromium）
- **Storybook 10** — コンポーネント開発
- **Biome** — Lint & フォーマット（シングルクォート、2スペースインデント、100文字幅）
