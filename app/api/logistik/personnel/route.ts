import {logError} from '../../../../lib/logistics/error-log';
import {NextRequest,NextResponse} from 'next/server';
import {env} from 'cloudflare:workers';
import {currentUser} from '../online/route';
import {refreshDriverMarket,listDriverMarket} from '../../../../lib/logistics/driver-market';
import {parseSettings} from '../../../../lib/logistics/world-settings';
const reply=(d:unknown,status=200)=>NextResponse.json(d,{status,headers:{'Cache-Control':'no-store'}});

export async function GET(req:NextRequest){try{
 const u=await currentUser(req);if(!u||u.status!=='active')return reply({error:'Bitte anmelden.'},401);
 const world=(req.nextUrl.searchParams.get('world')||'').slice(0,100);
 if(!await env.DB!.prepare('SELECT 1 FROM logistics_world_companies WHERE world_id=? AND user_id=?').bind(world,u.id).first())return reply({error:'Bitte der Welt beitreten.'},403);
 const w=await env.DB!.prepare('SELECT day,settings FROM logistics_worlds WHERE id=?').bind(world).first<{day:number;settings:string}>();if(!w)throw Error('Welt nicht gefunden.');
 const enabled=parseSettings(w.settings).drivers;if(!enabled)return reply({enabled,rows:[]});
 await refreshDriverMarket(world,w.day);return reply({enabled,rows:await listDriverMarket(world)});
}catch(e:any){await logError('api:personnel',e,{url:req.url});return reply({error:e.message||'Personalmarkt nicht verfügbar.'},503);}}
