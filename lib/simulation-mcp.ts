export const simulationTool={name:'settle_running_worlds',description:'Gleicht laufende Loadstar-Welten auch ohne angemeldete Spieler ab. Verbucht nur echte simulierte Fahrgastwechsel und Betriebskosten. Nur für den Site-Besitzer.',inputSchema:{type:'object',properties:{maxWorlds:{type:'integer',minimum:1,maximum:8,default:4},maxBatches:{type:'integer',minimum:1,maximum:8,default:4}},additionalProperties:false}};
export async function simulationMcp(request:Request,ownerEmail:string,execute:(options:any)=>Promise<any>){
 const json=(value:any,status=200)=>Response.json(value,{status,headers:{'Cache-Control':'no-store'}});let rpc:any;try{if(Number(request.headers.get('content-length')||0)>8192)return json({error:'Request too large'},413);const text=await request.text();if(text.length>8192)return json({error:'Request too large'},413);rpc=JSON.parse(text);}catch{return json({jsonrpc:'2.0',id:null,error:{code:-32700,message:'Parse error'}},400);}const id=rpc.id??null,reply=(result:any)=>json({jsonrpc:'2.0',id,result});
 if(rpc.method==='server/discover')return reply({supportedVersions:['2026-07-28'],capabilities:{tools:{}}});
 if(rpc.method==='initialize')return reply({protocolVersion:'2025-03-26',capabilities:{tools:{}},serverInfo:{name:'Loadstar Simulation',version:'34'}});
 if(rpc.method==='notifications/initialized')return new Response(null,{status:204});
 if(rpc.method==='tools/list')return reply({tools:[simulationTool]});
 if(rpc.method!=='tools/call')return json({jsonrpc:'2.0',id,error:{code:-32601,message:'Method not found'}},400);
 const email=request.headers.get('oai-authenticated-user-email')?.trim().toLowerCase();if(!email||!ownerEmail||email!==ownerEmail.trim().toLowerCase())return json({jsonrpc:'2.0',id,error:{code:-32001,message:'Nur der verifizierte Site-Besitzer darf den Hintergrundabgleich ausführen.'}},403);
 if(rpc.params?.name!==simulationTool.name)return reply({isError:true,content:[{type:'text',text:'Unbekanntes Werkzeug.'}]});
 const args=rpc.params.arguments??{};if(!args||Array.isArray(args)||typeof args!=='object'||Object.keys(args).some(k=>!['maxWorlds','maxBatches'].includes(k)))return reply({isError:true,content:[{type:'text',text:'Ungültige Parameter.'}]});
 try{const result=await execute(args);return reply({isError:result.hasErrors,content:[{type:'text',text:JSON.stringify(result)}]});}catch(e:any){return reply({isError:true,content:[{type:'text',text:String(e.message||e)}]});}
}
