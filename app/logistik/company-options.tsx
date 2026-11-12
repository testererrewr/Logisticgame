'use client';
import type {State} from '../../lib/logistics/engine';
import type {OnlineAction} from '../../lib/logistics/online-actions';
export default function CompanyOptions({state,commit,busy}:{state:State;busy?:boolean;commit:(fn:(s:State)=>void,message?:string,cmd?:OnlineAction)=>boolean}){
 const after=(state as any).afterOrder==='stay'?'stay':'depot';
 const setAfter=(v:'depot'|'stay')=>commit(s=>{(s as any).afterOrder=v;},'Gespeichert.',{type:'companyOptions',afterOrder:v});
 return <article className="log-settings-card"><h2>🚚 Spedition</h2>
  <label className="log-setting-row"><span>Nach Auftragsfahrten</span><select value={after} disabled={busy} onChange={e=>setAfter(e.target.value as any)}><option value="depot">zurück ins Depot</option><option value="stay">am Zielort stehen bleiben</option></select></label>
  <small className="log-muted">Nur bei Auftragslinien ohne eingeplante Rückroute.</small>
 </article>;}
