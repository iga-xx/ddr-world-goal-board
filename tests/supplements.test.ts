import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { clean, parseIce, parseWiki } from '../scripts/audit-charts.ts';
import { mergeSupplements } from '../scripts/chart-supplements.ts';
const json=async(path:string)=>JSON.parse(await readFile(new URL(`../${path}`,import.meta.url),'utf8'));
test('三倍icecreamとWikiのSP表で追補全件のレベルを照合',async()=>{
  const [master,supplements]=await Promise.all([json('public/master.json'),json('data/chart-supplements.json')]);
  const evidence=await json('data/chart-source-evidence.json');
  const ice=parseIce(`var ALL_SONG_DATA=${JSON.stringify(evidence.ice)};const EXCLUSIONS=[];`);
  const byId=new Map(ice.filter(s=>!s.deleted).map(s=>[s.song_id,s]));
  for(const chart of supplements.charts){
    const source=byId.get(chart.sourceSongId)!;assert(source);
    assert.equal(source.ratings[{DIFFICULT:2,EXPERT:3,CHALLENGE:4}[chart.difficulty as 'DIFFICULT'|'EXPERT'|'CHALLENGE']],chart.level);
    assert(chart.corroboratingSources.length>0);
    assert.equal(master.charts.find((c:any)=>c.id===chart.id).level,chart.level);
    if(chart.level>=9)assert.notEqual(chart.skills.FL9,null);else assert.equal(chart.skills.FL9,null);
  }
  const wiki=parseWiki(await readFile(new URL('./fixtures/wiki-chart-tables.html',import.meta.url),'utf8'));
  assert(wiki.some(r=>r.title==='WILD RUSH'&&r.levels[4]===14));
  assert(wiki.some(r=>r.title==='華麗なる！音戯探偵ひなビタ♫'&&r.levels[4]===16));
  assert(wiki.some(r=>r.title==='Continue to the real world?'&&r.levels[4]===17));
  assert.equal(clean('&#220;bertreffen &amp; La Se&ntilde;orita'),'Übertreffen & La Señorita');
  assert.throws(()=>parseIce('globalThis.compromised=true; var ALL_SONG_DATA=[];'));
});
test('公式更新への再マージで追補を保持し、競合時には入力を壊さず停止',async()=>{
  const supplements=await json('data/chart-supplements.json');
  const master=await json('public/master.json');
  const base={...master,songs:master.songs.filter((s:any)=>s.dataOrigin!=='community-supplement'),charts:master.charts.filter((c:any)=>c.dataOrigin!=='community-supplement')};
  const merged=mergeSupplements(base,supplements);
  const officiallyAddedSong={...supplements.songs[0],category:null,categorySource:null};
  const officialRefresh=mergeSupplements({songs:[officiallyAddedSong],charts:[],sources:[]},{songs:[supplements.songs[0]],charts:[],sources:[]});
  assert.equal(officialRefresh.songs[0].category,supplements.songs[0].category);
  assert.equal(merged.songs.length,master.songs.length);assert.equal(merged.charts.length,master.charts.length);
  assert.deepEqual(mergeSupplements(merged,supplements),merged);
  const conflict=structuredClone(supplements);conflict.charts[0].level++;
  const before=JSON.stringify(merged);assert.throws(()=>mergeSupplements(merged,conflict),/競合/);assert.equal(JSON.stringify(merged),before);
  for(const title of ['朱と碧のランページ','リメンバーリメンバー']){
    const copies=merged.songs.filter((s:any)=>s.title===title);assert.equal(copies.length,2);assert.equal(new Set(copies.map((s:any)=>s.id)).size,2);assert.equal(new Set(copies.map((s:any)=>s.displayTitle)).size,2);
  }
  for(const entry of (await json('tests/browser-backup.json')).entries){assert(merged.charts.some((c:any)=>c.id===entry.chartId));}
});
