'use client';
import {bindInfrastructure,sharedCompany} from '../lib/infrastructure-context';
import {useEffect,useRef,useState} from 'react';
import {pageNavigation} from './page-navigation';
import LineWindow,{newDraft,draftPoints,type LineDraft} from './line-window';
import WorldCanvas from './world-canvas';
import {worldHref} from '../lib/app-routes';
import type {LatLon} from '../lib/real-map';
import type {World,Action} from '../lib/game';
export default function LinesPage({world,myId,startStop='',lineId='',onAction,onData,busy,debug=false}:{debug?:boolean;world:World;myId:string;lineId?:string;startStop?:string;onAction:(a:Action)=>Promise<any>;onData:()=>void;busy:boolean}){
 bindInfrastructure(world.state);const initialFocus=useRef(false);
 const router=pageNavigation,company=world.state.companies.find(c=>c.id===myId)!,storageKey='weltverbund-line-draft-v2:'+world.id+':'+myId;
 const [draft,setDraft]=useState<LineDraft|null>(null),[ready,setReady]=useState(false),[preview,setPreview]=useState<LatLon[]>([]),[back,setBack]=useState<LatLon[]>([]),[focus,setFocus]=useState<{point?:LatLon;path?:LatLon[];key:string}>();
 useEffect(()=>{const stop=sharedCompany(company).stops?.find(s=>s.id===startStop);if(stop){setDraft(draftPoints(newDraft(company.lines.length+1),[{kind:'stop',stopId:stop.id}]));setFocus({point:stop.point,key:stop.id});}else{try{const current=sessionStorage.getItem(storageKey),legacy=!current,saved=JSON.parse(current||sessionStorage.getItem(storageKey.replace('draft-v2:','draft:'))||'null');if(saved&&Array.isArray(saved.routePoints)&&typeof saved.name==='string'&&['bus','train','plane','ship'].includes(saved.mode))setDraft({...newDraft(),...saved,facilityIds:saved.facilityIds||[saved.fromFacility,saved.toFacility].filter(Boolean),fare:legacy?(saved.fare||1)*(saved.mode==='bus'?2.5:saved.mode==='train'?3.2:8):saved.fare,routeMode:saved.routeMode==='outbound'?'shuttle':saved.routeMode||'shuttle'});}catch{}}setReady(true);},[storageKey,startStop]);
 useEffect(()=>{if(!ready)return;try{if(draft)sessionStorage.setItem(storageKey,JSON.stringify(draft));else sessionStorage.removeItem(storageKey);}catch{}},[storageKey,ready,draft]);

 if(!ready)return <div className="page-empty" role="status">Linienverwaltung wird geladen …</div>;
 return <div className={'lines-page '+(draft?'with-editor':'')}><div className="lines-page-manager"><LineWindow focusLine={lineId} presentation="page" world={world} myId={myId} draft={draft} setDraft={setDraft} onClose={()=>router.push(worldHref(world.id,'network'))} onAction={onAction} onPreview={(path,reverse)=>{setPreview(path);setBack(reverse||[]);}} onOpenDepots={id=>router.push(worldHref(world.id,'fleet')+(id?'?depot='+encodeURIComponent(id):''))} onFocusStop={stop=>setFocus({point:stop.point,key:stop.id+':'+Date.now()})} onShowLine={line=>router.push(worldHref(world.id,'network')+'?linie='+encodeURIComponent(line.id))}/></div>{draft&&<div className="lines-page-map"><div className="planning-note"><b>Linienplanung auf echten Straßen</b><span>{draft.mode==='bus'?'Haltestellen anklicken · Wegpunkte optional':'Stationen auf der Karte anklicken'}</span></div><WorldCanvas debug={debug} world={world} myId={myId} busy={busy} onAction={onAction} onData={onData} planner={{draft,setDraft,preview,back}} focusTarget={focus} onOpenFleet={()=>router.push(worldHref(world.id,'fleet'))}/></div>}</div>;
}
