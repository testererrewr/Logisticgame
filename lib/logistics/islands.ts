import data from '../../data/island-geometry.json';
type Polygon={box:number[];rings:number[][][]};
let cells:Map<string,Polygon[]>|undefined;
function index(){
 if(cells)return cells;
 cells=new Map();
 for(const [box,encoded] of data as [number[],number[][][]][]){
  const polygon={box,rings:encoded.map(ring=>{let x=0,y=0;return ring.map(d=>{x+=d[0];y+=d[1];return [x/10000,y/10000];});})};
  for(let y=Math.floor(box[1]-.002);y<=Math.floor(box[3]+.002);y++)for(let x=Math.floor(box[0]-.02);x<=Math.floor(box[2]+.02);x++){
   const key=x+':'+y,list=cells.get(key);if(list)list.push(polygon);else cells.set(key,[polygon]);
  }
 }
 return cells;
}
function inRing(x:number,y:number,r:number[][]){let inside=false;for(let i=0,j=r.length-1;i<r.length;j=i++){
 const a=r[i],b=r[j];if((a[1]>y)!==(b[1]>y)&&x<(b[0]-a[0])*(y-a[1])/(b[1]-a[1])+a[0])inside=!inside;
 }return inside;}
function nearCoast(x:number,y:number,ring:number[][]){
 const k=Math.max(.05,Math.cos(y*Math.PI/180));
 for(let i=1;i<ring.length;i++){
  const ax=(ring[i-1][0]-x)*111*k,ay=(ring[i-1][1]-y)*111,bx=(ring[i][0]-x)*111*k,by=(ring[i][1]-y)*111;
  const dx=bx-ax,dy=by-ay,t=Math.max(0,Math.min(1,-(ax*dx+ay*dy)/(dx*dx+dy*dy||1)));
  if(Math.hypot(ax+t*dx,ay+t*dy)<=.15)return true;
 }
 return false;
}
export function onIsland(lat:number,longitude:number){
 if(!Number.isFinite(lat)||!Number.isFinite(longitude)||Math.abs(lat)>90)return false;
 const lon=((longitude+180)%360+360)%360-180;
 for(const p of index().get(Math.floor(lon)+':'+Math.floor(lat))||[]){
  const b=p.box;if(lat<b[1]-.002||lat>b[3]+.002||lon<b[0]-.02||lon>b[2]+.02)continue;
  if(p.rings.slice(1).some(r=>inRing(lon,lat,r)))continue;
  if(inRing(lon,lat,p.rings[0])||nearCoast(lon,lat,p.rings[0]))return true;
 }
 return false;
}
