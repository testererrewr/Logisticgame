import assert from 'node:assert/strict';
import {newState,signSupply,cancelContract,stock,stepTime,stepSharedWorld,normalizeFreightState,build,createLine,updateLineStops,updateLine,signProcess,profile,RECIPES} from '../lib/logistics/engine.ts';
import {clockTarget} from '../lib/logistics/world-clock.ts';
import {newMarket,resetMarket} from '../lib/logistics/business-rules.ts';
const farm={id:'farm12',name:'Farm',kind:'farm',lat:47.07,lon:15.44};
const s=newState();s.cash=1e8;s.sites.push(farm);const first=signSupply(s,farm.id,'wheat',100),paid=s.cash;
cancelContract(s,first.id);signSupply(s,farm.id,'wheat',100);
assert.equal(stock(s,farm.id,'wheat'),100,'replacing a reservation does not manufacture a second daily batch');
assert.equal(s.cash,paid,'already paid same-day reservation is not charged again');
signSupply(s,farm.id,'wheat',50);assert.equal(stock(s,farm.id,'wheat'),150,'only a genuine reservation increase adds stock');
const depot=build(s,'depot',47.071,15.44),road=(a,b)=>({fromId:a.id,toId:b.id,km:.2,path:[[a.lat,a.lon],[b.lat,b.lon]],source:'osm-strassen'});
const line=createLine(s,{name:'Edit safely',mode:'truck',good:'wheat',duration:null,stops:[{siteId:farm.id,action:'load',quantity:1e9},{siteId:depot.id,action:'unload',quantity:1e9}],legs:[road(farm,depot),road(depot,farm)]});
let current=s;
for(let i=0;i<50;i++){updateLineStops(current,line.id,line.stops,line.legs);updateLine(current,line.id,{name:'Edit '+i,tripsPerDay:null,tripLimit:null,stopWhenDemandMet:false,stopWhenSourcesEmpty:true});current=stepTime(current,1+(i+1)/86400);assert.equal(stock(current,farm.id,'wheat'),150,'editing/polling cannot regenerate daily output');}
current=stepTime(current,2.001);assert.equal(stock(current,farm.id,'wheat'),300,'one new batch at actual day boundary');
const cash=current.cash;current=stepTime(current,2.01);assert.equal(stock(current,farm.id,'wheat'),300);assert.equal(current.cash,cash);
const migrated=structuredClone(current);delete migrated.dailyEconomy;normalizeFreightState(migrated);assert.equal(stock(migrated,farm.id,'wheat'),300,'migration preserves stock');
for(const c of migrated.contracts)if(!c.cancelled)cancelContract(migrated,c.id);signSupply(migrated,farm.id,'wheat',150);assert.equal(stock(migrated,farm.id,'wheat'),300,'migrated same-day quantities remain protected');
const ahead=stepTime(s,2.1),behind=newState(),market=newMarket(2);market.delivered.customer={wheat:40};const aheadCash=ahead.cash,aheadStock=stock(ahead,farm.id,'wheat');
const shared=stepSharedWorld(new Map([['ahead',ahead],['behind',behind]]),2.2,market).get('ahead');
assert.equal(stock(shared,farm.id,'wheat'),aheadStock,'lagging companies cannot replay production of an ahead company');assert.equal(shared.cash,aheadCash);assert.equal(market.delivered.customer.wheat,40,'catch-up cannot reset current demand backwards');
const later=stepSharedWorld(new Map([['ahead',ahead]]),1.9,newMarket(2)).get('ahead');assert.equal(later.day,ahead.day,'company time never rewinds');resetMarket(market,1.5);assert.equal(market.delivered.customer.wheat,40);
const start=1700000000000;for(const requests of [1,10,1000]){const w={day:1,last_tick:start,time_scale:1};for(let i=1;i<=requests;i++){const now=start+3600000*i/requests,next=clockTarget(w,now);w.last_tick+=(next-w.day)*86400000;w.day=next;}assert.ok(Math.abs(w.day-(1+1/24))<1e-8,'request count never accelerates 1x time');}
assert.equal(clockTarget({day:1,last_tick:start,time_scale:1},start+86400000),2,'1x means a full real 24 hours per day');
// A factory's daily limit survives replacement of its processing contracts.
const factory={id:'factory12',name:'Mill',kind:'mill',lat:47.07,lon:15.44},p=newState();p.cash=1e8;p.sites.push(factory);const recipe=RECIPES.find(r=>profile(factory).recipes.includes(r.id)),capacity=profile(factory).capacity;
assert.ok(recipe);p.inventory[factory.id]=Object.fromEntries(Object.entries(recipe.inputs).map(([id,n])=>[id,n*capacity*2]));
const processing=signProcess(p,factory.id,recipe.id,capacity);let processed=stepTime(p,1.001);const output=stock(processed,factory.id,recipe.output);assert.ok(output>0);cancelContract(processed,processing.id);signProcess(processed,factory.id,recipe.id,capacity);processed=stepTime(processed,1.002);assert.equal(stock(processed,factory.id,recipe.output),output,'reopening processing cannot reset a factory daily quota');
console.log('PASS v12: daily production idempotency, contract replacement, paid quotas, 50 line edits, rollover, migration, factory quotas, monotonic shared clocks/demand, and request-independent 24-hour days.');
