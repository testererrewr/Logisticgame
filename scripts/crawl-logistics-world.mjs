// Public OSM-cache work only. No login, credentials or player-state mutations.
const origin=new URL(process.argv[2]||'https://weltverbund-logistik.serphil.chatgpt.site');
if(!['http:','https:'].includes(origin.protocol))throw Error('HTTP(S)-Spieladresse angeben.');
let stopping=false;process.on('SIGINT',()=>{stopping=true;});process.on('SIGTERM',()=>{stopping=true;});
const once=process.argv.includes('--once');let failures=0,last='';
do{try{const response=await fetch(new URL('/api/logistik/import/progress',origin),{signal:AbortSignal.timeout(12000),headers:{Accept:'application/json'}});if(!response.ok)throw Error('HTTP '+response.status);const p=await response.json();failures=0;const key=JSON.stringify([p.enabled,p.completedRoots,p.completedCells,p.savedObjects,p.lastError]);if(key!==last){console.log(new Date().toISOString(),p.enabled?'läuft':'pausiert',`${p.completedRoots}/${p.totalRoots} Weltgebiete · ${p.completedCells} Teilgebiete · ${p.savedObjects} gespeicherte Datensätze`,p.lastError||'');last=key;}if(p.complete){console.log('Weltimport abgeschlossen.');break;}}
catch(e){failures++;console.error(new Date().toISOString(),'Wird erneut versucht:',e.message);}
if(once||stopping)break;const delay=Math.min(300000,20000*2**Math.min(failures,4));for(let ms=0;ms<delay&&!stopping;ms+=1000)await new Promise(r=>setTimeout(r,1000));
}while(!stopping);
