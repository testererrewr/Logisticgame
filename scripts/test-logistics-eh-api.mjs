import assert from 'node:assert/strict';
import {execFileSync} from 'node:child_process';
import {newState,build} from '../lib/logistics/engine.ts';
const origin=process.env.LOGISTICS_TEST_ORIGIN||'http://127.0.0.1:5173',suffix=crypto.randomUUID().slice(0,8);
async function req(path,body,cookie){const r=await fetch(origin+'/api/'+path,{headers:{'Content-Type':'application/json',...(cookie?{Cookie:cookie}:{})},...(body?{method:'POST',body:JSON.stringify(body)}:{})});return {status:r.status,data:await r.json(),cookie:r.headers.get('set-cookie')?.split(';')[0]};}
async function account(tag){const r=await req('auth/register',{name:'QA EH '+tag,email:`qa-eh-${tag}-${suffix}@example.test`,password:'Local-test-only-8274'});assert.equal(r.status,200,JSON.stringify(r.data));return {cookie:r.cookie,id:r.data.user.id};}
const quote=s=>"'"+String(s).replaceAll("'","''")+"'";
function sql(command){execFileSync(process.execPath,['--import','./scripts/sites-env.mjs','./node_modules/wrangler/bin/wrangler.js','d1','execute','DB','--local','--config','dist/server/wrangler.json','--persist-to','.wrangler/state','--command',command],{stdio:'pipe'});}
const a=await account('A'),b=await account('B');sql(`UPDATE users SET role='owner' WHERE id=${quote(a.id)}`);
const admin=body=>req('logistik/admin',body,a.cookie);assert.equal((await admin()).status,200);
const created=await admin({action:'createWorld',name:'QA EH '+suffix});assert.equal(created.status,200);const worldId=created.data.worldId;
const settings=status=>admin({action:'worldSettings',worldId,name:'QA EH '+suffix,description:'Disposable local unit-migration fixture',timeScale:1,status});assert.equal((await settings('running')).status,200);
const cmd=(who,command,revision,unit='EH')=>req('logistik/online',{worldId,marketVersion:4,quantityUnit:unit,command,revision,requestId:crypto.randomUUID()},who.cookie);
for(const who of [a,b])assert.equal((await cmd(who,{type:'joinWorld',name:'QA EH '+who.id.slice(0,8)})).status,200);
await settings('paused');
const state=newState(),terminal=build(state,'depot',47.07,15.44);delete state.quantityUnit;state.inventory[terminal.id]={bread:10,wheat:10};
const other={id:'qa:no-contract',name:'No contract',kind:'farm',lat:47.08,lon:15.45};state.sites.push(other);
const offerId=crypto.randomUUID(),now=Date.now();
sql(`UPDATE logistics_world_companies SET state=${quote(JSON.stringify(state))} WHERE world_id=${quote(worldId)} AND user_id=${quote(a.id)}; INSERT INTO logistics_world_offers(id,world_id,sender_id,receiver_id,site_id,good,quantity,price,status,created,expires) VALUES(${quote(offerId)},${quote(worldId)},${quote(a.id)},${quote(b.id)},${quote(terminal.id)},'bread',10,12345,'open',${now},${now+86400000});`);
const snap=async who=>{const r=await req('logistik/online?world='+worldId,undefined,who.cookie);assert.equal(r.status,200,JSON.stringify(r.data));return r.data;};
let sa=await snap(a),sb=await snap(b);assert.equal(sa.state.quantityUnit,'EH');assert.equal(sa.state.inventory[terminal.id].bread,100);assert.equal(sb.offers[0].quantity,100,'legacy database offer converted from 10 tonnes to 100 EH');
await settings('running');sa=await snap(a);sb=await snap(b);
const rejected=await cmd(a,{type:'buy',modelId:'van'},sa.revision,'t');assert.equal(rejected.status,409,'old clients must reload before submitting quantities');
const badLine=await cmd(a,{type:'line',name:'No contract',mode:'truck',good:'wheat',duration:null,stops:[{siteId:other.id,action:'load',quantity:100},{siteId:terminal.id,action:'unload',quantity:100}]},sa.revision);assert.equal(badLine.status,422);assert.match(badLine.data.error,/Vertrag/);
const accept=await cmd(b,{type:'acceptTrade',offerId},sb.revision);assert.equal(accept.status,200,JSON.stringify(accept.data));assert.equal(accept.data.state.inventory[terminal.id].bread,100);assert.equal(accept.data.state.cash,5500000-12345);
sa=await snap(a);assert.equal(sa.state.inventory[terminal.id].bread,0);assert.equal(sa.state.cash,state.cash+12345);assert.equal(sa.state.quantityUnit,'EH');
const fresh=await cmd(a,{type:'tradeOffer',receiverId:b.id,siteId:terminal.id,good:'wheat',quantity:50,price:700},sa.revision);assert.equal(fresh.status,200,JSON.stringify(fresh.data));assert.equal(fresh.data.offers.find(o=>o.status==='open').quantity,50,'new EH offers are never multiplied twice');
sb=await snap(b);const current=sb.offers.find(o=>o.status==='open');const second=await cmd(b,{type:'acceptTrade',offerId:current.id},sb.revision);assert.equal(second.status,200);assert.equal(second.data.state.inventory[terminal.id].wheat,50);
await settings('paused');
console.log('PASS EH API: legacy save and offer migration, exact EH offers, conserved cargo/cash, stale-client guard and authoritative contract-only route validation.');
