import {VEHICLES,kmBetween,hash,log,vehicleCargo,depotFor,startReturn,legPoint,purchaseVehicle,type State,type Vehicle,type Coords,type Site} from './engine';
import {recordFinance} from './finance';
import {dealerValue} from './vehicle-sales';

export const SERVICE_INTERVAL_KM=15000;
export const SERVICE_WARN_KM=14000;
export const SERVICE_HOURS=6;
export type BreakdownOption='tow'|'mobile'|'continue';
export type BreakdownPolicy='ask'|BreakdownOption;
export type DamageLevel='minor'|'medium'|'major'|'total';
export interface Incident {id:string;vehicleId:string;day:number;level:DamageLevel;title:string;text:string;options:BreakdownOption[];point?:Coords;depotId?:string;depotKm:number;costs:Partial<Record<BreakdownOption,number>>;resolved?:string;seen?:boolean;auto?:boolean}
export interface ServiceJob {stage:'requested'|'toDepot'|'servicing';when:'now'|'afterShift';depotId?:string;untilDay?:number;resume?:{lineId?:string;returnLineId?:string;onReturnRoute?:boolean;nextStop:number}}

const DAMAGES:Record<DamageLevel,{names:string[];options:BreakdownOption[];repair:number;towHours:number;mobileHours:number}>={
 minor:{names:['Reifenpanne','Elektrikstörung','Druckluftleck','Defekte Lichtanlage','Leichter Unfall (Blechschaden)'],options:['tow','mobile','continue'],repair:480,towHours:3,mobileHours:1.5},
 medium:{names:['Bremsdefekt','Kühlsystem überhitzt','Turbolader-Störung','AdBlue-System defekt','Unfall mit Sachschaden'],options:['tow','mobile'],repair:2300,towHours:8,mobileHours:2.5},
 major:{names:['Motorschaden','Getriebeschaden','Achsbruch','Schwerer Unfall'],options:['tow'],repair:9800,towHours:24,mobileHours:0},
 total:{names:['Unfall mit Totalschaden','Fahrzeugbrand','Schwerer Unfall – Zugmaschine zerstört'],options:[],repair:0,towHours:0,mobileHours:0},
};
export const OPTION_NAMES:Record<BreakdownOption,string>={tow:'Abschleppen',mobile:'Mobile Pannenhilfe vor Ort',continue:'Weiterfahren bis Tagesende'};
export const POLICY_NAMES:Record<BreakdownPolicy,string>={ask:'Jedes Mal fragen',tow:'Immer abschleppen',mobile:'Mobile Pannenhilfe vor Ort',continue:'Weiterfahren bis Tagesende'};

const round2=(n:number)=>Math.round(n*100)/100;
const isRoad=(v:Vehicle)=>{const m=VEHICLES.find(x=>x.id===v.modelId)?.mode;return m==='truck'||m==='van';};
const spec=(v:Vehicle)=>VEHICLES.find(x=>x.id===v.modelId)!;
const scale=(v:Vehicle)=>Math.min(2.5,Math.max(.35,spec(v).price/130000));
const rand=(key:string)=>{let h=hash(key);h^=h>>>16;h=Math.imul(h,0x85ebca6b);h^=h>>>13;h=Math.imul(h,0xc2b2ae35);h^=h>>>16;return (h>>>0)/4294967296;};
function charge(s:State,amount:number,category:string){amount=round2(amount);if(amount<=0)return 0;recordFinance(s,amount,false,category);s.cash-=amount;s.spent+=amount;return amount;}

export function kmSinceService(v:Vehicle){return Math.max(0,(v.odometerKm||0)-(v.lastServiceKm??0));}
export function serviceDue(v:Vehicle){return isRoad(v)&&!v.wrecked&&kmSinceService(v)>=SERVICE_WARN_KM;}
export function serviceCost(v:Vehicle){const m=spec(v);return round2((m.mode==='van'?380:m.attachment==='body'?950:1450)*Math.min(1.6,Math.max(.8,scale(v))));}
function vehiclePoint(s:State,v:Vehicle):Coords|undefined{const p=legPoint(v,s.day);if(p)return p;const site=s.sites.find(x=>x.id===v.locationId);return site?[site.lat,site.lon]:undefined;}
function nearestDepot(s:State,v:Vehicle,point?:Coords):{depot?:Site;km:number}{const mode=spec(v).mode;if(!point)return {depot:s.sites.find(p=>p.id===v.homeDepotId),km:0};const here={id:'_',lat:point[0],lon:point[1]} as Site;const depot=depotFor(s,mode,here);return {depot,km:depot?kmBetween(point,[depot.lat,depot.lon]):0};}

export function ensureMaintenance(v:Vehicle){if(v.lastServiceKm===undefined){const km=v.odometerKm||0;v.lastServiceKm=km-(km%SERVICE_INTERVAL_KM);}v.riskCheckedKm??=v.odometerKm||0;}

function freeze(v:Vehicle,dt:number){if(v.departDay!==undefined)v.departDay+=dt;if(v.etaDay!==undefined)v.etaDay+=dt;}
function towCost(v:Vehicle,km:number){return round2((220+4.8*km)*Math.min(1.5,Math.max(.7,scale(v))));}
function mobileCost(v:Vehicle,km:number){return round2((140+1.3*km)*Math.min(1.4,Math.max(.7,scale(v))));}
function repairCost(v:Vehicle,level:DamageLevel){return round2(DAMAGES[level].repair*scale(v));}

function createIncident(s:State,v:Vehicle,level:DamageLevel){
 const point=vehiclePoint(s,v),{depot,km}=nearestDepot(s,v,point),d=DAMAGES[level],name=d.names[Math.floor(rand(v.id+':name:'+Math.floor(v.odometerKm||0))*d.names.length)],m=spec(v);
 const repair=repairCost(v,level),costs:Partial<Record<BreakdownOption,number>>={};
 if(d.options.includes('tow'))costs.tow=round2(towCost(v,km)+repair*1.1);
 if(d.options.includes('mobile'))costs.mobile=round2(mobileCost(v,km)+repair*.8);
 if(d.options.includes('continue'))costs.continue=round2(repair*.6);
 const accident=/Unfall/.test(name);const incident:Incident={id:'inc-'+v.id+'-'+Math.floor(s.day*1440),vehicleId:v.id,day:s.day,level,title:level==='total'?'Totalverlust: '+name:accident?name:'Panne: '+name,text:level==='total'?`${v.name||m.name} ist nicht mehr fahrbereit. Die Ladung ist gesichert. Wähle ein Ersatzfahrzeug, das Ladung und Linie übernimmt.`:`${v.name||m.name} steht mit ${name} ${point?'unterwegs':'am Standort'}. Nächstes Depot: ${depot?.name||'keines'} (${Math.round(km)} km).`,options:d.options,point,depotId:depot?.id,depotKm:round2(km),costs};
 (s.incidents??=[]).push(incident);if(s.incidents.length>200)s.incidents=s.incidents.filter(i=>!i.resolved||!i.seen).slice(-200);
 v.breakdown={incidentId:incident.id,level,stage:'waiting',since:s.day};v.restReason=incident.title;
 log(s,`${incident.title} · ${v.name||m.name}`,'warn');
 const policy=s.breakdownPolicy||'ask';
 if(level!=='total'&&policy!=='ask'&&d.options.includes(policy)){resolveIncident(s,incident.id,{option:policy});incident.auto=true;}
 return incident;
}

function finishRepair(s:State,v:Vehicle,toFirstStop:boolean){v.breakdown=undefined;v.restReason=undefined;if(toFirstStop){v.nextStop=0;v.onReturnRoute=false;}}

function towToDepot(s:State,v:Vehicle,incident:Incident){
 const depot=s.sites.find(p=>p.id===incident.depotId)||s.sites.find(p=>p.id===v.homeDepotId);
 v.status='idle';v.currentLeg=undefined;v.currentStop=undefined;v.targetId=undefined;v.etaDay=undefined;v.departDay=undefined;v.legRecordedKm=0;v.dailyRestReturning=false;v.dailyRestTargetId=undefined;v.handlingUntil=undefined;v.manualHold=undefined;v.manualReleased=undefined;
 if(depot)v.locationId=depot.id;
 v.breakdown={incidentId:incident.id,level:incident.level,stage:'repair',since:s.day,untilDay:s.day+DAMAGES[incident.level].towHours/24,toFirstStop:true};v.restReason='In Reparatur (abgeschleppt)';
}

export function resolveIncident(s:State,incidentId:string,choice:{option?:BreakdownOption;replacementId?:string|'buy'|'none'}){
 const incident=(s.incidents||[]).find(i=>i.id===incidentId);if(!incident||incident.resolved)throw Error('Dieser Vorfall ist bereits erledigt.');
 const v=s.vehicles.find(x=>x.id===incident.vehicleId);if(!v||v.breakdown?.incidentId!==incident.id)throw Error('Fahrzeug nicht gefunden.');
 const m=spec(v),label=v.name||m.name;
 if(incident.level==='total'){
  if(!choice.replacementId)throw Error('Bei Totalverlust ein Ersatzfahrzeug wählen (oder „ohne Ersatz“).');
  const cargo=vehicleCargo(v),from=v.currentLeg?.fromId||v.locationId,target=s.sites.find(p=>p.id===from)||s.sites.find(p=>p.id===incident.depotId);
  const semi=m.attachment==='semi'&&!!v.trailerId,unit=semi?(v.trailerUnit||{id:'tr-'+v.id,specId:v.trailerId!,odometerKm:v.odometerKm||0,transportedEh:v.transportedEh||0,purchasedAt:v.purchasedAt||Date.now()}):undefined;
  let replacement:Vehicle|undefined,trailerNote='';
  if(choice.replacementId==='buy'){const depot=s.sites.find(p=>p.id===incident.depotId)||s.sites.find(p=>p.id===v.homeDepotId);replacement=purchaseVehicle(s,m.id,semi?undefined:v.trailerId,depot?.id,v.wagons,v.cooling);}
  else if(choice.replacementId&&choice.replacementId!=='none'){replacement=s.vehicles.find(x=>x.id===choice.replacementId&&x.id!==v.id);if(!replacement||replacement.wrecked||replacement.breakdown||replacement.status!=='idle'||spec(replacement).mode!==m.mode)throw Error('Ein freies, fahrbereites Fahrzeug derselben Art wählen.');if(replacement.lineId||vehicleCargo(replacement).length)throw Error('Das Ersatzfahrzeug muss leer und ohne Linie sein.');}
  const recovery=charge(s,towCost(v,incident.depotKm)+250,'Pannen & Reparaturen');
  if(replacement){
   replacement.otherCargo=cargo.slice(1);replacement.cargo=cargo[0];
   if(unit){const rs=spec(replacement);if(rs.attachment==='semi'&&!replacement.trailerId){const {locationId,...attached}=unit as typeof unit&{locationId?:string};void locationId;replacement.trailerId=unit.specId;replacement.trailerUnit=attached;replacement.trailerDetached=undefined;trailerNote=' · Auflieger unbeschädigt angehängt';}else if(incident.depotId){(s.trailers??=[]).push({...unit,locationId:incident.depotId});trailerNote=' · unbeschädigter Auflieger im Depot abgestellt';}}
   if(target)replacement.locationId=target.id;replacement.status='idle';replacement.lineId=v.lineId;replacement.returnLineId=v.returnLineId;replacement.onReturnRoute=v.onReturnRoute;replacement.nextStop=v.nextStop;replacement.containerOrderIds=v.containerOrderIds;
   incident.resolved=`Ersatz: ${replacement.name||spec(replacement).name} übernimmt Ladung und Linie${trailerNote} · Bergung ${recovery.toLocaleString('de-DE')} €`;
  }else{
   const depot=s.sites.find(p=>p.id===incident.depotId);if(depot){s.inventory[depot.id]??={};for(const c of cargo){s.inventory[depot.id][c.good]=round2((s.inventory[depot.id][c.good]||0)+c.quantity);if(c.orderId){s.consignments??={};s.consignments[depot.id]??={};s.consignments[depot.id][c.orderId]=round2((s.consignments[depot.id][c.orderId]||0)+c.quantity);}}}
   if(unit&&depot)(s.trailers??=[]).push({...unit,locationId:depot.id});
   incident.resolved=`Ohne Ersatz · Ladung${unit?' und unbeschädigter Auflieger':''} ins Depot ${depot?.name||''} geborgen · ${recovery.toLocaleString('de-DE')} €`;
  }
  if(unit){v.trailerId=undefined;v.trailerUnit=undefined;v.trailerDetached=true;}
  if(v.lease){v.lease=undefined;incident.resolved+=' · Leasingvertrag durch Versicherung beendet';}
  v.cargo=undefined;v.otherCargo=[];v.wrecked=true;v.breakdown=undefined;v.lineId=undefined;v.returnLineId=undefined;v.onReturnRoute=false;v.pendingLineId=undefined;v.status='idle';v.currentLeg=undefined;v.currentStop=undefined;v.targetId=undefined;v.etaDay=undefined;v.departDay=undefined;v.service=undefined;v.restReason='Totalschaden – nur noch an den Händler verkaufbar';
  if(incident.depotId)v.locationId=incident.depotId;
  log(s,`${label}: ${incident.resolved}`,'warn');return incident;
 }
 const option=choice.option;if(!option||!incident.options.includes(option))throw Error('Diese Option ist bei diesem Schaden nicht möglich.');
 const repair=repairCost(v,incident.level);
 if(option==='tow'){const paid=charge(s,towCost(v,incident.depotKm)+repair*1.1,'Pannen & Reparaturen');towToDepot(s,v,incident);incident.resolved=`Abgeschleppt ins Depot · ${paid.toLocaleString('de-DE')} € · danach weiter ab der ersten Station der Linie`;}
 else if(option==='mobile'){const ok=rand(incident.id+':mobile')<.75;let paid=charge(s,mobileCost(v,incident.depotKm)+repair*.8,'Pannen & Reparaturen');if(ok){v.breakdown={incidentId:incident.id,level:incident.level,stage:'repair',since:s.day,untilDay:s.day+DAMAGES[incident.level].mobileHours/24,frozen:true};v.restReason='Mobile Pannenhilfe repariert vor Ort';incident.resolved=`Vor Ort repariert · ${paid.toLocaleString('de-DE')} €`;}else{paid+=charge(s,towCost(v,incident.depotKm)+repair*.3,'Pannen & Reparaturen');towToDepot(s,v,incident);incident.resolved=`Reparatur vor Ort gescheitert – abgeschleppt · insgesamt ${paid.toLocaleString('de-DE')} €`;}}
 else{v.breakdown=undefined;v.limping={level:incident.level,day:Math.floor(s.day),incidentId:incident.id};v.restReason=undefined;incident.resolved='Weiterfahrt bis Tagesende · Reparatur am Abend (günstiger, aber Risiko eines schwereren Schadens)';}
 log(s,`${label}: ${incident.resolved}`,option==='continue'?'warn':'info');
 return incident;
}

export function requestService(s:State,ids:string[],when:'now'|'afterShift'){if(s.maintenanceOff)throw Error('Wartung und Pannen sind in dieser Welt ausgeschaltet.');
 if(!Array.isArray(ids)||!ids.length||ids.length>10000)throw Error('Fahrzeuge auswählen.');
 let n=0;for(const id of ids){const v=s.vehicles.find(x=>x.id===id);if(!v||!isRoad(v)||v.wrecked)continue;if(v.service&&v.service.stage!=='requested')continue;v.service={stage:'requested',when};n++;}
 if(!n)throw Error('Nur fahrbereite LKW und Transporter können gewartet werden.');
 log(s,`${n} Fahrzeug(e) zur Wartung ${when==='now'?'geschickt':'nach Schichtende vorgemerkt'}.`,'info');return n;
}
export function cancelService(s:State,ids:string[]){for(const id of ids){const v=s.vehicles.find(x=>x.id===id);if(v?.service?.stage==='requested')v.service=undefined;}}

function startService(s:State,v:Vehicle){
 const job=v.service!;const here=s.sites.find(p=>p.id===v.locationId),depot=here&&depotFor(s,spec(v).mode,here);if(!depot){v.service=undefined;log(s,`${v.name||spec(v).name}: kein Depot für die Wartung gefunden.`,'warn');return false;}
 job.resume={lineId:v.lineId,returnLineId:v.returnLineId,onReturnRoute:v.onReturnRoute,nextStop:v.nextStop};job.depotId=depot.id;job.stage='toDepot';
 v.manualHold=undefined;v.dailyRestTargetId=undefined;v.dailyRestReturning=false;v.restUntil=undefined;
 startReturn(s,v);v.restReason='Fährt zur Wartung';
 if(v.status==='idle'&&v.locationId===depot.id)beginServicing(s,v);
 return true;
}
function beginServicing(s:State,v:Vehicle){const job=v.service!;job.stage='servicing';job.untilDay=s.day+SERVICE_HOURS/24;v.restReason='In Wartung';const paid=charge(s,serviceCost(v),'Wartung');log(s,`${v.name||spec(v).name}: Wartung begonnen · ${paid.toLocaleString('de-DE')} € · ${SERVICE_HOURS} Stunden`,'info');}
function endServicing(s:State,v:Vehicle){const job=v.service!;v.lastServiceKm=v.odometerKm||0;v.riskCheckedKm=v.lastServiceKm;v.limping=undefined;v.service=undefined;v.restReason=undefined;if(job.resume?.lineId&&s.lines.some(l=>l.id===job.resume!.lineId&&l.active&&!l.deleted)){v.lineId=job.resume.lineId;v.returnLineId=job.resume.returnLineId;v.onReturnRoute=!!job.resume.onReturnRoute;v.nextStop=job.resume.nextStop;}log(s,`${v.name||spec(v).name}: Wartung abgeschlossen${v.lineId?' · zurück auf der Linie':''}.`,'good');}

/** Shift end hook: called when a vehicle finishes its work for the day. */
export function onShiftEnd(s:State,v:Vehicle){if(v.service?.stage==='requested'&&v.service.when==='afterShift'&&v.status==='idle')return startService(s,v);return false;}
/** Dispatch hook: called before a vehicle leaves for the next stop. Returns true if the departure is replaced. */
export function beforeDispatch(s:State,v:Vehicle){if(v.breakdown||v.wrecked)return true;if(v.service?.stage==='requested'&&v.service.when==='now'&&v.status==='idle')return startService(s,v);return false;}
/** Called when a returning vehicle arrives at its depot. Returns true when cargo must stay aboard. */
export function onDepotArrival(s:State,v:Vehicle){if(v.service?.stage==='toDepot'&&v.locationId===v.service.depotId){beginServicing(s,v);return true;}return !!v.service;}

/** Per-slice hook at the top of the vehicle loop. Returns true when the vehicle must skip the rest of the simulation this slice. */
export function maintenanceStep(s:State,v:Vehicle,dt:number):boolean{
 if(!isRoad(v))return false;
 ensureMaintenance(v);
 if(v.wrecked)return true;
 if(s.maintenanceOff&&!v.breakdown&&!v.service){v.limping=undefined;v.riskCheckedKm=v.odometerKm||0;return false;}
 if(v.limping&&Math.floor(s.day)>v.limping.day){const paid=charge(s,repairCost(v,v.limping.level)*.6,'Pannen & Reparaturen');log(s,`${v.name||spec(v).name}: Reparatur nach Schichtende · ${paid.toLocaleString('de-DE')} €`,'info');v.limping=undefined;}
 if(v.breakdown){
  if(v.breakdown.stage==='waiting'||v.breakdown.frozen)v.riskCheckedKm=v.odometerKm||0;
  if(v.breakdown.stage==='repair'&&(v.breakdown.untilDay||0)<=s.day){const first=!!v.breakdown.toFirstStop;finishRepair(s,v,first);log(s,`${v.name||spec(v).name}: Reparatur abgeschlossen.`,'good');return false;}
  return true;
 }
 if(v.service?.stage==='servicing'){if((v.service.untilDay||0)<=s.day){endServicing(s,v);return false;}return true;}
 if(v.service?.stage==='toDepot'&&v.status==='idle'&&v.locationId===v.service.depotId){beginServicing(s,v);return true;}
 if(v.service?.stage==='requested'&&v.service.when==='now'&&v.status==='idle'&&!(v.handlingUntil&&v.handlingUntil>s.day)&&!v.manualReleased){if(startService(s,v))return true;}
 if(v.service?.stage==='requested'&&v.service.when==='afterShift'&&v.status==='idle'&&(!v.lineId||v.restUntil&&v.restUntil>s.day||v.waitingForCargo)){if(startService(s,v))return true;}
 // Breakdown risk for kilometres driven since the last check
 const km=(v.odometerKm||0)-(v.riskCheckedKm||0);
 if(km>=5&&s.live&&(v.status==='enroute'||v.status==='returning')){
  v.riskCheckedKm=v.odometerKm||0;
  const since=kmSinceService(v),rate=since<=SERVICE_INTERVAL_KM?.0035:since<=SERVICE_INTERVAL_KM+2000?.01:.025;
  const limp=v.limping?(0.015*km/100):0;
  const p=1-Math.pow(1-rate,km/1000)+limp;
  const r=rand(v.id+':risk:'+Math.floor(v.odometerKm||0));
  if(r<p){
   const roll=rand(v.id+':level:'+Math.floor(v.odometerKm||0)),overdue=since>SERVICE_INTERVAL_KM+2000;
   let level:DamageLevel=v.limping?(roll<.12?'total':'major'):overdue?(roll<.01?'total':roll<.15?'major':roll<.45?'medium':'minor'):(roll<.002?'total':roll<.06?'major':roll<.28?'medium':'minor');
   v.limping=undefined;createIncident(s,v,level);return true;
  }
 }else if(v.status==='idle')v.riskCheckedKm=v.odometerKm||0;
 return false;
}

export function wreckValue(v:Vehicle){return Math.max(1,Math.floor(dealerValue(v)*.12));}
export function ackIncidents(s:State,ids:string[]){for(const i of s.incidents||[])if(ids.includes(i.id)&&i.resolved)i.seen=true;}
export function setBreakdownPolicy(s:State,policy:BreakdownPolicy){if(!['ask','tow','mobile','continue'].includes(policy))throw Error('Unbekannte Standardoption.');s.breakdownPolicy=policy;}
export function openIncidents(s:State){return (s.incidents||[]).filter(i=>!i.resolved||!i.seen);}
export function triggerBreakdown(s:State,vehicleId:string,level:DamageLevel){const v=s.vehicles.find(x=>x.id===vehicleId);if(!v||!isRoad(v))throw Error('LKW oder Transporter wählen.');return createIncident(s,v,level);}
export function freezeBrokenVehicle(v:Vehicle,dt:number){if(v.breakdown&&(v.breakdown.stage==='waiting'||v.breakdown.frozen))freeze(v,dt);}
