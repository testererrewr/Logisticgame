import {env} from 'cloudflare:workers';
import {newsOfDay,primeNews,storedNewsDays,enableRealNewsClock,newsDay,type NewsItem} from './world-events';
enableRealNewsClock();
const KEY=(d:number)=>'news-v1:'+d;
let primedFor=-1,primedAt=0;
export async function ensureStoredNews(day:number){day=newsDay(day);const today=Math.floor(day);if(primedFor===today&&Date.now()-primedAt<600000)return;
 const days=Array.from({length:9},(_,i)=>today-8+i).filter(d=>d>=1),have=new Set(storedNewsDays());
 const rows=(await env.DB!.prepare('SELECT id,payload FROM logistics_runtime WHERE id IN (SELECT value FROM json_each(?))').bind(JSON.stringify(days.map(KEY))).all<{id:string;payload:string}>()).results,found=new Map<number,NewsItem[]>();
 for(const r of rows){try{found.set(Number(r.id.split(':')[1]),JSON.parse(r.payload));}catch{}}
 for(const d of days)if(found.has(d))primeNews(found.get(d));
 const ins=[];for(const d of days){if(found.has(d))continue;const list=newsOfDay(d);primeNews(list);have.add(d);ins.push(env.DB!.prepare('INSERT OR IGNORE INTO logistics_runtime(id,updated,payload) VALUES(?,?,?)').bind(KEY(d),Date.now(),JSON.stringify(list)));}
 if(ins.length)await env.DB!.batch(ins);primedFor=today;primedAt=Date.now();}
export function newsForClient(day:number){day=newsDay(day);const today=Math.floor(day),out:NewsItem[]=[];for(let d=today-8;d<=today+1;d++)if(d>=1)out.push(...newsOfDay(d));return out;}
