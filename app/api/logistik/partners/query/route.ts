import {applyRules,readPartnerRules} from '../../../../../lib/logistics/partner-rules-store';
import {NextRequest,NextResponse} from 'next/server';
import {savePartners,seedRegistry} from '../../../../../lib/logistics/partner-registry';
import {env} from 'cloudflare:workers';
import {identifyPartner,type Site} from '../../../../../lib/logistics/engine';
// Explicit name searches only. Never use Nominatim to enumerate an area.
export async function GET(req:NextRequest){try{
 const query=(req.nextUrl.searchParams.get('q')||'').trim();if(query.length<3||query.length>120)return NextResponse.json({error:'Betriebsname mit Ort eingeben (3–120 Zeichen).'},{status:400});
 await seedRegistry();const registry=await env.DB!.prepare('SELECT payload FROM logistics_partner_registry WHERE name LIKE ? ORDER BY name LIMIT 200').bind('%'+query+'%').all<{payload:string}>();const known=applyRules(registry.results.map(r=>JSON.parse(r.payload)),await readPartnerRules());if(known.length)return NextResponse.json({sites:known,source:'Weltweites Serverregister'},{headers:{'Cache-Control':'no-store'}});
 const key='logistics-partner-search:'+query.toLowerCase(),now=Date.now();
 const saved=await env.DB!.prepare('SELECT payload,created FROM map_snapshots WHERE id=?').bind(key).first<{payload:string;created:number}>();
 if(saved){const data=JSON.parse(saved.payload);return NextResponse.json({...data,sites:applyRules(data.sites,await readPartnerRules())},{headers:{'Cache-Control':'no-store'}});}
 const allowed=await env.DB!.prepare('INSERT INTO limits(id,hits,expires) VALUES(?,1,?) ON CONFLICT(id) DO UPDATE SET expires=excluded.expires WHERE limits.expires<=? RETURNING id').bind('world-place-search',now+1100,now).first();
 if(!allowed)return NextResponse.json({error:'Bitte einen Moment warten und erneut suchen.'},{status:429});
 const url=new URL('https://nominatim.openstreetmap.org/search');url.searchParams.set('q',query);url.searchParams.set('format','jsonv2');url.searchParams.set('limit','8');url.searchParams.set('extratags','1');
 const response=await fetch(url,{headers:{Accept:'application/json','User-Agent':'WeltverbundLogistik/2.0 (+https://play.crackgaming.org)'},signal:AbortSignal.timeout(10000)});if(!response.ok)throw Error('Betriebssuche vorübergehend nicht erreichbar.');
 const raw:any=await response.json();if(!Array.isArray(raw))throw Error('Ungültige Suchantwort.');
 const sites:Site[]=[];
 for(const r of raw){const tags={...(r.extratags||{}),[r.category]:r.type,name:r.name},kind=identifyPartner(tags),lat=Number(r.lat),lon=Number(r.lon);if(!kind||!r.name||!Number.isFinite(lat)||!Number.isFinite(lon)||!['node','way','relation'].includes(r.osm_type)||!Number.isSafeInteger(r.osm_id))continue;sites.push({id:`osm:${r.osm_type}:${r.osm_id}`,name:r.name,kind,lat,lon,tags,osmUrl:`https://www.openstreetmap.org/${r.osm_type}/${r.osm_id}`});}
 await savePartners(sites);
 const payload={sites,source:'OpenStreetMap / Nominatim · Namenssuche'};await env.DB!.prepare('INSERT OR REPLACE INTO map_snapshots(id,payload,created) VALUES(?,?,?)').bind(key,JSON.stringify(payload),now).run();
 return NextResponse.json({...payload,sites:applyRules(sites,await readPartnerRules())},{headers:{'Cache-Control':'no-store'}});
 }catch(e:any){return NextResponse.json({error:e.message||'Betriebssuche fehlgeschlagen.'},{status:503});}}
