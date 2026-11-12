export interface ChangelogEntry {id:string;date:string;title:string;items:string[];code?:string}
export interface CodeUpdate {id:string;items:string[]}
export const CODE_UPDATES:CodeUpdate[]=[
 {id:'u54',items:['Anmeldung mit Google und Discord','E-Mail bestätigen und Passwort zurücksetzen','Premium mit Stripe oder PayPal','Discord-Link in Lobby und Spiel','Roadmap in der Lobby','Wochen-Highlights in der Zeitung','Weltenliste aufgeräumt: Fahrzeuge, Startkapital, Region','Fahrzeugtempo verständlicher: Ø Reisetempo und Höchstgeschwindigkeit','Spiel auf Englisch umschaltbar']},
];
export const updateNumber=(id:string)=>Number(String(id).replace(/\D/g,''))||0;
export function pendingUpdates(list:CodeUpdate[],lastCode:string|undefined){const last=updateNumber(lastCode||'');return list.filter(u=>updateNumber(u.id)>last).sort((a,b)=>updateNumber(a.id)-updateNumber(b.id));}
