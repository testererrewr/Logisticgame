import assert from 'node:assert/strict';
import {newState,profile,signSupply,signProcess,signSale,signHaulage,build,addTrack,purchaseVehicle,createLine,assignVehicle,configureTrain,wagonCapacity,stepDay,stock,checkIntegrity,good} from '../lib/logistics/engine.ts';
const mk=(id,name,kind,x)=>({id:`osm:node:${id}`,name,kind,lat:47.07,lon:15.44+x,osmUrl:`https://www.openstreetmap.org/node/${id}`});
const farm=mk(1,'Testhof','farm',0),mill=mk(2,'Testmühle','mill',.01),bakery=mk(3,'Testbäckerei','bakery',.02),shop=mk(4,'Testmarkt','supermarket',.03),another=mk(5,'Testlager','warehouse',.08);
let s=newState();s.sites.push(farm,mill,bakery,shop,another);
const supplyCap=profile(farm).production.wheat;
assert.throws(()=>signSupply(s,farm.id,'wheat',supplyCap+1),/verfügbar/);
signSupply(s,farm.id,'wheat',Math.min(10,supplyCap));
assert.throws(()=>signSupply(s,farm.id,'wheat',supplyCap),/verfügbar/);
signProcess(s,mill.id,'flour',10);
assert.throws(()=>signProcess(s,mill.id,'flour',profile(mill).capacity),/Verarbeitungslimit/);
signProcess(s,bakery.id,'bread',Math.min(8,profile(bakery).capacity));
const sale=signSale(s,shop.id,'bread',Math.min(6,profile(shop).capacity));
assert.ok(sale.endDay-sale.startDay>=30&&sale.endDay-sale.startDay<=365);
const depot=build(s,'depot',47.07,15.44+.005);const hub=build(s,'hub',47.07,15.44+.024);
const line=(name,goodId,stops,duration=null)=>createLine(s,{name,mode:'truck',good:goodId,stops:stops.map(([siteId,action,quantity])=>({siteId,action,quantity,...(goodId==='containers'?{orderIds:s.contracts.filter(c=>c.kind==='haulage').map(c=>c.id)}:{})})),duration});
const routes=[line('Wheat to mill','wheat',[[farm.id,'load',10],[mill.id,'unload',10]]),line('Flour to bakery','flour',[[mill.id,'load',10],[bakery.id,'unload',10]]),line('Bread to warehouse','bread',[[bakery.id,'load',10],[hub.id,'transfer',10]]),line('Warehouse to market','bread',[[hub.id,'load',10],[shop.id,'unload',10]])];
for(const r of routes){const v=purchaseVehicle(s,'truck',r.good==='bread'?'krone-profi':'schmitz-kipper');assignVehicle(s,v.id,r.id);}
const before=s.cash;for(let i=0;i<42;i++){s=stepDay(s);checkIntegrity(s);}
assert.ok(s.contracts.find(c=>c.id===sale.id).delivered>0,'Delivered baked bread to consumer through hub');
assert.ok(s.events.some(e=>e.text.includes('geladen')),'Farm actually loaded physical inventory');
assert.ok(s.events.some(e=>e.text.includes('verkauft')),'Sale paid at receiver');
const order=signHaulage(s,another.id,shop.id,12);assert.equal(stock(s,another.id,'containers'),12);assert.throws(()=>signHaulage(s,another.id,shop.id,12),/bereits/);
const leg1=line('Container leg 1','containers',[[another.id,'load',12],[hub.id,'transfer',12]]);
const leg2=line('Container leg 2','containers',[[hub.id,'load',12],[shop.id,'unload',12]]);
for(const leg of [leg1,leg2]){const assigned=purchaseVehicle(s,'truck','krone-box');assignVehicle(s,assigned.id,leg.id);}
for(let i=0;i<20;i++){s=stepDay(s);checkIntegrity(s);}
assert.equal(s.contracts.find(c=>c.id===order.id).delivered,12,'Order complete through a hub');
const earnedOnce=s.contracts.find(c=>c.id===order.id).paid;
for(let i=0;i<15;i++)s=stepDay(s);
assert.equal(s.contracts.find(c=>c.id===order.id).paid,earnedOnce,'No double-payment on extra runs');
assert.ok(s.cash<before||s.earned>0,'Real capital accounting');
const short=line('Temporary wheat','wheat',[[farm.id,'load',5],[mill.id,'unload',5]],3);const v=purchaseVehicle(s,'truck','schmitz-kipper');assignVehicle(s,v.id,short.id);
for(let i=0;i<10;i++)s=stepDay(s);
assert.equal(s.lines.find(l=>l.id===short.id).active,false);
assert.equal(s.vehicles.find(x=>x.id===v.id).status,'idle');
assert.equal(s.vehicles.find(x=>x.id===v.id).lineId,undefined);
console.log('PASS logistics: capacity, production → processing → hub → retail, payment, expiry, return, inventory integrity.');

const r=newState();r.cash=30000000;
const stationA=build(r,'railDepot',47.101,15.398),stationB=build(r,'railDepot',47.101,15.6);
assert.throws(()=>createLine(r,{name:'No rails',mode:'rail',good:'wheat',stops:[{siteId:stationA.id,action:'load',quantity:20},{siteId:stationB.id,action:'unload',quantity:20}],duration:null}),/Gleis/);
addTrack(r,[stationA.lat,stationA.lon],[stationB.lat,stationB.lon]);
const rline=createLine(r,{name:'Rail connected',mode:'rail',good:'wheat',stops:[{siteId:stationA.id,action:'load',quantity:20},{siteId:stationB.id,action:'unload',quantity:20}],duration:7});
const train=purchaseVehicle(r,'bulkRail');
assert.equal(wagonCapacity(train,'bulk'),694*8);
assert.throws(()=>configureTrain(r,train.id,[{type:'bulk',count:4},{type:'refrigerated',count:2}]),/deaktiviert/);
const configured=purchaseVehicle(r,'bulkRail',undefined,stationA.id,[{type:'bulk',count:4},{type:'refrigerated',count:2}]);
assert.equal(wagonCapacity(configured,'chilled'),720*2);
assert.equal(wagonCapacity(configured,'bulk'),694*4);
assignVehicle(r,train.id,rline.id);
assert.throws(()=>configureTrain(r,train.id,[{type:'flat',count:9}]),/deaktiviert/);
console.log('PASS rail: track connection, vehicle wagon layout, and dispatch constraints.');
