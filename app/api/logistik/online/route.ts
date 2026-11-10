import {sameOrigin} from '../../../../lib/same-origin';
import {encodeCompany,decodeCompany} from '../../../../lib/logistics/company-codec';
import {makeUsedOffer,buyUsedVehicle,withdrawUsedVehicle,dealerValue} from '../../../../lib/logistics/vehicle-sales';
import {readUsedVehicleOffer,readUsedVehicleOffers,saveUsedVehicleOffer} from '../../../../lib/logistics/used-vehicle-store';
import {harborKind,checkHarborPlacement} from '../../../../lib/logistics/harbor-placement';
import {adjustCompanyCash} from '../../../../lib/logistics/admin-cash';
import {continuePartnerImports} from '../../../../lib/logistics/partner-import';
import {connectRoad,prepareVehicleRoads,prefetchRoadChain} from '../../../../lib/logistics/road-routing';
import {readPartnerRules,applyStateRules} from '../../../../lib/logistics/partner-rules-store';
import {newMarket,resetMarket} from '../../../../lib/logistics/business-rules';
import {ensureContainerDay,acceptContainerOrder,factoryPartner,type ContainerOffer} from '../../../../lib/logistics/container-market';
import {registryByIds} from '../../../../lib/logistics/partner-registry';
import {NextRequest,NextResponse} from 'next/server';
import {env} from 'cloudflare:workers';
import {allianceMap,allySites,allianceSitesFor,settleAllianceOrders} from '../../../../lib/logistics/alliance-server';
import {seasonFinalStatements} from '../../../../lib/logistics/season-server';
import {logError} from '../../../../lib/logistics/error-log';
import {hireDriver,fireDriver,autoCrew,driversActive} from '../../../../lib/logistics/drivers';
import {newState as newCompanyState} from '../../../../lib/logistics/engine';
import {readCandidate,takeCandidate,returnToMarket,freshCandidate,refreshDriverMarket} from '../../../../lib/logistics/driver-market';
import {isPremium} from '../../../../lib/logistics/branding-server';
import {usedVehicleKey} from '../../../../lib/logistics/used-vehicle-store';
import {seasonEndDay} from '../../../../lib/logistics/world-settings';
import {parseSettings,settingsSummary,modeGroup,buildingModeGroup,MODE_GROUPS} from '../../../../lib/logistics/world-settings';
import {ensureWorldSettingsColumn,assertInRegion} from '../../../../lib/logistics/world-region-server';
import {MAX_FLEET_VEHICLES,GOODS,VEHICLES,depotFor,profile,stock,normalizeFreightState,routePartners,mergeSites,stepSharedWorld,type Coords,type GoodId,type Site,type State,type Track} from '../../../../lib/logistics/engine.ts';
import {applyAction,type OnlineAction,type OnlineCommand} from '../../../../lib/logistics/online-actions.ts';
import {settleTrade,tradeTerminal} from '../../../../lib/logistics/cooperation.ts';
import {advanceCompany,clockTarget,companyAtDay,worldTickMs} from '../../../../lib/logistics/world-clock.ts';
import {GET as getPartners} from '../partners/route';
import {GET as queryPartners} from '../partners/query/route';
import {GET as getRoad} from '../route/route';
export const dynamic='force-dynamic';
const reply=(data:unknown,status=200)=>NextResponse.json(data,{status,headers:{'Cache-Control':'no-store'}});
const db=()=>{if(!env.DB)throw Error('Cloudflare D1 nicht eingerichtet.');return env.DB;};
interface User {id:string;name:string;status:string;role:string}
interface World {settings?:string;market:string;description:string;status:string;time_scale:number;id:string;name:string;owner_id:string;day:number;last_tick:number;tick_ms:number;revision:number;created:number}
interface Company {name:string;world_id:string;user_id:string;state:string;revision:number;last_action:string|null;updated:number}
interface Offer {id:string;world_id:string;sender_id:string;receiver_id:string;site_id:string;good:GoodId;quantity_unit?:string;quantity:number;price:number;status:string;expires:number}
export async function currentUser(req:Request):Promise<User|null>{
 const token=(req.headers.get('cookie')||'').split(';').map(x=>x.trim()).find(x=>x.startsWith('wv_session='))?.slice(11);
 if(!token||token.length>150)return null;
 const digest=Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256',new TextEncoder().encode(token))),x=>x.toString(16).padStart(2,'0')).join('');
 return db().prepare('SELECT u.id,u.name,u.status,u.role FROM users u JOIN sessions s ON s.user_id=u.id WHERE s.token=? AND s.expires>?').bind(digest,Date.now()).first<User>();
}
const readWorld=async(id:string)=>{await ensureWorldSettingsColumn();return db().prepare('SELECT * FROM logistics_worlds WHERE id=?').bind(id).first<World>();};
const readCompany=(world:string,user:string)=>db().prepare('SELECT * FROM logistics_world_companies WHERE world_id=? AND user_id=?').bind(world,user).first<Company>();
const readCompanies=async(world:string)=>(await db().prepare('SELECT * FROM logistics_world_companies WHERE world_id=? ORDER BY user_id').bind(world).all<Company>()).results;
async function borrowedTracks(world:string,user:string):Promise<Track[]>{
 const rows=await db().prepare('SELECT w.state FROM logistics_world_permissions p JOIN logistics_world_companies w ON w.user_id=p.owner_id AND w.world_id=p.world_id WHERE p.world_id=? AND p.grantee_id=? AND p.enabled=1').bind(world,user).all<{state:string}>();
 return (await Promise.all(rows.results.map(async r=>normalizeFreightState(await decodeCompany(r.state)).tracks||[]))).flat();
}
function guard(world:World,companies:Company[]=[],rulesRevision?:number){
 const clauses=['EXISTS(SELECT 1 FROM logistics_worlds WHERE id=? AND revision=?)'];const args:(string|number)[]=[world.id,world.revision];
 for(const row of companies){clauses.push('EXISTS(SELECT 1 FROM logistics_world_companies WHERE world_id=? AND user_id=? AND revision=?)');args.push(world.id,row.user_id,row.revision);}
 if(rulesRevision!==undefined){clauses.push("COALESCE((SELECT revision FROM logistics_rule_revision WHERE id='global'),0)=?");args.push(rulesRevision);}
 const id=crypto.randomUUID();return {id,statement:db().prepare(`INSERT INTO logistics_world_guards(id,valid) VALUES(?,CASE WHEN ${clauses.join(' AND ')} THEN 1 ELSE 0 END)`).bind(id,...args)};
}
async function commit(world:World,rows:Company[],statements:D1PreparedStatement[],rulesRevision?:number){
 const g=guard(world,rows,rulesRevision);await db().batch([g.statement,...statements,db().prepare('UPDATE logistics_worlds SET revision=revision+1 WHERE id=?').bind(world.id),db().prepare('DELETE FROM logistics_world_guards WHERE id=?').bind(g.id)]);
}
export async function adjustAdminCompanyCash(actor:User,body:{worldId:string;userId:string;amount:number;reason:string;requestId:string}){
 if(actor.status!=='active'||!['admin','owner'].includes(actor.role))throw Error('Nur für Administratoren.');
 if(typeof body.worldId!=='string'||typeof body.userId!=='string'||body.worldId.length>100||body.userId.length>100||typeof body.requestId!=='string'||!/^[0-9a-f-]{36}$/i.test(body.requestId))throw Error('Spedition, Welt und Buchungskennung fehlen.');
 const auditId='cash:'+body.requestId;
 for(let attempt=0;attempt<6;attempt++){
  const previous=await db().prepare('SELECT actor,action,target FROM admin_audit WHERE id=?').bind(auditId).first<{actor:string;action:string;target:string}>();if(previous){const detail=JSON.parse(previous.action);if(previous.actor!==actor.id||previous.target!==body.userId||detail.worldId!==body.worldId||detail.amount!==body.amount||detail.reason!==body.reason.trim())throw Error('Buchungskennung bereits anders verwendet.');return {...detail,duplicate:true};}
  const world=await settleWorld(body.worldId),row=await readCompany(body.worldId,body.userId);if(!row)throw Error('Spedition in dieser Welt nicht gefunden.');
  const state=normalizeFreightState(await decodeCompany(row.state)),result=adjustCompanyCash(state,body.amount,body.reason),detail={type:'logistics.companyCash',worldId:body.worldId,reason:body.reason.trim(),...result};
  try{await commit(world,[row],[db().prepare('UPDATE logistics_world_companies SET state=?,revision=revision+1,updated=? WHERE world_id=? AND user_id=?').bind(await encodeCompany(state),Date.now(),body.worldId,body.userId),db().prepare('INSERT INTO admin_audit(id,actor,action,target,created) VALUES(?,?,?,?,?)').bind(auditId,actor.id,JSON.stringify(detail),body.userId,Date.now())]);return detail;}catch(e){if(attempt===5)throw e;}
 }
 throw Error('Buchung bitte erneut versuchen.');
}
const settling=new Map<string,Promise<World>>();
const behind=new Set<string>();
export function settleWorld(id:string,budgetMs=1500):Promise<World>{const running=settling.get(id);if(running){if(budgetMs>=10000)return running;return readWorld(id).then(w=>{if(!w)throw Error('Diese Welt existiert nicht.');return w;});}const job=settleWorldNow(id,budgetMs).finally(()=>{settling.delete(id);behind.delete(id);});settling.set(id,job);return job;}
export function catchUpHours(world:World,now=Date.now()){return Math.max(0,(clockTarget(world,now)-world.day)*24);}
const catchRate=new Map<string,number>();
export function catchUpSeconds(world:World){const hours=catchUpHours(world);if(hours<=0)return 0;const rate=(catchRate.get(world.id)||.5)*.7,net=rate-(world.time_scale||1)/3600;return net>0?Math.ceil(hours/net):null;}
async function settleWorldNow(id:string,budgetMs:number):Promise<World>{
 const settleAt=Date.now();let latest:World|undefined,startDay:number|undefined;
 const measure=(w:World)=>{const seconds=(Date.now()-settleAt)/1000;if(startDay!==undefined&&seconds>.5){const rate=(w.day-startDay)*24/seconds,old=catchRate.get(id);catchRate.set(id,old?old*.6+rate*.4:rate);}};
 for(let attempt=0;attempt<2000;attempt++){
  const world=await readWorld(id);if(!world)throw Error('Diese Welt existiert nicht.');latest=world;startDay??=world.day;if(settleAt-world.last_tick<4000)return world;
  if(attempt>0&&Date.now()-settleAt>budgetMs){measure(world);behind.add(id);return world;}
  const seasonEnd=seasonEndDay(parseSettings(world.settings));
  const target=Math.min(clockTarget(world,settleAt),seasonEnd??Infinity);if(target<=world.day+1e-8)return world;
  const next=Math.min(target,world.day+1/72),rows=await readCompanies(id);
  const permissions=(await db().prepare('SELECT owner_id,grantee_id FROM logistics_world_permissions WHERE world_id=? AND enabled=1').bind(id).all<{owner_id:string;grantee_id:string}>()).results;
  const rules=await readPartnerRules(),market={...newMarket(world.day),...JSON.parse(world.market||'{}')};
  const states=new Map(await Promise.all(rows.map(async r=>[r.user_id,applyStateRules(normalizeFreightState(await decodeCompany(r.state)),rules)] as [string,State])));
  const statements:D1PreparedStatement[]=[];
  {const cfg=parseSettings(world.settings);for(const st of states.values()){st.maintenanceOff=!cfg.maintenance;st.fuelOff=!cfg.fuel;st.driversOff=!cfg.drivers;}}
  for(const row of rows){const state=states.get(row.user_id)!;state.borrowedTracks=permissions.filter(p=>p.grantee_id===row.user_id).flatMap(p=>states.get(p.owner_id)?.tracks||[]);}
  {const amap=await allianceMap(id);for(const row of rows){const aid=amap.get(row.user_id);if(!aid)continue;const own=states.get(row.user_id)!;own.sites.push(...allySites(own,rows.filter(r=>r.user_id!==row.user_id&&amap.get(r.user_id)===aid).map(r=>({id:r.user_id,name:r.name||'Spedition',state:states.get(r.user_id)!})),amap.storage.get(aid)!==false));}}
  if(attempt===0)for(const state of states.values())await prepareVehicleRoads(state);
  const advanced=stepSharedWorld(states,next,market);
  try{statements.push(...await settleAllianceOrders(id,advanced,next));}catch(e){await logError('settle:alliance-orders',e,{world:id},'error');}
  for(const row of rows){const state=advanced.get(row.user_id)!;delete state.borrowedTracks;statements.push(db().prepare('UPDATE logistics_world_companies SET state=?,updated=? WHERE world_id=? AND user_id=?').bind(await encodeCompany(state),Date.now(),id,row.user_id));}
  const deadlines=[...advanced.values()].flatMap(s=>s.contracts.filter(c=>c.kind==='haulage'&&!c.cancelled&&c.endDay>=s.day&&c.delivered<(c.total||0)).map(c=>({id:c.id,deadline:c.endDay})));if(deadlines.length)statements.push(db().prepare("UPDATE logistics_container_offers SET deadline=(SELECT json_extract(value,'$.deadline') FROM json_each(?) WHERE json_extract(value,'$.id')=logistics_container_offers.id) WHERE world_id=? AND status='accepted' AND id IN (SELECT json_extract(value,'$.id') FROM json_each(?) WHERE json_extract(value,'$.deadline')>logistics_container_offers.deadline)").bind(JSON.stringify(deadlines),id,JSON.stringify(deadlines)));
  const completed=[...advanced.values()].flatMap(s=>s.contracts.filter(c=>c.kind==='haulage'&&c.delivered>=(c.total||Infinity)).map(c=>c.id));if(completed.length)statements.push(db().prepare("UPDATE logistics_container_offers SET status='completed' WHERE world_id=? AND status='accepted' AND id IN (SELECT value FROM json_each(?))").bind(id,JSON.stringify(completed)));statements.push(db().prepare("UPDATE logistics_container_offers SET status='expired' WHERE world_id=? AND status='accepted' AND deadline<?").bind(id,next));
  if(seasonEnd!==null&&next>=seasonEnd-1e-9){try{const amap=await allianceMap(id),tags=new Map<string,string>();const tagRows=(await db().prepare('SELECT m.user_id,a.tag FROM logistics_alliance_members m JOIN logistics_alliances a ON a.id=m.alliance_id WHERE m.world_id=?').bind(id).all<{user_id:string;tag:string}>()).results;for(const t of tagRows)if(amap.has(t.user_id))tags.set(t.user_id,t.tag);statements.push(...await seasonFinalStatements(id,advanced,new Map(rows.map(r=>[r.user_id,r.name||''])),tags));}catch(e){await logError('settle:season-final',e,{world:id},'error');}}
  statements.push(db().prepare('UPDATE logistics_worlds SET day=?,last_tick=?,market=? WHERE id=?').bind(next,world.last_tick+(next-world.day)*worldTickMs(world),JSON.stringify(market),id));
  try{await commit(world,[],statements,rules.revision);}catch{continue;}
  await ensureContainerDay(id,next,rules);

 }
 if(latest){behind.add(id);return latest;}
 throw Error('Diese Welt existiert nicht.');
}
async function join(world:World,u:User,name:string){
 const row=await readCompany(world.id,u.id);if(row)return;
 if(world.status!=='running')throw Error('Diese Welt ist noch nicht geöffnet.');
 if(name.trim().length<3||name.trim().length>50)throw Error('Speditionsname: 3–50 Zeichen.');
 const duplicate=await db().prepare('SELECT user_id FROM logistics_world_companies WHERE world_id=? AND lower(name)=lower(?)').bind(world.id,name.trim()).first();if(duplicate)throw Error('Dieser Speditionsname ist in der Welt bereits vergeben.');
 const count=await db().prepare('SELECT count(*) AS n FROM logistics_world_companies WHERE world_id=?').bind(world.id).first<{n:number}>();
 if((count?.n||0)>=50)throw Error('Diese Welt ist voll (50 Speditionen).');
 const start=companyAtDay(world.day,name.trim()),cfg=parseSettings(world.settings);start.cash=cfg.startCash;
 await commit(world,[],[db().prepare('INSERT OR IGNORE INTO logistics_world_companies(world_id,user_id,name,state,revision,updated) VALUES(?,?,?,?,0,?)').bind(world.id,u.id,name.trim(),JSON.stringify(start),Date.now())]);
}
function geometrySignature(s:State){let h=2166136261;const add=(t:string)=>{for(let i=0;i<t.length;i++){h^=t.charCodeAt(i);h=Math.imul(h,16777619);}};for(const r of s.roadRoutes||[])add(r.fromId+'>'+r.toId+':'+r.path.length+';');for(const l of s.lines){add('|'+l.id);for(const r of l.legs||[])add(r.fromId+'>'+r.toId+':'+r.path.length+';');}return (h>>>0).toString(36)+'.'+(s.roadRoutes?.length||0)+'.'+s.lines.length;}
async function snapshot(u:User,worldId:string,geo=''){
 const results=await db().batch([
  db().prepare('SELECT * FROM logistics_worlds WHERE id=?').bind(worldId),
  db().prepare('SELECT * FROM logistics_world_companies WHERE world_id=? AND user_id=?').bind(worldId,u.id),
  db().prepare("SELECT c.user_id AS id,COALESCE(NULLIF(c.name,''),u.name) AS name,c.updated FROM logistics_world_companies c JOIN users u ON u.id=c.user_id WHERE c.world_id=? AND u.status='active' ORDER BY u.name").bind(worldId),
  db().prepare("SELECT o.*,a.name AS sender_name,b.name AS receiver_name FROM logistics_world_offers o JOIN users a ON a.id=o.sender_id JOIN users b ON b.id=o.receiver_id WHERE o.world_id=? AND (o.sender_id=? OR o.receiver_id=?) ORDER BY o.created DESC LIMIT 100").bind(worldId,u.id,u.id),
  db().prepare('SELECT owner_id,grantee_id,enabled FROM logistics_world_permissions WHERE world_id=? AND (owner_id=? OR grantee_id=?)').bind(worldId,u.id,u.id),
 ]);
 const world=results[0].results[0] as unknown as World,row=results[1].results[0] as unknown as Company;
 if(!row)throw Error('Bitte zuerst dieser Welt beitreten.');
 const rules=await readPartnerRules();const state=applyStateRules(normalizeFreightState(await decodeCompany(row.state)),rules);state.borrowedTracks=await borrowedTracks(worldId,u.id);state.sites.push(...await allianceSitesFor(worldId,u.id,state));state.maintenanceOff=!parseSettings(world.settings).maintenance;state.fuelOff=!parseSettings(world.settings).fuel;state.driversOff=!parseSettings(world.settings).drivers;
 const geometrySig=geometrySignature(state),geometryOmitted=!!geo&&geo===geometrySig;if(geometryOmitted){delete state.roadRoutes;for(const l of state.lines)delete l.legs;}
 return {geometrySig,geometryOmitted,state,partnerRules:rules,market:{...newMarket(world.day),...JSON.parse(world.market||'{}')},companyName:row.name||state.companyName||u.name,revision:row.revision,user:u.name,userId:u.id,role:u.role,serverNow:Date.now(),world:{catchUpHours:Math.round(catchUpHours(world)*10)/10,catchUpSeconds:catchUpSeconds(world),revision:world.revision,id:world.id,name:world.name,day:world.day,timeScale:world.time_scale,simTime:world.created+(world.day-1)*86400000,status:world.status,tickMs:worldTickMs(world),settings:settingsSummary(parseSettings(world.settings))},companies:results[2].results,offers:results[3].results.map((raw:unknown)=>{const o=raw as Offer;return ({...o,quantity:Number(o.quantity)*(o.quantity_unit==='EH'?1:10)});}),permissions:results[4].results};
}
function validPoint(p:unknown):p is Coords{return Array.isArray(p)&&p.length===2&&p.every(x=>typeof x==='number'&&Number.isFinite(x))&&Math.abs(p[0])<=85&&Math.abs(p[1])<=180;}
async function verifySites(command:OnlineAction):Promise<Site[]|undefined>{
 if(command.type!=='discover')return;
 if(!validPoint(command.center))throw Error('Ungültiges Kartengebiet.');
 const radius=Math.max(1000,Math.min(30000,command.radius||18000));
 const url=new URL(`https://localhost/api/logistik/partners?lat=${command.center[0]}&lon=${command.center[1]}&radius=${radius}`);
 const result=command.query?await queryPartners(new NextRequest('https://localhost/api/logistik/partners/query?q='+encodeURIComponent(command.query))):await getPartners(new NextRequest(url));if(!result.ok)throw Error((await result.json() as any).error||'OSM-Abfrage fehlgeschlagen.');
 const data:any=await result.json();return data.sites;
}
async function verifyRoads(command:OnlineAction,state:State):Promise<OnlineAction>{
 if(command.type==='setReturnLine'){const v=state.vehicles.find(v=>v.id===command.vehicleId),main=state.lines.find(l=>l.id===v?.lineId),back=state.lines.find(l=>l.id===command.lineId);if(v&&main&&back&&['truck','van'].includes(back.mode)){const a=state.sites.find(p=>p.id===main.stops.at(-1)?.siteId),b=state.sites.find(p=>p.id===back.stops[0]?.siteId),c=state.sites.find(p=>p.id===back.stops.at(-1)?.siteId),d=state.sites.find(p=>p.id===main.stops[0]?.siteId);if(a&&b)await connectRoad(state,a,b);if(c&&d)await connectRoad(state,c,d);}return command;}
 if(command.type==='updateLineStops'){const line=state.lines.find(l=>l.id===command.lineId&&l.active&&!l.deleted);if(!line)throw Error('Aktive Linie auswählen.');const routed=await verifyRoads({...line,type:'line',stops:command.stops,duration:null},state) as Extract<OnlineAction,{type:'line'}>;return {...command,legs:routed.legs};}
 if(command.type==='assignFleet'){if(!Array.isArray(command.vehicleIds)||!command.vehicleIds.length||command.vehicleIds.length>MAX_FLEET_VEHICLES||command.vehicleIds.some(id=>typeof id!=='string'||!state.vehicles.some(v=>v.id===id))||new Set(command.vehicleIds).size!==command.vehicleIds.length)throw Error('Ungültige Fahrzeugauswahl.');for(const vehicleId of command.vehicleIds)await verifyRoads({type:'assign',vehicleId,lineId:command.lineId},state);return command;}
 if(command.type==='assign'){const v=state.vehicles.find(v=>v.id===command.vehicleId),l=state.lines.find(l=>l.id===command.lineId),a=state.sites.find(p=>p.id===v?.locationId),model=VEHICLES.find(m=>m.id===v?.modelId),b=l?state.sites.find(p=>p.id===l.stops[0]?.siteId):v&&depotFor(state,model!.mode,a);if(model&&['van','truck'].includes(model.mode)&&a&&b)await connectRoad(state,a,b);return command;}
 if(command.type!=='line'||!['van','truck'].includes(command.mode))return command;
 const stops=command.stops.filter(st=>st.siteId);if(stops.length<2)throw Error('Mindestens zwei Standorte als Stopps auswählen.');
 await prefetchRoadChain(stops.map(st=>state.sites.find(p=>p.id===st.siteId)).filter((p):p is NonNullable<typeof p>=>!!p).map(p=>[p.lat,p.lon] as Coords)).catch(()=>0);const legs=(await Promise.all(stops.map(async(st,i)=>{const from=state.sites.find(s=>s.id===st.siteId),to=state.sites.find(s=>s.id===stops[(i+1)%stops.length].siteId);if(!from||!to)throw Error('Linienstandort unbekannt.');return connectRoad(state,from,to);}))).filter((leg):leg is NonNullable<typeof leg>=>!!leg);
 return {...command,stops,legs};
}

function numericAmount(n:number,max:number){return Number.isFinite(n)&&n>0&&n<=max&&Math.abs(Math.round(n*100)-n*100)<.00001;}
async function otherCompany(world:string,myId:string,theirId:string){
 if(!theirId||theirId===myId||theirId.length>200||!await readCompany(world,theirId))throw Error('Eine andere Spedition in derselben Welt auswählen.');
}
async function validateSharedCapacity(action:OnlineAction,state:State,rows:Company[],myId:string){
 if(!['supply','process'].includes(action.type))return;
 const a=action as Extract<OnlineAction,{type:'supply'|'process'|'sale'}>,site=state.sites.find(s=>s.id===a.siteId);if(!site)return;
 const p=profile(site);const cap=a.type==='supply'?p.production[(a as Extract<OnlineAction,{type:"supply"}>).good]||0:p.capacity;
 const used=(await Promise.all(rows.map(async r=>normalizeFreightState(await decodeCompany(r.state)).contracts))).flat().filter(c=>c.kind===a.type&&c.siteId===a.siteId&&!c.cancelled&&c.endDay>=state.day&&(a.type!=='supply'||c.good===a.good)).reduce((n,c)=>n+c.daily,0);
 if(used+a.daily>cap)throw Error(`In dieser Welt sind noch ${Math.max(0,cap-used)} EH/Tag frei. Andere Speditionen haben Kapazität gebucht.`);
}
export async function GET(req:NextRequest){const ctx:Record<string,unknown>={};try{
 const u=await currentUser(req);if(!u||u.status!=='active')return reply({error:'Bitte anmelden.'},401);ctx.user=u.id;
 const id=req.nextUrl.searchParams.get('world');ctx.world=id||undefined;
 if(!id){
  await ensureWorldSettingsColumn();const rows=await db().prepare('SELECT w.*,(SELECT count(*) FROM logistics_world_companies c WHERE c.world_id=w.id) AS companies,EXISTS(SELECT 1 FROM logistics_world_companies c WHERE c.world_id=w.id AND c.user_id=?) AS joined FROM logistics_worlds w ORDER BY created DESC LIMIT 100').bind(u.id).all<World&{companies:number;joined:number}>();
  return reply({user:u.name,worlds:rows.results.filter(w=>['owner','admin'].includes(u.role)||w.status!=='draft').map(w=>({...w,settings:settingsSummary(parseSettings(w.settings)),day:clockTarget(w,Date.now())})),singleplayerEnabled:false,isAdmin:['owner','admin'].includes(u.role)});
 }
 await settleWorld(id);if(!await readCompany(id,u.id))return reply({error:'Bitte zuerst dieser Welt beitreten.'},403);
 return reply(await snapshot(u,id,(req.nextUrl.searchParams.get('geo')||'').slice(0,60)));
 }catch(e:any){await logError('online:GET',e,{...ctx,url:req.nextUrl.search});return reply({error:e.message||'Welt nicht erreichbar.'},503);}}

async function enforceWorldRules(cmd:OnlineCommand,state:State,cfg:ReturnType<typeof parseSettings>,worldId:string){
 const c:any=cmd;
 if(c.type==='buy'||c.type==='buyFleet'){const m=VEHICLES.find(v=>v.id===c.modelId);if(m&&!cfg.modes.includes(modeGroup(m.mode)))throw Error((MODE_GROUPS.find(g=>g.id===modeGroup(m.mode))?.name||'Diese Fahrzeugart')+' sind in dieser Welt nicht erlaubt.');}
 if(c.type==='line'&&c.mode&&!cfg.modes.includes(modeGroup(c.mode)))throw Error('Diese Verkehrsart ist in dieser Welt nicht erlaubt.');
 if(c.type==='build'){const g=buildingModeGroup(c.kind);if(g&&!cfg.modes.includes(g))throw Error('Dieses Gebäude gehört zu einer Verkehrsart, die in dieser Welt nicht erlaubt ist.');}
 if((c.type==='track'||c.type==='trackPlan')&&!cfg.modes.includes('rail'))throw Error('Züge sind in dieser Welt nicht erlaubt – keine Gleise.');
 if(cfg.region.kind==='world')return;
 const pts:{lat:number;lon:number;name?:string}[]=[];
 if(c.type==='build'&&Array.isArray(c.point))pts.push({lat:c.point[0],lon:c.point[1]});
 if(c.type==='track'){for(const p of [c.from,c.to])if(Array.isArray(p))pts.push({lat:p[0],lon:p[1]});}
 if(c.type==='trackPlan'&&Array.isArray(c.points))for(const p of c.points)if(Array.isArray(p))pts.push({lat:p[0],lon:p[1]});
 let ids:string[]=[];
 if((c.type==='line'||c.type==='updateLineStops')&&Array.isArray(c.stops))ids=c.stops.map((st:any)=>st.siteId).filter(Boolean);
 if(c.type==='supply'||c.type==='process')ids=[c.siteId];
 if(c.type==='acceptContainer'){const o=await db().prepare('SELECT source_id,destination_id FROM logistics_container_offers WHERE world_id=? AND id=?').bind(worldId,c.offerId).first<{source_id:string;destination_id:string}>();if(o)ids=[o.source_id,o.destination_id];}
 if(ids.length){const known=new Map(state.sites.map(p=>[p.id,p])),missing=ids.filter(i=>!known.has(i));for(const p of missing.length?await registryByIds(missing):[])known.set(p.id,p);for(const i of ids){const p=known.get(i);if(p)pts.push({lat:p.lat,lon:p.lon,name:p.name});}}
 assertInRegion(cfg,pts);
}
export async function POST(req:NextRequest){const ctx:Record<string,unknown>={};try{
 const raw=await req.text();if(raw.length>1000000)return reply({error:'Aktion zu groß.'},413);
 const u=await currentUser(req);if(!u||u.status!=='active')return reply({error:'Anmeldung erforderlich.'},401);ctx.user=u.id;
 if(!sameOrigin(req))return reply({error:'Ungültiger Ursprung.'},403);
 if(!req.headers.get('content-type')?.includes('application/json'))return reply({error:'JSON erwartet.'},415);
 const body=JSON.parse(raw),cmd=body.command as OnlineCommand|{type:'createWorld';name:string;tickMs:number}|{type:'joinWorld';name:string};
 if(!cmd||typeof cmd.type!=='string')return reply({error:'Ungültige Aktion.'},400);ctx.command=cmd.type;ctx.world=String(body.worldId||'')||undefined;ctx.payload=JSON.stringify(cmd).slice(0,800);
 if(cmd.type==='createWorld')return reply({error:'Welten werden ausschließlich in der Admin-Verwaltung erstellt.'},403);
 const id=String(body.worldId||'');if(!id||id.length>100)throw Error('Eine Online-Welt auswählen.');
 const world=await settleWorld(id);
 if(cmd.type==='joinWorld'){await join(world,u,cmd.name||'');return reply(await snapshot(u,id));}
 if(world.status!=='running')return reply({error:'Diese Welt ist pausiert oder noch nicht geöffnet.'},403);
 if(body.marketVersion!==4)return reply({error:'Das Liefersystem wurde aktualisiert. Bitte die Seite neu laden.'},409);
 if(body.quantityUnit!=='EH')return reply({error:'Das Spiel wurde auf EH aktualisiert. Bitte die Seite neu laden.'},409);
 if(cmd.type==='tick')return reply({error:'Die gemeinsame Weltzeit läuft automatisch. Spieler können sie nicht vorspulen.'},403);
 if(!Number.isSafeInteger(body.revision)||!/^[-a-zA-Z0-9_]{16,90}$/.test(body.requestId))return reply({error:'Ungültige Revision oder Anfrage-ID.'},400);
 const row=await readCompany(id,u.id);if(!row)throw Error('Bitte der Welt beitreten.');
 if(cmd.type==='dissolveCompany'){
  // Auflösung: Fahrzeuge → Gebrauchtmarkt (Insolvenzmasse), Personal → Personalmarkt, Spedition wird gelöscht
  const name=(row.name||u.name||'').trim();if(String(cmd.confirm||'').trim()!==name||!name)throw Error('Zur Bestätigung den Firmennamen exakt eingeben.');
  const st=await decodeCompany(row.state),now=Date.now(),seller='liquidation:'+u.id,sellerName='Insolvenzmasse '+name,stmts:D1PreparedStatement[]=[];let listed=0;
  for(const v of st.vehicles){if(v.wrecked||v.lease)continue;let price=1;try{price=Math.max(1,Math.round(dealerValue(v)*1.1));}catch{}const offer={id:'liq'+crypto.randomUUID().replace(/-/g,''),worldId:id,sellerId:seller,sellerName,price,created:now,vehicle:structuredClone(v),status:'open' as const};stmts.push(saveUsedVehicleOffer(offer));listed++;}
  stmts.push(...returnToMarket(id,(st.drivers||[]),'aufgelöst'));
  const prefix=usedVehicleKey(id,'');stmts.push(db().prepare("UPDATE logistics_runtime SET payload=json_set(payload,'$.sellerId',?,'$.sellerName',?) WHERE id>=? AND id<? AND json_extract(payload,'$.sellerId')=? AND json_extract(payload,'$.status')='open'").bind(seller,sellerName,prefix,prefix+'\uffff',u.id));
  const al=await db().prepare('SELECT alliance_id FROM logistics_alliance_members WHERE world_id=? AND user_id=?').bind(id,u.id).first<{alliance_id:string}>().catch(()=>null);
  stmts.push(db().prepare('DELETE FROM logistics_world_permissions WHERE world_id=? AND (owner_id=? OR grantee_id=?)').bind(id,u.id,u.id),db().prepare("UPDATE logistics_world_offers SET status='withdrawn' WHERE world_id=? AND (sender_id=? OR receiver_id=?) AND status='open'").bind(id,u.id,u.id),db().prepare("UPDATE logistics_container_offers SET status='open',accepted_by=NULL WHERE world_id=? AND accepted_by=? AND status='accepted'").bind(id,u.id));
  if(al){stmts.push(db().prepare('DELETE FROM logistics_alliance_members WHERE world_id=? AND user_id=?').bind(id,u.id),db().prepare("UPDATE logistics_alliance_members SET role='leader' WHERE alliance_id=? AND user_id=(SELECT user_id FROM logistics_alliance_members WHERE alliance_id=? ORDER BY joined LIMIT 1) AND NOT EXISTS(SELECT 1 FROM logistics_alliance_members WHERE alliance_id=? AND role='leader')").bind(al.alliance_id,al.alliance_id,al.alliance_id),db().prepare('DELETE FROM logistics_alliances WHERE id=? AND NOT EXISTS(SELECT 1 FROM logistics_alliance_members WHERE alliance_id=?)').bind(al.alliance_id,al.alliance_id));}
  stmts.push(db().prepare('DELETE FROM logistics_world_companies WHERE world_id=? AND user_id=? AND revision=?').bind(id,u.id,row.revision),db().prepare('INSERT INTO admin_audit(id,actor,action,target,created) VALUES(?,?,?,?,?)').bind(crypto.randomUUID(),u.id,'dissolve-company',id+':'+name,now));
  await refreshDriverMarket(id,world.day).catch(()=>{});await db().batch(stmts);
  return reply({dissolved:true,listedVehicles:listed,releasedDrivers:(st.drivers||[]).length,cancelledContracts:st.contracts.filter(c=>!c.cancelled&&c.endDay>=st.day).length});
 }
 if(row.last_action===body.requestId)return reply({...await snapshot(u,id),duplicate:true});
 if(row.revision!==body.revision)return reply({...await snapshot(u,id),error:'Die Welt wurde inzwischen aktualisiert. Bitte erneut versuchen.'},409);
 const rules=await readPartnerRules();const now=Date.now(),state=applyStateRules(normalizeFreightState(await decodeCompany(row.state)),rules);
 state.maintenanceOff=!parseSettings(world.settings).maintenance;state.fuelOff=!parseSettings(world.settings).fuel;state.driversOff=!parseSettings(world.settings).drivers;state.sites.push(...await allianceSitesFor(id,u.id,state));await enforceWorldRules(cmd as OnlineCommand,state,parseSettings(world.settings),id);
 const update=async(r:Company,s:State)=>db().prepare('UPDATE logistics_world_companies SET state=?,revision=revision+1,last_action=?,updated=? WHERE world_id=? AND user_id=?').bind(await encodeCompany(s),body.requestId,now,id,r.user_id);
 const statements:D1PreparedStatement[]=[];let checked=[row];
 if(cmd.type==='offerUsedVehicle'){
  const offers=await readUsedVehicleOffers(id);if(offers.filter(o=>o.sellerId===u.id).length>=100)throw Error('Höchstens 100 offene Fahrzeugangebote je Spedition.');
  if(await db().prepare('SELECT id FROM logistics_runtime WHERE id=?').bind('used-vehicle-v20:'+id+':'+body.requestId).first())throw Error('Anfragekennung bereits verwendet.');const offer=makeUsedOffer(state,cmd.vehicleId,cmd.price,id,u.id,row.name||u.name,body.requestId);statements.push(await update(row,state),saveUsedVehicleOffer(offer));
 }else if(cmd.type==='offerUsedFleet'){
  const ids=cmd.vehicleIds,pct=Number(cmd.percent);if(!Array.isArray(ids)||!ids.length||ids.length>100||new Set(ids).size!==ids.length||ids.some(x=>typeof x!=='string'))throw Error('1–100 unterschiedliche Fahrzeuge auswählen.');if(!Number.isFinite(pct)||pct<-90||pct>1000)throw Error('Aufschlag zwischen −90 % und 1000 % wählen.');
  const offers=await readUsedVehicleOffers(id);if(offers.filter(o=>o.sellerId===u.id).length+ids.length>100)throw Error('Höchstens 100 offene Fahrzeugangebote je Spedition.');
  if(await db().prepare('SELECT id FROM logistics_runtime WHERE id=?').bind('used-vehicle-v20:'+id+':'+body.requestId+'-0').first())throw Error('Anfragekennung bereits verwendet.');
  const made=ids.map((vid,i)=>{const v=state.vehicles.find(x=>x.id===vid);if(!v)throw Error('Eigenes Fahrzeug auswählen.');return makeUsedOffer(state,vid,Math.max(1,Math.round(dealerValue(v)*(1+pct/100))),id,u.id,row.name||u.name,body.requestId+'-'+i);});
  statements.push(await update(row,state),...made.map(saveUsedVehicleOffer));
 }else if(cmd.type==='buyUsedVehicle'){
  const offer=await readUsedVehicleOffer(id,cmd.offerId);if(offer.status!=='open'||offer.sellerId===u.id)throw Error('Dieses Angebot ist nicht mehr verfügbar.');{const cfg=parseSettings(world.settings),m=VEHICLES.find(v=>v.id===offer.vehicle.modelId);if(m&&!cfg.modes.includes(modeGroup(m.mode)))throw Error('Diese Fahrzeugart ist in dieser Welt nicht erlaubt.');}if(offer.sellerId.startsWith('liquidation:')){const nobody=newCompanyState();const bought=buyUsedVehicle(state,nobody,offer,id,u.id,cmd.depotId);if(driversActive(state)&&await isPremium(u.id))autoCrew(state,bought,role=>freshCandidate(role));statements.push(await update(row,state),saveUsedVehicleOffer(offer));}else{const seller=await readCompany(id,offer.sellerId);if(!seller)throw Error('Anbietende Spedition nicht gefunden.');const sellerState=applyStateRules(normalizeFreightState(await decodeCompany(seller.state)),rules);const bought=buyUsedVehicle(state,sellerState,offer,id,u.id,cmd.depotId);if(driversActive(state)&&await isPremium(u.id))autoCrew(state,bought,role=>freshCandidate(role));checked=[row,seller];statements.push(await update(row,state),await update(seller,sellerState),saveUsedVehicleOffer(offer));}
 }else if(cmd.type==='withdrawUsedVehicle'){
  const offer=await readUsedVehicleOffer(id,cmd.offerId);withdrawUsedVehicle(state,offer,id,u.id,cmd.depotId);statements.push(await update(row,state),saveUsedVehicleOffer(offer));
 }else if(cmd.type==='acceptContainer'){
  await ensureContainerDay(id,state.day,rules);const offer=await db().prepare("SELECT * FROM logistics_container_offers WHERE world_id=? AND id=? AND status='open' AND accepted_by IS NULL AND day=?").bind(id,cmd.offerId,Math.floor(state.day)).first<ContainerOffer>();if(!offer)throw Error('Ein anderer Spieler hat diesen Auftrag bereits angenommen oder der Spieltag ist abgelaufen.');
  const sites=await registryByIds([offer.source_id,offer.destination_id]);mergeSites(state,sites);const source=sites.find(p=>p.id===offer.source_id);if(!source||offer.slot>=(factoryPartner(source)?5:1))throw Error('Auftrag nicht mehr für diesen Betrieb freigegeben.');
  const occupied=await db().prepare("SELECT count(*) AS n FROM logistics_container_offers WHERE world_id=? AND source_id=? AND status='accepted' AND deadline>?").bind(id,offer.source_id,state.day).first<{n:number}>();if((occupied?.n||0)>=(factoryPartner(source)?5:1))throw Error('Alle Containerplätze dieses Betriebs sind bereits vergeben.');
  acceptContainerOrder(state,offer);statements.push(await update(row,state),db().prepare("UPDATE logistics_container_offers SET accepted_by=?,status='accepted' WHERE id=? AND world_id=? AND accepted_by IS NULL AND status='open'").bind(u.id,offer.id,id));
 }else if(cmd.type==='hireDriver'){
  if(!driversActive(state))throw Error('In dieser Welt ist das Fahrersystem ausgeschaltet.');const cand=await readCandidate(id,cmd.candidateId);hireDriver(state,cand,cmd.vehicleId||undefined);delete state.borrowedTracks;statements.push(...takeCandidate(id,cand.id,u.id),await update(row,state));
 }else if(cmd.type==='fireDriver'){
  const back=fireDriver(state,cmd.driverId);delete state.borrowedTracks;statements.push(await update(row,state),...returnToMarket(id,[back],'gekündigt'));
 }else if(cmd.type==='tradeOffer'){
  await otherCompany(id,u.id,cmd.receiverId);if(!GOODS.some(g=>g.id===cmd.good&&g.id!=='containers')||!numericAmount(cmd.quantity,10000)||!Number.isSafeInteger(cmd.price)||cmd.price<0||cmd.price>2000000000)throw Error('Ungültiges Handelsangebot.');
  if(!tradeTerminal(state,cmd.siteId)||stock(state,cmd.siteId,cmd.good)<cmd.quantity)throw Error('Nicht genug Ware am eigenen Übergabeterminal.');
  statements.push(db().prepare("INSERT OR IGNORE INTO logistics_world_offers(id,world_id,sender_id,receiver_id,site_id,good,quantity,price,status,created,expires,quantity_unit) VALUES(?,?,?,?,?,?,?,?,'open',?,?,'EH')").bind(body.requestId,id,u.id,cmd.receiverId,cmd.siteId,cmd.good,cmd.quantity,cmd.price,now,now+7*86400000),await update(row,state));
 }else if(cmd.type==='trackPermission'){
  await otherCompany(id,u.id,cmd.receiverId);if(typeof cmd.enabled!=='boolean')throw Error('Ungültige Freigabe.');
  statements.push(db().prepare('INSERT INTO logistics_world_permissions(world_id,owner_id,grantee_id,enabled,updated) VALUES(?,?,?,?,?) ON CONFLICT(world_id,owner_id,grantee_id) DO UPDATE SET enabled=excluded.enabled,updated=excluded.updated').bind(id,u.id,cmd.receiverId,cmd.enabled?1:0,now),await update(row,state));
 }else if(cmd.type==='acceptTrade'){
  const offer=await db().prepare("SELECT * FROM logistics_world_offers WHERE world_id=? AND id=? AND receiver_id=? AND status='open' AND expires>?").bind(id,cmd.offerId,u.id,now).first<Offer>();if(!offer)throw Error('Angebot nicht mehr verfügbar.');
  const seller=await readCompany(id,offer.sender_id);if(!seller)throw Error('Anbieter fehlt.');
  const settled=settleTrade(applyStateRules(normalizeFreightState(await decodeCompany(seller.state)),rules),state,{siteId:offer.site_id,good:offer.good,quantity:offer.quantity*(offer.quantity_unit==='EH'?1:10),price:offer.price,sellerId:offer.sender_id});
  checked=[row,seller];statements.push(await update(seller,settled.seller),await update(row,settled.buyer),db().prepare("UPDATE logistics_world_offers SET status='accepted',settled=? WHERE world_id=? AND id=?").bind(now,id,offer.id));
 }else if(cmd.type==='rejectTrade'||cmd.type==='withdrawTrade'){
  const field=cmd.type==='rejectTrade'?'receiver_id':'sender_id';
  statements.push(db().prepare(`UPDATE logistics_world_offers SET status=? WHERE world_id=? AND id=? AND ${field}=? AND status='open'`).bind(cmd.type==='rejectTrade'?'rejected':'withdrawn',id,cmd.offerId,u.id),await update(row,state));
 }else{
  const action=cmd as OnlineAction;if(action.type==='sale'||action.type==='haulage')throw Error('Abnehmer werden über offene Tagesbedarfe beliefert; Containeraufträge werden aus der Tagesbörse angenommen.');const siteIds=action.type==='supply'||action.type==='process'?[action.siteId]:action.type==='line'||action.type==='updateLineStops'?action.stops.map(st=>st.siteId):[];if(siteIds.length){const refreshed=await registryByIds(siteIds),lookup=new Map(refreshed.map(p=>[p.id,p]));state.sites=state.sites.map(p=>!p.owned&&!p.cooperative&&lookup.has(p.id)?lookup.get(p.id)!:p);mergeSites(state,refreshed);}if((action.type==='build'||action.type==='track'||action.type==='trackPlan')&&action.confirmed!==true)throw Error('Bau muss vor der Buchung bestätigt werden.');if(action.type==='build'&&harborKind(action.kind)){const shore=await checkHarborPlacement(action.point,action.kind,action.rotation||0);if(!shore.valid)throw Error(shore.error);}const verified=await verifySites(action);state.borrowedTracks=await borrowedTracks(id,u.id);
  if(action.type==='line'){const allowed=new Set(routePartners(state,action.good==='all'?undefined:action.good).map(p=>p.id));if(action.stops.some(st=>!allowed.has(st.siteId)))throw Error('Lieferanten brauchen einen Vertrag; Endabnehmer müssen dieses Gut nachfragen.');}
  const routed=await verifyRoads(action,state);if(action.type==='supply'||action.type==='process')await validateSharedCapacity(action,state,await readCompanies(id),u.id);
  const before=new Set(state.vehicles.map(v=>v.id)),updated=applyAction(state,routed,verified);
  if((action.type==='buy'||action.type==='buyFleet')&&driversActive(updated)&&await isPremium(u.id)){let n=0;for(const v of updated.vehicles)if(!before.has(v.id))n+=autoCrew(updated,v,role=>freshCandidate(role));if(n)updated.events.unshift({day:updated.day,text:`Premium: ${n} Fahrer automatisch eingestellt und zugewiesen.`,type:'good'});}if(action.type==='cancelContract')statements.push(db().prepare("UPDATE logistics_container_offers SET status='cancelled' WHERE id=? AND world_id=? AND accepted_by=? AND status='accepted'").bind(action.contractId,id,u.id));delete updated.borrowedTracks;statements.push(await update(row,updated));
 }
 try{await commit(world,checked,statements,rules.revision);}catch{return reply({...await snapshot(u,id),error:'Eine andere Aktion hat die Welt aktualisiert. Bitte erneut versuchen.'},409);}
 return reply(await snapshot(u,id));
 }catch(e:any){await logError('online:'+String(ctx.command||'POST'),e,ctx);return reply({error:e.message||'Online-Aktion fehlgeschlagen.'},422);}}

export async function settleAllWorlds(source='scheduled'){
 const rows=(await db().prepare("SELECT id FROM logistics_worlds WHERE status='running' ORDER BY last_tick LIMIT 50").all<{id:string}>()).results;
 const completed:string[]=[],errors:{id:string;error:string}[]=[];
 for(const row of rows){try{await settleWorld(row.id,15000);completed.push(row.id);}catch(e:any){errors.push({id:row.id,error:e.message});await logError('tick:settle',e,{world:row.id,source},'error');}}
 continuePartnerImports();
 const payload={source,completed,errors,at:Date.now()};
 await db().prepare('INSERT INTO logistics_runtime(id,updated,payload) VALUES(?,?,?) ON CONFLICT(id) DO UPDATE SET updated=excluded.updated,payload=excluded.payload').bind('simulation',Date.now(),JSON.stringify(payload)).run();
 return payload;
}
