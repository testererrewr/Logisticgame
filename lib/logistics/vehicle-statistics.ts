import type {Vehicle} from './engine';

export function vehicleAgeDays(v:Vehicle,now=Date.now()){
 return Math.max(0,Math.floor((now-(v.purchasedAt??v.statisticsSince??now))/86400000));
}
function legDistance(v:Vehicle,day:number){
 if(!['enroute','returning'].includes(v.status)||v.departDay===undefined||v.etaDay===undefined||!v.currentLeg)return 0;
 const fraction=Math.max(0,Math.min(1,(day-v.departDay)/Math.max(1e-12,v.etaDay-v.departDay)));
 return Math.max(0,v.currentLeg.km)*fraction;
}
export function ensureVehicleStatistics(v:Vehicle,day:number,now=Date.now()){
 v.statisticsSince??=v.purchasedAt??now;
 if(v.odometerKm===undefined){v.odometerKm=0;v.legRecordedKm=legDistance(v,day);}
 v.transportedEh??=0;
}
export function recordVehicleDistance(v:Vehicle,day:number){
 const distance=legDistance(v,day);
 const delta=Math.max(0,distance-(v.legRecordedKm||0));v.odometerKm=(v.odometerKm||0)+delta;if(v.trailerUnit)v.trailerUnit.odometerKm=(v.trailerUnit.odometerKm||0)+delta;
 v.legRecordedKm=distance;
}
export function recordTransportedEh(v:Vehicle,quantity:number,origin:string|undefined,destination:string){
 if(quantity>0&&origin!==destination){v.transportedEh=Math.round(((v.transportedEh||0)+quantity)*1000000)/1000000;if(v.trailerUnit)v.trailerUnit.transportedEh=Math.round(((v.trailerUnit.transportedEh||0)+quantity)*1000000)/1000000;}
}
