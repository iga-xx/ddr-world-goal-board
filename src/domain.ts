export const categories = ['CLASSIC', 'WHITE', 'GOLD'] as const;
export type Category = typeof categories[number];
export type Target = 'FL9' | 'FLEX';
export type Current = 'NONE' | Target;
export const difficulties = ['DIFFICULT', 'EXPERT', 'CHALLENGE'] as const;
export const labels = { DIFFICULT: '踊', EXPERT: '激', CHALLENGE: '鬼' };
export interface Song { id: string; title: string; artist?: string; displayTitle?: string; category: Category | null; jacket: string; source: string; retrievedAt: string; categorySource: string | null }
export interface Chart { id: string; songId: string; style: 'SP'; difficulty: typeof difficulties[number]; level: number; skills: Record<Target, number | null>; skillSource?: string }
export interface Master { schemaVersion: 1; retrievedAt: string; sources: string[]; songs: Song[]; charts: Chart[] }
export interface Snapshot { song: Song; chart: Chart }
export interface Entry { chartId: string; target: Target; current: Current; createdAt: string; updatedAt: string; snapshot: Snapshot }
export interface Row { entry: Entry; song: Song; chart: Chart; orphan: boolean }
export const achieved = (target: Target, current: Current) => current === 'FLEX' || target === 'FL9' && current === 'FL9';
export const normalize = (s: string) => s.normalize('NFKC').toLocaleLowerCase('ja').replace(/\s+/g, ' ').trim();
export function rows(entries: Entry[], master: Master): Row[] {
  const songs = new Map(master.songs.map(s => [s.id, s]));
  const charts = new Map(master.charts.map(c => [c.id, c]));
  return entries.map(entry => {
    const chart = charts.get(entry.chartId), song = chart && songs.get(chart.songId);
    // A missing category in an updated master must not silently displace a saved row.
    const orphan = !chart || !song || !song.category || song.category !== entry.snapshot.song.category;
    return { entry, chart: chart ?? entry.snapshot.chart, song: orphan ? entry.snapshot.song : song!, orphan };
  });
}
export function sortRows(list: Row[]) {
  return [...list].sort((a,b) => (b.chart.skills[b.entry.target] ?? -1) - (a.chart.skills[a.entry.target] ?? -1) || a.song.title.localeCompare(b.song.title, 'ja') || difficulties.indexOf(a.chart.difficulty) - difficulties.indexOf(b.chart.difficulty) || a.chart.id.localeCompare(b.chart.id));
}
export function summarize(list: Row[]) {
  return {count:list.length,done:list.filter(r => achieved(r.entry.target,r.entry.current)).length,total:list.reduce((s,r)=>s+(r.chart.skills[r.entry.target] ?? 0),0),unknown:list.filter(r=>r.chart.skills[r.entry.target] === null).length};
}
export function assertCapacity(entries: Entry[], master: Master) {
  if (new Set(entries.map(e=>e.chartId)).size !== entries.length) throw Error('同じ譜面が重複しています。');
  const resolved = rows(entries,master);
  for (const category of categories) if (resolved.filter(r=>r.song.category === category).length > 30) throw Error(`${category}は30譜面までです。`);
  if (resolved.some(r=>!r.song.category) || entries.length>90) throw Error('区分未確認の譜面、または90件を超えるデータです。');
}
const object = (v: unknown): v is Record<string,any> => !!v && typeof v === 'object' && !Array.isArray(v);
const str = (v: unknown): v is string => typeof v === 'string' && v.length > 0 && v.length <= 2000;
const date = (v: unknown) => str(v) && !Number.isNaN(Date.parse(v));
export function validateSnapshot(v: unknown): v is Snapshot {
  if (!object(v) || !object(v.song) || !object(v.chart)) return false;
  const s=v.song,c=v.chart;
  if (['artist','displayTitle'].some(k=>s[k]!==undefined&&(typeof s[k]!=='string'||s[k].length>2000))) return false;
  return str(s.id) && str(s.title) && categories.includes(s.category) && str(s.source) && date(s.retrievedAt) && (s.categorySource === null || str(s.categorySource)) && typeof s.jacket === 'string' && /^\/jackets\/[a-zA-Z0-9_.-]+$/.test(s.jacket) && str(c.id) && c.songId === s.id && c.style==='SP' && difficulties.includes(c.difficulty) && Number.isInteger(c.level) && c.level>=1 && c.level<=19 && object(c.skills) && ['FL9','FLEX'].every(k=>c.skills[k]===null || Number.isSafeInteger(c.skills[k]) && c.skills[k]>0 && c.skills[k]<=10000) && (c.skills.FL9===null || c.skills.FLEX===null || c.skills.FLEX>=c.skills.FL9);
}
export function parseBackup(value: unknown, master: Master): Entry[] {
  if (!object(value) || value.schemaVersion !== 1 || value.application !== 'ddr-world-goal-board' || !Array.isArray(value.entries) || value.entries.length>90) throw Error('対応していないバックアップ形式です。');
  for (const e of value.entries) if (!object(e) || !str(e.chartId) || !['FL9','FLEX'].includes(e.target) || !['NONE','FL9','FLEX'].includes(e.current) || !date(e.createdAt) || !date(e.updatedAt) || !validateSnapshot(e.snapshot) || e.chartId !== e.snapshot.chart.id) throw Error('バックアップの登録データが不正です。');
  const entries = value.entries as Entry[];
  // Validate snapshots too, even if the current master maps entries differently.
  for (const category of categories) if (entries.filter(e=>e.snapshot.song.category===category).length>30) throw Error(`${category}が30件を超えています。`);
  assertCapacity(entries, master);
  return structuredClone(entries);
}
export function backup(entries: Entry[]) { return { application:'ddr-world-goal-board',schemaVersion:1,exportedAt:new Date().toISOString(),entries }; }
export function makeEntry(chart: Chart, song: Song, target: Target): Entry {
  if (!song.category) throw Error('区分が未確認の曲は登録できません。');
  const now = new Date().toISOString();
  return {chartId:chart.id,target,current:'NONE',createdAt:now,updatedAt:now,snapshot:structuredClone({chart,song})};
}
