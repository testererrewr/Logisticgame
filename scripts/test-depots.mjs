import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {newState,newCompany,act,depotForLine,requireDepot} from '../lib/game.ts';
import {registerMap,cellPoint,freeFootprint,nearestRoad} from '../lib/real-map.ts';
import {tileAt,tileCenter,sphericalDistance,distanceToPath} from '../lib/geography.ts';
import {worldStreetRoute} from '../lib/world-roads.ts';
const state=newState(),c=newCompany('depot-test','Depot Test');state.companies=[c,newCompany('foreign','Foreign')];c.cash=100000000;
const bus={mode:'bus',a:'berlin',b:'hamburg',path:[[0,-4],[0,4]]};
assert.throws(()=>requireDepot(c,bus),/Busdepot/);
const point=[250000/(6371000*Math.PI/180),0];c.facilities=[{id:'bus-depot',name:'Bus Depot',type:'busdepot',city:'berlin',point,cell:0,footprint:[]}];
assert.ok(depotForLine(c,bus),'The 250 km rule measures the line interior, not just the stops');assert.ok(sphericalDistance(point,bus.path[0])>250000);
c.facilities[0].point=[250001/(6371000*Math.PI/180),0];assert.equal(depotForLine(c,bus),undefined,'250 km + 1 m is outside');state.companies[1].facilities=[{...c.facilities[0],point:[0,0]}];assert.equal(depotForLine(c,bus),undefined,'Other companies cannot supply vehicles');
assert.ok(distanceToPath([0,180],[[0,179],[0,-179]])<1,'Date-line crossings use the shorter spherical arc');
const map=JSON.parse(readFileSync('public/maps/berlin.json','utf8'));registerMap(map);c.facilities=[];let site=-1;
for(let i=0;i<6400;i++){try{freeFootprint(map,i,'station',[]);if(nearestRoad(map,cellPoint(map,i),150)>=0){site=i;break;}}catch{}}
assert.ok(site>=0);act(state,c.id,{type:'facility',kind:'busdepot',city:'berlin',cell:site});assert.equal(c.facilities[0].type,'busdepot');assert.ok(c.facilities[0].roadNode>=0);assert.equal(c.cash,99880000);
assert.throws(()=>act(state,'foreign',{type:'facility',kind:'busdepot',city:'berlin',cell:site}),/frei/);
const f=(id,type,point)=>({id,name:id,type,city:'berlin',cell:0,point,footprint:[]});c.facilities=[f('station-a','station',[52.52,13.4]),f('station-b','station',[52.52,13.41]),f('depot','traindepot',[52.52,13.42]),f('isolated','station',[52.52,13.421])];c.tracks=[];
act(state,c.id,{type:'track',from:'station-a',to:'station-b',points:[]});const main=c.tracks[0];assert.throws(()=>requireDepot(c,{mode:'train',track:main.id}),/Zugdepot/);act(state,c.id,{type:'buildrail',track:main.id});assert.equal(c.lines.at(-1).vehicles,0);act(state,c.id,{type:'sell',line:c.lines.at(-1).id});
act(state,c.id,{type:'track',from:'depot',to:'isolated',points:[]});assert.equal(depotForLine(c,{mode:'train',track:main.id}),undefined,'A nearby disconnected rail island is not enough');
act(state,c.id,{type:'track',from:'isolated',to:'station-a',points:[]});assert.equal(depotForLine(c,{mode:'train',track:main.id}).id,'depot');act(state,c.id,{type:'buildrail',track:main.id});assert.equal(c.lines.at(-1).mode,'train');assert.throws(()=>act(state,c.id,{type:'buildrail',track:c.tracks[1].id}),/Stationen/);
c.facilities.push(f('airport-a','airport',[52.5,13.4]),{...f('airport-b','airport',[53.55,10]),city:'hamburg'});
act(state,c.id,{type:'build',a:'berlin',b:'hamburg',mode:'plane'});assert.equal(c.lines.at(-1).vehicles,0);assert.throws(()=>requireDepot(c,c.lines.at(-1)),/Flugzeugdepot/);act(state,c.id,{type:'sell',line:c.lines.at(-1).id});
assert.throws(()=>act(state,'foreign',{type:'airdepot',airport:'airport-a'}),/eigenen Flughafen/);
act(state,c.id,{type:'airdepot',airport:'airport-a'});const hangar=c.facilities.at(-1);assert.equal(hangar.airportId,'airport-a');assert.deepEqual(hangar.point,c.facilities.find(f=>f.id==='airport-a').point);assert.throws(()=>act(state,c.id,{type:'airdepot',airport:'airport-a'}),/bereits/);act(state,c.id,{type:'build',a:'berlin',b:'hamburg',mode:'plane'});assert.equal(c.lines.at(-1).mode,'plane');c.facilities.push(f('airport-other','airport',[52.51,13.41]));assert.equal(depotForLine(c,{mode:'plane',a:'berlin',b:'hamburg',fromFacility:'airport-other',toFacility:'airport-b'}).id,hangar.id,'A hangar can supply a line from another airport');
for(const p of [[52.52,13.4],[-33.9,151.2],[0,-179.9],[79,10]]){const key=tileAt(p),center=tileCenter(key);assert.ok(center&&sphericalDistance(p,center)<3000);assert.equal(tileAt(center),key);}
assert.equal(tileCenter('geo_999999999_0'),null);
// Two data tiles share real geometry at the border and retain directed roads.
const one={...map,key:'unit-west',date:'merge-fixture',nodes:[[52.52,13.4],[52.52,13.401]],roads:[{name:'West',nodes:[0,1],oneway:0}]},two={...map,key:'unit-east',date:'merge-fixture',nodes:[[52.52,13.401],[52.52,13.402]],roads:[{name:'East',nodes:[0,1],oneway:0}]};registerMap(one);registerMap(two);const route=worldStreetRoute([{city:one.key,node:0},{city:two.key,node:1}]);assert.ok(route.length>.1);assert.equal(route.segmentKm.length,2);assert.deepEqual(route.path[0],one.nodes[0]);assert.deepEqual(route.path.at(-1),one.nodes[0]);
console.log('PASS: real depot placement, ownership, exact 250 km line-interior and date-line distances, disconnected/connected rail depots, airport hangars, global tiles and road routing across tile borders.');
