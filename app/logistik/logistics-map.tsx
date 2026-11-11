'use client';
import React,{useEffect,useRef,useState} from 'react';
import {kindIcon,VEHICLES,type Coords,type Line,type Site,type Track,type Vehicle} from '../../lib/logistics/engine';

import {gridBounds,placement,gridOverlaps,type BuildGrid} from '../../lib/logistics/build-grid';
import {tileAt,tileCenter} from '../../lib/geography';
import {mapBounds} from '../../lib/real-map';
import {weatherAt,weatherSlot,WEATHER} from '../../lib/logistics/weather';
import {useProjects} from './seasonal-store';
const htmlText=(s:string)=>s.replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]||c));
export default function LogisticsMap({brand=null,region=null,sites,selected,visible,lines,vehicles,tracks,borrowedTracks,buildMode,trackStart,flyTo,onSelect,onPosition,onGroundClick,day,simEpoch,pendingGrid,layoutKey,previewError,pendingTrack,routeStops,routeEligible,showOwned=false,alwaysVisible=[],onVehicle,highlighted=[],hiddenSiteIds=[],clusters=[],onCluster}:{
 simEpoch?:number;brand?:{primary:string;secondary:string}|null;region?:{rings:number[][][];bounds:[number,number,number,number]}|null;hiddenSiteIds?:string[];highlighted?:string[];clusters?:{id:string;lat:number;lon:number;count:number;kind:string}[];onCluster?:(p:Coords)=>void;onVehicle?:(id:string)=>void;alwaysVisible?:string[];showOwned?:boolean;previewError?:boolean;pendingTrack?:Coords[];routeStops?:string[];routeEligible?:string[];pendingGrid?:BuildGrid|null;layoutKey?:string;day:number;sites:Site[];selected:string;visible:string[];lines:Line[];vehicles:Vehicle[];tracks:Track[];borrowedTracks:Track[];buildMode:string;trackStart:Coords|null;flyTo:{point:Coords;zoom:number;key:number}|null;onSelect:(id:string)=>void;onPosition:(p:Coords,zoom:number)=>void;onGroundClick:(p:Coords)=>void;
}){
 const [mapReady,setMapReady]=useState(false),[mapEpoch,setMapEpoch]=useState(0);
 const weatherLayer=useRef<any>(null),weatherControl=useRef<any>(null),[showWeather,setShowWeather]=useState(()=>{try{return localStorage.getItem('log-weather')!=='0';}catch{return true;}}),slot=weatherSlot(day);
 useEffect(()=>{const L=LRef.current,map=mapRef.current;if(!mapReady||!L||!map)return;
  if(!weatherControl.current||weatherControl.current._map!==map){const C=L.Control.extend({onAdd(){const b=L.DomUtil.create('button','log-weather-toggle');b.type='button';b.title='Wetter ein-/ausblenden';L.DomEvent.disableClickPropagation(b);b.onclick=()=>setShowWeather(v=>{const n=!v;try{localStorage.setItem('log-weather',n?'1':'0');}catch{}window.dispatchEvent(new CustomEvent('log-display-change'));return n;});return b;}});weatherControl.current=new C({position:'topright'}).addTo(map);}
  const btn=weatherControl.current.getContainer?.();if(btn)btn.textContent=showWeather?'⛅ Wetter an':'⛅ Wetter aus';
  weatherLayer.current?.remove();weatherLayer.current=null;if(!showWeather)return;
  if(!map.getPane('log-weather')){const pane=map.createPane('log-weather');pane.style.zIndex='350';pane.style.pointerEvents='none';}
  const layer=L.layerGroup().addTo(map);weatherLayer.current=layer;const hours=(c:any)=>Math.max(0,Math.round((c.until-day)*24));
  for(const c of weatherAt(day)){const w=WEATHER[c.kind as keyof typeof WEATHER];for(const shift of [-360,0,360]){const center=[c.lat,c.lon+shift];
   L.circle(center,{radius:c.radiusKm*1000,pane:'log-weather',interactive:false,stroke:true,weight:1,color:w.color,opacity:.45,fillColor:w.color,fillOpacity:.08+.05*c.strength}).addTo(layer);
   L.marker(center,{interactive:true,keyboard:false,icon:L.divIcon({className:'log-weather-icon',html:'<span>'+w.icon+'</span>',iconSize:[28,28],iconAnchor:[14,14]})}).addTo(layer).bindTooltip(htmlText(w.name+' · Stärke '+c.strength+'/3 · noch ca. '+hours(c)+' Std.')+'<br>'+htmlText(w.text),{direction:'top'});}}
  return()=>{weatherLayer.current?.remove();weatherLayer.current=null;};},[mapReady,mapEpoch,slot,showWeather]);
 const animLayer=useRef<any>(null);
 useEffect(()=>{const L=LRef.current,map=mapRef.current;if(!mapReady||!L||!map)return;if(typeof window!=='undefined'&&window.matchMedia?.('(prefers-reduced-motion: reduce)').matches)return;
  const own=sites.filter(p=>p.owned&&['port','inlandPort','shipDepot','airport','regionalAirport','airDepot'].includes(p.kind));if(!own.length)return;
  const draw=()=>{animLayer.current?.remove();animLayer.current=null;if(map.getZoom()<12)return;const b=map.getBounds(),vis=own.filter(p=>b.contains([p.lat,p.lon])).slice(0,20);if(!vis.length)return;const g=L.layerGroup().addTo(map);
   for(const p of vis){const air=['airport','regionalAirport','airDepot'].includes(p.kind);L.marker([p.lat,p.lon],{interactive:false,keyboard:false,icon:L.divIcon({className:'log-anim-marker',html:air?'<span class="log-anim-plane">✈️</span>':'<span class="log-anim-crane">🏗️</span>',iconSize:[40,40],iconAnchor:air?[-6,34]:[-4,30]})}).addTo(g);}
   animLayer.current=g;};
  draw();map.on('zoomend moveend',draw);return()=>{map.off('zoomend moveend',draw);animLayer.current?.remove();animLayer.current=null;};},[mapReady,mapEpoch,sites]);
 const projects=useProjects(),projectLayer=useRef<any>(null);
 useEffect(()=>{const L=LRef.current,map=mapRef.current;projectLayer.current?.remove();projectLayer.current=null;if(!mapReady||!L||!map)return;const list=projects.filter((p:any)=>p.kind!=='holiday'&&(p.status==='active'||p.status==='done'));if(!list.length)return;const g=L.layerGroup().addTo(map);
  for(const p of list){const done=p.status==='done',color=p.kind==='rescue'?'#ef4444':'#d4af37';if(!done)L.circle([p.lat,p.lon],{radius:p.radiusKm*1000,interactive:false,color,weight:1,dashArray:'6 6',fillOpacity:.04}).addTo(g);
   L.marker([p.lat,p.lon],{icon:L.divIcon({className:'log-project-marker',html:'<span>'+(p.kind==='rescue'?'🆘':done?'🏛️':'🏗️')+'</span>',iconSize:[34,34],iconAnchor:[17,17]})}).addTo(g).bindTooltip(htmlText(p.name)+'<br>'+(done?'Fertiggestellt'+(p.top?.length?' · Dank an '+htmlText(p.top.map((t:any)=>t.name).join(', ')):''):'Lieferradius '+p.radiusKm+' km · Details in der Auftragsbörse'),{direction:'top'});}
  projectLayer.current=g;return()=>{g.remove();};},[mapReady,mapEpoch,projects]);
 const [dayNight,setDayNight]=useState(()=>{try{return localStorage.getItem('log-daynight')!=='0';}catch{return true;}}),nightLayer=useRef<any>(null),nightStep=Math.floor(day*96);
 useEffect(()=>{const on=()=>{try{setDayNight(localStorage.getItem('log-daynight')!=='0');setShowWeather(localStorage.getItem('log-weather')!=='0');}catch{}};window.addEventListener('log-display-change',on);return()=>window.removeEventListener('log-display-change',on);},[]);
 useEffect(()=>{const L=LRef.current,map=mapRef.current;nightLayer.current?.remove();nightLayer.current=null;if(!mapReady||!L||!map||!dayNight)return;
  if(!map.getPane('log-night')){const pane=map.createPane('log-night');pane.style.zIndex='340';pane.style.pointerEvents='none';}
  const rad=Math.PI/180,doy=((Math.floor(day)%360)+360)%360*365/360,dec=-23.44*Math.cos(2*Math.PI/365*(doy+10)),hour=simEpoch!=null?(((simEpoch+(day-1)*86400000)%86400000)+86400000)%86400000/3600000:new Date().getUTCHours()+new Date().getUTCMinutes()/60,sunLon=-(hour-12)*15,tanD=Math.tan((Math.abs(dec)<.1?.1:dec)*rad);
  const line:number[][]=[];for(let lon=-180;lon<=180;lon+=2){const lat=Math.atan(-Math.cos((lon-sunLon)*rad)/tanD)/rad;line.push([lat,lon]);}
  const pole=dec>0?-90:90,ring=[...line,[pole,180],[pole,-180]],group=L.layerGroup().addTo(map);
  for(const shift of [-360,0,360])L.polygon(ring.map(([a,b])=>[a,b+shift]),{pane:'log-night',interactive:false,stroke:false,fillColor:'#020617',fillOpacity:.32}).addTo(group);
  nightLayer.current=group;return()=>{group.remove();};},[mapReady,mapEpoch,dayNight,nightStep,simEpoch]);const maskLayer=useRef<any>(null);
 useEffect(()=>{const L=LRef.current,map=mapRef.current;if(!mapReady||!L||!map)return;if(maskLayer.current){maskLayer.current.remove();maskLayer.current=null;}map.setMaxBounds(null);if(!region?.rings?.length)return;if(!map.getPane('log-region'))map.createPane('log-region').style.zIndex='350';const world=[[-89.9,-720],[89.9,-720],[89.9,720],[-89.9,720]];maskLayer.current=L.polygon([world,...region.rings],{pane:'log-region',renderer:L.svg({pane:'log-region'}),fillRule:'evenodd',stroke:false,fillColor:'#4b5563',fillOpacity:.8,interactive:true,bubblingMouseEvents:false}).addTo(map);maskLayer.current.bindTooltip('Außerhalb der Spielregion dieser Welt',{sticky:true});if(region.bounds){const [s,w,n,e]=region.bounds,pad=Math.max(2,(n-s)*.25,(e-w)*.25);map.setMaxBounds([[Math.max(-85,s-pad),w-pad],[Math.min(85,n+pad),e+pad]]);}},[mapReady,region]);const gridLayer=useRef<any>(null),vehicleLayer=useRef<any>(null),hoverLayer=useRef<any>(null);
 const holder=useRef<HTMLDivElement>(null),mapRef=useRef<any>(null),LRef=useRef<any>(null),layers=useRef<any>(null),cb=useRef({onSelect,onPosition,onGroundClick,buildMode,sites,pendingGrid,trackStart});
 cb.current={onSelect,onPosition,onGroundClick,buildMode,sites,pendingGrid,trackStart};
 useEffect(()=>{let active=true,resize:ResizeObserver|undefined;
  import('leaflet').then(L=>{if(!active||!holder.current)return;LRef.current=L;
   const map=L.map(holder.current,{minZoom:2,maxZoom:19,preferCanvas:true,worldCopyJump:true,zoomControl:false}).setView([47.07,15.44],11);mapRef.current=map;
   L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png',{maxZoom:19,attribution:'© <a href="https://www.openstreetmap.org/copyright" target="_blank" rel="noopener">OpenStreetMap</a> contributors'}).addTo(map);
   L.control.zoom({position:'bottomright'}).addTo(map);L.control.scale({imperial:false,position:'bottomright'}).addTo(map);
   layers.current=L.layerGroup().addTo(map);gridLayer.current=L.layerGroup().addTo(map);vehicleLayer.current=L.layerGroup().addTo(map);hoverLayer.current=L.layerGroup().addTo(map);setMapReady(true);
   map.on('moveend',()=>{setMapEpoch(n=>n+1);const c=map.getCenter();cb.current.onPosition([c.lat,c.lng],map.getZoom());});
   map.on('zoomend moveend',()=>{if(gridLayer.current)drawGrid();});
   function drawGrid(){const layer=gridLayer.current;layer.clearLayers();if(!cb.current.buildMode||map.getZoom()<14)return;const c=map.getCenter(),b=mapBounds(...tileCenter(tileAt([c.lat,c.lng]))!);for(let n=0;n<=80;n++){L.polyline([[b.south+n*b.dLat,b.west],[b.south+n*b.dLat,b.west+80*b.dLon]],{color:'#76c8bc',weight:1,opacity:.38,interactive:false}).addTo(layer);L.polyline([[b.south,b.west+n*b.dLon],[b.south+80*b.dLat,b.west+n*b.dLon]],{color:'#76c8bc',weight:1,opacity:.38,interactive:false}).addTo(layer);}}
   map.on('log-build-change',drawGrid);
   map.on('click',(e:any)=>cb.current.onGroundClick([e.latlng.lat,e.latlng.lng]));
   map.on('mousemove',(e:any)=>{
    const c=cb.current,layer=hoverLayer.current;layer.clearLayers();if(!c.buildMode||c.pendingGrid)return;
    const point:Coords=[e.latlng.lat,e.latlng.lng];
    if(c.buildMode==='rail'){if(c.trackStart)L.polyline([c.trackStart,point],{color:'#5ff2bc',weight:5,dashArray:'8 5',interactive:false}).addTo(layer);return;}
    try{const plan=placement(point,c.buildMode as any,0),blocked=c.sites.some(x=>x.owned&&x.grid&&gridOverlaps(plan.grid,x.grid));
     L.rectangle(gridBounds(plan.grid),{color:blocked?'#ff6f72':'#05b882',weight:3,fillColor:blocked?'#ff6f72':'#29e8ab',fillOpacity:.35,interactive:false}).addTo(layer);L.tooltip({permanent:true,direction:'top',className:'log-preview-label'}).setLatLng(L.latLngBounds(gridBounds(plan.grid)).getCenter()).setContent(blocked?'Baufläche belegt':'Bauvorschau · klicken zum Platzieren').addTo(layer);
    }catch{L.circleMarker(point,{radius:15,color:'#ff6f72',weight:3,interactive:false}).addTo(layer);L.tooltip({permanent:true}).setLatLng(point).setContent('Außerhalb der Baukacheln').addTo(layer);}
   });
   map.on('mouseout',()=>hoverLayer.current?.clearLayers());
   resize=new ResizeObserver(()=>{if(holder.current&&holder.current.clientWidth>0&&holder.current.clientHeight>0)requestAnimationFrame(()=>map.invalidateSize({pan:false}));});resize.observe(holder.current);
  });return()=>{active=false;resize?.disconnect();mapRef.current?.remove();mapRef.current=null;};},[]);
 useEffect(()=>{hoverLayer.current?.clearLayers();},[pendingGrid,trackStart]);
 const appliedFlyKey=useRef<number|null>(null);
 useEffect(()=>{if(!flyTo||appliedFlyKey.current===flyTo.key||!flyTo.point.every(Number.isFinite))return;const frame=requestAnimationFrame(()=>{const map=mapRef.current;if(!map||!holder.current?.clientWidth||!holder.current?.clientHeight)return;appliedFlyKey.current=flyTo.key;map.stop();map.invalidateSize({pan:false});map.setView(flyTo.point,flyTo.zoom,{animate:false});});return()=>cancelAnimationFrame(frame);},[flyTo,mapReady,layoutKey]);
 useEffect(()=>{holder.current?.classList.toggle('log-leaflet-building',!!buildMode);const map=mapRef.current;if(map){hoverLayer.current?.clearLayers();map.fire('log-build-change');requestAnimationFrame(()=>map.invalidateSize({pan:false}));}},[buildMode,layoutKey,mapReady]);
 useEffect(()=>{const L=LRef.current,map=mapRef.current,layer=layers.current;if(!L||!map||!layer)return;layer.clearLayers();
  const lookup=new Map(sites.map(s=>[s.id,s]));const show=new Set(visible),related=new Set(alwaysVisible),partners=new Set(highlighted),hidden=new Set(hiddenSiteIds);
  for(const t of borrowedTracks)L.polyline([t.from,t.to],{color:'#7cb6ea',weight:4,opacity:.8,dashArray:'4 9'}).addTo(layer).bindTooltip('Freigegebene Gleise einer anderen Spedition');
  for(const t of tracks)L.polyline([t.from,t.to],{color:'#f7b553',weight:5,opacity:.9,dashArray:'11 6',bubblingMouseEvents:false}).addTo(layer).bindTooltip('Eigenes Gleis').on('click',(e:any)=>{if(cb.current.buildMode==='rail')cb.current.onGroundClick([e.latlng.lat,e.latlng.lng]);});
  for(const line of lines){const geometry=line.legs?.length?line.legs.map(l=>l.path):[line.stops.map(x=>lookup.get(x.siteId)).filter(Boolean).map(x=>[x!.lat,x!.lon])];
    for(const path of geometry){if(path.length<2)continue;const source=line.legs?.[0]?.source||'naeherung';
      L.polyline(path,{color:line.mode==='rail'?'#d5993e':line.active?'#2ed4b3':'#7f8c9c',weight:line.active?4:2,opacity:.8,dashArray:source==='naeherung'?'6 8':line.mode==='ship'?'7 9':undefined}).addTo(layer).bindTooltip(`${htmlText(line.name)} · ${source==='eigene-gleise'?'eigene Gleise':source==='osm-strassen'?'OSM-Straßenroute':source==='luftlinie'?'Flugdistanz':'geschätzte Route'}`);
    }}
  if(trackStart){L.circleMarker(trackStart,{radius:9,color:'#f6c56d',fillColor:'#f6c56d',fillOpacity:.7}).addTo(layer).bindTooltip('Gleisstart');}
  if(pendingGrid){L.rectangle(gridBounds(pendingGrid),{color:previewError?'#ff6f72':'#00a878',weight:4,fillColor:previewError?'#ff6f72':'#29e8ab',fillOpacity:.4,interactive:false}).addTo(layer);L.tooltip({permanent:true,direction:'top',className:'log-preview-label'}).setLatLng(L.latLngBounds(gridBounds(pendingGrid)).getCenter()).setContent(previewError?'Baufläche nicht verfügbar':'Geplante Baufläche · noch nicht gebaut').addTo(layer);}
  if(pendingTrack){L.polyline(pendingTrack,{color:previewError?'#ff6f72':'#00a878',weight:6,dashArray:'8 5',interactive:false}).addTo(layer);pendingTrack.forEach((p,i)=>L.circleMarker(p,{radius:5,color:'#5ff2bc',fillOpacity:.9,interactive:false}).addTo(layer).bindTooltip('Planpunkt '+(i+1)));}
  if(routeStops?.length){const points=routeStops.map(id=>lookup.get(id)).filter(Boolean).map(p=>[p!.lat,p!.lon]);if(points.length>1)L.polyline(points as any,{color:'#6d55dd',weight:4,dashArray:'5 7',interactive:false}).addTo(layer);}
  for(const c of clusters){if(c.count===1){L.circleMarker([c.lat,c.lon],{radius:4,color:'#16857b',fillColor:'#2ed4b3',fillOpacity:.85,bubblingMouseEvents:false}).addTo(layer).bindTooltip('Ein gespeicherter Betrieb · zum Vergrößern klicken').on('click',()=>onCluster?.([c.lat,c.lon]));continue;}const icon=L.divIcon({className:'log-marker-wrap',html:`<span class="log-cluster-marker">${c.count.toLocaleString('de-DE')}</span>`,iconSize:[32,32],iconAnchor:[16,16]});L.marker([c.lat,c.lon],{icon}).addTo(layer).bindTooltip('Gespeicherte Betriebe · klicken zum Vergrößern').on('click',()=>onCluster?.([c.lat,c.lon]));}
  const selectSite=(site:Site)=>{if(cb.current.buildMode){cb.current.onGroundClick([site.lat,site.lon]);return;}const pt=map.latLngToContainerPoint([site.lat,site.lon]);const nearby=sites.filter(p=>!p.hidden&&!hidden.has(p.id)&&(p.owned?showOwned||related.has(p.id):show.has(p.id))&&(!routeEligible||routeEligible.includes(p.id)||related.has(p.id))&&map.latLngToContainerPoint([p.lat,p.lon]).distanceTo(pt)<(p.owned&&site.owned?26:8));if(nearby.length<2){cb.current.onSelect(site.id);return;}const box=document.createElement('div');box.className='log-site-chooser';const heading=document.createElement('strong');heading.textContent='Standort auswählen';box.appendChild(heading);const choices=[site,...nearby.filter(p=>p.id!==site.id).sort((a,b)=>Number(!!b.owned)-Number(!!a.owned))].slice(0,35);for(const p of choices){const button=document.createElement('button');button.type='button';button.textContent=p.name;button.onclick=()=>{map.closePopup();cb.current.onSelect(p.id);};box.appendChild(button);}L.DomEvent.disableClickPropagation(box);L.popup({maxWidth:280,maxHeight:280}).setLatLng([site.lat,site.lon]).setContent(box).openOn(map);};
  const viewport=map.getBounds().pad(.15);
  for(const site of sites){if(!viewport.contains([site.lat,site.lon])&&!(site.owned&&site.grid&&viewport.intersects(L.latLngBounds(gridBounds(site.grid)))))continue;if(hidden.has(site.id)||site.hidden||(site.owned?!showOwned&&!related.has(site.id):!show.has(site.id)))continue;if(routeEligible&&!routeEligible.includes(site.id)&&!related.has(site.id))continue;
   if(site.owned&&site.grid)L.rectangle(gridBounds(site.grid),{color:'#f6c66e',weight:2,fillOpacity:.23,bubblingMouseEvents:false}).addTo(layer).bindTooltip(htmlText(site.name)).on('click',()=>selectSite(site));
   const active=site.id===selected;if(!site.owned&&map.getZoom()<15){const dot=L.circleMarker([site.lat,site.lon],{radius:active?7:4,weight:active?3:1,bubblingMouseEvents:false,color:active?'#6d55dd':partners.has(site.id)?'#d89334':'#116d61',fillColor:partners.has(site.id)?'#f2bc60':'#26ad91',fillOpacity:.8}).addTo(layer).bindTooltip(htmlText(site.name));dot.on('click',()=>selectSite(site));continue;}const icon=L.divIcon({className:'log-marker-wrap',html:`<span class="log-marker ${active?'log-marker-selected':''} ${site.owned?'log-marker-owned':''} ${partners.has(site.id)?'log-marker-partner':''}">${routeStops?.includes(site.id)?routeStops.map((id,i)=>id===site.id?i+1:null).filter(Boolean).join('·'):kindIcon[site.kind]}</span>`,iconSize:[32,32],iconAnchor:[16,16]});
   const marker=L.marker([site.lat,site.lon],{icon,title:site.name,alt:site.name,zIndexOffset:active?900:site.owned?150:0}).addTo(layer);
   marker.bindTooltip(`${htmlText(site.name)} · ${site.cooperative?'Partnerterminal':site.kind}`,{direction:'top',offset:[0,-17]});marker.on('click',()=>selectSite(site));
  }
 },[sites,selected,visible,lines,tracks,borrowedTracks,trackStart,pendingGrid,previewError,pendingTrack,routeStops,routeEligible,showOwned,alwaysVisible,highlighted,hiddenSiteIds,mapReady,mapEpoch,clusters,onCluster]);
 useEffect(()=>{const L=LRef.current,map=mapRef.current,layer=vehicleLayer.current;if(!L||!map||!layer)return;layer.clearLayers();const lookup=new Map(sites.map(s=>[s.id,s]));
  for(const v of vehicles){const origin=lookup.get(v.locationId);if(!origin)continue;
   let position:[number,number]=[origin.lat,origin.lon];
   if((v.status==='enroute'||v.status==='returning')&&v.targetId&&v.etaDay&&v.departDay!==undefined){const target=lookup.get(v.targetId),line=lines.find(l=>l.id===v.lineId);const route=v.currentLeg||line?.legs?.find(l=>l.fromId===origin.id&&l.toId===target?.id);const path=route?.path;
     const progress=Math.max(0,Math.min(1,(day-v.departDay)/(v.etaDay-v.departDay)));
     if(path&&path.length>1){const distances=path.slice(1).map((p,i)=>Math.hypot((p[0]-path[i][0])*111,(p[1]-path[i][1])*111*Math.cos(p[0]*Math.PI/180)));const total=distances.reduce((a,b)=>a+b,0);let remaining=progress*total;for(let i=0;i<distances.length;i++){if(remaining<=distances[i]||i===distances.length-1){const frac=distances[i]?remaining/distances[i]:0;position=[path[i][0]+(path[i+1][0]-path[i][0])*frac,path[i][1]+(path[i+1][1]-path[i][1])*frac];break;}remaining-=distances[i];}}
     else if(target&&['ship','air'].includes(VEHICLES.find(m=>m.id===v.modelId)?.mode||''))position=[origin.lat+(target.lat-origin.lat)*progress,origin.lon+(target.lon-origin.lon)*progress];
   }
   const icon=L.divIcon({className:'log-marker-wrap',html:`<span class="log-vehicle-marker">${VEHICLES.find(x=>x.id===v.modelId)?.icon||'📦'}</span>`,iconSize:[27,27],iconAnchor:[13,13]});L.marker(position,{icon,zIndexOffset:onVehicle?650:0,interactive:!!onVehicle}).addTo(layer).bindTooltip(htmlText(`${v.name||VEHICLES.find(m=>m.id===v.modelId)?.name} · ${v.restReason||v.status}`)).on('click',()=>onVehicle?.(v.id));}
 },[vehicles,lines,sites,day,mapReady,onVehicle,brand?.primary,brand?.secondary]);
 return <div ref={holder} className="log-leaflet" aria-label="Interaktive Weltkarte mit echten Unternehmen und eigener Infrastruktur"/>;
}
