import {placement,gridBounds} from './build-grid';
import type {BuildingKind,Coords} from './engine';

const project=(p:Coords,z:number)=>{const n=256*2**z,r=p[0]*Math.PI/180;return [(p[1]+180)/360*n,(1-Math.asinh(Math.tan(r))/Math.PI)/2*n];};
export function shoreArea(point:Coords,kind:BuildingKind,rotation=0){const grid=placement(point,kind,rotation).grid,[sw,ne]=gridBounds(grid),lat=150/111320,lon=lat/Math.cos(point[0]*Math.PI/180);return {grid,sw,ne,bounds:[sw[0]-lat,sw[1]-lon,ne[0]+lat,ne[1]+lon],key:`logistics-shore-v19:${grid.tile}:${grid.cell}:${kind}:${grid.rotation}`};}
export function rasterPlan(point:Coords,kind:BuildingKind,rotation=0){const area=shoreArea(point,kind,rotation);for(let zoom=16;zoom>=10;zoom--){const [s,w,n,e]=area.bounds,a=project([n,w],zoom),b=project([s,e],zoom),tiles=[];for(let y=Math.floor(a[1]/256);y<=Math.floor(b[1]/256);y++)for(let x=Math.floor(a[0]/256);x<=Math.floor(b[0]/256);x++)tiles.push({x,y,zoom});if(tiles.length<=12)return {...area,zoom,tiles,box:[...project(area.sw,zoom),...project(area.ne,zoom)],extent:[Math.floor(a[0]),Math.floor(a[1]),Math.ceil(b[0]),Math.ceil(b[1])],metresPerPixel:40075016.686*Math.cos(point[0]*Math.PI/180)/(256*2**zoom)};}throw Error('Baufläche zu groß für Kartenprüfung.');}

export async function pngWaterMask(bytes:Uint8Array){
 const view=new DataView(bytes.buffer,bytes.byteOffset,bytes.byteLength),idat:Uint8Array[]=[];let width=0,height=0,depth=0,type=0,interlace=0;let palette:Uint8Array=new Uint8Array(),alpha:Uint8Array=new Uint8Array();
 if(bytes.length<33||view.getUint32(0)!==0x89504e47||view.getUint32(4)!==0x0d0a1a0a)throw Error('Keine gültige Kartenkachel.');
 for(let at=8;at+12<=bytes.length;){const length=view.getUint32(at),tag=String.fromCharCode(...bytes.subarray(at+4,at+8));if(length>1048576||at+12+length>bytes.length)throw Error('Ungültige Kartenkachel.');const data=bytes.subarray(at+8,at+8+length);if(tag==='IHDR'){width=view.getUint32(at+8);height=view.getUint32(at+12);depth=data[8];type=data[9];interlace=data[12];}if(tag==='PLTE')palette=data;if(tag==='tRNS')alpha=data;if(tag==='IDAT')idat.push(data);at+=length+12;}
 if(width!==256||height!==256||interlace||![0,2,3,4,6].includes(type)||![1,2,4,8].includes(depth)||type!==3&&depth!==8)throw Error('Nicht unterstütztes Kartenformat.');
 const channels=type===6?4:type===2?3:type===4?2:1,stride=Math.ceil(width*channels*depth/8),bpp=Math.max(1,Math.ceil(channels*depth/8)),compressed=new Uint8Array(idat.reduce((n,p)=>n+p.length,0));let cursor=0;for(const p of idat){compressed.set(p,cursor);cursor+=p.length;}
 const raw=new Uint8Array(await new Response(new Blob([compressed]).stream().pipeThrough(new DecompressionStream('deflate'))).arrayBuffer());if(raw.length!==(stride+1)*height)throw Error('Unvollständige Kartenkachel.');
 const scan=new Uint8Array(stride*height),mask=new Uint8Array(width*height/8);
 const paeth=(a:number,b:number,c:number)=>{const p=a+b-c,pa=Math.abs(p-a),pb=Math.abs(p-b),pc=Math.abs(p-c);return pa<=pb&&pa<=pc?a:pb<=pc?b:c;};
 for(let y=0;y<height;y++){const filter=raw[y*(stride+1)];if(filter>4)throw Error('Ungültiger PNG-Filter.');for(let x=0;x<stride;x++){const i=y*stride+x,left=x>=bpp?scan[i-bpp]:0,up=y?scan[i-stride]:0,corner=y&&x>=bpp?scan[i-stride-bpp]:0;scan[i]=(raw[y*(stride+1)+1+x]+(filter===1?left:filter===2?up:filter===3?Math.floor((left+up)/2):filter===4?paeth(left,up,corner):0))&255;}
  for(let x=0;x<width;x++){let r:number,g:number,b:number,a=255;const i=y*stride+x*channels;if(type===3){const bit=x*depth,index=scan[y*stride+(bit>>3)]>>(8-depth-bit%8)&((1<<depth)-1);r=palette[index*3];g=palette[index*3+1];b=palette[index*3+2];a=alpha[index]??255;}else if(type===0||type===4){r=g=b=scan[i];if(type===4)a=scan[i+1];}else{r=scan[i];g=scan[i+1];b=scan[i+2];if(type===6)a=scan[i+3];}
   if(a>220&&Math.abs(r-170)<=10&&Math.abs(g-211)<=10&&Math.abs(b-223)<=10)mask[(y*256+x)>>3]|=1<<((y*256+x)&7);
  }
 }
 return mask;
}
export function rasterShoreResult(plan:ReturnType<typeof rasterPlan>,masks:Map<string,Uint8Array>){
 const water=(x:number,y:number)=>{const key=Math.floor(x/256)+'/'+Math.floor(y/256),mask=masks.get(key);if(!mask)return false;const i=(y%256)*256+x%256;return !!(mask[i>>3]&(1<<(i&7)));},[west,south,east,north]=plan.box,[x0,y0,x1,y1]=plan.extent;let wet=0,nearest=Infinity;
 for(let y=y0;y<=y1;y++)for(let x=x0;x<=x1;x++){if(!water(x,y)||!water(x+1,y)||!water(x,y+1))continue;const dx=Math.max(west-x,0,x-east),dy=Math.max(north-y,0,y-south);nearest=Math.min(nearest,Math.hypot(dx,dy)*plan.metresPerPixel);if(x>=west&&x<=east&&y>=north&&y<=south)wet++;}
 const onLand=wet===0,nearWater=nearest<=125;return {valid:onLand&&nearWater,onLand,nearWater,distanceM:Number.isFinite(nearest)?Math.round(nearest):null,waterType:'water',method:'map-colors',note:'',error:!onLand?'Die gesamte Hafenfläche muss auf Land liegen.':!nearWater?'Kein Wasser im direkten Uferbereich der Baufläche erkannt (höchstens 125 m).':''};
}
