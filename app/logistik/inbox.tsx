'use client';
import {useState} from 'react';
import {expiringContracts,extendContracts,good,RECIPES,EXPIRY_WARN_DAYS,CONTRACT_TERM_DAYS,type State} from '../../lib/logistics/engine';
import type {OnlineAction} from '../../lib/logistics/online-actions';

type Commit=(fn:(s:State)=>void,success?:string,command?:OnlineAction)=>boolean|void;
/** Postfach: auslaufende Abnahme- und Verarbeitungsverträge, einzeln oder alle auf Knopfdruck verlängern. */
export default function Inbox({state,commit,busy}:{state:State;commit:Commit;busy:boolean}){
 const [open,setOpen]=useState(false),[days,setDays]=useState(CONTRACT_TERM_DAYS),[within,setWithin]=useState(EXPIRY_WARN_DAYS),[sel,setSel]=useState<string[]>([]);
 const soon=expiringContracts(state,EXPIRY_WARN_DAYS),list=expiringContracts(state,within);
 const extend=(ids:string[])=>{if(!ids.length)return;commit(s=>{extendContracts(s,ids,days);},`${ids.length} ${ids.length===1?'Vertrag':'Verträge'} um ${days} Tage verlängert.`,{type:'extendContracts',contractIds:ids,days});setSel(x=>x.filter(id=>!ids.includes(id)));};
 const left=(d:number)=>{const n=Math.max(0,d-state.day);return n<1?Math.round(n*24)+' Std.':Math.ceil(n)+' '+(Math.ceil(n)===1?'Tag':'Tage');};
 return <>
  <button className={'log-inbox-button'+(soon.length?' alert':'')} onClick={()=>setOpen(true)} aria-label={`Postfach: ${soon.length} Verträge laufen bald aus`}>📬{soon.length>0&&<span className="log-inbox-badge">{soon.length}</span>}</button>
  {open&&<div className="log-dialog-backdrop" onClick={e=>{if(e.target===e.currentTarget)setOpen(false);}}><section className="log-ranking-dialog log-inbox" role="dialog" aria-modal="true" aria-label="Postfach">
   <button className="log-dialog-close" aria-label="Postfach schließen" onClick={()=>setOpen(false)}>×</button>
   <h2>📬 Postfach · Vertragsabläufe</h2>
   <p className="log-help">Abnahme- und Verarbeitungsverträge laufen nach {CONTRACT_TERM_DAYS} Tagen aus. {EXPIRY_WARN_DAYS} und 3 Tage vorher kommt ein Hinweis. Beim Verlängern bleiben Menge und Preis gleich; liefert ein Betrieb inzwischen weniger, wird die Menge angepasst.</p>
   <div className="log-trailer-toolbar"><label>Anzeigen: Ablauf in<select value={within} onChange={e=>setWithin(Number(e.target.value))}>{[3,7,14,30,60,180].map(n=><option key={n} value={n}>≤ {n} Tagen</option>)}</select></label><label>Verlängern um<select value={days} onChange={e=>setDays(Number(e.target.value))}>{[30,90,180,365].map(n=><option key={n} value={n}>{n} Tage</option>)}</select></label>
    <button className="log-primary" disabled={busy||!list.length} onClick={()=>extend(list.map(c=>c.id))}>Alle {list.length} verlängern</button><button className="log-secondary" disabled={busy||!sel.length} onClick={()=>extend(sel)}>Auswahl verlängern ({sel.length})</button></div>
   <div className="log-ranking-scroll"><table className="log-exchange-table"><thead><tr><th><input type="checkbox" aria-label="Alle auswählen" checked={!!list.length&&list.every(c=>sel.includes(c.id))} onChange={e=>setSel(e.target.checked?list.map(c=>c.id):[])}/></th><th>Betrieb</th><th>Vertrag</th><th>Menge</th><th>Endet in</th><th></th></tr></thead><tbody>{list.map(c=>{const site=state.sites.find(p=>p.id===c.siteId);return <tr key={c.id} className={c.endDay-state.day<=3?'log-inbox-urgent':''}><td><input type="checkbox" checked={sel.includes(c.id)} onChange={e=>setSel(x=>e.target.checked?[...x,c.id]:x.filter(y=>y!==c.id))}/></td><td>{site?.name||'Betrieb'}</td><td>{c.kind==='supply'?'Abnahme · '+good(c.good!).name:'Verarbeitung · '+(RECIPES.find(r=>r.id===c.recipeId)?.name||'')}</td><td>{c.daily.toLocaleString('de-DE')} EH/Tag</td><td><b>{left(c.endDay)}</b></td><td><button className="log-secondary" disabled={busy} onClick={()=>extend([c.id])}>Verlängern</button></td></tr>;})}</tbody></table>{!list.length&&<p className="log-muted">Keine Verträge laufen in diesem Zeitraum aus. 🎉</p>}</div>
  </section></div>}
 </>;
}
