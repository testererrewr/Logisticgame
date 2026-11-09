import assert from 'node:assert/strict';
import {newState,build,stepTime,purchaseVehicle,createLine,assignVehicle} from '../lib/logistics/engine.ts';
import {energyPrice,consumptionPer100} from '../lib/logistics/fuel.ts';
const road=(x,y)=>({fromId:x.id,toId:y.id,km:30,path:[[x.lat,x.lon],[y.lat,y.lon]],source:'osm-strassen',geometryVersion:2});
function run(off){const s=newState();s.cash=1e9;s.live=true;s.fuelOff=off;build(s,'depot',47.07,15.44);const a=build(s,'warehouseSmall',47.0,15.44),b=build(s,'warehouseSmall',47.3,15.44);s.inventory[a.id]={wheat:2000};s.roadRoutes=s.sites.flatMap(x=>s.sites.filter(y=>x.id!==y.id).map(y=>road(x,y)));const v=purchaseVehicle(s,'truck','schmitz-kipper');const l=createLine(s,{name:'T',mode:'truck',good:'wheat',duration:null,stops:[{siteId:a.id,action:'load',good:'wheat',quantity:1e9},{siteId:b.id,action:'unload',good:'wheat',quantity:1e9}],legs:s.roadRoutes});assignVehicle(s,v.id,l.id);let x=s;for(let i=0;i<150;i++)x=stepTime(x,x.day+0.002);return x;}
const on=run(false),off=run(true),v=on.vehicles[0];
assert.ok(v.odometerKm>5,'Fahrzeug ist gefahren');assert.ok(v.fuelUsed>0&&v.fuelCost>0,'Verbrauch und Kosten erfasst');
const perKm=v.fuelCost/v.odometerKm;assert.ok(perKm>.3&&perKm<.9,'Diesel-Sattelzug ca. 0,4–0,6 €/km, gemessen '+perKm.toFixed(2));
const cat=Object.values(on.finance.days).reduce((n,d)=>n+(d.expenseCategories['Treibstoff & Energie']||0),0);assert.ok(Math.abs(cat-v.fuelCost)<.05,'in den Finanzen gebucht');
assert.equal(off.vehicles[0].fuelCost,undefined,'ohne Treibstoffkosten in Welten mit ausgeschaltetem Treibstoff');
assert.ok(energyPrice('diesel',1)>1&&energyPrice('diesel',1)<2.2);
console.log('PASS v57 Treibstoff: Verbrauch je km nach Modell und Beladung, tägliche Energiepreise, Buchung unter Treibstoff & Energie, abschaltbar je Welt.');
