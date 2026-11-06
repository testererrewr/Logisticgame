import {env} from 'cloudflare:workers';
import {refreshWorld} from './world-store';
const db=()=>env.DB!;
export async function simulationStatus(){await schema();const rows=await db().prepare('SELECT w.id,w.name,w.status,j.checked,j.backlog,j.error FROM worlds w LEFT JOIN simulation_jobs j ON j.world=w.id ORDER BY w.rowid').all<any>();return rows.results;}
async function schema(){await db().prepare('CREATE TABLE IF NOT EXISTS simulation_jobs(world TEXT PRIMARY KEY,checked INTEGER NOT NULL DEFAULT 0,backlog INTEGER NOT NULL DEFAULT 0,error TEXT)').run();}
export async function settleRunningWorlds(options:{maxWorlds?:number;maxBatches?:number}={}){
 const maxWorlds=options.maxWorlds??4,maxBatches=options.maxBatches??4;if(!Number.isInteger(maxWorlds)||maxWorlds<1||maxWorlds>8||!Number.isInteger(maxBatches)||maxBatches<1||maxBatches>8)throw Error('Maximal 8 Welten und 8 Abgleichpakete je Aufruf.');await schema();
 const rows=await db().prepare("SELECT w.id FROM worlds w LEFT JOIN simulation_jobs j ON j.world=w.id WHERE w.status='running' ORDER BY COALESCE(j.checked,0),w.rowid LIMIT ?").bind(maxWorlds).all<{id:string}>(),started=Date.now(),results:{id:string;revision?:number;backlog?:boolean;error?:string}[]=[];
 for(const row of rows.results){if(Date.now()-started>20000)break;let result:typeof results[number]={id:row.id};try{for(let batch=0;batch<maxBatches;batch++){const world=await refreshWorld(row.id,true);result={id:row.id,revision:world.revision,backlog:!!world.state.operations?.backlog};if(!result.backlog||Date.now()-started>20000)break;}}catch(e:any){result={id:row.id,error:String(e.message||e).slice(0,250)};}
  await db().prepare('INSERT INTO simulation_jobs(world,checked,backlog,error) VALUES(?,?,?,?) ON CONFLICT(world) DO UPDATE SET checked=excluded.checked,backlog=excluded.backlog,error=excluded.error').bind(row.id,Date.now(),result.backlog?1:0,result.error||null).run();results.push(result);
 }
 const count=await db().prepare("SELECT COUNT(*) total FROM worlds WHERE status='running'").first<{total:number}>();return {totalRunning:count?.total||0,checkedAt:Date.now(),processed:results,more:rows.results.length>results.length||results.some(r=>r.backlog),hasErrors:results.some(r=>r.error)};
}
