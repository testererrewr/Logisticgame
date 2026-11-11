import {env} from 'cloudflare:workers';
const db=()=>env.DB!;

export interface NodeInfo {name:string;domain:string;token:string;created:number;lastSeen?:number;version?:string;port?:number;worlds?:string[];status?:string}
const NODE_KEY='node:';
const ident=(s:string)=>'"'+s.replace(/"/g,'""')+'"';
const lit=(v:unknown):string=>{if(v===null||v===undefined)return 'NULL';if(typeof v==='number')return Number.isFinite(v)?String(v):'NULL';if(typeof v==='bigint')return v.toString();if(typeof v==='boolean')return v?'1':'0';if(v instanceof ArrayBuffer||ArrayBuffer.isView(v)){const b=new Uint8Array(v instanceof ArrayBuffer?v:(v as ArrayBufferView).buffer);return "X'"+[...b].map(x=>x.toString(16).padStart(2,'0')).join('')+"'";}return "'"+String(v).replace(/'/g,"''")+"'";};
export const safeName=(s:string)=>/^[a-z][a-z0-9-]{1,20}$/.test(s);
export const safeDomain=(s:string)=>/^[a-z0-9.-]{3,120}$/i.test(s)&&s.includes('.');

export async function listNodes():Promise<NodeInfo[]>{return (await db().prepare("SELECT payload FROM logistics_runtime WHERE id>=? AND id<?").bind(NODE_KEY,NODE_KEY+'￿').all<{payload:string}>()).results.map(r=>{try{return JSON.parse(r.payload);}catch{return null;}}).filter(Boolean);}
export async function nodeByToken(token:string){if(!/^[a-f0-9]{48}$/.test(token))return null;return (await listNodes()).find(n=>n.token===token)||null;}
export async function saveNode(n:NodeInfo){await db().prepare('INSERT OR REPLACE INTO logistics_runtime(id,updated,payload) VALUES(?,?,?)').bind(NODE_KEY+n.name,Date.now(),JSON.stringify(n)).run();}
export async function deleteNode(name:string){await db().prepare('DELETE FROM logistics_runtime WHERE id=?').bind(NODE_KEY+name).run();}
export function newToken(){const b=new Uint8Array(24);crypto.getRandomValues(b);return [...b].map(x=>x.toString(16).padStart(2,'0')).join('');}

async function tables(){const rows=(await db().prepare("SELECT name,sql FROM sqlite_master WHERE type='table' AND name NOT LIKE 'sqlite_%' AND name NOT LIKE '_cf_%' AND name NOT LIKE 'd1_%'").all<{name:string;sql:string}>()).results;const out:{name:string;sql:string;cols:string[]}[]=[];for(const r of rows){const cols=(await db().prepare(`PRAGMA table_info(${ident(r.name)})`).all<{name:string}>()).results.map(c=>c.name);out.push({...r,cols});}return out;}
async function indexes(names:Set<string>){return (await db().prepare("SELECT tbl_name,sql FROM sqlite_master WHERE type='index' AND sql IS NOT NULL").all<{tbl_name:string;sql:string}>()).results.filter(r=>names.has(r.tbl_name)).map(r=>r.sql.replace(/^CREATE (UNIQUE )?INDEX /i,'CREATE $1INDEX IF NOT EXISTS ')+';');}

export async function exportWorldSql(worldId:string):Promise<string>{
 const all=await tables(),by=new Map(all.map(t=>[t.name,t])),out:string[]=['PRAGMA foreign_keys=OFF;','BEGIN;'],used=new Set<string>();
 const users=(await db().prepare('SELECT user_id FROM logistics_world_companies WHERE world_id=?').bind(worldId).all<{user_id:string}>()).results.map(r=>r.user_id);
 const alliances=by.has('logistics_alliances')?(await db().prepare('SELECT id FROM logistics_alliances WHERE world_id=?').bind(worldId).all<{id:string}>()).results.map(r=>r.id):[];
 const dump=async(name:string,where:string,args:unknown[],mode='REPLACE')=>{const t=by.get(name);if(!t)return;if(!used.has(name)){used.add(name);out.push(t.sql.replace(/^CREATE TABLE (IF NOT EXISTS )?/i,'CREATE TABLE IF NOT EXISTS ')+';');}
  for(let off=0;;off+=500){const rows=(await db().prepare(`SELECT * FROM ${ident(name)} WHERE ${where} LIMIT 500 OFFSET ${off}`).bind(...args).raw()) as unknown[][];for(const r of rows)out.push(`INSERT OR ${mode} INTO ${ident(name)}(${t.cols.map(ident).join(',')}) VALUES(${r.map(lit).join(',')});`);if(rows.length<500)break;}};
 await dump('logistics_worlds','id=?',[worldId]);
 const inList=(ids:string[])=>JSON.stringify(ids);
 if(users.length)await dump('users','id IN (SELECT value FROM json_each(?))',[inList(users)],'IGNORE');
 for(const t of all)if(t.cols.includes('world_id')&&t.name!=='logistics_worlds')await dump(t.name,'world_id=?',[worldId]);
 if(alliances.length)for(const t of all)if(t.cols.includes('alliance_id')&&!t.cols.includes('world_id'))await dump(t.name,'alliance_id IN (SELECT value FROM json_each(?))',[inList(alliances)]);
 if(users.length)for(const name of ['logistics_entitlements','logistics_user_achievements','logistics_season_results'])if(by.has(name)&&by.get(name)!.cols.includes('user_id'))await dump(name,'user_id IN (SELECT value FROM json_each(?))',[inList(users)],'IGNORE');
 if(by.has('logistics_company_chunks'))await dump('logistics_company_chunks','owner LIKE ?',[worldId+'|%']);
 await dump('logistics_runtime',"id LIKE ? AND id NOT LIKE 'node:%'",['%'+worldId+'%']);
 out.push(...await indexes(used),'COMMIT;');
 return out.join('\n')+'\n';
}

export function installScript(o:{name:string;domain:string;token:string;main:string;repo:string}){return `#!/usr/bin/env bash
set -euo pipefail
[[ $EUID -eq 0 ]] || { echo "Bitte mit sudo ausführen (curl … | sudo bash)." >&2; exit 1; }
NAME='${o.name}'; DOMAIN='${o.domain}'; TOKEN='${o.token}'; MAIN='${o.main}'; REPO='${o.repo}'
export DEBIAN_FRONTEND=noninteractive
echo "==> Weltserver $NAME ($DOMAIN) wird eingerichtet"
apt-get update -y >/dev/null && apt-get install -y curl git ca-certificates gnupg sqlite3 openssl rsync >/dev/null
BASE="/opt/logistik-$NAME"; APP="$BASE/app"
id logistik >/dev/null 2>&1 || useradd --system --home-dir /opt/logistik --create-home --shell /usr/sbin/nologin logistik
mkdir -p "$BASE" /etc/logistik; chown logistik:logistik "$BASE"
if [[ -d "$APP/.git" ]]; then runuser -u logistik -- git -C "$APP" pull --ff-only; else runuser -u logistik -- git clone --depth 50 "$REPO" "$APP"; fi
exec bash "$APP/deploy/node-setup.sh" "$NAME" "$DOMAIN" "$TOKEN" "$MAIN"
`;}
