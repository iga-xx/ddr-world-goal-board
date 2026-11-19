import type { Entry } from './domain';
let dbPromise: Promise<IDBDatabase> | undefined;
function database() {
  return dbPromise ??= new Promise((resolve,reject)=>{
    const request=indexedDB.open('ddr-world-goal-board',1);
    request.onupgradeneeded=()=>request.result.createObjectStore('board');
    request.onsuccess=()=>resolve(request.result);
    request.onerror=()=>reject(request.error);
    request.onblocked=()=>reject(Error('別のタブを閉じて再度開いてください。'));
  });
}
export async function readEntries(): Promise<unknown> {
  const db=await database();
  return new Promise((resolve,reject)=>{const r=db.transaction('board').objectStore('board').get('entries');r.onsuccess=()=>resolve(r.result);r.onerror=()=>reject(r.error);});
}
export async function writeEntries(entries: Entry[]) {
  const db=await database();
  return new Promise<void>((resolve,reject)=>{const tx=db.transaction('board','readwrite');tx.objectStore('board').put(entries,'entries');tx.oncomplete=()=>resolve();tx.onerror=()=>reject(tx.error);tx.onabort=()=>reject(tx.error ?? Error('保存が中断されました。'));});
}
