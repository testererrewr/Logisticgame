import type {Facility} from './game';
import {meters,type LatLon} from './real-map';
export type StationBounds=[number,number,number,number,'airport'?];
export function stationBounds(f:Facility):StationBounds|undefined{if(!f.footprint.length)return f.type==='airport'?[...f.point,...f.point,'airport']:undefined;const lat=50/111320,lon=50/(111320*Math.cos(f.point[0]*Math.PI/180)),xs=f.footprint.map(id=>id%80-f.cell%80),ys=f.footprint.map(id=>Math.floor(id/80)-Math.floor(f.cell/80));return [f.point[0]+(Math.min(...ys)-.5)*lat,f.point[1]+(Math.min(...xs)-.5)*lon,f.point[0]+(Math.max(...ys)+.5)*lat,f.point[1]+(Math.max(...xs)+.5)*lon,f.type==='airport'?'airport':undefined];}
export function stationDistance(a:{point:LatLon;bounds?:StationBounds},b:{point:LatLon;bounds?:StationBounds}){const aa=a.bounds||[a.point[0],a.point[1],a.point[0],a.point[1]],bb=b.bounds||[b.point[0],b.point[1],b.point[0],b.point[1]],near=(low:number,high:number,otherLow:number,otherHigh:number)=>high<otherLow?[high,otherLow]:otherHigh<low?[low,otherHigh]:[Math.max(low,otherLow),Math.max(low,otherLow)],[aLat,bLat]=near(aa[0],aa[2],bb[0],bb[2]),[aLon,bLon]=near(aa[1],aa[3],bb[1],bb[3]);return meters([aLat,aLon],[bLat,bLon]);}

export function transferLimit(a:{bounds?:StationBounds},b:{bounds?:StationBounds}){return a.bounds?.[4]==='airport'||b.bounds?.[4]==='airport'?1000:100;}
export function canWalkTransfer(a:{point:LatLon;bounds?:StationBounds},b:{point:LatLon;bounds?:StationBounds}){return stationDistance(a,b)<=transferLimit(a,b)+.01;}
