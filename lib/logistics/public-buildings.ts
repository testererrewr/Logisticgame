import type {BuildGrid} from './build-grid';
import type {State} from './engine';

const PREFIX='public-buildings-v1:';
export interface PublicBuilding {id:string;name:string;kind:string;lat:number;lon:number;grid?:BuildGrid;ownerId:string;ownerName:string}
export const publicBuildingKey=(worldId:string,userId:string)=>PREFIX+worldId+':'+userId;
export const publicBuildingPrefix=(worldId:string)=>PREFIX+worldId+':';

export function publicBuildingsFromState(state:State,userId:string,ownerName:string):PublicBuilding[]{
 return state.sites.filter(site=>site.owned&&!site.allianceShared&&Number.isFinite(site.lat)&&Number.isFinite(site.lon)).map(site=>({id:site.id,name:site.name,kind:site.kind,lat:site.lat,lon:site.lon,...(site.grid?{grid:site.grid}:{}),ownerId:userId,ownerName}));
}

export function publicBuildingsStatement(db:D1Database,state:State,worldId:string,userId:string,ownerName:string,updated:number):D1PreparedStatement{
 return db.prepare('INSERT INTO logistics_runtime(id,updated,payload) VALUES(?,?,?) ON CONFLICT(id) DO UPDATE SET updated=excluded.updated,payload=excluded.payload').bind(publicBuildingKey(worldId,userId),updated,JSON.stringify(publicBuildingsFromState(state,userId,ownerName)));
}
