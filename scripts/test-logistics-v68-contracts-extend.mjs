import assert from 'node:assert/strict';
import {newState,profile,signSupply,stepTime,expiringContracts,extendContracts} from '../lib/logistics/engine.ts';
const s=newState();s.cash=1e9;s.driversOff=true;let well;for(let i=0;i<40&&!well;i++){const c={id:'w-'+i,kind:'oilWell',name:'Ölfeld',lat:47.01,lon:15,tags:{}};if(profile(c).production.crudeOil)well=c;}s.sites.push(well);
const c=signSupply(s,well.id,'crudeOil',5);assert.equal(c.endDay-c.startDay,180);
c.endDay=s.day+15;let x=s;for(let i=0;i<3;i++)x=stepTime(x,x.day+1,100000);
assert.ok(x.events.some(e=>e.text.includes('📬')&&e.text.includes('Postfach')),'Hinweis vor Vertragsende');assert.equal(expiringContracts(x).length,1);
const end=x.contracts[0].endDay;extendContracts(x,[x.contracts[0].id],180);assert.equal(x.contracts[0].endDay,end+180);assert.equal(expiringContracts(x).length,0);
console.log('PASS v68 Vertragsablauf: Hinweis ins Postfach, Verlängern (auch alle auf einmal).');
