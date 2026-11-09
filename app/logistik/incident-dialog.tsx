'use client';
import {useState} from 'react';
import {VEHICLES,vehicleCargo,euro,type State} from '../../lib/logistics/engine';
import {OPTION_NAMES,resolveIncident,ackIncidents,type BreakdownOption} from '../../lib/logistics/maintenance';
import type {OnlineAction} from '../../lib/logistics/online-actions';

const HINTS:Record<BreakdownOption,string>={tow:'Behebt den Schaden sicher. Das Fahrzeug wird ins nächste Depot geschleppt, repariert und fährt danach ab der ersten Station der Linie weiter.',mobile:'Günstiger, Reparatur vor Ort. Klappt in etwa 3 von 4 Fällen – sonst wird zusätzlich abgeschleppt (Abschleppkosten kommen dazu).',continue:'Kostet jetzt nichts. Das Fahrzeug fährt bis Schichtende weiter und wird abends günstiger repariert – mit Risiko eines schwereren Schadens oder Totalverlusts.'};

export default function IncidentDialog({state,commit,busy}:{state:State;busy:boolean;commit:(fn:(s:State)=>void,message?:string,cmd?:OnlineAction)=>boolean}){
 const [replacement,setReplacement]=useState('');
 const open=(state.incidents||[]).filter(i=>!i.resolved),info=(state.incidents||[]).filter(i=>i.resolved&&!i.seen);
 const incident=open[0];
 if(!incident&&!info.length)return null;
 if(!incident){const ids=info.map(i=>i.id);return <div className="log-dialog-backdrop"><section className="log-incident-dialog" role="dialog" aria-modal="true" aria-label="Pannenberichte"><h2>Pannenberichte</h2>{info.slice(0,8).map(i=>{const v=state.vehicles.find(x=>x.id===i.vehicleId);return <article key={i.id}><b>{i.title}</b><small>{v?.name||VEHICLES.find(m=>m.id===v?.modelId)?.name||'Fahrzeug'}{i.auto?' · automatisch nach deiner Standardeinstellung':''}</small><p>{i.resolved}</p></article>;})}{info.length>8&&<p className="log-help">… und {info.length-8} weitere.</p>}<button className="log-primary log-wide" disabled={busy} onClick={()=>commit(s=>ackIncidents(s,ids),undefined,{type:'ackIncidents',incidentIds:ids})}>Verstanden</button></section></div>;}
 const v=state.vehicles.find(x=>x.id===incident.vehicleId),model=VEHICLES.find(m=>m.id===v?.modelId),cargo=v?vehicleCargo(v).reduce((n,c)=>n+c.quantity,0):0;
 const decide=(choice:{option?:BreakdownOption;replacementId?:string})=>commit(s=>{resolveIncident(s,incident.id,choice);},'Entscheidung gespeichert.',{type:'resolveIncident',incidentId:incident.id,...choice});
 const candidates=state.vehicles.filter(x=>x.id!==v?.id&&!x.wrecked&&!x.breakdown&&x.status==='idle'&&!x.lineId&&!vehicleCargo(x).length&&VEHICLES.find(m=>m.id===x.modelId)?.mode===model?.mode);
 return <div className="log-dialog-backdrop"><section className="log-incident-dialog" role="dialog" aria-modal="true" aria-label="Pannenmeldung">
  <small className="log-incident-kicker">{incident.level==='total'?'TOTALVERLUST':incident.level==='major'?'SCHWERER SCHADEN':incident.level==='medium'?'PANNE':'KLEINE PANNE'}{open.length>1?` · noch ${open.length-1} weitere Meldung(en)`:''}</small>
  <h2>{incident.title}</h2><p><b>{v?.name||model?.name}</b>{cargo>0?` · ${cargo.toLocaleString('de-DE',{maximumFractionDigits:2})} EH Ladung an Bord (bleibt erhalten)`:''}</p><p>{incident.text}</p>
  {incident.level==='total'?<><label>Ersatzfahrzeug, das Ladung und Linie übernimmt<select value={replacement} onChange={e=>setReplacement(e.target.value)}><option value="">Bitte wählen …</option>{candidates.map(x=><option key={x.id} value={x.id}>{x.name||VEHICLES.find(m=>m.id===x.modelId)?.name} · {state.sites.find(p=>p.id===x.locationId)?.name||''}</option>)}<option value="buy">Neu kaufen: {model?.name} · {euro(model?.price||0)}</option><option value="none">Kein Ersatz – Ladung ins nächste Depot bergen</option></select></label><p className="log-help">Das Wrack kommt in deine Flottenliste und kann dort nur noch zum Restwert an den Händler verkauft werden. Bergungskosten fallen an.</p><button className="log-primary log-wide" disabled={busy||!replacement} onClick={()=>decide({replacementId:replacement})}>Bestätigen</button></>:
  <div className="log-incident-options">{incident.options.map(o=><button key={o} className="log-incident-option" disabled={busy} onClick={()=>decide({option:o})}><b>{OPTION_NAMES[o]}</b><span>{o==='continue'?'Jetzt 0 € · abends ca. '+euro(incident.costs.continue||0):'ca. '+euro(incident.costs[o]||0)}</span><small>{HINTS[o]}</small></button>)}</div>}
  <p className="log-help">Eine Standardoption für Pannen stellst du in der Flotte ein. Bei Totalverlust musst du immer selbst entscheiden.</p>
 </section></div>;
}
