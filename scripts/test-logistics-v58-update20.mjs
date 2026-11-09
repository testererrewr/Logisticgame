import assert from 'node:assert/strict';
import {newState,build,addTrack,stepTime,purchaseVehicle,createLine,assignVehicle,suggestStopAction,signSupply,profile,countDelivery,LEASE_WEEKLY_RATE,purchaseFleet,BUILDINGS} from '../lib/logistics/engine.ts';
import {parseSettings,validateSettings,seasonEndDay} from '../lib/logistics/world-settings.ts';
// Züge fahren auf Gleisen, auch wenn sie neu zugewiesen werden (keine Luftlinie)
{const s=newState();s.cash=1e10;s.live=true;
 const a=build(s,'railStation',47.0,15.44),b=build(s,'railStation',47.1,15.50);build(s,'railDepot',47.0,15.46);
 addTrack(s,[a.lat,a.lon],[47.05,15.40]);addTrack(s,[47.05,15.40],[b.lat,b.lon]);addTrack(s,[47.0,15.46],[a.lat,a.lon]);
 s.inventory[a.id]={crudeOil:300};
 const v=purchaseVehicle(s,'bulkRail',undefined,undefined,[{type:'tank',count:2}]);
 const l=createLine(s,{name:'Gleis',mode:'rail',good:'all',duration:null,stops:[{siteId:a.id,action:'load',good:'all',quantity:1e9},{siteId:b.id,action:'unload',good:'all',quantity:1e9}]});
 assignVehicle(s,v.id,l.id);let x=s,legs=[];for(let i=0;i<400;i++){x=stepTime(x,x.day+0.002);const leg=x.vehicles[0].currentLeg;if(leg&&!legs.some(g=>g.fromId===leg.fromId&&g.toId===leg.toId))legs.push(leg);}
 assert.ok(legs.length,'Zug hat Fahrten');for(const leg of legs){assert.equal(leg.source,'eigene-gleise','Zugfahrt folgt den Gleisen');assert.ok(leg.path.length>2||leg.km>0);}
 const ab=legs.find(g=>g.fromId===a.id&&g.toId===b.id);if(ab)assert.ok(ab.path.some(p=>Math.abs(p[1]-15.40)<.001),'Umweg über das Gleis, nicht die Luftlinie');
}
// Standard-Aktion beim Hinzufügen von Stopps
{const s=newState();s.cash=1e10;const own=build(s,'warehouseSmall',47,15);assert.equal(suggestStopAction(s,own.id),null,'eigene Gebäude: nichts erzwingen');
 let well;for(let i=0;i<40&&!well;i++){const c={id:'w-'+i,kind:'oilWell',name:'Ölfeld',lat:47.01,lon:15,tags:{}};if(profile(c).production.crudeOil)well=c;}s.sites.push(well);
 assert.equal(suggestStopAction(s,well.id),'load','reiner Produzent → Laden');signSupply(s,well.id,'crudeOil',10);assert.equal(suggestStopAction(s,well.id),'load','Liefervertrag → Laden');
 const shop={id:'shop',kind:'supermarket',name:'Markt',lat:47.02,lon:15,tags:{}};s.sites.push(shop);assert.equal(suggestStopAction(s,shop.id),'unload','Endkunde → Entladen');}
// Leasing wöchentlich
{assert.ok(Math.abs(LEASE_WEEKLY_RATE-.024*7/30)<1e-4);const s=newState();s.cash=1e7;const d=build(s,'depot',47,15);const before=s.cash;const [v]=purchaseFleet(s,{modelId:'truck',trailerId:'krone-profi',depotId:d.id,count:1,lease:true});
 assert.ok(Math.abs(before-s.cash-v.lease.daily*7)<1,'erste Wochenrate');}
// Raffinerie-Kapazität, Liefer-Statistik, Saison
{const r=BUILDINGS.find(b=>b.id==='refinery');const site={id:'raf',kind:'refinery',name:'R',lat:47,lon:15,tags:{}};assert.ok(profile(site).capacity>=400*3*.5,'Raffinerie mit mehr Kapazität');
 const s=newState();countDelivery(s,'diesel',12.5);countDelivery(s,'diesel',7.5);assert.equal(s.deliveryStats.diesel,20);
 assert.equal(parseSettings('{}').seasonDays,0);assert.equal(seasonEndDay(parseSettings({seasonDays:30})),31);assert.throws(()=>validateSettings({seasonDays:-3}));assert.equal(seasonEndDay(parseSettings({})),null);}
console.log('PASS v58 Gleisfahrt neuer Züge, Standard-Stoppaktion, Wochenleasing, Raffinerie, Liefer-Statistik, Saison-Welten.');
