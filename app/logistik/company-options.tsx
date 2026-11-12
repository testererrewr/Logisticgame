'use client';
import {useState} from 'react';
import type {State} from '../../lib/logistics/engine';
import type {OnlineAction} from '../../lib/logistics/online-actions';
import {CURRENCIES,currencyCode,setCurrency} from '../../lib/logistics/currency';
export default function CompanyOptions({state,commit,busy}:{state:State;busy?:boolean;commit:(fn:(s:State)=>void,message?:string,cmd?:OnlineAction)=>boolean}){
 const after=(state as any).afterOrder==='stay'?'stay':'depot',[cur,setCur]=useState(currencyCode());
 const setAfter=(v:'depot'|'stay')=>commit(s=>{(s as any).afterOrder=v;},'Gespeichert.',{type:'companyOptions',afterOrder:v});
 return <article className="log-admin-card"><h2>Spedition</h2>
  <label className="log-field"><span>Nach Auftragsfahrten</span><select value={after} disabled={busy} onChange={e=>setAfter(e.target.value as any)}><option value="depot">Fahrzeuge fahren zurück ins Depot</option><option value="stay">Fahrzeuge bleiben am Zielort stehen</option></select></label>
  <small className="log-muted">Gilt nur für Linien aus Aufträgen und nur, wenn keine Retourroute oder nächste Linie eingeplant ist.</small>
  <label className="log-field"><span>Währung (nur Anzeige)</span><select value={cur} onChange={e=>{setCurrency(e.target.value);setCur(e.target.value);}}>{Object.entries(CURRENCIES).map(([k,c])=><option key={k} value={k}>{c.symbol} · {c.name}</option>)}</select></label>
 </article>;}
