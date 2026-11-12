import {env} from 'cloudflare:workers';
import {settleAllWorlds} from '../api/logistik/online/route';
export const dynamic='force-dynamic';
const tool={name:'settle_logistics_worlds',description:'Rechnet alle laufenden Logistikwelten unabhängig von offenen Browsern ab und speichert den Hintergrund-Heartbeat. Nur Site-Besitzer.',inputSchema:{type:'object',properties:{},additionalProperties:false}};
export async function POST(req:Request){const rpc:any=await req.json(),id=rpc.id??null;const reply=(result:unknown,status=200)=>Response.json({jsonrpc:'2.0',id,result},{status});
 if(rpc.method==='server/discover')return reply({supportedVersions:['2026-07-28'],capabilities:{tools:{}}});
 if(rpc.method==='initialize')return reply({protocolVersion:'2025-03-26',capabilities:{tools:{}},serverInfo:{name:'Loadstar',version:'2'}});
 if(rpc.method==='notifications/initialized')return new Response(null,{status:204});if(rpc.method==='tools/list')return reply({tools:[tool]});
 const email=req.headers.get('oai-authenticated-user-email')?.trim().toLowerCase(),owner=(env as any).SIMULATION_OWNER_EMAIL?.trim().toLowerCase();
 if(!owner||email!==owner)return reply({isError:true,content:[{type:'text',text:'Nur der verifizierte Site-Besitzer.'}]},403);
 if(rpc.method!=='tools/call'||rpc.params?.name!==tool.name)return reply({isError:true,content:[{type:'text',text:'Unbekanntes Werkzeug.'}]});
 const result=await settleAllWorlds('cloud-task');return reply({isError:result.errors.length>0,content:[{type:'text',text:JSON.stringify(result)}]});
}
