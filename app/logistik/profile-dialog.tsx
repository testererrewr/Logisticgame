'use client';
import {useEffect,useState} from 'react';
import VehiclePhoto from './vehicle-photo';
import {SPECIAL_CARGO} from '../../lib/logistics/special-cargo';
import {CONTINENTS,ISLAND_GROUPS,ISLANDS,COUNTRY_TOTAL} from '../../lib/logistics/stamps-data';

export const openProfile=(user='me')=>window.dispatchEvent(new CustomEvent('log-open-profile',{detail:user}));
export const openMessage=(to:string)=>window.dispatchEvent(new CustomEvent('log-open-message',{detail:to}));
const eur=(n:number)=>n.toLocaleString('de-DE',{style:'currency',currency:'EUR',maximumFractionDigits:0});
function StampPass({stamps,islands}:{stamps:string[];islands:string[]}){const [open,setOpen]=useState(false),have=new Set(stamps),continents=Object.entries(CONTINENTS).map(([name,list])=>({name,list,got:list.filter(c=>have.has(c))}));
 return <><h3>🛂 Stempelpass <small className="log-muted">{stamps.length} / {COUNTRY_TOTAL} Länder · {continents.filter(c=>c.got.length).length} / 6 Kontinente · {islands.length} Inseln</small></h3>
  <div className="log-stamp-continents">{continents.map(c=><div key={c.name} className={c.got.length?'on':''}><b>{c.name}</b><div className="log-progress"><span style={{width:c.got.length/c.list.length*100+'%'}}/></div><small>{c.got.length} / {c.list.length}</small></div>)}</div>
  <div className="log-stamp-groups">{ISLAND_GROUPS.map(g=>{const n=g.countries.filter(c=>have.has(c)).length;return <span key={g.id} className={n>=g.need?'on':''} title={g.countries.join(', ')}>{g.icon} {g.name} {Math.min(n,g.need)}/{g.need}</span>;})}{ISLANDS.map(i=><span key={i.id} className={islands.includes(i.id)?'on':''}>🏝️ {i.name}</span>)}</div>
  {stamps.length>0&&<button className="log-link" onClick={()=>setOpen(!open)}>{open?'Länderliste ausblenden':'Alle gestempelten Länder anzeigen'}</button>}{open&&<p className="log-stamp-list">{[...stamps].sort((a,b)=>a.localeCompare(b,'de')).map(c=><span key={c}>{c}</span>)}</p>}</>;}
function Guestbook({user,me}:{user:string;me:string}){const [rows,setRows]=useState<any[]>([]),[text,setText]=useState(''),[err,setErr]=useState('');
 const load=async()=>{try{const r=await fetch('/api/logistik/social?guestbook='+encodeURIComponent(user),{cache:'no-store'}),d=await r.json() as any;if(r.ok)setRows(d.entries||[]);}catch{}};useEffect(()=>{void load();},[user]);
 const post=async(body:any)=>{try{const r=await fetch('/api/logistik/social',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(body)}),d=await r.json() as any;if(!r.ok)throw Error(d.error);setErr('');await load();return true;}catch(e:any){setErr(e.message);return false;}};
 return <><h3>📖 Gästebuch</h3>{user!==me&&<div className="log-guestbook-form"><textarea rows={2} maxLength={500} placeholder="Etwas Nettes hinterlassen …" value={text} onChange={e=>setText(e.target.value)}/><button className="log-primary" disabled={!text.trim()} onClick={async()=>{if(await post({action:'guestbook',user,text}))setText('');}}>Eintragen</button></div>}{err&&<p role="alert">{err}</p>}
  <div className="log-guestbook">{rows.map(r=><article key={r.id}><small><button className="log-news-link" onClick={()=>openProfile(r.author_id)}>{r.author}</button> · {new Date(r.created).toLocaleDateString('de-DE')}</small><p>{r.text}</p>{(user===me||r.author_id===me)&&<button className="log-link" onClick={()=>void post({action:'deleteGuestbook',id:r.id})}>löschen</button>}</article>)}{!rows.length&&<p className="log-muted">Noch keine Einträge.</p>}</div></>;}
export default function ProfileDialog(){
 const [user,setUser]=useState<string|null>(null),[data,setData]=useState<any>(null),[error,setError]=useState('');
 useEffect(()=>{const on=(e:Event)=>setUser(String((e as CustomEvent).detail||'me'));window.addEventListener('log-open-profile',on);return()=>window.removeEventListener('log-open-profile',on);},[]);
 useEffect(()=>{if(!user)return;let alive=true;setData(null);setError('');fetch('/api/logistik/profile?user='+encodeURIComponent(user),{cache:'no-store'}).then(async r=>{const d=await r.json() as any;if(!r.ok)throw Error(d.error);if(alive)setData(d);}).catch(e=>alive&&setError(e.message));return()=>{alive=false;};},[user]);
 useEffect(()=>{if(!user)return;const esc=(e:KeyboardEvent)=>{if(e.key==='Escape')setUser(null);};document.addEventListener('keydown',esc);return()=>document.removeEventListener('keydown',esc);},[user]);
 if(!user)return null;const earned=data?.achievements.filter((a:any)=>a.earned)||[];
 return <div className="log-dialog-backdrop" onClick={e=>{if(e.target===e.currentTarget)setUser(null);}}><section className="log-ranking-dialog log-profile" role="dialog" aria-modal="true" aria-label="Spielerprofil">
  <button className="log-dialog-close" aria-label="Profil schließen" onClick={()=>setUser(null)}>×</button>
  {error&&<p role="alert">{error}</p>}{!data&&!error&&<p>Profil wird geladen …</p>}
  {data&&<>
   <header className="log-profile-head"><div className="log-profile-avatar">{(data.user.name||'?').slice(0,1).toUpperCase()}</div><div><h2>{data.user.name}{data.user.premium&&<span className="log-premium-star" title="Premium"> ★</span>}{data.user.legend&&<span className="log-legend" title={`${data.user.legend.titles}× Saison-Podium, bestes Ergebnis Platz ${data.user.legend.best}`}>👑 {data.user.legend.label}</span>}{data.user.id===data.me&&<small className="log-muted"> (du)</small>}</h2>{data.user.id!==data.me&&<button className="log-secondary" onClick={()=>{setUser(null);openMessage(data.user.id);}}>✉️ Nachricht senden</button>}<small className="log-muted">Dabei seit {new Date(data.user.since).toLocaleDateString('de-DE')} · {data.companies.length} {data.companies.length===1?'Welt':'Welten'}</small></div></header>
   <div className="log-report-tiles"><div><small>Erfolge</small><b>{earned.length} / {data.achievements.length}</b></div><div><small>Ausgeliefert</small><b>{Math.round(data.totals.transported).toLocaleString('de-DE')} EH</b></div><div><small>Fahrzeuge</small><b>{data.totals.vehicles}</b></div><div><small>Aufträge</small><b>{data.totals.orders}</b></div><div><small>Gefahren</small><b>{Math.round(data.totals.km).toLocaleString('de-DE')} km</b></div><div><small>Wochenziele</small><b>{data.totals.challenges}</b></div></div>
   {data.showcase?.length>0&&<><h3>✨ Vitrine</h3><div className="log-showcase">{data.showcase.map((v:any,i:number)=><article key={i}><VehiclePhoto id={v.modelId} owner={data.user.id} world={v.worldId}/><b>{v.name}</b>{v.plate&&<span className="log-plate">{v.plate}</span>}<small className="log-badge-reward">{v.edition}</small><small className="log-muted">{v.world} · {v.km.toLocaleString('de-DE')} km · {v.eh.toLocaleString('de-DE')} EH</small></article>)}</div></>}
   <StampPass stamps={data.stamps||[]} islands={data.islands||[]}/>
   <h3>💎 Sammlung seltener Waren</h3><div className="log-collection">{SPECIAL_CARGO.map(c=>{const n=data.collection?.[c.id]||0;return <span key={c.id} className={n?'on':''} title={c.text}>{c.icon}<small>{c.name}{n>1?' ×'+n:''}</small></span>;})}</div>
   {data.badges.length>0&&<><h3>Saison-Abzeichen</h3><div className="log-season-badges">{data.badges.map((b:any)=><span key={b.worldId} className="log-season-badge" title={b.world}>{b.rank===1?'🥇':b.rank===2?'🥈':b.rank===3?'🥉':'🎖️'} Platz {b.rank} von {b.players} · {b.world}</span>)}</div></>}
   <h3>Erfolge & Abzeichen <small className="log-muted">(alle Welten)</small></h3>
   <div className="log-badges">{data.achievements.map((a:any)=><article key={a.id} className={a.earned?'on':''} title={a.text}><span>{a.icon}</span><b>{a.name}</b><small>{a.text}</small><small className="log-badge-reward">{a.earned?a.earned.world+' · Tag '+a.earned.day:'🎁 '+a.reward}</small></article>)}</div>
   <Guestbook user={data.user.id} me={data.me}/>
   <h3>Speditionen</h3>
   <div className="log-ranking-scroll"><table className="log-exchange-table"><thead><tr><th>Welt</th><th>Spedition</th><th>Allianz</th><th>Firmenwert</th><th>Fahrzeuge</th><th>EH</th><th>Erfolge</th></tr></thead><tbody>{data.companies.map((c:any)=><tr key={c.worldId}><td>{c.world}{c.status==='finished'?' (beendet)':''}</td><td>{c.company}</td><td>{c.alliance||'–'}{c.allianceBadges?.length>0&&<span className="log-ally-badges">{c.allianceBadges.map((b:any)=><span key={b.name} title={'Allianz-Abzeichen: '+b.name}>{b.icon}</span>)}</span>}</td><td>{eur(c.value)}</td><td>{c.vehicles}</td><td>{Math.round(c.transported).toLocaleString('de-DE')}</td><td>{c.achievements}</td></tr>)}</tbody></table></div>
  </>}
 </section></div>;
}
