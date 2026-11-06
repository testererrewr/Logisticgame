import type {World} from './game';
import type {VehicleRun} from './operations';

export function worldStructure(world:World){
 const text=JSON.stringify([world.name,world.description,world.config,world.status,world.state.vehicleCatalog,world.state.contracts,world.state.usedMarket,world.state.companies.map(({cash,cashRemainder,earned,passengers,ticketRevenue,history,finances,vehicleAccounts,statistics,lineAccounts,...structure})=>({...structure,fleet:structure.fleet?.map(({health,...v})=>v)}))]);
 let hash=2166136261;for(let i=0;i<text.length;i++)hash=Math.imul(hash^text.charCodeAt(i),16777619);
 return (hash>>>0).toString(36)+':'+text.length;
}
export type LiveSnapshot={waitingTop?:World['state']['waitingTop'];syncPending?:boolean;forecastPending?:boolean;auctions?:World['state']['auctions'];tenders?:World['state']['tenders'];health?:Record<string,import('./vehicle-health').VehicleHealth>;pressure?:World['state']['pressure'];messages?:World['state']['messages'];waiting?:World['state']['waiting'];usage?:World['state']['usage'];id:string;revision:number;structure:string;serverNow:number;simTime:number;lastTick:number;day:number;runs:Record<string,VehicleRun>;backlog:boolean;companies:{id:string;cash:number;earned:number;passengers:number;ticketRevenue?:number;history:number[];vehicleAccounts?:World['state']['companies'][number]['vehicleAccounts'];statistics?:World['state']['companies'][number]['statistics']}[];results:World['results'];network:World['network']};
export function liveSnapshot(world:World,since=0):LiveSnapshot{return {
 waitingTop:world.state.waitingTop,syncPending:world.syncPending,forecastPending:world.forecastPending,auctions:world.state.auctions,tenders:world.state.tenders,health:Object.fromEntries(world.state.companies.flatMap(c=>(c.fleet||[]).filter(v=>v.health&&(v.health.revision||0)>since).map(v=>[v.id,v.health!]))),pressure:world.state.pressure,messages:world.state.messages?.slice(-50),waiting:world.state.waiting,usage:world.state.usage?{...world.state.usage,history:undefined}:undefined,id:world.id,revision:world.revision,structure:worldStructure(world),serverNow:world.serverNow||Date.now(),simTime:world.state.simTime||0,lastTick:world.state.lastTick,day:world.state.day,
 runs:world.state.operations?.vehicles||{},backlog:!!world.state.operations?.backlog,
 companies:world.state.companies.map(({id,cash,earned,passengers,ticketRevenue,history,vehicleAccounts,statistics})=>({id,cash,earned,passengers,ticketRevenue,history,vehicleAccounts,statistics})),results:world.results,network:world.network,
};}
export function applyLiveSnapshot(world:World,snapshot:LiveSnapshot,receivedAt=Date.now()):World|null{
 if(snapshot.id!==world.id)return null;if(snapshot.revision<world.revision)return world;
 if(snapshot.structure!==worldStructure(world))return null;
 const counters=new Map(snapshot.companies.map(c=>[c.id,c]));
 return {...world,syncPending:!!snapshot.syncPending,forecastPending:snapshot.forecastPending,revision:snapshot.revision,serverNow:snapshot.serverNow,receivedAt,results:snapshot.results,network:snapshot.network,state:{...world.state,auctions:snapshot.auctions,tenders:snapshot.tenders,pressure:snapshot.pressure,messages:snapshot.messages?[...snapshot.messages,...(world.state.messages||[]).filter(m=>!snapshot.messages!.some(n=>n.id===m.id))].sort((a,b)=>a.time-b.time).slice(-1000):world.state.messages,waiting:snapshot.waiting,waitingTop:snapshot.waitingTop,usage:snapshot.usage?{...snapshot.usage,history:world.state.usage?.history}:undefined,simTime:snapshot.simTime,lastTick:snapshot.lastTick,day:snapshot.day,
  companies:world.state.companies.map(c=>({...c,...counters.get(c.id),fleet:c.fleet?.map(v=>snapshot.health?.[v.id]?{...v,health:snapshot.health[v.id]}:v)})),operations:{version:2,queues:world.state.operations?.queues||{},transferCredits:world.state.operations?.transferCredits||{},vehicles:snapshot.runs,backlog:snapshot.backlog}}};
}
