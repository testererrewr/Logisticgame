'use client';
import {useEffect,useState} from 'react';
import type {LatLon} from '../lib/real-map';
const cache=new Map<string,string>();
export default function AddressLabel({point,address}:{point:LatLon;address?:string}){const key=point.map(n=>n.toFixed(4)).join(':'),[text,setText]=useState(address||cache.get(key)||'');useEffect(()=>{let live=true;if(address){setText(address);return;}if(cache.has(key)){setText(cache.get(key)!);return;}setText('');const timer=setTimeout(()=>fetch('/api/address?lat='+point[0]+'&lon='+point[1]).then(r=>r.json()).then((d:any)=>{if(d.address){cache.set(key,d.address);if(live)setText(d.address);}}).catch(()=>{}),350);return()=>{live=false;clearTimeout(timer);};},[key,address]);return <p className="site-address">{text||point.map(n=>n.toFixed(5)).join(', ')}<small>Standortadresse aus OpenStreetMap · nächstgelegener Adresseintrag</small></p>;}
