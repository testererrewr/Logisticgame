'use client';
import {usagePercent,type Usage} from '../lib/usage';
export default function UsageStats({usage,time}:{usage?:Usage;time:number}){
 const p=usagePercent(usage,time),enough=!!p&&p.total>=10,pct=(n:number|null|undefined)=>n===null||n===undefined?'–':n.toLocaleString('de-DE',{maximumFractionDigits:1})+' %';
 return <section className="usage-stats" aria-label="Nutzung am aktuellen Spieltag"><small>Aktueller Spieltag · echte Fahrgastwechsel</small><div><span><b>{pct(p?.load)}</b>Abfahrtsbelegung</span><span><b>{pct(enough?p?.direct:null)}</b>Direkteinstiege</span><span><b>{pct(enough?p?.own:null)}</b>Eigene Umsteiger</span><span><b>{pct(enough?p?.partner:null)}</b>Partner-Umsteiger</span></div><small>{p?<>{p.total.toLocaleString('de-DE')} erfasste Einstiege: {usage!.direct.toLocaleString('de-DE')} direkt · {usage!.own.toLocaleString('de-DE')} eigene Umsteiger · {usage!.partner.toLocaleString('de-DE')} Partner-Umsteiger. {enough?'Anteile aller Einstiege dieses Spieltags.':'Einstiegsquoten ab 10 Einstiegen; bisher geringe Datenbasis.'}</>:'Noch keine Messwerte an diesem Spieltag.'}</small></section>;
}
