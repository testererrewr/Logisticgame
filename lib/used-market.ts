import type {WorldState,Company,Action,Mode} from './game';
import {depotMode,syncFleet,type Vehicle} from './fleet';
import {requireDepotSpace} from './depots';
import {assertMode} from './world-modes';
import {componentValues} from './train-workshop';
import {vehicleModel,vehicleModels} from './vehicle-models';
import {systemMessage} from './infrastructure';
export type VehicleOffer={id:string;seller:string;vehicle:string;mode:Mode;price:number;created:number};
const euro=(n:number)=>Math.round(n*100)/100;
export function marketPrice(value:unknown){if(typeof value!=='number'||!Number.isFinite(value)||value<1||value>1e9)throw Error('Angebotspreis: 1 bis 1.000.000.000 Euro.');return euro(value);}
export function cleanUsedMarket(state:WorldState){state.usedMarket=state.usedMarket?.filter(o=>{const c=state.companies.find(c=>c.id===o.seller),v=c?.fleet?.find(v=>v.id===o.vehicle);return !!v&&v.listing===o.id&&!v.line;});}
function revalue(v:Vehicle,price:number,catalog=vehicleModels){if(v.mode==='train'){const parts=componentValues(v,catalog),total=parts.reduce((n,p)=>n+p.value,0),count=parts.reduce((n,p)=>n+p.count,0);let remaining=price;v.componentValues=parts.map((p,i)=>{const value=i===parts.length-1?remaining:euro(price*(total?p.value/total:p.count/count));remaining=euro(remaining-value);return {...p,value};});}v.purchasePrice=price;}
export function usedMarketAction(state:WorldState,buyer:Company,a:Action){
 if(!['vehicle-market-list','vehicle-market-withdraw','vehicle-market-buy'].includes(a.type))return false;
 const catalog=state.vehicleCatalog?.models||vehicleModels;state.usedMarket??=[];cleanUsedMarket(state);
 if(a.type==='vehicle-market-list'){
  const v=buyer.fleet?.find(v=>v.id===a.vehicle);if(!v||v.line||v.listing)throw Error('Wähle ein eigenes Fahrzeug ohne Linie und ohne bestehendes Angebot.');assertMode(state.rules,v.mode);if(!buyer.facilities?.some(f=>f.id===v.depot&&depotMode(f)===v.mode))throw Error('Das Fahrzeug muss im eigenen passenden Depot stehen.');
  const price=marketPrice(a.price);if(state.usedMarket.length>=10000)throw Error('Der Gebrauchtmarkt ist voll. Ziehe zuerst ein anderes Angebot zurück.');const id=crypto.randomUUID();state.usedMarket.push({id,seller:buyer.id,vehicle:v.id,mode:v.mode,price,created:Date.now()});v.listing=id;return true;
 }
 const offer=state.usedMarket.find(o=>o.id===a.offer);if(!offer)throw Error('Dieses Fahrzeugangebot ist nicht mehr verfügbar.');const seller=state.companies.find(c=>c.id===offer.seller),v=seller?.fleet?.find(v=>v.id===offer.vehicle&&v.listing===offer.id);if(!seller||!v||v.line)throw Error('Das Fahrzeugangebot ist nicht mehr gültig.');
 if(a.type==='vehicle-market-withdraw'){if(seller.id!==buyer.id)throw Error('Nur der Anbieter kann sein Angebot zurückziehen.');delete v.listing;state.usedMarket=state.usedMarket.filter(o=>o.id!==offer.id);return true;}
 if(seller.id===buyer.id)throw Error('Das eigene Angebot kann nicht gekauft werden.');if(seller.suspended)throw Error('Dieses Unternehmen kann gerade nicht handeln.');assertMode(state.rules,v.mode);if(a.expectedPrice!==offer.price)throw Error('Der Angebotspreis hat sich geändert. Prüfe das Angebot erneut.');
 const depot=buyer.facilities?.find(d=>d.id===a.depot&&depotMode(d)===v.mode);if(!depot)throw Error('Wähle ein eigenes Lieferdepot für diesen Fahrzeugtyp.');if((buyer.fleet?.length||0)>=(state.vehicleLimit||20000))throw Error('Das Fahrzeuglimit dieser Welt ist erreicht.');requireDepotSpace(buyer,depot);if(buyer.cash<offer.price)throw Error('Nicht genug Kapital für dieses Fahrzeug.');
 const transferred=structuredClone(v);revalue(transferred,offer.price,catalog);transferred.depot=depot.id;delete transferred.listing;delete transferred.line;delete transferred.dailyCost;delete transferred.dailyKm;
 buyer.cash=euro(buyer.cash-offer.price);seller.cash=euro(seller.cash+offer.price);seller.fleet=seller.fleet!.filter(x=>x.id!==v.id);buyer.fleet??=[];buyer.fleet.push(transferred);state.usedMarket=state.usedMarket.filter(o=>o.id!==offer.id);delete state.operations?.vehicles[v.id];
 syncFleet(seller,catalog);syncFleet(buyer,catalog);const name=vehicleModel(v,catalog).name,price=offer.price.toLocaleString('de-DE',{style:'currency',currency:'EUR'});systemMessage(state,seller.id,'Fahrzeug verkauft',buyer.name+' hat '+v.name+' ('+name+') für '+price+' gekauft.','gebrauchtmarkt');systemMessage(state,buyer.id,'Gebrauchtfahrzeug geliefert',v.name+' von '+seller.name+' wurde für '+price+' in '+depot.name+' geliefert.','flotte?depot='+encodeURIComponent(depot.id));return true;
}
