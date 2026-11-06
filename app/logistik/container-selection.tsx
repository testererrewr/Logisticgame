'use client';
import {useState} from 'react';
import type {State} from '../../lib/logistics/engine';
import {activeContainerOrder} from '../../lib/logistics/container-routing';
export default function ContainerSelection({state,value,onChange,siteId,siteIds,inherit=false,manual=false,allByGo=false}:{state:State;value:string[]|undefined;onChange:(ids:string[]|undefined)=>void;siteId?:string;siteIds?:string[];inherit?:boolean;manual?:boolean;allByGo?:boolean}){
 const [query,setQuery]=useState(''),[limit,setLimit]=useState(30);
 const name=(id:string|undefined)=>state.sites.find(p=>p.id===id)?.name||id||'Unbekannt',locations=siteIds??(siteId!==undefined?[siteId]:undefined),quantity=(id:string)=>locations?.reduce((n,p)=>n+(state.consignments?.[p]?.[id]||0),0)??0;
 const orders=state.contracts.filter(c=>activeContainerOrder(state,c)&&(!locations||quantity(c.id)>.000001)&&[name(c.siteId),name(c.destinationId),c.id].join(' ').toLowerCase().includes(query.toLowerCase())).sort((a,b)=>a.endDay-b.endDay);
 return <details className="log-container-selection"><summary>Containeraufträge · {value?.length?value.length+' ausgewählt':inherit?'Aus der Linie':allByGo?'Alle beim Go':manual?'Keine ausgewählt':'Alle passenden'}</summary>
 <p className="log-help">{allByGo?'Beim Go werden alle vorhandenen Containeraufträge geladen. Eine Auswahl begrenzt das Laden auf diese Aufträge.':manual?'Go: Container nur nach bewusster Auftragsauswahl laden.':'Ohne Auswahl werden automatisch alle passenden Container geladen. Eine Auswahl begrenzt das Laden auf diese Aufträge.'} {locations?'Hier stehen nur Aufträge mit Fracht an diesem Standort'+(locations.length>1?' oder direkt benachbarten Stationen':'')+'.':''}</p>
 {inherit&&<button type="button" className="log-secondary" onClick={()=>onChange(undefined)}>Auftragsauswahl der Linie verwenden</button>}
 <button type="button" className="log-secondary" onClick={()=>onChange(allByGo?undefined:[])}>{allByGo?'Alle vorhandenen Container beim Go laden':manual?'Keine Container auswählen':'Alle passenden automatisch laden'}</button>
 {manual&&!!orders.length&&<button type="button" className="log-secondary" onClick={()=>onChange(orders.map(c=>c.id))}>Alle angezeigten Container auswählen</button>}
 <input aria-label="Containeraufträge nach Start oder Ziel suchen" value={query} placeholder="Auftrag, Start oder Ziel suchen …" onChange={e=>{setQuery(e.target.value);setLimit(30);}}/>
 {orders.slice(0,limit).map(c=><label key={c.id} className="log-container-order-choice"><input type="checkbox" checked={value?.includes(c.id)||false} onChange={e=>onChange(e.target.checked?[...(value||[]),c.id]:(value||[]).filter(id=>id!==c.id))}/><span><strong>{name(c.siteId)} → {name(c.destinationId)}</strong><small>#{c.id.slice(-12)} · {(c.total!-c.delivered).toLocaleString('de-DE')} EH offen{locations?' · '+quantity(c.id).toLocaleString('de-DE')+' EH vor Ort':''}</small><small>{Math.max(0,Math.ceil(c.endDay-state.day))} Tage Restzeit</small></span></label>)}
 {orders.length>limit&&<button className="log-secondary" onClick={()=>setLimit(n=>n+30)}>Weitere Aufträge anzeigen</button>}{!orders.length&&<p className="log-help">Keine passende Containerfracht vor Ort für diese Suche.</p>}</details>;
}
