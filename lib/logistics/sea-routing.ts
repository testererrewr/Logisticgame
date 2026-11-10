import grid from '../../data/sea-grid.json';

/** Seewege für Schiffe: A* auf einem 0,2°-Wasserraster (Land aus Ländergrenzen, Kanäle/Meerengen freigeschnitten).
 * Start und Ziel (Häfen an der Küste) werden auf die nächste Wasserzelle gesetzt; der Weg wird anschließend geglättet. */
type Coords=[number,number];
const RES=(grid as {res:number}).res,W=(grid as {w:number}).w,H=(grid as {h:number}).h;
let water:Uint8Array|null=null;
function mask(){if(water)return water;const m=new Uint8Array(W*H);const rows=(grid as {rows:number[][]}).rows;for(let y=0;y<H;y++){let x=0,v=0;for(const n of rows[y]){if(v===0)for(let i=0;i<n;i++)m[y*W+x+i]=1;x+=n;v^=1;}}return water=m;}
const cellOf=(lat:number,lon:number):[number,number]=>[Math.max(0,Math.min(H-1,Math.floor((90-lat)*RES))),((Math.floor((lon+180)*RES)%W)+W)%W];
const centerOf=(y:number,x:number):Coords=>[90-(y+.5)/RES,(x+.5)/RES-180];
const isWater=(y:number,x:number)=>y>=0&&y<H&&mask()[y*W+((x%W)+W)%W]===1;
let comp:Int32Array|null=null,compSize:number[]=[];
/** Zusammenhängende Wasserflächen; kleine Tümpel/Binnenseen (< 400 Zellen) sind kein Seeweg. */
function components(){if(comp)return comp;const m=mask(),c=new Int32Array(W*H).fill(-1),q=new Int32Array(W*H);let id=0;for(let i=0;i<W*H;i++){if(!m[i]||c[i]>=0)continue;let h=0,t=0;q[t++]=i;c[i]=id;let n=0;while(h<t){const k=q[h++];n++;const y=Math.floor(k/W),x=k%W;for(const [dy,dx] of [[1,0],[-1,0],[0,1],[0,-1]]){const ny=y+dy;if(ny<0||ny>=H)continue;const j=ny*W+((x+dx+W)%W);if(m[j]&&c[j]<0){c[j]=id;q[t++]=j;}}}compSize[id]=n;id++;}return comp=c;}
const navigable=(y:number,x:number)=>{if(!isWater(y,x))return false;const c=components()[y*W+((x%W)+W)%W];return compSize[c]>=400;};
function nearestWater(lat:number,lon:number,maxRing=40):[number,number]|null{const [cy,cx]=cellOf(lat,lon);if(navigable(cy,cx))return [cy,cx];for(let r=1;r<=maxRing;r++){let best:[number,number]|null=null,bd=Infinity;for(let dy=-r;dy<=r;dy++)for(let dx=-r;dx<=r;dx++){if(Math.max(Math.abs(dy),Math.abs(dx))!==r)continue;const y=cy+dy,x=((cx+dx)%W+W)%W;if(navigable(y,x)){const d=dy*dy+dx*dx;if(d<bd){bd=d;best=[y,x];}}}if(best)return best;}return null;}
const R=6371;
function km(a:Coords,b:Coords){const p=Math.PI/180,dl=(b[0]-a[0])*p,dn=(b[1]-a[1])*p,h=Math.sin(dl/2)**2+Math.cos(a[0]*p)*Math.cos(b[0]*p)*Math.sin(dn/2)**2;return 2*R*Math.asin(Math.min(1,Math.sqrt(h)));}
/** Sichtlinie über Wasser (Bresenham auf dem Raster, mit Längengrad-Übertrag). */
function clear(a:[number,number],b:[number,number]){let [y0,x0]=a;const [y1,x1raw]=b;let dxw=x1raw-x0;if(dxw>W/2)dxw-=W;if(dxw<-W/2)dxw+=W;const x1=x0+dxw,dx=Math.abs(x1-x0),dy=-Math.abs(y1-y0),sx=x0<x1?1:-1,sy=y0<y1?1:-1;let err=dx+dy,x=x0;for(let i=0;i<4000;i++){if(!isWater(y0,x))return false;if(x===x1&&y0===y1)return true;const e2=2*err;if(e2>=dy){err+=dy;x+=sx;}if(e2<=dx){err+=dx;y0+=sy;}}return false;}
const cache=new Map<string,{km:number;path:Coords[]}|null>();
/** maxSnapKm: Binnenhäfen weit weg vom Meer bekommen keinen Seeweg (Flüsse sind nicht im Raster). */
export function seaRoute(from:Coords,to:Coords,maxSnapKm=60):{km:number;path:Coords[]}|null{
 const key=maxSnapKm+':'+from.map(n=>n.toFixed(3)).join(',')+'>'+to.map(n=>n.toFixed(3)).join(',');if(cache.has(key))return cache.get(key)!;
 const s=nearestWater(from[0],from[1]),t=nearestWater(to[0],to[1]);if(s&&km(from,centerOf(s[0],s[1]))>maxSnapKm||t&&km(to,centerOf(t[0],t[1]))>maxSnapKm){cache.set(key,null);return null;}if(!s||!t||components()[s[0]*W+s[1]]!==components()[t[0]*W+t[1]]){cache.set(key,null);return null;}
 const m=mask(),N=W*H,start=s[0]*W+s[1],goal=t[0]*W+t[1];
 const g=new Float64Array(N).fill(Infinity),prev=new Int32Array(N).fill(-1),closed=new Uint8Array(N);
 const cosY=(y:number)=>Math.max(.05,Math.cos((90-(y+.5)/RES)*Math.PI/180));
 const h=(i:number)=>{const y=Math.floor(i/W),x=i%W;let dx=Math.abs(x-t[1]);dx=Math.min(dx,W-dx);return Math.hypot(dx*Math.min(cosY(y),cosY(t[0])),y-t[0]);};
 // binärer Heap (Index + f-Wert)
 let heap:number[]=[],fv:number[]=[];
 const push=(i:number,f:number)=>{heap.push(i);fv.push(f);let k=heap.length-1;while(k>0){const p=(k-1)>>1;if(fv[p]<=fv[k])break;[heap[p],heap[k]]=[heap[k],heap[p]];[fv[p],fv[k]]=[fv[k],fv[p]];k=p;}};
 const pop=()=>{const top=heap[0],lastI=heap.pop()!,lastF=fv.pop()!;if(heap.length){heap[0]=lastI;fv[0]=lastF;let k=0;for(;;){const l=2*k+1,r=l+1;let m2=k;if(l<heap.length&&fv[l]<fv[m2])m2=l;if(r<heap.length&&fv[r]<fv[m2])m2=r;if(m2===k)break;[heap[m2],heap[k]]=[heap[k],heap[m2]];[fv[m2],fv[k]]=[fv[k],fv[m2]];k=m2;}}return top;};
 g[start]=0;push(start,h(start));let found=false,steps=0;
 while(heap.length&&steps<1500000){const i=pop();steps++;if(closed[i])continue;closed[i]=1;if(i===goal){found=true;break;}const y=Math.floor(i/W),x=i%W,cy=cosY(y);
  for(let dy=-1;dy<=1;dy++)for(let dx=-1;dx<=1;dx++){if(!dx&&!dy)continue;const ny=y+dy;if(ny<0||ny>=H)continue;const nx=(x+dx+W)%W,j=ny*W+nx;if(!m[j]||closed[j])continue;if(dx&&dy&&(!m[y*W+nx]||!m[ny*W+x]))continue;const c=Math.hypot(dx*cy,dy),ng=g[i]+c;if(ng<g[j]){g[j]=ng;prev[j]=i;push(j,ng+h(j));}}}
 if(!found){cache.set(key,null);return null;}
 const cells:[number,number][]=[];for(let i=goal;i!==-1;i=prev[i])cells.push([Math.floor(i/W),i%W]);cells.reverse();
 // Glätten: von jedem Punkt so weit wie möglich geradeaus über Wasser
 const keep:[number,number][]=[cells[0]];let a=0;while(a<cells.length-1){let b=cells.length-1;while(b>a+1&&!clear(cells[a],cells[b]))b=a+1+Math.floor((b-a-1)/2);let j=b;while(j+1<cells.length&&clear(cells[a],cells[j+1])&&j-b<64)j++;keep.push(cells[j]);a=j;}
 // Koordinaten mit stetigem Längengrad (Datumsgrenze ohne Sprung)
 const path:Coords[]=[from];let last=from[1];for(const [y,x] of keep){const c=centerOf(y,x);let lon=c[1];while(lon-last>180)lon-=360;while(lon-last<-180)lon+=360;path.push([c[0],lon]);last=lon;}
 let tl=to[1];while(tl-last>180)tl-=360;while(tl-last<-180)tl+=360;path.push([to[0],tl]);
 let total=0;for(let i=1;i<path.length;i++)total+=km(path[i-1],path[i]);const out={km:Math.round(total*10)/10,path:path.map(p=>[Math.round(p[0]*1e5)/1e5,Math.round(p[1]*1e5)/1e5] as Coords)};
 if(cache.size>2000)cache.clear();cache.set(key,out);return out;
}
