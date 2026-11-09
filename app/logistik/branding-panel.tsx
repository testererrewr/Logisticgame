'use client';
import {useState} from 'react';
import {VEHICLES,type State} from '../../lib/logistics/engine';
import VehiclePhoto from './vehicle-photo';
import {useBranding,loadBranding,resizeImage} from './branding-store';

export default function BrandingPanel({worldId,state,companyName}:{worldId:string;state:State;companyName:string}){
 const brand=useBranding(),[primary,setPrimary]=useState<string|null>(null),[secondary,setSecondary]=useState<string|null>(null),[busy,setBusy]=useState(false),[msg,setMsg]=useState('');
 const p=primary??brand?.primary??'#2f6fae',s=secondary??brand?.secondary??'#f2c14e',premium=!!brand?.entitlements.includes('customVehicleImages');
 const send=async(body:any,ok:string)=>{setBusy(true);setMsg('');try{const r=await fetch('/api/logistik/branding',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({world:worldId,...body})}),d:any=await r.json().catch(()=>({error:'Keine Antwort.'}));if(!r.ok)throw Error(d.error);await loadBranding(worldId);setMsg(ok);}catch(e:any){setMsg(e.message);}finally{setBusy(false);}};
 const upload=async(file:File|undefined,max:number,body:(img:string)=>any,ok:string)=>{if(!file)return;try{const img=await resizeImage(file,max);await send(body(img),ok);}catch(e:any){setMsg(e.message);}};
 const models=[...new Set(state.vehicles.map(v=>v.modelId))].map(id=>VEHICLES.find(m=>m.id===id)!).filter(Boolean);
 return <section className="log-branding">
  <h1>Firmenauftritt</h1>
  {msg&&<p role="status" className="log-admin-message">{msg}</p>}
  <div className="log-branding-preview" style={{background:`linear-gradient(135deg,${p},${p} 60%,${s} 60%)`}}>{brand?.logo?<img src={brand.logo} alt="Firmenlogo"/>:<span className="log-branding-placeholder">LOGO</span>}<b>{companyName}</b></div>
  <section className="log-trailer-box"><h3>Firmenfarben</h3><p className="log-help">Die Farben erscheinen auf deinen Fahrzeugen auf der Karte und in der Rangliste.</p><div className="log-trailer-toolbar"><label>Hauptfarbe<input type="color" value={p} onChange={e=>setPrimary(e.target.value)}/></label><label>Akzentfarbe<input type="color" value={s} onChange={e=>setSecondary(e.target.value)}/></label><button className="log-primary" disabled={busy} onClick={()=>void send({action:'colors',primary:p,secondary:s},'Farben gespeichert.')}>Farben speichern</button></div></section>
  <section className="log-trailer-box"><h3>Firmenlogo</h3><p className="log-help">PNG, JPG oder WebP. Wird automatisch auf 256 px verkleinert.</p><div className="log-trailer-toolbar"><input type="file" accept="image/png,image/jpeg,image/webp" disabled={busy} onChange={e=>void upload(e.target.files?.[0],256,img=>({action:'logo',image:img}),'Logo gespeichert.')}/>{brand?.logo&&<button className="log-secondary" disabled={busy} onClick={()=>void send({action:'removeLogo'},'Logo entfernt.')}>Logo entfernen</button>}</div></section>
  <section className="log-trailer-box"><h3>Eigene Fahrzeugbilder <span className="log-badge log-badge-warn">Premium</span></h3>
   {!premium?<p className="log-help">Eigene Bilder für deine Fahrzeugmodelle (z. B. in deiner Lackierung) sind eine Premium-Funktion. Sie wird künftig freischaltbar; aktuell können Administratoren sie in der Verwaltung vergeben.</p>:<><p className="log-help">Lade für jedes Modell deiner Flotte ein eigenes Bild hoch (max. 640 px, wird verkleinert). Es ersetzt das Standardfoto überall im Spiel – nur für dich.</p><div className="log-branding-models">{models.map(m=><article key={m.id}><VehiclePhoto id={m.id}/><b>{m.name}</b><input type="file" accept="image/png,image/jpeg,image/webp" disabled={busy} onChange={e=>void upload(e.target.files?.[0],640,img=>({action:'vehicleImage',model:m.id,image:img}),'Fahrzeugbild gespeichert.')}/>{brand?.images[m.id]&&<button className="log-secondary" disabled={busy} onClick={()=>void send({action:'removeVehicleImage',model:m.id},'Standardfoto wiederhergestellt.')}>Standardfoto</button>}</article>)}{!models.length&&<p className="log-muted">Noch keine Fahrzeuge.</p>}</div></>}
  </section>
 </section>;
}
