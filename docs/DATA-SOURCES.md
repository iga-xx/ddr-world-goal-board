# 取得元と未解決事項

調査・取得日: 2026-10-30（日本時間）。実際の取得時刻は各JSON内のISO 8601 UTC時刻。

## 公式データ

- 楽曲・譜面: https://p.eagate.573.jp/game/ddr/ddrworld/music/index.html?offset=0&filter=7 （offset=0〜26、27ページ）
- 区分範囲とスキル概要: https://p.eagate.573.jp/game/ddr/ddrworld/event/flare.html
- BPLの区分定義: https://p.eagate.573.jp/game/bpl/season4/ddr/about/regulation.html （CLASSICは1st〜X3、WHITEは2013〜A、GOLDはA20〜WORLD）
- CLASSIC出典: https://p.eagate.573.jp/game/bpl/season4/ddr/about/music/final/classic/index.html
- WHITE出典: https://p.eagate.573.jp/game/bpl/season4/ddr/about/music/final/white/index.html
- GOLD出典: https://p.eagate.573.jp/game/bpl/season4/ddr/about/music/final/gold/index.html

公開ALL MUSIC一覧から1,326曲、SPの踊/激/鬼2,972譜面を取得。BEGINNER/BASIC/DPは除外。レベルが「-」の譜面は生成しない。曲名・レベルは公開時点の表記。取得された一覧を網羅しているが、ログイン後限定データや将来の追加曲まで保証するものではない。公式の対象90譜面の個人成績にはアクセスしていない。

BPL一覧は663個の一意な曲名を含む。うち公開ALL MUSICと完全一致した656曲を最初に区分設定。大文字小文字、空白、異体記号を自動で吸収せず誤照合を避けた。その後、ユーザーの依頼により非公式資料も採用し669曲を追加。Happyはユーザー指定によりマスターから除外し、管理対象の区分未確定は0曲。BPL掲載の譜面レベルはマスターへ転用せず、現行WORLD公開一覧のレベルを採用している。同じ曲の別譜面には同じ曲区分を利用する。

## 区分追補（2026-10-30追加）

ユーザー了承により非公式資料も利用。詳細と未確定曲はCATEGORY-REVIEW.md参照。
`data/category-evidence.json` に資料内の曲名・アーケード収録バージョン・区分・出典を保存し、`scripts/resolve-categories.ts` で完全一致、NFKC/空白調整、明示的な9件の別名対応のみを適用する。類似度による自動確定はしない。資料内で複数区分に該当する曲は未確定にする。元の公式区分との食い違いは報告して自動上書きしない。

照合用の取得控えはdata/raw/ddrpad-songs.html、community-songs.html、world-notices.html。再取得時は元URLから保存し、`node scripts/resolve-categories.ts` で結果を確認後、`node scripts/resolve-categories.ts --apply` で追補とマスターへ反映する。続いてテストとビルドを行う。通常のimport-official.ts更新もenrichment.jsonの追補を維持する。

## ジャケットの保存

各行の公式 `images/binary_jk.html?img=...&kind=1` をダウンロードして `public/jackets/<id>.img` に保存。1,326画像、外部URLを画面で読み込まない。サーバーは画像の先頭バイトからContent-Typeを判定する。各曲のjacketSourceに元URLを記録している。
画像・曲名の権利は各権利者に帰属。個人PC内の利用に限った構成であり、再配布許諾は確認していない。公開・再配布を実施していない。削除曲の画像を更新処理で消さず、登録スナップショットからの表示を保全する。

## スキル値（非公式資料で補完）

2026-10-30、ソート不具合の修正としてLv9〜19のFL9/FLEXを設定した。出典は https://w.atwiki.jp/asigami/pages/4952.html のゲージ別フレアスキル獲得量表。Lv12〜19は https://gamerch.com/ddrlv/895172 のFlare Skill値表とも全件一致を確認。公式数値表として扱わず、enrichment.jsonにkind:secondary-tableと出典・取得日時を記録した。

例: Lv15 FL9=924/FLEX=960、Lv16 FL9=954/FLEX=992、Lv17 FL9=977/FLEX=1016。同レベルでも目標ランクに対応する値を参照する。対象3,402譜面のうち2,992譜面を設定済み。Lv8以下410譜面は資料未確認のためnullを維持し、既知値の後ろへ並べる。

通常の公式マスター更新はenrichment.jsonのスキル表を保持する。外部アクセスなしで表だけ再反映する場合は `node scripts/apply-skills.ts` を実行してビルドする。ユーザーの登録データには触れない。

## 追補JSON

`data/enrichment.json` は公式曲名をキーにした区分と、レベル別数値の根拠付き追補ファイル。架空のサンプル値を含めていない。

- songs[公式の完全な曲名]: category（CLASSIC/WHITE/GOLD）, source（根拠URL）, retrievedAt
- skills[レベル文字列]: FL9（整数）, FLEX（整数）, source（確認根拠）

数値は両ランクとも確認し、FLEX >= FL9を満たす場合のみ取り込む。実データでは非ゼロの正整数か確認する。出典の内容と値の正確性は追補者が確認する必要がある。取り込みスクリプトがURLの内容を検証してくれるわけではない。

追補後 `node scripts/import-official.ts` とビルドで反映。区分の自動取得は `node scripts/import-categories.ts`。両方とも通常利用から独立。公式HTMLの控えはdata/rawに残しgitignore。曲IDは曲名のSHA-256先頭20桁、譜面IDは曲ID+SP+譜面種別。公式の永続IDではないため改名でIDが変わり得る。自動で他曲へ対応付けず、旧登録は要確認として保持する。

## 解禁条件付き楽曲・追加譜面の追補

公式公開一覧だけでは鬼譜面68件、曲153件が欠落していた。三倍icecreamとBEMANIWikiで不足432譜面を補い、全件別資料で照合。詳細はCHART-AUDIT.md参照。公式データを完全な全曲・全譜面リストとは扱わず、更新時にもchart-supplements.jsonを合成する。
