import type {Vehicle} from './engine';
export function fleetStatus(v:Vehicle,day:number){
 if(v.status!=='idle')return v.status;
 if(v.manualHold)return 'go';
 if(v.manualReleased||v.manualDepartureReady||v.handlingUntil&&v.handlingUntil>day)return 'handling';
 if(!v.lineId&&!v.returnLineId&&v.pendingLineId===undefined)return v.waitingRoute?'waiting':'idle';
 if(v.restUntil&&v.restUntil>day)return 'rest';
 if(v.restReason||v.waitingForCargo||v.waitingRoute)return 'waiting';
 return 'idle';
}
