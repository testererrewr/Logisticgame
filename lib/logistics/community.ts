import {env} from 'cloudflare:workers';
const db=()=>env.DB!;
let ready:Promise<unknown>|undefined;
export const ensureCommunityTables=()=>ready??=db().batch([
 db().prepare("CREATE TABLE IF NOT EXISTS logistics_letters(id TEXT PRIMARY KEY,world_id TEXT NOT NULL,user_id TEXT NOT NULL,author TEXT NOT NULL,text TEXT NOT NULL,status TEXT NOT NULL DEFAULT 'pending',day REAL NOT NULL DEFAULT 0,created INTEGER NOT NULL,reviewed_by TEXT)"),
 db().prepare('CREATE INDEX IF NOT EXISTS logistics_letters_world ON logistics_letters(world_id,status,created)'),
 db().prepare("CREATE TABLE IF NOT EXISTS logistics_reports(id TEXT PRIMARY KEY,world_id TEXT NOT NULL,kind TEXT NOT NULL,reporter_id TEXT NOT NULL,target_id TEXT NOT NULL DEFAULT '',reason TEXT NOT NULL DEFAULT '',text TEXT NOT NULL DEFAULT '',context TEXT NOT NULL DEFAULT '',status TEXT NOT NULL DEFAULT 'open',admin_note TEXT NOT NULL DEFAULT '',created INTEGER NOT NULL,updated INTEGER NOT NULL)"),
 db().prepare("CREATE UNIQUE INDEX IF NOT EXISTS logistics_reports_once ON logistics_reports(world_id,reporter_id,target_id) WHERE kind='player'"),
 db().prepare('CREATE INDEX IF NOT EXISTS logistics_reports_status ON logistics_reports(status,created)'),
]).catch(e=>{ready=undefined;throw e;});
export const REPORT_REASONS=['Beleidigung / unangemessener Name','Unangemessenes Bild oder Logo','Spam im Gästebuch oder Chat','Betrug / Ausnutzen von Fehlern','Sonstiges'];
export const REPORT_STATUS:Record<string,string>={open:'Offen',progress:'In Bearbeitung',resolved:'Erledigt',released:'Freigegeben (kein Verstoß)'};
