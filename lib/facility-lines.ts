import {sharedCompany} from './infrastructure-context';
import type {RailVia} from './rail-network';
import type {Company,Line,Mode} from './game';
import {railItinerary} from './rail-network';
import {sphericalDistance} from './geography';
export function facilityLine(c:Company,mode:Mode,ids:any,via:RailVia[]=[],routeMode:'shuttle'|'loop'='shuttle'){
 c=sharedCompany(c);
 const type=mode==='train'?'station':mode==='plane'?'airport':'port';
 if(!Array.isArray(ids)||ids.length<2||ids.length>256||ids.some((id,i)=>i>0&&id===ids[i-1]))throw Error('Wähle 2–256 Stationen; aufeinanderfolgende Halte müssen verschieden sein.');
 const stops=ids.map(id=>c.facilities?.find(f=>f.id===id&&f.type===type));if(stops.some(f=>!f))throw Error('Wähle gebaute Stationen des passenden Typs.');
 if(!['shuttle','loop'].includes(routeMode))throw Error('Ungültige Linienführung.');const routeIds=routeMode==='loop'?[...ids,ids[0]]:ids,rail=mode==='train'?railItinerary(c,routeIds,via):null;if(mode==='train'&&!rail)throw Error('Zwischen den Bahnhöfen fehlt eine durchgehende Gleisverbindung.');
 const points=stops.map(f=>f!.point),geometry=routeMode==='loop'?[...points,points[0]]:points,segmentKm=rail?.segmentKm||geometry.slice(1).map((p,i)=>sphericalDistance(geometry[i],p)/1000);
 return {...(rail||{}),facilityIds:ids as string[],fromFacility:ids[0] as string,toFacility:ids.at(-1) as string,a:stops[0]!.city.split('~')[0],b:stops.at(-1)!.city.split('~')[0],city:stops.every(f=>f!.city===stops[0]!.city)?stops[0]!.city:undefined,stopPoints:points,stopAreas:stops.map(f=>f!.city),path:rail?.path||geometry,segmentKm,length:segmentKm.reduce((s,n)=>s+n,0),routeMode};
}
