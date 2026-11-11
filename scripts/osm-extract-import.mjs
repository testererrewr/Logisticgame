import {createReadStream} from 'node:fs';
import {createInterface} from 'node:readline';
import {identifyPartner} from '../lib/logistics/engine.ts';
const [file,region='OSM-Extrakt']=process.argv.slice(2);
const AMENITY=new Set(['restaurant','cafe','fast_food','pub','bar','hospital','clinic','pharmacy','doctors','dentist','veterinary','recycling','fuel','marketplace','social_facility','nursing_home']);
const OFFICE=new Set(['logistics','transport','forestry','forest_management']),MAN=new Set(['works','mineshaft','adit','petroleum_well','water_works']),LAND=new Set(['farmyard','quarry','industrial','forest']);

export function matchesQuery(t){const named=!!t.name;return !!t.shop||!!t.craft||named&&!!t.industrial||named&&!!t.forestry||OFFICE.has(t.office)||AMENITY.has(t.amenity)||named&&LAND.has(t.landuse)||named&&MAN.has(t.man_made)||named&&t.building==='warehouse'||named&&!!t.farm;}
function centroid(g){if(!g)return null;const ring=g.type==='Point'?[g.coordinates]:g.type==='LineString'?g.coordinates:g.type==='Polygon'?g.coordinates[0]:g.type==='MultiPolygon'?g.coordinates.reduce((best,p)=>p[0].length>best.length?p[0]:best,[]):g.type==='MultiLineString'?g.coordinates.flat():null;if(!ring?.length)return null;let x=0,y=0;const pts=ring.length>1&&ring[0][0]===ring.at(-1)[0]&&ring[0][1]===ring.at(-1)[1]?ring.slice(0,-1):ring;for(const [lon,lat] of pts){x+=lon;y+=lat;}return [y/pts.length,x/pts.length];}
const q=s=>"'"+String(s).replace(/\u0000/g,'').replace(/'/g,"''")+"'";
const now=Date.now();let flushes=0,batch=[],read=0,kept=0,bad=0,skipped=0;const kinds={};
function flush(){if(!batch.length)return;process.stdout.write('BEGIN;\nINSERT INTO logistics_partner_registry(id,kind,name,lat,lon,payload,loaded) VALUES\n'+batch.join(',\n')+'\nON CONFLICT(id) DO UPDATE SET kind=excluded.kind,name=excluded.name,lat=excluded.lat,lon=excluded.lon,payload=excluded.payload,loaded=excluded.loaded;\nCOMMIT;\n'+(++flushes%20===0?"INSERT OR REPLACE INTO logistics_runtime(id,payload,updated) VALUES('osm-extract-active','1',"+Date.now()+");\n":'')+'.shell sleep 0.04\n');batch=[];}
process.stdout.write(".timeout 60000\nINSERT OR REPLACE INTO logistics_runtime(id,payload,updated) VALUES('osm-extract-active','1',"+Date.now()+");\n");
const rl=createInterface({input:createReadStream(file,{encoding:'utf8'}),crlfDelay:Infinity});
for await (let line of rl){line=line.replace(/^\u001e/,'').trim();if(!line)continue;read++;let f;try{f=JSON.parse(line);}catch{bad++;continue;}
 const p=f.properties||{},type=p['@type'],osmId=p['@id'];const tags={};for(const [k,v] of Object.entries(p))if(!k.startsWith('@')&&!(k.startsWith('name:')&&!['name:de','name:en'].includes(k)))tags[k]=String(v);
 if(!['node','way','relation'].includes(type)||!osmId||!matchesQuery(tags)){skipped++;continue;}
 const kind=identifyPartner(tags),name=String(tags.name||tags.brand||'').trim();if(!kind||name.length<2){skipped++;continue;}
 const c=centroid(f.geometry);if(!c||!Number.isFinite(c[0])||!Number.isFinite(c[1])||Math.abs(c[0])>90||Math.abs(c[1])>180){bad++;continue;}
 const id=`osm:${type}:${osmId}`,site={id,name:name.slice(0,120),lat:Math.round(c[0]*1e6)/1e6,lon:Math.round(c[1]*1e6)/1e6,kind,tags,osmUrl:`https://www.openstreetmap.org/${type}/${osmId}`};
 batch.push(`(${q(id)},${q(kind)},${q(site.name)},${site.lat},${site.lon},${q(JSON.stringify(site))},${now})`);kept++;kinds[kind]=(kinds[kind]||0)+1;if(batch.length>=200)flush();
 if(read%200000===0)process.stderr.write(`  ${region}: ${read.toLocaleString('de-DE')} Objekte gelesen, ${kept.toLocaleString('de-DE')} Betriebe\n`);
}
flush();
const top=Object.entries(kinds).sort((a,b)=>b[1]-a[1]).slice(0,8).map(([k,n])=>k+' '+n).join(', ');
process.stderr.write(`  ${region}: ${read} gelesen · ${kept} Betriebe übernommen · ${skipped} nicht passend · ${bad} fehlerhaft${top?' · '+top:''}\n`);

