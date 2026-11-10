'use client';
import {useCallback,useEffect,useState} from 'react';
import {VEHICLES} from '../../lib/logistics/engine';

const STATUS:Record<string,string>={pending:'Wartet auf Freigabe',approved:'Freigegeben',declined:'Abgelehnt'};
const key=(r:any)=>r.world_id+'|'+r.user_id+'|'+r.model_id;

export default function ImageModerationPanel(){
 const [status,setStatus]=useState('pending'),[data,setData]=useState<{rows:any[];counts:any[]}|null>(null),[sel,setSel]=useState<string[]>([]),[note,setNote]=useState(''),[msg,setMsg]=useState(''),[busy,setBusy]=useState(false),[zoom,setZoom]=useState('');
 const load=useCallback(async()=>{try{const r=await fetch('/api/logistik/admin/images?status='+status,{cache:'no-store'}),d:any=await r.json();if(!r.ok)throw Error(d.error);setData(d);setSel([]);}catch(e:any){setMsg(e.message);}},[status]);
 useEffect(()=>{void load();const t=setInterval(()=>void load(),30000);return()=>clearInterval(t);},[load]);
 const decide=async(decision:'approve'|'decline',rows:any[])=>{if(!rows.length)return;setBusy(true);setMsg('');try{const r=await fetch('/api/logistik/admin/images',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({decision,note,items:rows.map(x=>({world:x.world_id,user:x.user_id,model:x.model_id,updated:x.updated}))})}),d:any=await r.json();if(!r.ok)throw Error(d.error);setMsg(`${d.count} ${d.count===1?'Bild':'Bilder'} ${decision==='approve'?'freigegeben':'abgelehnt und beim Nutzer entfernt'}.`);await load();}catch(e:any){setMsg(e.message);}finally{setBusy(false);}};
 const rows=data?.rows||[],chosen=rows.filter(r=>sel.includes(key(r))),count=(s:string)=>(data?.counts||[]).find((c:any)=>c.status===s)?.n||0;
 const src=(r:any)=>`/api/logistik/branding/image?world=${encodeURIComponent(r.world_id)}&user=${r.user_id}&kind=vehicle&model=${encodeURIComponent(r.model_id)}&v=${r.updated}`;
 return <section className="log-admin-card">
  <h2>Fahrzeugbilder freigeben</h2>
  <p className="log-help">Hochgeladene eigene Fahrzeugbilder sind sofort für alle Spieler sichtbar. Hier prüfst du jede Änderung: <b>Freigeben</b> bestätigt das Bild, <b>Ablehnen</b> entfernt es beim Spieler (er sieht den Grund und kann ein neues hochladen).</p>
  <div className="log-trailer-toolbar">{(['pending','approved','declined','all'] as const).map(s=><button key={s} className={status===s?'log-primary':'log-secondary'} onClick={()=>setStatus(s)}>{s==='all'?'Alle':STATUS[s]}{s!=='all'?` (${count(s)})`:''}</button>)}</div>
  {msg&&<p role="status" className="log-admin-message">{msg}</p>}
  {rows.length>0&&status!=='declined'&&<div className="log-trailer-toolbar"><label className="log-checkbox-label"><input type="checkbox" checked={sel.length===rows.length} onChange={e=>setSel(e.target.checked?rows.map(key):[])}/> alle auswählen</label><input placeholder="Grund bei Ablehnung (sieht der Spieler)" value={note} onChange={e=>setNote(e.target.value)}/><button className="log-primary" disabled={busy||!chosen.length} onClick={()=>void decide('approve',chosen)}>Auswahl freigeben ({chosen.length})</button><button className="log-danger" disabled={busy||!chosen.length} onClick={()=>void decide('decline',chosen)}>Auswahl ablehnen</button></div>}
  <div className="log-moderation-grid">{rows.map(r=>{const m=VEHICLES.find(x=>x.id===r.model_id),k=key(r);return <article key={k} className={'log-moderation-item '+r.status}>
   {r.status!=='declined'?<button className="log-moderation-img" onClick={()=>setZoom(src(r))} aria-label="Bild vergrößern"><img src={src(r)} alt={'Fahrzeugbild '+(m?.name||r.model_id)} loading="lazy"/></button>:<div className="log-photo-unavailable">entfernt</div>}
   <div><label className="log-checkbox-label">{r.status!=='declined'&&<input type="checkbox" checked={sel.includes(k)} onChange={e=>setSel(x=>e.target.checked?[...x,k]:x.filter(y=>y!==k))}/>}<b>{m?.name||r.model_id}</b></label>
    <small>{r.company} ({r.player}) · {r.world}<br/>{new Date(r.updated).toLocaleString('de-DE',{day:'2-digit',month:'2-digit',hour:'2-digit',minute:'2-digit'})} · {STATUS[r.status]||r.status}{r.reviewer?' von '+r.reviewer:''}{r.note?' · „'+r.note+'“':''}</small>
    {r.status!=='declined'&&<div className="log-trailer-toolbar">{r.status!=='approved'&&<button className="log-primary" disabled={busy} onClick={()=>void decide('approve',[r])}>Freigeben</button>}<button className="log-danger" disabled={busy} onClick={()=>void decide('decline',[r])}>Ablehnen</button></div>}
   </div></article>;})}{data&&!rows.length&&<p className="log-muted">Keine Bilder in dieser Ansicht.</p>}</div>
  {zoom&&<div className="log-dialog-backdrop" onClick={()=>setZoom('')}><img src={zoom} alt="Vergrößertes Fahrzeugbild" style={{maxWidth:'92vw',maxHeight:'86vh',borderRadius:8}}/></div>}
 </section>;
}
