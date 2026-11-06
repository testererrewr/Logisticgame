import {maintenanceFactor} from './maintenance';
import {payTenderBonuses} from './tender-rewards';
import {healthCostFactor,recordVehicleKm} from './vehicle-health';
import {modeEnabled} from './world-modes';
import {sharedCompany} from './infrastructure-context';
import {vehicleLedger,recordCompanyTrip,lineLedger} from './company-metrics';
import {book} from './finance';
import {motionProfile,motionDistance,motionTime,motionSpeed,accelerationByMode,brakingByMode,type MotionProfile} from './motion';
import {callSiteId,stationWaitingData} from './station-waiting';
import {linePath,placePoint,ticket,depotForLine,type Company,type Line,type WorldState} from './game';
import {energyCostPerKm,urbanSpeed,vehicleModel} from './vehicle-models';
import {meters,type LatLon} from './real-map';
import {networkForecast,flowKey,type PassengerFlow} from './network';
import {canTransfer} from './contracts';
import {recordUsage,type UsageKind} from './usage';

type Load={bonuses?:Record<string,number>;toCall?:number;continuation?:boolean;remainingFare?:number;exit:number;count:number;fare:number;flow:string;hops:number};
export type VehicleRun={motionVersion?:number;hold?:{until:number;point:LatLon};line:string;signature:string;epoch:number;next:number;onboard:Load[];boarded:number;alighted:number;revenue:number;lastEvent?:number};
type QueueItem={continuation?:boolean;paidFare?:number;sourceCompany?:string;from:number;to:number;flow:string;hops:number;waiting:number;credit:number;pending:{ready:number;count:number}[]};
type Queue={originCredit?:number;at:number;items:Record<string,QueueItem>};
export type Operations={dispatch?:Record<string,{anchor:number;period:number;configuredHeadway?:number;headway?:number;nextSlot?:number;vehicles:string[]}>;version:2;vehicles:Record<string,VehicleRun>;queues:Record<string,Queue>;transferCredits:Record<string,number>;backlog:boolean};
type Visit={at:number;call:number;point:LatLon};
export type RunPlan={visits:Visit[];legs:{start:number;end:number;path:LatLon[];km?:number;motion?:MotionProfile}[];duration:number;repeat:boolean;signature:string;calls:LatLon[];dwell:number;returnAt?:number};
const DAY=86400000,HOUR=3600000;
function hash(s:string){let h=2166136261;for(let i=0;i<s.length;i++)h=Math.imul(h^s.charCodeAt(i),16777619);return (h>>>0).toString(36);}
const distanceCache=new WeakMap<LatLon[],number[]>();
function lengths(path:LatLon[]){const cached=distanceCache.get(path);if(cached)return cached;const d=[0];for(let i=1;i<path.length;i++)d.push(d[i-1]+meters(path[i-1],path[i]));distanceCache.set(path,d);return d;}
function pointAt(path:LatLon[],d:number[],at:number):LatLon{if(at<=0)return path[0];for(let i=1;i<d.length;i++)if(d[i]>=at){const t=(at-d[i-1])/(d[i]-d[i-1]||1),a=path[i-1],b=path[i];return [a[0]+(b[0]-a[0])*t,a[1]+(b[1]-a[1])*t];}return path.at(-1)!;}
function section(path:LatLon[],d:number[],a:number,b:number){return [pointAt(path,d,a),...path.filter((_,i)=>d[i]>a&&d[i]<b),pointAt(path,d,b)];}
function calls(c:Company,l:Line){c=sharedCompany(c);if(l.facilityIds?.length)return l.facilityIds.flatMap(id=>{const f=c.facilities?.find(f=>f.id===id);return f?[f.point]:[];});if(l.stopPoints?.length)return l.stopPoints;const fs=[l.fromFacility||c.tracks?.find(t=>t.id===l.track)?.from,l.toFacility||c.tracks?.find(t=>t.id===l.track)?.to];return [l.a,l.b].flatMap((city,i)=>{const f=c.facilities?.find(f=>fs[i]?f.id===fs[i]:(f.type===(l.mode==='plane'?'airport':'station')&&f.city.split('~')[0]===city));const p=f?.point||placePoint(city);return p?[p]:[];});}
const plans=new Map<string,RunPlan>();
export function runPlan(c:Company,l:Line,speed:number,acceleration=accelerationByMode[l.mode],braking=brakingByMode[l.mode],legacy=false,v26=false,trainLength=0,v27=false,v28=false):RunPlan|null{
 if(!v26&&l.mode==='train')speed=Math.min(speed,l.railSpeed||320);
 const path=linePath(c,l),stops=calls(c,l);if(path.length<2||stops.length<2||speed<=0)return null;
 const stations=sharedCompany(c).facilities||[],dwellFactors=l.mode==='train'&&!v26&&!v27?(l.facilityIds||[l.fromFacility,l.toFacility]).map((id,i)=>{const station=stations.find(f=>f.id===id),short=trainLength>(station?.platformLength||100)+.01;return (l.throughStops?.[i]?.valueOf()? .5:1)*(short?2:1);}):undefined;
 const signature=hash(JSON.stringify([l.id,l.mode,l.routeMode,path,l.returnPath,l.segmentKm,l.returnSegmentKm,stops,speed,...legacy?[]:[v26?3:v27?4:v28?5:6,acceleration,braking,...dwellFactors?[dwellFactors]:[],...!v26&&l.mode==='train'&&l.throughStops?.some(Boolean)?[l.throughStops]:[]]]));if(plans.has(signature))return plans.get(signature)!;
 const loop=l.routeMode==='loop'||l.mode==='bus'&&!l.routeMode,shuttle=!loop&&(l.mode!=='bus'||l.routeMode==='shuttle'),repeat=loop||shuttle,dwell=l.mode==='plane'?180000:l.mode==='ship'?90000:l.mode==='train'?45000:25000;
 const visits:Visit[]=[{at:0,call:0,point:path[0]}],legs:RunPlan['legs']=[],forward=lengths(path);let at=0;
 function append(geometry:LatLon[],dist:number[],order:number[],weights:number[]){const total=dist.at(-1)!,sum=weights.reduce((s,n)=>s+n,0)||1;let offset=0;for(let i=1;i<order.length;i++){const end=i===order.length-1?total:offset+total*(weights[i-1]??sum/(order.length-1))/sum,part=section(geometry,dist,offset,end),start=at+(dwellFactors?dwell*dwellFactors[order[i-1]]:!v26&&l.mode==='train'&&l.throughStops?.[order[i-1]]?dwell*.5:dwell);const motion=legacy?undefined:motionProfile(end-offset,speed,acceleration,braking);at=start+(motion?motion.seconds*1000:Math.max(1000,(end-offset)/speed*3600));legs.push({start,end:at,path:part,km:(end-offset)/1000,motion});visits.push({at,call:order[i],point:part.at(-1)!});offset=end;}}
 const order=stops.map((_,i)=>i);if(loop)order.push(0);append(path,forward,order,l.segmentKm?.length===order.length-1?l.segmentKm:Array(order.length-1).fill(1));
 const returnAt=shuttle?at:undefined;
 if(shuttle){const back=l.returnPath?.length?l.returnPath:[...path].reverse(),reverse=[...stops.keys()].reverse();append(back,lengths(back),reverse,l.returnSegmentKm?.length===reverse.length-1?l.returnSegmentKm:Array(reverse.length-1).fill(1));}
 // The last repeated visit is the first visit of the next cycle.
 const duration=repeat?at:at+dwell;if(repeat)visits.pop();
 const result={visits,legs,duration:Math.max(1000,duration),repeat,signature,calls:stops,dwell,returnAt};plans.set(signature,result);if(plans.size>512)plans.delete(plans.keys().next().value!);return result;
}
export function eventAt(plan:RunPlan,run:VehicleRun,index=run.next){if(!plan.repeat&&index>=plan.visits.length)return Infinity;return run.epoch+Math.floor(index/plan.visits.length)*plan.duration+plan.visits[index%plan.visits.length].at;}
export function vehiclePose(plan:RunPlan,run:VehicleRun,time:number){if(run.hold&&time<run.hold.until)return {point:run.hold.point,status:'Wartet auf Taktabfahrt',ended:false};const elapsed=Math.max(0,time-run.epoch),ended=!plan.repeat&&elapsed>=plan.duration,phase=plan.repeat?elapsed%plan.duration:Math.min(elapsed,plan.duration);const leg=plan.legs.find(v=>phase>=v.start&&phase<v.end);if(leg){const d=lengths(leg.path);return {point:pointAt(leg.path,d,leg.motion?motionDistance(leg.motion,(phase-leg.start)/1000):d.at(-1)!*(phase-leg.start)/(leg.end-leg.start)),speed:leg.motion?motionSpeed(leg.motion,(phase-leg.start)/1000):0,status:'Unterwegs',ended:false};}const visit=[...plan.visits].reverse().find(v=>v.at<=phase)||plan.visits[0];return {point:visit.point,status:ended?'Endpunkt erreicht':elapsed===0?'Abfahrt':'Fahrgastwechsel',ended};}
export function syncRuns(state:WorldState,time=state.simTime||Date.now()){
 if(state.operations?.version!==2)delete state.operations;const ops=state.operations??={version:2,vehicles:{},queues:{},transferCredits:{},backlog:false},live=new Set<string>(),lines=new Set<string>(),changed=new Set<string>();
 ops.dispatch??={};
 for(const c of state.companies){if(c.suspended)continue;for(const l of c.lines){if(!l.active||!modeEnabled(state.rules,l.mode)||!depotForLine(c,l))continue;
 const assigned=(c.fleet||[]).filter(v=>v.line===l.id&&v.mode===l.mode),prepared=assigned.flatMap(v=>{const model=vehicleModel(v,state.vehicleCatalog?.models),speed=l.city&&(l.mode==='bus'||l.mode==='train')?l.mode==='train'?model.speed:urbanSpeed(model):model.speed,plan=runPlan(c,l,speed,model.acceleration,model.braking,false,false,model.lengthM||0);return plan?[{v,plan}]:[];});
 if(!prepared.length)continue;
 const period=Math.max(...prepared.map(v=>v.plan.duration)),schedule=ops.dispatch[l.id]??={anchor:time+prepared[0].plan.dwell,period,vehicles:[]};if(schedule.configuredHeadway!==(l.headwayMinutes||0)){schedule.configuredHeadway=l.headwayMinutes||0;delete schedule.nextSlot;}schedule.headway=Math.max((l.headwayMinutes||0)*60000,1/prepared.reduce((sum,e)=>sum+1/e.plan.duration,0));schedule.period=l.headwayMinutes?Math.max(period,schedule.headway*prepared.length):period;schedule.vehicles=prepared.map(e=>e.v.id);
 for(const {v,plan}of prepared){live.add(v.id);lines.add(l.id);const old=ops.vehicles[v.id];
 if(old&&old.line===l.id&&old.motionVersion!==6&&old.signature!==plan.signature){const model=vehicleModel(v,state.vehicleCatalog?.models),speed=l.city&&(l.mode==='bus'||(old.motionVersion||0)<3&&l.mode==='train')?model.citySpeed:model.speed,previous=runPlan(c,l,speed,model.acceleration,model.braking,(old.motionVersion||0)<3,old.motionVersion===3,model.lengthM||0,old.motionVersion===4,old.motionVersion===5);if(previous&&previous.signature===old.signature&&previous.visits.length===plan.visits.length){const elapsed=Math.max(0,time-old.epoch),cycle=previous.repeat?Math.floor(elapsed/previous.duration):0,phase=elapsed-cycle*previous.duration,leg=previous.legs.findIndex(v=>phase>=v.start&&phase<v.end);let nextPhase:number;if(leg>=0){const a=previous.legs[leg],b=plan.legs[leg],fraction=a.motion?motionDistance(a.motion,(phase-a.start)/1000)/a.motion.distance:(phase-a.start)/(a.end-a.start);nextPhase=b.start+(b.motion?motionTime(b.motion,b.motion.distance*fraction)*1000:(b.end-b.start)*fraction);}else{const i=Math.max(0,previous.visits.findLastIndex(v=>v.at<=phase));nextPhase=plan.visits[i].at+Math.min(plan.dwell,phase-previous.visits[i].at);}old.epoch=time-(cycle*plan.duration+nextPhase);old.signature=plan.signature;old.motionVersion=6;}}
 if(old&&old.signature!==plan.signature)changed.add(l.id);
 if(!old||old.line!==l.id||old.signature!==plan.signature){const rank=schedule.vehicles.indexOf(v.id),offset=plan.repeat?(l.headwayMinutes?rank*schedule.headway!:rank*plan.duration/prepared.length):0;let epoch=schedule.anchor+offset;if(epoch<time+plan.dwell)epoch+=Math.ceil((time+plan.dwell-epoch)/schedule.period)*schedule.period;ops.vehicles[v.id]={motionVersion:6,line:l.id,signature:plan.signature,epoch,next:0,onboard:[],boarded:0,alighted:0,revenue:0};}
 ops.queues[l.id]??={at:time,items:{}};
 }}}

 for(const id of Object.keys(ops.vehicles))if(!live.has(id))delete ops.vehicles[id];for(const id of Object.keys(ops.queues))if(!lines.has(id))delete ops.queues[id];for(const id of changed)ops.queues[id]={at:time,items:{}};if(changed.size)ops.transferCredits={};for(const key of Object.keys(ops.transferCredits))if(!lines.has(key.split(':')[0]))delete ops.transferCredits[key];return ops;
}
function callIndex(plan:RunPlan,p:LatLon){let index=0,best=Infinity;for(let i=0;i<plan.calls.length;i++){const d=meters(plan.calls[i],p);if(d<best){best=d;index=i;}}return index;}
function destination(plan:RunPlan,index:number,to:number){for(let i=index+1;i<=index+plan.visits.length;i++){if(!plan.repeat&&i>=plan.visits.length)break;if(meters(plan.calls[plan.visits[i%plan.visits.length].call],plan.calls[to])<1)return i;}return undefined;}
// Only arrivals sell completed rides. Forecasts supply finite competing demand to
// queues; they never credit cash. Fractional demand is carried until a whole person arrives.
export function settleOperations(state:WorldState,config:any,start:number,end:number){
 const ops=syncRuns(state,start),entries:{c:Company;l:Line;id:string;run:VehicleRun;plan:RunPlan;capacity:number;kmCost:number;maintenanceKm:number;vehicle:import('./fleet').Vehicle}[]=[],flowCache=new Map<number,Map<string,PassengerFlow[]>>();
 for(const c of state.companies)for(const v of c.fleet||[]){const run=ops.vehicles[v.id],l=c.lines.find(l=>l.id===run?.line);if(!run||!l)continue;const model=vehicleModel(v,state.vehicleCatalog?.models),plan=runPlan(c,l,l.mode==='bus'&&l.city?urbanSpeed(model):model.speed,model.acceleration,model.braking,false,false,model.lengthM||0);if(plan)entries.push({c,l,id:v.id,run,plan,capacity:model.capacity,vehicle:v,maintenanceKm:model.costPerKm,kmCost:energyCostPerKm(model,config.energy)});}
 function flows(t:number,line:string){const slot=0;let byLine=flowCache.get(slot);if(!byLine){byLine=new Map();for(const flow of networkForecast(state,config,t).flows){const list=byLine.get(flow.line)||[];list.push(flow);byLine.set(flow.line,list);}flowCache.set(slot,byLine);}return byLine.get(line)||[];}
 function item(q:Queue,flow:{line:string;from:LatLon;to:LatLon},plan:RunPlan,hops:number,sourceCompany?:string){const key=flowKey(flow),id=key+':'+hops+(sourceCompany?':'+sourceCompany:'');return q.items[id]??={sourceCompany,from:callIndex(plan,flow.from),to:callIndex(plan,flow.to),flow:key,hops,waiting:0,credit:0,pending:[]};}
 function accrue(q:Queue,line:string,plan:RunPlan,to:number){
  // Pool whole arrivals across OD pairs. Otherwise 100 low-volume destinations
  // can all remain empty for hours despite substantial combined demand.
  q.originCredit??=Object.values(q.items).reduce((s,v)=>s+v.credit,0);
  while(q.at<to){const until=Math.min(to,(Math.floor(q.at/HOUR)+1)*HOUR),fraction=(until-q.at)/DAY;for(const flow of flows(q.at,line)){if(!flow.origin)continue;const entry=item(q,flow,plan,0);if(entry.from===entry.to)continue;const amount=flow.origin*fraction;entry.credit+=amount;q.originCredit+=amount;}
   const whole=Math.floor(q.originCredit+1e-9);q.originCredit-=whole;const choices=Object.values(q.items).filter(v=>v.hops===0&&v.from!==v.to);for(let i=0;i<whole&&choices.length;i++){let selected=choices[0];for(const choice of choices)if(choice.credit>selected.credit)selected=choice;selected.waiting++;selected.credit--;}
   q.at=until;
  }
  for(const entry of Object.values(q.items)){for(const arrival of entry.pending)if(arrival.ready<=to)entry.waiting+=arrival.count;entry.pending=entry.pending.filter(a=>a.ready>to);}
 }
 const byLine=new Map(entries.map(e=>[e.l.id,e]));
 function transfer(load:Load,company:Company,time:number,line:string){if(load.hops>=config.maxTransfers)return;const flow=flows(time,line).find(f=>flowKey(f)===load.flow);if(!flow?.passengers)return;let remaining=load.count;for(const next of flow.next){const target=byLine.get(next.line),q=ops.queues[next.line];if(!q||!target||!canTransfer(state,company.id,target.c.id))continue;const key=load.flow+'|'+flowKey(next),credit=(ops.transferCredits[key]||0)+load.count*Math.min(1,next.passengers/flow.passengers),count=Math.min(remaining,Math.floor(credit+1e-9));ops.transferCredits[key]=credit-count;remaining-=count;if(count)item(q,next,target.plan,load.hops+1,company.id).pending.push({ready:time+next.walk*60000,count});}}
 function rideKm(plan:RunPlan,from:number,to:number){let km=0;for(let i=from;i<to;i++)km+=plan.legs[i%plan.legs.length]?.km||0;return km;}
 function boundary(plan:RunPlan,l:Line,from:number,to:number){for(let i=from+1;i<to;i++){const call=plan.visits[i%plan.visits.length].call;if(call===0||l.routeMode!=='loop'&&l.mode!=='bus'&&call===plan.calls.length-1||l.routeMode==='shuttle'&&call===plan.calls.length-1)return i;}return to;}

 // A heap and a bounded replay keep a fast world responsive after a long absence.
 // Unprocessed events remain persisted and are replayed on the next request.
 const heap:typeof entries=[];const when=(e:typeof entries[number])=>eventAt(e.plan,e.run);function push(e:typeof entries[number]){heap.push(e);let i=heap.length-1;while(i){const p=(i-1)>>1;if(when(heap[p])<=when(e))break;heap[i]=heap[p];i=p;}heap[i]=e;}function pop(){const first=heap[0],last=heap.pop()!;if(heap.length){let i=0;while(i*2+1<heap.length){let j=i*2+1;if(j+1<heap.length&&when(heap[j+1])<when(heap[j]))j++;if(when(last)<=when(heap[j]))break;heap[i]=heap[j];i=j;}heap[i]=last;}return first;}
 for(const entry of entries)push(entry);let count=0;
 while(heap.length&&when(heap[0])<=end&&count++<20000){const entry=pop(),{c,l,run,plan,capacity}=entry,time=when(entry),visit=plan.visits[run.next%plan.visits.length],q=ops.queues[l.id];accrue(q,l.id,plan,time);
  if(run.next>0){const km=plan.legs[(run.next-1)%plan.legs.length]?.km||0,cost=state.tripCostsSince!==undefined&&time>=state.tripCostsSince?km*(entry.kmCost+entry.maintenanceKm*maintenanceFactor(state,time)*healthCostFactor(entry.vehicle,time)):0;recordVehicleKm(entry.vehicle,km,time);if(cost){c.cash-=cost;c.earned-=cost;book(c,time,1,cost);vehicleLedger(c,entry.id,time,0,cost);lineLedger(c,l.id,time,0,cost);}}
  const terminal=run.next>0&&(visit.call===0||((l.routeMode==='shuttle'||l.mode!=='bus'&&l.routeMode!=='loop')&&visit.call===plan.calls.length-1));
  const leaving=run.onboard.filter(p=>p.exit<=run.next||terminal);for(const p of leaving){const fare=p.count*p.fare;c.cash+=fare;c.earned+=fare;c.ticketRevenue=(c.ticketRevenue||0)+fare;run.revenue+=fare;run.alighted+=p.count;book(c,time,0,fare);payTenderBonuses(state,c,l.id,entry.id,time,fare,p.count,p.bonuses);vehicleLedger(c,entry.id,time,fare);lineLedger(c,l.id,time,fare);if(p.toCall===undefined||meters(plan.calls[p.toCall],plan.calls[visit.call])<1)recordCompanyTrip(c,time,p.count);
   const target=p.toCall??plan.visits[p.exit%plan.visits.length]?.call;
   if(terminal&&target!==undefined&&meters(plan.calls[target],plan.calls[visit.call])>=1){const id='continue:'+entry.id+':'+run.next+':'+target+':'+p.flow;q.items[id]={from:visit.call,to:target,flow:p.flow,hops:p.hops,waiting:p.count,credit:0,pending:[],sourceCompany:c.id,continuation:true,paidFare:(p.remainingFare??0)};}
   else transfer(p,c,time,l.id);
  }run.onboard=run.onboard.filter(p=>p.exit>run.next&&!terminal);
  let seats=Math.max(0,capacity-run.onboard.reduce((s,p)=>s+p.count,0));const boarded:Record<UsageKind,number>={direct:0,own:0,partner:0};const eligible=Object.values(q.items).filter(item=>(!item.sourceCompany||canTransfer(state,item.sourceCompany,c.id))&&meters(plan.calls[item.from],plan.calls[visit.call])<1&&item.waiting>0&&destination(plan,run.next,item.to)!==undefined),total=eligible.reduce((s,p)=>s+p.waiting,0);
  // Proportional allocation plus deterministic largest remainders avoids starving
  // a destination merely because its ID happens to sort last.
  const allocations=eligible.map(item=>{const exact=total?Math.min(seats,total)*item.waiting/total:0;return {item,n:Math.floor(exact),remainder:exact%1};});let remaining=Math.min(seats,total)-allocations.reduce((s,a)=>s+a.n,0);for(const a of [...allocations].sort((a,b)=>b.remainder-a.remainder||a.item.to-b.item.to))if(remaining-->0)a.n++;
  for(const {item,n}of allocations){if(!n)continue;item.waiting-=n;const target=destination(plan,run.next,item.to)!,exit=boundary(plan,l,run.next,target),totalKm=rideKm(plan,run.next,target),firstKm=rideKm(plan,run.next,exit),fullFare=item.continuation?(item.paidFare??0):ticket(l,totalKm),fare=exit===target?fullFare:Math.round(fullFare*firstKm/Math.max(.001,totalKm)*100)/100;
   const flow=flows(time,l.id).find(f=>flowKey(f)===item.flow),bonuses=flow?.bonuses?Object.fromEntries(Object.entries(flow.bonuses).map(([id,n])=>[id,n/Math.max(.000001,flow.passengers)])):undefined;run.onboard.push({bonuses,exit,toCall:item.to,count:n,fare,remainingFare:Math.max(0,fullFare-fare),flow:item.flow,hops:item.hops,continuation:item.continuation});run.boarded+=n;if(!item.continuation)c.passengers+=n;if(item.continuation)(boarded as any).continuation=((boarded as any).continuation||0)+n;else boarded[item.hops===0?'direct':!item.sourceCompany||item.sourceCompany===c.id?'own':'partner']+=n;
  }
  for(const [id,qitem]of Object.entries(q.items))if(qitem.continuation&&!qitem.waiting&&!qitem.pending.length)delete q.items[id];
  const stopKey=callSiteId(c,l,visit.call);
  recordUsage(state,time,entry.id,l.id,stopKey,boarded,run.onboard.reduce((n,p)=>n+p.count,0),capacity,Math.max(0,total-allocations.reduce((n,a)=>n+a.n,0)));recordCompanyTrip(c,time,0,run.onboard.reduce((n,p)=>n+p.count,0),capacity);
  if(run.hold&&time>=run.hold.until)delete run.hold;
  const schedule=ops.dispatch?.[l.id];if(plan.repeat&&visit.call===0&&schedule&&(schedule.vehicles.length>1||!!l.headwayMinutes)){const slot=Math.max(time,schedule.nextSlot??time);schedule.nextSlot=slot+(schedule.headway||schedule.period/schedule.vehicles.length);if(slot>time+1){run.epoch+=slot-time;run.hold={until:slot,point:visit.point};}}
  run.lastEvent=time;run.next++;if(eventAt(plan,run)<=end)push(entry);
 }
 ops.backlog=heap.some(e=>when(e)<=end);
 // Advance arrivals between vehicle visits, but never beyond unreplayed events.
 if(!ops.backlog)for(const {l,plan}of byLine.values())accrue(ops.queues[l.id],l.id,plan,end);
 const stationData=stationWaitingData(state);state.waiting=stationData.counts;state.waitingTop=stationData.top;const waiting=new Map<string,number>();for(const lines of Object.values(state.waiting))for(const [id,n]of Object.entries(lines))waiting.set(id,(waiting.get(id)||0)+n);state.pressure??={};for(const id of byLine.keys()){const n=waiting.get(id)||0,old=state.pressure[id];if(!old)state.pressure[id]={at:end,waiting:n};else if(end-old.at>=300000)state.pressure[id]={at:end,waiting:n,previousAt:old.at,previousWaiting:old.waiting};}for(const id of Object.keys(state.pressure))if(!byLine.has(id))delete state.pressure[id];
}
