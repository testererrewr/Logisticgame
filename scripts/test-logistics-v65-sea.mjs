import assert from 'node:assert/strict';
import {seaRoute} from '../lib/logistics/sea-routing.ts';
import {newState,build,purchaseVehicle,createLine,assignVehicle,stepTime,kmBetween} from '../lib/logistics/engine.ts';
const r=seaRoute([51.95,4.1],[31.35,121.6]);assert.ok(r&&r.km>17000&&r.km<22000,'Rotterdam–Shanghai über Suez: '+r?.km);
assert.ok(r.path.some(p=>Math.abs(p[0]-30)<2&&Math.abs(p[1]-32.5)<1.5),'führt durch den Suezkanal');
assert.equal(seaRoute([48.2,16.37],[44.17,28.66]),null,'Binnenhafen Wien hat keinen Seeweg (Flüsse)');
const k=seaRoute([44.17,28.66],[43.30,5.36]);assert.ok(k&&k.km>2800,'Schwarzes Meer über Bosporus erreichbar');
// Schiff im Spiel folgt dem Seeweg
const s=newState();s.cash=1e10;s.live=true;s.driversOff=true;
const a=build(s,'port',44.17,28.68),b=build(s,'port',43.30,5.38);build(s,'shipDepot',44.16,28.67);
s.inventory[a.id]={crudeOil:500};
const v=purchaseVehicle(s,'cargoShip');const l=createLine(s,{name:'See',mode:'ship',good:'all',duration:null,stops:[{siteId:a.id,action:'load',good:'all',quantity:1e9},{siteId:b.id,action:'unload',good:'all',quantity:1e9}]});assignVehicle(s,v.id,l.id);
let x=s;for(let i=0;i<300&&!(x.vehicles[0].currentLeg?.toId===b.id);i++)x=stepTime(x,x.day+.01);
const leg=x.vehicles[0].currentLeg;assert.equal(leg.source,'seeweg','Schiff fährt auf dem Seeweg');assert.ok(leg.km>kmBetween([a.lat,a.lon],[b.lat,b.lon])*1.3,'nicht mehr Luftlinie');
console.log('PASS v65 Seewege: Schiffe fahren über Wasser (Suez, Bosporus), nicht mehr über Land.');
