import assert from 'node:assert/strict';
import {execFileSync} from 'node:child_process';
import {writeFileSync} from 'node:fs';
const origin=process.env.LOGISTICS_TEST_ORIGIN||'http://127.0.0.1:8787',suffix=crypto.randomUUID().slice(0,8);
async function request(path,body,cookie){const r=await fetch(origin+'/api/'+path,{headers:{Connection:'close','Content-Type':'application/json',...(cookie?{Cookie:cookie}:{})},...(body?{method:'POST',body:JSON.stringify(body)}:{})});const raw=await r.text();let parsed;try{parsed=JSON.parse(raw);}catch{throw Error('Local HTTP '+r.status+' at '+path+' '+(body?.action||body?.command?.type||'')+': '+raw.slice(0,100));}return {status:r.status,data:parsed,cookie:r.headers.get('set-cookie')?.split(';')[0]};}
async function account(tag){const r=await request('auth/register',{name:'QA v2 '+tag,email:`qa-v2-${tag}-${suffix}@example.test`,password:'Local-test-only-8274'});assert.equal(r.status,200,JSON.stringify(r.data));return {cookie:r.cookie,id:r.data.user.id};}
function sql(text){execFileSync(process.execPath,['--import','./scripts/sites-env.mjs','./node_modules/wrangler/bin/wrangler.js','d1','execute','DB','--local','--config','dist/server/wrangler.json','--persist-to','.wrangler/state','--command',text],{stdio:'pipe'});}
const quote=s=>"'"+String(s).replaceAll("'","''")+"'";
const a=await account('Admin'),b=await account('B'),c=await account('C');sql(`UPDATE users SET role='owner' WHERE id=${quote(a.id)};`);
async function admin(who,body){return request('logistik/admin',body,who.cookie);}
async function cmd(who,worldId,command,revision){return request('logistik/online',{marketVersion:4,quantityUnit:'EH',worldId,command,revision,requestId:crypto.randomUUID()},who.cookie);}
async function snapshot(who,id){const r=await request('logistik/online?world='+id,undefined,who.cookie);assert.equal(r.status,200,JSON.stringify(r.data));return r.data;}
assert.equal((await request('logistik/admin')).status,403);
assert.equal((await admin(b)).status,403);
assert.equal((await cmd(b,undefined,{type:'createWorld',name:'Forbidden',tickMs:30000})).status,403);
assert.equal((await admin(b,{action:'createWorld',name:'Forbidden'})).status,403);
assert.equal((await admin(a)).status,200,'owner admin dashboard accessible');
const create=await admin(a,{action:'createWorld',name:'QA live '+suffix});assert.equal(create.status,200,JSON.stringify(create.data));const world=create.data.worldId;
let listing=(await admin(a)).data.worlds.find(w=>w.id===world);assert.equal(listing.time_scale,1);assert.equal(listing.status,'draft');assert.equal(listing.companies,0,'admin world creation does not silently found a company');
assert.ok(!(await request('logistik/online',undefined,b.cookie)).data.worlds.some(w=>w.id===world),'draft world hidden from players');
assert.equal((await admin(a,{action:'worldSettings',worldId:world,name:listing.name,description:'QA',timeScale:1,status:'running'})).status,200);
assert.equal((await cmd(b,world,{type:'joinWorld'})).status,422,'founding requires company name');
assert.equal((await cmd(a,world,{type:'joinWorld',name:'QA Admin Freight '+suffix})).status,200);
assert.equal((await cmd(b,world,{type:'joinWorld',name:'QA B Freight '+suffix})).status,200);
let sa=await snapshot(a,world),sb=await snapshot(b,world);assert.equal(sa.companyName,'QA Admin Freight '+suffix);assert.equal(sb.state.cash,5500000);assert.ok(Math.abs(sa.state.day-sb.state.day)<2/86400);
assert.equal((await cmd(a,world,{type:'tick',days:4},sa.revision)).status,403);
assert.equal((await cmd(a,world,{type:'build',kind:'depot',point:[47.07,15.44]},sa.revision)).status,422,'unconfirmed construction rejected');
sa=await snapshot(a,world);const built=await cmd(a,world,{type:'build',kind:'depot',point:[47.07,15.44],rotation:0,confirmed:true},sa.revision);assert.equal(built.status,200,JSON.stringify(built.data));assert.equal(built.data.state.sites[0].grid.width,2);
assert.equal((await snapshot(b,world)).state.sites.length,0,'separate company assets');
sa=await snapshot(a,world);assert.equal((await cmd(a,world,{type:'buy',modelId:'truck'},sa.revision)).status,422,'real tractor requires explicit attachment');
sa=await snapshot(a,world);assert.equal((await cmd(a,world,{type:'buy',modelId:'truck',trailerId:'schwarzmueller-timber'},sa.revision)).status,200);
const before=(await snapshot(a,world)).state.day;await new Promise(resolve=>setTimeout(resolve,1200));
const scheduled=await fetch((process.env.LOGISTICS_SCHEDULER_ORIGIN||origin)+'/cdn-cgi/handler/scheduled?cron='+encodeURIComponent('* * * * *'));assert.equal(scheduled.status,200,'scheduled Worker can run without a player request');
const status=await admin(a);assert.equal(JSON.parse(status.data.runtime.payload).source,'scheduled');const advanced=status.data.worlds.find(w=>w.id===world);assert.ok(advanced.day-before>.5/86400&&advanced.day-before<60/86400,'offline wall time advances continuously at 1×');
sb=await snapshot(b,world);assert.ok(sb.state.day-before>.5/86400,'offline company follows same clock');assert.equal(sb.state.cash,5500000);
assert.equal((await cmd(c,world,{type:'joinWorld',name:'QA C Freight '+suffix})).status,200);assert.ok(Math.abs((await snapshot(c,world)).state.day-sb.state.day)<3/86400,'late founding uses world time');
sa=await snapshot(a,world);assert.equal((await cmd(a,world,{type:'trackPermission',receiverId:b.id,enabled:true},sa.revision)).status,200);
assert.ok([401,403,404].includes((await request('logistik/admin/bootstrap',{id:'fake'})).status),'owner import not public');
const paused=await admin(a,{action:'worldSettings',worldId:world,name:listing.name,description:'QA',timeScale:1,status:'paused'});assert.equal(paused.status,200);sa=await snapshot(a,world);assert.equal(sa.world.status,'paused');assert.equal((await cmd(a,world,{type:'buy',modelId:'van'},sa.revision)).status,403);
assert.equal((await admin(b,{action:'worldSettings',worldId:world,name:listing.name,timeScale:1440,status:'running'})).status,403,'only admin changes world speed');
console.log('PASS v2 API: admin-only worlds/speed, draft/start/pause, named companies, real 1× clock, unattended scheduled settlement, shared offline time, confirmed tiles, real truck+trailer, protected owner bootstrap.');
