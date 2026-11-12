'use client';
import {useEffect,useState} from 'react';
import {IMPRESSUM,DATENSCHUTZ} from '../../lib/logistics/legal-templates';
export default function LegalAdmin(){const [kind,setKind]=useState('impressum'),[text,setText]=useState(''),[msg,setMsg]=useState(''),[loaded,setLoaded]=useState(false);
 useEffect(()=>{setLoaded(false);fetch('/api/logistik/legal?kind='+kind,{cache:'no-store'}).then(r=>r.json()).then(d=>{setText(d.text||(kind==='impressum'?IMPRESSUM:DATENSCHUTZ));setLoaded(true);});},[kind]);
 const save=async()=>{const r=await fetch('/api/logistik/legal',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({kind,text})});const d=await r.json();setMsg(r.ok?'Gespeichert.':d.error||'Fehler');};
 return <section className="log-admin-card"><h2>⚖️ Rechtliches</h2><div className="log-tabs">{['impressum','datenschutz'].map(k=><button key={k} className={kind===k?'on':''} onClick={()=>setKind(k)}>{k==='impressum'?'Impressum':'Datenschutz'}</button>)}</div>
  <p className="log-muted">Vorlage: Alles in [eckigen Klammern] ersetzen. Bitte rechtlich prüfen lassen – das ist keine Rechtsberatung. Überschriften mit „# “, Absätze durch Leerzeilen.</p>
  {loaded&&<textarea className="log-chat-input" rows={24} value={text} onChange={e=>setText(e.target.value)}/>}
  <div className="log-trailer-toolbar"><button className="log-primary" onClick={()=>void save()}>Speichern</button><button className="log-secondary" onClick={()=>{if(confirm('Aktuellen Text durch die österreichische Vorlage ersetzen? (Erst mit „Speichern“ übernommen)'))setText(kind==='impressum'?IMPRESSUM:DATENSCHUTZ);}}>Vorlage Österreich laden</button><a href={'/'+kind} target="_blank" rel="noreferrer">Ansehen</a>{/\[[^\]]+\]/.test(text)&&<small className="log-muted">⚠️ Es sind noch Platzhalter offen.</small>}</div>{msg&&<p>{msg}</p>}</section>;}
