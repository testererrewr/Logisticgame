import {allowAction,TOO_FAST} from '../../../../lib/logistics/rate-limit';
import {NextRequest,NextResponse} from 'next/server';
import {env} from 'cloudflare:workers';
import {currentUser} from '../online/route';
import {sameOrigin} from '../../../../lib/same-origin';
import {referralOverview,codeFor} from '../../../../lib/logistics/referrals';
const reply=(d:unknown,status=200)=>NextResponse.json(d,{status,headers:{'Cache-Control':'no-store'}});
export async function GET(req:NextRequest){const u=await currentUser(req);if(!u)return reply({error:'Bitte anmelden.'},401);try{return reply(await referralOverview(u.id));}catch(e:any){return reply({error:e.message},503);}}
export async function POST(req:NextRequest){const u=await currentUser(req);if(!u)return reply({error:'Bitte anmelden.'},401);if(u&&!allowAction('ref:'+u.id,1,5))return NextResponse.json({error:TOO_FAST},{status:429});if(!sameOrigin(req))return reply({error:'Ungültiger Ursprung.'},403);
 const b=await req.json() as any,world=String(b.world||'');await codeFor(u.id);if(world&&!await env.DB!.prepare('SELECT 1 FROM logistics_world_companies WHERE world_id=? AND user_id=?').bind(world,u.id).first())return reply({error:'Du hast in dieser Welt keine Spedition.'},422);
 await env.DB!.prepare('UPDATE logistics_ref_codes SET world_id=? WHERE user_id=?').bind(world||null,u.id).run();return reply({ok:true});}
