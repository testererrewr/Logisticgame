// Wählt Geofabrik-Regionen für den Extrakt-Import aus.
// Aufruf: node scripts/osm-extract-regions.mjs <index-v1-nogeom.json> welt|liste|<id> [<id> …]
// Ausgabe: je Zeile "id<TAB>pbf-url"
import {readFileSync} from 'node:fs';
const [file,...args]=process.argv.slice(2);
const index=JSON.parse(readFileSync(file,'utf8')).features.map(f=>f.properties).filter(p=>p.urls?.pbf);
const byId=new Map(index.map(p=>[p.id,p]));
// Große Kontinente werden in Länder geteilt (kleinere Downloads, geringerer Speicherbedarf, Fortsetzen pro Land)
const SPLIT=new Set(['europe','asia','north-america','us','africa','south-america']);
// Überlappende Sammelregionen, deren Inhalt schon über die Länder abgedeckt ist
const SKIP=new Set(['alps','dach','britain-and-ireland','us-midwest','us-northeast','us-pacific','us-south','us-west','great-britain']);
function expand(id){const p=byId.get(id);if(!p)return [];if(!SPLIT.has(id))return [p];const kids=index.filter(k=>k.parent===id&&!SKIP.has(k.id));return kids.length?kids.flatMap(k=>expand(k.id)):[p];}
let out=[];
if(!args.length||args[0]==='liste'){for(const p of index)console.log(`${p.id}\t${p.parent||'-'}\t${p.name}`);process.exit(0);}
if(args[0]==='welt')out=index.filter(p=>!p.parent).flatMap(p=>expand(p.id));
else for(const a of args){const id=a.split('/').pop();if(!byId.has(id)){console.error('Unbekannte Region: '+a+' (Liste: node scripts/osm-extract-regions.mjs <index> liste)');process.exit(2);}out.push(...expand(id));}
const seen=new Set();for(const p of out){if(seen.has(p.id))continue;seen.add(p.id);console.log(`${p.id}\t${p.urls.pbf}`);}
