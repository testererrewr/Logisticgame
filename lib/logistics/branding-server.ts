import {env} from 'cloudflare:workers';
const db=()=>env.DB!;
let ready:Promise<void>|undefined;
export function ensureBrandingTables(){return ready??=(async()=>{await db().batch([
 db().prepare("CREATE TABLE IF NOT EXISTS logistics_branding(world_id TEXT NOT NULL,user_id TEXT NOT NULL,primary_color TEXT NOT NULL DEFAULT '#2f6fae',secondary_color TEXT NOT NULL DEFAULT '#f2c14e',logo TEXT,updated INTEGER NOT NULL,PRIMARY KEY(world_id,user_id))"),
 db().prepare('CREATE TABLE IF NOT EXISTS logistics_vehicle_images(world_id TEXT NOT NULL,user_id TEXT NOT NULL,model_id TEXT NOT NULL,image TEXT NOT NULL,updated INTEGER NOT NULL,PRIMARY KEY(world_id,user_id,model_id))'),
 db().prepare('CREATE TABLE IF NOT EXISTS logistics_entitlements(user_id TEXT NOT NULL,feature TEXT NOT NULL,granted_by TEXT NOT NULL,created INTEGER NOT NULL,PRIMARY KEY(user_id,feature))'),
]);})().catch(e=>{ready=undefined;throw e;});}
/** Premium-Funktionen (künftig z. B. über ein Abo/Shop freischaltbar, aktuell durch Admins vergeben). */
export const PREMIUM_FEATURES:Record<string,string>={customVehicleImages:'Eigene Fahrzeugbilder'};
export async function hasEntitlement(userId:string,feature:string){await ensureBrandingTables();return !!await db().prepare('SELECT 1 FROM logistics_entitlements WHERE user_id=? AND feature=?').bind(userId,feature).first();}
export async function setEntitlement(userId:string,feature:string,enabled:boolean,by:string){await ensureBrandingTables();if(!PREMIUM_FEATURES[feature])throw Error('Unbekannte Funktion.');if(enabled)await db().prepare('INSERT OR REPLACE INTO logistics_entitlements(user_id,feature,granted_by,created) VALUES(?,?,?,?)').bind(userId,feature,by,Date.now()).run();else await db().prepare('DELETE FROM logistics_entitlements WHERE user_id=? AND feature=?').bind(userId,feature).run();}
export function validImage(data:unknown,maxBytes:number){if(typeof data!=='string'||!/^data:image\/(png|jpeg|webp);base64,[A-Za-z0-9+/=]+$/.test(data))throw Error('Bild als PNG, JPG oder WebP hochladen.');if(data.length*.75>maxBytes)throw Error(`Bild zu groß (höchstens ${Math.round(maxBytes/1024)} KB).`);return data;}
