'use client';
import {useEffect,useRef,useState} from 'react';
import type {State} from '../../lib/logistics/engine';
import {ACHIEVEMENTS} from '../../lib/logistics/progression';
interface Snap {day:number;cash:number;earned:number;spent:number;eh:number;at:number;ach:string[]}
const IMPORTANT=/^(🏅|🎯|🔨|🤝|💎|🛂|🏝️|🆘|🏛️|📬|⚔️|🏰|💶|🏦|🎉)/u,LINE_NOISE=/geladen|entladen|wartet|Fahrt|Linie|verkauft/i;
const key=(w:string)=>'log-lastvisit:'+w;
const snap=(s:State):Snap=>({day:s.day,cash:s.cash,earned:s.earned,spent:s.spent,eh:Object.values(s.deliveryStats||{}).reduce((n,x)=>n+(x||0),0),at:Date.now(),ach:Object.keys(s.progress?.achievements||{})});
const eur=(n:number)=>n.toLocaleString('de-DE',{style:'currency',currency:'EUR',maximumFractionDigits:0});
export default function SinceLastVisit({worldId,state}:{worldId:string;state:State|null}){
 const [diff,setDiff]=useState<{prev:Snap;now:Snap;events:State['events'];ach:string[]}|null>(null),checked=useRef('');
 useEffect(()=>{if(!state||checked.current===worldId)return;checked.current=worldId;let prev:Snap|null=null;try{prev=JSON.parse(localStorage.getItem(key(worldId))||'null');}catch{}
  const now=snap(state);if(prev&&now.day-prev.day>=.25)setDiff({prev,now,events:state.events.filter(e=>e.day>prev!.day&&(IMPORTANT.test(e.text)||e.type==='warn'&&!LINE_NOISE.test(e.text))).slice(0,10),ach:now.ach.filter(a=>!prev!.ach?.includes(a))});
  try{localStorage.setItem(key(worldId),JSON.stringify(now));}catch{}},[state,worldId]);
 const latest=useRef(state);latest.current=state;
 useEffect(()=>{const save=()=>{const s=latest.current;if(!s)return;try{localStorage.setItem(key(worldId),JSON.stringify(snap(s)));}catch{}};const t=setInterval(save,60000);window.addEventListener('beforeunload',save);document.addEventListener('visibilitychange',save);return()=>{clearInterval(t);window.removeEventListener('beforeunload',save);document.removeEventListener('visibilitychange',save);save();};},[worldId]);
 if(!diff)return null;const {prev,now}=diff,days=now.day-prev.day,cash=now.cash-prev.cash;
 return <div className="log-dialog-backdrop" onClick={e=>{if(e.target===e.currentTarget)setDiff(null);}}><section className="log-ranking-dialog log-since" role="dialog" aria-modal="true" aria-label="Seit deinem letzten Besuch">
  <button className="log-dialog-close" aria-label="Schließen" onClick={()=>setDiff(null)}>×</button>
  <h2>👋 Willkommen zurück!</h2><p className="log-muted">Seit deinem letzten Besuch sind {days>=1?days.toLocaleString('de-DE',{maximumFractionDigits:1})+' Spieltage':Math.round(days*24)+' Spielstunden'} vergangen.</p>
  <div className="log-report-tiles"><div><small>Kontostand</small><b className={cash>=0?'up':'down'}>{cash>=0?'+':''}{eur(cash)}</b></div><div><small>Einnahmen</small><b className="up">{eur(now.earned-prev.earned)}</b></div><div><small>Ausgaben</small><b className="down">{eur(now.spent-prev.spent)}</b></div><div><small>Ausgeliefert</small><b>{Math.round(now.eh-prev.eh).toLocaleString('de-DE')} EH</b></div></div>
  {diff.ach.length>0&&<><h3>🏅 Neue Erfolge</h3><p>{diff.ach.map(id=>ACHIEVEMENTS.find(a=>a.id===id)?.name||id).join(' · ')}</p></>}
  {diff.events.length>0&&<><h3>Wichtige Meldungen</h3><ul className="log-since-events">{diff.events.map((e,i)=><li key={i} className={e.type}>{e.text}</li>)}</ul></>}
  <button className="log-primary" onClick={()=>setDiff(null)}>Weiterspielen</button>
 </section></div>;
}
