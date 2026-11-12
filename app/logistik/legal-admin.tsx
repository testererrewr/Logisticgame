'use client';
import {useEffect,useState} from 'react';
const IMPRESSUM=`# Angaben gemäß § 5 DDG

[Vor- und Nachname / Firma]
[Straße Hausnummer]
[PLZ Ort]
[Land]

## Kontakt

E-Mail: [E-Mail-Adresse]

## Verantwortlich für den Inhalt

[Vor- und Nachname, Anschrift wie oben]

## Hinweis

Weltverbund Logistik ist ein Browserspiel. Standorte stammen aus OpenStreetMap (© OpenStreetMap-Mitwirkende, ODbL). Waren, Preise und Ereignisse sind Spielwerte.

## Bildnachweise

Fahrzeugfotos stammen von Wikimedia Commons unter freien Lizenzen (z. B. CC BY-SA). Urheber und Lizenz jedes Bildes: siehe Seite „Bildnachweise“ (/bildnachweise). Fahrzeugnamen und Marken gehören ihren jeweiligen Inhabern; es besteht keine Verbindung zu den Herstellern.`;
const DATENSCHUTZ=`# Datenschutzerklärung

## 1. Verantwortlicher

[Name, Anschrift und E-Mail wie im Impressum]

## 2. Welche Daten wir verarbeiten

- Konto: Name, E-Mail-Adresse, Passwort (nur als sicherer Hash gespeichert).
- Spielstand: deine Speditionen, Nachrichten an andere Spieler, Allianz-Beiträge, Meldungen und Leserbriefe.
- Technisch: Server-Protokolle mit Fehlermeldungen; die IP-Adresse wird vom Webserver nur kurzzeitig zur Auslieferung und Abwehr von Angriffen verarbeitet.

Rechtsgrundlage: Art. 6 Abs. 1 lit. b DSGVO (Bereitstellung des Spiels) und lit. f (Sicherheit und Fehlerbehebung).

## 3. Cookies und lokaler Speicher

Notwendig: ein Sitzungs-Cookie für die Anmeldung, das Cookie „lgx_inst“ für Testwelten und Einstellungen im lokalen Speicher deines Browsers (§ 25 Abs. 2 TDDDG).

Statistik (nur mit Einwilligung, § 25 Abs. 1 TDDDG, Art. 6 Abs. 1 lit. a DSGVO): Eine zufällige Kennung im lokalen Speicher, mit der wir zählen, welche Bereiche des Spiels genutzt werden. Die Kennung wird auf dem Server nur gehasht gespeichert, die Auswertung erfolgt ausschließlich auf unserem eigenen Server, ohne Drittanbieter. Du kannst die Einwilligung jederzeit unter „Cookie-Einstellungen“ widerrufen.

## 4. Hosting

Das Spiel läuft auf einem Server von [Hosting-Anbieter, Land]. Mit dem Anbieter besteht ein Vertrag zur Auftragsverarbeitung.

## 5. Kartendaten

Kartenkacheln werden von [Kartenanbieter, z. B. OpenStreetMap] geladen. Dabei wird deine IP-Adresse an diesen Anbieter übertragen.

## 6. Speicherdauer

Kontodaten bis zur Löschung deines Kontos. Spielstände bis zum Ende der jeweiligen Welt. Fehlerprotokolle höchstens 90 Tage.

## 7. Deine Rechte

Auskunft, Berichtigung, Löschung, Einschränkung, Datenübertragbarkeit und Widerspruch (Art. 15–21 DSGVO). Beschwerde bei einer Datenschutz-Aufsichtsbehörde. Anfragen an die oben genannte E-Mail-Adresse.`;
export default function LegalAdmin(){const [kind,setKind]=useState('impressum'),[text,setText]=useState(''),[msg,setMsg]=useState(''),[loaded,setLoaded]=useState(false);
 useEffect(()=>{setLoaded(false);fetch('/api/logistik/legal?kind='+kind,{cache:'no-store'}).then(r=>r.json()).then(d=>{setText(d.text||(kind==='impressum'?IMPRESSUM:DATENSCHUTZ));setLoaded(true);});},[kind]);
 const save=async()=>{const r=await fetch('/api/logistik/legal',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({kind,text})});const d=await r.json();setMsg(r.ok?'Gespeichert.':d.error||'Fehler');};
 return <section className="log-admin-card"><h2>⚖️ Rechtliches</h2><div className="log-tabs">{['impressum','datenschutz'].map(k=><button key={k} className={kind===k?'on':''} onClick={()=>setKind(k)}>{k==='impressum'?'Impressum':'Datenschutz'}</button>)}</div>
  <p className="log-muted">Vorlage: Alles in [eckigen Klammern] ersetzen. Bitte rechtlich prüfen lassen – das ist keine Rechtsberatung. Überschriften mit „# “, Absätze durch Leerzeilen.</p>
  {loaded&&<textarea className="log-chat-input" rows={24} value={text} onChange={e=>setText(e.target.value)}/>}
  <div className="log-trailer-toolbar"><button className="log-primary" onClick={()=>void save()}>Speichern</button><a href={'/'+kind} target="_blank" rel="noreferrer">Ansehen</a>{/\[[^\]]+\]/.test(text)&&<small className="log-muted">⚠️ Es sind noch Platzhalter offen.</small>}</div>{msg&&<p>{msg}</p>}</section>;}
