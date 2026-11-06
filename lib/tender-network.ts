import type {Company,WorldState,Mode} from './game';
import {depotForLine} from './game';
import {runPlan} from './operations';
import {vehicleModel,urbanSpeed} from './vehicle-models';
import {modeEnabled} from './world-modes';
import {meters,type LatLon} from './real-map';
import {areaContains,type TenderArea} from './tender-area';
import {stationBounds,canWalkTransfer,type StationBounds} from './station-access';
import type {TenderType} from './tender-types';
export type {TenderArea} from './tender-area';
export type TenderQuery={type:TenderType;from:TenderArea;to?:TenderArea;mode:Mode|'any';electricOnly:boolean;directOnly?:boolean;maxHeadwayMinutes?:number;targetKind?:'station'|'airport'|'port'};
type Network={points:LatLon[];bounds:(StationBounds|undefined)[];rides:{from:number;to:number;seats:number}[];walks:[number,number][];lineOf:number[];lines:{points:LatLon[];seats:number;mode:Mode}[]};
const cache=new Map<string,Network>();
function prepare(state:WorldState,c:Company,query:TenderQuery){
 const signature=JSON.stringify([c.id,c.suspended,state.vehicleCatalog?.revision,query.mode,query.electricOnly,query.type==='frequency'?query.maxHeadwayMinutes:0,state.rules?.enabledModes,c.lines.map(({costCache,...l})=>l),c.fleet?.map(v=>[v.mode,v.model,v.consist,v.line,v.depot,v.listing]),state.companies.flatMap(co=>[co.facilities,co.tracks])]);if(cache.has(signature))return cache.get(signature)!;
 const airportBounds=new Map(state.companies.flatMap(c=>(c.facilities||[]).filter(f=>f.type==='airport').map(f=>[f.point.map(n=>n.toFixed(6)).join(':'),stationBounds(f)] as const)));
 const n:Network={points:[],bounds:[],rides:[],walks:[],lineOf:[],lines:[]},groups=new Map<string,Map<string,{model:ReturnType<typeof vehicleModel>;count:number}>>();for(const v of c.fleet||[])if(v.line&&!v.listing&&!c.suspended){let models=groups.get(v.line);if(!models)groups.set(v.line,models=new Map());const key=v.model+JSON.stringify(v.consist||[]),old=models.get(key);if(old)old.count++;else models.set(key,{model:vehicleModel(v,state.vehicleCatalog?.models),count:1});}
 for(const l of c.lines){if(!l.active||!modeEnabled(state.rules,l.mode)||query.mode!=='any'&&l.mode!==query.mode||!depotForLine(c,l))continue;const rows=[...(groups.get(l.id)?.values()||[])].flatMap(g=>{const plan=runPlan(c,l,l.city&&l.mode==='bus'?urbanSpeed(g.model):g.model.speed,g.model.acceleration,g.model.braking,false,false,g.model.lengthM||0);return plan?.repeat?[{...g,plan}]:[];});if(!rows.length)continue;const frequency=rows.reduce((n,g)=>n+g.count/(g.plan.duration/60000),0),factor=l.headwayMinutes?Math.min(1,1/l.headwayMinutes/frequency):1,seats=Math.floor(rows.filter(g=>!query.electricOnly||g.model.traction==='electric'||g.model.energyType==='electricity'&&g.model.traction!=='dual').reduce((n,g)=>n+Math.floor(g.count*86400000/g.plan.duration*factor)*g.model.capacity,0));const eligibleFrequency=rows.filter(g=>!query.electricOnly||g.model.traction==='electric'||g.model.energyType==='electricity'&&g.model.traction!=='dual').reduce((sum,g)=>sum+g.count/(g.plan.duration/60000),0)*factor;if(!seats||query.type==='frequency'&&1/eligibleFrequency>(query.maxHeadwayMinutes||10)+1e-8)continue;const plan=rows[0].plan,offset=n.points.length;n.points.push(...plan.calls);n.bounds.push(...plan.calls.map(p=>airportBounds.get(p.map(n=>n.toFixed(6)).join(':'))));n.lineOf.push(...plan.calls.map(()=>n.lines.length));n.lines.push({points:plan.calls,seats,mode:l.mode});const seen=new Set<string>();for(let i=0;i<plan.visits.length;i++){if(i===plan.visits.length-1&&!plan.repeat)continue;const from=plan.visits[i].call,to=plan.visits[(i+1)%plan.visits.length].call,key=from+':'+to;if(from===to||seen.has(key))continue;seen.add(key);n.rides.push({from:offset+from,to:offset+to,seats});}}
 // Only arrival→departure transfers exist. A path cannot walk through a chain of stops without riding.
 const bins=new Map<string,number[]>();for(let i=0;i<n.points.length;i++){const p=n.points[i],y=Math.floor(p[0]*111320/1000),x=Math.floor(p[1]*111320/1000),key=x+':'+y;const ids=bins.get(key)||[];ids.push(i);bins.set(key,ids);}
 for(let i=0;i<n.points.length;i++){const p=n.points[i],y=Math.floor(p[0]*111320/1000),x=Math.floor(p[1]*111320/1000),dx=Math.ceil(1/Math.max(.02,Math.cos(p[0]*Math.PI/180)));n.walks.push([i,i]);for(let xx=x-dx*3;xx<=x+dx*3;xx++)for(let yy=y-3;yy<=y+3;yy++)for(const j of bins.get(xx+':'+yy)||[])if(j>i&&canWalkTransfer({point:p,bounds:n.bounds[i]},{point:n.points[j],bounds:n.bounds[j]})){n.walks.push([i,j],[j,i]);}}
 cache.set(signature,n);if(cache.size>16)cache.delete(cache.keys().next().value!);return n;
}
const capacities=new WeakMap<Network,Map<string,{seats:number;stops:number}>>();
function directedCapacity(state:WorldState,c:Company,query:TenderQuery,reverse=false){
 const n=prepare(state,c,query),key=JSON.stringify([query,reverse]),saved=capacities.get(n)?.get(key);if(saved)return saved;
 const inside=areaContains,zone=(p:LatLon)=>Math.floor(p[0]*111320/50)+':'+Math.floor(p[1]*111320*Math.cos(query.from.point[0]*Math.PI/180)/50),local=n.lines.filter(l=>new Set(l.points.filter(p=>inside(p,query.from)).map(zone)).size>=2),zones=new Set(local.flatMap(l=>l.points.filter(p=>inside(p,query.from)).map(zone)));
 const save=(seats:number,stops=zones.size)=>{const result={seats,stops};let entries=capacities.get(n);if(!entries)capacities.set(n,entries=new Map());if(entries.size>500)entries.clear();entries.set(key,result);return result;};
 if(query.type==='interchange'){
  // One actual walking cluster, each line counted once. Separate clusters cannot inflate one hub.
  const neighbors=new Map<number,Set<number>>();for(const [a,b] of n.walks){if(a===b||n.lineOf[a]===n.lineOf[b]||n.lines[n.lineOf[a]].mode===n.lines[n.lineOf[b]].mode)continue;if(!inside(n.points[a],query.from)||!inside(n.points[b],query.from))continue;let ids=neighbors.get(a);if(!ids)neighbors.set(a,ids=new Set([n.lineOf[a]]));ids.add(n.lineOf[b]);}
  let best=0;for(const ids of neighbors.values()){const modes=new Map<Mode,number>();for(const id of ids){const l=n.lines[id];modes.set(l.mode,(modes.get(l.mode)||0)+l.seats);}if(modes.size<2)continue;const values=[...modes.values()],sum=values.reduce((a,b)=>a+b,0);best=Math.max(best,Math.floor(Math.min(sum/2,sum-Math.max(...values))));}return save(best);
 }
 if(!['connection','feeder'].includes(query.type))return save(local.reduce((s,l)=>s+l.seats,0));if(!query.to)return save(0);
 const targets=query.type==='feeder'?state.companies.flatMap(co=>(co.facilities||[]).filter(f=>f.type===query.targetKind&&inside(f.point,query.to!)).map(f=>({point:f.point,bounds:stationBounds(f)}))):[];
 const atDestination=(p:LatLon)=>query.type==='feeder'?targets.some(t=>canWalkTransfer(t,{point:p})):inside(p,query.to!),atOrigin=(p:LatLon)=>inside(p,query.from)&&(query.type!=='feeder'||!atDestination(p));
 const source=n.points.length*2,sink=source+1,adj:{to:number;reverse:number;left:number}[][]=Array.from({length:sink+1},()=>[]);const add=(a:number,b:number,cap:number)=>{adj[a].push({to:b,reverse:adj[b].length,left:cap});adj[b].push({to:a,reverse:adj[a].length-1,left:0});},infinite=1e12;
 for(const e of n.rides)add(e.from*2,e.to*2+1,e.seats);for(const [a,b]of n.walks)if(!query.directOnly||a===b)add(a*2+1,b*2,infinite);n.points.forEach((p,i)=>{if((reverse?atDestination:atOrigin)(p))add(source,i*2,infinite);if((reverse?atOrigin:atDestination)(p))add(i*2+1,sink,infinite);});
 // Iterative augmenting paths avoid recursion on long railway networks.
 let flow=0;for(let iteration=0;iteration<10000;iteration++){const parent=Array(adj.length).fill(null) as ({node:number;index:number}|null)[],queue=[source];parent[source]={node:-1,index:-1};for(let at=0;at<queue.length&&!parent[sink];at++){const node=queue[at];for(let index=0;index<adj[node].length;index++){const e=adj[node][index];if(e.left>0&&!parent[e.to]){parent[e.to]={node,index};queue.push(e.to);}}}if(!parent[sink])break;let amount=infinite;for(let at=sink;at!==source;){const p=parent[at]!;amount=Math.min(amount,adj[p.node][p.index].left);at=p.node;}for(let at=sink;at!==source;){const p=parent[at]!,e=adj[p.node][p.index];e.left-=amount;adj[at][e.reverse].left+=amount;at=p.node;}flow+=amount;}
 return save(Math.floor(flow));
}
export function tenderCapacity(state:WorldState,c:Company,query:TenderQuery){const q=directedCapacity(state,c,query);if(!['connection','feeder'].includes(query.type)||!query.to)return q;const back=directedCapacity(state,c,query,true);return {seats:Math.min(q.seats,back.seats),stops:q.stops};}
