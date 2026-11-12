import {NextRequest,NextResponse} from 'next/server';
import {env} from 'cloudflare:workers';
import {currentUser} from '../online/route';
import {sameOrigin} from '../../../../lib/same-origin';
import {logError} from '../../../../lib/logistics/error-log';
import {ensureCommunityTables,REPORT_REASONS} from '../../../../lib/logistics/community';
import {ensureMessageTable,systemMessageStatement} from '../../../../lib/logistics/system-message';
const db=()=>env.DB!;
const reply=(d:unknown,status=200)=>NextResponse.json(d,{status,headers:{'Cache-Control':'no-store'}});
const admin=(u:any)=>u&&['owner','admin'].includes(u.role);
const company=async(world:string,user:string)=>db().prepare('SELECT name FROM logistics_world_companies WHERE world_id=? AND user_id=?').bind(world,user).first<{name:string}>();

export async function GET(req:NextRequest){try{
 const u=await currentUser(req);if(!u||u.status!=='active')return reply({error:'Bitte anmelden.'},401);await ensureCommunityTables();
 const p=req.nextUrl.searchParams;
 if(p.get('admin')){if(!admin(u))return reply({error:'Nur für Administratoren.'},403);
  const letters=(await db().prepare("SELECT l.*,w.name AS world FROM logistics_letters l LEFT JOIN logistics_worlds w ON w.id=l.world_id ORDER BY CASE l.status WHEN 'pending' THEN 0 ELSE 1 END,l.created DESC LIMIT 100").all()).results;
  const reports=(await db().prepare("SELECT r.*,w.name AS world,COALESCE(NULLIF(a.name,''),ua.name) AS reporter,COALESCE(NULLIF(b.name,''),ub.name) AS target FROM logistics_reports r LEFT JOIN logistics_worlds w ON w.id=r.world_id LEFT JOIN users ua ON ua.id=r.reporter_id LEFT JOIN logistics_world_companies a ON a.world_id=r.world_id AND a.user_id=r.reporter_id LEFT JOIN users ub ON ub.id=r.target_id LEFT JOIN logistics_world_companies b ON b.world_id=r.world_id AND b.user_id=r.target_id ORDER BY CASE r.status WHEN 'open' THEN 0 WHEN 'progress' THEN 1 ELSE 2 END,r.created DESC LIMIT 200").all()).results;
  return reply({letters,reports});}
 const world=(p.get('world')||'').slice(0,100);if(!await company(world,u.id))return reply({error:'Bitte der Welt beitreten.'},403);
 const letters=(await db().prepare("SELECT id,author,text,day,created,user_id,status FROM logistics_letters WHERE world_id=? AND (status='approved' OR user_id=?) ORDER BY created DESC LIMIT 30").bind(world,u.id).all()).results;
 const reported=(await db().prepare("SELECT target_id FROM logistics_reports WHERE world_id=? AND reporter_id=? AND kind='player'").bind(world,u.id).all<{target_id:string}>()).results.map(r=>r.target_id);
 return reply({me:u.id,letters,reported,reasons:REPORT_REASONS});
}catch(e:any){await logError('api:community',e,{url:req.url});return reply({error:e.message||'Nicht verfügbar.'},503);}}

export async function POST(req:NextRequest){try{
 const u=await currentUser(req);if(!u||u.status!=='active')return reply({error:'Bitte anmelden.'},401);if(!sameOrigin(req))return reply({error:'Ungültiger Ursprung.'},403);await ensureCommunityTables();
 const b=await req.json() as any,now=Date.now(),action=String(b.action||'');
 if(['letterApprove','letterReject','reportStatus','reportMessage','letterDelete'].includes(action)){if(!admin(u))return reply({error:'Nur für Administratoren.'},403);
  if(action==='letterApprove'||action==='letterReject'){await db().prepare('UPDATE logistics_letters SET status=?,reviewed_by=? WHERE id=?').bind(action==='letterApprove'?'approved':'rejected',u.id,String(b.id||'')).run();return reply({ok:true});}
  if(action==='letterDelete'){await db().prepare('DELETE FROM logistics_letters WHERE id=?').bind(String(b.id||'')).run();return reply({ok:true});}
  const r=await db().prepare('SELECT * FROM logistics_reports WHERE id=?').bind(String(b.id||'')).first<any>();if(!r)throw Error('Meldung nicht gefunden.');
  if(action==='reportStatus'){const st=String(b.status||'');if(!['open','progress','resolved','released'].includes(st))throw Error('Ungültiger Status.');await db().prepare('UPDATE logistics_reports SET status=?,admin_note=?,updated=? WHERE id=?').bind(st,String(b.note??r.admin_note).slice(0,1000),now,r.id).run();return reply({ok:true});}
  const to=b.to==='target'?r.target_id:r.reporter_id,text=String(b.text||'').trim().slice(0,2000);if(!to||!text)throw Error('Empfänger und Text angeben.');
  await ensureMessageTable();await systemMessageStatement(r.world_id,to,'🛡️ Spielleitung: '+text).run();
  await db().prepare('UPDATE logistics_reports SET admin_note=?,updated=? WHERE id=?').bind((r.admin_note?r.admin_note+'\n':'')+`[${new Date(now).toLocaleString('de-DE')}] Nachricht an ${b.to==='target'?'Gemeldeten':'Melder'}: ${text}`.slice(0,4000),now,r.id).run();return reply({ok:true});}
 const world=String(b.world||'').slice(0,100),me=await company(world,u.id);if(!me)return reply({error:'Bitte der Welt beitreten.'},403);
 if(action==='letter'){const text=String(b.text||'').trim();if(text.length<10||text.length>600)throw Error('Leserbrief: 10–600 Zeichen.');
  const recent=await db().prepare('SELECT count(*) AS n FROM logistics_letters WHERE world_id=? AND user_id=? AND created>?').bind(world,u.id,now-20*3600000).first<{n:number}>();if((recent?.n||0)>=1)throw Error('Ein Leserbrief pro Tag.');
  const day=(await db().prepare('SELECT day FROM logistics_worlds WHERE id=?').bind(world).first<{day:number}>())?.day||0;
  await db().prepare("INSERT INTO logistics_letters(id,world_id,user_id,author,text,status,day,created) VALUES(?,?,?,?,?,'pending',?,?)").bind(crypto.randomUUID(),world,u.id,me.name||u.name,text,day,now).run();return reply({ok:true,message:'Danke! Dein Leserbrief erscheint nach Prüfung in der Zeitung.'});}
 if(action==='report'){const target=String(b.target||'');if(!target||target===u.id)throw Error('Ungültige Meldung.');if(!await company(world,target))throw Error('Diese Spedition gibt es in dieser Welt nicht.');const reason=REPORT_REASONS.includes(b.reason)?b.reason:'Sonstiges',text=String(b.text||'').trim().slice(0,1500);
  try{await db().prepare("INSERT INTO logistics_reports(id,world_id,kind,reporter_id,target_id,reason,text,status,created,updated) VALUES(?,?,'player',?,?,?,?,'open',?,?)").bind(crypto.randomUUID(),world,u.id,target,reason,text,now,now).run();}catch(e:any){if(/UNIQUE/i.test(String(e?.message)))throw Error('Du hast diese Spedition in dieser Welt bereits gemeldet.');throw e;}
  return reply({ok:true,message:'Danke, die Meldung ist bei der Spielleitung.'});}
 if(action==='bug'){const text=String(b.text||'').trim();if(text.length<10)throw Error('Bitte das Problem kurz beschreiben (mind. 10 Zeichen).');
  const recent=await db().prepare("SELECT count(*) AS n FROM logistics_reports WHERE kind='bug' AND reporter_id=? AND created>?").bind(u.id,now-3600000).first<{n:number}>();if((recent?.n||0)>=5)throw Error('Bitte etwas warten, bevor du weitere Probleme meldest.');
  await db().prepare("INSERT INTO logistics_reports(id,world_id,kind,reporter_id,target_id,reason,text,context,status,created,updated) VALUES(?,?,'bug',?,'',?,?,?,'open',?,?)").bind(crypto.randomUUID(),world,u.id,['Problem','Idee','Lob','Sonstiges'].includes(b.reason)?b.reason:'Problem',text.slice(0,3000),String(b.context||'').slice(0,4000),now,now).run();
  return reply({ok:true,message:'Danke! Das Problem wurde gemeldet.'});}
 throw Error('Unbekannte Aktion.');
}catch(e:any){await logError('api:community',e,{url:req.url},'warn');return reply({error:e.message||'Fehler.'},422);}}
