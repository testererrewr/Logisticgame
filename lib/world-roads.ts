import {getMap,streetRoute,type RealMap,type LatLon} from './real-map';
export type RoadStop={city:string;node:number;via?:boolean;point?:LatLon};
let cachedKey='',cached:{path:LatLon[];length:number;segmentKm:number[];reversible:boolean}|null=null;
export function worldStreetRoute(stops:RoadStop[],closed=true){
 if(stops.length<2||stops.length>80)throw Error('Wähle 2–80 Linienpunkte.');
 const keys=[...new Set(stops.map(s=>s.city))];if(keys.length>8)throw Error('Eine Buslinie darf höchstens acht benachbarte Datengebiete nutzen.');
 const maps=keys.map(k=>{const m=getMap(k);if(!m)throw Error('Straßendaten fehlen noch.');return m;});
 const signature=JSON.stringify([stops,closed])+maps.map(m=>m.date).join();if(signature===cachedKey&&cached)return cached;
 if(maps.length===1){const result=streetRoute(maps[0],stops.map(s=>s.node),closed,stops.map(s=>!!s.via),stops.map(s=>s.point));cachedKey=signature;cached=result;return result;}
 const nodes:LatLon[]=[],index=new Map<string,number>(),lookup=new Map<string,number[]>(),roads:RealMap['roads']=[];
 for(const m of maps){const local=m.nodes.map(p=>{const k=p.map(v=>v.toFixed(7)).join(',');let n=index.get(k);if(n===undefined){n=nodes.length;index.set(k,n);nodes.push(p);}return n;});lookup.set(m.key,local);for(const r of m.roads)roads.push({...r,nodes:r.nodes.map(n=>local[n])});}
 const merged={...maps[0],nodes,roads};const result=streetRoute(merged,stops.map(s=>{const n=lookup.get(s.city)?.[s.node];if(n===undefined)throw Error('Ungültige Haltestelle.');return n;}),closed,stops.map(s=>!!s.via),stops.map(s=>s.point));cachedKey=signature;cached=result;return result;
}
