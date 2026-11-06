'use client';
import {RECIPES,good,type State,type Contract} from '../../lib/logistics/engine';
import {contractDistance} from '../../lib/logistics/contract-route';
export default function CompanyContracts({state,siteId,onRoute}:{state:State;siteId:string;onRoute:(c:Contract)=>void}){
 const contracts=state.contracts.filter(c=>!c.cancelled&&c.endDay>state.day&&c.kind!=='sale'&&(c.siteId===siteId||c.destinationId===siteId)&&(c.kind!=='haulage'||c.delivered<(c.total||0)));
 if(!contracts.length)return null;
 return <section className="log-company-contracts"><h3>Deine Verträge an diesem Unternehmen</h3>{contracts.map(c=>{const km=contractDistance(state,c),destination=state.sites.find(p=>p.id===c.destinationId),source=state.sites.find(p=>p.id===c.siteId);return <article className="log-contract" key={c.id}><strong>{c.kind==='haulage'?'Containerauftrag':c.kind==='supply'?'Abnahme':'Verarbeitung'} · {RECIPES.find(r=>r.id===c.recipeId)?.name||good(c.good||'containers').name}</strong>{c.kind==='haulage'?<><span>{source?.name} → {destination?.name}</span><small>{km?.toLocaleString('de-DE',{maximumFractionDigits:1})} km Luftdistanz · {c.delivered.toLocaleString('de-DE')} / {c.total} EH geliefert</small><small>{(c.fee*(c.total||0)).toLocaleString('de-DE',{style:'currency',currency:'EUR'})} Gesamtvergütung · {c.paid.toLocaleString('de-DE',{style:'currency',currency:'EUR'})} bereits gutgeschrieben</small></>:<small>{c.daily} EH je Spieltag</small>}<button className="log-primary" onClick={()=>onRoute(c)}>Route aus diesem Vertrag erstellen</button></article>})}</section>;
}
