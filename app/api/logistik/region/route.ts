import {NextRequest,NextResponse} from 'next/server';
import {worldSettings,regionGeometry} from '../../../../lib/logistics/world-region-server';
import {settingsSummary} from '../../../../lib/logistics/world-settings';
const memo=new Map<string,{key:string;body:string}>();
export async function GET(req:NextRequest){try{
 const worldId=(req.nextUrl.searchParams.get('world')||'').slice(0,100);if(!worldId)return NextResponse.json({error:'Welt fehlt.'},{status:400});
 const settings=await worldSettings(worldId),key=JSON.stringify(settings.region);let hit=memo.get(worldId);
 if(!hit||hit.key!==key){hit={key,body:JSON.stringify({settings:settingsSummary(settings),geometry:regionGeometry(settings)})};memo.set(worldId,hit);if(memo.size>50)memo.delete(memo.keys().next().value!);}
 return new NextResponse(hit.body,{headers:{'Content-Type':'application/json','Cache-Control':'private, max-age=600'}});
}catch(e:any){return NextResponse.json({error:e.message||'Region nicht verfügbar.'},{status:503});}}
