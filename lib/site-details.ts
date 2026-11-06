import {stationBounds,stationDistance,transferLimit} from './station-access';
import {placePoint,type BusStop,type Company,type Facility,type Line,type World} from './game';
import {getMap,type LatLon} from './real-map';
import {tileCenter,sphericalDistance} from './geography';
import {configOf} from './world-config';
export type SiteRef={company:string;id:string;kind:'stop'|'facility'};
export const facilityNames={station:'Bahnhof',airport:'Flughafen',port:'Hafen',busdepot:'Busdepot',traindepot:'Zugdepot',airdepot:'Flugzeugdepot',shipdepot:'Schiffsdepot'};
export function facilityGeometry(f:Facility){
 const m=getMap(f.city),latitude=m?.lat??tileCenter(f.city)?.[0]??placePoint(f.city)?.[0]??f.point[0],dLat=m?.dLat??50/111320,dLon=m?.dLon??50/(111320*Math.cos(latitude*Math.PI/180));
 const cells=(f.footprint.length?f.footprint:[f.cell]).map(id=>{const p:LatLon=[f.point[0]+(Math.floor(id/80)-Math.floor(f.cell/80))*dLat,f.point[1]+(id%80-f.cell%80)*dLon];return {id,point:p,bounds:[[p[0]-dLat/2,p[1]-dLon/2],[p[0]+dLat/2,p[1]+dLon/2]] as [LatLon,LatLon]};});
 const south=Math.min(...cells.map(c=>c.bounds[0][0])),west=Math.min(...cells.map(c=>c.bounds[0][1])),north=Math.max(...cells.map(c=>c.bounds[1][0])),east=Math.max(...cells.map(c=>c.bounds[1][1]));
 return {cells,bounds:[[south,west],[north,east]] as [LatLon,LatLon],center:[(south+north)/2,(west+east)/2] as LatLon,width:Math.round((east-west)/dLon)*50,height:Math.round((north-south)/dLat)*50};
}
export function selectedSite(world:World,ref:SiteRef){const company=world.state.companies.find(c=>c.id===ref.company);const site=ref.kind==='stop'?company?.stops?.find(s=>s.id===ref.id):company?.facilities?.find(f=>f.id===ref.id);return company&&site?{company,site}:null;}
type Registry={stops:Map<string,BusStop>;facilities:Map<string,Facility>;tracks:Map<string,NonNullable<Company['tracks']>[number]>};
function calls(c:Company,l:Line,busRadius:number,hubRadius:number,registry:Registry):{id?:string;point:LatLon;name:string;radius:number}[]{
 if(l.mode==='bus')return l.stopIds?l.stopIds.flatMap(id=>{const s=registry.stops.get(id);return s?[{id:s.id,point:s.point,name:s.name,radius:s.hub?hubRadius:busRadius}]:[];}):(l.stopPoints||[]).map((point,i)=>({point,name:'Halt '+(i+1),radius:l.hubs?.includes(i)?hubRadius:busRadius}));
 if(l.facilityIds?.length)return l.facilityIds.flatMap(id=>{const f=registry.facilities.get(id);return f?[{id:f.id,point:f.point,name:f.name,radius:hubRadius}]:[];});
 if(l.mode==='train'||l.mode==='plane'){const track=registry.tracks.get(l.track||''),ids=[l.fromFacility||track?.from,l.toFacility||track?.to];return [l.a,l.b].flatMap((city,i)=>{const f=ids[i]?registry.facilities.get(ids[i]!):c.facilities?.find(f=>f.type===(l.mode==='plane'?'airport':'station')&&f.city.split('~')[0]===city);return f?[{id:f.id,point:f.point,name:f.name,radius:hubRadius}]:[];});}
 return [l.a,l.b].flatMap(city=>{const point=placePoint(city);return point?[{point,name:'Hafen',radius:hubRadius}]:[];});
}
export type SiteLine={company:Company;line:Line;direct:boolean;distance:number;at:string;depot:boolean;waitingStop:string};
export function linesAtSite(world:World,ref:SiteRef):SiteLine[]{
 const found=selectedSite(world,ref);if(!found)return [];const {site}=found,config=configOf(world.config),facility=ref.kind==='facility'?site as Facility:null,isDepot=!!facility?.type.includes('depot');
 const radius=ref.kind==='stop'?((site as BusStop).hub?config.hubRadius:config.busRadius):config.hubRadius;
 const rows:SiteLine[]=[];
 const registry:Registry={stops:new Map(world.state.companies.flatMap(c=>(c.stops||[]).map(s=>[s.id,s] as const))),facilities:new Map(world.state.companies.flatMap(c=>(c.facilities||[]).map(f=>[f.id,f] as const))),tracks:new Map(world.state.companies.flatMap(c=>(c.tracks||[]).map(t=>[t.id,t] as const)))};
 for(const company of world.state.companies)for(const line of company.lines){
  if(isDepot){if(company.id===ref.company&&company.fleet?.some(v=>v.depot===ref.id&&v.line===line.id))rows.push({company,line,direct:true,distance:0,at:site.name,depot:true,waitingStop:site.id});continue;}
  const points=calls(company,line,config.busRadius,config.hubRadius,registry),direct=points.some(p=>p.id===ref.id),closest=points.map((p,index)=>({...p,index,distance:stationDistance({point:site.point,bounds:facility?stationBounds(facility):undefined},{point:p.point,bounds:(()=>{const f=registry.facilities.get(p.id||'');return f?stationBounds(f):undefined;})()})})).filter(p=>p.distance<=(facility?.type==='airport'||registry.facilities.get(p.id||'')?.type==='airport'?1000:100)+.01).sort((a,b)=>a.distance-b.distance)[0];
  if(direct||closest)rows.push({company,line,direct,distance:direct?0:Math.round(closest.distance),at:direct?site.name:closest.name,depot:false,waitingStop:direct?ref.id:closest.id||line.id+':'+closest.index});
 }
 return rows.sort((a,b)=>Number(b.direct)-Number(a.direct)||a.distance-b.distance||a.company.name.localeCompare(b.company.name)||a.line.id.localeCompare(b.line.id));
}
