'use client';
import {useState} from 'react';
import {Handshake} from 'lucide-react';
import {contractQuote} from '../lib/contracts';
import type {Action,World} from '../lib/game';
import {useMoney} from './money-display';
export default function CompanyContracts({world,myId,busy,onAction,partnerId}:{partnerId:string;world:World;myId:string;busy:boolean;onAction:(a:Action)=>Promise<any>}){
 const money=useMoney(),own=world.state.companies.find(c=>c.id===myId)!,other=world.state.companies.find(c=>c.id===partnerId&&c.id!==myId&&!c.suspended),contracts=(world.state.contracts||[]).filter(c=>[c.from,c.to].includes(myId)&&[c.from,c.to].includes(partnerId));
 const target=partnerId,[error,setError]=useState('');const quote=other?contractQuote(own,other,world.state.vehicleCatalog):0;
 async function perform(a:Action){setError('');try{if(!await onAction(a))setError('Vertrag konnte nicht gespeichert werden. Bitte die Spielmeldung beachten.');}catch(e:any){setError(e.message);}}
 const name=(id:string)=>world.state.companies.find(c=>c.id===id)?.name||'Ehemaliges Unternehmen';
 return <section className="contract-panel"><div className="page-section-heading"><div><h2><Handshake size={23}/> Umsteigeverträge</h2><p>Partnernetze verbinden. Umstiege am selben Halt oder innerhalb von 100 Metern.</p></div></div>
 <p className="page-note">Tagespreis je Unternehmen · Abrechnung alle 24 echten Stunden. Der Preis passt sich bei Wachstum beider Unternehmen an. Bereits bezahlte Tage bleiben unverändert.</p>
 <div className="contract-offer">{other&&<><div className="contract-price"><b>{money(quote)}</b><span>je Unternehmen / echter Tag</span><small>Zusammen {money(quote*2)} / 24 Stunden</small></div><button className="btn btn-dark" disabled={busy||world.status!=='running'||contracts.some(c=>['offered','active'].includes(c.status)&&[c.from,c.to].includes(target))} onClick={()=>perform({type:'contract-offer',company:target,dailyFee:quote})}>Umsteigevertrag anbieten</button></>}</div>
{error&&<p className="window-error" role="alert">{error}</p>}
 <div className="contract-list">{contracts.map(c=><article key={c.id}><div><b>{name(c.from)} ↔ {name(c.to)}</b><span>{({offered:'Offenes Angebot',active:'Aktiv',declined:'Abgelehnt',cancelled:'Beendet',withdrawn:'Zurückgezogen'})[c.status]}</span></div><p><strong>{money(c.status==='offered'?quote:c.dailyFee)}</strong> je Unternehmen / echter Tag</p>{c.status==='active'&&c.paidUntil&&<small>Nächste Tageszahlung: {new Date(c.paidUntil).toLocaleString('de-DE')} · reale Zeit</small>}<div className="contract-actions">{c.status==='offered'&&c.to===myId&&<><button className="btn btn-dark" disabled={busy} onClick={()=>perform({type:'contract-accept',contract:c.id,dailyFee:quote})}>Für {money(quote)} / Tag annehmen</button><button className="small-btn" disabled={busy} onClick={()=>perform({type:'contract-decline',contract:c.id})}>Ablehnen</button></>}{(c.status==='active'||c.status==='offered'&&c.from===myId)&&<button className="small-btn" disabled={busy} onClick={()=>perform({type:'contract-cancel',contract:c.id})}>{c.status==='active'?'Vertrag kündigen':'Angebot zurückziehen'}</button>}</div></article>)}</div>
 {!contracts.length&&<p className="window-empty">Noch keine Umsteigeverträge. Fremde Unternehmen können ohne aktiven Vertrag keine Fahrgäste übernehmen.</p>}
 </section>;
}
