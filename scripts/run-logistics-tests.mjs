import {build} from 'esbuild';
import {mkdir} from 'node:fs/promises';
await mkdir('.sites-runtime/tests',{recursive:true});
const names=process.argv.slice(2).length?process.argv.slice(2):['test-logistics','test-logistics-cooperation','test-logistics-intermodal','test-logistics-v2','test-logistics-eh','test-logistics-v4','test-logistics-v5','test-logistics-v5-additions','test-logistics-v6','test-logistics-v8','test-logistics-v9','test-logistics-v9-fleet','test-logistics-v10','test-logistics-v10-additions','test-logistics-v11'];
if(!process.argv.slice(2).length)names.push('test-logistics-v12','test-logistics-v13','test-logistics-v14','test-logistics-v15','test-logistics-v16','test-logistics-v17','test-logistics-v18','test-logistics-v19','test-logistics-v20','test-logistics-v21-go','test-logistics-v22','test-logistics-v48-go-auto');
for(const name of names){await build({entryPoints:[`scripts/${name}.mjs`],bundle:true,platform:'node',format:'esm',outfile:`.sites-runtime/tests/${name}.mjs`});await import(new URL(`../.sites-runtime/tests/${name}.mjs`,import.meta.url));}
