import {vehicleCargo,type Vehicle,type GoodId,type Cargo} from './engine';
/** Display grouping only: the individual order lots remain unchanged. */
export function groupedVehicleCargo(v:Vehicle){const rows=new Map<GoodId,{good:GoodId;quantity:number;lots:Cargo[]}>();for(const c of vehicleCargo(v)){const row=rows.get(c.good)||{good:c.good,quantity:0,lots:[]};row.quantity+=c.quantity;row.lots.push(c);rows.set(c.good,row);}return [...rows.values()];}
