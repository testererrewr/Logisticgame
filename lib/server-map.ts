import {demandMap,simulationAreas} from './demand-map';
import {downloadOsm} from './osm-download';
import {tileCenter} from './geography';
import {env} from 'cloudflare:workers';
import {cityById,type WorldState} from './game';
import {areaOffset,getMap,registerMap,mapBounds,parseOSM,type RealMap} from './real-map';
import {osmGeometry} from './osm-source';
import berlinSnapshot from '../public/maps/berlin.json';
import berlinNorthSnapshot from '../public/maps/berlin-n.json';

async function pack(data:unknown){const bytes=new Uint8Array(await new Response(new Blob([JSON.stringify(data)]).stream().pipeThrough(new CompressionStream('gzip'))).arrayBuffer());let text='';for(let i=0;i<bytes.length;i+=32768)text+=String.fromCharCode(...bytes.subarray(i,i+32768));return 'gz:'+btoa(text);}
async function unpack(payload:string){if(!payload.startsWith('gz:'))return JSON.parse(payload);const bytes=Uint8Array.from(atob(payload.slice(3)),c=>c.charCodeAt(0));return JSON.parse(await new Response(new Blob([bytes]).stream().pipeThrough(new DecompressionStream('gzip'))).text());}
export async function loadMap(key:string):Promise<RealMap>{
 if(getMap(key)&&!getMap(key)!.demandOnly)return getMap(key)!;
 // Completed immutable maps are safe across requests. In-flight I/O is not:
 // Workers can cancel its owning request, leaving other requests waiting on
 // an abandoned promise. Each request must own its reads/decompression.
 return load(key);
}
async function load(key:string){
 const [base,area]=key.split('~'),global=tileCenter(key);
 if(!global&&(!Object.hasOwn(cityById,base)||(area&&!['n','s','e','w'].includes(area))||key.split('~').length>2))throw Error('Unbekanntes Kartengebiet.');
 const db=env.DB!,saved=await db.prepare('SELECT payload FROM map_snapshots WHERE id=?').bind(key).first<any>();
 if(saved){const data=await unpack(saved.payload);registerMap(data);return data;}
 if(key==='berlin'||key==='berlin~n'){
  const data=(key==='berlin'?berlinSnapshot:berlinNorthSnapshot) as RealMap;
  await db.prepare('INSERT OR IGNORE INTO map_snapshots(id,payload,created) VALUES(?,?,?)').bind(key,await pack(data),Date.now()).run();registerMap(data);return data;
 }
 const city=cityById[base],offset=areaOffset(key),lat=global?global[0]:city.lat+offset[0],lon=global?global[1]:city.lon+offset[1],b=mapBounds(lat,lon);
 const south=Math.max(-85.05112878,b.south),west=Math.max(-180,b.west),north=Math.min(85.05112878,b.south+80*b.dLat),east=Math.min(180,b.west+80*b.dLon);
 const bbox=[south,west,north,east].map(n=>n.toFixed(6)).join(',');
 const query=`[out:json][timeout:10];(way[highway~"^(motorway|trunk|primary|secondary|tertiary|unclassified|residential|living_street|service|motorway_link|trunk_link|primary_link|secondary_link|tertiary_link)$"](${bbox});way[building](${bbox});way[natural=water](${bbox});relation[natural=water](${bbox});way[waterway=riverbank](${bbox});node[shop](${bbox});node[amenity~"^(school|university|hospital|restaurant|cafe|cinema|theatre)$"](${bbox}););out geom;`;
 const partKey=(b:{south:number;west:number;north:number;east:number})=>'osm-part:'+ [b.south,b.west,b.north,b.east].map(n=>n.toFixed(6)).join(':');
 const raw=await downloadOsm({south,west,north,east},query,(env as any).OVERPASS_URL,fetch,{
  get:async b=>{const row=await db.prepare('SELECT payload FROM map_snapshots WHERE id=?').bind(partKey(b)).first<any>();return row?await unpack(row.payload):null;},
  put:async(b,raw)=>{const payload=await pack(raw);if(payload.length<=1800000)await db.prepare('INSERT OR IGNORE INTO map_snapshots(id,payload,created) VALUES(?,?,?)').bind(partKey(b),payload,Date.now()).run();}
 });
 const data=parseOSM(key,lat,lon,raw),text=await pack(data);
 if(text.length>1800000)throw Error('Dieses Kartengebiet überschreitet das Speicherlimit. Bitte ein kleineres Randgebiet wählen.');
 const inserted=await db.prepare('INSERT OR IGNORE INTO map_snapshots(id,payload,created) VALUES(?,?,?)').bind(key,text,Date.now()).run();if(inserted.meta.changes){registerMap(data);return data;}
 const canonical=await db.prepare('SELECT payload FROM map_snapshots WHERE id=?').bind(key).first<any>();
 const result=await unpack(canonical.payload);registerMap(result);return result;
}
async function loadDemandMap(key:string){
 if(getMap(key))return getMap(key)!;const db=env.DB!,cacheKey='demand-v1:'+key,cached=await db.prepare('SELECT payload FROM map_snapshots WHERE id=?').bind(cacheKey).first<any>();
 if(cached){const data=await unpack(cached.payload);if(!getMap(key))registerMap(data);return data;}
 const saved=await db.prepare('SELECT payload FROM map_snapshots WHERE id=?').bind(key).first<any>();const source=saved?await unpack(saved.payload):await loadMap(key),data=demandMap(source);
 await db.prepare('INSERT OR REPLACE INTO map_snapshots(id,payload,created) VALUES(?,?,?)').bind(cacheKey,await pack(data),Date.now()).run();if(!getMap(key)||getMap(key)!.demandOnly)registerMap(data);return data;
}
export async function hydrateMaps(state:WorldState,extra?:string){
 const full=new Set<string>();for(const c of state.companies)for(const l of c.lines)if(l.mode==='bus'&&(!l.stopIds||l.routingVersion!==2||!l.stopPoints)){for(const key of l.stopAreas||(l.city?[l.city]:[]))full.add(key);for(const p of l.routePoints||[])if(p.kind==='via')full.add(p.city);}if(extra)full.add(extra);
 for(const key of full)await loadMap(key);const missing=[...simulationAreas(state)].filter(key=>!getMap(key));for(let i=0;i<missing.length;i+=2)await Promise.all(missing.slice(i,i+2).map(key=>loadDemandMap(key)));
}
