import {logError} from '../../../../../lib/logistics/error-log';
import {NextRequest,NextResponse} from 'next/server';
import {env} from 'cloudflare:workers';
import {seedRegistry} from '../../../../../lib/logistics/partner-registry';
import {seedGlobalRegistry} from '../../../../../lib/logistics/global-registry';
import {readPartnerRules} from '../../../../../lib/logistics/partner-rules-store';
import {applyPartnerRule,type PartnerRules} from '../../../../../lib/logistics/business-rules';
import {matchesMapSite,mapClusterKey,servedStationIds} from '../../../../../lib/logistics/map-filtering';
import {currentUser} from '../../online/route';
import {decodeCompany} from '../../../../../lib/logistics/company-codec';
import {worldSettings,regionFilter} from '../../../../../lib/logistics/world-region-server';
import type {Site,State} from '../../../../../lib/logistics/engine';

interface Compact {id:string;lat:number;lon:number;kind:string;name:string;hidden:boolean}
let compactCache:{key:string;built:number;items:Compact[]}|undefined,compactBuild:Promise<Compact[]>|undefined;
async function compactRegistry(rules:PartnerRules):Promise<Compact[]>{
 const meta=await env.DB!.prepare('SELECT count(*) AS n FROM logistics_partner_registry').first<{n:number}>(),key=(meta?.n||0)+':'+rules.revision;
 if(compactCache&&compactCache.key===key&&Date.now()-compactCache.built<600000)return compactCache.items;
 if(compactBuild)return compactBuild;
 compactBuild=(async()=>{const items:Compact[]=[];for(let after='';;){const rows=(await env.DB!.prepare('SELECT id,payload FROM logistics_partner_registry WHERE id>? ORDER BY id LIMIT 2000').bind(after).all<{id:string;payload:string}>()).results;for(const row of rows){const site=applyPartnerRule(JSON.parse(row.payload),rules);items.push({id:site.id,lat:site.lat,lon:site.lon,kind:site.kind,name:site.name,hidden:!!site.hidden});}if(rows.length<2000)break;after=rows[rows.length-1].id;}compactCache={key,built:Date.now(),items};return items;})().finally(()=>{compactBuild=undefined;});
 return compactBuild;
}
async function sitesByIds(ids:string[],rules:PartnerRules){const out:Site[]=[];for(let i=0;i<ids.length;i+=500){const rows=(await env.DB!.prepare('SELECT payload FROM logistics_partner_registry WHERE id IN (SELECT value FROM json_each(?)) ORDER BY id').bind(JSON.stringify(ids.slice(i,i+500))).all<{payload:string}>()).results;for(const row of rows)out.push(applyPartnerRule(JSON.parse(row.payload),rules));}return out;}

export async function GET(req:NextRequest){try{await seedRegistry();const p=req.nextUrl.searchParams,lat=Number(p.get('lat')||0),lon=Number(p.get('lon')||0),zoom=Number(p.get('zoom')||2),kinds=(p.get('kinds')||'').split(',').filter(k=>/^[a-zA-Z]+$/.test(k)),query=(p.get('q')||'').slice(0,100),good=p.get('good')||'all',unserved=p.get('unserved')==='1',global=await seedGlobalRegistry(0);if(!Number.isFinite(lat)||!Number.isFinite(lon)||!Number.isFinite(zoom)||Math.abs(lat)>85||Math.abs(lon)>180||zoom<2||zoom>19)return NextResponse.json({error:'Ungültige Kartenansicht.'},{status:400});if(!kinds.length)return NextResponse.json({sites:[],clusters:[],global});
 let served=new Set<string>();if(unserved){const u=await currentUser(req),row=u&&await env.DB!.prepare('SELECT state FROM logistics_world_companies WHERE world_id=? AND user_id=?').bind(p.get('world')||'',u.id).first<{state:string}>();if(!row)return NextResponse.json({error:'Bitte der Welt beitreten.'},{status:403});served=servedStationIds(await decodeCompany(row.state));}
 const worldId=(p.get('world')||'').slice(0,100),inside=worldId?regionFilter(await worldSettings(worldId)):null;
 const dy=Math.min(180,135/2**(zoom-2)),dx=Math.min(360,230/2**(zoom-2)),rules=await readPartnerRules(),sites:Site[]=[],groups=new Map<string,{lat:number;lon:number;count:number;kind:string;site:{kind:string;name:string}}>();let count=0;
 const add=(site:{id:string;lat:number;lon:number;kind:string;name:string},full?:Site)=>{if(inside&&!inside(site.lat,site.lon))return;count++;if(full&&sites.length<3001)sites.push(full);const key=mapClusterKey(site as Site,zoom),g=groups.get(key)||{lat:0,lon:0,count:0,kind:'mixed',site};g.lat+=site.lat;g.lon+=site.lon;g.count++;groups.set(key,g);};
 if(!query.trim()&&good==='all'){
  const kindSet=new Set(kinds),ids:string[]=[];
  for(const c of await compactRegistry(rules)){if(c.lat<lat-dy||c.lat>lat+dy||dx<180&&(c.lon<lon-dx||c.lon>lon+dx)||c.hidden||!kindSet.has(c.kind)||served.has(c.id))continue;add(c);if(ids.length<3001)ids.push(c.id);}
  if(!(zoom<8||count>3000))sites.push(...(await sitesByIds(ids,rules)).filter(s=>!s.hidden&&kindSet.has(s.kind)&&(!inside||inside(s.lat,s.lon))));
 }else{
  const words=query.trim().toLocaleLowerCase('de').split(/\s+/).filter(Boolean).slice(0,4),like=words.map(()=>' AND (name LIKE ? OR payload LIKE ? OR name LIKE ? OR payload LIKE ?)').join('');
  for(let after='';;){const rows=(await env.DB!.prepare('SELECT id,payload FROM logistics_partner_registry WHERE lat BETWEEN ? AND ? AND (?=1 OR lon BETWEEN ? AND ?) AND kind IN (SELECT value FROM json_each(?))'+like+' AND id>? ORDER BY id LIMIT 500').bind(lat-dy,lat+dy,dx>=180?1:0,lon-dx,lon+dx,JSON.stringify(kinds),...words.flatMap(w=>{const cap=w.charAt(0).toLocaleUpperCase('de')+w.slice(1);return ['%'+w+'%','%'+w+'%','%'+cap+'%','%'+cap+'%'];}),after).all<{id:string;payload:string}>()).results;for(const row of rows){const site=applyPartnerRule(JSON.parse(row.payload),rules);if(!kinds.includes(site.kind)||served.has(site.id)||!matchesMapSite(site,query,good))continue;add(site,site);}if(rows.length<500)break;after=rows[rows.length-1].id;}
 }
 const clustered=zoom<8||count>3000;return NextResponse.json({sites:clustered?[]:sites,clusters:clustered?[...groups].map(([id,g])=>({id,lat:g.lat/g.count,lon:g.lon/g.count,count:g.count,kind:g.count===1?g.site.kind:g.kind,name:g.count===1?g.site.name:undefined})):[],global,matched:count},{headers:{'Cache-Control':'no-store'}});
 }catch(e:any){await logError('api:partners/world',e,{url:req.url});return NextResponse.json({error:e.message},{status:503});}}
