import {logError} from '../../../../lib/logistics/error-log';
import {NextRequest,NextResponse} from 'next/server';
import {sameOrigin} from '../../../../lib/same-origin';
import {decodeCompany} from '../../../../lib/logistics/company-codec';
import {VEHICLES,vehicleDepotCompatible,type BuildingKind} from '../../../../lib/logistics/engine';
import {env} from 'cloudflare:workers';
import {currentUser,settleWorld} from '../online/route';
import {parseSettings,modeGroup} from '../../../../lib/logistics/world-settings';
import {readUsedVehicleOffers,ensureRareOffer,auctionInfo,isAuction,minBid,readUsedVehicleOffer,ensureAuctionTable} from '../../../../lib/logistics/used-vehicle-store';
export async function GET(req:NextRequest){try{const user=await currentUser(req);if(!user||user.status!=='active')return NextResponse.json({error:'Bitte anmelden.'},{status:401});const world=req.nextUrl.searchParams.get('world');if(!world||!await env.DB!.prepare('SELECT 1 AS joined FROM logistics_world_companies WHERE world_id=? AND user_id=?').bind(world,user.id).first())return NextResponse.json({error:'Bitte der Welt beitreten.'},{status:403});const w=await settleWorld(world),cfg=parseSettings(w.settings);await ensureRareOffer(world,w.day,m=>cfg.modes.includes(modeGroup(m))).catch(()=>{});const raw=await readUsedVehicleOffers(world,w.day),info=await auctionInfo(world,user.id).catch(()=>new Map()),offers=raw.map(o=>isAuction(o)?{...o,auction:{...(info.get(o.id)||{top:0,count:0,mine:0,leading:false}),min:minBid(o.price,info.get(o.id)?.top||0)}}:o);return NextResponse.json({offers,userId:user.id,worldId:world},{headers:{'Cache-Control':'no-store'}});}catch(e:any){await logError('api:used-vehicles',e,{url:req.url});return NextResponse.json({error:e.message},{status:422});}}

export async function POST(req:NextRequest){try{const user=await currentUser(req);if(!user||user.status!=='active')return NextResponse.json({error:'Bitte anmelden.'},{status:401});if(!sameOrigin(req))return NextResponse.json({error:'Ungültiger Ursprung.'},{status:403});
 const body=await req.json() as any,world=String(body.world||'').slice(0,100);const row=await env.DB!.prepare('SELECT state FROM logistics_world_companies WHERE world_id=? AND user_id=?').bind(world,user.id).first<{state:string}>();if(!row)return NextResponse.json({error:'Bitte der Welt beitreten.'},{status:403});
 if(body.action!=='bid')throw Error('Unbekannte Aktion.');const w=await settleWorld(world),offer=await readUsedVehicleOffer(world,String(body.offerId||''));if(!isAuction(offer)||offer.status!=='open'||(offer.expiresDay||0)<=w.day)throw Error('Diese Auktion ist beendet.');
 await ensureAuctionTable();const info=(await auctionInfo(world,user.id)).get(offer.id),amount=Math.round(Number(body.amount));const min=minBid(offer.price,info?.top||0);if(info?.leading)throw Error('Du hast bereits das Höchstgebot.');if(!(amount>=min))throw Error('Mindestgebot: '+min.toLocaleString('de-DE')+' €.');
 const st=await decodeCompany(row.state),m=VEHICLES.find(v=>v.id===offer.vehicle.modelId),depot=st.sites.find(p=>p.id===String(body.depotId||'')&&p.owned);if(!m||!depot||!vehicleDepotCompatible(depot.kind as BuildingKind,m))throw Error('Passendes eigenes Depot für die Lieferung wählen.');if(st.cash<amount)throw Error('Gebot höher als dein Kontostand.');
 await env.DB!.prepare('INSERT INTO logistics_auction_bids(offer_id,world_id,user_id,amount,depot_id,created) VALUES(?,?,?,?,?,?) ON CONFLICT(offer_id,user_id) DO UPDATE SET amount=excluded.amount,depot_id=excluded.depot_id,created=excluded.created').bind(offer.id,world,user.id,amount,depot.id,Date.now()).run();
 return NextResponse.json({ok:true,amount});
}catch(e:any){await logError('api:used-vehicles',e,{url:req.url});return NextResponse.json({error:e.message},{status:422});}}
