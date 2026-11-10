import {env} from 'cloudflare:workers';
import type {State} from './engine';
import {rowFor} from './ranking';

const db=()=>env.DB!;
let ready:Promise<void>|undefined;
export function ensureSeasonTables(){return ready??=db().prepare('CREATE TABLE IF NOT EXISTS logistics_season_results(world_id TEXT NOT NULL,user_id TEXT NOT NULL,rank INTEGER NOT NULL,name TEXT NOT NULL,tag TEXT,value REAL NOT NULL,profit30 REAL NOT NULL,transported REAL NOT NULL,orders INTEGER NOT NULL,vehicles INTEGER NOT NULL,created INTEGER NOT NULL,PRIMARY KEY(world_id,user_id))').run().then(()=>undefined).catch(e=>{ready=undefined;throw e;});}

export async function seasonFinalStatements(worldId:string,states:Map<string,State>,names:Map<string,string>,tags:Map<string,string>){
 await ensureSeasonTables();const now=Date.now();
 const rows=[...states].map(([id,s])=>rowFor(id,names.get(id)||s.companyName||'Spedition',s)).sort((a,b)=>b.value-a.value);
 return [db().prepare('DELETE FROM logistics_season_results WHERE world_id=?').bind(worldId),...rows.map((r,i)=>db().prepare('INSERT INTO logistics_season_results(world_id,user_id,rank,name,tag,value,profit30,transported,orders,vehicles,created) VALUES(?,?,?,?,?,?,?,?,?,?,?)').bind(worldId,r.id,i+1,r.name,tags.get(r.id)||null,r.value,r.profit30,r.transported,r.orders,r.vehicles,now)),db().prepare("UPDATE logistics_worlds SET status='finished' WHERE id=?").bind(worldId)];
}
export async function seasonResults(worldId:string){await ensureSeasonTables();return (await db().prepare('SELECT user_id AS id,rank,name,tag,value,profit30,transported,orders,vehicles,created FROM logistics_season_results WHERE world_id=? ORDER BY rank').bind(worldId).all()).results;}

export async function seasonBadges(userId:string){await ensureSeasonTables();return (await db().prepare('SELECT r.world_id AS worldId,w.name AS world,r.rank,(SELECT count(*) FROM logistics_season_results x WHERE x.world_id=r.world_id) AS players FROM logistics_season_results r JOIN logistics_worlds w ON w.id=r.world_id WHERE r.user_id=? ORDER BY r.created DESC LIMIT 30').bind(userId).all()).results;}
