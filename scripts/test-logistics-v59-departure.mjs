import assert from 'node:assert/strict';
import {newState,build,addTrack,stepTime,purchaseVehicle,createLine,assignVehicle,updateLine,stock,vehicleCargo,cargoCapacity,normalizeDeparture,gameMinute} from '../lib/logistics/engine.ts';
function world(departure,stockA=40){const s=newState();s.cash=1e10;s.live=true;
 const a=build(s,'railStation',47.0,15.44),b=build(s,'railStation',47.1,15.44);build(s,'railDepot',47.0,15.46);
 addTrack(s,[a.lat,a.lon],[b.lat,b.lon]);addTrack(s,[47.0,15.46],[a.lat,a.lon]);s.inventory[a.id]={crudeOil:stockA};
 const v=purchaseVehicle(s,'bulkRail',undefined,undefined,[{type:'tank',count:1}]);
 const l=createLine(s,{name:'Öl',mode:'rail',good:'crudeOil',duration:null,departure,stops:[{siteId:a.id,action:'load',good:'crudeOil',quantity:1e9},{siteId:b.id,action:'unload',good:'crudeOil',quantity:1e9}]});
 assignVehicle(s,v.id,l.id);return {s,a,b,l};}

{let {s,b}=world(undefined);for(let i=0;i<500&&!(stock(s,b.id,'crudeOil')>0);i++)s=stepTime(s,s.day+0.002);assert.ok(stock(s,b.id,'crudeOil')>0,'sofort-Regel liefert Teilladung');}

{let {s,a,b}=world({rule:'full',fullPct:100});let seen='';for(let i=0;i<300;i++){s=stepTime(s,s.day+0.002);seen=s.vehicles[0].restReason||seen;}
 assert.equal(stock(s,b.id,'crudeOil')||0,0,'wartet auf volle Ladung');assert.match(s.vehicles[0].restReason||'',/Wartet bis voll/);
 const v=s.vehicles[0],cap=cargoCapacity(v,'crudeOil');s.inventory[a.id].crudeOil=cap*2;for(let i=0;i<600&&!(stock(s,b.id,'crudeOil')>0);i++)s=stepTime(s,s.day+0.002);
 assert.ok(stock(s,b.id,'crudeOil')>=cap*.99,'fährt voll ab: '+stock(s,b.id,'crudeOil')+' / '+cap);}

{let {s,b}=world({rule:'full',fullPct:100,maxWaitH:2});for(let i=0;i<600&&!(stock(s,b.id,'crudeOil')>0);i++)s=stepTime(s,s.day+0.002);assert.ok(stock(s,b.id,'crudeOil')>0,'nach max. Wartezeit Abfahrt mit Teilladung');}

{const s0=world(undefined).s,now=gameMinute(s0.day),dep=(now+180)%1440;let {s,b,l}=world({rule:'schedule',times:[dep]},5000);let departedAt;for(let i=0;i<400;i++){s=stepTime(s,s.day+0.002);const v=s.vehicles[0];if(v.status==='enroute'&&s.lines[0].lastSlot!==undefined&&departedAt===undefined)departedAt=s.day;}
 assert.ok(departedAt!==undefined,'fährt nach Fahrplan ab');const m=gameMinute(departedAt);assert.ok(((m-dep+1440)%1440)<=10,'Abfahrt zur Fahrplanzeit: '+m+' vs '+dep);}
assert.throws(()=>normalizeDeparture({rule:'schedule',times:[]}));assert.equal(normalizeDeparture({rule:'asap'}),undefined);
console.log('PASS v59 Abfahrtsregeln: sofort, wenn voll (mit/ohne Maximalwartezeit), Fahrplan.');
