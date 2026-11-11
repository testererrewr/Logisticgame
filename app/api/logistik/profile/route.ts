import {logError} from '../../../../lib/logistics/error-log';
import {NextRequest,NextResponse} from 'next/server';
import {env} from 'cloudflare:workers';
import {currentUser} from '../online/route';
import {decodeCompany} from '../../../../lib/logistics/company-codec';
import {rowFor} from '../../../../lib/logistics/ranking';
import {seasonBadges} from '../../../../lib/logistics/season-server';
import {allianceBadges} from '../../../../lib/logistics/alliance-server';
import {ACHIEVEMENTS,rewardText} from '../../../../lib/logistics/progression';
const db=()=>env.DB!;
const cache=new Map<string,{at:number;data:unknown}>();

export async function GET(req:NextRequest){try{
 const u=await currentUser(req);if(!u||u.status!=='active')return NextResponse.json({error:'Bitte anmelden.'},{status:401});
 const raw=(req.nextUrl.searchParams.get('user')||'me').slice(0,80),id=raw==='me'?u.id:raw;if(!/^[-a-zA-Z0-9_]{1,80}$/.test(id))throw Error('Ungültiger Spieler.');
 const wantWorld=(req.nextUrl.searchParams.get('world')||'').slice(0,100),ck=id+'|'+wantWorld;const hit=cache.get(ck);if(hit&&Date.now()-hit.at<120000)return NextResponse.json({...hit.data as object,me:u.id},{headers:{'Cache-Control':'no-store'}});
 const user=await db().prepare('SELECT id,name,created FROM users WHERE id=?').bind(id).first<{id:string;name:string;created:number}>();if(!user)return NextResponse.json({error:'Spieler nicht gefunden.'},{status:404});
 const premium=!!await db().prepare("SELECT 1 AS x FROM logistics_entitlements WHERE user_id=? AND feature IN ('premium','customVehicleImages')").bind(id).first().catch(()=>null);
 const rows=(await db().prepare("SELECT c.world_id,c.name,c.state,w.name AS world,w.day,w.status FROM logistics_world_companies c JOIN logistics_worlds w ON w.id=c.world_id WHERE c.user_id=? AND w.status<>'deleted' ORDER BY w.created DESC LIMIT 30").bind(id).all<{world_id:string;name:string;state:string;world:string;day:number;status:string}>()).results;
 const tags=new Map<string,string>(),aids=new Map<string,string>();try{for(const t of (await db().prepare('SELECT m.world_id,a.id,a.tag,a.name FROM logistics_alliance_members m JOIN logistics_alliances a ON a.id=m.alliance_id WHERE m.user_id=?').bind(id).all<{world_id:string;id:string;tag:string;name:string}>()).results){tags.set(t.world_id,t.tag+' · '+t.name);aids.set(t.world_id,t.id);}}catch{}
 const got=new Map<string,{world:string;day:number}>(),companies=[],showcase:any[]=[],collection:Record<string,number>={},stamps=new Set<string>(),islands=new Set<string>();let totals={transported:0,vehicles:0,orders:0,km:0,challenges:0};
 const sel=rows.find(r=>r.world_id===wantWorld)?.world_id||rows[0]?.world_id||'';
 for(const r of rows){try{const s=await decodeCompany(r.state),row=rowFor(id,r.name||user.name,s);const p=s.progress;const mine=r.world_id===sel;
   if(mine){   for(const k of Object.keys(p?.stamps||{}))stamps.add(k);for(const k of Object.keys(p?.islands||{}))islands.add(k);
   for(const [k,n] of Object.entries(p?.collection||{}))collection[k]=(collection[k]||0)+n;
   for(const v of s.vehicles)if(v.showcase&&v.rare&&showcase.length<12)showcase.push({modelId:v.modelId,plate:v.plate||null,name:v.name||v.modelId,edition:v.rare,world:r.world,worldId:r.world_id,km:Math.round(v.odometerKm||0),eh:Math.round(v.transportedEh||0)});
   for(const [a,day] of Object.entries(p?.achievements||{}))if(!got.has(a))got.set(a,{world:r.world,day});
   totals.transported+=row.transported;totals.vehicles+=row.vehicles;totals.orders+=row.orders;totals.km+=p?.totals.km||0;totals.challenges+=p?.totals.challenges||0;}
   companies.push({worldId:r.world_id,world:r.world,status:r.status,day:Math.floor(r.day),company:r.name||user.name,alliance:tags.get(r.world_id)||null,allianceBadges:aids.get(r.world_id)?(await allianceBadges(aids.get(r.world_id)!).catch(()=>[])).filter(b=>b.earned).map(b=>({icon:b.icon,name:b.name})):[],value:row.value,vehicles:row.vehicles,transported:row.transported,orders:row.orders,achievements:Object.keys(p?.achievements||{}).length});}catch{}}
 const achievements=ACHIEVEMENTS.map(a=>({id:a.id,icon:a.icon,name:a.name,text:a.text,reward:rewardText(a.reward),earned:got.get(a.id)||null}));
 const badges=await seasonBadges(id).catch(()=>[] as any[]),podium=(badges as any[]).filter(b=>b.rank<=3),legend=podium.length?{titles:podium.length,best:Math.min(...podium.map(b=>b.rank)),label:podium.some(b=>b.rank===1)?'Legende':'Podiumsheld'}:null;
 const data={world:sel,user:{id:user.id,name:user.name,since:user.created,premium,legend},companies,showcase,collection,stamps:[...stamps],islands:[...islands],achievements,totals,badges};
 cache.set(ck,{at:Date.now(),data});if(cache.size>200)cache.delete(cache.keys().next().value!);
 return NextResponse.json({...data,me:u.id},{headers:{'Cache-Control':'no-store'}});
}catch(e:any){await logError('api:profile',e,{url:req.url});return NextResponse.json({error:e.message||'Profil nicht verfügbar.'},{status:422});}}
