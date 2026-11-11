import {NextRequest,NextResponse} from 'next/server';
import {env} from 'cloudflare:workers';
import {currentUser} from '../online/route';
import {sameOrigin} from '../../../../lib/same-origin';
import {instanceRole} from '../../../../lib/logistics/world-hosting';
const db=()=>env.DB!;
const reply=(d:unknown,status=200)=>NextResponse.json(d,{status,headers:{'Cache-Control':'no-store'}});
type Notice={message:string;at:number;until:number;by?:string};
const KEYS=()=>['maintenance:all','maintenance:'+instanceRole()];
async function current(){const rows=(await db().prepare('SELECT id,payload FROM logistics_runtime WHERE id IN (?,?)').bind(...KEYS()).all<{id:string;payload:string}>().catch(()=>({results:[]as {id:string;payload:string}[]}))).results;
 const now=Date.now();return rows.map(r=>{try{return JSON.parse(r.payload) as Notice;}catch{return null;}}).filter((n):n is Notice=>!!n&&n.until>now).sort((a,b)=>a.at-b.at)[0]||null;}
export async function GET(){return reply({maintenance:await current(),instance:instanceRole()});}
export async function POST(req:NextRequest){
 const secret=(env as any).SIMULATION_TRIGGER_SECRET,bySecret=!!secret&&req.headers.get('authorization')==='Bearer '+secret;
 let by='Server';if(!bySecret){const u=await currentUser(req);if(!u||!['owner','admin'].includes(u.role))return reply({error:'Nur für Administratoren.'},403);if(!sameOrigin(req))return reply({error:'Ungültiger Ursprung.'},403);by=u.name;}
 const b=await req.json().catch(()=>({})) as any,scope=['all','stable','test'].includes(b.scope)?b.scope:bySecret?instanceRole():'all',key='maintenance:'+scope;
 if(b.clear){await db().prepare('DELETE FROM logistics_runtime WHERE id=?').bind(key).run();return reply({ok:true,maintenance:null});}
 const minutes=Math.max(1,Math.min(240,Math.round(Number(b.minutes)||10))),now=Date.now();
 const n:Notice={message:String(b.message||'Wartungsarbeiten: Der Server startet gleich neu. Bitte kurz abwarten, dein Spielstand bleibt erhalten.').slice(0,300),at:now+minutes*60000,until:now+(minutes+15)*60000,by};
 await db().prepare('INSERT OR REPLACE INTO logistics_runtime(id,updated,payload) VALUES(?,?,?)').bind(key,now,JSON.stringify(n)).run();return reply({ok:true,maintenance:n});}
