import assert from 'node:assert/strict';
import {newState,build,addTrack,signHaulage,purchaseVehicle,createLine,assignVehicle,stepDay,checkIntegrity} from '../lib/logistics/engine.ts';
let s=newState();s.cash=1000000000;
s.sites.push({id:'osm:node:qa-source',name:'QA source',kind:'warehouse',lat:47.07,lon:15.43},{id:'osm:node:qa-dest',name:'QA destination',kind:'supermarket',lat:47.15,lon:15.43});
build(s,'depot',47.06,15.43);build(s,'shipDepot',47.12,15.43);
build(s,'railDepot',47.085,15.43);const a=build(s,'railStation',47.08,15.43),b=build(s,'railStation',47.09,15.43),p=build(s,'port',47.10,15.43),q=build(s,'port',47.14,15.43);
addTrack(s,[a.lat,a.lon],[b.lat,b.lon]);
const order=signHaulage(s,'osm:node:qa-source','osm:node:qa-dest',12);
for(const [model,mode,from,to] of [['truck','truck','osm:node:qa-source',a.id],['containerRail','rail',a.id,b.id],['truck','truck',b.id,p.id],['cargoShip','ship',p.id,q.id],['truck','truck',q.id,'osm:node:qa-dest']]){
 const line=createLine(s,{name:model+from,mode,good:'containers',stops:[{siteId:from,action:'load',quantity:12,orderIds:[order.id]},{siteId:to,action:to.startsWith('own:')?'transfer':'unload',quantity:12}],duration:null});
 const vehicle=purchaseVehicle(s,model,model==='truck'?'krone-box':undefined);assignVehicle(s,vehicle.id,line.id);
}
for(let day=0;day<90;day++){s=stepDay(s);checkIntegrity(s);}
const completed=s.contracts.find(c=>c.id===order.id);assert.equal(completed.delivered,12,'all containers travel truck → rail → truck → ship → truck');assert.ok(completed.paid>0);
const paid=completed.paid;for(let day=0;day<30;day++)s=stepDay(s);assert.equal(s.contracts.find(c=>c.id===order.id).paid,paid,'one payment for one consignment');
console.log('PASS intermodal: one container consignment across truck, own railway, port, ship and final truck; no duplicate payout.');
