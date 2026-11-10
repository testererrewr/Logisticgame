import {VEHICLES,log,type State,type Vehicle} from './engine';
import {recordFinance} from './finance';

/** Personal: Fahrer, Lokführer, Schiffsführer, Piloten. Nur Aus/Vereinfacht; keine Zufriedenheit, keine Sonderqualifikationen. */
export type CrewRole='van'|'truck'|'rail'|'ship'|'air';
export const CREW_ROLES:Record<CrewRole,{name:string;plural:string;wage:number;crew:number}>={
 van:{name:'Transporterfahrer',plural:'Transporterfahrer',wage:650,crew:1},
 truck:{name:'LKW-Fahrer',plural:'LKW-Fahrer',wage:900,crew:1},
 rail:{name:'Triebfahrzeugführer',plural:'Triebfahrzeugführer',wage:1100,crew:1},
 ship:{name:'Schiffsführer',plural:'Schiffsführer',wage:1300,crew:1},
 air:{name:'Pilot',plural:'Piloten',wage:3000,crew:2},
};
export interface Driver {id:string;name:string;role:CrewRole;xpHours:number;wage:number;vehicleId?:string;hiredDay:number;paidUntilDay:number}
/** Fahrstunden bis zur jeweiligen Stufe (1–5). Der Lohn steigt nicht mit der Stufe. */
export const LEVEL_HOURS=[0,50,200,600,1500];
export const MAX_DRIVERS=5000;
export const levelOf=(xpHours:number)=>LEVEL_HOURS.reduce((l,h,i)=>xpHours>=h?i+1:l,1);
export function levelProgress(xpHours:number){const l=levelOf(xpHours);if(l>=5)return 1;return (xpHours-LEVEL_HOURS[l-1])/(LEVEL_HOURS[l]-LEVEL_HOURS[l-1]);}
export function roleOfModel(modelId:string):CrewRole|null{const m=VEHICLES.find(x=>x.id===modelId);if(!m)return null;return m.mode==='van'?'van':m.mode==='truck'?'truck':m.mode==='rail'?'rail':m.mode==='ship'?'ship':'air';}
export const crewNeeded=(v:Vehicle)=>{const r=roleOfModel(v.modelId);return r?CREW_ROLES[r].crew:0;};
export const crewOf=(s:State,v:Vehicle)=>(s.drivers||[]).filter(d=>d.vehicleId===v.id);
export const driversActive=(s:State)=>!s.driversOff;
export function crewReady(s:State,v:Vehicle){return !driversActive(s)||crewOf(s,v).length>=crewNeeded(v);}
/** Durchschnittliche Stufe der Besatzung (3 = neutral, wenn das Fahrersystem aus ist). */
export function crewLevel(s:State,v:Vehicle){if(!driversActive(s))return 3;const c=crewOf(s,v);return c.length?c.reduce((n,d)=>n+levelOf(d.xpHours),0)/c.length:1;}
/** Erfahrene Fahrer: bis −8 % Treibstoff (Stufe 5). */
export const fuelFactor=(s:State,v:Vehicle)=>driversActive(s)?1-.02*(crewLevel(s,v)-1):1;
/** Neulinge erhöhen, Profis senken das Pannenrisiko. */
export const breakdownFactor=(s:State,v:Vehicle)=>{if(!driversActive(s))return 1;const l=crewLevel(s,v);return [1.3,1.15,1,.9,.8][Math.max(0,Math.min(4,Math.round(l)-1))];};
/** Profis laden/entladen bis 10 % schneller. */
export const handlingFactor=(s:State,v:Vehicle)=>driversActive(s)?1-.025*(crewLevel(s,v)-1):1;

const FIRST=['Anna','Ben','Clara','David','Elif','Felix','Greta','Hannes','Ida','Jonas','Kerstin','Lukas','Mara','Niklas','Olga','Paul','Rosa','Stefan','Tamara','Uwe','Vera','Wolfgang','Yasmin','Zoran','Mehmet','Ana','Piotr','Ivana','Marco','Sofia','Lena','Tobias','Miriam','Karim','Jana','Florian','Nina','Dragan','Sabine','Thomas'];
const LAST=['Huber','Gruber','Wagner','Müller','Bauer','Schmid','Weber','Fischer','Becker','Novak','Horvat','Kovač','Rossi','Yılmaz','Nowak','Schneider','Hofer','Pichler','Moser','Mayer','Winkler','Berger','Lang','Wolf','Brandt','Kaya','Petrović','Szabó','Lehner','Steiner'];
export function driverName(seed:string){let h=2166136261;for(const c of seed){h^=c.charCodeAt(0);h=Math.imul(h,16777619);}h>>>=0;return FIRST[h%FIRST.length]+' '+LAST[Math.floor(h/FIRST.length)%LAST.length];}
const rid=()=>typeof crypto!=='undefined'&&crypto.randomUUID?crypto.randomUUID():Math.random().toString(36).slice(2)+Date.now().toString(36);

function payWage(s:State,d:Driver,label='Personal'){recordFinance(s,d.wage,false,label);s.cash-=d.wage;s.spent+=d.wage;}
/** Bestehende Spielstände: jedes Fahrzeug bekommt automatisch seine Besatzung, damit nichts stillsteht. */
export function ensureDrivers(s:State){if(!driversActive(s)){if(s.drivers)s.driversPaused=true;return;}if(s.drivers&&!s.driversPaused)return;const before=s.drivers?.length||0;s.drivers??=[];s.driversPaused=false;const day=Math.floor(s.day);for(const v of s.vehicles){if(v.wrecked)continue;const role=roleOfModel(v.modelId);if(!role)continue;for(let i=crewOf(s,v).length;i<CREW_ROLES[role].crew;i++)s.drivers.push({id:rid(),name:driverName(v.id+':'+i),role,xpHours:0,wage:CREW_ROLES[role].wage,vehicleId:v.id,hiredDay:day,paidUntilDay:day+7});}const added=s.drivers.length-before;if(added)log(s,`Personal eingeführt: ${added} Fahrer wurden automatisch für deine bestehenden Fahrzeuge eingestellt (Lohn wöchentlich).`,'info');}
export interface DriverCandidate {id:string;name:string;role:CrewRole;xpHours:number}
export function hireDriver(s:State,c:DriverCandidate,vehicleId?:string){if(!driversActive(s))throw Error('In dieser Welt ist das Fahrersystem ausgeschaltet.');if(!CREW_ROLES[c.role])throw Error('Unbekannte Personalart.');ensureDrivers(s);if(s.drivers!.length>=MAX_DRIVERS)throw Error('Personallimit erreicht.');if(s.drivers!.some(d=>d.id===c.id))throw Error('Bereits eingestellt.');const wage=CREW_ROLES[c.role].wage;if(s.cash<wage)throw Error('Nicht genügend Kapital für die erste Wochenlohnzahlung.');const day=Math.floor(s.day),d:Driver={id:c.id,name:String(c.name).slice(0,60),role:c.role,xpHours:Math.max(0,Number(c.xpHours)||0),wage,hiredDay:day,paidUntilDay:day+7};payWage(s,d);s.drivers!.push(d);if(vehicleId)assignDriver(s,d.id,vehicleId);log(s,`${CREW_ROLES[d.role].name} ${d.name} (Stufe ${levelOf(d.xpHours)}) eingestellt · ${d.wage.toLocaleString('de-DE')} € pro Woche.`,'good');return d;}
/** Kündigung: Der Fahrer verlässt die Firma und kommt mit seiner Stufe zurück auf den Personalmarkt. */
export function fireDriver(s:State,id:string):DriverCandidate{const d=(s.drivers||[]).find(x=>x.id===id);if(!d)throw Error('Eigenen Fahrer auswählen.');const v=d.vehicleId?s.vehicles.find(x=>x.id===d.vehicleId):undefined;if(v&&v.status==='enroute')throw Error('Der Fahrer ist gerade unterwegs. Erst nach Ankunft kündigen oder zuerst einen anderen Fahrer zuweisen.');s.drivers=s.drivers!.filter(x=>x.id!==id);log(s,`${CREW_ROLES[d.role].name} ${d.name} gekündigt – steht wieder auf dem Personalmarkt.`,'info');return {id:d.id,name:d.name,role:d.role,xpHours:d.xpHours};}
export function assignDriver(s:State,driverId:string,vehicleId:string|null){ensureDrivers(s);const d=(s.drivers||[]).find(x=>x.id===driverId);if(!d)throw Error('Eigenen Fahrer auswählen.');if(!vehicleId){const v=s.vehicles.find(x=>x.id===d.vehicleId);if(v&&v.status==='enroute')throw Error('Fahrzeug ist unterwegs – Fahrer erst nach Ankunft abziehen.');d.vehicleId=undefined;return d;}const v=s.vehicles.find(x=>x.id===vehicleId);if(!v)throw Error('Eigenes Fahrzeug auswählen.');if(roleOfModel(v.modelId)!==d.role)throw Error(`${CREW_ROLES[d.role].name} kann dieses Fahrzeug nicht fahren.`);const crew=crewOf(s,v).filter(x=>x.id!==d.id);if(crew.length>=crewNeeded(v))throw Error('Dieses Fahrzeug hat bereits genug Besatzung.');const old=d.vehicleId?s.vehicles.find(x=>x.id===d.vehicleId):undefined;if(old&&old.id!==v.id&&old.status==='enroute')throw Error('Der Fahrer ist gerade mit einem anderen Fahrzeug unterwegs.');d.vehicleId=v.id;if(v.restReason==='Kein Fahrer zugewiesen')v.restReason=undefined;return d;}
/** Premium: beim Fahrzeugkauf automatisch Besatzung einstellen (freie eigene Fahrer zuerst). */
export function autoCrew(s:State,v:Vehicle,fresh:(role:CrewRole,i:number)=>DriverCandidate){if(!driversActive(s))return 0;ensureDrivers(s);const role=roleOfModel(v.modelId);if(!role)return 0;let n=0;for(const d of s.drivers!.filter(x=>!x.vehicleId&&x.role===role)){if(crewOf(s,v).length>=crewNeeded(v))break;d.vehicleId=v.id;n++;}for(let i=0;crewOf(s,v).length<crewNeeded(v)&&i<4;i++){hireDriver(s,fresh(role,i),v.id);n++;}return n;}
/** Täglich: Wochenlöhne fällig stellen. */
export function chargeWages(s:State){if(!driversActive(s)||!s.drivers)return;const day=Math.floor(s.day);for(const d of s.drivers){let guard=0;while(d.paidUntilDay<=day&&guard++<60){payWage(s,d);d.paidUntilDay+=7;}}}
/** Erfahrung: Fahrstunden der Besatzung, solange das Fahrzeug fährt. */
export function crewStep(s:State,v:Vehicle,dtDays:number){if(!driversActive(s)||!s.drivers||dtDays<=0)return;if(v.status!=='enroute'&&v.status!=='returning')return;for(const d of s.drivers)if(d.vehicleId===v.id){const before=levelOf(d.xpHours);d.xpHours=Math.round((d.xpHours+dtDays*24)*1000)/1000;const after=levelOf(d.xpHours);if(after>before)log(s,`${d.name} erreicht Erfahrungsstufe ${after}.`,'good');}}
/** Verkaufte/verschrottete Fahrzeuge: Besatzung wird frei (bleibt angestellt). */
export function releaseCrew(s:State){if(!s.drivers)return;const ids=new Set(s.vehicles.map(v=>v.id));for(const d of s.drivers)if(d.vehicleId&&!ids.has(d.vehicleId))d.vehicleId=undefined;}
