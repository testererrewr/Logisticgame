import {canTransfer} from './contracts';
import type {World} from './game';
export function visibleWorld(w:World,id:string,live=false):World{
 const allowed=new Set(w.state.companies.filter(c=>canTransfer(w.state,id,c.id)).flatMap(c=>(c.fleet||[]).map(v=>v.id)));
 return {...w,state:{...w.state,actionReceipts:undefined,routingForecast:undefined,railSectionsSignature:undefined,companies:w.state.companies.map(c=>{const visible=c.id===id?c:{...c,trainStock:undefined};return canTransfer(w.state,id,c.id)?visible:{...visible,vehicleAccounts:undefined};}),messages:(w.state.messages||[]).filter(m=>m.from===id||m.to===id),
  operations:w.state.operations?{...w.state.operations,vehicles:Object.fromEntries(Object.entries(w.state.operations.vehicles).map(([key,run])=>[key,allowed.has(key)?run:{...run,onboard:[],boarded:0,alighted:0,revenue:0}]))}:undefined,
  usage:w.state.usage?{...w.state.usage,vehicles:Object.fromEntries(Object.entries(w.state.usage.vehicles).filter(([id])=>allowed.has(id))),history:live?undefined:w.state.usage.history?Object.fromEntries(Object.entries(w.state.usage.history).map(([day,groups])=>[day,{...groups,vehicles:Object.fromEntries(Object.entries(groups.vehicles).filter(([id])=>allowed.has(id)))}])):undefined}:undefined}};
}
