'use client';
import {useState,useRef,useEffect} from 'react';
import {good} from '../../lib/logistics/engine';
const missing=new Set<string>();
export default function ProductImage({id}:{id:string}){
 const [failed,setFailed]=useState(()=>missing.has(id)),ref=useRef<HTMLImageElement>(null);
 useEffect(()=>{const img=ref.current;if(img&&img.complete&&!img.naturalWidth){missing.add(id);setFailed(true);}},[id]);
 if(failed)return <span className="log-product-icon" role="img" aria-label={good(id)?.name||id}>{good(id)?.icon||'📦'}</span>;
 return <img ref={ref} className="log-product-image" src={'/logistics-products/'+id+'.webp'} alt={good(id)?.name||id} loading="lazy" decoding="async" width="64" height="64" onError={()=>{missing.add(id);setFailed(true);}}/>;
}
