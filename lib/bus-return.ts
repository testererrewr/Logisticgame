import {busRoute} from './bus-route';
import {getMap} from './real-map';
import {runPlan} from './operations';
import {urbanSpeed,vehicleModel} from './vehicle-models';
import type {WorldState} from './game';

export function enableBusReturns(state:WorldState,time=state.simTime||Date.now()){
 if(state.operations?.backlog)return;
 for(const company of state.companies)for(const line of company.lines){
  if(line.mode!=='bus'||line.routeMode!=='outbound'||!line.stopIds)continue;
  const points=line.routePoints||line.stopIds.map(stopId=>({kind:'stop' as const,stopId}));
  const attempt=JSON.stringify([points,(line.stopAreas||[line.city]).map(key=>key&&getMap(key)?.date)]);
  if(line.returnRouteError&&line.returnRouteAttempt===attempt)continue;
  try{
   const route=busRoute(company,points,'shuttle');
   const vehicles=(company.fleet||[]).filter(v=>v.line===line.id).map(vehicle=>{
    const model=vehicleModel(vehicle,state.vehicleCatalog?.models),speed=line.city?urbanSpeed(model):model.speed;
    return {vehicle,speed,old:runPlan(company,line,speed,model.acceleration,model.braking)};
   });
   Object.assign(line,{routeMode:'shuttle',returnPath:route.returnPath,returnSegmentKm:route.returnSegmentKm,returnLength:route.returnLength});
   delete line.returnRouteError;delete line.returnRouteAttempt;
   for(const {vehicle,speed,old}of vehicles){
    const run=state.operations?.vehicles[vehicle.id],plan=runPlan(company,line,speed,vehicleModel(vehicle,state.vehicleCatalog?.models).acceleration,vehicleModel(vehicle,state.vehicleCatalog?.models).braking);
    if(!run||!old||!plan||run.signature!==old.signature)continue;
    const terminal=old.visits.at(-1)!;
    if(time>=run.epoch+old.duration){
     run.epoch=time-terminal.at;run.next=old.visits.length;run.lastEvent=time;
    }
    run.signature=plan.signature;
   }
   const queue=state.operations?.queues[line.id];if(queue)queue.at=Math.max(queue.at,time);
  }catch(error){
   line.returnRouteError=error instanceof Error?error.message:'Rückfahrt konnte nicht geplant werden.';
   line.returnRouteAttempt=attempt;
  }
 }
}
