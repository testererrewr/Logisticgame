'use client';
import {useEffect,useState} from 'react';
const LABEL:Record<string,string>={page:'Seitenaufrufe',tab:'Bereiche im Spiel',action:'Aktionen',device:'Geräte',lang:'Sprachen',world:'Welten',consent:'Zustimmungen'};
function Bars({rows,max}:{rows:{label:string;n:number}[];max?:number}){const top=Math.max(1,max??Math.max(...rows.map(r=>r.n)));return <div className="log-bars">{rows.map(r=><div key={r.label}><span>{r.label}</span><i style={{width:Math.max(2,r.n/top*100)+'%'}}/><b>{r.n.toLocaleString('de-DE')}</b></div>)}</div>;}
export default function AnalyticsPanel(){const [days,setDays]=useState(30),[d,setD]=useState<any>(null),[err,setErr]=useState('');
 useEffect(()=>{fetch('/api/logistik/analytics?days='+days,{cache:'no-store'}).then(r=>r.json()).then(x=>{if(x.error)setErr(x.error);else setD(x);}).catch(()=>setErr('Nicht erreichbar.'));},[days]);
 if(!d)return <p>{err||'Statistik wird geladen …'}</p>;
 const group=(k:string)=>(d.rows as any[]).filter(r=>r.kind===k).map(r=>({label:r.key||'–',n:Number(r.n)})).slice(0,15);
 const vis=(d.visitors as any[]),sum=vis.reduce((a,b)=>a+Number(b.visitors),0),pv=(d.pages as any[]).reduce((a,b)=>a+Number(b.n),0);
 return <section className="log-admin-card log-analytics"><div className="log-page-head"><h2>📈 Statistik</h2><div className="log-tabs">{[7,30,90,365].map(n=><button key={n} className={days===n?'on':''} onClick={()=>setDays(n)}>{n} Tage</button>)}</div></div>
  <p className="log-muted">Nur Besucher mit Zustimmung werden gezählt. Kennungen sind gehasht.</p>
  <div className="log-report-tiles"><div><small>Besuche (Summe Tagesbesucher)</small><b>{sum.toLocaleString('de-DE')}</b></div><div><small>Seitenaufrufe</small><b>{pv.toLocaleString('de-DE')}</b></div><div><small>Konten gesamt</small><b>{Number(d.users?.total||0).toLocaleString('de-DE')}</b></div><div><small>Neue Konten</small><b>{Number(d.users?.recent||0).toLocaleString('de-DE')}</b></div></div>
  <h3>Besucher pro Tag</h3><Bars rows={vis.map(v=>({label:v.day.slice(5),n:Number(v.visitors)}))}/>
  <div className="log-stats-grid">{['tab','action','device','lang','page'].map(k=><section key={k}><h3>{LABEL[k]}</h3><Bars rows={group(k)}/></section>)}
   <section><h3>Welten</h3><Bars rows={(d.worlds as any[]).map(w=>({label:w.name,n:Number(w.companies)}))}/></section></div>
 </section>;}
