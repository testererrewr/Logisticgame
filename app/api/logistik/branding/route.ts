import {logError} from '../../../../lib/logistics/error-log';
import {NextRequest,NextResponse} from 'next/server';
import {env} from 'cloudflare:workers';
import {currentUser} from '../online/route';
import {sameOrigin} from '../../../../lib/same-origin';
import {ensureBrandingTables,hasEntitlement,isPremium,validImage,PREMIUM_FEATURES,PREMIUM_PERKS} from '../../../../lib/logistics/branding-server';
import {VEHICLES} from '../../../../lib/logistics/engine';
const db=()=>env.DB!;
const reply=(d:unknown,status=200)=>NextResponse.json(d,{status,headers:{'Cache-Control':'no-store'}});
const color=(c:unknown,f:string)=>typeof c==='string'&&/^#[0-9a-f]{6}$/i.test(c)?c:f;
async function inWorld(world:string,user:string){return !!await db().prepare('SELECT 1 FROM logistics_world_companies WHERE world_id=? AND user_id=?').bind(world,user).first();}
const imageUrl=(world:string,user:string,model:string,v:number)=>`/api/logistik/branding/image?world=${encodeURIComponent(world)}&user=${user}&kind=vehicle&model=${encodeURIComponent(model)}&v=${v}`;
export async function GET(req:NextRequest){try{
 const u=await currentUser(req);if(!u||u.status!=='active')return reply({error:'Bitte anmelden.'},401);
 const world=(req.nextUrl.searchParams.get('world')||'').slice(0,100);if(!await inWorld(world,u.id))return reply({error:'Bitte der Welt beitreten.'},403);
 await ensureBrandingTables();
 const b=await db().prepare('SELECT primary_color,secondary_color,logo IS NOT NULL AS has_logo,show_badge,updated FROM logistics_branding WHERE world_id=? AND user_id=?').bind(world,u.id).first<{primary_color:string;secondary_color:string;has_logo:number;show_badge:number;updated:number}>();
 const images=(await db().prepare("SELECT model_id,updated,status,note FROM logistics_vehicle_images WHERE world_id=? AND user_id=?").bind(world,u.id).all<{model_id:string;updated:number;status:string;note:string|null}>()).results;
 const ent=(await db().prepare('SELECT feature FROM logistics_entitlements WHERE user_id=?').bind(u.id).all<{feature:string}>()).results.map(r=>r.feature);
 return reply({me:u.id,primary:b?.primary_color||'#2f6fae',secondary:b?.secondary_color||'#f2c14e',showBadge:b?b.show_badge!==0:true,logo:b?.has_logo?`/api/logistik/branding/image?world=${encodeURIComponent(world)}&user=${u.id}&kind=logo&v=${b.updated}`:null,
  images:images.filter(i=>i.status!=='declined').map(i=>({model:i.model_id,status:i.status,url:imageUrl(world,u.id,i.model_id,i.updated)})),declined:images.filter(i=>i.status==='declined').map(i=>({model:i.model_id,note:i.note||''})),
  entitlements:ent,premium:ent.includes('premium'),features:PREMIUM_FEATURES,perks:PREMIUM_PERKS});
}catch(e:any){await logError('api:branding',e,{url:req.url});return reply({error:e.message||'Firmenauftritt nicht verfügbar.'},503);}}
export async function POST(req:NextRequest){try{
 const u=await currentUser(req);if(!u||u.status!=='active')return reply({error:'Bitte anmelden.'},401);
 if(!sameOrigin(req))return reply({error:'Ungültiger Ursprung.'},403);
 const raw=await req.text();if(raw.length>600000)return reply({error:'Anfrage zu groß.'},413);
 const body=JSON.parse(raw),world=String(body.world||'').slice(0,100),now=Date.now();if(!await inWorld(world,u.id))return reply({error:'Bitte der Welt beitreten.'},403);
 await ensureBrandingTables();
 const upsert=(set:string,args:unknown[])=>db().prepare(`INSERT INTO logistics_branding(world_id,user_id,updated) VALUES(?,?,?) ON CONFLICT(world_id,user_id) DO UPDATE SET ${set},updated=excluded.updated`).bind(world,u.id,now,...args).run();
 const premium=await isPremium(u.id);
 if(['colors','logo'].includes(body.action)&&!premium)throw Error('Firmenfarben und Logo sind eine Premium-Funktion.');
 if(body.action==='colors')await upsert('primary_color=?,secondary_color=?',[color(body.primary,'#2f6fae'),color(body.secondary,'#f2c14e')]);
 else if(body.action==='logo')await upsert('logo=?',[validImage(body.image,120000)]);
 else if(body.action==='removeLogo')await upsert('logo=NULL',[]);
 else if(body.action==='badge'){if(!premium)throw Error('Das Abzeichen gehört zu Premium.');await upsert('show_badge=?',[body.show?1:0]);}
 else if(body.action==='vehicleImage'){if(!await hasEntitlement(u.id,'customVehicleImages'))throw Error('Eigene Fahrzeugbilder sind eine Premium-Funktion.');const model=String(body.model||'').slice(0,80);if(!VEHICLES.some(m=>m.id===model))throw Error('Fahrzeugmodell wählen.');const count=await db().prepare("SELECT count(*) AS n FROM logistics_vehicle_images WHERE world_id=? AND user_id=? AND status<>'declined' AND model_id<>?").bind(world,u.id,model).first<{n:number}>();if((count?.n||0)>=VEHICLES.length)throw Error('Für jedes Modell ist höchstens ein eigenes Bild möglich.');

  await db().prepare("INSERT OR REPLACE INTO logistics_vehicle_images(world_id,user_id,model_id,image,updated,status,reviewed_by,reviewed_at,note) VALUES(?,?,?,?,?,'pending',NULL,NULL,NULL)").bind(world,u.id,model,validImage(body.image,200000),now).run();}
 else if(body.action==='removeVehicleImage')await db().prepare('DELETE FROM logistics_vehicle_images WHERE world_id=? AND user_id=? AND model_id=?').bind(world,u.id,String(body.model||'')).run();
 else throw Error('Unbekannte Aktion.');
 return reply({ok:true});
}catch(e:any){await logError('api:branding',e,{url:req.url});return reply({error:e.message||'Speichern fehlgeschlagen.'},422);}}
