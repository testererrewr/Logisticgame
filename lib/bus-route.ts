import {sharedCompany,companyWorld} from './infrastructure-context';
import type {BusStop,Company} from './game';
import {getMap,pointCell,nearestRoadSnap,type LatLon} from './real-map';
import {worldStreetRoute,type RoadStop} from './world-roads';
export type RouteMode='outbound'|'shuttle'|'loop';
export type RoutePoint={kind:'stop';stopId:string}|{kind:'via';id:string;city:string;node:number;point:LatLon};
export function routeStopIds(points:RoutePoint[]){return points.flatMap(p=>p.kind==='stop'?[p.stopId]:[]);}
export function busRoute(c:Company,input:any,mode:RouteMode='shuttle'){
 if(!['outbound','shuttle','loop'].includes(mode))throw Error('Ungültige Linienführung.');
 if(!Array.isArray(input)||input.length<2||input.length>512||input[0]?.kind!=='stop'||(input.at(-1)?.kind!=='stop'&&mode!=='loop'))throw Error('Beginne und beende die Linie mit einer Haltestelle. Dazwischen sind Wegpunkte möglich.');
 c=sharedCompany(c);
 const points:RoutePoint[]=[],stops:BusStop[]=[],nodes:RoadStop[]=[];
 for(const p of input){if(p?.kind==='stop'){const s=c.stops?.find(s=>s.id===p.stopId);if(!s)throw Error('Nur eigene gebaute Haltestellen sind erlaubt.');stops.push(s);nodes.push({city:s.city,node:s.node,point:s.point});points.push({kind:'stop',stopId:s.id});}
  else if(p?.kind==='via'){const m=getMap(p.city);if(!m||!Number.isInteger(p.node)||!m.nodes[p.node]||pointCell(m,m.nodes[p.node])<0)throw Error('Wegpunkte brauchen geladene echte Straßenpositionen.');if(typeof p.id!=='string'||p.id.length>512)throw Error('Ungültiger Wegpunkt.');const snap=Array.isArray(p.point)&&p.point.length===2&&p.point.every(Number.isFinite)?nearestRoadSnap(m,[p.point[0],p.point[1]],.5):null,point=snap&&snap.node===p.node?snap.point:[...m.nodes[p.node]] as LatLon;nodes.push({city:m.key,node:p.node,point,via:true});points.push({kind:'via',id:p.id,city:m.key,node:p.node,point});}
  else throw Error('Ungültiger Linienpunkt.');
 }
 if(stops.length<2||stops.length>256||stops.some((s,i)=>i>0&&s.id===stops[i-1].id))throw Error('Wähle 2–256 Halte; aufeinanderfolgende Halte müssen verschieden sein.');
 if(points.filter(p=>p.kind==='via').length>256)throw Error('Maximal 256 Wegpunkte.');
 // Reuse the exact street geometry in reverse wherever every edge permits it.
 // A one-way street needs a legal return through the reversed stops/waypoints.
 const forward=worldStreetRoute(nodes,mode==='loop');let back:Pick<typeof forward,'path'|'length'|'segmentKm'>|undefined=undefined;
 if(mode==='shuttle'){try{back=forward.reversible?{path:[...forward.path].reverse(),length:forward.length,segmentKm:[...forward.segmentKm].reverse()}:worldStreetRoute([...nodes].reverse(),false);}catch{throw Error('Keine befahrbare Rückfahrt gefunden. Prüfe Einbahnstraßen und Wegpunkte für die umgekehrte Haltestellenfolge.');}}
 function aggregate(items:RoutePoint[],legs:number[],loop:boolean){const result:number[]=[];let total=0;for(let i=0;i<legs.length;i++){total+=legs[i];if(items[(i+1)%items.length].kind==='stop'){result.push(total);total=0;}}return result;}
 return {points,stops,path:forward.path,length:forward.length,segmentKm:aggregate(points,forward.segmentKm,mode==='loop'),returnPath:back?.path,returnSegmentKm:back?aggregate([...points].reverse(),back.segmentKm,false):undefined,returnLength:back?.length||0};
}
