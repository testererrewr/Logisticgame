import {logError} from '../../../../lib/logistics/error-log';
import {NextRequest,NextResponse} from 'next/server';
import {currentUser} from '../online/route';
import {harborKind,harborCheckState} from '../../../../lib/logistics/harbor-placement';
import type {BuildingKind} from '../../../../lib/logistics/engine';
export async function GET(req:NextRequest){try{const user=await currentUser(req);if(!user||user.status!=='active')return NextResponse.json({error:'Bitte anmelden.'},{status:401});const p=req.nextUrl.searchParams,lat=Number(p.get('lat')),lon=Number(p.get('lon')),kind=p.get('kind')||'',rotation=Number(p.get('rotation')||0);if(!harborKind(kind)||!Number.isFinite(lat)||!Number.isFinite(lon)||Math.abs(lat)>85||Math.abs(lon)>180||![0,90].includes(rotation))throw Error('Ungültige Hafen-Bauvorschau.');const check=await harborCheckState([lat,lon],kind as BuildingKind,rotation,p.get('retry')==='1');return NextResponse.json(check,{status:check.pending?202:200,headers:{'Cache-Control':'no-store'}});}catch(e:any){await logError('api:build-check',e,{url:req.url});return NextResponse.json({error:e.message},{status:422});}}
