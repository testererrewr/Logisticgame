import {stableHash} from './business-rules';
import {kmBetween,type Coords} from './engine';

export type WeatherKind='storm'|'snow'|'fog'|'rain'|'heat'|'ice';
export interface WeatherCell {id:string;kind:WeatherKind;lat:number;lon:number;radiusKm:number;strength:1|2|3;from:number;until:number}
export const WEATHER:Record<WeatherKind,{name:string;icon:string;color:string;text:string;modes:Partial<Record<string,number>>}>={
 storm:{name:'Sturm',icon:'🌀',color:'#7c3aed',text:'Schiffe und Flugzeuge brauchen länger.',modes:{ship:.35,air:.2,truck:.05,van:.05}},
 snow:{name:'Schneefall',icon:'❄️',color:'#60a5fa',text:'Straße und Schiene langsamer.',modes:{truck:.25,van:.25,rail:.1,air:.1}},
 ice:{name:'Glatteis',icon:'🧊',color:'#93c5fd',text:'Straßenverkehr deutlich langsamer.',modes:{truck:.3,van:.3}},
 fog:{name:'Nebel',icon:'🌫️',color:'#9ca3af',text:'Flug- und Schiffsverkehr verzögert.',modes:{air:.3,ship:.12}},
 rain:{name:'Starkregen',icon:'🌧️',color:'#3b82f6',text:'Leicht verlängerte Fahrzeiten auf der Straße.',modes:{truck:.1,van:.1}},
 heat:{name:'Hitzewelle',icon:'🔥',color:'#f97316',text:'Bahn etwas langsamer (Hitzeschäden an Gleisen).',modes:{rail:.12}},
};

export const SLOT_DAYS=.25;
export const weatherSlot=(day:number)=>Math.floor(day/SLOT_DAYS);
const cache=new Map<number,WeatherCell[]>();
const r01=(k:string)=>(stableHash(k)%100000)/100000;
function seasonOf(day:number,lat:number){const doy=((Math.floor(day)%360)+360)%360,north=doy<90||doy>=300?'winter':doy<150?'spring':doy<240?'summer':'autumn';if(lat>=0)return north;return ({winter:'summer',summer:'winter',spring:'autumn',autumn:'spring'} as const)[north];}
function pickKind(k:string,lat:number,day:number):WeatherKind{const season=seasonOf(day,lat),abs=Math.abs(lat),x=r01(k+'/kind');
 if(abs<23)return x<.45?'storm':x<.75?'rain':x<.9?'heat':'fog';
 if(season==='winter')return abs>35?(x<.35?'snow':x<.5?'ice':x<.7?'fog':x<.85?'storm':'rain'):(x<.4?'rain':x<.6?'fog':x<.8?'storm':'snow');
 if(season==='summer')return abs>50?(x<.5?'rain':x<.8?'fog':'storm'):x<.35?'heat':x<.65?'rain':x<.85?'storm':'fog';
 return x<.4?'rain':x<.65?'fog':x<.85?'storm':abs>45?'snow':'rain';}
export function weatherAt(day:number):WeatherCell[]{const slot=weatherSlot(day),hit=cache.get(slot);if(hit)return hit;const out:WeatherCell[]=[];
 const n=26+stableHash('wx-count/'+slot)%10;
 for(let i=0;i<n;i++){const k='wx/'+slot+'/'+i,lat=Math.asin(2*r01(k+'/lat')-1)*180/Math.PI*.82,lon=r01(k+'/lon')*360-180,kind=pickKind(k,lat,slot*SLOT_DAYS);
  out.push({id:k,kind,lat:Math.round(lat*100)/100,lon:Math.round(lon*100)/100,radiusKm:250+Math.round(r01(k+'/r')*650),strength:(1+stableHash(k+'/s')%3) as 1|2|3,from:slot*SLOT_DAYS,until:(slot+1)*SLOT_DAYS});}
 cache.set(slot,out);if(cache.size>40)cache.delete(cache.keys().next().value!);return out;}

export function weatherFactor(from:Coords,to:Coords,mode:string,day:number,crewLevel=3){let f=1;
 for(const c of weatherAt(day)){const w=WEATHER[c.kind].modes[mode];if(!w)continue;if(kmBetween(from,[c.lat,c.lon])>c.radiusKm&&kmBetween(to,[c.lat,c.lon])>c.radiusKm)continue;f*=1+w*(c.strength/2);}
 const damp=1-.08*(Math.max(1,Math.min(5,crewLevel))-1);return Math.min(1.6,1+(f-1)*damp);}
