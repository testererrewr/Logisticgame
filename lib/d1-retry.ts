import {env} from 'cloudflare:workers';
const TRANSIENT=/internal error|SQLITE_BUSY|database is locked|Network connection lost|storage caused object to be reset/i;
const sleep=(ms:number)=>new Promise(r=>setTimeout(r,ms));
let installed=false;
const stats={retries:0,failed:0,last:'',since:Date.now()};export const d1RetryStats=()=>({...stats});
function report(){if(Date.now()-stats.since<300000)return;if(!stats.failed&&stats.retries<60){stats.retries=0;stats.since=Date.now();return;}const msg=`D1: ${stats.retries} Wiederholungen, ${stats.failed} endgültig fehlgeschlagen in ${Math.round((Date.now()-stats.since)/60000)} Min. Letzter Fehler: ${stats.last}`;stats.retries=0;stats.failed=0;stats.since=Date.now();import('./logistics/error-log').then(m=>m.logError('db:retry',new Error(msg),{},'warn')).catch(()=>{});}
async function retry<T>(fn:()=>Promise<T>):Promise<T>{for(let i=0;;i++){try{return await fn();}catch(e:any){const m=String(e?.message||e);if(i>=4||!TRANSIENT.test(m)){if(TRANSIENT.test(m)){stats.failed++;stats.last=m.slice(0,160);report();}throw e;}stats.retries++;stats.last=m.slice(0,160);if(i===0)report();await sleep(120*(i+1)*(i+1)+Math.random()*80);}}}

export function installD1Retry(){if(installed)return;const db:any=(env as any)?.DB;if(!db)return;installed=true;
 try{const proto=Object.getPrototypeOf(db.prepare('SELECT 1'));for(const m of ['all','first','run','raw']){const orig=proto[m];if(typeof orig!=='function'||orig.__retry)continue;const wrapped=function(this:any,...a:any[]){return retry(()=>orig.apply(this,a));};(wrapped as any).__retry=true;proto[m]=wrapped;}
  const batch=db.batch?.bind(db);if(batch)db.batch=(list:any[])=>retry(()=>batch(list));}catch{}}
export const extractImportActive=async()=>{try{const r=await (env as any).DB.prepare("SELECT updated FROM logistics_runtime WHERE id='osm-extract-active'").first();return !!r&&Date.now()-Number(r.updated)<20*60000;}catch{return false;}};
