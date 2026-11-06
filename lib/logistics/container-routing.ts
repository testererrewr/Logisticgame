import {isManualLine} from './manual-line';
import type {State,Line,Vehicle,Stop,Contract} from './engine';
export const activeContainerOrder=(s:State,c:Contract)=>c.kind==='haulage'&&!c.cancelled&&c.startDay<=s.day&&c.endDay>=s.day&&c.delivered<(c.total||0)-.000001;
export function validateContainerSelection(s:State,ids:string[]|undefined){if(ids===undefined)return;if(!Array.isArray(ids)||ids.length>3000||new Set(ids).size!==ids.length||ids.some(id=>typeof id!=='string'||!s.contracts.some(c=>c.kind==='haulage'&&c.id===id)))throw Error('Nur eigene Containeraufträge auswählen.');}
export function containerOrdersAt(s:State,siteId:string){return s.contracts.filter(c=>c.kind==='haulage'&&(s.consignments?.[siteId]?.[c.id]||0)>.000001).map(c=>({order:c,quantity:s.consignments[siteId][c.id],active:activeContainerOrder(s,c)})).sort((a,b)=>a.order.endDay-b.order.endDay||a.order.id.localeCompare(b.order.id));}
export function containerStopAllows(stop:Stop,v:Vehicle,orderId:string){return (!stop.orderIds?.length||stop.orderIds.includes(orderId))&&(!v.containerOrderIds?.length||v.containerOrderIds.includes(orderId));}
/** Automatic stops take all available matching orders. Manual Go requires an explicit order choice. */
export function loadingContainerOrders(s:State,v:Vehicle,line:Line,stop:Stop,siteId:string){if(isManualLine(line)){const ids=v.containerOrderIds??stop.orderIds??[];return containerOrdersAt(s,siteId).filter(r=>r.active&&ids.includes(r.order.id));}return containerOrdersAt(s,siteId).filter(r=>r.active&&containerStopAllows(stop,v,r.order.id));}
