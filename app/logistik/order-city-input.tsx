'use client';
import {useEffect,useId,useState} from 'react';
import {foldOrderCity,matchingOrderCities} from '../../lib/logistics/order-city';
import type {PlaceResult} from '../../lib/places';

export default function OrderCityInput({label,value,options,onChange,country,radius,onPlace}:{label:string;value:string;options:string[];onChange:(value:string)=>void;country:string;radius:string;onPlace:(place:PlaceResult)=>void}){
 const id=useId(),[open,setOpen]=useState(false),[active,setActive]=useState(-1);
 const [places,setPlaces]=useState<PlaceResult[]>([]),[loading,setLoading]=useState(false),[error,setError]=useState('');
 useEffect(()=>{
  setPlaces([]);setError('');setActive(-1);setLoading(false);
  if(!open||value.trim().length<2)return;
  let alive=true;const controller=new AbortController();
  const timer=setTimeout(async()=>{
   setLoading(true);
   try{
    const query=[foldOrderCity(value),country].filter(Boolean).join(', ');
    const response=await fetch('/api/places?q='+encodeURIComponent(query),{signal:controller.signal});
    const data=await response.json();
    if(!response.ok)throw Error(data.error||'Ortssuche gerade nicht erreichbar.');
    if(alive)setPlaces(data.places||[]);
   }catch(e:any){if(alive)setError(e.message);}
   finally{if(alive)setLoading(false);}
  },600);
  return()=>{alive=false;clearTimeout(timer);controller.abort();};
 },[value,country,open]);
 const matches=(value.trim()?matchingOrderCities(options,value):options).slice(0,12);
 const choices=[...matches.map(name=>({name,place:null as PlaceResult|null})),...places.map(place=>({name:place.name,place}))];
 const expanded=open&&(choices.length>0||loading||!!error);
 const choose=(choice:typeof choices[number])=>{if(choice.place)onPlace(choice.place);else onChange(choice.name);setOpen(false);setActive(-1);};
 return <div className="log-order-city"><label htmlFor={id}>{label}</label>
  <input id={id} aria-label={label} role="combobox" autoComplete="off" aria-autocomplete="list" aria-expanded={expanded} aria-controls={id+'-options'} aria-activedescendant={expanded&&active>=0&&active<choices.length?id+'-option-'+active:undefined}
   placeholder="Alle Städte / Stadt suchen" value={value} onFocus={()=>setOpen(true)} onBlur={()=>setOpen(false)}
   onChange={e=>{onChange(e.target.value);setActive(-1);setOpen(true);}}
   onKeyDown={e=>{
    if(e.key==='Escape'){setOpen(false);return;}
    if((e.key==='ArrowDown'||e.key==='ArrowUp')&&choices.length){e.preventDefault();setOpen(true);setActive(i=>e.key==='ArrowDown'?(i+1)%choices.length:(i<=0?choices.length:i)-1);}
    if(e.key==='Enter'&&expanded&&active>=0&&active<choices.length){e.preventDefault();choose(choices[active]);}
   }}/>
  {expanded&&<div id={id+'-options'} role="listbox" aria-label={label+' Vorschläge'} className="log-order-city-options">{choices.map((choice,i)=><div id={id+'-option-'+i} role="option" aria-selected={i===active} key={choice.place?.id||choice.name} onPointerDown={e=>e.preventDefault()} onClick={()=>choose(choice)}>{choice.name}{choice.place&&<small>{choice.place.label}<br/>{Number(radius)>0?radius:25} km Umkreis durchsuchen</small>}</div>)}{loading&&<p role="status">Weitere Orte werden gesucht …</p>}{error&&<p role="status">{error}</p>}</div>}
 </div>;
}
