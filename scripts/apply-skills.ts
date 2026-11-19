import { readFile, writeFile } from 'node:fs/promises';
const root = new URL('../', import.meta.url);
const enrichment = JSON.parse(await readFile(new URL('data/enrichment.json', root), 'utf8'));
const master = JSON.parse(await readFile(new URL('public/master.json', root), 'utf8'));
for (const chart of master.charts) {
  const skill = enrichment.skills[chart.level];
  if (!skill) continue;
  if (!skill.source || ![skill.FL9, skill.FLEX].every(v => Number.isSafeInteger(v) && v > 0 && v <= 10000) || skill.FLEX < skill.FL9) throw Error(`不正なスキル表: Lv.${chart.level}`);
  chart.skills = { FL9: skill.FL9, FLEX: skill.FLEX };
  chart.skillSource = skill.source;
}
await writeFile(new URL('public/master.json', root), JSON.stringify(master, null, 2));
console.log(`スキル値設定済み: ${master.charts.filter((c:any) => c.skills.FL9 !== null && c.skills.FLEX !== null).length}/${master.charts.length}譜面`);
