import {env} from 'cloudflare:workers';
import {PREMIUM_PERKS} from './branding-server';

const db=()=>env.DB!;
export interface RoadmapItem {id:string;title:string;text:string;titleEn?:string;textEn?:string;status:'planned'|'progress'|'done';icon:string;discord?:boolean}
export interface SiteSettings {
 ordersEnabled?:boolean;lobbyBanner?:any;discordUrl?:string;
 auth?:{google?:{enabled:boolean;clientId:string};discord?:{enabled:boolean;clientId:string}};
 mail?:{enabled:boolean;from:string;requireVerify:boolean};
 premium?:{enabled:boolean;price:number;days?:number;benefits:string[];benefitsEn?:string[];stripe:boolean;paypal:boolean;paypalSandbox:boolean;freeWorlds?:number;premiumWorlds?:number};
 roadmap?:RoadmapItem[];
}
export interface SiteSecrets {googleSecret?:string;discordSecret?:string;resendKey?:string;stripeKey?:string;stripeWebhook?:string;paypalClientId?:string;paypalSecret?:string}
export const SECRET_KEYS:(keyof SiteSecrets)[]=['googleSecret','discordSecret','resendKey','stripeKey','stripeWebhook','paypalClientId','paypalSecret'];

export const DEFAULT_ROADMAP:RoadmapItem[]=[
 {id:'vehicles',icon:'🚛',title:'Mehr Fahrzeuge',text:'Neue Lkw, Züge, Schiffe und Flugzeuge.',titleEn:'More vehicles',textEn:'New trucks, trains, ships and aircraft.',status:'progress'},
 {id:'balancing',icon:'⚖️',title:'Balancing',text:'Preise, Aufträge und Kosten fein abstimmen.',titleEn:'Balancing',textEn:'Fine-tuning prices, orders and costs.',status:'progress'},
 {id:'weather',icon:'🌦️',title:'Live-Wetter',text:'Echtes Wetter beeinflusst Fahrzeiten, Häfen und Flughäfen.',titleEn:'Live weather',textEn:'Real weather affects travel times, ports and airports.',status:'planned'},
 {id:'buildings',icon:'🏗️',title:'Gebäude versteigern & verkaufen',text:'Gebäude an andere Speditionen verkaufen oder versteigern.',titleEn:'Sell & auction buildings',textEn:'Sell or auction buildings to other companies.',status:'planned'},
 {id:'languages',icon:'🌍',title:'Mehr Sprachen',text:'Weitere Sprachen nach Deutsch und Englisch.',titleEn:'More languages',textEn:'More languages after German and English.',status:'planned'},
 {id:'appstore',icon:'📱',title:'App für iPhone & iPad',text:'Loadstar als App im Apple App Store – mit Push-Nachrichten.',titleEn:'iPhone & iPad app',textEn:'Loadstar as an app in the Apple App Store – with push notifications.',status:'planned'},
 {id:'exchange',icon:'💱',title:'Warenbörse zwischen Spielern',text:'Kauf- und Verkaufsangebote direkt zwischen Speditionen.',titleEn:'Player goods exchange',textEn:'Buy and sell offers directly between companies.',status:'planned'},
 {id:'leagues',icon:'🏆',title:'Saisons & Ligen',text:'Wettbewerbs-Welten mit Auf- und Abstieg und Hall of Fame.',titleEn:'Seasons & leagues',textEn:'Competitive worlds with promotion, relegation and a hall of fame.',status:'planned'},
 {id:'territory',icon:'🗺️',title:'Allianz-Gebietskarte',text:'Allianzen kämpfen um die meisten Lieferungen pro Land.',titleEn:'Alliance territory map',textEn:'Alliances compete for the most deliveries per country.',status:'planned'},
 {id:'livery',icon:'🎨',title:'Lackierungs-Editor',text:'Eigene Farben und Logos direkt auf deinen Fahrzeugen.',titleEn:'Livery editor',textEn:'Your own colours and logos right on your vehicles.',status:'planned'},
 {id:'community',icon:'💬',title:'Community-Wünsche',text:'Eure Ideen aus dem Discord – schreib uns!',titleEn:'Community wishes',textEn:'Your ideas from Discord – tell us!',status:'planned',discord:true},
];
export const PREMIUM_EXTRA=['Priority Support','Discord-Rolle „Premium“','Bis zu 5 Welten gleichzeitig (ohne Premium: 1 Welt)'];
export const DEFAULT_BENEFITS=[...PREMIUM_PERKS,...PREMIUM_EXTRA,'Du unterstützt die Entwicklung und den Server'];
export const DEFAULT_BENEFITS_EN=['Custom vehicle images for every model','Branding: colours and logo','Alliance logo and alliance colours','Premium badge in the ranking','Drivers are hired and assigned automatically when buying vehicles','Priority support','Discord role “Premium”','Up to 5 worlds at the same time (without Premium: 1 world)','You support development and the server'];
export interface PremiumPlan {id:'month'|'quarter'|'year';months:number;days:number;price:number;save:number}
export function premiumPlans(monthly:number):PremiumPlan[]{const r=(n:number)=>Math.round(n*100)/100;return [{id:'month',months:1,days:30,price:r(monthly),save:0},{id:'quarter',months:3,days:91,price:r(monthly*3),save:0},{id:'year',months:12,days:365,price:r(monthly*10),save:2}];}
export const worldLimits=(s:SiteSettings)=>s.premium?.enabled?{free:Math.max(1,s.premium.freeWorlds||1),premium:Math.max(1,s.premium.premiumWorlds||5)}:null;

async function row<T>(id:string,fallback:T):Promise<T>{const r=await db().prepare('SELECT payload FROM logistics_runtime WHERE id=?').bind(id).first<{payload:string}>().catch(()=>null);try{return r?.payload?JSON.parse(r.payload):fallback;}catch{return fallback;}}
const write=(id:string,v:unknown)=>db().prepare('INSERT OR REPLACE INTO logistics_runtime(id,updated,payload) VALUES(?,?,?)').bind(id,Date.now(),JSON.stringify(v)).run();
function migrate(s:SiteSettings&{v2?:boolean}){if(s.v2)return s;s.v2=true;
 if(s.roadmap?.length){for(const d of DEFAULT_ROADMAP){const have=s.roadmap.find(r=>r.id===d.id);if(have){have.titleEn||=d.titleEn;have.textEn||=d.textEn;}else if(['appstore','exchange','leagues','territory','livery'].includes(d.id)){const at=s.roadmap.findIndex(r=>r.discord);s.roadmap.splice(at<0?s.roadmap.length:at,0,{...d});}}}
 if(s.premium?.benefits?.length&&!s.premium.benefits.some(b=>/priority/i.test(b))){s.premium.benefits.splice(Math.max(0,s.premium.benefits.length-1),0,...PREMIUM_EXTRA);}
 return s;}
export const readSettings=()=>row<SiteSettings>('site-settings',{}).then(migrate);
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
 if(b.premium){const list=(v:unknown)=>(Array.isArray(v)?v:[]).map((x:unknown)=>str(x,140)).filter(Boolean).slice(0,20);out.premium={enabled:!!b.premium.enabled,price:Math.max(0.5,Math.min(500,Math.round((Number(b.premium.price)||4.99)*100)/100)),benefits:list(b.premium.benefits),benefitsEn:list(b.premium.benefitsEn),stripe:!!b.premium.stripe,paypal:!!b.premium.paypal,paypalSandbox:!!b.premium.paypalSandbox,freeWorlds:Math.max(1,Math.min(50,Math.round(Number(b.premium.freeWorlds)||1))),premiumWorlds:Math.max(1,Math.min(50,Math.round(Number(b.premium.premiumWorlds)||5)))};}
 if(b.roadmap)out.roadmap=(Array.isArray(b.roadmap)?b.roadmap:[]).slice(0,30).map((r:any,i:number)=>({id:str(r.id,40)||'r'+i,icon:str(r.icon,8)||'📌',title:str(r.title,80),text:str(r.text,300),titleEn:str(r.titleEn,80),textEn:str(r.textEn,300),status:['planned','progress','done'].includes(r.status)?r.status:'planned',discord:!!r.discord})).filter((r:RoadmapItem)=>r.title);
 return out;
}
export function cleanSecrets(b:any,cur:SiteSecrets):SiteSecrets{const out={...cur};for(const k of SECRET_KEYS){const v=b?.[k];if(v===null)delete out[k];else if(typeof v==='string'&&v.trim())out[k]=v.trim().slice(0,400);}return out;}
export const maskedSecrets=(s:SiteSecrets)=>Object.fromEntries(SECRET_KEYS.map(k=>[k,s[k]?'••••'+s[k]!.slice(-4):'']));

export async function publicConfig(){const [s,sec]=await Promise.all([readSettings(),readSecrets()]);const p=s.premium;
 return {discordUrl:s.discordUrl||'',
  oauth:{google:!!(s.auth?.google?.enabled&&s.auth.google.clientId&&sec.googleSecret),discord:!!(s.auth?.discord?.enabled&&s.auth.discord.clientId&&sec.discordSecret)},
  mail:!!(s.mail?.enabled&&s.mail.from&&sec.resendKey),
  premium:p?.enabled?{price:p.price,plans:premiumPlans(p.price),benefits:p.benefits.length?p.benefits:DEFAULT_BENEFITS,benefitsEn:p.benefitsEn?.length?p.benefitsEn:p.benefits.length?[]:DEFAULT_BENEFITS_EN,worlds:worldLimits(s),stripe:!!(p.stripe&&sec.stripeKey),paypal:!!(p.paypal&&sec.paypalClientId&&sec.paypalSecret)}:null,
  roadmap:s.roadmap?.length?s.roadmap:DEFAULT_ROADMAP};}
export const PREMIUM_DEFAULTS={enabled:false,price:4.99,benefits:DEFAULT_BENEFITS,benefitsEn:DEFAULT_BENEFITS_EN,stripe:false,paypal:false,paypalSandbox:false,freeWorlds:1,premiumWorlds:5};
