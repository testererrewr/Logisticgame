import {env} from 'cloudflare:workers';
const TABLE='CREATE TABLE IF NOT EXISTS logistics_messages(id TEXT PRIMARY KEY,world_id TEXT NOT NULL,from_id TEXT NOT NULL,to_id TEXT NOT NULL,text TEXT NOT NULL,created INTEGER NOT NULL,read INTEGER NOT NULL DEFAULT 0)';
let ready:Promise<unknown>|undefined;let readyDone=false;
export const ensureMessageTable=()=>(readyDone?Promise.resolve(undefined as any):Promise.resolve(env.DB!.prepare(TABLE).run().catch(e=>{ready=undefined;throw e;})).then((v:any)=>{readyDone=true;return v;}));
export const systemMessageStatement=(world:string,to:string,text:string,from='system')=>env.DB!.prepare('INSERT INTO logistics_messages(id,world_id,from_id,to_id,text,created,read) VALUES(?,?,?,?,?,?,0)').bind(crypto.randomUUID(),world,from,to,text.slice(0,2000),Date.now());
export async function sendSystemMessage(world:string,to:string,text:string){await ensureMessageTable();await systemMessageStatement(world,to,text).run();}
