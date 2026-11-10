import {logError} from '../../../../lib/logistics/error-log';
import {sameOrigin} from '../../../../lib/same-origin';
import {ensureAllianceTables} from '../../../../lib/logistics/alliance-server';
import {ensureBrandingTables,setEntitlement} from '../../../../lib/logistics/branding-server';
import {validateSettings,parseSettings,settingsSummary} from '../../../../lib/logistics/world-settings';
import {ensureWorldSettingsColumn} from '../../../../lib/logistics/world-region-server';
import {readWorldImport,worldImportStatus,setWorldImportEnabled,continueWorldImport,retryWorldImport} from '../../../../lib/logistics/world-import';
import {NextRequest,NextResponse} from 'next/server';
import {env} from 'cloudflare:workers';
import {currentUser,settleWorld,settleAllWorlds} from '../online/route';
import {loadPartnerArea} from '../partners/route';
const db=()=>env.DB!;
const reply=(data:unknown,status=200)=>NextResponse.json(data,{status,headers:{'Cache-Control':'no-store'}});
export async function GET(req:NextRequest){try{
 const u=await currentUser(req);if(!u||u.status!=='active'||!['owner','admin'].includes(u.role))return reply({error:'Nur für Administratoren.'},403);
 continueWorldImport();await ensureWorldSettingsColumn();
 const [worlds,users,runtime,areas,partners]=await db().batch([
  db().prepare('SELECT w.*,(SELECT count(*) FROM logistics_world_companies c WHERE c.world_id=w.id) AS companies FROM logistics_worlds w ORDER BY created DESC'),
  db().prepare('SELECT id,name,email,role,status,created FROM users ORDER BY created DESC LIMIT 100'),
  db().prepare("SELECT * FROM logistics_runtime WHERE id='simulation'"),
  db().prepare('SELECT * FROM logistics_loaded_areas ORDER BY loaded DESC LIMIT 40'),
  db().prepare('SELECT count(*) AS n FROM logistics_partner_registry'),
 ]);return reply({worldImport:worldImportStatus(await readWorldImport()),entitlements:await (async()=>{await ensureBrandingTables();return (await db().prepare('SELECT user_id,feature FROM logistics_entitlements').all()).results;})(),worlds:worlds.results.map((w:any)=>({...w,settings:settingsSummary(parseSettings(w.settings))})),users:users.results,runtime:runtime.results[0]||null,areas:areas.results,partnerCount:(partners.results[0] as any)?.n||0,role:u.role});
 }catch(e:any){await logError('api:admin',e,{url:req.url});return reply({error:e.message},422);}}
export async function POST(req:NextRequest){try{
 const raw=await req.text();if(raw.length>50000)return reply({error:'Anfrage zu groß.'},413);
 const u=await currentUser(req);if(!u||u.status!=='active'||!['owner','admin'].includes(u.role))return reply({error:'Nur für Administratoren.'},403);
 if(!sameOrigin(req))return reply({error:'Ungültiger Ursprung.'},403);
 const body:any=JSON.parse(raw),now=Date.now();let result:unknown={ok:true};
 if(body.action==='worldImport'){if(typeof body.enabled!=='boolean')throw Error('Importstatus fehlt.');result=await setWorldImportEnabled(body.enabled);if(body.enabled)continueWorldImport();}
 else if(body.action==='worldImportRetry'){result=await retryWorldImport();continueWorldImport();}
 else if(body.action==='createWorld'){
  const name=String(body.name||'').trim();if(name.length<3||name.length>60)throw Error('Weltname: 3–60 Zeichen.');
  const scale=body.timeScale===undefined?1:Number(body.timeScale);if(!Number.isFinite(scale)||scale<.1||scale>1440)throw Error('Zeitfaktor: 0,1–1440.');
  const settings=validateSettings(body.settings||{});await ensureWorldSettingsColumn();
  const id=crypto.randomUUID();await db().prepare("INSERT INTO logistics_worlds(id,name,description,owner_id,day,last_tick,tick_ms,time_scale,status,created,settings) VALUES(?,?,?,?,1,?,?,?,'draft',?,?)").bind(id,name,String(body.description||'Gemeinsame Online-Welt').slice(0,300),u.id,now,86400000/scale,scale,now,JSON.stringify(settings)).run();result={worldId:id};
 }else if(body.action==='entitlement'){
  await setEntitlement(String(body.userId||''),String(body.feature||''),!!body.enabled,u.id);
 }else if(body.action==='deleteWorld'){
  const id=String(body.worldId||''),w=await db().prepare('SELECT id,name FROM logistics_worlds WHERE id=?').bind(id).first<{id:string;name:string}>();if(!w)throw Error('Welt nicht gefunden.');
  if(String(body.confirmName||'').trim()!==w.name)throw Error('Zum Löschen den Weltnamen exakt eingeben.');
  const like=(prefix:string)=>prefix+id+':%';
  await ensureAllianceTables();await ensureBrandingTables();
  await db().batch([db().prepare('DELETE FROM logistics_alliance_posts WHERE alliance_id IN (SELECT id FROM logistics_alliances WHERE world_id=?)').bind(id),db().prepare('DELETE FROM logistics_alliance_invites WHERE alliance_id IN (SELECT id FROM logistics_alliances WHERE world_id=?)').bind(id),db().prepare('DELETE FROM logistics_alliance_members WHERE world_id=?').bind(id),db().prepare('DELETE FROM logistics_alliances WHERE world_id=?').bind(id),db().prepare('DELETE FROM logistics_branding WHERE world_id=?').bind(id),db().prepare('DELETE FROM logistics_vehicle_images WHERE world_id=?').bind(id)]);
  await db().batch([db().prepare('DELETE FROM logistics_world_companies WHERE world_id=?').bind(id),db().prepare('DELETE FROM logistics_world_offers WHERE world_id=?').bind(id),db().prepare('DELETE FROM logistics_world_permissions WHERE world_id=?').bind(id),db().prepare('DELETE FROM logistics_container_offers WHERE world_id=?').bind(id),db().prepare('DELETE FROM logistics_runtime WHERE id LIKE ? OR id LIKE ? OR id LIKE ?').bind(like('used-vehicle-v20:'),like('container-day-v16:'),like('container-quantity-v14:')),db().prepare('DELETE FROM logistics_worlds WHERE id=?').bind(id)]);
  result={deleted:id};
 }else if(body.action==='worldSettings'){
  const id=String(body.worldId||''),name=String(body.name||'').trim(),scale=Number(body.timeScale),status=String(body.status||'running');
  if(name.length<3||name.length>60||!Number.isFinite(scale)||scale<.1||scale>1440||!['draft','running','paused','stopped','finished'].includes(status))throw Error('Ungültige Welteinstellungen.');
  await settleWorld(id);await db().prepare('UPDATE logistics_worlds SET name=?,description=?,time_scale=?,tick_ms=?,status=?,last_tick=?,revision=revision+1 WHERE id=?').bind(name,String(body.description||'').slice(0,300),scale,86400000/scale,status,Date.now(),id).run();
 }else if(body.action==='role'){
  if(u.role!=='owner')return reply({error:'Nur der Besitzer kann Administratoren ernennen.'},403);
  const target=await db().prepare('SELECT role FROM users WHERE id=?').bind(body.userId).first<{role:string}>();if(!target||target.role==='owner'||!['user','admin'].includes(body.role))throw Error('Das Besitzerkonto ist geschützt.');
  await db().prepare('UPDATE users SET role=? WHERE id=?').bind(body.role,body.userId).run();
 }else if(body.action==='suspendUser'){
  const target=await db().prepare('SELECT role FROM users WHERE id=?').bind(body.userId).first<{role:string}>();if(!target||target.role==='owner'||(target.role==='admin'&&u.role!=='owner'))throw Error('Dieses Konto ist geschützt.');
  await db().batch([db().prepare('UPDATE users SET status=? WHERE id=?').bind(body.suspended?'suspended':'active',body.userId),db().prepare('DELETE FROM sessions WHERE user_id=?').bind(body.userId)]);
 }else if(body.action==='settle')result=await settleAllWorlds('admin');
 else if(body.action==='importArea'){
  const query=new URL('https://localhost/api/logistik/partners');query.searchParams.set('lat',String(body.lat));query.searchParams.set('lon',String(body.lon));query.searchParams.set('radius',String(body.radius||18000));
  const r=await loadPartnerArea(new NextRequest(query),true),data:any=await r.json();if(!r.ok)throw Error(data.error);result={count:data.sites.length,source:data.source};
 }else throw Error('Unbekannte Adminaktion.');
 await db().prepare('INSERT INTO admin_audit(id,actor,action,target,created) VALUES(?,?,?,?,?)').bind(crypto.randomUUID(),u.id,'logistics.'+body.action,String(body.worldId||body.userId||''),now).run();return reply(result);
 }catch(e:any){await logError('api:admin',e,{url:req.url});return reply({error:e.message||'Adminaktion fehlgeschlagen.'},422);}}
