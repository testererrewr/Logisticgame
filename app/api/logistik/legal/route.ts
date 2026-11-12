import {NextRequest,NextResponse} from 'next/server';
import {env} from 'cloudflare:workers';
import {currentUser} from '../online/route';
import {sameOrigin} from '../../../../lib/same-origin';
const KINDS=['impressum','datenschutz'];
export async function GET(req:NextRequest){const kind=String(req.nextUrl.searchParams.get('kind')||'');if(!KINDS.includes(kind))return NextResponse.json({error:'Unbekannt.'},{status:404});
 const row=await env.DB!.prepare('SELECT payload,updated FROM logistics_runtime WHERE id=?').bind('legal:'+kind).first<{payload:string;updated:number}>().catch(()=>null);
 return NextResponse.json({text:row?.payload||'',updated:row?.updated||0},{headers:{'Cache-Control':'no-store'}});}
export async function POST(req:NextRequest){const u=await currentUser(req);if(!u||!['owner','admin'].includes(u.role))return NextResponse.json({error:'Nur für Administratoren.'},{status:403});if(!sameOrigin(req))return NextResponse.json({error:'Ungültiger Ursprung.'},{status:403});
 const b=await req.json() as any,kind=String(b.kind||'');if(!KINDS.includes(kind))return NextResponse.json({error:'Unbekannt.'},{status:400});
 await env.DB!.prepare('INSERT OR REPLACE INTO logistics_runtime(id,updated,payload) VALUES(?,?,?)').bind('legal:'+kind,Date.now(),String(b.text||'').slice(0,60000)).run();return NextResponse.json({ok:true});}
