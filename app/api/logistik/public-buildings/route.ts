import {NextRequest,NextResponse} from 'next/server';
import {env} from 'cloudflare:workers';
import {currentUser} from '../online/route';
import {decodeCompany} from '../../../../lib/logistics/company-codec';
import {publicBuildingKey,publicBuildingPrefix,publicBuildingsStatement,type PublicBuilding} from '../../../../lib/logistics/public-buildings';
import {logError} from '../../../../lib/logistics/error-log';
import {worldBuildings} from '../../../../lib/logistics/alliance-buildings';

export const dynamic='force-dynamic';

export async function GET(req:NextRequest){
 try{
  const user=await currentUser(req);
  if(!user||user.status!=='active')return NextResponse.json({error:'Bitte anmelden.'},{status:401});
  const worldId=(req.nextUrl.searchParams.get('world')||'').slice(0,100);
  if(!worldId)return NextResponse.json({error:'Welt fehlt.'},{status:400});
  const latParam=req.nextUrl.searchParams.get('lat'),lonParam=req.nextUrl.searchParams.get('lon'),lat=Number(latParam),lon=Number(lonParam);
  if(latParam===null||lonParam===null||!Number.isFinite(lat)||!Number.isFinite(lon)||Math.abs(lat)>85||Math.abs(lon)>180)return NextResponse.json({error:'Ungültiger Kartenausschnitt.'},{status:400});
  const near=(site:{lat:number;lon:number})=>Math.abs(site.lat-lat)*111<=3&&Math.abs((site.lon-lon+540)%360-180)*111*Math.max(.1,Math.cos(lat*Math.PI/180))<=3;
  const db=env.DB!;
  const member=await db.prepare('SELECT 1 FROM logistics_world_companies WHERE world_id=? AND user_id=?').bind(worldId,user.id).first();
  if(!member)return NextResponse.json({error:'Bitte zuerst dieser Welt beitreten.'},{status:403});
  const missing=(await db.prepare("SELECT c.user_id,c.name,c.state FROM logistics_world_companies c LEFT JOIN logistics_runtime r ON r.id=('public-buildings-v1:'||c.world_id||':'||c.user_id) WHERE c.world_id=? AND c.user_id<>? AND r.id IS NULL ORDER BY c.user_id LIMIT 4").bind(worldId,user.id).all<{user_id:string;name:string;state:string}>()).results;
  for(const row of missing.slice(0,3)){
   try{const state=await decodeCompany(row.state);await publicBuildingsStatement(db,state,worldId,row.user_id,row.name||state.companyName||'Spedition',Date.now()).run();}
   catch(e){await logError('public-buildings:index',e,{world:worldId,user:row.user_id},'warn');}
  }
  const prefix=publicBuildingPrefix(worldId);
  const rows=(await db.prepare('SELECT id,payload FROM logistics_runtime WHERE id>=? AND id<? AND id<>?').bind(prefix,prefix+'\uffff',publicBuildingKey(worldId,user.id)).all<{id:string;payload:string}>()).results;
  const sites:PublicBuilding[]=[];
  for(const row of rows){try{for(const site of JSON.parse(row.payload) as PublicBuilding[])if(Number.isFinite(site.lat)&&Number.isFinite(site.lon)&&near(site)&&sites.length<500)sites.push(site);}catch{}}
  try{
   const buildings=await worldBuildings(worldId);
   if(buildings.length){
    const mine=await db.prepare('SELECT alliance_id FROM logistics_alliance_members WHERE world_id=? AND user_id=?').bind(worldId,user.id).first<{alliance_id:string}>();
    const tags=(await db.prepare('SELECT id,tag FROM logistics_alliances WHERE world_id=?').bind(worldId).all<{id:string;tag:string}>()).results;
    const names=new Map(tags.map(row=>[row.id,row.tag]));
    for(const building of buildings)if(building.alliance_id!==mine?.alliance_id&&near(building)&&sites.length<500)sites.push({id:'ab-'+building.id,name:building.name,kind:building.kind,lat:building.lat,lon:building.lon,ownerId:'alliance:'+building.alliance_id,ownerName:'Allianz '+(names.get(building.alliance_id)||'')});
   }
  }catch(e){await logError('public-buildings:alliance',e,{world:worldId},'warn');}
  return NextResponse.json({sites,pending:missing.length>3},{headers:{'Cache-Control':'no-store'}});
 }catch(e:any){await logError('api:public-buildings',e,{url:req.url},'warn');return NextResponse.json({error:'Fremde Gebäude gerade nicht verfügbar.'},{status:503});}
}
