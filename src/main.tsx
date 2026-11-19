import React, {useEffect,useMemo,useRef,useState} from 'react';
import {createRoot} from 'react-dom/client';
import {achieved,assertCapacity,backup,categories,difficulties,labels,makeEntry,normalize,parseBackup,rows,sortRows,summarize} from './domain';
import type {Current,Entry,Master,Target,Chart,Row} from './domain';
import publishedBoard from './published-board.json';
import {publishedEntries, type PublishedChart} from './published-board.ts';
import {readEntries,writeEntries} from './storage';
import './style.css';

const isPublished = import.meta.env.MODE === 'pages';
const assetUrl = (path: string) => import.meta.env.BASE_URL + path.slice(1);

function RankSelect({value,onChange,current=false,label,disabled=false}:{value:string;onChange:(v:any)=>void;current?:boolean;label:string;disabled?:boolean}){return <select disabled={disabled} aria-label={label} value={value} onChange={e=>onChange(e.target.value)}>{current&&<option value="NONE">なし</option>}<option>FL9</option><option>FLEX</option></select>}
function Skill({list}:{list:Row[]}){const s=summarize(list);return <span>{s.unknown ? <>{s.total.toLocaleString()} <small>+ 未確認{s.unknown}件</small></> : s.total.toLocaleString()}</span>}
function App(){
 const [master,setMaster]=useState<Master>();const [entries,setEntries]=useState<Entry[]>([]);const [ready,setReady]=useState(false);const [error,setError]=useState('');const [busy,setBusy]=useState(false);const [saved,setSaved]=useState('読み込み中');const [add,setAdd]=useState(false);const [info,setInfo]=useState(false);const [restore,setRestore]=useState<Entry[]|null>(null);const file=useRef<HTMLInputElement>(null);
 useEffect(()=>{
   async function loadBoard(){
     try {
       const response = await fetch(assetUrl('/master.json'));
       if (!response.ok) throw Error('master.jsonを読み込めません。');
       const master = await response.json() as Master;
       const stored = isPublished ? undefined : await readEntries();
       const entries = stored === undefined
         ? publishedEntries(publishedBoard as PublishedChart[], master)
         : parseBackup({...backup([]), entries: stored}, master);
       setMaster(master);
       setEntries(entries);
       setReady(true);
       setSaved(isPublished ? '公開データ' : stored === undefined ? '初期データ' : '保存済み');
     } catch (error) {
       setError(String(error));
       setSaved('読み込み失敗');
     }
   }
   void loadBoard();
 },[]);
 useEffect(()=>{const handler=(e:BeforeUnloadEvent)=>{if(busy){e.preventDefault();e.returnValue='';}};window.addEventListener('beforeunload',handler);return()=>window.removeEventListener('beforeunload',handler)},[busy]);
 const list=useMemo(()=>master?rows(entries,master):[],[entries,master]);const stats=summarize(list);
 async function commit(next:Entry[]){
   if (!master || busy) return false;
   try {
     assertCapacity(next, master);
     if (!isPublished) {
       setBusy(true);
       setSaved('保存中…');
       await writeEntries(next);
     }
     setEntries(next);
     setSaved(isPublished ? '一時変更中' : '保存済み');
     setError('');
     return true;
   } catch (error) {
     setError(`変更を適用できませんでした。 ${String(error)}`);
     if (!isPublished) setSaved('保存失敗');
     return false;
   } finally {
     if (!isPublished) setBusy(false);
   }
 }
 function update(id:string,patch:Partial<Entry>){void commit(entries.map(e=>e.chartId===id?{...e,...patch,updatedAt:new Date().toISOString()}:e))}
 function exportFile(){const blob=new Blob([JSON.stringify(backup(entries),null,2)],{type:'application/json'});const a=document.createElement('a');a.href=URL.createObjectURL(blob);a.download=`ddr-goals-${new Date().toISOString().slice(0,10)}.json`;a.click();setTimeout(()=>URL.revokeObjectURL(a.href),1000)}
 async function importFile(f?:File){if(!f||!master)return;try{if(f.size>2_000_000)throw Error('ファイルが大きすぎます。');setRestore(parseBackup(JSON.parse(await f.text()),master));}catch(e){setError(`読み込みを中止しました。既存データは変更していません。 ${String(e)}`)}finally{if(file.current)file.current.value=''}}
 return <><header><div className="brand"><span className="brand-icon">↗</span><div>DDR <b>WORLD</b><small>FLARE SKILL / GOAL BOARD</small></div></div><nav><span className="save" role="status"><i/> {saved}</span>{!isPublished&&<><button disabled={!ready||busy} onClick={exportFile}>バックアップ</button><button disabled={!ready||busy} onClick={()=>file.current?.click()}>復元</button><input ref={file} type="file" accept=".json,application/json" hidden onChange={e=>void importFile(e.target.files?.[0])}/></>}<button onClick={()=>setInfo(true)} aria-label="データ情報">ⓘ</button></nav></header>
 <main><div className="intro"><div><div className="eyebrow">YOUR NEXT 90 CHARTS</div><h1>WORLDへの、作戦ボード。</h1><p>これからスキル対象にしたい譜面を選び、ひとつずつ目標へ。</p></div><button className="primary" disabled={!ready||busy} onClick={()=>setAdd(true)}>＋ 譜面を追加</button></div>
 <section className="overview"><div><span>選択済み譜面</span><strong>{stats.count}<small> / 90</small></strong></div><div><span>目標達成</span><strong className="mint">{stats.done}<small> / 90</small></strong></div><div className="total"><span>目標スキル合計</span><strong><Skill list={list}/></strong></div><div className="world"><span>WORLD TARGET</span><strong>90,000</strong><small>登録譜面をすべて目標ランクで達成した場合</small></div></section>
 {error&&<div className="error" role="alert">{error}<button onClick={()=>setError('')}>閉じる</button></div>}
 {master&&<div className="notice"><span>{isPublished ? '公開版 / SP' : 'LOCAL / SP ONLY'}</span> {isPublished ? '曲の入れ替えは一時的です。再読み込みすると公開データに戻ります。' : `マスター ${master.songs.length.toLocaleString()}曲 · 区分確認済み ${master.songs.filter(s=>s.category).length}曲 · 目標スキル降順 · Lv9〜19はスキル値設定済み`} <button onClick={()=>setInfo(true)}>データ詳細</button></div>}
 <div className="board">{categories.map((category,index)=>{const group=sortRows(list.filter(r=>r.song.category===category));const s=summarize(group);return <section key={category} className={`column ${category.toLowerCase()}`}><div className="column-head"><div className="column-title"><span>0{index+1}</span><h2>{category}</h2><b>{s.count}<small> / 30</small></b></div><p>{['1st — X3 VS 2ndMIX','DDR (2013) — A','A20 — WORLD'][index]}</p><div className="column-stats"><span>✓ 達成 <b>{s.done} / 30</b></span><span>目標合計 <b><Skill list={group}/></b></span></div><div className="progress"><i style={{width:`${s.done/30*100}%`}}/></div></div>
 <div className="row-legend"><span>譜面 / レベル</span><span>目標 / スキル</span><span>現在</span></div>
 {group.map((r,i)=><BoardRow key={r.entry.chartId} row={r} index={i} busy={busy} onUpdate={patch=>update(r.entry.chartId,patch)} onDelete={()=>void commit(entries.filter(e=>e.chartId!==r.entry.chartId))}/>)}
 {!group.length&&<div className="empty"><span>＋</span><h3>最初の目標を選ぼう</h3><p>この区分の30譜面を、あなたのペースで。</p><button disabled={!ready||busy} onClick={()=>setAdd(true)}>譜面を探す ↗</button></div>}
 {!!group.length&&group.length<30&&<button className="add-row" disabled={busy} onClick={()=>setAdd(true)}>＋ あと{30-group.length}譜面を追加できます</button>}
 </section>})}</div><footer>DDR WORLD 目標ボード <span>{isPublished ? '目標スキル順 · 達成した譜面も残ります' : 'このブラウザーに自動保存 · 目標スキル順 · 達成した譜面も残ります'}</span></footer></main>
 {add&&master&&<AddDialog master={master} entries={entries} busy={busy} onClose={()=>setAdd(false)} onSave={async selected=>{const ok=await commit([...entries,...selected]);if(ok)setAdd(false);return ok}}/>}
 {info&&<Modal title="マスターデータについて" onClose={()=>setInfo(false)}><div className="info"><p>取得日: {master?.retrievedAt.slice(0,10)}</p><p>曲名・SP譜面・画像は公式ALL MUSICを基本に、三倍icecreamとBEMANIWikiのデータで解禁条件付きの曲や追加鬼譜面を補っています。</p><p>区分は公式BPL課題曲・公式追加告知を優先し、不足分はDDRPadのバージョン別一覧とGamerch等の非公式資料で補っています。出典と照合方法はマスターに記録しています。Happyはユーザー指定により登録対象から除外しています。</p><p>FL9/FLEXのスキル値は非公式のSP総合Wiki掲載表からLv9〜19を設定し、Lv12〜19はGamerch掲載表とも一致を確認しています。公式数値表ではありません。Lv8以下は未確認のため「—」と表示し、末尾に並べます。未確認を含む合計は確定値ではありません。</p>{!isPublished&&<p>マスター更新で対応先を失った登録は保存時の情報で残り、「要確認」と表示されます。バックアップは定期的に書き出してください。同時編集は避け、同じブラウザー・同じ起動URLを使用してください。</p>}<p>出典: DDR WORLD公式 ALL MUSIC / フレアスキル解説 / BPL S4課題曲 / 公式追加告知 / DDRPad / Gamerch / DDR DP攻略Wiki / 三倍icecream / BEMANIWiki。詳細と更新手順はリポジトリのdocs/DATA-SOURCES.mdをご覧ください。</p></div></Modal>}
 {restore&&<Modal title="バックアップの復元確認" onClose={()=>setRestore(null)}><p>{restore.length}譜面を復元します。現在の{entries.length}譜面は、このバックアップの内容に置き換わります。</p><p>必要に応じて現在のバックアップを先に保存してください。</p><div className="actions"><button onClick={exportFile}>現在のバックアップを保存</button><button className="primary" disabled={busy} onClick={async()=>{if(await commit(restore))setRestore(null)}}>この内容で復元</button></div></Modal>}
 </>
}
function BoardRow({row:r,index,busy,onUpdate,onDelete}:{row:Row;index:number;busy:boolean;onUpdate:(p:Partial<Entry>)=>void;onDelete:()=>void}){const [remove,setRemove]=useState(false);const done=achieved(r.entry.target,r.entry.current);return <div className={`chart-row ${done?'done':''}`}><span className="index">{done?'✓':String(index+1).padStart(2,'0')}</span><img className="jacket" src={assetUrl(r.song.jacket)} alt=""/><div className="song-cell"><strong title={(r.song.displayTitle??r.song.title)}>{(r.song.displayTitle??r.song.title)}</strong><div><span className={`difficulty ${r.chart.difficulty}`}>{labels[r.chart.difficulty]}</span><b>{r.chart.level}</b>{r.orphan&&<small className="warn">要確認</small>}<small>{done?'達成':'未達成'}</small></div></div><div className="rank-cell"><fieldset disabled={busy}><RankSelect label={`${(r.song.displayTitle??r.song.title)} ${labels[r.chart.difficulty]} 目標`} value={r.entry.target} onChange={(target:Target)=>onUpdate({target})}/></fieldset><b>{r.chart.skills[r.entry.target]?.toLocaleString()??'—'}</b></div><fieldset disabled={busy}><RankSelect current label={`${(r.song.displayTitle??r.song.title)} ${labels[r.chart.difficulty]} 現在`} value={r.entry.current} onChange={(current:Current)=>onUpdate({current})}/></fieldset><button className="delete" disabled={busy} aria-label={`${(r.song.displayTitle??r.song.title)}を削除`} onClick={()=>setRemove(true)}>×</button>{remove&&<Modal title="譜面を削除" onClose={()=>setRemove(false)}><p>{(r.song.displayTitle??r.song.title)} / {labels[r.chart.difficulty]} Lv.{r.chart.level} を削除します。</p><div className="actions"><button onClick={()=>setRemove(false)}>キャンセル</button><button className="danger" onClick={onDelete} disabled={busy}>削除する</button></div></Modal>}</div>}
function Modal({title,onClose,children,wide=false}:{title:string;onClose:()=>void;children:React.ReactNode;wide?:boolean}){const dialog=useRef<HTMLDialogElement>(null);useEffect(()=>{const el=dialog.current;el?.showModal();return()=>el?.close()},[]);return <dialog ref={dialog} className={wide?'wide':''} onCancel={e=>{e.preventDefault();onClose()}}><div className="modal-head"><h2>{title}</h2><button aria-label="閉じる" onClick={onClose}>×</button></div>{children}</dialog>}
function AddDialog({master,entries,busy,onClose,onSave}:{master:Master;entries:Entry[];busy:boolean;onClose:()=>void;onSave:(e:Entry[])=>Promise<boolean>}){
 const [tab,setTab]=useState<'search'|'paste'>('search');const [query,setQuery]=useState('');const [category,setCategory]=useState('');const [difficulty,setDifficulty]=useState('');const [level,setLevel]=useState('');const [selected,setSelected]=useState<Record<string,Target>>({});const [bulk,setBulk]=useState<Target>('FLEX');const [paste,setPaste]=useState('');const [lines,setLines]=useState<{text:string;songId:string}[]>([]);const [review,setReview]=useState(false);const [error,setError]=useState('');const [limit,setLimit]=useState(100);
 const songMap=useMemo(()=>new Map(master.songs.map(s=>[s.id,s])),[master]);const registered=new Set(entries.map(e=>e.chartId));
 const matched=master.charts.filter(c=>{const s=songMap.get(c.songId)!;return normalize(s.title).includes(normalize(query))&&(!category||(category==='unknown'?!s.category:s.category===category))&&(!difficulty||c.difficulty===difficulty)&&(!level||c.level===+level)});
 const picks=master.charts.filter(c=>selected[c.id]);const resolved=rows(entries,master);
 function toggle(c:Chart){setError('');setSelected(old=>{const next={...old};if(next[c.id])delete next[c.id];else next[c.id]=bulk;return next})}
 function result(c:Chart){const s=songMap.get(c.songId)!;return <div className="result" key={c.id}><input type="checkbox" aria-label={`${s.displayTitle??s.title} ${labels[c.difficulty]}を選択`} checked={!!selected[c.id]} disabled={registered.has(c.id)||!s.category||busy} onChange={()=>toggle(c)}/><img className="jacket" src={assetUrl(s.jacket)} alt=""/><div className="result-title"><strong>{s.displayTitle??s.title}</strong><small>{s.category??'区分未確認 · 登録保留'} {registered.has(c.id)&&' · 登録済み'}</small></div><span className={`difficulty ${c.difficulty}`}>{labels[c.difficulty]}</span><b className="level">{c.level}</b><RankSelect disabled={registered.has(c.id)||!s.category||busy} label={`${s.displayTitle??s.title} ${labels[c.difficulty]} 登録目標`} value={selected[c.id]??bulk} onChange={(target:Target)=>setSelected({...selected,[c.id]:target})}/><span className="result-skill">{c.skills[selected[c.id]??bulk]??'—'}</span></div>}
 function validate(){try{const next=picks.map(c=>makeEntry(c,songMap.get(c.songId)!,selected[c.id]));assertCapacity([...entries,...next],master);if(!next.length)throw Error('譜面を選択してください。');setError('');setReview(true);}catch(e){setError(String(e))}}
 return <Modal title={review?'登録内容の確認':'目標にしたい譜面を追加'} onClose={onClose} wide><div className="picker-top"><div className="tabs"><button className={tab==='search'?'active':''} onClick={()=>{setTab('search');setReview(false)}}>曲を検索</button><button className={tab==='paste'?'active':''} onClick={()=>{setTab('paste');setReview(false)}}>曲名を一括貼り付け</button></div><div className="bulk">一括目標 <RankSelect label="一括目標ランク" value={bulk} onChange={(v:Target)=>{setBulk(v);setSelected(Object.fromEntries(Object.keys(selected).map(k=>[k,v])))}}/></div></div>
 <div className="selection-count">{categories.map(cat=><span key={cat}>{cat} <b>{resolved.filter(r=>r.song.category===cat).length + picks.filter(c=>songMap.get(c.songId)?.category===cat).length} / 30</b></span>)}</div>
 {error&&<p role="alert" className="error">{error}</p>}
 {review?<><p>選択した{picks.length}譜面を追加します。現在ランクの初期値は「なし」です。</p><div className="results">{picks.map(result)}</div></>:tab==='search'?<><div className="filters"><input autoFocus placeholder="曲名で検索…" aria-label="曲名検索" value={query} onChange={e=>{setQuery(e.target.value);setLimit(100)}}/><select aria-label="区分で絞り込み" value={category} onChange={e=>{setCategory(e.target.value);setLimit(100)}}><option value="">すべての区分</option>{categories.map(c=><option key={c}>{c}</option>)}<option value="unknown">区分未確認</option></select><select aria-label="譜面で絞り込み" value={difficulty} onChange={e=>{setDifficulty(e.target.value);setLimit(100)}}><option value="">すべての譜面</option>{difficulties.map(d=><option key={d} value={d}>{labels[d]}</option>)}</select><select aria-label="レベルで絞り込み" value={level} onChange={e=>{setLevel(e.target.value);setLimit(100)}}><option value="">全レベル</option>{Array.from({length:19},(_,i)=><option key={i} value={i+1}>Lv. {i+1}</option>)}</select></div><p className="hint">{matched.length}譜面が一致 · 区分未確認の曲は出典の追加が必要です。スキル未確認は — と表示。</p><div className="results">{matched.slice(0,limit).map(result)}{!matched.length&&<p className="empty">一致する譜面がありません。</p>}{matched.length>limit&&<button className="add-row" onClick={()=>setLimit(limit+100)}>さらに100件表示</button>}</div></>:<><p className="hint">1行に1曲を貼り付けてください。各行で曲を確認・選択してから譜面を選びます。</p><textarea aria-label="曲名の一括貼り付け" rows={4} value={paste} onChange={e=>setPaste(e.target.value)} placeholder={'PARANOiA\n冥\n…'}/><button onClick={()=>{const texts=paste.split(/\r?\n/).map(s=>s.trim()).filter(Boolean);if(texts.length>200){setError('一度に200行まで照合できます。');return}setLines(texts.map(text=>({text,songId:''})));setError('')}}>曲名を照合</button><div className="paste-results">{lines.map((line,i)=>{const exact=master.songs.filter(s=>normalize(s.title)===normalize(line.text));const candidates=exact.length?exact:master.songs.filter(s=>normalize(s.title).includes(normalize(line.text)));return <section className="paste-line" key={i}><div><span>{i+1}</span><input aria-label={`${i+1}行目の曲名`} value={line.text} onChange={e=>setLines(lines.map((l,j)=>i===j?{text:e.target.value,songId:''}:l))}/><select aria-label={`${i+1}行目の候補曲`} value={line.songId} onChange={e=>setLines(lines.map((l,j)=>i===j?{...l,songId:e.target.value}:l))}><option value="">{candidates.length?`${candidates.length}候補 · 曲を確認して選択`:'一致なし · 曲名を修正'}</option>{candidates.map(s=><option key={s.id} value={s.id}>{s.title} / {s.category??'区分未確認'}</option>)}</select></div>{line.songId&&master.charts.filter(c=>c.songId===line.songId).map(result)}</section>})}</div></>}
 <div className="modal-bottom"><span><b>{picks.length}</b> 譜面を選択中 <button onClick={()=>setSelected({})}>選択解除</button></span><div className="actions">{review&&<button onClick={()=>setReview(false)}>選択に戻る</button>}<button disabled={!picks.length||busy} className="primary" onClick={()=>{if(!review){validate();return}void onSave(picks.map(c=>makeEntry(c,songMap.get(c.songId)!,selected[c.id]))).then(ok=>{if(!ok)setError('登録に失敗しました。画面の保存エラーを確認してください。')})}}>{review?`${picks.length}譜面を登録`:'選択内容を確認 →'}</button></div></div>
 </Modal>
}
createRoot(document.getElementById('root')!).render(<App/>);
