import {NextRequest,NextResponse} from 'next/server';
import {env} from 'cloudflare:workers';
import {currentUser} from '../online/route';
import {trailerOffers} from '../../../../lib/logistics/trailer-market';
import {logError} from '../../../../lib/logistics/error-log';
export async function GET(req:NextRequest){try{
 const u=await currentUser(req);if(!u)return NextResponse.json({error:'Bitte anmelden.'},{status:401});const world=String(req.nextUrl.searchParams.get('world')||'');
 if(!await env.DB!.prepare('SELECT 1 FROM logistics_world_companies WHERE world_id=? AND user_id=?').bind(world,u.id).first())return NextResponse.json({error:'Bitte der Welt beitreten.'},{status:403});
 return NextResponse.json({offers:(await trailerOffers(world)).map(o=>({...o,own:o.seller_id===u.id}))},{headers:{'Cache-Control':'no-store'}});
}catch(e:any){await logError('api:used-trailers',e,{url:req.url});return NextResponse.json({error:e.message||'Nicht verfügbar.'},{status:503});}}
