import {env} from 'cloudflare:workers';

/** Persistentes Fehlerprotokoll (Server + Browser). Gleiche Fehler werden zusammengefasst (Zähler + letzter Kontext). */
const db=()=>env.DB!;
let ready:Promise<void>|undefined;
export function ensureErrorLog(){return ready??=db().batch([
 db().prepare("CREATE TABLE IF NOT EXISTS logistics_error_log(id TEXT PRIMARY KEY,first INTEGER NOT NULL,last INTEGER NOT NULL,count INTEGER NOT NULL DEFAULT 1,level TEXT NOT NULL,source TEXT NOT NULL,name TEXT NOT NULL DEFAULT '',message TEXT NOT NULL,stack TEXT NOT NULL DEFAULT '',context TEXT NOT NULL DEFAULT '{}',user_id TEXT,world_id TEXT)"),
 db().prepare('CREATE INDEX IF NOT EXISTS logistics_error_log_last ON logistics_error_log(last)'),
]).then(()=>undefined).catch(e=>{ready=undefined;throw e;});}
export type ErrorLevel='error'|'warn'|'info';
const hash=(t:string)=>{let h=2166136261;for(let i=0;i<t.length;i++){h^=t.charCodeAt(i);h=Math.imul(h,16777619);}return (h>>>0).toString(36);};
/** Spielregel-Meldungen (normale Error mit deutschem Text) sind Warnungen, echte Programmfehler (TypeError, RangeError …) Fehler. */
export function levelOf(e:unknown):ErrorLevel{if(!(e instanceof Error))return 'error';return e.name==='Error'?'warn':'error';}
const clip=(s:unknown,n:number)=>String(s??'').slice(0,n);
let writes=0,windowStart=0;
export async function logError(source:string,e:unknown,context:Record<string,unknown>={},level?:ErrorLevel){
 try{
  const err=e instanceof Error?e:new Error(typeof e==='string'?e:JSON.stringify(e));const lvl=level||levelOf(e);
  const message=clip(err.message||'Unbekannter Fehler',1000),stack=clip(err.stack||'',4000),name=clip(err.name,60);
  if(lvl==='error')console.error(`[logistik:${source}] ${name}: ${message}`,JSON.stringify(context).slice(0,1000),'\n'+stack);else console.warn(`[logistik:${source}] ${message}`);
  const now=Date.now();if(now-windowStart>60000){windowStart=now;writes=0;}if(++writes>120)return;
  await ensureErrorLog();
  const top=stack.split('\n').slice(0,3).join('|').replace(/:\d+:\d+/g,'');const id=hash(source+'|'+name+'|'+message.replace(/\d+(\.\d+)?/g,'#')+'|'+top);
  const ctx=clip(JSON.stringify(context,(k,v)=>typeof v==='string'&&v.length>500?v.slice(0,500)+'…':v),3000);
  await db().prepare('INSERT INTO logistics_error_log(id,first,last,count,level,source,name,message,stack,context,user_id,world_id) VALUES(?,?,?,1,?,?,?,?,?,?,?,?) ON CONFLICT(id) DO UPDATE SET last=excluded.last,count=count+1,message=excluded.message,stack=excluded.stack,context=excluded.context,user_id=COALESCE(excluded.user_id,user_id),world_id=COALESCE(excluded.world_id,world_id)')
   .bind(id,now,now,lvl,clip(source,80),name,message,stack,ctx,context.user?String(context.user):null,context.world?String(context.world):null).run();
  if(Math.random()<.02)await db().prepare('DELETE FROM logistics_error_log WHERE id IN (SELECT id FROM logistics_error_log ORDER BY last DESC LIMIT -1 OFFSET 3000)').run();
 }catch(inner){console.error('[logistik:error-log] Protokoll konnte nicht geschrieben werden',inner,e);}
}
export async function readErrorLog(filter:{level?:string;source?:string;query?:string;limit?:number}={}){
 await ensureErrorLog();const where:string[]=[],args:unknown[]=[];
 if(filter.level&&['error','warn','info'].includes(filter.level)){where.push('level=?');args.push(filter.level);}
 if(filter.source){where.push('source LIKE ?');args.push(filter.source+'%');}
 if(filter.query){where.push('(message LIKE ? OR stack LIKE ? OR context LIKE ?)');const q='%'+filter.query.slice(0,100)+'%';args.push(q,q,q);}
 const rows=(await db().prepare(`SELECT e.*,u.name AS user_name,w.name AS world_name FROM logistics_error_log e LEFT JOIN users u ON u.id=e.user_id LEFT JOIN logistics_worlds w ON w.id=e.world_id ${where.length?'WHERE '+where.join(' AND '):''} ORDER BY last DESC LIMIT ?`).bind(...args,Math.max(1,Math.min(500,filter.limit||200))).all()).results;
 const stats=(await db().prepare("SELECT level,count(*) AS n,sum(count) AS total,max(last) AS last FROM logistics_error_log GROUP BY level").all()).results;
 return {rows,stats};
}
export async function clearErrorLog(id?:string){await ensureErrorLog();if(id)await db().prepare('DELETE FROM logistics_error_log WHERE id=?').bind(id).run();else await db().prepare('DELETE FROM logistics_error_log').run();}
