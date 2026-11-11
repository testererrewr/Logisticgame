import assert from 'node:assert/strict';
import {newState,stepTime} from '../lib/logistics/engine.ts';
import {weeklyChallenges,challengeProgress,ACHIEVEMENTS,ensureProgress} from '../lib/logistics/progression.ts';
import {rareOfferFor} from '../lib/logistics/rare-vehicles.ts';
import {newsOfDay,activeNews,travelEventFactor,newsPriceFactor} from '../lib/logistics/world-events.ts';
const s=newState();s.driversOff=true;let x=s;for(let i=0;i<9;i++)x=stepTime(x,x.day+1,100000);
const p=x.progress;assert.ok(p&&p.reports.length>=7,'Tagesberichte');assert.equal(p.reports[0].day,Math.floor(x.day)-1);

x.deliveryStats={wood:12000};const cash=x.cash;x=stepTime(x,x.day+1,100000);assert.ok(x.progress.achievements['eh-1k'],'Erfolg freigeschaltet');assert.ok(x.cash>=cash+25000-1e4,'Prämie');

const w=weeklyChallenges(3,4);assert.equal(w.length,3);assert.deepEqual(w,weeklyChallenges(3,4));
const c=w[0];assert.ok(challengeProgress(c,{day:1,earned:0,spent:0,eh:0,km:0,contracts:0,byType:{}},{day:2,earned:1e9,spent:0,eh:1e9,km:1e9,contracts:1e9,byType:{[c.freight||'x']:1e9}})>=c.target);
assert.ok(new Set(ACHIEVEMENTS.map(a=>a.id)).size===ACHIEVEMENTS.length);

let n=0;for(let d=1;d<=1000;d++)if(rareOfferFor('w',d))n++;assert.ok(n>50&&n<160,'Seltenheit '+n);

assert.deepEqual(newsOfDay(12),newsOfDay(12));assert.ok(activeNews(12).length>=4);
for(let d=1;d<60;d++){const f=newsPriceFactor('timber',d);assert.ok(f>.5&&f<2);}
assert.ok(travelEventFactor([0,0],[0,1],'truck',5)>=1);
console.log('PASS v69 Tagesbericht, Wochenziele, Erfolge, seltene Fahrzeuge, Nachrichten.');
import {weatherAt,weatherFactor} from '../lib/logistics/weather.ts';
{const a=weatherAt(20.1),b=weatherAt(20.2);assert.equal(a,b,'gleiches 6-h-Fenster');assert.notDeepEqual(a,weatherAt(20.3));for(const c of a)assert.ok(!(c.kind==='heat'&&Math.abs(c.lat)>50));
 for(let d=0;d<30;d+=.25){const f=weatherFactor([53.5,10],[53.6,10],'ship',d,1);assert.ok(f>=1&&f<=1.6);assert.ok(weatherFactor([53.5,10],[53.6,10],'ship',d,5)<=f);}
 console.log('PASS Wetter: 6-h-Fenster, Grenzen, Crew dämpft.');}
import {signSupply,profile} from '../lib/logistics/engine.ts';
{const s=newState();s.cash=1e9;s.driversOff=true;let well;for(let i=0;i<40&&!well;i++){const c={id:'pw-'+i,kind:'oilWell',name:'Ölfeld',lat:47.01,lon:15,tags:{}};if(profile(c).production.crudeOil)well=c;}s.sites.push(well);signSupply(s,well.id,'crudeOil',5);
 let x=s;for(let i=0;i<3;i++)x=stepTime(x,x.day+1,100000);const w=x.progress.pickups||[];assert.ok(w.length>=1&&w[0].siteId===well.id,'Abholwarnung mit Ort');
 console.log('PASS Abholwarnung für nicht abgeholte gebuchte Fracht.');}
