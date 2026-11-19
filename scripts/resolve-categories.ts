import {readFile,writeFile} from 'node:fs/promises';
const root=new URL('../',import.meta.url);
const text=(s:string)=>s.replace(/<[^>]*>/g,'').replace(/&amp;/g,'&').replace(/&quot;/g,'"').replace(/&#39;|&apos;/g,"'").replace(/&nbsp;/g,' ').replace(/&lt;/g,'<').replace(/&gt;/g,'>').replace(/&#x([\da-f]+);/gi,(_,n)=>String.fromCodePoint(parseInt(n,16))).replace(/&#(\d+);/g,(_,n)=>String.fromCodePoint(+n)).trim();
const key=(s:string)=>s.normalize('NFKC').replace(/\s+/g,' ').trim();
type Evidence={title:string;category:string;version:string;source:string;kind:string};
const evidence:Evidence[]=[];
const source='https://ddrpad.com/pages/full-list-of-all-dance-dance-revolution-songs';
const html=await readFile(new URL('data/raw/ddrpad-songs.html',root),'utf8');
let category='',version='';
for(const m of html.matchAll(/<(h[1-3]|li)\b[^>]*>([\s\S]*?)<\/\1>/g)){
  const content=text(m[2]);
  if(m[1]!=='li'){
    if(m[1]==='h1'){category=content.startsWith('New Songs')?'GOLD':'';version=category?'WORLD':'';}
    if(m[1]==='h2'&&/DanceDanceRevolution/.test(content)){
      version=content.replace(/\s*\(\d+ [Ss]ongs\)\s*$/,'');
      category=/ A3\b| A20\b/.test(version)?'GOLD':/\(201[34]\)|DanceDanceRevolution A$/.test(version)?'WHITE':'CLASSIC';
    }
    continue;
  }
  if(!category)continue;
  const a=m[2].match(/<a\b[^>]*href="(https:\/\/remywiki.com\/[^"#]+)"[^>]*>([\s\S]*?)<\/a>/);
  if(!a)continue;
  evidence.push({title:text(a[2]),category,version,source,kind:'secondary-version-list'});
}
const community=await readFile(new URL('data/raw/community-songs.html',root),'utf8');
for(const row of community.matchAll(/<tr\b[^>]*>([\s\S]*?)<\/tr>/g)){
  const cells=[...row[1].matchAll(/<td\b[^>]*>([\s\S]*?)<\/td>/g)].map(m=>text(m[1]));
  if(cells.length>=4&&['CLASSIC','WHITE','GOLD'].includes(cells[3]))evidence.push({title:cells[0],category:cells[3],version:cells[2],source:'https://gamerch.com/ddrlv/888617',kind:'secondary-category-table'});
}
// Reviewed spelling aliases only; never remove arbitrary punctuation or use fuzzy matching.
const aliases:Record<string,string>={
  'Blind Justice ～Torn souls, Hurt Faiths ～':'Blind Justice ～Torn souls, Hurt Faiths～',
  'CANDY♡':'CANDY♥',
  'Dreamin’':"Dreamin'",
  'Frozen Ray ～for EXTREME～':'Frozen Ray 〜for EXTREME〜',
  'Miracle Moon ～L.E.D.LIGHT STYLE MIX～':'Miracle Moon ～L.E.D.LIGHT STYLE MIX～‎',
  'Raspberry♡Heart(English version)':'Raspberry♥Heart (English version)',
  'smooooch･∀･':'smooooch ・∀・',
  '天上の星～黎明記～':'天上の星 ～黎明記～',
  'We Can Win the Fight':'We Can Win The Fight',
};
for(const [officialTitle,sourceTitle] of Object.entries(aliases)){
  const found=evidence.filter(e=>e.title===sourceTitle);
  if(!found.length)throw Error(`出典内に別名がありません: ${sourceTitle}`);
  for(const e of found)evidence.push({...e,title:officialTitle,kind:`reviewed-alias: ${sourceTitle}`});
}
const notices=await readFile(new URL('data/raw/world-notices.html',root),'utf8');
const blocks=[...notices.matchAll(/<div id="(info\d+)" class="news_one">([\s\S]*?)(?=<div id="info\d+" class="news_one">|$)/g)];
const newTitles=['華麗なる！音戯探偵ひなビタ♫','三妖精SAY YA!!!','打打打打打打打打打打 (にじさんじダンス部 ver.)','テトリス','天狗の落とし文 (feat. ｙｔｒ)','燭','僕の飛行機','マツヨイナイトバグ','ライアーダンサー','恋繋エピローグ','About Damn Time',"Better When I'm Dancin'",'Blinding Lights','BUCHiAGE 祭 DANCE','Din Don Dan (にじさんじダンス部 ver.)','Ex-Otogibanashi','Firework','Good Life','Homesick Pt.2&3','Levitating','Make Mi Make Mi','Miles on It','New Nostalgy','One Kiss','Rain On Me','Silent Flame,Never Fade','Somedays','Stars In The Sky','Ultimate taste'];
for(const title of newTitles){
  const block=blocks.find(m=>text(m[2]).includes(`「${title} /`)&&/新規楽曲|カバー曲|採用楽曲/.test(text(m[2])));
  if(!block)throw Error(`新曲追加の根拠が見つかりません: ${title}`);
  evidence.push({title,category:'GOLD',version:'WORLD',source:`https://p.eagate.573.jp/game/ddr/ddrworld/info/index.html#${block[1]}`,kind:'official-new-song-notice'});
}
// Official title-change notice plus the previously listed WORLD song.
if(!notices.includes('修正後：「チルノのパーフェクトさんすう学園【ビートまりお】」'))throw Error('改名告知を確認できません');
evidence.push({title:'チルノのパーフェクトさんすう学園【ビートまりお】',category:'GOLD',version:'WORLD',source:'https://p.eagate.573.jp/game/ddr/ddrworld/info/index.html',kind:'official-new-song-and-title-change-notices'});
for(const title of ['4NT1 D34D','Deadly Dolly Dance','SkyDrive! (HASEKO EUROBEAT MIX)','東方妖々夢 ULTIMATE MEDLEY'])evidence.push({title,category:'GOLD',version:'WORLD',source:'https://w.atwiki.jp/ddr_dp/pages/4349.html',kind:'secondary-world-new-song-list'});
await writeFile(new URL('data/category-evidence.json',root),JSON.stringify({retrievedAt:new Date().toISOString(),evidence},null,2));
const master=JSON.parse(await readFile(new URL('public/master.json',root),'utf8'));
const enrichment=JSON.parse(await readFile(new URL('data/enrichment.json',root),'utf8'));
const decisions:any[]=[],unresolved:any[]=[],conflicts:any[]=[];
for(const song of master.songs){
  if(Object.hasOwn(enrichment.excludedSongs ?? {},song.title))continue;
  if(song.title==='Happy'&&!song.category){unresolved.push({title:song.title,reason:'DDR A収録歴とWORLD再追加告知が併存。現行の実機WHITE/GOLD区分を要確認。',candidates:['WHITE','GOLD'],sources:['https://p.eagate.573.jp/game/ddr/ddrworld/info/index.html','https://en.wikipedia.org/wiki/Dance_Dance_Revolution_World'],evidence:[]});continue;}
  const exact=evidence.filter(e=>e.title===song.title);
  const found=exact.length?exact:evidence.filter(e=>key(e.title)===key(song.title));
  const cats=[...new Set(found.map(e=>e.category))];
  if(song.category){if(cats.some(c=>c!==song.category))conflicts.push({title:song.title,existing:song.category,evidence:found});const previous=enrichment.songs[song.title];if(previous?.evidence)decisions.push(previous);continue;}
  if(cats.length!==1){unresolved.push({title:song.title,reason:cats.length?'資料内で区分が競合':'一致する出典なし',evidence:found});continue;}
  decisions.push({title:song.title,category:cats[0],source:found[0].source,version:found[0].version,matchedTitle:found[0].title,match:exact.length?'exact':'NFKC-space',evidence:found,kind:found[0].kind.startsWith('official')?'official':'secondary',retrievedAt:new Date().toISOString()});
}
const report={schemaVersion:1,generatedAt:new Date().toISOString(),decisions,unresolved,conflicts,excluded:enrichment.excludedSongs ?? {}};
await writeFile(new URL('data/category-review.json',root),JSON.stringify(report,null,2));
console.log(JSON.stringify({evidence:evidence.length,add:decisions.length,unresolved:unresolved.length,conflicts:conflicts.length}));
console.log('未解決:',unresolved.map(s=>s.title).join(' / '));
console.log('既存との競合:',conflicts.map(s=>s.title).join(' / '));
if(process.argv.includes('--apply')){
  for(const decision of decisions){enrichment.songs[decision.title]=decision;const song=master.songs.find((s:any)=>s.title===decision.title);song.category=decision.category;song.categorySource=decision.source;song.categoryEvidence=decision;}
  await writeFile(new URL('data/enrichment.json',root),JSON.stringify(enrichment,null,2));
  await writeFile(new URL('public/master.json',root),JSON.stringify(master,null,2));
}

