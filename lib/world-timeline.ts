import type {WorldState} from './game';
import type {WorldConfig,WorldStatus} from './world-config';
import type {CatalogSnapshot} from './vehicle-models';
import {settleWorld} from './world-clock';
import {settleAuctions} from './asset-auctions';
import {syncFleet} from './fleet';
import {settleTenders,refreshTenderEligibility} from './tenders';
export function settleTimeline(state:WorldState,config:WorldConfig,status:WorldStatus,now:number,catalogs:CatalogSnapshot[]=[]){
 const events=[...catalogs.map(catalog=>({at:catalog.created,catalog})),...(state.auctions||[]).filter(a=>a.status==='open'&&a.ends<=now).map(a=>({at:a.ends,catalog:undefined}))].sort((a,b)=>a.at-b.at);
 for(const event of events){const at=Math.max(state.lastTick,Math.min(now,event.at));settleWorld(state,config,status,at);settleTenders(state,at);if(event.catalog){state.vehicleCatalog=event.catalog;for(const c of state.companies)syncFleet(c,event.catalog.models);}settleAuctions(state,at);refreshTenderEligibility(state);}
 settleWorld(state,config,status,now);
}
