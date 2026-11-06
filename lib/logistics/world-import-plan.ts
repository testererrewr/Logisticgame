import type {PartnerTile} from './partner-tiles';
export const WORLD_ROOTS=170*360;
export interface WorldCell extends PartnerTile {depth:number;attempt?:number;nextTry?:number}
export interface WorldImportProgress {enabled:boolean;cursor:number;completedRoots:number;completedCells:number;savedObjects:number;pending:WorldCell[];nextTry:number;attempt:number;lastError?:string;updated:number}
export const newWorldImport=():WorldImportProgress=>({enabled:true,cursor:0,completedRoots:0,completedCells:0,savedObjects:0,pending:[],nextTry:0,attempt:0,updated:0});
/** Start around Graz, then visit every 1° cell exactly once within map bounds. */
export function worldRoot(cursor:number):WorldCell{if(!Number.isInteger(cursor)||cursor<0||cursor>=WORLD_ROOTS)throw Error('Ungültiger Weltimport-Cursor.');const south=(132+Math.floor(cursor/360))%170-85,west=(195+cursor%360)%360-180;return {id:'world-root-v10:'+cursor,south,west,north:south+1,east:west+1,depth:0};}
export function splitWorldCell(cell:WorldCell):WorldCell[]{const lat=(cell.south+cell.north)/2,lon=(cell.west+cell.east)/2;return [[cell.south,cell.west,lat,lon],[cell.south,lon,lat,cell.east],[lat,cell.west,cell.north,lon],[lat,lon,cell.north,cell.east]].map(([south,west,north,east],i)=>({id:cell.id+'.'+i,south,west,north,east,depth:cell.depth+1}));}
export function prepareWorldCell(p:WorldImportProgress,now=Date.now()){
 let index=p.pending.findIndex(c=>(c.nextTry||0)<=now);
 if(index<0&&p.cursor<WORLD_ROOTS&&new Set(p.pending.map(c=>c.id.split('.')[0])).size<4&&p.pending.length<2000){p.pending.push(worldRoot(p.cursor++));index=p.pending.length-1;}
 if(index<0)return undefined;if(index>0)p.pending.unshift(...p.pending.splice(index,1));return p.pending[0];
}
export function finishWorldCell(p:WorldImportProgress,complete:boolean,count:number,defer=false,now=Date.now()){
 const cell=p.pending[0];if(!cell)return p;p.savedObjects+=count;p.updated=now;p.nextTry=now+3000;
 if(complete){p.pending.shift();p.completedCells++;p.attempt=0;p.lastError=undefined;if(!p.pending.some(c=>c.id.split('.')[0]===cell.id.split('.')[0]))p.completedRoots++;}
 else if(!defer&&cell.depth<6){p.pending.splice(0,1,...splitWorldCell(cell));p.attempt=0;p.lastError='Dichtes Gebiet wird in kleinere Teilgebiete geteilt.';}
 else{p.attempt=(cell.attempt||0)+1;cell.attempt=p.attempt;cell.nextTry=now+Math.min(300000,15000*2**Math.min(p.attempt,5));p.pending.push(p.pending.shift()!);p.lastError='Teilgebiet wartet auf Wiederholung; andere Gebiete werden weiter geladen.';}
 if(p.pending.length&&!p.pending.some(c=>(c.nextTry||0)<=now)&&p.cursor>=WORLD_ROOTS)p.nextTry=Math.min(...p.pending.map(c=>c.nextTry||now+3000));return p;
}

export function completedRootForTile(t:PartnerTile){if(Math.floor(t.south)!==Math.floor(t.north-1e-9)||Math.floor(t.west)!==Math.floor(t.east-1e-9))return null;const y=((Math.floor(t.south)+85-132)%170+170)%170,x=((Math.floor(t.west)+180-195)%360+360)%360;return 'world-root-v10:'+(y*360+x);}
