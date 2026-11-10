import {logError} from '../../../../lib/logistics/error-log';
import {NextRequest,NextResponse} from 'next/server';
import {env} from 'cloudflare:workers';
import {currentUser} from '../online/route';
import {sameOrigin} from '../../../../lib/same-origin';
import {ensureSocialTables} from '../../../../lib/logistics/social-server';
const db=()=>env.DB!;
const reply=(d:unknown,status=200)=>NextResponse.json(d,{status,headers:{'Cache-Control':'no-store'}});
const inWorld=async(world:string,user:string)=>!!await db().prepare('SELECT 1 FROM logistics_world_companies WHERE world_id=? AND user_id=?').bind(world,user).first();
const NAME="COALESCE((SELECT NULLIF(c.name,'') FROM logistics_world_companies c WHERE c.user_id=x.user_id AND c.world_id=x.world_id),(SELECT name FROM users WHERE id=x.user_id))";
export async function GET(req:NextRequest){try{
 const u=await currentUser(req);if(!u||u.status!=='active')return reply({error:'Bitte anmelden.'},401);await ensureSocialTables();const q=req.nextUrl.searchParams;
 const gb=q.get('guestbook');if(gb){const rows=(await db().prepare('SELECT g.id,g.text,g.created,g.author_id,us.name AS author FROM logistics_guestbook g JOIN users us ON us.id=g.author_id WHERE g.profile_user=? ORDER BY g.created DESC LIMIT 50').bind(gb.slice(0,80)).all()).results;return reply({me:u.id,entries:rows});}
 const world=(q.get('world')||'').slice(0,100);if(!await inWorld(world,u.id))return reply({error:'Bitte der Welt beitreten.'},403);
 if(q.get('history')){const rows=(await db().prepare(`SELECT x.id,x.kind,x.text,x.day,x.created,x.user_id FROM logistics_feed x WHERE x.world_id=? AND x.important=1 ORDER BY x.day ASC,x.created ASC LIMIT 300`).bind(world).all()).results;return reply({history:rows});}
 const rows=(await db().prepare(`SELECT x.id,x.kind,x.text,x.day,x.created,x.user_id,${NAME} AS name,(SELECT count(*) FROM logistics_congrats k WHERE k.feed_id=x.id) AS congrats,(SELECT 1 FROM logistics_congrats k WHERE k.feed_id=x.id AND k.user_id=?) AS mine FROM logistics_feed x WHERE x.world_id=? ORDER BY x.created DESC LIMIT 30`).bind(u.id,world).all()).results;
 return reply({me:u.id,feed:rows});
}catch(e:any){await logError('api:social',e,{url:req.url});return reply({error:e.message||'Nicht verfügbar.'},503);}}
export async function POST(req:NextRequest){try{
 const u=await currentUser(req);if(!u||u.status!=='active')return reply({error:'Bitte anmelden.'},401);if(!sameOrigin(req))return reply({error:'Ungültiger Ursprung.'},403);await ensureSocialTables();
 const body=await req.json() as any,now=Date.now();
 if(body.action==='guestbook'){const to=String(body.user||'').slice(0,80),text=String(body.text||'').trim();if(!text||text.length>500)throw Error('Eintrag: 1–500 Zeichen.');if(!await db().prepare('SELECT 1 FROM users WHERE id=?').bind(to).first())throw Error('Spieler nicht gefunden.');
  const recent=(await db().prepare('SELECT count(*) AS n FROM logistics_guestbook WHERE author_id=? AND created>?').bind(u.id,now-3600000).first<{n:number}>())?.n||0;if(recent>=20)throw Error('Zu viele Einträge – bitte später wieder.');
  await db().prepare('INSERT INTO logistics_guestbook(id,profile_user,author_id,text,created) VALUES(?,?,?,?,?)').bind(crypto.randomUUID(),to,u.id,text,now).run();return reply({ok:true});}
 if(body.action==='deleteGuestbook'){const r=await db().prepare('DELETE FROM logistics_guestbook WHERE id=? AND (profile_user=? OR author_id=?)').bind(String(body.id||''),u.id,u.id).run();if(!r.meta?.changes&&!['owner','admin'].includes(u.role))throw Error('Nicht erlaubt.');if(!r.meta?.changes)await db().prepare('DELETE FROM logistics_guestbook WHERE id=?').bind(String(body.id||'')).run();return reply({ok:true});}
 if(body.action==='congrats'){const f=await db().prepare('SELECT id,world_id,user_id,text FROM logistics_feed WHERE id=?').bind(String(body.id||'')).first<{id:string;world_id:string;user_id:string|null;text:string}>();if(!f||!f.user_id)throw Error('Meldung nicht gefunden.');if(f.user_id===u.id)throw Error('Selbst gratulieren geht nicht. 😉');if(!await inWorld(f.world_id,u.id))throw Error('Bitte der Welt beitreten.');
  const r=await db().prepare('INSERT OR IGNORE INTO logistics_congrats(feed_id,user_id,created) VALUES(?,?,?)').bind(f.id,u.id,now).run();
  if(r.meta?.changes&&await inWorld(f.world_id,f.user_id))await db().prepare('INSERT INTO logistics_messages(id,world_id,from_id,to_id,text,created,read) VALUES(?,?,?,?,?,?,0)').bind(crypto.randomUUID(),f.world_id,u.id,f.user_id,'🎉 Glückwunsch! ('+f.text+')',now).run();
  return reply({ok:true});}
 throw Error('Unbekannte Aktion.');
}catch(e:any){await logError('api:social',e,{url:req.url});return reply({error:e.message||'Aktion fehlgeschlagen.'},422);}}
