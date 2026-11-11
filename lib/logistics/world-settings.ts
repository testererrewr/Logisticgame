import regions from '../../data/country-regions.json';
import type {Mode} from './engine';

export type ModeGroup='road'|'rail'|'ship'|'air';
export const MODE_GROUPS:{id:ModeGroup;name:string}[]=[{id:'road',name:'LKW & Transporter'},{id:'rail',name:'Züge'},{id:'ship',name:'Schiffe'},{id:'air',name:'Flugzeuge'}];
export const DEFAULT_START_CASH=5500000;
export interface WorldRegion {kind:'world'|'continents'|'countries';values:string[]}
export interface WorldSettings {startCash:number;modes:ModeGroup[];region:WorldRegion;maintenance:boolean;fuel:boolean;drivers:boolean;seasonDays:number;testWorld?:boolean}
type RegionData={continents:string[];countries:Record<string,{continents:string[];bbox:[number,number,number,number]}>};
const data=regions as unknown as RegionData;
export const CONTINENTS=data.continents;
export const COUNTRY_NAMES=Object.keys(data.countries).sort((a,b)=>a.localeCompare(b,'de'));
export const countriesOfContinent=(c:string)=>COUNTRY_NAMES.filter(n=>data.countries[n].continents.includes(c));
export const DEFAULT_SETTINGS:WorldSettings={startCash:DEFAULT_START_CASH,modes:['road','rail','ship','air'],region:{kind:'world',values:[]},maintenance:true,fuel:true,drivers:true,seasonDays:0};

export function modeGroup(mode:Mode|string):ModeGroup{return mode==='van'||mode==='truck'?'road':mode==='rail'?'rail':mode==='ship'?'ship':'air';}

export function buildingModeGroup(kind:string):ModeGroup|null{return kind==='depot'?'road':['railDepot','railStation'].includes(kind)?'rail':['shipDepot','inlandPort','port'].includes(kind)?'ship':['airport','regionalAirport','airDepot'].includes(kind)?'air':null;}
export function parseSettings(raw:unknown):WorldSettings{
 let v:any=raw;if(typeof raw==='string'){try{v=JSON.parse(raw||'{}');}catch{v={};}}
 v=v&&typeof v==='object'?v:{};
 const startCash=Number.isFinite(v.startCash)&&v.startCash>=10000&&v.startCash<=1e12?Math.round(v.startCash):DEFAULT_START_CASH;
 const modes=Array.isArray(v.modes)?MODE_GROUPS.map(m=>m.id).filter(m=>v.modes.includes(m)):DEFAULT_SETTINGS.modes;
 const kind=['world','continents','countries'].includes(v.region?.kind)?v.region.kind:'world';
 const pool=kind==='continents'?CONTINENTS:COUNTRY_NAMES;
 const values=kind==='world'||!Array.isArray(v.region?.values)?[]:[...new Set(v.region.values.filter((x:unknown)=>typeof x==='string'&&pool.includes(x)))] as string[];
 return {startCash,modes:modes.length?modes:DEFAULT_SETTINGS.modes,region:kind!=='world'&&values.length?{kind,values}:{kind:'world',values:[]},maintenance:v.maintenance!==false,fuel:v.fuel!==false,drivers:v.drivers!==false,seasonDays:Number.isFinite(v.seasonDays)&&v.seasonDays>0?Math.min(3650,Math.round(v.seasonDays)):0,...(v.testWorld?{testWorld:true}:{})};
}

export function validateSettings(raw:unknown):WorldSettings{
 const v:any=raw&&typeof raw==='object'?raw:{};
 if(v.startCash!==undefined&&(!Number.isFinite(v.startCash)||v.startCash<10000||v.startCash>1e12))throw Error('Startkapital: 10.000 € bis 1 Billion €.');
 if(v.modes!==undefined&&(!Array.isArray(v.modes)||!v.modes.length))throw Error('Mindestens eine Fahrzeugart erlauben.');
 if(v.region&&v.region.kind!=='world'&&(!Array.isArray(v.region.values)||!v.region.values.length))throw Error(v.region.kind==='continents'?'Mindestens einen Kontinent wählen.':'Mindestens ein Land wählen.');
 if(v.seasonDays!==undefined&&v.seasonDays!==0&&(!Number.isFinite(v.seasonDays)||v.seasonDays<1||v.seasonDays>3650))throw Error('Saisonlänge: 1–3650 Tage oder 0 für endlos.');
 return parseSettings(v);
}

export const seasonEndDay=(s:WorldSettings)=>s.seasonDays>0?1+s.seasonDays:null;

export function allowedCountries(s:WorldSettings):Set<string>|null{
 if(s.region.kind==='world')return null;
 if(s.region.kind==='countries')return new Set(s.region.values);
 return new Set(s.region.values.flatMap(countriesOfContinent));
}
export function regionBounds(s:WorldSettings):[number,number,number,number]|null{
 const set=allowedCountries(s);if(!set)return null;let b:[number,number,number,number]|null=null;
 for(const n of set){const x=data.countries[n]?.bbox;if(!x)continue;b=b?[Math.min(b[0],x[0]),Math.min(b[1],x[1]),Math.max(b[2],x[2]),Math.max(b[3],x[3])]:[...x];}
 return b;
}
export function regionLabel(s:WorldSettings){if(s.region.kind==='world')return 'Ganze Welt';const list=s.region.values;return (s.region.kind==='continents'?(list.length===1?'Kontinent: ':'Kontinente: '):(list.length===1?'Land: ':'Länder: '))+(list.length>6?list.slice(0,6).join(', ')+' … (+'+(list.length-6)+')':list.join(', '));}
export function settingsSummary(s:WorldSettings){return {startCash:s.startCash,modes:s.modes,modeNames:MODE_GROUPS.filter(m=>s.modes.includes(m.id)).map(m=>m.name),region:s.region,regionLabel:regionLabel(s),bounds:regionBounds(s),maintenance:s.maintenance,fuel:s.fuel,drivers:s.drivers,seasonDays:s.seasonDays,seasonEnd:seasonEndDay(s),testWorld:!!s.testWorld};}
