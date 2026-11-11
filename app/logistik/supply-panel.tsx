'use client';
import {useCallback,useEffect,useState} from 'react';
import {GOODS,type State} from '../../lib/logistics/engine';
const KINDS=['railStation','railDepot','port','inlandPort','shipDepot','airport','regionalAirport','airDepot','depot','warehouse','warehouseSmall','warehouseMedium','warehouseXL','hub'];
const eur=(n:number)=>n.toLocaleString('de-DE',{style:'currency',currency:'EUR'});
const num=(n:number)=>Math.round(n*10)/10===Math.round(n)?Math.round(n).toLocaleString('de-DE'):n.toLocaleString('de-DE',{maximumFractionDigits:1});
const STATUS:Record<string,string>={open:'Offen',active:'Läuft',cancel_req:'Kündigung läuft',cancel_sup:'Kündigung läuft',done:'Erfüllt',cancelled:'Beendet',withdrawn:'Zurückgezogen'};
async function call(body?:any,world?:string){const r=await fetch('/api/logistik/supply'+(body?'':'?world='+encodeURIComponent(world||'')),body?{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(body)}:{cache:'no-store'});const d=await r.json().catch(()=>({error:'Server antwortet nicht.'}));if(!r.ok)throw Error(d.error||'Fehler');return d;}

export default function SupplyContracts({worldId,state,companies,onSite}:{worldId:string;state:State;companies:{id:string;name:string}[];onSite?:(id:string)=>void}){
 const [data,setData]=useState<any>(null),[err,setErr]=useState(''),[info,setInfo]=useState(''),[form,setForm]=useState(false);
 const sites=state.sites.filter(p=>p.owned&&KINDS.includes(p.kind));
 const [f,setF]=useState({siteId:'',good:'wheat',daily:100,price:20,days:14,target:'',note:''});
 const load=useCallback(()=>call(undefined,worldId).then(d=>{setData(d);setErr('');}).catch(e=>setErr(e.message)),[worldId]);
 useEffect(()=>{load();const t=setInterval(load,60000);return ()=>clearInterval(t);},[load]);
 const act=async(body:any)=>{setInfo('');try{const d=await call({world:worldId,...body});setInfo(d.message||'Gespeichert.');if(body.action==='create')setForm(false);load();}catch(e:any){setInfo(e.message);}};
 const row=(r:any)=><div key={r.id} className="log-supply-card">
  <div><b>{num(r.daily)} EH {r.goodName}</b> täglich → <button className="log-link" onClick={()=>onSite?.(r.site_id)}>{r.site_name}</button></div>
  <small>{eur(r.price)} je EH · {eur(r.daily*r.price)} pro Tag · {r.days} Tage{r.status!=='open'&&r.start_day?` · Tag ${r.start_day}–${r.end_day}`:''}</small>
  <small>Auftraggeber: <b>{r.requester_name}</b>{r.supplier_name&&<> · Lieferant: <b>{r.supplier_name}</b></>}{r.target_id&&r.status==='open'&&' · persönliches Angebot'}</small>
  {r.note&&<small>„{r.note}“</small>}
  {r.status!=='open'&&<div className="log-supply-progress"><span>Heute {num(r.today)} / {num(r.daily)} EH</span><i style={{width:Math.min(100,r.today/r.daily*100)+'%'}}/></div>}
  {r.status!=='open'&&<small>Gesamt {num(r.delivered)} EH · {eur(r.paid)}{r.penalties?` · Strafen ${eur(r.penalties)}`:''}{r.misses?` · ${r.misses} Fehltag(e) in Folge`:''}{r.blocked?' · ⚠️ Auftraggeber kann nicht zahlen':''}</small>}
  <div className="log-supply-actions"><span className={'log-supply-status '+r.status}>{STATUS[r.status]||r.status}</span>
   {r.role==='offer'&&<button className="log-primary" onClick={()=>act({action:'accept',id:r.id})}>Liefervertrag annehmen</button>}
   {r.role==='requester'&&r.status==='open'&&<button onClick={()=>act({action:'withdraw',id:r.id})}>Zurückziehen</button>}
   {r.status==='active'&&<button onClick={()=>{if(confirm(`Vertrag kündigen? Ablöse: ${eur(r.daily*r.price*(r.role==='supplier'?data.penalty*2:data.penalty))}`))act({action:'cancel',id:r.id});}}>Kündigen</button>}</div>
 </div>;
 const mine=data?.mine||[],running=mine.filter((r:any)=>['open','active','cancel_req','cancel_sup'].includes(r.status)),past=mine.filter((r:any)=>!running.includes(r));
 return <section className="log-supply"><h3>📦 Lieferverträge zwischen Speditionen</h3>
  <p className="log-help">Du legst fest: täglich X EH von Gut Y an dein Gebäude Z. Wer den Vertrag annimmt, bekommt Zugang zu Z und liefert dort mit eigenen Linien an. Die Ware wird automatisch übergeben und sofort bezahlt. Fehlt am Tagesende etwas, zahlt der Lieferant {Math.round((data?.penalty||.25)*100)} % des Warenwerts als Strafe; nach {data?.maxMisses||5} Fehltagen in Folge endet der Vertrag.</p>
  {err&&<p className="log-muted">{err}</p>}{info&&<p className="log-muted">{info}</p>}
  <button className="log-secondary log-wide" onClick={()=>setForm(!form)}>{form?'Abbrechen':'➕ Neuen Liefervertrag ausschreiben'}</button>
  {form&&<div className="log-supply-form">
   <div className="log-field"><label>Zielgebäude</label><select value={f.siteId} onChange={e=>setF({...f,siteId:e.target.value})}><option value="">Eigenes Depot, Bahnhof, Hafen, Flughafen oder Lager</option>{sites.map(p=><option key={p.id} value={p.id}>{p.name}</option>)}</select></div>
   <div className="log-field"><label>Gut</label><select value={f.good} onChange={e=>setF({...f,good:e.target.value})}>{GOODS.filter(g=>g.id!=='containers').map(g=><option key={g.id} value={g.id}>{g.name}</option>)}</select></div>
   <div className="log-two"><div className="log-field"><label>EH pro Tag</label><input type="number" min={1} value={f.daily} onChange={e=>setF({...f,daily:Number(e.target.value)})}/></div><div className="log-field"><label>€ je EH</label><input type="number" min={.1} step={.1} value={f.price} onChange={e=>setF({...f,price:Number(e.target.value)})}/></div></div>
   <div className="log-two"><div className="log-field"><label>Laufzeit (Tage)</label><input type="number" min={1} max={90} value={f.days} onChange={e=>setF({...f,days:Number(e.target.value)})}/></div><div className="log-field"><label>Angebot an</label><select value={f.target} onChange={e=>setF({...f,target:e.target.value})}><option value="">Alle Speditionen der Welt</option>{companies.map(c=><option key={c.id} value={c.id}>{c.name}</option>)}</select></div></div>
   <div className="log-field"><label>Notiz (optional)</label><input value={f.note} maxLength={200} onChange={e=>setF({...f,note:e.target.value})}/></div>
   <p className="log-help">Volumen: {eur(f.daily*f.price)} pro Tag · {eur(f.daily*f.price*f.days)} gesamt. Bezahlt wird erst bei Lieferung.</p>
   <button className="log-primary log-wide" disabled={!f.siteId} onClick={()=>act({action:'create',...f})}>Ausschreiben</button></div>}
  <h4>Meine Verträge ({running.length})</h4>{running.length?running.map(row):<p className="log-muted">Keine laufenden Lieferverträge.</p>}
  <h4>Offene Ausschreibungen anderer Speditionen ({data?.open?.length||0})</h4>{data?.open?.length?data.open.map(row):<p className="log-muted">Gerade keine offenen Ausschreibungen.</p>}
  {past.length>0&&<details><summary>Abgeschlossene Verträge ({past.length})</summary>{past.map(row)}</details>}
 </section>;}
