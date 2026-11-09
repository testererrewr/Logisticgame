import {NextRequest} from 'next/server';
import {env} from 'cloudflare:workers';
import {ensureBrandingTables} from '../../../../../lib/logistics/branding-server';
export async function GET(req:NextRequest){try{
 const p=req.nextUrl.searchParams,world=(p.get('world')||'').slice(0,100),user=(p.get('user')||'').slice(0,100),kind=p.get('kind');await ensureBrandingTables();
 const row=kind==='logo'?await env.DB!.prepare('SELECT logo AS data FROM logistics_branding WHERE world_id=? AND user_id=?').bind(world,user).first<{data:string|null}>():await env.DB!.prepare('SELECT image AS data FROM logistics_vehicle_images WHERE world_id=? AND user_id=? AND model_id=?').bind(world,user,(p.get('model')||'').slice(0,80)).first<{data:string|null}>();
 const m=row?.data?.match(/^data:(image\/(?:png|jpeg|webp));base64,(.+)$/);if(!m)return new Response('Nicht gefunden',{status:404});
 const bin=Uint8Array.from(atob(m[2]),c=>c.charCodeAt(0));return new Response(bin,{headers:{'Content-Type':m[1],'Cache-Control':'public, max-age=86400','X-Content-Type-Options':'nosniff'}});
}catch{return new Response('Fehler',{status:500});}}
