'use client';

import {useEffect,useState} from 'react';
import galleryData from '../../data/logistics-vehicle-gallery.json';
import {useBranding} from './branding-store';

type Photo={path:string;alt:string;caption:string;sourceUrl:string;author:string;license:string;licenseUrl:string;changes?:string;exactModelPhotoAvailable?:boolean};
const gallery=galleryData as Record<string,Photo>;
let preloaded=false;
export function preloadVehiclePhotos(){if(preloaded||typeof window==='undefined')return;preloaded=true;const run=()=>{for(const p of Object.values(gallery))if(p?.path){const img=new Image();img.decoding='async';img.src=p.path;}};const idle=(window as unknown as {requestIdleCallback?:(cb:()=>void,o?:{timeout:number})=>void}).requestIdleCallback;if(idle)idle(run,{timeout:3000});else setTimeout(run,1000);}

export default function VehiclePhoto({id,credits=false,owner,world,vehicleId}:{id:string;credits?:boolean;owner?:string;world?:string;vehicleId?:string}){
 const [failedPath,setFailedPath]=useState(''),[failedCustom,setFailedCustom]=useState<string[]>([]);
 useEffect(()=>{preloadVehiclePhotos();},[]);
 const brand=useBranding(),keys=[...(vehicleId?['vehicle:'+vehicleId]:[]),id];
 const custom=keys.map(key=>owner&&world?`/api/logistik/branding/image?world=${encodeURIComponent(world)}&user=${encodeURIComponent(owner)}&kind=vehicle&model=${encodeURIComponent(key)}`:brand?.images?.[key]).find(url=>url&&!failedCustom.includes(url));
 if(custom)return <figure className="log-vehicle-photo"><img src={custom} alt="Eigenes Fahrzeugbild" loading="lazy" decoding="async" width="640" height="400" onError={()=>setFailedCustom(old=>[...old,custom])}/>{credits&&<figcaption>Eigenes Fahrzeugbild deiner Spedition</figcaption>}</figure>;
 const p=gallery[id];
 const available=Boolean(p?.path&&p.path!==failedPath);
 return <figure className="log-vehicle-photo">{available?<>
  <img src={p.path} alt={p.alt} loading="lazy" decoding="async" width="640" height="400" onError={()=>setFailedPath(p.path)}/>
  {(credits||p.exactModelPhotoAvailable===false)&&<figcaption>{p.caption}{credits&&<span><a href={p.sourceUrl} target="_blank" rel="noopener noreferrer">Foto: {p.author}</a> · <a href={p.licenseUrl} target="_blank" rel="noopener noreferrer">{p.license}</a>{p.changes?' · '+p.changes:''}</span>}</figcaption>}
 </>:<div className="log-photo-unavailable" role="img" aria-label="Fahrzeugfoto nicht verfügbar">{p?'Foto derzeit nicht verfügbar':'Kein belegtes freies Baureihenfoto verfügbar'}</div>}</figure>;
}
