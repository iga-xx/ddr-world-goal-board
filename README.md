# DDR WORLD フレアスキル目標ボード

SPの「これから対象にしたい90譜面」を管理するPC向けアプリです。ローカル版はIndexedDBで進捗を保存し、GitHub Pages版はコミットした譜面と目標ランクを初期表示します。

## 日常の起動

この環境ではビルド済みです。`C:\works\test\start.cmd` をダブルクリックしてください。
ブラウザーで **http://127.0.0.1:5173** を開きます。ターミナルを閉じるかCtrl+Cで終了します。通常利用にインターネット接続は不要です。Node.js 24以降が必要です。起動スクリプトはPATH上のNode、なければこのPCのCodex同梱Nodeを利用します。

データは**ブラウザーとURLごと**に保存されます。同じブラウザー・同じURLで利用してください。localhostへの変更、別ブラウザー、プライベートモード、ブラウザーデータの削除では保存先が変わったり消えたりします。保存データがない環境では公開用スナップショットが初期値になります。移行時はバックアップを書き出してください。同じボードを複数タブで同時編集しないでください。

## ローカル版の使い方

1. 「譜面を追加」で曲名検索、区分・譜面・レベルの絞り込みから複数選択。
2. 一括目標ランクを指定し、必要な譜面だけ目標を個別変更。
3. 「選択内容を確認」→「登録」。現在ランクは「なし」で開始。
4. 一覧の目標/現在を変更すると自動保存。保存完了後に画面へ反映します。
5. 「曲名を一括貼り付け」は1行1曲。照合後に各行の候補を明示的に選び、譜面を選択。未一致行はその場で修正できます。
6. バックアップでJSONを書き出し、復元で検証後に内容を確認して置換できます。

## GitHub Pagesでの閲覧と更新

公開ページでは、既存の譜面を削除して別の譜面を追加できます。入れ替えやランクの変更は開いているページ内で有効です。再読み込みすると公開時の譜面と目標ランクに戻ります。

公開内容を更新する場合は、ローカル版で譜面と目標ランクを編集し、「バックアップ」でJSONを書き出します。次のコマンドは、譜面IDと目標ランクだけを公開用ファイルに転記します。現在ランクと保存日時はローカルのバックアップに残ります。

```powershell
pnpm board:snapshot "C:\path\to\ddr-goals-YYYY-MM-DD.json"
git diff -- src/published-board.json
git add src/published-board.json
git commit -m "Update published goals"
git push origin main
```

GitHub Actionsは `main` へのプッシュで公開ページを更新します。初回設定ではリポジトリの **Settings → Pages → Source** で **GitHub Actions** を選びます。公開用ビルドを確認するには `pnpm build:pages` を実行します。出力先は `dist-pages/` です。

## データの現状と制約

取得日: **2026-10-30**。公式の公開一覧27ページから **1,326曲・SP 2,972譜面・1,326ジャケット**を取り込み済み。
区分は **1,478曲**（追加分は三倍icecreamのバージョンで判定）に設定済み。公式資料の不足分を非公式のバージョン別一覧等で補い、出典付きで反映しています。Happyはユーザー指定により除外済みで、管理対象内の区分未確定は **0曲**です。除外記録は [docs/CATEGORY-REVIEW.md](docs/CATEGORY-REVIEW.md) に記載しています。

**Lv9〜19のFL9/FLEXスキル値を設定済み**です。非公式SP総合Wikiの掲載表を採用し、Lv12〜19はGamerch掲載表とも一致を確認しました。各区分を目標スキル降順に並べ、目標変更で並べ直します。現在ランクの変更では並び順は変わりません。Lv8以下410譜面は数値未確認のため末尾・「—」表示です。合計に未知値が含まれる場合は件数を分離して表示します。

出典、網羅性の範囲、追補方法は [docs/DATA-SOURCES.md](docs/DATA-SOURCES.md)、確定仕様は [docs/SPEC.md](docs/SPEC.md)、検証結果は [docs/VALIDATION.md](docs/VALIDATION.md)。

不足データの再調査で153曲・432譜面（鬼126件を含む）を追加し、現在は **1,478曲・3,402譜面**です。[譜面追補の調査結果](docs/CHART-AUDIT.md) を参照してください。

## 開発・ビルド

Node.js 24以降 + pnpm 11を使用します。一般のNode.js環境ではnpmでも利用できますが、再現には同梱のpnpm-lock.yamlを使ってください。

```powershell
pnpm install --frozen-lockfile
pnpm dev
pnpm test
pnpm build
node scripts/serve.mjs
```

このPCでpnpmコマンドがPATHにない場合:

```powershell
$taskPnpm = "$env:USERPROFILE\.cache\codex-runtimes\codex-primary-runtime\dependencies\node\node_modules\pnpm\bin\pnpm.cjs"
node $taskPnpm install --frozen-lockfile
node $taskPnpm test
node $taskPnpm build
```

変更後はビルドしてブラウザーを再読み込みします。通常起動サーバーはビルド済みdistだけを配信し、127.0.0.1だけで待ち受けます。別プロセスが5173を利用中なら終了させてください。サーバーにユーザーデータの書き込みAPIはありません。

## マスター更新（外部接続が必要なときだけ実行）

アプリを閉じ、バックアップを保存してから実行します。

```powershell
node scripts/import-categories.ts
node scripts/import-official.ts
node scripts/audit-charts.ts --refresh
node scripts/audit-charts.ts --apply
pnpm test
pnpm build
```

通常閲覧からは取り込み処理を呼びません。公式側のHTML変更、画像取得失敗、曲名重複があれば停止し、完成前のマスターで既存JSONを置換しません。更新で消えたジャケットは削除しません。IndexedDBへのアクセスは一切なく、ユーザー登録と現在ランクは保持されます。対応しなくなった譜面や区分変更はスナップショットで残して「要確認」と表示します。
