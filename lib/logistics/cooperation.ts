/** Explicit voluntary trades between independent player-owned freight companies.
 *  This module is pure: the API verifies the actor and performs an atomic
 *  two-company commit against matching revisions. */
import {BUILDINGS,GOODS,storageCapacity,checkIntegrity,credit,debit,log,stock,type GoodId,type State,type Site} from './engine.ts';
export interface TradeTerms {siteId:string;good:GoodId;quantity:number;price:number;sellerId:string}
export function tradeTerminal(state:State,siteId:string):Site|undefined{
 return state.sites.find(site=>site.id===siteId&&site.owned&&BUILDINGS.some(b=>b.id===site.kind));
}
export function settleTrade(previousSeller:State,previousBuyer:State,terms:TradeTerms){
 const seller=structuredClone(previousSeller),buyer=structuredClone(previousBuyer);
 const from=tradeTerminal(seller,terms.siteId);
 if(!from||!GOODS.some(g=>g.id===terms.good&&g.id!=='containers'))throw Error('Anbieter hat kein gültiges Übergabeterminal.');
 if(!Number.isFinite(terms.quantity)||terms.quantity<=0||Math.abs(Math.round(terms.quantity*100)-terms.quantity*100)>0.00001)throw Error('Ungültige Frachtmenge.');
 if(!Number.isSafeInteger(terms.price)||terms.price<0)throw Error('Ungültiger Kaufpreis.');
 if(stock(seller,from.id,terms.good)+.0001<terms.quantity)throw Error('Der angebotene Bestand ist inzwischen nicht mehr verfügbar.');
 if(buyer.cash<terms.price)throw Error('Zu wenig Kapital für diese Warenlieferung.');
 const access=buyer.sites.find(s=>s.id===from.id);
 if(access?.owned)throw Error('Ungültige Partnerübergabe.');
 const cap=storageCapacity(from);
 const stored=Object.values(buyer.inventory[from.id]||{}).reduce<number>((sum,n)=>sum+(n||0),0);
 if(stored+terms.quantity>cap)throw Error('Das Partnerterminal ist für diese Gütermenge zu voll.');
 // The physical warehouse is owned by the seller. A buyer gets loading rights
 // only for its *own* inventory there; no cargo is silently duplicated.
 if(!access)buyer.sites.push({...from,owned:false,cooperative:true,operatorId:terms.sellerId,name:`${from.name} (Partner)`});
 else{access.cooperative=true;access.operatorId=terms.sellerId;}
 seller.inventory[from.id]??={};seller.inventory[from.id][terms.good]=Math.round((stock(seller,from.id,terms.good)-terms.quantity)*100)/100;
 buyer.inventory[from.id]??={};buyer.inventory[from.id][terms.good]=Math.round((stock(buyer,from.id,terms.good)+terms.quantity)*100)/100;
 debit(buyer,terms.price);credit(seller,terms.price);
 log(seller,`${terms.quantity} EH ${GOODS.find(g=>g.id===terms.good)?.name} an Partner verkauft · ${terms.price.toLocaleString('de-AT')} €`,'good');
 log(buyer,`${terms.quantity} EH ${GOODS.find(g=>g.id===terms.good)?.name} vom Partner am Übergabeterminal übernommen.`,'good');
 checkIntegrity(seller);checkIntegrity(buyer);
 return {seller,buyer};
}
