'use client';
import type {State} from '../../lib/logistics/engine';
import type {OnlineAction} from '../../lib/logistics/online-actions';
import {setBreakdownPolicy,POLICY_NAMES,type BreakdownPolicy} from '../../lib/logistics/maintenance';
export default function CompanyOptions({state,commit,busy}:{state:State;busy?:boolean;commit:(fn:(s:State)=>void,message?:string,cmd?:OnlineAction)=>boolean}){
 const after=(state as any).afterOrder==='stay'?'stay':'depot';
 const setAfter=(v:'depot'|'stay')=>commit(s=>{(s as any).afterOrder=v;},'Gespeichert.',{type:'companyOptions',afterOrder:v});
 return <article className="log-settings-card"><h2>🚚 Spedition</h2>
  <label className="log-setting-row"><span>Nach Auftragsfahrten</span><select value={after} disabled={busy} onChange={e=>setAfter(e.target.value as any)}><option value="depot">zurück ins Depot</option><option value="stay">am Zielort stehen bleiben</option></select></label>
  <small className="log-muted">Nur bei Auftragslinien ohne eingeplante Rückroute.</small>
  {!state.maintenanceOff&&<label className="log-setting-row"><span>Standard bei Pannen</span><select aria-label="Standardoption bei Pannen" value={state.breakdownPolicy||'ask'} disabled={busy} onChange={e=>{const policy=e.target.value as BreakdownPolicy;commit(s=>setBreakdownPolicy(s,policy),'Standard bei Pannen: '+POLICY_NAMES[policy],{type:'setBreakdownPolicy',policy});}}>{Object.entries(POLICY_NAMES).map(([id,n])=><option key={id} value={id}>{n}</option>)}</select></label>}
 </article>;}
