'use client';
import {canTransfer} from '../lib/contracts';
import {dailyVehicleProfit} from '../lib/company-metrics';
import {useMoney} from './money-display';
import {worldHref} from '../lib/app-routes';
import {useEffect,useMemo,useRef,useState} from 'react';
import {Crosshair,MapPin,Users,X,Building2} from 'lucide-react';
import {runPlan,type RunPlan,type VehicleRun} from '../lib/operations';
import {vehicleImage,urbanSpeed,vehicleModel,consumptionLabel,type VehicleModel} from '../lib/vehicle-models';
import {liveClock,vehicleTelemetry,callName,durationLabel} from '../lib/vehicle-telemetry';
import {type World,type Company,type Line,linePath} from '../lib/game';
import type {Vehicle} from '../lib/fleet';
type Entry={company:Company;vehicle:Vehicle;line:Line;run:VehicleRun;plan:RunPlan;model:VehicleModel};
type Marker={marker:any;body:HTMLElement;arrow:HTMLElement;badge:HTMLElement;heading:number;entry:Entry};
const silhouettes={bus:'<rect x="8" y="3" width="16" height="26" rx="4"/><path d="M11 7h10v6H11zM11 24h3m4 0h3"/>',train:'<rect x="7" y="2" width="18" height="28" rx="6"/><path d="M10 7h12v6H10zM11 18h10M11 24h10"/>',plane:'<path d="m16 2 3 11 11 7v3l-11-3v6l4 3v2l-7-2-7 2v-2l4-3v-6L2 23v-3l11-7z"/>',ship:'<path d="m16 2 9 10v13l-9 6-9-6V12z"/><path d="M12 12h8v11h-8zM16 6v3"/>'};
export default function LiveVehicles({map,L,world,myId,focusVehicle,foreign=false,onForeignChange,selected,onSelect}:{selected:string;onSelect:(id:string)=>void;foreign?:boolean;onForeignChange?:(value:boolean)=>void;map:any;L:any;world:World;myId:string;focusVehicle?:string}){
 const money=useMoney();const [labels,setLabels]=useState(true),[follow,setFollow]=useState(false),[now,setNow]=useState(Date.now());
 const layer=useRef<any>(null),registry=useRef(new Map<string,Marker>()),current=useRef(world),following=useRef(false),selection=useRef(''),focused=useRef('');
 current.current=world;following.current=follow;selection.current=selected;
 const entries=useMemo(()=>world.state.companies.flatMap(company=>{
  if(company.id!==myId&&!foreign)return [];
  return (company.fleet||[]).flatMap(vehicle=>{const run=world.state.operations?.vehicles[vehicle.id],line=company.lines.find(l=>l.id===vehicle.line);if(!run||!line||!line.active||company.suspended)return [];
   const model=vehicleModel(vehicle,world.state.vehicleCatalog?.models),plan=runPlan(company,line,line.city&&line.mode==='bus'?urbanSpeed(model):model.speed,model.acceleration,model.braking,false,false,model.lengthM||0);
   return plan?[{company,vehicle,run,line,model,plan}]:[];
  });
 }),[world,myId,foreign]);
 useEffect(()=>{try{setLabels(localStorage.getItem('weltverbund-vehicle-labels')!=='false');}catch{}},[]);
 const own=entries.filter(e=>e.company.id===myId),chosen=entries.find(e=>e.vehicle.id===selected),clock=liveClock(world,now),telemetry=chosen&&vehicleTelemetry(chosen.plan,chosen.run,clock.time);
 const onboard=own.reduce((sum,e)=>sum+e.run.onboard.reduce((s,p)=>s+p.count,0),0);
 useEffect(()=>{const timer=setInterval(()=>setNow(Date.now()),selected?250:1000);return()=>clearInterval(timer);},[selected]);
 useEffect(()=>{
  if(!map||!L||!map.getPane('markerPane'))return;
  const group=L.layerGroup().addTo(map);layer.current=group;let frame=0,last=0,lastPan=0,disposed=false;
  const routePane=map.getPane('liveRoutePane')||map.createPane('liveRoutePane');routePane.style.zIndex='450';routePane.style.pointerEvents='none';
  const stopFollowing=()=>setFollow(false);map.on('dragstart',stopFollowing);
  function draw(stamp:number){if(disposed||!map.getPane('mapPane'))return;frame=requestAnimationFrame(draw);if(stamp-last<32)return;last=stamp;
   const time=liveClock(current.current).time;
   for(const record of registry.current.values()){
    const {entry}=record,pose=vehicleTelemetry(entry.plan,entry.run,time);record.marker.setLatLng(pose.point);
    if(pose.heading!==undefined)record.heading=pose.heading;record.arrow.style.transform='rotate('+record.heading+'deg)';
    const root=record.marker.getElement();if(root){root.dataset.motion=pose.status==='Unterwegs'?'moving':'stopped';root.classList.toggle('is-selected',selection.current===entry.vehicle.id);}
    if(selection.current===entry.vehicle.id&&following.current&&stamp-lastPan>250){lastPan=stamp;map.panTo(pose.point,{animate:true,duration:.25,easeLinearity:1,noMoveStart:true});}
   }
  }
  frame=requestAnimationFrame(draw);
  return()=>{disposed=true;cancelAnimationFrame(frame);map.off('dragstart',stopFollowing);registry.current.clear();group.remove();layer.current=null;};
 },[map,L]);
 useEffect(()=>{
  if(!layer.current||!map||!L)return;
  const ids=new Set(entries.map(e=>e.vehicle.id));
  for(const [id,record] of registry.current)if(!ids.has(id)){layer.current.removeLayer(record.marker);registry.current.delete(id);}
  for(const entry of entries){const {vehicle,company,model,run,plan}=entry;
   let record=registry.current.get(vehicle.id);
   if(!record){
    const root=document.createElement('div');root.className='vehicle-symbol';
    const body=document.createElement('span');body.className='vehicle-body';
    const arrow=document.createElement('span');arrow.className='vehicle-direction';arrow.innerHTML='<svg viewBox="0 0 32 32" aria-hidden="true">'+silhouettes[vehicle.mode]+'</svg>';body.appendChild(arrow);root.appendChild(body);
    const badge=document.createElement('span');badge.className='vehicle-load';root.appendChild(badge);
    const point=vehicleTelemetry(plan,run,liveClock(world).time).point;
    const marker=L.marker(point,{zIndexOffset:1200,keyboard:true,icon:L.divIcon({className:'live-vehicle-marker '+(company.id===myId?'own-vehicle':'foreign-vehicle'),html:root,iconSize:[24,24],iconAnchor:[12,12]})}).addTo(layer.current);
    marker.on('click',()=>{onSelect(vehicle.id);setFollow(false);});
    record={marker,body,arrow,badge,heading:0,entry};registry.current.set(vehicle.id,record);
   }
   record.entry=entry;const n=run.onboard.reduce((sum,p)=>sum+p.count,0);
   record.body.style.setProperty('--vehicle-color',/^#[\da-f]{6}$/i.test(company.color)?company.color:'#80d9a3');const badgeText=n+' / '+model.capacity;if(record.badge.textContent!==badgeText)record.badge.textContent=badgeText;const permitted=canTransfer(world.state,myId,company.id);record.badge.hidden=!labels||!permitted;
   const root=record.marker.getElement();if(root){const label=vehicle.name+(permitted?' · '+n+' von '+model.capacity+' Fahrgästen':'');root.title=label;root.setAttribute('aria-label','Fahrzeug '+label);if(permitted){root.dataset.passengers=String(n);root.dataset.capacity=String(model.capacity);}else{delete root.dataset.passengers;delete root.dataset.capacity;}root.dataset.vehicle=vehicle.id;}
  }
 },[entries,map,L,labels,myId,world]);
 useEffect(()=>{if(focusVehicle&&focused.current!==focusVehicle&&entries.some(e=>e.vehicle.id===focusVehicle)){focused.current=focusVehicle;onSelect(focusVehicle);}},[focusVehicle,entries]);
 useEffect(()=>{setFollow(false);},[selected]);
 useEffect(()=>{if(selected&&!entries.some(e=>e.vehicle.id===selected)){onSelect('');setFollow(false);}},[entries,selected]);
 useEffect(()=>{
  if(!chosen||!L||!layer.current)return;
  const paths=[linePath(chosen.company,chosen.line),chosen.line.returnPath||[]].filter(p=>p.length>1);
  const halo=L.polyline(paths,{pane:'liveRoutePane',color:'#fff',weight:9,opacity:.9,interactive:false}).addTo(layer.current),route=L.polyline(paths,{pane:'liveRoutePane',color:'#216c9c',weight:5,opacity:.85,interactive:false}).addTo(layer.current);
  return()=>{halo.remove();route.remove();};
 },[chosen?.vehicle.id,chosen?.plan.signature,map,L]);
 return <>
  <section className="live-control" aria-label="Live-Fahrzeuge">
   <div className="live-control-heading"><span><i className={'live-dot '+(clock.stale?'stale':'')}/><b>Fahrzeuge live</b><small>{own.length} im Einsatz · {onboard} an Bord</small></span></div>
   <div className="live-options"><label><input type="checkbox" checked={labels} onChange={e=>{setLabels(e.target.checked);try{localStorage.setItem('weltverbund-vehicle-labels',String(e.target.checked));}catch{}}}/> Belegung auf Karte</label><label><input type="checkbox" checked={foreign} onChange={e=>onForeignChange?.(e.target.checked)}/> Konkurrenz</label></div>

   <small className={'live-sync '+(clock.stale?'stale':'')}>{clock.stale?'Verbindung verzögert · Positionen warten auf Abgleich':world.state.operations?.backlog?'Server holt Fahrgastwechsel nach …':'Serverabgleich vor '+Math.floor(clock.age/1000)+' Sek. · '+(world.config?.timeScale||1)+'× Weltzeit'}</small>
  </section>
  {chosen&&telemetry&&<section className="live-inspector" aria-label="Live-Fahrzeugdetails">
   <div className="live-inspector-title"><span><i className="live-dot"/> LIVE · {chosen.line.name||'Linie'}</span><button aria-label="Fahrzeugdetails schließen" onClick={()=>{onSelect('');setFollow(false);}}><X size={17}/></button></div>
   <div className="live-inspector-vehicle"><img src={vehicleImage(chosen.model)} alt={chosen.model.name}/><div><h3>{chosen.vehicle.name}</h3><p>{chosen.model.name}</p><small>{chosen.company.name}</small><small>{consumptionLabel(chosen.model)}</small></div></div>
   <a className="small-btn company-link" href={worldHref(world.id,'companies')+'?unternehmen='+encodeURIComponent(chosen.company.id)}><Building2 size={14}/> Zum Unternehmen</a>
   {canTransfer(world.state,myId,chosen.company.id)&&<p className="window-metric"><span>Tagesgewinn</span><b>{money(dailyVehicleProfit(chosen.company,chosen.vehicle.id,clock.time))}</b></p>}<div className="live-inspector-actions"><a className="small-btn" href={worldHref(world.id,chosen.company.id===myId?'lines':'statistics')+'?linie='+encodeURIComponent(chosen.line.id)+'&unternehmen='+encodeURIComponent(chosen.company.id)}>Linie öffnen</a><a className="small-btn" href={worldHref(world.id,'statistics')+'?linie='+encodeURIComponent(chosen.line.id)+'&unternehmen='+encodeURIComponent(chosen.company.id)}>Linienstatistik</a></div><div className="live-speed">{(telemetry.speed||0).toLocaleString('de-DE',{maximumFractionDigits:0})} km/h</div>
   {canTransfer(world.state,myId,chosen.company.id)&&<>   <div className="live-load-heading"><span><Users size={16}/> An Bord · {Math.round(telemetry.onboard/chosen.model.capacity*100)} %</span><b>{telemetry.onboard}<small> / {chosen.model.capacity}</small></b></div>
   <div className="live-load-bar" role="meter" aria-label="Fahrzeugbelegung" aria-valuenow={telemetry.onboard} aria-valuemin={0} aria-valuemax={chosen.model.capacity}><i style={{width:Math.min(100,telemetry.onboard/chosen.model.capacity*100)+'%'}}/></div>
</>}
   <div className="live-journey"><p><span>Richtung</span><strong>{telemetry.direction}</strong></p><b>{telemetry.status==='Halteabgleich'?'Wartet auf Serverabgleich':telemetry.status}</b><p><span>Von</span>{callName(chosen.company,chosen.line,telemetry.previousCall)}</p><p><span>{telemetry.ended?'Endhalt':'Nächster Halt'}</span>{callName(chosen.company,chosen.line,telemetry.nextCall??telemetry.previousCall)}</p>{!telemetry.ended&&<p><span>{telemetry.departureRemaining!==undefined?'Abfahrt in':'Ankunft in'}</span><strong>{durationLabel(telemetry.departureRemaining??telemetry.remaining)}</strong> <small>Weltzeit</small></p>}</div>
   <div className="live-ride-progress"><i style={{width:(telemetry.progress*100)+'%'}}/></div>

   <div className="live-inspector-actions"><button className={follow?'active':''} aria-pressed={follow} onClick={()=>{setFollow(!follow);if(!follow)map?.panTo(telemetry.point,{animate:false});}}><Crosshair size={15}/>{follow?'Verfolgung aktiv':'Fahrzeug verfolgen'}</button><button onClick={()=>map?.fitBounds(L.latLngBounds(linePath(chosen.company,chosen.line)),{padding:[45,45],maxZoom:16})}><MapPin size={15}/> Route</button></div>
   <small className="live-image-credit"><a href={chosen.model.imageSource} target="_blank" rel="noopener noreferrer">{chosen.model.imageCredit}</a> · <a href={chosen.model.imageLicenseUrl} target="_blank" rel="noopener noreferrer">{chosen.model.imageLicense}</a></small>
  </section>}
 </>;
}
