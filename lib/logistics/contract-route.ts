import {RECIPES,good,kmBetween,type State,type Contract,type Stop} from './engine';
export function contractDistance(s:State,c:Contract){const a=s.sites.find(p=>p.id===c.siteId),b=s.sites.find(p=>p.id===c.destinationId);return a&&b?kmBetween([a.lat,a.lon],[b.lat,b.lon]):null;}
export function contractRouteDraft(s:State,c:Contract){
 if(c.cancelled||c.endDay<=s.day||c.kind==='haulage'&&c.delivered>=(c.total||Infinity))throw Error('Dieser Vertrag ist nicht mehr aktiv.');
 const product=c.good||RECIPES.find(r=>r.id===c.recipeId)?.output||'all';
 const source=s.sites.find(p=>p.id===c.siteId),dest=s.sites.find(p=>p.id===c.destinationId);
 const stops:Stop[]=[{siteId:c.siteId,action:'load',good:product,quantity:1e9,...(c.kind==='haulage'?{orderIds:[c.id]}:{})},{siteId:dest?.id||'',action:'unload',good:product,quantity:1e9}];
 return {name:(c.kind==='haulage'?`${source?.name||'Container'} → ${dest?.name||'Ziel'}`:`${source?.name||'Vertrag'} · ${good(product)?.name||'Fracht'}`).slice(0,60),stops};
}
