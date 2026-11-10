'use client';
import {useCallback,useEffect,useState} from 'react';

const LEVEL:Record<string,string>={error:'Fehler',warn:'Warnung',info:'Info'};
const time=(n:number)=>new Date(n).toLocaleString('de-DE',{day:'2-digit',month:'2-digit',hour:'2-digit',minute:'2-digit',second:'2-digit'});
export default function ErrorLogPanel(){
 const [data,setData]=useState<{rows:any[];stats:any[]}|null>(null),[level,setLevel]=useState('error'),[source,setSource]=useState(''),[query,setQuery]=useState(''),[open,setOpen]=useState(''),[msg,setMsg]=useState(''),[auto,setAuto]=useState(true);
 const load=useCallback(async()=>{try{const p=new URLSearchParams({limit:'300'});if(level)p.set('level',level);if(source)p.set('source',source);if(query.trim())p.set('q',query.trim());const r=await fetch('/api/logistik/errors?'+p,{cache:'no-store'}),d:any=await r.json();if(!r.ok)throw Error(d.error);setData(d);setMsg('');}catch(e:any){setMsg(e.message);}},[level,source,query]);
 useEffect(()=>{void load();if(!auto)return;const t=setInterval(()=>void load(),20000);return()=>clearInterval(t);},[load,auto]);
 const clear=async(id?:string)=>{if(!id&&!confirm('Gesamtes Fehlerprotokoll löschen?'))return;const r=await fetch('/api/logistik/errors'+(id?'?id='+encodeURIComponent(id):''),{method:'DELETE'});if(r.ok)void load();};
 const copy=(r:any)=>void navigator.clipboard?.writeText(`[${r.level}] ${r.source} · ${r.count}× · zuletzt ${time(r.last)}\n${r.name}: ${r.message}\nKontext: ${r.context}\n${r.stack}`).then(()=>setMsg('In die Zwischenablage kopiert.'));
 const sources=[...new Set((data?.rows||[]).map(r=>String(r.source).split(':')[0]))];
 return <section className="log-admin-card log-error-log">
  <h2>Fehlerprotokoll</h2>
  <p className="log-help">Server- und Browserfehler mit Kontext (Spieler, Welt, Aktion, Stacktrace). Gleiche Fehler werden zusammengefasst. <b>Fehler</b> = Programmfehler, <b>Warnung</b> = Spielregel-Meldung oder vorübergehendes Problem (z. B. Datenquelle nicht erreichbar). Zusätzlich auf dem Server: <code>journalctl -u logistik -f</code></p>
  <div className="log-error-stats">{(data?.stats||[]).map((s:any)=><span key={s.level} className={'log-error-badge '+s.level}>{LEVEL[s.level]||s.level}: {s.n} Arten · {Number(s.total).toLocaleString('de-DE')}×</span>)}</div>
  <div className="log-trailer-toolbar"><select aria-label="Stufe" value={level} onChange={e=>setLevel(e.target.value)}><option value="">Alle Stufen</option><option value="error">Nur Fehler</option><option value="warn">Nur Warnungen</option></select><select aria-label="Bereich" value={source} onChange={e=>setSource(e.target.value)}><option value="">Alle Bereiche</option>{[...new Set(['online','api','tick','settle','import','browser',...sources])].map(s=><option key={s} value={s}>{s}</option>)}</select><input placeholder="Text, Spieler-ID, Aktion …" value={query} onChange={e=>setQuery(e.target.value)}/><label className="log-checkbox-label"><input type="checkbox" checked={auto} onChange={e=>setAuto(e.target.checked)}/> automatisch aktualisieren</label><button className="log-secondary" onClick={()=>void load()}>Aktualisieren</button><button className="log-danger" onClick={()=>void clear()}>Alles löschen</button></div>
  {msg&&<p role="status" className="log-admin-message">{msg}</p>}
  <div className="log-error-list">{(data?.rows||[]).map((r:any)=><article key={r.id} className={'log-error-row '+r.level}>
   <button className="log-error-head" onClick={()=>setOpen(open===r.id?'':r.id)} aria-expanded={open===r.id}><span className={'log-error-badge '+r.level}>{LEVEL[r.level]||r.level}</span><b>{r.source}</b><span className="log-error-msg">{r.message}</span><small>{r.count}× · {time(r.last)}</small></button>
   {open===r.id&&<div className="log-error-detail"><dl><div><dt>Erstmals</dt><dd>{time(r.first)}</dd></div><div><dt>Zuletzt</dt><dd>{time(r.last)}</dd></div><div><dt>Anzahl</dt><dd>{r.count}</dd></div><div><dt>Typ</dt><dd>{r.name||'–'}</dd></div><div><dt>Spieler</dt><dd>{r.user_name||r.user_id||'–'}</dd></div><div><dt>Welt</dt><dd>{r.world_name||r.world_id||'–'}</dd></div></dl><h4>Kontext</h4><pre>{(()=>{try{return JSON.stringify(JSON.parse(r.context),null,2);}catch{return r.context;}})()}</pre>{r.stack&&<><h4>Stacktrace</h4><pre>{r.stack}</pre></>}<div className="log-trailer-toolbar"><button className="log-secondary" onClick={()=>copy(r)}>Kopieren</button><button className="log-secondary" onClick={()=>void clear(r.id)}>Eintrag löschen</button></div></div>}
  </article>)}{data&&!data.rows.length&&<p className="log-muted">Keine Einträge für diesen Filter. 🎉</p>}</div>
 </section>;
}
