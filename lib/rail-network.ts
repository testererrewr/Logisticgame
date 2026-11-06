import {sharedCompany} from './infrastructure-context';
import {trackSpec} from './track-types';
import type {Company,Facility,Line} from './game';
import type {LatLon} from './real-map';
import {sphericalDistance} from './geography';

export const STATION_SNAP=75,TRACK_SNAP=12;
const wrap=(n:number)=>((n+180)%360+360)%360-180;
const valid=(p:any):p is LatLon=>Array.isArray(p)&&p.length===2&&p.every(Number.isFinite)&&Math.abs(p[0])<=85.05112878&&Math.abs(p[1])<=180;
const key=(p:LatLon)=>p.map(n=>n.toFixed(7)).join(':');
export function railSitePoints(f:Facility){return (f.footprint.length?f.footprint:[f.cell]).map(id=>[f.point[0]+(Math.floor(id/80)-Math.floor(f.cell/80))*50/111320,f.point[1]+(id%80-f.cell%80)*50/(111320*Math.cos(f.point[0]*Math.PI/180))] as LatLon);}
const sites=(c:Company)=>(c.facilities||[]).filter(f=>f.type==='station'||f.type==='traindepot');
function xy(p:LatLon,o:LatLon):LatLon{return [wrap(p[1]-o[1])*111320*Math.cos(o[0]*Math.PI/180),(p[0]-o[0])*111320];}
function ll(p:LatLon,o:LatLon):LatLon{return [o[0]+p[1]/111320,wrap(o[1]+p[0]/(111320*Math.cos(o[0]*Math.PI/180)))];}
function project(p:LatLon,a:LatLon,b:LatLon){const q=xy(p,a),v=xy(b,a),len=v[0]**2+v[1]**2,t=len?Math.max(0,Math.min(1,(q[0]*v[0]+q[1]*v[1])/len)):0;const point=ll([v[0]*t,v[1]*t],a);return {point,t,d:sphericalDistance(p,point)};}
export function snapRailPoint(c:Company,p:LatLon):LatLon{
 let nearest:LatLon|null=null,best=STATION_SNAP;
 for(const f of sites(c)){for(const q of railSitePoints(f).filter((_,i,a)=>i===0||i===a.length-1)){const d=sphericalDistance(q,p);if(d<=best){best=d;nearest=q;}}}
 if(nearest)return [...nearest];
 best=TRACK_SNAP;
 for(const t of c.tracks||[])for(let i=1;i<t.points.length;i++){const q=project(p,t.points[i-1],t.points[i]);if(q.d<=best){best=q.d;nearest=q.point;}}
 return nearest?[...nearest]:[...p];
}
export function trackPoints(c:Company,input:any):LatLon[]{
 if(!Array.isArray(input)||input.length<2||input.length>50||!input.every(valid))throw Error('Wähle 2–50 gültige Gleispunkte auf der Karte.');
 const points=input.map(p=>snapRailPoint(c,p)).filter((p,i,a)=>!i||sphericalDistance(p,a[i-1])>.1);
 if(points.length<2)throw Error('Die Gleispunkte sind zu dicht beieinander.');
 return points;
}
type Segment={track:import('./game').Track;a:LatLon;b:LatLon;cuts:{t:number;p:LatLon}[]};
type RailEdge={distance:number;track?:import('./game').Track};
export type RailSection={track:import('./game').Track;points:LatLon[];length:number;maintenance:number};
type RailGraph={sections:RailSection[];nodes:LatLon[];adj:Map<number,RailEdge>[];facilities:Map<string,number>;junctions:LatLon[]};
const cache=new Map<string,RailGraph>();
export function railGraph(c:Company):RailGraph{
 c=sharedCompany(c);const signature=JSON.stringify([(c.tracks||[]).map(t=>[t.id,t.points,t.kind,t.electrified,t.owner,t.dailyMaintenance]),sites(c).map(f=>[f.id,f.point,f.footprint])]);
 const cached=cache.get(signature);if(cached)return cached;
 const segments:Segment[]=[];
 for(const track of c.tracks||[])for(let i=1;i<track.points.length;i++){const a=track.points[i-1],b=track.points[i];if(valid(a)&&valid(b)&&sphericalDistance(a,b)>.1)segments.push({track,a,b,cuts:[{t:0,p:a},{t:1,p:b}]});}
 const add=(s:Segment,t:number,p:LatLon)=>s.cuts.push({t,p});
 const cross=(a:LatLon,b:LatLon)=>a[0]*b[1]-a[1]*b[0];
 // Split both tracks at crossings, T-junctions, and collinear overlap endpoints.
 // Shared physical vertices, rather than track record IDs, define connectivity.
 for(let i=0;i<segments.length;i++)for(let j=i+1;j<segments.length;j++){
  const a=segments[i],b=segments[j],v=xy(a.b,a.a),q=xy(b.a,a.a),r=xy(b.b,a.a),w:LatLon=[r[0]-q[0],r[1]-q[1]],den=cross(v,w);
  if(Math.abs(den)>.00001){const t=cross(q,w)/den,u=cross(q,v)/den;if(t>=0&&t<=1&&u>=0&&u<=1){const p=ll([t*v[0],t*v[1]],a.a);add(a,t,p);add(b,u,p);}}
  for(const p of [a.a,a.b]){const hit=project(p,b.a,b.b);if(hit.d<.2){add(a,project(p,a.a,a.b).t,p);add(b,hit.t,p);}}
  for(const p of [b.a,b.b]){const hit=project(p,a.a,a.b);if(hit.d<.2){add(a,hit.t,p);add(b,project(p,b.a,b.b).t,p);}}
 }
 const attachments:{f:Facility;s:Segment;t:number;p:LatLon}[]=[];
 for(const f of sites(c))for(const segment of segments){let best:{t:number;point:LatLon;d:number}|undefined;for(const point of railSitePoints(f)){const q=project(point,segment.a,segment.b);if(!best||q.d<best.d)best=q;}if(best&&best.d<=(f.id.startsWith('via:')?.3:STATION_SNAP)){add(segment,best.t,best.point);attachments.push({f,s:segment,t:best.t,p:best.point});}}
 const nodes:LatLon[]=[],adj:Map<number,RailEdge>[]=[],index=new Map<string,number>(),facilities=new Map<string,number>();
 function node(p:LatLon){const k=key(p);let n=index.get(k);if(n===undefined){n=nodes.length;nodes.push(p);adj.push(new Map());index.set(k,n);}return n;}
 function edge(a:number,b:number,track?:import('./game').Track){if(a===b)return;const d=sphericalDistance(nodes[a],nodes[b]);if(d<=(adj[a].get(b)?.distance??Infinity)){adj[a].set(b,{distance:d,track});adj[b].set(a,{distance:d,track});}}
 for(const s of segments){s.cuts.sort((a,b)=>a.t-b.t);for(let i=1;i<s.cuts.length;i++)edge(node(s.cuts[i-1].p),node(s.cuts[i].p),s.track);}
 for(const {f,p} of attachments){const n=node(f.point);facilities.set(f.id,n);edge(n,node(p));}
 const junctions=nodes.filter((_,i)=>[...adj[i].values()].filter(e=>e.track).length>=3),junctionKeys=new Set(junctions.map(key)),sections:RailSection[]=[];
 for(const track of c.tracks||[]){const points:LatLon[]=[];for(const seg of segments.filter(s=>s.track.id===track.id))for(const cut of seg.cuts.sort((a,b)=>a.t-b.t)){if(!points.length||key(points.at(-1)!)!==key(cut.p))points.push(cut.p);}const parts:LatLon[][]=[];let part:LatLon[]=[];for(const p of points){part.push(p);if(part.length>1&&junctionKeys.has(key(p))){parts.push(part);part=[p];}}if(part.length>1)parts.push(part);const lengths=parts.map(p=>p.slice(1).reduce((n,q,i)=>n+sphericalDistance(p[i],q)/1000,0)),total=lengths.reduce((a,b)=>a+b,0);let remaining=track.dailyMaintenance??track.length*trackSpec(track).maintenance;for(let i=0;i<parts.length;i++){const maintenance=i===parts.length-1?remaining:(track.dailyMaintenance??track.length*trackSpec(track).maintenance)*lengths[i]/total;remaining-=maintenance;sections.push({track,points:parts[i],length:lengths[i],maintenance});}}
 const graph={nodes,adj,facilities,junctions,sections};
 cache.set(signature,graph);if(cache.size>8)cache.delete(cache.keys().next().value!);return graph;
}
export function railEndpoints(c:Company,l:Partial<Line>){const track=c.tracks?.find(t=>t.id===l.track);return [l.facilityIds?.[0]||l.fromFacility||track?.from,l.facilityIds?.at(-1)||l.toFacility||track?.to] as const;}
export function railRoute(c:Company,from?:string,to?:string,via:LatLon[]=[],electricOnly=false){
 if(!from||!to||from===to)return null;const g=railGraph(c),start=g.facilities.get(from),end=g.facilities.get(to);if(start===undefined||end===undefined)return null;
 const waypoints:number[]=[];for(const point of via){let best=-1,distance=30;for(let i=0;i<g.nodes.length;i++){const d=sphericalDistance(point,g.nodes[i]);if(d<distance){best=i;distance=d;}}if(best<0)return null;waypoints.push(best);}
 const routeIds:number[]=[];for(const [part,finish]of [...waypoints,end].entries()){const origin=part?waypoints[part-1]:start,d=new Map<number,number>([[origin,0]]),prev=new Map<number,number>(),open=new Set([origin]);
 while(open.size){let n=-1,best=Infinity;for(const at of open){const value=d.get(at)!;if(value<best){best=value;n=at;}}open.delete(n);if(n===finish)break;for(const [next,edge]of g.adj[n]){if(electricOnly&&edge.track&&!trackSpec(edge.track).electric)continue;const value=best+edge.distance;if(value<(d.get(next)??Infinity)){d.set(next,value);prev.set(next,n);open.add(next);}}}
 if(!d.has(finish))return null;const ids=[finish];while(ids.at(-1)!==origin)ids.push(prev.get(ids.at(-1)!)!);routeIds.push(...ids.reverse().slice(part?1:0));}
 const tracks=new Map<string,{id:string;owner?:string;km:number;kind?:string;electrified:boolean}>();let length=0,speed=320,electrified=true;
 for(let i=1;i<routeIds.length;i++){const e=g.adj[routeIds[i-1]].get(routeIds[i])!;length+=e.distance;if(e.track){const t=e.track,spec=trackSpec(t),old=tracks.get(t.id);speed=Math.min(speed,spec.speed);electrified&&=spec.electric;tracks.set(t.id,{id:t.id,owner:t.owner,km:(old?.km||0)+e.distance/1000,kind:spec.kind,electrified:spec.electric});}}
 return {path:routeIds.map(id=>g.nodes[id]),length:length/1000,speed,electrified,tracks:[...tracks.values()]};
}

export function railDepot(c:Company,l:Partial<Line>){const [from,to]=railEndpoints(c,l),ids=l.facilityIds||[from,to];if(ids.slice(1).some((id,i)=>!railRoute(c,ids[i],id)))return undefined;return sites(c).find(f=>f.type==='traindepot'&&railRoute(c,from,f.id));}
export function railItinerary(c:Company,ids:string[],via:RailVia[]=[]){if(ids.length<2)return null;const source=sharedCompany(c),extra=via.map((v,i)=>({id:'via:'+i,name:'Wegpunkt',type:'traindepot' as const,city:'',cell:0,point:v.point,footprint:[]})),railCompany={...source,facilities:[...(source.facilities||[]),...extra]},legs=ids.slice(1).map((id,i)=>{const pass=via.flatMap((v,n)=>v.after===i?['via:'+n]:[]),at=[ids[i],...pass,id],pieces=at.slice(1).map((to,n)=>railRoute(railCompany,at[n],to));if(pieces.some(l=>!l))return null;return {path:pieces.flatMap((p,n)=>n?p!.path.slice(1):p!.path),length:pieces.reduce((s,p)=>s+p!.length,0),speed:Math.min(...pieces.map(p=>p!.speed)),electrified:pieces.every(p=>p!.electrified),tracks:pieces.flatMap(p=>p!.tracks)};});if(legs.some(l=>!l))return null;const points=ids.map(id=>source.facilities?.find(f=>f.id===id)?.point),throughStops=ids.map((_,i)=>{if(!i||i===ids.length-1)return false;const before=legs[i-1]!.path,after=legs[i]!.path,at=points[i]!;const a=before.slice(0,-1).reverse().find(p=>sphericalDistance(p,at)>30),b=after.slice(1).find(p=>sphericalDistance(p,at)>30);if(!a||!b)return false;const x=[a[0]-at[0],(a[1]-at[1])*Math.cos(at[0]*Math.PI/180)],y=[b[0]-at[0],(b[1]-at[1])*Math.cos(at[0]*Math.PI/180)];return x[0]*y[0]+x[1]*y[1]<0;});return {path:legs.flatMap((l,i)=>i?l!.path.slice(1):l!.path),length:legs.reduce((s,l)=>s+l!.length,0),segmentKm:legs.map(l=>l!.length),railSpeed:Math.min(...legs.map(l=>l!.speed)),electrified:legs.every(l=>l!.electrified),railTrackIds:[...new Set(legs.flatMap(l=>l!.tracks.map(t=>t.id)))],railUsage:legs.flatMap(l=>l!.tracks),throughStops,railVia:via};}
export type RailVia={point:LatLon;after:number};
export function syncRailLines(c:Company){const source=sharedCompany(c);for(const l of c.lines){if(l.mode!=='train')continue;const [from,to]=railEndpoints(c,l),ids=l.facilityIds||[from,to].filter(Boolean) as string[],route=railItinerary(c,l.routeMode==='loop'?[...ids,ids[0]]:ids,l.railVia);if(route){l.fromFacility=from;l.toFacility=to;Object.assign(l,route);l.stopPoints=ids.map(id=>source.facilities!.find(f=>f.id===id)!.point);l.stopAreas=ids.map(id=>source.facilities!.find(f=>f.id===id)!.city);delete l.railRouteError;}else l.railRouteError='Gleisverbindung unterbrochen';}}
