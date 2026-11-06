import {env} from 'cloudflare:workers';
import {settleAllWorlds} from '../../online/route';
export async function POST(req:Request){
 const raw=await req.text();if(raw.length>1024)return Response.json({error:'Anfrage zu groß.'},{status:413});
 const expected=(env as any).SIMULATION_TRIGGER_SECRET,provided=req.headers.get('authorization');
 if(!expected||provided!=='Bearer '+expected)return Response.json({error:'Nicht autorisiert.'},{status:401});
 const result=await settleAllWorlds('external-cron');return Response.json({ok:result.errors.length===0,...result},{headers:{'Cache-Control':'no-store'}});
}
