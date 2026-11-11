import {NextRequest,NextResponse} from 'next/server';
import {env} from 'cloudflare:workers';
import {currentUser} from '../online/route';
import {sameOrigin} from '../../../../lib/same-origin';
import {logError} from '../../../../lib/logistics/error-log';
import {decodeCompany} from '../../../../lib/logistics/company-codec';
import {good} from '../../../../lib/logistics/engine';
import {SHARED_KINDS} from '../../../../lib/logistics/alliance-server';
import {ensureSupplyTable,invalidateSupplyCache,SUPPLY_PENALTY,SUPPLY_MAX_MISSES} from '../../../../lib/logistics/supply-contracts';
import {sendSystemMessage} from '../../../../lib/logistics/system-message';
const db=()=>env.DB!;
const reply=(d:unknown,status=200)=>NextResponse.json(d,{status,headers:{'Cache-Control':'no-store'}});
async function company(world:string,user:string){return db().prepare('SELECT c.name,c.state,u.name AS uname FROM logistics_world_companies c JOIN users u ON u.id=c.user_id WHERE c.world_id=? AND c.user_id=?').bind(world,user).first<{name:string;state:string;uname:string}>();}
const dayOf=async(world:string)=>(await db().prepare('SELECT day FROM logistics_worlds WHERE id=?').bind(world).first<{day:number}>())?.day||0;

export async function GET(req:NextRequest){try{
 const u=await currentUser(req);if(!u)return reply({error:'Bitte anmelden.'},401);const world=String(req.nextUrl.searchParams.get('world')||'');await ensureSupplyTable();
 if(!await company(world,u.id))return reply({error:'Bitte zuerst der Welt beitreten.'},403);
 const mine=(await db().prepare("SELECT * FROM logistics_supply_contracts WHERE world_id=? AND (requester_id=? OR supplier_id=?) ORDER BY CASE WHEN status IN ('active','open','cancel_req','cancel_sup') THEN 0 ELSE 1 END,created DESC LIMIT 60").bind(world,u.id,u.id).all<any>()).results;
 const open=(await db().prepare("SELECT * FROM logistics_supply_contracts WHERE world_id=? AND status='open' AND requester_id<>? AND (target_id IS NULL OR target_id=?) ORDER BY created DESC LIMIT 60").bind(world,u.id,u.id).all<any>()).results;
 const strip=(r:any)=>{const {site,...rest}=r;let lat=0,lon=0,kind='';try{const p=JSON.parse(site);lat=p.lat;lon=p.lon;kind=p.kind;}catch{}return {...rest,lat,lon,kind,goodName:good(r.good)?.name||r.good,role:r.requester_id===u.id?'requester':r.supplier_id===u.id?'supplier':'offer'};};
 return reply({day:await dayOf(world),mine:mine.map(strip),open:open.map(strip),penalty:SUPPLY_PENALTY,maxMisses:SUPPLY_MAX_MISSES});
}catch(e:any){await logError('api:supply',e,{url:req.url});return reply({error:e.message||'Nicht verfügbar.'},503);}}

export async function POST(req:NextRequest){try{
 const u=await currentUser(req);if(!u||u.status!=='active')return reply({error:'Bitte anmelden.'},401);if(!sameOrigin(req))return reply({error:'Ungültiger Ursprung.'},403);await ensureSupplyTable();
 const b=await req.json() as any,world=String(b.world||''),action=String(b.action||''),now=Date.now();const me=await company(world,u.id);if(!me)throw Error('Bitte zuerst der Welt beitreten.');const myName=me.name||me.uname;
 if(action==='create'){const g=String(b.good||''),daily=Math.round(Number(b.daily)*10)/10,price=Math.round(Number(b.price)*100)/100,days=Math.round(Number(b.days)),siteId=String(b.siteId||'');
  if(!good(g as any)||g==='containers')throw Error('Ein Gut auswählen.');if(!(daily>=1&&daily<=50000))throw Error('Tagesmenge: 1–50.000 EH.');if(!(price>=.1&&price<=10000))throw Error('Preis: 0,10–10.000 € je EH.');if(!(days>=1&&days<=90))throw Error('Laufzeit: 1–90 Tage.');
  const st=await decodeCompany(me.state),site=st.sites.find(p=>p.id===siteId&&p.owned&&SHARED_KINDS.includes(p.kind));if(!site)throw Error('Einen eigenen Bahnhof, Hafen, Flughafen, Depot oder ein Lager als Zielgebäude wählen.');
  let target:string|null=null;if(b.target){const t=await db().prepare('SELECT user_id FROM logistics_world_companies WHERE world_id=? AND user_id=?').bind(world,String(b.target)).first<{user_id:string}>();if(!t||t.user_id===u.id)throw Error('Spedition nicht gefunden.');target=t.user_id;}
  const n=await db().prepare("SELECT count(*) AS n FROM logistics_supply_contracts WHERE world_id=? AND requester_id=? AND status IN ('open','active','cancel_req','cancel_sup')").bind(world,u.id).first<{n:number}>();if((n?.n||0)>=10)throw Error('Höchstens 10 laufende Lieferverträge als Auftraggeber.');
  await db().prepare("INSERT INTO logistics_supply_contracts(id,world_id,requester_id,requester_name,target_id,site_id,site_name,site,good,daily,price,days,status,note,created) VALUES(?,?,?,?,?,?,?,?,?,?,?,?,'open',?,?)").bind(crypto.randomUUID(),world,u.id,myName,target,site.id,site.name,JSON.stringify(site),g,daily,price,days,String(b.note||'').slice(0,200),now).run();
  if(target)await sendSystemMessage(world,target,`📦 ${myName} bietet dir einen Liefervertrag an: täglich ${daily.toLocaleString('de-DE')} EH ${good(g as any).name} nach ${site.name} für ${price.toLocaleString('de-DE',{style:'currency',currency:'EUR'})} je EH, ${days} Tage. Du findest ihn unter Kooperation → Lieferverträge.`).catch(()=>{});
  return reply({ok:true});}
 const r=await db().prepare('SELECT * FROM logistics_supply_contracts WHERE id=? AND world_id=?').bind(String(b.id||''),world).first<any>();if(!r)throw Error('Liefervertrag nicht gefunden.');
 if(action==='accept'){if(r.requester_id===u.id)throw Error('Eigene Verträge kann man nicht annehmen.');if(r.target_id&&r.target_id!==u.id)throw Error('Dieser Vertrag ist an eine andere Spedition gerichtet.');
  const day=Math.floor(await dayOf(world)),start=day+1;const x=await db().prepare("UPDATE logistics_supply_contracts SET supplier_id=?,supplier_name=?,status='active',start_day=?,end_day=?,day_key=? WHERE id=? AND status='open'").bind(u.id,myName,start,start+r.days,day,r.id).run();if(!x.meta?.changes)throw Error('Der Vertrag ist schon vergeben.');
  invalidateSupplyCache();await sendSystemMessage(world,r.requester_id,`📦 ${myName} hat deinen Liefervertrag angenommen: täglich ${r.daily.toLocaleString('de-DE')} EH ${good(r.good)?.name||r.good} nach ${r.site_name} ab Tag ${start}.`).catch(()=>{});
  return reply({ok:true,message:`Vertrag angenommen. ${r.site_name} erscheint jetzt in deinen Standorten – liefere die Ware dort ab, sie wird automatisch übergeben und bezahlt.`});}
 if(action==='withdraw'){if(r.requester_id!==u.id)throw Error('Nur der Auftraggeber.');const x=await db().prepare("UPDATE logistics_supply_contracts SET status='withdrawn' WHERE id=? AND status='open'").bind(r.id).run();if(!x.meta?.changes)throw Error('Nicht mehr offen.');return reply({ok:true});}
 if(action==='cancel'){const side=r.requester_id===u.id?'cancel_req':r.supplier_id===u.id?'cancel_sup':'';if(!side)throw Error('Nicht dein Vertrag.');const x=await db().prepare("UPDATE logistics_supply_contracts SET status=? WHERE id=? AND status='active'").bind(side,r.id).run();if(!x.meta?.changes)throw Error('Der Vertrag läuft nicht mehr.');return reply({ok:true,message:'Kündigung eingereicht – sie wird mit dem nächsten Spieltakt abgerechnet.'});}
 throw Error('Unbekannte Aktion.');
}catch(e:any){await logError('api:supply',e,{url:req.url},'warn');return reply({error:e.message||'Fehler.'},422);}}
