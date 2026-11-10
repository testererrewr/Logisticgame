import {logError} from '../../../../lib/logistics/error-log';
import {NextRequest,NextResponse} from 'next/server';
import {env} from 'cloudflare:workers';
import {currentUser} from '../online/route';
import {decodeCompany} from '../../../../lib/logistics/company-codec';
import {ensureAllianceTables} from '../../../../lib/logistics/alliance-server';
import {ensureBrandingTables} from '../../../../lib/logistics/branding-server';

import {parseSettings,seasonEndDay} from '../../../../lib/logistics/world-settings';
import {rowFor,type Row} from '../../../../lib/logistics/ranking';
const cache=new Map<string,{at:number;rows:Row[]}>();
export async function GET(req:NextRequest){try{
 const u=await currentUser(req);if(!u||u.status!=='active')return NextResponse.json({error:'Bitte anmelden.'},{status:401});
 const world=(req.nextUrl.searchParams.get('world')||'').slice(0,100);if(!world)throw Error('Welt fehlt.');
 if(!await env.DB!.prepare('SELECT 1 FROM logistics_world_companies WHERE world_id=? AND user_id=?').bind(world,u.id).first())return NextResponse.json({error:'Bitte der Welt beitreten.'},{status:403});
 let hit=cache.get(world);
 if(!hit||Date.now()-hit.at>5*60000){
  const rows:Row[]=[];
  for(let after='';;){const batch=(await env.DB!.prepare("SELECT c.user_id,COALESCE(NULLIF(c.name,''),us.name) AS name,c.state FROM logistics_world_companies c JOIN users us ON us.id=c.user_id WHERE c.world_id=? AND c.user_id>? ORDER BY c.user_id LIMIT 10").bind(world,after).all<{user_id:string;name:string;state:string}>()).results;for(const b of batch){try{rows.push(rowFor(b.user_id,b.name,await decodeCompany(b.state)));}catch{}}if(batch.length<10)break;after=batch[batch.length-1].user_id;}
  try{await ensureAllianceTables();const tags=(await env.DB!.prepare('SELECT m.user_id,a.tag FROM logistics_alliance_members m JOIN logistics_alliances a ON a.id=m.alliance_id WHERE m.world_id=?').bind(world).all<{user_id:string;tag:string}>()).results;const map=new Map(tags.map(t=>[t.user_id,t.tag]));for(const r of rows)r.tag=map.get(r.id);}catch{}
  try{await ensureBrandingTables();const br=(await env.DB!.prepare('SELECT user_id,primary_color,logo IS NOT NULL AS has_logo,updated FROM logistics_branding WHERE world_id=?').bind(world).all<{user_id:string;primary_color:string;has_logo:number;updated:number}>()).results;const bm=new Map(br.map(b=>[b.user_id,b]));for(const r of rows){const b=bm.get(r.id);if(b){r.color=b.primary_color;if(b.has_logo)r.logo=`/api/logistik/branding/image?world=${encodeURIComponent(world)}&user=${r.id}&kind=logo&v=${b.updated}`;}}}catch{}
  try{const prem=(await env.DB!.prepare("SELECT e.user_id,COALESCE(b.show_badge,1) AS show FROM logistics_entitlements e LEFT JOIN logistics_branding b ON b.user_id=e.user_id AND b.world_id=? WHERE e.feature='premium'").bind(world).all<{user_id:string;show:number}>()).results;const pm=new Map(prem.map(p=>[p.user_id,p.show!==0]));for(const r of rows)r.premium=pm.get(r.id)||undefined;}catch{}
  try{const al=(await env.DB!.prepare('SELECT m.user_id,a.id,a.color,a.logo IS NOT NULL AS has_logo FROM logistics_alliance_members m JOIN logistics_alliances a ON a.id=m.alliance_id WHERE m.world_id=?').bind(world).all<{user_id:string;id:string;color:string;has_logo:number}>()).results;const am=new Map(al.map(a=>[a.user_id,a]));for(const r of rows){const a=am.get(r.id);if(a){r.tagColor=a.color;if(a.has_logo)r.allianceLogo=`/api/logistik/alliance?logo=${a.id}`;}}}catch{}
  hit={at:Date.now(),rows};cache.set(world,hit);if(cache.size>50)cache.delete(cache.keys().next().value!);
 }
 const wrow=await env.DB!.prepare('SELECT day,settings,status FROM logistics_worlds WHERE id=?').bind(world).first<{day:number;settings:string;status:string}>(),end=wrow?seasonEndDay(parseSettings(wrow.settings)):null;
 return NextResponse.json({updated:hit.at,me:u.id,rows:hit.rows,season:end?{end,day:wrow!.day,finished:wrow!.status==='finished'}:null},{headers:{'Cache-Control':'no-store'}});
}catch(e:any){await logError('api:ranking',e,{url:req.url});return NextResponse.json({error:e.message||'Rangliste nicht verfügbar.'},{status:503});}}
