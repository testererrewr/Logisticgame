import countries from '../data/countries.json';
import type {WorldState} from './game';
import type {LatLon} from './real-map';
const polygons=(countries as any[]).map(c=>({name:c.name,polygons:c.geometry.type==='Polygon'?[c.geometry.coordinates]:c.geometry.coordinates})).map(c=>({...c,polygons:c.polygons.map((p:number[][][])=>{const flat=p[0];return {rings:p,minX:Math.min(...flat.map(v=>v[0])),maxX:Math.max(...flat.map(v=>v[0])),minY:Math.min(...flat.map(v=>v[1])),maxY:Math.max(...flat.map(v=>v[1]))};})}));
function ring(x:number,y:number,r:number[][]){let inside=false;for(let i=0,j=r.length-1;i<r.length;j=i++){const a=r[i],b=r[j];if((a[1]>y)!==(b[1]>y)&&x<(b[0]-a[0])*(y-a[1])/(b[1]-a[1])+a[0])inside=!inside;}return inside;}
export function countryAt(point:LatLon){const [y,x]=point;for(const c of polygons)for(const p of c.polygons)if(x>=p.minX&&x<=p.maxX&&y>=p.minY&&y<=p.maxY&&ring(x,y,p.rings[0])&&!p.rings.slice(1).some((r:number[][])=>ring(x,y,r)))return c.name;return 'Nicht zugeordnet';}
export function assignCountries(s:WorldState){for(const c of s.companies)for(const site of [...c.stops||[],...c.facilities||[]])site.country??=countryAt(site.point);}
export interface CountryArea {name:string;boxes:{minX:number;maxX:number;minY:number;maxY:number;area:number}[];area:number}
let areas:CountryArea[]|undefined;
export function countryAreas():CountryArea[]{return areas??=polygons.map(c=>{const boxes=c.polygons.map((p:any)=>({minX:p.minX,maxX:p.maxX,minY:p.minY,maxY:p.maxY,area:Math.max(.0001,(p.maxX-p.minX)*(p.maxY-p.minY))})).sort((a:any,b:any)=>b.area-a.area).slice(0,8);return {name:c.name,boxes,area:boxes.reduce((n:number,b:any)=>n+b.area,0)};});}
export function inCountry(name:string,point:LatLon){const [y,x]=point;const c=polygons.find(c=>c.name===name);if(!c)return false;return c.polygons.some((p:any)=>x>=p.minX&&x<=p.maxX&&y>=p.minY&&y<=p.maxY&&ring(x,y,p.rings[0])&&!p.rings.slice(1).some((r:number[][])=>ring(x,y,r)));}
