import {NextRequest,NextResponse} from 'next/server';
import {env} from 'cloudflare:workers';
import {logError} from '../../../../lib/logistics/error-log';
import {nodeByToken,saveNode,exportWorldSql,installScript} from '../../../../lib/logistics/world-transfer';
const db=()=>env.DB!;
const MOVE='move:';
const text=(body:string,status=200,type='text/plain; charset=utf-8')=>new NextResponse(body,{status,headers:{'Content-Type':type,'Cache-Control':'no-store'}});
async function moves(){return (await db().prepare("SELECT id,payload FROM logistics_runtime WHERE id>=? AND id<?").bind(MOVE,MOVE+'￿').all<{id:string;payload:string}>()).results.map(r=>{try{return {world:r.id.slice(MOVE.length),...JSON.parse(r.payload)};}catch{return null;}}).filter(Boolean) as any[];}
const setMove=(world:string,v:any)=>db().prepare('INSERT OR REPLACE INTO logistics_runtime(id,updated,payload) VALUES(?,?,?)').bind(MOVE+world,Date.now(),JSON.stringify(v)).run();

export async function GET(req:NextRequest){try{
 const p=req.nextUrl.searchParams,action=p.get('action'),node=await nodeByToken(String(p.get('t')||''));
 if(!node)return text('echo "Ungültiger oder abgelaufener Installationsbefehl – bitte in der Verwaltung neu erzeugen." >&2; exit 1\n',403);
 if(action==='install'){const main=new URL(req.url).origin;return text(installScript({name:node.name,domain:node.domain,token:node.token,main,repo:String((env as any).LOGISTIK_REPO||'https://github.com/testererrewr/Logisticgame.git')}),200,'text/x-shellscript; charset=utf-8');}
 if(action==='export'){const world=String(p.get('world')||'');const m=(await moves()).find(x=>x.world===world&&x.node===node.name&&x.state==='pending');if(!m)return text('Kein Umzug angefordert.',404);
  const sql=await exportWorldSql(world);await setMove(world,{...m,state:'exported',exported:Date.now(),bytes:sql.length});return text(sql,200,'application/sql; charset=utf-8');}
 return text('Unbekannte Aktion.',400);
}catch(e:any){await logError('api:node',e,{url:req.url});return text('Fehler: '+(e.message||e),500);}}

export async function POST(req:NextRequest){try{
 const p=req.nextUrl.searchParams,action=p.get('action');
 if(action==='upload'){const node=await nodeByToken(String(p.get('t')||''));if(!node)return text('Nicht erlaubt.',403);const world=String(p.get('world')||'');const m=(await moves()).find(x=>x.world===world&&x.node===node.name&&x.state==='back');if(!m)return text('Keine Rückgabe angefordert.',404);
  const raw=req.body?await new Response(req.body.pipeThrough(new DecompressionStream('gzip'))).text():'';if(!raw.includes('COMMIT;'))return text('Export unvollständig.',422);
  const sql=raw.split('\n').filter(l=>!/^(PRAGMA|BEGIN|COMMIT)/.test(l.trim())).join('\n');
  const tabs=(await db().prepare("SELECT m.name FROM sqlite_master m WHERE m.type='table' AND EXISTS(SELECT 1 FROM pragma_table_info(m.name) c WHERE c.name='world_id')").all<{name:string}>()).results.map(r=>r.name).filter(n=>n!=='logistics_worlds');
  await db().batch([...tabs.map(t=>db().prepare(`DELETE FROM "${t}" WHERE world_id=?`).bind(world)),db().prepare('DELETE FROM logistics_company_chunks WHERE owner LIKE ?').bind(world+'|%')]);
  await db().exec(sql.replace(/\n(?=INSERT|CREATE)/g,'\n'));
  await db().prepare('UPDATE logistics_worlds SET host_url=NULL WHERE id=?').bind(world).run();await setMove(world,{...m,state:'done-back',done:Date.now()});
  return text('ok');}
 const body=await req.json().catch(()=>({})) as any,node=await nodeByToken(String(body.token||''));if(!node)return NextResponse.json({error:'Nicht erlaubt.'},{status:403});
 if(action==='heartbeat'){const am=(node as any).autoMove;if(am){const row=await db().prepare('SELECT host_url FROM logistics_worlds WHERE id=?').bind(am).first<{host_url:string|null}>();if(row&&!row.host_url){await db().batch([db().prepare('UPDATE logistics_worlds SET host_url=? WHERE id=?').bind('https://'+node.domain,am),db().prepare('INSERT OR REPLACE INTO logistics_runtime(id,updated,payload) VALUES(?,?,?)').bind(MOVE+am,Date.now(),JSON.stringify({node:node.name,state:'pending',at:Date.now(),by:'Installation'}))]);}(node as any).autoMove=undefined;}
  const pending=(await moves()).filter(m=>m.node===node.name);const upd=(node as any).update===1;
  await saveNode({...node,lastSeen:Date.now(),version:String(body.version||'').slice(0,20),port:Number(body.port)||undefined,worlds:String(body.worlds||'').split(',').filter(w=>w&&w!=='keine'),status:'online',...(upd?{update:0}:{})} as any);
  const mv=pending.find(m=>m.state==='pending'),bk=pending.find(m=>m.state==='back');
  return NextResponse.json({ok:true,move:mv?{world:mv.world}:null,back:bk?{world:bk.world}:null,update:upd?1:0});}
 if(action==='confirm'){const world=String(body.world||'');const m=(await moves()).find(x=>x.world===world&&x.node===node.name);if(!m)return NextResponse.json({error:'Kein Umzug.'},{status:404});
  if(body.ok){await setMove(world,{...m,state:'done',done:Date.now()});}else{await db().prepare('UPDATE logistics_worlds SET host_url=NULL WHERE id=?').bind(world).run();await setMove(world,{...m,state:'failed',done:Date.now()});}
  return NextResponse.json({ok:true});}
 return NextResponse.json({error:'Unbekannte Aktion.'},{status:400});
}catch(e:any){await logError('api:node',e,{url:req.url});return NextResponse.json({error:e.message||'Fehler'},{status:500});}}
