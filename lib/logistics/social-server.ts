import {env} from 'cloudflare:workers';
import type {State} from './engine';
const db=()=>env.DB!;
let ready:Promise<unknown>|undefined;let readyDone=false;
export const ensureSocialTables=()=>(readyDone?Promise.resolve(undefined as any):Promise.resolve(db().batch([
 db().prepare('CREATE TABLE IF NOT EXISTS logistics_guestbook(id TEXT PRIMARY KEY,profile_user TEXT NOT NULL,author_id TEXT NOT NULL,text TEXT NOT NULL,created INTEGER NOT NULL)'),
 db().prepare('CREATE INDEX IF NOT EXISTS logistics_guestbook_profile ON logistics_guestbook(profile_user,created)'),
 db().prepare("CREATE TABLE IF NOT EXISTS logistics_feed(id TEXT PRIMARY KEY,world_id TEXT NOT NULL,user_id TEXT,kind TEXT NOT NULL,ref TEXT NOT NULL DEFAULT '',text TEXT NOT NULL,important INTEGER NOT NULL DEFAULT 0,day REAL NOT NULL DEFAULT 0,created INTEGER NOT NULL)"),
 db().prepare('CREATE INDEX IF NOT EXISTS logistics_feed_world ON logistics_feed(world_id,created)'),
 db().prepare('CREATE TABLE IF NOT EXISTS logistics_congrats(feed_id TEXT NOT NULL,user_id TEXT NOT NULL,created INTEGER NOT NULL,PRIMARY KEY(feed_id,user_id))'),
 db().prepare('CREATE TABLE IF NOT EXISTS logistics_messages(id TEXT PRIMARY KEY,world_id TEXT NOT NULL,from_id TEXT NOT NULL,to_id TEXT NOT NULL,text TEXT NOT NULL,created INTEGER NOT NULL,read INTEGER NOT NULL DEFAULT 0)'),
]).catch(e=>{ready=undefined;throw e;})).then((v:any)=>{readyDone=true;return v;}));
export function feedStatement(world:string,user:string|null,kind:string,text:string,opts:{ref?:string;important?:boolean;day?:number;id?:string}={}){return db().prepare('INSERT OR IGNORE INTO logistics_feed(id,world_id,user_id,kind,ref,text,important,day,created) VALUES(?,?,?,?,?,?,?,?,?)').bind(opts.id||crypto.randomUUID(),world,user,kind,opts.ref||'',text.slice(0,300),opts.important?1:0,opts.day||0,Date.now());}
export async function addFeed(world:string,user:string|null,kind:string,text:string,opts:{ref?:string;important?:boolean;day?:number;id?:string}={}){await ensureSocialTables();await feedStatement(world,user,kind,text,opts).run();}

export async function feedFromStates(world:string,states:Map<string,State>,names:Map<string,string>,fromDay:number,toDay:number){
 const out:D1PreparedStatement[]=[];let firsts:Set<string>|undefined;
 for(const [user,s] of states)for(const e of s.events){if(e.day<=fromDay||e.day>toDay)continue;const name=names.get(user)||'Eine Spedition';
  const ach=e.text.match(/^🏅 Erfolg freigeschaltet: (.+?) · Belohnung/);
  if(ach){await ensureSocialTables();firsts??=new Set((await db().prepare("SELECT ref FROM logistics_feed WHERE world_id=? AND kind='achievement'").bind(world).all<{ref:string}>()).results.map(r=>r.ref));const first=!firsts.has(ach[1]);firsts.add(ach[1]);out.push(feedStatement(world,user,'achievement',first?`${name} schafft als erste Spedition der Welt den Erfolg „${ach[1]}“!`:`${name} hat den Erfolg „${ach[1]}“ freigeschaltet.`,{ref:ach[1],important:first,day:e.day}));continue;}
  const sp=e.text.match(/^💎 Seltene Ware zugestellt: (.+?) –/);if(sp){await ensureSocialTables();out.push(feedStatement(world,user,'special',`${name} hat seltene Ware zugestellt: ${sp[1]}.`,{day:e.day}));}
 }
 return out;
}
