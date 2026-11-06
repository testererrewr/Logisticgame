import assert from 'node:assert/strict';import {spawnSync} from 'node:child_process';import {configOf} from '../lib/world-config.ts';import {registerMap,streetRoute,meters} from '../lib/real-map.ts';
const base=process.env.TEST_BASE||'http://127.0.0.1:5173';if(!['localhost','127.0.0.1'].includes(new URL(base).hostname))throw Error('Local only');
async function call(path,body,cookie,key){const r=await fetch(base+'/api/'+path,{method:body?'POST':'GET',headers:{...(body?{'Content-Type':'application/json'}:{}),...(cookie?{cookie}:{}),...(key?{'Idempotency-Key':key}:{})},body:body?JSON.stringify(body):undefined});return {status:r.status,data:await r.json(),cookie:r.headers.get('set-cookie')?.split(';')[0]};}const ok=r=>{assert.equal(r.status,200,r.data.error);return r;};
const root=ok(await call('auth/login',{email:'admin@weltverbund.test',password:'Local-test-owner-password-2026'})),cookie=root.cookie,owner=root.data.user.id,id=ok(await call('admin/worlds',{name:'QA V43 '+Date.now(),config:configOf({})},cookie)).data.id;
const edit=`import sqlite3,json,gzip,base64,sys,time
from pathlib import Path
for p in Path('.wrangler').rglob('*.sqlite'):
 try:
  d=sqlite3.connect(p);r=d.execute('SELECT name,state FROM worlds WHERE id=?',(sys.argv[1],)).fetchone()
 except sqlite3.OperationalError:continue
 if not r:continue
 assert r[0].startswith('QA V43 ')
 if sys.argv[2]=='hold':d.execute('INSERT OR REPLACE INTO world_write_locks(world,token,expires) VALUES(?,?,?)',(sys.argv[1],'test-held',int(time.time()*1000)+60000))
 elif sys.argv[2]=='release':d.execute('DELETE FROM world_write_locks WHERE world=?',(sys.argv[1],))
 else:
  raw=r[1];s=json.loads(gzip.decompress(base64.b64decode(raw[3:])) if raw.startswith('gz:') else raw);c=next(c for c in s['companies'] if c['id']==sys.argv[3]);c['facilities']=[{'id':'depot43','name':'QA Busdepot','type':'busdepot','city':'berlin','point':[52.52,13.4],'cell':0,'footprint':[]}]
  payload='gz:'+base64.b64encode(gzip.compress(json.dumps(s,separators=(',',':')).encode())).decode();d.execute('UPDATE worlds SET state=?,revision=revision+1 WHERE id=?',(payload,sys.argv[1]))
 d.commit();break
else:raise RuntimeError('Local test world missing')`;
function fixture(action){const r=spawnSync('python',['-c',edit,id,action,owner],{encoding:'utf8'});assert.equal(r.status,0,r.stderr);}
try{
 ok(await call('admin/worlds/'+id,{action:'start'},cookie));ok(await call('worlds/'+id+'/join',{name:'Paralleltest'},cookie));fixture('prepare');let w=ok(await call('worlds/'+id+'/state',undefined,cookie)).data.world;
 const cash=w.state.companies.find(c=>c.id===owner).cash,key=crypto.randomUUID(),body={type:'vehicle-buy',depot:'depot43',model:'bus-mini'},started=performance.now();
 const requests=[...Array.from({length:8},()=>call('worlds/'+id+'/action',body,cookie,key)),...Array.from({length:12},()=>call('worlds/'+id+'/live',undefined,cookie))];(await Promise.all(requests)).forEach(ok);const elapsed=Math.round(performance.now()-started);
 w=ok(await call('worlds/'+id+'/snapshot',undefined,cookie)).data.world;let c=w.state.companies.find(c=>c.id===owner);assert.equal(c.fleet.length,1,'Eight retries create exactly one physical vehicle');assert.equal(Math.round((cash-c.cash)*100),9000000);assert.equal(w.state.actionReceipts,undefined,'Receipt IDs/digests are never sent to visitors');
 assert.equal((await call('worlds/'+id+'/action',{...body,quantity:2},cookie,key)).status,409,'A request key cannot be reused for a different action');
 const map=ok(await call('map/berlin')).data.map;registerMap(map);let nodes;for(let a=0;a<Math.min(80,map.nodes.length)&&!nodes;a++)for(let b=a+1;b<Math.min(150,map.nodes.length);b++){const d=meters(map.nodes[a],map.nodes[b]);if(d<300||d>1800)continue;try{if(streetRoute(map,[a,b]).length>15)continue;nodes=[a,b];break;}catch{}}assert.ok(nodes);
 for(const node of nodes)ok(await call('worlds/'+id+'/action',{type:'busstop',city:'berlin',node,name:'QA Halt '+node},cookie,crypto.randomUUID()));w=ok(await call('worlds/'+id+'/snapshot',undefined,cookie)).data.world;c=w.state.companies.find(c=>c.id===owner);const build={type:'buildbus',name:'Einmal erstellte Linie',stopIds:c.stops.map(s=>s.id)},buildKey=crypto.randomUUID();
 const built=await Promise.all([...Array.from({length:6},()=>call('worlds/'+id+'/action',build,cookie,buildKey)),...Array.from({length:10},()=>call('worlds/'+id+'/live',undefined,cookie))]);built.forEach(ok);w=ok(await call('worlds/'+id+'/state',undefined,cookie)).data.world;assert.equal(w.state.companies.find(c=>c.id===owner).lines.length,1,'Line creation succeeds once while polling and duplicate submissions overlap');
 fixture('hold');const revision=w.revision,t=performance.now(),busy=ok(await call('worlds/'+id+'/state',undefined,cookie)).data.world;assert.ok(performance.now()-t<2000,'A busy poll returns stored state without waiting for the writer');assert.equal(busy.revision,revision,'A skipped poll does not compete for a new revision');fixture('release');
 const health=w.state.companies.find(c=>c.id===owner).fleet[0];assert.equal((await call('worlds/'+id+'/action',{type:'vehicle-service',vehicle:health.id,expectedCost:0},cookie,crypto.randomUUID())).status,400);
 console.log('PASS v43 API: eight purchase retries and six line-create retries amid live polling commit exactly once; no CAS errors; altered-body key rejection; private receipts; held-writer polls return immediately without revision writes; '+elapsed+' ms purchase contention batch.');
}finally{fixture('release');await call('admin/worlds/'+id,{action:'stop'},cookie);}
