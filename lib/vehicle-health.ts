import type {Vehicle} from './fleet';
import type {Mode,WorldState} from './game';
import type {VehicleModel} from './vehicle-models';
export type VehicleHealth={since:number;realCreated:number;estimated?:boolean;km:number;condition:number;at:number;revision?:number;dirty?:boolean};
const DAY=86400000;
const rules:Record<Mode,{annual:number;km:number}>={bus:{annual:1.5,km:.0001},train:{annual:.7,km:.000025},plane:{annual:1,km:.00005},ship:{annual:.6,km:.00004}};
export function newVehicleHealth(time:number,estimated=false):VehicleHealth{return {since:time,realCreated:Date.now(),estimated,km:0,condition:100,at:time,dirty:true};}
export function conditionAt(v:Pick<Vehicle,'mode'|'health'>,time:number){const h=v.health;if(!h)return 100;return Math.max(5,Math.min(100,h.condition-Math.max(0,time-h.at)/DAY/365*rules[v.mode].annual));}
export function vehicleHealthView(v:Pick<Vehicle,'mode'|'health'>,time:number){const h=v.health;return {condition:conditionAt(v,time),km:h?.km||0,years:h?Math.max(0,time-h.since)/DAY/365:0,estimated:!h||!!h.estimated,recorded:!!h};}
export function healthCostFactor(_v:Pick<Vehicle,'mode'|'health'>,_time:number){return 1;}
export function recordVehicleKm(v:Vehicle,km:number,time:number){if(!Number.isFinite(km)||km<0||v.health&&time<v.health.since)return;v.health??=newVehicleHealth(time,true);v.health={...v.health,condition:100,at:time,km:v.health.km+km,dirty:true};}
export function ensureVehicleHealth(state:WorldState){const time=state.simTime||Date.now();for(const c of state.companies)for(const v of c.fleet||[])v.health??=newVehicleHealth(time,true);}
export function stampVehicleHealth(state:WorldState,revision:number){for(const c of state.companies)for(const v of c.fleet||[])if(v.health?.dirty){delete v.health.dirty;v.health.revision=revision;}}
export function mergeHealth(values:(VehicleHealth|undefined)[],mode:Mode,time:number):VehicleHealth{const rows=values.filter(Boolean) as VehicleHealth[];if(!rows.length)return newVehicleHealth(time,true);return {since:Math.min(...rows.map(h=>h.since)),realCreated:Math.min(...rows.map(h=>h.realCreated)),estimated:rows.some(h=>h.estimated),km:Math.max(...rows.map(h=>h.km)),condition:Math.min(...rows.map(h=>conditionAt({mode,health:h},time))),at:time,dirty:true};}
export function vehicleServiceQuote(_v:Vehicle,_model:VehicleModel,_time:number){return {condition:100,cost:0,needed:false};}
export function directVehicleValue(v:Vehicle,_time:number){return Math.floor(v.purchasePrice*.5);}
