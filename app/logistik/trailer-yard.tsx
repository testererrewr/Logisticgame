'use client';
import {useState} from 'react';
import {TRAILERS,FREIGHT_NAMES,MAX_FLEET_PURCHASE,purchaseTrailers,euro,type State} from '../../lib/logistics/engine';
import {sellTrailers,trailerDealerValue} from '../../lib/logistics/vehicle-sales';
import type {OnlineAction} from '../../lib/logistics/online-actions';
import EquipmentPhoto from './equipment-photo';

const km=(n:number)=>Math.round(n||0).toLocaleString('de-DE')+' km';
const eh=(n:number)=>(Math.round((n||0)*10)/10).toLocaleString('de-DE')+' EH';

export default function TrailerYard({state,commit,busy}:{state:State;busy?:boolean;commit:(fn:(s:State)=>void,message?:string,cmd?:OnlineAction)=>boolean}){
 const depots=state.sites.filter(p=>p.owned&&p.kind==='depot');
 const [depotId,setDepotId]=useState(''),[counts,setCounts]=useState<Record<string,number>>({}),[picked,setPicked]=useState<string[]>([]),[filter,setFilter]=useState('all');
 const depot=depots.find(d=>d.id===depotId)||depots[0];
 const owned=(state.trailers||[]).filter(t=>filter==='all'||t.locationId===filter);
 const attached=state.vehicles.filter(v=>v.trailerUnit).length;
 const buy=(specId:string)=>{const count=counts[specId]||1;if(!depot)return;const cmd={type:'buyTrailers' as const,specId,depotId:depot.id,count};commit(s=>purchaseTrailers(s,specId,depot.id,count),count+' Auflieger in '+depot.name+' abgestellt.',cmd);};
 const sell=(ids:string[])=>{if(!ids.length)return;const value=(state.trailers||[]).filter(t=>ids.includes(t.id)).reduce((n,t)=>n+trailerDealerValue(t),0);if(!confirm(ids.length+' Auflieger für '+euro(value)+' an den Händler verkaufen?'))return;if(commit(s=>{sellTrailers(s,ids);},ids.length+' Auflieger verkauft.',{type:'sellTrailers',trailerUnitIds:ids}))setPicked([]);};
 const toggle=(id:string)=>setPicked(p=>p.includes(id)?p.filter(x=>x!==id):[...p,id]);
 return <div className="log-trailer-yard">
  <section>
   <h2>Abgestellte Auflieger <small>{(state.trailers||[]).length} im Depot · {attached} an Zugmaschinen</small></h2>
   <p className="log-muted">Auflieger behalten ihre eigenen Kilometer und transportierten EH, auch wenn sie die Zugmaschine wechseln. Anhängen und Abhängen geht in den Fahrzeugdetails, wenn die Zugmaschine leer und ohne Linie im selben Depot steht. Feste Aufbauten (Pritsche, Koffer, Kühlkoffer) gehören zum Solo-LKW und lassen sich nicht abnehmen.</p>
   <div className="log-trailer-toolbar">
    <select aria-label="Depot filtern" value={filter} onChange={e=>{setFilter(e.target.value);setPicked([]);}}><option value="all">Alle Depots</option>{depots.map(d=><option key={d.id} value={d.id}>{d.name}</option>)}</select>
    <button className="log-secondary" disabled={!owned.length} onClick={()=>setPicked(picked.length===owned.length?[]:owned.map(t=>t.id))}>{picked.length===owned.length&&owned.length?'Auswahl aufheben':'Alle auswählen'}</button>
    <button className="log-danger" disabled={busy||!picked.length} onClick={()=>sell(picked)}>{picked.length} verkaufen</button>
   </div>
   {owned.length?<table className="log-trailer-table"><thead><tr><th></th><th>Auflieger</th><th>Standort</th><th>Kilometer</th><th>Transportiert</th><th>Händlerwert</th><th></th></tr></thead><tbody>{owned.map(t=>{const spec=TRAILERS.find(x=>x.id===t.specId);return <tr key={t.id}><td><input type="checkbox" aria-label="Auflieger auswählen" checked={picked.includes(t.id)} onChange={()=>toggle(t.id)}/></td><td><b>{spec?.name||t.specId}</b><small>{spec?.capacity} EH · {spec?.types.map(x=>FREIGHT_NAMES[x]).join(', ')}</small></td><td>{state.sites.find(p=>p.id===t.locationId)?.name||'–'}</td><td>{km(t.odometerKm)}</td><td>{eh(t.transportedEh)}</td><td>{euro(trailerDealerValue(t))}</td><td><button className="log-secondary" disabled={busy} onClick={()=>sell([t.id])}>Verkaufen</button></td></tr>;})}</tbody></table>:<p className="log-muted">Keine abgestellten Auflieger{filter!=='all'?' in diesem Depot':''}.</p>}
  </section>
  <section>
   <h2>Auflieger kaufen</h2>
   <label className="log-trailer-depot">Abstellen in<select aria-label="Depot für neue Auflieger" value={depot?.id||''} onChange={e=>setDepotId(e.target.value)}>{!depots.length&&<option value="">Zuerst ein LKW-Depot bauen</option>}{depots.map(d=><option key={d.id} value={d.id}>{d.name}</option>)}</select></label>
   <div className="log-equipment-grid">{TRAILERS.filter(t=>t.mount==='semi').map(t=>{const count=counts[t.id]||1;return <article key={t.id}><EquipmentPhoto id={t.id} kind="trailers" credits/><div><h3>{t.name}</h3><b>{t.capacity} EH · {euro(t.price)}</b><p>{t.types.map(x=>FREIGHT_NAMES[x]).join(' · ')}</p>{t.heavyOnly&&<p className="log-heavy-tag">Nur Schwerlast</p>}<label className="log-trailer-count">Anzahl<input type="number" min="1" max={MAX_FLEET_PURCHASE} value={count} onChange={e=>setCounts(c=>({...c,[t.id]:Math.max(1,Math.min(MAX_FLEET_PURCHASE,Math.floor(e.target.valueAsNumber||1)))}))}/></label><button className="log-primary" disabled={busy||!depot||state.cash<t.price*count} onClick={()=>buy(t.id)}>{count} kaufen · {euro(t.price*count)}</button></div></article>;})}</div>
  </section>
 </div>;
}
