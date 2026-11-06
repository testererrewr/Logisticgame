import {serviceQuantity} from './line-coordination';
import {isManualLine} from './manual-line';
import {terminalReserved,nearbyTerminals} from './terminal-transfer';
import {cargoCapacity,demandFor,storageCapacity,vehicleCargo,RECIPES,potentialLoadGoods,type State,type Vehicle,type Line,type Stop,type GoodId} from './engine';
import {remainingDemand,newMarket,type DailyMarket} from './business-rules';
const active=(s:State,c:State['contracts'][number])=>!c.cancelled&&c.startDay<=s.day&&c.endDay>=s.day;
export function receivingCapacity(s:State,v:Vehicle,line:Line,load:Stop,id:GoodId,market?:DailyMarket,orderId?:string){
 const current=line.stops[v.nextStop],index=current?.siteId===load.siteId&&current.action==='load'?v.nextStop:line.stops.findIndex(st=>st.siteId===load.siteId&&st.action==='load');
 if(index<0)return 0;let capacity=0;const seen=new Set<string>(),book=market||s.localMarket||newMarket(s.day);
 for(const st of line.stops.slice(index+1)){const filter=isManualLine(line)?'all':st.good||line.good;if(st.action==='load'||filter!=='all'&&filter!==id||seen.has(st.siteId)||!isManualLine(line)&&(id==='containers'||orderId)&&st.orderIds?.length&&(!orderId||!st.orderIds.includes(orderId)))continue;const p=s.sites.find(p=>p.id===st.siteId);if(!p||p.hidden)continue;seen.add(p.id);let free=0;
  if((p.owned||p.cooperative)&&isManualLine(line))free=Infinity;
  else if(p.owned||p.cooperative){const room=(x:typeof p)=>Math.max(0,storageCapacity(x)-terminalReserved(s,x.id)-Object.values(s.inventory[x.id]||{}).reduce<number>((n,q)=>n+(q||0),0));free=room(p)+nearbyTerminals(s,p).filter(n=>n.owned).reduce((n,x)=>n+room(x),0);}
  else if(id==='containers'||orderId){const c=s.contracts.find(c=>c.id===orderId&&c.kind==='haulage'&&active(s,c)&&c.destinationId===p.id);free=c?Math.max(0,(c.total||0)-c.delivered):0;}
  else{const process=s.contracts.some(c=>c.kind==='process'&&active(s,c)&&c.siteId===p.id&&!!RECIPES.find(r=>r.id===c.recipeId)?.inputs[id]),daily=demandFor(p)[id]||0;if(daily&&(st.action==='sell'||!process))free=remainingDemand(book,p.id,id,daily,s.day);else if(process||p.kind==='warehouse')free=Math.max(0,storageCapacity(p)-terminalReserved(s,p.id)-Object.values(s.inventory[p.id]||{}).reduce<number>((n,q)=>n+(q||0),0));}
  capacity+=Math.min(st.quantity,free,serviceQuantity(s,v,line,line.stops.indexOf(st),id));
 }
 return Math.max(0,capacity-vehicleCargo(v).filter(c=>c.good===id&&(id!=='containers'&&!orderId||c.orderId===orderId)).reduce((n,c)=>n+c.quantity,0));
}
export function firstPotentialLoadStop(s:State,v:Vehicle,line:Line){
 return line.stops.findIndex(st=>{if(st.action!=='load')return false;const p=s.sites.find(p=>p.id===st.siteId);if(!p||p.hidden)return false;const filter=isManualLine(line)?'all':st.good||line.good;if(filter!=='all'&&cargoCapacity(v,filter)>0&&(p.owned||p.cooperative))return true;return potentialLoadGoods(s,p.id).some(g=>(filter==='all'||filter===g.id)&&cargoCapacity(v,g.id)>0);});
}
