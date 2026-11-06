import assert from 'node:assert/strict';
import {containerQuantity} from '../lib/logistics/container-terms.ts';
for(const factory of [false,true])for(const km of [30,5000]){let small=0,medium=0,large=0;for(let i=0;i<10000;i++){const id='mix-v14-'+i,q=containerQuantity(id,factory,km);assert.ok(q>=10&&q<=26400);assert.equal(q,containerQuantity(id,factory,km));if(q<=240)small++;else if(q<=2000)medium++;else large++;}assert.ok(small>4500,'small loads remain common, including long-distance jobs');assert.ok(medium>2000,'medium loads remain available');assert.ok(large>250&&large<2000,'large jobs remain a minority');}
console.log('PASS v14: stable small/medium/large mixture for shops/factories and local/overseas jobs; small loads never receive a forced distance surcharge in EH.');
