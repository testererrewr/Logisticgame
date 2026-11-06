import type {LatLon} from './real-map';
export type ViewBounds={south:number;west:number;north:number;east:number};
export function pathInView(path:LatLon[],bounds:ViewBounds){
 if(!path.length)return false;if(bounds.east-bounds.west>=360)return path.some(p=>p[0]>=bounds.south&&p[0]<=bounds.north)||path.some((p,i)=>i&&Math.min(p[0],path[i-1][0])<=bounds.north&&Math.max(p[0],path[i-1][0])>=bounds.south);
 const center=(bounds.west+bounds.east)/2,longitude=(x:number)=>x+Math.round((center-x)/360)*360;
 const inside=(p:LatLon)=>p[0]>=bounds.south&&p[0]<=bounds.north&&longitude(p[1])>=bounds.west&&longitude(p[1])<=bounds.east;if(path.some(inside))return true;
 for(let i=1;i<path.length;i++){const a=path[i-1],b=path[i],x=longitude(a[1]),bx=b[1]+Math.round((x-b[1])/360)*360,dx=bx-x,dy=b[0]-a[0];let low=0,high=1,hit=true;for(const [p,q]of [[-dx,x-bounds.west],[dx,bounds.east-x],[-dy,a[0]-bounds.south],[dy,bounds.north-a[0]]]){if(!p){if(q<0){hit=false;break;}continue;}const t=q/p;if(p<0)low=Math.max(low,t);else high=Math.min(high,t);if(low>high){hit=false;break;}}if(hit)return true;}
 return false;
}
