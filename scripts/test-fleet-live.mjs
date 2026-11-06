import assert from 'node:assert/strict';
import {newCompany,newState} from '../lib/game.ts';
import {runPlan,eventAt} from '../lib/operations.ts';
import {urbanSpeed,vehicleModel} from '../lib/vehicle-models.ts';
import {vehicleTelemetry} from '../lib/vehicle-telemetry.ts';
import {fleetStatus,filterFleet} from '../lib/fleet-view.ts';

const start=Date.parse('2026-10-24T08:00:00Z'),c=newCompany('owner','Owner');
c.stops=[{id:'a',name:'Marktplatz',point:[48.2,16.3]},{id:'b',name:'Bahnhof',point:[48.21,16.31]}];
c.facilities=[{id:'d',name:'Stadtdepot',type:'busdepot',city:'test',point:c.stops[0].point,footprint:[],cell:0}];
const line={id:'l',name:'Linie 1',mode:'bus',city:'test',a:'vienna',b:'vienna',routeMode:'shuttle',path:c.stops.map(s=>s.point),returnPath:c.stops.map(s=>s.point).reverse(),stopIds:['a','b'],stopPoints:c.stops.map(s=>s.point),segmentKm:[1],returnSegmentKm:[1],vehicles:1,active:true,fare:1};
const v={id:'bus',name:'Stadtbus',mode:'bus',model:'bus-mini',depot:'d',line:'l',purchasePrice:90000};c.lines=[line];c.fleet=[v];
const speed=urbanSpeed(vehicleModel(v)),plan=runPlan(c,line,speed),run={line:'l',signature:plan.signature,epoch:start,next:1,onboard:[{exit:1,count:7,fare:2.5,flow:'real',hops:0}],boarded:7,alighted:0,revenue:0};
const world={id:'test',revision:1,status:'running',receivedAt:start,state:{...newState(),simTime:start,companies:[c],operations:{version:2,vehicles:{bus:run},queues:{},transferCredits:{},backlog:false}},config:{timeScale:1}};
function at(time){return {...world,receivedAt:time,state:{...world.state,simTime:time}};}
const departure=fleetStatus(at(start+1000),c,v,start+1000);assert.equal(departure.key,'dwell');assert.equal(departure.pose.departureRemaining,24000,'Dwell countdown uses actual next leg departure');assert.equal(departure.nextStop,'Bahnhof');assert.equal(departure.previousStop,'Marktplatz');assert.equal(departure.pose.direction,'Hinfahrt');
const pre=vehicleTelemetry(plan,{...run,epoch:start+25000,next:0},start);assert.equal(pre.departureRemaining,50000,'Initial server arrival and subsequent boarding dwell are both included before actual movement');
const time=start+plan.legs[0].start+1000,moving=fleetStatus(at(time),c,v,time);assert.equal(moving.key,'moving');assert.equal(moving.pose.departureRemaining,undefined);assert.ok(moving.pose.progress>0);assert.equal(moving.onboard,7);assert.ok(moving.loadPercent>0&&moving.loadPercent<100);
const arriving=eventAt(plan,run),unconfirmed=fleetStatus(at(arriving+100),c,v,arriving+100);assert.equal(unconfirmed.pose.awaiting,true);assert.equal(unconfirmed.pose.departureRemaining,undefined,'No invented departure before server-confirmed boarding');assert.equal(unconfirmed.onboard,7);assert.equal(run.revenue,0,'Rendering never pays fares');
const returning={...run,next:2,onboard:[],boarded:7,alighted:7,revenue:17.5},backWorld=at(start+plan.returnAt+1000);backWorld.state={...backWorld.state,operations:{...world.state.operations,vehicles:{bus:returning}}};const back=fleetStatus(backWorld,c,v,backWorld.receivedAt);assert.equal(back.pose.direction,'Rückfahrt');assert.equal(back.nextStop,'Marktplatz');assert.equal(back.previousStop,'Bahnhof');assert.equal(back.onboard,0);assert.equal(back.pose.departureRemaining,24000);
const stale=fleetStatus(world,c,v,start+13000);assert.equal(stale.key,'stale');assert.match(stale.issue,/bestätigten/);assert.equal(stale.onboard,7);const staleLater=fleetStatus(world,c,v,start+90000);assert.deepEqual(staleLater.point,stale.point,'Offline fleet rows freeze at the bounded clock');
const old=structuredClone(world);old.state.operations.vehicles.bus.signature='old-route';const mismatch=fleetStatus(old,c,v,start);assert.equal(mismatch.key,'starting');assert.equal(mismatch.onboard,0);assert.equal(mismatch.pose,null,'An old run cannot be rendered on newly edited geometry');
const stopped=fleetStatus(world,{...c,lines:[{...line,active:false}]},v,start);assert.equal(stopped.key,'inactive');assert.equal(stopped.onboard,0);assert.equal(stopped.pose,null);
const idleVehicle={...v,id:'idle',name:'Reserve',line:undefined},idle=fleetStatus(world,c,idleVehicle,start);assert.equal(idle.key,'idle');assert.equal(idle.onboard,0);assert.equal(idle.run,undefined);
const noDepot=fleetStatus(world,{...c,facilities:[]},v,start);assert.equal(noDepot.key,'blocked');assert.equal(noDepot.pose,null);assert.match(noDepot.issue,/Depot/);
const blockedLine={...line,routeMode:'outbound',returnRouteError:'Keine befahrbare Rückfahrt.'},outPlan=runPlan(c,blockedLine,speed),outRun={...run,signature:outPlan.signature,next:outPlan.visits.length};const blockedAt=start+outPlan.duration+1000,blockedWorld=at(blockedAt);blockedWorld.state={...blockedWorld.state,operations:{...world.state.operations,vehicles:{bus:outRun}}};const blocked=fleetStatus(blockedWorld,{...c,lines:[blockedLine]},v,blockedAt);assert.equal(blocked.key,'blocked');assert.match(blocked.issue,/Rückfahrt/);
const rows=[{v,...moving},{v:idleVehicle,...idle}],empty={home:'',mode:'',status:'',line:'',search:''};assert.equal(filterFleet(rows,empty).length,2);assert.deepEqual(filterFleet(rows,{...empty,line:'unassigned'}).map(r=>r.v.id),['idle']);assert.equal(filterFleet(rows,{...empty,line:'l',home:'d',mode:'bus',status:'moving',search:' bahNHOF '})[0].v.id,'bus');assert.equal(filterFleet(rows,{...empty,search:'foreign-company'}).length,0);assert.equal(filterFleet(rows,{...empty,status:'idle',line:'l'}).length,0,'Filters compose without including unmatched or foreign vehicles');

// All transport modes use their own dwell rather than the bus's 25 seconds.
for(const [mode,dwell]of [['train',45000],['plane',180000],['ship',90000]]){const p=runPlan(c,{...line,mode},100),r={...run,signature:p.signature};assert.equal(vehicleTelemetry(p,r,start+1000).departureRemaining,dwell-1000);assert.equal(vehicleTelemetry(p,{...r,next:2},start+p.returnAt+1000).direction,'Rückfahrt');}
console.log('PASS: live fleet stops/directions, real model occupancy, exact mode-specific dwell, no unconfirmed departures or phantom fares, stale freeze, geometry-safe runs, blocked depots/returns and combined fleet filters.');
