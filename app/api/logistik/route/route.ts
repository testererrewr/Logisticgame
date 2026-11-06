import {NextRequest,NextResponse} from 'next/server';
import {roadRoute} from '../../../../lib/logistics/road-routing';
import type {Coords} from '../../../../lib/logistics/engine';
function coords(v:string|null):Coords|null{const p=v?.split(',').map(Number);return p&&p.length===2&&p.every(Number.isFinite)&&Math.abs(p[0])<=85&&Math.abs(p[1])<=180?p as Coords:null;}
export async function GET(req:NextRequest){const from=coords(req.nextUrl.searchParams.get('from')),to=coords(req.nextUrl.searchParams.get('to'));if(!from||!to)return NextResponse.json({error:'Ungültige Koordinaten.'},{status:400});try{return NextResponse.json({leg:await roadRoute(from,to),provider:'OSRM / © OpenStreetMap contributors'},{headers:{'Cache-Control':'public, max-age=3600'}});}catch(e:any){return NextResponse.json({error:e.message},{status:422});}}
