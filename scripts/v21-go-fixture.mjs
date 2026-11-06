import {newState,purchaseVehicle,createLine,addTrack} from '../lib/logistics/engine.ts';
const fresh=()=>{const s=newState();s.live=true;s.cash=1e10;return s;};
const own=(s,kind,lat,lon)=>{const p={id:crypto.randomUUID(),kind,name:kind,lat,lon,owned:true};s.sites.push(p);return p;};
export function setup(mode){const s=fresh(),kind={rail:'railStation',air:'airport',ship:'port'}[mode],a=own(s,kind,45.114,8.798),b=own(s,kind,45.43,8.76),warehouse=own(s,'warehouseXL',45.114,8.793);warehouse.warehouseLevel=5;
 const depot=mode==='air'?a:own(s,mode==='rail'?'railDepot':'shipDepot',45.113,8.798),model={rail:'flatRail',air:'boeing-737-800bcf',ship:'cargoShip'}[mode],v=purchaseVehicle(s,model,undefined,depot.id);if(mode==='rail')v.wagons=[{type:'container',count:24}];
 if(mode==='rail')addTrack(s,[a.lat,a.lon],[b.lat,b.lon]);const stops=[{siteId:a.id,action:'load',good:'all',manualDeparture:true,quantity:1e9},{siteId:b.id,action:'unload',good:'all',quantity:1e9}],line=createLine(s,{manualUnload:true,name:'Go nearby '+mode,mode,good:'all',manualDeparture:true,duration:null,stops});
 v.locationId=a.id;v.status='idle';v.lineId=line.id;v.nextStop=0;v.manualHold={lineId:line.id,index:0,siteId:a.id};
 const qty=mode==='air'?100:10000;for(const [id,n]of [['A',qty],['B',qty],['C',mode==='air'?100:15000]])s.contracts.push({id,kind:'haulage',siteId:warehouse.id,destinationId:b.id,good:'containers',daily:0,startDay:1,endDay:20,total:n,delivered:0,paid:0,loadedToday:0,deliveredToday:0,fee:10});
 s.inventory[warehouse.id]={containers:mode==='air'?300:35000};s.consignments[warehouse.id]={A:qty,B:qty,C:mode==='air'?100:15000};return {s,a,b,warehouse,v,line};}
