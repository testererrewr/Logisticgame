import type {State} from './engine';
const PREFIX='gz:';
export async function encodeCompany(state:State):Promise<string>{
 const text=JSON.stringify(state);if(text.length<1500000)return text;
 const raw=new Uint8Array(await new Response(new Blob([text]).stream().pipeThrough(new CompressionStream('gzip'))).arrayBuffer());
 let b64:string;if(typeof Buffer!=='undefined')b64=Buffer.from(raw).toString('base64');else{let binary='';for(let i=0;i<raw.length;i+=8192)binary+=String.fromCharCode(...raw.subarray(i,i+8192));b64=btoa(binary);}
 const out=PREFIX+b64;if(out.length>1900000)throw Error('Spielstand zu groß zum Speichern.');return out;
}
export async function decodeCompany(value:string):Promise<State>{
 if(!value.startsWith(PREFIX))return JSON.parse(value) as State;
 const b64=value.slice(PREFIX.length),raw=typeof Buffer!=='undefined'?new Uint8Array(Buffer.from(b64,'base64')):Uint8Array.from(atob(b64),x=>x.charCodeAt(0));
 return JSON.parse(await new Response(new Blob([raw]).stream().pipeThrough(new DecompressionStream('gzip'))).text()) as State;
}
