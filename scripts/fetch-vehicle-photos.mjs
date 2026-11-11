#!/usr/bin/env node

import {readFileSync,writeFileSync,existsSync,mkdirSync} from 'node:fs';
import {join} from 'node:path';

const ROOT=process.cwd();
const GALLERY=join(ROOT,'data/logistics-vehicle-gallery.json');
const OUT=join(ROOT,'public/logistics-vehicles');
const UA='WeltverbundLogistik/1.0 (vehicle photo import script)';
const API='https://commons.wikimedia.org/w/api.php';
const FREE=/^(CC0|CC BY|CC-BY|CC BY-SA|CC-BY-SA|Public domain|PD)/i;

const SEARCH={
 'vossloh-dm20':['Vossloh DM 20 locomotive','Vossloh DM20'],
 'siemens-vectron-dual':['Vectron Dual Mode 248','Siemens Vectron DM 248'],
 'bombardier-traxx-ac3':['Traxx AC3 locomotive','Traxx F140 AC3'],
 'stadler-euro6000':['Stadler Euro6000','Euro 6000 locomotive'],
 'sietas-type-178':['Sietas Type 178 ship','Sietas 178 container feeder'],
 'hyundai-mipo-1800teu':['Hyundai Mipo 1800 TEU container ship','1800 TEU feeder container ship'],
 'oshima-ultramax':['Oshima Ultramax bulk carrier','Ultramax bulk carrier ship'],
 'tsuneishi-kamsarmax':['Tsuneishi Kamsarmax bulk carrier','Kamsarmax bulk carrier'],
 'hyundai-mipo-mr-tanker':['Hyundai Mipo product tanker','MR product tanker ship'],
 'meyer-neptun-inland':['Neptun Werft Binnentanker','inland tanker ship Rhine'],

 'classic-ford-model-aa':['Ford Model AA truck','Ford AA 1930 truck'],
 'classic-mercedes-l3500':['Mercedes-Benz L 3500','Mercedes L3500 Lastwagen'],
 'classic-hanomag-l28':['Hanomag L 28','Hanomag L28 Lastwagen'],
 'classic-magirus-s3500':['Magirus-Deutz S 3500','Magirus Deutz Rundhauber'],
 'classic-man-19304':['MAN 19.304','MAN 19.304 truck'],
 'classic-vw-t1-pritsche':['VW T1 Pritsche','Volkswagen Type 2 T1 pickup'],
 'classic-unimog-404':['Unimog 404','Mercedes-Benz Unimog 404 S'],
 'classic-man-kat1':['MAN KAT1 7t','MAN KAT 1 mil gl'],
 'classic-magirus-lf16':['Magirus LF 16 Feuerwehr','Magirus-Deutz LF 16'],
 'classic-mercedes-lp1113':['Mercedes-Benz LP 1113','Mercedes LP 1113 Feuerwehr'],
 'classic-daf-turbo-twin':['DAF Turbo Twin','DAF Turbo Twin Dakar'],
 'classic-man-dakar-service':['MAN Dakar rally truck','MAN Rallye Dakar'],
 'classic-br01-dampflok':['DR Baureihe 01 Dampflok','Class 01 steam locomotive 01 118'],
 'classic-sbb-krokodil':['SBB Ce 6/8 II Krokodil','Krokodil Lokomotive Ce 6/8'],
 'classic-kuemo-1950':['Küstenmotorschiff Museumsschiff','Kümo museum ship'],
 'classic-rhine-barge':['Johann Welker Binnenschiff','Rheinschiff Typ Johann Welker'],
 'classic-douglas-dc3':['Douglas DC-3 cargo','Douglas C-47 Skytrain'],
 'classic-junkers-ju52':['Junkers Ju 52/3m','Junkers Ju 52 D-AQUI'],
 'classic-antonov-an2':['Antonov An-2','Antonow An-2 Doppeldecker'],
 'classic-lockheed-l188':['Lockheed L-188 Electra freighter','Lockheed Electra cargo'],
 'boeing-757-200pcf':['Boeing 757-200PCF','Boeing 757 freighter'],
 'boeing-747-8f':['Boeing 747-8F','747-8 Freighter'],
 'airbus-a350f':['Airbus A350F','A350 freighter'],
 'antonov-an-124-100':['Antonov An-124','An-124 Ruslan'],
 'atr-42-300f':['ATR 42-300F','ATR 42 freighter'],
 'dhc-8-300-freighter':['Dash 8-300 freighter','DHC-8-300 cargo'],
 'saab-340a-freighter':['Saab 340 freighter','Saab 340A cargo'],
 'cessna-208b-grand-caravan-cargo':['Cessna 208B Grand Caravan cargo','Cessna 208 FedEx'],
};

const gallery=JSON.parse(readFileSync(GALLERY,'utf8'));
mkdirSync(OUT,{recursive:true});
const strip=(html='')=>String(html).replace(/<[^>]*>/g,'').replace(/\s+/g,' ').trim();
const sleep=ms=>new Promise(r=>setTimeout(r,ms));
async function api(params){const url=API+'?'+new URLSearchParams({format:'json',origin:'*',...params});for(let i=0;;i++){await sleep(1200);const r=await fetch(url,{headers:{'User-Agent':UA}});if(r.status===429&&i<3){await sleep(15000*(i+1));continue;}if(!r.ok)throw Error('Commons HTTP '+r.status);return r.json();}}

async function findPhoto(terms){
 for(const term of terms){
  const search=await api({action:'query',list:'search',srnamespace:'6',srlimit:'10',srsearch:term+' filetype:bitmap'});
  for(const hit of search.query?.search||[]){
   const info=await api({action:'query',titles:hit.title,prop:'imageinfo',iiprop:'url|extmetadata|mime',iiurlwidth:'640'});
   const page=Object.values(info.query?.pages||{})[0],ii=page?.imageinfo?.[0];
   if(!ii||!/^image\/(jpeg|png|webp)$/.test(ii.mime)||!ii.thumburl)continue;
   const meta=ii.extmetadata||{},license=strip(meta.LicenseShortName?.value);
   if(!FREE.test(license))continue;
   return {title:hit.title,thumb:ii.thumburl,source:ii.descriptionurl,author:strip(meta.Artist?.value)||'Wikimedia Commons',license,licenseUrl:strip(meta.LicenseUrl?.value)||ii.descriptionurl};
  }
 }
}

let changed=0;
for(const [id,terms] of Object.entries(SEARCH)){
 const current=gallery[id];
 if(current&&current.match!=='symbol'&&current.match!=='illustration'&&existsSync(join(ROOT,'public',current.path||'')))continue;
 try{
  const photo=await findPhoto(terms);
  if(!photo){console.log(`- ${id}: kein frei lizenziertes Foto gefunden, Symbolbild bleibt.`);continue;}
  const ext=photo.thumb.split('?')[0].split('.').pop().toLowerCase().replace('jpeg','jpg');
  const r=await fetch(photo.thumb,{headers:{'User-Agent':UA}});if(!r.ok)throw Error('Download HTTP '+r.status);
  const file=`${id}.${ext}`;writeFileSync(join(OUT,file),Buffer.from(await r.arrayBuffer()));
  const name=photo.title.replace(/^File:/,'').replace(/\.[a-z]+$/i,'');
  gallery[id]={path:'/logistics-vehicles/'+file,alt:name,caption:name,depicted:photo.title,sourceUrl:photo.source,originalUrl:photo.thumb,author:photo.author,attribution:'',license:photo.license,licenseUrl:photo.licenseUrl,changes:'Vorschaubild 640 px von Wikimedia Commons.',match:'search',exactModelPhotoAvailable:true};
  changed++;writeFileSync(GALLERY,JSON.stringify(gallery,null,1));console.log(`+ ${id}: ${photo.title} (${photo.license})`);
  await new Promise(res=>setTimeout(res,600));
 }catch(e){console.log(`! ${id}: ${e.message}`);}
}
if(changed)writeFileSync(GALLERY,JSON.stringify(gallery,null,1));
console.log(changed?`${changed} Fotos übernommen. Bitte die Bilder einmal ansehen – die Suche ist automatisch.`:'Keine neuen Fotos.');
