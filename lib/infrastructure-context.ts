import type {Company,WorldState} from './game';
const worlds=new WeakMap<Company,WorldState>();
export function bindInfrastructure(state:WorldState){for(const c of state.companies)worlds.set(c,state);}
export const companyWorld=(c:Company)=>worlds.get(c);
export function sharedCompany(c:Company):Company{const state=worlds.get(c);return state?{...c,stops:state.companies.flatMap(x=>x.stops||[]),facilities:state.companies.flatMap(x=>x.facilities||[]),tracks:state.companies.flatMap(x=>(x.tracks||[]).map(t=>({...t,owner:x.id})))}:c;}
