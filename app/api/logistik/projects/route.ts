import {logError} from '../../../../lib/logistics/error-log';
import {NextRequest,NextResponse} from 'next/server';
import {env} from 'cloudflare:workers';
import {currentUser} from '../online/route';
import {sameOrigin} from '../../../../lib/same-origin';
import {listProjects,validateProject,saveProject,activeSeasonalGoods,ensureProjectTable,readProject} from '../../../../lib/logistics/world-projects';
import {addFeed} from '../../../../lib/logistics/social-server';
import {good,kmBetween,SEASONAL_GOODS} from '../../../../lib/logistics/engine';
import {decodeCompany} from '../../../../lib/logistics/company-codec';
const db=()=>env.DB!;
async function hallOfFame(world:string){const rows=(await db().prepare("SELECT c.user_id,COALESCE(NULLIF(c.name,''),us.name) AS name,c.state FROM logistics_world_companies c JOIN users us ON us.id=c.user_id WHERE c.world_id=?").bind(world).all<{user_id:string;name:string;state:string}>()).results;
 type Rec={title:string;icon:string;value:number;label:string;holder:string;detail:string};const best=new Map<string,Rec>(),put=(r:Rec)=>{const b=best.get(r.title);if(!b||r.value>b.value)best.set(r.title,r);};
 for(const r of rows){let s;try{s=await decodeCompany(r.state);}catch{continue;}
  for(const c of s.contracts){if(c.kind!=='haulage'||c.delivered<(c.total||Infinity))continue;put({title:'Größte Einzellieferung',icon:'📦',value:c.total||0,label:(c.total||0).toLocaleString('de-DE')+' EH',holder:r.name,detail:good(c.good!)?.name||''});const a=s.sites.find(x=>x.id===c.siteId),b=s.sites.find(x=>x.id===c.destinationId);if(a&&b){const km=kmBetween([a.lat,a.lon],[b.lat,b.lon]);put({title:'Weiteste Lieferung',icon:'🌍',value:km,label:Math.round(km).toLocaleString('de-DE')+' km',holder:r.name,detail:a.name+' → '+b.name});}}
  for(const v of s.vehicles){if(v.wrecked)continue;const age=(Date.now()-(v.purchasedAt||Date.now()))/86400000;put({title:'Ältestes fahrendes Fahrzeug',icon:'🚂',value:age,label:Math.round(age)+' Tage',holder:r.name,detail:v.name||v.modelId});put({title:'Meiste Kilometer (Fahrzeug)',icon:'🛣️',value:v.odometerKm||0,label:Math.round(v.odometerKm||0).toLocaleString('de-DE')+' km',holder:r.name,detail:v.name||v.modelId});put({title:'Meiste EH (Fahrzeug)',icon:'🏋️',value:v.transportedEh||0,label:Math.round(v.transportedEh||0).toLocaleString('de-DE')+' EH',holder:r.name,detail:v.name||v.modelId});}
  put({title:'Höchster Kontostand',icon:'💰',value:s.cash,label:Math.round(s.cash).toLocaleString('de-DE')+' €',holder:r.name,detail:''});put({title:'Größte Flotte',icon:'🚛',value:s.vehicles.length,label:s.vehicles.length+' Fahrzeuge',holder:r.name,detail:''});
  put({title:'Meiste Erfolge',icon:'🏅',value:Object.keys(s.progress?.achievements||{}).length,label:Object.keys(s.progress?.achievements||{}).length+' Erfolge',holder:r.name,detail:''});put({title:'Meiste Wochenziele',icon:'🎯',value:s.progress?.totals.challenges||0,label:(s.progress?.totals.challenges||0)+' geschafft',holder:r.name,detail:''});
  put({title:'Größte Sammlung',icon:'💎',value:Object.values(s.progress?.collection||{}).reduce((n,x)=>n+x,0),label:Object.values(s.progress?.collection||{}).reduce((n,x)=>n+x,0)+' Stücke',holder:r.name,detail:''});
  put({title:'Gesamt ausgeliefert',icon:'🚚',value:Object.values(s.deliveryStats||{}).reduce((n,x)=>n+(x||0),0),label:Math.round(Object.values(s.deliveryStats||{}).reduce((n,x)=>n+(x||0),0)).toLocaleString('de-DE')+' EH',holder:r.name,detail:''});}
 return [...best.values()].filter(r=>r.value>0);}
const reply=(d:unknown,status=200)=>NextResponse.json(d,{status,headers:{'Cache-Control':'no-store'}});
const isAdmin=(u:any)=>u&&['owner','admin'].includes(u.role);
const worldDay=async(world:string)=>(await db().prepare('SELECT day FROM logistics_worlds WHERE id=?').bind(world).first<{day:number}>())?.day??0;
export async function GET(req:NextRequest){try{
 const u=await currentUser(req);if(!u||u.status!=='active')return reply({error:'Bitte anmelden.'},401);const world=(req.nextUrl.searchParams.get('world')||'').slice(0,100),admin=req.nextUrl.searchParams.get('admin')==='1';
 if(admin){if(!isAdmin(u))return reply({error:'Nur für Administratoren.'},403);if(req.nextUrl.searchParams.get('hall')==='1')return reply({hall:await hallOfFame(world)});return reply({day:await worldDay(world),projects:await listProjects(world,true),seasonalGoods:SEASONAL_GOODS.map(g=>({id:g.id,name:g.name,icon:g.icon})),countries:(await db().prepare("SELECT DISTINCT source_country AS c FROM logistics_container_offers WHERE world_id=? AND source_country<>'' ORDER BY c LIMIT 300").bind(world).all<{c:string}>()).results.map(r=>r.c)});}
 if(!await db().prepare('SELECT 1 FROM logistics_world_companies WHERE world_id=? AND user_id=?').bind(world,u.id).first())return reply({error:'Bitte der Welt beitreten.'},403);
 const day=await worldDay(world),list=await listProjects(world);
 return reply({day,seasonal:activeSeasonalGoods(list,day),projects:list.filter(p=>p.status!=='done'||day-p.end_day<30).map(p=>({id:p.id,kind:p.kind,name:p.name,description:p.description,lat:p.lat,lon:p.lon,radiusKm:p.radius_km,needs:p.needs,delivered:p.delivered,priceFactor:p.price_factor,bonus:p.bonus,start:p.start_day,end:p.end_day,status:p.status,good:p.config?.good,srcName:p.config?.srcName,top:Object.entries(p.contributions).sort((a,b)=>b[1].eh-a[1].eh).slice(0,5).map(([id,c])=>({id,name:c.name,eh:c.eh})),mine:p.contributions[u.id]?.eh||0}))});
}catch(e:any){await logError('api:projects',e,{url:req.url});return reply({error:e.message||'Nicht verfügbar.'},503);}}
export async function POST(req:NextRequest){try{
 const u=await currentUser(req);if(!isAdmin(u)||u!.status!=='active')return reply({error:'Nur für Administratoren.'},403);if(!sameOrigin(req))return reply({error:'Ungültiger Ursprung.'},403);await ensureProjectTable();
 const body=await req.json() as any,world=String(body.world||'').slice(0,100);if(!await db().prepare('SELECT 1 FROM logistics_worlds WHERE id=?').bind(world).first())throw Error('Welt nicht gefunden.');
 if(body.action==='save'){const day=await worldDay(world),data=validateProject(body,day),before=body.id?await readProject(String(body.id)):null,id=await saveProject(world,data,body.id?String(body.id):undefined);
  if(data.visible&&(!before||!before.visible)){const g=data.config?good(data.config.good):null;await addFeed(world,null,'project',data.kind==='holiday'?`${g?.icon||'🎉'} Festtagsfracht: ${data.name} – ${g?.name||''} ab ${data.config!.srcName}, bis Spieltag ${Math.floor(data.end_day)} im Auftragsmarkt!`:data.kind==='rescue'?`🆘 Rettungsmission: ${data.name}! Benötigt wird Hilfe aus Lagern im Umkreis von ${data.radius_km} km.`:`🏛️ Neues Wahrzeichen-Projekt: ${data.name}. Baumaterial aus Lagern im Umkreis von ${data.radius_km} km gesucht.`,{important:data.kind!=='holiday',day}).catch(()=>{});}
  return reply({ok:true,id});}
 if(body.action==='visible'){await db().prepare('UPDATE logistics_world_projects SET visible=? WHERE id=? AND world_id=?').bind(body.visible?1:0,String(body.id||''),world).run();return reply({ok:true});}
 if(body.action==='cancel'){await db().prepare("UPDATE logistics_world_projects SET status='cancelled' WHERE id=? AND world_id=?").bind(String(body.id||''),world).run();await db().prepare("DELETE FROM logistics_container_offers WHERE world_id=? AND status='open' AND accepted_by IS NULL AND id LIKE ?").bind(world,'hol:'+String(body.id||'').slice(0,8)+':%').run();return reply({ok:true});}
 if(body.action==='delete'){await db().prepare('DELETE FROM logistics_world_projects WHERE id=? AND world_id=?').bind(String(body.id||''),world).run();return reply({ok:true});}
 throw Error('Unbekannte Aktion.');
}catch(e:any){await logError('api:projects',e,{url:req.url});return reply({error:e.message||'Aktion fehlgeschlagen.'},422);}}
