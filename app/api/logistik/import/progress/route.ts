import {continuePartnerImports} from '../../../../../lib/logistics/partner-import';
import {env} from 'cloudflare:workers';
import {readWorldImport,worldImportStatus,continueWorldImport} from '../../../../../lib/logistics/world-import';
export async function GET(){try{const status=worldImportStatus(await readWorldImport()),count=await env.DB!.prepare('SELECT max(rowid) AS n FROM logistics_partner_registry').first<{n:number}>();return Response.json({...status,registryCount:count?.n||0},{headers:{'Cache-Control':'no-store'}});}catch{return Response.json({error:'Importstatus derzeit nicht erreichbar.'},{status:503,headers:{'Cache-Control':'no-store'}});}}
