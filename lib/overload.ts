import type {World} from './game';
import {usageRange} from './usage';
export function overloadRows(world:World,company:string,from:number,to:number){
 const c=world.state.companies.find(c=>c.id===company);if(!c)return [];const waiting=new Map<string,number>();for(const lines of Object.values(world.state.waiting||{}))for(const [id,n]of Object.entries(lines))waiting.set(id,(waiting.get(id)||0)+n);
 return c.lines.map(line=>{const usage=usageRange(world.state.usage,'lines',line.id,from,to),sample=world.state.pressure?.[line.id],current=waiting.get(line.id)||0,baseline=sample?.previousWaiting??sample?.waiting;return {line,waiting:current,change:baseline===undefined?null:current-baseline,since:sample?.previousAt??sample?.at,checked:usage?.checked||0,denied:usage?.checked?usage.denied||0:null,full:usage?.checked?usage.full||0:null,fullPercent:usage?.checked?(usage.full||0)/usage.checked*100:null,boarded:(usage?.direct||0)+(usage?.own||0)+(usage?.partner||0)+(usage?.continuation||0)};});
}
