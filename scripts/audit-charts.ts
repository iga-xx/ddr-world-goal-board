import { readFile, writeFile, mkdir } from 'node:fs/promises';
import { createHash } from 'node:crypto';
import { fileURLToPath } from 'node:url';
import { resolve } from 'node:path';
import { mergeSupplements } from './chart-supplements.ts';
const root = new URL('../', import.meta.url);
const wikiSource = 'https://bemaniwiki.com/?DanceDanceRevolution+WORLD/%E6%96%B0%E6%9B%B2%E3%83%AA%E3%82%B9%E3%83%88';
const iceSource = 'https://3icecream.com/js/songdata.js';
const names: Record<string,string> = {amp:'&',quot:'"',apos:"'",nbsp:' ',dagger:'†',aelig:'æ',uarr:'↑',Uacute:'Ú',ntilde:'ñ',copy:'©'};
export const clean = (s:string) => s.replace(/<br\b[^>]*>/gi,' ').replace(/<[^>]*>/g,'').replace(/&#x([\da-f]+);/gi,(_,n)=>String.fromCodePoint(parseInt(n,16))).replace(/&#(\d+);/g,(_,n)=>String.fromCodePoint(+n)).replace(/&([a-z]+);/gi,(all,n)=>names[n]??all).trim();
export function parseIce(js:string) {
  const match = js.match(/^\s*var ALL_SONG_DATA=(\[[\s\S]*?\]);(?:const|\s*$)/);
  if (!match) throw Error('三倍icecreamの公開データ形式を確認できません。');
  const data = JSON.parse(match[1]); // Never execute the downloaded JavaScript.
  if (!Array.isArray(data) || data.some(s=>!s.song_id || !s.song_name || !Array.isArray(s.ratings) || s.ratings.length!==9 || s.ratings.some((r:any)=>!Number.isInteger(r)||r<0||r>19))) throw Error('譜面レベルのデータが不正です。');
  return data;
}
export function parseWiki(html:string) {
  const result:any[]=[];
  for (const table of html.matchAll(/<table\b[^>]*>([\s\S]*?)<\/table>/g)) {
    const grid:any[][]=[],spans:any[]=[];
    for (const row of table[1].matchAll(/<tr\b[^>]*>([\s\S]*?)<\/tr>/g)) {
      const r:any[]=[];
      for(let i=0;i<spans.length;i++)if(spans[i]?.left){r[i]=spans[i].cell;spans[i].left--;}
      let pos=0;
      for(const cell of row[1].matchAll(/<(td|th)\b([^>]*)>([\s\S]*?)<\/\1>/g)){
        while(r[pos])pos++;
        const colspan=+(cell[2].match(/colspan="(\d+)"/)?.[1]??1),rowspan=+(cell[2].match(/rowspan="(\d+)"/)?.[1]??1);
        const c={text:clean(cell[3]),attributes:cell[2]};
        for(let i=0;i<colspan;i++){r[pos]=c;if(rowspan>1)spans[pos]={cell:c,left:rowspan-1};pos++;}
      }
      grid.push(r);
    }
    if (!grid[0]?.some(c=>c.text==='SINGLE') || !grid[0]?.some(c=>c.text==='曲名')) continue;
    for(const r of grid)if(r.length===16&&/^20\d\d\//.test(r[0].text))result.push({title:r[2].text.replace(/\*\d+/g,''),artist:r[3].text,date:r[0].text,levels:r.slice(7,12).map(c=>{const m=c.text.match(/^(?:\[SA\]\s*)?(\d+)$/);return m?+m[1]:null;})});
  }
  if(result.length<100)throw Error('BEMANIWikiの表形式が変わりました。');
  return result;
}
const key=(s:string)=>s.normalize('NFKC').replace(/\s+/g,'').replace(/[〜～]/g,'~');
const sourceId=(s:any)=>s.sourceSongId ?? new URL(s.jacketSource).searchParams.get('img');
async function main() {
  const date = new Date().toISOString();
  if(process.argv.includes('--refresh')){
    await mkdir(new URL('data/raw/',root),{recursive:true});
    for(const [url,path] of [[iceSource,'3ice-songdata.js'],[wikiSource,'bemani-world-new.html']]){
      const r=await fetch(url,{signal:AbortSignal.timeout(30000)});if(!r.ok)throw Error(`HTTP ${r.status}: ${url}`);
      await writeFile(new URL(`data/raw/${path}`,root),await r.text());
    }
  }
  const ice = parseIce(await readFile(new URL('data/raw/3ice-songdata.js',root),'utf8'));
  const wiki = parseWiki(await readFile(new URL('data/raw/bemani-world-new.html',root),'utf8'));
  const master=JSON.parse(await readFile(new URL('public/master.json',root),'utf8'));
  const enrichment=JSON.parse(await readFile(new URL('data/enrichment.json',root),'utf8'));
  const confirmations=JSON.parse(await readFile(new URL('data/chart-confirmations.json',root),'utf8')).charts;
  let prior:any={songs:[],charts:[]};
  try{prior=JSON.parse(await readFile(new URL('data/chart-supplements.json',root),'utf8'));}catch(e){if((e as any).code!=='ENOENT')throw e;}
  const bySource=new Map(master.songs.map((s:any)=>[sourceId(s),s]));
  const supplements:any={schemaVersion:1,retrievedAt:date,sources:[iceSource,wikiSource],songs:[],charts:[]};
  const report:any={retrievedAt:date,missingCharts:[],newSongs:[],levelConflicts:[],singleSource:[],excluded:[],duplicateTitles:[],unmatchedOfficial:[]};
  const artists=new Map<string,string>();
  for(let i=0;i<27;i++) {
    let raw:string;try{raw=await readFile(new URL(`data/raw/music-${i}.html`,root),'utf8');}catch(e){if((e as any).code==='ENOENT')continue;throw e;}
    for(const row of raw.matchAll(/<tr class="data">([\s\S]*?)<\/tr>/g)){
      const id=row[1].match(/img=([^&"]+)/)?.[1],artist=row[1].match(/class="artist">([^<]+)/)?.[1];
      if(id&&artist)artists.set(id,clean(artist));
    }
  }
  for(const song of master.songs)if(artists.has(sourceId(song)))song.artist=artists.get(sourceId(song));
  for(const data of ice) {
    if(data.deleted)continue;
    if(Object.hasOwn(enrichment.excludedSongs??{},data.song_name)){report.excluded.push({title:data.song_name,reason:'ユーザー指定'});continue;}
    if(!data.ratings.slice(2,5).some(Boolean)){report.excluded.push({title:data.song_name,reason:'SPの踊・激・鬼がない'});continue;}
    const candidates=wiki.filter(w=>key(w.title)===key(data.song_name));
    // Disambiguate same-title originals/covers by all available SP levels.
    const consistent=candidates.filter(w=>w.levels.every((level:number|null,i:number)=>level===null||level===data.ratings[i]));
    let song:any=bySource.get(data.song_id);
    const newSong=!song;
    if(newSong) {
      if(!Number.isInteger(data.version_num)||data.version_num<1||data.version_num>20)throw Error(`バージョン未確認: ${data.song_name}`);
      const id=createHash('sha256').update(`3ice:${data.song_id}`).digest('hex').slice(0,20);
      song={id,title:data.song_name,artist:consistent[0]?.artist??'',category:data.version_num<=13?'CLASSIC':data.version_num<=16?'WHITE':'GOLD',categorySource:iceSource,version:data.version_num,sourceSongId:data.song_id,jacket:`/jackets/${id}.img`,jacketSource:`https://3icecream.com/img/banners/${data.song_id}.jpg`,source:`https://3icecream.com/ddr/song_details/${data.song_id}`,retrievedAt:date,dataOrigin:'community-supplement'};
      supplements.songs.push(song);report.newSongs.push({title:song.title,id:song.id,artist:song.artist,sourceId:data.song_id,category:song.category,corroborated:!!consistent.length});
    } else if(song.dataOrigin==='community-supplement'||prior.songs.some((s:any)=>s.id===song.id))supplements.songs.push(prior.songs.find((s:any)=>s.id===song.id)??song);
    for(const [index,difficulty] of [[2,'DIFFICULT'],[3,'EXPERT'],[4,'CHALLENGE']] as const){
      const level=data.ratings[index];
      const existing=master.charts.find((c:any)=>c.songId===song.id&&c.difficulty===difficulty);
      if(existing&&existing.level!==level){report.levelConflicts.push({title:song.title,difficulty,master:existing.level,ice:level});continue;}
      if(!level)continue;
      if(existing&&existing.dataOrigin!=='community-supplement'&&!prior.charts.some((c:any)=>c.id===existing.id))continue;
      const corroborating=candidates.filter(w=>w.levels[index]===level);
      const confirmed=confirmations.filter((c:any)=>c.sourceSongId===data.song_id&&c.title===data.song_name&&c.difficulty===difficulty&&c.level===level);
      if(candidates.length&&!corroborating.length){report.levelConflicts.push({title:song.title,difficulty,ice:level,wiki:candidates.map(w=>w.levels[index])});continue;}
      const skill=enrichment.skills[level];
      const chart={id:`${song.id}-SP-${difficulty}`,songId:song.id,style:'SP',difficulty,level,skills:{FL9:skill?.FL9??null,FLEX:skill?.FLEX??null},skillSource:skill?.source,source:iceSource,sourceSongId:data.song_id,corroboratingSources:[...(corroborating.length?[wikiSource]:[]),...confirmed.map((c:any)=>c.source)],retrievedAt:date,dataOrigin:'community-supplement'};
      supplements.charts.push(chart);
      if(!existing)report.missingCharts.push({title:song.title,songId:song.id,difficulty,level,newSong,sourceId:data.song_id,corroborated:!!corroborating.length});
      if(!chart.corroboratingSources.length)report.singleSource.push({title:song.title,difficulty,level,source:chart.source});
    }
  }
  for(const song of master.songs)if(!ice.some(s=>s.song_id===sourceId(song)))report.unmatchedOfficial.push(song.title);
  const merged=mergeSupplements(master,supplements);
  await writeFile(new URL('data/chart-source-evidence.json',root),JSON.stringify({retrievedAt:date,sources:[iceSource,wikiSource],ice:ice.map(s=>({song_id:s.song_id,song_name:s.song_name,version_num:s.version_num,ratings:s.ratings,...(s.deleted?{deleted:s.deleted}:{})})),wiki},null,2));
  report.supplementTotals={songs:supplements.songs.length,charts:supplements.charts.length};
  for(const song of merged.songs)if(merged.songs.filter((s:any)=>s.title===song.title).length>1)report.duplicateTitles.push({title:song.title,artist:song.artist,id:song.id});
  await writeFile(new URL('data/chart-audit.json',root),JSON.stringify(report,null,2));
  console.log(JSON.stringify({newSongs:report.newSongs.length,missingCharts:report.missingCharts.length,existingSongCharts:report.missingCharts.filter((c:any)=>!c.newSong).length,levelConflicts:report.levelConflicts.length,singleSource:report.singleSource.length,excluded:report.excluded,duplicateTitles:report.duplicateTitles}));
  if(report.levelConflicts.length){console.log(JSON.stringify(report.levelConflicts));throw Error('矛盾があるためマスターには反映しません。');}
  if(!process.argv.includes('--apply'))return;
  await mkdir(new URL('public/jackets/',root),{recursive:true});
  for(const song of supplements.songs){
    let image:Uint8Array;
    try{image=await readFile(new URL(`public${song.jacket}`,root));}catch{const r=await fetch(song.jacketSource,{signal:AbortSignal.timeout(30000)});if(!r.ok||!r.headers.get('content-type')?.startsWith('image/'))throw Error(`画像取得失敗: ${song.title}`);image=new Uint8Array(await r.arrayBuffer());await writeFile(new URL(`public${song.jacket}`,root),image);}
    if(image.length<100)throw Error(`画像が空です: ${song.title}`);
  }
  await writeFile(new URL('data/chart-supplements.json',root),JSON.stringify(supplements,null,2));
  await writeFile(new URL('public/master.json',root),JSON.stringify(merged,null,2));
  console.log(`反映完了: ${merged.songs.length}曲 / ${merged.charts.length}譜面`);
}
if(process.argv[1]&&resolve(process.argv[1])===fileURLToPath(import.meta.url))main().catch(e=>{console.error(e);process.exitCode=1;});
