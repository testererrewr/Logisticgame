import {tileAt,tileCenter} from '../geography';
import {mapBounds,pointCell,cellPoint} from '../real-map';
import type {BuildingKind,Coords} from './engine';
export interface BuildGrid {tile:string;cell:number;width:number;height:number;rotation:number}
export const FOOTPRINTS:Record<BuildingKind,[number,number]>={depot:[2,1],railDepot:[3,2],railStation:[6,1],shipDepot:[5,3],inlandPort:[6,3],port:[8,4],airport:[12,5],regionalAirport:[7,3],airDepot:[4,3],hub:[4,3],warehouse:[5,3],warehouseSmall:[2,2],warehouseMedium:[3,3],warehouseXL:[8,5]};
export function snapBuildPoint(point:Coords):Coords{const center=tileCenter(tileAt(point))!,bounds={...mapBounds(...center)};const map={...bounds} as any;const cell=pointCell(map,point);return cell<0?point:cellPoint(map,cell);}
export function placement(point:Coords,kind:BuildingKind,rotation=0){
 const tile=tileAt(point),center=tileCenter(tile)!,map={...mapBounds(...center)} as any,cell=pointCell(map,point);let [width,height]=FOOTPRINTS[kind];if(rotation%180===90)[width,height]=[height,width];
 if(cell<0||cell%80+width>80||Math.floor(cell/80)+height>80)throw Error('Baufläche liegt am Kachelrand. Ein Stück weiter innen platzieren.');
 return {point:cellPoint(map,cell),grid:{tile,cell,width,height,rotation}};
}
export function gridBounds(grid:BuildGrid):[Coords,Coords]{const c=tileCenter(grid.tile)!,b=mapBounds(...c),x=grid.cell%80,y=Math.floor(grid.cell/80);return [[b.south+y*b.dLat,b.west+x*b.dLon],[b.south+(y+grid.height)*b.dLat,b.west+(x+grid.width)*b.dLon]];}
export function gridOverlaps(a:BuildGrid,b:BuildGrid){if(a.tile!==b.tile)return false;const ax=a.cell%80,ay=Math.floor(a.cell/80),bx=b.cell%80,by=Math.floor(b.cell/80);return ax<bx+b.width&&ax+a.width>bx&&ay<by+b.height&&ay+a.height>by;}
