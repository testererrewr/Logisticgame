import assert from 'node:assert/strict';
import {providerPlaces} from '../lib/place-provider.ts';
const answer=[{osm_id:1,name:'Linz',lat:'48.3059',lon:'14.2862',display_name:'Linz, Österreich'}];
let calls=0;
const emptyPrimary=async url=>{calls++;return Response.json(url.includes('photon')?{features:[]}:answer);};
assert.equal((await providerPlaces('Linz',undefined,emptyPrimary,10))[0].name,'Linz');assert.equal(calls,2,'Leere Primärantwort wartet auf den Ersatzanbieter');
assert.deepEqual(await providerPlaces('missing',undefined,async url=>Response.json(url.includes('photon')?{features:[]}:[]),10),[]);
let cancelled=false;
const slowPrimary=async (url,options)=>{
 if(!url.includes('photon'))return Response.json(answer);
 return new Promise((resolve,reject)=>options.signal.addEventListener('abort',()=>{cancelled=true;reject(options.signal.reason);},{once:true}));
};
const start=performance.now();assert.equal((await providerPlaces('Linz',undefined,slowPrimary,10))[0].name,'Linz');assert.ok(performance.now()-start<1000);assert.ok(cancelled);
const never=async (url,options)=>new Promise((resolve,reject)=>options.signal.addEventListener('abort',()=>reject(options.signal.reason),{once:true}));
// A ref'ed timer keeps Node running while AbortSignal.timeout expires.
const keep=setInterval(()=>{},1000);try{await assert.rejects(providerPlaces('Linz',undefined,never,10),e=>e.status===503);}finally{clearInterval(keep);}
console.log('PASS empty/slow primary fallback, cancellation, empty results and bounded timeout.');
