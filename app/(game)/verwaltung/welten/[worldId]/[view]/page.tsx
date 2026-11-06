import {notFound} from 'next/navigation';
export default async function Page({params}:{params:Promise<{view:string}>}){if(!['einstellungen','unternehmen'].includes((await params).view))notFound();return null;}
