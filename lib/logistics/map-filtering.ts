import {demandFor,profile,RECIPES,type Site,type State} from './engine';
export const activeLine=(line:State['lines'][number],day:number)=>line.active&&!line.deleted&&(line.endDay===null||line.endDay>day);
export function servedStationIds(s:State){return new Set(s.lines.filter(l=>activeLine(l,s.day)).flatMap(l=>l.stops.map(st=>st.siteId)));}
export function siteMatchesQuery(p:Site,query=''){const q=query.trim().toLocaleLowerCase('de');if(!q)return true;const hay=[p.name,p.kind,...Object.values(p.tags||{})].join(' ').toLocaleLowerCase('de');return q.split(/\s+/).every(w=>hay.includes(w));}
export function matchesMapSite(p:Site,query='',good='all'){if(p.hidden||!siteMatchesQuery(p,query))return false;if(good==='all')return true;const pro=profile(p);return (demandFor(p)[good]||0)>0||!!pro.production[good]||pro.recipes.some(id=>{const r=RECIPES.find(r=>r.id===id);return r?.output===good||!!r?.inputs[good];});}
export function mapClusterKey(p:Site,zoom:number){const scale=256*2**zoom/64,sin=Math.sin(Math.max(-85,Math.min(85,p.lat))*Math.PI/180);return Math.floor((p.lon+180)/360*scale)+':'+Math.floor((.5-Math.log((1+sin)/(1-sin))/(4*Math.PI))*scale);}
