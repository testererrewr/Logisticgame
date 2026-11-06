import {meters,type RealMap,type LatLon} from './real-map';
import type {World} from './game';
export function mapStructure(world:World,owner:string,foreign:boolean){return JSON.stringify(world.state.companies.filter(c=>foreign||c.id===owner).map(c=>[c.id,c.color,c.name,c.stops,c.facilities,c.tracks,c.lines.map(({fare,ticketPrice,vehicles,costCache,rents,railUsage,electrified,railSpeed,throughStops,...l}:any)=>l)]));}
export function roadDirections(m:RealMap,zoom:number,contains:(p:LatLon)=>boolean){
 if(zoom<16)return [];const result:{point:LatLon;heading:number;oneway:boolean}[]=[];const gap=zoom>=18?65:zoom>=17?100:160;
 for(const r of m.roads){if(r.oneway!==1&&r.oneway!==-1)continue;let distance=0;for(let i=1;i<r.nodes.length;i++){const a=m.nodes[r.nodes[i-1]],b=m.nodes[r.nodes[i]];distance+=meters(a,b);if(distance<gap&&i<r.nodes.length-1)continue;distance=0;const point:LatLon=[(a[0]+b[0])/2,(a[1]+b[1])/2];if(!contains(point))continue;const reverse=r.oneway===-1?-1:1,heading=Math.atan2((b[1]-a[1])*Math.cos(point[0]*Math.PI/180)*reverse,(b[0]-a[0])*reverse)*180/Math.PI;result.push({point,heading,oneway:true});if(result.length>=500)return result;}}
 return result;
}
