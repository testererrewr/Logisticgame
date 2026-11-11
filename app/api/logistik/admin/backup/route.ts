import {NextResponse} from 'next/server';
const gone=()=>NextResponse.json({error:'Die Vollsicherung im Adminbereich wurde entfernt. Sicherungen laufen auf dem Server (deploy/backup.sh).'},{status:410});
export const GET=gone;
export const POST=gone;
