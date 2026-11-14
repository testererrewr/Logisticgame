'use client';
import InvitePanel from './invite-panel';
import {LoginExtras,VerifyNotice} from './lobby-auth';
import {useSite} from './site-config-client';
import {SiteNav} from './site-nav';
import {startDomTranslation} from '../../lib/i18n/dom-translate';
import LegalPage,{SITE_PAGES,LOBBY_PAGES,TITLE,Roadmap,Premium,News} from './legal-page';
import {track} from './analytics';
import {currencyCode,currencySymbol} from '../../lib/logistics/currency';
import MaintenanceBanner from './maintenance-banner';
import CookieNotice,{openCookieInfo} from './cookie-notice';
import {useEffect,useState} from 'react';
import {SettingsSummary} from './world-settings-form';
import AdminManagement from './admin-management';
import LogisticsGame from './logistics-game';
import {installErrorReporter,ErrorBoundary} from './error-reporter';
import './logistics.css';
const viewOf=(p:string)=>p.startsWith('/welten')?'worlds':LOBBY_PAGES.find(k=>p.startsWith('/'+k))||'home';
type World={settings?:any;id:string;name:string;day:number;created:number;time_scale:number;status:string;companies:number;joined:number};
const eur=(n:number)=>n.toLocaleString('de-DE',{style:'currency',currency:currencyCode(),maximumFractionDigits:0});
async function api(path:string,body?:unknown){const response=await fetch('/api/'+path,{cache:'no-store',...(body?{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(body)}:{})});const text=await response.text();let data:any;try{data=JSON.parse(text);}catch{const snippet=text.replace(/<[^>]*>/g,' ').replace(/\s+/g,' ').trim().slice(0,160);void fetch('/api/logistik/errors',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({kind:'lobby-response',message:`HTTP ${response.status} bei ${path}: ${snippet||'(leer)'}`,url:location.href})}).catch(()=>{});throw Error(`Der Server hat keine gültige Antwort geliefert (HTTP ${response.status}${snippet?': '+snippet:''}). Bitte in einer Minute erneut versuchen.`);}if(!response.ok)throw Error(data.error||'Verbindung fehlgeschlagen.');return data;}
const MODE_OPTS:[string,string][]=[['road','LKW & Transporter'],['rail','Züge'],['ship','Schiffe'],['air','Flugzeuge']];
const ORDER_ST:Record<string,string>={pending:'⏳ Wartet auf Angebot',quoted:'💬 Preisvorschlag erhalten',accepted:'✅ Angenommen – Welt wird eingerichtet',declined:'✖ Abgelehnt',active:'🟢 Aktiv',cancelled:'✖ Storniert'};
function OrderPanel({onDone}:{onDone:()=>void}){const [d,setD]=useState<any>(null),[msg,setMsg]=useState(''),[busy,setBusy]=useState(false),[add,setAdd]=useState<Record<string,string>>({});
 const [c,setC]=useState<any>({name:'',players:10,timeScale:1,seasonDays:0,startCash:5500000,modes:['road','rail','ship','air'],region:'Ganze Welt',maintenance:true,fuel:true,drivers:true,ownServer:false,notes:'',contact:''});
 const load=()=>fetch('/api/logistik/orders',{cache:'no-store'}).then(r=>r.json()).then(setD).catch(()=>{});useEffect(()=>{void load();},[]);
 const post=async(body:any)=>{setBusy(true);setMsg('');try{const r=await fetch('/api/logistik/orders',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(body)}),j=await r.json() as any;if(!r.ok)throw Error(j.error);if(j.message)setMsg(j.message);await load();onDone();}catch(e:any){setMsg(e.message);}finally{setBusy(false);}};
 const set=(k:string,v:any)=>setC((x:any)=>({...x,[k]:v}));
 return <div className="log-order-panel">
  {(d?.orders||[]).length>0&&<><h3>Meine Anfragen</h3>{d.orders.map((o:any)=><article key={o.id} className="log-world"><div><b>{o.config.name}</b><span>{ORDER_ST[o.status]||o.status} · {o.config.players} Spieler · {new Date(o.created).toLocaleDateString('de-DE')}</span>{o.price&&<span>Preis: <b>{o.price}</b></span>}{o.admin_note&&<span className="log-muted">{o.admin_note}</span>}</div>{o.status==='quoted'&&<div className="log-order-actions"><button className="log-primary" disabled={busy} onClick={()=>void post({action:'accept',id:o.id})}>Annehmen</button><button className="log-secondary" disabled={busy} onClick={()=>void post({action:'decline',id:o.id})}>Ablehnen</button></div>}</article>)}</>}
  {(d?.worlds||[]).length>0&&<><h3>Meine privaten Welten</h3>{d.worlds.map((w:any)=><article key={w.id} className="log-world"><div><b>🔒 {w.name}</b><span>Zugang: {w.members.length?w.members.map((m:any)=><span key={m.id} className="log-member-chip">{m.name} <button className="log-link" onClick={()=>void post({action:'members',worldId:w.id,remove:m.id})}>✕</button></span>):'nur du'}</span><div className="log-order-actions"><input placeholder="Kontoname oder E-Mail" value={add[w.id]||''} onChange={e=>setAdd(a=>({...a,[w.id]:e.target.value}))}/><button className="log-secondary" disabled={busy||!add[w.id]} onClick={()=>{void post({action:'members',worldId:w.id,add:add[w.id]});setAdd(a=>({...a,[w.id]:''}));}}>Hinzufügen</button></div></div></article>)}</>}
  <h3>Neue Welt anfragen</h3>
  <div className="log-order-form">
   <label>Weltname<input value={c.name} maxLength={60} onChange={e=>set('name',e.target.value)}/></label>
   <label>Spieler (max.)<input type="number" min={1} max={1000} value={c.players} onChange={e=>set('players',e.target.valueAsNumber||1)}/></label>
   <label>Zeitfaktor<select value={c.timeScale} onChange={e=>set('timeScale',Number(e.target.value))}>{[[1,'Echtzeit 1×'],[2,'2×'],[4,'4×'],[12,'12×'],[24,'24× (1 Spieltag = 1 Stunde)']].map(([v,l])=><option key={v} value={v}>{l}</option>)}</select></label>
   <label>Saisonlänge (Spieltage, 0 = endlos)<input type="number" min={0} max={3650} value={c.seasonDays} onChange={e=>set('seasonDays',e.target.valueAsNumber||0)}/></label>
   <label>Startkapital (€)<input type="number" min={10000} step={100000} value={c.startCash} onChange={e=>set('startCash',e.target.valueAsNumber||10000)}/></label>
   <label>Region<input value={c.region} placeholder="z. B. Ganze Welt, Europa, Österreich + Schweiz" onChange={e=>set('region',e.target.value)}/></label>
   <fieldset><legend>Fahrzeugarten</legend>{MODE_OPTS.map(([k,l])=><label key={k} className="log-checkbox-label"><input type="checkbox" checked={c.modes.includes(k)} onChange={e=>set('modes',e.target.checked?[...c.modes,k]:c.modes.filter((m:string)=>m!==k))}/> {l}</label>)}</fieldset>
   <fieldset><legend>Regeln</legend>{([['maintenance','Wartung & Pannen'],['fuel','Treibstoffkosten'],['drivers','Fahrer & Personal'],['ownServer','Auf eigenem Server (eigene Domain)']] as const).map(([k,l])=><label key={k} className="log-checkbox-label"><input type="checkbox" checked={!!c[k]} onChange={e=>set(k,e.target.checked)}/> {l}</label>)}</fieldset>
   <label>Kontakt (optional)<input value={c.contact} placeholder="Discord, E-Mail …" onChange={e=>set('contact',e.target.value)}/></label>
   <label className="log-order-wide">Wünsche & Anmerkungen<textarea rows={3} value={c.notes} onChange={e=>set('notes',e.target.value)}/></label>
   <button className="log-primary" disabled={busy||c.name.trim().length<3||!c.modes.length} onClick={()=>void post({action:'order',config:c})}>Anfrage senden</button>
  </div>{msg&&<p className="log-admin-message">{msg}</p>}
 </div>;}
export default function OnlineLobby(){
 const site=useSite();
 const [view,setView]=useState('home'),[banner,setBanner]=useState<any>(null),[legal,setLegal]=useState(''),[opening,setOpening]=useState(false);
 useEffect(()=>{
  startDomTranslation();
  const updatePage=()=>{
   setView(viewOf(location.pathname));
   setLegal(SITE_PAGES.find(k=>location.pathname.startsWith('/'+k))||'');
  };
  updatePage();
  setOpening(new URLSearchParams(location.search).has('welt'));
  addEventListener('popstate',updatePage);
  return()=>removeEventListener('popstate',updatePage);
 },[]);
 const [lobbyTab,setLobbyTab]=useState<'worlds'|'order'>('worlds'),[ordersEnabled,setOrdersEnabled]=useState(false),[user,setUser]=useState<any>(undefined),[worlds,setWorlds]=useState<World[]>([]),[active,setActive]=useState<any>(null),[busy,setBusy]=useState(false),[error,setError]=useState(''),[register,setRegister]=useState(false);
 const [publicWorlds,setPublicWorlds]=useState<{id:string;name:string;status:string;testWorld:boolean}[]|null>(null),[publicWorldError,setPublicWorldError]=useState(false);
 const [name,setName]=useState(''),[email,setEmail]=useState(''),[password,setPassword]=useState(''),[companyName,setCompanyName]=useState(''),[joinTarget,setJoinTarget]=useState<World|null>(null),[adminOpen,setAdminOpen]=useState(false),[results,setResults]=useState<{world:World;rows:any[];me:string}|null>(null),[badges,setBadges]=useState<any[]>([]);
 async function refresh(){const data=await api('logistik/online');setWorlds(data.worlds);setOrdersEnabled(!!data.ordersEnabled);setBanner(data.lobbyBanner||null);api('logistik/season').then(d=>setBadges(d.badges||[])).catch(()=>{});}
 async function run(work:()=>Promise<void>){setBusy(true);setError('');try{await work();}catch(e:any){setError(e.message);}finally{setBusy(false);}}
 useEffect(()=>{track('page','lobby');try{const r=new URLSearchParams(location.search).get('ref');if(r)localStorage.setItem('log-ref',r.slice(0,12));}catch{}},[]);useEffect(()=>{installErrorReporter();void run(async()=>{const data=await api('me');setUser(data.user);setAdminOpen(location.pathname.startsWith('/verwaltung'));if(data.user){const worldId=new URLSearchParams(location.search).get('welt');if(worldId){void refresh().catch(()=>{});try{setActive({...await api('logistik/online?world='+encodeURIComponent(worldId)),worldId});}catch(e:any){setError(e.message);}finally{setOpening(false);}}else await refresh();}else setOpening(false);});},[]);
 useEffect(()=>{
  if(user!==null||view!=='worlds')return;
  let current=true;
  setPublicWorldError(false);
  const load=()=>api('logistik/online?lobby=public').then(data=>{
   if(current)setPublicWorldError(false);
   if(current)setPublicWorlds(data.worlds);
  }).catch(()=>{if(current)setPublicWorldError(true);});
  void load();
  const timer=setInterval(()=>{if(!document.hidden)void load();},10000);
  return()=>{current=false;clearInterval(timer);};
 },[user,view]);
 useEffect(()=>{if(!user||active)return;let busy=false;const timer=setInterval(()=>{if(busy||document.hidden)return;busy=true;void refresh().catch(()=>{}).finally(()=>{busy=false;});},10000);return()=>clearInterval(timer);},[user,active]);
 async function openWorld(worldId:string,foundName?:string){const wantTest=!!(worlds||[]).find((x:any)=>x.id===worldId)?.testWorld,isTest=document.cookie.includes('lgx_inst=test');if(!foundName&&wantTest!==isTest){setOpening(true);document.cookie='lgx_inst='+(wantTest?'test':'')+'; path=/; SameSite=Lax; max-age='+(wantTest?2592000:0);location.assign('/logistik?welt='+encodeURIComponent(worldId));return;}setOpening(true);let data:any;try{data=foundName?await api('logistik/online',{worldId,command:{type:'joinWorld',name:foundName}}):await api('logistik/online?world='+encodeURIComponent(worldId));}finally{setOpening(false);}if(wantTest!==isTest){document.cookie='lgx_inst='+(wantTest?'test':'')+'; path=/; SameSite=Lax; max-age='+(wantTest?2592000:0);location.assign('/logistik?welt='+encodeURIComponent(worldId));return;}setActive({...data,worldId});history.replaceState(null,'','/logistik?welt='+encodeURIComponent(worldId));}
 if(adminOpen&&user)return <AdminManagement onBack={()=>{setAdminOpen(false);history.replaceState(null,'','/logistik');void refresh().catch(e=>setError(e.message));}}/>;
 if(active)return <ErrorBoundary label="spiel"><LogisticsGame key={active.worldId} worldId={active.worldId} initial={active} onAdmin={['owner','admin'].includes(user?.role)?()=>{setActive(null);setAdminOpen(true);history.replaceState(null,'','/verwaltung');}:undefined} onLeave={()=>{if(document.cookie.includes('lgx_inst=test')){document.cookie='lgx_inst=; path=/; max-age=0';location.assign('/logistik');return;}setActive(null);history.replaceState(null,'','/logistik');void refresh().catch(e=>setError(e.message));}}/></ErrorBoundary>;
 if(legal)return <LegalPage kind={legal}/>;
 if(opening&&!active&&!error)return <main className="log-lobby log-world-loading"><div><span className="log-spinner"/><p>Welt wird geladen …</p></div></main>;
 const go=(path:string,e?:{preventDefault:()=>void;ctrlKey?:boolean;metaKey?:boolean})=>{if(e?.ctrlKey||e?.metaKey)return;e?.preventDefault();history.pushState(null,'',path);setView(viewOf(path));scrollTo({top:0,behavior:'smooth'});};
 const mineList=worlds.filter(w=>w.joined);
 const playButton=(w:World)=>w.external?<a className="log-primary" href={w.external+'/welt/'+w.id}>Auf eigenem Server spielen ↗</a>:w.joined&&!busy&&w.status!=='finished'?<a className="log-primary log-play-link" href={'/logistik?welt='+encodeURIComponent(w.id)} onClick={e=>{if(e.ctrlKey||e.metaKey||e.shiftKey||e.button!==0)return;e.preventDefault();void run(()=>openWorld(w.id));}}>Spielen</a>:<button className="log-primary" disabled={busy||w.status==='finished'||(!w.joined&&(w.companies>=((w.settings as any)?.maxPlayers||50)||w.status!=='running'))} onClick={()=>{if(w.joined)void run(()=>openWorld(w.id));else{setJoinTarget(w);setCompanyName(user.name+' Logistik');}}}>{w.joined?'Spielen':'Beitreten'}</button>;
 const status=(w:World)=>w.status!=='running'?<span className="log-world-status">{w.status==='paused'?'Pausiert':w.status==='finished'?'🏁 Saison beendet':'Geschlossen'}</span>:null;
 const loginCard=<section id="spielen" className="log-lobby-card"><h2>{register?'Konto erstellen':'Anmelden'}</h2><form onSubmit={e=>{e.preventDefault();void run(async()=>{const data=await api('auth/'+(register?'register':'login'),{name,email,password,...(register?{ref:(()=>{try{return localStorage.getItem('log-ref')||undefined;}catch{return undefined;}})()}:{})});setUser(data.user);setPassword('');await refresh();});}}>{register&&<label>Spielername<input required minLength={2} maxLength={40} value={name} onChange={e=>setName(e.target.value)} autoComplete="nickname"/></label>}<label>E-Mail<input required type="email" value={email} onChange={e=>setEmail(e.target.value)} autoComplete="email"/></label><label>Passwort<input required type="password" minLength={8} value={password} onChange={e=>setPassword(e.target.value)} autoComplete={register?'new-password':'current-password'}/></label><button className="log-primary" disabled={busy}>{busy?'Verbinde …':register?'Konto erstellen':'Anmelden'}</button></form><button className="log-lobby-link" disabled={busy} onClick={()=>{setRegister(!register);setError('');}}>{register?'Bereits registriert? Anmelden':'Neu hier? Konto erstellen'}</button><LoginExtras register={register} email={email}/>{error&&<p role="alert" className="log-lobby-error">{error}</p>}</section>;
 const companiesCard=<section id="spielen" className="log-lobby-card"><h2>Meine Speditionen</h2><VerifyNotice user={user}/>{badges.length>0&&<div className="log-season-badges" aria-label="Saison-Abzeichen">{badges.map((b:any)=><span key={b.worldId} className={'log-season-badge'+(b.rank<=3?' top':'')} title={`${b.world}: Platz ${b.rank} von ${b.players}`}>{b.rank===1?'🥇':b.rank===2?'🥈':b.rank===3?'🥉':'🏁'} {b.world} · #{b.rank}</span>)}</div>}
  {mineList.length?<div className="log-my-companies">{mineList.map((w,i)=><article key={w.id} className="log-my-company" style={{animationDelay:i*60+'ms'}}><div><b>🚚 {(w as any).mine?.company||w.name}</b><small>{w.name}{(w as any).testWorld?' · 🧪 Test':''}</small>{(w as any).mine&&<span>Firmenwert <b>{eur((w as any).mine.value)}</b></span>}{status(w)}</div>{playButton(w)}</article>)}<a className="log-lobby-link" href="/welten" onClick={e=>go('/welten',e)}>Weitere Welten ansehen →</a></div>
  :<div className="log-start-cta"><p>Du hast noch keine Spedition. Such dir eine Welt aus und gründe dein Unternehmen – kostenlos.</p><a className="log-primary log-cta" href="/welten" onClick={e=>go('/welten',e)}>Jetzt anfangen →</a></div>}
  {error&&<p role="alert" className="log-lobby-error">{error}</p>}</section>;
 function showLogin(){
  if(view!=='home'){history.pushState(null,'','/');setView('home');}
  requestAnimationFrame(()=>{
   const entry=document.getElementById('spielen');
   entry?.scrollIntoView({block:'start'});
   entry?.querySelector('input[type=email]')?.focus({preventScroll:true});
  });
 }
 const guestWorlds=<div className="log-home-world-list">
  {publicWorldError?<p>Die Spielwelten konnten nicht geladen werden.</p>:publicWorlds===null?<p role="status">Spielwelten werden geladen …</p>:publicWorlds.length?publicWorlds.map(w=>
   <article key={w.id}><div><strong>{w.name}</strong><small>{w.testWorld?'Testwelt · ':''}{w.status==='running'?'Geöffnet':w.status==='paused'?'Pausiert':w.status==='finished'?'Saison beendet':'Geschlossen'}</small></div>{w.status==='running'?<button type="button" className="log-secondary" onClick={showLogin}>Zum Spielen anmelden</button>:<span className="log-muted">Aktuell kein Beitritt</span>}</article>
  ):<p>Momentan sind keine öffentlichen Spielwelten vorhanden.</p>}
 </div>;
 const worldList=(entries:World[])=><div className="log-world-grid">{entries.length?entries.map((w,i)=><article className={'log-world log-anim'+(w.joined?' joined':'')} key={w.id} style={{animationDelay:i*60+'ms'}}><div><b>{(w.settings as any)?.private&&'🔒 '}{w.name}{(w as any).testWorld&&<span className="log-test-badge" title="Testwelt: bekommt neue Updates zuerst"> 🧪 Test</span>}</b>{status(w)}{(w as any).mine&&<div className="log-lobby-mine"><b>🚚 {(w as any).mine.company}</b><span>Firmenwert <b>{eur((w as any).mine.value)}</b></span></div>}<SettingsSummary settings={w.settings} day={w.day}/></div><div className="log-world-actions">{w.status==='finished'&&<button className="log-secondary" disabled={busy} onClick={()=>void run(async()=>{const d=await api('logistik/season?world='+encodeURIComponent(w.id));setResults({world:w,rows:d.rows,me:d.me});})}>Endwertung</button>}{user?playButton(w):<a className="log-primary" href="/" onClick={e=>go('/',e)}>Anmelden</a>}</div></article>):<p>Keine weiteren Spielwelten verfügbar.</p>}</div>;
 const worldsPage=<section className="log-worlds-page"><header className="log-page-hero"><h1>Spielwelten</h1><p>Wähle eine Welt für deine Spedition. Jede Welt hat ihre eigenen Unternehmen, Regeln und Transportnetze.</p></header>
  {error&&<p role="alert" className="log-lobby-error">{error}</p>}
  {user?worldList(worlds):guestWorlds}
 </section>;
 const joinDialog=joinTarget&&<div className="log-dialog-backdrop" onClick={e=>{if(e.target===e.currentTarget)setJoinTarget(null);}}><section className="log-ranking-dialog log-found-company" role="dialog" aria-modal="true"><button className="log-dialog-close" aria-label="Schließen" onClick={()=>setJoinTarget(null)}>×</button><h3>Spedition in {joinTarget.name} gründen</h3><p>Deine Spedition erhält einen eigenen Kontostand, Fahrzeuge, Anlagen und Verträge in dieser Welt.</p><form onSubmit={e=>{e.preventDefault();void run(async()=>{await openWorld(joinTarget.id,companyName);setJoinTarget(null);});}}><label>Speditionsname<input aria-label="Speditionsname" minLength={3} maxLength={50} value={companyName} onChange={e=>setCompanyName(e.target.value)} required/></label><button className="log-primary" disabled={busy}>Spedition gründen & Welt betreten</button>{error&&<p role="alert" className="log-lobby-error">{error}</p>}</form></section></div>;
 return <main className="log-lobby"><CookieNotice/>{banner&&<div className={'log-lobby-banner '+banner.tone}>{banner.link?<a href={banner.link} target={banner.link.startsWith('http')?'_blank':undefined} rel="noreferrer">{banner.text}</a>:banner.text}</div>}<MaintenanceBanner/><SiteNav active={view==='worlds'?'/welten':view==='home'?'/':'/'+view} onNav={(p,e)=>go(p,e)} right={user?<><span>{user.name}</span>{ordersEnabled&&<button onClick={()=>setLobbyTab('order')}>🖥️ Eigene Welt</button>}{['owner','admin'].includes(user.role)&&<button onClick={()=>{setAdminOpen(true);history.replaceState(null,'','/verwaltung');}}>Administration</button>}<button disabled={busy} onClick={()=>void run(async()=>{await api('auth/logout',{});setUser(null);})}>Abmelden</button></>:undefined}/>
 {lobbyTab==='order'&&<div className="log-dialog-backdrop" onClick={e=>{if(e.target===e.currentTarget)setLobbyTab('worlds');}}><section className="log-ranking-dialog" role="dialog" aria-modal="true" aria-label="Eigene Welt bestellen"><button className="log-dialog-close" aria-label="Schließen" onClick={()=>setLobbyTab('worlds')}>×</button><h2>🖥️ Eigene Welt bestellen</h2><OrderPanel onDone={()=>void refresh()}/></section></div>}
 {LOBBY_PAGES.includes(view)?<section className="log-lobby-subpage" key={view}><header className="log-page-hero log-anim"><h1>{TITLE[view][0]}</h1></header><section className="log-site-content log-anim">{view==='roadmap'?<Roadmap/>:view==='premium'?<Premium/>:<News/>}</section></section>:view==='worlds'?worldsPage:<>
  <div className="log-lobby-grid log-play-start">
   <section className="log-lobby-intro">
    <h1>Loadstar spielen</h1>
    <p>Gründe eine Spedition und beliefere echte Betriebe auf der Weltkarte.</p>
    <a className="log-lobby-link log-play-world-link" href="/welten" onClick={e=>go('/welten',e)}>Spielwelten ansehen</a>
    <figure className="log-start-photo"><img src="/logistics-vehicles/man-tgs.webp" alt="MAN TGS, ein Lkw aus dem Fahrzeugkatalog" width="640" height="420"/><figcaption>Flotte aufbauen und selbst disponieren. <a href="/bildnachweise">Fahrzeugfoto: Alf van Beem, CC0</a></figcaption></figure>
   </section>
   {user===undefined?<section className="log-lobby-card" id="spielen"><p role="status">Verbindung wird hergestellt …</p>{error&&<p role="alert">{error}</p>}</section>:user?companiesCard:loginCard}
  </div>
  <section className="log-start-guide" aria-labelledby="log-start-guide-title">
   <div><h2 id="log-start-guide-title">Vom ersten Auftrag zum eigenen Transportnetz</h2><p>Du entscheidest, was transportiert wird, welche Fahrzeuge fahren und wo du investierst. Deine Spedition arbeitet in einer gemeinsamen Spielwelt mit anderen Unternehmen.</p><p className="log-start-modes">Lkw &amp; Transporter · Güterzüge · Schiffe · Flugzeuge</p></div>
   <ol>
    <li><h3>Aufträge auswählen</h3><p>Suche Fracht nach Startort, Zielort und Entfernung. Vergleiche Vergütung, Menge und Lieferfrist.</p></li>
    <li> <h3>Transport organisieren</h3><p>Kaufe passende Fahrzeuge, richte Linien ein und verbinde Betriebe mit deinen Depots und Terminals.</p></li>
    <li><h3>Die Spedition weiterentwickeln</h3><p>Behalte Einnahmen und Betriebskosten im Blick. Baue Lager aus, schließe Verträge und erweitere deine Flotte.</p></li>
   </ol>
  </section>
 </>}
 {joinDialog}
 {results&&<div className="log-dialog-backdrop" onClick={e=>{if(e.target===e.currentTarget)setResults(null);}}><section className="log-ranking-dialog" role="dialog" aria-modal="true" aria-label="Endwertung"><button className="log-dialog-close" aria-label="Schließen" onClick={()=>setResults(null)}>×</button><h2>🏁 Endwertung · {results.world.name}</h2><p className="log-help">Endstand nach Firmenwert (Kontostand + Händlerwert der Flotte + 60 % der Gebäudewerte).</p><div className="log-ranking-scroll"><table className="log-exchange-table"><thead><tr><th>#</th><th>Spedition</th><th>Firmenwert</th><th>Gewinn 30 Tage</th><th>Transportiert</th><th>Aufträge</th><th>Fahrzeuge</th></tr></thead><tbody>{results.rows.map((r:any)=><tr key={r.id} className={r.id===results.me?'log-ranking-me':''}><td><b>{r.rank===1?'🥇':r.rank===2?'🥈':r.rank===3?'🥉':r.rank}</b></td><td>{r.tag&&<span className="log-alliance-tag">[{r.tag}]</span>} <b>{r.name}</b></td><td>{Math.round(r.value).toLocaleString('de-DE')} {currencySymbol()}</td><td>{Math.round(r.profit30).toLocaleString('de-DE')} {currencySymbol()}</td><td>{Math.round(r.transported).toLocaleString('de-DE')} EH</td><td>{r.orders}</td><td>{r.vehicles}</td></tr>)}</tbody></table>{!results.rows.length&&<p className="log-muted">Keine Teilnehmer.</p>}</div></section></div>}
 {user&&view==='home'&&<InvitePanel worlds={worlds as any}/>}<footer className="log-lobby-footer">Reale Standorte: © OpenStreetMap contributors · Waren, Kapazitäten und Wirtschaft sind Spielwerte.<br/><button className="log-link" onClick={()=>openCookieInfo()}>Cookie-Einstellungen</button> · <a href="/datenschutz">Datenschutz</a> · <a href="/impressum">Impressum</a> · <a href="/agb">AGB</a> · <a href="/neuigkeiten">Neuigkeiten</a> · <a href="/roadmap">Roadmap</a> · <a href="/bildnachweise">Bildnachweise</a></footer></main>;
}
