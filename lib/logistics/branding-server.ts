import {env} from 'cloudflare:workers';
const db=()=>env.DB!;
let ready:Promise<void>|undefined;
export function ensureBrandingTables(){return ready??=(async()=>{await db().batch([
 db().prepare("CREATE TABLE IF NOT EXISTS logistics_branding(world_id TEXT NOT NULL,user_id TEXT NOT NULL,primary_color TEXT NOT NULL DEFAULT '#2f6fae',secondary_color TEXT NOT NULL DEFAULT '#f2c14e',logo TEXT,updated INTEGER NOT NULL,PRIMARY KEY(world_id,user_id))"),
 db().prepare('CREATE TABLE IF NOT EXISTS logistics_vehicle_images(world_id TEXT NOT NULL,user_id TEXT NOT NULL,model_id TEXT NOT NULL,image TEXT NOT NULL,updated INTEGER NOT NULL,PRIMARY KEY(world_id,user_id,model_id))'),
 db().prepare('CREATE TABLE IF NOT EXISTS logistics_entitlements(user_id TEXT NOT NULL,feature TEXT NOT NULL,granted_by TEXT NOT NULL,created INTEGER NOT NULL,PRIMARY KEY(user_id,feature))'),
]);
 const add=async(table:string,col:string,def:string)=>{const cols=(await db().prepare(`PRAGMA table_info(${table})`).all<{name:string}>()).results;if(!cols.some(c=>c.name===col))await db().prepare(`ALTER TABLE ${table} ADD COLUMN ${col} ${def}`).run().catch(()=>{});};
 await add('logistics_vehicle_images','status',"TEXT NOT NULL DEFAULT 'pending'");await add('logistics_vehicle_images','reviewed_by','TEXT');await add('logistics_vehicle_images','reviewed_at','INTEGER');await add('logistics_vehicle_images','note','TEXT');await add('logistics_branding','show_badge','INTEGER NOT NULL DEFAULT 1');
})().catch(e=>{ready=undefined;throw e;});}

export const PREMIUM_FEATURES:Record<string,string>={premium:'Premium: Fahrzeugbilder, Firmenauftritt, Allianzlogo & -farben, Abzeichen, automatische Fahrer',customVehicleImages:'Nur eigene Fahrzeugbilder'};
export const PREMIUM_PERKS=['Eigene Fahrzeugbilder für jedes Modell','Firmenauftritt: Farben und Logo','Allianzlogo und Allianzfarben','Premium-Abzeichen in der Rangliste','Fahrer werden beim Fahrzeugkauf automatisch eingestellt und zugewiesen'];

export async function hasEntitlement(userId:string,feature:string){await ensureBrandingTables();return !!await db().prepare("SELECT 1 FROM logistics_entitlements WHERE user_id=? AND feature IN (?,'premium')").bind(userId,feature).first();}
export const isPremium=(userId:string)=>hasEntitlement(userId,'premium');
export async function setEntitlement(userId:string,feature:string,enabled:boolean,by:string){await ensureBrandingTables();if(!PREMIUM_FEATURES[feature])throw Error('Unbekannte Funktion.');if(enabled)await db().prepare('INSERT OR REPLACE INTO logistics_entitlements(user_id,feature,granted_by,created) VALUES(?,?,?,?)').bind(userId,feature,by,Date.now()).run();else await db().prepare('DELETE FROM logistics_entitlements WHERE user_id=? AND feature=?').bind(userId,feature).run();}
export function validImage(data:unknown,maxBytes:number){if(typeof data!=='string'||!/^data:image\/(png|jpeg|webp);base64,[A-Za-z0-9+/=]+$/.test(data))throw Error('Bild als PNG, JPG oder WebP hochladen.');if(data.length*.75>maxBytes)throw Error(`Bild zu groß (höchstens ${Math.round(maxBytes/1024)} KB).`);return data;}
