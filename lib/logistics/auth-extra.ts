import {env} from 'cloudflare:workers';
import {readSettings,readSecrets} from './site-config';

const db=()=>env.DB!;
const hex=(v:ArrayBuffer)=>Array.from(new Uint8Array(v),x=>x.toString(16).padStart(2,'0')).join('');
export const sha=async(v:string)=>hex(await crypto.subtle.digest('SHA-256',new TextEncoder().encode(v)));
let ready:Promise<unknown>|undefined;
export const ensureAuthTables=()=>ready??=(async()=>{await db().batch([
 db().prepare('CREATE TABLE IF NOT EXISTS logistics_auth_tokens(token TEXT PRIMARY KEY,user_id TEXT NOT NULL,kind TEXT NOT NULL,expires INTEGER NOT NULL)'),
 db().prepare('CREATE TABLE IF NOT EXISTS logistics_oauth(provider TEXT NOT NULL,subject TEXT NOT NULL,user_id TEXT NOT NULL,created INTEGER NOT NULL,PRIMARY KEY(provider,subject))'),
]);const cols=(await db().prepare('PRAGMA table_info(users)').all<{name:string}>()).results;
 if(!cols.some(c=>c.name==='email_verified'))await db().prepare('ALTER TABLE users ADD COLUMN email_verified INTEGER').run().catch(()=>{});})().catch(e=>{ready=undefined;throw e;});

export function publicOrigin(req:Request){const u=new URL(req.url),host=req.headers.get('x-forwarded-host')||req.headers.get('host')||u.host,proto=req.headers.get('x-forwarded-proto')||(/^(localhost|127\.|\[::1\])/.test(host)?u.protocol.replace(':',''):'https');return `${proto}://${host}`;}

export async function mailReady(){const [s,sec]=await Promise.all([readSettings(),readSecrets()]);return s.mail?.enabled&&s.mail.from&&sec.resendKey?{from:s.mail.from,key:sec.resendKey,requireVerify:!!s.mail.requireVerify}:null;}
const esc=(s:string)=>s.replace(/[&<>"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]!));
function layout(title:string,text:string,button:string,link:string){return `<div style="font-family:Arial,sans-serif;max-width:520px;margin:auto;padding:24px;color:#1d2b3a"><p style="font-weight:800;letter-spacing:2px;color:#2f6fae;margin:0 0 16px">LOADSTAR<span style="color:#35d5b6">.</span></p><h2 style="margin:0 0 12px">${esc(title)}</h2><p style="line-height:1.5">${esc(text)}</p><p style="margin:24px 0"><a href="${esc(link)}" style="background:#2f6fae;color:#fff;padding:12px 20px;border-radius:8px;text-decoration:none;font-weight:bold">${esc(button)}</a></p><p style="font-size:12px;color:#6b7785">Falls der Knopf nicht geht: ${esc(link)}<br>Wenn du das nicht angefordert hast, ignoriere diese E-Mail.</p></div>`;}
export async function sendMail(to:string,subject:string,html:string){const m=await mailReady();if(!m)throw Error('E-Mail-Versand ist nicht eingerichtet.');
 const r=await fetch('https://api.resend.com/emails',{method:'POST',headers:{Authorization:'Bearer '+m.key,'Content-Type':'application/json'},body:JSON.stringify({from:m.from,to:[to],subject,html})});
 if(!r.ok)throw Error('E-Mail konnte nicht gesendet werden ('+r.status+').');}

export async function newToken(userId:string,kind:'verify'|'reset',hours:number){await ensureAuthTables();const token=crypto.randomUUID().replace(/-/g,'')+crypto.randomUUID().replace(/-/g,'');
 await db().batch([db().prepare('DELETE FROM logistics_auth_tokens WHERE expires<? OR (user_id=? AND kind=?)').bind(Date.now(),userId,kind),db().prepare('INSERT INTO logistics_auth_tokens(token,user_id,kind,expires) VALUES(?,?,?,?)').bind(await sha(token),userId,kind,Date.now()+hours*3600000)]);return token;}
export async function useToken(token:string,kind:'verify'|'reset'){await ensureAuthTables();if(!/^[a-f0-9]{64}$/.test(token))return null;const h=await sha(token);
 const row=await db().prepare('SELECT user_id FROM logistics_auth_tokens WHERE token=? AND kind=? AND expires>?').bind(h,kind,Date.now()).first<{user_id:string}>();if(!row)return null;await db().prepare('DELETE FROM logistics_auth_tokens WHERE token=?').bind(h).run();return row.user_id;}

export async function sendVerifyMail(req:Request,u:{id:string;email:string;name:string}){const t=await newToken(u.id,'verify',72);const link=publicOrigin(req)+'/konto-bestaetigen?token='+t;
 await sendMail(u.email,'Loadstar: Bitte bestätige deine E-Mail-Adresse',layout(`Hallo ${u.name}!`,'Bitte bestätige deine E-Mail-Adresse, damit dein Konto vollständig aktiv ist.','E-Mail bestätigen',link));}
export async function sendResetMail(req:Request,u:{id:string;email:string;name:string}){const t=await newToken(u.id,'reset',1);const link=publicOrigin(req)+'/passwort-neu?token='+t;
 await sendMail(u.email,'Loadstar: Passwort zurücksetzen',layout(`Hallo ${u.name}!`,'Du hast ein neues Passwort angefordert. Der Link ist eine Stunde gültig.','Neues Passwort festlegen',link));}

export const OAUTH:Record<string,{auth:string;token:string;scope:string;profile:(token:string)=>Promise<{sub:string;email:string;verified:boolean;name:string}>}>={
 google:{auth:'https://accounts.google.com/o/oauth2/v2/auth',token:'https://oauth2.googleapis.com/token',scope:'openid email profile',
  profile:async t=>{const p:any=await (await fetch('https://openidconnect.googleapis.com/v1/userinfo',{headers:{Authorization:'Bearer '+t}})).json();return {sub:String(p.sub||''),email:String(p.email||'').toLowerCase(),verified:p.email_verified===true,name:String(p.name||p.given_name||'')};}},
 discord:{auth:'https://discord.com/oauth2/authorize',token:'https://discord.com/api/oauth2/token',scope:'identify email',
  profile:async t=>{const p:any=await (await fetch('https://discord.com/api/users/@me',{headers:{Authorization:'Bearer '+t}})).json();return {sub:String(p.id||''),email:String(p.email||'').toLowerCase(),verified:p.verified===true,name:String(p.global_name||p.username||'')};}},
};
export async function oauthConfig(provider:string){const [s,sec]=await Promise.all([readSettings(),readSecrets()]);const c=(s.auth as any)?.[provider],secret=provider==='google'?sec.googleSecret:provider==='discord'?sec.discordSecret:undefined;return OAUTH[provider]&&c?.enabled&&c.clientId&&secret?{...OAUTH[provider],clientId:c.clientId as string,secret}:null;}
export const oauthRedirect=(req:Request,provider:string)=>publicOrigin(req)+'/api/auth/oauth/'+provider+'/callback';

export async function oauthUser(provider:string,p:{sub:string;email:string;verified:boolean;name:string},hashPassword:(v:string)=>Promise<string>,ref?:string){
 await ensureAuthTables();if(!p.sub)throw Error('Anmeldung fehlgeschlagen.');
 const link=await db().prepare('SELECT u.* FROM logistics_oauth o JOIN users u ON u.id=o.user_id WHERE o.provider=? AND o.subject=?').bind(provider,p.sub).first<any>();if(link)return link;
 if(!p.email||!p.verified)throw Error('Bei diesem Konto ist keine bestätigte E-Mail-Adresse hinterlegt.');
 let u=await db().prepare('SELECT * FROM users WHERE email=?').bind(p.email).first<any>();
 if(!u){const name=(p.name.trim()||p.email.split('@')[0]).slice(0,40).padEnd(2,'_');u={id:crypto.randomUUID(),email:p.email,name,role:'user',status:'active'};
  await db().prepare('INSERT INTO users(id,email,name,password,created,email_verified) VALUES(?,?,?,?,?,1)').bind(u.id,u.email,name,await hashPassword(crypto.randomUUID()+crypto.randomUUID()),Date.now()).run();
  if(ref){const {recordReferral}=await import('./referrals');await recordReferral(u.id,ref).catch(()=>{});}}
 else await db().prepare('UPDATE users SET email_verified=1 WHERE id=?').bind(u.id).run();
 await db().prepare('INSERT OR IGNORE INTO logistics_oauth(provider,subject,user_id,created) VALUES(?,?,?,?)').bind(provider,p.sub,u.id,Date.now()).run();return u;}
