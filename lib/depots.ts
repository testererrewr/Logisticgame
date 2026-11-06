import type {Facility,Company} from './game';
export function depotBase(f:Facility){return f.type==='airdepot'?1000:f.type==='traindepot'?40:f.type==='shipdepot'?30:50;}
export function depotCapacity(f:Facility){return f.capacity??depotBase(f)*(f.depotSize==='large'?2:1)*2**((f.depotLevel||1)-1);}
export const depotOccupancy=(c:Company,id:string)=>(c.fleet||[]).filter(v=>v.depot===id).length;
export function requireDepotSpace(c:Company,f:Facility,additional=1){if(depotOccupancy(c,f.id)+additional>depotCapacity(f))throw Error('Depot voll: '+depotOccupancy(c,f.id)+' / '+depotCapacity(f)+'. Depot ausbauen oder ein anderes Depot wählen.');}
export function migrateDepots(c:Company){for(const f of c.facilities||[])if(f.type.includes('depot')&&f.depotVersion!==29){const occupied=depotOccupancy(c,f.id),base=depotBase(f)*(f.depotSize==='large'?2:1);f.depotLevel=Math.max(f.depotLevel||1,1+Math.max(0,Math.ceil(Math.log2(Math.max(1,occupied/base)))));f.capacity=base*2**(f.depotLevel-1);f.depotVersion=29;}}
