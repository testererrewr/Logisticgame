import type {WorldState} from './game';
export function maintenanceFactor(state?:WorldState,time=state?.simTime||Date.now()){
 return state?.maintenanceSince!==undefined&&time<state.maintenanceSince?1:state?.rules?.maintenanceMultiplier??1;
}
