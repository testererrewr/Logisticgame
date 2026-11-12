'use client';
import {currencyCode} from '../../lib/logistics/currency';
import {useMemo,useState} from 'react';
import {good,kmBetween,freeStock,type GoodId,type State} from '../../lib/logistics/engine';
import {useProjects} from './seasonal-store';
import ProductImage from './product-image';
const eur=(n:number)=>n.toLocaleString('de-DE',{style:'currency',currency:currencyCode(),maximumFractionDigits:0});
function Deliver({p,state,send}:{p:any;state:State;send:(cmd:any,msg?:string,done?:(d:any)=>void)=>void}){
 const sites=useMemo(()=>state.sites.filter(s=>s.owned).map(s=>({s,km:kmBetween([s.lat,s.lon],[p.lat,p.lon])})).filter(x=>x.km<=p.radiusKm).sort((a,b)=>a.km-b.km),[state.sites,p]);
 const [siteId,setSiteId]=useState(''),[g,setG]=useState(''),[qty,setQty]=useState('');const site=siteId||sites[0]?.s.id||'';
 const options=Object.keys(p.needs).filter(k=>(p.needs[k]-(p.delivered[k]||0))>0&&site&&freeStock(state,site,k as GoodId)>0);const goodId=g&&options.includes(g)?g:options[0]||'';
 const max=goodId?Math.min(freeStock(state,site,goodId as GoodId),p.needs[goodId]-(p.delivered[goodId]||0)):0;
 if(!sites.length)return <p className="log-muted">Du hast keinen eigenen Standort im Umkreis von {p.radiusKm} km. Baue ein Lager oder einen Umschlagplatz in der Nähe und bringe die Ware dorthin.</p>;
 return <div className="log-trailer-toolbar"><select value={site} onChange={e=>setSiteId(e.target.value)}>{sites.map(x=><option key={x.s.id} value={x.s.id}>{x.s.name} · {Math.round(x.km)} km</option>)}</select><select value={goodId} onChange={e=>setG(e.target.value)}>{!options.length&&<option value="">Keine passende Ware am Standort</option>}{options.map(k=><option key={k} value={k}>{good(k as GoodId).name} · {Math.floor(freeStock(state,site,k as GoodId)).toLocaleString('de-DE')} EH frei</option>)}</select><input type="number" min="1" max={max} placeholder={'max '+Math.floor(max)} value={qty} onChange={e=>setQty(e.target.value)}/><button className="log-primary" disabled={!goodId||!(max>0)} onClick={()=>send({type:'projectDeliver',projectId:p.id,siteId:site,good:goodId,quantity:Number(qty)||max},'Geliefert – danke!',()=>{setQty('');window.dispatchEvent(new CustomEvent('log-projects-refresh'));})}>Liefern</button></div>;
}
export default function WorldProjects({state,send,onGood}:{state:State;send:(cmd:any,msg?:string,done?:(d:any)=>void)=>void;onGood?:(id:string)=>void}){
 const list=useProjects().filter((p:any)=>p.status==='active'||p.status==='completing'||p.status==='done');if(!list.length)return null;
 return <section className="log-world-projects"><h2>🌍 Weltprojekte & Events</h2>{list.map((p:any)=>{const left=Math.max(0,p.end-state.day),open=p.status==='active'&&state.day>=p.start&&left>0;
  if(p.kind==='holiday')return <article key={p.id} className="log-project holiday"><div className="log-project-head"><ProductImage id={p.good}/><div><b>{good(p.good)?.icon} {p.name}</b><small>Festtagsfracht ab {p.srcName} · {open?'noch '+(left<1?Math.round(left*24)+' Std.':Math.ceil(left)+' Tage'):p.status==='done'?'vorbei':'startet an Tag '+Math.floor(p.start)}</small></div></div>{p.description&&<p>{p.description}</p>}{open&&onGood&&<button className="log-secondary" onClick={()=>onGood(p.good)}>Aufträge für {good(p.good)?.name} anzeigen</button>}</article>;
  const need=Object.values(p.needs as Record<string,number>).reduce((a,b)=>a+b,0),got=Object.entries(p.needs as Record<string,number>).reduce((a,[k,q])=>a+Math.min(q,p.delivered[k]||0),0);
  return <article key={p.id} className={'log-project '+p.kind}><div className="log-project-head"><span className="log-project-icon">{p.kind==='rescue'?'🆘':'🏛️'}</span><div><b>{p.name}</b><small>{p.kind==='rescue'?'Rettungsmission':'Wahrzeichen'} · Lieferung aus eigenen Standorten im Umkreis von {p.radiusKm} km · Börsenkurs × {String(p.priceFactor).replace('.',',')}{p.bonus?' · Bonus-Topf '+eur(p.bonus):''} · {p.status==='done'?'✅ fertig':open?'noch '+(left<1?Math.round(left*24)+' Std.':Math.ceil(left)+' Tage'):'beendet'}</small></div></div>
   {p.description&&<p>{p.description}</p>}<div className="log-progress"><span style={{width:(need?got/need*100:0)+'%'}}/></div>
   <div className="log-project-needs">{Object.entries(p.needs as Record<string,number>).map(([k,q])=><span key={k}><ProductImage id={k}/>{good(k as GoodId)?.name}: {Math.round(p.delivered[k]||0).toLocaleString('de-DE')} / {q.toLocaleString('de-DE')} EH</span>)}</div>
   {p.top?.length>0&&<small className="log-muted">Größte Lieferanten: {p.top.map((t:any)=>t.name+' ('+Math.round(t.eh).toLocaleString('de-DE')+' EH)').join(', ')}{p.mine?` · du: ${Math.round(p.mine).toLocaleString('de-DE')} EH`:''}</small>}
   {open&&<Deliver p={p} state={state} send={send}/>}</article>;})}</section>;
}
