import {newState,stepTime,type State} from './engine.ts';
export interface WorldClock {day:number;last_tick:number;tick_ms:number;time_scale?:number;status?:string}
export const worldTickMs=(world:WorldClock)=>86400000/(world.time_scale??1);
export function clockTarget(world:WorldClock,now:number){
 if(world.status&&world.status!=='running')return world.day;
 const tick=worldTickMs(world);if(!Number.isFinite(tick)||tick<1000)throw Error('Ungültige Weltgeschwindigkeit.');
 return world.day+Math.max(0,(now-world.last_tick)/tick);
}
export function companyAtDay(day:number,name=''){const state=newState();state.live=true;state.companyName=name;state.day=day;(state as any).foundedDay=Math.floor(day);state.events[0].day=day;return state;}
export function advanceCompany(state:State,target:number){if(target<state.day-1e-9)throw Error('Weltzeit darf nicht zurücklaufen.');return stepTime(state,target);}
