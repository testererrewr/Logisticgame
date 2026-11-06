import {env} from 'cloudflare:workers';
export async function GET(){try{await env.DB!.prepare('SELECT 1 AS ok').first();return Response.json({ok:true,at:Date.now()},{headers:{'Cache-Control':'no-store'}});}catch(e:any){return Response.json({ok:false,error:String(e?.message||e)},{status:503,headers:{'Cache-Control':'no-store'}});}}
