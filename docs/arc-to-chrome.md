# Arc から Chrome への移行手順

Arc の設定ファイル（`~/Library/Application Support/Arc/`）から、実際に使っている機能を洗い出し、Chrome での代わりを決めた。
パスワード・Cookie・閲覧履歴の中身は読んでいない。

## 便利な点と Chrome での代わり

| Arc で使っているもの | 使っている量 | Chrome での代わり |
|---|---|---|
| ピン留め（Space ごと・フォルダつき） | Work 22 件、Development 82 件、フォルダ 15 個 | `tools/arc-export` でブックマーク HTML に変換済み（`~/Downloads/arc-bookmarks.html`）。ブックマークバーに Space ごとのフォルダとして入る |
| Favorites（上のアイコン） | 9 件（Gmail、Calendar、Gemini、GitHub、Jira、ChatGPT、勤怠、Drive、Docs） | 同じ HTML の「Favorites」フォルダ。よく使うものは Chrome のタブの固定（右クリック →「固定」）にする |
| Spaces | Work / Development の2つ（同じプロフィール） | ブックマークバーのフォルダ ＋ Chrome のタブグループ（保存しておける）。ウィンドウを分けたいときはウィンドウ2つ |
| 自動アーカイブ | アーカイブ 2,759 件。閾値は既定（12 時間） | 自作の **tab-manager**。18 時間見ていないタブを閉じ（設定で 12 時間・1 日なども選べる）、パネルとアドレスバー（`ar` ＋ スペース）から探して開き直せる |
| どの Space でも同じピン留め | — | tab-manager の固定タブの同期。どこかのウィンドウで固定・固定解除・並べ替えをすると、ほかのウィンドウも同じになる。新しいウィンドウにも開く（ウィンドウごとに別のタブ）。固定タブを閉じたときはそのウィンドウだけ。パネル右下のスイッチで止められる。⌥⇧R で固定タブを登録したときの URL に戻す |
| ⌘⇧C で URL をコピー | — | 自作の **copy-url**。⌘⇧C は Chrome 本体のキーと重なるので、`chrome://extensions/shortcuts` で手で割り当てる |
| Ctrl+Tab（最近使った順の切り替え） | — | 自作の **tab-switcher**。⌘⇧Space でパネル、⌃Q で直前のタブ。chrome:// や新しいタブでも動く |
| Command Bar でタブを探す | — | tab-switcher で文字を打つ（⌘⇧P で検索から開く）。Chrome 標準のタブ検索（⌘⇧A）とアドレスバーの「タブに切り替え」も使える |
| Capture（スクリーンショット） | 2,972 件、今日も使用 | 自作の **screenshot**（⌘⇧2。Arc と同じキー）。要素・範囲・ページ全体。chrome:// のページでは使えないので、そこは macOS の ⌘⇧4 |
| 分割表示 | 使用あり | Chrome 標準の分割表示（タブを右クリック →「分割表示」。Chrome 145 以降） |
| 縦のタブ | Arc のサイドバー | Chrome 標準の縦のタブ（Chrome 146 以降。版によっては設定かフラグで有効にする） |
| URL を全部表示 | 有効 | アドレスバーを右クリック →「URL 全体を常に表示」 |
| 拡張 | 下の「拡張を入れ直す」 | ウェブストアから入れ直す |

Little Arc・Peek・Boosts・Live Folder は、使った形跡が少ないか無効にしてあるため、代わりは用意しない。

## 自作の拡張（このリポジトリ）

ビルド済みのフォルダ（`pnpm run build` で作り直せる）:

| 拡張 | 読み込むフォルダ |
|---|---|
| tab-switcher | `extensions/tab-switcher/.output/chrome-mv3` |
| tab-manager | `extensions/tab-manager/.output/chrome-mv3` |
| screenshot | `extensions/screenshot/.output/chrome-mv3` |
| copy-url | `extensions/copy-url/.output/chrome-mv3` |

tab-switcher の使い方:

- **⌘⇧Space**: ツールバーのパネルが開き、直前のタブが選ばれている。⌘ を押したまま Space か Tab で次へ、離すと切り替わる。手を離してから開いた場合は Enter
- **⌃Q**: パネルを出さずに直前のタブへ戻る
- **⌘⇧P**: パネルを検索から開く。文字を打つとタイトルと URL で絞り込む。打ったときは全ウィンドウのタブから探し、別のウィンドウのタブを選ぶと今のウィンドウに持ってくる（固定タブは除く）
- パネルの中で **⌘⌫** はタブを閉じる、**Esc** はやめる
- パネルはツールバーのアイコンの下に出る（別ウィンドウは開かない）。アイコンをツールバーに固定しておくと位置が安定する
- Ctrl+Tab に割り当てたいときは、拡張の設定ページの「上級者向け」の手順（DevTools から割り当てる）。Chrome 標準の Ctrl+Tab（右隣のタブへ）は使えなくなる

## 本人がやること（順番どおり）

### 1. Chrome にログインする

1. Chrome を開き、右上のプロフィールから Google アカウントでログインし、同期を有効にする

### 2. ブックマークを取り込む

1. Chrome で `chrome://bookmarks` を開く
2. 右上の「︙」→「インポート」→ `~/Downloads/arc-bookmarks.html` を選ぶ
3. 「インポートしたブックマーク」フォルダの中身を、ブックマークバーへドラッグする（Favorites を左端に置くとよい）
4. ブックマークバーを常に表示する: ⌘⇧B

### 3. パスワードを移す

1. Arc で `arc://password-manager/settings` を開き、「パスワードをエクスポート」で CSV を書き出す
2. Chrome で `chrome://password-manager/settings` を開き、「パスワードをインポート」でその CSV を選ぶ
3. 取り込めたら、**CSV をすぐ削除してゴミ箱も空にする**（パスワードが平文で入っている）

### 4. 自作の拡張を読み込む

1. Chrome で `chrome://extensions` を開き、右上の「デベロッパー モード」をオンにする
2. 「パッケージ化されていない拡張機能を読み込む」で、上の表のフォルダを順に選ぶ
3. `chrome://extensions/shortcuts` を開き、Tab Switcher の3つ（⌘⇧Space・⌃Q・⌘⇧P）と screenshot（⌘⇧2）が割り当たっているか見る。空欄なら、ほかの拡張とぶつかっているので割り当て直す
   - Copy URL は空欄で入る。「今のタブの URL をコピー」の欄を押して ⌘⇧C を押す。効かないときは ⌘⇧Y にする
4. ツールバーのパズルのアイコンから Tab Switcher・Tab Manager・Copy URL をピン留めする（Copy URL はコピーしたときにアイコンへ ✓ が出る）
5. Tab Manager のアイコン → 設定で、閉じるまでの時間（既定 18 時間）を確かめる

### 5. 拡張を入れ直す

ウェブストアで入れ直す（Arc で入れていたもの）:

- JSON Formatter
- Vue.js devtools
- AWS Extend Switch Roles
- AWS Peacock Management Console
- Environment Marker
- Wappalyzer
- Autify Recorder
- Google ドキュメント オフライン
- Google Analytics オプトアウト アドオン

TrendAI Toolbar と SkyChromeExtension は会社の管理ソフトが入れるもの。Chrome に自動で入らなければ、社内の手順に従う。

### 6. Chrome の表示を Arc に寄せる（任意）

1. 縦のタブ: タブ列を右クリック →「タブを縦に表示」（無ければ `chrome://settings/appearance`）
2. アドレスバーを右クリック →「URL 全体を常に表示」
3. よく使うサイト（Gmail・Calendar など）はタブを開いて右クリック →「固定」
4. 固定し終えたら、Tab Manager の設定で「今のウィンドウの固定タブを登録する」を一度押す。以後は固定・固定解除・並べ替えが全ウィンドウにそろう

### 7. 切り替える

1. macOS の「システム設定」→「デスクトップと Dock」→「デフォルトの Web ブラウザ」を Chrome にする
2. よく使うサイトにログインし直す（Cookie は移さない）
3. 1週間ほど Arc を消さずに置き、足りないものが出たら Arc から拾う

## 開発メモ

- Node 22.13 以上が要る（jsdom 29）。Volta がルートの `package.json` で 22.22 に固定している。Volta の pnpm を使うときは `VOLTA_FEATURE_PNPM=1 pnpm run test`
- Arc のピン留めを変換し直す: `pnpm -C tools/arc-export run export --out ~/Downloads/arc-bookmarks.html`
