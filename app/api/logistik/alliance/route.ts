import {NextRequest,NextResponse} from 'next/server';
import {env} from 'cloudflare:workers';
import {currentUser} from '../online/route';
import {ensureAllianceTables,invalidateAllianceCache,allianceOffers} from '../../../../lib/logistics/alliance-server';
import {good} from '../../../../lib/logistics/engine';
import {sameOrigin} from '../../../../lib/same-origin';

const db=()=>env.DB!;
const reply=(d:unknown,status=200)=>NextResponse.json(d,{status,headers:{'Cache-Control':'no-store'}});
interface Alliance {id:string;world_id:string;name:string;tag:string;description:string;color:string;owner_id:string;open:number;created:number}
async function member(world:string,user:string){return db().prepare('SELECT m.alliance_id,m.role,a.name,a.tag FROM logistics_alliance_members m JOIN logistics_alliances a ON a.id=m.alliance_id WHERE m.world_id=? AND m.user_id=?').bind(world,user).first<{alliance_id:string;role:string;name:string;tag:string}>();}
async function inWorld(world:string,user:string){return !!await db().prepare('SELECT 1 FROM logistics_world_companies WHERE world_id=? AND user_id=?').bind(world,user).first();}
/** Track sharing: every member may use the tracks of every other member. */
async function shareTracks(world:string,allianceId:string,user:string,enabled:boolean){
 const others=(await db().prepare('SELECT user_id FROM logistics_alliance_members WHERE alliance_id=? AND user_id<>?').bind(allianceId,user).all<{user_id:string}>()).results.map(r=>r.user_id);
 const now=Date.now(),stmts=others.flatMap(o=>[[user,o],[o,user]].map(([owner,grantee])=>db().prepare('INSERT INTO logistics_world_permissions(world_id,owner_id,grantee_id,enabled,updated) VALUES(?,?,?,?,?) ON CONFLICT(world_id,owner_id,grantee_id) DO UPDATE SET enabled=excluded.enabled,updated=excluded.updated').bind(world,owner,grantee,enabled?1:0,now)));
 if(stmts.length)await db().batch(stmts);
}

export async function GET(req:NextRequest){try{
 const u=await currentUser(req);if(!u||u.status!=='active')return reply({error:'Bitte anmelden.'},401);
 const world=(req.nextUrl.searchParams.get('world')||'').slice(0,100);if(!await inWorld(world,u.id))return reply({error:'Bitte der Welt beitreten.'},403);
 await ensureAllianceTables();
 const mine=await member(world,u.id);
 const alliances=(await db().prepare('SELECT a.id,a.name,a.tag,a.description,a.color,a.open,(SELECT count(*) FROM logistics_alliance_members m WHERE m.alliance_id=a.id) AS members FROM logistics_alliances a WHERE a.world_id=? ORDER BY members DESC,a.name LIMIT 200').bind(world).all()).results;
 const invites=(await db().prepare('SELECT a.id,a.name,a.tag FROM logistics_alliance_invites i JOIN logistics_alliances a ON a.id=i.alliance_id WHERE i.user_id=? AND a.world_id=?').bind(u.id,world).all()).results;
 let detail:unknown=null;
 if(mine){const a=await db().prepare('SELECT * FROM logistics_alliances WHERE id=?').bind(mine.alliance_id).first<Alliance>();
  const members=(await db().prepare("SELECT m.user_id AS id,m.role,m.joined,COALESCE(NULLIF(c.name,''),us.name) AS name FROM logistics_alliance_members m JOIN users us ON us.id=m.user_id LEFT JOIN logistics_world_companies c ON c.world_id=m.world_id AND c.user_id=m.user_id WHERE m.alliance_id=? ORDER BY CASE m.role WHEN 'leader' THEN 0 WHEN 'officer' THEN 1 ELSE 2 END,name").bind(mine.alliance_id).all()).results;
  const posts=(await db().prepare("SELECT p.id,p.text,p.created,p.user_id,COALESCE(NULLIF(c.name,''),us.name) AS name FROM logistics_alliance_posts p JOIN users us ON us.id=p.user_id LEFT JOIN logistics_world_companies c ON c.world_id=? AND c.user_id=p.user_id WHERE p.alliance_id=? ORDER BY p.created DESC LIMIT 50").bind(world,mine.alliance_id).all()).results;
  const pending=(await db().prepare("SELECT i.user_id AS id,COALESCE(NULLIF(c.name,''),us.name) AS name FROM logistics_alliance_invites i JOIN users us ON us.id=i.user_id LEFT JOIN logistics_world_companies c ON c.world_id=? AND c.user_id=i.user_id WHERE i.alliance_id=?").bind(world,mine.alliance_id).all()).results;
  const day=(await db().prepare('SELECT day FROM logistics_worlds WHERE id=?').bind(world).first<{day:number}>())?.day||0;
  const orders=(await db().prepare('SELECT id,good,destination_name AS title,quantity,delivered,reward,deadline_day AS deadline,status,contributions,created FROM logistics_alliance_orders WHERE alliance_id=? ORDER BY created DESC LIMIT 10').bind(mine.alliance_id).all<any>()).results.map(o=>({...o,goodName:good(o.good)?.name||o.good,contributions:JSON.parse(o.contributions||'{}')}));
  const offers=orders.some(o=>o.status==='active')?[]:allianceOffers(mine.alliance_id,day,members.length).filter(f=>!orders.some(o=>o.id===mine.alliance_id+':'+f.key)).map(f=>({...f,goodName:good(f.good)?.name||f.good}));
  detail={...a,role:mine.role,members,posts,pending,day,orders,offers};}
 const companies=(await db().prepare("SELECT c.user_id AS id,COALESCE(NULLIF(c.name,''),us.name) AS name,m.alliance_id AS allianceId FROM logistics_world_companies c JOIN users us ON us.id=c.user_id LEFT JOIN logistics_alliance_members m ON m.world_id=c.world_id AND m.user_id=c.user_id WHERE c.world_id=? ORDER BY name LIMIT 500").bind(world).all()).results;
 return reply({me:u.id,alliance:detail,alliances,invites,companies});
}catch(e:any){return reply({error:e.message||'Allianzen nicht verfügbar.'},503);}}

export async function POST(req:NextRequest){try{
 const u=await currentUser(req);if(!u||u.status!=='active')return reply({error:'Bitte anmelden.'},401);
 if(!sameOrigin(req))return reply({error:'Ungültiger Ursprung.'},403);
 const body=await req.json() as any,world=String(body.world||'').slice(0,100),action=String(body.action||'');
 if(!await inWorld(world,u.id))return reply({error:'Bitte der Welt beitreten.'},403);
 await ensureAllianceTables();
 const mine=await member(world,u.id),now=Date.now(),lead=mine&&['leader','officer'].includes(mine.role);
 if(action==='create'){
  if(mine)throw Error('Du bist bereits in einer Allianz.');
  const name=String(body.name||'').trim(),tag=String(body.tag||'').trim().toUpperCase();
  if(name.length<3||name.length>40)throw Error('Allianzname: 3–40 Zeichen.');if(!/^[A-Z0-9ÄÖÜ]{2,5}$/.test(tag))throw Error('Kürzel: 2–5 Buchstaben oder Ziffern.');
  if(await db().prepare('SELECT 1 FROM logistics_alliances WHERE world_id=? AND (lower(name)=lower(?) OR tag=?)').bind(world,name,tag).first())throw Error('Name oder Kürzel ist in dieser Welt schon vergeben.');
  const id=crypto.randomUUID();await db().batch([db().prepare('INSERT INTO logistics_alliances(id,world_id,name,tag,description,color,owner_id,open,created) VALUES(?,?,?,?,?,?,?,?,?)').bind(id,world,name,tag,String(body.description||'').slice(0,500),/^#[0-9a-f]{6}$/i.test(body.color)?body.color:'#4a90c8',u.id,body.open?1:0,now),db().prepare("INSERT INTO logistics_alliance_members(alliance_id,world_id,user_id,role,joined) VALUES(?,?,?,'leader',?)").bind(id,world,u.id,now)]);
 }else if(action==='invite'){
  if(!lead)throw Error('Nur Leitung und Offiziere können einladen.');const target=String(body.userId||'');if(!await inWorld(world,target))throw Error('Spedition nicht in dieser Welt.');if(await member(world,target))throw Error('Diese Spedition ist schon in einer Allianz.');
  await db().prepare('INSERT OR IGNORE INTO logistics_alliance_invites(alliance_id,user_id,created) VALUES(?,?,?)').bind(mine!.alliance_id,target,now).run();
 }else if(action==='accept'||action==='join'){
  if(mine)throw Error('Zuerst die aktuelle Allianz verlassen.');const id=String(body.allianceId||'');const a=await db().prepare('SELECT * FROM logistics_alliances WHERE id=? AND world_id=?').bind(id,world).first<Alliance>();if(!a)throw Error('Allianz nicht gefunden.');
  if(action==='accept'&&!await db().prepare('SELECT 1 FROM logistics_alliance_invites WHERE alliance_id=? AND user_id=?').bind(id,u.id).first())throw Error('Keine Einladung vorhanden.');if(action==='join'&&!a.open)throw Error('Diese Allianz nimmt nur auf Einladung auf.');
  const n=await db().prepare('SELECT count(*) AS n FROM logistics_alliance_members WHERE alliance_id=?').bind(id).first<{n:number}>();if((n?.n||0)>=25)throw Error('Die Allianz ist voll (25 Speditionen).');
  await db().batch([db().prepare("INSERT INTO logistics_alliance_members(alliance_id,world_id,user_id,role,joined) VALUES(?,?,?,'member',?)").bind(id,world,u.id,now),db().prepare('DELETE FROM logistics_alliance_invites WHERE user_id=? AND alliance_id IN (SELECT id FROM logistics_alliances WHERE world_id=?)').bind(u.id,world)]);
  await shareTracks(world,id,u.id,true);
 }else if(action==='decline'){await db().prepare('DELETE FROM logistics_alliance_invites WHERE alliance_id=? AND user_id=?').bind(String(body.allianceId||''),u.id).run();}
 else if(action==='leave'||action==='kick'){
  if(!mine)throw Error('Du bist in keiner Allianz.');const target=action==='kick'?String(body.userId||''):u.id;
  if(action==='kick'){if(!lead)throw Error('Nur Leitung und Offiziere können Mitglieder entfernen.');const t=await member(world,target);if(!t||t.alliance_id!==mine.alliance_id||t.role==='leader')throw Error('Dieses Mitglied kann nicht entfernt werden.');}
  await shareTracks(world,mine.alliance_id,target,false);
  await db().prepare('DELETE FROM logistics_alliance_members WHERE world_id=? AND user_id=?').bind(world,target).run();
  const rest=(await db().prepare('SELECT user_id,role FROM logistics_alliance_members WHERE alliance_id=? ORDER BY joined').bind(mine.alliance_id).all<{user_id:string;role:string}>()).results;
  if(!rest.length)await db().batch([db().prepare('DELETE FROM logistics_alliances WHERE id=?').bind(mine.alliance_id),db().prepare('DELETE FROM logistics_alliance_invites WHERE alliance_id=?').bind(mine.alliance_id),db().prepare('DELETE FROM logistics_alliance_posts WHERE alliance_id=?').bind(mine.alliance_id)]);
  else if(!rest.some(r=>r.role==='leader'))await db().prepare("UPDATE logistics_alliance_members SET role='leader' WHERE alliance_id=? AND user_id=?").bind(mine.alliance_id,rest[0].user_id).run();
 }else if(action==='role'){
  if(mine?.role!=='leader')throw Error('Nur die Leitung vergibt Rollen.');const target=String(body.userId||''),role=String(body.role||'');if(!['officer','member','leader'].includes(role)||target===u.id)throw Error('Ungültige Rolle.');const t=await member(world,target);if(!t||t.alliance_id!==mine.alliance_id)throw Error('Kein Mitglied.');
  const stmts=[db().prepare('UPDATE logistics_alliance_members SET role=? WHERE world_id=? AND user_id=?').bind(role,world,target)];if(role==='leader')stmts.push(db().prepare("UPDATE logistics_alliance_members SET role='officer' WHERE world_id=? AND user_id=?").bind(world,u.id));await db().batch(stmts);
 }else if(action==='post'){
  if(!mine)throw Error('Du bist in keiner Allianz.');const text=String(body.text||'').trim();if(!text||text.length>1000)throw Error('Nachricht: 1–1000 Zeichen.');
  await db().prepare('INSERT INTO logistics_alliance_posts(id,alliance_id,user_id,text,created) VALUES(?,?,?,?,?)').bind(crypto.randomUUID(),mine.alliance_id,u.id,text,now).run();
 }else if(action==='acceptOrder'){
  if(!lead)throw Error('Nur Leitung und Offiziere nehmen Allianz-Aufträge an.');
  if(await db().prepare("SELECT 1 FROM logistics_alliance_orders WHERE alliance_id=? AND status='active'").bind(mine!.alliance_id).first())throw Error('Es läuft bereits ein Allianz-Auftrag.');
  const day=(await db().prepare('SELECT day FROM logistics_worlds WHERE id=?').bind(world).first<{day:number}>())?.day||0,n=await db().prepare('SELECT count(*) AS n FROM logistics_alliance_members WHERE alliance_id=?').bind(mine!.alliance_id).first<{n:number}>();
  const offer=allianceOffers(mine!.alliance_id,day,n?.n||1).find(f=>f.key===String(body.key||''));if(!offer)throw Error('Angebot nicht mehr verfügbar.');
  const title=`${offer.quantity.toLocaleString('de-DE')} EH ${good(offer.good).name}`;
  await db().prepare("INSERT INTO logistics_alliance_orders(id,alliance_id,world_id,good,destination_id,destination_name,quantity,delivered,reward,deadline_day,status,created) VALUES(?,?,?,?,?,?,?,0,?,?,'active',?)").bind(mine!.alliance_id+':'+offer.key,mine!.alliance_id,world,offer.good,'',title,offer.quantity,offer.reward,day+offer.days,now).run();
  await db().prepare('INSERT INTO logistics_alliance_posts(id,alliance_id,user_id,text,created) VALUES(?,?,?,?,?)').bind(crypto.randomUUID(),mine!.alliance_id,u.id,`📦 Allianz-Auftrag angenommen: ${title} in ${offer.days} Tagen an beliebige Kunden liefern.`,now).run();
 }else if(action==='cancelOrder'){
  if(mine?.role!=='leader')throw Error('Nur die Leitung kann abbrechen.');await db().prepare("UPDATE logistics_alliance_orders SET status='cancelled' WHERE alliance_id=? AND status='active'").bind(mine.alliance_id).run();
 }else if(action==='settings'){
  if(mine?.role!=='leader')throw Error('Nur die Leitung ändert die Allianz.');await db().prepare('UPDATE logistics_alliances SET description=?,color=?,open=?,share_storage=? WHERE id=?').bind(String(body.description||'').slice(0,500),/^#[0-9a-f]{6}$/i.test(body.color)?body.color:'#4a90c8',body.open?1:0,body.shareStorage===false?0:1,mine.alliance_id).run();invalidateAllianceCache();
 }else throw Error('Unbekannte Aktion.');
 invalidateAllianceCache();return reply({ok:true});
}catch(e:any){return reply({error:e.message||'Aktion fehlgeschlagen.'},422);}}
