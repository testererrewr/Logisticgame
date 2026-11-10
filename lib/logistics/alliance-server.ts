import {env} from 'cloudflare:workers';
import {decodeCompany} from './company-codec';
import {GOODS,salePrice,credit,log,type GoodId,type Site,type State} from './engine';

const db=()=>env.DB!;
let ready:Promise<void>|undefined;
export function ensureAllianceTables(){return ready??=(async()=>{await db().batch([
 db().prepare("CREATE TABLE IF NOT EXISTS logistics_alliances(id TEXT PRIMARY KEY,world_id TEXT NOT NULL,name TEXT NOT NULL,tag TEXT NOT NULL,description TEXT NOT NULL DEFAULT '',color TEXT NOT NULL DEFAULT '#4a90c8',owner_id TEXT NOT NULL,open INTEGER NOT NULL DEFAULT 0,created INTEGER NOT NULL)"),
 db().prepare('CREATE TABLE IF NOT EXISTS logistics_alliance_members(alliance_id TEXT NOT NULL,world_id TEXT NOT NULL,user_id TEXT NOT NULL,role TEXT NOT NULL,joined INTEGER NOT NULL,PRIMARY KEY(world_id,user_id))'),
 db().prepare('CREATE TABLE IF NOT EXISTS logistics_alliance_invites(alliance_id TEXT NOT NULL,user_id TEXT NOT NULL,created INTEGER NOT NULL,PRIMARY KEY(alliance_id,user_id))'),
 db().prepare('CREATE TABLE IF NOT EXISTS logistics_alliance_posts(id TEXT PRIMARY KEY,alliance_id TEXT NOT NULL,user_id TEXT NOT NULL,text TEXT NOT NULL,created INTEGER NOT NULL)'),
 db().prepare('CREATE TABLE IF NOT EXISTS logistics_alliance_orders(id TEXT PRIMARY KEY,alliance_id TEXT NOT NULL,world_id TEXT NOT NULL,good TEXT NOT NULL,destination_id TEXT NOT NULL,destination_name TEXT NOT NULL,quantity REAL NOT NULL,delivered REAL NOT NULL DEFAULT 0,reward REAL NOT NULL,deadline_day REAL NOT NULL,status TEXT NOT NULL,created INTEGER NOT NULL,baselines TEXT NOT NULL DEFAULT \'{}\',contributions TEXT NOT NULL DEFAULT \'{}\')'),
]);const cols=(await db().prepare('PRAGMA table_info(logistics_alliances)').all<{name:string}>()).results;if(!cols.some(c=>c.name==='share_storage'))await db().prepare('ALTER TABLE logistics_alliances ADD COLUMN share_storage INTEGER NOT NULL DEFAULT 1').run().catch(()=>{});if(!cols.some(c=>c.name==='logo'))await db().prepare('ALTER TABLE logistics_alliances ADD COLUMN logo TEXT').run().catch(()=>{});if(!cols.some(c=>c.name==='logo_updated'))await db().prepare('ALTER TABLE logistics_alliances ADD COLUMN logo_updated INTEGER').run().catch(()=>{});})().catch(e=>{ready=undefined;throw e;});}

export const STORAGE_KINDS=['warehouse','warehouseSmall','warehouseMedium','warehouseXL','hub'];
export const SHARED_KINDS=['railStation','railDepot','port','inlandPort','shipDepot','airport','regionalAirport','airDepot','depot',...STORAGE_KINDS];
/** Partner terminals of allied companies as cooperative sites (separate stock per company, like trade partners). */
export function allySites(own:State,partners:{id:string;name:string;state:State}[],shareStorage=true):Site[]{
 const known=new Set(own.sites.map(p=>p.id)),out:Site[]=[];
 for(const p of partners)for(const site of p.state.sites)if(site.owned&&SHARED_KINDS.includes(site.kind)&&(shareStorage||!STORAGE_KINDS.includes(site.kind))&&!known.has(site.id)){out.push({...site,owned:false,cooperative:true,allianceShared:true,operatorId:p.id,name:`${site.name} (Allianz: ${p.name})`} as Site);known.add(site.id);}
 return out;
}
export async function allianceMap(worldId:string){await ensureAllianceTables();const rows=(await db().prepare('SELECT m.alliance_id,m.user_id,a.share_storage FROM logistics_alliance_members m JOIN logistics_alliances a ON a.id=m.alliance_id WHERE m.world_id=?').bind(worldId).all<{alliance_id:string;user_id:string;share_storage:number}>()).results;const map=new Map(rows.map(r=>[r.user_id,r.alliance_id]));(map as Map<string,string>&{storage?:Map<string,boolean>}).storage=new Map(rows.map(r=>[r.alliance_id,r.share_storage!==0]));return map as Map<string,string>&{storage:Map<string,boolean>};}

const cache=new Map<string,{at:number;sites:Site[]}>();
/** Shared sites for one company outside the settlement loop (cached 2 minutes). */
export async function allianceSitesFor(worldId:string,userId:string,own:State){
 const key=worldId+':'+userId,hit=cache.get(key);if(hit&&Date.now()-hit.at<120000)return hit.sites.filter(p=>!own.sites.some(x=>x.id===p.id));
 const map=await allianceMap(worldId),aid=map.get(userId);let sites:Site[]=[];
 if(aid){const ids=[...map].filter(([u,a])=>a===aid&&u!==userId).map(([u])=>u);if(ids.length){const rows=(await db().prepare("SELECT c.user_id,COALESCE(NULLIF(c.name,''),'Spedition') AS name,c.state FROM logistics_world_companies c WHERE c.world_id=? AND c.user_id IN (SELECT value FROM json_each(?))").bind(worldId,JSON.stringify(ids)).all<{user_id:string;name:string;state:string}>()).results;const partners=[];for(const r of rows){try{partners.push({id:r.user_id,name:r.name,state:await decodeCompany(r.state)});}catch{}}sites=allySites(own,partners,map.storage.get(aid)!==false);}}
 cache.set(key,{at:Date.now(),sites});if(cache.size>2000)cache.clear();return sites;
}
export function invalidateAllianceCache(){cache.clear();}
export function stripAllianceSites(s:State){s.sites=s.sites.filter(p=>!(p as Site&{allianceShared?:boolean}).allianceShared);}

/* ---------- Allianz-Aufträge ---------- */
export interface AllianceOffer {key:string;good:GoodId;quantity:number;reward:number;days:number}
const mix=(t:string)=>{let h=2166136261;for(const c of t){h^=c.charCodeAt(0);h=Math.imul(h,16777619);}return()=>{h^=h>>>15;h=Math.imul(h,2246822507);h^=h>>>13;h=Math.imul(h,3266489909);h^=h>>>16;return (h>>>0)/4294967296;};};
/** Three daily offers per alliance; deterministic so every member sees the same board. */
export function allianceOffers(allianceId:string,day:number,members:number):AllianceOffer[]{
 const d=Math.floor(day),rnd=mix(allianceId+':'+d),pool=GOODS.filter(g=>g.id!=='containers'&&g.sale>0),out:AllianceOffer[]=[];
 for(let i=0;i<3&&pool.length;i++){const g=pool.splice(Math.floor(rnd()*pool.length),1)[0];const days=4+Math.floor(rnd()*7);const quantity=Math.max(50,Math.round((150+rnd()*350)*Math.max(1,members)*days/7/10)*10);const reward=Math.round(quantity*salePrice(g.id,d)*(.45+rnd()*.35));out.push({key:d+'-'+i,good:g.id,quantity,reward,days});}
 return out;
}
interface OrderRow {id:string;alliance_id:string;good:string;quantity:number;delivered:number;reward:number;deadline_day:number;baselines:string;contributions:string;destination_name:string}
/** Progress + payout inside the world settlement (states are written right after). */
export async function settleAllianceOrders(worldId:string,states:Map<string,State>,day:number){
 await ensureAllianceTables();const out:D1PreparedStatement[]=[];
 const orders=(await db().prepare("SELECT * FROM logistics_alliance_orders WHERE world_id=? AND status='active'").bind(worldId).all<OrderRow>()).results;if(!orders.length)return out;
 const map=await allianceMap(worldId);
 for(const o of orders){
  const base:Record<string,number>=JSON.parse(o.baselines||'{}'),contrib:Record<string,number>=JSON.parse(o.contributions||'{}');
  for(const [user,aid] of map){if(aid!==o.alliance_id)continue;const st=states.get(user);if(!st)continue;const cur=st.deliveryStats?.[o.good]||0;if(base[user]===undefined)base[user]=cur;contrib[user]=Math.round(Math.max(contrib[user]||0,cur-base[user])*100)/100;}
  const delivered=Math.min(o.quantity,Math.round(Object.values(contrib).reduce((a,b)=>a+b,0)*100)/100);let status='active';
  if(delivered>=o.quantity-1e-6){status='completed';const total=Object.values(contrib).reduce((a,b)=>a+b,0)||1;for(const [user,c] of Object.entries(contrib)){const st=states.get(user);if(!st||c<=0)continue;const pay=Math.round(o.reward*c/total*100)/100;credit(st,pay,'Allianz-Aufträge');log(st,`Allianz-Auftrag ${o.destination_name} erfüllt · Anteil ${Math.round(c/total*100)} % · +${pay.toLocaleString('de-DE',{style:'currency',currency:'EUR'})}`,'good');}}
  else if(day>o.deadline_day){status='failed';for(const [user] of Object.entries(contrib)){const st=states.get(user);if(st)log(st,`Allianz-Auftrag ${o.destination_name} nicht rechtzeitig erfüllt (${delivered}/${o.quantity} EH).`,'warn');}}
  if(status!=='active'||delivered!==o.delivered||o.baselines!==JSON.stringify(base))out.push(db().prepare('UPDATE logistics_alliance_orders SET delivered=?,baselines=?,contributions=?,status=? WHERE id=?').bind(delivered,JSON.stringify(base),JSON.stringify(contrib),status,o.id));
 }
 return out;
}
