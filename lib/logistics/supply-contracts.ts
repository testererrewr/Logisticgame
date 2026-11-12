import {env} from 'cloudflare:workers';
import {good,credit,debit,log,stock,freeStock,storageCapacity,type GoodId,type Site,type State} from './engine';
import {systemMessageStatement,ensureMessageTable} from './system-message';

const db=()=>env.DB!;
export const SUPPLY_PENALTY=.8;
export const supplyMinPrice=(g:GoodId)=>Math.ceil((good(g)?.purchase||0)*1.1*100)/100;
export const SUPPLY_MAX_MISSES=5;
export interface SupplyRow {id:string;world_id:string;requester_id:string;requester_name:string;supplier_id:string|null;supplier_name:string|null;target_id:string|null;site_id:string;site_name:string;site:string;good:string;daily:number;price:number;days:number;start_day:number;end_day:number;day_key:number;today:number;delivered:number;paid:number;penalties:number;misses:number;blocked:number;status:string;note:string;created:number}
let ready:Promise<unknown>|undefined;
export const ensureSupplyTable=()=>ready??=db().batch([
 db().prepare("CREATE TABLE IF NOT EXISTS logistics_supply_contracts(id TEXT PRIMARY KEY,world_id TEXT NOT NULL,requester_id TEXT NOT NULL,requester_name TEXT NOT NULL DEFAULT '',supplier_id TEXT,supplier_name TEXT,target_id TEXT,site_id TEXT NOT NULL,site_name TEXT NOT NULL,site TEXT NOT NULL,good TEXT NOT NULL,daily REAL NOT NULL,price REAL NOT NULL,days INTEGER NOT NULL,start_day REAL NOT NULL DEFAULT 0,end_day REAL NOT NULL DEFAULT 0,day_key INTEGER NOT NULL DEFAULT 0,today REAL NOT NULL DEFAULT 0,delivered REAL NOT NULL DEFAULT 0,paid REAL NOT NULL DEFAULT 0,penalties REAL NOT NULL DEFAULT 0,misses INTEGER NOT NULL DEFAULT 0,blocked INTEGER NOT NULL DEFAULT 0,status TEXT NOT NULL,note TEXT NOT NULL DEFAULT '',created INTEGER NOT NULL)"),
 db().prepare('CREATE INDEX IF NOT EXISTS logistics_supply_world ON logistics_supply_contracts(world_id,status)'),
]).catch(e=>{ready=undefined;throw e;});

const cache=new Map<string,{at:number;sites:Site[]}>();
export const invalidateSupplyCache=()=>cache.clear();
export function supplySite(r:Pick<SupplyRow,'site'|'requester_id'|'requester_name'>):Site|null{try{const p=JSON.parse(r.site) as Site;return {...p,owned:false,cooperative:true,allianceShared:true,operatorId:r.requester_id,name:`${p.name} (Liefervertrag: ${r.requester_name||'Spedition'})`} as Site;}catch{return null;}}
export async function supplySitesFor(worldId:string,userId:string,own:State){
 const key=worldId+':'+userId,hit=cache.get(key);let sites=hit&&Date.now()-hit.at<30000?hit.sites:null;
 if(!sites){await ensureSupplyTable();sites=(await db().prepare("SELECT site,requester_id,requester_name FROM logistics_supply_contracts WHERE world_id=? AND supplier_id=? AND status IN ('active','cancel_req','cancel_sup')").bind(worldId,userId).all<SupplyRow>()).results.map(supplySite).filter((p):p is Site=>!!p);cache.set(key,{at:Date.now(),sites});}
 const known=new Set(own.sites.map(p=>p.id));return sites.filter(p=>!known.has(p.id)&&(known.add(p.id),true));
}
export function attachSupplySites(states:Map<string,State>,rows:SupplyRow[]){
 for(const r of rows){if(!r.supplier_id||!['active','cancel_req','cancel_sup'].includes(r.status))continue;const st=states.get(r.supplier_id);if(!st||st.sites.some(p=>p.id===r.site_id))continue;const p=supplySite(r);if(p)st.sites.push(p);}
}
export async function activeSupplyRows(worldId:string){await ensureSupplyTable();return (await db().prepare("SELECT * FROM logistics_supply_contracts WHERE world_id=? AND status IN ('active','cancel_req','cancel_sup')").bind(worldId).all<SupplyRow>()).results;}

const eur=(n:number)=>n.toLocaleString('de-DE',{style:'currency',currency:'EUR'});
const r2=(n:number)=>Math.round(n*100)/100;
function charge(s:State,n:number,cat:string){if(n<=0)return;if(s.cash>=n)debit(s,n,cat);else{s.cash-=n;s.spent+=n;}}
function room(s:State,siteId:string){const p=s.sites.find(x=>x.id===siteId);if(!p)return 0;return Math.max(0,storageCapacity(p)-Object.values(s.inventory[siteId]||{}).reduce<number>((a,b)=>a+(b||0),0));}

export async function settleSupplyContracts(worldId:string,states:Map<string,State>,day:number,rows?:SupplyRow[]){
 rows??=await activeSupplyRows(worldId);const out:D1PreparedStatement[]=[];if(!rows.length)return out;await ensureMessageTable();
 const today=Math.floor(day);
 for(const r of rows){const req=states.get(r.requester_id),sup=r.supplier_id?states.get(r.supplier_id):undefined,name=good(r.good as GoodId)?.name||r.good,g=r.good as GoodId;
  let {status,day_key,today:done,delivered,paid,penalties,misses,blocked}=r;const dayValue=r2(r.daily*r.price);
  const msg=(to:string|null|undefined,text:string)=>{if(to)out.push(systemMessageStatement(worldId,to,text));};
  if(!req||!sup||!req.sites.some(p=>p.id===r.site_id&&p.owned)){status='cancelled';msg(r.requester_id,`📦 Liefervertrag ${name} nach ${r.site_name} wurde beendet – ${!req||!sup?'eine Spedition existiert nicht mehr':'das Gebäude gehört dir nicht mehr'}.`);msg(r.supplier_id,`📦 Liefervertrag ${name} nach ${r.site_name} wurde beendet.`);}
  else{
   if(status==='active'&&today>day_key){if(day_key>=r.start_day){const missing=r2(r.daily-done);if(missing>.01&&!blocked){const pen=r2(missing*r.price*SUPPLY_PENALTY);charge(sup,pen,'Vertragsstrafen');credit(req,pen,'Vertragsstrafen');penalties=r2(penalties+pen);misses++;log(sup,`⚠️ Liefervertrag ${name} → ${r.site_name}: ${missing.toLocaleString('de-DE')} EH fehlten · Vertragsstrafe ${eur(pen)}`,'warn');log(req,`Liefervertrag ${name}: ${missing.toLocaleString('de-DE')} EH nicht geliefert · ${eur(pen)} Vertragsstrafe erhalten.`,'warn');}else if(missing<=.01)misses=0;}
    day_key=today;done=0;blocked=0;
    if(misses>=SUPPLY_MAX_MISSES){status='cancelled';msg(r.requester_id,`📦 Liefervertrag ${name} nach ${r.site_name} wurde nach ${misses} Fehltagen automatisch gekündigt.`);msg(r.supplier_id,`📦 Dein Liefervertrag ${name} nach ${r.site_name} wurde nach ${misses} Fehltagen automatisch gekündigt.`);}
    else if(today>=r.end_day){status='done';msg(r.requester_id,`✅ Liefervertrag ${name} nach ${r.site_name} ist ausgelaufen: ${Math.round(delivered).toLocaleString('de-DE')} EH geliefert.`);msg(r.supplier_id,`✅ Liefervertrag ${name} nach ${r.site_name} ist ausgelaufen: ${eur(paid)} Umsatz.`);}}
   if(status==='active'){const want=r2(Math.min(r.daily-done,freeStock(sup,r.site_id,g),room(req,r.site_id)));const afford=r.price>0?Math.floor(req.cash/r.price*100)/100:Infinity,move=r2(Math.min(want,afford));
    if(want>.009&&afford<want-.009&&!blocked){blocked=1;log(req,`⚠️ Liefervertrag ${name}: Konto reicht nicht, um die Ware zu bezahlen.`,'warn');msg(r.supplier_id,`📦 ${r.requester_name} kann den Liefervertrag ${name} gerade nicht bezahlen – heute keine Vertragsstrafe.`);}
    if(move>.009){const pay=r2(move*r.price);sup.inventory[r.site_id]![g]=r2(stock(sup,r.site_id,g)-move);req.inventory[r.site_id]??={};req.inventory[r.site_id][g]=r2(stock(req,r.site_id,g)+move);if(pay>0){debit(req,pay,'Lieferverträge');credit(sup,pay,'Lieferverträge');}done=r2(done+move);delivered=r2(delivered+move);paid=r2(paid+pay);}}
   else if(status==='cancel_req'||status==='cancel_sup'){const fee=r2(dayValue*(status==='cancel_sup'?.5:.25));const [payer,payee]=status==='cancel_sup'?[sup,req]:[req,sup];charge(payer,fee,'Vertragsstrafen');credit(payee,fee,'Vertragsstrafen');penalties=r2(penalties+(status==='cancel_sup'?fee:0));
    const who=status==='cancel_sup'?r.supplier_name:r.requester_name;msg(r.requester_id,`📦 Liefervertrag ${name} nach ${r.site_name} wurde von ${who} gekündigt · Ablöse ${eur(fee)} ${status==='cancel_sup'?'erhalten':'gezahlt'}.`);msg(r.supplier_id,`📦 Liefervertrag ${name} nach ${r.site_name} wurde von ${who} gekündigt · Ablöse ${eur(fee)} ${status==='cancel_sup'?'gezahlt':'erhalten'}.`);status='cancelled';}}
  if(status!==r.status||day_key!==r.day_key||done!==r.today||delivered!==r.delivered||penalties!==r.penalties||misses!==r.misses||blocked!==r.blocked)out.push(db().prepare('UPDATE logistics_supply_contracts SET status=?,day_key=?,today=?,delivered=?,paid=?,penalties=?,misses=?,blocked=? WHERE id=?').bind(status,day_key,done,delivered,paid,penalties,misses,blocked,r.id));
  if(status!==r.status)invalidateSupplyCache();}
 return out;
}
