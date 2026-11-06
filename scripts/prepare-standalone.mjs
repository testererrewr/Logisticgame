import {readFile,writeFile} from 'node:fs/promises';
const args=Object.fromEntries(process.argv.slice(2).reduce((a,v,i,all)=>v.startsWith('--')?[...a,[v.slice(2),all[i+1]]]:a,[]));
if(!/^[a-zA-Z0-9-]{36}$/.test(args['database-id']||''))throw Error('Eigene Cloudflare-D1-ID mit --database-id angeben.');
const original=JSON.parse(await readFile('dist/server/wrangler.json','utf8')),config={name:args.name||'weltverbund-logistik',main:'dist/server/index.js',compatibility_date:original.compatibility_date,compatibility_flags:original.compatibility_flags,no_bundle:true,rules:original.rules,assets:{directory:'dist/client'},d1_databases:[{binding:'DB',database_name:args['database-name']||'weltverbund-logistik',database_id:args['database-id']}],triggers:{crons:['0 * * * *']},observability:{enabled:true}};
await writeFile('wrangler.restore.json',JSON.stringify(config,null,2)+'\n');console.log('wrangler.restore.json mit eigener D1-Datenbank vorbereitet.');
