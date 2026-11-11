'use client';
import {useEffect,useState} from 'react';
const KEY='log-cookie-notice-v1';
export const openCookieInfo=()=>window.dispatchEvent(new CustomEvent('log-cookie-info'));
export default function CookieNotice(){const [show,setShow]=useState(false),[details,setDetails]=useState(false);
 useEffect(()=>{try{if(!localStorage.getItem(KEY))setShow(true);}catch{setShow(true);}const on=()=>{setShow(true);setDetails(true);};window.addEventListener('log-cookie-info',on);return()=>window.removeEventListener('log-cookie-info',on);},[]);
 if(!show)return null;
 const ok=()=>{try{localStorage.setItem(KEY,String(Date.now()));}catch{}setShow(false);setDetails(false);};
 return <div className="log-cookie" role="dialog" aria-live="polite" aria-label="Cookies & Datenschutz"><div><b>🍪 Cookies & lokaler Speicher</b><p>Wir verwenden nur technisch notwendige Cookies für Anmeldung und Sitzung sowie den lokalen Speicher deines Browsers für deine Einstellungen. Keine Werbe-, Analyse- oder Tracking-Cookies, keine Weitergabe an Dritte.</p>
  {details&&<table className="log-exchange-table"><thead><tr><th>Name</th><th>Art</th><th>Zweck</th><th>Dauer</th></tr></thead><tbody>
   <tr><td>Sitzungs-Cookie</td><td>Cookie, notwendig</td><td>Hält dich angemeldet</td><td>bis Abmeldung</td></tr>
   <tr><td>lgx_inst</td><td>Cookie, notwendig</td><td>Leitet Testwelten zur richtigen Serverinstanz</td><td>30 Tage</td></tr>
   <tr><td>log-*</td><td>Lokaler Speicher, funktional</td><td>Einstellungen wie Tag/Nacht, Ton, Kartenposition, gelesene Nachrichten</td><td>bis du ihn löschst</td></tr>
  </tbody></table>}
  <p className="log-muted">Rechtsgrundlage: § 25 Abs. 2 TTDSG bzw. Art. 5 Abs. 3 ePrivacy-Richtlinie (unbedingt erforderlich). Eine Einwilligung ist dafür nicht nötig.</p></div>
  <div className="log-cookie-actions"><button className="log-secondary" onClick={()=>setDetails(d=>!d)}>{details?'Weniger':'Details'}</button><button className="log-primary" onClick={ok}>Verstanden</button></div></div>;}
