import {seedGlobalRegistry} from './global-registry';
import {readPartnerRules,applyRules} from './partner-rules-store';
import {env} from 'cloudflare:workers';
import type {Site} from './engine';
import starter from '../../data/logistics-starter-partners.json';
import graz from '../../data/logistics-graz-partners-v3.json';
export async function savePartners(sites:Site[]){
 for(let i=0;i<sites.length;i+=400){const part=sites.slice(i,i+400);await env.DB!.prepare(`INSERT INTO logistics_partner_registry(id,kind,name,lat,lon,payload,loaded) SELECT json_extract(value,'$.id'),json_extract(value,'$.kind'),json_extract(value,'$.name'),json_extract(value,'$.lat'),json_extract(value,'$.lon'),value,? FROM json_each(?) WHERE 1 ON CONFLICT(id) DO UPDATE SET kind=excluded.kind,name=excluded.name,lat=excluded.lat,lon=excluded.lon,payload=excluded.payload,loaded=excluded.loaded`).bind(Date.now(),JSON.stringify(part)).run();}
}
export async function registryArea(lat:number,lon:number,radius:number){
 const dy=radius/111000,dx=dy/Math.max(.05,Math.cos(lat*Math.PI/180)),sites:Site[]=[];
 for(let after='';;){const rows=await env.DB!.prepare('SELECT id,payload FROM logistics_partner_registry WHERE lat BETWEEN ? AND ? AND lon BETWEEN ? AND ? AND id>? ORDER BY id LIMIT 1000').bind(lat-dy,lat+dy,lon-dx,lon+dx,after).all<{id:string;payload:string}>();sites.push(...rows.results.map(r=>JSON.parse(r.payload) as Site));if(rows.results.length<1000)break;after=rows.results[rows.results.length-1].id;}
 return applyRules(sites,await readPartnerRules());
}
export async function registryByIds(ids:string[]){if(!ids.length)return [];const rows=await env.DB!.prepare('SELECT payload FROM logistics_partner_registry WHERE id IN (SELECT value FROM json_each(?))').bind(JSON.stringify(ids)).all<{payload:string}>();return applyRules(rows.results.map(r=>JSON.parse(r.payload) as Site),await readPartnerRules());}
export async function seedRegistry(){
 await seedGlobalRegistry();
 const done=await env.DB!.prepare("SELECT id FROM logistics_loaded_areas WHERE id='graz-complete-v3'").first();if(done)return;
 await savePartners([...starter.sites,...graz.sites] as Site[]);
 await env.DB!.prepare("INSERT OR IGNORE INTO logistics_loaded_areas(id,loaded,source,count) VALUES('graz-complete-v3',?,?,?)").bind(Date.now(),'OSM · vollständige benannte Graz-Gebietsabfrage 03.11.2026',graz.sites.length).run();
}
export const starterBounds=graz.bounds;
