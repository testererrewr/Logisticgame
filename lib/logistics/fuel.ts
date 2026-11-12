import {fuelFactor as worldFuelFactor} from './world-events';
import {recordEventImpact} from './finance';
import {VEHICLES,vehicleCargo,cargoCapacity,priceIndex,type State,type Vehicle,type GoodId} from './engine';
import {recordFinance} from './finance';
import {fuelFactor} from './drivers';

export type EnergyKind='diesel'|'strom'|'kerosin'|'schweröl'|'lng';
export const ENERGY:Record<EnergyKind,{name:string;unit:string;base:number;per:string}>={
 diesel:{name:'Diesel',unit:'l',base:1.55,per:'€/l'},
 strom:{name:'Ladestrom',unit:'kWh',base:.29,per:'€/kWh'},
 kerosin:{name:'Kerosin',unit:'kg',base:.86,per:'€/kg'},
 'schweröl':{name:'Schweröl (VLSFO)',unit:'t',base:615,per:'€/t'},
 lng:{name:'Flüssigerdgas (LNG)',unit:'t',base:690,per:'€/t'},
};
const round2=(n:number)=>Math.round(n*100)/100;

export function energyPrice(kind:EnergyKind,day:number){const idx=priceIndex(('energy:'+kind) as GoodId,day);return round2(ENERGY[kind].base*(1+(idx-1)*.55)*(kind==='strom'?1:worldFuelFactor(day))*1000)/1000;}
export function energyOf(v:Vehicle):EnergyKind|undefined{const e=VEHICLES.find(m=>m.id===v.modelId)?.energy;return e&&e in ENERGY?e as EnergyKind:undefined;}
export function loadFactor(v:Vehicle){const cargo=vehicleCargo(v);return Math.min(1,cargo.reduce((n,c)=>n+c.quantity/Math.max(cargoCapacity(v,c.good),c.legacyCapacity||0,1),0));}

export function consumptionPer100(v:Vehicle){const m=VEHICLES.find(x=>x.id===v.modelId);if(!m?.fuel)return 0;let f=m.fuel;if(m.mode==='truck'||m.mode==='van')f*=(m.attachment==='semi'&&!v.trailerId?.72:1)+.25*loadFactor(v);else if(m.mode==='rail'){const wagons=(v.wagons||[]).reduce((n,w)=>n+w.count,0);f*=.45+.55*Math.min(1,wagons/20)*(.7+.3*loadFactor(v));}else f*=.85+.15*loadFactor(v);return round2(f);}
export function fuelCostPerKm(v:Vehicle,day:number){const kind=energyOf(v);return kind?consumptionPer100(v)/100*energyPrice(kind,day):0;}

export function chargeFuel(s:State,v:Vehicle){
 const odo=v.odometerKm||0;if(v.fuelBilledKm===undefined||v.fuelBilledKm>odo){v.fuelBilledKm=odo;return;}
 const km=odo-v.fuelBilledKm;if(km<.5)return;v.fuelBilledKm=odo;
 if(s.fuelOff)return;const kind=energyOf(v);if(!kind)return;
 const amount=km/100*consumptionPer100(v)*fuelFactor(s,v),cost=round2(amount*energyPrice(kind,s.day));if(cost<=0)return;
 recordFinance(s,cost,false,'Treibstoff & Energie');s.cash-=cost;s.spent+=cost;if(kind!=='strom'){const wf=worldFuelFactor(s.day);if(wf!==1)recordEventImpact(s,-(cost-cost/wf));}
 v.fuelUsed=round2((v.fuelUsed||0)+amount);v.fuelCost=round2((v.fuelCost||0)+cost);
}
export function energyTable(day:number){return (Object.keys(ENERGY) as EnergyKind[]).map(k=>{const now=energyPrice(k,day),prev=energyPrice(k,day-1);return {kind:k,...ENERGY[k],now,change:(now-prev)/prev*100,history:Array.from({length:30},(_,i)=>energyPrice(k,day-29+i))};});}
