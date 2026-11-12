'use client';
import {useEffect,useState} from 'react';
import {CHANGELOG} from '../../lib/logistics/changelog';
import vehicleGallery from '../../data/logistics-vehicle-gallery.json';
import equipmentGallery from '../../data/logistics-equipment-gallery.json';
const TITLE:Record<string,string>={impressum:'Impressum',datenschutz:'Datenschutzerklärung',neuigkeiten:'Was ist neu',bildnachweise:'Bildnachweise'};
function Credits(){const all:any[]=[...Object.entries(vehicleGallery as any),...Object.entries((equipmentGallery as any).trailers||{}),...Object.entries((equipmentGallery as any).wagons||{})].filter(([,p])=>p&&p.sourceUrl).map(([id,p]:any)=>({id,...p}));return <><p>Fahrzeug- und Ausrüstungsfotos stammen von Wikimedia Commons und stehen unter den jeweils genannten freien Lizenzen. Bilder wurden verkleinert und zugeschnitten.</p><table className="log-exchange-table"><thead><tr><th>Bild</th><th>Urheber</th><th>Lizenz</th></tr></thead><tbody>{all.map(p=><tr key={p.id}><td><a href={p.sourceUrl} target="_blank" rel="noopener noreferrer">{p.depicted||p.id}</a></td><td>{p.author||p.attribution||'–'}</td><td>{p.licenseUrl?<a href={p.licenseUrl} target="_blank" rel="noopener noreferrer">{p.license}</a>:p.license||'–'}</td></tr>)}</tbody></table></>;}
function Text({text}:{text:string}){return <>{text.split(/\n{2,}/).map((p,i)=>p.startsWith('# ')?<h2 key={i}>{p.slice(2)}</h2>:p.startsWith('## ')?<h3 key={i}>{p.slice(3)}</h3>:<p key={i} style={{whiteSpace:'pre-line'}}>{p}</p>)}</>;}
export default function LegalPage({kind}:{kind:string}){const [d,setD]=useState<any>(null);
 useEffect(()=>{if(kind==='neuigkeiten'||kind==='bildnachweise')return;fetch('/api/logistik/legal?kind='+kind,{cache:'no-store'}).then(r=>r.json()).then(setD).catch(()=>setD({text:''}));},[kind]);
 return <main className="log-legal"><a href="/" className="log-lobby-brand">WELTVERBUND<span>.</span> <small>LOGISTIK</small></a><h1>{TITLE[kind]||kind}</h1>
  {kind==='bildnachweise'?<Credits/>:kind==='neuigkeiten'?CHANGELOG.map(c=><section key={c.id} className="log-admin-card"><h2>{c.title}</h2><small className="log-muted">{new Date(c.date).toLocaleDateString('de-DE')}</small><ul>{c.items.map(x=><li key={x}>{x}</li>)}</ul></section>)
  :!d?<p>Wird geladen …</p>:d.text?<><Text text={d.text}/>{d.updated>0&&<small className="log-muted">Stand: {new Date(d.updated).toLocaleDateString('de-DE')}</small>}</>:<p className="log-muted">Dieser Text wird gerade erstellt.</p>}
  <nav className="log-legal-nav"><a href="/impressum">Impressum</a> · <a href="/datenschutz">Datenschutz</a> · <a href="/neuigkeiten">Was ist neu</a> · <a href="/bildnachweise">Bildnachweise</a> · <a href="/">Zum Spiel</a></nav></main>;}
