// Unconfirmed game actions reuse their request ID, including a manual retry.
// The server records it atomically with the world state.
const unconfirmed=new Map<string,{id:string;at:number}>();
export async function requestApi(path:string,body?:unknown,fetcher:typeof fetch=fetch):Promise<any>{
 const action=!!body&&/^worlds\/[^/]+\/action$/.test(path),updatingWorld=/^worlds\/[^/]+\/(state|live)(?:\?|$)/.test(path),payload=body?JSON.stringify(body):undefined,signature=path+'|'+payload;
 for(const [key,value]of unconfirmed)if(value.at<Date.now()-300000)unconfirmed.delete(key);
 const request=action?(unconfirmed.get(signature)||{id:crypto.randomUUID(),at:Date.now()}):undefined;if(request)unconfirmed.set(signature,request);if(unconfirmed.size>50)unconfirmed.delete(unconfirmed.keys().next().value!);
 let last:Error=Error('Der Server ist gerade nicht erreichbar.');
 for(let attempt=0;attempt<(action?2:1);attempt++){
  try{const response=await fetcher('/api/'+path,{method:body?'POST':'GET',headers:{...(body?{'Content-Type':'application/json'}:{}),...(request?{'Idempotency-Key':request.id}:{})},body:payload,signal:body&&!action?undefined:AbortSignal.timeout(action||updatingWorld?60000:20000)});
   let data:any;try{data=await response.json();}catch{throw Error('Die Serverantwort wurde unterbrochen. Bitte erneut versuchen.');}
   if(!response.ok){const error=Object.assign(Error(data.error||'Verbindung fehlgeschlagen.'),{status:response.status});if(![502,503,504].includes(response.status)){if(request)unconfirmed.delete(signature);throw Object.assign(error,{final:true});}throw error;}
   if(request)unconfirmed.delete(signature);return data;
  }catch(error:any){if(error.final)throw error;last=error?.name==='TimeoutError'||error?.name==='AbortError'?Error(updatingWorld?'Live-Abgleich verzögert. Erneuter Versuch läuft.':action?'Die Speicherung dauert länger. Erneut versuchen führt diese Aktion nicht doppelt aus.':'Der Server antwortet gerade zu langsam. Bitte erneut versuchen.'):error instanceof TypeError?Error('Der Server ist gerade nicht erreichbar. Bitte die Verbindung prüfen und erneut versuchen.'):error;}
  if(action&&attempt===0)await new Promise(resolve=>setTimeout(resolve,250));
 }
 throw last;
}
