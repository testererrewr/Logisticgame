import {logError} from '../../../../lib/logistics/error-log';
import {NextRequest,NextResponse} from 'next/server';
import {env} from 'cloudflare:workers';
import {currentUser} from '../online/route';
import {sameOrigin} from '../../../../lib/same-origin';
const db=()=>env.DB!;
const reply=(d:unknown,status=200)=>NextResponse.json(d,{status,headers:{'Cache-Control':'no-store'}});
let ready:Promise<unknown>|undefined;
const ensure=()=>ready??=db().batch([
 db().prepare('CREATE TABLE IF NOT EXISTS logistics_messages(id TEXT PRIMARY KEY,world_id TEXT NOT NULL,from_id TEXT NOT NULL,to_id TEXT NOT NULL,text TEXT NOT NULL,created INTEGER NOT NULL,read INTEGER NOT NULL DEFAULT 0)'),
 db().prepare('CREATE INDEX IF NOT EXISTS logistics_messages_to ON logistics_messages(world_id,to_id,read)'),
 db().prepare('CREATE INDEX IF NOT EXISTS logistics_messages_from ON logistics_messages(world_id,from_id)'),
]).then(async()=>{const cols=(await db().prepare('PRAGMA table_info(logistics_messages)').all<{name:string}>()).results;if(!cols.some(c=>c.name==='del_from'))await db().prepare('ALTER TABLE logistics_messages ADD COLUMN del_from INTEGER NOT NULL DEFAULT 0').run().catch(()=>{});if(!cols.some(c=>c.name==='del_to'))await db().prepare('ALTER TABLE logistics_messages ADD COLUMN del_to INTEGER NOT NULL DEFAULT 0').run().catch(()=>{});}).catch(e=>{ready=undefined;throw e;});
const inWorld=async(world:string,user:string)=>!!await db().prepare('SELECT 1 FROM logistics_world_companies WHERE world_id=? AND user_id=?').bind(world,user).first();
const NAME="COALESCE(NULLIF(c.name,''),us.name)";

export async function GET(req:NextRequest){try{
 const u=await currentUser(req);if(!u||u.status!=='active')return reply({error:'Bitte anmelden.'},401);
 const world=(req.nextUrl.searchParams.get('world')||'').slice(0,100);if(!await inWorld(world,u.id))return reply({error:'Bitte der Welt beitreten.'},403);await ensure();
 const unread=(await db().prepare('SELECT count(*) AS n FROM logistics_messages WHERE world_id=? AND to_id=? AND read=0 AND del_to=0').bind(world,u.id).first<{n:number}>())?.n||0;
 if(req.nextUrl.searchParams.get('count'))return reply({unread});
 const messages=(await db().prepare(`SELECT m.id,m.from_id,m.to_id,m.text,m.created,m.read FROM logistics_messages m WHERE m.world_id=? AND ((m.to_id=? AND m.del_to=0) OR (m.from_id=? AND m.del_from=0)) ORDER BY m.created DESC LIMIT 300`).bind(world,u.id,u.id).all()).results;
 const companies=(await db().prepare(`SELECT c.user_id AS id,${NAME} AS name FROM logistics_world_companies c JOIN users us ON us.id=c.user_id WHERE c.world_id=? AND c.user_id<>? ORDER BY name LIMIT 1000`).bind(world,u.id).all()).results;
 return reply({me:u.id,unread,messages,companies});
}catch(e:any){await logError('api:messages',e,{url:req.url});return reply({error:e.message||'Nachrichten nicht verfügbar.'},503);}}

export async function POST(req:NextRequest){try{
 const u=await currentUser(req);if(!u||u.status!=='active')return reply({error:'Bitte anmelden.'},401);if(!sameOrigin(req))return reply({error:'Ungültiger Ursprung.'},403);
 const body=await req.json() as any,world=String(body.world||'').slice(0,100);if(!await inWorld(world,u.id))return reply({error:'Bitte der Welt beitreten.'},403);await ensure();
 if(body.action==='read'){await db().prepare('UPDATE logistics_messages SET read=1 WHERE world_id=? AND to_id=? AND from_id=? AND read=0').bind(world,u.id,String(body.with||'')).run();return reply({ok:true});}
 if(body.action==='delete'){const id=String(body.id||'');await db().batch([db().prepare('UPDATE logistics_messages SET del_to=1,read=1 WHERE id=? AND world_id=? AND to_id=?').bind(id,world,u.id),db().prepare('UPDATE logistics_messages SET del_from=1 WHERE id=? AND world_id=? AND from_id=?').bind(id,world,u.id)]);return reply({ok:true});}
 if(body.action==='deleteThread'){const w=String(body.with||'');await db().batch([db().prepare('UPDATE logistics_messages SET del_to=1,read=1 WHERE world_id=? AND to_id=? AND from_id=?').bind(world,u.id,w),db().prepare('UPDATE logistics_messages SET del_from=1 WHERE world_id=? AND from_id=? AND to_id=?').bind(world,u.id,w)]);return reply({ok:true});}
 if(body.action==='send'){const to=String(body.to||''),text=String(body.text||'').trim();if(!text||text.length>2000)throw Error('Nachricht: 1–2000 Zeichen.');if(to===u.id||!await inWorld(world,to))throw Error('Empfänger ist nicht in dieser Welt.');
  const recent=(await db().prepare('SELECT count(*) AS n FROM logistics_messages WHERE from_id=? AND created>?').bind(u.id,Date.now()-600000).first<{n:number}>())?.n||0;if(recent>=30)throw Error('Zu viele Nachrichten in kurzer Zeit – bitte kurz warten.');
  await db().prepare('INSERT INTO logistics_messages(id,world_id,from_id,to_id,text,created,read) VALUES(?,?,?,?,?,?,0)').bind(crypto.randomUUID(),world,u.id,to,text,Date.now()).run();return reply({ok:true});}
 throw Error('Unbekannte Aktion.');
}catch(e:any){await logError('api:messages',e,{url:req.url});return reply({error:e.message||'Senden fehlgeschlagen.'},422);}}
