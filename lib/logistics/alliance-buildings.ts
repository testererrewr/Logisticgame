import {env} from 'cloudflare:workers';
import {BUILDINGS,credit,debit,log,stock,good,type Site,type State,type GoodId} from './engine';
import {recordFinance} from './finance';

const db=()=>env.DB!;
export const ALLIANCE_BUILDINGS:{kind:string;name:string;icon:string;price:number;site?:string}[]=[
 {kind:'hq',name:'Hauptquartier',icon:'🏰',price:2500000},
 {kind:'warehouseSmall',name:'Lager klein',icon:'📦',price:0,site:'warehouseSmall'},
 {kind:'warehouseMedium',name:'Lager mittel',icon:'🏬',price:0,site:'warehouseMedium'},
 {kind:'warehouseXL',name:'Lager groß',icon:'🏭',price:0,site:'warehouseXL'},
 {kind:'port',name:'Hafen',icon:'⚓',price:0,site:'port'},
 {kind:'inlandPort',name:'Binnenhafen',icon:'🛳️',price:0,site:'inlandPort'},
 {kind:'airport',name:'Flughafen',icon:'✈️',price:0,site:'airport'},
 {kind:'railStation',name:'Güterbahnhof',icon:'🚉',price:0,site:'railStation'},
];
export const buildingPrice=(kind:string)=>{const b=ALLIANCE_BUILDINGS.find(x=>x.kind===kind);if(!b)return 0;return b.price||Math.round((BUILDINGS.find(x=>x.id===b.site)?.price||500000)*1.2);};
export const HQ_COUNTRY_BONUS=.025;
export interface AllianceBuilding {id:string;alliance_id:string;world_id:string;kind:string;name:string;lat:number;lon:number;country:string;created:number}
let ready:Promise<unknown>|undefined;
export const ensureAllianceBuildings=()=>ready??=(async()=>{await db().batch([
 db().prepare("CREATE TABLE IF NOT EXISTS logistics_alliance_buildings(id TEXT PRIMARY KEY,alliance_id TEXT NOT NULL,world_id TEXT NOT NULL,kind TEXT NOT NULL,name TEXT NOT NULL,lat REAL NOT NULL,lon REAL NOT NULL,country TEXT NOT NULL DEFAULT '',created INTEGER NOT NULL)"),
 db().prepare('CREATE INDEX IF NOT EXISTS logistics_alliance_buildings_world ON logistics_alliance_buildings(world_id,alliance_id)'),
 db().prepare("CREATE TABLE IF NOT EXISTS logistics_alliance_market(id TEXT PRIMARY KEY,building_id TEXT NOT NULL,alliance_id TEXT NOT NULL,world_id TEXT NOT NULL,seller_id TEXT NOT NULL,seller_name TEXT NOT NULL,good TEXT NOT NULL,qty REAL NOT NULL,price REAL NOT NULL,status TEXT NOT NULL,buyer_id TEXT,buyer_name TEXT,created INTEGER NOT NULL)"),
 db().prepare('CREATE INDEX IF NOT EXISTS logistics_alliance_market_world ON logistics_alliance_market(world_id,status)'),
]);const cols=(await db().prepare('PRAGMA table_info(logistics_alliances)').all<{name:string}>()).results;
 if(!cols.some(c=>c.name==='build_role'))await db().prepare("ALTER TABLE logistics_alliances ADD COLUMN build_role TEXT NOT NULL DEFAULT 'leader'").run().catch(()=>{});
 if(!cols.some(c=>c.name==='facility_fee'))await db().prepare('ALTER TABLE logistics_alliances ADD COLUMN facility_fee REAL NOT NULL DEFAULT 0').run().catch(()=>{});})().catch(e=>{ready=undefined;throw e;});

const cache=new Map<string,{at:number;rows:AllianceBuilding[]}>();
export const invalidateBuildingCache=()=>cache.clear();
export async function worldBuildings(worldId:string){const hit=cache.get(worldId);if(hit&&Date.now()-hit.at<30000)return hit.rows;await ensureAllianceBuildings();const rows=(await db().prepare('SELECT * FROM logistics_alliance_buildings WHERE world_id=?').bind(worldId).all<AllianceBuilding>()).results;cache.set(worldId,{at:Date.now(),rows});return rows;}
export function buildingSite(b:AllianceBuilding,tag:string):Site|null{const spec=ALLIANCE_BUILDINGS.find(x=>x.kind===b.kind);if(!spec?.site)return null;return {id:'ab-'+b.id,kind:spec.site,name:`${spec.icon} ${b.name} [${tag}]`,lat:b.lat,lon:b.lon,owned:false,cooperative:true,allianceShared:true,allianceBuilding:b.alliance_id,tags:{}} as unknown as Site;}
export async function buildingSitesFor(worldId:string,allianceId:string|undefined,tag='Allianz'){if(!allianceId)return [];return (await worldBuildings(worldId)).filter(b=>b.alliance_id===allianceId).map(b=>buildingSite(b,tag)).filter((p):p is Site=>!!p);}

export async function settleAllianceBuildings(worldId:string,states:Map<string,State>,map:Map<string,string>,prevDay:number,day:number,countryAt:(p:[number,number])=>string){
 const out:D1PreparedStatement[]=[];if(Math.floor(day)<=Math.floor(prevDay))return out;const rows=await worldBuildings(worldId);if(!rows.length)return out;const yesterday=Math.floor(prevDay);
 const fees=new Map((await db().prepare('SELECT id,facility_fee FROM logistics_alliances WHERE world_id=?').bind(worldId).all<{id:string;facility_fee:number}>()).results.map(r=>[r.id,Number(r.facility_fee)||0]));
 const treasury=new Map<string,number>();
 for(const [user,aid] of map){const st=states.get(user);if(!st)continue;const mine=rows.filter(b=>b.alliance_id===aid);if(!mine.length)continue;
  const hq=mine.find(b=>b.kind==='hq');
  if(hq?.country){let rev=0;for(const l of st.lines){if(l.deleted&&l.endDay!==null&&l.endDay<yesterday)continue;const end=st.sites.find(p=>p.id===l.stops.at(-1)?.siteId);if(!end||countryAt([end.lat,end.lon])!==hq.country)continue;const book=st.lineBook?.[l.id]?.[yesterday];if(book)rev+=book.rev;}
   const bonus=Math.round(rev*HQ_COUNTRY_BONUS*100)/100;if(bonus>=1){credit(st,bonus,'Allianz-Aufträge');log(st,`🏰 Hauptquartier-Bonus ${hq.country}: +${bonus.toLocaleString('de-DE',{style:'currency',currency:'EUR'})} (2,5 % auf Einnahmen dort)`,'good');}}
  const fee=fees.get(aid)||0;if(fee>0){const used=mine.filter(b=>st.lines.some(l=>!l.deleted&&l.active&&l.stops.some(s=>s.siteId==='ab-'+b.id)));if(used.length){const total=Math.round(fee*used.length*100)/100;recordFinance(st,total,false,'Allianz-Abgaben');st.cash-=total;st.spent+=total;log(st,`Allianz-Nutzungsgebühr: ${used.length} Gebäude · ${total.toLocaleString('de-DE',{style:'currency',currency:'EUR'})}`,'info');treasury.set(aid,(treasury.get(aid)||0)+total);}}}
 for(const [aid,t] of treasury)out.push(db().prepare('UPDATE logistics_alliances SET treasury=treasury+? WHERE id=?').bind(t,aid));
 return out;
}

export async function settleAllianceMarket(worldId:string,states:Map<string,State>){
 await ensureAllianceBuildings();const out:D1PreparedStatement[]=[];const rows=(await db().prepare("SELECT * FROM logistics_alliance_market WHERE world_id=? AND status='buying' ORDER BY created LIMIT 100").bind(worldId).all<any>()).results;
 for(const r of rows){const seller=states.get(r.seller_id),buyer=states.get(r.buyer_id),site='ab-'+r.building_id,g=r.good as GoodId,name=good(g)?.name||r.good,cost=Math.round(r.qty*r.price*100)/100;let status='sold';
  if(!seller||!buyer||!buyer.sites.some(p=>p.id===site))status='open';
  else if(stock(seller,site,g)+1e-6<r.qty){status='cancelled';log(buyer,`Allianz-Lager: ${name} ist nicht mehr vorrätig – Kauf storniert.`,'warn');}
  else if(buyer.cash<cost){status='open';log(buyer,`Allianz-Lager: zu wenig Geld für ${r.qty} EH ${name}.`,'warn');}
  else{seller.inventory[site]![g]=Math.round((stock(seller,site,g)-r.qty)*100)/100;buyer.inventory[site]??={};buyer.inventory[site][g]=Math.round((stock(buyer,site,g)+r.qty)*100)/100;debit(buyer,cost,'Wareneinkauf');credit(seller,cost,'Warenverkauf');log(buyer,`Allianz-Lager: ${r.qty} EH ${name} von ${r.seller_name} gekauft.`,'good');log(seller,`Allianz-Lager: ${r.qty} EH ${name} an ${r.buyer_name} verkauft · +${cost.toLocaleString('de-DE')} €`,'good');}
  out.push(db().prepare('UPDATE logistics_alliance_market SET status=?,buyer_id=CASE WHEN ?=\'open\' THEN NULL ELSE buyer_id END WHERE id=?').bind(status,status,r.id));}
 return out;
}
