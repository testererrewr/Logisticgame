import {cargoCapacity,checkIntegrity,credit,debit,freeStock,good,kmBetween,log,publicReservedFraction,stock,vehicleCargo,GOODS,VEHICLES,type GoodId,type Line,type PublicFreightBooking,type Site,type State} from './engine';

const PREFIX='public-freight-v1:';
const STORAGE=new Set(['warehouse','warehouseSmall','warehouseMedium','warehouseXL','hub']);
const round=(n:number)=>Math.round(n*100)/100;
export interface PublicFreightStop {index:number;station:Site;sites:Site[]}
export interface PublicFreightVehicle {id:string;name:string;modelId:string;status:string;locationId:string;targetId?:string;etaDay?:number;goods:{id:GoodId;capacity:number}[]}
export interface PublicFreightOffer {ownerId:string;ownerName:string;lineId:string;lineName:string;mode:'rail'|'ship'|'air';pricePerEh:number;departure:Line['departure'];stops:PublicFreightStop[];vehicles:PublicFreightVehicle[]}
export interface PublicFreightLeg {toIndex:number;toStorageId:string;good:GoodId;quantity:number;orderId?:string}

export const publicFreightKey=(worldId:string,userId:string)=>PREFIX+worldId+':'+userId;
export const publicFreightPrefix=(worldId:string)=>PREFIX+worldId+':';

export function directlyAdjacent(a:Site,b:Site){
 if(a.grid&&b.grid&&a.grid.tile===b.grid.tile){const x=a.grid.cell%80,y=Math.floor(a.grid.cell/80),bx=b.grid.cell%80,by=Math.floor(b.grid.cell/80);return bx<=x+a.grid.width&&bx+b.grid.width>=x&&by<=y+a.grid.height&&by+b.grid.height>=y;}
 return kmBetween([a.lat,a.lon],[b.lat,b.lon])<=.15;
}
export function publicStopSites(state:State,line:Line,index:number):Site[]{
 const station=state.sites.find(s=>s.id===line.stops[index]?.siteId&&s.owned);if(!station)return [];
 const privateIds=new Set(line.publicFreight?.privateSiteIds||[]);
 return [station,...state.sites.filter(s=>s.owned&&!s.hidden&&s.id!==station.id&&STORAGE.has(s.kind)&&directlyAdjacent(station,s))].filter(s=>!privateIds.has(s.id));
}
export function publicAdjacentBuildings(state:State,line:Line):Site[]{
 const stationIds=new Set(line.stops.map(s=>s.siteId));return state.sites.filter(s=>s.owned&&!stationIds.has(s.id)&&STORAGE.has(s.kind)&&line.stops.some((_,i)=>{const station=state.sites.find(p=>p.id===line.stops[i].siteId);return !!station&&directlyAdjacent(station,s);}));
}
export function publicOffersFromState(state:State,ownerId:string,ownerName:string):PublicFreightOffer[]{
 return state.lines.filter(l=>l.publicFreight&&l.active&&!l.deleted&&['rail','ship','air'].includes(l.mode)).map(line=>{
  const stops=line.stops.map((_,index)=>({index,station:state.sites.find(s=>s.id===line.stops[index].siteId&&s.owned)!,sites:publicStopSites(state,line,index)})).filter(x=>!!x.station);
  const vehicles=state.vehicles.filter(v=>v.lineId===line.id&&!v.wrecked&&!v.returnLineId&&v.pendingLineId===undefined&&v.status!=='returning').map(v=>{const used=vehicleCargo(v).reduce((n,c)=>n+c.quantity/Math.max(1,cargoCapacity(v,c.good)),0)+publicReservedFraction(state,v);return {id:v.id,name:v.name||VEHICLES.find(m=>m.id===v.modelId)?.name||'Fahrzeug',modelId:v.modelId,status:v.status,locationId:v.locationId,targetId:v.targetId,etaDay:v.etaDay,goods:GOODS.map(g=>({id:g.id,capacity:Math.max(0,Math.floor(cargoCapacity(v,g.id)*Math.max(0,1-used)*100)/100)})).filter(g=>g.capacity>0)};});
  return {ownerId,ownerName,lineId:line.id,lineName:line.name,mode:line.mode as 'rail'|'ship'|'air',pricePerEh:line.publicFreight!.pricePerEh,departure:line.departure,stops,vehicles};
 }).filter(o=>o.stops.length>=2&&o.vehicles.length>0);
}
export function publicFreightStatement(db:D1Database,state:State,worldId:string,userId:string,ownerName:string,updated:number){return db.prepare('INSERT INTO logistics_runtime(id,updated,payload) VALUES(?,?,?) ON CONFLICT(id) DO UPDATE SET updated=excluded.updated,payload=excluded.payload').bind(publicFreightKey(worldId,userId),updated,JSON.stringify(publicOffersFromState(state,userId,ownerName)));}
export async function readPublicFreightOffers(db:D1Database,worldId:string){const prefix=publicFreightPrefix(worldId),rows=(await db.prepare('SELECT payload FROM logistics_runtime WHERE id>=? AND id<?').bind(prefix,prefix+'\uffff').all<{payload:string}>()).results;return rows.flatMap(row=>{try{return JSON.parse(row.payload) as PublicFreightOffer[];}catch{return [];}});}

export function refreshPublicAccess(state:State,offers:PublicFreightOffer[],selfId:string){
 const allowed=new Map<string,{site:Site;ownerId:string}>();for(const offer of offers)if(offer.ownerId!==selfId)for(const stop of offer.stops)for(const site of stop.sites)allowed.set(site.id,{site,ownerId:offer.ownerId});
 for(const site of state.sites.filter(s=>s.publicAccess)){
  const current=allowed.get(site.id),hasStock=Object.values(state.inventory[site.id]||{}).some(q=>(q||0)>0),hasBooking=(state.publicFreightBookings||[]).some(b=>b.customerId===selfId&&b.status!=='arrived'&&(b.fromStorageId===site.id||b.toStorageId===site.id));
  if(current){Object.assign(site,{name:current.site.name,kind:current.site.kind,lat:current.site.lat,lon:current.site.lon,grid:current.site.grid,cooperative:true,operatorId:current.ownerId});continue;}
  if(!hasStock&&!hasBooking){site.cooperative=site.publicOriginalCooperative||false;site.operatorId=site.cooperative?site.operatorId:undefined;site.publicAccess=false;}
 }
 for(const [id,{site,ownerId}] of allowed){const existing=state.sites.find(s=>s.id===id);if(existing){if(!existing.owned){existing.publicOriginalCooperative??=!!existing.cooperative;existing.cooperative=true;existing.publicAccess=true;existing.operatorId=ownerId;}continue;}state.sites.push({...site,owned:false,cooperative:true,operatorId:ownerId,publicAccess:true,publicOriginalCooperative:false});}
}

function linePortion(line:Line,state:State,from:number,to:number){let segment=0,total=0;for(let i=0;i<line.stops.length-1;i++){const a=state.sites.find(s=>s.id===line.stops[i].siteId),b=state.sites.find(s=>s.id===line.stops[i+1].siteId),km=a&&b?kmBetween([a.lat,a.lon],[b.lat,b.lon]):0;total+=km;if(i>=from&&i<to)segment+=km;}return Math.max(.1,Math.min(1,total>0?segment/total:1));}
export function bookPublicFreight(customer:State,operator:State,operatorId:string,customerId:string,lineId:string,vehicleId:string,fromIndex:number,fromStorageId:string,legs:PublicFreightLeg[],requestId:string){
 if(operatorId===customerId)throw Error('Eigene Fracht fährt direkt über deine eigene Linie.');
 const line=operator.lines.find(l=>l.id===lineId&&l.active&&!l.deleted&&l.publicFreight),vehicle=operator.vehicles.find(v=>v.id===vehicleId&&v.lineId===lineId&&!v.wrecked&&!v.returnLineId&&v.pendingLineId===undefined&&v.status!=='returning');
 if(!line||!vehicle)throw Error('Öffentliche Linie oder Fahrzeug nicht verfügbar.');
 if(!Number.isInteger(fromIndex)||fromIndex<0||fromIndex>=line.stops.length-1||!publicStopSites(operator,line,fromIndex).some(s=>s.id===fromStorageId))throw Error('Öffentlichen Abfahrthalt auswählen.');
 if(!Array.isArray(legs)||!legs.length||legs.length>10)throw Error('1 bis 10 Entladeziele auswählen.');
 if((operator.publicFreightBookings||[]).filter(b=>['waiting','onboard'].includes(b.status)).length+legs.length>500)throw Error('Diese Linie hat derzeit zu viele offene Buchungen.');
 const onboard=vehicleCargo(vehicle).reduce((n,c)=>n+c.quantity/Math.max(1,cargoCapacity(vehicle,c.good)),0);
 let charge=0;const selected=new Map<string,number>(),freeSelected=new Map<string,number>(),lotSelected=new Map<string,number>(),made:PublicFreightBooking[]=[];
 for(const [i,leg] of legs.entries()){
  if(!Number.isInteger(leg.toIndex)||leg.toIndex<=fromIndex||leg.toIndex>=line.stops.length||!publicStopSites(operator,line,leg.toIndex).some(s=>s.id===leg.toStorageId))throw Error('Späteren öffentlichen Zielhalt auswählen.');
  if(!GOODS.some(g=>g.id===leg.good)||!Number.isFinite(leg.quantity)||leg.quantity<.01||leg.quantity>100000||Math.abs(round(leg.quantity)-leg.quantity)>.000001)throw Error('Gültiges Gut und 0,01 bis 100.000 EH je Ziel wählen.');
  const cap=cargoCapacity(vehicle,leg.good);if(cap<=0)throw Error('Dieses Fahrzeug kann '+good(leg.good).name+' nicht transportieren.');
  const key=leg.good,already=selected.get(key)||0;if(already+leg.quantity>stock(customer,fromStorageId,leg.good)+.000001)throw Error('Zu wenig Ware am Abfahrthalt.');if(leg.orderId){const contract=customer.contracts.find(c=>c.id===leg.orderId&&c.kind==='haulage'&&!c.cancelled&&(c.good||'containers')===leg.good&&c.endDay>=customer.day);if(!contract)throw Error('Auftragsfracht nicht gefunden.');const lotKey=leg.orderId,lot=customer.consignments[fromStorageId]?.[lotKey]||0;if((lotSelected.get(lotKey)||0)+leg.quantity>lot+.000001)throw Error('Zu wenig Auftragsfracht am Abfahrthalt.');lotSelected.set(lotKey,(lotSelected.get(lotKey)||0)+leg.quantity);}else{const free=(freeSelected.get(key)||0)+leg.quantity;if(free>freeStock(customer,fromStorageId,leg.good)+.000001)throw Error('Zu wenig freie Ware am Abfahrthalt.');freeSelected.set(key,free);}selected.set(key,already+leg.quantity);
  const fare=Math.max(.01,round(leg.quantity*line.publicFreight!.pricePerEh*linePortion(line,operator,fromIndex,leg.toIndex)));charge+=fare;
  made.push({id:`${requestId}-${i}`,operatorId,customerId,lineId,vehicleId,fromStationId:line.stops[fromIndex].siteId,toStationId:line.stops[leg.toIndex].siteId,fromStorageId,toStorageId:leg.toStorageId,fromIndex,toIndex:leg.toIndex,good:leg.good,quantity:leg.quantity,orderId:leg.orderId,fare,status:'waiting',createdDay:operator.day});
  for(let segment=0;segment<line.stops.length-1;segment++){const reserved=[...(operator.publicFreightBookings||[]),...made].filter(b=>b.vehicleId===vehicleId&&b.status==='waiting'&&b.fromIndex<=segment&&b.toIndex>segment).reduce((n,b)=>n+b.quantity/Math.max(1,cargoCapacity(vehicle,b.good)),0);if(onboard+reserved>1.000001)throw Error('Für diese Abfahrt ist auf einem Teilstück nicht genug freie Fahrzeugkapazität vorhanden.');}
 }
 if(customer.cash+1e-6<charge)throw Error('Zu wenig Geld für den Transportpreis.');
 debit(customer,round(charge),'Öffentliche Frachtlinie');
 for(const b of made){customer.inventory[fromStorageId]??={};customer.inventory[fromStorageId][b.good]=round(stock(customer,fromStorageId,b.good)-b.quantity);if(b.orderId){customer.consignments[fromStorageId]??={};customer.consignments[fromStorageId][b.orderId]=round((customer.consignments[fromStorageId][b.orderId]||0)-b.quantity);}}
 operator.publicFreightBookings??=[];customer.publicFreightBookings??=[];operator.publicFreightBookings.push(...structuredClone(made));customer.publicFreightBookings.push(...structuredClone(made));
 log(customer,`${made.length} Frachtbuchung${made.length===1?'':'en'} auf ${line.name} · ${round(charge).toLocaleString('de-DE')} € Fahrpreis reserviert.`,'good');
 checkIntegrity(customer);checkIntegrity(operator);return made;
}
export function cancelPublicBooking(customer:State,operator:State,customerId:string,bookingId:string){
 const own=customer.publicFreightBookings?.find(b=>b.id===bookingId&&b.customerId===customerId&&b.status==='waiting');if(!own)throw Error('Nur wartende eigene Buchungen können storniert werden.');
 const remote=operator.publicFreightBookings?.find(b=>b.id===bookingId&&b.operatorId===own.operatorId&&b.status==='waiting');if(!remote)throw Error('Die Buchung wurde bereits verladen oder geändert.');
 own.status='cancelled';remote.status='cancelled';remote.settled=true;credit(customer,own.fare,'Öffentliche Frachtlinie');customer.inventory[own.fromStorageId]??={};customer.inventory[own.fromStorageId][own.good]=round(stock(customer,own.fromStorageId,own.good)+own.quantity);if(own.orderId){customer.consignments[own.fromStorageId]??={};customer.consignments[own.fromStorageId][own.orderId]=round((customer.consignments[own.fromStorageId][own.orderId]||0)+own.quantity);}log(customer,`Öffentliche Frachtbuchung storniert · ${money(own.fare)} erstattet.`,'info');checkIntegrity(customer);
}
const money=(n:number)=>n.toLocaleString('de-DE',{minimumFractionDigits:2,maximumFractionDigits:2})+' €';
export function validatePublicOperatorState(state:State){for(const b of state.publicFreightBookings||[])if(['waiting','onboard'].includes(b.status)&&state.lines.some(l=>l.id===b.lineId)){const l=state.lines.find(l=>l.id===b.lineId),v=state.vehicles.find(v=>v.id===b.vehicleId);if(!l?.active||l.deleted||!l.publicFreight||!v||v.lineId!==l.id||v.pendingLineId!==undefined||v.returnLineId||l.stops[b.fromIndex]?.siteId!==b.fromStationId||l.stops[b.toIndex]?.siteId!==b.toStationId)throw Error('Öffentliche Linie hat noch offene Buchungen. Fahrzeug und Halte dürfen nicht entfernt werden.');}}
