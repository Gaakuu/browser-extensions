# タスク一覧

- [ ] 1. プロジェクトスキャフォールド
  - ファイル: `extensions/screenshot/package.json`, `extensions/screenshot/wxt.config.ts`, `extensions/screenshot/tsconfig.json`, `extensions/screenshot/vitest.config.ts`
  - WXT + React プロジェクトの初期構成を作成。pnpm workspace に追加。`wxt.config.ts` に permissions（`activeTab`, `clipboardWrite`, `downloads`）と commands（Cmd+Shift+2）を設定。
  - _活用: `extensions/tab-switcher/` の設定ファイル群をテンプレートとして参照_
  - _要件: 要件1（撮影モードの起動）_
  - _Prompt: Role: Chrome拡張機能開発者 | Task: spec screenshot のプロジェクトスキャフォールドを作成する。`extensions/tab-switcher/` の `wxt.config.ts`, `package.json`, `tsconfig.json`, `vitest.config.ts` を参考に `extensions/screenshot/` を構成する。permissions は `activeTab`, `clipboardWrite`, `downloads`。commands に `capture-screenshot`（Cmd+Shift+2）を設定。pnpm workspace の `pnpm-workspace.yaml` は既に `extensions/*` を含むため変更不要。 | Restrictions: tab-switcher 固有の設定（tabs permission, tab-switcher 用コマンド）をコピーしない。不要な依存関係を追加しない。 | Success: `pnpm install` が成功し、`pnpm --filter screenshot run dev` で WXT dev サーバーが起動すること。Implement the task for spec screenshot, first run spec-workflow-guide to get the workflow guide then implement the task. タスク開始時に tasks.md の `[ ]` を `[-]` に変更し、完了後に log-implementation で記録し、`[x]` に変更すること。_

- [ ] 2. メッセージ型定義
  - ファイル: `extensions/screenshot/src/types/messages.ts`
  - Background ↔ Content Script 間のメッセージ型を定義。`CropRect`, `Point`, `CaptureMode`, `BackgroundMessage`, `ContentMessage` を含む。
  - _活用: `extensions/tab-switcher/src/types/messages.ts` のパターン（方向別ユニオン型）_
  - _要件: 全要件共通_
  - _Prompt: Role: TypeScript型設計者 | Task: spec screenshot のメッセージ型を定義する。設計書のデータモデルセクションに従い、`CropRect`, `Point`, `CaptureMode`, `BackgroundMessage`, `ContentMessage`, `ScreenshotSettings` を定義する。 | Restrictions: `extensions/tab-switcher/src/types/messages.ts` の型パターン（方向別ユニオン型、type リテラル識別）に従う。過度な汎用化をしない。 | Success: 型定義ファイルがコンパイルエラーなく通ること。Implement the task for spec screenshot, first run spec-workflow-guide to get the workflow guide then implement the task. タスク開始時に tasks.md の `[ ]` を `[-]` に変更し、完了後に log-implementation で記録し、`[x]` に変更すること。_

- [ ] 3. Background: CaptureService
  - ファイル: `extensions/screenshot/src/background/CaptureService.ts`, `extensions/screenshot/src/background/CaptureService.test.ts`
  - `chrome.tabs.captureVisibleTab()` による表示領域キャプチャ、スクロールキャプチャによるページ全体キャプチャ、Canvas によるトリミング処理を実装。
  - _活用: Chrome Tabs API, OffscreenDocument (Canvas)_
  - _要件: 要件2, 3, 4, 5_
  - _Prompt: Role: Chrome拡張機能バックエンド開発者 | Task: spec screenshot の CaptureService をTDDで実装する。**まずテストを書く**: (1) `captureVisibleArea()` が `chrome.tabs.captureVisibleTab()` を呼び data URL を返すこと (2) `captureFullPage()` がスクロール+連続キャプチャで画像を結合すること、上限 10,000px を超えたら警告すること (3) `cropImage()` が CropRect に基づき正確にトリミングすること、devicePixelRatio を考慮すること。Chrome API はモックする。**テストが Red になることを確認してから実装に入る。** 実装後に全テストが Green になることを確認する。 | Restrictions: Offscreen Document は Canvas 操作専用。キャプチャ不可ページ（chrome:// 等）のエラーハンドリングを含める。 | Success: テストが全て Green。表示領域キャプチャが data URL を返し、トリミングが正確な座標で切り出すこと。Implement the task for spec screenshot, first run spec-workflow-guide to get the workflow guide then implement the task. タスク開始時に tasks.md の `[ ]` を `[-]` に変更し、完了後に log-implementation で記録し、`[x]` に変更すること。_

- [ ] 4. Background: DownloadService
  - ファイル: `extensions/screenshot/src/background/DownloadService.ts`, `extensions/screenshot/src/background/DownloadService.test.ts`
  - `chrome.downloads.download()` によるファイル保存と、Clipboard API によるクリップボードコピーを実装。
  - _活用: Chrome Downloads API, Clipboard API_
  - _要件: 要件6, 7_
  - _Prompt: Role: Chrome拡張機能バックエンド開発者 | Task: spec screenshot の DownloadService をTDDで実装する。**まずテストを書く**: (1) `saveAsFile()` が `chrome.downloads.download()` を正しいファイル名（`screenshot_YYYY-MM-DD_HH-MM-SS.png`）で呼ぶこと (2) `copyToClipboard()` が data URL を Blob に変換し Clipboard API に渡すこと (3) コピー失敗時にエラーを投げること。Chrome API はモックする。**テストが Red になることを確認してから実装に入る。** 実装後に全テストが Green になることを確認する。 | Restrictions: ファイル名の日時はキャプチャ時刻を使用。クリップボードコピー失敗時はエラーを返す（握りつぶさない）。Service Worker では Clipboard API が使えないため Offscreen Document を利用。 | Success: テストが全て Green。PNG ファイルが正しいファイル名で保存され、クリップボードにコピーされること。Implement the task for spec screenshot, first run spec-workflow-guide to get the workflow guide then implement the task. タスク開始時に tasks.md の `[ ]` を `[-]` に変更し、完了後に log-implementation で記録し、`[x]` に変更すること。_

- [ ] 5. Background: Service Worker エントリポイント
  - ファイル: `extensions/screenshot/src/entrypoints/background.ts`, `extensions/screenshot/src/entrypoints/background.test.ts`
  - `chrome.commands.onCommand` でショートカットキーを処理し、Content Script へ `START_CAPTURE` メッセージを送信。Content Script からのメッセージ（`CAPTURE_*`, `SAVE_FILE`）を受け取り CaptureService / DownloadService に委譲。
  - _活用: `extensions/tab-switcher/src/entrypoints/background.ts` のメッセージルーティングパターン_
  - _要件: 要件1, 2, 3, 4, 5, 6, 7_
  - _Prompt: Role: Chrome拡張機能バックエンド開発者 | Task: spec screenshot の background.ts エントリポイントをTDDで実装する。**まずテストを書く**: (1) `capture-screenshot` コマンドでアクティブタブに `START_CAPTURE` が送信されること (2) `CAPTURE_VISIBLE_AREA` メッセージで CaptureService.captureVisibleArea() が呼ばれること (3) `CAPTURE_FULL_PAGE` で captureFullPage() が呼ばれること (4) `CAPTURE_ELEMENT` / `CAPTURE_AREA` で cropImage() が呼ばれること (5) キャプチャ完了後に自動で copyToClipboard が呼ばれ、CAPTURE_RESULT が返ること (6) `SAVE_FILE` で saveAsFile() が呼ばれること。**テストが Red になることを確認してから実装に入る。** 実装後に全テストが Green になることを確認する。 | Restrictions: tab-switcher の background.ts のパターンに従う。非同期処理では `sendResponse` を正しく扱う（return true パターン）。 | Success: テストが全て Green。メッセージルーティングが正しく動作すること。Implement the task for spec screenshot, first run spec-workflow-guide to get the workflow guide then implement the task. タスク開始時に tasks.md の `[ ]` を `[-]` に変更し、完了後に log-implementation で記録し、`[x]` に変更すること。_

- [ ] 6. Content: ElementDetector
  - ファイル: `extensions/screenshot/src/content/ElementDetector.ts`, `extensions/screenshot/src/content/ElementDetector.test.ts`
  - `document.elementFromPoint()` で DOM 要素を検知し、ハイライト対象の `DOMRect` を返す。ドラッグ開始を検知して CropHandler への切り替えをトリガーする。
  - _活用: DOM API（elementFromPoint, getBoundingClientRect）_
  - _要件: 要件2, 3_
  - _Prompt: Role: フロントエンド開発者 | Task: spec screenshot の ElementDetector をTDDで実装する。**まずテストを書く**: (1) mousemove で `elementFromPoint()` が呼ばれ、要素の DOMRect が `onHover` コールバックで返ること (2) click で `onElementSelected` が DOMRect 付きで発火すること (3) mousedown + 5px以上の mousemove で `onDragStart` が発火すること (4) 5px未満の移動ではドラッグ開始とみなさないこと (5) Shadow DOM ホスト要素が検知対象から除外されること (6) `start()`/`stop()` でリスナーが正しく登録・解除されること。DOM API はモックする。**テストが Red になることを確認してから実装に入る。** 実装後に全テストが Green になることを確認する。 | Restrictions: 60fps を維持するため `requestAnimationFrame` でスロットリングする。 | Success: テストが全て Green。ホバー、クリック、ドラッグ開始が正しく区別されること。Implement the task for spec screenshot, first run spec-workflow-guide to get the workflow guide then implement the task. タスク開始時に tasks.md の `[ ]` を `[-]` に変更し、完了後に log-implementation で記録し、`[x]` に変更すること。_

- [ ] 7. Content: CropHandler
  - ファイル: `extensions/screenshot/src/content/CropHandler.ts`, `extensions/screenshot/src/content/CropHandler.test.ts`
  - マウスドラッグによる矩形選択を処理。選択中のサイズ表示、Esc キャンセル、マウスリリースで確定。
  - _活用: DOM API（mousemove, mouseup）_
  - _要件: 要件3_
  - _Prompt: Role: フロントエンド開発者 | Task: spec screenshot の CropHandler をTDDで実装する。**まずテストを書く**: (1) `start(startPoint)` 後の mousemove で `onCropUpdate(rect)` が矩形を返すこと (2) mouseup で `onCropComplete(rect)` が発火すること (3) 左上→右下、右下→左上など全方向のドラッグで正しい矩形（正の width/height）が得られること (4) Esc キーで `stop()` が呼ばれキャンセルされること (5) `stop()` 後にリスナーが解除されていること (6) 矩形の座標が devicePixelRatio を考慮して CropRect に変換されること。**テストが Red になることを確認してから実装に入る。** 実装後に全テストが Green になることを確認する。 | Restrictions: 負の幅/高さを正しく処理する。リスナーは stop() で確実に解除する。 | Success: テストが全て Green。任意方向のドラッグで正しい矩形が得られ、Esc でキャンセルできること。Implement the task for spec screenshot, first run spec-workflow-guide to get the workflow guide then implement the task. タスク開始時に tasks.md の `[ ]` を `[-]` に変更し、完了後に log-implementation で記録し、`[x]` に変更すること。_

- [ ] 8. Content: OverlayManager
  - ファイル: `extensions/screenshot/src/content/OverlayManager.tsx`
  - Shadow DOM ホストを生成し、React + Emotion でキャプチャ UI（暗転オーバーレイ、ツールバー、プレビュー）をレンダリング。ElementDetector / CropHandler と連携してモードを管理。
  - _活用: `extensions/tab-switcher/src/content/OverlayManager.tsx` の Shadow DOM + Emotion キャッシュパターン_
  - _要件: 要件1, 2, 3_
  - _Prompt: Role: React + Chrome拡張機能開発者 | Task: spec screenshot の OverlayManager を実装する。tab-switcher の OverlayManager を参考に Shadow DOM ホスト生成（z-index: 2147483647、font-size リセット）、Emotion キャッシュ注入、React Root マウントを行う。`show()` で暗転オーバーレイ + ツールバーを表示し ElementDetector を開始。`hide()` で全クリーンアップ。ElementDetector / CropHandler のコールバックを Background へのメッセージ送信に接続する。 | Restrictions: tab-switcher のイベント遮断パターン（keydown, wheel ブロック）を踏襲。Esc で撮影モード全体を終了。 | Success: Shadow DOM 内にオーバーレイが表示され、要素検知→トリミング→キャプチャのフローが動作すること。Implement the task for spec screenshot, first run spec-workflow-guide to get the workflow guide then implement the task. タスク開始時に tasks.md の `[ ]` を `[-]` に変更し、完了後に log-implementation で記録し、`[x]` に変更すること。_

- [ ] 9. React: CaptureOverlay コンポーネント
  - ファイル: `extensions/screenshot/src/components/CaptureOverlay.tsx`, `extensions/screenshot/src/components/CaptureOverlay.test.tsx`
  - 暗転オーバーレイと要素ハイライト（暗転解除）の描画。ホバー要素の DOMRect に基づき、その領域だけを明るく表示する。トリミングモードでは選択矩形を明るく表示し、サイズ（px）を表示。
  - _活用: `packages/ui/` テーマ_
  - _要件: 要件2, 3_
  - _Prompt: Role: React UI 開発者 | Task: spec screenshot の CaptureOverlay コンポーネントをTDDで実装する。**まずテストを書く**: (1) highlightRect が null のとき画面全体が暗転していること (2) highlightRect を渡すとその領域が明るく表示されること (3) cropRect を渡すと選択範囲が明るく表示され、サイズラベル（幅×高さ px）が表示されること (4) mode が 'element' / 'crop' で正しい表示が切り替わること。**テストが Red になることを確認してから実装に入る。** CSS の `clip-path` または Canvas で「穴あき」描画を実現。実装後に全テストが Green になることを確認する。 | Restrictions: パフォーマンスを考慮し、不要な再レンダリングを避ける（useMemo / useCallback）。 | Success: テストが全て Green。ハイライトとトリミング選択が視覚的に正しく描画されること。Implement the task for spec screenshot, first run spec-workflow-guide to get the workflow guide then implement the task. タスク開始時に tasks.md の `[ ]` を `[-]` に変更し、完了後に log-implementation で記録し、`[x]` に変更すること。_

- [ ] 10. React: Toolbar コンポーネント
  - ファイル: `extensions/screenshot/src/components/Toolbar.tsx`, `extensions/screenshot/src/components/Toolbar.test.tsx`
  - 撮影モード選択ツールバー。「全画面」「表示領域」「設定（歯車）」ボタンを配置。
  - _活用: `packages/ui/` テーマ、MUI IconButton / Tooltip_
  - _要件: 要件1, 4, 5_
  - _Prompt: Role: React UI 開発者 | Task: spec screenshot の Toolbar コンポーネントをTDDで実装する。**まずテストを書く**: (1) 「全画面」「表示領域」「設定」の3つのボタンがレンダリングされること (2) 各ボタンクリックで対応するコールバック（onFullPage, onVisibleArea, onSettings）が呼ばれること (3) position='top' / 'bottom' で配置が切り替わること。**テストが Red になることを確認してから実装に入る。** `packages/ui/` のテーマを使い MUI IconButton + Tooltip で実装。実装後に全テストが Green になることを確認する。Storybook stories も作成する。 | Restrictions: MUI コンポーネントのみ使用（カスタム CSS は最小限）。 | Success: テストが全て Green。ツールバーが表示され、各ボタンのクリックが正しくコールバックに伝達されること。Implement the task for spec screenshot, first run spec-workflow-guide to get the workflow guide then implement the task. タスク開始時に tasks.md の `[ ]` を `[-]` に変更し、完了後に log-implementation で記録し、`[x]` に変更すること。_

- [ ] 11. React: Preview コンポーネント
  - ファイル: `extensions/screenshot/src/components/Preview.tsx`, `extensions/screenshot/src/components/Preview.test.tsx`
  - キャプチャ結果のプレビュー画面。画像表示 + 「保存」「閉じる」ボタン。クリップボードへの自動コピー成功/失敗の通知トースト。
  - _活用: `packages/ui/` テーマ、MUI Button / Snackbar_
  - _要件: 要件6, 7_
  - _Prompt: Role: React UI 開発者 | Task: spec screenshot の Preview コンポーネントをTDDで実装する。**まずテストを書く**: (1) imageUrl が渡されたとき画像がプレビュー表示されること (2) 「保存」ボタンクリックで onSave が呼ばれること (3) 「閉じる」ボタンクリックで onClose が呼ばれること (4) clipboardStatus='success' のとき成功トーストが表示されること (5) clipboardStatus='error' のときエラートーストが表示されること。**テストが Red になることを確認してから実装に入る。** 実装後に全テストが Green になることを確認する。Storybook stories も作成する。 | Restrictions: 画像は最大サイズを制限し、オーバーフロー時はスクロール可能にする。 | Success: テストが全て Green。プレビュー画像が表示され、保存/閉じるが動作し、通知が表示されること。Implement the task for spec screenshot, first run spec-workflow-guide to get the workflow guide then implement the task. タスク開始時に tasks.md の `[ ]` を `[-]` に変更し、完了後に log-implementation で記録し、`[x]` に変更すること。_

- [ ] 12. Content Script エントリポイント
  - ファイル: `extensions/screenshot/src/entrypoints/content.ts`
  - OverlayManager を初期化し、Background からのメッセージ（`START_CAPTURE`, `CAPTURE_RESULT` 等）を受信して UI を制御。
  - _活用: `extensions/tab-switcher/src/entrypoints/content.ts` のメッセージ受信パターン_
  - _要件: 要件1, 2, 3, 6, 7_
  - _Prompt: Role: Chrome拡張機能開発者 | Task: spec screenshot の content.ts エントリポイントを実装する。WXT の `defineContentScript` で全ページに注入。OverlayManager をインスタンス化し、`chrome.runtime.onMessage` で BackgroundMessage を受信。`START_CAPTURE` で `overlay.show()`、`CAPTURE_RESULT` でプレビュー表示、`CAPTURE_ERROR` でエラー表示。`visibilitychange` でオーバーレイを自動クローズ。 | Restrictions: tab-switcher の content.ts パターンに従う。OverlayManager のライフサイクル管理（show/hide）を確実に行う。 | Success: Background からのメッセージで UI が正しく表示・非表示されること。Implement the task for spec screenshot, first run spec-workflow-guide to get the workflow guide then implement the task. タスク開始時に tasks.md の `[ ]` を `[-]` に変更し、完了後に log-implementation で記録し、`[x]` に変更すること。_

- [ ] 13. i18n メッセージ定義
  - ファイル: `extensions/screenshot/src/public/_locales/en/messages.json`, `extensions/screenshot/src/public/_locales/ja/messages.json`
  - 拡張機能名、説明文、ツールバーボタンラベル、通知メッセージの英語・日本語翻訳。
  - _活用: `extensions/tab-switcher/src/public/_locales/` のフォーマット_
  - _要件: 全要件共通_
  - _Prompt: Role: i18n担当 | Task: spec screenshot の i18n メッセージを定義する。`extName`, `extDescription`, `commandCaptureScreenshot`, ツールバーボタン名（fullPage, visibleArea, settings）、通知メッセージ（copiedToClipboard, copyFailed, savedToFile, captureError）を en/ja で定義。 | Restrictions: tab-switcher の _locales フォーマットに従う。chrome.i18n API の `__MSG_*__` 形式で参照可能にする。 | Success: 両言語のメッセージが正しく定義され、manifest.json から参照できること。Implement the task for spec screenshot, first run spec-workflow-guide to get the workflow guide then implement the task. タスク開始時に tasks.md の `[ ]` を `[-]` に変更し、完了後に log-implementation で記録し、`[x]` に変更すること。_
