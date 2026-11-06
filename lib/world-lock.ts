// The database lease works across Worker isolates. Keep revision checks as the
// final guard if a crashed or stalled request outlives its lease.
const prepared=new WeakSet<object>();
export async function withWorldLock<T>(database:D1Database,id:string,waitMs:number,work:()=>Promise<T>):Promise<T|null>{
 if(!prepared.has(database)){await database.prepare('CREATE TABLE IF NOT EXISTS world_write_locks(world TEXT PRIMARY KEY,token TEXT NOT NULL,expires INTEGER NOT NULL)').run();prepared.add(database);}
 const token=crypto.randomUUID(),deadline=Date.now()+waitMs;
 while(true){const now=Date.now(),lease=await database.prepare('INSERT INTO world_write_locks(world,token,expires) VALUES(?,?,?) ON CONFLICT(world) DO UPDATE SET token=excluded.token,expires=excluded.expires WHERE world_write_locks.expires<=? RETURNING token').bind(id,token,now+60000,now).first<{token:string}>();
  if(lease?.token===token){try{return await work();}finally{try{await database.prepare('DELETE FROM world_write_locks WHERE world=? AND token=?').bind(id,token).run();}catch{console.warn('Welt-Schreibsperre wird nach Ablauf freigegeben.');}}}
  if(Date.now()>=deadline)return null;await new Promise(resolve=>setTimeout(resolve,80+Math.floor(Math.random()*80)));
 }
}
