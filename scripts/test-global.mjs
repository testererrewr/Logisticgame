import assert from 'node:assert/strict';
import {osmGeometry} from '../lib/osm-source.ts';
import {parseOSM,registerMap,pointCell,cellPoint,nearestRoad,freeFootprint,streetRoute} from '../lib/real-map.ts';
import {tileAt,tileCenter} from '../lib/geography.ts';
import {newState,newCompany,act,cities,urbanTrips} from '../lib/game.ts';
import {networkForecast} from '../lib/network.ts';
const key=tileAt([47.29,15.98]),[lat,lon]=tileCenter(key);assert.ok(!cities.some(c=>c.id===key));
const p=(x,y)=>({lat:lat+y/111320,lon:lon+x/(111320*Math.cos(lat*Math.PI/180))});
const nodes=[[-800,0],[0,0],[800,0],[-810,-15],[-790,-15],[-790,15],[-810,15],[-810,-15],[790,-15],[810,-15],[810,15],[790,15],[790,-15]].map(([x,y],i)=>({type:'node',id:i+1,...p(x,y)}));
const raw={elements:[...nodes,{type:'way',id:1,nodes:[1,2,3],tags:{highway:'residential',name:'Freie Weltstraße'}},{type:'way',id:2,nodes:[4,5,6,7,8],tags:{building:'apartments','building:levels':'6'}},{type:'way',id:3,nodes:[9,10,11,12,13],tags:{building:'office','building:levels':'8'}},{type:'node',id:20,...p(800,0),tags:{shop:'supermarket'}}]};
const map=parseOSM(key,lat,lon,osmGeometry(raw));registerMap(map);
assert.ok(map.nodes.length>2&&map.buildings===2);assert.ok(map.zones.some(z=>z.residents>0));assert.ok(map.zones.some(z=>z.jobs>0));assert.ok(map.zones.some(z=>z.shopping>0));assert.ok(map.zones.some(z=>!z.buildings&&!z.residents&&!z.jobs&&!z.shopping));
const state=newState(),c=newCompany('global','Global'),other=newCompany('competitor','Competitor');state.companies=[c,other];c.cash=other.cash=10000000;
let site=-1;for(let i=0;i<6400;i++){try{freeFootprint(map,i,'station');if(nearestRoad(map,cellPoint(map,i),150)>=0){site=i;break;}}catch{}}assert.ok(site>=0);
const a=nearestRoad(map,[p(-800,0).lat,p(-800,0).lon]),b=nearestRoad(map,[p(800,0).lat,p(800,0).lon]);
for(const co of state.companies){const occupied=state.companies.flatMap(c=>(c.facilities||[]).flatMap(f=>f.footprint));let depot=-1;for(let i=0;i<6400;i++){try{freeFootprint(map,i,'station',occupied);if(nearestRoad(map,cellPoint(map,i),150)>=0){depot=i;break;}}catch{}}assert.ok(depot>=0);act(state,co.id,{type:'facility',kind:'busdepot',city:key,cell:depot});for(const [n,name]of [[a,'Wohnen'],[b,'Arbeit']])act(state,co.id,{type:'busstop',city:key,node:n,name});act(state,co.id,{type:'buildbus',stopIds:co.stops.map(s=>s.id),name:'Weltbus'});act(state,co.id,{type:'vehicle-buy',depot:co.facilities.find(f=>f.type==='busdepot').id,line:co.lines.at(-1).id});}
const result=networkForecast(state,undefined,Date.parse('2026-10-21T08:00:00Z'));assert.ok(result.summary.demand>0&&result.summary.served>0,'Unlisted world tile creates real trips and transports them');assert.ok(result.lines.every(l=>l.passengers>0));const single=structuredClone(state);single.companies.pop();assert.ok(Math.abs(networkForecast(single,undefined,Date.parse('2026-10-21T08:00:00Z')).summary.demand-result.summary.demand)<.001,'World demand is shared, not duplicated per operator');
for(const [name,kind,x,y]of [['Links','station',-800,100],['Rechts','station',800,100],['Zugdepot','traindepot',0,300]]){const at=p(x,y);act(state,c.id,{type:'facility',kind,city:key,cell:pointCell(map,[at.lat,at.lon]),name});}
const railSites=c.facilities.filter(f=>f.type==='station'),depot=c.facilities.find(f=>f.type==='traindepot'),at=(x,y)=>{const q=p(x,y);return [q.lat,q.lon];};
act(state,c.id,{type:'track',points:[at(-900,125),at(900,125)]});
act(state,c.id,{type:'track',points:[depot.point,at(25,125)]});
act(state,c.id,{type:'buildrail',fromFacility:railSites[0].id,toFacility:railSites[1].id,name:'Landbahn',ticketPrice:.1});
const train=c.lines.at(-1);assert.equal(train.vehicles,0);act(state,c.id,{type:'vehicle-buy',depot:depot.id,line:train.id});assert.ok(networkForecast(state,undefined,Date.parse('2026-10-21T08:00:00Z')).lines.find(l=>l.id===train.id).passengers>0,'Train passengers use the new free track network with an automatically attached depot spur');
console.log('PASS: main OSM API geometry, worldwide unlisted-tile construction, shared nonzero bus demand and operating trains over free tracks with automatic station/depot attachments.');
