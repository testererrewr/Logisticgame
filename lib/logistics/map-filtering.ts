import {demandFor,profile,RECIPES,type Site,type State} from './engine';
export const activeLine=(line:State['lines'][number],day:number)=>line.active&&!line.deleted&&(line.endDay===null||line.endDay>day);
export function servedStationIds(s:State){return new Set(s.lines.filter(l=>activeLine(l,s.day)).flatMap(l=>l.stops.map(st=>st.siteId)));}
export function matchesMapSite(p:Site,query='',good='all'){if(p.hidden||!p.name.toLocaleLowerCase('de').includes(query.trim().toLocaleLowerCase('de')))return false;if(good==='all')return true;const pro=profile(p);return (demandFor(p)[good]||0)>0||!!pro.production[good]||pro.recipes.some(id=>{const r=RECIPES.find(r=>r.id===id);return r?.output===good||!!r?.inputs[good];});}
export function mapClusterKey(p:Site,zoom:number){const scale=256*2**zoom/64,sin=Math.sin(Math.max(-85,Math.min(85,p.lat))*Math.PI/180);return Math.floor((p.lon+180)/360*scale)+':'+Math.floor((.5-Math.log((1+sin)/(1-sin))/(4*Math.PI))*scale);}
