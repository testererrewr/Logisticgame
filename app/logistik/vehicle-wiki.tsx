'use client';
import {useState} from 'react';
import {VEHICLES,TRAILERS,FREIGHT_NAMES,SEASONAL_GOODS,isRegionalAircraft,euro} from '../../lib/logistics/engine';
import {ENERGY} from '../../lib/logistics/fuel';
import {EDITIONS} from '../../lib/logistics/rare-vehicles';
import {ACHIEVEMENTS,rewardText} from '../../lib/logistics/progression';
import {SPECIAL_CARGO} from '../../lib/logistics/special-cargo';
import VehiclePhoto from './vehicle-photo';
const MODES:[string,string][]=[['all','Alle'],['van','Transporter'],['truck','LKW'],['rail','Züge'],['ship','Schiffe'],['air','Flugzeuge']];
export default function VehicleWiki(){const [mode,setMode]=useState('all'),[q,setQ]=useState(''),[sort,setSort]=useState('price');
 const list=VEHICLES.filter(v=>(mode==='all'||v.mode===mode)&&(v.name+' '+v.manufacturer).toLowerCase().includes(q.toLowerCase())).sort((a,b)=>sort==='price'?a.price-b.price:sort==='capacity'?b.capacity-a.capacity:sort==='speed'?b.speed-a.speed:a.name.localeCompare(b.name,'de'));
 const rewards=ACHIEVEMENTS.filter(a=>a.reward.vehicle);
 return <div className="log-vehicle-wiki">
  <div className="log-market-filters"><input placeholder="Modell oder Hersteller suchen …" value={q} onChange={e=>setQ(e.target.value)}/><select value={mode} onChange={e=>setMode(e.target.value)}>{MODES.map(([id,n])=><option key={id} value={id}>{n}</option>)}</select><select value={sort} onChange={e=>setSort(e.target.value)}><option value="price">Preis aufsteigend</option><option value="capacity">Kapazität</option><option value="speed">Geschwindigkeit</option><option value="name">Name</option></select><small>{list.length} Fahrzeuge</small></div>
  <div className="log-vehicle-wiki-grid">{list.map(v=><article key={v.id}><VehiclePhoto id={v.id}/><b>{v.name}</b>{isRegionalAircraft(v)&&<span className="log-air-tag ok">REGIO</span>}<small>{v.manufacturer}</small><dl><div><dt>Preis</dt><dd>{euro(v.price)}</dd></div><div><dt>Kapazität</dt><dd>{v.attachment?'je nach Auflieger/Aufbau':v.mode==='rail'?'je nach Wagen':v.capacity.toLocaleString('de-DE')+' EH'}</dd></div><div><dt>Tempo</dt><dd>{v.speed} km/h</dd></div><div><dt>Betrieb</dt><dd>{euro(v.cost)}/Tag</dd></div>{v.fuel&&v.energy&&<div><dt>Verbrauch</dt><dd>{v.fuel.toLocaleString('de-DE')} {(ENERGY as any)[v.energy]?.unit}/100 km · {(ENERGY as any)[v.energy]?.name}</dd></div>}<div><dt>Fracht</dt><dd>{v.attachment?'über Auflieger/Aufbau':v.types.map(t=>(FREIGHT_NAMES as any)[t]).join(', ')}</dd></div></dl></article>)}</div>
  <h3>✨ Seltene Ausführungen (Auktionen im Gebrauchtmarkt)</h3><p className="log-help">An etwa jedem zehnten Spieltag wird ein seltenes Fahrzeug versteigert – jedes Modell oben ist möglich. Die Ausführung bestimmt Preisnachlass, Kilometerstand und Alter.</p>
  <div className="log-wiki-chips">{EDITIONS.map(e=><span key={e.name}>✨ {e.name} · Startpreis ca. {Math.round(e.discount*100)} % vom Neupreis</span>)}</div>
  <h3>🏅 Erfolgs-Fahrzeuge</h3><div className="log-wiki-chips">{rewards.map(a=><span key={a.id}>{a.icon} {a.name}: {rewardText(a.reward)}</span>)}</div>
  <h3>🎁 Event- und Sonderfracht</h3><p className="log-help">Festtagsfracht gibt es nur während Events (von der Spielleitung gestartet). Seltene Ware taucht selten im Auftragsmarkt auf.</p><div className="log-wiki-chips">{SEASONAL_GOODS.map(g=><span key={g.id}>{g.icon} {g.name}</span>)}{SPECIAL_CARGO.map(c=><span key={c.id}>{c.icon} {c.name}</span>)}</div>
  <h3>Auflieger & Aufbauten</h3><div className="log-wiki-chips">{TRAILERS.map(t=><span key={t.id}>{t.name} · {t.capacity} EH · {euro(t.price)}</span>)}</div>
 </div>;}
