import {env} from 'cloudflare:workers';
import {log,good,stock,credit,debit,purgeOrderCargo,mergeSites,type GoodId,type State} from './engine';
import {allianceMap,chronicle} from './alliance-server';
import {registryByIds} from './partner-registry';

const db=()=>env.DB!;
export const CONVOY_PERIOD=3;
export interface ConvoyOffer {sourceCountry?:string;key:string;offerId:string;source_id:string;destination_id:string;sourceName:string;destinationName:string;sourceCity:string;destinationCity:string;good:string;goodName:string;quantity:number;fee:number;days:number;km:number}
export interface ConvoyRow {id:string;alliance_id:string;world_id:string;source_id:string;destination_id:string;source_name:string;destination_name:string;good:string;quantity:number;fee:number;deadline:number;status:string;created_day:number;km:number;loaded:string;delivered:string}

let ready:Promise<unknown>|undefined;
export const ensureConvoyTable=()=>ready??=db().batch([
 db().prepare("CREATE TABLE IF NOT EXISTS logistics_alliance_convoys(id TEXT PRIMARY KEY,alliance_id TEXT NOT NULL,world_id TEXT NOT NULL,source_id TEXT NOT NULL,destination_id TEXT NOT NULL,source_name TEXT NOT NULL DEFAULT '',destination_name TEXT NOT NULL DEFAULT '',good TEXT NOT NULL,quantity REAL NOT NULL,fee REAL NOT NULL,deadline REAL NOT NULL,status TEXT NOT NULL DEFAULT 'active',created_day REAL NOT NULL,km REAL NOT NULL DEFAULT 0,loaded TEXT NOT NULL DEFAULT '{}',delivered TEXT NOT NULL DEFAULT '{}')"),
 db().prepare('CREATE INDEX IF NOT EXISTS logistics_alliance_convoys_world ON logistics_alliance_convoys(world_id,status)'),
 db().prepare('CREATE TABLE IF NOT EXISTS logistics_convoy_month(world_id TEXT NOT NULL,alliance_id TEXT NOT NULL,month INTEGER NOT NULL,eh REAL NOT NULL DEFAULT 0,convoys INTEGER NOT NULL DEFAULT 0,PRIMARY KEY(world_id,alliance_id,month))'),
]).then(async()=>{const cols=(await db().prepare('PRAGMA table_info(logistics_alliances)').all<{name:string}>()).results;if(!cols.some(c=>c.name==='convoy_share'))await db().prepare('ALTER TABLE logistics_alliances ADD COLUMN convoy_share INTEGER NOT NULL DEFAULT 10').run().catch(()=>{});}).catch(e=>{ready=undefined;throw e;});

const hash=(t:string)=>{let h=2166136261;for(const c of t){h^=c.charCodeAt(0);h=Math.imul(h,16777619);}return h>>>0;};
const sum=(o:Record<string,number>)=>Object.values(o).reduce((a,b)=>a+(b||0),0);

export async function convoyOffers(worldId:string,allianceId:string,day:number):Promise<ConvoyOffer[]>{
 const period=Math.floor(day/CONVOY_PERIOD);
 const rows=(await db().prepare("SELECT * FROM (SELECT o.id,o.source_id,o.destination_id,o.good,o.quantity,o.fee,o.day,o.deadline,o.distance_km,o.source_city,o.destination_city,o.source_country,a.name AS sn,b.name AS dn,row_number() OVER (PARTITION BY o.source_country ORDER BY substr(o.id,-6)) AS rn FROM logistics_container_offers o JOIN logistics_partner_registry a ON a.id=o.source_id JOIN logistics_partner_registry b ON b.id=o.destination_id WHERE o.world_id=? AND o.status='open' AND o.accepted_by IS NULL AND o.special IS NULL AND o.rush=0 AND o.distance_km BETWEEN 40 AND 6000 AND o.day<=? AND o.day>?) WHERE rn<=12").bind(worldId,day,day-5).all<any>()).results;
 const by=new Map<string,any[]>();for(const r of rows)(by.get(r.source_country||'?')??by.set(r.source_country||'?',[]).get(r.source_country||'?')!).push(r);
 const out:ConvoyOffer[]=[];
 for(const [country,list] of by){const n=2+hash(allianceId+'/'+period+'/'+country)%4;
  for(const {r,h} of list.map(r=>({r,h:hash(allianceId+'/'+period+'/'+r.id)})).sort((a,b)=>a.h-b.h).slice(0,n)){
   const km=Math.round(Number(r.distance_km)||0),x=(h%10000)/10000,quantity=Math.min(1000000,Math.max(15000,Math.round((15000+Math.pow(x,2.5)*985000)/1000)*1000)),days=Math.max(7,Math.ceil(km/500)+Math.ceil(quantity/40000)+3);
   out.push({key:period+':'+r.id,offerId:r.id,source_id:r.source_id,destination_id:r.destination_id,sourceName:r.sn,destinationName:r.dn,sourceCity:r.source_city||'',destinationCity:r.destination_city||'',sourceCountry:country,good:r.good||'containers',goodName:good((r.good||'containers') as GoodId)?.name||r.good,quantity,fee:Math.round(Number(r.fee)*1.6*100)/100,days,km} as ConvoyOffer);}}
 return out.sort((a,b)=>a.sourceCountry!.localeCompare(b.sourceCountry!,'de')||b.quantity-a.quantity);
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
 const ids=[...new Set(ctx.rows.map(r=>r.alliance_id))],shares=new Map<string,number>(),taxes=new Map<string,number>();if(ids.length)for(const r of (await db().prepare('SELECT id,convoy_share FROM logistics_alliances WHERE id IN (SELECT value FROM json_each(?))').bind(JSON.stringify(ids)).all<{id:string;convoy_share:number}>()).results)shares.set(r.id,Math.max(0,Math.min(90,Number(r.convoy_share)||0)));
 for(const c of ctx.rows){const loaded=ctx.loaded.get(c.id)!,delivered:Record<string,number>=JSON.parse(c.delivered||'{}'),pool=ctx.pool.get(c.id)||0;let changed=ctx.changed.has(c.id);
  for(const [u,st] of states){if(map.get(u)!==c.alliance_id)continue;const k=st.contracts.find(x=>x.id===c.id);if(!k)continue;const after=st.consignments?.[c.source_id]?.[c.id]||0,took=Math.max(0,pool-after);if(took>0){loaded[u]=(loaded[u]||0)+took;changed=true;}if((k.delivered||0)!==(delivered[u]||0)){const inc=(k.delivered||0)-(delivered[u]||0);if(inc>0){const share=shares.get(c.alliance_id)||0,cut=Math.round(inc*c.fee*share)/100;if(cut>0){if(st.cash>=cut)debit(st,cut,'Allianz-Abgaben');else{st.cash-=cut;st.spent+=cut;}taxes.set(c.alliance_id,(taxes.get(c.alliance_id)||0)+cut);}}if(inc>0)out.push(db().prepare('INSERT INTO logistics_convoy_month(world_id,alliance_id,month,eh,convoys) VALUES(?,?,?,?,0) ON CONFLICT(world_id,alliance_id,month) DO UPDATE SET eh=eh+excluded.eh').bind(worldId,c.alliance_id,monthOf(day),inc));delivered[u]=k.delivered||0;changed=true;}}
  const done=sum(delivered);let status='active';
  if(done>=c.quantity-.5)status='completed';else if(day>=c.deadline)status='expired';
  if(status!=='active'){for(const [u,st] of states){if(!st.contracts.some(x=>x.id===c.id))continue;dropCopy(st,c);log(st,status==='completed'?`🚚 Konvoi abgeschlossen: ${Math.round(done).toLocaleString('de-DE')} EH nach ${c.destination_name} geliefert – danke für deinen Beitrag (${Math.round(delivered[u]||0).toLocaleString('de-DE')} EH).`:`🚚 Konvoi nach ${c.destination_name} abgelaufen – ${Math.round(done).toLocaleString('de-DE')} von ${Math.round(c.quantity).toLocaleString('de-DE')} EH geliefert.`,status==='completed'?'good':'warn');}
   if(status==='completed')out.push(db().prepare('INSERT INTO logistics_convoy_month(world_id,alliance_id,month,eh,convoys) VALUES(?,?,?,0,1) ON CONFLICT(world_id,alliance_id,month) DO UPDATE SET convoys=convoys+1').bind(worldId,c.alliance_id,monthOf(day)));
   out.push(chronicle(c.alliance_id,day,status==='completed'?`🚚 Konvoi ${c.source_name} → ${c.destination_name} geschafft: ${Math.round(done).toLocaleString('de-DE')} EH.`:`🚚 Konvoi ${c.source_name} → ${c.destination_name} verpasst (${Math.round(done).toLocaleString('de-DE')} / ${Math.round(c.quantity).toLocaleString('de-DE')} EH).`));changed=true;}
  if(changed)out.push(db().prepare('UPDATE logistics_alliance_convoys SET loaded=?,delivered=?,status=? WHERE id=?').bind(JSON.stringify(loaded),JSON.stringify(delivered),status,c.id));}
 for(const [aid,t] of taxes)if(t>0)out.push(db().prepare('UPDATE logistics_alliances SET treasury=treasury+? WHERE id=?').bind(Math.round(t*100)/100,aid));
 return out;
}

export async function convoysFor(allianceId:string){await ensureConvoyTable();return (await db().prepare('SELECT * FROM logistics_alliance_convoys WHERE alliance_id=? ORDER BY created_day DESC LIMIT 10').bind(allianceId).all<ConvoyRow>()).results.map(r=>({...r,loaded:JSON.parse(r.loaded||'{}'),delivered:JSON.parse(r.delivered||'{}')}));}
export const monthOf=(day:number)=>Math.floor((Math.floor(day)-1)/30);
export async function convoyRanking(worldId:string,day:number){await ensureConvoyTable();const m=monthOf(day),q=async(month:number)=>(await db().prepare('SELECT c.alliance_id AS id,c.eh,c.convoys,a.name,a.tag,a.color FROM logistics_convoy_month c JOIN logistics_alliances a ON a.id=c.alliance_id WHERE c.world_id=? AND c.month=? ORDER BY c.eh DESC LIMIT 20').bind(worldId,month).all<any>()).results;
 return {month:m+1,endsIn:(m+1)*30+1-day,current:await q(m),last:(await q(m-1)).slice(0,3)};}
