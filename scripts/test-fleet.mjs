import assert from 'node:assert/strict';
import {newCompany,newState,act,modes,economy} from '../lib/game.ts';
import {syncFleet} from '../lib/fleet.ts';
import {vehicleModels,defaultModel,vehicleModel,lineFleetStats} from '../lib/vehicle-models.ts';
import {mapBounds,registerMap} from '../lib/real-map.ts';
const state=newState(),c=newCompany('fleet','Fleet'),enemy=newCompany('enemy','Enemy');state.companies=[c,enemy];c.cash=100000000;
const map={key:'fleet-area-a',lat:52.52,lon:13.4,...mapBounds(52.52,13.4),nodes:[[52.52,13.4],[52.52,13.41]],roads:[{name:'Straße',nodes:[0,1],oneway:0}],zones:Array.from({length:6400},(_,id)=>({id,x:id%80,y:Math.floor(id/80),residents:0,jobs:0,shopping:0,buildings:0,water:false})),date:'fixture'};registerMap(map);registerMap({...map,key:'fleet-area-b',lat:53.55,lon:10});
const f=(id,type,city,point)=>({id,name:id,type,city,cell:0,point,footprint:[],platformLength:500,slotsPerRunway:100000});
c.stops=map.nodes.map((point,node)=>({id:'s'+node,name:'Halt '+node,city:map.key,node,point,hub:false}));
c.facilities=[f('a','station',map.key,map.nodes[0]),f('b','station',map.key,map.nodes[1]),f('aa','airport',map.key,map.nodes[0]),f('ab','airport','fleet-area-b',[53.55,10])];
act(state,c.id,{type:'track',points:map.nodes});const before=c.cash;
act(state,c.id,{type:'buildbus',stopIds:c.stops.map(s=>s.id),name:'Busplan',vehicles:8,cash:999999999});
act(state,c.id,{type:'buildrail',fromFacility:'a',toFacility:'b',name:'Bahnplan'});
act(state,c.id,{type:'build',mode:'plane',fromFacility:'aa',toFacility:'ab',name:'Flugplan'});
act(state,c.id,{type:'build',mode:'ship',a:'hamburg',b:'london',name:'Schiffsplan'});
assert.equal(c.cash,before,'Every mode plans free without a vehicle depot');assert.ok(c.lines.every(l=>l.vehicles===0));assert.ok(economy(state).every(r=>r.passengers===0&&r.revenue===0&&r.expenses===0&&r.capacity===0),'Empty lines cannot earn, carry passengers or incur vehicle operating expenses');
c.facilities.push(f('bus-home','busdepot',map.key,map.nodes[0]),f('train-home','traindepot',map.key,map.nodes[0]),{...f('plane-home','airdepot',map.key,map.nodes[0]),airportId:'aa'},f('ship-home','shipdepot','hamburg',[53.55,10]));
enemy.facilities=[f('foreign','busdepot',map.key,map.nodes[0])];assert.throws(()=>act(state,c.id,{type:'vehicle-buy',depot:'foreign'}),/eigenes/);
for(const line of c.lines){const depot=({bus:'bus-home',train:'train-home',plane:'plane-home',ship:'ship-home'})[line.mode],cash=c.cash;
 act(state,c.id,{type:'vehicle-buy',depot});const v=c.fleet.at(-1);assert.equal(cash-c.cash,modes[line.mode].base);assert.equal(line.vehicles,0,'An idle purchased vehicle serves no line');
 act(state,c.id,{type:'vehicle-assign',vehicle:v.id,line:line.id});assert.equal(line.vehicles,1);assert.throws(()=>act(state,enemy.id,{type:'vehicle-assign',vehicle:v.id,line:line.id}),/Eigenes/);
 assert.throws(()=>act(state,c.id,{type:'vehicle-sell',vehicle:v.id}),/Depot/);act(state,c.id,{type:'vehicle-return',vehicle:v.id});assert.equal(line.vehicles,0);
 act(state,c.id,{type:'vehicle-assign',vehicle:v.id,line:line.id});
}
assert.equal(c.fleet.length,4);assert.throws(()=>act(state,c.id,{type:'upgrade',line:c.lines[0].id}),/Depot/);
const catalogCompany=structuredClone(c);catalogCompany.id='catalog';catalogCompany.fleet=[];for(const l of catalogCompany.lines)l.vehicles=0;const catalogState={...newState(),companies:[catalogCompany]};
for(const model of vehicleModels.filter(m=>m.trainRole!=='locomotive'&&m.trainRole!=='coach')){const depot=({bus:'bus-home',train:'train-home',plane:'plane-home',ship:'ship-home'})[model.mode],line=catalogCompany.lines.find(l=>l.mode===model.mode),cash=catalogCompany.cash,previousVehicles=line.vehicles;
 act(catalogState,catalogCompany.id,{type:'vehicle-buy',depot,model:model.id,price:1,capacity:999999,speed:999999});const v=catalogCompany.fleet.at(-1);assert.equal(cash-catalogCompany.cash,model.price);assert.equal(v.model,model.id);assert.equal(v.purchasePrice,model.price);assert.equal(vehicleModel(v).capacity,model.capacity);assert.equal(line.vehicles,previousVehicles,'Buying another idle model does not change line capacity');
 act(catalogState,catalogCompany.id,{type:'vehicle-assign',vehicle:v.id,line:line.id});
}
assert.equal(catalogCompany.fleet.length,15);assert.throws(()=>act(catalogState,catalogCompany.id,{type:'vehicle-buy',depot:'bus-home',model:'plane-airliner'}),/Fahrzeugmodell/);assert.throws(()=>act(catalogState,catalogCompany.id,{type:'vehicle-buy',depot:'bus-home',model:'fake-model'}),/Fahrzeugmodell/);
for(const mode of Object.keys(modes)){const line=catalogCompany.lines.find(l=>l.mode===mode),vehicles=catalogCompany.fleet.filter(v=>v.mode===mode),stats=lineFleetStats(catalogCompany,line,20);assert.equal(stats.vehicles,mode==='train'?6:3);assert.ok(stats.capacity>0&&stats.expenses>0&&stats.speed>0);let separate=0;for(const v of vehicles)separate+=lineFleetStats({...catalogCompany,fleet:[v]},line,20).capacity;assert.ok(Math.abs(stats.capacity-separate)<=5,'Mixed fleets add actual model capacities');}
const modelLine=catalogCompany.lines.find(l=>l.mode==='bus'),baseBus={...catalogCompany.fleet.find(v=>v.mode==='bus'),model:'bus-standard'},smallBus={...baseBus,model:'bus-mini'},largeBus={...baseBus,model:'bus-articulated'};
const modelStats=v=>lineFleetStats({...catalogCompany,fleet:[v]},modelLine,5);assert.ok(modelStats(largeBus).capacity>modelStats(baseBus).capacity);assert.ok(modelStats(smallBus).expenses<modelStats(baseBus).expenses);assert.ok(modelStats(smallBus).speed>modelStats(largeBus).speed);
const modelState={...newState(),companies:[{...catalogCompany,fleet:[baseBus],lines:[{...modelLine,vehicles:1}]}]};const forecast1=economy(modelState).find(r=>r.id===modelLine.id);modelState.companies[0].fleet[0].model='bus-articulated';const forecast2=economy(modelState).find(r=>r.id===modelLine.id);assert.ok(forecast2.capacity>forecast1.capacity,'Changing a model with the same vehicle count invalidates cached forecasts');assert.ok(forecast2.expenses>forecast1.expenses);
const count=c.fleet.length,cash=c.cash;act(state,c.id,{type:'sell',line:c.lines[0].id});assert.equal(c.fleet.length,count,'Deleting a free line retains purchased vehicles');assert.equal(c.cash,cash,'Deleting a line cannot create money');assert.equal(c.fleet[0].line,undefined);
act(state,c.id,{type:'vehicle-sell',vehicle:c.fleet[0].id});assert.equal(c.cash-cash,modes.bus.base*.5);
const legacy=newCompany('legacy','Legacy');delete legacy.fleet;legacy.lines=[{id:'paid',mode:'bus',a:'berlin',b:'hamburg',vehicles:2}];legacy.facilities=[f('old','busdepot',map.key,map.nodes[0])];const balance=legacy.cash;syncFleet(legacy);const ids=legacy.fleet.map(v=>v.id);syncFleet(legacy);assert.deepEqual(legacy.fleet.map(v=>v.id),ids);assert.equal(legacy.fleet.length,2);assert.equal(legacy.cash,balance,'Paid legacy vehicles migrate once without another charge');
assert.ok(legacy.fleet.every(v=>v.model===defaultModel('bus').id));const noModel={...legacy.fleet[0]};delete noModel.model;legacy.fleet=[noModel];syncFleet(legacy);assert.equal(legacy.fleet[0].model,defaultModel('bus').id);assert.equal(legacy.cash,balance);
console.log('PASS: all modes plan free with zero vehicles, no phantom income/capacity, depot purchases, idle vs assigned fleet, ownership, returns, retained assets on line deletion, guarded resale and idempotent legacy migration.');

const renamed=catalogCompany.fleet[0],paid=renamed.purchasePrice,assignment=renamed.line;act(catalogState,catalogCompany.id,{type:'vehicle-rename',vehicle:renamed.id,name:'  Regionalbus 01  '});assert.equal(renamed.name,'Regionalbus 01');assert.equal(renamed.purchasePrice,paid);assert.equal(renamed.line,assignment);assert.throws(()=>act(catalogState,catalogCompany.id,{type:'vehicle-rename',vehicle:renamed.id,name:'x'}),/Fahrzeugname/);assert.throws(()=>act(catalogState,catalogCompany.id,{type:'vehicle-rename',vehicle:renamed.id,name:'x'.repeat(51)}),/Fahrzeugname/);catalogState.companies.push(newCompany('foreign-renamer','Other'));assert.throws(()=>act(catalogState,'foreign-renamer',{type:'vehicle-rename',vehicle:renamed.id,name:'Stolen'}),/Eigenes Fahrzeug/);
console.log('PASS: owned vehicle renaming preserves assignment and purchase price; foreign and invalid names are rejected.');

// One atomic order for any transport mode; server prices and ownership still apply.
for(const mode of Object.keys(modes)){
 const batch=structuredClone(catalogState);batch.vehicleLimit=256;const co=batch.companies[0],depot=({bus:'bus-home',train:'train-home',plane:'plane-home',ship:'ship-home'})[mode],model=defaultModel(mode);co.cash=1000000000;const length=co.fleet.length,balance=co.cash;
 act(batch,co.id,{type:'vehicle-buy',depot,model:model.id,quantity:3,name:'Serie',line:co.lines.find(l=>l.mode===mode).id,price:1});assert.equal(co.fleet.length,length+3);assert.equal(balance-co.cash,3*model.price);assert.equal(new Set(co.fleet.slice(-3).map(v=>v.id)).size,3);assert.deepEqual(co.fleet.slice(-3).map(v=>v.name),['Serie 1','Serie 2','Serie 3']);assert.ok(co.fleet.slice(-3).every(v=>v.line&&v.purchasePrice===model.price));
 for(const quantity of [0,-1,1.5,257,'3',null,NaN]){const count=co.fleet.length,cash=co.cash;assert.throws(()=>act(batch,co.id,{type:'vehicle-buy',depot,quantity}));assert.equal(co.fleet.length,count);assert.equal(co.cash,cash);}
 const count=co.fleet.length;co.cash=model.price*2;assert.throws(()=>act(batch,co.id,{type:'vehicle-buy',depot,model:model.id,quantity:3}),/gesamte Bestellung/);assert.equal(co.fleet.length,count);assert.equal(co.cash,model.price*2);
 co.cash=1000000000;assert.throws(()=>act(batch,co.id,{type:'vehicle-buy',depot,quantity:256}),/256/);assert.equal(co.fleet.length,count);
}
console.log('PASS: atomic bulk vehicle purchases in all modes, total cost, model/depot/assignment validation, unique numbered vehicles, quantity and company limits, no partial purchases.');
