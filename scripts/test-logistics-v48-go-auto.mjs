import assert from 'node:assert/strict';
import {newState,build,purchaseVehicle,createLine,assignVehicle,stepTime,requestManualDeparture,vehicleCargo,stock,checkIntegrity} from '../lib/logistics/engine.ts';
const fresh=()=>{const s=newState();s.live=true;s.cash=1e10;return s;},road=(a,b)=>({fromId:a.id,toId:b.id,km:.1,path:[[a.lat,a.lon],[b.lat,b.lon]],source:'osm-strassen',geometryVersion:2}),st=(p,action,good='all',quantity=1e9)=>({siteId:p.id,action,good,quantity});
const until=(s,test,limit=400)=>{let t=s.day;for(let i=0;i<limit;i++){t+=.0005;s=stepTime(s,t);if(test(s))return s;}throw Error('Zustand nicht erreicht');};

{const s=fresh();build(s,'depot',47.07,15.44);const a=build(s,'warehouseSmall',47.071,15.44),b=build(s,'warehouseSmall',47.072,15.44),c=build(s,'warehouseSmall',47.073,15.44);
 s.inventory[a.id]={bread:40,packaging:30};s.roadRoutes=s.sites.flatMap(x=>s.sites.filter(y=>x.id!==y.id).map(y=>road(x,y)));
 const v=purchaseVehicle(s,'truck','krone-profi'),l=createLine(s,{name:'Go auto',mode:'truck',good:'all',manualDeparture:true,duration:null,stops:[st(a,'load'),st(b,'unload','bread',25),st(c,'unload')],legs:s.roadRoutes});
 assignVehicle(s,v.id,l.id);let w=until(s,x=>!!x.vehicles[0].manualHold);assert.equal(w.vehicles[0].manualHold.index,0,'Go wartet nur am Ladestopp');
 requestManualDeparture(w,v.id,'all');
 w=until(w,x=>stock(x,c.id,'packaging')>0&&!!x.vehicles[0].manualHold);
 assert.equal(stock(w,b.id,'bread'),25,'Stopp 2 entlädt automatisch nur das gewählte Gut bis zur Höchstmenge');
 assert.equal(stock(w,b.id,'packaging'),0);
 assert.equal(stock(w,c.id,'bread'),15,'Restmenge am nächsten Entladestopp');
 assert.equal(stock(w,c.id,'packaging'),30);
 assert.equal(vehicleCargo(w.vehicles[0]).length,0);
 assert.equal(w.vehicles[0].manualHold.index,0,'zurück am Ladestopp wartet das Fahrzeug wieder auf Go');checkIntegrity(w);}

{const s=fresh();build(s,'depot',47.07,15.44);const a=build(s,'warehouseSmall',47.071,15.44),b=build(s,'warehouseSmall',47.09,15.44);
 s.inventory[a.id]={bread:40};s.roadRoutes=s.sites.flatMap(x=>s.sites.filter(y=>x.id!==y.id).map(y=>road(x,y)));
 const v=purchaseVehicle(s,'truck','krone-profi'),l=createLine(s,{name:'Voll',mode:'truck',good:'all',manualDeparture:true,duration:null,stops:[st(a,'load'),st(b,'unload')],legs:s.roadRoutes});
 assignVehicle(s,v.id,l.id);let w=until(s,x=>!!x.vehicles[0].manualHold);const room=1e9;w.inventory[b.id]={sand:room};
 requestManualDeparture(w,v.id,'all');w=until(w,x=>x.events.some(e=>e.text.includes('Lager voll')));
 assert.ok(w.events.some(e=>e.text.includes('Lager voll')&&e.text.includes('bleiben an Bord')),'volles Ziellager wird gemeldet');}

{const s=fresh();build(s,'depot',47.07,15.44);const a=build(s,'warehouseSmall',47.071,15.44),b=build(s,'warehouseSmall',47.072,15.44),c=build(s,'warehouseSmall',47.073,15.44);
 s.inventory[a.id]={bread:40,packaging:30};s.roadRoutes=s.sites.flatMap(x=>s.sites.filter(y=>x.id!==y.id).map(y=>road(x,y)));
 const v=purchaseVehicle(s,'truck','krone-profi'),l=createLine(s,{name:'Go Plan',mode:'truck',good:'all',manualDeparture:true,duration:null,stops:[st(a,'load'),st(b,'unload'),st(c,'unload')],legs:s.roadRoutes});
 assignVehicle(s,v.id,l.id);let w=until(s,x=>!!x.vehicles[0].manualHold);
 assert.throws(()=>requestManualDeparture(structuredClone(w),v.id,'all',undefined,undefined,[{index:0,goods:'all',quantity:null}]),/Entladeauswahl/);
 requestManualDeparture(w,v.id,'all',undefined,undefined,[{index:1,goods:['packaging'],quantity:10},{index:2,goods:'all',quantity:null}]);
 w=until(w,x=>stock(x,c.id,'bread')>0&&!!x.vehicles[0].manualHold);
 assert.equal(stock(w,b.id,'packaging'),10,'Entladeplan beim Go: nur Verpackung, höchstens 10 EH an Stopp 2');
 assert.equal(stock(w,b.id,'bread'),0);
 assert.equal(stock(w,c.id,'packaging'),20);assert.equal(stock(w,c.id,'bread'),40);
 assert.equal(w.vehicles[0].unloadPlan,undefined,'Plan gilt nur für diese Runde');checkIntegrity(w);}

console.log('PASS v48 Go: nur Ladestopps warten auf Go; Entladestopps arbeiten automatisch mit Güterfilter und Höchstmenge je Stopp; volles Lager wird gemeldet; Entladeplan pro Stopp beim Go.');
