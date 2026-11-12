'use client';
import {useMemo,useState} from 'react';
import {VEHICLES,type State} from '../../lib/logistics/engine';
import VehiclePhoto from './vehicle-photo';
import {useBranding,loadBranding,resizeImage} from './branding-store';

const MODES:Record<string,string>={truck:'LKW',van:'Transporter',rail:'Züge',ship:'Schiffe',air:'Flugzeuge'};
const STATUS:Record<string,string>={pending:'wartet auf Freigabe',approved:'freigegeben'};
export default function BrandingPanel({worldId,state,companyName}:{worldId:string;state:State;companyName:string}){
 const brand=useBranding(),[primary,setPrimary]=useState<string|null>(null),[secondary,setSecondary]=useState<string|null>(null),[busy,setBusy]=useState(false),[msg,setMsg]=useState(''),[query,setQuery]=useState(''),[mode,setMode]=useState('own');
 const p=primary??brand?.primary??'#2f6fae',s=secondary??brand?.secondary??'#f2c14e',premium=!!brand?.premium,images=premium||!!brand?.entitlements.includes('customVehicleImages');
 const send=async(body:any,ok:string)=>{setBusy(true);setMsg('');try{const r=await fetch('/api/logistik/branding',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({world:worldId,...body})}),d:any=await r.json().catch(()=>({error:'Keine Antwort.'}));if(!r.ok)throw Error(d.error);await loadBranding(worldId);setMsg(ok);}catch(e:any){setMsg(e.message);}finally{setBusy(false);}};
 const upload=async(file:File|undefined,max:number,body:(img:string)=>any,ok:string)=>{if(!file)return;try{const img=await resizeImage(file,max);await send(body(img),ok);}catch(e:any){setMsg(e.message);}};
 const own=new Set(state.vehicles.map(v=>v.modelId));
 const models=useMemo(()=>VEHICLES.filter(m=>(mode==='own'?own.has(m.id):mode==='custom'?!!brand?.images[m.id]:mode==='all'||m.mode===mode)&&m.name.toLowerCase().includes(query.trim().toLowerCase())),[mode,query,brand,state.vehicles]);
 const lock=<span className="log-badge-premium">PREMIUM</span>;
 return <section className="log-branding">
  <h1>Firmenauftritt {premium&&<span className="log-badge-premium">PREMIUM</span>}</h1>
  {msg&&<p role="status" className="log-admin-message">{msg}</p>}
  {!premium&&<section className="log-trailer-box"><h3>Premium {lock}</h3><ul>{(brand?.perks||[]).map(x=><li key={x}>{x}</li>)}</ul><p className="log-help">Premium vergeben derzeit die Administratoren.</p></section>}
  <div className="log-branding-preview" style={{background:`linear-gradient(135deg,${p},${p} 60%,${s} 60%)`}}>{brand?.logo?<img src={brand.logo} alt="Firmenlogo"/>:<span className="log-branding-placeholder">LOGO</span>}<b>{companyName}</b></div>
  <section className="log-trailer-box"><h3>Firmenfarben {!premium&&lock}</h3><div className="log-trailer-toolbar"><label>Hauptfarbe<input type="color" value={p} disabled={!premium} onChange={e=>setPrimary(e.target.value)}/></label><label>Akzentfarbe<input type="color" value={s} disabled={!premium} onChange={e=>setSecondary(e.target.value)}/></label><button className="log-primary" disabled={busy||!premium} onClick={()=>void send({action:'colors',primary:p,secondary:s},'Farben gespeichert.')}>Farben speichern</button></div></section>
  <section className="log-trailer-box"><h3>Firmenlogo {!premium&&lock}</h3><p className="log-help">PNG, JPG oder WebP. Wird automatisch auf 256 px verkleinert.</p><div className="log-trailer-toolbar"><input type="file" accept="image/png,image/jpeg,image/webp" disabled={busy||!premium} onChange={e=>void upload(e.target.files?.[0],256,img=>({action:'logo',image:img}),'Logo gespeichert.')}/>{brand?.logo&&<button className="log-secondary" disabled={busy} onClick={()=>void send({action:'removeLogo'},'Logo entfernt.')}>Logo entfernen</button>}</div></section>
  {premium&&<section className="log-trailer-box"><h3>Premium-Abzeichen</h3><label className="log-checkbox-label"><input type="checkbox" checked={brand?.showBadge!==false} disabled={busy} onChange={e=>void send({action:'badge',show:e.target.checked},e.target.checked?'Abzeichen wird in der Rangliste gezeigt.':'Abzeichen ausgeblendet.')}/> Abzeichen in der Rangliste neben dem Firmennamen zeigen</label></section>}
  <section className="log-trailer-box"><h3>Eigene Fahrzeugbilder {!images&&lock}</h3>
   {!images?<p className="log-help">Eigene Bilder für jedes Fahrzeugmodell (z. B. in deiner Lackierung) gehören zu Premium.</p>:<>
    <p className="log-help">Eigenes Bild je Fahrzeugmodell (max. 640 px). Sofort sichtbar, ein Admin prüft es.</p>
    <div className="log-trailer-toolbar"><select aria-label="Modelle" value={mode} onChange={e=>setMode(e.target.value)}><option value="own">Meine Flotte</option><option value="custom">Mit eigenem Bild</option><option value="all">Alle Modelle ({VEHICLES.length})</option>{Object.entries(MODES).map(([k,n])=><option key={k} value={k}>{n}</option>)}</select><input placeholder="Modell suchen …" value={query} onChange={e=>setQuery(e.target.value)}/></div>
    <div className="log-branding-models">{models.map(m=><article key={m.id}><VehiclePhoto id={m.id}/><b>{m.name}</b>{brand?.imageStatus[m.id]&&<small className={'log-image-status '+brand.imageStatus[m.id]}>{STATUS[brand.imageStatus[m.id]]||brand.imageStatus[m.id]}</small>}<input type="file" accept="image/png,image/jpeg,image/webp" disabled={busy} onChange={e=>void upload(e.target.files?.[0],640,img=>({action:'vehicleImage',model:m.id,image:img}),'Fahrzeugbild gespeichert – sichtbar für alle, Freigabe ausstehend.')}/>{brand?.images[m.id]&&<button className="log-secondary" disabled={busy} onClick={()=>void send({action:'removeVehicleImage',model:m.id},'Standardfoto wiederhergestellt.')}>Standardfoto</button>}</article>)}{!models.length&&<p className="log-muted">Keine Modelle für diesen Filter.</p>}</div></>}
  </section>
 </section>;
}
