import {isManualLine} from './manual-line';
import type {State,Line,Vehicle,Stop,Contract} from './engine';
export const activeContainerOrder=(s:State,c:Contract)=>c.kind==='haulage'&&!c.cancelled&&c.startDay<=s.day&&c.endDay>=s.day&&c.delivered<(c.total||0)-.000001;
export function validateContainerSelection(s:State,ids:string[]|undefined){if(ids===undefined)return;if(!Array.isArray(ids)||ids.length>3000||new Set(ids).size!==ids.length||ids.some(id=>typeof id!=='string'||!s.contracts.some(c=>c.kind==='haulage'&&c.id===id)))throw Error('Nur eigene Aufträge auswählen.');}
export function containerOrdersAt(s:State,siteId:string,good='containers'){return s.contracts.filter(c=>c.kind==='haulage'&&(c.good||'containers')===good&&(s.consignments?.[siteId]?.[c.id]||0)>.000001).map(c=>({order:c,quantity:s.consignments[siteId][c.id],active:activeContainerOrder(s,c)})).sort((a,b)=>a.order.endDay-b.order.endDay||a.order.id.localeCompare(b.order.id));}
export function containerStopAllows(stop:Stop,v:Vehicle,orderId:string){return (!stop.orderIds?.length||stop.orderIds.includes(orderId))&&(!v.containerOrderIds?.length||v.containerOrderIds.includes(orderId));}

function liveSelection(ids:string[]|undefined,rows:{order:Contract;active:boolean}[]){if(!ids?.length)return undefined;const live=ids.filter(id=>rows.some(r=>r.active&&r.order.id===id));return live.length?live:undefined;}

function lineServes(s:State,line:Line,order:Contract){return line.stops.some(st=>st.action!=='load'&&(st.siteId===order.destinationId||s.sites.some(p=>p.id===st.siteId&&(p.owned||p.cooperative))));}
export function loadingContainerOrders(s:State,v:Vehicle,line:Line,stop:Stop,siteId:string,good='containers'){const rows=containerOrdersAt(s,siteId,good);if(isManualLine(line)){const ids=v.containerOrderIds??stop.orderIds??[];return rows.filter(r=>r.active&&(good!=='containers'&&!ids.length||ids.includes(r.order.id)));}
 const stopIds=liveSelection(stop.orderIds,rows),vehicleIds=liveSelection(v.containerOrderIds,rows);
 return rows.filter(r=>r.active&&(!stopIds||stopIds.includes(r.order.id))&&(!vehicleIds||vehicleIds.includes(r.order.id))&&(stopIds||vehicleIds||lineServes(s,line,r.order)));}

export function containerWaitReason(s:State,line:Line,siteIds:string[]){const rows=siteIds.flatMap(id=>containerOrdersAt(s,id)).filter(r=>r.active);if(!rows.length)return 'Wartet auf Containerfracht';return rows.some(r=>lineServes(s,line,r.order))?'Auftrag / Ziel auswählen':'Kein Containerziel auf dieser Linie – Ziel als Stopp ergänzen';}

export function liveStop(s:State,stop:Stop):Stop{return stop.orderIds?.length&&!stop.orderIds.some(id=>s.contracts.some(k=>k.id===id&&activeContainerOrder(s,k)))?{...stop,orderIds:undefined}:stop;}
