import type {State,RouteLeg} from './engine';
const PREFIX='gz:';

const LIMIT=1900000;
type Pt=[number,number];

function thin(path:Pt[],max:number):Pt[]{if(path.length<=max)return path;let tol=.00002,out=path;for(let i=0;i<14&&out.length>max;i++){out=dp(path,tol);tol*=2;}if(out.length>max){const step=Math.ceil(out.length/max);out=out.filter((_,i)=>i%step===0||i===out.length-1);}return out;}
function dp(points:Pt[],tolerance:number):Pt[]{const keep=new Uint8Array(points.length);keep[0]=keep[points.length-1]=1;const stack:[number,number][]=[[0,points.length-1]];const t2=tolerance*tolerance;while(stack.length){const [a,b]=stack.pop()!;const p=points[a],q=points[b],dx=q[1]-p[1],dy=q[0]-p[0],den=dx*dx+dy*dy;let max=t2,at=-1;for(let i=a+1;i<b;i++){const v=points[i];let ex:number,ey:number;if(den){const t=Math.max(0,Math.min(1,((v[1]-p[1])*dx+(v[0]-p[0])*dy)/den));ex=p[1]+t*dx-v[1];ey=p[0]+t*dy-v[0];}else{ex=p[1]-v[1];ey=p[0]-v[0];}const d=ex*ex+ey*ey;if(d>max){max=d;at=i;}}if(at>0){keep[at]=1;stack.push([a,at],[at,b]);}}return points.filter((_,i)=>keep[i]);}
const round=(p:Pt):Pt=>[Math.round(p[0]*1e5)/1e5,Math.round(p[1]*1e5)/1e5];

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

const CHUNK='gzc:',PART=1800000,MAX_PARTS=32;
let chunkReady:Promise<unknown>|undefined,dbRef:D1Database|undefined;

async function D(){if(!dbRef){const m=await import('cloudflare:workers');dbRef=(m.env as {DB?:D1Database}).DB!;}return dbRef;}
export const ensureChunkTable=()=>chunkTable();
export const deleteChunks=async(world:string,user:string)=>(await D()).prepare('DELETE FROM logistics_company_chunks WHERE owner=?').bind(world+'|'+user);
const chunkTable=()=>chunkReady??=D().then(db=>db.prepare('CREATE TABLE IF NOT EXISTS logistics_company_chunks(id TEXT NOT NULL,idx INTEGER NOT NULL,owner TEXT NOT NULL,data TEXT NOT NULL,created INTEGER NOT NULL,PRIMARY KEY(id,idx))').run().then(()=>db.prepare('CREATE INDEX IF NOT EXISTS logistics_company_chunks_owner ON logistics_company_chunks(owner,created)').run())).catch(e=>{chunkReady=undefined;throw e;});
function stripAlliance(state:State){return state.sites.some(p=>(p as {allianceShared?:boolean}).allianceShared)?{...state,sites:state.sites.filter(p=>!(p as {allianceShared?:boolean}).allianceShared)}:state;}

export async function encodeCompanyParts(state:State,world:string,user:string):Promise<{value:string;statements:D1PreparedStatement[]}>{
 const base=stripAlliance(state);let text=JSON.stringify(base);if(text.length<1500000)return {value:text,statements:[]};
 let out=await gzip(text);if(out.length<=LIMIT)return {value:out,statements:[]};
 let payload=out.slice(PREFIX.length);
 if(payload.length>PART*MAX_PARTS){for(const max of [3000,1200,500]){const small=compactState(structuredClone(base) as State,max);text=JSON.stringify(small);out=await gzip(text);if(out.length<=LIMIT)return {value:out,statements:[]};payload=out.slice(PREFIX.length);if(payload.length<=PART*MAX_PARTS)break;}if(payload.length>PART*MAX_PARTS)throw Error('Spielstand zu groß zum Speichern.');}
 await chunkTable();const db=await D();const owner=world+'|'+user,id=owner+'|'+crypto.randomUUID(),now=Date.now(),parts:string[]=[];for(let i=0;i<payload.length;i+=PART)parts.push(payload.slice(i,i+PART));
 const statements=parts.map((data,idx)=>db.prepare('INSERT OR REPLACE INTO logistics_company_chunks(id,idx,owner,data,created) VALUES(?,?,?,?,?)').bind(id,idx,owner,data,now));

 statements.unshift(db.prepare('DELETE FROM logistics_company_chunks WHERE owner=? AND created<?').bind(owner,now-60000));
 return {value:CHUNK+id+':'+parts.length,statements};
}

export async function encodeCompany(state:State):Promise<string>{
 const base=stripAlliance(state);let text=JSON.stringify(base);if(text.length<1500000)return text;
 let out=await gzip(text);if(out.length<=LIMIT)return out;
 for(const max of [3000,1200,500,200,80]){const small=compactState(structuredClone(base) as State,max);text=JSON.stringify(small);out=text.length<1500000?text:await gzip(text);if(out.length<=LIMIT)return out;}
 throw Error('Spielstand zu groß zum Speichern.');
}
export async function decodeCompany(value:string):Promise<State>{
 let b64:string;
 if(value.startsWith(CHUNK)){const [id,n]=[value.slice(CHUNK.length,value.lastIndexOf(':')),Number(value.slice(value.lastIndexOf(':')+1))];await chunkTable();const rows=(await (await D()).prepare('SELECT idx,data FROM logistics_company_chunks WHERE id=? ORDER BY idx').bind(id).all<{idx:number;data:string}>()).results;if(rows.length!==n)throw Error('Spielstand-Teile fehlen ('+rows.length+'/'+n+').');b64=rows.map(r=>r.data).join('');}
 else if(!value.startsWith(PREFIX))return JSON.parse(value) as State;
 else b64=value.slice(PREFIX.length);
 const _unused=0;const raw=typeof Buffer!=='undefined'?new Uint8Array(Buffer.from(b64,'base64')):Uint8Array.from(atob(b64),x=>x.charCodeAt(0));
 return JSON.parse(await new Response(new Blob([raw]).stream().pipeThrough(new DecompressionStream('gzip'))).text()) as State;
}
