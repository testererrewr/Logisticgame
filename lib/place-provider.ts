import {photonPlaces,nominatimPlaces,type PlaceResult} from './places';

export async function providerPlaces(query:string,photon='https://photon.komoot.io/api/',fetcher:typeof fetch=fetch,hedgeMs=700):Promise<PlaceResult[]>{
 const controller=new AbortController();let timer:ReturnType<typeof setTimeout>|undefined;
 const headers={'User-Agent':'Weltverbund/1.0 (+https://play.crackgaming.org)','Accept':'application/json'};
 const load=async(url:URL,parse:(raw:any)=>PlaceResult[])=>{const r=await fetcher(url.toString(),{headers,signal:AbortSignal.any([controller.signal,AbortSignal.timeout(9000)])});if(!r.ok)throw Error('Geocoder '+r.status);return parse(await r.json());};
 const primary=new URL(photon);primary.searchParams.set('q',query);primary.searchParams.set('limit','6');primary.searchParams.set('lang','de');
 const fallback=new URL('https://nominatim.openstreetmap.org/search');fallback.searchParams.set('q',query);fallback.searchParams.set('limit','6');fallback.searchParams.set('format','jsonv2');fallback.searchParams.set('addressdetails','1');fallback.searchParams.set('accept-language','de');
 const first=load(primary,photonPlaces);
 const delay=new Promise<void>(resolve=>{timer=setTimeout(resolve,hedgeMs);first.catch(()=>resolve());});
 try{return await Promise.any([first,delay.then(()=>load(fallback,nominatimPlaces))]);}
 catch{throw Object.assign(Error('Ortssuche vorübergehend nicht erreichbar. Bitte erneut suchen oder Koordinaten eingeben.'),{status:503});}
 finally{clearTimeout(timer);controller.abort();}
}
