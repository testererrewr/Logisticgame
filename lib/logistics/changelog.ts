export interface ChangelogEntry {id:string;date:string;title:string;items:string[];code?:string}
export interface CodeUpdate {id:string;items:string[]}
export const CODE_UPDATES:CodeUpdate[]=[
 {id:'u57',items:['Verwaltung und Karte laden nach dem Weltimport wieder schnell']},
 {id:'u55',items:['Neuer Name: Loadstar – neues Logo und neue Adresse playloadstar.com','Neue Startseite mit deinen Speditionen und eigener Seite „Welten“','Premium für 1, 3 oder 12 Monate (12 Monate mit 2 Monaten gratis)','Premium: Priority Support, Discord-Rolle und bis zu 5 Welten','AGB mit Rücktrittsrecht','Linien zeigen Tagesbedarf und Versorgung','Schnellere Lkw-Modelle fahren jetzt spürbar schneller','Roadmap und Premium auf Englisch','Roadmap, Premium und Neuigkeiten direkt in der Startseite','Sprachumschalter repariert, Verwaltung lädt schneller']},
 {id:'u54',items:['Anmeldung mit Google und Discord','E-Mail bestätigen und Passwort zurücksetzen','Premium mit Stripe oder PayPal','Discord-Link in Lobby und Spiel','Roadmap in der Lobby','Wochen-Highlights in der Zeitung','Weltenliste aufgeräumt: Fahrzeuge, Startkapital, Region','Fahrzeugtempo verständlicher: Ø Reisetempo und Höchstgeschwindigkeit','Spiel auf Englisch umschaltbar']},
];
export const updateNumber=(id:string)=>Number(String(id).replace(/\D/g,''))||0;
export function pendingUpdates(list:CodeUpdate[],lastCode:string|undefined){const last=updateNumber(lastCode||'');return list.filter(u=>updateNumber(u.id)>last).sort((a,b)=>updateNumber(a.id)-updateNumber(b.id));}
