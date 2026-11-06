import {kmBetween,availableToLoad,cargoCapacity,vehicleCargo,type State,type Vehicle,type Line,type Stop,type GoodId} from './engine';
import {isTransferTerminal,queueTerminalTransfer} from './terminal-transfer';
import {activeContainerOrder,loadingContainerOrders} from './container-routing';
import {receivingCapacity} from './cargo-routing';

export function manualLoadingSources(s:State,siteId:string){
 const site=s.sites.find(p=>p.id===siteId);
 return site?[site,...(isTransferTerminal(site)?s.sites.filter(p=>p.id!==site.id&&p.owned&&!p.hidden&&isTransferTerminal(p)&&kmBetween([site.lat,site.lon],[p.lat,p.lon])<=.75):[])]:[];
}

export function selectedGoOrders(s:State,siteIds:string[],selected:string[]|undefined,all:boolean){return selected??(all?s.contracts.filter(c=>activeContainerOrder(s,c)&&siteIds.some(id=>(s.consignments[id]?.[c.id]||0)>0)).map(c=>c.id):[]);}

export function stageManualFreight(s:State,v:Vehicle,line:Line,stop:Stop,goods:GoodId[]|'all',sourceIds:string[]=[]){
 const sources=manualLoadingSources(s,v.locationId),allowed=new Set(sources.slice(1).map(p=>p.id));
 if(!Array.isArray(sourceIds)||sourceIds.length>100||new Set(sourceIds).size!==sourceIds.length||sourceIds.some(id=>!allowed.has(id)))throw Error('Nur benachbarte selbst gebaute eigene Gebäude auswählen.');
 const accepts=(id:string)=>goods==='all'||goods.includes(id);
 let reserved=0;let used=vehicleCargo(v).reduce((n,c)=>n+c.quantity/Math.max(cargoCapacity(v,c.good),1),0),ready=s.day;
 const planned=new Map<string,number>();
 const reserve=(siteId:string,send:boolean,goodId:GoodId)=>{
  for(const id of Object.keys(s.inventory[siteId]||{}).filter(id=>id===goodId&&accepts(id))){
   const cap=cargoCapacity(v,id);if(cap<=0)continue;
   const lots=id==='containers'?loadingContainerOrders(s,v,line,stop,siteId).map(r=>({orderId:r.order.id,quantity:r.quantity})):[{orderId:undefined,quantity:availableToLoad(s,siteId,id)}];
   for(const lot of lots){const key=id+'/'+(lot.orderId||''),already=planned.get(key)||0;
    let qty=Math.min(lot.quantity,availableToLoad(s,siteId,id),Math.max(0,(1-used)*cap),Math.max(0,stop.quantity-already),Math.max(0,receivingCapacity(s,v,line,stop,id,undefined,lot.orderId)-already));
    if(send)qty=Math.min(qty,Math.max(0,s.cash/.25));
    qty=Math.floor((qty+1e-8)*100)/100;if(qty<=0)continue;
    used+=qty/cap;reserved+=qty;planned.set(key,already+qty);
    if(send||sources[0]?.owned)ready=Math.max(ready,queueTerminalTransfer(s,siteId,v.locationId,id,qty,lot.orderId,v.id).etaDay);
   }
  }
 };
 const ids=[v.locationId,...sourceIds],products=[...new Set(ids.flatMap(id=>Object.keys(s.inventory[id]||{})))].filter(accepts).sort((a,b)=>a==='containers'&&v.containerOrderIds?.length?-1:b==='containers'&&v.containerOrderIds?.length?1:0);for(const product of products){reserve(v.locationId,false,product);for(const id of sourceIds)reserve(id,true,product);}
 if(!reserved&&!vehicleCargo(v).length&&((goods==='all'&&v.containerOrderIds?.length)||goods!=='all'&&goods.length))throw Error('Keine ausgewählte Fracht für dieses Fahrzeug mit passendem Ziel verfügbar. Auswahl und Bestände prüfen.');return ready;
}
