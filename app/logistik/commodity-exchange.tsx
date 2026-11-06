'use client';
import {useMemo,useState} from 'react';
import {GOODS,FREIGHT_NAMES,salePrice,type GoodId} from '../../lib/logistics/engine';
const euro=(n:number)=>n.toLocaleString('de-DE',{style:'currency',currency:'EUR',minimumFractionDigits:2,maximumFractionDigits:2});
import ProductImage from './product-image';

const HISTORY=30;
function Spark({values}:{values:number[]}){const min=Math.min(...values),max=Math.max(...values),span=max-min||1,w=120,h=30;const pts=values.map((v,i)=>`${(i/(values.length-1)*w).toFixed(1)},${(h-2-(v-min)/span*(h-4)).toFixed(1)}`).join(' ');const up=values[values.length-1]>=values[values.length-2];return <svg className="log-spark" viewBox={`0 0 ${w} ${h}`} width={w} height={h} aria-hidden="true"><polyline points={pts} fill="none" stroke={up?'#5ee0b2':'#f48b81'} strokeWidth="1.6" strokeLinejoin="round"/></svg>;}

export default function CommodityExchange({day}:{day:number}){
 const today=Math.floor(day);
 const [query,setQuery]=useState(''),[type,setType]=useState('all'),[sort,setSort]=useState('change');
 const rows=useMemo(()=>GOODS.filter(g=>g.id!=='containers'&&g.sale>0).map(g=>{const history=Array.from({length:HISTORY},(_,i)=>salePrice(g.id as GoodId,today-HISTORY+1+i)),now=history[HISTORY-1],prev=history[HISTORY-2];return {g,history,now,prev,change:(now-prev)/prev*100,margin:(now-g.purchase)/Math.max(.01,g.purchase)*100,low:Math.min(...history),high:Math.max(...history)};}),[today]);
 const shown=rows.filter(r=>(type==='all'||r.g.type===type)&&r.g.name.toLocaleLowerCase('de').includes(query.trim().toLocaleLowerCase('de'))).sort((a,b)=>sort==='change'?b.change-a.change:sort==='changeAsc'?a.change-b.change:sort==='margin'?b.margin-a.margin:sort==='price'?b.now-a.now:a.g.name.localeCompare(b.g.name,'de'));
 const winners=[...rows].sort((a,b)=>b.change-a.change).slice(0,3),losers=[...rows].sort((a,b)=>a.change-b.change).slice(0,3);
 return <section className="log-exchange-board">
  <h1>Warenbörse · Spieltag {today}</h1>
  <p className="log-help">Verkaufspreise an Endkunden ändern sich jeden Spieltag (simuliert, für alle Speditionen der Welt gleich). Bezahlt wird der Kurs am Tag der Lieferung. Einkaufspreise bei Lieferverträgen bleiben fest.</p>
  <div className="log-exchange-movers"><div><b>Gewinner heute</b>{winners.map(r=><span key={r.g.id} className="up">{r.g.name} +{r.change.toFixed(1)} %</span>)}</div><div><b>Verlierer heute</b>{losers.map(r=><span key={r.g.id} className="down">{r.g.name} {r.change.toFixed(1)} %</span>)}</div></div>
  <div className="log-trailer-toolbar"><input aria-label="Gut suchen" placeholder="Gut suchen …" value={query} onChange={e=>setQuery(e.target.value)}/><select aria-label="Frachtart" value={type} onChange={e=>setType(e.target.value)}><option value="all">Alle Frachtarten</option>{Object.entries(FREIGHT_NAMES).map(([id,n])=><option key={id} value={id}>{n}</option>)}</select><select aria-label="Sortierung" value={sort} onChange={e=>setSort(e.target.value)}><option value="change">Größter Anstieg</option><option value="changeAsc">Größter Rückgang</option><option value="margin">Beste Marge</option><option value="price">Höchster Preis</option><option value="name">Name A–Z</option></select><span className="log-muted">{shown.length} Güter</span></div>
  <table className="log-exchange-table"><thead><tr><th>Gut</th><th>Verkauf heute</th><th>Δ Vortag</th><th>30 Tage</th><th>Spanne 30 Tage</th><th>Einkauf (fest)</th><th>Marge</th></tr></thead><tbody>{shown.map(r=><tr key={r.g.id}><td><div className="log-exchange-good"><ProductImage id={r.g.id}/><span><b>{r.g.name}</b><small>{FREIGHT_NAMES[r.g.type]}</small></span></div></td><td><b>{euro(r.now)}</b>/EH</td><td className={r.change>=0?'up':'down'}>{r.change>=0?'▲ +':'▼ '}{r.change.toFixed(1)} %</td><td><Spark values={r.history}/></td><td>{euro(r.low)} – {euro(r.high)}</td><td>{euro(r.g.purchase)}</td><td className={r.margin>=0?'up':'down'}>{r.margin>=0?'+':''}{r.margin.toFixed(0)} %</td></tr>)}</tbody></table>
 </section>;
}
