import {NextRequest,NextResponse} from 'next/server';
import {env} from 'cloudflare:workers';
import {currentUser} from '../online/route';
import {sameOrigin} from '../../../../lib/same-origin';
import {publicConfig,readSettings,readSecrets,saveSettings,saveSecrets,cleanIntegrations,cleanSecrets,maskedSecrets,DEFAULT_ROADMAP,PREMIUM_DEFAULTS} from '../../../../lib/logistics/site-config';
import {CODE_UPDATES,pendingUpdates,type ChangelogEntry} from '../../../../lib/logistics/changelog';
import {instanceRole} from '../../../../lib/logistics/world-hosting';
import {expirePremium} from '../../../../lib/logistics/premium-server';

const db=()=>env.DB!;
const reply=(d:unknown,status=200)=>NextResponse.json(d,{status,headers:{'Cache-Control':'no-store'}});
async function published():Promise<ChangelogEntry[]>{const r=await db().prepare("SELECT payload FROM logistics_runtime WHERE id='changelog-published'").first<{payload:string}>().catch(()=>null);try{return JSON.parse(r?.payload||'[]');}catch{return [];}}
const savePublished=(list:ChangelogEntry[])=>db().prepare("INSERT OR REPLACE INTO logistics_runtime(id,updated,payload) VALUES('changelog-published',?,?)").bind(Date.now(),JSON.stringify(list.slice(0,60))).run();
async function codeUpdates(){await db().prepare('INSERT OR REPLACE INTO logistics_runtime(id,updated,payload) VALUES(?,?,?)').bind('changes:'+instanceRole(),Date.now(),JSON.stringify(CODE_UPDATES)).run().catch(()=>{});
 const r=await db().prepare("SELECT payload FROM logistics_runtime WHERE id='changes:test'").first<{payload:string}>().catch(()=>null);let test:typeof CODE_UPDATES=[];try{test=JSON.parse(r?.payload||'[]');}catch{}
 const all=new Map<string,typeof CODE_UPDATES[number]>();for(const u of [...test,...CODE_UPDATES])if(!all.has(u.id))all.set(u.id,u);return [...all.values()];}
const admin=async(req:NextRequest)=>{const u=await currentUser(req);return u&&u.status==='active'&&['owner','admin'].includes(u.role)?u:null;};

export async function GET(req:NextRequest){const sp=req.nextUrl.searchParams;
 if(sp.has('admin')){const u=await admin(req);if(!u)return reply({error:'Nur für Administratoren.'},403);const [s,sec,list]=await Promise.all([readSettings(),readSecrets(),published()]);
  return reply({settings:{...s,roadmap:s.roadmap?.length?s.roadmap:DEFAULT_ROADMAP,premium:{...PREMIUM_DEFAULTS,...(s.premium||{})}},secrets:maskedSecrets(sec),published:list,pending:pendingUpdates(await codeUpdates(),list.find(e=>e.code)?.code),origin:new URL(req.url).origin});}
 await expirePremium().catch(()=>{});
 return reply({...await publicConfig(),changelog:await published()});}

export async function POST(req:NextRequest){const u=await admin(req);if(!u)return reply({error:'Nur für Administratoren.'},403);if(!sameOrigin(req))return reply({error:'Ungültiger Ursprung.'},403);
 const b=await req.json().catch(()=>({})) as any;
 if(b.action==='integrations'){if(u.role!=='owner'&&(b.secrets||b.premium||b.auth||b.mail))return reply({error:'Zugänge und Zahlungen ändert nur der Owner.'},403);await saveSettings(cleanIntegrations(b,await readSettings()));if(b.secrets)await saveSecrets(cleanSecrets(b.secrets,await readSecrets()));return reply({ok:true});}
 if(b.action==='publish'){const items=(Array.isArray(b.items)?b.items:String(b.text||'').split('\n')).map((x:unknown)=>String(x).replace(/^\s*[-•*]\s*/,'').trim().slice(0,300)).filter(Boolean).slice(0,40);if(!items.length)return reply({error:'Mindestens einen Punkt eintragen.'},400);
  const list=await published(),code=String(b.code||'').slice(0,20)||undefined;list.unshift({id:'c'+Date.now(),date:new Date().toISOString().slice(0,10),title:String(b.title||'Update').trim().slice(0,100)||'Update',items,code});await savePublished(list);return reply({ok:true});}
 if(b.action==='unpublish'){await savePublished((await published()).filter(e=>e.id!==String(b.id)));return reply({ok:true});}
 return reply({error:'Unbekannte Aktion.'},400);}
