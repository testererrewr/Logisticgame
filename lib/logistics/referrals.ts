import {env} from 'cloudflare:workers';
import {credit,log,type State} from './engine';
import {systemMessageStatement,ensureMessageTable} from './system-message';
const db=()=>env.DB!;
export const REF_BONUS_NEW=250000,REF_BONUS_INVITER=500000;
let ready:Promise<unknown>|undefined;
export const ensureReferrals=()=>ready??=db().batch([
 db().prepare('CREATE TABLE IF NOT EXISTS logistics_ref_codes(user_id TEXT PRIMARY KEY,code TEXT NOT NULL UNIQUE,world_id TEXT)'),
 db().prepare("CREATE TABLE IF NOT EXISTS logistics_referrals(referee_id TEXT PRIMARY KEY,referrer_id TEXT NOT NULL,created INTEGER NOT NULL,first_day TEXT,rewarded_referee INTEGER NOT NULL DEFAULT 0,rewarded_referrer INTEGER NOT NULL DEFAULT 0)"),
 db().prepare('CREATE INDEX IF NOT EXISTS logistics_referrals_referrer ON logistics_referrals(referrer_id)'),
 db().prepare('CREATE TABLE IF NOT EXISTS logistics_pending_rewards(id TEXT PRIMARY KEY,world_id TEXT NOT NULL,user_id TEXT NOT NULL,amount REAL NOT NULL,text TEXT NOT NULL,created INTEGER NOT NULL)'),
 db().prepare('CREATE INDEX IF NOT EXISTS logistics_pending_rewards_world ON logistics_pending_rewards(world_id)'),
]).catch(e=>{ready=undefined;throw e;});
export async function codeFor(userId:string){await ensureReferrals();const row=await db().prepare('SELECT code,world_id FROM logistics_ref_codes WHERE user_id=?').bind(userId).first<{code:string;world_id:string|null}>();if(row)return row;
 for(let i=0;i<5;i++){const code=[...crypto.getRandomValues(new Uint8Array(6))].map(b=>'abcdefghjkmnpqrstuvwxyz23456789'[b%31]).join('');try{await db().prepare('INSERT INTO logistics_ref_codes(user_id,code) VALUES(?,?)').bind(userId,code).run();return {code,world_id:null};}catch{}}throw Error('Einladungscode konnte nicht erstellt werden.');}
export async function recordReferral(refereeId:string,code:string){try{await ensureReferrals();const c=String(code||'').toLowerCase().replace(/[^a-z0-9]/g,'').slice(0,12);if(!c)return;const r=await db().prepare('SELECT user_id FROM logistics_ref_codes WHERE code=?').bind(c).first<{user_id:string}>();if(!r||r.user_id===refereeId)return;
 await db().prepare('INSERT OR IGNORE INTO logistics_referrals(referee_id,referrer_id,created) VALUES(?,?,?)').bind(refereeId,r.user_id,Date.now()).run();}catch{}}
export async function referralJoinBonus(userId:string,start:State){try{await ensureReferrals();const r=await db().prepare('SELECT referrer_id FROM logistics_referrals WHERE referee_id=? AND rewarded_referee=0').bind(userId).first<{referrer_id:string}>();if(!r)return null;
 start.cash+=REF_BONUS_NEW;start.earned+=REF_BONUS_NEW;log(start,`🎁 Einladungsbonus: +${REF_BONUS_NEW.toLocaleString('de-DE')} € Startkapital`,'good');return db().prepare('UPDATE logistics_referrals SET rewarded_referee=1 WHERE referee_id=?').bind(userId);}catch{return null;}}
const seen=new Map<string,string>();
export async function referralActivity(userId:string){const today=new Date(Date.now()).toISOString().slice(0,10);if(seen.get(userId)===today)return;seen.set(userId,today);if(seen.size>20000)seen.clear();
 try{await ensureReferrals();const r=await db().prepare('SELECT * FROM logistics_referrals WHERE referee_id=? AND rewarded_referrer=0').bind(userId).first<any>();if(!r)return;
  if(!r.first_day){if(r.rewarded_referee)await db().prepare('UPDATE logistics_referrals SET first_day=? WHERE referee_id=?').bind(today,userId).run();return;}if(r.first_day===today)return;
  const code=await db().prepare('SELECT world_id FROM logistics_ref_codes WHERE user_id=?').bind(r.referrer_id).first<{world_id:string|null}>();let world=code?.world_id||null;
  if(!world||!await db().prepare('SELECT 1 FROM logistics_world_companies WHERE world_id=? AND user_id=?').bind(world,r.referrer_id).first())world=(await db().prepare('SELECT world_id FROM logistics_world_companies WHERE user_id=? ORDER BY updated DESC LIMIT 1').bind(r.referrer_id).first<{world_id:string}>())?.world_id||null;
  if(!world)return;const name=(await db().prepare('SELECT name FROM users WHERE id=?').bind(userId).first<{name:string}>())?.name||'Ein Freund';await ensureMessageTable();
  await db().batch([db().prepare('UPDATE logistics_referrals SET rewarded_referrer=1 WHERE referee_id=? AND rewarded_referrer=0').bind(userId),db().prepare('INSERT INTO logistics_pending_rewards(id,world_id,user_id,amount,text,created) VALUES(?,?,?,?,?,?)').bind(crypto.randomUUID(),world,r.referrer_id,REF_BONUS_INVITER,`🎁 Einladungsprämie: ${name} spielt mit`,Date.now()),systemMessageStatement(world,r.referrer_id,`🎁 ${name} ist über deinen Einladungslink dabei und hat an einem zweiten Tag gespielt. Du bekommst ${REF_BONUS_INVITER.toLocaleString('de-DE')} € in dieser Welt.`)]);}catch{}}
export async function settlePendingRewards(worldId:string,states:Map<string,State>){await ensureReferrals();const out:D1PreparedStatement[]=[];const rows=(await db().prepare('SELECT * FROM logistics_pending_rewards WHERE world_id=? LIMIT 100').bind(worldId).all<any>()).results;
 for(const r of rows){const st=states.get(r.user_id);if(!st)continue;credit(st,r.amount,'Prämien & Erfolge');log(st,`${r.text} · +${Number(r.amount).toLocaleString('de-DE')} €`,'good');out.push(db().prepare('DELETE FROM logistics_pending_rewards WHERE id=?').bind(r.id));}return out;}
export async function referralOverview(userId:string){const c=await codeFor(userId);const list=(await db().prepare('SELECT r.created,r.rewarded_referee,r.rewarded_referrer,r.first_day,u.name FROM logistics_referrals r LEFT JOIN users u ON u.id=r.referee_id WHERE r.referrer_id=? ORDER BY r.created DESC LIMIT 100').bind(userId).all()).results;return {code:c.code,world:c.world_id,list,bonusNew:REF_BONUS_NEW,bonusInviter:REF_BONUS_INVITER};}
