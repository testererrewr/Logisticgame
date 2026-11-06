import {runPlan} from './operations';
import {urbanSpeed,vehicleModel} from './vehicle-models';
import {liveClock,vehicleTelemetry,callName} from './vehicle-telemetry';
import {canDepotServe} from './fleet';
import type {World,Company} from './game';
import type {Vehicle} from './fleet';
import {conditionAt} from './vehicle-health';
export type FleetStatusKey='idle'|'moving'|'dwell'|'ended'|'inactive'|'starting'|'blocked'|'stale';
export function fleetStatus(world:World,c:Company,v:Vehicle,now=Date.now()){
 const model=vehicleModel(v,world.state.vehicleCatalog?.models),home=c.facilities?.find(f=>f.id===v.depot),line=c.lines.find(l=>l.id===v.line),clock=liveClock(world,now);
 let key:FleetStatusKey='idle',label='Im Depot',issue='';
 const candidate=world.state.operations?.vehicles[v.id];
 const plan=line&&runPlan(c,line,line.city&&line.mode==='bus'?urbanSpeed(model):model.speed,model.acceleration,model.braking,false,false,model.lengthM||0);
 const run=plan&&candidate?.line===line?.id&&candidate?.signature===plan.signature?candidate:undefined;
 const active=!!line?.active&&!c.suspended&&!!home&&canDepotServe(c,home,line);
 const pose=active&&run&&plan?vehicleTelemetry(plan,run,clock.time):null;
 if(line){
  if(!line.active||c.suspended){key='inactive';label=c.suspended?'Unternehmen gesperrt':'Linie stillgelegt';}
  else if(!home||!canDepotServe(c,home,line)){key='blocked';label='Depot nicht erreichbar';issue='Wähle ein passendes, mit dieser Linie verbundenes Depot.';}
  else if(!plan){key='blocked';label='Linienverlauf fehlt';issue='Prüfe die Haltestellen und den Linienverlauf.';}
  else if(!pose){key='starting';label='Einsatz wird abgeglichen';}
  else if(clock.stale){key='stale';label='Verbindung verzögert';issue='Position und Belegung zeigen den letzten bestätigten Stand.';}
  else{key=pose.ended?'ended':pose.status==='Unterwegs'?'moving':'dwell';label=pose.status;}
  if(line.returnRouteError){issue=line.returnRouteError;if(pose?.ended){key='blocked';label='Rückfahrt nicht befahrbar';}}
 }
 return {key,label,issue,model,home,line,run,pose,clock,onboard:pose?.onboard||0,point:pose?.point||home?.point,
  previousStop:pose&&line?callName(c,line,pose.previousCall):undefined,nextStop:pose?.nextCall!==undefined&&line?callName(c,line,pose.nextCall):undefined,
  loadPercent:Math.min(100,(pose?.onboard||0)/Math.max(1,model.capacity)*100)};
}
export type FleetRow=ReturnType<typeof fleetStatus>&{v:Vehicle};
export type FleetFilter={home:string;mode:string;status:string;line:string;search:string};
export function filterFleet(rows:FleetRow[],filter:FleetFilter){
 const query=filter.search.trim().toLocaleLowerCase('de');
 return rows.filter(r=>(!filter.home||r.v.depot===filter.home)&&(!filter.mode||r.v.mode===filter.mode)&&(!filter.status||r.key===filter.status)&&(!filter.line||(filter.line==='unassigned'?!r.line:r.line?.id===filter.line))&&(!query||[r.v.name,r.model.name,r.home?.name,r.line?.name,r.nextStop,r.previousStop].join(' ').toLocaleLowerCase('de').includes(query)));
}
export type FleetSort='name'|'km'|'age'|'condition'|'profit'|'load'|'capacity'|'speed'|'depot'|'line'|'mode';
const fleetNames=new Intl.Collator('de',{numeric:true,sensitivity:'base'});
export function sortFleet(rows:FleetRow[],key:FleetSort,direction:'asc'|'desc',time:number,profit:(id:string)=>number=()=>0){
 const value=(r:FleetRow):number|string=>key==='profit'?profit(r.v.id):({name:r.v.name,km:r.v.health?.km||0,age:r.v.health?Math.max(0,time-r.v.health.since):0,condition:conditionAt(r.v,time),load:r.loadPercent,capacity:r.model.capacity,speed:r.model.speed,depot:r.home?.name||'',line:r.line?.name||'',mode:r.v.mode})[key]??profit(r.v.id);
 return rows.map(r=>({r,value:key==='profit'?profit(r.v.id):value(r)})).sort((a,b)=>{const cmp=typeof a.value==='number'&&typeof b.value==='number'?a.value-b.value:fleetNames.compare(String(a.value),String(b.value));return cmp*(direction==='desc'?-1:1)||fleetNames.compare(a.r.v.name,b.r.v.name)||a.r.v.id.localeCompare(b.r.v.id);}).map(a=>a.r);
}
