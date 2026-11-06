import {env} from 'cloudflare:workers';
import countries from '../../data/countries.json';
import {countryAt} from '../countries-server';
import {allowedCountries,regionBounds,parseSettings,type WorldSettings} from './world-settings';

let column:Promise<void>|undefined;
export function ensureWorldSettingsColumn(){return column??=(async()=>{const cols=(await env.DB!.prepare('PRAGMA table_info(logistics_worlds)').all<{name:string}>()).results;if(!cols.some(c=>c.name==='settings'))await env.DB!.prepare("ALTER TABLE logistics_worlds ADD COLUMN settings text DEFAULT '{}' NOT NULL").run().catch(()=>{});})().catch(e=>{column=undefined;throw e;});}

const cache=new Map<string,WorldSettings>();
export async function worldSettings(worldId:string):Promise<WorldSettings>{
 await ensureWorldSettingsColumn();
 const row=await env.DB!.prepare('SELECT settings FROM logistics_worlds WHERE id=?').bind(worldId).first<{settings:string}>();
 const s=parseSettings(row?.settings||'{}');cache.set(worldId,s);return s;
}
export const cachedWorldSettings=(worldId:string)=>cache.get(worldId);

const pointCountry=new Map<string,string>();
export function countryOf(lat:number,lon:number){const key=lat.toFixed(3)+','+lon.toFixed(3);let c=pointCountry.get(key);if(c===undefined){c=countryAt([lat,lon]);if(pointCountry.size>250000)pointCountry.clear();pointCountry.set(key,c);}return c;}

export function regionFilter(s:WorldSettings){
 const set=allowedCountries(s);if(!set)return null;const b=regionBounds(s);
 return (lat:number,lon:number)=>!!b&&lat>=b[0]-.05&&lat<=b[2]+.05&&lon>=b[1]-.05&&lon<=b[3]+.05&&set.has(countryOf(lat,lon));
}
export function assertInRegion(s:WorldSettings,points:{lat:number;lon:number;name?:string}[]){
 const inside=regionFilter(s);if(!inside)return;
 for(const p of points)if(!inside(p.lat,p.lon))throw Error((p.name?p.name+' liegt':'Dieser Ort liegt')+' außerhalb der Spielregion dieser Welt.');
}

const round=(n:number)=>Math.round(n*1000)/1000;
function simplify(ring:number[][]){const step=ring.length>2000?4:ring.length>600?2:1;const out:number[][]=[];for(let i=0;i<ring.length;i+=step)out.push([round(ring[i][1]),round(ring[i][0])]);return out;}
export function regionGeometry(s:WorldSettings){
 const set=allowedCountries(s);if(!set)return null;
 const rings:number[][][]=[];
 for(const c of countries as any[]){if(!set.has(c.name))continue;const polys=c.geometry.type==='Polygon'?[c.geometry.coordinates]:c.geometry.coordinates;for(const p of polys)for(const r of p)rings.push(simplify(r));}
 return {rings,bounds:regionBounds(s),countries:[...set]};
}
