'use client';
import {useEffect,useState} from 'react';

type Row={premium?:boolean;tagColor?:string;allianceLogo?:string;logo?:string;color?:string;tag?:string;id:string;name:string;value:number;cash:number;revenue7:number;revenue30:number;profit30:number;vehicles:number;transported:number;buildings:number;lines:number;orders:number};
const COLUMNS:{key:keyof Row;label:string;money?:boolean;unit?:string}[]=[
 {key:'value',label:'Firmenwert',money:true},{key:'revenue7',label:'Umsatz 7 Tage',money:true},{key:'revenue30',label:'Umsatz 30 Tage',money:true},{key:'profit30',label:'Gewinn 30 Tage',money:true},
 {key:'vehicles',label:'Fahrzeuge'},{key:'transported',label:'Transportiert',unit:'EH'},{key:'orders',label:'Aufträge erledigt'},{key:'buildings',label:'Gebäude'},{key:'lines',label:'Linien'},{key:'cash',label:'Kontostand',money:true},
];
const money=(n:number)=>n.toLocaleString('de-DE',{style:'currency',currency:'EUR',maximumFractionDigits:0});

export default function WorldRanking({worldId}:{worldId:string}){
 const [open,setOpen]=useState(false),[rows,setRows]=useState<Row[]>([]),[me,setMe]=useState(''),[error,setError]=useState(''),[sort,setSort]=useState<keyof Row>('value'),[dir,setDir]=useState<1|-1>(-1),[query,setQuery]=useState(''),[minVehicles,setMinVehicles]=useState(''),[updated,setUpdated]=useState(0),[loading,setLoading]=useState(false),[season,setSeason]=useState<{end:number;day:number;finished:boolean}|null>(null);
 useEffect(()=>{if(!open)return;let alive=true;setLoading(true);void fetch('/api/logistik/ranking?world='+encodeURIComponent(worldId),{cache:'no-store'}).then(async r=>{const d:any=await r.json().catch(()=>({error:'Rangliste nicht erreichbar.'}));if(!alive)return;if(!r.ok)throw Error(d.error);setRows(d.rows);setMe(d.me);setSeason(d.season||null);setUpdated(d.updated);setError('');}).catch(e=>alive&&setError(e.message)).finally(()=>alive&&setLoading(false));return()=>{alive=false;};},[open,worldId]);
 const shown=rows.filter(r=>(r.name+' '+(r.tag||'')).toLocaleLowerCase('de').includes(query.trim().toLocaleLowerCase('de'))&&(!minVehicles||r.vehicles>=Number(minVehicles))).sort((a,b)=>sort==='name'?a.name.localeCompare(b.name,'de')*dir:((a[sort] as number)-(b[sort] as number))*dir);
 const rank=(r:Row)=>[...rows].sort((a,b)=>(b[sort] as number)-(a[sort] as number)).findIndex(x=>x.id===r.id)+1;
 const head=(key:keyof Row,label:string)=><th key={key}><button className="log-th-sort" onClick={()=>{if(sort===key)setDir(d=>d===1?-1:1);else{setSort(key);setDir(key==='name'?1:-1);}}}>{label}{sort===key?(dir===1?' ▲':' ▼'):' ⇅'}</button></th>;
 return <>
  <button className="log-ranking-link" onClick={()=>setOpen(true)}>🏆 Rangliste</button>
  {open&&<div className="log-dialog-backdrop" onClick={e=>{if(e.target===e.currentTarget)setOpen(false);}}><section className="log-ranking-dialog" role="dialog" aria-modal="true" aria-label="Rangliste">
   <button className="log-dialog-close" aria-label="Rangliste schließen" onClick={()=>setOpen(false)}>×</button>
   <h2>🏆 Rangliste dieser Welt</h2>{season&&<p className="log-admin-message">🏁 Saison-Welt: {season.finished||season.day>=season.end?'Saison beendet – Endwertung in der Lobby.':`Endwertung in ${Math.max(0,season.end-season.day).toFixed(1).replace('.',',')} Tagen (Tag ${season.end}). Gewertet wird der Firmenwert.`}</p>}
   <p className="log-help">{loading?'Wird geladen …':`${rows.length} Speditionen · aktualisiert alle 5 Minuten${updated?' · Stand '+new Date(updated).toLocaleTimeString('de-DE',{hour:'2-digit',minute:'2-digit'}):''}`} · Spalte anklicken zum Sortieren.</p>
   {error&&<p role="alert">{error}</p>}
   <div className="log-trailer-toolbar"><input aria-label="Spedition suchen" placeholder="Spedition suchen …" value={query} onChange={e=>setQuery(e.target.value)}/><label>Mind. Fahrzeuge<input type="number" min="0" value={minVehicles} onChange={e=>setMinVehicles(e.target.value)}/></label><select aria-label="Rangliste nach" value={sort} onChange={e=>{setSort(e.target.value as keyof Row);setDir(-1);}}>{COLUMNS.map(c=><option key={c.key} value={c.key}>Rang nach {c.label}</option>)}</select></div>
   <div className="log-ranking-scroll"><table className="log-exchange-table"><thead><tr><th>#</th>{head('name','Spedition')}{COLUMNS.map(c=>head(c.key,c.label))}</tr></thead><tbody>{shown.map(r=>{const n=rank(r);return <tr key={r.id} className={r.id===me?'log-ranking-me':''}><td><b>{n===1?'🥇':n===2?'🥈':n===3?'🥉':n}</b></td><td className="log-ranking-name" style={r.color?{borderLeft:'4px solid '+r.color}:undefined}>{r.logo&&<img src={r.logo} alt="" width="22" height="22"/>}{r.allianceLogo&&<img src={r.allianceLogo} alt="" width="18" height="18"/>}{r.tag&&<span className="log-alliance-tag" style={r.tagColor?{background:r.tagColor}:undefined}>[{r.tag}]</span>} <b>{r.name}</b>{r.premium&&<span className="log-badge-premium" title="Premium">★</span>}{r.id===me&&<small> (du)</small>}</td>{COLUMNS.map(c=><td key={c.key} className={c.key==='profit30'?(r.profit30>=0?'up':'down'):''}>{c.money?money(r[c.key] as number):(r[c.key] as number).toLocaleString('de-DE')+(c.unit?' '+c.unit:'')}</td>)}</tr>;})}</tbody></table></div>
  </section></div>}
 </>;
}
