import {env} from 'cloudflare:workers';
import {log,good,stock,purgeOrderCargo,mergeSites,type GoodId,type State} from './engine';
import {allianceMap,chronicle} from './alliance-server';
import {registryByIds} from './partner-registry';

const db=()=>env.DB!;
export const CONVOY_PERIOD=3;
export interface ConvoyOffer {key:string;offerId:string;source_id:string;destination_id:string;sourceName:string;destinationName:string;sourceCity:string;destinationCity:string;good:string;goodName:string;quantity:number;fee:number;days:number;km:number}
export interface ConvoyRow {id:string;alliance_id:string;world_id:string;source_id:string;destination_id:string;source_name:string;destination_name:string;good:string;quantity:number;fee:number;deadline:number;status:string;created_day:number;km:number;loaded:string;delivered:string}

let ready:Promise<unknown>|undefined;
export const ensureConvoyTable=()=>ready??=db().batch([
 db().prepare("CREATE TABLE IF NOT EXISTS logistics_alliance_convoys(id TEXT PRIMARY KEY,alliance_id TEXT NOT NULL,world_id TEXT NOT NULL,source_id TEXT NOT NULL,destination_id TEXT NOT NULL,source_name TEXT NOT NULL DEFAULT '',destination_name TEXT NOT NULL DEFAULT '',good TEXT NOT NULL,quantity REAL NOT NULL,fee REAL NOT NULL,deadline REAL NOT NULL,status TEXT NOT NULL DEFAULT 'active',created_day REAL NOT NULL,km REAL NOT NULL DEFAULT 0,loaded TEXT NOT NULL DEFAULT '{}',delivered TEXT NOT NULL DEFAULT '{}')"),
 db().prepare('CREATE INDEX IF NOT EXISTS logistics_alliance_convoys_world ON logistics_alliance_convoys(world_id,status)'),
]).catch(e=>{ready=undefined;throw e;});

const hash=(t:string)=>{let h=2166136261;for(const c of t){h^=c.charCodeAt(0);h=Math.imul(h,16777619);}return h>>>0;};
const sum=(o:Record<string,number>)=>Object.values(o).reduce((a,b)=>a+(b||0),0);

export async function convoyOffers(worldId:string,allianceId:string,day:number):Promise<ConvoyOffer[]>{
 const period=Math.floor(day/CONVOY_PERIOD);
 const rows=(await db().prepare("SELECT o.id,o.source_id,o.destination_id,o.good,o.quantity,o.fee,o.day,o.deadline,o.distance_km,o.source_city,o.destination_city,a.name AS sn,b.name AS dn FROM logistics_container_offers o JOIN logistics_partner_registry a ON a.id=o.source_id JOIN logistics_partner_registry b ON b.id=o.destination_id WHERE o.world_id=? AND o.status='open' AND o.accepted_by IS NULL AND o.special IS NULL AND o.rush=0 AND o.distance_km BETWEEN 40 AND 4000 AND o.day<=? AND o.day>? LIMIT 600").bind(worldId,day,day-5).all<any>()).results;
 return rows.map(r=>({r,h:hash(allianceId+'/'+period+'/'+r.id)})).sort((a,b)=>a.h-b.h).slice(0,4).map(({r,h})=>{
  const quantity=Math.max(15000,Math.min(150000,Math.round(Number(r.quantity)*(12+h%20)/500)*500)),days=Math.max(8,Math.ceil((Number(r.deadline)-Number(r.day))*1.6));
  return {key:period+':'+r.id,offerId:r.id,source_id:r.source_id,destination_id:r.destination_id,sourceName:r.sn,destinationName:r.dn,sourceCity:r.source_city||'',destinationCity:r.destination_city||'',good:r.good||'containers',goodName:good((r.good||'containers') as GoodId)?.name||r.good,quantity,fee:Math.round(Number(r.fee)*1.15*100)/100,days,km:Math.round(Number(r.distance_km)||0)};});
}

export async function acceptConvoy(worldId:string,allianceId:string,day:number,key:string){
 await ensureConvoyTable();
 const active=await db().prepare("SELECT count(*) AS n FROM logistics_alliance_convoys WHERE alliance_id=? AND status='active'").bind(allianceId).first<{n:number}>();if((active?.n||0)>=2)throw Error('Höchstens 2 Konvoi-Aufträge gleichzeitig.');
 const o=(await convoyOffers(worldId,allianceId,day)).find(x=>x.key===key);if(!o)throw Error('Dieser Konvoi-Auftrag ist nicht mehr verfügbar.');
 const id='convoy:'+hash(allianceId+'/'+key).toString(36)+':'+Math.floor(day);
 await db().prepare("INSERT OR IGNORE INTO logistics_alliance_convoys(id,alliance_id,world_id,source_id,destination_id,source_name,destination_name,good,quantity,fee,deadline,status,created_day,km) VALUES(?,?,?,?,?,?,?,?,?,?,?,'active',?,?)").bind(id,allianceId,worldId,o.source_id,o.destination_id,o.sourceName,o.destinationName,o.good,o.quantity,o.fee,Math.floor(day)+o.days,day,o.km).run();
 return {id,offer:o};
}

export async function activeConvoys(worldId:string){await ensureConvoyTable();return (await db().prepare("SELECT * FROM logistics_alliance_convoys WHERE world_id=? AND status='active'").bind(worldId).all<ConvoyRow>()).results;}

function dropCopy(s:State,c:ConvoyRow){const g=c.good as GoodId,atSource=s.consignments?.[c.source_id]?.[c.id]||0,lost=purgeOrderCargo(s,c.id,g);s.contracts=s.contracts.filter(x=>x.id!==c.id);return Math.max(0,lost-atSource);}

export interface ConvoyCtx {pool:Map<string,number>;rows:ConvoyRow[];changed:Set<string>;loaded:Map<string,Record<string,number>>}
export async function prepareConvoys(worldId:string,states:Map<string,State>,day:number):Promise<ConvoyCtx|null>{
 const rows=await activeConvoys(worldId);if(!rows.length)return null;const map=await allianceMap(worldId),ctx:ConvoyCtx={pool:new Map(),rows,changed:new Set(),loaded:new Map()};
 const sites=await registryByIds([...new Set(rows.flatMap(r=>[r.source_id,r.destination_id]))]);
 for(const c of rows){const loaded:Record<string,number>=JSON.parse(c.loaded||'{}'),delivered:Record<string,number>=JSON.parse(c.delivered||'{}');ctx.loaded.set(c.id,loaded);
  for(const [u,st] of states){if(map.get(u)===c.alliance_id||!st.contracts.some(x=>x.id===c.id))continue;const back=dropCopy(st,c);loaded[u]=Math.max(delivered[u]||0,(loaded[u]||0)-back);ctx.changed.add(c.id);log(st,`🚚 Konvoi ${c.source_name} → ${c.destination_name}: Du bist nicht mehr in der Allianz – deine geladene Fracht geht an den Start zurück.`,'warn');}
  for(const u of Object.keys(loaded))if(!states.has(u)&&loaded[u]>(delivered[u]||0)){loaded[u]=delivered[u]||0;ctx.changed.add(c.id);}
  const pool=Math.max(0,c.quantity-sum(loaded));ctx.pool.set(c.id,pool);const g=c.good as GoodId;
  for(const [u,st] of states){if(map.get(u)!==c.alliance_id)continue;mergeSites(st,sites.filter(p=>p.id===c.source_id||p.id===c.destination_id));if(!st.sites.some(p=>p.id===c.source_id)||!st.sites.some(p=>p.id===c.destination_id))continue;
   let k=st.contracts.find(x=>x.id===c.id);if(!k){k={id:c.id,deadlineRulesVersion:15,kind:'haulage',siteId:c.source_id,destinationId:c.destination_id,good:g,daily:0,startDay:st.day,endDay:c.deadline,delivered:delivered[u]||0,paid:0,loadedToday:0,deliveredToday:0,fee:c.fee,total:c.quantity};st.contracts.push(k);log(st,`🚚 Allianz-Konvoi: ${good(g)?.name||g} ${c.source_name} → ${c.destination_name}. Alle Mitglieder können laden und liefern.`,'good');}
   k.total=c.quantity;k.endDay=c.deadline;
   const cur=st.consignments?.[c.source_id]?.[c.id]||0;st.inventory[c.source_id]??={};st.inventory[c.source_id][g]=Math.max(0,stock(st,c.source_id,g)+pool-cur);st.consignments??={};st.consignments[c.source_id]??={};st.consignments[c.source_id][c.id]=pool;}
 }
 return ctx;
}

export async function settleConvoys(worldId:string,states:Map<string,State>,day:number,ctx:ConvoyCtx|null){
 if(!ctx)return [];const out:D1PreparedStatement[]=[],map=await allianceMap(worldId);
 for(const c of ctx.rows){const loaded=ctx.loaded.get(c.id)!,delivered:Record<string,number>=JSON.parse(c.delivered||'{}'),pool=ctx.pool.get(c.id)||0;let changed=ctx.changed.has(c.id);
  for(const [u,st] of states){if(map.get(u)!==c.alliance_id)continue;const k=st.contracts.find(x=>x.id===c.id);if(!k)continue;const after=st.consignments?.[c.source_id]?.[c.id]||0,took=Math.max(0,pool-after);if(took>0){loaded[u]=(loaded[u]||0)+took;changed=true;}if((k.delivered||0)!==(delivered[u]||0)){delivered[u]=k.delivered||0;changed=true;}}
  const done=sum(delivered);let status='active';
  if(done>=c.quantity-.5)status='completed';else if(day>=c.deadline)status='expired';
  if(status!=='active'){for(const [u,st] of states){if(!st.contracts.some(x=>x.id===c.id))continue;dropCopy(st,c);log(st,status==='completed'?`🚚 Konvoi abgeschlossen: ${Math.round(done).toLocaleString('de-DE')} EH nach ${c.destination_name} geliefert – danke für deinen Beitrag (${Math.round(delivered[u]||0).toLocaleString('de-DE')} EH).`:`🚚 Konvoi nach ${c.destination_name} abgelaufen – ${Math.round(done).toLocaleString('de-DE')} von ${Math.round(c.quantity).toLocaleString('de-DE')} EH geliefert.`,status==='completed'?'good':'warn');}
   out.push(chronicle(c.alliance_id,day,status==='completed'?`🚚 Konvoi ${c.source_name} → ${c.destination_name} geschafft: ${Math.round(done).toLocaleString('de-DE')} EH.`:`🚚 Konvoi ${c.source_name} → ${c.destination_name} verpasst (${Math.round(done).toLocaleString('de-DE')} / ${Math.round(c.quantity).toLocaleString('de-DE')} EH).`));changed=true;}
  if(changed)out.push(db().prepare('UPDATE logistics_alliance_convoys SET loaded=?,delivered=?,status=? WHERE id=?').bind(JSON.stringify(loaded),JSON.stringify(delivered),status,c.id));}
 return out;
}

export async function convoysFor(allianceId:string){await ensureConvoyTable();return (await db().prepare('SELECT * FROM logistics_alliance_convoys WHERE alliance_id=? ORDER BY created_day DESC LIMIT 10').bind(allianceId).all<ConvoyRow>()).results.map(r=>({...r,loaded:JSON.parse(r.loaded||'{}'),delivered:JSON.parse(r.delivered||'{}')}));}
