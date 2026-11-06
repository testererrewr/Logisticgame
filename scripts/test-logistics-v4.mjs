import assert from 'node:assert/strict';
import {MAX_FLEET_PURCHASE,newState,build,purchaseFleet,purchaseVehicle,warehouseUpgrade,storageCapacity,cargoCapacity,GOODS,RECIPES,profile,normalizeFreightState,checkIntegrity,WAGONS,VEHICLES,TRAILERS} from '../lib/logistics/engine.ts';
const s=newState();s.cash=200000000;
const a=build(s,'depot',47.07,15.44),b=build(s,'depot',47.08,15.44);
const cash=s.cash,per=VEHICLES.find(v=>v.id==='truck').price+TRAILERS.find(t=>t.id==='krone-profi').price;
const batch=purchaseFleet(s,{modelId:'truck',trailerId:'krone-profi',count:3,depotId:b.id});
assert.equal(batch.length,3);assert.ok(batch.every(v=>v.locationId===b.id));assert.equal(s.cash,cash-3*per);
for(const patch of [{count:0},{count:1.1},{count:MAX_FLEET_PURCHASE+1},{depotId:''},{depotId:'not-owned'},{trailerId:'body-cool'}]){const before=JSON.stringify(s);assert.throws(()=>purchaseFleet(s,{modelId:'truck',trailerId:'krone-profi',count:2,depotId:b.id,...patch}));assert.equal(JSON.stringify(s),before,'failed batch is atomic');}
const station=build(s,'railDepot',47.101,15.398),sets=[{type:'bulk',count:2},{type:'container',count:3}],before=s.cash;
const train=purchaseFleet(s,{modelId:'bulkRail',depotId:station.id,count:2,wagons:sets});assert.deepEqual(train[0].wagons,sets);
const trainPrice=VEHICLES.find(v=>v.id==='bulkRail').price+sets.reduce((n,x)=>n+x.count*WAGONS.find(w=>w.id===x.type).price,0);assert.equal(s.cash,before-trainPrice*2);assert.ok(train.every(v=>v.locationId===station.id));
const low=purchaseVehicle(s,'truck','faymonville-multimax');let eligible=0;for(const good of GOODS){if(good.requiresHeavy){assert.ok(cargoCapacity(low,good.id)>0,good.id);eligible++;assert.equal(cargoCapacity(batch[0],good.id),0);}else assert.equal(cargoCapacity(low,good.id),0,good.id+' is not necessary heavy cargo');}assert.equal(eligible,7);
for(const [kind,base,point] of [['warehouseSmall',1200,[47.09,15.44]],['warehouseMedium',8000,[47.10,15.44]],['warehouse',32000,[47.11,15.44]],['warehouseXL',100000,[47.12,15.44]]]){const warehouse=build(s,kind,...point);assert.equal(storageCapacity(warehouse),base);assert.throws(()=>warehouseUpgrade(s,warehouse.id),/bestätigt/);for(let level=2;level<=5;level++){warehouseUpgrade(s,warehouse.id,true);assert.equal(storageCapacity(warehouse),base*(1+(level-1)*.75));}assert.throws(()=>warehouseUpgrade(s,warehouse.id,true),/Maximale/);}
assert.ok(GOODS.length>=160);assert.ok(RECIPES.length>=110);for(const recipe of RECIPES){assert.ok(GOODS.some(g=>g.id===recipe.output));for(const id of Object.keys(recipe.inputs))assert.ok(GOODS.some(g=>g.id===id),id);}
assert.ok(profile({id:'auto',name:'Werk',lat:47,lon:15,kind:'automotive'}).recipes.includes('auto-final-assembly'));
assert.ok(RECIPES.find(r=>r.id==='auto-truckEngine').inputs.pistons>0);
const old=structuredClone(s);delete old.freightRulesVersion;old.vehicles.find(v=>v.id===low.id).cargo={good:'bread',quantity:10};const migrated=normalizeFreightState(old);assert.equal(migrated.vehicles.find(v=>v.id===low.id).cargo.quantity,10);checkIntegrity(migrated);
console.log('PASS v4: atomic batch purchase into chosen depot, configured and correctly priced trains, 4 warehouse sizes / 5 expansion levels, exclusive heavy haulage and individual vehicle-part recipes.');
