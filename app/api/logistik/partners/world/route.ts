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

const CELL=[2,.5,.1];
let gridOk:{at:number;ok:boolean}|undefined;
async function gridReady(){if(gridOk&&Date.now()-gridOk.at<300000)return gridOk.ok;let ok=false;try{ok=!!await env.DB!.prepare('SELECT 1 FROM logistics_partner_grid LIMIT 1').first();}catch{}gridOk={at:Date.now(),ok};return ok;}
async function gridClusters(level:number,lat:number,lon:number,dy:number,dx:number,kinds:string[],inside:((a:number,b:number)=>boolean)|null){const c=CELL[level],y0=Math.floor((Math.max(-90,lat-dy)+90)/c),y1=Math.floor((Math.min(90,lat+dy)+90)/c),wrap=dx>=180,x0=Math.floor((Math.max(-180,lon-dx)+180)/c),x1=Math.floor((Math.min(180,lon+dx)+180)/c);
 const rows=(await env.DB!.prepare('SELECT gy,gx,kind,n,slat,slon FROM logistics_partner_grid WHERE level=? AND kind IN (SELECT value FROM json_each(?)) AND gy BETWEEN ? AND ? AND (?=1 OR gx BETWEEN ? AND ?)').bind(level,JSON.stringify(kinds),y0,y1,wrap?1:0,x0,x1).all<{gy:number;gx:number;kind:string;n:number;slat:number;slon:number}>()).results;
 const cells=new Map<string,{n:number;slat:number;slon:number;kinds:Set<string>}>();for(const r of rows){const k=r.gy+':'+r.gx,g=cells.get(k)||{n:0,slat:0,slon:0,kinds:new Set<string>()};g.n+=r.n;g.slat+=r.slat;g.slon+=r.slon;g.kinds.add(r.kind);cells.set(k,g);}
 const out:{id:string;lat:number;lon:number;count:number;kind:string}[]=[];let total=0;for(const [k,g] of cells){const la=g.slat/g.n,lo=g.slon/g.n;if(inside&&!inside(la,lo))continue;total+=g.n;out.push({id:'g'+level+':'+k,lat:la,lon:lo,count:g.n,kind:g.kinds.size===1?[...g.kinds][0]:'mixed'});}return {clusters:out,total};}
export async function GET(req:NextRequest){try{await seedRegistry();const p=req.nextUrl.searchParams,lat=Number(p.get('lat')||0),lon=Number(p.get('lon')||0),zoom=Number(p.get('zoom')||2),kinds=(p.get('kinds')||'').split(',').filter(k=>/^[a-zA-Z]+$/.test(k)),query=(p.get('q')||'').slice(0,100),good=p.get('good')||'all',unserved=p.get('unserved')==='1',global=await seedGlobalRegistry(0);if(!Number.isFinite(lat)||!Number.isFinite(lon)||!Number.isFinite(zoom)||Math.abs(lat)>85||Math.abs(lon)>180||zoom<2||zoom>19)return NextResponse.json({error:'Ungültige Kartenansicht.'},{status:400});if(!kinds.length)return NextResponse.json({sites:[],clusters:[],global});
 let served=new Set<string>();if(unserved){const u=await currentUser(req),row=u&&await env.DB!.prepare('SELECT state FROM logistics_world_companies WHERE world_id=? AND user_id=?').bind(p.get('world')||'',u.id).first<{state:string}>();if(!row)return NextResponse.json({error:'Bitte der Welt beitreten.'},{status:403});served=servedStationIds(await decodeCompany(row.state));}
 const worldId=(p.get('world')||'').slice(0,100),inside=worldId?regionFilter(await worldSettings(worldId)):null;
 const dy=Math.min(180,135/2**(zoom-2)),dx=Math.min(360,230/2**(zoom-2)),rules=await readPartnerRules(),sites:Site[]=[],groups=new Map<string,{lat:number;lon:number;count:number;kind:string;site:{kind:string;name:string}}>();let count=0;
 const add=(site:{id:string;lat:number;lon:number;kind:string;name:string},full?:Site)=>{if(inside&&!inside(site.lat,site.lon))return;count++;if(full&&sites.length<3001)sites.push(full);const key=mapClusterKey(site as Site,zoom),g=groups.get(key)||{lat:0,lon:0,count:0,kind:'mixed',site};g.lat+=site.lat;g.lon+=site.lon;g.count++;groups.set(key,g);};
 if(!query.trim()&&good==='all'){
  const level=zoom<=4?0:zoom<=7?1:2;
  if(zoom<8&&await gridReady()){const g=await gridClusters(level,lat,lon,dy,dx,kinds,inside);return NextResponse.json({sites:[],clusters:g.clusters,global,matched:g.total},{headers:{'Cache-Control':'no-store'}});}
  const cap=zoom<8?20000:3001,rows=(await env.DB!.prepare('SELECT id,kind,name,lat,lon'+(zoom<8?'':',payload')+' FROM logistics_partner_registry WHERE kind IN (SELECT value FROM json_each(?)) AND lat BETWEEN ? AND ? AND (?=1 OR lon BETWEEN ? AND ?) LIMIT ?').bind(JSON.stringify(kinds),lat-dy,lat+dy,dx>=180?1:0,lon-dx,lon+dx,cap).all<{id:string;kind:string;name:string;lat:number;lon:number;payload?:string}>()).results;
  if(zoom>=8&&rows.length>=cap&&await gridReady()){const g=await gridClusters(2,lat,lon,dy,dx,kinds,inside);return NextResponse.json({sites:[],clusters:g.clusters,global,matched:g.total},{headers:{'Cache-Control':'no-store'}});}
  for(const r of rows){if(served.has(r.id))continue;let full:Site|undefined;if(r.payload){try{full=applyPartnerRule(JSON.parse(r.payload),rules);}catch{}if(!full||full.hidden)continue;}add(r,full);}
 }else{
  const words=query.trim().toLocaleLowerCase('de').split(/\s+/).filter(Boolean).slice(0,4),like=words.map(()=>' AND (name LIKE ? OR payload LIKE ? OR name LIKE ? OR payload LIKE ?)').join('');
  for(let after='',loops=0;loops<12;loops++){const rows=(await env.DB!.prepare('SELECT id,payload FROM logistics_partner_registry WHERE kind IN (SELECT value FROM json_each(?)) AND lat BETWEEN ? AND ? AND (?=1 OR lon BETWEEN ? AND ?) AND kind IN (SELECT value FROM json_each(?))'+like+' AND id>? ORDER BY id LIMIT 500').bind(JSON.stringify(kinds),lat-dy,lat+dy,dx>=180?1:0,lon-dx,lon+dx,JSON.stringify(kinds),...words.flatMap(w=>{const cap=w.charAt(0).toLocaleUpperCase('de')+w.slice(1);return ['%'+w+'%','%'+w+'%','%'+cap+'%','%'+cap+'%'];}),after).all<{id:string;payload:string}>()).results;for(const row of rows){const site=applyPartnerRule(JSON.parse(row.payload),rules);if(!kinds.includes(site.kind)||served.has(site.id)||!matchesMapSite(site,query,good))continue;add(site,site);}if(rows.length<500)break;after=rows[rows.length-1].id;}
 }
 const clustered=zoom<8||count>3000;return NextResponse.json({sites:clustered?[]:sites,clusters:clustered?[...groups].map(([id,g])=>({id,lat:g.lat/g.count,lon:g.lon/g.count,count:g.count,kind:g.count===1?g.site.kind:g.kind,name:g.count===1?g.site.name:undefined})):[],global,matched:count},{headers:{'Cache-Control':'no-store'}});
 }catch(e:any){await logError('api:partners/world',e,{url:req.url});return NextResponse.json({error:e.message},{status:503});}}
