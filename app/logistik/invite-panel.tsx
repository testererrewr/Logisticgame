'use client';
import {useEffect,useState} from 'react';
export default function InvitePanel({worlds}:{worlds:{id:string;name:string;joined?:number|boolean}[]}){const [d,setD]=useState<any>(null),[msg,setMsg]=useState(''),[open,setOpen]=useState(false);
 const load=()=>fetch('/api/logistik/referral',{cache:'no-store'}).then(r=>r.json()).then(setD).catch(()=>{});useEffect(()=>{if(open&&!d)load();},[open]);
 const link=d?.code?location.origin+'/logistik?ref='+d.code:'';const mine=worlds.filter(w=>w.joined);
 const setWorld=async(world:string)=>{const r=await fetch('/api/logistik/referral',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({world})});const j=await r.json();setMsg(r.ok?'Gespeichert.':j.error);load();};
 return <details className="log-lobby-card log-invite" open={open} onToggle={e=>setOpen((e.target as HTMLDetailsElement).open)}><summary><b>👥 Freunde einladen</b> <small className="log-muted">Prämie für euch beide</small></summary>
  {!d?<p className="log-muted">Wird geladen …</p>:<>
   <p>Dein Freund bekommt <b>{d.bonusNew.toLocaleString('de-DE')} €</b> extra Startkapital bei seiner ersten Spedition. Du bekommst <b>{d.bonusInviter.toLocaleString('de-DE')} €</b>, sobald er an einem zweiten Tag spielt.</p>
   <div className="log-trailer-toolbar"><input readOnly value={link} onFocus={e=>e.target.select()} style={{flex:1,minWidth:220}}/><button className="log-primary" onClick={()=>{void navigator.clipboard?.writeText(link);setMsg('Link kopiert.');}}>Kopieren</button></div>
   <label className="log-setting-row"><span>Meine Prämie gutschreiben in</span><select value={d.world||''} onChange={e=>void setWorld(e.target.value)}><option value="">zuletzt gespielte Welt</option>{mine.map(w=><option key={w.id} value={w.id}>{w.name}</option>)}</select></label>
   {d.list.length>0&&<table className="log-exchange-table"><tbody>{d.list.map((x:any,i:number)=><tr key={i}><td>{x.name||'Neuer Spieler'}</td><td>{x.rewarded_referrer?'✅ Prämie erhalten':x.rewarded_referee?'⏳ wartet auf zweiten Spieltag':'⏳ noch keine Spedition'}</td></tr>)}</tbody></table>}
   {msg&&<small>{msg}</small>}</>}</details>;}
