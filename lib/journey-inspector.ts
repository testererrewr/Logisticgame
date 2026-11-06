import type {World} from './game';
import type {LatLon} from './real-map';
import {meters} from './real-map';
import {bindInfrastructure} from './infrastructure-context';
import {inspectNetwork,validateJourneyPoints} from './network';
import {vehicleModel,urbanSpeed} from './vehicle-models';
import {runPlan,type RunPlan} from './operations';
import {callName} from './vehicle-telemetry';
import {callSiteId} from './station-waiting';
import {canTransfer} from './contracts';
export type JourneyLeg={kind:'walk'|'ride';from:LatLon;to:LatLon;fromName:string;toName:string;minutes:number;wait:number;price:number;km:number;path:LatLon[];line?:string;lineName?:string;company?:string;companyName?:string;mode?:string;waiting?:number;capacityWarning?:boolean};
export function inspectPassengerJourney(world:World,viewer:string,from:LatLon,to:LatLon){
 validateJourneyPoints(from,to);bindInfrastructure(world.state);const result=inspectNetwork(world.state,from,to,world.config),lines=new Map(world.state.companies.flatMap(c=>c.lines.map(l=>[l.id,{c,l}] as const))),plans=new Map<string,RunPlan|null>(),sites=world.state.companies.flatMap(c=>[...(c.stops||[]),...(c.facilities||[]).filter(f=>['station','airport','port'].includes(f.type))]),name=(p:LatLon)=>sites.find(s=>meters(s.point,p)<1)?.name||p.map(n=>n.toFixed(5)).join(', '),thin=(path:LatLon[])=>path.length<=600?path:path.filter((_,i)=>i===0||i===path.length-1||i%Math.ceil(path.length/598)===0);
 const journeys=result.journeys.map(j=>{const legs:JourneyLeg[]=[];function add(leg:JourneyLeg,merge=false){const old=legs.at(-1);if(merge&&old&&old.kind===leg.kind&&(leg.kind==='walk'||old.line===leg.line)&&meters(old.to,leg.from)<1){old.to=leg.to;old.toName=leg.toName;old.minutes+=leg.minutes;old.wait+=leg.wait;old.price+=leg.price;old.km+=leg.km;old.path.push(...leg.path.slice(1));}else legs.push(leg);}
  const first=j.edges[0]?.from||j.accessFrom,last=j.edges.at(-1)?.to||j.accessTo;const walk=(a:LatLon,b:LatLon,minutes:number,fromName=name(a),toName=name(b))=>({kind:'walk' as const,from:a,to:b,fromName,toName,minutes,wait:0,price:0,km:meters(a,b)/1000,path:[a,b]});if(first&&j.sourceWalk>0)add(walk(from,first,j.sourceWalk,'Start'));
  for(const e of j.edges){if(!e.line){add(walk(e.from,e.to,e.walk),true);continue;}const row=lines.get(e.line)!;if(!plans.has(e.line)){const vehicle=row.c.fleet?.find(v=>v.line===e.line),model=vehicleModel(vehicle||{mode:row.l.mode},world.state.vehicleCatalog?.models);plans.set(e.line,runPlan(row.c,row.l,row.l.city&&row.l.mode==='bus'?urbanSpeed(model):model.speed,model.acceleration,model.braking,false,false,model.lengthM||0));}const plan=plans.get(e.line),index=plan?.legs.findIndex((_,i)=>plan.visits[i]?.call===e.fromCall&&(plan.visits[i+1]||plan.visits[0]).call===e.toCall)??-1,visible=canTransfer(world.state,viewer,row.c.id);add({kind:'ride',from:e.from,to:e.to,fromName:callName(row.c,row.l,e.fromCall||0),toName:callName(row.c,row.l,e.toCall||0),minutes:e.ride,wait:e.wait,price:e.price,km:e.km,path:index>=0?plan!.legs[index].path.slice():[e.from,e.to],line:e.line,lineName:row.l.name||'Linie',company:row.c.id,companyName:row.c.name,mode:row.l.mode,waiting:visible&&e.boarding?world.state.waiting?.[callSiteId(row.c,row.l,e.fromCall||0)]?.[e.line]||0:undefined,capacityWarning:visible&&j.saturated.includes(e.line)},!e.boarding);}
  if(last&&j.targetWalk>0)add(walk(last,to,j.targetWalk,name(last),'Ziel'),true);if(!legs.length)add(walk(from,to,j.factors.walk,'Start','Ziel'));for(const leg of legs)leg.path=thin(leg.path);return {profile:j.profile,score:j.score,breakdown:j.breakdown,factors:j.factors,acceptance:j.acceptance,legs};});
 return {...result,journeys,revision:world.revision,simTime:world.state.simTime||Date.now(),from,to};
}
export type JourneyInspection=ReturnType<typeof inspectPassengerJourney>;
