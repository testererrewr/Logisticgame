import {NextRequest,NextResponse} from 'next/server';
import {env} from 'cloudflare:workers';
import {currentUser} from '../online/route';
import {decodeCompany} from '../../../../lib/logistics/company-codec';
import {BUILDINGS,type State} from '../../../../lib/logistics/engine';
import {dealerValue} from '../../../../lib/logistics/vehicle-sales';

interface Row {id:string;name:string;value:number;cash:number;revenue7:number;revenue30:number;profit30:number;vehicles:number;transported:number;buildings:number;lines:number;orders:number}
const cache=new Map<string,{at:number;rows:Row[]}>();
function sumDays(s:State,days:number,key:'income'|'expenses'){const book=s.finance;if(!book)return 0;const today=Math.floor(s.day);let n=0;for(const [d,row] of Object.entries(book.days))if(Number(d)>today-days)n+=row[key]||0;return n;}
function rowFor(id:string,name:string,s:State):Row{
 const vehicles=s.vehicles.filter(v=>!v.wrecked);
 const fleet=vehicles.reduce((n,v)=>{try{return n+dealerValue(v);}catch{return n;}},0);
 const buildings=s.sites.filter(p=>p.owned),property=buildings.reduce((n,p)=>n+(BUILDINGS.find(b=>b.id===p.kind)?.price||0)*.6,0);
 const r=(n:number)=>Math.round(n);
 return {id,name,value:r(s.cash+fleet+property),cash:r(s.cash),revenue7:r(sumDays(s,7,'income')),revenue30:r(sumDays(s,30,'income')),profit30:r(sumDays(s,30,'income')-sumDays(s,30,'expenses')),vehicles:vehicles.length,transported:r(s.vehicles.reduce((n,v)=>n+(v.transportedEh||0),0)),buildings:buildings.length,lines:s.lines.filter(l=>l.active&&!l.deleted).length,orders:s.contracts.filter(c=>c.kind==='haulage'&&c.completedDay!==undefined).length};
}
export async function GET(req:NextRequest){try{
 const u=await currentUser(req);if(!u||u.status!=='active')return NextResponse.json({error:'Bitte anmelden.'},{status:401});
 const world=(req.nextUrl.searchParams.get('world')||'').slice(0,100);if(!world)throw Error('Welt fehlt.');
 if(!await env.DB!.prepare('SELECT 1 FROM logistics_world_companies WHERE world_id=? AND user_id=?').bind(world,u.id).first())return NextResponse.json({error:'Bitte der Welt beitreten.'},{status:403});
 let hit=cache.get(world);
 if(!hit||Date.now()-hit.at>5*60000){
  const rows:Row[]=[];
  for(let after='';;){const batch=(await env.DB!.prepare("SELECT c.user_id,COALESCE(NULLIF(c.name,''),us.name) AS name,c.state FROM logistics_world_companies c JOIN users us ON us.id=c.user_id WHERE c.world_id=? AND c.user_id>? ORDER BY c.user_id LIMIT 10").bind(world,after).all<{user_id:string;name:string;state:string}>()).results;for(const b of batch){try{rows.push(rowFor(b.user_id,b.name,await decodeCompany(b.state)));}catch{}}if(batch.length<10)break;after=batch[batch.length-1].user_id;}
  hit={at:Date.now(),rows};cache.set(world,hit);if(cache.size>50)cache.delete(cache.keys().next().value!);
 }
 return NextResponse.json({updated:hit.at,me:u.id,rows:hit.rows},{headers:{'Cache-Control':'no-store'}});
}catch(e:any){return NextResponse.json({error:e.message||'Rangliste nicht verfügbar.'},{status:503});}}
