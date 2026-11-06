export const sections={auctions:'versteigerungen',tenders:'ausschreibungen',usedMarket:'gebrauchtmarkt',workshop:'werkstatt',operations:'betrieb',journey:'verbindungen',messages:'nachrichten',network:'karte',lines:'linien',fleet:'flotte',depots:'depots',market:'fahrzeugmarkt',companies:'unternehmen',statistics:'statistik',finance:'finanzen',demand:'nachfrage'} as const;
export type GameSection=keyof typeof sections;
export function worldHref(world:string,section:GameSection='network'){return '/welt/'+encodeURIComponent(world)+'/'+sections[section];}
export function parseGamePath(path:string):{kind:string;worldId?:string;section?:GameSection;adminWorld?:string;adminView?:'settings'|'companies';adminSection?:'worlds'|'users'|'audit'|'reports'}{
 const parts=path.split('/').filter(Boolean);if(!parts.length)return {kind:'lobby'};
 if(parts.length===3&&parts[0]==='welt'){const section=(Object.keys(sections) as GameSection[]).find(key=>sections[key]===parts[2]);try{if(section)return {kind:'world',worldId:decodeURIComponent(parts[1]),section};}catch{}return {kind:'missing'};}
 if(parts.length===4&&parts[0]==='verwaltung'&&parts[1]==='welten'&&['einstellungen','unternehmen'].includes(parts[3]))return {kind:'admin',adminSection:'worlds',adminWorld:decodeURIComponent(parts[2]),adminView:parts[3]==='einstellungen'?'settings':'companies'};
 if(parts.length===2&&parts[0]==='verwaltung'){const adminSection=({welten:'worlds',benutzer:'users',protokoll:'audit',meldungen:'reports'} as const)[parts[1] as 'welten'|'benutzer'|'protokoll'|'meldungen'];return adminSection?{kind:'admin',adminSection}:{kind:'missing'};}
 if(parts.length===1)return {kind:({verwaltung:'admin',konto:'account',hilfe:'help',anmelden:'auth',nachfrage:'lab'} as Record<string,string>)[parts[0]]||'missing'};return {kind:'missing'};
}
export function safeReturnPath(path:string|null){if(!path||!path.startsWith('/')||path.startsWith('//')||path.includes('\\'))return '/';const route=parseGamePath(path.split('?')[0]);return ['world','account','admin','help','lobby'].includes(route.kind)?path:'/';}
