import {osmGeometry} from './osm-source';
export type OsmBox={south:number;west:number;north:number;east:number};
const headers={'User-Agent':'Weltverbund/1.0 (+https://play.crackgaming.org)','Accept':'application/json'};
const cooldown=new Map<string,number>();
export async function downloadOsm(box:OsmBox,query:string,custom?:string,fetcher:typeof fetch=fetch,partCache?:{get:(b:OsmBox)=>Promise<any|null>;put:(b:OsmBox,raw:any)=>Promise<void>}){
 const failures:string[]=[],deadline=Date.now()+45000;const objects=new Map<string,any>();let running=0;const waiting:(()=>void)[]=[];
 async function acquire(){if(running<2){running++;return;}await new Promise<void>(resolve=>waiting.push(resolve));}
 function release(){const next=waiting.shift();if(next)next();else running--;}
 async function request(url:string,ms:number){
  await acquire();try{
  const remaining=deadline-Date.now();if(remaining<=0)throw Error('Zeitlimit beim Laden der Teilgebiete');
  const r=await fetcher(url,{headers,signal:AbortSignal.timeout(Math.min(ms,remaining))});
  if(!r.ok)throw Object.assign(Error('HTTP '+r.status),{status:r.status});
  const raw:any=await r.json();if(raw.remark||!Array.isArray(raw.elements))throw Error('Unvollständige Antwort');return raw;
  }finally{release();}
 }
 async function overpass(endpoint:string){
  if((cooldown.get(endpoint)||0)>Date.now())return null;
  try{return await request(endpoint+'?data='+encodeURIComponent(query),12000);}catch(e:any){cooldown.set(endpoint,Date.now()+30000);failures.push(new URL(endpoint).hostname+': '+e.message);return null;}
 }

 const url=(b:OsmBox)=>'https://api.openstreetmap.org/api/0.6/map.json?bbox='+[b.west,b.south,b.east,b.north].map(n=>n.toFixed(6)).join(',');
 const attempts=[overpass(custom||'https://overpass-api.de/api/interpreter').then(v=>{if(!v)throw Error('Overpass unavailable');return v;}),(async()=>{await new Promise(resolve=>setTimeout(resolve,500));try{return osmGeometry(await request(url(box),18000));}catch(e:any){failures.push('OSM map: '+e.message);if(e.status===400){await split(box,1);return {elements:[...objects.values()]};}throw e;}})()];try{return await Promise.any(attempts);}catch{}
 const secondary=await overpass('https://maps.mail.ru/osm/tools/overpass/api/interpreter');if(secondary)return secondary;
 function merge(raw:any){for(const e of raw.elements)objects.set(e.type+':'+e.id,{type:e.type,id:e.id,tags:e.tags,nodes:e.nodes,geometry:e.geometry,members:e.members,lat:e.lat,lon:e.lon});}
 async function piece(b:OsmBox,depth:number):Promise<void>{
  const saved=await partCache?.get(b);if(saved){merge(saved);return;}
  try{const raw=osmGeometry(await request(url(b),18000));await partCache?.put(b,raw);merge(raw);return;}catch(e:any){if(e.status!==400||depth>=3)throw e;}
  await split(b,depth+1);
 }
 async function split(b:OsmBox,depth:number){const y=(b.south+b.north)/2,x=(b.west+b.east)/2;const parts=[{south:b.south,west:b.west,north:y,east:x},{south:b.south,west:x,north:y,east:b.east},{south:y,west:b.west,north:b.north,east:x},{south:y,west:x,north:b.north,east:b.east}];for(let i=0;i<parts.length;i+=2){const results=await Promise.allSettled(parts.slice(i,i+2).map(part=>piece(part,depth)));const failed=results.find(r=>r.status==='rejected');if(failed?.status==='rejected')throw failed.reason;}}
 try{
  await split(box,1);
  return {elements:[...objects.values()]};
 }catch(e:any){failures.push('OSM Teilgebiet: '+e.message);}
 console.warn('Map sources unavailable',failures.join(' · '));
 throw Object.assign(Error('Kartendaten sind gerade nicht verfügbar. Der Abruf wird automatisch wiederholt; deine Planung bleibt erhalten.'),{status:503,retryAfter:4});
}
