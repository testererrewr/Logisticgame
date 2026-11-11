'use client';
import {useEffect,useState} from 'react';
type Notice={message:string;at:number;until:number};
export default function MaintenanceBanner(){
 const [n,setN]=useState<Notice|null>(null),[now,setNow]=useState(Date.now()),[hidden,setHidden]=useState(0);
 useEffect(()=>{let stop=false;const load=()=>fetch('/api/logistik/status',{cache:'no-store'}).then(r=>r.ok?r.json():null).then(d=>{if(!stop&&d)setN(d.maintenance||null);}).catch(()=>{});load();const a=setInterval(load,45000),b=setInterval(()=>setNow(Date.now()),1000);return ()=>{stop=true;clearInterval(a);clearInterval(b);};},[]);
 if(!n||hidden===n.at)return null;const left=Math.max(0,Math.round((n.at-now)/1000)),mm=Math.floor(left/60),ss=String(left%60).padStart(2,'0');
 return <div className="log-maint-banner" role="status"><b>🛠️ Wartung</b><span>{n.message}</span><em>{left>0?`Neustart in ${mm}:${ss}`:'Neustart läuft …'}</em><button onClick={()=>setHidden(n.at)} aria-label="Ausblenden">✕</button></div>;}
