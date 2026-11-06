import {env} from 'cloudflare:workers';
import {coordinatePlace,type PlaceResult} from './places';
import {providerPlaces} from './place-provider';

const memory=new Map<string,{at:number;places:PlaceResult[]}>();
export async function searchPlaces(value:string){
 const query=value.trim().replace(/\s+/g,' ');
 if(query.length<2||query.length>160)throw Error('Suchbegriff: 2–160 Zeichen.');
 const coordinate=coordinatePlace(query);if(coordinate)return [coordinate];
 const key='place-search:v2:'+query.toLocaleLowerCase('de'),now=Date.now();
 let cached=memory.get(key);
 if(!cached){const row=await env.DB!.prepare('SELECT payload,created FROM map_snapshots WHERE id=?').bind(key).first<any>();if(row)try{cached={at:row.created,places:JSON.parse(row.payload)};}catch{}}
 if(cached&&now-cached.at<(cached.places.length?7*86400000:3600000))return cached.places;
 const allowed=await env.DB!.prepare('INSERT INTO limits(id,hits,expires) VALUES(?,1,?) ON CONFLICT(id) DO UPDATE SET expires=excluded.expires WHERE limits.expires<=? RETURNING id').bind('world-place-search',now+1100,now).first();
 if(!allowed){if(cached?.places.length)return cached.places;throw Object.assign(Error('Bitte einen Moment warten und die Suche erneut starten.'),{status:429});}
 let places:PlaceResult[];try{places=await providerPlaces(query,(env as any).PLACE_SEARCH_URL);}catch(e){if(cached?.places.length&&now-cached.at<30*86400000)return cached.places;throw e;}
 memory.set(key,{at:now,places});if(memory.size>128)memory.delete(memory.keys().next().value!);
 await env.DB!.prepare('INSERT OR REPLACE INTO map_snapshots(id,payload,created) VALUES(?,?,?)').bind(key,JSON.stringify(places),now).run();
 return places;
}
