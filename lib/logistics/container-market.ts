import {countryAt,countryAreas,inCountry,type CountryArea} from '../countries-server';
import {allowedCountries} from './world-settings';
import {containerQuantity,containerTerms} from './container-terms';
import {SPECIAL_CARGO,SPECIAL_SHARE,SPECIAL_FEE} from './special-cargo';
export {containerTerms} from './container-terms';
import {seedRegistry,registryByIds} from './partner-registry';
import {env} from 'cloudflare:workers';
import {worldSettings,regionFilter} from './world-region-server';
export {factoryPartner,dailyContainerCount} from './business-rules';
import {factoryPartner,dailyContainerCount,stableHash} from './business-rules';
import {applyRules} from './partner-rules-store';
import type {PartnerRules} from './business-rules';
import {kmBetween,good,profile,RECIPES,type Site,type GoodId} from './engine';
import type {ContainerOffer} from './order-accept';
export type {ContainerOffer} from './order-accept';
export const GOODS_ORDER_SHARE=.35,RUSH_SHARE=.03,RUSH_FEE=1.6;
const FEE_FACTOR:Record<string,number>={hazardous:1.45,pharma:1.5,chilled:1.25,heavy:1.3,livestock:1.3,liquid:1.15,bulk:.9};
function offeredGoods(p:Site):GoodId[]{const pr=profile(p);return [...new Set([...Object.keys(pr.production),...pr.recipes.map(id=>RECIPES.find(r=>r.id===id)?.output).filter(Boolean)])].filter(id=>id!=='containers'&&!!good(id as GoodId)) as GoodId[];}
function wantsGood(p:Site,id:GoodId){const pr=profile(p);return pr.demand.includes(id)||pr.recipes.some(r=>!!RECIPES.find(x=>x.id===r)?.inputs[id]);}
export function orderGoodFor(worldId:string,day:number,p:Site,slot:number):GoodId{const goods=offeredGoods(p);if(!goods.length||stableHash(worldId+'/'+day+'/'+p.id+'/'+slot+'/good-share')%100>=GOODS_ORDER_SHARE*100)return 'containers';return goods[stableHash(worldId+'/'+day+'/'+p.id+'/'+slot+'/good-pick')%goods.length];}
export function orderFee(km:number,id:GoodId){const base=containerTerms(km).fee;return id==='containers'?base:Math.round(base*(FEE_FACTOR[good(id)?.type||'']||1.1)*100)/100;}
const quantityVersionKey=(worldId:string,day:number)=>'container-quantity-v14:'+worldId+':'+Math.floor(day);
export async function resizeOpenContainerQuantities(worldId:string,day:number){
 day=Math.floor(day);const key=quantityVersionKey(worldId,day);if(await env.DB!.prepare('SELECT id FROM logistics_runtime WHERE id=?').bind(key).first())return;
 const rows=(await env.DB!.prepare("SELECT o.id,o.quantity,o.distance_km,o.fee,p.kind FROM logistics_container_offers o JOIN logistics_partner_registry p ON p.id=o.source_id WHERE o.world_id=? AND o.day=? AND o.status='open' AND o.accepted_by IS NULL ORDER BY o.id").bind(worldId,day).all<{id:string;quantity:number;distance_km:number;fee:number;kind:Site['kind']}>()).results;
 const changes=rows.map(r=>({id:r.id,quantity:containerQuantity(r.id,factoryPartner({kind:r.kind} as Site),r.distance_km||Math.max(0,(r.fee-18)/.09))}));
 for(let i=0;i<changes.length;i+=300)await env.DB!.prepare("UPDATE logistics_container_offers SET quantity=(SELECT json_extract(value,'$.quantity') FROM json_each(?) WHERE json_extract(value,'$.id')=logistics_container_offers.id) WHERE world_id=? AND day=? AND status='open' AND accepted_by IS NULL AND id IN (SELECT json_extract(value,'$.id') FROM json_each(?))").bind(JSON.stringify(changes.slice(i,i+300)),worldId,day,JSON.stringify(changes.slice(i,i+300))).run();
 await env.DB!.prepare('INSERT OR IGNORE INTO logistics_runtime(id,updated,payload) VALUES(?,?,?)').bind(key,Date.now(),JSON.stringify({count:changes.length})).run();
}

export const ORDER_PERIOD_DAYS=5,ORDER_POOL=12000;
export const orderPeriodDay=(day:number)=>{const d=Math.floor(day);return d-((d-1)%ORDER_PERIOD_DAYS+ORDER_PERIOD_DAYS)%ORDER_PERIOD_DAYS;};
export async function generation(worldId:string){const r=await env.DB!.prepare('SELECT payload FROM logistics_runtime WHERE id=?').bind('container-gen:'+worldId).first<{payload:string}>();return Number(r?.payload||0);}

export async function regenerateContainerOrders(worldId:string,day:number,rules:PartnerRules){const gen=await generation(worldId)+1,period=orderPeriodDay(day);
 await env.DB!.batch([env.DB!.prepare("DELETE FROM logistics_container_offers WHERE world_id=? AND status='open' AND accepted_by IS NULL").bind(worldId),env.DB!.prepare('INSERT INTO logistics_runtime(id,updated,payload) VALUES(?,?,?) ON CONFLICT(id) DO UPDATE SET updated=excluded.updated,payload=excluded.payload').bind('container-gen:'+worldId,Date.now(),String(gen))]);
 {const t=Date.now();while(Date.now()-t<25000){const r=await ensureContainerDay(worldId,day,rules,40,Math.max(2000,25000-(Date.now()-t)));if(r.pending===0)break;if(r.pending===-1)await new Promise(res=>setTimeout(res,1500));}}const n=await env.DB!.prepare("SELECT count(*) AS n FROM logistics_container_offers WHERE world_id=? AND status='open' AND day<=? AND day>?").bind(worldId,day,day-ORDER_PERIOD_DAYS).first<{n:number}>();return {period,count:n?.n||0,generation:gen};}
type Lite=Site&{city?:string};

export async function sampleRegistry(seed:string,count:number,inside:((lat:number,lon:number)=>boolean)|null,rules:PartnerRules,withPayload=false,maxMs=4000):Promise<Lite[]>{const t0=Date.now();
 const max=(await env.DB!.prepare('SELECT max(rowid) AS m FROM logistics_partner_registry').first<{m:number}>())?.m||0;if(!max)return [];const out:Lite[]=[],seen=new Set<string>();
 for(let round=0;round<30&&out.length<count&&(round===0||Date.now()-t0<maxMs);round++){const ids:number[]=[];for(let i=0;i<1500;i++)ids.push(1+stableHash(seed+'/'+round+'/'+i)%max);
  const rows=(await env.DB!.prepare(`SELECT id,kind,name,lat,lon,${withPayload?'payload,':''}COALESCE(json_extract(payload,'$.tags."addr:city"'),json_extract(payload,'$.tags."addr:town"'),json_extract(payload,'$.tags."addr:village"'),'') AS city FROM logistics_partner_registry WHERE rowid IN (SELECT value FROM json_each(?))`).bind(JSON.stringify(ids)).all<Lite&{payload?:string}>()).results;
  for(const r of rows){if(seen.has(r.id)||rules.items[r.id]?.hidden||inside&&!inside(r.lat,r.lon))continue;seen.add(r.id);let site:Lite=r;if(r.payload){try{site={...JSON.parse(r.payload),city:r.city};}catch{}}out.push(site);if(out.length>=count)break;}}
 return out;}
export const countryOffset=(c:string)=>(stableHash('order-phase/'+c)%(ORDER_PERIOD_DAYS*24))/24;
export const countryPeriod=(day:number,c:string)=>{const o=countryOffset(c);return Math.round((Math.floor((day-o)/ORDER_PERIOD_DAYS)*ORDER_PERIOD_DAYS+o)*24)/24;};
const SELECT_LITE=`r.id,r.kind,r.name,r.lat,r.lon,COALESCE(json_extract(r.payload,'$.tags."addr:city"'),json_extract(r.payload,'$.tags."addr:town"'),json_extract(r.payload,'$.tags."addr:village"'),'') AS city`;
async function stripeRows(stripes:number[][],perStripe:number):Promise<Lite[]>{const out:Lite[]=[];for(let i=0;i<stripes.length;i+=15){const part=stripes.slice(i,i+15),sql=part.map(()=>`SELECT * FROM (SELECT ${SELECT_LITE} FROM logistics_partner_registry r WHERE r.lat BETWEEN ? AND ? AND r.lon BETWEEN ? AND ? LIMIT ?)`).join(' UNION ALL ');const rows=(await env.DB!.prepare(sql).bind(...part.flatMap(b=>[b[0],b[1],b[2],b[3],perStripe])).all<Lite>()).results;out.push(...rows);}return out;}
async function withPayload(ids:string[]){const map=new Map<string,Site>();for(let i=0;i<ids.length;i+=200){const rows=(await env.DB!.prepare('SELECT id,payload FROM logistics_partner_registry WHERE id IN (SELECT value FROM json_each(?))').bind(JSON.stringify(ids.slice(i,i+200))).all<{id:string;payload:string}>()).results;for(const r of rows){try{map.set(r.id,JSON.parse(r.payload));}catch{}}}return map;}
const farCache=new Map<string,Lite[]>();
async function farSample(seed:string,inside:((lat:number,lon:number)=>boolean)|null,rules:PartnerRules){const hit=farCache.get(seed);if(hit)return hit;const list=await sampleRegistry(seed,1500,inside,rules,false,1500).catch(()=>[] as Lite[]);if(farCache.size>20)farCache.clear();if(list.length)farCache.set(seed,list);return list;}
const failCount=new Map<string,number>();export const lastGenError=new Map<string,{country:string;message:string;at:number}>();
const stateKey=(worldId:string,gen:number)=>'container-countries-v1:'+worldId+':'+gen;

export async function ensureContainerDay(worldId:string,day:number,rules:PartnerRules,budget=6,timeMs=3500){await seedRegistry();await ensureOfferGoodColumn();const started=Date.now(),gen=await generation(worldId),key=stateKey(worldId,gen),lockId='container-gen-lock:'+worldId;
 {const row=await env.DB!.prepare('SELECT payload FROM logistics_runtime WHERE id=?').bind(key).first<{payload:string}>(),done:Record<string,number>=row?JSON.parse(row.payload):{},settings=await worldSettings(worldId),allowed=allowedCountries(settings);if(!countryAreas().some(c=>c.name!=='Antarktika'&&(!allowed||allowed.has(c.name))&&done[c.name]!==countryPeriod(day,c.name)))return {generated:0,pending:0};}
 const lock=await env.DB!.prepare('INSERT OR IGNORE INTO logistics_runtime(id,updated,payload) VALUES(?,?,?)').bind(lockId,Date.now(),'1').run();if(!lock.meta?.changes){const stale=await env.DB!.prepare('SELECT updated FROM logistics_runtime WHERE id=?').bind(lockId).first<{updated:number}>();if(stale&&Date.now()-stale.updated<90000)return {generated:0,pending:-1};await env.DB!.prepare('UPDATE logistics_runtime SET updated=? WHERE id=?').bind(Date.now(),lockId).run();}
 try{const row=await env.DB!.prepare('SELECT payload FROM logistics_runtime WHERE id=?').bind(key).first<{payload:string}>(),done:Record<string,number>=row?JSON.parse(row.payload):{};
  const settings=await worldSettings(worldId),inside=regionFilter(settings),allowed=allowedCountries(settings);
  const due=countryAreas().filter(c=>c.name!=='Antarktika'&&(!allowed||allowed.has(c.name))&&done[c.name]!==countryPeriod(day,c.name)).sort((a,b)=>(done[a.name]===undefined?0:1)-(done[b.name]===undefined?0:1)||stableHash(a.name+day)-stableHash(b.name+day));
  let generated=0,processed=0;if(!due.length)return {generated:0,pending:0};const far=await farSample(worldId+'/far/'+Math.floor(day)+'/'+gen,inside,rules);
  for(const c of due){if(processed>=budget||processed>0&&Date.now()-started>timeMs)break;processed++;const period=countryPeriod(day,c.name);
   try{generated+=await generateCountry(worldId,c,period,gen,day,rules,inside,far);done[c.name]=period;failCount.delete(worldId+c.name);}catch(e){const n=(failCount.get(worldId+c.name)||0)+1;failCount.set(worldId+c.name,n);if(n>=5){done[c.name]=period;failCount.delete(worldId+c.name);}lastGenError.set(worldId,{country:c.name,message:String((e as any)?.message||e).slice(0,300),at:Date.now()});try{const {logError}=await import('./error-log');await logError('container-country',e,{world:worldId,country:c.name,attempt:n},'warn');}catch{}}}
  await env.DB!.batch([env.DB!.prepare('INSERT INTO logistics_runtime(id,updated,payload) VALUES(?,?,?) ON CONFLICT(id) DO UPDATE SET updated=excluded.updated,payload=excluded.payload').bind(key,Date.now(),JSON.stringify(done)),
   env.DB!.prepare("DELETE FROM logistics_container_offers WHERE world_id=? AND status='open' AND accepted_by IS NULL AND day<=?").bind(worldId,day-ORDER_PERIOD_DAYS)]);
  return {generated,pending:Math.max(0,due.length-processed)};
 }finally{await env.DB!.prepare('DELETE FROM logistics_runtime WHERE id=?').bind(lockId).run().catch(()=>{});}
}
async function generateCountry(worldId:string,c:CountryArea,period:number,gen:number,day:number,rules:PartnerRules,inside:((lat:number,lon:number)=>boolean)|null,far:Lite[]){
 const seed=worldId+'/'+c.name+'/'+Math.round(period*24)+'/'+gen,count=Math.max(6,Math.min(45,Math.round(Math.sqrt(c.area)*3))),stripes:number[][]=[];
 for(let i=0;i<count;i++){const h=(k:string)=>(stableHash(seed+'/stripe/'+i+'/'+k)%100000)/100000;let pick=h('box')*c.area,box=c.boxes[0];for(const b of c.boxes){if(pick<b.area){box=b;break;}pick-=b.area;}const height=Math.max(.02,(box.maxY-box.minY)/count*.6),lat=box.minY+h('y')*Math.max(0,box.maxY-box.minY-height);stripes.push([lat,lat+height,box.minX,box.maxX]);}
 const rows=(await stripeRows(stripes,Math.ceil(4000/count))).filter((r,i,a)=>a.findIndex(x=>x.id===r.id)===i&&!rules.items[r.id]?.hidden&&(!inside||inside(r.lat,r.lon)));
 await env.DB!.prepare("DELETE FROM logistics_container_offers WHERE world_id=? AND source_country=? AND status='open' AND accepted_by IS NULL AND day<? AND id NOT LIKE 'hol:%'").bind(worldId,c.name,period).run();
 if(!rows.length)return 0;
 const own=rows.filter(r=>inCountry(c.name,[r.lat,r.lon])),wanted=Math.max(3,Math.min(600,Math.round(own.length*.3)));
 const picked=own.filter(p=>factoryPartner(p)||stableHash(p.id+'/'+seed+'/pick')%100<35).slice(0,wanted);if(!picked.length)return 0;
 const payloads=await withPayload(picked.map(p=>p.id)),sources:Lite[]=picked.map(p=>({...(payloads.get(p.id)||p),city:p.city}) as Lite);
 const targets=[...rows,...far],grid=new Map<string,Lite[]>(),cell=(lat:number,lon:number)=>Math.floor(lat)+':'+Math.floor(lon);for(const t of targets){const k=cell(t.lat,t.lon);(grid.get(k)??grid.set(k,[]).get(k)!).push(t);}
 const near=(p:Site,radiusDeg:number)=>{const out:Lite[]=[];const r=Math.ceil(radiusDeg);for(let dy=-r;dy<=r;dy++)for(let dx=-r;dx<=r;dx++){const list=grid.get((Math.floor(p.lat)+dy)+':'+(Math.floor(p.lon)+dx));if(list)out.push(...list);}return out;};
 const active=(await env.DB!.prepare("SELECT source_id,count(*) AS n FROM logistics_container_offers WHERE world_id=? AND status='accepted' AND deadline>? AND source_id IN (SELECT value FROM json_each(?)) GROUP BY source_id").bind(worldId,day,JSON.stringify(sources.map(p=>p.id))).all<{source_id:string;n:number}>()).results,occupied=new Map(active.map(r=>[r.source_id,r.n]));
 const loc=(p:Lite,known?:string)=>({country:known||countryAt([p.lat,p.lon]),city:p.city||p.tags?.['addr:city']||p.tags?.['addr:town']||p.tags?.['addr:village']||''});const offers:ContainerOffer[]=[],pid=Math.round(period*24);
 for(const p of sources){const slots=Math.min(factoryPartner(p)?1+stableHash(p.id+'/'+seed+'/slots')%3:1,Math.max(0,(factoryPartner(p)?5:1)-(occupied.get(p.id)||0)));for(let slot=0;slot<slots;slot++){const g=orderGoodFor(worldId,pid,p,slot);
   const roll=stableHash(p.id+'/'+seed+'/'+slot+'/range')%100,radius=roll<55?.6:roll<85?3:roll<97?10:40;let pool=near(p,radius).filter(x=>x.id!==p.id&&kmBetween([p.lat,p.lon],[x.lat,x.lon])>=2);if(!pool.length)pool=near(p,40).filter(x=>x.id!==p.id&&kmBetween([p.lat,p.lon],[x.lat,x.lon])>=2);if(!pool.length)continue;
   let destination:Lite|undefined;for(let retry=0;retry<(g==='containers'?4:25);retry++){const x=pool[stableHash(seed+'/'+p.id+'/'+slot+'/'+retry)%pool.length];if(g==='containers'||wantsGood(x,g)||x.kind==='warehouse'){destination=x;break;}}destination??=pool[stableHash(seed+'/'+p.id+'/'+slot)%pool.length];
   const id=worldId+':'+pid+':'+gen+':'+p.id+':'+slot,km=kmBetween([p.lat,p.lon],[destination.lat,destination.lon]),a=loc(p,c.name),b=loc(destination);
   const special=g==='containers'&&stableHash(id+'/special')%1000<SPECIAL_SHARE*1000?SPECIAL_CARGO[stableHash(id+'/special-kind')%SPECIAL_CARGO.length].id:null,quantity=special?10+stableHash(id+'/special-q')%31:containerQuantity(id,factoryPartner(p),km),rush=!special&&km<=3000&&quantity<=2000&&stableHash(id+'/rush')%100<RUSH_SHARE*100,terms=containerTerms(km);
   offers.push({id,world_id:worldId,day:period,source_id:p.id,destination_id:destination.id,slot,source_country:a.country,destination_country:b.country,source_city:a.city,destination_city:b.city,distance_km:Math.round(km*10)/10,good:g,quantity,fee:special?Math.round(orderFee(km,g)*SPECIAL_FEE*100)/100:rush?Math.round(orderFee(km,g)*RUSH_FEE*100)/100:orderFee(km,g),special,deadline:period+ORDER_PERIOD_DAYS+(rush?Math.max(2,Math.ceil(terms.days*.45)):terms.days),status:'open',accepted_by:null,rush:rush?1:0});}}
 for(let i=0;i<offers.length;i+=250)await env.DB!.prepare(`INSERT OR IGNORE INTO logistics_container_offers(special,rush,good,id,world_id,day,source_id,destination_id,slot,source_country,destination_country,source_city,destination_city,distance_km,quantity,fee,deadline,status) SELECT json_extract(value,'$.special'),COALESCE(json_extract(value,'$.rush'),0),COALESCE(json_extract(value,'$.good'),'containers'),json_extract(value,'$.id'),json_extract(value,'$.world_id'),json_extract(value,'$.day'),json_extract(value,'$.source_id'),json_extract(value,'$.destination_id'),json_extract(value,'$.slot'),json_extract(value,'$.source_country'),json_extract(value,'$.destination_country'),json_extract(value,'$.source_city'),json_extract(value,'$.destination_city'),json_extract(value,'$.distance_km'),json_extract(value,'$.quantity'),json_extract(value,'$.fee'),json_extract(value,'$.deadline'),'open' FROM json_each(?)`).bind(JSON.stringify(offers.slice(i,i+250))).run();
 return offers.length;
}
export async function containerGenerationStatus(worldId:string,day:number){const gen=await generation(worldId),row=await env.DB!.prepare('SELECT payload FROM logistics_runtime WHERE id=?').bind(stateKey(worldId,gen)).first<{payload:string}>(),done:Record<string,number>=row?JSON.parse(row.payload):{},settings=await worldSettings(worldId),allowed=allowedCountries(settings),all=countryAreas().filter(c=>c.name!=='Antarktika'&&(!allowed||allowed.has(c.name)));return {countries:all.length,current:all.filter(c=>done[c.name]===countryPeriod(day,c.name)).length};}
export {acceptContainerOrder} from './order-accept';
let goodColumn:Promise<void>|undefined;
export function ensureOfferGoodColumn(){return goodColumn??=(async()=>{const cols=(await env.DB!.prepare("PRAGMA table_info(logistics_container_offers)").all<{name:string}>()).results;if(!cols.some(c=>c.name==='good'))await env.DB!.prepare("ALTER TABLE logistics_container_offers ADD COLUMN good text DEFAULT 'containers' NOT NULL").run().catch(()=>{});if(!cols.some(c=>c.name==='special'))await env.DB!.prepare('ALTER TABLE logistics_container_offers ADD COLUMN special text').run().catch(()=>{});if(!cols.some(c=>c.name==='rush'))await env.DB!.prepare("ALTER TABLE logistics_container_offers ADD COLUMN rush integer DEFAULT 0 NOT NULL").run().catch(()=>{});})().catch(e=>{goodColumn=undefined;throw e;});}
