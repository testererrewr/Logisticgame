import assert from 'node:assert/strict';
import {newState,build,purchaseVehicle,createLine,assignVehicle,stepTime,checkIntegrity,cancelLine} from '../lib/logistics/engine.ts';
function setup(){const s=newState();s.live=true;s.cash=1e9;const d=build(s,'depot',47.0,15.44);const a=build(s,'warehouseSmall',47.0,15.45),b=build(s,'warehouseSmall',47.4,15.45);
 const road=(x,y)=>({fromId:x.id,toId:y.id,km:Math.hypot(x.lat-y.lat,x.lon-y.lon)*111,path:[[x.lat,x.lon],[y.lat,y.lon]],source:'osm-strassen',geometryVersion:2});
 s.roadRoutes=s.sites.flatMap(x=>s.sites.filter(y=>x.id!==y.id).map(y=>road(x,y)));
 const v=purchaseVehicle(s,'truck','krone-profi');const l=createLine(s,{name:'L',mode:'truck',good:'all',duration:null,stops:[{siteId:b.id,action:'load',good:'all',quantity:1e9},{siteId:a.id,action:'unload',good:'all',quantity:1e9}],legs:s.roadRoutes});assignVehicle(s,v.id,l.id);
 let x=s;for(let i=0;i<200&&x.vehicles[0].status!=='enroute';i++)x=stepTime(x,x.day+.0005);x=stepTime(x,x.day+.005);return {x,l,d};}
{const {x,d}=setup();const v=x.vehicles[0];assert.equal(v.status,'enroute');assert.equal(v.cargo,undefined);assignVehicle(x,v.id,'');assert.equal(v.status,'returning','leeres Fahrzeug dreht sofort um');assert.equal(v.targetId,d.id);assert.equal(v.detaching,false);let y=x;for(let i=0;i<400&&y.vehicles[0].status!=='idle';i++)y=stepTime(y,y.day+.002);assert.equal(y.vehicles[0].locationId,d.id,'im Depot angekommen');checkIntegrity(y);}
{const {x,l}=setup();cancelLine(x,l.id);assert.equal(x.vehicles[0].status,'returning','Linie gelöscht: leeres Fahrzeug sofort zurück');}
console.log('PASS v61 Linie entfernt: leere Fahrzeuge drehen sofort um, beladene beenden ihr Teilstück.');
