import type {Company,Line,World} from './game';
import type {Vehicle} from './fleet';
import {bindInfrastructure} from './infrastructure-context';
import {linesAtSite,type SiteLine,type SiteRef} from './site-details';
import {callSiteId} from './station-waiting';
import {runPlan,type RunPlan,type VehicleRun} from './operations';
import {urbanSpeed,vehicleModel} from './vehicle-models';
import {callName,liveClock} from './vehicle-telemetry';
import {canTransfer} from './contracts';

type Entry={site:SiteLine;company:Company;line:Line;vehicle:Vehicle;plan:RunPlan;run:VehicleRun;visits:number[]};
export type StationSchedule={entries:Entry[];lines:SiteLine[];world:World};
export type StationDeparture={id:string;company:Company;line:Line;vehicle:Vehicle;departure:number;destination:string;direction:string;at:string;distance:number;direct:boolean;walkMs:number;reachable:boolean;current:boolean};
// Route geometry and model-dependent motion are prepared only on a new snapshot.
export function stationSchedule(world:World,reference:SiteRef,myId:string,showForeign=false):StationSchedule{
 bindInfrastructure(world.state);const lines=linesAtSite(world,reference).filter(r=>!r.depot&&(showForeign||canTransfer(world.state,myId,r.company.id))),entries:Entry[]=[],wanted=new Map(lines.map(r=>[r.line.id,r])),groups=new Map<string,{plan:RunPlan|null;visits:number[]}>();
 for(const c of world.state.companies){if(c.suspended)continue;for(const v of c.fleet||[]){const site=wanted.get(v.line||'');if(!site||site.company.id!==c.id||!site.line.active||v.mode!==site.line.mode)continue;
  const run=world.state.operations?.vehicles[v.id];if(!run||run.line!==site.line.id)continue;
  const key=site.line.id+':'+v.model+':'+JSON.stringify(v.consist||[]);let group=groups.get(key);
  if(!group){const model=vehicleModel(v,world.state.vehicleCatalog?.models),l=site.line,plan=runPlan(c,l,l.city&&l.mode==='bus'?urbanSpeed(model):model.speed,model.acceleration,model.braking,false,false,model.lengthM||0);group={plan,visits:plan?plan.visits.flatMap((visit,i)=>callSiteId(c,l,visit.call)===site.waitingStop&&plan.legs[i]?[i]:[]):[]};groups.set(key,group);}
  if(group.plan&&group.plan.signature===run.signature&&group.visits.length)entries.push({site,company:c,line:site.line,vehicle:v,plan:group.plan,run,visits:group.visits});
 }}return {entries,lines,world};
}
// Only departure times are forecast. This never changes a run or passenger queue.
export function upcomingDepartures(schedule:StationSchedule,now=Date.now(),limit=12,lineId=''){
 const clock=liveClock(schedule.world,now);if(clock.stale||schedule.world.state.operations?.backlog||schedule.world.status!=='running')return [];
 type Candidate={entry:Entry;index:number;departure:number};const best:Candidate[]=[];limit=Math.max(1,Math.min(50,limit));
 function offer(candidate:Candidate){if(best.length>=limit&&candidate.departure>=best[best.length-1].departure)return;best.push(candidate);best.sort((a,b)=>a.departure-b.departure||a.entry.vehicle.id.localeCompare(b.entry.vehicle.id)||a.index-b.index);if(best.length>limit)best.pop();}
 for(const entry of schedule.entries){if(lineId&&entry.line.id!==lineId)continue;const {plan,run}=entry,n=plan.visits.length,lower=Math.max(0,run.next-1);
  for(const local of entry.visits){const offset=plan.legs[local].start,cycle=plan.repeat?Math.max(0,Math.ceil((lower-local)/n),Math.ceil((clock.time-run.epoch-offset)/plan.duration)):0,index=cycle*n+local,departure=run.epoch+cycle*plan.duration+offset;
   if(index<lower||departure<clock.time||!Number.isFinite(departure))continue;offer({entry,index,departure});
   if(plan.repeat)offer({entry,index:index+n,departure:departure+plan.duration});
  }
 }
 return best.map(({entry:e,index,departure}):StationDeparture=>{const local=index%e.plan.visits.length,returning=e.plan.returnAt!==undefined&&e.plan.visits[local].at>=e.plan.returnAt,ring=e.plan.repeat&&e.plan.returnAt===undefined,destination=ring?e.plan.visits[(local+1)%e.plan.visits.length].call:returning?0:e.plan.calls.length-1,walkMs=e.site.direct?0:Math.max(1000,e.site.distance/80*60000);
  return {id:e.vehicle.id+':'+index,company:e.company,line:e.line,vehicle:e.vehicle,departure,destination:callName(e.company,e.line,destination),direction:ring?'Ringfahrt':returning?'Rückfahrt':'Hinfahrt',at:e.site.at,distance:e.site.distance,direct:e.site.direct,walkMs,reachable:departure-clock.time>=walkMs,current:index===e.run.next-1};});
}
