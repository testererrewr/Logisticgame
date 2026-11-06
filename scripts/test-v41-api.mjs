import assert from 'node:assert/strict';
import {spawnSync} from 'node:child_process';
import {configOf} from '../lib/world-config.ts';
const base=process.env.TEST_BASE||'http://127.0.0.1:5173';if(!['localhost','127.0.0.1'].includes(new URL(base).hostname))throw Error('Local only');
async function call(path,body,cookie){const r=await fetch(base+'/api/'+path,{method:body?'POST':'GET',headers:{...(body?{'Content-Type':'application/json'}:{}),...(cookie?{cookie}:{})},body:body?JSON.stringify(body):undefined});return {status:r.status,data:await r.json(),cookie:r.headers.get('set-cookie')?.split(';')[0]};}
function ok(r){assert.equal(r.status,200,r.data.error);return r;}
const root=ok(await call('auth/login',{email:'admin@weltverbund.test',password:'Local-test-owner-password-2026'})),cookie=root.cookie;
const id=ok(await call('admin/worlds',{name:'QA V41 '+Date.now(),config:configOf({})},cookie)).data.id;
const edit=`import sqlite3,json,sys
from pathlib import Path
for p in Path('.wrangler').rglob('*.sqlite'):
 try:
  db=sqlite3.connect(p);r=db.execute('SELECT name,state,revision FROM worlds WHERE id=?',(sys.argv[1],)).fetchone()
 except sqlite3.OperationalError:continue
 if not r:continue
 assert r[0].startswith('QA V41 ')
 if sys.argv[2]=='delete':db.execute('DELETE FROM worlds WHERE id=?',(sys.argv[1],));db.commit();break
 s=json.loads(r[1]);s['lastTick']=1;s['clockVersion']=2;s['simTime']=1
 s['companies']=[{'id':sys.argv[3],'name':'Snapshot test','cash':1234,'earned':0,'passengers':0,'loan':0,'history':[],'lines':[],'facilities':[{'id':'not-hydrated','name':'Unloaded depot','type':'busdepot','city':'missing-snapshot-map','point':[48,16],'cell':0,'footprint':[]}]}]
 db.execute('UPDATE worlds SET state=?,status=? WHERE id=?',(json.dumps(s),'running',sys.argv[1]));db.commit();break
else:raise RuntimeError('Local fixture not found')`;
function fixture(action){const p=spawnSync('python',['-c',edit,id,action,root.data.user.id],{encoding:'utf8'});assert.equal(p.status,0,p.stderr);}
try{
 fixture('prepare');const first=ok(await call('worlds/'+id+'/snapshot',undefined,cookie)).data.world;
 assert.equal(first.syncPending,true);assert.equal(first.state.lastTick,1);assert.equal(first.state.companies[0].cash,1234);assert.equal(first.speed,86400000);
 const again=ok(await call('worlds/'+id+'/snapshot',undefined,cookie)).data.world;assert.deepEqual(again.state,first.state);assert.equal(again.revision,first.revision,'Opening a world never writes or replays its simulation');
 assert.equal((await call('worlds/'+id+'/snapshot')).status,401);assert.equal((await call('worlds/missing-v41-world/snapshot',undefined,cookie)).status,404);
 console.log('PASS v41 API: stale worlds open without hydrating absent maps, simulation, cash changes or revision writes; sign-in and missing-world checks remain enforced.');
}finally{fixture('delete');}
