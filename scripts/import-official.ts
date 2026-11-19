import { mkdir, readFile, writeFile, rename } from 'node:fs/promises';
import { createHash } from 'node:crypto';
import { fileURLToPath } from 'node:url';
import { resolve } from 'node:path';
import { mergeSupplements } from './chart-supplements.ts';

const root = fileURLToPath(new URL('../', import.meta.url));
const base = 'https://p.eagate.573.jp';
const date = new Date().toISOString();
const decode = (s: string) => s.replace(/&amp;/g, '&').replace(/&quot;/g, '"').replace(/&#39;|&apos;/g, "'").replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&#(\d+);/g, (_, n) => String.fromCodePoint(+n));
export function parsePage(html: string, source: string) {
  const rows = [...html.matchAll(/<tr class="data">([\s\S]*?)<\/tr>/g)];
  return rows.map(([, row]) => {
    const title = decode(row.match(/class="music-title">([^<]+)</)?.[1] ?? '');
    const image = decode(row.match(/<img src="([^"]+)"/)?.[1] ?? '');
    const sp = row.split('<div class="label">SP</div>')[1]?.split('<div class="label">DP</div>')[0];
    if (!title || !image || !sp) throw Error('公式HTMLの形式が変更されました。既存マスターは保持されます。');
    const id = createHash('sha256').update(title).digest('hex').slice(0, 20);
    const charts = [...sp.matchAll(/class="diff (DIFFICULT|EXPERT|CHALLENGE)">Lv\. <div class="level">(\d+)<\/div>/g)].map(([, difficulty, level]) => ({ id: `${id}-SP-${difficulty}`, songId: id, style: 'SP', difficulty, level: +level, skills: { FL9: null, FLEX: null } }));
    return { id, title, artist: decode(row.match(/class="artist">([^<]+)/)?.[1] ?? ''), category: null, categorySource: null, jacket: `/jackets/${id}.img`, jacketSource: new URL(image, base).href, source, retrievedAt: date, charts };
  });
}
async function download(url: string) {
  for (let attempt = 0; attempt < 3; attempt++) {
    try { const r = await fetch(url, { signal: AbortSignal.timeout(30000) }); if (!r.ok) throw Error(`HTTP ${r.status}: ${url}`); return r; }
    catch (error) { if (attempt === 2) throw error; }
  }
  throw Error('取得失敗');
}
async function main() {
  await mkdir(resolve(root, 'data/raw'), { recursive: true });
  await mkdir(resolve(root, 'public/jackets'), { recursive: true });
  const firstUrl = `${base}/game/ddr/ddrworld/music/index.html?offset=0&filter=7`;
  const first = await (await download(firstUrl)).text();
  const offsets = [...first.matchAll(/offset=(\d+)&(?:amp;)?filter=7/g)].map(m => +m[1]);
  if (!offsets.length) throw Error('ページ数を確認できません。');
  const pages = Math.max(...offsets) + 1;
  const songs: ReturnType<typeof parsePage> = [];
  for (let i = 0; i < pages; i++) {
    const url = `${base}/game/ddr/ddrworld/music/index.html?offset=${i}&filter=7`;
    const html = i ? await (await download(url)).text() : first;
    await writeFile(resolve(root, `data/raw/music-${i}.html`), html);
    const parsed = parsePage(html, url);
    if (!parsed.length) throw Error(`空のページ: ${i}`);
    songs.push(...parsed);
    console.log(`公式一覧 ${i + 1}/${pages}: ${songs.length}曲`);
  }
  let previous:any={songs:[]};
  try { previous=JSON.parse(await readFile(resolve(root,'public/master.json'),'utf8')); } catch(e) { if((e as any).code!=='ENOENT')throw e; }
  const previousIds = new Map(previous.songs.map((s:any)=>[s.sourceSongId ?? new URL(s.jacketSource).searchParams.get('img'),s.id]));
  const usedIds=new Map<string,string>();
  for(const song of songs){
    const sourceId=new URL(song.jacketSource).searchParams.get('img')!;
    let id=(previousIds.get(sourceId) as string|undefined) ?? song.id;
    if(usedIds.has(id)&&usedIds.get(id)!==sourceId)id=createHash('sha256').update(`official:${sourceId}`).digest('hex').slice(0,20);
    usedIds.set(id,sourceId);song.id=id;song.jacket=`/jackets/${id}.img`;
    for(const chart of song.charts){chart.songId=id;chart.id=`${id}-SP-${chart.difficulty}`;}
  }
  const allUnique = [...new Map(songs.map(s => [s.id, s])).values()];
  if (allUnique.length !== songs.length) throw Error('ページ内の曲の重複を検出。更新せず停止。');
  const enrichment = JSON.parse(await readFile(resolve(root, 'data/enrichment.json'), 'utf8'));
  const unique = allUnique.filter(song => !Object.hasOwn(enrichment.excludedSongs ?? {}, song.title));
  let images = 0;
  for (const song of unique) {
    const extra = enrichment.songs[song.title];
    if (extra && ['CLASSIC','WHITE','GOLD'].includes(extra.category) && extra.source) Object.assign(song, {category: extra.category, categorySource: extra.source, categoryEvidence: extra});
    for (const chart of song.charts) {
      const skill = enrichment.skills[chart.level];
      if (skill?.source && [skill.FL9, skill.FLEX].every(v => Number.isSafeInteger(v) && v > 0) && skill.FLEX >= skill.FL9) Object.assign(chart, {skills: {FL9:skill.FL9,FLEX:skill.FLEX},skillSource:skill.source});
    }
    try { await readFile(resolve(root, `public${song.jacket}`)); }
    catch { const r = await download(song.jacketSource); const bytes = new Uint8Array(await r.arrayBuffer()); if (!r.headers.get('content-type')?.startsWith('image/')) throw Error(`画像ではない応答: ${song.title}`); await writeFile(resolve(root, `public${song.jacket}`), bytes); }
    if (++images % 100 === 0) console.log(`ジャケット ${images}/${unique.length}`);
  }
  const master = {schemaVersion:1,retrievedAt:date,sources:[firstUrl],songs:unique.map(({charts,...song}) => song),charts:unique.flatMap(s=>s.charts)};
  let supplements:any={songs:[],charts:[]};
  try { supplements=JSON.parse(await readFile(resolve(root,'data/chart-supplements.json'),'utf8')); } catch(e) { if((e as any).code!=='ENOENT')throw e; }
  const merged=mergeSupplements(master,supplements);
  await writeFile(resolve(root, 'public/master.json.tmp'), JSON.stringify(merged, null, 2));
  await rename(resolve(root, 'public/master.json.tmp'), resolve(root, 'public/master.json'));
  console.log(`完了: ${merged.songs.length}曲 / ${merged.charts.length}譜面。区分確認済み ${merged.songs.filter((s:any)=>s.category).length}曲`);
}
if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) main().catch(e => { console.error(e); process.exitCode = 1; });
