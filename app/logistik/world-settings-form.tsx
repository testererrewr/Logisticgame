'use client';
import {useMemo,useState} from 'react';
import {CONTINENTS,COUNTRY_NAMES,MODE_GROUPS,DEFAULT_SETTINGS,countriesOfContinent,type WorldSettings,type ModeGroup} from '../../lib/logistics/world-settings';

export function WorldSettingsForm({value,onChange}:{value:WorldSettings;onChange:(v:WorldSettings)=>void}){
 const [query,setQuery]=useState('');
 const set=(patch:Partial<WorldSettings>)=>onChange({...value,...patch});
 const toggleMode=(m:ModeGroup)=>set({modes:value.modes.includes(m)?value.modes.filter(x=>x!==m):[...value.modes,m]});
 const toggleValue=(v:string)=>set({region:{...value.region,values:value.region.values.includes(v)?value.region.values.filter(x=>x!==v):[...value.region.values,v]}});
 const countries=useMemo(()=>COUNTRY_NAMES.filter(n=>n.toLocaleLowerCase('de').includes(query.trim().toLocaleLowerCase('de'))),[query]);
 return <div className="log-world-settings">
  <label>Startkapital neuer Speditionen<input type="number" min={10000} step="any" inputMode="numeric" value={Number.isFinite(value.startCash)?value.startCash:''} onChange={e=>set({startCash:Math.round(e.target.valueAsNumber)})}/><small>{Number.isFinite(value.startCash)?value.startCash.toLocaleString('de-DE',{style:'currency',currency:'EUR',maximumFractionDigits:0}):'Betrag eingeben'}{Number.isFinite(value.startCash)&&value.startCash<10000?' · mindestens 10.000 €':''} · beliebiger Betrag ab 10.000 €</small></label>
  <label className="log-checkbox-label"><input type="checkbox" checked={value.maintenance!==false} onChange={e=>set({maintenance:e.target.checked})}/> Wartung & Pannen für LKW und Transporter (alle 15.000 km warten, zufällige Pannen, seltener Totalverlust)</label>
  <label className="log-checkbox-label"><input type="checkbox" checked={value.fuel!==false} onChange={e=>set({fuel:e.target.checked})}/> Treibstoff- und Energiekosten je km (Diesel, Strom, Kerosin, Schweröl – tägliche Preise)</label>
  <fieldset><legend>Erlaubte Fahrzeugarten</legend>{MODE_GROUPS.map(m=><label key={m.id} className="log-checkbox-label"><input type="checkbox" checked={value.modes.includes(m.id)} onChange={()=>toggleMode(m.id)}/> {m.name}</label>)}{!value.modes.length&&<small role="alert">Mindestens eine Fahrzeugart wählen.</small>}</fieldset>
  <fieldset><legend>Spielregion</legend>
   <div className="log-region-kinds">{([['world','Ganze Welt'],['continents','Kontinente'],['countries','Länder']] as const).map(([k,n])=><label key={k} className="log-checkbox-label"><input type="radio" name="region-kind" checked={value.region.kind===k} onChange={()=>set({region:{kind:k,values:[]}})}/> {n}</label>)}</div>
   {value.region.kind==='continents'&&<div className="log-region-list">{CONTINENTS.map(c=><label key={c} className="log-checkbox-label"><input type="checkbox" checked={value.region.values.includes(c)} onChange={()=>toggleValue(c)}/> {c} <small>({countriesOfContinent(c).length} Länder)</small></label>)}</div>}
   {value.region.kind==='countries'&&<><input placeholder="Land suchen …" value={query} onChange={e=>setQuery(e.target.value)}/><p className="log-help">{value.region.values.length} ausgewählt{value.region.values.length?': '+value.region.values.join(', '):''}</p><div className="log-region-list log-region-countries">{countries.map(c=><label key={c} className="log-checkbox-label"><input type="checkbox" checked={value.region.values.includes(c)} onChange={()=>toggleValue(c)}/> {c}</label>)}</div></>}
   {value.region.kind!=='world'&&!value.region.values.length&&<small role="alert">Mindestens {value.region.kind==='continents'?'einen Kontinent':'ein Land'} wählen.</small>}
   <p className="log-help">Außerhalb der Region ist alles gesperrt: Die Karte ist dort ausgegraut, Betriebe, Aufträge, Bauplätze und Linien gibt es nur innerhalb. Nicht gewählte Länder innerhalb der Region (auch Enklaven) bleiben ebenfalls ausgegraut.</p>
  </fieldset>
 </div>;
}
export const settingsValid=(v:WorldSettings)=>v.modes.length>0&&(v.region.kind==='world'||v.region.values.length>0)&&Number.isFinite(v.startCash)&&v.startCash>=10000&&v.startCash<=1e12;
export const freshSettings=():WorldSettings=>structuredClone(DEFAULT_SETTINGS);
export function SettingsSummary({settings}:{settings?:{startCash:number;modeNames:string[];regionLabel:string;maintenance?:boolean;fuel?:boolean}}){if(!settings)return null;return <dl className="log-world-summary"><div><dt>Wartung & Pannen</dt><dd>{settings.maintenance===false?'aus':'an'}</dd></div><div><dt>Treibstoffkosten</dt><dd>{settings.fuel===false?'aus':'an'}</dd></div><div><dt>Startkapital</dt><dd>{settings.startCash.toLocaleString('de-DE',{style:'currency',currency:'EUR',maximumFractionDigits:0})}</dd></div><div><dt>Fahrzeuge</dt><dd>{settings.modeNames.join(', ')}</dd></div><div><dt>Region</dt><dd>{settings.regionLabel}</dd></div></dl>;}
