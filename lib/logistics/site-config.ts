import {env} from 'cloudflare:workers';
import {PREMIUM_PERKS} from './branding-server';

const db=()=>env.DB!;
export interface RoadmapItem {id:string;title:string;text:string;status:'planned'|'progress'|'done';icon:string;discord?:boolean}
export interface SiteSettings {
 ordersEnabled?:boolean;lobbyBanner?:any;discordUrl?:string;
 auth?:{google?:{enabled:boolean;clientId:string};discord?:{enabled:boolean;clientId:string}};
 mail?:{enabled:boolean;from:string;requireVerify:boolean};
 premium?:{enabled:boolean;price:number;days:number;benefits:string[];stripe:boolean;paypal:boolean;paypalSandbox:boolean};
 roadmap?:RoadmapItem[];
}
export interface SiteSecrets {googleSecret?:string;discordSecret?:string;resendKey?:string;stripeKey?:string;stripeWebhook?:string;paypalClientId?:string;paypalSecret?:string}
export const SECRET_KEYS:(keyof SiteSecrets)[]=['googleSecret','discordSecret','resendKey','stripeKey','stripeWebhook','paypalClientId','paypalSecret'];

export const DEFAULT_ROADMAP:RoadmapItem[]=[
 {id:'weather',icon:'🌦️',title:'Live-Wetter',text:'Echtes Wetter beeinflusst Fahrzeiten, Häfen und Flughäfen.',status:'planned'},
 {id:'vehicles',icon:'🚛',title:'Mehr Fahrzeuge',text:'Neue Lkw, Züge, Schiffe und Flugzeuge.',status:'progress'},
 {id:'balancing',icon:'⚖️',title:'Balancing',text:'Preise, Aufträge und Kosten fein abstimmen.',status:'progress'},
 {id:'buildings',icon:'🏗️',title:'Gebäude versteigern & verkaufen',text:'Gebäude an andere Speditionen verkaufen oder versteigern.',status:'planned'},
 {id:'languages',icon:'🌍',title:'Mehr Sprachen',text:'Weitere Übersetzungen nach Englisch.',status:'planned'},
 {id:'community',icon:'💬',title:'Community-Wünsche',text:'Eure Ideen aus dem Discord – schreib uns!',status:'planned',discord:true},
];
export const DEFAULT_BENEFITS=[...PREMIUM_PERKS,'Du unterstützt die Entwicklung und den Server'];

async function row<T>(id:string,fallback:T):Promise<T>{const r=await db().prepare('SELECT payload FROM logistics_runtime WHERE id=?').bind(id).first<{payload:string}>().catch(()=>null);try{return r?.payload?JSON.parse(r.payload):fallback;}catch{return fallback;}}
const write=(id:string,v:unknown)=>db().prepare('INSERT OR REPLACE INTO logistics_runtime(id,updated,payload) VALUES(?,?,?)').bind(id,Date.now(),JSON.stringify(v)).run();
export const readSettings=()=>row<SiteSettings>('site-settings',{});
export const readSecrets=()=>row<SiteSecrets>('site-secrets',{});
export const saveSettings=(v:SiteSettings)=>write('site-settings',v);
export const saveSecrets=(v:SiteSecrets)=>write('site-secrets',v);

const url=(v:unknown)=>{const s=String(v||'').trim().slice(0,300);return /^https:\/\/[^\s"'<>]+$/.test(s)?s:'';};
const str=(v:unknown,n=200)=>String(v??'').trim().slice(0,n);
export function cleanIntegrations(b:any,cur:SiteSettings):SiteSettings{
 const out:SiteSettings={...cur};
 if(b.discordUrl!==undefined)out.discordUrl=url(b.discordUrl);
 if(b.auth)out.auth={google:{enabled:!!b.auth.google?.enabled,clientId:str(b.auth.google?.clientId)},discord:{enabled:!!b.auth.discord?.enabled,clientId:str(b.auth.discord?.clientId)}};
 if(b.mail){const from=str(b.mail.from,120);out.mail={enabled:!!b.mail.enabled,from:/^[^<>\n]*<?[^@\s<>]+@[^@\s<>]+\.[a-z]{2,}>?$/i.test(from)?from:'',requireVerify:!!b.mail.requireVerify};}
 if(b.premium)out.premium={enabled:!!b.premium.enabled,price:Math.max(0.5,Math.min(500,Math.round((Number(b.premium.price)||4.99)*100)/100)),days:Math.max(1,Math.min(366,Math.round(Number(b.premium.days)||30))),benefits:(Array.isArray(b.premium.benefits)?b.premium.benefits:[]).map((x:unknown)=>str(x,140)).filter(Boolean).slice(0,20),stripe:!!b.premium.stripe,paypal:!!b.premium.paypal,paypalSandbox:!!b.premium.paypalSandbox};
 if(b.roadmap)out.roadmap=(Array.isArray(b.roadmap)?b.roadmap:[]).slice(0,30).map((r:any,i:number)=>({id:str(r.id,40)||'r'+i,icon:str(r.icon,8)||'📌',title:str(r.title,80),text:str(r.text,300),status:['planned','progress','done'].includes(r.status)?r.status:'planned',discord:!!r.discord})).filter((r:RoadmapItem)=>r.title);
 return out;
}
export function cleanSecrets(b:any,cur:SiteSecrets):SiteSecrets{const out={...cur};for(const k of SECRET_KEYS){const v=b?.[k];if(v===null)delete out[k];else if(typeof v==='string'&&v.trim())out[k]=v.trim().slice(0,400);}return out;}
export const maskedSecrets=(s:SiteSecrets)=>Object.fromEntries(SECRET_KEYS.map(k=>[k,s[k]?'••••'+s[k]!.slice(-4):'']));

export async function publicConfig(){const [s,sec]=await Promise.all([readSettings(),readSecrets()]);const p=s.premium;
 return {discordUrl:s.discordUrl||'',
  oauth:{google:!!(s.auth?.google?.enabled&&s.auth.google.clientId&&sec.googleSecret),discord:!!(s.auth?.discord?.enabled&&s.auth.discord.clientId&&sec.discordSecret)},
  mail:!!(s.mail?.enabled&&s.mail.from&&sec.resendKey),
  premium:p?.enabled?{price:p.price,days:p.days,benefits:p.benefits.length?p.benefits:DEFAULT_BENEFITS,stripe:!!(p.stripe&&sec.stripeKey),paypal:!!(p.paypal&&sec.paypalClientId&&sec.paypalSecret)}:null,
  roadmap:s.roadmap?.length?s.roadmap:DEFAULT_ROADMAP};}
