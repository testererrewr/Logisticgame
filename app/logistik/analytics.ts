'use client';
const CONSENT='log-consent-stats',ID='log-aid';
export const analyticsConsent=()=>{try{return localStorage.getItem(CONSENT)==='1';}catch{return false;}};
export function setAnalyticsConsent(on:boolean){try{if(on){localStorage.setItem(CONSENT,'1');if(!localStorage.getItem(ID))localStorage.setItem(ID,crypto.randomUUID());}else{localStorage.removeItem(CONSENT);localStorage.removeItem(ID);}}catch{}if(on)track('consent');}
let last='';
export function track(kind:string,key='',world=''){const consent=analyticsConsent();const k=kind+'|'+key;if(k===last&&kind!=='consent')return;last=k;try{const body=JSON.stringify({kind,key,world,vid:consent?localStorage.getItem(ID)||'':'',device:innerWidth<700?'mobil':innerWidth<1100?'tablet':'desktop',lang:navigator.language||''});if(!navigator.sendBeacon?.('/api/logistik/analytics',new Blob([body],{type:'application/json'})))void fetch('/api/logistik/analytics',{method:'POST',headers:{'Content-Type':'application/json'},body,keepalive:true}).catch(()=>{});}catch{}}
