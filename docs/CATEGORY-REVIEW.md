# 曲区分の確認記録

2026-10-30更新。残り670曲のうち669曲の区分を追加。Happy / Pharrell Williamsは「低レベルのため不要」とのユーザー指定により除外した。

初回区分追補時点はCLASSIC 480曲 / WHITE 304曲 / GOLD 541曲。追加調査でGOLD153曲を補い、現在はCLASSIC 480 / WHITE 304 / GOLD 694、管理対象1,478曲の区分未確定は **0曲**。確認を依頼する曲はない。

除外設定は `data/enrichment.json` の `excludedSongs.Happy` に記録し、公式マスター更新時にも再登録しない。曲・譜面マスターから除外したが、ユーザーの保存データには触れていない。

## 追加したデータの扱い

公式BPL一覧で確認していた656曲は変更していない。追加669曲は、公式の新曲追加告知30曲、非公式資料639曲。スキル値には手を加えていない。

主な補足資料は [DDRPadのバージョン別曲一覧](https://ddrpad.com/pages/full-list-of-all-dance-dance-revolution-songs)、[GamerchのSongs表](https://gamerch.com/ddrlv/888617)、[DDR DP攻略WikiのWORLD新曲リスト](https://w.atwiki.jp/ddr_dp/pages/4349.html)。元の公式656曲と資料内の区分を突き合わせ、食い違い0件を確認した。ただし非公式資料の全件を実機で照合したわけではない。

表記違いは曖昧検索で一括確定せず、NFKC・空白調整か、次の9件の明示的な別名対応で処理した。いずれも区分をまたぐ競合はない。

| 公式表記 | 資料内の表記 | 区分 |
|---|---|---|
| Blind Justice ～Torn souls, Hurt Faiths ～ | Blind Justice ～Torn souls, Hurt Faiths～ | CLASSIC |
| CANDY♡ | CANDY♥ | CLASSIC |
| Dreamin’ | Dreamin' | WHITE |
| Frozen Ray ～for EXTREME～ | Frozen Ray 〜for EXTREME〜 | CLASSIC |
| Miracle Moon ～L.E.D.LIGHT STYLE MIX～ | 同名・末尾に不可視方向制御文字 | CLASSIC |
| Raspberry♡Heart(English version) | Raspberry♥Heart (English version) | CLASSIC |
| smooooch･∀･ | smooooch ・∀・ | CLASSIC |
| 天上の星～黎明記～ | 天上の星 ～黎明記～ | CLASSIC |
| We Can Win the Fight | We Can Win The Fight | GOLD |

注意: 家庭用での初出をそのまま区分に変換せず、資料のアーケード収録バージョンを利用している。例: We Can Win the Fightは家庭用では古いが、AC側の資料はA20 PLUSでGOLD。

全照合記録は `data/category-review.json`、出典から抽出した候補は `data/category-evidence.json`、実際の追補は `data/enrichment.json` に保存している。ユーザー登録・目標ランク・現在ランクは変更していない。
