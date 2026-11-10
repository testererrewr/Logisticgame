'use client';
import {useSyncExternalStore} from 'react';
export interface Branding {primary:string;secondary:string;logo:string|null;images:Record<string,string>;imageStatus:Record<string,string>;declined:{model:string;note:string}[];entitlements:string[];features:Record<string,string>;premium:boolean;showBadge:boolean;perks:string[]}
let current:Branding|null=null;const listeners=new Set<()=>void>();
export function setBranding(b:Branding|null){current=b;for(const l of listeners)l();}
export function getBranding(){return current;}
export function useBranding(){return useSyncExternalStore(cb=>{listeners.add(cb);return()=>listeners.delete(cb);},()=>current,()=>null);}
export async function loadBranding(worldId:string){try{const r=await fetch('/api/logistik/branding?world='+encodeURIComponent(worldId),{cache:'no-store'});if(!r.ok)return;const d:any=await r.json();setBranding({primary:d.primary,secondary:d.secondary,logo:d.logo,images:Object.fromEntries((d.images||[]).map((i:any)=>[i.model,i.url])),imageStatus:Object.fromEntries((d.images||[]).map((i:any)=>[i.model,i.status])),declined:d.declined||[],entitlements:d.entitlements||[],features:d.features||{},premium:!!d.premium,showBadge:d.showBadge!==false,perks:d.perks||[]});}catch{}}

export function resizeImage(file:File,max:number,quality=.85):Promise<string>{return new Promise((resolve,reject)=>{const url=URL.createObjectURL(file),img=new Image();img.onload=()=>{const scale=Math.min(1,max/Math.max(img.width,img.height)),c=document.createElement('canvas');c.width=Math.round(img.width*scale);c.height=Math.round(img.height*scale);c.getContext('2d')!.drawImage(img,0,0,c.width,c.height);URL.revokeObjectURL(url);resolve(c.toDataURL('image/webp',quality));};img.onerror=()=>{URL.revokeObjectURL(url);reject(Error('Bild konnte nicht gelesen werden.'));};img.src=url;});}
