import assert from 'node:assert/strict';
import {act,newState,newCompany} from '../lib/game.ts';
import {busRoute} from '../lib/bus-route.ts';
import {enableBusReturns} from '../lib/bus-return.ts';
import {registerMap,mapBounds,meters,pointCell} from '../lib/real-map.ts';
import {runPlan,eventAt,vehiclePose,syncRuns,settleOperations} from '../lib/operations.ts';
import {urbanSpeed,vehicleModel} from '../lib/vehicle-models.ts';
import {vehicleTelemetry} from '../lib/vehicle-telemetry.ts';
import {configOf} from '../lib/world-config.ts';

const start=Date.parse('2026-10-22T08:00:00Z'),m={key:'berlin~returns',lat:52.52,lon:13.4,...mapBounds(52.52,13.4),date:'returns-v1',
 nodes:[[52.52,13.39],[52.521,13.395],[52.52,13.4],[52.52,13.41]],roads:[{name:'Two way',nodes:[0,1,2,3],oneway:0}],
 zones:Array.from({length:6400},(_,id)=>({id,x:id%80,y:Math.floor(id/80),residents:0,jobs:0,shopping:0,buildings:0,trips:0,water:false}))};
for(const point of [m.nodes[0],m.nodes[2],m.nodes[3]])Object.assign(m.zones[pointCell(m,point)],{residents:10000,jobs:10000,buildings:1});
registerMap(m);
function fixture(){const s=newState();s.simTime=start;const c=newCompany('c','Company');s.companies=[c];c.stops=[0,2,3].map((node,i)=>({id:'stop'+i,name:'Stop '+i,city:m.key,node,point:m.nodes[node],hub:false}));c.facilities=[{id:'d',type:'busdepot',city:m.key,point:m.nodes[0],cell:0,footprint:[],name:'Depot'}];return {s,c};}
const {s:build,c:builder}=fixture(),points=builder.stops.map(s=>({kind:'stop',stopId:s.id})),via={kind:'via',id:'via',city:m.key,node:1,point:m.nodes[1]};
const route=busRoute(builder,[points[0],via,...points.slice(1)]);
assert.deepEqual(route.returnPath,[...route.path].reverse(),'Two-way roads return on the identical geometry, including via points');
assert.deepEqual(route.returnSegmentKm,[...route.segmentKm].reverse());
const before=builder.cash;act(build,builder.id,{type:'buildbus',stopIds:builder.stops.map(s=>s.id),name:'Automatic return'});
assert.equal(builder.cash,before,'Return planning remains free');assert.equal(builder.lines[0].vehicles,0);assert.equal(builder.lines[0].routeMode,'shuttle');syncRuns(build,start);assert.equal(Object.keys(build.operations.vehicles).length,0,'Planning cannot create a moving vehicle');

function legacy(){const {s,c}=fixture(),r=busRoute(c,points,'outbound');c.lines=[{...builder.lines[0],id:'l',routeMode:'outbound',path:r.path,length:r.length,segmentKm:r.segmentKm,returnPath:undefined,returnLength:0,returnSegmentKm:undefined,vehicles:1}];c.fleet=[{id:'bus',name:'Bus',mode:'bus',model:'bus-mini',depot:'d',line:'l',purchasePrice:90000}];syncRuns(s,start);const model=vehicleModel(c.fleet[0]),speed=urbanSpeed(model),old=runPlan(c,c.lines[0],speed),run=s.operations.vehicles.bus;return {s,c,line:c.lines[0],speed,old,run};}
const ended=legacy(),time=ended.run.epoch+ended.old.duration+3600000;
settleOperations(ended.s,configOf({}),start,time);const cash=ended.c.cash,counters=[ended.run.boarded,ended.run.alighted,ended.run.revenue],endpoint=vehiclePose(ended.old,ended.run,time).point;
enableBusReturns(ended.s,time);const plan=runPlan(ended.c,ended.line,ended.speed);
assert.equal(plan.repeat,true);assert.equal(ended.line.routeMode,'shuttle');assert.deepEqual(vehiclePose(plan,ended.run,time).point,endpoint,'An ended bus restarts at its terminal, never teleports to the first stop');
assert.deepEqual([ended.run.boarded,ended.run.alighted,ended.run.revenue],counters);assert.equal(ended.c.cash,cash,'Migration creates no historical fares');
syncRuns(ended.s,time);assert.equal(ended.s.operations.vehicles.bus,ended.run,'The updated signature prevents run resets');
assert.equal(vehiclePose(plan,ended.run,time+24999).status,'Fahrgastwechsel');assert.equal(vehiclePose(plan,ended.run,time+25001).status,'Unterwegs');assert.ok(meters(endpoint,vehiclePose(plan,ended.run,time+35000).point)>1);
assert.equal(vehicleTelemetry(plan,ended.run,time+35000).direction,'Rückfahrt');
assert.equal(plan.visits[ended.run.next%plan.visits.length].call,1,'The next stop is the penultimate outbound stop');
const epoch=ended.run.epoch;enableBusReturns(ended.s,time+10000);assert.equal(ended.run.epoch,epoch,'Migration is idempotent');
const backArrival=eventAt(plan,ended.run);settleOperations(ended.s,configOf({}),time,backArrival+1);assert.equal(ended.run.next,4,'The return has actual server-confirmed stop events');
settleOperations(ended.s,configOf({}),backArrival+1,time+plan.duration*4);assert.ok(ended.run.next>plan.visits.length*2,'The same vehicle continues through multiple full cycles');assert.ok(ended.run.boarded>counters[0]);assert.ok(ended.run.alighted>counters[1]);assert.ok(ended.run.revenue>counters[2]);

const moving=legacy(),movingTime=moving.run.epoch+moving.old.legs[0].start+1000;
moving.run.next=1;moving.run.onboard=[{exit:2,count:3,fare:2.5,flow:'existing',hops:0}];moving.run.boarded=3;const movingPoint=vehiclePose(moving.old,moving.run,movingTime).point,oldEpoch=moving.run.epoch;
enableBusReturns(moving.s,movingTime);const movingPlan=runPlan(moving.c,moving.line,moving.speed);
assert.deepEqual(vehiclePose(movingPlan,moving.run,movingTime).point,movingPoint);assert.equal(moving.run.epoch,oldEpoch);assert.equal(moving.run.next,1);assert.equal(moving.run.onboard[0].exit,2);assert.equal(moving.run.onboard[0].count,3,'Passengers keep their actual destination and count');
const middle=eventAt(movingPlan,moving.run,1),destination=eventAt(movingPlan,moving.run,2),originalCash=moving.c.cash;settleOperations(moving.s,configOf({}),movingTime,middle+1);assert.equal(moving.c.cash,originalCash);settleOperations(moving.s,configOf({}),middle+1,destination+1);assert.ok(moving.run.alighted>=3);assert.ok(moving.c.cash>=originalCash+7.5,'Existing passengers still pay once at their real destination');

// Interior segment anchors and routes crossing map boundaries reverse exactly too.
const projected=fixture();projected.c.stops[0].point=[52.5205,13.3925];const projectedRoute=busRoute(projected.c,points);assert.deepEqual(projectedRoute.returnPath,[...projectedRoute.path].reverse());
const other={...m,key:'berlin~returns-next',date:'returns-next',roads:[{name:'Continuation',nodes:[2,3],oneway:0}]};registerMap(other);const across=fixture();across.c.stops[2].city=other.key;const cross=busRoute(across.c,points);assert.deepEqual(cross.returnPath,[...cross.path].reverse());

const blocked=legacy(),oneWay={...m,date:'blocked',roads:[{...m.roads[0],oneway:1}]};registerMap(oneWay);enableBusReturns(blocked.s,start);assert.equal(blocked.line.routeMode,'outbound');assert.match(blocked.line.returnRouteError,/Rückfahrt/,'Impossible returns give an actionable route error');assert.equal(blocked.s.operations.vehicles.bus,blocked.run);assert.throws(()=>act(blocked.s,blocked.c.id,{type:'editline',line:blocked.line.id,name:'Blocked return',stopIds:blocked.line.stopIds,routeMode:'outbound'}),/Rückfahrt/,'Old clients cannot create a silent one-way dead end');
registerMap({...m,date:'repaired'});enableBusReturns(blocked.s,start);assert.equal(blocked.line.routeMode,'shuttle');assert.equal(blocked.line.returnRouteError,undefined,'Changed map data retries the failed return');
console.log('PASS: exact legal reverse paths, free default shuttle planning, seamless terminal/mid-route migration, preserved people and fares, real repeated return arrivals, projected/cross-map stops and visible impossible-return errors.');
