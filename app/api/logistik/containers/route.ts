import {matchingOrderCities} from '../../../../lib/logistics/order-city';
import {logError} from '../../../../lib/logistics/error-log';
import {kmBetween,GOODS} from '../../../../lib/logistics/engine';
import {worldSettings} from '../../../../lib/logistics/world-region-server';
import {allowedCountries} from '../../../../lib/logistics/world-settings';
import {NextRequest,NextResponse} from 'next/server';
import {env} from 'cloudflare:workers';
import {currentUser,settleWorld} from '../online/route';
import {readPartnerRules} from '../../../../lib/logistics/partner-rules-store';
import {registryByIds} from '../../../../lib/logistics/partner-registry';
import {ensureHolidayOrders} from '../../../../lib/logistics/world-projects';
import {ensureContainerDay,generation,sampleRegistry,orderPeriodDay,ORDER_PERIOD_DAYS,type ContainerOffer} from '../../../../lib/logistics/container-market';
async function backfillDistances(worldId:string,period:number){const rows=(await env.DB!.prepare("SELECT o.id,a.lat AS alat,a.lon AS alon,b.lat AS blat,b.lon AS blon FROM logistics_container_offers o JOIN logistics_partner_registry a ON a.id=o.source_id JOIN logistics_partner_registry b ON b.id=o.destination_id WHERE o.world_id=? AND o.day<=? AND o.day>? AND (o.distance_km IS NULL OR o.distance_km<=0) LIMIT 5000").bind(worldId,period,period-ORDER_PERIOD_DAYS).all<{id:string;alat:number;alon:number;blat:number;blon:number}>()).results;if(!rows.length)return;const list=rows.map(r=>({id:r.id,km:Math.round(kmBetween([r.alat,r.alon],[r.blat,r.blon])*10)/10}));for(let i=0;i<list.length;i+=300)await env.DB!.prepare("UPDATE logistics_container_offers SET distance_km=(SELECT json_extract(value,'$.km') FROM json_each(?) WHERE json_extract(value,'$.id')=logistics_container_offers.id) WHERE id IN (SELECT json_extract(value,'$.id') FROM json_each(?))").bind(JSON.stringify(list.slice(i,i+300)),JSON.stringify(list.slice(i,i+300))).run();}
export async function GET(req:NextRequest){try{
 const u=await currentUser(req);if(!u||u.status!=='active')return NextResponse.json({error:'Bitte anmelden.'},{status:401});
 const params=req.nextUrl.searchParams,worldId=params.get('world')||'',siteId=params.get('site')||'';
 if(!worldId||worldId.length>100||siteId.length>100)throw Error('Welt und Betrieb auswählen.');
 if(!await env.DB!.prepare('SELECT user_id FROM logistics_world_companies WHERE world_id=? AND user_id=?').bind(worldId,u.id).first())return NextResponse.json({error:'Bitte der Welt beitreten.'},{status:403});
 const world=await settleWorld(worldId),rules=await readPartnerRules();try{await ensureContainerDay(worldId,world.day,rules,1,800);}catch(e){await logError('container-generation',e,{world:worldId},'warn');}await backfillDistances(worldId,world.day).catch(()=>{});await ensureHolidayOrders(worldId,world.day,orderPeriodDay(world.day),await generation(worldId),(seed,count,inside)=>sampleRegistry(seed,count,inside,rules)).catch(e=>logError('holiday-orders',e,{world:worldId},'warn'));
 const number=(key:string,fallback:number,max:number)=>{const raw=params.get(key);if(raw===null||raw==='')return fallback;const value=Number(raw);if(!Number.isFinite(value))return fallback;return Math.max(0,Math.min(max,value));};
 const offset=Math.floor(number('offset',0,100000)),minKm=number('minKm',0,50000),maxKm=number('maxKm',50000,50000),minQty=number('minQty',0,100000),maxQty=number('maxQty',100000,100000),minDays=number('minDays',0,3650),maxDays=number('maxDays',3650,3650),minReward=number('minReward',0,1000000000000),q=(params.get('q')||'').trim().slice(0,100),text=(key:string)=>(params.get(key)||'').trim().slice(0,100),sourceCountry=text('sourceCountry'),destinationCountry=text('destinationCountry'),sourceCity=text('sourceCity'),destinationCity=text('destinationCity');
 if(minDays>maxDays)throw Error('Ungültiger Bereich für die Restzeit.');
 if(minQty>maxQty)throw Error('Ungültiger Mengenbereich.');
 if(minKm>maxKm)throw Error('Die minimale Entfernung darf nicht über der maximalen Entfernung liegen.');
 const where=["o.world_id=?","((o.day<=? AND o.day>? AND o.status='open' AND o.accepted_by IS NULL) OR (?=1 AND o.status='accepted' AND o.deadline>=?))"],args:(string|number)[]=[worldId,world.day,world.day-ORDER_PERIOD_DAYS,siteId?1:0,world.day];
 if(siteId){where.push('o.source_id=?');args.push(siteId);}
 const regionAllowed=allowedCountries(await worldSettings(worldId));{const allowed=regionAllowed;if(allowed){const list=JSON.stringify([...allowed]);where.push('o.source_country IN (SELECT value FROM json_each(?))','o.destination_country IN (SELECT value FROM json_each(?))');args.push(list,list);}}
 if(params.get('rush')==='1')where.push('o.rush=1');if(params.get('special')==='1')where.push('o.special IS NOT NULL');const goodFilter=text('good');if(goodFilter&&goodFilter!=='all'){if(goodFilter==='containers'){where.push("o.good='containers'");}else if(goodFilter==='goods'){where.push("o.good<>'containers'");}else if(goodFilter.startsWith('type:')){const ids=GOODS.filter(g=>g.type===goodFilter.slice(5)&&g.id!=='containers').map(g=>g.id);where.push('o.good IN (SELECT value FROM json_each(?))');args.push(JSON.stringify(ids));}else{where.push('o.good=?');args.push(goodFilter);}}
 const sides=['source','destination'] as const;
 const cities=(side:typeof sides[number],country:string)=>env.DB!.prepare(
  `SELECT DISTINCT ${side}_city AS name FROM logistics_container_offers
   WHERE world_id=? AND ((day<=? AND day>? AND status='open') OR (?=1 AND status='accepted' AND deadline>=? AND source_id=?))
   AND ${side}_city<>'' AND (?='' OR ${side}_country=?) ORDER BY name`
 ).bind(worldId,world.day,world.day-ORDER_PERIOD_DAYS,siteId?1:0,world.day,siteId,country,country);
 const needsCities=!siteId||!!q||!!sourceCity||!!destinationCity;
 const cityLists=needsCities?await env.DB!.batch<{name:string}>([
  cities('source',sourceCountry),cities('destination',destinationCountry),
 ]):[];
 const sourceNames=cityLists[0]?.results.map(row=>row.name)||[];
 const destinationNames=cityLists[1]?.results.map(row=>row.name)||[];
 const sourceMatches=matchingOrderCities(sourceNames,sourceCity);
 const destinationMatches=matchingOrderCities(destinationNames,destinationCity);
 if(q){
  where.push('(a.name LIKE ? OR b.name LIKE ? OR o.source_city IN (SELECT value FROM json_each(?)) OR o.destination_city IN (SELECT value FROM json_each(?)) OR o.id LIKE ?)');
  args.push('%'+q+'%','%'+q+'%',JSON.stringify(matchingOrderCities(sourceNames,q)),JSON.stringify(matchingOrderCities(destinationNames,q)),'%'+q+'%');
 }
 const nearLat=Number(params.get('nearLat')),nearLon=Number(params.get('nearLon'));
 const near=params.has('nearLat')&&params.has('nearLon')&&Number.isFinite(nearLat)&&Number.isFinite(nearLon)&&Math.abs(nearLat)<=90&&Math.abs(nearLon)<=180;
 async function cityCenter(side:typeof sides[number],country:string,matches:string[]){
  if(!matches.length)return null;
  // Prefer the best exact (including accent-insensitive) match. Averaging
  // places which merely share a prefix can put the radius between cities.
  const result=await env.DB!.prepare(`SELECT avg(p.lat) AS lat,avg(p.lon) AS lon FROM logistics_container_offers o
   JOIN logistics_partner_registry p ON p.id=o.${side}_id
   WHERE o.world_id=? AND o.day<=? AND o.day>? AND o.status='open'
   AND o.${side}_city=? AND (?='' OR o.${side}_country=?)`).bind(worldId,world.day,world.day-ORDER_PERIOD_DAYS,matches[0],country,country).first<{lat:number|null;lon:number|null}>();
  return result?.lat!=null&&result.lon!=null?{lat:result.lat,lon:result.lon}:null;
 }
 function radiusFilter(alias:'a'|'b',center:{lat:number;lon:number},radius:number){
  const {lat,lon}=center,k=Math.max(.05,Math.cos(lat*Math.PI/180)),dLat=radius/111,dLon=dLat/k;
  where.push(`${alias}.lat BETWEEN ? AND ?`,`${alias}.lon BETWEEN ? AND ?`,
   `((${alias}.lat-?)*111)*((${alias}.lat-?)*111)+((${alias}.lon-?)*111*?)*((${alias}.lon-?)*111*?)<=?`);
  args.push(lat-dLat,lat+dLat,lon-dLon,lon+dLon,lat,lat,lon,k,lon,k,radius*radius);
 }
 const radiusKm=number('radiusKm',0,5000),destRadiusKm=number('destRadiusKm',0,5000);
 const [center,destCenter]=await Promise.all([
  radiusKm>0?(near?{lat:nearLat,lon:nearLon}:cityCenter('source',sourceCountry,sourceMatches)):null,
  destRadiusKm>0?cityCenter('destination',destinationCountry,destinationMatches):null,
 ]);
 if(center)radiusFilter('a',center,radiusKm);
 if(destCenter)radiusFilter('b',destCenter,destRadiusKm);
 for(const [column,value] of [['source_country',sourceCountry],['destination_country',destinationCountry]] as const){
  if(value){where.push(`o.${column}=? COLLATE NOCASE`);args.push(value);}
 }
 for(const [column,value,matches] of [['source_city',center?'':sourceCity,sourceMatches],['destination_city',destCenter?'':destinationCity,destinationMatches]] as const){
  if(value){where.push(`o.${column} IN (SELECT value FROM json_each(?))`);args.push(JSON.stringify(matches));}
 }
 const distance="CASE WHEN o.distance_km>0 THEN o.distance_km ELSE MAX(0,(o.fee-18)/.09) END";
 where.push(`${distance}>=?`,`${distance}<=?`,'o.quantity>=?','o.quantity<=?','o.deadline-?>=?','o.deadline-?<=?','o.quantity*o.fee>=?',"NOT EXISTS(SELECT 1 FROM logistics_partner_rules pr WHERE pr.id IN (o.source_id,o.destination_id) AND json_extract(pr.payload,'$.hidden')=1)");args.push(minKm,maxKm,minQty,maxQty,world.day,minDays,world.day,maxDays,minReward);
 const sorts:Record<string,string>={distanceAsc:distance+' ASC,o.quantity DESC',distanceDesc:distance+' DESC',reward:'o.fee*o.quantity DESC',rewardPerEh:'o.fee DESC',quantity:'o.quantity DESC',deadline:'o.deadline ASC'},sort=sorts[params.get('sort')||'distanceAsc']||sorts.distanceAsc;
 const rows=(await env.DB!.prepare(`SELECT o.*,a.name AS sourceName,b.name AS destinationName,a.lat AS sourceLat,a.lon AS sourceLon,b.lat AS destinationLat,b.lon AS destinationLon FROM logistics_container_offers o JOIN logistics_partner_registry a ON a.id=o.source_id JOIN logistics_partner_registry b ON b.id=o.destination_id WHERE ${where.join(' AND ')} ORDER BY ${sort},o.id LIMIT 100 OFFSET ?`).bind(...args,offset).all<ContainerOffer&{sourceName:string;destinationName:string;sourceLat:number;sourceLon:number;destinationLat:number;destinationLon:number}>()).results;
 const total=await env.DB!.prepare(`SELECT count(*) AS n FROM logistics_container_offers o JOIN logistics_partner_registry a ON a.id=o.source_id JOIN logistics_partner_registry b ON b.id=o.destination_id WHERE ${where.join(' AND ')}`).bind(...args).first<{n:number}>();
 const partners=await registryByIds([...new Set(rows.flatMap(r=>[r.source_id,r.destination_id]))]),lookup=new Map(partners.map(p=>[p.id,p]));
 let facets:unknown=undefined;if(!siteId){const hi=world.day,lo=world.day-ORDER_PERIOD_DAYS;const lists=await env.DB!.batch([
  env.DB!.prepare("SELECT DISTINCT source_country AS name FROM logistics_container_offers WHERE world_id=? AND day<=? AND day>? AND status='open' AND source_country<>'' ORDER BY name").bind(worldId,hi,lo),
  env.DB!.prepare("SELECT DISTINCT destination_country AS name FROM logistics_container_offers WHERE world_id=? AND day<=? AND day>? AND status='open' AND destination_country<>'' ORDER BY name").bind(worldId,hi,lo),
 ]);const names=(i:number)=>lists[i].results.map((r:any)=>r.name).filter((n:string)=>!regionAllowed||regionAllowed.has(n));
 facets={sourceCountries:names(0),destinationCountries:names(1),
  sourceCities:(sourceCity?sourceMatches:sourceNames).slice(0,500),
  destinationCities:(destinationCity?destinationMatches:destinationNames).slice(0,500)};
 }
 let genStatus:any=null;try{const {containerGenerationStatus,lastGenError}=await import('../../../../lib/logistics/container-market');genStatus={...await containerGenerationStatus(worldId,world.day),error:lastGenError.get(worldId)?.message||null};}catch{}
 return NextResponse.json({genStatus,day:Math.floor(world.day),periodDay:orderPeriodDay(world.day),periodDays:ORDER_PERIOD_DAYS,nextRefreshDay:orderPeriodDay(world.day)+ORDER_PERIOD_DAYS,offers:rows.filter(r=>lookup.has(r.source_id)&&lookup.has(r.destination_id)).map(r=>({...r,km:Math.round(kmBetween([r.sourceLat,r.sourceLon],[r.destinationLat,r.destinationLon])*10)/10,sourceName:lookup.get(r.source_id)!.name,destinationName:lookup.get(r.destination_id)!.name,mine:r.accepted_by===u.id})),sites:partners,totalOffers:total?.n||0,offset,hasMore:offset+rows.length<(total?.n||0),facets},{headers:{'Cache-Control':'no-store'}});
 }catch(e:any){await logError('api:containers',e,{url:req.url});return NextResponse.json({error:e.message},{status:422});}}
