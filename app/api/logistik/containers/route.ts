import {kmBetween} from '../../../../lib/logistics/engine';
import {NextRequest,NextResponse} from 'next/server';
import {env} from 'cloudflare:workers';
import {currentUser,settleWorld} from '../online/route';
import {readPartnerRules} from '../../../../lib/logistics/partner-rules-store';
import {registryByIds} from '../../../../lib/logistics/partner-registry';
import {ensureContainerDay,type ContainerOffer} from '../../../../lib/logistics/container-market';
export async function GET(req:NextRequest){try{
 const u=await currentUser(req);if(!u||u.status!=='active')return NextResponse.json({error:'Bitte anmelden.'},{status:401});
 const params=req.nextUrl.searchParams,worldId=params.get('world')||'',siteId=params.get('site')||'';
 if(!worldId||worldId.length>100||siteId.length>100)throw Error('Welt und Betrieb auswählen.');
 if(!await env.DB!.prepare('SELECT user_id FROM logistics_world_companies WHERE world_id=? AND user_id=?').bind(worldId,u.id).first())return NextResponse.json({error:'Bitte der Welt beitreten.'},{status:403});
 const world=await settleWorld(worldId),rules=await readPartnerRules();await ensureContainerDay(worldId,world.day,rules);
 const number=(key:string,fallback:number,max:number)=>{const raw=params.get(key);if(raw===null||raw==='')return fallback;const value=Number(raw);if(!Number.isFinite(value)||value<0||value>max)throw Error('Ungültiger Zahlenfilter: '+key);return value;};
 const offset=Math.floor(number('offset',0,100000)),minKm=number('minKm',0,50000),maxKm=number('maxKm',50000,50000),minQty=number('minQty',0,100000),maxQty=number('maxQty',100000,100000),minDays=number('minDays',0,3650),maxDays=number('maxDays',3650,3650),minReward=number('minReward',0,1000000000000),q=(params.get('q')||'').trim().slice(0,100),text=(key:string)=>(params.get(key)||'').trim().slice(0,100),sourceCountry=text('sourceCountry'),destinationCountry=text('destinationCountry'),sourceCity=text('sourceCity'),destinationCity=text('destinationCity');
 if(minDays>maxDays)throw Error('Ungültiger Bereich für die Restzeit.');
 if(minQty>maxQty)throw Error('Ungültiger Mengenbereich.');
 if(minKm>maxKm)throw Error('Die minimale Entfernung darf nicht über der maximalen Entfernung liegen.');
 const where=["o.world_id=?","((o.day=? AND o.status='open' AND o.accepted_by IS NULL) OR (?=1 AND o.status='accepted' AND o.deadline>=?))"],args:(string|number)[]=[worldId,Math.floor(world.day),siteId?1:0,world.day];
 if(siteId){where.push('o.source_id=?');args.push(siteId);}
 if(q){where.push('(a.name LIKE ? OR b.name LIKE ? OR o.source_city LIKE ? OR o.destination_city LIKE ? OR o.id LIKE ?)');args.push(...Array(5).fill('%'+q+'%'));}
 for(const [column,value,partial]of [['source_country',sourceCountry,false],['destination_country',destinationCountry,false],['source_city',sourceCity,true],['destination_city',destinationCity,true]] as const)if(value){where.push(`o.${column} ${partial?'LIKE':'='} ? COLLATE NOCASE`);args.push(partial?'%'+value+'%':value);}
 // Older accepted orders retain their original quantities and distances.
 const distance="CASE WHEN o.distance_km>0 THEN o.distance_km ELSE MAX(0,(o.fee-18)/.09) END";
 where.push(`${distance}>=?`,`${distance}<=?`,'o.quantity>=?','o.quantity<=?','o.deadline-?>=?','o.deadline-?<=?','o.quantity*o.fee>=?',"NOT EXISTS(SELECT 1 FROM logistics_partner_rules pr WHERE pr.id IN (o.source_id,o.destination_id) AND json_extract(pr.payload,'$.hidden')=1)");args.push(minKm,maxKm,minQty,maxQty,world.day,minDays,world.day,maxDays,minReward);
 const sorts:Record<string,string>={distanceAsc:distance+' ASC',distanceDesc:distance+' DESC',reward:'o.fee*o.quantity DESC',rewardPerEh:'o.fee DESC',quantity:'o.quantity DESC',deadline:'o.deadline ASC'},sort=sorts[params.get('sort')||'distanceAsc']||sorts.distanceAsc;
 const rows=(await env.DB!.prepare(`SELECT o.*,a.name AS sourceName,b.name AS destinationName,a.lat AS sourceLat,a.lon AS sourceLon,b.lat AS destinationLat,b.lon AS destinationLon FROM logistics_container_offers o JOIN logistics_partner_registry a ON a.id=o.source_id JOIN logistics_partner_registry b ON b.id=o.destination_id WHERE ${where.join(' AND ')} ORDER BY ${sort},o.id LIMIT 100 OFFSET ?`).bind(...args,offset).all<ContainerOffer&{sourceName:string;destinationName:string;sourceLat:number;sourceLon:number;destinationLat:number;destinationLon:number}>()).results;
 const total=await env.DB!.prepare(`SELECT count(*) AS n FROM logistics_container_offers o JOIN logistics_partner_registry a ON a.id=o.source_id JOIN logistics_partner_registry b ON b.id=o.destination_id WHERE ${where.join(' AND ')}`).bind(...args).first<{n:number}>();
 const partners=await registryByIds([...new Set(rows.flatMap(r=>[r.source_id,r.destination_id]))]),lookup=new Map(partners.map(p=>[p.id,p]));
 let facets:unknown=undefined;if(!siteId){const day=Math.floor(world.day);const lists=await env.DB!.batch([
  env.DB!.prepare("SELECT DISTINCT source_country AS name FROM logistics_container_offers WHERE world_id=? AND day=? AND status='open' AND source_country<>'' ORDER BY name").bind(worldId,day),
  env.DB!.prepare("SELECT DISTINCT destination_country AS name FROM logistics_container_offers WHERE world_id=? AND day=? AND status='open' AND destination_country<>'' ORDER BY name").bind(worldId,day),
  env.DB!.prepare("SELECT DISTINCT source_city AS name FROM logistics_container_offers WHERE world_id=? AND day=? AND status='open' AND source_city<>'' AND (?='' OR source_country=?) ORDER BY name LIMIT 500").bind(worldId,day,sourceCountry,sourceCountry),
  env.DB!.prepare("SELECT DISTINCT destination_city AS name FROM logistics_container_offers WHERE world_id=? AND day=? AND status='open' AND destination_city<>'' AND (?='' OR destination_country=?) ORDER BY name LIMIT 500").bind(worldId,day,destinationCountry,destinationCountry)
 ]);const names=(i:number)=>lists[i].results.map((r:any)=>r.name);facets={sourceCountries:names(0),destinationCountries:names(1),sourceCities:names(2),destinationCities:names(3)};}
 return NextResponse.json({day:Math.floor(world.day),offers:rows.filter(r=>lookup.has(r.source_id)&&lookup.has(r.destination_id)).map(r=>({...r,km:Math.round(kmBetween([r.sourceLat,r.sourceLon],[r.destinationLat,r.destinationLon])*10)/10,sourceName:lookup.get(r.source_id)!.name,destinationName:lookup.get(r.destination_id)!.name,mine:r.accepted_by===u.id})),sites:partners,totalOffers:total?.n||0,offset,hasMore:offset+rows.length<(total?.n||0),facets},{headers:{'Cache-Control':'no-store'}});
 }catch(e:any){return NextResponse.json({error:e.message},{status:422});}}
