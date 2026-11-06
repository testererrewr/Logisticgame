import {getMap,type LatLon} from './real-map';
// Non-overlapping 4 km data tiles are loaded only at street scale. They do not
// constrain the Leaflet camera or create separate game maps.
const SPAN=4000/111320;
export function tileAt(p:LatLon){const row=Math.floor((Math.max(-85.05112878,Math.min(85.05112878,p[0]))+80)/SPAN),lat=-80+(row+.5)*SPAN,width=SPAN/Math.cos(lat*Math.PI/180),col=Math.floor(((((p[1]+180)%360)+360)%360)/width);return `geo_${row}_${col}`;}
export function tileCenter(key:string):LatLon|null{const match=/^geo_(-?\d+)_(\d+)$/.exec(key);if(!match)return null;const row=Number(match[1]),col=Number(match[2]),lat=-80+(row+.5)*SPAN;if(!Number.isSafeInteger(row)||!Number.isSafeInteger(col)||Math.abs(lat)>85.1)return null;const width=SPAN/Math.cos(lat*Math.PI/180),lon=-180+(col+.5)*width;if(lon>180+width/2)return null;return [lat,lon];}
export function sphericalDistance(a:LatLon,b:LatLon){const r=Math.PI/180,h=Math.sin((b[0]-a[0])*r/2)**2+Math.cos(a[0]*r)*Math.cos(b[0]*r)*Math.sin((b[1]-a[1])*r/2)**2;return 6371000*2*Math.asin(Math.min(1,Math.sqrt(h)));}
function bearing(a:LatLon,b:LatLon){const r=Math.PI/180,d=(b[1]-a[1])*r;return Math.atan2(Math.sin(d)*Math.cos(b[0]*r),Math.cos(a[0]*r)*Math.sin(b[0]*r)-Math.sin(a[0]*r)*Math.cos(b[0]*r)*Math.cos(d));}
export function distanceToPath(p:LatLon,path:LatLon[]){let best=Infinity;for(let i=0;i<path.length;i++){best=Math.min(best,sphericalDistance(p,path[i]));if(!i)continue;const a=path[i-1],b=path[i],d=sphericalDistance(a,p)/6371000,angle=bearing(a,p)-bearing(a,b),along=Math.atan2(Math.sin(d)*Math.cos(angle),Math.cos(d))*6371000;if(along>=0&&along<=sphericalDistance(a,b))best=Math.min(best,Math.abs(Math.asin(Math.max(-1,Math.min(1,Math.sin(d)*Math.sin(angle))))*6371000));}return best;}
export function mappedCenter(key:string):LatLon|null{const m=getMap(key);return m?[m.lat,m.lon]:tileCenter(key);}
