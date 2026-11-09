'use client';
import {useCallback,useEffect,useState} from 'react';

const ROLE:Record<string,string>={leader:'Leitung',officer:'Offizier',member:'Mitglied'};
export default function AlliancePanel({worldId}:{worldId:string}){
 const [data,setData]=useState<any>(null),[error,setError]=useState(''),[busy,setBusy]=useState(false),[name,setName]=useState(''),[tag,setTag]=useState(''),[open,setOpen]=useState(false),[post,setPost]=useState(''),[invite,setInvite]=useState(''),[query,setQuery]=useState('');
 const load=useCallback(async()=>{try{const r=await fetch('/api/logistik/alliance?world='+encodeURIComponent(worldId),{cache:'no-store'}),d:any=await r.json().catch(()=>({error:'Allianzen nicht erreichbar.'}));if(!r.ok)throw Error(d.error);setData(d);setError('');}catch(e:any){setError(e.message);}},[worldId]);
 useEffect(()=>{void load();const t=setInterval(()=>void load(),30000);return()=>clearInterval(t);},[load]);
 const act=async(body:any,done?:()=>void)=>{setBusy(true);try{const r=await fetch('/api/logistik/alliance',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({world:worldId,...body})}),d:any=await r.json().catch(()=>({error:'Keine Antwort.'}));if(!r.ok)throw Error(d.error);done?.();await load();}catch(e:any){setError(e.message);}finally{setBusy(false);}};
 if(!data)return <section className="log-alliance"><h1>Allianzen</h1><p>{error||'Wird geladen …'}</p></section>;
 const a=data.alliance,lead=a&&['leader','officer'].includes(a.role),free=(data.companies||[]).filter((c:any)=>!c.allianceId&&c.id!==data.me);
 return <section className="log-alliance">
  <h1>Allianzen & Kooperativen</h1>
  <p className="log-help">Allianzmitglieder nutzen gegenseitig ihre Gleise sowie Bahnhöfe, Häfen, Flughäfen, Depots und Lager als Kooperativ-Standorte (jede Spedition behält ihren eigenen Lagerbestand). Dazu gibt es eine gemeinsame Pinnwand und das Allianzkürzel in der Rangliste.</p>
  {error&&<p role="alert" className="log-lobby-error">{error}</p>}
  {a?<>
   <header className="log-alliance-head" style={{borderColor:a.color}}><span className="log-alliance-tag" style={{background:a.color}}>[{a.tag}]</span><div><h2>{a.name}</h2><small>{a.members.length} Mitglieder · deine Rolle: {ROLE[a.role]} · {a.open?'offen für Beitritte':'nur auf Einladung'}</small>{a.description&&<p>{a.description}</p>}</div></header>
   <div className="log-alliance-grid">
    <section><h3>Mitglieder</h3><table className="log-exchange-table"><tbody>{a.members.map((m:any)=><tr key={m.id}><td><b>{m.name}</b>{m.id===data.me&&' (du)'}</td><td>{ROLE[m.role]}</td><td>{a.role==='leader'&&m.id!==data.me&&<select value={m.role} disabled={busy} onChange={e=>void act({action:'role',userId:m.id,role:e.target.value})}><option value="member">Mitglied</option><option value="officer">Offizier</option><option value="leader">Leitung übergeben</option></select>}{lead&&m.id!==data.me&&m.role!=='leader'&&<button className="log-secondary" disabled={busy} onClick={()=>void act({action:'kick',userId:m.id})}>Entfernen</button>}</td></tr>)}</tbody></table>
     {lead&&<div className="log-trailer-toolbar"><select value={invite} onChange={e=>setInvite(e.target.value)}><option value="">Spedition einladen …</option>{free.map((c:any)=><option key={c.id} value={c.id}>{c.name}</option>)}</select><button className="log-primary" disabled={busy||!invite} onClick={()=>void act({action:'invite',userId:invite},()=>setInvite(''))}>Einladen</button></div>}
     {a.pending?.length>0&&<p className="log-help">Offene Einladungen: {a.pending.map((p:any)=>p.name).join(', ')}</p>}
     <button className="log-danger" disabled={busy} onClick={()=>{if(confirm('Allianz wirklich verlassen? Gleis- und Standortfreigaben enden sofort.'))void act({action:'leave'});}}>Allianz verlassen</button>
    </section>
    <section><h3>Pinnwand</h3><textarea rows={3} maxLength={1000} placeholder="Nachricht an die Allianz …" value={post} onChange={e=>setPost(e.target.value)}/><button className="log-primary" disabled={busy||!post.trim()} onClick={()=>void act({action:'post',text:post},()=>setPost(''))}>Senden</button><div className="log-alliance-posts">{a.posts.map((p:any)=><article key={p.id}><small><b>{p.name}</b> · {new Date(p.created).toLocaleString('de-DE',{day:'2-digit',month:'2-digit',hour:'2-digit',minute:'2-digit'})}</small><p>{p.text}</p></article>)}{!a.posts.length&&<p className="log-muted">Noch keine Nachrichten.</p>}</div></section>
   </div>
  </>:<>
   {data.invites?.length>0&&<section><h3>Einladungen</h3>{data.invites.map((i:any)=><div key={i.id} className="log-trailer-toolbar"><b>[{i.tag}] {i.name}</b><button className="log-primary" disabled={busy} onClick={()=>void act({action:'accept',allianceId:i.id})}>Beitreten</button><button className="log-secondary" disabled={busy} onClick={()=>void act({action:'decline',allianceId:i.id})}>Ablehnen</button></div>)}</section>}
   <section><h3>Neue Allianz gründen</h3><div className="log-trailer-toolbar"><input placeholder="Allianzname" maxLength={40} value={name} onChange={e=>setName(e.target.value)}/><input placeholder="Kürzel (2–5)" maxLength={5} value={tag} onChange={e=>setTag(e.target.value.toUpperCase())} style={{width:110}}/><label className="log-checkbox-label"><input type="checkbox" checked={open} onChange={e=>setOpen(e.target.checked)}/> offen für Beitritte</label><button className="log-primary" disabled={busy||name.trim().length<3||tag.length<2} onClick={()=>void act({action:'create',name,tag,open})}>Gründen</button></div></section>
  </>}
  <section><h3>Allianzen dieser Welt</h3><input placeholder="Allianz suchen …" value={query} onChange={e=>setQuery(e.target.value)}/><table className="log-exchange-table"><thead><tr><th>Kürzel</th><th>Name</th><th>Mitglieder</th><th>Beitritt</th></tr></thead><tbody>{data.alliances.filter((x:any)=>(x.name+' '+x.tag).toLowerCase().includes(query.toLowerCase())).map((x:any)=><tr key={x.id}><td><span className="log-alliance-tag" style={{background:x.color}}>[{x.tag}]</span></td><td>{x.name}</td><td>{x.members}</td><td>{!a&&x.open?<button className="log-secondary" disabled={busy} onClick={()=>void act({action:'join',allianceId:x.id})}>Beitreten</button>:x.open?'offen':'Einladung'}</td></tr>)}</tbody></table>{!data.alliances.length&&<p className="log-muted">Noch keine Allianz in dieser Welt.</p>}</section>
 </section>;
}
