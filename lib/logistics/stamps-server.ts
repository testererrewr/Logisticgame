import {countryAt} from '../countries-server';
import {log,type State} from './engine';
import {ISLANDS,continentOf} from './stamps-data';
import {ensureProgress} from './progression';
const cache=new Map<string,string>();
const countryOf=(id:string,lat:number,lon:number)=>{let c=cache.get(id);if(c===undefined){c=countryAt([lat,lon]);cache.set(id,c);if(cache.size>200000)cache.clear();}return c;};

const seen=new Map<string,string>();
export function stampCountries(states:Map<string,State>){if(seen.size>500000)seen.clear();for(const s of states.values()){let p,byId:Map<string,State['sites'][number]>|undefined;for(const v of s.vehicles){if(v.status==='enroute'||!v.locationId||seen.get(v.id)===v.locationId)continue;seen.set(v.id,v.locationId);byId??=new Map(s.sites.map(x=>[x.id,x]));const site=byId.get(v.locationId);if(!site)continue;const c=countryOf(site.id,site.lat,site.lon);p??=ensureProgress(s);const stamps=p.stamps??={};
  if(c!=='Nicht zugeordnet'&&stamps[c]===undefined){stamps[c]=Math.floor(s.day);log(s,`🛂 Neuer Länderstempel: ${c}${continentOf(c)?' ('+continentOf(c)+')':''} – ${Object.keys(stamps).length} Länder im Stempelpass.`,'good');}
  const isl=ISLANDS.find(i=>site.lat>=i.box[0]&&site.lat<=i.box[1]&&site.lon>=i.box[2]&&site.lon<=i.box[3]);if(isl){const is=p.islands??={};if(is[isl.id]===undefined){is[isl.id]=Math.floor(s.day);log(s,`🏝️ Inselstempel: ${isl.name}!`,'good');}}}}}
