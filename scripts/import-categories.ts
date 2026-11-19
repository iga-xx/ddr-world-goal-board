import {readFile,writeFile} from 'node:fs/promises';
const file=new URL('../data/enrichment.json',import.meta.url);
const enrichment=JSON.parse(await readFile(file,'utf8'));
const decode=(s:string)=>s.replace(/&amp;/g,'&').replace(/&quot;/g,'"').replace(/&#39;/g,"'").replace(/&lt;/g,'<').replace(/&gt;/g,'>');
for (const category of ['CLASSIC','WHITE','GOLD']) {
  const source=`https://p.eagate.573.jp/game/bpl/season4/ddr/about/music/final/${category.toLowerCase()}/index.html`;
  const response=await fetch(source);if(!response.ok)throw Error(`HTTP ${response.status}`);
  const html=await response.text();
  const titles=[...html.matchAll(/<div class="cat"><p>\d+<\/p><p(?: class="[^"]*")?>([\s\S]*?)<\/p><\/div>/g)].map(m=>decode(m[1].replace(/<[^>]*>/g,'').trim()));
  if(!titles.length)throw Error('公式BPLの形式が変わりました。');
  for(const title of titles){if(enrichment.songs[title] && enrichment.songs[title].category!==category)throw Error(`区分矛盾: ${title}`);enrichment.songs[title]={category,source,retrievedAt:new Date().toISOString()};}
  console.log(`${category}: ${new Set(titles).size}曲`);
}
await writeFile(file,JSON.stringify(enrichment,null,2));
// Only apply exact matches. Never infer a category for unmatched titles.
const masterFile=new URL('../public/master.json',import.meta.url);
try{const master=JSON.parse(await readFile(masterFile,'utf8'));for(const song of master.songs){const e=enrichment.songs[song.title];if(e){song.category=e.category;song.categorySource=e.source;}}await writeFile(masterFile,JSON.stringify(master,null,2));console.log(`照合済み ${master.songs.filter((s:any)=>s.category).length}/${master.songs.length}曲`);}catch(e){if((e as NodeJS.ErrnoException).code!=='ENOENT')throw e;}
