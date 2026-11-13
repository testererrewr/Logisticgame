'use client';
import {useState} from 'react';
import {TUTORIAL_STEPS,TUTORIAL_REWARD,type OnlineAction} from '../../lib/logistics/online-actions';
import type {State} from '../../lib/logistics/engine';
type Commit=(fn:(s:State)=>void,message?:string,cmd?:OnlineAction)=>boolean;
export default function Tutorial({state,commit,busy,onTab}:{state:State;commit:Commit;busy:boolean;onTab:(t:string)=>void}){
 const [expanded,setExpanded]=useState(false);
 const t:any=(state as any).tutorial,fresh=!t&&!state.vehicles.length&&!state.sites.some(p=>p.owned)&&!state.lines.length;
 const act=(action:'start'|'skip'|'claim')=>commit(s=>{(s as any).tutorial=action==='start'?{active:true}:action==='skip'?{active:false,skipped:true}:{...(s as any).tutorial};},action==='claim'?'Startprämie erhalten!':undefined,{type:'tutorial',action});
 if(fresh)return <div className="log-dialog-backdrop"><section className="log-feedback-dialog" role="dialog" aria-modal="true" aria-label="Tutorial"><header><h2>👋 Willkommen bei deiner neuen Spedition!</h2></header><p>Sollen wir dir in fünf kurzen Schritten zeigen, wie du dein erstes Geld verdienst? Am Ende gibt es <b>{TUTORIAL_REWARD.toLocaleString('de-DE')} €</b> Startprämie.</p><ol>{TUTORIAL_STEPS.map(x=><li key={x.id}>{x.title}</li>)}</ol><div className="log-trailer-toolbar"><button className="log-secondary" disabled={busy} onClick={()=>act('skip')}>Überspringen</button><button className="log-primary" disabled={busy} onClick={()=>act('start')}>Tutorial starten</button></div></section></div>;
 if(!t?.active)return null;
 const done=TUTORIAL_STEPS.map(x=>x.done(state)),cur=done.findIndex(d=>!d),all=cur<0;
 return <aside className="log-tutorial" data-expanded={expanded}><header><b>🎓 Tutorial · {done.filter(Boolean).length}/{TUTORIAL_STEPS.length}</b><button className="log-link log-tutorial-toggle" aria-expanded={expanded} aria-controls="log-tutorial-steps" onClick={()=>setExpanded(v=>!v)}>{expanded?'Einklappen':'Anzeigen'}</button><button className="log-link" onClick={()=>{if(confirm('Tutorial beenden?'))act('skip');}}>beenden</button></header>
  <ol id="log-tutorial-steps">{TUTORIAL_STEPS.map((x,i)=><li key={x.id} className={done[i]?'done':i===cur?'now':''}>{done[i]?'✅':i===cur?'👉':'⬜'} {x.title}{i===cur&&<><small>{x.hint}</small><button className="log-secondary" onClick={()=>onTab(x.tab)}>Dorthin</button></>}</li>)}</ol>
  {all&&<button className="log-primary log-wide log-tutorial-reward" disabled={busy} onClick={()=>act('claim')}>🎉 {TUTORIAL_REWARD.toLocaleString('de-DE')} € Startprämie abholen</button>}</aside>;}
