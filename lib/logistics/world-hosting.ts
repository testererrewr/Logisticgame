import {env} from 'cloudflare:workers';

export function hostedWorlds():Set<string>|null{const raw=String((env as any)?.LOGISTIK_WORLDS||(typeof process!=='undefined'&&process.env?.LOGISTIK_WORLDS)||'');const list=raw.split(',').map(s=>s.trim()).filter(Boolean);return list.length?new Set(list):null;}
export const hostedHere=(worldId:string,hostUrl?:string|null,origin?:string)=>{const set=hostedWorlds();if(set)return set.has(worldId);if(!hostUrl)return true;try{return !!origin&&new URL(hostUrl).origin===origin;}catch{return true;}};
export function normalizeHostUrl(v:unknown){const s=String(v||'').trim();if(!s)return null;const u=new URL(s.startsWith('http')?s:'https://'+s);if(u.protocol!=='https:'&&u.protocol!=='http:')throw Error('Server-Adresse muss mit https:// beginnen.');return u.origin;}
const envVal=(k:string)=>String((env as any)?.[k]||(typeof process!=='undefined'&&process.env?.[k])||'');
export const instanceRole=():'test'|'stable'|'all'=>envVal('LOGISTIK_INSTANCE')==='test'?'test':envVal('LOGISTIK_SPLIT')==='1'?'stable':'all';
export const isTestWorld=(settings:unknown)=>{try{const o=typeof settings==='string'?JSON.parse(settings||'{}'):settings||{};return !!(o as any).testWorld;}catch{return false;}};
export const ownsWorld=(settings:unknown)=>{const r=instanceRole();if(r==='all')return true;return r==='test'?isTestWorld(settings):!isTestWorld(settings);};
export const hostedElsewhere=(hostUrl:unknown)=>{if(!hostUrl)return false;const d=envVal('DOMAIN')||envVal('LOGISTIK_DOMAIN');if(!d)return false;try{return new URL(String(hostUrl)).host!==d;}catch{return false;}};
