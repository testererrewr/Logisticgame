import assert from 'node:assert/strict';
import {newState,build,stepTime,stock,purchaseVehicle,createLine,assignVehicle,vehicleCargo,checkIntegrity} from '../lib/logistics/engine.ts';
import {triggerBreakdown,resolveIncident,requestService,kmSinceService,serviceDue,SERVICE_INTERVAL_KM} from '../lib/logistics/maintenance.ts';
import {sellVehicle} from '../lib/logistics/vehicle-sales.ts';
const road=(x,y)=>({fromId:x.id,toId:y.id,km:30,path:[[x.lat,x.lon],[y.lat,y.lon]],source:'osm-strassen',geometryVersion:2});
function world(){const s=newState();s.cash=1e9;s.live=true;const d=build(s,'depot',47.07,15.44);const a=build(s,'warehouseSmall',47.0,15.44),b=build(s,'warehouseSmall',47.3,15.44);s.inventory[a.id]={wheat:2000};s.roadRoutes=s.sites.flatMap(x=>s.sites.filter(y=>x.id!==y.id).map(y=>road(x,y)));const v=purchaseVehicle(s,'truck','schmitz-kipper');const l=createLine(s,{name:'T',mode:'truck',good:'wheat',duration:null,stops:[{siteId:a.id,action:'load',good:'wheat',quantity:1e9},{siteId:b.id,action:'unload',good:'wheat',quantity:1e9}],legs:s.roadRoutes});assignVehicle(s,v.id,l.id);return {s,d,a,b,v,l};}
const run=(s,test,n=400)=>{for(let i=0;i<n;i++){s=stepTime(s,s.day+0.002);if(test(s))return s;}throw Error('nicht erreicht');};
// Panne unterwegs: Fahrzeug steht, Ladung bleibt; Abschleppen -> Depot, Reparatur, Linie bleibt, weiter ab erster Station
{let {s,v,l}=world();s=run(s,x=>x.vehicles[0].status==='enroute'&&vehicleCargo(x.vehicles[0]).length>0);
 const inc=triggerBreakdown(s,s.vehicles[0].id,'medium');assert.deepEqual(inc.options,['tow','mobile']);const odo=s.vehicles[0].odometerKm;
 s=stepTime(s,s.day+0.02);assert.ok(Math.abs(s.vehicles[0].odometerKm-odo)<.01,'Fahrzeug steht während der Panne');assert.ok(vehicleCargo(s.vehicles[0]).length>0,'Ladung bleibt an Bord');
 const cash=s.cash;resolveIncident(s,inc.id,{option:'tow'});assert.ok(s.cash<cash,'Abschleppen kostet');assert.equal(s.vehicles[0].lineId,l.id,'Linie bleibt zugewiesen');assert.equal(s.vehicles[0].breakdown.stage,'repair');
 s=stepTime(s,s.day+0.4);assert.equal(s.vehicles[0].breakdown,undefined,'nach Reparatur wieder fahrbereit');assert.ok(vehicleCargo(s.vehicles[0]).length>0||stock(s,s.sites[2].id,'wheat')>0);checkIntegrity(s);}
// Totalverlust: Ersatzfahrzeug übernimmt Ladung und Linie, Wrack nur an Händler
{let {s,v,l}=world();const spare=purchaseVehicle(s,'truck','schmitz-kipper');s=run(s,x=>x.vehicles[0].status==='enroute'&&vehicleCargo(x.vehicles[0]).length>0);
 const load=vehicleCargo(s.vehicles[0]).reduce((n,c)=>n+c.quantity,0);const inc=triggerBreakdown(s,s.vehicles[0].id,'total');assert.throws(()=>resolveIncident(s,inc.id,{option:'tow'}));
 resolveIncident(s,inc.id,{replacementId:spare.id});const wreck=s.vehicles[0],rep=s.vehicles.find(x=>x.id===spare.id);assert.ok(wreck.wrecked);assert.equal(rep.lineId,l.id);assert.equal(vehicleCargo(rep).reduce((n,c)=>n+c.quantity,0),load,'Ladung umgesetzt');
 assert.throws(()=>assignVehicle(s,wreck.id,l.id),/Totalschaden/);const before=s.cash;sellVehicle(s,wreck.id);assert.ok(s.cash>before);checkIntegrity(s);}
// Wartung jetzt: fährt zum Depot, 6 h, danach zurück auf die Linie
{let {s,v,l}=world();s.vehicles[0].odometerKm=14500;s.vehicles[0].lastServiceKm=0;assert.ok(serviceDue(s.vehicles[0]));
 requestService(s,[s.vehicles[0].id],'now');s=run(s,x=>x.vehicles[0].service?.stage==='servicing',2000);assert.equal(s.vehicles[0].restReason,'In Wartung');
 s=run(s,x=>!x.vehicles[0].service,2000);assert.ok(kmSinceService(s.vehicles[0])<10,'Wartung zurückgesetzt');assert.equal(s.vehicles[0].lineId,l.id,'zurück auf der Linie');checkIntegrity(s);}
// Weiterfahren: kostenlos sofort, Reparatur am Tagesende
{let {s}=world();s=run(s,x=>x.vehicles[0].status==='enroute');const inc=triggerBreakdown(s,s.vehicles[0].id,'minor');const cash=s.cash;resolveIncident(s,inc.id,{option:'continue'});assert.equal(s.cash,cash);assert.ok(s.vehicles[0].limping);}
console.log('PASS v55 Wartung & Pannen: Stillstand mit Ladung, Abschleppen mit Linie, Totalverlust mit Ersatzfahrzeug und Wrackverkauf, Wartung jetzt mit Rückkehr auf die Linie, Weiterfahren bis Tagesende.');
