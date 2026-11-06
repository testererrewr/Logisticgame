import {notFound} from 'next/navigation';
export default async function AdminPage({params}:{params:Promise<{section:string}>}){if(!['welten','benutzer','protokoll','meldungen'].includes((await params).section))notFound();return null;}
