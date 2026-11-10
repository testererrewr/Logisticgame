import {env} from 'cloudflare:workers';
import {CREW_ROLES,LEVEL_HOURS,driverName,type CrewRole,type Driver,type DriverCandidate} from './drivers';

/** Gemeinsamer Personalmarkt je Welt: täglich neue Bewerber; gekündigte Fahrer und Personal aufgelöster Speditionen kommen mit ihrer Stufe zurück. */
const db=()=>env.DB!;
let ready:Promise<void>|undefined;
export function ensureDriverMarket(){return ready??=db().batch([
 db().prepare('CREATE TABLE IF NOT EXISTS logistics_driver_market(id TEXT PRIMARY KEY,world_id TEXT NOT NULL,role TEXT NOT NULL,name TEXT NOT NULL,xp_hours REAL NOT NULL DEFAULT 0,source TEXT NOT NULL,created INTEGER NOT NULL,expires INTEGER NOT NULL)'),
 db().prepare('CREATE INDEX IF NOT EXISTS logistics_driver_market_world ON logistics_driver_market(world_id,role)'),
 db().prepare('CREATE TABLE IF NOT EXISTS logistics_driver_taken(id TEXT PRIMARY KEY,world_id TEXT NOT NULL,user_id TEXT NOT NULL,created INTEGER NOT NULL)'),
]).then(()=>undefined).catch(e=>{ready=undefined;throw e;});}
const PER_ROLE:Record<CrewRole,number>={van:10,truck:16,rail:8,ship:8,air:10};
const DAY=86400000;
function mix(seed:string){let h=2166136261;for(const c of seed){h^=c.charCodeAt(0);h=Math.imul(h,16777619);}return ()=>{h^=h>>>15;h=Math.imul(h,2246822507);h^=h>>>13;h=Math.imul(h,3266489909);h^=h>>>16;return (h>>>0)/4294967296;};}
/** Erfahrung neuer Bewerber: meist Einsteiger, selten Profis. */
function startXp(r:number,r2:number){const lvl=r<.72?1:r<.9?2:r<.97?3:r<.995?4:5;const lo=LEVEL_HOURS[lvl-1],hi=lvl<5?LEVEL_HOURS[lvl]:LEVEL_HOURS[4]*1.4;return Math.round(lo+(hi-lo)*r2*.9);}
export async function refreshDriverMarket(world:string,day:number){await ensureDriverMarket();const d=Math.floor(day),key='driver-market-day:'+world,now=Date.now();
 const last=await db().prepare('SELECT payload FROM logistics_runtime WHERE id=?').bind(key).first<{payload:string}>();if(last&&Number(last.payload)>=d)return;
 const rnd=mix(world+':'+d),rows:{id:string;role:CrewRole;name:string;xp:number}[]=[];
 for(const role of Object.keys(PER_ROLE) as CrewRole[])for(let i=0;i<PER_ROLE[role];i++){const id=`drv-${d}-${role}-${i}-${world.slice(0,8)}`;rows.push({id,role,name:driverName(id+rnd()),xp:startXp(rnd(),rnd())});}
 await db().batch([
  db().prepare('DELETE FROM logistics_driver_market WHERE world_id=? AND expires<?').bind(world,now),
  db().prepare("INSERT OR IGNORE INTO logistics_driver_market(id,world_id,role,name,xp_hours,source,created,expires) SELECT json_extract(value,'$.id'),?,json_extract(value,'$.role'),json_extract(value,'$.name'),json_extract(value,'$.xp'),'neu',?,? FROM json_each(?) WHERE json_extract(value,'$.id') NOT IN (SELECT id FROM logistics_driver_taken)").bind(world,now,now+3*DAY,JSON.stringify(rows)),
  db().prepare('INSERT INTO logistics_runtime(id,updated,payload) VALUES(?,?,?) ON CONFLICT(id) DO UPDATE SET updated=excluded.updated,payload=excluded.payload').bind(key,now,String(d)),
 ]);}
export async function listDriverMarket(world:string){await ensureDriverMarket();return (await db().prepare('SELECT id,role,name,xp_hours,source,created,expires FROM logistics_driver_market WHERE world_id=? AND expires>? ORDER BY xp_hours DESC,created DESC LIMIT 600').bind(world,Date.now()).all<{id:string;role:CrewRole;name:string;xp_hours:number;source:string;created:number;expires:number}>()).results;}
export async function readCandidate(world:string,id:string):Promise<DriverCandidate>{await ensureDriverMarket();const r=await db().prepare('SELECT id,role,name,xp_hours FROM logistics_driver_market WHERE world_id=? AND id=? AND expires>?').bind(world,String(id).slice(0,120),Date.now()).first<{id:string;role:CrewRole;name:string;xp_hours:number}>();if(!r)throw Error('Dieser Bewerber ist nicht mehr verfügbar.');if(!CREW_ROLES[r.role])throw Error('Unbekannte Personalart.');return {id:r.id,name:r.name,role:r.role,xpHours:r.xp_hours};}
/** Einstellung: Bewerber verschwindet; doppelte Einstellung desselben Bewerbers lässt den ganzen Vorgang scheitern. */
export function takeCandidate(world:string,id:string,user:string){return [db().prepare('INSERT INTO logistics_driver_taken(id,world_id,user_id,created) VALUES(?,?,?,?)').bind(id,world,user,Date.now()),db().prepare('DELETE FROM logistics_driver_market WHERE id=? AND world_id=?').bind(id,world)];}
/** Gekündigte oder freigesetzte Fahrer zurück auf den Markt (neue Kennung, gleiche Erfahrung). */
export function returnToMarket(world:string,drivers:(Driver|DriverCandidate)[],source:'gekündigt'|'aufgelöst'){const now=Date.now();return drivers.map(d=>db().prepare('INSERT OR REPLACE INTO logistics_driver_market(id,world_id,role,name,xp_hours,source,created,expires) VALUES(?,?,?,?,?,?,?,?)').bind('drv-r-'+crypto.randomUUID(),world,d.role,d.name,d.xpHours,source,now,now+14*DAY));}
export function freshCandidate(role:CrewRole):DriverCandidate{const id='drv-auto-'+crypto.randomUUID();return {id,name:driverName(id),role,xpHours:0};}
