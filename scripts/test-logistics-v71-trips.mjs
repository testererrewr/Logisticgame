import assert from 'node:assert/strict';
import {newState,build,purchaseVehicle,createLine,assignVehicle,stepTime,checkIntegrity} from '../lib/logistics/engine.ts';
import {acceptContainerOrder} from '../lib/logistics/order-accept.ts';

const s=newState();s.live=true;s.driversOff=true;s.cash=1e9;build(s,'depot',47.07,15.44);
const src={id:'doc-1',kind:'doctors',name:'Dr. Grohmann',lat:47.071,lon:15.44,tags:{}},cafe={id:'cafe-1',kind:'cafe',name:'Café Ambra',lat:47.08,lon:15.44,tags:{}};s.sites.push(src,cafe);
const road=(x,y)=>({fromId:x.id,toId:y.id,km:.5,path:[[x.lat,x.lon],[y.lat,y.lon]],source:'osm-strassen',geometryVersion:2});
s.roadRoutes=s.sites.flatMap(x=>s.sites.filter(y=>x.id!==y.id).map(y=>road(x,y)));
acceptContainerOrder(s,{id:'w:1:'+src.id+':0',world_id:'w',day:Math.floor(s.day),source_id:src.id,destination_id:cafe.id,slot:0,quantity:20,fee:5,deadline:s.day+10,status:'open',accepted_by:null,good:'containers'});
const order=s.contracts.at(-1);
const v=purchaseVehicle(s,'truck','schmitz-container');v.containerOrderIds=['alter-auftrag-erledigt'];s.contracts.push({...order,id:'alter-auftrag-erledigt',delivered:order.total,completedDay:s.day});
const l=createLine(s,{name:'C',mode:'truck',good:'all',duration:null,stops:[{siteId:src.id,action:'load',good:'all',quantity:1e9,orderIds:['alter-auftrag-erledigt']},{siteId:cafe.id,action:'unload',good:'all',quantity:1e9,orderIds:['alter-auftrag-erledigt']}],legs:s.roadRoutes});
assignVehicle(s,v.id,l.id);
let w=s,t=s.day;for(let i=0;i<3000&&!(w.contracts.find(c=>c.id===order.id).delivered>=20);i++){t+=.0005;w=stepTime(w,t);}
assert.equal(w.contracts.find(c=>c.id===order.id).delivered,20,'neuer Auftrag wird trotz veralteter Auswahl geladen und geliefert: '+w.vehicles[0].restReason);
checkIntegrity(w);

let vehicle=w.vehicles.find(x=>x.id===v.id);
assert.equal(vehicle.tripsTotal,1,'Containerlieferung zählt als beendete Linienfahrt');
assert.equal(vehicle.completedTripsTotal,1,'Containerlieferung zählt dauerhaft');
acceptContainerOrder(w,{id:'w:next:'+src.id+':0',world_id:'w',day:Math.floor(w.day),source_id:src.id,destination_id:cafe.id,slot:0,quantity:20,fee:5,deadline:w.day+10,status:'open',accepted_by:null,good:'containers'});
const next=createLine(w,{name:'Nächster Auftrag',mode:'truck',good:'all',duration:null,stops:[{siteId:src.id,action:'load',good:'all',quantity:1e9},{siteId:cafe.id,action:'unload',good:'all',quantity:1e9}],legs:w.roadRoutes});
vehicle.status='idle';assignVehicle(w,vehicle.id,next.id);
assert.equal(vehicle.tripsTotal,0,'Linienlimit beginnt für neue Linie neu');
assert.equal(vehicle.completedTripsTotal,1,'Gesamtzähler bleibt beim Linienwechsel erhalten');
const {recordCompletedTrip,ensureVehicleStatistics}=await import('../lib/logistics/vehicle-statistics.ts');
recordCompletedTrip(vehicle,w.day);assert.equal(vehicle.completedTripsTotal,2);
vehicle.tripsToday=0;ensureVehicleStatistics(vehicle,w.day+1);assert.equal(vehicle.completedTripsTotal,2,'Tageswechsel setzt Gesamtzähler nicht zurück');
const legacy={...vehicle,completedTripsTotal:undefined,tripsTotal:7,tripsToday:3};
ensureVehicleStatistics(legacy,w.day);assert.equal(legacy.completedTripsTotal,7);
legacy.tripsTotal=0;ensureVehicleStatistics(legacy,w.day);assert.equal(legacy.completedTripsTotal,7,'Migration erfolgt nur einmal');
recordCompletedTrip(legacy,w.day);assert.equal(legacy.completedTripsTotal,8);
console.log('PASS Containerfahrt, Linienwechsel, Tageswechsel und einmalige Übernahme alter Zähler.');
