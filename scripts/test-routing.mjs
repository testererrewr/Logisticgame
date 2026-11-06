import assert from 'node:assert/strict';
import {nearestRoadSnap,streetRoute,mapBounds,registerMap} from '../lib/real-map.ts';
import {busRoute} from '../lib/bus-route.ts';
import {act,newState,newCompany} from '../lib/game.ts';
const map={key:'routing-fixture',lat:0,lon:0,...mapBounds(0,0),nodes:[[0,-.005],[0,.005],[.012,0],[-.006,0],[.005,-.012]],roads:[{name:'Hinweg',nodes:[0,1],oneway:1},{name:'Rückweg',nodes:[1,3,0],oneway:1},{name:'Alternative',nodes:[0,2,1],oneway:0},{name:'Sackgasse',nodes:[0,4],oneway:0}],zones:[],date:'fixture'};registerMap(map);
const c=newCompany('r','Router');c.stops=[{id:'a',name:'A',city:map.key,node:0,point:map.nodes[0],hub:false},{id:'b',name:'B',city:map.key,node:1,point:map.nodes[1],hub:false}];
const points=[{kind:'stop',stopId:'a'},{kind:'stop',stopId:'b'}];
const open=busRoute(c,points,'outbound');assert.deepEqual(open.path,[map.nodes[0],map.nodes[1]]);assert.equal(open.returnPath,undefined);assert.equal(open.segmentKm.length,1,'Open route has no automatic last-to-first leg');
const shuttle=busRoute(c,points,'shuttle');assert.deepEqual(shuttle.path,open.path);assert.deepEqual(shuttle.returnPath,[map.nodes[1],map.nodes[3],map.nodes[0]],'Legal one-way return remains a separate path');
const ring=busRoute(c,points,'loop');assert.deepEqual(ring.path.at(-1),map.nodes[0]);assert.equal(ring.segmentKm.length,2);
const via={kind:'via',id:'v',city:map.key,node:2,point:[99,99]},guided=busRoute(c,[points[0],via,points[1]]);assert.ok(guided.path.some(p=>p===map.nodes[2]));assert.equal(guided.stops.length,2,'Waypoints do not become passenger stops');assert.equal(guided.segmentKm.length,1);assert.deepEqual(guided.points[1].point,map.nodes[2],'Server uses actual road geometry, not forged coordinates');
assert.throws(()=>busRoute(c,[points[0],{...via,node:4},points[1]]),/Straßenverbindung/,'A waypoint cannot introduce an immediate road U-turn');
assert.throws(()=>busRoute(c,[via,...points]),/Beginne/);assert.throws(()=>busRoute(c,[points[0],{kind:'stop',stopId:'foreign'}]),/eigene/);
const oneWay={...map,key:'one-way-fixture',roads:[map.roads[0]]};registerMap(oneWay);const d=newCompany('one','One way');d.stops=c.stops.map(s=>({...s,city:oneWay.key}));assert.equal(busRoute(d,points,'outbound').path.length,2);assert.throws(()=>busRoute(d,points),/Rückfahrt/,'A new ordinary line requires a legal return');
console.log('PASS: shuttle by default, explicit legacy outbound/ring, legal directed return geometry, via steering without extra passenger stops, validated real coordinates and no immediate U-turn at waypoints.');

// Two one-way carriageways: a stop on the westbound side also serves eastbound
// buses across an 11 m street, without a trip around the entire block.
const divided={...map,key:'divided-road',nodes:[[0,0],[0,.001],[0,.002],[.0001,0],[.0001,.001],[.0001,.002]],roads:[{name:'Main',nodes:[0,1,2],oneway:1},{name:'Main',nodes:[5,4,3],oneway:1},{name:'Turn east',nodes:[2,5],oneway:1},{name:'Turn west',nodes:[3,0],oneway:1}]};
const east=streetRoute(divided,[0,4,2],false);assert.ok(east.length<.25,'Opposite-side middle stop cannot force a lap around both carriageways');assert.ok(east.path.every(p=>p[0]===0),'Eastbound trip stays on its legal carriageway');const west=streetRoute(divided,[2,4,0],false);assert.ok(west.length<.3&&west.path.some(p=>p[0]===.0001),'The same stops also serve the opposite legal direction without a block-length detour');const exact=streetRoute(divided,[0,4,2],false,[false,true,false]);assert.ok(exact.length>east.length,'Explicit waypoints retain their exact carriageway');
console.log('PASS: both-side stop access via road-segment projection, whole-route optimisation and exact directional waypoints.');

const halfway=nearestRoadSnap(divided,[0,.0005]);assert.ok(halfway);assert.deepEqual(halfway.point,[0,.0005],'Stops project to the interior of a long OSM segment');registerMap(divided);const build=newState();build.companies=[newCompany('builder','Builder')];act(build,'builder',{type:'busstop',city:divided.key,node:halfway.node,point:halfway.point,name:'Middle of segment'});assert.deepEqual(build.companies[0].stops[0].point,halfway.point);assert.throws(()=>act(build,'builder',{type:'busstop',city:divided.key,node:0,point:[0,.02],name:'Off road'}),/Straße/,'Forged off-road coordinates cannot create a stop');
