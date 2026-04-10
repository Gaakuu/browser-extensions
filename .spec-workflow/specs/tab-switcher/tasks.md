# タスク一覧: Tab Switcher

## フェーズ 1: 基盤

- [x] 1. 共有UIパッケージ（@browser-extensions/ui）の作成
  - ファイル: `packages/ui/package.json`, `packages/ui/src/theme.ts`, `packages/ui/src/index.ts`
  - MUIとEmotionの依存関係を追加し、Material Design 3テーマを定義
  - ThemeProviderラッパーをエクスポート
  - _活用: packages/shared の構成を参考_
  - _要件: 非機能要件（コードアーキテクチャ）_
  - _Prompt: Implement the task for spec tab-switcher, first run spec-workflow-guide to get the workflow guide then implement the task: Role: Reactフロントエンドエンジニア | Task: `packages/ui/` に MUI + Emotion ベースの共有UIパッケージを作成。Material Design 3のダークテーマを定義し、ThemeProviderラッパーをエクスポートする。`packages/shared` の `package.json` 構成を参考にする | Restrictions: MUIの最小限の依存のみ追加。テーマ定義とエクスポートのみ、個別コンポーネントはまだ作らない | Success: pnpm install が通り、他パッケージから import できる。テーマにダークモードのカラーパレットが定義されている_

- [x] 2. メッセージ型の定義
  - ファイル: `extensions/tab-switcher/src/types/messages.ts`
  - TabInfo, BackgroundMessage, ContentMessage, HighlightRange の型を定義
  - _要件: 要件1〜6, 非機能要件（明確なインターフェース）_
  - _Prompt: Implement the task for spec tab-switcher, first run spec-workflow-guide to get the workflow guide then implement the task: Role: TypeScriptエンジニア | Task: Background ↔ Content Script 間のメッセージ型を定義。TabInfo, BackgroundMessage, ContentMessage, HighlightRange インターフェースを設計書のデータモデルに従って作成 | Restrictions: 型定義のみ、実装コードは含めない | Success: tsc --noEmit が通る。全てのメッセージパターンが型でカバーされている_

- [x] 3. wxt.config.ts にコマンドとContent Script設定を追加
  - ファイル: `extensions/tab-switcher/wxt.config.ts`
  - show-tab-switcher と search-tabs の2つのコマンドを登録
  - _要件: 要件1, 要件6_
  - _Prompt: Implement the task for spec tab-switcher, first run spec-workflow-guide to get the workflow guide then implement the task: Role: Chrome拡張機能エンジニア | Task: wxt.config.ts に Commands API のショートカット2つ（show-tab-switcher: Cmd+Shift+Space、search-tabs: Cmd+Shift+P）を登録 | Restrictions: 既存の設定を壊さない。permissions に tabs を追加 | Success: wxt build が通り、manifest.json に commands が正しく出力される_

- [x] 4. テスト基盤のセットアップ
  - ファイル: `extensions/tab-switcher/vitest.config.ts`, `packages/ui/vitest.config.ts`
  - Vitest + @testing-library/react + jsdom のセットアップ
  - モノレポルートに共通の vitest 設定があれば共有
  - _要件: 非機能要件_
  - _Prompt: Implement the task for spec tab-switcher, first run spec-workflow-guide to get the workflow guide then implement the task: Role: テストエンジニア | Task: Vitest + @testing-library/react + jsdom をセットアップ。tab-switcher と packages/ui それぞれに vitest.config.ts を作成。package.json に test スクリプトを追加 | Restrictions: 既存のビルド設定を壊さない | Success: `pnpm test` で空のテストスイートが正常に実行される_

- [x] 5. Storybook のセットアップ
  - ファイル: `extensions/tab-switcher/.storybook/main.ts`, `extensions/tab-switcher/.storybook/preview.ts`
  - Storybook + React + MUI テーマの設定
  - @browser-extensions/ui のテーマを Storybook の decorator で適用
  - _要件: 非機能要件_
  - _Prompt: Implement the task for spec tab-switcher, first run spec-workflow-guide to get the workflow guide then implement the task: Role: フロントエンドエンジニア | Task: Storybook をセットアップ。React + Vite ビルダーで構成。preview.ts で @browser-extensions/ui の ThemeProvider をグローバル decorator に設定。package.json に storybook スクリプトを追加 | Restrictions: MUIテーマがStorybook内でも正しく反映されること | Success: `pnpm storybook` でStorybookが起動する_

## フェーズ 2: バックグラウンド（TDD）

- [ ] 6. TabHistoryManager のテストを書く
  - ファイル: `extensions/tab-switcher/src/background/TabHistoryManager.test.ts`
  - テストケース:
    - タブのアクティブ化でlastAccessedが更新される
    - getRecentTabs がMRU順で返す
    - getAllTabs が全タブをMRU順で返す
    - onTabRemoved でタブが削除される
    - onTabUpdated でメタデータが更新される（MRU順は変わらない）
    - 初期化時に既存タブを読み込む
  - _要件: 要件2, 要件3_
  - _Prompt: Implement the task for spec tab-switcher, first run spec-workflow-guide to get the workflow guide then implement the task: Role: テストエンジニア（TDD） | Task: TabHistoryManager のユニットテストを先に書く。chrome.tabs API はモックする。MRUソート、タブの追加/削除/更新、初期化の全パターンをカバー | Restrictions: テストを先に書き、この時点では実装ファイルは空またはインターフェースのみ。Red（失敗）の状態で終わってよい | Success: テストが要件を正しく表現している。実装すれば全てパスする内容になっている_

- [ ] 7. TabHistoryManager の実装
  - ファイル: `extensions/tab-switcher/src/background/TabHistoryManager.ts`
  - タスク6のテストを全てパスさせる
  - _活用: タスク6のテスト_
  - _要件: 要件2, 要件3_
  - _Prompt: Implement the task for spec tab-switcher, first run spec-workflow-guide to get the workflow guide then implement the task: Role: Chrome拡張機能バックエンドエンジニア（TDD） | Task: タスク6で書いたテストを全てパスするようにTabHistoryManagerを実装。`Map<tabId, TabInfo>` でインメモリ管理、lastAccessedでMRUソート | Restrictions: テストを変更しない。テストが全てグリーンになるまで実装する | Success: `pnpm test` で TabHistoryManager のテストが全てパスする_

- [ ] 8. Background エントリポイントの実装
  - ファイル: `extensions/tab-switcher/src/entrypoints/background.ts`
  - TabHistoryManager を初期化
  - chrome.commands.onCommand でショートカットを受信し、Content Script にメッセージ送信
  - Content Script からのメッセージ（SWITCH_TO_TAB, CLOSE_TAB, GET_ALL_TABS）を処理
  - 制限ページでのフォールバック（UIなしで直前のタブに切り替え）
  - _要件: 要件1〜6_
  - _Prompt: Implement the task for spec tab-switcher, first run spec-workflow-guide to get the workflow guide then implement the task: Role: Chrome拡張機能エンジニア | Task: background.ts でTabHistoryManagerを初期化し、Commands APIのイベントハンドラとメッセージリスナーを実装。制限ページ（chrome:// 等）ではContent Scriptにメッセージを送れないため、直前のタブへのフォールバック切り替えを行う | Restrictions: メッセージ型は types/messages.ts を使用。エラーハンドリングは設計書のシナリオに従う | Success: ショートカットでContent Scriptにタブリストが送信される。制限ページでは直前のタブに切り替わる_

## フェーズ 3: Content Script とUI（TDD）

- [ ] 9. KeyboardHandler のテストと実装
  - ファイル: `extensions/tab-switcher/src/content/KeyboardHandler.test.ts`, `extensions/tab-switcher/src/content/KeyboardHandler.ts`
  - テストを先に書く → 実装
  - テストケース: 修飾キー押し続け検知、リリース時コールバック発火、destroy でクリーンアップ
  - _要件: 要件3_
  - _Prompt: Implement the task for spec tab-switcher, first run spec-workflow-guide to get the workflow guide then implement the task: Role: フロントエンドエンジニア（TDD） | Task: まずKeyboardHandlerのテストを書く（修飾キー押し続け、リリース検知、destroy）。次にテストをパスする実装を書く | Restrictions: テストファーストで進める。jsdom環境でKeyboardEventをシミュレート | Success: テストが全てグリーン。修飾キーを離した瞬間にコールバックが発火する_

- [ ] 10. fuzzyMatch のテストと実装
  - ファイル: `extensions/tab-switcher/src/utils/fuzzyMatch.test.ts`, `extensions/tab-switcher/src/utils/fuzzyMatch.ts`
  - テストを先に書く → 実装
  - テストケース: 基本マッチ、大文字小文字無視、ハイライト範囲、不一致、空文字、特殊文字
  - _要件: 要件6_
  - _Prompt: Implement the task for spec tab-switcher, first run spec-workflow-guide to get the workflow guide then implement the task: Role: TypeScriptエンジニア（TDD） | Task: まず fuzzyMatch のテストを書く（"gml" → "Gmail" マッチ、ハイライト範囲、不一致、空文字、特殊文字）。次にテストをパスする実装を書く | Restrictions: テストファースト。外部ライブラリ不使用。パフォーマンス意識 | Success: テストが全てグリーン。50件のタブに対してリアルタイムで動作する速度_

- [ ] 11. TabCard コンポーネントの Story（play関数テスト付き）と実装
  - ファイル: `extensions/tab-switcher/src/components/TabCard.stories.tsx`, `extensions/tab-switcher/src/components/TabCard.tsx`
  - Story の play 関数にインタラクションテストを書く → コンポーネントを実装
  - Story バリアント: Default, Focused, WithHighlight, CloseButton
  - play 関数テスト: タブ情報が表示される、バツボタンクリックでonCloseが呼ばれる、フォーカス状態のスタイル
  - _要件: 要件2, 要件5, 要件6_
  - _Prompt: Implement the task for spec tab-switcher, first run spec-workflow-guide to get the workflow guide then implement the task: Role: Reactコンポーネントエンジニア（TDD） | Task: まずTabCardのStoryを作成し、play関数にインタラクションテストを書く（表示確認、バツボタンクリック、フォーカス状態）。バリアントは Default, Focused, WithHighlight, CloseButton の4つ。次にMUIコンポーネントで実装してテストをパスさせる | Restrictions: テストは play 関数内に書く（別途 .test.tsx は不要）。@storybook/test の expect, userEvent, fn を使用。MUIコンポーネント使用。@browser-extensions/ui テーマに従う | Success: Vitest で Story のテストが全てパス。Storybook で4バリアントが確認できる_

- [ ] 12. TabSwitcher コンポーネントの Story（play関数テスト付き）と実装
  - ファイル: `extensions/tab-switcher/src/components/TabSwitcher.stories.tsx`, `extensions/tab-switcher/src/components/TabSwitcher.tsx`
  - Story の play 関数にインタラクションテストを書く → コンポーネントを実装
  - Story バリアント: Default, SingleTab, ManyTabs
  - play 関数テスト: ↑↓フォーカス移動（循環）、Space次へ、Enter確定、Escape閉じ、バツボタンでタブ閉じ後のフォーカス移動
  - _要件: 要件1, 要件3, 要件4, 要件5_
  - _Prompt: Implement the task for spec tab-switcher, first run spec-workflow-guide to get the workflow guide then implement the task: Role: Reactフロントエンドエンジニア（TDD） | Task: まずTabSwitcherのStoryを作成し、play関数にキーボード操作のインタラクションテストを書く（↑↓循環、Space、Enter確定、Escape閉じ、タブ閉じ後のフォーカス移動）。バリアントは Default(5件), SingleTab, ManyTabs(20件)。次にMUI List+Paperで実装 | Restrictions: テストは play 関数内に書く。@storybook/test を使用。フォーカスはuseState、キーイベントはuseEffect | Success: Vitest で Story のテストが全てパス。全キーボード操作が仕様通り_

- [ ] 13. SearchOverlay コンポーネントの Story（play関数テスト付き）と実装
  - ファイル: `extensions/tab-switcher/src/components/SearchOverlay.stories.tsx`, `extensions/tab-switcher/src/components/SearchOverlay.tsx`
  - Story の play 関数にインタラクションテストを書く → コンポーネントを実装
  - Story バリアント: Default, Searching, NoResults
  - play 関数テスト: テキスト入力で絞り込み、ハイライト表示、0件メッセージ、キーボード操作
  - _要件: 要件6_
  - _Prompt: Implement the task for spec tab-switcher, first run spec-workflow-guide to get the workflow guide then implement the task: Role: Reactフロントエンドエンジニア（TDD） | Task: まずSearchOverlayのStoryを作成し、play関数にテストを書く（テキスト入力→絞り込み、ハイライト確認、0件メッセージ、↑↓Enter Escape操作）。バリアントは Default, Searching, NoResults。次にMUI TextField+Listで実装 | Restrictions: テストは play 関数内に書く。@storybook/test を使用。フィルタリングはuseMemo。TextFieldは自動フォーカス | Success: Vitest で Story のテストが全てパス。リアルタイム絞り込みが動作_

- [ ] 14. OverlayManager の実装
  - ファイル: `extensions/tab-switcher/src/content/OverlayManager.ts`
  - Shadow DOM を生成し、React + MUI をマウント
  - Emotion の CacheProvider で Shadow DOM 対応
  - show / hide / isVisible のインターフェースを実装
  - _要件: 要件1_
  - _Prompt: Implement the task for spec tab-switcher, first run spec-workflow-guide to get the workflow guide then implement the task: Role: Reactフロントエンドエンジニア | Task: Shadow DOM を作成し、その中にReact + MUI（Emotion CacheProvider付き）をマウントするOverlayManagerクラスを実装。@browser-extensions/ui のテーマを使用 | Restrictions: ページのスタイルに干渉しない。Shadow DOM の外にDOMを追加しない | Success: show() でオーバーレイが表示され、hide() で消える。ページのCSSの影響を受けない_

- [ ] 15. Content Script エントリポイントの実装
  - ファイル: `extensions/tab-switcher/src/entrypoints/content.ts`
  - OverlayManager を初期化
  - Background からのメッセージ（SHOW_SWITCHER, SHOW_SEARCH, TAB_CLOSED）をリスン
  - KeyboardHandler でキー押し続けモードを管理
  - _要件: 要件1〜6_
  - _Prompt: Implement the task for spec tab-switcher, first run spec-workflow-guide to get the workflow guide then implement the task: Role: Chrome拡張機能エンジニア | Task: content.ts でOverlayManagerとKeyboardHandlerを初期化。Background からのメッセージを受信してオーバーレイの表示/非表示を制御。キー押し続けモードではKeyboardHandlerで修飾キーリリースを検知し、タブ切り替えを実行 | Restrictions: メッセージ型は types/messages.ts を使用。chrome.runtime.onMessage でリスン | Success: ショートカットでオーバーレイが表示/非表示される。キー押し続けモードで修飾キーを離すとタブが切り替わる_

## フェーズ 4: 統合・動作確認

- [ ] 16. ビルド・型チェック・lint・テスト 確認
  - 全パッケージのビルドが通ること
  - tsc --noEmit が通ること
  - biome check が通ること
  - 全テストがパスすること
  - _要件: 全て_
  - _Prompt: Implement the task for spec tab-switcher, first run spec-workflow-guide to get the workflow guide then implement the task: Role: DevOpsエンジニア | Task: pnpm build, tsc --noEmit, pnpm lint, pnpm test を実行し、エラーを修正する | Restrictions: 既存のsampleプロジェクトのビルドも壊さない | Success: 全コマンドがエラーなしで完了する_

- [ ] 17. Chromeでの動作確認
  - 拡張機能をChromeに読み込んで手動テスト
  - タブ切り替え、ファジー検索、タブ閉じ、キー押し続けモードの動作確認
  - 制限ページでのフォールバック確認
  - _要件: 全て_
  - _Prompt: Implement the task for spec tab-switcher, first run spec-workflow-guide to get the workflow guide then implement the task: Role: QAエンジニア | Task: pnpm dev でChromeに拡張機能を読み込み、全要件の手動テストを実施。問題があれば修正する | Restrictions: 全ての要件の受け入れ基準を確認する | Success: 全要件が仕様通りに動作する_
