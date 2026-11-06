import type {World} from '../lib/game';
import {worldHref} from '../lib/app-routes';
import {depotMode} from '../lib/fleet';
export default function FleetNavigation({world,myId,active,depotId=''}:{world:World;myId:string;active:'fleet'|'depots'|'market'|'usedMarket'|'auctions';depotId?:string}){
 const c=world.state.companies.find(c=>c.id===myId),counts={fleet:c?.fleet?.length||0,depots:c?.facilities?.filter(depotMode).length||0};
 return <nav className="section-navigation" aria-label="Flottenverwaltung">{([['fleet','Fahrzeugbestand'],['depots','Depots'],['market','Fahrzeugmarkt'],['usedMarket','Gebrauchtmarkt'],['auctions','Anlagenversteigerungen']] as const).map(([key,label])=><a key={key} href={worldHref(world.id,key)+(key==='market'&&depotId?'?depot='+encodeURIComponent(depotId):'')} aria-current={active===key?'page':undefined}>{label}{(key==='fleet'||key==='depots')&&<b>{counts[key]}</b>}</a>)}</nav>;
}
