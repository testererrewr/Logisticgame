import {readSheet} from 'read-excel-file/node';
import {stat,readFile,writeFile} from 'node:fs/promises';
import {pathToFileURL} from 'node:url';
import {catalogFields,validateCatalog,mergeCatalog} from '../lib/catalog-schema.mjs';
export async function readCatalogWorkbook(file){
 if(!file.toLowerCase().endsWith('.xlsx'))throw Error('Eine .xlsx-Datei angeben.');if((await stat(file)).size>5000000)throw Error('Excel-Datei größer als 5 MB.');
 const rows=await readSheet(file,{sheet:'Fahrzeuge'}),at=rows.findIndex(r=>r.includes('id')&&r.includes('mode'));if(at<0)throw Error('Spaltenkopf id/mode im Blatt Fahrzeuge fehlt.');
 const header=rows[at].map(x=>String(x??'').trim()),missing=catalogFields.filter(k=>!['trainRole','acceleration','braking','traction','energyType','consumptionPerKm'].includes(k)&&!header.includes(k));if(missing.length)throw Error('Fehlende Spalten: '+missing.join(', '));
 if(new Set(header.filter(Boolean)).size!==header.filter(Boolean).length)throw Error('Doppelte Spaltenköpfe.');
 const input=rows.slice(at+1).filter(r=>r.some(v=>v!==null&&v!=='')).map(r=>Object.fromEntries([...catalogFields,...header.includes('rangeKm')?['rangeKm']:[]].map(k=>{let v=r[header.indexOf(k)]??null;if(k==='available'&&typeof v!=='boolean'){if(v===1||typeof v==='string'&&/^(TRUE|WAHR)$/i.test(v))v=true;else if(v===0||typeof v==='string'&&/^(FALSE|FALSCH)$/i.test(v))v=false;}return [k,v];})));return validateCatalog(input);
}
export function catalogDiff(before,after){const ids=new Set(after.map(m=>m.id));return {added:after.filter(m=>!before.some(p=>p.id===m.id)).map(m=>m.id),changed:after.filter(m=>{const old=before.find(p=>p.id===m.id);return old&&(catalogFields.some(k=>old[k]!==m[k])||old.rangeKm!==m.rangeKm);}).map(m=>m.id),retired:before.filter(m=>!ids.has(m.id)||after.find(n=>n.id===m.id)?.available===false).map(m=>m.id)};}
async function main(){
 const args=process.argv.slice(2),file=args[0];if(!file||file==='--help'){console.log('Prüfen: node scripts/vehicle-catalog.mjs Fahrzeugkatalog.xlsx\nPush:   node scripts/vehicle-catalog.mjs Fahrzeugkatalog.xlsx --server https://DEIN-SERVER --token-file SCHLUESSEL.txt --push\nOptional: --expected-revision N, --out katalog.json');return;}
 const known=new Set(['--server','--token-file','--push','--expected-revision','--out']);for(let i=1;i<args.length;i++){if(!known.has(args[i]))throw Error('Unbekannter Parameter: '+args[i]);if(args[i]!=='--push'){if(!args[i+1]||args[i+1].startsWith('--'))throw Error('Wert fehlt: '+args[i]);i++;}}
 const option=k=>args.includes(k)?args[args.indexOf(k)+1]:undefined,models=await readCatalogWorkbook(file),server=option('--server'),push=args.includes('--push');
 if(option('--out'))await writeFile(option('--out'),JSON.stringify(models,null,2)+'\n');
 console.log('Excel geprüft: '+models.length+' Modelle, '+models.filter(m=>m.available).length+' kaufbar.');
 if(!server){if(push)throw Error('--push benötigt --server und einen Backend-Schlüssel.');console.log('Nur lokale Prüfung. Es wurde nichts veröffentlicht.');return;}
 const url=new URL(server);if(url.pathname!=='/'||url.search||url.hash||url.username||url.password||url.protocol!=='https:'&&!(url.protocol==='http:'&&['localhost','127.0.0.1'].includes(url.hostname)))throw Error('Server muss ein HTTPS-Ursprung sein. HTTP ist nur für lokale Tests erlaubt.');
 const token=option('--token-file')?(await readFile(option('--token-file'),'utf8')).trim():process.env.CATALOG_PUSH_TOKEN;if(!token||!/^[A-Za-z0-9_-]{40,200}$/.test(token))throw Error('Backend-Schlüssel fehlt oder hat ein ungültiges Format.');
 const endpoint=new URL('/api/internal/vehicle-catalog',url),request=async(method,body)=>{const r=await fetch(endpoint,{method,redirect:'error',signal:AbortSignal.timeout(30000),headers:{Authorization:'Bearer '+token,...(body?{'Content-Type':'application/json'}:{})},body:body?JSON.stringify(body):undefined});const data=await r.json();if(!r.ok)throw Error('Server '+r.status+': '+(data.error||'Katalogaktion fehlgeschlagen'));return data;};
 const current=await request('GET');if(option('--expected-revision')!==undefined&&Number(option('--expected-revision'))!==current.revision)throw Error('Unerwartete Serverrevision '+current.revision+'. Zuerst Änderungen prüfen.');
 mergeCatalog(current.models,models);console.log('Serverrevision: '+current.revision);console.log('Änderungen: '+JSON.stringify(catalogDiff(current.models,models)));
 if(!push){console.log('Vorschau. Zum Veröffentlichen denselben Befehl mit --push --expected-revision '+current.revision+' ausführen.');return;}
 const result=await request('PUT',{models,baseRevision:current.revision});console.log(result.unchanged?'Katalog ist bereits aktuell.':'Veröffentlicht: Revision '+result.revision+', '+result.count+' Modelle.');
}
if(process.argv[1]&&import.meta.url===pathToFileURL(process.argv[1]).href)main().catch(e=>{console.error(e.message);process.exitCode=1;});
