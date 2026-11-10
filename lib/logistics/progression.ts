import {credit,log,purchaseVehicle,good,VEHICLES,TRAILERS,FREIGHT_NAMES,type State,type GoodId,type VehicleModelId} from './engine';
import {hireDriver,driversActive,LEVEL_HOURS,driverName,type CrewRole} from './drivers';
import {stableHash} from './business-rules';
import {specialCargo} from './special-cargo';
import {continentOf,ISLAND_GROUPS,COUNTRY_TOTAL} from './stamps-data';

export interface Snapshot {day:number;earned:number;spent:number;eh:number;km:number;contracts:number;byType:Record<string,number>}
export interface DailyReport {day:number;income:number;costs:number;profit:number;eh:number;km:number;contracts:number;cash:number;topGood?:string;topGoodEh?:number;vehicles:number;challengeDone?:string[];achievements?:string[]}
export interface Challenge {id:string;kind:'eh'|'km'|'contracts'|'revenue'|'type';title:string;target:number;prize:number;freight?:string}
export interface PickupWarning {day:number;contractId:string;siteId:string;siteName:string;good:string;daily:number;stock:number}
export interface Progress {stamps?:Record<string,number>;islands?:Record<string,number>;collection?:Record<string,number>;pickups?:PickupWarning[];v:1;last:Snapshot;totals:{km:number;contracts:number;challenges:number};weekIndex:number;weekStart:Snapshot;weekSize:number;weekDone:string[];achievements:Record<string,number>;reports:DailyReport[]}

const WEEK=7;
export const weekOf=(day:number)=>Math.floor((Math.floor(day)-1)/WEEK);
const sumEh=(s:State)=>Object.values(s.deliveryStats||{}).reduce((n,x)=>n+(x||0),0);
const sumKm=(s:State)=>s.vehicles.reduce((n,v)=>n+(v.odometerKm||0),0);
function byType(s:State){const out:Record<string,number>={};for(const [id,q] of Object.entries(s.deliveryStats||{})){const t=good(id as GoodId)?.type;if(t)out[t]=(out[t]||0)+(q||0);}return out;}
function snapshot(s:State,p?:Progress):Snapshot{return {day:Math.floor(s.day),earned:s.earned,spent:s.spent,eh:sumEh(s),km:p?.totals.km||0,contracts:p?.totals.contracts||0,byType:byType(s)};}

export function weeklyChallenges(week:number,size:number):Challenge[]{
 const types=Object.keys(FREIGHT_NAMES).filter(t=>t!=='containers'),h=(k:string)=>stableHash('weekly/'+week+'/'+k),z=Math.max(1,Math.min(20,size));
 const all:Challenge[]=[
  {id:'eh',kind:'eh',title:`${(300*z).toLocaleString('de-DE')} EH ausliefern`,target:300*z,prize:6000+1000*Math.min(z,8)},
  {id:'km',kind:'km',title:`${(2500*z).toLocaleString('de-DE')} km mit der Flotte fahren`,target:2500*z,prize:5000+800*Math.min(z,8)},
  {id:'contracts',kind:'contracts',title:`${Math.max(2,Math.ceil(z/2))} Aufträge vollständig abschließen`,target:Math.max(2,Math.ceil(z/2)),prize:7000+700*Math.min(z,8)},
  {id:'revenue',kind:'revenue',title:`${(25000*z).toLocaleString('de-DE')} € Einnahmen erzielen`,target:25000*z,prize:6000+900*Math.min(z,8)},
 ];
 const t=types[h('type')%types.length];all.push({id:'type-'+t,kind:'type',freight:t,title:`${(120*z).toLocaleString('de-DE')} EH ${FREIGHT_NAMES[t as keyof typeof FREIGHT_NAMES]} ausliefern`,target:120*z,prize:8000+1000*Math.min(z,8)});
 const picked:Challenge[]=[],pool=[...all];for(let i=0;i<3&&pool.length;i++)picked.push(pool.splice(h('pick'+i)%pool.length,1)[0]);return picked;
}
export function challengeProgress(c:Challenge,start:Snapshot,now:Snapshot){
 const v=c.kind==='eh'?now.eh-start.eh:c.kind==='km'?now.km-start.km:c.kind==='contracts'?now.contracts-start.contracts:c.kind==='revenue'?now.earned-start.earned:(now.byType[c.freight||'']||0)-(start.byType[c.freight||'']||0);
 return Math.max(0,v);
}

type Reward={money?:number;vehicle?:VehicleModelId;trailer?:string;driver?:{role:CrewRole;level:number}};
export interface Achievement {id:string;icon:string;name:string;text:string;metric:(s:State,p:Progress)=>number;goal:number;reward:Reward}
const modes=(s:State)=>new Set(s.vehicles.map(v=>VEHICLES.find(m=>m.id===v.modelId)?.mode).filter(Boolean)).size;
const profit=(s:State)=>s.earned-s.spent;

export const ACHIEVEMENTS:Achievement[]=[
 {id:'first-contract',icon:'📦',name:'Erste Lieferung',text:'Den ersten Auftrag vollständig abschließen.',metric:(_,p)=>p.totals.contracts,goal:1,reward:{money:10000}},
 {id:'eh-1k',icon:'🚚',name:'Tausender',text:'1.000 EH ausliefern.',metric:s=>sumEh(s),goal:1000,reward:{money:25000}},
 {id:'eh-10k',icon:'🏗️',name:'Logistiker',text:'10.000 EH ausliefern.',metric:s=>sumEh(s),goal:10000,reward:{vehicle:'mercedes-benz-sprinter'}},
 {id:'eh-100k',icon:'🏭',name:'Warenstrom',text:'100.000 EH ausliefern.',metric:s=>sumEh(s),goal:100000,reward:{driver:{role:'truck',level:4}}},
 {id:'eh-1m',icon:'🌐',name:'Weltverbund',text:'1.000.000 EH ausliefern.',metric:s=>sumEh(s),goal:1000000,reward:{vehicle:'volvo-fh16-aero',trailer:'krone-mega'}},
 {id:'km-10k',icon:'🛣️',name:'Kilometerfresser',text:'10.000 km mit der Flotte fahren.',metric:(_,p)=>p.totals.km,goal:10000,reward:{money:15000}},
 {id:'km-100k',icon:'🧭',name:'Fernfahrer',text:'100.000 km mit der Flotte fahren.',metric:(_,p)=>p.totals.km,goal:100000,reward:{driver:{role:'truck',level:3}}},
 {id:'km-1m',icon:'🌍',name:'Einmal um die Welt (×25)',text:'1.000.000 km mit der Flotte fahren.',metric:(_,p)=>p.totals.km,goal:1000000,reward:{driver:{role:'air',level:5}}},
 {id:'fleet-10',icon:'🚛',name:'Kleine Flotte',text:'10 Fahrzeuge gleichzeitig besitzen.',metric:s=>s.vehicles.length,goal:10,reward:{money:30000}},
 {id:'fleet-50',icon:'🚦',name:'Fuhrpark',text:'50 Fahrzeuge gleichzeitig besitzen.',metric:s=>s.vehicles.length,goal:50,reward:{vehicle:'scania-s-serie',trailer:'schmitz-universal'}},
 {id:'fleet-150',icon:'🏁',name:'Großspedition',text:'150 Fahrzeuge gleichzeitig besitzen.',metric:s=>s.vehicles.length,goal:150,reward:{driver:{role:'ship',level:5}}},
 {id:'allround',icon:'🧩',name:'Allrounder',text:'Transporter, LKW, Zug, Schiff und Flugzeug gleichzeitig im Fuhrpark.',metric:modes,goal:5,reward:{money:250000}},
 {id:'profit-1m',icon:'💶',name:'Erste Million',text:'1 Mio. € Gewinn insgesamt.',metric:profit,goal:1e6,reward:{money:50000}},
 {id:'profit-10m',icon:'💰',name:'Zehnfach',text:'10 Mio. € Gewinn insgesamt.',metric:profit,goal:1e7,reward:{driver:{role:'rail',level:5}}},
 {id:'profit-100m',icon:'🏦',name:'Logistik-Magnat',text:'100 Mio. € Gewinn insgesamt.',metric:profit,goal:1e8,reward:{vehicle:'atr-72-600f'}},
 {id:'contracts-25',icon:'📋',name:'Verlässlich',text:'25 Aufträge abschließen.',metric:(_,p)=>p.totals.contracts,goal:25,reward:{money:40000}},
 {id:'contracts-250',icon:'🏆',name:'Auftragsprofi',text:'250 Aufträge abschließen.',metric:(_,p)=>p.totals.contracts,goal:250,reward:{driver:{role:'truck',level:5}}},
 {id:'collector-1',icon:'💎',name:'Kurier für Kostbares',text:'Eine seltene Ware zustellen.',metric:(_,p)=>Object.keys(p.collection||{}).length,goal:1,reward:{money:20000}},
 {id:'collector-5',icon:'🏛️',name:'Kurator',text:'5 verschiedene seltene Waren zustellen.',metric:(_,p)=>Object.keys(p.collection||{}).length,goal:5,reward:{driver:{role:'truck',level:5}}},
 {id:'stamps-5',icon:'🛂',name:'Grenzgänger',text:'Fahrzeuge in 5 Ländern.',metric:(_,p)=>Object.keys(p.stamps||{}).length,goal:5,reward:{money:30000}},
 {id:'stamps-15',icon:'🗺️',name:'Weitgereist',text:'Fahrzeuge in 15 Ländern.',metric:(_,p)=>Object.keys(p.stamps||{}).length,goal:15,reward:{driver:{role:'truck',level:4}}},
 {id:'stamps-50',icon:'✈️',name:'Globetrotter',text:'Fahrzeuge in 50 Ländern.',metric:(_,p)=>Object.keys(p.stamps||{}).length,goal:50,reward:{vehicle:'airbus-a321p2f'}},
 {id:'stamps-100',icon:'🌐',name:'Hundert Flaggen',text:'Fahrzeuge in 100 Ländern.',metric:(_,p)=>Object.keys(p.stamps||{}).length,goal:100,reward:{money:5000000}},
 {id:'stamps-all',icon:'👑',name:'Weltenbummler',text:'Alle Länder der Welt erreicht.',metric:(_,p)=>Object.keys(p.stamps||{}).length,goal:COUNTRY_TOTAL,reward:{money:50000000}},
 {id:'continents-6',icon:'🧭',name:'Sechs Kontinente',text:'Europa, Asien, Afrika, Nord- und Südamerika und Ozeanien erreicht.',metric:(_,p)=>new Set(Object.keys(p.stamps||{}).map(continentOf).filter(Boolean)).size,goal:6,reward:{vehicle:'boeing-767-300f'}},
 {id:'islands-5',icon:'🏝️',name:'Inselhüpfer',text:'5 besondere Inseln (z. B. Kanaren, Hawaii, Kreta) erreicht.',metric:(_,p)=>Object.keys(p.islands||{}).length,goal:5,reward:{money:150000}},
 {id:'group-caribbean',icon:'🏝️',name:'Karibik-Hopper',text:'5 Karibikstaaten erreicht.',metric:(_,p)=>ISLAND_GROUPS.find(x=>x.id==='caribbean')!.countries.filter(c=>p.stamps?.[c]!==undefined).length,goal:5,reward:{money:200000}},
 {id:'group-pacific',icon:'🌺',name:'Südsee-Kapitän',text:'3 Südsee-Inselstaaten erreicht.',metric:(_,p)=>ISLAND_GROUPS.find(x=>x.id==='pacific')!.countries.filter(c=>p.stamps?.[c]!==undefined).length,goal:3,reward:{money:250000}},
 {id:'group-british',icon:'💂',name:'Britische Inseln komplett',text:'Großbritannien, Irland, Isle of Man, Jersey und Guernsey.',metric:(_,p)=>ISLAND_GROUPS.find(x=>x.id==='british')!.countries.filter(c=>p.stamps?.[c]!==undefined).length,goal:5,reward:{money:150000}},
 {id:'group-nordic',icon:'🧊',name:'Hoher Norden',text:'6 nordische Länder inkl. Island, Färöer oder Grönland.',metric:(_,p)=>ISLAND_GROUPS.find(x=>x.id==='nordic')!.countries.filter(c=>p.stamps?.[c]!==undefined).length,goal:6,reward:{money:200000}},
 {id:'group-indian',icon:'🐢',name:'Indischer Ozean',text:'3 Inselstaaten im Indischen Ozean.',metric:(_,p)=>ISLAND_GROUPS.find(x=>x.id==='indian')!.countries.filter(c=>p.stamps?.[c]!==undefined).length,goal:3,reward:{money:200000}},
 {id:'challenge-1',icon:'🎯',name:'Herausgefordert',text:'Eine Wochen-Herausforderung schaffen.',metric:(_,p)=>p.totals.challenges,goal:1,reward:{money:10000}},
 {id:'challenge-25',icon:'🥇',name:'Wochensieger',text:'25 Wochen-Herausforderungen schaffen.',metric:(_,p)=>p.totals.challenges,goal:25,reward:{vehicle:'damen-cc2750'}},
];
export function rewardText(r:Reward){if(r.money)return r.money.toLocaleString('de-DE')+' €';if(r.vehicle)return 'Fahrzeug: '+(VEHICLES.find(m=>m.id===r.vehicle)?.name||r.vehicle)+(r.trailer?' mit '+(TRAILERS.find(t=>t.id===r.trailer)?.name||''):'');if(r.driver)return 'Personal Stufe '+r.driver.level+' ('+({van:'Transporter',truck:'LKW',rail:'Lokführer',ship:'Schiff',air:'Pilot'}[r.driver.role])+')';return '';}
function grant(s:State,a:Achievement){const r=a.reward;
 if(r.money){credit(s,r.money,'Prämien & Erfolge');return;}
 if(r.vehicle){const m=VEHICLES.find(x=>x.id===r.vehicle);if(m){const value=m.price+(TRAILERS.find(t=>t.id===r.trailer)?.price||0);const before=structuredClone({cash:s.cash,vehicles:s.vehicles.length});credit(s,value,'Prämien & Erfolge');try{purchaseVehicle(s,m.id,r.trailer);const v=s.vehicles[s.vehicles.length-1];if(s.vehicles.length>before.vehicles){v.name='🏅 '+a.name+' · '+m.name;v.rare='Erfolg: '+a.name;}log(s,'Erfolg-Belohnung: '+m.name+' steht im Depot bereit.','good');}catch{log(s,'Erfolg-Belohnung: kein passendes Depot frei – stattdessen '+value.toLocaleString('de-DE')+' € gutgeschrieben.','good');}}return;}
 if(r.driver){const xp=LEVEL_HOURS[Math.max(0,Math.min(4,r.driver.level-1))];if(driversActive(s)){const id='drv-reward-'+a.id+'-'+Math.floor(s.day);try{hireDriver(s,{id,name:driverName(id),role:r.driver.role,xpHours:xp});log(s,'Erfolg-Belohnung: erfahrenes Personal (Stufe '+r.driver.level+') eingestellt.','good');return;}catch{}}credit(s,25000*r.driver.level,'Prämien & Erfolge');}
}

export function ensureProgress(s:State):Progress{const p=s.progress as Progress|undefined;if(p&&p.v===1)return p;const fresh:Progress={v:1,last:snapshot(s),totals:{km:0,contracts:0,challenges:0},weekIndex:weekOf(s.day),weekStart:snapshot(s),weekSize:Math.ceil(s.vehicles.length/3),weekDone:[],achievements:{},reports:[]};fresh.last.km=0;fresh.weekStart.km=0;s.progress=fresh;(fresh as any).odo=sumKm(s);return fresh;}

export function progressDay(s:State){const p=ensureProgress(s),day=Math.floor(s.day),odo=sumKm(s),prevOdo=(p as any).odo??odo;
 checkPickups(s,p,day);
 for(const c of s.contracts)if(c.special&&c.completedDay!==undefined&&c.completedDay<day&&c.completedDay>=p.last.day&&!(c as any).collected){(c as any).collected=1;const col=p.collection??={};col[c.special]=(col[c.special]||0)+1;const sc=specialCargo(c.special);log(s,`💎 Seltene Ware zugestellt: ${sc?.name||c.special} – neues Sammlerstück im Profil!`,'good');}
 p.totals.km=Math.round(p.totals.km+Math.max(0,odo-prevOdo));(p as any).odo=odo;
 p.totals.contracts+=s.contracts.filter(c=>c.completedDay!==undefined&&c.completedDay>=p.last.day&&c.completedDay<day&&!(c as any).counted).map(c=>{(c as any).counted=1;return c;}).length;
 const now=snapshot(s,p),report:DailyReport={day:p.last.day,income:Math.round(now.earned-p.last.earned),costs:Math.round(now.spent-p.last.spent),profit:Math.round(now.earned-p.last.earned-(now.spent-p.last.spent)),eh:Math.round(now.eh-p.last.eh),km:Math.round(now.km-p.last.km),contracts:now.contracts-p.last.contracts,cash:Math.round(s.cash),vehicles:s.vehicles.length};
 let top:[string,number]|undefined;const prevStats=(p as any).stats||{};for(const [id,q] of Object.entries(s.deliveryStats||{})){const d=(q||0)-(prevStats[id]||0);if(d>0&&(!top||d>top[1]))top=[id,d];}(p as any).stats={...(s.deliveryStats||{})};if(top){report.topGood=good(top[0] as GoodId)?.name||top[0];report.topGoodEh=Math.round(top[1]);}

 for(const c of weeklyChallenges(p.weekIndex,p.weekSize)){if(p.weekDone.includes(c.id))continue;if(challengeProgress(c,p.weekStart,now)>=c.target){p.weekDone.push(c.id);p.totals.challenges++;credit(s,c.prize,'Prämien & Erfolge');log(s,'🎯 Wochen-Herausforderung geschafft: '+c.title+' · Prämie '+c.prize.toLocaleString('de-DE')+' €','good');(report.challengeDone??=[]).push(c.title);}}
 if(weekOf(day)!==p.weekIndex){p.weekIndex=weekOf(day);p.weekStart=now;p.weekSize=Math.ceil(s.vehicles.length/3);p.weekDone=[];}
 for(const a of ACHIEVEMENTS){if(p.achievements[a.id])continue;if(a.metric(s,p)>=a.goal){p.achievements[a.id]=day;grant(s,a);log(s,'🏅 Erfolg freigeschaltet: '+a.name+' · Belohnung: '+rewardText(a.reward),'good');(report.achievements??=[]).push(a.name);}}
 if(p.last.day<day)p.reports=[report,...p.reports].slice(0,14);p.last=snapshot(s,p);
}

function checkPickups(s:State,p:Progress,day:number){const prev=day-1,list:PickupWarning[]=[];
 for(const c of s.contracts){if(c.kind!=='supply'||c.cancelled||c.startDay>prev||c.endDay<day||(c.loadedToday||0)>0.001)continue;const stock=s.inventory[c.siteId]?.[c.good!]||0;if(stock<Math.max(1,c.daily*.5))continue;const site=s.sites.find(x=>x.id===c.siteId);list.push({day:prev,contractId:c.id,siteId:c.siteId,siteName:site?.name||'Betrieb',good:good(c.good!)?.name||String(c.good),daily:c.daily,stock:Math.round(stock)});}
 p.pickups=[...list,...(p.pickups||[]).filter(w=>w.day>=prev-2)].slice(0,200);
 if(list.length)log(s,`📬 ${list.length===1?'Eine gebuchte Fracht wurde':list.length+' gebuchte Frachten wurden'} gestern nicht abgeholt – Details im Postfach.`,'warn');
}
