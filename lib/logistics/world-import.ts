import {prepareImportRuntime} from './import-runtime';
import {env,waitUntil} from 'cloudflare:workers';
import {fetchPartnerTile} from './partner-tiles';
import {savePartners} from './partner-registry';
import {WORLD_ROOTS,worldRoot,newWorldImport,prepareWorldCell,finishWorldCell,type WorldImportProgress} from './world-import-plan';
const KEY='world-import-v10',LOCK='world-import-lock-v10';
export async function readWorldImport():Promise<WorldImportProgress>{await prepareImportRuntime();const row=await env.DB!.prepare('SELECT payload FROM logistics_runtime WHERE id=?').bind(KEY).first<{payload:string}>();return row?{...newWorldImport(),...JSON.parse(row.payload)}:newWorldImport();}
async function save(p:WorldImportProgress){await env.DB!.prepare('INSERT INTO logistics_runtime(id,updated,payload) VALUES(?,?,?) ON CONFLICT(id) DO UPDATE SET updated=excluded.updated,payload=excluded.payload').bind(KEY,Date.now(),JSON.stringify(p)).run();}
export async function retryWorldImport(){const p=await readWorldImport();p.nextTry=0;p.attempt=0;for(const c of p.pending){c.nextTry=0;c.attempt=0;}p.lastError=undefined;await save(p);return worldImportStatus(p);}
export async function setWorldImportEnabled(enabled:boolean){const p=await readWorldImport();p.enabled=enabled;await save(p);return worldImportStatus(p);}
export function worldImportStatus(p:WorldImportProgress){return {enabled:p.enabled,completedRoots:p.completedRoots,totalRoots:WORLD_ROOTS,completedCells:p.completedCells,savedObjects:p.savedObjects,pendingCells:p.pending.length,currentCell:p.pending[0]||null,currentRoot:p.pending[0]?.id.split('.')[0]||(p.cursor?worldRoot(p.cursor-1).id:null),attempt:p.attempt,complete:p.completedRoots>=WORLD_ROOTS,nextTry:p.nextTry,lastError:p.lastError,updated:p.updated};}
const ROUNDS=Math.max(1,Math.min(20,Number(process.env.LOGISTIK_WORLD_IMPORT_ROUNDS||3)||3)),OVERPASS_TIMEOUT=Math.max(7,Math.min(180,Number(process.env.LOGISTIK_WORLD_IMPORT_TIMEOUT||25)||25));
/** Several polite rounds (max. 2 parallel requests each) per trigger, so the
 * import advances steadily from the per-minute server timer without an open page. */
export async function drainWorldImport(){const started=Date.now(),lease=started+ROUNDS*(OVERPASS_TIMEOUT+10)*1000+30000;const lock=await env.DB!.prepare('INSERT INTO limits(id,hits,expires) VALUES(?,1,?) ON CONFLICT(id) DO UPDATE SET expires=excluded.expires WHERE limits.expires<? RETURNING id').bind(LOCK,lease,started).first();if(!lock)return;
 try{for(let round=0;round<ROUNDS&&Date.now()-started<90000;round++){if(round)await new Promise(resolve=>setTimeout(resolve,1500));const now=Date.now();const p=await readWorldImport();if(!p.enabled||round===0&&p.nextTry>now||p.completedRoots>=WORLD_ROOTS)return;const cell=prepareWorldCell(p,now);if(!cell)return;p.nextTry=now+30000;await save(p);
  const cells=[cell];const second=p.pending.find(c=>c.id!==cell.id&&(c.nextTry||0)<=now);if(second)cells.push(second);
  const results=await Promise.allSettled(cells.map(c=>fetchPartnerTile(c,{attempt:c.attempt||0,allowMapFallback:c.depth>=6,timeoutSeconds:OVERPASS_TIMEOUT,splitOnOverload:c.depth<3,overpassUrl:process.env.LOGISTIK_PARTNER_SOURCE_URL,mapUrl:process.env.LOGISTIK_OSM_MAP_URL})));
  for(let i=0;i<cells.length;i++){const c=cells[i],at=p.pending.findIndex(x=>x.id===c.id);if(at<0)continue;p.pending.unshift(...p.pending.splice(at,1));const r=results[i];try{if(r.status==='rejected')throw r.reason;const result=r.value;if(result.sites.length)await savePartners(result.sites);finishWorldCell(p,result.complete,result.sites.length,!!result.defer);if(!result.complete&&result.defer)p.lastError=result.source;if(result.complete&&!p.pending.some(x=>x.id.split('.')[0]===c.id.split('.')[0])){const index=Number(c.id.split(':')[1].split('.')[0]),root=worldRoot(index);await env.DB!.prepare('INSERT OR REPLACE INTO logistics_loaded_areas(id,loaded,source,count) SELECT ?,?,?,count(*) FROM logistics_partner_registry WHERE lat>=? AND lat<? AND lon>=? AND lon<?').bind(root.id,Date.now(),'OSM Weltimport · vollständiges 1°-Gebiet',root.south,root.north,root.west,root.east).run();}}catch(e:any){finishWorldCell(p,false,0,true);p.lastError=String(e.message||'Importfehler').slice(0,200);}}
  p.enabled=(await readWorldImport()).enabled;await save(p);}
 }finally{await env.DB!.prepare('DELETE FROM limits WHERE id=? AND expires=?').bind(LOCK,lease).run();}
}
export function continueWorldImport(){waitUntil(drainWorldImport().catch(()=>{}));}
