import {createInterface} from 'node:readline';
import {identifyPartner} from '../lib/logistics/engine.ts';
const q=s=>"'"+String(s).replace(/\u0000/g,'').replace(/'/g,"''")+"'";
let n=0,changed=0,batch=[];const counts={};
const flush=()=>{if(!batch.length)return;process.stdout.write('BEGIN;\n'+batch.join('\n')+'\nCOMMIT;\n');batch=[];};
process.stdout.write('.timeout 60000\n');
for await (const line of createInterface({input:process.stdin,crlfDelay:Infinity})){const i=line.indexOf('\x1f');if(i<0)continue;n++;let site;try{site=JSON.parse(line.slice(i+1));}catch{continue;}
 const kind=identifyPartner(site.tags||{});if(!kind||kind===site.kind)continue;counts[site.kind+'→'+kind]=(counts[site.kind+'→'+kind]||0)+1;site.kind=kind;changed++;
 batch.push(`UPDATE logistics_partner_registry SET kind=${q(kind)},payload=${q(JSON.stringify(site))} WHERE id=${q(line.slice(0,i))};`);if(batch.length>=1000)flush();}
flush();console.error(`Neu eingeordnet: ${changed} von ${n} Betrieben · `+Object.entries(counts).sort((a,b)=>b[1]-a[1]).slice(0,12).map(([k,v])=>k+' '+v).join(', '));
