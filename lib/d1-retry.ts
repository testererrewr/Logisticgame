import {env} from 'cloudflare:workers';
const TRANSIENT=/internal error|SQLITE_BUSY|database is locked|Network connection lost|storage caused object to be reset/i;
const sleep=(ms:number)=>new Promise(r=>setTimeout(r,ms));
let installed=false;
async function retry<T>(fn:()=>Promise<T>):Promise<T>{for(let i=0;;i++){try{return await fn();}catch(e:any){if(i>=4||!TRANSIENT.test(String(e?.message||e)))throw e;await sleep(120*(i+1)*(i+1)+Math.random()*80);}}}

export function installD1Retry(){if(installed)return;const db:any=(env as any)?.DB;if(!db)return;installed=true;
 try{const proto=Object.getPrototypeOf(db.prepare('SELECT 1'));for(const m of ['all','first','run','raw']){const orig=proto[m];if(typeof orig!=='function'||orig.__retry)continue;const wrapped=function(this:any,...a:any[]){return retry(()=>orig.apply(this,a));};(wrapped as any).__retry=true;proto[m]=wrapped;}
  const batch=db.batch?.bind(db);if(batch)db.batch=(list:any[])=>retry(()=>batch(list));}catch{}}
export const extractImportActive=async()=>{try{const r=await (env as any).DB.prepare("SELECT updated FROM logistics_runtime WHERE id='osm-extract-active'").first();return !!r&&Date.now()-Number(r.updated)<20*60000;}catch{return false;}};
