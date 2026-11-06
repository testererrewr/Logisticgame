import {notFound} from 'next/navigation';
import {sections} from '../../../../../lib/app-routes';
export default async function WorldPage({params}:{params:Promise<{worldId:string;section:string}>}){const p=await params;if(!(Object.values(sections) as string[]).includes(p.section))notFound();return null;}
