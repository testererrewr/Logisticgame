import {assetListed} from './asset-auctions';
import {aircraftRange} from './aircraft-range.mjs';
import {sphericalDistance} from './geography';
import {newVehicleHealth,vehicleServiceQuote,directVehicleValue} from './vehicle-health';
import {refitTrain,sellTrainStock,type ComponentValue} from './train-workshop';
import {requireDepotSpace} from './depots';
import {sharedCompany,companyWorld} from './infrastructure-context';
import {railRoute} from './rail-network';
import {depotForLine,modes,placePoint,type Company,type Facility,type Line,type Mode,type Action} from './game';
import {defaultModel,vehicleModels,vehicleModel,trainConsist,type VehicleModel,type ConsistPart} from './vehicle-models';
export type Vehicle={rangeIssue?:string;health?:import('./vehicle-health').VehicleHealth;listing?:string;componentValues?:ComponentValue[];dailyCost?:number;dailyKm?:number;consist?:ConsistPart[];id:string;mode:Mode;model?:string;name:string;depot:string;line?:string;purchasePrice:number};
export const depotMode=(f:Facility):Mode|undefined=>({busdepot:'bus',traindepot:'train',airdepot:'plane',shipdepot:'ship'} as Record<string,Mode>)[f.type];
export function canDepotServe(c:Company,depot:Facility,line:Line){return depotMode(depot)===line.mode&&depotForLine({...sharedCompany(c),facilities:sharedCompany(c).facilities?.filter(f=>!depotMode(f)||f.id===depot.id)},line)?.id===depot.id;}
export function syncFleet(c:Company,catalog=vehicleModels){
 if(!c.fleet){c.fleet=[];for(const l of c.lines)for(let i=0;i<Math.min(256,Math.max(0,Math.floor(l.vehicles||0)));i++)c.fleet.push({id:crypto.randomUUID(),name:modes[l.mode].name+' '+(c.fleet.length+1),mode:l.mode,depot:depotForLine(c,l)?.id||'legacy',line:l.id,purchasePrice:modes[l.mode].base});}
 const lines=new Map(c.lines.map(l=>[l.id,l])),homes=new Map((c.facilities||[]).map(f=>[f.id,f])),reachable=new Map<string,boolean>(),counts=new Map<string,number>();
 for(const v of c.fleet){v.model=vehicleModel(v,catalog).id;if(v.line){const l=lines.get(v.line),home=homes.get(v.depot),key=v.depot+':'+v.line;if(!reachable.has(key))reachable.set(key,!!l&&!!home&&canDepotServe(c,home,l));let rangeOk=true;if(l?.mode==='plane')try{validateVehicleRoute(c,l,vehicleModel(v,catalog),home);}catch(e:any){rangeOk=false;v.rangeIssue=e.message;}if(!reachable.get(key)||!rangeOk)delete v.line;else counts.set(v.line,(counts.get(v.line)||0)+1);}}
 for(const l of c.lines)l.vehicles=counts.get(l.id)||0;
}
function depotOf(c:Company,id:any){const state=companyWorld(c);if(state&&assetListed(state,id))throw Error('Dieses Depot wird versteigert. Es können keine Fahrzeuge eingelagert werden.');const depot=c.facilities?.find(f=>f.id===id);if(!depot||!depotMode(depot))throw Error('Wähle ein eigenes Fahrzeugdepot.');return depot;}
function target(c:Company,depot:Facility,id:any,vehicle?:string){const l=c.lines.find(l=>l.id===id);if(!l||!canDepotServe(c,depot,l))throw Error('Die Linie ist von diesem Depot nicht erreichbar oder hat einen anderen Fahrzeugtyp.');return l;}
export function handleFleetAction(c:Company,a:Action,catalog=vehicleModels,limit=20000,time=Date.now()){
 if(!a.type.startsWith('vehicle-'))return false;syncFleet(c,catalog);

 if(a.type==='vehicle-refit'){refitTrain(c,a,catalog,time);syncFleet(c,catalog);return true;}if(a.type==='vehicle-stock-sell'){sellTrainStock(c,a,time);return true;}
 if(a.type==='vehicle-batch'){
  if(!Array.isArray(a.vehicles)||!a.vehicles.length||a.vehicles.length>5000||new Set(a.vehicles).size!==a.vehicles.length)throw Error('Wähle 1–5.000 verschiedene Fahrzeuge.');
  const ids=new Set(a.vehicles),selected=c.fleet!.filter(v=>ids.has(v.id));if(selected.length!==ids.size)throw Error('Nur eigene Fahrzeuge sind erlaubt.');if(!['assign','return','move','sell'].includes(a.command))throw Error('Ungültiger Sammelbefehl.');
  let destination:Facility|undefined;if(a.command==='move'){destination=depotOf(c,a.depot);requireDepotSpace(c,destination,selected.filter(v=>v.depot!==destination!.id).length);}
  if(selected.some(v=>v.listing))throw Error('Ziehe das Fahrzeugangebot zuerst zurück.');const assignments=new Map<string,Line>(),checkedModels=new Set<string>();for(const v of selected){if(a.command==='assign'){const home=depotOf(c,v.depot);let line=assignments.get(home.id);if(!line){line=target(c,home,a.line);assignments.set(home.id,line);}const key=home.id+':'+v.model+':'+JSON.stringify(v.consist||[]);if(!checkedModels.has(key)){validateVehicleRoute(c,line,vehicleModel(v,catalog),home);checkedModels.add(key);}}if(['move','sell'].includes(a.command)&&v.line)throw Error('Zuerst alle ausgewählten Fahrzeuge ins Depot zurückschicken.');if(destination&&depotMode(destination)!==v.mode)throw Error('Der Depottyp passt nicht zu allen ausgewählten Fahrzeugen.');}
  for(const v of selected){if(a.command==='assign')v.line=a.line;else if(a.command==='return')delete v.line;else if(a.command==='move')v.depot=destination!.id;}
  if(a.command==='sell'){c.cash+=selected.reduce((sum,v)=>sum+directVehicleValue(v,time),0);c.fleet=c.fleet!.filter(v=>!ids.has(v.id));}syncFleet(c,catalog);return true;
 }
 if(a.type==='vehicle-buy'){
  const depot=depotOf(c,a.depot),mode=depotMode(depot)!,quantity=a.quantity===undefined?1:a.quantity;
  if(!Number.isInteger(quantity)||quantity<1||quantity>limit)throw Error('Ungültige Stückzahl.');
  if(c.fleet!.length+quantity>limit)throw Error('Weltenlimit: maximal '+limit+' Fahrzeuge pro Unternehmen.');
  requireDepotSpace(c,depot,quantity);let consist:ConsistPart[]|undefined;
  if(a.consist!==undefined){if(mode!=='train'||!Array.isArray(a.consist)||a.consist.length<1||a.consist.length>20)throw Error('Ungültiger Zugverband.');consist=a.consist.map((p:any)=>{if(!p||typeof p.model!=='string'||!Number.isInteger(p.count)||p.count<1||p.count>20||!catalog.some(m=>m.id===p.model&&m.mode==='train'&&m.available))throw Error('Ungültiger Zugbaustein.');return {model:p.model,count:p.count};});if(consist!.reduce((n,p)=>n+p.count,0)>32)throw Error('Maximal 32 Fahrzeuge je Zugverband.');}
  const model=consist?trainConsist(consist,catalog):a.model===undefined?defaultModel(mode,catalog):catalog.find(m=>m.id===a.model&&m.mode===mode&&m.available);if(!model)throw Error('Wähle ein gültiges Fahrzeugmodell für diesen Depottyp.');if(mode==='train'&&(model.trainRole==='coach'||model.capacity<=0))throw Error('Ein Personenzug braucht Antrieb und Fahrgastplätze.');
  const l=a.line?target(c,depot,a.line):undefined;if(l)validateVehicleRoute(c,l,model,depot);const price=model.price,total=price*quantity;if(c.cash<total)throw Error('Nicht genug Kapital für die gesamte Bestellung.');
  const custom=String(a.name||'').trim();if(custom&&(custom.length<2||custom.length>50))throw Error('Fahrzeugname: 2–50 Zeichen.');
  const first=c.fleet!.length+1,vehicles=Array.from({length:quantity},(_,i)=>({id:crypto.randomUUID(),health:newVehicleHealth(time),mode,model:model.id,consist,componentValues:mode==='train'?(consist||[{model:model.id,count:1}]).map(p=>({...p,value:Math.round(catalog.find(m=>m.id===p.model)!.price*p.count*100)/100})):undefined,name:custom?(quantity===1?custom:custom.slice(0,45)+' '+(i+1)):model.name.slice(0,45)+' '+(first+i),depot:depot.id,line:l?.id,purchasePrice:price}));
  c.cash-=total;c.fleet!.push(...vehicles);
 }else{
  const v=c.fleet!.find(v=>v.id===a.vehicle);if(!v)throw Error('Eigenes Fahrzeug nicht gefunden.');
  if(v.listing)throw Error('Ziehe das Fahrzeugangebot zuerst zurück.');if(a.type==='vehicle-service'){throw Error('Manuelle Wartung entfällt. Es gelten automatisch die normalen Wartungskosten des Modells.');}else if(a.type==='vehicle-rename'){const name=String(a.name||'').trim();if(name.length<2||name.length>50)throw Error('Fahrzeugname: 2–50 Zeichen.');v.name=name;}
  else if(a.type==='vehicle-assign'){const depot=depotOf(c,v.depot);const line=target(c,depot,a.line,v.id);validateVehicleRoute(c,line,vehicleModel(v,catalog),depot);v.line=line.id;delete v.rangeIssue;}
  else if(a.type==='vehicle-return')delete v.line;
  else if(a.type==='vehicle-move'){if(v.line)throw Error('Schicke das Fahrzeug zuerst ins Depot zurück.');const d=depotOf(c,a.depot);if(depotMode(d)!==v.mode)throw Error('Der Depottyp passt nicht zum Fahrzeug.');if(d.id!==v.depot)requireDepotSpace(c,d);v.depot=d.id;}
  else if(a.type==='vehicle-sell'){if(v.line)throw Error('Schicke das Fahrzeug vor dem Verkauf ins Depot zurück.');c.cash+=directVehicleValue(v,time);c.fleet=c.fleet!.filter(f=>f.id!==v.id);}
  else throw Error('Unbekannte Fahrzeugaktion.');
 }
 syncFleet(c,catalog);return true;
}

export function validateVehicleRoute(c:Company,l:Line,model:VehicleModel,depot?:Facility){if(l.mode==='plane'){const fs=sharedCompany(c).facilities||[],points=l.stopPoints||l.facilityIds?.flatMap(id=>{const f=fs.find(f=>f.id===id);return f?[f.point]:[];})||[l.a,l.b].flatMap(id=>{const p=placePoint(id);return p?[p]:[];}),legs=l.segmentKm?.length?l.segmentKm:points.slice(1).map((p,i)=>sphericalDistance(points[i],p)/1000),range=aircraftRange(model);if(legs.some(km=>km>range+.001))throw Error(model.name+': Flugabschnitt überschreitet die Spielreichweite von '+range.toLocaleString('de-DE')+' km. Zwischenlandung einplanen.');return;}if(l.mode!=='train')return;if(model.traction==='electric'){if(l.electrified===false)throw Error('Die Strecke ist nicht vollständig elektrifiziert. Wähle Wegpunkte oder einen Dieselzug.');if(depot){const first=l.facilityIds?.[0]||l.fromFacility,route=railRoute(c,depot.id,first,[],true);if(!route)throw Error('Der Weg vom Zugdepot zum Bahnhof ist nicht elektrifiziert.');}}}
