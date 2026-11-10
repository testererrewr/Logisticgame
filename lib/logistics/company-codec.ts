import type {State,RouteLeg} from './engine';
const PREFIX='gz:';
/** D1 speichert höchstens ~2 MB je Wert. */
const LIMIT=1900000;
type Pt=[number,number];
/** Douglas-Peucker mit wachsender Toleranz, bis höchstens max Punkte übrig sind. */
function thin(path:Pt[],max:number):Pt[]{if(path.length<=max)return path;let tol=.00002,out=path;for(let i=0;i<14&&out.length>max;i++){out=dp(path,tol);tol*=2;}if(out.length>max){const step=Math.ceil(out.length/max);out=out.filter((_,i)=>i%step===0||i===out.length-1);}return out;}
function dp(points:Pt[],tolerance:number):Pt[]{const keep=new Uint8Array(points.length);keep[0]=keep[points.length-1]=1;const stack:[number,number][]=[[0,points.length-1]];const t2=tolerance*tolerance;while(stack.length){const [a,b]=stack.pop()!;const p=points[a],q=points[b],dx=q[1]-p[1],dy=q[0]-p[0],den=dx*dx+dy*dy;let max=t2,at=-1;for(let i=a+1;i<b;i++){const v=points[i];let ex:number,ey:number;if(den){const t=Math.max(0,Math.min(1,((v[1]-p[1])*dx+(v[0]-p[0])*dy)/den));ex=p[1]+t*dx-v[1];ey=p[0]+t*dy-v[0];}else{ex=p[1]-v[1];ey=p[0]-v[0];}const d=ex*ex+ey*ey;if(d>max){max=d;at=i;}}if(at>0){keep[at]=1;stack.push([a,at],[at,b]);}}return points.filter((_,i)=>keep[i]);}
const round=(p:Pt):Pt=>[Math.round(p[0]*1e5)/1e5,Math.round(p[1]*1e5)/1e5];
/** Spielstand verkleinern: ungenutzte gespeicherte Straßenrouten entfernen und Streckengeometrie ausdünnen (Kilometer bleiben exakt). */
export function compactState(s:State,maxPoints:number){
 const used=new Set<string>();for(const l of s.lines)if(!l.deleted)for(const st of l.stops)used.add(st.siteId);for(const v of s.vehicles){if(v.locationId)used.add(v.locationId);if(v.targetId)used.add(v.targetId);}
 s.roadRoutes=(s.roadRoutes||[]).filter(r=>used.has(r.fromId)&&used.has(r.toId));
 const fix=(leg?:RouteLeg)=>{if(leg?.path?.length)leg.path=thin(leg.path as Pt[],maxPoints).map(round) as RouteLeg['path'];};
 for(const r of s.roadRoutes)fix(r);for(const l of s.lines){if(l.deleted&&l.legs)l.legs=undefined;else for(const leg of l.legs||[])fix(leg);}for(const v of s.vehicles)fix(v.currentLeg);
 s.lines=s.lines.filter(l=>!l.deleted||s.vehicles.some(v=>v.lineId===l.id||v.returnLineId===l.id||v.pendingLineId===l.id));
 return s;
}
async function gzip(text:string){const raw=new Uint8Array(await new Response(new Blob([text]).stream().pipeThrough(new CompressionStream('gzip'))).arrayBuffer());
 let b64:string;if(typeof Buffer!=='undefined')b64=Buffer.from(raw).toString('base64');else{let binary='';for(let i=0;i<raw.length;i+=8192)binary+=String.fromCharCode(...raw.subarray(i,i+8192));b64=btoa(binary);}return PREFIX+b64;}
export async function encodeCompany(state:State):Promise<string>{
 const base=state.sites.some(p=>(p as {allianceShared?:boolean}).allianceShared)?{...state,sites:state.sites.filter(p=>!(p as {allianceShared?:boolean}).allianceShared)}:state;
 let text=JSON.stringify(base);if(text.length<1500000)return text;
 let out=await gzip(text);if(out.length<=LIMIT)return out;
 // Zu groß: schrittweise Geometrie ausdünnen, bis es passt (statt die ganze Welt mit einem Fehler zu blockieren)
 for(const max of [3000,1200,500,200,80]){const small=compactState(structuredClone(base) as State,max);text=JSON.stringify(small);out=text.length<1500000?text:await gzip(text);if(out.length<=LIMIT){if(typeof console!=='undefined')console.warn(`[logistik] Spielstand verkleinert (Strecken max. ${max} Punkte): ${out.length} Zeichen`);return out;}}
 throw Error('Spielstand zu groß zum Speichern.');
}
export async function decodeCompany(value:string):Promise<State>{
 if(!value.startsWith(PREFIX))return JSON.parse(value) as State;
 const b64=value.slice(PREFIX.length),raw=typeof Buffer!=='undefined'?new Uint8Array(Buffer.from(b64,'base64')):Uint8Array.from(atob(b64),x=>x.charCodeAt(0));
 return JSON.parse(await new Response(new Blob([raw]).stream().pipeThrough(new DecompressionStream('gzip'))).text()) as State;
}
