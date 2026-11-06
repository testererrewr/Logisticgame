import type {Company,WorldState} from './game';
import {financeDay} from './finance';
export type CompanyDay={transported:number;load:number;capacity:number};
export function vehicleLedger(c:Company,id:string,time:number,revenue=0,cost=0){const day=financeDay(time),books=c.vehicleAccounts??={},old=books[id];if(!old||old.day!==day)books[id]={day,revenue:0,cost:0};books[id].revenue+=revenue;books[id].cost+=cost;}
export function dailyVehicleProfit(c:Company,id:string,time:number){const v=c.vehicleAccounts?.[id];return v?.day===financeDay(time)?v.revenue-v.cost:0;}
export function recordCompanyTrip(c:Company,time:number,count:number,load=0,capacity=0){const days=c.statistics??={},key=financeDay(time),v=days[key]??={transported:0,load:0,capacity:0};v.transported+=count;v.load+=load;v.capacity+=capacity;const limit=new Date(time);limit.setUTCMonth(limit.getUTCMonth()-2);const cutoff=financeDay(+limit);for(const d of Object.keys(days))if(d<cutoff)delete days[d];}
export function companyWeek(c:Company,time:number){const d=new Date(time);d.setUTCHours(0,0,0,0);d.setUTCDate(d.getUTCDate()-((d.getUTCDay()+6)%7));const to=financeDay(+d-86400000),from=financeDay(+d-7*86400000),rows=Object.entries(c.statistics||{}).filter(([day])=>day>=from&&day<=to).map(([,v])=>v),capacity=rows.reduce((s,v)=>s+v.capacity,0);return {from,to,passengers:rows.reduce((s,v)=>s+v.transported,0),load:capacity?rows.reduce((s,v)=>s+v.load,0)/capacity*100:0};}
export function ensureCompanyDates(state:WorldState){for(const c of state.companies){c.createdReal??=state.startedAt||state.lastTick;c.createdSim??=c.finances?.started||state.startedAt||state.simTime||state.lastTick;}}

export function lineLedger(c:Company,id:string,time:number,revenue=0,cost=0){const days=c.lineAccounts??={},key=financeDay(time),row=(days[key]??={})[id]??={revenue:0,cost:0};row.revenue+=revenue;row.cost+=cost;const cutoff=new Date(time);cutoff.setUTCMonth(cutoff.getUTCMonth()-2);for(const day of Object.keys(days))if(day<financeDay(+cutoff))delete days[day];}
export function previousLineProfit(c:Company,id:string,time:number){const row=c.lineAccounts?.[financeDay(time-86400000)]?.[id];return row?row.revenue-row.cost:null;}

export function roundCapital(c:Company){const exact=c.cash+(c.cashRemainder||0),rounded=Math.round(exact*100)/100;c.cashRemainder=exact-rounded;c.cash=rounded;}
