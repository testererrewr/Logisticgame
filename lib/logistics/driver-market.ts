import {env} from 'cloudflare:workers';
import {CREW_ROLES,LEVEL_HOURS,driverName,type CrewRole,type Driver,type DriverCandidate} from './drivers';

const db=()=>env.DB!;
let ready:Promise<void>|undefined;let readyDone=false;
export function ensureDriverMarket(){return (readyDone?Promise.resolve(undefined as any):Promise.resolve(db().batch([
 db().prepare('CREATE TABLE IF NOT EXISTS logistics_driver_market(id TEXT PRIMARY KEY,world_id TEXT NOT NULL,role TEXT NOT NULL,name TEXT NOT NULL,xp_hours REAL NOT NULL DEFAULT 0,source TEXT NOT NULL,created INTEGER NOT NULL,expires INTEGER NOT NULL)'),
 db().prepare('CREATE INDEX IF NOT EXISTS logistics_driver_market_world ON logistics_driver_market(world_id,role)'),
 db().prepare('CREATE TABLE IF NOT EXISTS logistics_driver_taken(id TEXT PRIMARY KEY,world_id TEXT NOT NULL,user_id TEXT NOT NULL,created INTEGER NOT NULL)'),
]).then(()=>undefined).catch(e=>{ready=undefined;throw e;})).then((v:any)=>{readyDone=true;return v;}));}
const PER_ROLE:Record<CrewRole,number>={van:10,truck:16,rail:8,ship:8,air:10};
const DAY=86400000;
export function mix(seed:string){let h=2166136261;for(const c of seed){h^=c.charCodeAt(0);h=Math.imul(h,16777619);}return ()=>{h^=h>>>15;h=Math.imul(h,2246822507);h^=h>>>13;h=Math.imul(h,3266489909);h^=h>>>16;return (h>>>0)/4294967296;};}

export async function refreshDriverMarket(world:string,day:number){await ensureDriverMarket();const now=Date.now(),key='driver-market-v2:'+world;
 const last=await db().prepare('SELECT payload FROM logistics_runtime WHERE id=?').bind(key).first<{payload:string}>(),stamp:Record<string,number>=last?JSON.parse(last.payload):{};
 const left=(await db().prepare("SELECT role,count(*) AS n FROM logistics_driver_market WHERE world_id=? AND source='neu' GROUP BY role").bind(world).all<{role:CrewRole;n:number}>()).results,count=new Map(left.map(r=>[r.role,r.n]));
 const due=(Object.keys(PER_ROLE) as CrewRole[]).filter(r=>!count.get(r)||now-(stamp[r]||0)>=DAY);if(!due.length)return;
 const rnd=mix(world+':'+now),rows:{id:string;role:CrewRole;name:string}[]=[];
 for(const role of due){stamp[role]=now;for(let i=0;i<PER_ROLE[role];i++){const id=`drv-${now.toString(36)}-${role}-${i}-${world.slice(0,8)}`;rows.push({id,role,name:driverName(id+rnd())});}}
 await db().batch([
  db().prepare("DELETE FROM logistics_driver_market WHERE world_id=? AND source='neu' AND role IN (SELECT value FROM json_each(?))").bind(world,JSON.stringify(due)),
  db().prepare("INSERT OR IGNORE INTO logistics_driver_market(id,world_id,role,name,xp_hours,source,created,expires) SELECT json_extract(value,'$.id'),?,json_extract(value,'$.role'),json_extract(value,'$.name'),0,'neu',?,? FROM json_each(?)").bind(world,now,now+3650*DAY,JSON.stringify(rows)),
  db().prepare('INSERT INTO logistics_runtime(id,updated,payload) VALUES(?,?,?) ON CONFLICT(id) DO UPDATE SET updated=excluded.updated,payload=excluded.payload').bind(key,now,JSON.stringify(stamp)),
 ]);}
export async function listDriverMarket(world:string){await ensureDriverMarket();return (await db().prepare('SELECT id,role,name,xp_hours,source,created,expires FROM logistics_driver_market WHERE world_id=? AND expires>? ORDER BY xp_hours DESC,created DESC LIMIT 600').bind(world,Date.now()).all<{id:string;role:CrewRole;name:string;xp_hours:number;source:string;created:number;expires:number}>()).results;}
export async function readCandidate(world:string,id:string):Promise<DriverCandidate>{await ensureDriverMarket();const r=await db().prepare('SELECT id,role,name,xp_hours FROM logistics_driver_market WHERE world_id=? AND id=? AND expires>?').bind(world,String(id).slice(0,120),Date.now()).first<{id:string;role:CrewRole;name:string;xp_hours:number}>();if(!r)throw Error('Dieser Bewerber ist nicht mehr verfügbar.');if(!CREW_ROLES[r.role])throw Error('Unbekannte Personalart.');return {id:r.id,name:r.name,role:r.role,xpHours:r.xp_hours};}

export function takeCandidate(world:string,id:string,user:string){return [db().prepare('INSERT INTO logistics_driver_taken(id,world_id,user_id,created) VALUES(?,?,?,?)').bind(id,world,user,Date.now()),db().prepare('DELETE FROM logistics_driver_market WHERE id=? AND world_id=?').bind(id,world)];}

export function returnToMarket(world:string,drivers:(Driver|DriverCandidate)[],source:'gekündigt'|'aufgelöst'){const now=Date.now();return drivers.map(d=>db().prepare('INSERT OR REPLACE INTO logistics_driver_market(id,world_id,role,name,xp_hours,source,created,expires) VALUES(?,?,?,?,?,?,?,?)').bind('drv-r-'+crypto.randomUUID(),world,d.role,d.name,d.xpHours,source,now,now+3650*DAY));}
export function freshCandidate(role:CrewRole):DriverCandidate{const id='drv-auto-'+crypto.randomUUID();return {id,name:driverName(id),role,xpHours:0};}
