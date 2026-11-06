import {storageCapacity,stock,kmBetween,debit,log,vehicleCargo,cargoCapacity,type State,type Site,type GoodId} from './engine';
export interface TerminalTransfer {id:string;fromId:string;toId:string;good:GoodId;quantity:number;orderId?:string;etaDay:number;vehicleId?:string;lineId?:string}
export const MAX_TERMINAL_TRANSFER_KM=.75;
export const isTransferTerminal=(p:Site)=>!!(p.owned||p.cooperative)&&['depot','airDepot','railStation','railDepot','port','inlandPort','shipDepot','airport','hub','warehouse','warehouseSmall','warehouseMedium','warehouseXL'].includes(p.kind);
export const terminalReserved=(s:State,id:string)=>(s.terminalTransfers||[]).filter(t=>t.toId===id&&!t.vehicleId).reduce((n,t)=>n+t.quantity,0);
export function nearbyTerminals(s:State,from:Site){return s.sites.filter(p=>p.id!==from.id&&isTransferTerminal(p)&&kmBetween([from.lat,from.lon],[p.lat,p.lon])<=MAX_TERMINAL_TRANSFER_KM);}
export function queueTerminalTransfer(s:State,fromId:string,toId:string,good:GoodId,quantity:number,orderId?:string,vehicleId?:string){const a=s.sites.find(p=>p.id===fromId),b=s.sites.find(p=>p.id===toId);if(!a||!b||!isTransferTerminal(b)||kmBetween([a.lat,a.lon],[b.lat,b.lon])>MAX_TERMINAL_TRANSFER_KM||!isTransferTerminal(a))throw Error('Eigene oder freigegebene Terminals in höchstens 750 m Entfernung wählen.');if(!Number.isFinite(quantity)||quantity<=0||quantity>1e8||Math.abs(quantity*100-Math.round(quantity*100))>.0001)throw Error('Ungültige Umschlagmenge.');if((s.terminalTransfers?.length||0)>=2000)throw Error('Zu viele laufende Umschläge.');if(stock(s,fromId,good)<quantity)throw Error('Nicht genügend Fracht an diesem Standort.');if(good==='containers'&&(!orderId||!s.contracts.some(c=>c.kind==='haulage'&&c.id===orderId)||(s.consignments[fromId]?.[orderId]||0)<quantity))throw Error('Eine eigene Containercharge mit ausreichendem Bestand wählen.');if(good!=='containers'&&orderId)throw Error('Auftragskennung nur bei Containerfracht.');const v=vehicleId?s.vehicles.find(v=>v.id===vehicleId&&v.status==='idle'&&v.locationId===toId&&v.manualHold):undefined;if(vehicleId&&(!v||!a.owned||!b.owned))throw Error('Go-Ladung nur für ein wartendes eigenes Fahrzeug reservieren.');const stored=Object.values(s.inventory[toId]||{}).reduce<number>((n,q)=>n+(q||0),0);if(!v&&stored+terminalReserved(s,toId)+quantity>storageCapacity(b))throw Error('Am Ziel ist nicht genügend freier Lagerplatz.');if(fromId!==toId)debit(s,Math.round(quantity*.25*100)/100,'Terminalumschlag');s.inventory[fromId][good]=Math.round((stock(s,fromId,good)-quantity)*100)/100;if(orderId)s.consignments[fromId][orderId]=Math.round((s.consignments[fromId][orderId]-quantity)*100)/100;const km=kmBetween([a.lat,a.lon],[b.lat,b.lon]),t:TerminalTransfer={id:crypto.randomUUID(),fromId,toId,good,quantity,orderId,etaDay:s.day+(fromId===toId?0:120+km/10*3600)/86400,vehicleId,lineId:v?.manualHold?.lineId};(s.terminalTransfers??=[]).push(t);log(s,`Nahumschlag gestartet: ${quantity} EH · ${a.name} → ${b.name}`,'info');return t;}
export function finishTerminalTransfers(s:State){
 const arrived=(s.terminalTransfers||[]).filter(t=>t.etaDay<=s.day+1e-10);
 for(const t of arrived){
  const v=t.vehicleId?s.vehicles.find(v=>v.id===t.vehicleId):undefined;
  const release=v?.manualReleased;
  if(v&&release&&v.status==='idle'&&v.locationId===t.toId&&release?.lineId===t.lineId&&s.lines.some(l=>l.id===t.lineId&&l.active&&!l.deleted&&(l.endDay===null||l.endDay>s.day))){
   const cargo=vehicleCargo(v),used=cargo.reduce((n,c)=>n+c.quantity/Math.max(cargoCapacity(v,c.good),c.legacyCapacity||0,1),0),cap=cargoCapacity(v,t.good);
   const loaded=Math.min(t.quantity,Math.floor(Math.max(0,1-used)*cap*100+1e-7)/100);
   if(loaded>0){cargo.push({good:t.good,quantity:loaded,orderId:t.orderId,loadedAtId:t.toId});v.cargo=cargo[0];v.otherCargo=cargo.slice(1);release.loadedQuantity=(release.loadedQuantity||0)+loaded;log(s,`Go: ${loaded} EH direkt aus ${s.sites.find(p=>p.id===t.fromId)?.name||'Nachbarlager'} ins Fahrzeug geladen.`,'good');}
   if(loaded>=t.quantity-.001)continue;
   t.quantity=Math.round((t.quantity-loaded)*100)/100;
  }
  const target=t.vehicleId?t.fromId:t.toId;
  s.inventory[target]??={};s.inventory[target][t.good]=Math.round((stock(s,target,t.good)+t.quantity)*100)/100;
  if(t.orderId){s.consignments[target]??={};s.consignments[target][t.orderId]=Math.round(((s.consignments[target][t.orderId]||0)+t.quantity)*100)/100;}
  log(s,t.vehicleId?`Go-Reservierung zurückgelegt: ${t.quantity} EH`:`Nahumschlag angekommen: ${t.quantity} EH`,'good');
 }
 s.terminalTransfers=(s.terminalTransfers||[]).filter(t=>t.etaDay>s.day+1e-10);
}
