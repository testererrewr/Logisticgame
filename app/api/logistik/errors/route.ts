import {NextRequest,NextResponse} from 'next/server';
import {currentUser} from '../online/route';
import {logError,readErrorLog,clearErrorLog} from '../../../../lib/logistics/error-log';
import {sameOrigin} from '../../../../lib/same-origin';

const reply=(d:unknown,status=200)=>NextResponse.json(d,{status,headers:{'Cache-Control':'no-store'}});
const isAdmin=(u:{role:string;status:string}|null)=>!!u&&u.status==='active'&&['admin','owner'].includes(u.role);
const perUser=new Map<string,{at:number;n:number}>();

/** Browser meldet Fehler (window.onerror, unhandledrejection, React-Fehlergrenze). */
export async function POST(req:NextRequest){try{
 const raw=await req.text();if(raw.length>20000)return reply({error:'Zu groß.'},413);
 if(!sameOrigin(req))return reply({error:'Ungültiger Ursprung.'},403);
 const u=await currentUser(req),key=u?.id||req.headers.get('cf-connecting-ip')||req.headers.get('x-forwarded-for')||'anon',now=Date.now(),hit=perUser.get(key);
 if(hit&&now-hit.at<3600000){if(++hit.n>40)return reply({ok:false,throttled:true},429);}else perUser.set(key,{at:now,n:1});if(perUser.size>5000)perUser.clear();
 const b=JSON.parse(raw||'{}'),err=Object.assign(new Error(String(b.message||'Browserfehler').slice(0,1000)),{name:String(b.name||'BrowserError').slice(0,60),stack:String(b.stack||'').slice(0,4000)});
 await logError('browser:'+String(b.kind||'error').slice(0,30),err,{user:u?.id,world:b.world?String(b.world).slice(0,100):undefined,url:String(b.url||'').slice(0,300),tab:b.tab,userAgent:req.headers.get('user-agent')?.slice(0,200),component:b.component?String(b.component).slice(0,1500):undefined},'error');
 return reply({ok:true});
}catch(e){return reply({ok:false},400);}}

export async function GET(req:NextRequest){try{
 const u=await currentUser(req);if(!isAdmin(u))return reply({error:'Nur für Administratoren.'},403);
 const p=req.nextUrl.searchParams;return reply(await readErrorLog({level:p.get('level')||undefined,source:p.get('source')||undefined,query:p.get('q')||undefined,limit:Number(p.get('limit'))||200}));
}catch(e:any){return reply({error:e.message||'Fehlerprotokoll nicht lesbar.'},503);}}

export async function DELETE(req:NextRequest){try{
 const u=await currentUser(req);if(!isAdmin(u))return reply({error:'Nur für Administratoren.'},403);if(!sameOrigin(req))return reply({error:'Ungültiger Ursprung.'},403);
 await clearErrorLog(req.nextUrl.searchParams.get('id')||undefined);return reply({ok:true});
}catch(e:any){return reply({error:e.message},503);}}
