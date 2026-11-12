import {allowAction,TOO_FAST} from '../../../../lib/logistics/rate-limit';
import {NextRequest,NextResponse} from 'next/server';
import {env} from 'cloudflare:workers';
import {currentUser} from '../online/route';
import {sameOrigin} from '../../../../lib/same-origin';
import {logError} from '../../../../lib/logistics/error-log';
import {validateSettings,parseSettings} from '../../../../lib/logistics/world-settings';
import {ensureWorldSettingsColumn} from '../../../../lib/logistics/world-region-server';
const db=()=>env.DB!;
const reply=(d:unknown,status=200)=>NextResponse.json(d,{status,headers:{'Cache-Control':'no-store'}});
const isAdmin=(u:any)=>u&&['owner','admin'].includes(u.role);
let readyDone=false;let ready:Promise<unknown>|undefined;
const ensure=()=>(readyDone?Promise.resolve(undefined as any):Promise.resolve(db().prepare("CREATE TABLE IF NOT EXISTS logistics_server_orders(id TEXT PRIMARY KEY,user_id TEXT NOT NULL,config TEXT NOT NULL,status TEXT NOT NULL DEFAULT 'pending',price TEXT NOT NULL DEFAULT '',admin_note TEXT NOT NULL DEFAULT '',world_id TEXT,created INTEGER NOT NULL,updated INTEGER NOT NULL)").run().catch(e=>{ready=undefined;throw e;})).then((v:any)=>{readyDone=true;return v;}));
const STATUS=['pending','quoted','accepted','declined','active','cancelled'];
function cleanConfig(c:any){const name=String(c?.name||'').trim().slice(0,60);if(name.length<3)throw Error('Weltname: mindestens 3 Zeichen.');
 return {name,players:Math.max(1,Math.min(1000,Math.round(Number(c?.players)||10))),timeScale:Math.max(.1,Math.min(1440,Number(c?.timeScale)||1)),seasonDays:Math.max(0,Math.min(3650,Math.round(Number(c?.seasonDays)||0))),startCash:Math.max(10000,Math.min(1e12,Math.round(Number(c?.startCash)||5500000))),modes:Array.isArray(c?.modes)?c.modes.filter((m:unknown)=>typeof m==='string').slice(0,10):['road','rail','ship','air'],region:String(c?.region||'Ganze Welt').slice(0,300),maintenance:c?.maintenance!==false,fuel:c?.fuel!==false,drivers:c?.drivers!==false,ownServer:!!c?.ownServer,notes:String(c?.notes||'').slice(0,2000),contact:String(c?.contact||'').slice(0,200)};}

export async function GET(req:NextRequest){try{
 const u=await currentUser(req);if(!u||u.status!=='active')return reply({error:'Bitte anmelden.'},401);await ensure();await ensureWorldSettingsColumn();
 if(req.nextUrl.searchParams.get('admin')){if(!isAdmin(u))return reply({error:'Nur für Administratoren.'},403);
  const rows=(await db().prepare('SELECT o.*,us.name AS user_name,us.email AS user_email FROM logistics_server_orders o LEFT JOIN users us ON us.id=o.user_id ORDER BY CASE o.status WHEN \'pending\' THEN 0 WHEN \'accepted\' THEN 1 WHEN \'quoted\' THEN 2 ELSE 3 END,o.created DESC LIMIT 200').all<any>()).results.map(r=>({...r,config:JSON.parse(r.config||'{}')}));return reply({orders:rows});}
 const orders=(await db().prepare('SELECT * FROM logistics_server_orders WHERE user_id=? ORDER BY created DESC LIMIT 50').bind(u.id).all<any>()).results.map(r=>({...r,config:JSON.parse(r.config||'{}')}));
 const worlds=[];for(const w of (await db().prepare("SELECT id,name,settings FROM logistics_worlds WHERE settings LIKE '%\"private\":true%'").all<any>()).results){const s=parseSettings(w.settings);if(s.ownerId!==u.id)continue;const members=s.members?.length?(await db().prepare('SELECT id,name FROM users WHERE id IN (SELECT value FROM json_each(?))').bind(JSON.stringify(s.members)).all<any>()).results:[];worlds.push({id:w.id,name:w.name,members});}
 return reply({orders,worlds});
}catch(e:any){await logError('api:orders',e,{url:req.url});return reply({error:e.message||'Nicht verfügbar.'},503);}}

export async function POST(req:NextRequest){try{
 const u=await currentUser(req);if(!u||u.status!=='active')return reply({error:'Bitte anmelden.'},401);if(u&&!allowAction('orders:'+u.id,1,5))return NextResponse.json({error:TOO_FAST},{status:429});if(!sameOrigin(req))return reply({error:'Ungültiger Ursprung.'},403);await ensure();await ensureWorldSettingsColumn();
 const b=await req.json() as any,now=Date.now(),action=String(b.action||'');
 if(action==='order'){const sc=await db().prepare("SELECT payload FROM logistics_runtime WHERE id='site-settings'").first<{payload:string}>().catch(()=>null);if(!JSON.parse(sc?.payload||'{}').ordersEnabled&&!isAdmin(u))throw Error('Bestellungen sind derzeit nicht möglich.');const open=await db().prepare("SELECT count(*) AS n FROM logistics_server_orders WHERE user_id=? AND status IN ('pending','quoted')").bind(u.id).first<{n:number}>();if((open?.n||0)>=3)throw Error('Du hast bereits 3 offene Anfragen.');
  await db().prepare("INSERT INTO logistics_server_orders(id,user_id,config,status,created,updated) VALUES(?,?,?,'pending',?,?)").bind(crypto.randomUUID(),u.id,JSON.stringify(cleanConfig(b.config)),now,now).run();return reply({ok:true,message:'Anfrage gesendet. Du bekommst hier einen Preisvorschlag.'});}
 if(action==='accept'||action==='decline'){const o=await db().prepare('SELECT * FROM logistics_server_orders WHERE id=? AND user_id=?').bind(String(b.id||''),u.id).first<any>();if(!o||o.status!=='quoted')throw Error('Kein offener Preisvorschlag.');await db().prepare('UPDATE logistics_server_orders SET status=?,updated=? WHERE id=?').bind(action==='accept'?'accepted':'declined',now,o.id).run();return reply({ok:true});}
 if(action==='members'){const w=await db().prepare('SELECT id,settings FROM logistics_worlds WHERE id=?').bind(String(b.worldId||'')).first<any>();if(!w)throw Error('Welt nicht gefunden.');const raw=JSON.parse(w.settings||'{}');if(!raw.private||(raw.ownerId!==u.id&&!isAdmin(u)))throw Error('Nur der Besitzer verwaltet die Mitglieder.');raw.members=Array.isArray(raw.members)?raw.members:[];
  if(b.add){const q=String(b.add).trim();const t=await db().prepare('SELECT id FROM users WHERE lower(name)=lower(?) OR lower(email)=lower(?) LIMIT 1').bind(q,q).first<{id:string}>();if(!t)throw Error('Kein Konto mit diesem Namen oder dieser E-Mail gefunden.');if(!raw.members.includes(t.id))raw.members.push(t.id);}
  if(b.remove)raw.members=raw.members.filter((x:string)=>x!==String(b.remove));
  await db().prepare('UPDATE logistics_worlds SET settings=? WHERE id=?').bind(JSON.stringify(raw),w.id).run();return reply({ok:true});}
 if(!isAdmin(u))return reply({error:'Nur für Administratoren.'},403);
 const o=await db().prepare('SELECT * FROM logistics_server_orders WHERE id=?').bind(String(b.id||'')).first<any>();if(!o)throw Error('Bestellung nicht gefunden.');
 if(action==='quote'){const price=String(b.price||'').trim().slice(0,100);if(!price)throw Error('Preis angeben.');await db().prepare("UPDATE logistics_server_orders SET status='quoted',price=?,admin_note=?,updated=? WHERE id=?").bind(price,String(b.note||'').slice(0,2000),now,o.id).run();return reply({ok:true});}
 if(action==='status'){const st=String(b.status||'');if(!STATUS.includes(st))throw Error('Ungültiger Status.');await db().prepare('UPDATE logistics_server_orders SET status=?,admin_note=?,updated=? WHERE id=?').bind(st,String(b.note??o.admin_note).slice(0,2000),now,o.id).run();return reply({ok:true});}
 if(action==='createWorld'){if(o.world_id)throw Error('Für diese Bestellung gibt es bereits eine Welt.');const c=JSON.parse(o.config||'{}');
  const settings={...validateSettings({startCash:c.startCash,modes:c.modes,maintenance:c.maintenance,fuel:c.fuel,drivers:c.drivers,seasonDays:c.seasonDays,maxPlayers:c.players}),private:true,ownerId:o.user_id,members:[]};
  const id=crypto.randomUUID(),scale=Number(c.timeScale)||1;await db().prepare("INSERT INTO logistics_worlds(id,name,description,owner_id,day,last_tick,tick_ms,time_scale,status,created,settings) VALUES(?,?,?,?,1,?,?,?,'running',?,?)").bind(id,c.name,'Private Welt',o.user_id,now,86400000/scale,scale,now,JSON.stringify(settings)).run();
  await db().prepare("UPDATE logistics_server_orders SET status='active',world_id=?,updated=? WHERE id=?").bind(id,now,o.id).run();return reply({ok:true,worldId:id});}
 throw Error('Unbekannte Aktion.');
}catch(e:any){await logError('api:orders',e,{url:req.url},'warn');return reply({error:e.message||'Fehler.'},422);}}
