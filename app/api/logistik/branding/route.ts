import {NextRequest,NextResponse} from 'next/server';
import {env} from 'cloudflare:workers';
import {currentUser} from '../online/route';
import {sameOrigin} from '../../../../lib/same-origin';
import {ensureBrandingTables,hasEntitlement,validImage,PREMIUM_FEATURES} from '../../../../lib/logistics/branding-server';
const db=()=>env.DB!;
const reply=(d:unknown,status=200)=>NextResponse.json(d,{status,headers:{'Cache-Control':'no-store'}});
const color=(c:unknown,f:string)=>typeof c==='string'&&/^#[0-9a-f]{6}$/i.test(c)?c:f;
async function inWorld(world:string,user:string){return !!await db().prepare('SELECT 1 FROM logistics_world_companies WHERE world_id=? AND user_id=?').bind(world,user).first();}
export async function GET(req:NextRequest){try{
 const u=await currentUser(req);if(!u||u.status!=='active')return reply({error:'Bitte anmelden.'},401);
 const world=(req.nextUrl.searchParams.get('world')||'').slice(0,100);if(!await inWorld(world,u.id))return reply({error:'Bitte der Welt beitreten.'},403);
 await ensureBrandingTables();
 const b=await db().prepare('SELECT primary_color,secondary_color,logo IS NOT NULL AS has_logo,updated FROM logistics_branding WHERE world_id=? AND user_id=?').bind(world,u.id).first<{primary_color:string;secondary_color:string;has_logo:number;updated:number}>();
 const images=(await db().prepare('SELECT model_id,updated FROM logistics_vehicle_images WHERE world_id=? AND user_id=?').bind(world,u.id).all<{model_id:string;updated:number}>()).results;
 const ent=(await db().prepare('SELECT feature FROM logistics_entitlements WHERE user_id=?').bind(u.id).all<{feature:string}>()).results.map(r=>r.feature);
 return reply({me:u.id,primary:b?.primary_color||'#2f6fae',secondary:b?.secondary_color||'#f2c14e',logo:b?.has_logo?`/api/logistik/branding/image?world=${encodeURIComponent(world)}&user=${u.id}&kind=logo&v=${b.updated}`:null,images:images.map(i=>({model:i.model_id,url:`/api/logistik/branding/image?world=${encodeURIComponent(world)}&user=${u.id}&kind=vehicle&model=${encodeURIComponent(i.model_id)}&v=${i.updated}`})),entitlements:ent,features:PREMIUM_FEATURES});
}catch(e:any){return reply({error:e.message||'Firmenauftritt nicht verfügbar.'},503);}}
export async function POST(req:NextRequest){try{
 const u=await currentUser(req);if(!u||u.status!=='active')return reply({error:'Bitte anmelden.'},401);
 if(!sameOrigin(req))return reply({error:'Ungültiger Ursprung.'},403);
 const raw=await req.text();if(raw.length>600000)return reply({error:'Anfrage zu groß.'},413);
 const body=JSON.parse(raw),world=String(body.world||'').slice(0,100),now=Date.now();if(!await inWorld(world,u.id))return reply({error:'Bitte der Welt beitreten.'},403);
 await ensureBrandingTables();
 const upsert=(set:string,args:unknown[])=>db().prepare(`INSERT INTO logistics_branding(world_id,user_id,updated) VALUES(?,?,?) ON CONFLICT(world_id,user_id) DO UPDATE SET ${set},updated=excluded.updated`).bind(world,u.id,now,...args).run();
 if(body.action==='colors')await upsert('primary_color=?,secondary_color=?',[color(body.primary,'#2f6fae'),color(body.secondary,'#f2c14e')]);
 else if(body.action==='logo')await upsert('logo=?',[validImage(body.image,120000)]);
 else if(body.action==='removeLogo')await upsert('logo=NULL',[]);
 else if(body.action==='vehicleImage'){if(!await hasEntitlement(u.id,'customVehicleImages'))throw Error('Eigene Fahrzeugbilder sind eine Premium-Funktion.');const model=String(body.model||'').slice(0,80);if(!model)throw Error('Modell wählen.');const count=await db().prepare('SELECT count(*) AS n FROM logistics_vehicle_images WHERE world_id=? AND user_id=?').bind(world,u.id).first<{n:number}>();if((count?.n||0)>=40)throw Error('Höchstens 40 eigene Fahrzeugbilder.');await db().prepare('INSERT OR REPLACE INTO logistics_vehicle_images(world_id,user_id,model_id,image,updated) VALUES(?,?,?,?,?)').bind(world,u.id,model,validImage(body.image,200000),now).run();}
 else if(body.action==='removeVehicleImage')await db().prepare('DELETE FROM logistics_vehicle_images WHERE world_id=? AND user_id=? AND model_id=?').bind(world,u.id,String(body.model||'')).run();
 else throw Error('Unbekannte Aktion.');
 return reply({ok:true});
}catch(e:any){return reply({error:e.message||'Speichern fehlgeschlagen.'},422);}}
