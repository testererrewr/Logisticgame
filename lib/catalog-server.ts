import {sameOrigin} from './same-origin';
import {env} from 'cloudflare:workers';
import {vehicleModels,type CatalogSnapshot,type VehicleModel} from './vehicle-models';
import {mergeCatalog,CATALOG_BODY_BYTES,CATALOG_PAYLOAD_BYTES} from './catalog-schema.mjs';
const fail=(message:string,status:number):never=>{throw Object.assign(Error(message),{status});};
const sha=async(s:string)=>Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256',new TextEncoder().encode(s))),x=>x.toString(16).padStart(2,'0')).join('');
function same(a:string,b:string){let d=a.length^b.length;for(let i=0;i<a.length;i++)d|=a.charCodeAt(i)^(b.charCodeAt(i)||0);return d===0;}
export async function catalogHistory(revision=0):Promise<CatalogSnapshot[]>{const rows=await env.DB!.prepare('SELECT revision,created,payload FROM vehicle_catalogs WHERE revision>? ORDER BY revision').bind(revision).all<any>();return rows.results.map(r=>({revision:r.revision,created:r.created,models:JSON.parse(r.payload)}));}
export async function currentCatalog():Promise<CatalogSnapshot>{const r=await env.DB!.prepare('SELECT revision,created,payload FROM vehicle_catalogs ORDER BY revision DESC LIMIT 1').first<any>();return r?{revision:r.revision,created:r.created,models:JSON.parse(r.payload)}:{revision:0,created:0,models:vehicleModels};}
async function boundedText(req:Request){if(Number(req.headers.get('content-length')||0)>CATALOG_BODY_BYTES)fail('Katalog zu groß.',413);const reader=req.body?.getReader(),chunks:Uint8Array[]=[];let size=0;if(!reader)fail('JSON erwartet.',400);while(true){const {done,value}=await reader!.read();if(done)break;size+=value.byteLength;if(size>CATALOG_BODY_BYTES){await reader!.cancel();fail('Katalog zu groß.',413);}chunks.push(value);}const bytes=new Uint8Array(size);let offset=0;for(const chunk of chunks){bytes.set(chunk,offset);offset+=chunk.byteLength;}return new TextDecoder().decode(bytes);}
export async function internalCatalog(req:Request){
 // Drain bounded PUT bodies before responding, including rejected authentication.
 // This also keeps HTTP proxies from aborting an unread request stream.
 const text=req.method==='PUT'?await boundedText(req):'';
 if(!sameOrigin(req))fail('Ungültiger Ursprung.',403);
 if(!env.CATALOG_PUSH_HASH)fail('Katalog-Veröffentlichung ist nicht eingerichtet.',503);
 const token=req.headers.get('authorization')?.match(/^Bearer ([A-Za-z0-9_-]{40,200})$/)?.[1];if(!token||!same(await sha(token),env.CATALOG_PUSH_HASH!))fail('Backend-Schlüssel erforderlich.',403);
 if(req.method==='GET')return Response.json(await currentCatalog(),{headers:{'Cache-Control':'no-store'}});
 if(req.method!=='PUT')fail('GET oder PUT erwartet.',405);
 if(!req.headers.get('content-type')?.includes('application/json'))fail('JSON erwartet.',415);
 let body:any;try{body=JSON.parse(text);}catch{fail('Ungültiges JSON.',400);}
 if(!body||typeof body!=='object'||!Number.isSafeInteger(body.baseRevision)||body.baseRevision<0)fail('baseRevision erforderlich.',400);
 const previous=await currentCatalog();if(previous.revision!==body.baseRevision)fail('Der Serverkatalog hat sich geändert. Änderungen erneut prüfen und veröffentlichen.',409);
 const models=mergeCatalog(previous.models,body.models) as VehicleModel[],payload=JSON.stringify(models);if(new TextEncoder().encode(payload).byteLength>CATALOG_PAYLOAD_BYTES)fail('Katalogdaten überschreiten 1,8 MB. Beschreibungen kürzen oder archivierte Modelle reduzieren.',413);const digest=await sha(payload),existing=await sha(JSON.stringify(previous.models));
 if(previous.revision>0&&existing===digest)return Response.json({ok:true,unchanged:true,revision:previous.revision,count:models.length});
 const revision=previous.revision+1,created=Date.now();let result;try{result=await env.DB!.prepare('INSERT INTO vehicle_catalogs(revision,created,payload,digest) SELECT ?,?,?,? WHERE COALESCE((SELECT MAX(revision) FROM vehicle_catalogs),0)=?').bind(revision,created,payload,digest,previous.revision).run();}catch{fail('Gleichzeitige Katalogänderung. Erneut laden.',409);}if(!result!.meta.changes)fail('Gleichzeitige Katalogänderung. Erneut laden.',409);
 return Response.json({ok:true,revision,created,count:models.length,available:models.filter(m=>m.available).length});
}
