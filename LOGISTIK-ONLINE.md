# Weltverbund Logistik – Online-Welten V2

Aktualisiert am 03.11.2026. Diese Datei ersetzt die vorherigen Angaben zu Zeitsprüngen und lokaler Simulation.

## Zeit und Administration

Standard neuer Welten: Echtzeit 1×. Ausschließlich aktive Administratoren/Besitzer können Welten als Entwurf anlegen, öffnen, pausieren und den Zeitfaktor 0,1–1440 einstellen. Normale Spieler können weder Welten anlegen noch vorspulen. Beim ersten Beitritt gründen sie eine benannte, unabhängige Spedition.

Die Ökonomie verarbeitet Bruchteile von Tagen einschließlich Produktion, Kosten und Fahrzeugankünften. Der Worker enthält einen minütlichen scheduled-Handler und einen gespeicherten Heartbeat in logistics_runtime. Zusätzlich existiert das geschützte MCP-Werkzeug settle_logistics_worlds für einen unterstützten Cloud-Hintergrundlauf. Ein minütlicher nativer Sites-Trigger konnte bisher nicht belegt werden. Die verknüpfte Sites-Cloud-Aufgabe ist vom Hoster auf höchstens stündliche Ausführung begrenzt; ihr erster unbeaufsichtigter Lauf wurde am 03.11.2026 um 18:32:46 Europe/Berlin durch den gespeicherten Heartbeat mit source=cloud-task bestätigt. Ein separater minütlicher Cloudflare-Scheduler ist vorbereitet und benötigt ein eigenes verbundenes Cloudflare-Konto. Der Spielkalender und die Fahrzeugdarstellung werden während einer Sitzung jede Sekunde angezeigt. Eine Aktion gleicht eine eventuell ausstehende Restzeit zusätzlich ab.

Die Zeit aller Speditionen einer Welt ist gemeinsam; andere Welten bleiben unabhängig. Hintergrund-Simulation verändert die Wirtschaftsbestände, aber nicht die strukturelle Aktionsrevision einer Spedition. Gegenläufige Weltbuchungen werden über eine atomare Welt-Revisionsprüfung geschützt.

## Fahrzeuge und Güter

46 reale Fahrzeugmodelle/Baureihen, 21 reale Auflieger/Aufbauten und acht Güterwagenarten. Herstellerquellen sind im Fahrzeugmarkt hinterlegt. Preise, Kosten, Einsatzkapazitäten und Produktionswerte sind vereinfachte Spielwerte. Brutto-Strukturnutzlast, DWT, TEU und Ladevolumen werden nicht als identische Größen behandelt.

Zugmaschinen und Motorwagen werden mit passendem Auflieger beziehungsweise Aufbau gekauft. Holzauflieger sind auf Holzfracht begrenzt; Pharmafracht benötigt geeignete Ausrüstung. Aufliegerwechsel ist nur ohne Linie und Ladung am Straßendepot möglich. Lokomotiven benötigen ein Zugdepot, Schiffe ein separates Schiffsdepot und Flugzeuge einen Hangar. Ein Hafen allein ersetzt kein Schiffsdepot.

107 Güter, neun Frachtarten und 54 Rezepte. Zusätzliche reale Betriebstypen: Krankenhäuser, Apotheken, Chemie/Pharma, Raffinerien, Forst, Molkereien, Getränkehersteller, Textil-/Fahrzeugindustrie, Baustoff- und Großhandel. Krankenhausbedarf umfasst mehrere Medikamentenarten und medizinischen Verbrauchsbedarf. Pharma-Rezepte sind ausschließlich abstrahierte Spielrezepte.

## Karte, Bau und Betriebsregister

Die Weltkarte verwendet die ganze verfügbare Breite ohne rechte Seitenleiste. Die linke Verwaltung kann auf Icons eingeklappt werden. Der Header zeigt als Wirtschaftskennzahl nur den Kontostand. Produktion zeigt nur aktive Abnahme-/Verarbeitungsproduktionen; Güter und Frachtarten liegen in einem eigenen kleinen Tab.

Bauplanung verwendet die 50-m-Rasterprimitive des Originalspiels, belegte Bauflächen und Rotation. Kachelwahl ist nur Vorschau. Erst die ausdrückliche Baubestätigung erzeugt eine bestätigte Serveraktion und bucht Kosten. Beim Umschalten bleiben die Leaflet-Rootklassen erhalten, damit die Karte nicht weiß wird. Die vollständige Gelände-/Wasserprüfung des Originals ist damit noch nicht umgesetzt.

Reale Geschäftspartner werden serverseitig beim ersten Import eines Gebiets dauerhaft im zentralen Register gespeichert. Weitere Aufrufe verwenden den Serverbestand. Eine erneute Gebietsaktualisierung kann ein Admin ausdrücklich auslösen. Namenssuchen sind ebenfalls dauerhaft zwischengespeichert. Das ist kein vollständiger Import aller Unternehmen der Erde. OSM-Namen und Standorte bleiben mit Quellen belegt; Produkte und Vertragsangebote sind simuliert.

## Tests

- npx tsc --noEmit
- node scripts/run-logistics-tests.mjs
- node scripts/test-logistics-worlds-v2.mjs (benötigt den lokalen Worker mit D1 und Scheduled-Testzugang)

Die Kernprüfungen umfassen Kapazitäten, Verarbeitung, freiwilligen Handel, Gleisfreigaben, intermodale Containerketten, selektive Auflieger, Depotzwang, Krankenhausbedarf, Bauflächen und kontinuierliche Echtzeitproduktion. Der V2-API-Test prüft Adminrechte, Entwurf/Start/Pause, benannte Speditionen, verbotene unbestätigte Bauaktionen und eine Scheduled-Abrechnung ohne Spielerabruf. Testkonten und Testwelten existieren ausschließlich in der lokalen Datenbank.

Bei lokalem Wrangler mit Assets kann dessen Test-Scheduled-Aufruf versehentlich den Assets-Router statt des Benutzer-Workers ansprechen. Für den Hintergrund-Test wird derselbe unveränderte Build mit einer ignorierten lokalen Testkonfiguration ohne Assets-Router verwendet. Die Produktionsregistrierung wird unabhängig davon geprüft.

## Bestehende Grenzen

Seewege bleiben schematisch. Tatsächliche LKW-Verladung auf RoLa-Züge, vollständige periodische Ausschreibungsrunden und umfassende Geländeprüfung sind weiterhin offen. Die aktuelle Erweiterung ist keine Behauptung, alle früheren 80 Wunschpunkte vollständig erfüllt zu haben.

## Profilübernahme und Scheduler-Zugang

Das ausdrücklich bestimmte originale Besitzerprofil wurde mit derselben Passwortprüfung übernommen und anhand des gespeicherten Zielprofils geprüft. Originaldaten wurden nicht geändert. Der einmalige Import-Endpunkt wurde danach aus dem Quellcode entfernt und sein temporäres Secret gelöscht.

Ein zusätzlicher Scheduler kann ausschließlich den eng begrenzten POST-Endpunkt `/api/logistik/internal/tick` mit dem serverseitig gespeicherten Secret `SIMULATION_TRIGGER_SECRET` aufrufen. Er kann keine Benutzer, Welten oder Kontostände frei setzen. Das Scheduler-Secret liegt nicht im Quellcode oder in der ZIP-Datei. Der vorbereitete externe Worker enthält lediglich die öffentliche Site-Adresse und den Secret-Namen.
