'use client';
import {useEffect,useState} from 'react';
import {setAnalyticsConsent,analyticsConsent} from './analytics';
const KEY='log-cookie-notice-v2';
export const openCookieInfo=()=>window.dispatchEvent(new CustomEvent('log-cookie-info'));
export default function CookieNotice(){const [show,setShow]=useState(false),[details,setDetails]=useState(false),[stats,setStats]=useState(false);
 useEffect(()=>{setStats(analyticsConsent());try{if(!localStorage.getItem(KEY))setShow(true);}catch{setShow(true);}const on=()=>{setShow(true);setDetails(true);setStats(analyticsConsent());};window.addEventListener('log-cookie-info',on);return()=>window.removeEventListener('log-cookie-info',on);},[]);
 if(!show)return null;
 const save=(allow:boolean)=>{setAnalyticsConsent(allow);try{localStorage.setItem(KEY,String(Date.now()));}catch{}setShow(false);setDetails(false);};
 return <div className="log-cookie" role="dialog" aria-live="polite" aria-label="Cookies & Datenschutz"><div><b>🍪 Cookies & Statistik</b><p>Wir speichern nur, was für Anmeldung und deine Einstellungen nötig ist. Mit deiner Zustimmung zählen wir zusätzlich anonym wiederkehrende Besuche – ohne Werbung, ohne Dritte, nur auf unserem Server.</p>
  {details&&<table className="log-exchange-table"><thead><tr><th>Name</th><th>Art</th><th>Zweck</th><th>Dauer</th></tr></thead><tbody>
   <tr><td>Sitzungs-Cookie</td><td>Cookie, notwendig</td><td>Hält dich angemeldet</td><td>bis Abmeldung</td></tr>
   <tr><td>lgx_inst</td><td>Cookie, notwendig</td><td>Leitet Testwelten zur richtigen Serverinstanz</td><td>30 Tage</td></tr>
   <tr><td>log-*</td><td>Lokaler Speicher, funktional</td><td>Einstellungen wie Tag/Nacht, Ton, Währung, gelesene Nachrichten</td><td>bis du ihn löschst</td></tr>
   <tr><td>log-aid</td><td>Lokaler Speicher, Statistik (nur mit Zustimmung)</td><td>Zufällige Kennung zum Zählen von Besuchen und genutzten Bereichen, anonym ausgewertet</td><td>bis Widerruf</td></tr>
  </tbody></table>}
  {details&&<label className="log-checkbox-label"><input type="checkbox" checked={stats} onChange={e=>setStats(e.target.checked)}/> Anonyme Nutzungsstatistik erlauben</label>}
  <p className="log-muted">Notwendige Speicherung: § 25 Abs. 2 TDDDG. Statistik: Einwilligung nach § 25 Abs. 1 TDDDG / Art. 6 Abs. 1 lit. a DSGVO, jederzeit hier widerrufbar. <a href="/datenschutz" target="_blank" rel="noreferrer">Datenschutz</a> · <a href="/impressum" target="_blank" rel="noreferrer">Impressum</a></p></div>
  <div className="log-cookie-actions"><button className="log-secondary" onClick={()=>setDetails(d=>!d)}>{details?'Weniger':'Einstellungen'}</button>{details?<button className="log-primary" onClick={()=>save(stats)}>Auswahl speichern</button>:<><button className="log-secondary" onClick={()=>save(false)}>Nur notwendige</button><button className="log-primary" onClick={()=>save(true)}>Statistik erlauben</button></>}</div></div>;}
