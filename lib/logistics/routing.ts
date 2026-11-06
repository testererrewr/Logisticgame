import type {Coords,Track} from './engine.ts';
import {kmBetween} from './engine.ts';
export type RailRoute={path:Coords[];km:number;trackIds:string[]};
const KEY=(p:Coords)=>`${p[0].toFixed(7)}:${p[1].toFixed(7)}`;
const CLOSE=.4;
const STATION=.75;
const rad=Math.PI/180;
function projection(p:Coords,a:Coords,b:Coords){const cos=Math.cos(((a[0]+b[0])/2)*rad);const dx=(b[1]-a[1])*cos,dy=b[0]-a[0],den=dx*dx+dy*dy;
 const t=den===0?0:Math.max(0,Math.min(1,((p[1]-a[1])*cos*dx+(p[0]-a[0])*dy)/den));const point:Coords=[a[0]+(b[0]-a[0])*t,a[1]+(b[1]-a[1])*t];return {t,point,km:kmBetween(p,point)};}
export function snapTrackEndpoint(tracks:Track[],p:Coords):Coords{
 let candidate=p,dist=.05;
 for(const t of tracks)for(const e of [t.from,t.to]){const d=kmBetween(p,e);if(d<dist){dist=d;candidate=e;}}
 for(const t of tracks){const projected=projection(p,t.from,t.to);if(projected.km<dist){dist=projected.km;candidate=projected.point;}}return candidate;
}
export function railRoute(tracks:Track[],from:Coords,to:Coords):RailRoute|null{
 if(!tracks.length)return null;
 type Cut={t:number;p:Coords};
 const cuts:Cut[][]=tracks.map(t=>[{t:0,p:t.from},{t:1,p:t.to}]);
 for(let i=0;i<tracks.length;i++)for(let j=i+1;j<tracks.length;j++){
  const a=tracks[i],b=tracks[j],cos=Math.cos((a.from[0]+b.from[0])*rad/2);
  const p=[a.from[1]*cos,a.from[0]],r=[(a.to[1]-a.from[1])*cos,a.to[0]-a.from[0]],q=[b.from[1]*cos,b.from[0]],s=[(b.to[1]-b.from[1])*cos,b.to[0]-b.from[0]];
  const cross=(x:number[],y:number[])=>x[0]*y[1]-x[1]*y[0];const d=cross(r,s);if(Math.abs(d)<1e-13)continue;
  const delta=[q[0]-p[0],q[1]-p[1]],u=cross(delta,s)/d,v=cross(delta,r)/d;
  if(u>=-1e-9&&u<=1+1e-9&&v>=-1e-9&&v<=1+1e-9){const at:Coords=[a.from[0]+(a.to[0]-a.from[0])*u,a.from[1]+(a.to[1]-a.from[1])*u];cuts[i].push({t:u,p:at});cuts[j].push({t:v,p:at});}
 }
 let origin:Coords|null=null,target:Coords|null=null;
 for(const [num,station]of [from,to].entries()){
  let found=-1,best=STATION,point:Coords|null=null,position=0;
  tracks.forEach((t,i)=>{const p=projection(station,t.from,t.to);if(p.km<=best){best=p.km;found=i;point=p.point;position=p.t;}});
  if(found<0||!point)return null;
  cuts[found].push({t:position,p:point});if(num===0)origin=point;else target=point;
 }
 if(!origin||!target)return null;
 const nodes:Coords[]=[],nodeIds=new Map<string,number>(),edges:{to:number;km:number;trackId:string}[][]=[];
 function node(p:Coords){const key=KEY(p);let id=nodeIds.get(key);if(id===undefined){id=nodes.length;nodeIds.set(key,id);nodes.push(p);edges.push([]);}return id;}
 tracks.forEach((t,i)=>{const byT=cuts[i].sort((a,b)=>a.t-b.t);for(let k=1;k<byT.length;k++){
  const a=node(byT[k-1].p),b=node(byT[k].p),km=kmBetween(nodes[a],nodes[b]);if(a===b||km<.000001)continue;
  edges[a].push({to:b,km,trackId:t.id});edges[b].push({to:a,km,trackId:t.id});
 }});
 for(let i=0;i<tracks.length;i++)for(let j=i+1;j<tracks.length;j++)for(const a of [tracks[i].from,tracks[i].to])for(const b of [tracks[j].from,tracks[j].to]){
  const km=kmBetween(a,b);if(km>0&&km<=CLOSE){const n=node(a),m=node(b);if(n!==m){edges[n].push({to:m,km,trackId:tracks[i].id});edges[m].push({to:n,km,trackId:tracks[j].id});}}
 }
 const start=nodeIds.get(KEY(origin)),end=nodeIds.get(KEY(target));if(start===undefined||end===undefined)return null;
 const dist=nodes.map(()=>Infinity),prev=new Map<number,{node:number;trackId:string}>(),visited=new Set<number>();dist[start]=0;
 for(;;){let top=-1,best=Infinity;for(let i=0;i<nodes.length;i++)if(!visited.has(i)&&dist[i]<best){top=i;best=dist[i];}if(top<0||top===end)break;
  visited.add(top);for(const edge of edges[top]){const value=best+edge.km;if(value<dist[edge.to]){dist[edge.to]=value;prev.set(edge.to,{node:top,trackId:edge.trackId});}}
 }
 if(!Number.isFinite(dist[end]))return null;
 const path:Coords[]=[nodes[end]],trackIds:string[]=[];let at=end;
 while(at!==start){const p=prev.get(at);if(!p)return null;trackIds.unshift(p.trackId);at=p.node;path.unshift(nodes[at]);}
 const full=[from,...path,to].filter((p,i,a)=>!i||kmBetween(p,a[i-1])>.00001);
 return {path:full,km:dist[end]+kmBetween(from,origin)+kmBetween(to,target),trackIds:[...new Set(trackIds)]};
}
