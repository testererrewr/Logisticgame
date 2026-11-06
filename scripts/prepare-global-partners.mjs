import {readFile,writeFile} from 'node:fs/promises';
import {gzipSync} from 'node:zlib';
const raw=JSON.parse(await readFile('data/logistics-global-partners.json','utf8'));
const keys=['industrial','product','produce','craft','man_made','landuse','office','shop','amenity','operator','addr:country'];
const sites=raw.sites.map(p=>({...p,kind:p.tags?.man_made==='petroleum_well'?'oilWell':p.kind,tags:Object.fromEntries(keys.filter(k=>p.tags?.[k]).map(k=>[k,p.tags[k]]))}));
const chunks=[];for(let i=0;i<sites.length;i+=1000)chunks.push(gzipSync(JSON.stringify(sites.slice(i,i+1000))).toString('base64'));
await writeFile('data/logistics-world-seed.json',JSON.stringify({source:'© OpenStreetMap contributors / Overpass',checked:raw.checked,count:sites.length,chunks}));
console.log(JSON.stringify({sites:sites.length,chunks:chunks.length,packedBytes:chunks.reduce((n,s)=>n+s.length,0)}));
