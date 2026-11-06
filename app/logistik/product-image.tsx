'use client';
import {useState,useRef,useEffect} from 'react';
import {good} from '../../lib/logistics/engine';
import photos from '../../data/logistics-product-images.json';
import icons from '../../data/logistics-product-icons-svg.json';
const PHOTO=new Set(photos as string[]),ICON=new Set(icons as string[]);
const missing=new Set<string>();
export default function ProductImage({id}:{id:string}){
 const [failed,setFailed]=useState(()=>missing.has(id)),ref=useRef<HTMLImageElement>(null);
 useEffect(()=>{const img=ref.current;if(img&&img.complete&&!img.naturalWidth){missing.add(id);setFailed(true);}},[id]);
 if(failed){const g=good(id),name=g?.name||id;let h=0;for(const ch of id)h=(h*31+ch.charCodeAt(0))>>>0;const short=name.replace(/\(.*?\)/g,'').split(/[\s/-]+/).filter(Boolean).map(w=>w[0]).join('').slice(0,3).toUpperCase()||name.slice(0,2);return <span className="log-product-icon log-product-fallback" role="img" aria-label={name} title={name} style={{background:`hsl(${h%360} 45% 88%)`}}><span>{g?.icon||'📦'}</span><small>{name.length<=9?name:short}</small></span>;}
 return <img ref={ref} className="log-product-image" src={'/logistics-products/'+id+(PHOTO.has(id)||!ICON.has(id)?'.webp':'.svg')} alt={good(id)?.name||id} loading="lazy" decoding="async" width="64" height="64" onError={()=>{missing.add(id);setFailed(true);}}/>;
}
