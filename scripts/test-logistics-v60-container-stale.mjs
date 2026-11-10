import assert from 'node:assert/strict';
import {newState,build,purchaseVehicle,createLine,assignVehicle,stepTime,checkIntegrity} from '../lib/logistics/engine.ts';
import {acceptContainerOrder} from '../lib/logistics/order-accept.ts';

const s=newState();s.live=true;s.cash=1e9;build(s,'depot',47.07,15.44);
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
console.log('PASS v60 Veraltete Container-Auswahl blockiert Linien nicht mehr.');
