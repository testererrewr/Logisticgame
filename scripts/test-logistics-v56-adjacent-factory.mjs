import assert from 'node:assert/strict';
import {newState,build,addTrack,stepTime,stock,purchaseVehicle,createLine,assignVehicle,vehicleCargo,signSupply,profile,checkIntegrity,adjacentFactories} from '../lib/logistics/engine.ts';
const s=newState();s.cash=1e10;s.live=true;
const a=build(s,'railStation',47.0,15.44),b=build(s,'railStation',47.1,15.44);build(s,'railDepot',47.0,15.46);
addTrack(s,[a.lat,a.lon],[b.lat,b.lon]);addTrack(s,[47.0,15.46],[a.lat,a.lon]);
let well;for(let i=0;i<40&&!well;i++){const c={id:'well-'+i,kind:'oilWell',name:'Ölfeld '+i,lat:47.003,lon:15.44,tags:{}};if(profile(c).production.crudeOil)well=c;}
assert.ok(well,'Lieferant gefunden');s.sites.push(well);
const shop={id:'shop-x',kind:'supermarket',name:'Markt',lat:47.002,lon:15.441,tags:{}};s.sites.push(shop);
assert.deepEqual(adjacentFactories(s,a).map(p=>p.id),[well.id],'nur Fabriken, keine Endkunden');
signSupply(s,well.id,'crudeOil',Math.min(200,profile(well).production.crudeOil));
const v=purchaseVehicle(s,'bulkRail',undefined,undefined,[{type:'tank',count:4}]);
const l=createLine(s,{name:'Öl',mode:'rail',good:'all',duration:null,stops:[{siteId:a.id,action:'load',good:'all',quantity:1e9},{siteId:b.id,action:'unload',good:'all',quantity:1e9}]});
assignVehicle(s,v.id,l.id);
let x=s;for(let i=0;i<600&&!(stock(x,b.id,'crudeOil')>0);i++)x=stepTime(x,x.day+0.002);
assert.ok(stock(x,b.id,'crudeOil')>0,'Zug lädt direkt aus dem anliegenden Ölfeld und liefert an den Zielbahnhof');checkIntegrity(x);
console.log('PASS v56 Züge laden direkt aus anliegenden Fabriken (bis 750 m), nicht bei Endkunden.');
