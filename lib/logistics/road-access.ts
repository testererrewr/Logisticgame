import {kmBetween,type Coords,type RouteLeg} from './engine';
export const MAX_SHORT_ACCESS_KM=3;
export function shortAccessLeg(from:Coords,to:Coords):RouteLeg|null{const km=kmBetween(from,to);return km<=MAX_SHORT_ACCESS_KM?{geometryVersion:2,accessFallback:true,fromId:'',toId:'',km:Math.round(km*1000)/1000,path:[from,to],source:'osm-strassen'}:null;}

export function accessForResponse(from:Coords,to:Coords,status:number,code:string){return [200,400].includes(status)&&['NoRoute','NoSegment'].includes(code)?shortAccessLeg(from,to):null;}
