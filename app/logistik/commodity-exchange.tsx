'use client';
import {useMemo,useState} from 'react';
import {GOODS,FREIGHT_NAMES,salePrice,type GoodId} from '../../lib/logistics/engine';
const euro=(n:number)=>n.toLocaleString('de-DE',{style:'currency',currency:'EUR',minimumFractionDigits:2,maximumFractionDigits:2});
import ProductImage from './product-image';

import {energyTable} from '../../lib/logistics/fuel';

const HISTORY=30;
function Spark({values}:{values:number[]}){const min=Math.min(...values),max=Math.max(...values),span=max-min||1,w=120,h=30;const pts=values.map((v,i)=>`${(i/(values.length-1)*w).toFixed(1)},${(h-2-(v-min)/span*(h-4)).toFixed(1)}`).join(' ');const up=values[values.length-1]>=values[values.length-2];return <svg className="log-spark" viewBox={`0 0 ${w} ${h}`} width={w} height={h} aria-hidden="true"><polyline points={pts} fill="none" stroke={up?'#5ee0b2':'#f48b81'} strokeWidth="1.6" strokeLinejoin="round"/></svg>;}

export default function CommodityExchange({day,worldId}:{day:number;worldId?:string}){
 const today=Math.floor(day);
 const [query,setQuery]=useState(''),[type,setType]=useState('all'),[sort,setSort]=useState<{key:string;dir:1|-1}>({key:'change',dir:-1}),[trend,setTrend]=useState('all'),[minPrice,setMinPrice]=useState(''),[minMargin,setMinMargin]=useState('');
 const head=(key:string,label:string)=><th aria-sort={sort.key===key?(sort.dir===1?'ascending':'descending'):'none'}><button className="log-th-sort" onClick={()=>setSort(o=>({key,dir:o.key===key?(o.dir===1?-1:1):(key==='name'?1:-1)}))}>{label}{sort.key===key?(sort.dir===1?' ▲':' ▼'):' ⇅'}</button></th>;
 const rows=useMemo(()=>GOODS.filter(g=>!g.seasonal&&g.id!=='containers'&&g.sale>0).map(g=>{const history=Array.from({length:HISTORY},(_,i)=>salePrice(g.id as GoodId,today-HISTORY+1+i)),now=history[HISTORY-1],prev=history[HISTORY-2];return {g,history,now,prev,change:(now-prev)/prev*100,margin:(now-g.purchase)/Math.max(.01,g.purchase)*100,low:Math.min(...history),high:Math.max(...history)};}),[today]);
 const val=(r:typeof rows[number])=>sort.key==='name'?0:sort.key==='price'?r.now:sort.key==='change'?r.change:sort.key==='range'?(r.high-r.low)/r.now:sort.key==='purchase'?r.g.purchase:r.margin;
 const shown=rows.filter(r=>(type==='all'||r.g.type===type)&&r.g.name.toLocaleLowerCase('de').includes(query.trim().toLocaleLowerCase('de'))&&(trend==='all'||(trend==='up'?r.change>=0:r.change<0))&&(!minPrice||r.now>=Number(minPrice))&&(!minMargin||r.margin>=Number(minMargin))).sort((a,b)=>sort.key==='name'?a.g.name.localeCompare(b.g.name,'de')*sort.dir:(val(a)-val(b))*sort.dir);
 const winners=[...rows].sort((a,b)=>b.change-a.change).slice(0,3),losers=[...rows].sort((a,b)=>a.change-b.change).slice(0,3);
 return <section className="log-exchange-board">
  <h1>Börse · Spieltag {today}</h1>

  
  <h2>Energiepreise heute</h2><div className="log-energy-board">{energyTable(today).map(e=><div key={e.kind}><small>{e.name}</small><b>{e.now.toLocaleString('de-DE',{minimumFractionDigits:e.base<10?3:0,maximumFractionDigits:e.base<10?3:0})} {e.per}</b><span className={e.change>=0?'up':'down'}>{e.change>=0?'▲ +':'▼ '}{e.change.toFixed(1)} % zum Vortag</span><Spark values={e.history}/></div>)}</div>
  <div className="log-exchange-movers"><div><b>Gewinner heute</b>{winners.map(r=><span key={r.g.id} className="up">{r.g.name} +{r.change.toFixed(1)} %</span>)}</div><div><b>Verlierer heute</b>{losers.map(r=><span key={r.g.id} className="down">{r.g.name} {r.change.toFixed(1)} %</span>)}</div></div>
  
  <table className="log-exchange-table"><thead><tr>{head('name','Gut')}{head('price','Verkauf heute')}{head('change','Δ Vortag')}<th>30 Tage</th>{head('range','Spanne 30 Tage')}{head('purchase','Einkauf (fest)')}{head('margin','Marge')}</tr><tr className="log-th-filters"><th><input aria-label="Gut suchen" placeholder="Name …" value={query} onChange={e=>setQuery(e.target.value)}/><select aria-label="Frachtart" value={type} onChange={e=>setType(e.target.value)}><option value="all">Alle Frachtarten</option>{Object.entries(FREIGHT_NAMES).map(([id,n])=><option key={id} value={id}>{n}</option>)}</select></th><th><input aria-label="Mindestpreis" type="number" min="0" step="any" placeholder="ab € …" value={minPrice} onChange={e=>setMinPrice(e.target.value)}/></th><th><select aria-label="Tendenz" value={trend} onChange={e=>setTrend(e.target.value)}><option value="all">Alle</option><option value="up">▲ steigend</option><option value="down">▼ fallend</option></select></th><th></th><th></th><th></th><th><input aria-label="Mindestmarge" type="number" step="any" placeholder="ab % …" value={minMargin} onChange={e=>setMinMargin(e.target.value)}/></th></tr></thead><tbody>{shown.map(r=><tr key={r.g.id}><td><div className="log-exchange-good"><ProductImage id={r.g.id}/><span><b>{r.g.name}</b><small>{FREIGHT_NAMES[r.g.type]}</small></span></div></td><td><b>{euro(r.now)}</b>/EH</td><td className={r.change>=0?'up':'down'}>{r.change>=0?'▲ +':'▼ '}{r.change.toFixed(1)} %</td><td><Spark values={r.history}/></td><td>{euro(r.low)} – {euro(r.high)}</td><td>{euro(r.g.purchase)}</td><td className={r.margin>=0?'up':'down'}>{r.margin>=0?'+':''}{r.margin.toFixed(0)} %</td></tr>)}</tbody></table>
 </section>;
}
