import {env} from 'cloudflare:workers';
import {TRAILERS,credit,debit,log,euro,type State,type TrailerUnit} from './engine';
import {trailerDealerValue} from './vehicle-sales';

const db=()=>env.DB!;
export interface TrailerOffer {id:string;world_id:string;seller_id:string;seller_name:string;price:number;created:number;trailer:TrailerUnit;status:string}
let ready:Promise<unknown>|undefined;let readyDone=false;
export const ensureTrailerMarket=()=>(readyDone?Promise.resolve(undefined as any):Promise.resolve(db().batch([
 db().prepare("CREATE TABLE IF NOT EXISTS logistics_trailer_offers(id TEXT PRIMARY KEY,world_id TEXT NOT NULL,seller_id TEXT NOT NULL,seller_name TEXT NOT NULL,price REAL NOT NULL,created INTEGER NOT NULL,trailer TEXT NOT NULL,status TEXT NOT NULL DEFAULT 'open',buyer_id TEXT)"),
 db().prepare('CREATE INDEX IF NOT EXISTS logistics_trailer_offers_world ON logistics_trailer_offers(world_id,status)'),
]).catch(e=>{ready=undefined;throw e;})).then((v:any)=>{readyDone=true;return v;}));
export async function trailerOffers(world:string){await ensureTrailerMarket();return (await db().prepare("SELECT * FROM logistics_trailer_offers WHERE world_id=? AND status='open' ORDER BY created DESC LIMIT 500").bind(world).all<any>()).results.map(r=>({...r,trailer:JSON.parse(r.trailer)})) as TrailerOffer[];}
export async function trailerOffer(world:string,id:string){await ensureTrailerMarket();const r=await db().prepare('SELECT * FROM logistics_trailer_offers WHERE id=? AND world_id=?').bind(String(id||''),world).first<any>();if(!r)throw Error('Aufliegerangebot nicht gefunden.');return {...r,trailer:JSON.parse(r.trailer)} as TrailerOffer;}
export function offerTrailer(s:State,trailerId:string,price:number){const t=(s.trailers||[]).find(x=>x.id===trailerId);if(!t)throw Error('Abgestellten Auflieger auswählen.');if(!Number.isSafeInteger(price)||price<1||price>50000000)throw Error('Preis: 1 bis 50.000.000 €.');s.trailers=s.trailers!.filter(x=>x.id!==trailerId);const {locationId:_l,...unit}=t;log(s,`Auflieger ${TRAILERS.find(x=>x.id===t.specId)?.name||''} für ${euro(price)} im Gebrauchtmarkt angeboten.`,'info');return unit as TrailerUnit;}
export function buyTrailer(buyer:State,seller:State|null,o:TrailerOffer,depotId:string){const depot=buyer.sites.find(p=>p.id===depotId&&p.owned&&p.kind==='depot');if(!depot)throw Error('Ein eigenes LKW-Depot auswählen.');debit(buyer,o.price,'Fahrzeugkäufe');buyer.trailers??=[];buyer.trailers.push({...o.trailer,id:crypto.randomUUID(),locationId:depot.id});const name=TRAILERS.find(x=>x.id===o.trailer.specId)?.name||'Auflieger';log(buyer,`Gebrauchten ${name} für ${euro(o.price)} gekauft (${o.seller_name}).`,'good');if(seller){credit(seller,o.price,'Fahrzeugverkäufe');log(seller,`${name} im Gebrauchtmarkt für ${euro(o.price)} verkauft.`,'good');}}
export function withdrawTrailer(s:State,o:TrailerOffer,depotId:string){const depot=s.sites.find(p=>p.id===depotId&&p.owned&&p.kind==='depot');if(!depot)throw Error('Ein eigenes LKW-Depot auswählen.');s.trailers??=[];s.trailers.push({...o.trailer,locationId:depot.id});log(s,'Aufliegerangebot zurückgezogen.','info');}
export const trailerValue=(t:TrailerUnit)=>trailerDealerValue(t);
