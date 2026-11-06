import {redirect} from 'next/navigation';
import {worldHref} from '../../../../lib/app-routes';
export default async function Page({params}:{params:Promise<{worldId:string}>}){redirect(worldHref((await params).worldId));}
