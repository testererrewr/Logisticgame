import {env} from 'cloudflare:workers';
import {good,log,stock,freeStock,storageCapacity,type GoodId,type State} from './engine';
import {ensureAllianceSocial,hqLevel,SHARED_KINDS} from './alliance-server';

const db=()=>env.DB!;
export const stockCapacity=(level:number)=>25000*(1+level);
let ready:Promise<unknown>|undefined;
export const ensureAllianceStock=()=>ready??=(async()=>{await ensureAllianceSocial();await db().batch([
 db().prepare('CREATE TABLE IF NOT EXISTS logistics_alliance_stock(alliance_id TEXT NOT NULL,good TEXT NOT NULL,qty REAL NOT NULL,PRIMARY KEY(alliance_id,good))'),
 db().prepare("CREATE TABLE IF NOT EXISTS logistics_alliance_stock_moves(id TEXT PRIMARY KEY,alliance_id TEXT NOT NULL,world_id TEXT NOT NULL,user_id TEXT NOT NULL,user_name TEXT NOT NULL DEFAULT '',site_id TEXT NOT NULL,site_name TEXT NOT NULL,good TEXT NOT NULL,kind TEXT NOT NULL,qty REAL NOT NULL,done REAL NOT NULL DEFAULT 0,status TEXT NOT NULL,note TEXT NOT NULL DEFAULT '',created INTEGER NOT NULL)"),
 db().prepare('CREATE INDEX IF NOT EXISTS logistics_alliance_stock_moves_world ON logistics_alliance_stock_moves(world_id,status)'),
]);const cols=(await db().prepare('PRAGMA table_info(logistics_alliances)').all<{name:string}>()).results;if(!cols.some(c=>c.name==='stock_open'))await db().prepare('ALTER TABLE logistics_alliances ADD COLUMN stock_open INTEGER NOT NULL DEFAULT 1').run().catch(()=>{});})().catch(e=>{ready=undefined;throw e;});

export async function allianceStock(allianceId:string){await ensureAllianceStock();
 const [items,info,moves]=await db().batch([db().prepare('SELECT good,qty FROM logistics_alliance_stock WHERE alliance_id=? AND qty>0.009 ORDER BY qty DESC').bind(allianceId),db().prepare('SELECT hq_funds,stock_open FROM logistics_alliances WHERE id=?').bind(allianceId),db().prepare('SELECT id,user_id,user_name,site_name,good,kind,qty,done,status,note,created FROM logistics_alliance_stock_moves WHERE alliance_id=? ORDER BY created DESC LIMIT 40').bind(allianceId)]);
 const a=info.results[0] as any,level=hqLevel(Number(a?.hq_funds||0)),list=(items.results as {good:string;qty:number}[]).map(r=>({...r,name:good(r.good as GoodId)?.name||r.good}));
 return {items:list,used:Math.round(list.reduce((n,r)=>n+r.qty,0)*100)/100,capacity:stockCapacity(level),level,open:a?.stock_open!==0,moves:(moves.results as any[]).map(m=>({...m,goodName:good(m.good as GoodId)?.name||m.good}))};}

const r2=(n:number)=>Math.round(n*100)/100;
function room(s:State,siteId:string){const p=s.sites.find(x=>x.id===siteId);if(!p)return 0;return Math.max(0,storageCapacity(p)-Object.values(s.inventory[siteId]||{}).reduce<number>((a,b)=>a+(b||0),0));}

export async function settleAllianceStock(worldId:string,states:Map<string,State>){
 await ensureAllianceStock();const out:D1PreparedStatement[]=[];
 const moves=(await db().prepare("SELECT * FROM logistics_alliance_stock_moves WHERE world_id=? AND status='pending' ORDER BY created LIMIT 200").bind(worldId).all<any>()).results;if(!moves.length)return out;
 const ids=[...new Set(moves.map(m=>m.alliance_id))];
 const members=new Map((await db().prepare('SELECT user_id,alliance_id,role FROM logistics_alliance_members WHERE world_id=?').bind(worldId).all<{user_id:string;alliance_id:string;role:string}>()).results.map(r=>[r.user_id,r]));
 const meta=new Map((await db().prepare('SELECT id,hq_funds,stock_open FROM logistics_alliances WHERE id IN (SELECT value FROM json_each(?))').bind(JSON.stringify(ids)).all<any>()).results.map(r=>[r.id,r]));
 const stocks=new Map<string,Map<string,number>>();for(const r of (await db().prepare('SELECT alliance_id,good,qty FROM logistics_alliance_stock WHERE alliance_id IN (SELECT value FROM json_each(?))').bind(JSON.stringify(ids)).all<{alliance_id:string;good:string;qty:number}>()).results){if(!stocks.has(r.alliance_id))stocks.set(r.alliance_id,new Map());stocks.get(r.alliance_id)!.set(r.good,r.qty);}
 const touched=new Map<string,Set<string>>();
 for(const m of moves){const st=states.get(m.user_id),mem=members.get(m.user_id),a=meta.get(m.alliance_id),g=m.good as GoodId,name=good(g)?.name||m.good;const pool=stocks.get(m.alliance_id)??new Map<string,number>();stocks.set(m.alliance_id,pool);
  let done=0,note='';
  if(!st||!a||mem?.alliance_id!==m.alliance_id)note='Nicht mehr Mitglied der Allianz.';
  else if(!st.sites.some(p=>p.id===m.site_id&&p.owned&&SHARED_KINDS.includes(p.kind)))note='Standort gehört dir nicht mehr.';
  else if(m.kind==='in'){const used=[...pool.values()].reduce((x,y)=>x+y,0),free=Math.max(0,stockCapacity(hqLevel(Number(a.hq_funds||0)))-used);done=r2(Math.min(m.qty,freeStock(st,m.site_id,g),free));
   if(done>.009){st.inventory[m.site_id]![g]=r2(stock(st,m.site_id,g)-done);pool.set(m.good,r2((pool.get(m.good)||0)+done));log(st,`🏛️ ${done.toLocaleString('de-DE')} EH ${name} aus ${m.site_name} ins Allianz-Lagerhaus eingelagert.`,'info');}
   if(done<m.qty-.009)note=free<m.qty?'Allianz-Lagerhaus ist voll.':'Nicht genug freier Bestand am Standort.';}
  else{if(a.stock_open===0&&!['leader','officer'].includes(mem.role))note='Entnahme ist nur der Allianzleitung erlaubt.';
   else{done=r2(Math.min(m.qty,pool.get(m.good)||0,room(st,m.site_id)));if(done>.009){pool.set(m.good,r2((pool.get(m.good)||0)-done));st.inventory[m.site_id]??={};st.inventory[m.site_id][g]=r2(stock(st,m.site_id,g)+done);log(st,`🏛️ ${done.toLocaleString('de-DE')} EH ${name} aus dem Allianz-Lagerhaus nach ${m.site_name} geholt.`,'info');}
    if(done<m.qty-.009)note=(pool.get(m.good)||0)<.01?'Nicht genug Bestand im Allianz-Lagerhaus.':'Kein Platz mehr am Standort.';}}
  if(done>.009){if(!touched.has(m.alliance_id))touched.set(m.alliance_id,new Set());touched.get(m.alliance_id)!.add(m.good);}
  out.push(db().prepare('UPDATE logistics_alliance_stock_moves SET status=?,done=?,note=? WHERE id=?').bind(done<=.009?'failed':done<m.qty-.009?'partial':'done',done,note,m.id));}
 for(const [aid,goods] of touched)for(const g of goods){const q=stocks.get(aid)?.get(g)||0;out.push(q>.009?db().prepare('INSERT OR REPLACE INTO logistics_alliance_stock(alliance_id,good,qty) VALUES(?,?,?)').bind(aid,g,q):db().prepare('DELETE FROM logistics_alliance_stock WHERE alliance_id=? AND good=?').bind(aid,g));}
 return out;
}
