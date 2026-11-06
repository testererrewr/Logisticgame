import {sellVehicle} from './vehicle-sales';
import {requestManualDeparture} from './engine';
import {queueTerminalTransfer} from './terminal-transfer';
import {addTrackPlan,setVehicleContainerOrders,MAX_FLEET_VEHICLES} from './engine.ts';
import {railRoute} from './routing.ts';
import {setReturnLine,updateLineStops,assignFleet,updateLine,renameVehicle,type Line} from './engine.ts';
/** Server-authoritative, allowlisted changes to the independent logistics company.
 * Never accept a client-supplied final economy state. */
import {newState,mergeSites,signSupply,signProcess,signSale,signHaulage,build,addTrack,purchaseVehicle,purchaseFleet,warehouseUpgrade,renameBuilding,cancelContract,configureTrailer,configureTrain,createLine,assignVehicle,cancelLine,stepDay,checkIntegrity, type State,type Site,type Coords,type BuildingKind,type GoodId,type VehicleModelId,type WagonSet,type Mode,type Stop,type RouteLeg} from './engine.ts';
export type OnlineAction=
 |{type:'sellVehicle';vehicleId:string}
 |{type:'manualGo';vehicleId:string;goods:GoodId[]|'all';orderIds?:string[];sourceIds?:string[]}
 |{type:'terminalTransfer';fromId:string;toId:string;good:GoodId;quantity:number;orderId?:string}
 |{type:'discover';center:Coords;radius?:number;query?:string}
 |{type:'supply';siteId:string;good:GoodId;daily:number}
 |{type:'process';siteId:string;recipeId:string;daily:number}
 |{type:'sale';siteId:string;good:GoodId;daily:number}
 |{type:'haulage';from:string;to:string;quantity:number}
 |{type:'build';kind:BuildingKind;point:Coords;rotation?:number;confirmed?:boolean}
 |{type:'trackPlan';points:Coords[];confirmed?:boolean}
 |{type:'track';from:Coords;to:Coords;confirmed?:boolean}
 |{type:'buy';modelId:VehicleModelId;trailerId?:string}
 |{type:'cancelContract';contractId:string}
 |{type:'renameBuilding';siteId:string;name:string}
 |{type:'buyFleet';cooling?:boolean;modelId:VehicleModelId;trailerId?:string;depotId:string;count:number;wagons?:WagonSet[]}
 |{type:'upgradeWarehouse';siteId:string;confirmed:boolean}
 |{type:'trailer';vehicleId:string;trailerId:string}
 |{type:'wagons';vehicleId:string;wagons:WagonSet[]}
 |{type:'line';manualDeparture?:boolean;name:string;mode:Mode;good:GoodId;stops:Stop[];duration:number|null;legs?:RouteLeg[];tripsPerDay?:number|null;tripLimit?:number|null;stopWhenDemandMet?:boolean;stopWhenSourcesEmpty?:boolean}
 |{type:'updateLineStops';manualDeparture?:boolean;lineId:string;stops:Stop[];legs?:RouteLeg[]}
 |{type:'updateLine';lineId:string;settings:Pick<Line,'manualDeparture'|'name'|'tripsPerDay'|'tripLimit'|'stopWhenDemandMet'|'stopWhenSourcesEmpty'> & {duration?:number|null}}
 |{type:'renameVehicle';vehicleId:string;name:string}
 |{type:'setContainerOrders';vehicleId:string;orderIds:string[]|null}
 |{type:'setReturnLine';vehicleId:string;lineId:string}
 |{type:'assign';vehicleId:string;lineId:string}
 |{type:'assignFleet';vehicleIds:string[];lineId:string}
 |{type:'cancel';lineId:string}
 |{type:'tick';days:number};
export type CooperationAction=
 |{type:'offerUsedVehicle';vehicleId:string;price:number}
 |{type:'buyUsedVehicle';offerId:string;depotId:string}
 |{type:'withdrawUsedVehicle';offerId:string;depotId:string}
 |{type:'acceptContainer';offerId:string}
 |{type:'tradeOffer';receiverId:string;siteId:string;good:GoodId;quantity:number;price:number}
 |{type:'acceptTrade';offerId:string}
 |{type:'rejectTrade';offerId:string}
 |{type:'withdrawTrade';offerId:string}
 |{type:'trackPermission';receiverId:string;enabled:boolean};
export type OnlineCommand=OnlineAction|CooperationAction;
export function applyAction(state:State,command:OnlineAction,verifiedSites?:Site[]):State{
 const s=structuredClone(state);
 switch(command.type){
 case 'sellVehicle':sellVehicle(s,command.vehicleId);break;
 case 'manualGo':requestManualDeparture(s,command.vehicleId,command.goods,command.orderIds,command.sourceIds);break;
 case 'terminalTransfer':queueTerminalTransfer(s,command.fromId,command.toId,command.good,command.quantity,command.orderId);break;
 case 'discover': if(!verifiedSites)throw Error('Unternehmensdaten müssen auf dem Server geprüft werden.');mergeSites(s,verifiedSites);break;
 case 'supply':signSupply(s,command.siteId,command.good,command.daily);break;
 case 'process':signProcess(s,command.siteId,command.recipeId,command.daily);break;
 case 'sale':signSale(s,command.siteId,command.good,command.daily);break;
 case 'haulage':signHaulage(s,command.from,command.to,command.quantity);break;
 case 'build':build(s,command.kind,command.point[0],command.point[1],command.rotation||0);break;
 case 'trackPlan':addTrackPlan(s,command.points);break;
 case 'track':addTrack(s,command.from,command.to);break;
 case 'buy':purchaseVehicle(s,command.modelId,command.trailerId);break;
 case 'cancelContract':cancelContract(s,command.contractId);break;
 case 'renameBuilding':renameBuilding(s,command.siteId,command.name);break;
 case 'buyFleet':purchaseFleet(s,command);break;
 case 'upgradeWarehouse':warehouseUpgrade(s,command.siteId,command.confirmed);break;
 case 'trailer':configureTrailer(s,command.vehicleId,command.trailerId);break;
 case 'wagons':configureTrain(s,command.vehicleId,command.wagons);break;
 case 'line':createLine(s,command);break;
 case 'updateLineStops':updateLineStops(s,command.lineId,command.stops,command.legs,command.manualDeparture);break;
 case 'updateLine':updateLine(s,command.lineId,command.settings);break;
 case 'renameVehicle':renameVehicle(s,command.vehicleId,command.name);break;
 case 'setContainerOrders':setVehicleContainerOrders(s,command.vehicleId,command.orderIds===null?undefined:command.orderIds);break;
 case 'setReturnLine':setReturnLine(s,command.vehicleId,command.lineId);break;
 case 'assignFleet':assignFleet(s,command.vehicleIds,command.lineId);break;
 case 'assign':assignVehicle(s,command.vehicleId,command.lineId);break;
 case 'cancel':cancelLine(s,command.lineId);break;
 case 'tick':if(!Number.isInteger(command.days)||command.days<1||command.days>4)throw Error('Maximal vier Tage pro Schritt.');
  // Revoking another company's rail permission must prevent further service
  // on a route that the player's remaining own/permitted track cannot serve.
  for(const line of s.lines.filter(l=>l.active&&l.mode==='rail')){
   const locations=line.stops.map(st=>s.sites.find(site=>site.id===st.siteId));
   if(locations.some(x=>!x)||locations.some((a,i)=>!railRoute([...s.tracks,...(s.borrowedTracks||[])],[a!.lat,a!.lon],[locations[(i+1)%locations.length]!.lat,locations[(i+1)%locations.length]!.lon])))cancelLine(s,line.id);
  }
  for(let i=0;i<command.days;i++)Object.assign(s,stepDay(s));break;
 default:throw Error('Unbekannte Aktion.');
 }
 checkIntegrity(s);
 if(s.sites.length>4000||s.lines.length>400||s.vehicles.length>MAX_FLEET_VEHICLES||s.tracks.length>3000||s.contracts.length>3000)throw Error('Weltlimit erreicht.');
 return s;
}
