'use client';
import {useMemo,useState} from 'react';
import {GOODS,VEHICLES,type State} from '../../lib/logistics/engine';
import {linePnl} from '../../lib/logistics/finance';

const eur=(n:number)=>n.toLocaleString('de-DE',{style:'currency',currency:'EUR',maximumFractionDigits:0});
const num=(n:number)=>Math.round(n).toLocaleString('de-DE');
type Series={name:string;color:string;values:number[]};

function Chart({labels,series,bars=false,money=false}:{labels:number[];series:Series[];bars?:boolean;money?:boolean}){
 const [hover,setHover]=useState<number|null>(null);const W=640,H=180,P=8,all=series.flatMap(s=>s.values),max=Math.max(1,...all),min=Math.min(0,...all),span=max-min||1,n=Math.max(1,labels.length);
 const x=(i:number)=>P+(n===1?(W-2*P)/2:i*(W-2*P)/(n-1)),y=(v:number)=>H-P-(v-min)/span*(H-2*P),bw=Math.max(1,(W-2*P)/n*.7/series.length);
 return <div className="log-stats-chart"><svg viewBox={`0 0 ${W} ${H}`} role="img" onMouseLeave={()=>setHover(null)} onMouseMove={e=>{const r=(e.currentTarget as SVGSVGElement).getBoundingClientRect(),px=(e.clientX-r.left)/r.width*W;setHover(Math.max(0,Math.min(n-1,Math.round((px-P)/((W-2*P)/Math.max(1,n-1))))));}}>
  <line x1={P} x2={W-P} y1={y(0)} y2={y(0)} stroke="currentColor" opacity=".25"/>
  {series.map((s,k)=>bars?s.values.map((v,i)=><rect key={k+'-'+i} x={x(i)-bw*series.length/2+k*bw} width={bw} y={Math.min(y(v),y(0))} height={Math.abs(y(v)-y(0))} fill={s.color} opacity=".85"/>):<polyline key={k} fill="none" stroke={s.color} strokeWidth="2" points={s.values.map((v,i)=>x(i)+','+y(v)).join(' ')}/>)}
  {hover!==null&&<line x1={x(hover)} x2={x(hover)} y1={P} y2={H-P} stroke="currentColor" opacity=".35"/>}
 </svg><div className="log-stats-legend">{hover!==null&&<b>Tag {labels[hover]}:</b>}{series.map(s=><span key={s.name}><i style={{background:s.color}}/>{s.name}{hover!==null?': '+(money?eur(s.values[hover]||0):num(s.values[hover]||0)):''}</span>)}</div></div>;}

export default function CompanyStats({state}:{state:State}){
 const [range,setRange]=useState(30),today=Math.floor(state.day),from=today-range+1;
 const days=useMemo(()=>Array.from({length:range},(_,i)=>from+i).filter(d=>d>=1),[from,range]);
 const book=state.finance?.days||{},inc=days.map(d=>Math.round(book[d]?.income||0)),exp=days.map(d=>Math.round(book[d]?.expenses||0)),profit=inc.map((v,i)=>v-exp[i]);
 const hist=new Map(((state.progress as any)?.hist||[]).map((h:number[])=>[h[0],h])),hd=days.filter(d=>hist.has(d)),col=(k:number)=>hd.map(d=>(hist.get(d) as number[])[k]);
 const cats=useMemo(()=>{const a:Record<string,number>={},b:Record<string,number>={};for(const d of days){const r=book[d];if(!r)continue;for(const [k,v] of Object.entries(r.incomeCategories||{}))a[k]=(a[k]||0)+v;for(const [k,v] of Object.entries(r.expenseCategories||{}))b[k]=(b[k]||0)+v;}return {inc:Object.entries(a).sort((x,y)=>y[1]-x[1]),exp:Object.entries(b).sort((x,y)=>y[1]-x[1])};},[days,book]);
 const goods=Object.entries(state.deliveryStats||{}).filter(([,v])=>(v||0)>0).sort((a,b)=>(b[1]||0)-(a[1]||0)).slice(0,10);
 const lines=state.lines.filter(l=>!l.deleted).map(l=>({l,p:linePnl(state,l.id,Math.min(30,range))})).sort((a,b)=>b.p.profit-a.p.profit);
 const fleet=Object.entries(state.vehicles.filter(v=>!v.wrecked).reduce((m:Record<string,number>,v)=>{const mode=VEHICLES.find(x=>x.id===v.modelId)?.mode||'?';m[mode]=(m[mode]||0)+1;return m;},{}));
 const sumI=inc.reduce((a,b)=>a+b,0),sumE=exp.reduce((a,b)=>a+b,0),catTotal=(l:[string,number][])=>l.reduce((a,b)=>a+b[1],0)||1;
 const MODE:Record<string,string>={truck:'LKW',van:'Transporter',rail:'Züge',ship:'Schiffe',air:'Flugzeuge'};
 return <div className="log-company-stats">
  <div className="log-page-head"><h1>📊 Statistik</h1><div className="log-tabs">{[1,7,30,90,365].map(r=><button key={r} className={range===r?'on':''} onClick={()=>setRange(r)}>{r===1?'Heute':r+' Tage'}</button>)}</div></div>
  <div className="log-report-tiles"><div><small>Umsatz</small><b>{eur(sumI)}</b></div><div><small>Kosten</small><b>{eur(sumE)}</b></div><div><small>Gewinn</small><b className={sumI-sumE>=0?'up':'down'}>{eur(sumI-sumE)}</b></div><div><small>Marge</small><b>{sumI?Math.round((sumI-sumE)/sumI*100):0} %</b></div><div><small>Kontostand</small><b>{eur(state.cash)}</b></div><div><small>Fahrzeuge</small><b>{state.vehicles.filter(v=>!v.wrecked).length}</b></div></div>
  <h3>Umsatz, Kosten und Gewinn pro Tag</h3><Chart labels={days} money bars={range<=90} series={[{name:'Umsatz',color:'#22c55e',values:inc},{name:'Kosten',color:'#ef4444',values:exp},...(range>90?[{name:'Gewinn',color:'#3b82f6',values:profit}]:[])]}/>
  {hd.length>1?<><h3>Ausgelieferte EH pro Tag</h3><Chart labels={hd} bars={range<=90} series={[{name:'EH',color:'#14b8a6',values:col(1)}]}/>
   <h3>Kontostand</h3><Chart labels={hd} money series={[{name:'Kontostand',color:'#eab308',values:col(4)}]}/>
   <h3>Gefahrene km und Fahrzeuge</h3><Chart labels={hd} series={[{name:'km',color:'#8b5cf6',values:col(2)}]}/><Chart labels={hd} series={[{name:'Fahrzeuge',color:'#f97316',values:col(3)}]}/></>:<p className="log-muted">Verläufe für EH, km, Fahrzeuge und Kontostand werden ab heute täglich aufgezeichnet.</p>}
  <div className="log-stats-grid">
   <section><h3>Einnahmen nach Art</h3><table className="log-exchange-table"><tbody>{cats.inc.map(([k,v])=><tr key={k}><td>{k}</td><td>{eur(v)}</td><td>{Math.round(v/catTotal(cats.inc)*100)} %</td></tr>)}</tbody></table></section>
   <section><h3>Kosten nach Art</h3><table className="log-exchange-table"><tbody>{cats.exp.map(([k,v])=><tr key={k}><td>{k}</td><td>{eur(v)}</td><td>{Math.round(v/catTotal(cats.exp)*100)} %</td></tr>)}</tbody></table></section>
   <section><h3>Top-Güter (gesamt)</h3><table className="log-exchange-table"><tbody>{goods.map(([g,v])=><tr key={g}><td>{GOODS.find(x=>x.id===g)?.name||g}</td><td>{num(v||0)} EH</td></tr>)}</tbody></table></section>
   <section><h3>Flotte</h3><table className="log-exchange-table"><tbody>{fleet.map(([m,n])=><tr key={m}><td>{MODE[m]||m}</td><td>{n}</td></tr>)}</tbody></table></section>
  </div>
  <h3>Linien nach Gewinn ({Math.min(30,range)} Tage)</h3><div className="log-ranking-scroll"><table className="log-exchange-table"><thead><tr><th>Linie</th><th>Umsatz</th><th>Kosten</th><th>Gewinn</th></tr></thead><tbody>{lines.map(({l,p})=><tr key={l.id}><td>{l.name}</td><td>{eur(p.rev)}</td><td>{eur(p.cost)}</td><td className={p.profit>=0?'up':'down'}>{eur(p.profit)}</td></tr>)}</tbody></table></div>
 </div>;}
