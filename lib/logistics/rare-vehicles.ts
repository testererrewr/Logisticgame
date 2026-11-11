import {VEHICLES,TRAILERS,type Vehicle,type VehicleModelId,type WagonId} from './engine';
import {stableHash} from './business-rules';
import {vehicleNewValue,type UsedVehicleOffer} from './vehicle-sales';

export const RARE_CHANCE=.10,RARE_DAYS=2,CLASSIC_SHARE=.55;

export const EDITIONS:{name:string;discount:number;km:number[]}[]=[
 {name:'Werksprototyp',discount:.45,km:[200,4000]},
 {name:'Messefahrzeug',discount:.55,km:[50,900]},
 {name:'Jubiläumsedition',discount:.6,km:[1000,15000]},
 {name:'Vorführmodell',discount:.62,km:[3000,25000]},
 {name:'Ex-Konzernflotte · Topzustand',discount:.5,km:[20000,90000]},
 {name:'Limitierte Edition (1 von 50)',discount:.7,km:[100,2000]},
];
const CLASSIC_KM:Record<string,number[]>={Oldtimer:[180000,900000],'Sammlerstück':[60000,400000],'Museumsstück':[300000,1500000],'Ex-Feuerwehr':[15000,60000],'Ex-Militär':[20000,120000],'Rallye-Fahrzeug':[30000,140000]};
const CLASSIC_AGE:Record<string,number[]>={Oldtimer:[9000,22000],'Sammlerstück':[12000,30000],'Museumsstück':[15000,36000],'Ex-Feuerwehr':[6000,15000],'Ex-Militär':[8000,20000],'Rallye-Fahrzeug':[9000,15000]};
export function rareOfferFor(worldId:string,day:number,allowed?:(mode:string)=>boolean):UsedVehicleOffer|null{
 day=Math.floor(day);const h=(k:string)=>stableHash(worldId+'/rare/'+day+'/'+k);if(h('roll')%1000>=RARE_CHANCE*1000)return null;
 const ok=(m:typeof VEHICLES[number])=>!allowed||allowed(m.mode),classics=VEHICLES.filter(m=>m.classic&&ok(m)),normal=VEHICLES.filter(m=>!m.classic&&ok(m));if(!classics.length&&!normal.length)return null;
 const useClassic=classics.length>0&&(h('kind')%100<CLASSIC_SHARE*100||!normal.length),now=Date.now();let m,label:string,km:number,ageDays:number,factor:number;
 if(useClassic){m=classics[h('model')%classics.length];label=m.classic!;const r=CLASSIC_KM[label]||[50000,300000],a=CLASSIC_AGE[label]||[5000,15000];km=r[0]+h('km')%(r[1]-r[0]);ageDays=a[0]+h('age')%(a[1]-a[0]);factor=.8+(h('price')%50)/100;}
 else{const modes=[...new Set(normal.map(x=>x.mode))],mode=modes[h('mode')%modes.length],pool=normal.filter(x=>x.mode===mode);m=pool[h('model')%pool.length];const ed=EDITIONS[h('edition')%EDITIONS.length];label=ed.name;km=ed.km[0]+h('km')%(ed.km[1]-ed.km[0]);ageDays=1+h('age')%20;factor=ed.discount;}
 const trailers=m.attachment?TRAILERS.filter(t=>t.mount===m.attachment):[],trailer=trailers.length?trailers[h('trailer')%trailers.length]:undefined;
 const wagons=m.mode==='rail'?[{type:(['container','bulk','flat'] as WagonId[])[h('wagon')%3],count:6+h('wcount')%5}]:undefined;
 const vehicle:Vehicle={id:'rare-'+day,modelId:m.id as VehicleModelId,name:useClassic?m.name:'✨ '+label+' · '+m.name,trailerId:trailer?.id,wagons,cooling:m.mode==='van'&&!useClassic&&h('cool')%3===0||undefined,purchasedAt:now-ageDays*86400000,odometerKm:km,transportedEh:0,locationId:'',nextStop:0,status:'idle',rare:label};
 const price=Math.max(1,Math.round(vehicleNewValue(vehicle)*factor/100)*100);
 const id='rare'+String(stableHash(worldId+'/rare-id/'+day)).padStart(12,'0')+'d'+day;
 return {id,worldId,sellerId:'rare:'+day,sellerName:(useClassic?'Seltenes Fahrzeug · ':'Sonderausführung · ')+label,price,created:now,vehicle,status:'open',expiresDay:day+RARE_DAYS};
}
