import {NextResponse} from 'next/server';
import {env} from 'cloudflare:workers';
import {instanceRole} from '../../../../lib/logistics/world-hosting';
export async function GET(){return NextResponse.json({role:instanceRole(),version:String((env as any).LOGISTIK_VERSION||'')},{headers:{'Cache-Control':'no-store'}});}
