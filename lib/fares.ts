import type {Mode} from './game';
export const fareRules={bus:{base:1.2,perKm:.18},train:{base:1.8,perKm:.16},plane:{base:8,perKm:.12},ship:{base:2,perKm:.1}};
type Fare={mode:Mode;ticketPrice?:number;fare?:number};
export const fareBase=(l:Fare)=>Math.round((l.ticketPrice??fareRules[l.mode].base*(l.fare??1))*100)/100;
export const fareRate=(_l:Fare)=>0;
export const distanceFare=(l:Fare,_km:number)=>fareBase(l);
export const suggestedFare=(mode:Mode,km:number)=>Math.round((fareRules[mode].base+Math.max(0,km)*fareRules[mode].perKm)*100)/100;
