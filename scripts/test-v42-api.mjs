import assert from 'node:assert/strict';import {spawnSync} from 'node:child_process';
import {configOf} from '../lib/world-config.ts';import {buildingFootprint} from '../lib/infrastructure.ts';import {registerMap,cellPoint,nearestRoad,streetRoute,meters} from '../lib/real-map.ts';
const base=process.env.TEST_BASE||'http://127.0.0.1:5173';if(!['localhost','127.0.0.1'].includes(new URL(base).hostname))throw Error('Local only');
async function call(path,body,cookie){const r=await fetch(base+'/api/'+path,{method:body?'POST':'GET',headers:{...(body?{'Content-Type':'application/json'}:{}),...(cookie?{cookie}:{})},body:body?JSON.stringify(body):undefined});return {status:r.status,data:await r.json(),cookie:r.headers.get('set-cookie')?.split(';')[0]};}function ok(r){assert.equal(r.status,200,r.data.error);return r;}
const root=ok(await call('auth/login',{email:'admin@weltverbund.test',password:'Local-test-owner-password-2026'})),cookie=root.cookie,owner=root.data.user.id,id=ok(await call('admin/worlds',{name:'QA V42 '+Date.now(),config:configOf({tenders:{enabled:true,automatic:false,startPayment:100,completionPayment:200}})},cookie)).data.id;
let world;const act=async body=>{world=ok(await call('worlds/'+id+'/action',body,cookie)).data.world;return world;};
try{
 ok(await call('admin/worlds/'+id,{action:'start'},cookie));ok(await call('worlds/'+id+'/join',{name:'Einmalzahlungs-Test'},cookie));world=ok(await call('admin/worlds/'+id,{action:'company',company:owner,name:'Einmalzahlungs-Test',cash:50000000,suspended:false},cookie)).data.world;
 const map=ok(await call('map/'+(process.env.TEST_MAP||'geo_3542_3699'))).data.map;registerMap(map);let pair;for(let a=0;a<Math.min(80,map.nodes.length)&&!pair;a++)for(let b=a+1;b<Math.min(150,map.nodes.length);b++){const d=meters(map.nodes[a],map.nodes[b]);if(d<400||d>1800)continue;try{if(streetRoute(map,[a,b]).length>15)continue;pair=[a,b];break;}catch{}}assert.ok(pair);
 let cell=-1;for(let i=0;i<6400;i++)try{buildingFootprint(map,i,'busdepot');if(nearestRoad(map,cellPoint(map,i),150)>=0){cell=i;break;}}catch{}assert.ok(cell>=0);
 await act({type:'facility',kind:'busdepot',city:map.key,cell});for(const node of pair)await act({type:'busstop',city:map.key,node,name:'Zahlung Halt '+node});let c=world.state.companies.find(c=>c.id===owner);await act({type:'buildbus',name:'Vertragslinie',stopIds:c.stops.map(s=>s.id)});c=world.state.companies.find(c=>c.id===owner);await act({type:'vehicle-buy',depot:c.facilities[0].id,line:c.lines[0].id,model:'bus-mini'});
 world=ok(await call('admin/worlds/'+id,{action:'tender-create',tender:{type:'local',title:'Start- und Abschlussprämie',from:{name:'Testgebiet',point:map.nodes[pair[0]],radiusKm:5},mode:'bus',targetSeats:1,targetStops:2,grantPerDay:0,startPayment:1234.56,completionPayment:5678.90,durationDays:1,claimDays:7}},cookie)).data.world;const tender=world.state.tenders.at(-1).id;
 await act({type:'tender-check',tender});let t=world.state.tenders.find(t=>t.id===tender);assert.equal(t.startPaid,1234.56);assert.equal(t.paid,1234.56);assert.equal((await call('worlds/'+id+'/action',{type:'tender-check',tender},cookie)).status,400);
 const py=`import sqlite3,json,gzip,base64,sys,time
from pathlib import Path
for p in Path('.wrangler').rglob('*.sqlite'):
 try:
  d=sqlite3.connect(p);r=d.execute('SELECT name,state FROM worlds WHERE id=?',(sys.argv[1],)).fetchone()
 except sqlite3.OperationalError:continue
 if not r:continue
 assert r[0].startswith('QA V42 ')
 raw=r[1];s=json.loads(gzip.decompress(base64.b64decode(raw[3:])) if raw.startswith('gz:') else raw);s['simTime']+=86400001;s['lastTick']=int(time.time()*1000)
 payload='gz:'+base64.b64encode(gzip.compress(json.dumps(s,separators=(',',':')).encode())).decode();d.execute('UPDATE worlds SET state=?,revision=revision+1 WHERE id=?',(payload,sys.argv[1]));d.commit();break
else:raise RuntimeError('Local test world missing')`;
 const edit=spawnSync('python',['-c',py,id],{encoding:'utf8'});assert.equal(edit.status,0,edit.stderr);
 for(let i=0;i<2;i++){world=ok(await call('worlds/'+id+'/state',undefined,cookie)).data.world;t=world.state.tenders.find(t=>t.id===tender);assert.equal(t.status,'completed');assert.equal(t.completionPaid,5678.90);assert.equal(t.paid,6913.46);}
 const admin=ok(await call('admin/worlds/'+id,undefined,cookie)).data.world;assert.equal(admin.config.tenders.startPayment,100);assert.equal(admin.config.tenders.completionPayment,200);const income=Object.values(admin.state.companies.find(c=>c.id===owner).finances.days).reduce((n,row)=>n+(row[10]||0),0);assert.equal(Math.round(income*100),691346);
 console.log('PASS v42 API: persisted start/completion settings, real served-contract award, single claim, automatic once-only completion after offline passage, exact public subsidy ledger and no duplicate payout on refresh.');
}finally{await call('admin/worlds/'+id,{action:'stop'},cookie);}
