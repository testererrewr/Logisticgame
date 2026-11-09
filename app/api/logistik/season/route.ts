import {NextRequest,NextResponse} from 'next/server';
import {currentUser} from '../online/route';
import {seasonResults,seasonBadges} from '../../../../lib/logistics/season-server';

export async function GET(req:NextRequest){try{
 const u=await currentUser(req);if(!u||u.status!=='active')return NextResponse.json({error:'Bitte anmelden.'},{status:401});
 const world=(req.nextUrl.searchParams.get('world')||'').slice(0,100);
 return NextResponse.json(world?{me:u.id,rows:await seasonResults(world)}:{me:u.id,badges:await seasonBadges(u.id)},{headers:{'Cache-Control':'no-store'}});
}catch(e:any){return NextResponse.json({error:e.message||'Endwertung nicht verfügbar.'},{status:503});}}
