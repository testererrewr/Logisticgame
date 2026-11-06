import {env} from 'cloudflare:workers';
/** Preserve queued areas while releasing legacy multi-hour retry delays once. */
export async function prepareImportRuntime(){const key='import-runtime-v17';if(await env.DB!.prepare('SELECT id FROM logistics_runtime WHERE id=?').bind(key).first())return;const until=Date.now()+60000;await env.DB!.batch([
 env.DB!.prepare("UPDATE logistics_runtime SET payload=json_set(payload,'$.nextTry',MIN(COALESCE(json_extract(payload,'$.nextTry'),0),?),'$.attempt',MIN(COALESCE(json_extract(payload,'$.attempt'),0),5)) WHERE id='world-import-v10' OR id LIKE 'partner-tile-v8:%' OR id LIKE 'partner-tile-v17:%'").bind(until),
 env.DB!.prepare('INSERT OR IGNORE INTO logistics_runtime(id,updated,payload) VALUES(?,?,?)').bind(key,Date.now(),'{}')
]);}
