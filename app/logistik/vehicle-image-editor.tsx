'use client';
import {useState} from 'react';
import {loadBranding,resizeImage,useBranding} from './branding-store';

export default function VehicleImageEditor({worldId,vehicleId}:{worldId:string;vehicleId:string}){
 const brand=useBranding(),[busy,setBusy]=useState(false),[message,setMessage]=useState('');
 const key='vehicle:'+vehicleId,custom=brand?.images[key],declined=brand?.declined.find(i=>i.model===key);
 async function save(file?:File){
  setBusy(true);setMessage('');
  try{
   const image=file?await resizeImage(file,640):undefined;
   const response=await fetch('/api/logistik/branding',{method:'POST',headers:{'Content-Type':'application/json'},signal:AbortSignal.timeout(15000),body:JSON.stringify({world:worldId,vehicleId,action:file?'individualVehicleImage':'removeIndividualVehicleImage',image})});
   const data=await response.json() as {error?:string};if(!response.ok)throw Error(data.error);
   await loadBranding(worldId);setMessage(file?'Bild für dieses Fahrzeug gespeichert.':'Das Modellbild wird wieder verwendet.');
  }catch(e:any){setMessage(e.name==='TimeoutError'?'Speichern dauert länger. Bitte erneut prüfen.':e.message);}finally{setBusy(false);}
 }
 return <details className="log-vehicle-image-editor"><summary>Eigenes Fahrzeugbild <span className="log-badge-premium">Premium</span></summary>
  <p>Dieses Bild gilt nur für dieses Fahrzeug. Ohne eigenes Bild wird das Bild des Modells verwendet.</p>
  {brand?.premium?<label>Bild auswählen<input type="file" accept="image/png,image/jpeg,image/webp" disabled={busy} onChange={e=>{const file=e.currentTarget.files?.[0];e.currentTarget.value='';if(file)void save(file);}}/></label>:<p>Mit Premium kannst du jedem Fahrzeug ein eigenes Bild zuweisen.</p>}
  {custom&&<button className="log-secondary" disabled={busy} onClick={()=>void save()}>Modellbild verwenden</button>}
  {brand?.imageStatus[key]==='pending'&&<small>Bild sichtbar, Prüfung ausstehend.</small>}
  {declined&&<p>Bild abgelehnt: {declined.note}</p>}
  {message&&<p role="status">{message}</p>}
 </details>;
}
