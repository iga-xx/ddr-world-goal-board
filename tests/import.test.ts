import {test} from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {parsePage} from '../scripts/import-official.ts';
import {makeEntry,rows,sortRows} from '../src/domain.ts';
test('実マスターのスキルで目標順に並び、現在ランクでは順序が変わらない',async()=>{
  const m=JSON.parse(await readFile(new URL('../public/master.json',import.meta.url),'utf8'));
  const levels=[15,16,17];
  const charts=levels.map(level=>m.charts.find((c:any)=>c.level===level));
  const entries=charts.map((c:any)=>makeEntry(c,m.songs.find((s:any)=>s.id===c.songId),c.level===15?'FLEX':'FL9'));
  assert.deepEqual(sortRows(rows(entries,m)).map(r=>r.chart.skills[r.entry.target]),[977,960,954]);
  entries[1].current='FLEX';
  assert.deepEqual(sortRows(rows(entries,m)).map(r=>r.chart.skills[r.entry.target]),[977,960,954]);
  entries[1].target='FLEX';
  assert.deepEqual(sortRows(rows(entries,m)).map(r=>r.chart.skills[r.entry.target]),[992,977,960]);
});
test('区分追補は出典付き・競合なし、未確定曲を勝手に埋めない',async()=>{
  const load=async(name:string)=>JSON.parse(await readFile(new URL(`../${name}`,import.meta.url),'utf8'));
  const [master,enrichment,report]=await Promise.all([load('public/master.json'),load('data/enrichment.json'),load('data/category-review.json')]);
  assert.equal(report.conflicts.length,0);
  for(const decision of report.decisions){
    assert.deepEqual([...new Set(decision.evidence.map((e:any)=>e.category))],[decision.category]);
    assert(decision.evidence.every((e:any)=>e.source&&e.version));
    const song=master.songs.find((s:any)=>s.title===decision.title);
    assert.equal(song.category,decision.category);
    assert.equal(song.categorySource,decision.source);
    assert.equal(enrichment.songs[song.title].category,song.category);
  }
  for(const unresolved of report.unresolved)assert.equal(master.songs.find((s:any)=>s.title===unresolved.title).category,null);
  assert.equal(master.songs.find((s:any)=>s.title==='Happy'),undefined);
  assert(enrichment.excludedSongs.Happy);
});
test('公式HTML: SPのみ、欠けた譜面は作らず、表記を保持',()=>{const html='<tr class="data"><img src="/j?img=x&amp;kind=1"><div class="music-title">A &amp; B</div><div class="label">SP</div><div class="diff DIFFICULT">Lv. <div class="level">12</div></div><div class="diff EXPERT">Lv. <div class="level">16</div></div><div class="diff CHALLENGE">Lv. <div class="level">-</div></div><div class="label">DP</div><div class="diff CHALLENGE">Lv. <div class="level">18</div></div></tr>';const [s]=parsePage(html,'test');assert.equal(s.title,'A & B');assert.deepEqual(s.charts.map(c=>[c.difficulty,c.level]),[['DIFFICULT',12],['EXPERT',16]]);assert.equal(s.category,null);assert.equal(s.charts[0].skills.FL9,null);assert.throws(()=>parsePage('<tr class="data">invalid</tr>','test'));});
test('取り込み済みマスターの参照整合性と全画像存在',async()=>{const m=JSON.parse(await readFile(new URL('../public/master.json',import.meta.url),'utf8'));assert.equal(new Set(m.songs.map((s:any)=>s.id)).size,m.songs.length);assert.equal(new Set(m.charts.map((s:any)=>s.id)).size,m.charts.length);const ids=new Set(m.songs.map((s:any)=>s.id));for(const c of m.charts){assert(ids.has(c.songId));assert.equal(c.style,'SP');assert(c.level>=1&&c.level<=19)}for(const s of m.songs){const image=await readFile(new URL('../public'+s.jacket,import.meta.url));assert(image.length>100);if(s.category)assert(['p.eagate.573.jp','ddrpad.com','gamerch.com','w.atwiki.jp','3icecream.com'].includes(new URL(s.categorySource).hostname));}});
