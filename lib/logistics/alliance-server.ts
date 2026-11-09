import {env} from 'cloudflare:workers';
import {decodeCompany} from './company-codec';
import type {Site,State} from './engine';

const db=()=>env.DB!;
let ready:Promise<void>|undefined;
export function ensureAllianceTables(){return ready??=(async()=>{await db().batch([
 db().prepare("CREATE TABLE IF NOT EXISTS logistics_alliances(id TEXT PRIMARY KEY,world_id TEXT NOT NULL,name TEXT NOT NULL,tag TEXT NOT NULL,description TEXT NOT NULL DEFAULT '',color TEXT NOT NULL DEFAULT '#4a90c8',owner_id TEXT NOT NULL,open INTEGER NOT NULL DEFAULT 0,created INTEGER NOT NULL)"),
 db().prepare('CREATE TABLE IF NOT EXISTS logistics_alliance_members(alliance_id TEXT NOT NULL,world_id TEXT NOT NULL,user_id TEXT NOT NULL,role TEXT NOT NULL,joined INTEGER NOT NULL,PRIMARY KEY(world_id,user_id))'),
 db().prepare('CREATE TABLE IF NOT EXISTS logistics_alliance_invites(alliance_id TEXT NOT NULL,user_id TEXT NOT NULL,created INTEGER NOT NULL,PRIMARY KEY(alliance_id,user_id))'),
 db().prepare('CREATE TABLE IF NOT EXISTS logistics_alliance_posts(id TEXT PRIMARY KEY,alliance_id TEXT NOT NULL,user_id TEXT NOT NULL,text TEXT NOT NULL,created INTEGER NOT NULL)'),
]);})().catch(e=>{ready=undefined;throw e;});}

export const SHARED_KINDS=['railStation','railDepot','port','inlandPort','shipDepot','airport','airDepot','hub','warehouse','warehouseSmall','warehouseMedium','warehouseXL','depot'];
/** Partner terminals of allied companies as cooperative sites (separate stock per company, like trade partners). */
export function allySites(own:State,partners:{id:string;name:string;state:State}[]):Site[]{
 const known=new Set(own.sites.map(p=>p.id)),out:Site[]=[];
 for(const p of partners)for(const site of p.state.sites)if(site.owned&&SHARED_KINDS.includes(site.kind)&&!known.has(site.id)){out.push({...site,owned:false,cooperative:true,allianceShared:true,operatorId:p.id,name:`${site.name} (Allianz: ${p.name})`} as Site);known.add(site.id);}
 return out;
}
export async function allianceMap(worldId:string){await ensureAllianceTables();const rows=(await db().prepare('SELECT alliance_id,user_id FROM logistics_alliance_members WHERE world_id=?').bind(worldId).all<{alliance_id:string;user_id:string}>()).results;return new Map(rows.map(r=>[r.user_id,r.alliance_id]));}

const cache=new Map<string,{at:number;sites:Site[]}>();
/** Shared sites for one company outside the settlement loop (cached 2 minutes). */
export async function allianceSitesFor(worldId:string,userId:string,own:State){
 const key=worldId+':'+userId,hit=cache.get(key);if(hit&&Date.now()-hit.at<120000)return hit.sites.filter(p=>!own.sites.some(x=>x.id===p.id));
 const map=await allianceMap(worldId),aid=map.get(userId);let sites:Site[]=[];
 if(aid){const ids=[...map].filter(([u,a])=>a===aid&&u!==userId).map(([u])=>u);if(ids.length){const rows=(await db().prepare("SELECT c.user_id,COALESCE(NULLIF(c.name,''),'Spedition') AS name,c.state FROM logistics_world_companies c WHERE c.world_id=? AND c.user_id IN (SELECT value FROM json_each(?))").bind(worldId,JSON.stringify(ids)).all<{user_id:string;name:string;state:string}>()).results;const partners=[];for(const r of rows){try{partners.push({id:r.user_id,name:r.name,state:await decodeCompany(r.state)});}catch{}}sites=allySites(own,partners);}}
 cache.set(key,{at:Date.now(),sites});if(cache.size>2000)cache.clear();return sites;
}
export function invalidateAllianceCache(){cache.clear();}
export function stripAllianceSites(s:State){s.sites=s.sites.filter(p=>!(p as Site&{allianceShared?:boolean}).allianceShared);}
