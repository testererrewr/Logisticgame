import {createInterface} from 'node:readline';
import {identifyPartner} from '../lib/logistics/engine.ts';
const q=s=>"'"+String(s).replace(/'/g,"''")+"'";
let n=0,changed=0,batch=[];const moves={};
const flush=()=>{if(!batch.length)return;process.stdout.write('BEGIN;\n'+batch.join('\n')+'\nCOMMIT;\n.shell sleep 0.05\n');batch=[];};
process.stdout.write('.timeout 60000\n');
for await (const line of createInterface({input:process.stdin,crlfDelay:Infinity})){const a=line.indexOf('\t'),b=line.indexOf('\t',a+1);if(a<0||b<0)continue;n++;
 const id=line.slice(0,a),kind=line.slice(a+1,b);let tags;try{tags=JSON.parse(line.slice(b+1)||'{}');}catch{continue;}
 const next=identifyPartner(tags||{});if(!next||next===kind)continue;changed++;moves[kind+'→'+next]=(moves[kind+'→'+next]||0)+1;
 batch.push(`UPDATE logistics_partner_registry SET kind=${q(next)},payload=json_set(payload,'$.kind',${q(next)}) WHERE id=${q(id)};`);if(batch.length>=500)flush();
 if(n%500000===0)process.stderr.write(`  ${n.toLocaleString('de-DE')} geprüft, ${changed.toLocaleString('de-DE')} umgestuft\n`);}
flush();process.stderr.write(`Fertig: ${n.toLocaleString('de-DE')} geprüft, ${changed.toLocaleString('de-DE')} umgestuft\n`+Object.entries(moves).sort((x,y)=>y[1]-x[1]).slice(0,25).map(([k,v])=>`  ${k}: ${v}`).join('\n')+'\n');
