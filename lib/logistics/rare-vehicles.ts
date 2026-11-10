import {VEHICLES,TRAILERS,type Vehicle,type VehicleModelId,type WagonId} from './engine';
import {stableHash} from './business-rules';
import {vehicleNewValue,type UsedVehicleOffer} from './vehicle-sales';

export const RARE_CHANCE=.10,RARE_DAYS=2;
export const EDITIONS:{name:string;discount:number;km:number[];age?:number[]}[]=[
 {name:'Werksprototyp',discount:.45,km:[200,4000]},
 {name:'Messefahrzeug',discount:.55,km:[50,900]},
 {name:'Jubiläumsedition',discount:.6,km:[1000,15000]},
 {name:'Vorführmodell',discount:.62,km:[3000,25000]},
 {name:'Ex-Konzernflotte · Topzustand',discount:.5,km:[20000,90000]},
 {name:'Sammlerstück',discount:.4,km:[30000,250000]},
 {name:'Oldtimer (restauriert)',discount:.3,km:[400000,1200000],age:[3000,9000]},
 {name:'Museumsstück',discount:.35,km:[250000,800000],age:[2000,7000]},
 {name:'Ex-Feuerwehr',discount:.45,km:[15000,60000],age:[1500,4000]},
 {name:'Ex-Militär',discount:.4,km:[20000,120000],age:[1200,5000]},
 {name:'Limitierte Edition (1 von 50)',discount:.7,km:[100,2000]},
 {name:'Rallye-Begleitfahrzeug',discount:.5,km:[30000,140000]},
];
export function rareOfferFor(worldId:string,day:number,allowed?:(mode:string)=>boolean):UsedVehicleOffer|null{
 day=Math.floor(day);const h=(k:string)=>stableHash(worldId+'/rare/'+day+'/'+k);if(h('roll')%1000>=RARE_CHANCE*1000)return null;
 const models=VEHICLES.filter(m=>!allowed||allowed(m.mode));if(!models.length)return null;

 const modes=[...new Set(models.map(m=>m.mode))],mode=modes[h('mode')%modes.length],pool=models.filter(m=>m.mode===mode),m=pool[h('model')%pool.length];
 const ed=EDITIONS[h('edition')%EDITIONS.length],trailers=m.attachment?TRAILERS.filter(t=>t.mount===m.attachment):[],trailer=trailers.length?trailers[h('trailer')%trailers.length]:undefined;
 const wagons=m.mode==='rail'?[{type:(['container','bulk','flat'] as WagonId[])[h('wagon')%3],count:8+h('wcount')%5}]:undefined;
 const km=ed.km[0]+h('km')%(ed.km[1]-ed.km[0]),now=Date.now();
 const vehicle:Vehicle={id:'rare-'+day,modelId:m.id as VehicleModelId,name:'✨ '+ed.name+' · '+m.name,trailerId:trailer?.id,wagons,cooling:m.mode==='van'&&h('cool')%3===0||undefined,purchasedAt:now-(ed.age?ed.age[0]+h('age')%(ed.age[1]-ed.age[0]):1+h('age')%20)*86400000,odometerKm:km,transportedEh:0,locationId:'',nextStop:0,status:'idle',rare:ed.name};
 const price=Math.max(1,Math.round(vehicleNewValue(vehicle)*ed.discount/100)*100);
 const id='rare'+String(stableHash(worldId+'/rare-id/'+day)).padStart(12,'0')+'d'+day;
 return {id,worldId,sellerId:'rare:'+day,sellerName:'Sonderangebot · '+ed.name,price,created:now,vehicle,status:'open',expiresDay:day+RARE_DAYS};
}
