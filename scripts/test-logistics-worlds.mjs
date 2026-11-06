import assert from 'node:assert/strict';
import {execFileSync} from 'node:child_process';
import {writeFileSync} from 'node:fs';
import {companyAtDay,clockTarget,advanceCompany} from '../lib/logistics/world-clock.ts';
import {build,profile} from '../lib/logistics/engine.ts';

assert.equal(clockTarget({day:7,last_tick:1000,tick_ms:60000},181000),10);
assert.equal(clockTarget({day:7,last_tick:1000,tick_ms:60000},0),7);
assert.equal(companyAtDay(200).day,200);
assert.equal(advanceCompany(companyAtDay(1),12).day,12);
const origin='http://127.0.0.1:8787',suffix=crypto.randomUUID().slice(0,8);
async function request(path,body,cookie){const r=await fetch(origin+'/api/'+path,{headers:{'Content-Type':'application/json',...(cookie?{Cookie:cookie}:{})},...(body?{method:'POST',body:JSON.stringify(body)}:{})});return {status:r.status,data:await r.json(),cookie:r.headers.get('set-cookie')?.split(';')[0]};}
async function account(tag){const r=await request('auth/register',{name:'QA '+tag,email:`qa-${tag}-${suffix}@example.test`,password:'Local-test-only-8274'});assert.equal(r.status,200,JSON.stringify(r.data));return {cookie:r.cookie,id:r.data.user.id};}
const a=await account('A'),b=await account('B'),c=await account('C');
assert.equal((await request('logistik/online')).status,401);
async function command(who,worldId,command,revision){return request('logistik/online',{worldId,command,revision,requestId:crypto.randomUUID()},who.cookie);}
async function snapshot(who,id){const r=await request('logistik/online?world='+id,undefined,who.cookie);assert.equal(r.status,200,JSON.stringify(r.data));return r.data;}
const created=await command(a,undefined,{type:'createWorld',name:'QA '+suffix,tickMs:300000});assert.equal(created.status,200,JSON.stringify(created.data));
const world=created.data.worldId;assert.equal((await command(b,world,{type:'joinWorld'})).status,200);
let sa=await snapshot(a,world),sb=await snapshot(b,world);assert.equal(sa.state.day,sb.state.day);assert.equal(sa.state.cash,5500000);assert.equal(sb.state.cash,5500000);
assert.equal((await command(a,world,{type:'tick',days:4},sa.revision)).status,403,'players must not advance world clocks');
const built=await command(a,world,{type:'build',kind:'depot',point:[47.07,15.44]},sa.revision);assert.equal(built.status,200,JSON.stringify(built.data));
sb=await snapshot(b,world);assert.equal(sb.state.cash,5500000);assert.equal(sb.state.sites.length,0,'separate assets');
assert.equal((await command(a,world,{type:'buy',modelId:'truck'},sa.revision)).status,409,'stale company writes rejected');
function sql(text){writeFileSync('.sites-runtime/qa-world.sql',text);execFileSync(process.execPath,['--import','./scripts/sites-env.mjs','./node_modules/wrangler/bin/wrangler.js','d1','execute','DB','--local','--config','dist/server/wrangler.json','--persist-to','.wrangler/state','--file','.sites-runtime/qa-world.sql'],{stdio:'pipe'});}
const quote=s=>"'"+String(s).replaceAll("'","''")+"'";
sql(`UPDATE logistics_worlds SET last_tick=last_tick-900000 WHERE id=${quote(world)};`);
sa=await snapshot(a,world);sb=await snapshot(b,world);assert.equal(sa.state.day,4);assert.equal(sb.state.day,4,'offline company advances with whole world');
assert.equal((await command(c,world,{type:'joinWorld'})).status,200);assert.equal((await snapshot(c,world)).state.day,4,'late join uses common day');
const second=await command(a,undefined,{type:'createWorld',name:'Other '+suffix,tickMs:300000});const other=second.data.worldId;
assert.equal((await snapshot(a,other)).state.day,1,'independent clocks in separate worlds');assert.equal((await snapshot(a,other)).state.cash,5500000,'separate company per world');
assert.equal((await command(a,other,{type:'trackPermission',receiverId:b.id,enabled:true},0)).status,422,'cross-world sharing forbidden');
sa=await snapshot(a,world);assert.equal((await command(a,world,{type:'trackPermission',receiverId:b.id,enabled:true},sa.revision)).status,200);
sb=await snapshot(b,world);assert.ok(sb.permissions.some(p=>p.owner_id===a.id&&p.grantee_id===b.id&&p.enabled===1));
// Controlled inventory fixtures exist exclusively in the local QA database.
sa=await snapshot(a,world);const seller=sa.state,hub=build(seller,'hub',47.08,15.46);seller.inventory[hub.id]={bread:20};
const farm={id:'osm:node:qa',name:'QA farm fixture',kind:'farm',lat:47.07,lon:15.44};seller.sites.push(farm);sb.state.sites.push(farm);
sql(`UPDATE logistics_world_companies SET state=${quote(JSON.stringify(seller))},revision=revision+1 WHERE world_id=${quote(world)} AND user_id=${quote(a.id)}; UPDATE logistics_world_companies SET state=${quote(JSON.stringify(sb.state))},revision=revision+1 WHERE world_id=${quote(world)} AND user_id=${quote(b.id)};`);
sa=await snapshot(a,world);sb=await snapshot(b,world);
const full=profile(farm).production.wheat;
assert.equal((await command(a,world,{type:'supply',siteId:farm.id,good:'wheat',daily:full},sa.revision)).status,200);
assert.equal((await command(b,world,{type:'supply',siteId:farm.id,good:'wheat',daily:1},sb.revision)).status,422,'finite production shared by world');
sa=await snapshot(a,world);const offered=await command(a,world,{type:'tradeOffer',receiverId:b.id,siteId:hub.id,good:'bread',quantity:4,price:820},sa.revision);assert.equal(offered.status,200,JSON.stringify(offered.data));
const offerId=offered.data.offers.find(o=>o.status==='open').id;sb=await snapshot(b,world);
const accepts=await Promise.all([command(b,world,{type:'acceptTrade',offerId},sb.revision),command(b,world,{type:'acceptTrade',offerId},sb.revision)]);
assert.equal(accepts.filter(r=>r.status===200).length,1,'one acceptance succeeds');
const afterA=await snapshot(a,world),afterB=await snapshot(b,world);
assert.equal(afterA.state.inventory[hub.id].bread,16);assert.equal(afterB.state.inventory[hub.id].bread,4);assert.equal(afterA.state.cash,sa.state.cash+820);assert.equal(afterB.state.cash,sb.state.cash-820);
assert.equal((await snapshot(a,other)).state.sites.length,0,'trade cannot modify another world');
console.log('PASS worlds API: login, world create/join, common offline clock, late joining, separate assets/worlds, no manual tick, stale writes, world capacity, voluntary sharing, atomic trade/race.');

