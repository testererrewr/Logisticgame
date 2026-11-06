import {placeName,type World,type Company,type Line} from './game';
import {eventAt,vehiclePose,type RunPlan,type VehicleRun} from './operations';
import {meters} from './real-map';
import {companyWorld} from './infrastructure-context';

export function liveClock(world:World,now=Date.now()){
 if(world.syncPending)return {age:0,stale:true,time:world.state.simTime||now};
 const age=Math.max(0,now-(world.receivedAt||world.serverNow||now));
 return {age,stale:age>12000,time:(world.state.simTime||now)+(world.status==='running'?Math.min(age,12000)*(world.config?.timeScale||1):0)};
}
export function callName(company:Company,line:Line,index:number){
 const stopId=line.stopIds?.[index];let stop=stopId?company.stops?.find(s=>s.id===stopId):undefined;
 if(!stop&&stopId)for(const other of companyWorld(company)?.companies||[]){stop=other.stops?.find(s=>s.id===stopId);if(stop)break;}if(stop)return stop.name;
 let track=line.track?company.tracks?.find(t=>t.id===line.track):undefined;
 if(!track&&line.track)for(const other of companyWorld(company)?.companies||[]){track=other.tracks?.find(t=>t.id===line.track);if(track)break;}
 const facilityId=line.facilityIds?.[index]||(index===0?line.fromFacility||track?.from:line.toFacility||track?.to);let facility=facilityId?company.facilities?.find(f=>f.id===facilityId):undefined;
 if(!facility&&facilityId)for(const other of companyWorld(company)?.companies||[]){facility=other.facilities?.find(f=>f.id===facilityId);if(facility)break;}if(facility)return facility.name;
 return line.stopIds?.length||line.stopPoints?.length?'Halt '+(index+1):placeName(index===0?line.a:line.b);
}
export function vehicleTelemetry(plan:RunPlan,run:VehicleRun,time:number){
 const nextAt=eventAt(plan,run),drawTime=Math.min(time,nextAt),pose=vehiclePose(plan,run,drawTime),beforeStart=time<run.epoch,awaiting=time>=nextAt;
 const nextVisit=Number.isFinite(nextAt)?plan.visits[run.next%plan.visits.length]:null;
 const previous=plan.visits[Math.max(0,run.next-1)%plan.visits.length];
 const elapsed=Math.max(0,drawTime-run.epoch),phase=plan.repeat?elapsed%plan.duration:Math.min(elapsed,plan.duration),leg=run.hold&&time<run.hold.until?undefined:plan.legs.find(l=>phase>=l.start&&phase<l.end);
 const later=vehiclePose(plan,run,Math.min(drawTime+500,nextAt));
 const cycle=plan.repeat?Math.floor(elapsed/plan.duration):0,nextLeg=plan.legs.find(l=>l.start>phase);
 const departureAt=run.hold&&time<run.hold.until?run.hold.until+plan.dwell:!pose.ended&&!leg&&!awaiting?run.epoch+cycle*plan.duration+(nextLeg?.start??(plan.repeat?plan.duration+plan.legs[0].start:Infinity)):undefined;
 const a=pose.point,b=later.point,dy=b[0]-a[0],dx=(b[1]-a[1])*Math.cos(a[0]*Math.PI/180),heading=meters(a,b)>.01?(Math.atan2(dx,dy)*180/Math.PI+360)%360:undefined;
 return {...pose,status:beforeStart?'Wartet auf Abfahrt':awaiting?'Halteabgleich':pose.status,nextCall:nextVisit?.call,previousCall:previous.call,nextAt,remaining:Math.max(0,nextAt-time),progress:leg?(phase-leg.start)/(leg.end-leg.start):pose.ended?1:0,heading,
  direction:run.hold&&time<run.hold.until?'Hinfahrt':plan.returnAt!==undefined?(phase>=plan.returnAt?'Rückfahrt':'Hinfahrt'):plan.repeat?'Ringfahrt':'Hinfahrt',
  onboard:run.onboard.reduce((sum,p)=>sum+p.count,0),awaiting,beforeStart,departureAt,departureRemaining:departureAt===undefined?undefined:Math.max(0,departureAt-time)};
}
export function durationLabel(ms:number){if(!Number.isFinite(ms))return '—';const seconds=Math.max(0,Math.ceil(ms/1000)),h=Math.floor(seconds/3600),m=Math.floor(seconds%3600/60),s=seconds%60;return h?h+' Std. '+m+' Min.':m?m+' Min. '+s+' Sek.':s+' Sek.';}
