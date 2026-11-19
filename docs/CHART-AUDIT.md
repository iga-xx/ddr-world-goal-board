# 譜面の不足データ調査・追補

2026-10-30更新。公式公開ALL MUSICに載らなかった譜面・解禁条件付き楽曲を、ユーザー指定の三倍icecreamとBEMANIWikiを中心に照合した。

- 153曲、432譜面を追加（踊153 / 激153 / 鬼126）。
- うち既存曲の追加鬼譜面68件。既存の譜面レベルは全件三倍icecreamと一致し、変更なし。
- 現在の管理対象: 1,478曲 / SP 3,402譜面。
- 三倍icecreamの非削除データ1,480曲のうち、Happy（ユーザー指定）とSteps to the Star（BEGINNERのみ）を除く全曲に対応。
- 追加432譜面すべてに別資料の裏付けがあり、現在の要確認・レベル競合は0件。

## 取得元

- https://3icecream.com/js/songdata.js : 公開楽曲JSONを静的に抽出。ダウンロードしたJavaScriptを実行しない。配列のindex 2/3/4がSP踊/激/鬼で、サイトの表示コードでも確認。削除フラグがある曲を除外。
- https://bemaniwiki.com/?DanceDanceRevolution+WORLD/%E6%96%B0%E6%9B%B2%E3%83%AA%E3%82%B9%E3%83%88 : 「新曲リスト」「旧曲追加譜面・復活曲リスト」のSINGLE列を照合。rowspan/colspan、文字参照、脚注、[SA]表記を処理し、DOUBLE列を使わない。
- https://w.atwiki.jp/asigami/pages/4772.html : WORLD新曲ページに含まれるAmbivalent Vermiliaの踊15・激18を追加確認。A3時代の曲なのでBEMANIWikiのWORLD新曲表だけでは確認できなかった。

曲名だけで結び付けず、既存1,325曲は公式ジャケットのimgパラメーターと三倍icecreamのsong_idが全件一致した。曲名の別名・同名曲の取り違えを避け、曲IDと譜面IDを維持。新しい曲は三倍icecreamのIDから別の安定IDを生成した。

画像は追加153曲について三倍icecreamの公開ジャケットをローカル保存。公式画像エンドポイントは解禁条件付き曲で空応答になることを確認したため、この追加分は三倍icecreamの画像を採用した。個人PC内の利用に限る。

## 同名曲の区別

「朱と碧のランページ」「リメンバーリメンバー」は原曲とカバーが同名で存在する。両方を別の曲IDで保持し、検索・一覧ではアーティスト名も表示する。曲名のSHAだけで統合しない。

## 更新方法

`node scripts/audit-charts.ts --refresh` で指定2サイトを取得して差分を記録。問題がなければ `node scripts/audit-charts.ts --apply` で追補データ・マスターと画像を反映し、テストとビルドを行う。通常閲覧は外部接続しない。

追補ファイルはdata/chart-supplements.json、照合結果はdata/chart-audit.json、初回不足リストはdata/chart-audit-initial.json。通常のimport-official.tsも追補を合成し、追加鬼が再び消えない。公式の値と追補が食い違う場合は更新を止める。ユーザーのIndexedDBには触れない。

## 既存曲で補った鬼譜面

|曲名|SP鬼レベル|
|---|---:|
|WILD RUSH|14|
|KEEP ON MOVIN'|12|
|rainbow rainbow|14|
|黒髪乱れし修羅となりて～凛 edition～|16|
|Continue to the real world?|17|
|Worst Plan|18|
|Übertreffen|18|
|パ→ピ→プ→Yeah!|15|
|Can Be Real|12|
|Gamelan de Couple|16|
|華爛漫 -Flowers-|14|
|Arcadia|16|
|RED ZONE|17|
|No.13|17|
|volcano|15|
|DROP THE BOMB|14|
|LOGICAL DASH|13|
|La Señorita|14|
|ロマンシングエスケープ|15|
|地方創生☆チクワクティクス|16|
|Mind Parasite|16|
|Unreality|16|
|ECSTASY|13|
|Quick Master|15|
|True Blue|17|
|CUTIE CHASER|13|
|輪廻の鴉|17|
|サナ・モレッテ・ネ・エンテ|14|
|PARANOIA EVOLUTION|18|
|GENOM SCREAMS|15|
|My Drama|17|
|Funk Boogie|12|
|BURNING HEAT！（3 Option MIX）|15|
|怒れる大きな白い馬|15|
|華麗なる！音戯探偵ひなビタ♫|16|
|BROKEN MY HEART|14|
|TSUGARU|16|
|Don't Stop The HYPERCORE|17|
|SURVIVAL AT THE END OF THE UNIVERSE|17|
|バッドユース・アウェイク|15|
|D2R|15|
|CaptivAte～誓い～|15|
|DanRevoAthlon|15|
|The legend of MAX|18|
|The Ashes of Boreas|16|
|HIGHER|12|
|In The Breeze|14|
|INSIDE YOUR HEART|12|
|Saturday Night Love|12|
|Holic|15|
|THE SHINING POLARIS|12|
|Unreal|17|
|漆黒のスペシャルプリンセスサンデー|17|
|Bloody Tears(IIDX EDITION)|16|
|BE LOVIN|15|
|激アツ☆マジヤバ☆チアガール|15|
|AFRONOVA|17|
|Dragon Blade|18|
|FIRE|16|
|Votum stellarum -forest #25 DDR RMX-|17|
|Abyss|15|
|クリムゾンゲイト|16|
|Forever Sunshine|12|
|rainbow flyer|16|
|La Bamba|13|
|カゲロウ|14|
|Remain|18|
|Concertino in Blue|17|

新規153曲の詳細と追加全432譜面はdata/chart-audit-initial.jsonのnewSongs / missingChartsを参照。解禁条件は個人ごとに異なるため、登録できることが無条件でプレーできることを意味しない。
