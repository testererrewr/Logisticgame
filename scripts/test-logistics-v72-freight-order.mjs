import assert from 'node:assert/strict';
import {newState,build,purchaseVehicle,createLine,assignVehicle,stepTime,stopHasWork,checkIntegrity} from '../lib/logistics/engine.ts';
import {acceptContainerOrder} from '../lib/logistics/order-accept.ts';

const state=newState();state.live=true;state.driversOff=true;state.cash=1e9;
const depot=build(state,'depot',47.07,15.44);
const source={id:'factory-order-source',kind:'factory',name:'Felbermayr',lat:47.071,lon:15.44,tags:{}};
const destination={id:'factory-order-destination',kind:'electronicsShop',name:'Elektro Karner',lat:47.08,lon:15.44,tags:{}};
state.sites.push(source,destination);
const road=(a,b)=>({fromId:a.id,toId:b.id,km:.5,path:[[a.lat,a.lon],[b.lat,b.lon]],source:'osm-strassen',geometryVersion:2});
state.roadRoutes=state.sites.flatMap(a=>state.sites.filter(b=>a.id!==b.id).map(b=>road(a,b)));
acceptContainerOrder(state,{id:'accepted-machinery-parts',world_id:'world',day:Math.floor(state.day),source_id:source.id,destination_id:destination.id,slot:0,quantity:50,fee:29.04,deadline:state.day+12,status:'open',accepted_by:null,good:'machineryParts'});
const vehicle=purchaseVehicle(state,'truck','schmitz-container',depot.id);
const line=createLine(state,{name:'Vertragsfracht',mode:'truck',good:'all',duration:null,stops:[{siteId:source.id,action:'load',good:'all',quantity:1000},{siteId:destination.id,action:'unload',good:'all',quantity:1000}],legs:state.roadRoutes});
assignVehicle(state,vehicle.id,line.id);
assert.equal(stopHasWork(state,vehicle,line,0),true,'angenommener Auftrag muss den Ladestopp aktivieren');
let next=state,time=state.day;
for(let i=0;i<4000&&next.contracts[0].delivered<50;i++){time+=.0005;next=stepTime(next,time);}
assert.equal(next.contracts[0].delivered,50,'Warenauftrag muss beim Vertragsziel ausgeliefert werden');
assert.ok(next.contracts[0].paid>0);
checkIntegrity(next);
console.log('PASS Vertragsfracht mit Warenauftrag lädt und liefert trotz fehlendem normalem Tagesbedarf.');
