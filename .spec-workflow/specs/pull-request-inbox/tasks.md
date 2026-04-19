# タスク一覧

- [ ] 1. 拡張機能ディレクトリの初期化と依存関係
  - ファイル: `extensions/pull-request-inbox/package.json`, `extensions/pull-request-inbox/tsconfig.json`, `extensions/pull-request-inbox/wxt.config.ts`, `extensions/pull-request-inbox/vitest.config.ts`, `extensions/pull-request-inbox/biome.json`
  - `extensions/tab-switcher/` の設定をベースに新しい拡張機能ディレクトリを作成する。`wxt.config.ts` では manifest に最小権限（`storage`, `tabs`, `alarms`, `sidePanel`, `action`）、`host_permissions`（`https://api.github.com/*`, `https://github.com/*/pull/*`）、`externally_connectable: {}`、`web_accessible_resources` の最小化、厳格な CSP（`connect-src 'self' https://api.github.com`）、side panel の default_path を設定する。pnpm workspace に追加する。
  - _活用: `extensions/tab-switcher/wxt.config.ts`, `extensions/tab-switcher/package.json`, `extensions/tab-switcher/vitest.config.ts`, ルートの `pnpm-workspace.yaml`_
  - _要件: 非機能要件（セキュリティ・アーキテクチャ）_
  - _Prompt: Role: WXT 拡張機能セットアップ担当 | Task: tab-switcher の設定を参考に pull-request-inbox の足場を作成し、最小権限とセキュリティハードニング（externally_connectable: {}, CSP の connect-src 制限, web_accessible_resources の最小化）を含む manifest を wxt.config.ts で宣言する | Restrictions: tabGroups 権限を要求しない・PAT を扱う CSP を緩めない・既存拡張機能の設定を壊さない | Success: pnpm -C extensions/pull-request-inbox compile が通り、WXT がサイドパネル/バックグラウンド/コンテンツスクリプトのエントリポイントを認識すること_

- [ ] 2. 型定義（モデルとメッセージ）の追加
  - ファイル: `extensions/pull-request-inbox/src/types/models.ts`, `extensions/pull-request-inbox/src/types/messages.ts`
  - 設計書の「データモデル - コアモデル」と「メッセージ型」セクションそのままに、`PullRequest`, `PullRequestStatus`, `PullRequestRole`, `GitHubUser`, `Settings`, `UIMessage`, `ContentMessage`, `BackgroundToContentMessage`, `BackgroundResponse` を定義する。
  - _活用: `extensions/tab-switcher/src/types/messages.ts` の Discriminated Union パターン_
  - _要件: 要件1-6（型の共通基盤として全要件に関連）_
  - _Prompt: Role: TypeScript 型設計者 | Task: 設計書のデータモデル・メッセージ型セクションを忠実に型として表現する | Restrictions: any を使わない・循環参照を作らない・runtime code を入れない | Success: 他ファイルから import して使える純粋な型モジュールが揃い、tsc が通ること_

- [ ] 3. crypto ユーティリティ（AES-GCM ラッパ）
  - ファイル: `extensions/pull-request-inbox/src/background/crypto.ts`, `extensions/pull-request-inbox/src/background/__tests__/crypto.test.ts`
  - Web Crypto API で PBKDF2(SHA-256, 100k iter) + AES-GCM の encrypt / decrypt 関数を作成する。ソルトはモジュール定数、パスフレーズは引数で受ける。暗号文は `{ iv, data }` の base64 形式。TDD で先に encrypt→decrypt の往復、異なるパスフレーズでの復号失敗、改ざん耐性（タグ不一致でエラー）をテスト化する。
  - _活用: Web Crypto API（ブラウザ標準）_
  - _要件: 要件1-5, 要件1-6_
  - _Prompt: Role: セキュア暗号化ユーティリティ開発者（TDD） | Task: PBKDF2+AES-GCM でトークンを暗号化・復号するモジュールをテスト駆動で実装する | Restrictions: 平文をログに出さない・鍵導出を省略しない・同じ IV を再利用しない | Success: 往復テスト・改ざんテスト・誤パスフレーズテストが全て通ること_

- [ ] 4. StatusResolver（純粋関数、TDD）
  - ファイル: `extensions/pull-request-inbox/src/background/StatusResolver.ts`, `extensions/pull-request-inbox/src/background/__tests__/StatusResolver.test.ts`
  - 要件 4 の優先度（ci_failing > changes_requested > approved > ci_pending > review_required）に従って `resolveStatus(prDetail, checks)` を実装する。全分岐をカバーするユニットテストを先に書く。
  - _活用: なし（純粋関数）_
  - _要件: 要件4-1, 要件4-2, 要件4-3_
  - _Prompt: Role: ドメインロジック開発者（TDD） | Task: PR 詳細と CI 結果から 5 種のステータスを判定する純粋関数をテスト駆動で実装する | Restrictions: 副作用禁止・外部依存禁止・優先度順を守る | Success: 全 5 ステータス × 境界値のテストが通ること_

- [ ] 5. SettingsStore
  - ファイル: `extensions/pull-request-inbox/src/background/SettingsStore.ts`, `extensions/pull-request-inbox/src/background/__tests__/SettingsStore.test.ts`
  - `packages/shared` の `getStorageItem` / `setStorageItem` を土台に `Settings` の get/update/onChange を実装する。デフォルト値（pollingIntervalMinutes=2, keepAfterReviewCompleted=false, showBadge=true, persistToken=false, collapsedRepos={}）を持つ。`chrome.storage.onChanged` で購読者に通知する。
  - _活用: `packages/shared/src/index.ts`_
  - _要件: 要件1-4, 要件2, 要件3-8, 要件5-4, 要件6_
  - _Prompt: Role: 設定管理実装者（TDD） | Task: Settings の永続化と変更通知機構を実装する | Restrictions: デフォルト値を間違えない・onChange のリスナーリークを作らない | Success: get/update/onChange のテストがモックされた chrome.storage で通ること_

- [ ] 6. AuthService
  - ファイル: `extensions/pull-request-inbox/src/background/AuthService.ts`, `extensions/pull-request-inbox/src/background/__tests__/AuthService.test.ts`
  - `chrome.storage.session`（setAccessLevel('TRUSTED_CONTEXTS')）と `chrome.storage.local`（暗号化 opt-in）で PAT を扱う `AuthService` を実装する。`init()` で local から復号復元、`setToken(token, persist)`, `getToken()`, `clearToken()`, `hasToken()`, `verify(token)` を提供する。`verify` は `fetch` で `/user` を呼ぶ形で GitHubClient への循環を避ける。TDD。
  - _活用: タスク3 の `crypto.ts`, `chrome.storage.*` モック_
  - _要件: 要件1-1, 要件1-2, 要件1-3, 要件1-4, 要件1-5, 要件1-6_
  - _Prompt: Role: Chrome 拡張の認証基盤開発者（TDD） | Task: PAT を session 優先・暗号化 local オプションで安全に保管する AuthService をテスト駆動で実装する | Restrictions: content script から触れないよう TRUSTED_CONTEXTS を必ず設定・PAT をログに出さない・persist=false で local を確実に削除 | Success: session 保存/暗号化保存/復号/検証/削除の全テストが通ること_

- [ ] 7. GitHubClient（REST API ラッパ、TDD）
  - ファイル: `extensions/pull-request-inbox/src/background/GitHubClient.ts`, `extensions/pull-request-inbox/src/background/__tests__/GitHubClient.test.ts`
  - `fetch` を基盤に GitHub REST API (`/user`, `/search/issues?q=is:pr+is:open+review-requested:@me`, `/search/issues?q=is:pr+is:open+author:@me`, `/repos/{o}/{r}/pulls/{n}`, `/repos/{o}/{r}/commits/{sha}/check-runs`) をラップする。Authorization ヘッダ付与、User-Agent、レート制限ヘッダ読み取り、ネットワークエラーの指数バックオフ（1s→2s→4s、3 回）、401/403/404 の種別判定を行う。TDD で `fetch` をモック。
  - _活用: `AuthService`, `fetch`_
  - _要件: 要件2-1, 要件2-2, 要件2-5, 要件4_
  - _Prompt: Role: GitHub REST API ラッパ開発者（TDD） | Task: 型付き API クライアントをテスト駆動で実装する | Restrictions: PAT をログに出さない・4xx をリトライしない・タイムアウトなしに無限待機しない | Success: 正常系、レート制限、401、ネットワークエラー+バックオフのテストが通ること_

- [ ] 8. PRStore（差分計算と除去判定、TDD）
  - ファイル: `extensions/pull-request-inbox/src/background/PRStore.ts`, `extensions/pull-request-inbox/src/background/__tests__/PRStore.test.ts`
  - `PullRequest[]` のキャッシュを `chrome.storage.local` に保存し、`upsertBatch(prs, currentUser, settings)` で added/updated/removed の `PRDiff` を返す。除去判定（マージ/クローズ、`keepAfterReviewCompleted=false` 時のレビュー完了）を実装する。`findByUrl` で FaviconUpdater 問い合わせに応答する。TDD。
  - _活用: `chrome.storage.local` モック, タスク2 の型_
  - _要件: 要件3-1, 要件3-2, 要件3-7, 要件6-3_
  - _Prompt: Role: データストア開発者（TDD） | Task: PR キャッシュと差分計算・除去判定を持つストアをテスト駆動で実装する | Restrictions: 破壊的更新を避ける・除去条件を設計書どおりにする・タブ操作を一切含めない | Success: added/updated/removed の境界・レビュー完了時の除去・設定トグルの影響テストが全て通ること_

- [ ] 9. BadgeService（TDD）
  - ファイル: `extensions/pull-request-inbox/src/background/BadgeService.ts`, `extensions/pull-request-inbox/src/background/__tests__/BadgeService.test.ts`
  - `chrome.action.setBadgeText` / `setBadgeBackgroundColor` でバッジを更新する。件数カウント（要件 5-1 の「未対応」定義）、色優先度（赤>黄>青、要件 5-2/5-3）、`count>99` で `'99+'`、`settings.showBadge=false` でクリアを実装する。TDD。
  - _活用: `chrome.action` モック, `SettingsStore`_
  - _要件: 要件5-1, 要件5-2, 要件5-3, 要件5-4, 要件6-4_
  - _Prompt: Role: バッジ表示ロジック開発者（TDD） | Task: 未対応 PR 件数と優先度色を計算してバッジに反映するサービスをテスト駆動で実装する | Restrictions: 件数定義を設計書から逸脱しない・showBadge=false で必ず clear する | Success: 件数計算・色決定・99+閾値・設定トグルのテストが全て通ること_

- [ ] 10. TabResolver（TDD）
  - ファイル: `extensions/pull-request-inbox/src/background/TabResolver.ts`, `extensions/pull-request-inbox/src/background/__tests__/TabResolver.test.ts`
  - `focusOrOpen(prUrl)` のみを提供する。`chrome.tabs.query` で既存タブを検索し、あれば `tabs.update + windows.update` でフォーカス、なければ `tabs.create` で開く。TDD。
  - _活用: `chrome.tabs` / `chrome.windows` モック_
  - _要件: 要件3-4, 要件3-5_
  - _Prompt: Role: タブ操作ユーティリティ開発者（TDD） | Task: focus-or-open の 1 メソッドだけを持つ薄いリゾルバをテスト駆動で実装する | Restrictions: タブグループに一切触れない・余計な副作用を持たない | Success: 既存タブ発見/未発見の両分岐のテストが通ること_

- [ ] 11. PollingService（オーケストレーション、TDD）
  - ファイル: `extensions/pull-request-inbox/src/background/PollingService.ts`, `extensions/pull-request-inbox/src/background/__tests__/PollingService.test.ts`
  - `chrome.alarms` 登録・起動・停止・即時実行（`pollNow`）を提供する。1 サイクルで `client.search*` → 各 PR の詳細 + check-runs → `StatusResolver` → `PRStore.upsertBatch` → `BadgeService.update` → 開いている PR タブ (`chrome.tabs.query({ url: 'https://github.com/*/*/pull/*' })`) へ `FAVICON_UPDATE` メッセージ送信、の順を保証する。レート制限残小時のインターバル延長も実装する。依存を全モックしてテスト。
  - _活用: `GitHubClient`, `PRStore`, `BadgeService`, `StatusResolver`, `SettingsStore`, `chrome.alarms`/`tabs`/`runtime` モック_
  - _要件: 要件2（全項目）, 要件4-4, 要件5-1_
  - _Prompt: Role: ポーリングオーケストレータ開発者（TDD） | Task: alarms 発火から PR 取得・差分・バッジ・favicon 通知までを順序通りに捌くサービスをテスト駆動で実装する | Restrictions: 順序を崩さない・失敗時に状態を不整合にしない・UI のフリーズを生まない | Success: 1 サイクルの順序と、レート制限ハンドリング・401 時停止のテストが通ること_

- [ ] 12. MessageRouter と registerBackground、background エントリポイント
  - ファイル: `extensions/pull-request-inbox/src/background/MessageRouter.ts`, `extensions/pull-request-inbox/src/background/registerBackground.ts`, `extensions/pull-request-inbox/src/entrypoints/background.ts`, `extensions/pull-request-inbox/src/background/__tests__/MessageRouter.test.ts`
  - `chrome.runtime.onMessage` でサイドパネル・オプション・content script からのメッセージを受けて各サービスへ委譲する `MessageRouter` を実装し、`registerBackground` で全サービスを組み立てる（tab-switcher パターン）。`background.ts` は `defineBackground` で `AuthService.init → SettingsStore.init → PRStore.init → PollingService.start` を呼び `registerBackground` を実行する。`MessageRouter` のディスパッチはユニットテストで検証。
  - _活用: `extensions/tab-switcher/src/entrypoints/background.ts`, `extensions/tab-switcher/src/background/registerBackground.ts`_
  - _要件: 要件1, 要件2-2, 要件3, 要件6_
  - _Prompt: Role: Background 統合実装者 | Task: Router 経由で各サービスを疎結合に接続し、起動時の初期化順を正しく組む | Restrictions: 初期化順を間違えない・未知メッセージに対して型安全にエラーを返す | Success: compile が通り、代表的な UIMessage / ContentMessage のルーティングテストが通ること_

- [ ] 13. FaviconUpdater と content エントリポイント
  - ファイル: `extensions/pull-request-inbox/src/content/FaviconUpdater.ts`, `extensions/pull-request-inbox/src/entrypoints/content.ts`, `extensions/pull-request-inbox/src/content/__tests__/FaviconUpdater.test.ts`
  - `<link rel="icon">` の検出・差し替え・MutationObserver による再適用・`restore()` を実装する。content script 起動時に Background へ `GET_PR_STATUS { url: location.href }` を送信、応答のステータスを `setStatus` に渡す。Background からの `FAVICON_UPDATE` も受信する。`content.ts` は `matches: ['https://github.com/*/pull/*']`。jsdom で MutationObserver の再適用と restore をテスト。
  - _活用: jsdom, `chrome.runtime.onMessage`/`sendMessage` モック_
  - _要件: 要件4-1, 要件4-2, 要件4-3, 要件4-4_
  - _Prompt: Role: Content Script 開発者（TDD） | Task: favicon を書き換え・維持・復元する FaviconUpdater をテスト駆動で実装する | Restrictions: PAT を触らない・github.com/*/pull/* 以外で動かない・ホストページの CSS を汚染しない | Success: 書き換え・MutationObserver 再適用・status=null 時の restore のテストが通ること_

- [ ] 14. 共通ユーティリティと favicon SVG アセット
  - ファイル: `extensions/pull-request-inbox/src/utils/relativeTime.ts`, `extensions/pull-request-inbox/src/utils/githubUrl.ts`, `extensions/pull-request-inbox/src/utils/__tests__/relativeTime.test.ts`, `extensions/pull-request-inbox/src/utils/__tests__/githubUrl.test.ts`, `extensions/pull-request-inbox/public/favicons/ci-failing.svg`, `extensions/pull-request-inbox/public/favicons/changes-requested.svg`, `extensions/pull-request-inbox/public/favicons/approved.svg`, `extensions/pull-request-inbox/public/favicons/ci-pending.svg`, `extensions/pull-request-inbox/public/favicons/review-required.svg`
  - `relativeTime(iso)`（"3 分前" などの日本語相対時刻）と `parsePullRequestUrl(url)` をテスト駆動で実装する。5 種のステータス favicon SVG（16×16 / 32×32 対応、色は要件 4-2/5-2）を用意する。
  - _活用: なし_
  - _要件: 要件3-6, 要件4-2_
  - _Prompt: Role: ユーティリティ + アイコン制作担当 | Task: 相対時刻計算・GitHub URL パースユーティリティをテスト駆動で作り、5 種ステータスの SVG favicon を作成する | Restrictions: favicon は透明背景・16px でも視認可能・色は設計書/要件に準拠 | Success: ユーティリティのテストが通り、SVG がブラウザで favicon として描画できること_

- [ ] 15. サイドパネルのエントリポイントとルート
  - ファイル: `extensions/pull-request-inbox/src/entrypoints/sidepanel/index.html`, `extensions/pull-request-inbox/src/entrypoints/sidepanel/main.tsx`, `extensions/pull-request-inbox/src/sidepanel/SidePanelApp.tsx`, `extensions/pull-request-inbox/src/sidepanel/hooks/usePRs.ts`, `extensions/pull-request-inbox/src/sidepanel/hooks/useSettings.ts`
  - `@mui/material` + `packages/ui` の ThemeProvider でラップしたルート `SidePanelApp` と、`chrome.runtime.sendMessage`/`onMessage` を使うフック (`usePRs`, `useSettings`) を実装する。フックは `chrome.*` をモックしてユニットテストを書く。
  - _活用: `packages/ui/src/theme.ts`, `extensions/tab-switcher` のテーマ適用パターン_
  - _要件: 要件3-1_
  - _Prompt: Role: React サイドパネル基盤開発者 | Task: MUI テーマ適用済みのルートとデータ購読フックを実装する | Restrictions: フックで chrome.* の直接参照を避けテスト可能にする・ダーク/ライト両対応 | Success: SidePanelApp が MUI で描画され、フックの購読/更新テストが通ること_

- [ ] 16. SidePanelHeader（リロードボタン + 最終更新時刻）
  - ファイル: `extensions/pull-request-inbox/src/sidepanel/SidePanelHeader.tsx`, `extensions/pull-request-inbox/src/sidepanel/SidePanelHeader.stories.tsx`, `extensions/pull-request-inbox/src/sidepanel/__tests__/SidePanelHeader.test.tsx`
  - 要件 3-6 に従い、ヘッダ右端に `IconButton`（refresh アイコン）を置き、実行中は回転アニメーション、隣に相対時刻、ツールチップで絶対時刻を表示する。クリックで `POLL_NOW` を送信。ユニットテスト（クリック → メッセージ送信、isPolling 時アニメーション）＋ Storybook（idle/polling/error の 3 状態）。
  - _活用: `@mui/material` の IconButton/Tooltip/CircularProgress, `relativeTime`_
  - _要件: 要件3-6_
  - _Prompt: Role: React UI 開発者（TDD） | Task: さりげないリロードボタン + 最終更新時刻を持つヘッダをテスト駆動で実装し、Storybook を添える | Restrictions: 過剰な装飾をしない・回転アニメーションは prefers-reduced-motion を尊重 | Success: クリックで POLL_NOW 送信・isPolling 時のアニメーション・相対時刻の描画テストが通ること_

- [ ] 17. PRCard と StatusBadge
  - ファイル: `extensions/pull-request-inbox/src/sidepanel/PRCard.tsx`, `extensions/pull-request-inbox/src/sidepanel/StatusBadge.tsx`, `extensions/pull-request-inbox/src/sidepanel/PRCard.stories.tsx`, `extensions/pull-request-inbox/src/sidepanel/StatusBadge.stories.tsx`, `extensions/pull-request-inbox/src/sidepanel/__tests__/PRCard.test.tsx`
  - `PRCard` はタイトル・作者 avatar・番号・relativeTime・`StatusBadge`・`isNew` インジケータを表示し、クリックで `FOCUS_PR { prId }` を送信する。`StatusBadge` は 5 ステータスのアイコン + 色を持つ。ユニットテストはクリック→メッセージ送信とステータス描画、Storybook は全ステータス × 各種フラグ。
  - _活用: `@mui/material` の Card, Avatar, Chip_
  - _要件: 要件3-2, 要件3-3, 要件3-4, 要件3-5, 要件4-2_
  - _Prompt: Role: React UI 開発者（TDD） | Task: PR 1 件を表すカードとステータスバッジを実装する | Restrictions: a11y（alt, aria-label）に配慮・長いタイトルで崩れない・クリック領域を十分確保 | Success: クリック→FOCUS_PR、全ステータスの描画、Storybook 表示の確認が取れること_

- [ ] 18. PRListView / RoleSection / RepoSection / EmptyState 群
  - ファイル: `extensions/pull-request-inbox/src/sidepanel/PRListView.tsx`, `extensions/pull-request-inbox/src/sidepanel/RoleSection.tsx`, `extensions/pull-request-inbox/src/sidepanel/RepoSection.tsx`, `extensions/pull-request-inbox/src/sidepanel/EmptyState.tsx`, `extensions/pull-request-inbox/src/sidepanel/PRListView.stories.tsx`, `extensions/pull-request-inbox/src/sidepanel/__tests__/PRListView.test.tsx`
  - `usePRs` の結果を Reviewer / Author セクションに分け、その下で owner/repo ごとにグルーピングして `RepoSection`（折りたたみ可能、`collapsedRepos` 設定と連動）で表示する。空・未設定・エラー・レート制限の各状態で `EmptyState` 派生コンポーネントを出し分ける。Storybook でリッチなダミーデータを用意。
  - _活用: タスク17 の `PRCard`, `useSettings`, `usePRs`_
  - _要件: 要件3-2, 要件3-3, 要件3-7, 要件3-8_
  - _Prompt: Role: React リストビュー開発者（TDD） | Task: 役割×リポジトリ階層で PR を描画し、折りたたみ連動と空/エラー状態の分岐を実装する | Restrictions: 不要な再描画を避ける・設定更新を即反映・null safety | Success: 通常リスト/空/未設定/エラーの各状態で期待通りに描画されるテストが通ること_

- [ ] 19. オプションページのエントリポイントとルート
  - ファイル: `extensions/pull-request-inbox/src/entrypoints/options/index.html`, `extensions/pull-request-inbox/src/entrypoints/options/main.tsx`, `extensions/pull-request-inbox/src/options/OptionsApp.tsx`
  - `packages/ui` のテーマを適用したルートコンポーネントと、Authentication / Polling / Notifications / Advanced のタブレイアウトを実装する。
  - _活用: `packages/ui/src/theme.ts`_
  - _要件: 要件6_
  - _Prompt: Role: React 設定画面基盤開発者 | Task: タブ構成の OptionsApp を実装する | Restrictions: 未保存状態の破棄を検出できる構造にする | Success: ルートが描画され、タブ切り替えが動くこと_

- [ ] 20. PATSection（入力・検証・永続化トグル）
  - ファイル: `extensions/pull-request-inbox/src/options/PATSection.tsx`, `extensions/pull-request-inbox/src/options/PATSection.stories.tsx`, `extensions/pull-request-inbox/src/options/__tests__/PATSection.test.tsx`
  - PAT 入力欄（`type=password`, `autocomplete=off`, `spellcheck=false`）、「検証」ボタン（`VERIFY_TOKEN` を送信、結果で user 情報表示）、「保存」ボタン（`SET_TOKEN` + persist）、永続化トグル（注意書きつき）、Fine-grained PAT の推奨スコープとリンク、注意事項を表示する。入力値をフォームステートで保持し、送信時に親へ通知する。ユニットテストは検証成功/失敗の UI 反映、保存フロー。
  - _活用: `@mui/material` Form 系コンポーネント_
  - _要件: 要件1-1, 要件1-2, 要件1-3, 要件1-4, 要件6-1_
  - _Prompt: Role: React フォーム開発者（TDD） | Task: PAT 入力・検証・保存・永続化トグルを持つセクションをテスト駆動で実装し、Fine-grained PAT ガイドを添える | Restrictions: PAT を DOM 以外にキャッシュしない・コピーボタンを付けない・エラー時に検証成功を演出しない | Success: 検証成功/失敗/保存/トグルのテストが通ること_

- [ ] 21. PollingSection / NotificationsSection / DangerSection
  - ファイル: `extensions/pull-request-inbox/src/options/PollingSection.tsx`, `extensions/pull-request-inbox/src/options/NotificationsSection.tsx`, `extensions/pull-request-inbox/src/options/DangerSection.tsx`, `extensions/pull-request-inbox/src/options/__tests__/OptionsSections.test.tsx`
  - Polling: スライダ（1-10 分）。Notifications: バッジ表示トグル、レビュー完了後も残すトグル。Danger: PAT 削除、キャッシュ削除（確認ダイアログ付き）。各セクションは `useSettings` フックで設定を購読・更新する。
  - _活用: `useSettings`, `@mui/material` Slider/Switch/Dialog_
  - _要件: 要件2-4, 要件3-7, 要件5-4, 要件6-2, 要件6-3, 要件6-4_
  - _Prompt: Role: React 設定セクション開発者（TDD） | Task: 3 つの設定セクションと削除フローをテスト駆動で実装する | Restrictions: Danger 操作は必ず確認ダイアログを挟む・範囲外値を受け付けない | Success: 値変更・削除フローのテストが通ること_

- [ ] 22. manifest.json の最終調整と i18n スキャフォールド
  - ファイル: `extensions/pull-request-inbox/wxt.config.ts`, `extensions/pull-request-inbox/src/_locales/ja/messages.json`, `extensions/pull-request-inbox/src/_locales/en/messages.json`
  - 最終的な description, icons, default_locale, commands（必要なら `_execute_action`）を設定。日本語・英語の `_locales/messages.json` を作成し、拡張機能名と短い説明を入れる。`chrome.i18n.getMessage` で参照できる最小セットを用意する。
  - _活用: `extensions/tab-switcher/` の manifest/i18n_
  - _要件: 非機能要件（ユーザビリティ・セキュリティ）_
  - _Prompt: Role: WXT manifest 仕上げ担当 | Task: manifest を完成形に仕上げ、最小 i18n を導入する | Restrictions: 権限を追加しない・default_locale の欠落を作らない | Success: ビルドが通り、Chrome で読み込み可能な拡張機能パッケージが生成できること_

- [ ] 23. 手動受け入れテストチェックリストの作成と実行
  - ファイル: `extensions/pull-request-inbox/MANUAL_TEST.md`
  - 設計書「テスト戦略 - 手動テスト」に従うチェックリストを作成し、ローカルで実行結果を記録する。PAT 設定→ポーリング→サイドパネル→カードクリック→既存タブフォーカス/新規タブ→favicon 書き換え→マージ時除去→レビュー完了時除去→バッジ色/件数/99+→リロードボタン回転/相対時刻→session 再起動で PAT が消える→永続化 ON/OFF まで。
  - _活用: 手動 QA_
  - _要件: 要件1-6の全て_
  - _Prompt: Role: QA エンジニア | Task: 手動テストチェックリストを作成し、ローカルで全ケース通過を確認する | Restrictions: チェックを飛ばさない・失敗したら issue として記録 | Success: 全チェックが通過し、ドキュメントに結果が残ること_
