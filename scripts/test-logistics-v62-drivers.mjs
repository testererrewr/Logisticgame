import assert from 'node:assert/strict';
import {newState,build,purchaseVehicle,createLine,assignVehicle,stepTime,handlingDays} from '../lib/logistics/engine.ts';
import {hireDriver,fireDriver,assignDriver,autoCrew,levelOf,crewReady,fuelFactor,breakdownFactor,handlingFactor,CREW_ROLES,LEVEL_HOURS} from '../lib/logistics/drivers.ts';
const road=(x,y)=>({fromId:x.id,toId:y.id,km:Math.hypot(x.lat-y.lat,x.lon-y.lon)*111,path:[[x.lat,x.lon],[y.lat,y.lon]],source:'osm-strassen',geometryVersion:2});
function world(){const s=newState();s.live=true;s.cash=1e7;build(s,'depot',47,15.44);const a=build(s,'warehouseSmall',47.01,15.44),b=build(s,'warehouseSmall',47.1,15.44);s.inventory[a.id]={wheat:500};s.roadRoutes=s.sites.flatMap(x=>s.sites.filter(y=>x.id!==y.id).map(y=>road(x,y)));return {s,a,b};}

{const {s}=world();purchaseVehicle(s,'truck','krone-profi');purchaseVehicle(s,'boeing-737-800bcf'===''?'x':'truck','krone-profi');const x=stepTime(s,s.day+.001);assert.equal(x.drivers.length,2,'je LKW ein Fahrer');assert.ok(x.vehicles.every(v=>crewReady(x,v)));assert.ok(x.events.some(e=>e.text.includes('Personal eingeführt')));}

{const {s,a,b}=world();let x=stepTime(s,s.day+.001);assert.deepEqual(x.drivers,[]);const v=purchaseVehicle(x,'truck','schmitz-kipper');const l=createLine(x,{name:'W',mode:'truck',good:'wheat',duration:null,stops:[{siteId:a.id,action:'load',good:'wheat',quantity:1e9},{siteId:b.id,action:'unload',good:'wheat',quantity:1e9}],legs:x.roadRoutes});assignVehicle(x,v.id,l.id);
 for(let i=0;i<20;i++)x=stepTime(x,x.day+.001);assert.equal(x.vehicles[0].status,'idle');assert.equal(x.vehicles[0].restReason,'Kein Fahrer zugewiesen');
 const cash=x.cash;const d=hireDriver(x,{id:'cand-1',name:'Anna Huber',role:'truck',xpHours:0},x.vehicles[0].id);assert.equal(cash-x.cash,CREW_ROLES.truck.wage,'erster Wochenlohn');
 for(let i=0;i<40;i++)x=stepTime(x,x.day+.002);assert.ok(['enroute','idle','returning'].includes(x.vehicles[0].status));assert.ok(x.vehicles[0].odometerKm>0,'fährt mit Fahrer los');assert.ok(x.drivers[0].xpHours>0,'sammelt Erfahrung');
 assert.throws(()=>assignDriver(x,x.drivers[0].id,'nix'));

 const before=x.cash,paid=x.drivers[0].paidUntilDay;let y=x;for(let i=0;i<9;i++)y=stepTime(y,y.day+1,100000);assert.ok(y.drivers[0].paidUntilDay>paid,'Lohn weiter bezahlt');assert.ok(Object.values(y.finance.days).some(r=>r.expenseCategories?.Personal>0),'Finanzkategorie Personal');}

{assert.equal(levelOf(0),1);assert.equal(levelOf(LEVEL_HOURS[4]),5);const {s}=world();const v=purchaseVehicle(s,'truck','krone-profi');s.drivers=[];hireDriver(s,{id:'p',name:'Profi',role:'truck',xpHours:6000},v.id);
 assert.ok(Math.abs(fuelFactor(s,v)-.92)<1e-9,'-8 % Treibstoff');assert.equal(breakdownFactor(s,v),.8);assert.ok(Math.abs(handlingFactor(s,v)-.9)<1e-9,'10 % schneller');
 const base=handlingDays(v,100);v.crewFactor=handlingFactor(s,v);assert.ok(Math.abs(handlingDays(v,100)-base*.9)<1e-12);
 const c=fireDriver(s,s.drivers[0].id);assert.equal(c.xpHours,6000,'Kündigung: Stufe bleibt erhalten');assert.equal(s.drivers.length,0);assert.equal(breakdownFactor(s,v),1.3,'ohne Fahrer = Neuling-Risiko');}

{const s=newState();s.cash=1e9;s.drivers=[];const d=build(s,'airport',47.07,15.44);const v=purchaseVehicle(s,'boeing-737-800bcf');const n=autoCrew(s,v,(role,i)=>({id:'auto-'+i,name:'Pilot '+i,role,xpHours:0}));assert.equal(n,2);assert.ok(crewReady(s,v));assert.throws(()=>hireDriver(s,{id:'x',name:'X',role:'air',xpHours:0},v.id),/genug Besatzung/);}

{const {s}=world();s.driversOff=true;const v=purchaseVehicle(s,'truck','krone-profi');const x=stepTime(s,s.day+.01);assert.equal(x.drivers,undefined);assert.ok(crewReady(x,x.vehicles[0]));}
console.log('PASS v62 Fahrer: automatische Startbesatzung, ohne Fahrer kein Start, Wochenlohn, Erfahrung, Wirkungen, Kündigung mit Stufe, 2 Piloten, Premium-Automatik, abschaltbar.');
