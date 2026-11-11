import {env} from 'cloudflare:workers';
import {decodeCompany} from './company-codec';
import {GOODS,good,salePrice,credit,debit,log,type GoodId,type Site,type State} from './engine';

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

export function allySites(own:State,partners:{id:string;name:string;state:State}[],shareStorage=true):Site[]{
 const known=new Set(own.sites.map(p=>p.id)),out:Site[]=[];
 for(const p of partners)for(const site of p.state.sites)if(site.owned&&SHARED_KINDS.includes(site.kind)&&(shareStorage||!STORAGE_KINDS.includes(site.kind))&&!known.has(site.id)){out.push({...site,owned:false,cooperative:true,allianceShared:true,operatorId:p.id,name:`${site.name} (Allianz: ${p.name})`} as Site);known.add(site.id);}
 return out;
}
export async function allianceMap(worldId:string){await ensureAllianceTables();const rows=(await db().prepare('SELECT m.alliance_id,m.user_id,a.share_storage FROM logistics_alliance_members m JOIN logistics_alliances a ON a.id=m.alliance_id WHERE m.world_id=?').bind(worldId).all<{alliance_id:string;user_id:string;share_storage:number}>()).results;const map=new Map(rows.map(r=>[r.user_id,r.alliance_id]));(map as Map<string,string>&{storage?:Map<string,boolean>}).storage=new Map(rows.map(r=>[r.alliance_id,r.share_storage!==0]));return map as Map<string,string>&{storage:Map<string,boolean>};}

const cache=new Map<string,{at:number;sites:Site[]}>();

export async function allianceSitesFor(worldId:string,userId:string,own:State){
 const key=worldId+':'+userId,hit=cache.get(key);if(hit&&Date.now()-hit.at<120000)return hit.sites.filter(p=>!own.sites.some(x=>x.id===p.id));
 const map=await allianceMap(worldId),aid=map.get(userId);let sites:Site[]=[];
 if(aid){const ids=[...map].filter(([u,a])=>a===aid&&u!==userId).map(([u])=>u);if(ids.length){const rows=(await db().prepare("SELECT c.user_id,COALESCE(NULLIF(c.name,''),'Spedition') AS name,c.state FROM logistics_world_companies c WHERE c.world_id=? AND c.user_id IN (SELECT value FROM json_each(?))").bind(worldId,JSON.stringify(ids)).all<{user_id:string;name:string;state:string}>()).results;const partners=[];for(const r of rows){try{partners.push({id:r.user_id,name:r.name,state:await decodeCompany(r.state)});}catch{}}sites=allySites(own,partners,map.storage.get(aid)!==false);}}
 cache.set(key,{at:Date.now(),sites});if(cache.size>2000)cache.clear();return sites;
}
export function invalidateAllianceCache(){cache.clear();}
export function stripAllianceSites(s:State){s.sites=s.sites.filter(p=>!(p as Site&{allianceShared?:boolean}).allianceShared);}

export interface AllianceOffer {key:string;good:GoodId;quantity:number;reward:number;days:number}
const mix=(t:string)=>{let h=2166136261;for(const c of t){h^=c.charCodeAt(0);h=Math.imul(h,16777619);}return()=>{h^=h>>>15;h=Math.imul(h,2246822507);h^=h>>>13;h=Math.imul(h,3266489909);h^=h>>>16;return (h>>>0)/4294967296;};};

export function allianceOffers(allianceId:string,day:number,members:number):AllianceOffer[]{
 const d=Math.floor(day),rnd=mix(allianceId+':'+d),pool=GOODS.filter(g=>!g.seasonal&&g.id!=='containers'&&g.sale>0),out:AllianceOffer[]=[];
 for(let i=0;i<3&&pool.length;i++){const g=pool.splice(Math.floor(rnd()*pool.length),1)[0];const days=4+Math.floor(rnd()*7);const quantity=Math.max(2000,Math.round((1500+rnd()*2500)*Math.max(1,members)*days/7/10)*10);const reward=Math.round(quantity*salePrice(g.id,d)*(.45+rnd()*.35));out.push({key:d+'-'+i,good:g.id,quantity,reward,days});}
 return out;
}
interface OrderRow {id:string;alliance_id:string;good:string;quantity:number;delivered:number;reward:number;deadline_day:number;baselines:string;contributions:string;destination_name:string}

export async function settleAllianceOrders(worldId:string,states:Map<string,State>,day:number){
 await ensureAllianceTables();const out:D1PreparedStatement[]=[];
 const orders=(await db().prepare("SELECT * FROM logistics_alliance_orders WHERE world_id=? AND status='active'").bind(worldId).all<OrderRow>()).results;if(!orders.length)return out;
 const map=await allianceMap(worldId);
 for(const o of orders){
  const base:Record<string,number>=JSON.parse(o.baselines||'{}'),contrib:Record<string,number>=JSON.parse(o.contributions||'{}');
  for(const [user,aid] of map){if(aid!==o.alliance_id)continue;const st=states.get(user);if(!st)continue;const cur=st.deliveryStats?.[o.good]||0;if(base[user]===undefined)base[user]=cur;contrib[user]=Math.round(Math.max(contrib[user]||0,cur-base[user])*100)/100;}
  const delivered=Math.min(o.quantity,Math.round(Object.values(contrib).reduce((a,b)=>a+b,0)*100)/100);let status='active';
  if(delivered>=o.quantity-1e-6){status='completed';const lvl=(await hqLevels(worldId)).get(o.alliance_id)||0,reward=o.reward*(1+hqBonus(lvl).orders);await ensureAllianceSocial();out.push(chronicle(o.alliance_id,day,`📦 Allianz-Auftrag erfüllt: ${o.destination_name}.`));const total=Object.values(contrib).reduce((a,b)=>a+b,0)||1;for(const [user,c] of Object.entries(contrib)){const st=states.get(user);if(!st||c<=0)continue;const pay=Math.round(reward*c/total*100)/100;credit(st,pay,'Allianz-Aufträge');log(st,`Allianz-Auftrag ${o.destination_name} erfüllt · Anteil ${Math.round(c/total*100)} % · +${pay.toLocaleString('de-DE',{style:'currency',currency:'EUR'})}`,'good');}}
  else if(day>o.deadline_day){status='failed';for(const [user] of Object.entries(contrib)){const st=states.get(user);if(st)log(st,`Allianz-Auftrag ${o.destination_name} nicht rechtzeitig erfüllt (${delivered}/${o.quantity} EH).`,'warn');}}
  if(status!=='active'||delivered!==o.delivered||o.baselines!==JSON.stringify(base))out.push(db().prepare('UPDATE logistics_alliance_orders SET delivered=?,baselines=?,contributions=?,status=? WHERE id=?').bind(delivered,JSON.stringify(base),JSON.stringify(contrib),status,o.id));
 }
 return out;
}

import {weekOf} from './progression';
import {ensureSocialTables,feedStatement} from './social-server';
let extra:Promise<void>|undefined;
export function ensureAllianceExtras(){return extra??=db().batch([
 db().prepare("CREATE TABLE IF NOT EXISTS logistics_alliance_weekly(alliance_id TEXT NOT NULL,world_id TEXT NOT NULL,week INTEGER NOT NULL,target REAL NOT NULL,progress REAL NOT NULL DEFAULT 0,reward REAL NOT NULL,baselines TEXT NOT NULL DEFAULT '{}',contributions TEXT NOT NULL DEFAULT '{}',status TEXT NOT NULL DEFAULT 'active',PRIMARY KEY(alliance_id,week))"),
 db().prepare('CREATE INDEX IF NOT EXISTS logistics_alliance_weekly_world ON logistics_alliance_weekly(world_id,week)'),
 db().prepare("CREATE TABLE IF NOT EXISTS logistics_alliance_help(id TEXT PRIMARY KEY,alliance_id TEXT NOT NULL,world_id TEXT NOT NULL,requester_id TEXT NOT NULL,site_id TEXT NOT NULL,site_name TEXT NOT NULL,good TEXT NOT NULL,quantity REAL NOT NULL,delivered REAL NOT NULL DEFAULT 0,price REAL NOT NULL,escrow REAL NOT NULL DEFAULT 0,helper_id TEXT,status TEXT NOT NULL,deadline_day REAL NOT NULL,created INTEGER NOT NULL,note TEXT NOT NULL DEFAULT '')"),
 db().prepare('CREATE INDEX IF NOT EXISTS logistics_alliance_help_world ON logistics_alliance_help(world_id,status)'),
]).then(()=>undefined).catch(e=>{extra=undefined;throw e;});}
const ehOf=(s:State)=>Object.values(s.deliveryStats||{}).reduce((n,x)=>n+(x||0),0);

const wh=(a:string,w:number,k:string)=>{let h=2166136261;for(const c of a+'/'+w+'/'+k){h^=c.charCodeAt(0);h=Math.imul(h,16777619);}return h>>>0;};
export const weeklyTarget=(allianceId:string,week:number)=>150000+Math.round((wh(allianceId,week,'t')%450000)/10000)*10000;
export const weeklyReward=(allianceId:string,week:number)=>Math.round((weeklyTarget(allianceId,week)*(.6+(wh(allianceId,week,'r')%60)/100))/1000)*1000;
export async function settleAllianceWeekly(worldId:string,states:Map<string,State>,day:number){
 await ensureAllianceTables();await ensureAllianceExtras();const out:D1PreparedStatement[]=[],week=weekOf(day);
 const map=await allianceMap(worldId);if(!map.size)return out;const byAlliance=new Map<string,string[]>();for(const [u,a] of map)(byAlliance.get(a)??byAlliance.set(a,[]).get(a)!).push(u);
 const rows=(await db().prepare('SELECT * FROM logistics_alliance_weekly WHERE world_id=? AND week>=?').bind(worldId,week-1).all<{alliance_id:string;week:number;target:number;progress:number;reward:number;baselines:string;contributions:string;status:string}>()).results;
 {const last=rows.filter(r=>r.week===week-1&&r.progress>0).sort((a,b)=>b.progress-a.progress)[0];if(last){await ensureSocialTables();const a=await db().prepare('SELECT name,tag FROM logistics_alliances WHERE id=?').bind(last.alliance_id).first<{name:string;tag:string}>();if(a)out.push(feedStatement(worldId,null,'alliance',`[${a.tag}] ${a.name} gewinnt die Allianz-Wochenwertung (Woche ${week}) mit ${Math.round(last.progress).toLocaleString('de-DE')} EH.`,{important:true,day,id:'weekwin:'+worldId+':'+(week-1)}));}}
 for(const r of rows)if(r.week<week&&r.status==='active'){out.push(db().prepare("UPDATE logistics_alliance_weekly SET status='failed' WHERE alliance_id=? AND week=?").bind(r.alliance_id,r.week));for(const u of byAlliance.get(r.alliance_id)||[]){const st=states.get(u);if(st)log(st,`Allianz-Wochenziel verpasst (${Math.round(r.progress).toLocaleString('de-DE')} / ${Math.round(r.target).toLocaleString('de-DE')} EH).`,'warn');}}
 for(const [aid,members] of byAlliance){const r=rows.find(x=>x.alliance_id===aid&&x.week===week);
  if(!r){const base:Record<string,number>={};for(const u of members){const st=states.get(u);if(st)base[u]=ehOf(st);}out.push(db().prepare("INSERT OR IGNORE INTO logistics_alliance_weekly(alliance_id,world_id,week,target,progress,reward,baselines,contributions,status) VALUES(?,?,?,?,0,?,?,'{}','active')").bind(aid,worldId,week,weeklyTarget(aid,week),weeklyReward(aid,week),JSON.stringify(base)));continue;}
  const base:Record<string,number>=JSON.parse(r.baselines||'{}'),contrib:Record<string,number>=JSON.parse(r.contributions||'{}');let changed=false;
  for(const u of members){const st=states.get(u);if(!st)continue;const cur=ehOf(st);if(base[u]===undefined){base[u]=cur;changed=true;}const c=Math.round(Math.max(contrib[u]||0,cur-base[u]));if(c!==contrib[u]){contrib[u]=c;changed=true;}}
  const progress=Object.values(contrib).reduce((a,b)=>a+b,0);let status=r.status;
  if(r.status==='active'&&progress>=r.target){status='completed';const lvl=(await hqLevels(worldId)).get(aid)||0,reward=Math.round(r.reward*(1+hqBonus(lvl).weekly));out.push(chronicle(aid,day,`🎯 Wochenziel ${week+1} erreicht (${Math.round(progress).toLocaleString('de-DE')} EH) – ${reward.toLocaleString('de-DE')} € für jedes Mitglied.`));for(const u of members){const st=states.get(u);if(!st)continue;credit(st,reward,'Allianz-Aufträge');log(st,`🤝 Allianz-Wochenziel erreicht! Prämie für jedes Mitglied: ${reward.toLocaleString('de-DE',{style:'currency',currency:'EUR'})}${lvl?` (inkl. +${lvl*10} % Hauptquartier-Bonus)`:''}`,'good');}}
  if(changed||status!==r.status)out.push(db().prepare('UPDATE logistics_alliance_weekly SET progress=?,baselines=?,contributions=?,status=? WHERE alliance_id=? AND week=?').bind(progress,JSON.stringify(base),JSON.stringify(contrib),status,aid,week));}
 return out;
}

export async function settleAllianceHelp(worldId:string,states:Map<string,State>,day:number){
 await ensureAllianceExtras();const out:D1PreparedStatement[]=[];
 const rows=(await db().prepare("SELECT * FROM logistics_alliance_help WHERE world_id=? AND status IN ('pending','open','claimed','cancelling')").bind(worldId).all<{id:string;requester_id:string;helper_id:string|null;site_id:string;site_name:string;good:string;quantity:number;delivered:number;price:number;escrow:number;status:string;deadline_day:number}>()).results;if(!rows.length)return out;
 const eur=(n:number)=>n.toLocaleString('de-DE',{style:'currency',currency:'EUR'});
 for(const h of rows){const req=states.get(h.requester_id),helper=h.helper_id?states.get(h.helper_id):undefined,name=good(h.good as GoodId)?.name||h.good;let {status,escrow,delivered}=h;
  if(!req){status='cancelled';}
  else if(status==='pending'){const cost=Math.round(h.quantity*h.price*100)/100,site=req.sites.find(p=>p.id===h.site_id&&p.owned);if(!site){status='cancelled';log(req,`Hilfsauftrag ${name}: Standort nicht mehr vorhanden – zurückgezogen.`,'warn');}else if(req.cash<cost){status='cancelled';log(req,`Hilfsauftrag ${name}: nicht genug Kapital für die Hinterlegung (${eur(cost)}).`,'warn');}else{debit(req,cost,'Allianz-Aufträge');escrow=cost;status='open';log(req,`Hilfsauftrag veröffentlicht: ${h.quantity.toLocaleString('de-DE')} EH ${name} nach ${h.site_name} · ${eur(cost)} hinterlegt.`,'info');}}
  else if(status==='cancelling'||day>h.deadline_day){if(escrow>0)credit(req,escrow,'Allianz-Aufträge');log(req,`Hilfsauftrag ${name} ${status==='cancelling'?'zurückgezogen':'abgelaufen'} · ${eur(escrow)} zurückerstattet.`,'info');escrow=0;status=status==='cancelling'?'cancelled':'expired';}
  else if(status==='claimed'&&helper){const stock=helper.inventory[h.site_id]?.[h.good as GoodId]||0,move=Math.min(stock,h.quantity-delivered);
   if(move>0.0001){helper.inventory[h.site_id]![h.good as GoodId]=Math.round((stock-move)*100)/100;req.inventory[h.site_id]??={};req.inventory[h.site_id][h.good as GoodId]=Math.round(((req.inventory[h.site_id][h.good as GoodId]||0)+move)*100)/100;const pay=Math.min(escrow,Math.round(move*h.price*100)/100);escrow=Math.round((escrow-pay)*100)/100;delivered=Math.round((delivered+move)*100)/100;credit(helper,pay,'Allianz-Aufträge');log(helper,`Allianz-Hilfe: ${move.toLocaleString('de-DE')} EH ${name} an ${h.site_name} übergeben · +${eur(pay)}`,'good');log(req,`Allianz-Hilfe: ${move.toLocaleString('de-DE')} EH ${name} in ${h.site_name} eingetroffen.`,'good');}
   if(delivered>=h.quantity-1e-6){status='done';await ensureAllianceSocial();out.push(chronicle((h as any).alliance_id,day,`🆘 Hilfsauftrag erledigt: ${h.quantity.toLocaleString('de-DE')} EH ${name} nach ${h.site_name}.`));if(escrow>0){credit(req,escrow,'Allianz-Aufträge');escrow=0;}}}
  if(status!==h.status||escrow!==h.escrow||delivered!==h.delivered)out.push(db().prepare('UPDATE logistics_alliance_help SET status=?,escrow=?,delivered=? WHERE id=?').bind(status,escrow,delivered,h.id));}
 return out;
}

export const HQ_LEVELS=[0,250000,1000000,3000000,8000000,20000000];
export const hqLevel=(funds:number)=>HQ_LEVELS.reduce((l,t,i)=>funds>=t?i:l,0);
export const hqBonus=(level:number)=>({weekly:.1*level,orders:.05*level});
let social:Promise<unknown>|undefined;
export function ensureAllianceSocial(){return social??=(async()=>{await ensureAllianceTables();await db().batch([
 db().prepare('CREATE TABLE IF NOT EXISTS logistics_alliance_chronicle(id TEXT PRIMARY KEY,alliance_id TEXT NOT NULL,day REAL NOT NULL,text TEXT NOT NULL,created INTEGER NOT NULL)'),
 db().prepare('CREATE INDEX IF NOT EXISTS logistics_alliance_chronicle_a ON logistics_alliance_chronicle(alliance_id,created)'),
 db().prepare("CREATE TABLE IF NOT EXISTS logistics_alliance_duels(id TEXT PRIMARY KEY,world_id TEXT NOT NULL,a_id TEXT NOT NULL,b_id TEXT NOT NULL,week INTEGER NOT NULL,status TEXT NOT NULL,winner TEXT,created INTEGER NOT NULL)"),
]);const cols=(await db().prepare('PRAGMA table_info(logistics_alliances)').all<{name:string}>()).results;if(!cols.some(c=>c.name==='hq_funds'))await db().prepare('ALTER TABLE logistics_alliances ADD COLUMN hq_funds REAL NOT NULL DEFAULT 0').run().catch(()=>{});if(!cols.some(c=>c.name==='treasury'))await db().prepare('ALTER TABLE logistics_alliances ADD COLUMN treasury REAL NOT NULL DEFAULT 0').run().catch(()=>{});const dcols=(await db().prepare('PRAGMA table_info(logistics_alliance_duels)').all<{name:string}>()).results;if(!dcols.some(c=>c.name==='stake'))await db().prepare('ALTER TABLE logistics_alliance_duels ADD COLUMN stake REAL NOT NULL DEFAULT 0').run().catch(()=>{});})().catch(e=>{social=undefined;throw e;});}
export const chronicle=(allianceId:string,day:number,text:string)=>db().prepare('INSERT INTO logistics_alliance_chronicle(id,alliance_id,day,text,created) VALUES(?,?,?,?,?)').bind(crypto.randomUUID(),allianceId,day,text.slice(0,300),Date.now());
export async function hqLevels(worldId:string){await ensureAllianceSocial();const rows=(await db().prepare('SELECT id,hq_funds FROM logistics_alliances WHERE world_id=?').bind(worldId).all<{id:string;hq_funds:number}>()).results;return new Map(rows.map(r=>[r.id,hqLevel(r.hq_funds||0)]));}
export interface AllianceBadge {id:string;icon:string;name:string;text:string;earned:boolean}
export async function allianceBadges(allianceId:string):Promise<AllianceBadge[]>{await ensureAllianceSocial();await ensureAllianceExtras();
 const [m,w,o,a,d,h]=await db().batch([
  db().prepare('SELECT count(*) AS n FROM logistics_alliance_members WHERE alliance_id=?').bind(allianceId),
  db().prepare("SELECT count(*) AS n FROM logistics_alliance_weekly WHERE alliance_id=? AND status='completed'").bind(allianceId),
  db().prepare("SELECT count(*) AS n FROM logistics_alliance_orders WHERE alliance_id=? AND status='completed'").bind(allianceId),
  db().prepare('SELECT hq_funds AS n FROM logistics_alliances WHERE id=?').bind(allianceId),
  db().prepare("SELECT count(*) AS n FROM logistics_alliance_duels WHERE winner=? AND status='done'").bind(allianceId),
  db().prepare("SELECT count(*) AS n FROM logistics_alliance_help WHERE alliance_id=? AND status='done'").bind(allianceId),
 ]);const n=(r:any)=>Number(r.results?.[0]?.n||0),members=n(m),weeks=n(w),orders=n(o),hq=hqLevel(n(a)),duels=n(d),help=n(h);
 return [
  {id:'members-5',icon:'🤝',name:'Gemeinschaft',text:'5 Mitglieder',earned:members>=5},
  {id:'members-15',icon:'🏙️',name:'Großverbund',text:'15 Mitglieder',earned:members>=15},
  {id:'weekly-1',icon:'🎯',name:'Zielstrebig',text:'1 Wochenziel erreicht',earned:weeks>=1},
  {id:'weekly-10',icon:'🗓️',name:'Wochenmeister',text:'10 Wochenziele erreicht',earned:weeks>=10},
  {id:'orders-5',icon:'📦',name:'Auftragsteam',text:'5 Allianz-Aufträge erfüllt',earned:orders>=5},
  {id:'hq-1',icon:'🏢',name:'Hauptquartier',text:'Hauptquartier Stufe 1',earned:hq>=1},
  {id:'hq-5',icon:'🏰',name:'Festung',text:'Hauptquartier Stufe 5',earned:hq>=5},
  {id:'duel-1',icon:'⚔️',name:'Sportsfreunde',text:'Ein Freundschaftsspiel gewonnen',earned:duels>=1},
  {id:'help-10',icon:'🆘',name:'Helfende Hände',text:'10 Hilfsaufträge erledigt',earned:help>=10},
 ];
}

export async function settleAllianceDuels(worldId:string,day:number){await ensureAllianceSocial();const out:D1PreparedStatement[]=[],week=weekOf(day);
 const duels=(await db().prepare("SELECT * FROM logistics_alliance_duels WHERE world_id=? AND status='active' AND week<?").bind(worldId,week).all<{id:string;a_id:string;b_id:string;week:number;stake:number}>()).results;if(!duels.length)return out;await ensureSocialTables();
 for(const d of duels){const rows=(await db().prepare('SELECT w.alliance_id,w.progress,a.name,a.tag FROM logistics_alliances a LEFT JOIN logistics_alliance_weekly w ON w.alliance_id=a.id AND w.week=? WHERE a.id IN (?,?)').bind(d.week,d.a_id,d.b_id).all<{alliance_id:string|null;progress:number|null;name:string;tag:string}>()).results;
  const info=new Map<string,{p:number;label:string}>();for(const id of [d.a_id,d.b_id]){const r=(await db().prepare('SELECT name,tag FROM logistics_alliances WHERE id=?').bind(id).first<{name:string;tag:string}>());const w=rows.find(x=>x.alliance_id===id);info.set(id,{p:Math.round(w?.progress||0),label:r?`[${r.tag}] ${r.name}`:'Aufgelöste Allianz'});}
  const A=info.get(d.a_id)!,B=info.get(d.b_id)!,winner=A.p===B.p?null:A.p>B.p?d.a_id:d.b_id,text=winner?`Freundschaftsspiel: ${info.get(winner)!.label} schlägt ${info.get(winner===d.a_id?d.b_id:d.a_id)!.label} (${Math.max(A.p,B.p).toLocaleString('de-DE')} : ${Math.min(A.p,B.p).toLocaleString('de-DE')} EH).`:`Freundschaftsspiel ${A.label} gegen ${B.label} endet unentschieden (${A.p.toLocaleString('de-DE')} EH).`;
  const stake=Number(d.stake||0),money=stake?` Einsatz: ${(stake*2).toLocaleString('de-DE')} € gehen an ${winner?info.get(winner)!.label:'beide zurück'}.`:'';if(stake){if(winner)out.push(db().prepare('UPDATE logistics_alliances SET treasury=treasury+? WHERE id=?').bind(stake*2,winner));else out.push(db().prepare('UPDATE logistics_alliances SET treasury=treasury+? WHERE id IN (?,?)').bind(stake,d.a_id,d.b_id));}
  out.push(db().prepare("UPDATE logistics_alliance_duels SET status='done',winner=? WHERE id=?").bind(winner,d.id),chronicle(d.a_id,day,'⚔️ '+text+money),chronicle(d.b_id,day,'⚔️ '+text+money),feedStatement(worldId,null,'alliance','⚔️ '+text+money,{day,important:stake>=1000000}));}
 return out;
}
