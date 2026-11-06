import {readMapCache,writeMapCache} from './map-cache';
import {getMap,registerMap,type RealMap} from './real-map';
const pending=new Map<string,Promise<RealMap>>();
export function clientMap(key:string,onRetry?:(attempt:number)=>void){
 const existing=getMap(key);if(existing)return Promise.resolve(existing);
 if(pending.has(key))return pending.get(key)!;
 const task=(async()=>{const saved=await Promise.race([readMapCache(key).catch(()=>null),new Promise<null>(resolve=>setTimeout(()=>resolve(null),80))]);if(saved?.key===key&&saved.zones?.length===6400&&Array.isArray(saved.nodes)&&Array.isArray(saved.roads)){registerMap(saved);return saved;}let last:Error=Error('Kartendaten fehlen.');
  for(let attempt=0;attempt<3;attempt++){
   if(attempt){onRetry?.(attempt);await new Promise(resolve=>setTimeout(resolve,attempt===1?500:1500));}
   try{const r=await fetch('/api/map/'+encodeURIComponent(key),{signal:AbortSignal.timeout(55000)}),d:any=await r.json();if(!r.ok){last=Error(d.error||'Kartendaten fehlen.');if(r.status!==429&&r.status<500)throw Object.assign(last,{permanent:true});continue;}if(!d.map?.nodes||d.map.zones?.length!==6400)throw Error('Unvollständige Kartendaten.');registerMap(d.map);void writeMapCache(d.map);return d.map as RealMap;}catch(e:any){if(e.permanent)throw e;last=e;}
  }throw last;
 })();pending.set(key,task);task.then(()=>pending.delete(key),()=>pending.delete(key));return task;
}
