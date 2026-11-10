import {logError} from '../../../../lib/logistics/error-log';
import {NextRequest,NextResponse} from 'next/server';
import {env} from 'cloudflare:workers';
import {currentUser} from '../online/route';
import {readUsedVehicleOffers} from '../../../../lib/logistics/used-vehicle-store';
export async function GET(req:NextRequest){try{const user=await currentUser(req);if(!user||user.status!=='active')return NextResponse.json({error:'Bitte anmelden.'},{status:401});const world=req.nextUrl.searchParams.get('world');if(!world||!await env.DB!.prepare('SELECT 1 AS joined FROM logistics_world_companies WHERE world_id=? AND user_id=?').bind(world,user.id).first())return NextResponse.json({error:'Bitte der Welt beitreten.'},{status:403});const offers=await readUsedVehicleOffers(world);return NextResponse.json({offers,userId:user.id,worldId:world},{headers:{'Cache-Control':'no-store'}});}catch(e:any){await logError('api:used-vehicles',e,{url:req.url});return NextResponse.json({error:e.message},{status:422});}}
