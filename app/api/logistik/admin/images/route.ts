import {logError} from '../../../../../lib/logistics/error-log';
import {NextRequest,NextResponse} from 'next/server';
import {env} from 'cloudflare:workers';
import {currentUser} from '../../online/route';
import {sameOrigin} from '../../../../../lib/same-origin';
import {ensureBrandingTables} from '../../../../../lib/logistics/branding-server';
const db=()=>env.DB!;
const reply=(d:unknown,status=200)=>NextResponse.json(d,{status,headers:{'Cache-Control':'no-store'}});
const admin=(u:{role:string;status:string}|null)=>!!u&&u.status==='active'&&['admin','owner'].includes(u.role);
/** Freigabe eigener Fahrzeugbilder: Liste aller Änderungen, Annehmen/Ablehnen. Abgelehnte Bilder werden beim Nutzer entfernt. */
export async function GET(req:NextRequest){try{
 const u=await currentUser(req);if(!admin(u))return reply({error:'Nur für Administratoren.'},403);await ensureBrandingTables();
 const status=req.nextUrl.searchParams.get('status')||'pending',where=['pending','approved','declined'].includes(status)?'WHERE i.status=?':'';
 const rows=(await db().prepare(`SELECT i.world_id,i.user_id,i.model_id,i.updated,i.status,i.reviewed_at,i.note,COALESCE(NULLIF(c.name,''),us.name) AS company,us.name AS player,w.name AS world,r.name AS reviewer FROM logistics_vehicle_images i LEFT JOIN users us ON us.id=i.user_id LEFT JOIN logistics_world_companies c ON c.world_id=i.world_id AND c.user_id=i.user_id LEFT JOIN logistics_worlds w ON w.id=i.world_id LEFT JOIN users r ON r.id=i.reviewed_by ${where} ORDER BY i.updated DESC LIMIT 300`).bind(...(where?[status]:[])).all()).results;
 const counts=(await db().prepare('SELECT status,count(*) AS n FROM logistics_vehicle_images GROUP BY status').all()).results;
 return reply({rows,counts});
}catch(e:any){await logError('api:admin/images',e,{url:req.url});return reply({error:e.message},503);}}
export async function POST(req:NextRequest){try{
 const u=await currentUser(req);if(!admin(u))return reply({error:'Nur für Administratoren.'},403);if(!sameOrigin(req))return reply({error:'Ungültiger Ursprung.'},403);await ensureBrandingTables();
 const b=await req.json() as any,items:{world:string;user:string;model:string;updated:number}[]=Array.isArray(b.items)?b.items.slice(0,200):[];if(!items.length)throw Error('Bilder auswählen.');
 const now=Date.now(),note=String(b.note||'').slice(0,300);
 // updated muss passen: ein inzwischen neu hochgeladenes Bild wird nicht versehentlich mitentschieden
 const stmts=items.map(i=>b.decision==='approve'?db().prepare("UPDATE logistics_vehicle_images SET status='approved',reviewed_by=?,reviewed_at=?,note=NULL WHERE world_id=? AND user_id=? AND model_id=? AND updated=?").bind(u!.id,now,i.world,i.user,i.model,i.updated)
  :db().prepare("UPDATE logistics_vehicle_images SET status='declined',image='',reviewed_by=?,reviewed_at=?,note=? WHERE world_id=? AND user_id=? AND model_id=? AND updated=?").bind(u!.id,now,note||'Bild entspricht nicht den Regeln.',i.world,i.user,i.model,i.updated));
 if(!['approve','decline'].includes(b.decision))throw Error('Entscheidung fehlt.');await db().batch(stmts);
 await db().prepare('INSERT INTO admin_audit(id,actor,action,target,created) VALUES(?,?,?,?,?)').bind(crypto.randomUUID(),u!.id,'vehicle-image-'+b.decision,JSON.stringify(items.map(i=>i.user+':'+i.model)).slice(0,1000),now).run().catch(()=>{});
 return reply({ok:true,count:items.length});
}catch(e:any){await logError('api:admin/images',e,{url:req.url});return reply({error:e.message},422);}}
