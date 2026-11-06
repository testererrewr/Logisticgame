import {runPlan,eventAt} from './operations';
import {vehicleModel} from './vehicle-models';
import {sphericalDistance} from './geography';
import type {Track,WorldState} from './game';
import type {LatLon} from './real-map';
import {railGraph,syncRailLines,type RailSection} from './rail-network';
import {bindInfrastructure} from './infrastructure-context';
const pointKey=(p:LatLon)=>p.map(n=>n.toFixed(7)).join(':');
const signature=(s:WorldState)=>JSON.stringify([s.companies.map(c=>[c.id,c.tracks,c.facilities?.filter(f=>f.type==='station'||f.type==='traindepot').map(f=>[f.id,f.point,f.footprint])]),s.auctions?.filter(a=>a.status==='open').flatMap(a=>a.assets.filter(v=>v.kind==='track').map(v=>v.id))]);
export function normalizeRailSections(state:WorldState){
 const before=signature(state);if(state.railSectionsSignature===before)return false;
 bindInfrastructure(state);for(const c of state.companies)syncRailLines(c);
 const previousPlans=new Map<string,ReturnType<typeof runPlan>>();for(const c of state.companies)for(const v of c.fleet||[]){const l=c.lines.find(l=>l.id===v.line);if(l?.mode!=='train')continue;const m=vehicleModel(v,state.vehicleCatalog?.models),plan=runPlan(c,l,m.speed,m.acceleration,m.braking,false,false,m.lengthM||0);if(plan&&state.operations?.vehicles[v.id]?.signature===plan.signature)previousPlans.set(v.id,plan);}
 const locked=new Set(state.auctions?.filter(a=>a.status==='open').flatMap(a=>a.assets.filter(v=>v.kind==='track').map(v=>v.id))||[]),updates=new Map<string,Track[]>();
 for(const c of state.companies){if(!c.tracks?.length)continue;const graph=railGraph(c),boundaries=new Set(graph.junctions.map(pointKey)),pieces:RailSection[]=graph.sections.filter(p=>p.track.owner===c.id&&!locked.has(p.track.id));
  for(const t of c.tracks.filter(t=>locked.has(t.id)))pieces.push({track:t,points:t.points,length:t.length,maintenance:t.dailyMaintenance||0});
  const incident=new Map<string,number[]>();for(const [i,p]of pieces.entries())for(const point of [p.points[0],p.points.at(-1)!]){const key=pointKey(point),list=incident.get(key)||[];list.push(i);incident.set(key,list);}
  const used=new Set<number>(),ids=new Set<string>(),output:Track[]=[];
  const compatible=(a:RailSection,b:RailSection)=>!locked.has(a.track.id)&&!locked.has(b.track.id)&&(a.track.kind||'regional')===(b.track.kind||'regional')&&!!a.track.electrified===!!b.track.electrified;
  for(let i=0;i<pieces.length;i++){if(used.has(i))continue;const first=pieces[i];if(locked.has(first.track.id)){used.add(i);ids.add(first.track.id);output.push(c.tracks.find(t=>t.id===first.track.id)!);continue;}
   const stop=(key:string)=>{const list=incident.get(key)||[];return boundaries.has(key)||list.length!==2||!compatible(pieces[list[0]],pieces[list[1]]);};
   const a=pointKey(first.points[0]),b=pointKey(first.points.at(-1)!);let points=[...(stop(a)||!stop(b)?first.points:[...first.points].reverse())],length=first.length,maintenance=first.maintenance;const originals=new Set([first.track.id]);used.add(i);
   for(let direction=0;direction<2;direction++){while(!stop(pointKey(points.at(-1)!))){const end=pointKey(points.at(-1)!),next=(incident.get(end)||[]).find(j=>!used.has(j));if(next===undefined)break;const p=pieces[next],ordered=pointKey(p.points[0])===end?p.points:[...p.points].reverse();if(pointKey(ordered.at(-1)!)===pointKey(points.at(-2)!))break;points.push(...ordered.slice(1));length+=p.length;maintenance+=p.maintenance;originals.add(p.track.id);used.add(next);}points.reverse();}
   const id=[...originals].find(id=>!ids.has(id))||crypto.randomUUID(),source=c.tracks.find(t=>t.id===[...originals][0])!,rounded=points.map(p=>p.map(n=>+n.toFixed(7)) as LatLon);ids.add(id);output.push({...source,id,points:rounded,length,dailyMaintenance:maintenance,sectioned:true});
  }updates.set(c.id,output);
 }
 for(const c of state.companies)if(updates.has(c.id))c.tracks=updates.get(c.id)!;
 bindInfrastructure(state);for(const c of state.companies)syncRailLines(c);for(const c of state.companies)for(const v of c.fleet||[]){const before=previousPlans.get(v.id),run=state.operations?.vehicles[v.id],l=c.lines.find(l=>l.id===v.line);if(!before||!run||!l)continue;const m=vehicleModel(v,state.vehicleCatalog?.models),after=runPlan(c,l,m.speed,m.acceleration,m.braking,false,false,m.lengthM||0);if(!after||before.visits.length!==after.visits.length||Math.abs(before.duration-after.duration)>100||before.calls.some((p,i)=>sphericalDistance(p,after.calls[i])>.05))continue;
  const near=(p:LatLon,path:LatLon[])=>path.slice(1).some((b,i)=>{const a=path[i],cos=Math.cos(p[0]*Math.PI/180),dx=(b[1]-a[1])*cos,dy=b[0]-a[0],t=Math.max(0,Math.min(1,((p[1]-a[1])*cos*dx+(p[0]-a[0])*dy)/(dx*dx+dy*dy||1)));return sphericalDistance(p,[a[0]+dy*t,a[1]+(b[1]-a[1])*t])<.05;});
  if(before.legs.some((leg,i)=>leg.path.some(p=>!near(p,after.legs[i].path))||after.legs[i].path.some(p=>!near(p,leg.path))))continue;
  run.epoch=eventAt(before,run)-eventAt(after,{...run,epoch:0});run.signature=after.signature;
 }
 state.railSectionsSignature=signature(state);return signature(state)!==before;
}
