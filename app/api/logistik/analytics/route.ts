import {NextRequest,NextResponse} from 'next/server';
import {env} from 'cloudflare:workers';
import {currentUser} from '../online/route';
const db=()=>env.DB!;
let ready:Promise<unknown>|undefined;
const ensure=()=>ready??=db().batch([
 db().prepare('CREATE TABLE IF NOT EXISTS logistics_analytics_daily(day TEXT NOT NULL,kind TEXT NOT NULL,key TEXT NOT NULL,n INTEGER NOT NULL DEFAULT 0,PRIMARY KEY(day,kind,key))'),
 db().prepare('CREATE TABLE IF NOT EXISTS logistics_analytics_visitors(day TEXT NOT NULL,vid TEXT NOT NULL,user INTEGER NOT NULL DEFAULT 0,PRIMARY KEY(day,vid))'),
]).catch(e=>{ready=undefined;throw e;});
const KINDS=new Set(['page','tab','action','world','consent','error']);
async function hash(t:string){const b=await crypto.subtle.digest('SHA-256',new TextEncoder().encode(t));return [...new Uint8Array(b)].slice(0,12).map(x=>x.toString(16).padStart(2,'0')).join('');}
export async function POST(req:NextRequest){try{
 const raw=await req.text();if(raw.length>2000)return new NextResponse(null,{status:204});const b=JSON.parse(raw||'{}');const kind=String(b.kind||'');if(!KINDS.has(kind))return new NextResponse(null,{status:204});
 await ensure();const day=new Date().toISOString().slice(0,10),key=String(b.key||'').slice(0,60).replace(/[^\p{L}\p{N} _\-:./]/gu,''),u=await currentUser(req).catch(()=>null);
 const vid=/^[0-9a-f-]{36}$/.test(String(b.vid||''))?await hash(String(b.vid)):'';
 const st=[db().prepare('INSERT INTO logistics_analytics_daily(day,kind,key,n) VALUES(?,?,?,1) ON CONFLICT(day,kind,key) DO UPDATE SET n=n+1').bind(day,kind,key)];
 if(kind==='page'){const dev=['mobil','tablet','desktop'].includes(b.device)?b.device:'?';st.push(db().prepare("INSERT INTO logistics_analytics_daily(day,kind,key,n) VALUES(?,'device',?,1) ON CONFLICT(day,kind,key) DO UPDATE SET n=n+1").bind(day,dev));const lang=String(b.lang||'').slice(0,2).toLowerCase().replace(/[^a-z]/g,'');if(lang)st.push(db().prepare("INSERT INTO logistics_analytics_daily(day,kind,key,n) VALUES(?,'lang',?,1) ON CONFLICT(day,kind,key) DO UPDATE SET n=n+1").bind(day,lang));}
 if(vid)st.push(db().prepare('INSERT INTO logistics_analytics_visitors(day,vid,user) VALUES(?,?,?) ON CONFLICT(day,vid) DO UPDATE SET user=max(user,excluded.user)').bind(day,vid,u?1:0));
 await db().batch(st);return new NextResponse(null,{status:204});
}catch{return new NextResponse(null,{status:204});}}
export async function GET(req:NextRequest){try{
 const u=await currentUser(req);if(!u||!['owner','admin'].includes(u.role))return NextResponse.json({error:'Nur für Administratoren.'},{status:403});await ensure();
 const days=Math.max(1,Math.min(365,Number(req.nextUrl.searchParams.get('days'))||30)),from=new Date(Date.now()-days*864e5).toISOString().slice(0,10);
 const [vis,rows,users,worlds]=await db().batch([
  db().prepare('SELECT day,count(*) AS visitors,sum(user) AS loggedIn FROM logistics_analytics_visitors WHERE day>=? GROUP BY day ORDER BY day').bind(from),
  db().prepare('SELECT kind,key,sum(n) AS n FROM logistics_analytics_daily WHERE day>=? GROUP BY kind,key ORDER BY n DESC LIMIT 400').bind(from),
  db().prepare("SELECT count(*) AS total,sum(CASE WHEN created>? THEN 1 ELSE 0 END) AS recent FROM users").bind(Date.now()-days*864e5),
  db().prepare("SELECT w.name,count(c.user_id) AS companies,max(c.updated) AS active FROM logistics_worlds w LEFT JOIN logistics_world_companies c ON c.world_id=w.id GROUP BY w.id ORDER BY companies DESC LIMIT 30"),
 ]);
 const pages=(await db().prepare("SELECT day,sum(n) AS n FROM logistics_analytics_daily WHERE day>=? AND kind='page' GROUP BY day ORDER BY day").bind(from).all()).results;
 const signups=(await db().prepare("SELECT strftime('%Y-%m-%d',created/1000,'unixepoch') AS day,count(*) AS n FROM users WHERE created>? GROUP BY day ORDER BY day").bind(Date.now()-days*864e5).all()).results;
 const active=await db().prepare('SELECT sum(CASE WHEN updated>? THEN 1 ELSE 0 END) AS h24,sum(CASE WHEN updated>? THEN 1 ELSE 0 END) AS d7,sum(CASE WHEN updated>? THEN 1 ELSE 0 END) AS now FROM logistics_world_companies').bind(Date.now()-864e5,Date.now()-7*864e5,Date.now()-15*60000).first();
 return NextResponse.json({days,visitors:vis.results,pages,rows:rows.results,users:users.results[0],worlds:worlds.results,signups,active},{headers:{'Cache-Control':'no-store'}});
}catch(e:any){return NextResponse.json({error:'Statistik nicht lesbar: '+(e.message||e)},{status:500});}}
const seenToday=new Map<string,string>();
export async function recordActiveUser(userId:string){const day=new Date().toISOString().slice(0,10);if(seenToday.get(userId)===day)return;seenToday.set(userId,day);if(seenToday.size>20000)seenToday.clear();try{await ensure();await db().prepare('INSERT INTO logistics_analytics_visitors(day,vid,user) VALUES(?,?,1) ON CONFLICT(day,vid) DO UPDATE SET user=1').bind(day,'u-'+await hash(userId)).run();}catch{}}
