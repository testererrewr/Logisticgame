import type {Company,Line,WorldState} from './game';
import {placeName} from './game';
import {canTransfer} from './contracts';
export type WaitingSnapshot=Record<string,Record<string,number>>;
export function callSiteId(c:Company,l:Line,index:number){
 const track=c.tracks?.find(t=>t.id===l.track);return l.facilityIds?.[index]||l.stopIds?.[index]||(index===0?l.fromFacility||track?.from:l.toFacility||track?.to)||l.id+':'+index;
}
export type WaitingDestinations=Record<string,Record<string,{id:string;name:string;count:number}[]>>;
export function stationWaitingData(state:WorldState){
 const result:WaitingSnapshot={},groups=new Map<string,Map<string,{id:string;name:string;count:number}>>(),sites=new Map(state.companies.flatMap(c=>[...c.stops||[],...c.facilities||[]].map(s=>[s.id,s] as const)));
 for(const c of state.companies)for(const l of c.lines){if(c.suspended||!l.active||!l.vehicles)continue;const queue=state.operations?.queues[l.id];if(!queue)continue;
 for(const item of Object.values(queue.items)){if(item.waiting<=0||item.from===item.to||item.sourceCompany&&!canTransfer(state,item.sourceCompany,c.id))continue;const stop=callSiteId(c,l,item.from),lines=result[stop]??={};lines[l.id]=(lines[l.id]||0)+Math.floor(item.waiting);const key=stop+'|'+l.id,destination=callSiteId(c,l,item.to);let targets=groups.get(key);if(!targets)groups.set(key,targets=new Map());const known=sites.get(destination),point=l.stopPoints?.[item.to],name=known?.name||((item.to===0||!l.stopPoints)?placeName(item.to===0?l.a:l.b):point?point.map(n=>n.toFixed(3)).join(', '):'Halt '+(item.to+1)),old=targets.get(destination);if(old)old.count+=Math.floor(item.waiting);else targets.set(destination,{id:destination,name,count:Math.floor(item.waiting)});}}
 const top:WaitingDestinations={};for(const [key,targets]of groups){const split=key.indexOf('|'),stop=key.slice(0,split),line=key.slice(split+1);(top[stop]??={})[line]=[...targets.values()].sort((a,b)=>b.count-a.count||a.name.localeCompare(b.name,'de')).slice(0,3);}return {counts:result,top};
}
export function stationWaiting(state:WorldState):WaitingSnapshot{return stationWaitingData(state).counts;}
