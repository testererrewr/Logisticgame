# Weltverbund Logistik

**Eigener Server:** Installation auf einem Linux-VPS mit Caddy und GitHub-Updates → siehe [VPS-INSTALLATION.md](VPS-INSTALLATION.md).

---

# NEU: Weltverbund Logistik

Die eigenständige Logistik-V1 erreichst du unter **`/logistik`**. Installation, Funktionen und Einschränkungen stehen in **[LOGISTIK-START.md](LOGISTIK-START.md)**. Das bisherige Personenverkehrsspiel bleibt daneben erhalten.

---

# Weltverbund

Spielbarer Browser-Transport-Tycoon mit getrennten Online-Welten. Einzelspieler-Welten sind vorerst deaktiviert. Deutsche Oberfläche, durchgehend zoombare OpenStreetMap-Weltkarte, serverseitige Konten und gemeinsame Fahrgastnachfrage.

## Neu in Version 34

**Gebrauchtmarkt:** Unter Flotte & Depots gibt es einen eigenen Markt für Fahrzeuge anderer Spieler derselben Welt. Ein unzugewiesenes Fahrzeug lässt sich unter „Verkaufen“ zu einem frei gewählten Preis anbieten oder sofort für 50 % des eigenen Kaufwerts zurückgeben. Angebote sperren das Fahrzeug für Einsatz, Umbau, Verschieben und weitere Verkäufe. Der Anbieter kann zurückziehen. Beim Kauf werden Lieferdepot, Fahrzeugart, Stellplätze, Weltenlimit, Kapital und Angebotspreis auf dem Server geprüft. Fahrzeug und Geld wechseln in einer gemeinsamen revisionsgesicherten Weltänderung den Besitzer; konkurrierende Käufer können dasselbe Fahrzeug nicht doppelt erhalten. Der Anbieter bekommt den vollen Angebotspreis, beide erhalten eine Systemnachricht. Neue Kauf- und Wagenbuchwerte entsprechen dem tatsächlich bezahlten Preis. Suche, Fahrzeugart, eigene Angebote, Preissortierung und Seitennavigation sind vorhanden.

**Fahrzeuggruppen:** Administratoren können Busse, Züge, Flugzeuge und Schiffe pro Welt einzeln erlauben. Mindestens eine Gruppe bleibt aktiv. Neubau, Neukauf und Zuweisung sind auch serverseitig geschützt. Beim Abschalten werden betroffene Linien stillgelegt, ihre Fahrzeuge im Heimatdepot behalten und Angebote zurückgezogen. Anlagen und Fahrzeuge werden nicht gelöscht. Eine spätere Freigabe startet alte Linien nicht automatisch.

**Offlineverarbeitung:** Der bisherige zeitgenaue Ereignisabgleich bleibt erhalten. Ein zusätzlicher geschützter Serverabgleich verarbeitet laufende Welten ohne Spieleraufruf und speichert einen Kontrollzeitpunkt. Er ist über das Site-Werkzeug `settle_running_worlds` und die Spieladministration erreichbar. Das Site-Werkzeug akzeptiert ausschließlich die von Sites bestätigte E-Mail des in `SIMULATION_OWNER_EMAIL` hinterlegten Site-Besitzers. Öffentliche Besucher und normale Spielkonten können diesen Schreiber nicht ausführen. Ein verknüpfter Cloud-Zeitplan ruft den Schreiber stündlich auf (kürzester vom Hosting unterstützter Abstand); der Browser und der lokale Rechner müssen dafür nicht geöffnet sein. Einrichtung und Überprüfung siehe [SIMULATION.md](SIMULATION.md). Eine Veröffentlichung allein legt noch keinen Zeitplan an.

Längere Rückstände werden in begrenzten Paketen vollständig nachgerechnet. Änderungen an Fahrzeugen, Linien und Welteinstellungen werden bei noch offenem Rückstand aufgeschoben, damit kein Verkauf oder Umbau unverbuchte Fahrten verwirft. Es gibt keine pauschal erfundenen Offline-Fahrgelder: Buchungen entstehen weiterhin durch reale Ereignisse der Simulation. Die Anzeige „Welt wird im Hintergrund abgeglichen“ bleibt für einen tatsächlichen Rückstand erhalten. Ein Zeitplan ist eine regelmäßige Verarbeitung, kein ununterbrochen laufender Echtzeitprozess.

Validierung: vollständige Simulations-, Rendering- und API-Tests, zwei gleichzeitige Käufer für ein Fahrzeug, Buchwerterhaltung beim Zughandel, Kapazitäts-/Besitz-/Preisprüfungen und gesperrte Verkehrsmittel. Browserprüfung lokal: kaufen, Lieferung kontrollieren, erneut anbieten, Suchfilter und gespeicherte Fahrzeuggruppen nach Neuladen. Der Fahrzeugkatalog bleibt unverändert.

## Neu in Version 33

- **Linien → Taktplanung:** Automatik oder ein Wunschtakt zwischen 0,25 und 1.440 Minuten Weltzeit. Abfahrten werden am Linienstart geregelt; Fahrzeuge warten gegebenenfalls auf ihren nächsten Slot. Die Vorschau zeigt Umlaufzeit, erreichbaren Takt und den Fahrzeugbedarf. Fehlende Fahrzeuge werden nicht automatisch gekauft. Bei unterschiedlichen Fahrzeugtypen ist der Bedarf ein konservativer Richtwert anhand des längsten Umlaufs. Laufende Fahrten und ihre Fahrgäste bleiben bei einer Taktänderung erhalten. Die Kapazitäts- und Kostenprognose berücksichtigt längere Takte; feste Wartung läuft weiter.
- **Flotte & Depots → Zugwerkstatt:** Vorhandene Zugeinheiten im selben Heimatdepot umbauen oder zusammenführen. Abgebaute Wagen und Antriebe bleiben im depotgebundenen Bausteinlager und können wiederverwendet oder für 50 % ihres Buchwerts verkauft werden. Nur fehlende Teile werden neu gekauft. Ein Umbau behält die ID und den Namen des ausgewählten Zuges; zusätzliche zusammengeführte Fahrzeuge gehen darin auf. Bestände, Preisänderungen und Besitz werden serverseitig geprüft. Der ursprüngliche Kaufwert bleibt über Zug und Lager erhalten; bei alten Fahrzeugen ohne Einzelwerte wird er einmalig nach den Katalogpreisanteilen aufgeteilt. Ein Depot mit Lagerteilen kann nicht abgerissen werden.
- **Statistik → Überlastung:** Aktuelle Warteschlangen, ihre Veränderung gegenüber einer früheren Stichprobe und tatsächlich wegen Platzmangels verpasste Einstiege. Verpasste Einstiege zählen Versuche: Eine Person, die mehrere volle Fahrzeuge verpasst, kann mehrfach zählen. Tages- und Wochenansichten reichen zwei Monate zurück. Ältere Zeiträume ohne diese Messung werden als unbekannt angezeigt. Ein wartender Stationsmarker wird nach belegtem Platzmangel rot. Trendstichproben werden höchstens alle fünf Minuten Weltzeit gespeichert; es bleiben nur zwei Stichproben pro Linie erhalten.
- **Verbindungen → Verbindungsprüfer:** Start und Ziel weltweit per Karte, Anlage oder Ortssuche wählen. Dieselbe Routensuche wie die Nachfrageberechnung prüft Reiseketten für zeit-, preisorientierte und ausgewogene Fahrgäste. Gezeigt werden Linien, Unternehmen, Fußwege, mittlere Wartezeiten, Tickets und die Punkte nach den unveränderbaren Welteinstellungen. Fehlende Anschlüsse, Umsteigerverträge, Transfergrenzen und zu hohe Preise werden erklärt. Vertragsketten A–B–C funktionieren ohne direkten A–C-Vertrag. Warteschlangen sind nur für eigene und Partnerlinien sichtbar. Die Anzeige ist eine beispielhafte beste Verbindung mit durchschnittlichen Wartezeiten; sie reserviert keine Sitzplätze. Fußwege werden vereinfacht als Luftlinie dargestellt. Die Kartenansicht lädt hierfür keine zusätzlichen Straßen- oder Gebäudedatensätze.

Geprüft mit TypeScript, vollständiger Simulations-/Rendering-Testsuite und lokaler API-Integration: echte Einzel-/Mehrfahrzeugtakte, Erhalt laufender Fahrgäste, Buchwert- und Teileerhaltung, veraltete Angebote, Besitzgrenzen, Lagerverkauf, Abrissschutz, verpasste Einstiege ohne Doppelzählung desselben Ereignisses, private Warteschlangen und A–B–C-Vertragsketten. Eine interaktive Browser-Sichtprüfung bleibt wegen der defekten lokalen CUA-Infrastruktur offen.

## Spielen

- Online: Mit E-Mail und Passwort registrieren, Welt wählen und ein Unternehmen gründen. E-Mail wird vorerst nicht verifiziert. Pro Konto ist ein Unternehmen je Welt möglich. Neue öffentliche Welten werden von Administratoren im Admin-Panel angelegt und gestartet.
- Einzelspieler: vorerst deaktiviert. Bestehende lokale Speicherstände werden nicht automatisch gelöscht. Der Demand-Rechner bleibt ohne Anmeldung nutzbar.
- Weltverkehr: Die ganze Weltkarte, einschließlich beliebiger Orte außerhalb der anfangs vorgegebenen Städte. Fluglinien benötigen eigene Flugplätze an beiden Enden und ein direkt am Start- oder Zielflughafen gebautes Flugzeugdepot. Bahnlinien benötigen eigene Bahnhöfe, Gleise und ein über das eigene Gleisnetz erreichbares Zugdepot.
- Straßenplanung: Echte OSM-Straßen, Gebäude und POIs. 50 × 50 m große Zonen können mehrere Nutzungen enthalten. Haltestellen rasten an befahrbaren Straßen ein. Routen berücksichtigen Straßentopologie und Einbahnstraßen für Hin- und Rückweg.
- Infrastruktur: Bahnhöfe auf freien 100 × 50 m großen Flächen; regionale Flugplätze auf 600 × 250 m. Zwei eigene Bahnhöfe wählen, Gleisverlauf über Kartenpunkte planen, Gleise bauen und Bahnlinie eröffnen.

## Bauen und Linienfenster

Die Karte bleibt beim Öffnen von Bau- und Linienfenstern erhalten. Zoomen und Verschieben funktionieren ohne Stadt-/Fernverkehrsmodus. Auch nach einem Wechsel zu Finanzen oder Unternehmen bleibt der Kartenausschnitt erhalten.

Unter **Bauen → Haltestelle** werden Bushaltestellen einzeln an echten Straßen gebaut (10.000 €, standardmäßig 150 m Reichweite). **Bauen → Busbahnhof** kostet 55.000 € und erschließt standardmäßig 300 m. Der Typ wird beim Bauen festgelegt und kann später nicht geändert werden. Halte gehören dem Unternehmen, besitzen einen eigenen Namen und können von mehreren Linien verwendet werden. Eine Haltestelle ohne bedienende Linie erzeugt keine transportierte Nachfrage.

Flughäfen werden als zusammenhängende 600 × 250 m große Anlage mit Startbahn und Terminal über allen 60 belegten 50-m-Kacheln dargestellt. Auch ohne neu geladene OSM-Gebäudedaten bleibt diese Fläche sichtbar. Ein Klick auf die Fläche oder das Symbol öffnet die Anlagendetails. Alle Haltestellen, Bahnhöfe, Flughäfen und Depots sind anklickbar, auch die anderer Unternehmen. Das Fenster zeigt direkte Linien sowie Umstiege innerhalb der Reichweite beider Einstiegspunkte, mit Unternehmen, Entfernung und Fahrzeugstatus. Vorbeifahrende Linien und Wegpunkte gelten nicht als Halt. Im Depotfenster werden Fahrzeuge gekauft und zugewiesen; das Anlagenfenster führt direkt dorthin.

Unter **Linien → Neue Linie** werden gebaute Halte auf der Karte angeklickt oder aus einer Liste gewählt. Die Reihenfolge ist mit Pfeilen änderbar. Einfache Buslinien fahren automatisch hin und zurück. Am Endhalt wenden sie nach 25 Sekunden und bedienen Haltestellen und Wegpunkte in umgekehrter Reihenfolge. Auf in beide Richtungen befahrbaren Straßen wird exakt dieselbe Geometrie rückwärts genutzt; Einbahnstraßen brauchen eine legale Rückroute. Alternativ lässt sich eine Ringlinie wählen. Bis zu 256 kostenlose Wegpunkte steuern den Straßenverlauf ohne Haltestellenfunktion. Die Rückrichtung wird getrennt angezeigt. Eine Buslinie umfasst 2–256 eigene oder gemietete Halte. Auch Bahn-, Flug- und Schiffslinien werden kostenlos mit null Fahrzeugen gespeichert. Im selben Fenster werden Linien und Tarife verwaltet; Fahrzeugkauf und Zuweisung erfolgen im eigenen Depotfenster. Bahnen nutzen gebaute Gleisverbindungen, Flüge eigene Flughäfen. Schiffslinien bleiben schematisch.

Gebaute Haltestellen bleiben erhalten, wenn eine Linie verkauft wird. Verwendete Halte können erst gelöscht werden, nachdem sie aus allen Linien entfernt wurden. Bestehende, bisher direkt in Linien gespeicherte Halte werden ohne neue Baukosten in eigenständige Haltestellen umgewandelt. Alte Client-Bauanfragen bleiben kompatibel; die aktuelle Oberfläche trennt Bau und Linienbetrieb.

## Depots und Fahrzeuge

- Busdepots kosten 120.000 €, benötigen 100 × 50 m freie Fläche und eine befahrbare Straße innerhalb von 150 m. Für zugewiesene Busse braucht das Unternehmen ein eigenes Depot höchstens 250 km vom tatsächlichen Linienverlauf entfernt, einschließlich aller Punkte zwischen den Halten. Die Entfernung wird sphärisch gemessen.
- Zugdepots kosten 240.000 € und benötigen 100 × 50 m freie Fläche. Unter „Gleise“ Depot und Bahnhof verbinden. Das eigene Schienennetz muss die Personenlinie lückenlos erreichen. Räumliche Nähe oder fremde Gleise reichen nicht. Depotgleise können keine eigene Personenlinie sein.
- Flugzeugdepots kosten 250.000 € und werden über den Anlagen-Eintrag direkt an einem eigenen Flughafen errichtet. Ein Depot an einem Linienende genügt.
- Der Server prüft beim Fahrzeugkauf ein eigenes Depot und bei jeder Zuweisung dessen Erreichbarkeit. Linienplanung und Streckenbearbeitung brauchen kein Depot und kosten nichts. Ohne zugewiesene Fahrzeuge haben Linien weder Kapazität noch Fahrgeldeinnahmen oder Fahrzeugbetriebskosten. Depots selbst sind keine Fahrgast-Haltestellen.

## Simulation und Grenzen

Jede Online-Welt besitzt einen separaten, autoritativ auf dem Server gespeicherten Spielstand. Gleichzeitige Änderungen werden über Revisionen geprüft und bei Konflikten neu angewendet. Geld, Baukosten und Besitzprüfungen berechnet der Server.

Die gemeinsame endliche Nachfrage wird über vollständige Reiseketten verteilt. Fahrzeit, Warten, Fußweg, absoluter Euro-Tarif, Umstiege und Fahrzeugkapazität bestimmen die Auswahl. Haltestellen erschließen 150 m, Busbahnhöfe 300 m; Umstiegswege sind unabhängig davon auf 100 m begrenzt. Unternehmenswechsel benötigen einen aktiven Vertrag. Sehr hohe Preise senken die Teilnahme bis auf null, auch ohne Konkurrenz.

Die ausführlichen Formeln, Beispiele, Leistungsgrenzen und weitere Ideen stehen in [DEMAND.md](DEMAND.md). Die Simulation arbeitet mit aggregierten Reisekohorten und Raten; sie speichert nicht jeden Reisenden als einzelnen Agenten. Es gibt noch keine Staus, echten minutengenauen Fahrpläne, realen Fußweg-/Barrierenprüfungen, Verspätungen oder detaillierte Gelände-, Brücken- und Tunnelplanung.

## Administration und Zeit

Das Admin-Panel bietet Benutzer-Suche, Namensänderung, Sperren, Entsperren, Löschen und Rollenvergabe. Das Besitzerkonto ist gegen versehentliche Löschung und Herabstufung geschützt. Weitere Administratoren können Welten und normale Spieler verwalten; nur der Besitzer vergibt Adminrechte. Verwaltungsaktionen werden protokolliert. Sperren entziehen bestehende Sitzungen und setzen Unternehmen im gemeinsamen Netz aus.

Neue Welten starten als Entwurf. Administratoren können sie starten, endgültig schließen und ihre Regeln ändern. Standard ist echte Zeit (1×), zusätzlich sind Faktoren zwischen 0,1 und 1440 möglich. Faktorwechsel werden ohne rückwirkende Umbewertung abgerechnet. Es gibt keine Pause; eine geschlossene Welt kann nicht erneut gestartet werden. Die laufende Weltuhr funktioniert auch bei geschlossener Seite durch serverseitige Abrechnung der verstrichenen Intervalle beim nächsten Zugriff.

Das vorgesehene Besitzerkonto wird serverseitig über `ADMIN_EMAIL` hinterlegt. Weil normale E-Mails noch nicht verifiziert werden, reicht eine passende E-Mail-Registrierung allein nicht für Adminrechte. Die Ersteinrichtung benötigt zusätzlich einen einmaligen Code. Nur dessen SHA-256-Hash liegt in `ADMIN_SETUP_HASH`. Im Admin-Panel werden die hinterlegte E-Mail, der Code und ein selbst gewähltes Passwort eingegeben. Ein bestehendes Konto dieser E-Mail wird übernommen und alte Sitzungen werden entzogen. Nach erfolgreicher Einrichtung sperrt ein Datenbankeintrag den Code dauerhaft. Der private Einrichtungscode wird getrennt vom Quellcode ausgeliefert.

Die Spielkarte ist eine durchgehend zoombare Weltkarte. Es gibt keine vorgegebenen Stadtmarkierungen und keine begrenzte Ortsauswahl. Die weltweite Suche findet Ortsnamen, Dörfer und Straßen über Photon; Koordinaten lassen sich direkt eingeben. Auch die Startseite verwendet dieselbe frei zoombare OSM-Weltkarte. Straßen, Gebäude und 50-m-Zonen werden bei Straßennähe in 4 × 4 km großen Datenkacheln nachgeladen, für beliebige Orte weltweit. Stadtbuslinien können bis zu acht Datengebiete verbinden; die Straßen müssen im geladenen Graphen durchgängig verbunden sein. Berlin-Zentrum und Berlin-Nord sind als echte OSM-Datenschnappschüsse enthalten. Weitere Gebiete lädt der Server bei Bedarf über die dokumentierte VK-Maps-Overpass-Instanz und speichert sie komprimiert in D1. Externe Dienste können vorübergehend ausfallen. Es gibt keinen zufällig generierten Kartenersatz. Datenschnappschüsse bleiben stabil, damit gebaute Haltestellen dieselben Straßenknoten behalten.

Die Weltwirtschaft wird bis zur aktuellen Spielzeit abgerechnet, auch nach längerer Abwesenheit. Häufigere Browser-Abfragen beschleunigen weder Einnahmen noch Spieluhr.

## Konten

Passwörter: PBKDF2-SHA256 mit zufälligem Salt und 100.000 Iterationen. Sitzungen: zufällige Tokens, in der Datenbank nur als SHA-256-Hash; HttpOnly-Cookie, SameSite=Lax, auf HTTPS Secure. Anmeldeversuche werden begrenzt. Profil ändern, Passwort ändern, Kontodaten exportieren, Abmelden und eigenes Konto samt Online-Unternehmen löschen sind implementiert. Ein Passwortwechsel beendet andere Sitzungen.

Noch kein E-Mail-Versand oder Passwort-Reset. Diese erste Version wurde lokal funktional mit zwei Konten getestet; ein Lasttest mit 32 gleichzeitig aktiven Clients ist nicht enthalten. Eine faire Aufteilung von 32 × 32 gleichwertigen Anbieter-Kombinationen ist als Modelltest enthalten. Die Entwicklungsdatenbank und lokalen Testkonten werden nicht veröffentlicht.

## Loadstar auf dem Handy installieren

- **Android:** Die Spielseite über HTTPS in Chrome öffnen. Auf der Startseite **Loadstar installieren** antippen oder im Chrome-Menü **App installieren** wählen.
- **iPhone:** Die Spielseite in Safari öffnen und über **Teilen → Zum Home-Bildschirm → Als Web-App öffnen** hinzufügen.

Die installierte Web-App benutzt dasselbe Konto und dieselben Welten wie der Browser. Eine Internetverbindung ist zum Spielen erforderlich. Ein neuer Stand auf `main` wird vom vorhandenen GitHub-Workflow ausgerollt, sofern die VPS-Zugangsdaten in GitHub eingerichtet sind. Beim nächsten Laden öffnet die App die vom Server bereitgestellte Version. Wenn das Spiel noch geöffnet ist, erscheint nach der Versionsprüfung **Neue Version verfügbar**. Über **Neu laden** kann man wechseln, sobald der aktuelle Entwurf abgeschlossen ist.

## Lokal starten

Node.js ab 22.13, npm und Git installieren. Die Anwendung nutzt Vinext, React, Leaflet, Cloudflare Workers und D1.

```powershell
npm ci
npm run build
node --import ./scripts/sites-env.mjs ./node_modules/wrangler/bin/wrangler.js d1 execute DB --local --config dist/server/wrangler.json --persist-to .wrangler/state --file drizzle/0000_brainy_angel.sql
node --import ./scripts/sites-env.mjs ./node_modules/wrangler/bin/wrangler.js d1 execute DB --local --config dist/server/wrangler.json --persist-to .wrangler/state --file drizzle/0001_polite_madripoor.sql
node --import ./scripts/sites-env.mjs ./node_modules/wrangler/bin/wrangler.js d1 execute DB --local --config dist/server/wrangler.json --persist-to .wrangler/state --file drizzle/0002_tiresome_calypso.sql
node --import ./scripts/sites-env.mjs ./node_modules/wrangler/bin/wrangler.js d1 execute DB --local --config dist/server/wrangler.json --persist-to .wrangler/state --file drizzle/0003_live_worlds.sql
npm run dev
```

Für eine lokale Admin-Ersteinrichtung vor dem Start eine ignorierte `.dev.vars` mit `ADMIN_EMAIL` und `ADMIN_SETUP_HASH` anlegen. Produktionswerte werden ausschließlich in den sicheren Laufzeitvariablen des Hostings gespeichert. Keine echten Passwörter oder Codes in den Quellcode schreiben.

Die Datenbankmigrationen je lokaler Datenbank nur einmal und in Reihenfolge anwenden. Danach die vom Server ausgegebene lokale Adresse öffnen. Die Hosting-Konfiguration liegt unter `.openai/hosting.json`; keine Zugangsdaten sind im Quellcode enthalten.

Prüfen:

```powershell
node node_modules/typescript/bin/tsc --noEmit
node scripts/run-tests.mjs
# Bei laufender lokaler Vorschau:
node scripts/run-tests.mjs --api
```

Die Integrationstests sind ausschließlich für localhost freigegeben und räumen ihre selbst erzeugten Testkonten auf.

## Kartendaten und Lizenzen

- Stadtkarte, Straßengraph, Gebäudedaten und POIs: © [OpenStreetMap contributors](https://www.openstreetmap.org/copyright), ODbL. Abgeleitete Schnappschüsse liegen in `public/maps/` und stehen ebenfalls unter ODbL. Der Umwandlungscode steht in `lib/real-map.ts`.
- Kartendarstellung: [Leaflet](https://leafletjs.com), BSD-2-Clause.
- Sichtbare Kartenkacheln werden normal über den Browser von `tile.openstreetmap.org` geladen. Kein Bulk-Download oder Offline-Prefetch. Die [OSM-Kachelrichtlinie](https://operations.osmfoundation.org/policies/tiles/) gilt.
- Welt-Landflächen: [Natural Earth](https://www.naturalearthdata.com/about/terms-of-use/), Public Domain.
- Dynamische OSM-Abfragen: [Overpass-Instanzen](https://wiki.openstreetmap.org/wiki/Overpass_API#Public_Overpass_API_instances). Für größere Nutzung sollten eigene oder bezahlte Karten-/Overpass-Dienste eingesetzt werden.

Enthaltene Bibliotheken behalten ihre jeweiligen Lizenzen.

## Weltweite Ortssuche

Die Suche wird erst beim Absenden ausgelöst, nicht bei jedem Tastendruck. Sie verwendet den öffentlichen [Photon-Dienst](https://github.com/komoot/photon) mit Ergebniscache im laufenden Serverprozess (bis zu 24 Stunden) und einer gemeinsamen Begrenzung auf höchstens eine externe Anfrage pro 1,1 Sekunden. Der Dienst ist für angemessene Nutzung freigegeben, bietet aber keine Verfügbarkeitsgarantie. Der Betreiber kann über die Laufzeitvariable PLACE_SEARCH_URL auf eine eigene Photon-Instanz wechseln. Koordinatensuche und freie Kartenbewegung benötigen keinen Geocoding-Dienst. Straßen- und Gebäudedaten werden weiter erst bei lokalem Zoom geladen.


## Weltweite Daten und freier Gleisbau

Gebiete sind nicht an die frühere Städteliste gebunden. Die Karte zeigt den aus echten Gebäuden und POIs geschätzten Bedarf des geladenen 4-km-Gebiets bereits vor dem Linienbau. Belebte 50-m-Zellen sind standardmäßig eingefärbt. Leerflächen erzeugen keine Einwohner. Die serverseitige Fahrgastverteilung berechnet weiterhin nur erschlossene und tatsächlich erreichbare Reiseketten.

Neue Daten werden einmalig über Overpass geladen und dauerhaft zwischengespeichert. Bei Ausfällen wird der unabhängige OSM-Map-API-Endpunkt verwendet; beide liefern echte OSM-Objekte. Fehlgeschlagene Downloads werden niemals als leeres Gebiet gespeichert. Eigener Overpass-Endpunkt: Laufzeitvariable OVERPASS_URL. Quellen: [OSM API 0.6](https://wiki.openstreetmap.org/wiki/API_v0.6), [Overpass](https://dev.overpass-api.de/overpass-doc/en/preface/commons.html). Öffentliche Dienste können weiterhin ausgelastet sein.

Gleise: Unter Bauen → Gleise mindestens zwei Kartenpunkte setzen und bauen. Ein Bahnhof oder Zugdepot schließt innerhalb von 75 m an einen eigenen Gleisabschnitt an, auch wenn es später gebaut wird. Ein Punkt innerhalb von 12 m zu einem Gleis rastet ein. Kreuzungen, T-Verbindungen und überlappende Abschnitte teilen denselben physischen Netzknoten. Es gibt derzeit nur eine Höhenebene. Alle Gleise eines Unternehmens bilden ein gemeinsames Netz. Im Linienfenster Start- und Zielbahnhof wählen; die Route nutzt die kürzeste verbundene Gleisstrecke, einschließlich Abzweigungen. Ein über dieses Netz erreichbares eigenes Zugdepot ist Pflicht. Ältere Gleise und Linien bleiben nutzbar.

## Linienplanung und Fahrzeugbestand

Unter „Linien → Neue Linie“ kostet das Speichern jeder Verkehrsart 0 €. Bahnhöfe, Haltestellen, Flughäfen, Gleise und Depots bleiben kostenpflichtige Infrastruktur. Im Depotfenster kostet ein Bus 65.000 €, ein Zug 390.000 €, ein Flugzeug 1.100.000 € und ein Schiff 520.000 €. Der Kauf kann das Fahrzeug im Depot lassen oder es einer erreichbaren Linie zuweisen. Ein im Depot stehendes Fahrzeug transportiert niemanden. Jedes Fahrzeug ist genau einer Linie oder keinem Dienst zugeordnet. Acht Fahrzeuge je Linie, 256 je Unternehmen. Linienlöschung gibt kein Geld zurück und bewahrt alle Fahrzeuge; ein unzugewiesenes Fahrzeug kann für 50 % des Kaufpreises verkauft werden. Bereits bezahlte Altfahrzeuge werden einmalig als Bestand übernommen.

Schiffsdepots kosten 200.000 €, brauchen 100 × 50 m freie Landfläche und Wasser innerhalb von 300 m. Eine Schiffslinie muss einen Hafen innerhalb von 25 km zum Depot haben. Bei allen Modi wird die Depot-Erreichbarkeit auf dem Server geprüft. Streckenänderungen, die ein zugewiesenes Fahrzeug von seinem Depot trennen, schicken es in den Depotbestand zurück.

## Fahrzeugmodelle

Der Excel-Katalog wird ausschließlich über das Backend veröffentlicht. Anleitung und Befehle: [VEHICLE-CATALOG.md](VEHICLE-CATALOG.md). Es gibt keinen Katalog-Upload in der Spieloberfläche. Neue Versionen werden in D1 gespeichert und von laufenden Welten bei der nächsten Serveraktualisierung übernommen.

Im Depot stehen je Verkehrsart drei reale Baureihen mit Bildern zur Wahl. Hersteller- und Betreiberquellen sind im Katalog hinterlegt. Preise, Betriebskosten und Ortsgeschwindigkeiten sind Spielannahmen. Kaufpreise, Fahrgastplätze, Reisegeschwindigkeit, Geschwindigkeit im Ortsverkehr und laufende Kosten werden im Modellvergleich angezeigt und serverseitig geprüft. Bestehende Fahrzeuge bekommen kostenlos das jeweilige Standardmodell; Namen und bezahlte Kaufpreise bleiben erhalten.

| Typ | Modelle | Preise |
| --- | --- | --- |
| Bus | Mercedes-Benz Citaro · Citaro K · Citaro G | 65.000 · 90.000 · 125.000 € |
| Zug | Stadler FLIRT 160 · Siemens Railjet · Siemens Velaro D | 390.000 · 900.000 · 1.800.000 € |
| Flugzeug | Embraer E190-E2 · ATR 72-600 · Airbus A320neo | 1.100.000 · 700.000 · 2.200.000 € |
| Schiff | Damen Waterbus 2407 · Fast Ferry 4212 · RoPax Ferry 8017 | 520.000 · 780.000 · 1.200.000 € |

Die Angebotsprognose rechnet konservativ mit 18 Betriebsstunden je Spieltag. Tatsächliche eingesetzte Fahrzeuge fahren dagegen fortlaufend auf ihrer gespeicherten Strecke. Für jedes zugewiesene Fahrzeug ergeben sich Umlaufzeit und tägliche Fahrten aus Linienlänge, Modellgeschwindigkeit und Haltezeit. Die täglichen Fahrgastplätze werden addiert; die gemeinsame Abfahrtsfolge ergibt die Wartezeit. Reisezeit wird mit einer nach Abfahrten gewichteten Flottengeschwindigkeit angenähert. Grundkosten plus tatsächlich angenäherte Kilometerkosten ergeben die Tagesrate. Im Depot stehende Fahrzeuge verändern weder Kapazität noch Fahrgastwahl oder Linienkosten. Gemischte Modelle können gemeinsam dieselbe Linie bedienen. Tagesraten bleiben Planwerte. Gekaufte und zugewiesene Fahrzeuge haben zusätzlich serverseitige Umläufe, Haltezeiten, Belegung und Ein-/Ausstiegsereignisse. Kartenpositionen werden zwischen Serverständen anhand derselben Spieluhr interpoliert. Es gibt keine Staus, Signalsteuerung oder minutengenauen manuellen Fahrpläne.

„Wegpunkte auf Karte setzen“ aktivieren und unter „Einfügen nach“ die gewünschte Position wählen. Kartenklicks werden an eine befahrbare Straße gebunden. Wegpunkte können zwischen beliebigen zwei Halten eingefügt, verschoben und gelöscht werden. Sie erzeugen keine Nachfrage, Haltekosten, Wartehalte oder Umstiege. Die Rückfahrt ist Teil derselben Linie und lässt sich in der Vorschau getrennt anzeigen.

## Robuster Kartenabruf

Überlastete Datenquellen werden vorübergehend übersprungen. Überschreitet ein Ausschnitt das 50.000-Knoten-Limit der OSM-Map-API, wird er bis auf etwa 500 m große Teilgebiete unterteilt. Nur vollständige Gebiete werden als Spielkarte gespeichert; erfolgreiche Teilabfragen bleiben für Wiederholungen separat zwischengespeichert. Die Oberfläche bündelt gleiche Anfragen, wiederholt vorübergehende Fehler bis zu dreimal und zeigt den Versuch an. Externe Dienste können trotzdem zeitweise ausfallen; ein sichtbarer Fehler hat eine Schaltfläche zum erneuten Laden.


## Live-Fahrzeuge und Abrechnung (v11)

Oben befinden sich Weltkarte, Linien, Flotte & Depots, Unternehmen, Finanzen und Nachfrage. Die Weltkarte zeigt standardmäßig eigene Fahrzeuge; fremde Fahrzeuge lassen sich einblenden. Anklicken zeigt Modellbild mit Quellenangabe, Linienzuweisung, Bewegungsstatus, bestätigte Belegung und bereits gebuchtes Fahrgeld. Kartenbewegung ändert kein Geld.

Ankünfte werden auf dem Server chronologisch verarbeitet. Ankünfte verschiedener Start-Ziel-Paare werden zunächst zu ganzen Personen gebündelt und anschließend nach Nachfrageschuld verteilt; so hungert kleine Einzelnachfrage nicht durch vorzeitiges Abrunden aus. Ganze Fahrgäste steigen nur an passenden Halten ein, bis zur Kapazität des gekauften Modells. Eine durchgehende Fahrt auf derselben Linie kostet ein Ticket, unabhängig von Zwischenhalten. Der beim Einstieg festgelegte Tarif wird einmalig beim tatsächlichen Ausstieg gutgeschrieben. Zwischen Ein- und Ausstiegen entstehen keine Ticketerlöse. Betriebskosten und Kreditzinsen laufen weiter; die Tageswerte in den Übersichten sind ausdrücklich Prognosen.

Umstiege funktionieren innerhalb desselben Unternehmens und zwischen Unternehmen mit einem beidseitig angenommenen, aktiven Umsteigevertrag. Der Umstieg erfolgt am selben Halt oder innerhalb von maximal 100 m. Erst eine reale Ankunft des Zubringers und die Gehzeit erzeugen eine wartende Anschlusskohorte; der nächste echte Fahrzeughalt nimmt diese auf. Ohne Vertrag bleiben Unternehmenswechsel gesperrt.

Busse halten 25 Sekunden, Züge 45 Sekunden, Flugzeuge 180 Sekunden und Schiffe 90 Sekunden. Das sind Spielwerte. Einfache Buslinien pendeln dauerhaft zwischen ihren Endhalten. Bestehende Hinlinien werden nach Abrechnung ihres bisherigen Betriebs automatisch umgestellt. Ein bereits am Endhalt stehender Bus fährt von dort nach 25 Sekunden zurück; laufende Hinfahrten, Fahrgäste und Zähler bleiben erhalten. Es gibt keine rückwirkend erfundenen Rückfahrten oder Fahrgeldeinnahmen. Fehlt eine befahrbare Rückroute, zeigt die Linienverwaltung den Fehler zur Korrektur an. Liniengeometrie oder Modellgeschwindigkeit zu ändern startet den betroffenen Umlauf neu; noch nicht abgeschlossene Fahrten erzeugen kein Fahrgeld.

Beim Wiederöffnen wird auch die Offline-Zeit serverseitig nachgespielt. Maximal 20.000 Ankunftsereignisse werden pro Anfrage verarbeitet; verbleibende Ereignisse bleiben gespeichert und werden beim nächsten Kontakt fortgesetzt. Die Oberfläche zeigt einen Aufholhinweis. Die Nachfrage arbeitet mit ganzen Fahrgastkohorten und statistischen Anschlussverteilungen, nicht mit dauerhaft gespeicherten individuellen Personen. Fußwege sind weiterhin Radien/Luftlinien, keine Hindernissimulation.

Neue Haltestellen und Wegpunkte werden auf Straßenabschnitte projiziert, nicht nur auf bestehende OSM-Knoten. Für Halte sucht die Route geeignete Zugänge innerhalb von 25 m und optimiert deren Kombination über den ganzen Verlauf. Einbahnrichtungen bleiben erhalten; Wegpunkte legen ihre Fahrbahn ausdrücklich fest. Bestehende Buslinien werden beim ersten Serverzugriff neu berechnet, sofern die gespeicherten Straßenverbindungen verfügbar sind.


## Eigene Seiten und Flottenverwaltung

Jeder Hauptbereich hat eine eigene Browseradresse. Links lassen sich als Lesezeichen speichern, neu laden und mit Browser-Zurück/Vorwärts aufrufen. Die Anmeldung führt auf die angeforderte Seite zurück. Beispiele für Atlas 01:

| Bereich | Adresse |
| --- | --- |
| Weltkarte | `/welt/atlas/karte` |
| Linien & Planung | `/welt/atlas/linien` |
| Fahrzeugbestand | `/welt/atlas/flotte` |
| Depotübersicht | `/welt/atlas/depots` |
| Fahrzeugmarkt | `/welt/atlas/fahrzeugmarkt` |
| Unternehmen | `/welt/atlas/unternehmen` |
| Finanzen | `/welt/atlas/finanzen` |
| Nachfrage | `/welt/atlas/nachfrage` |
| Konto / Anmeldung / Hilfe | `/konto`, `/anmelden`, `/hilfe` |
| Administration | `/verwaltung/welten`, `/verwaltung/benutzer`, `/verwaltung/protokoll` |

Der Fahrzeugbestand lässt sich nach Name, Modell, Depot, Linie, Verkehrsart und Betriebsstatus durchsuchen bzw. filtern. Namen lassen sich ändern, Fahrzeuge einer erreichbaren Linie zuweisen, ins Depot zurückholen, zwischen passenden Depots verschieben und im Depot verkaufen. Die Kartenlinks führen direkt zum eigenen Fahrzeug oder Depot. Der Fahrzeugmarkt zeigt die zum Lieferdepot passenden Modelle mit Bild, Lizenz, Preis und technischen Werten. Alle Käufe und Zuweisungen werden weiter auf dem Server geprüft. Der Excel-Katalog bleibt ausschließlich im Backend verwaltbar.

Die Linienübersicht ist eine eigene Seite; beim Bearbeiten stehen Formular und interaktive Karte nebeneinander. Ungespeicherte Entwürfe werden pro Konto und Welt für diese Browsersitzung auf dem Gerät aufbewahrt und beim erneuten Aufruf wiederhergestellt. Sie sind bis zum Speichern keine aktive Linie. Ein explizites Zurück zu „Alle Linien“ verwirft diesen Entwurf. Bauwerkzeuge, Anlageninformationen und kurze Aktionsbestätigungen bleiben kontextbezogen auf ihrer Seite.

Die vom Besitzer gewünschte Testkapital-Anpassung ist als gezielte, protokollierte und gegen Wiederholung abgesicherte Datenmigration hinterlegt. Sie betrifft ausschließlich das identifizierte Testunternehmen in Atlas 01; sie zählt nicht als Ticketerlös und verändert keine anderen Konten, Welten, Kredite oder Fahrzeugbestände.

## Live-Karte und Fahrzeugbelegung

- Eigene eingesetzte Fahrzeuge bewegen sich flüssig auf ihrer gespeicherten Route. Richtungssymbole unterscheiden Bus, Zug, Flugzeug und Schiff; daneben steht die tatsächlich bestätigte Belegung als Fahrgäste / Kapazität.
- „Fahrzeuge live“ zeigt Belegung, Fahrtrichtung, nächsten Halt und Abfahrt beziehungsweise Ankunft in Weltzeit. Tages-Prozentwerte ersetzen die Allzeit-Ein-/Ausstiegszähler in Fahrzeugdetails. Die Kamera kann dem Fahrzeug folgen.
- Auf Karte, Flottenseite und Linienseite erfolgt alle zwei Sekunden ein authentifizierter, kompakter Serverabgleich über `/api/worlds/:id/live`. Liniengeometrie und Infrastruktur werden bei Änderungen vollständig nachgeladen. Veraltete Antworten überschreiben keine neueren Änderungen.
- Die Animation erzeugt keine Passagiere, Fahrgelder oder Ein-/Ausstiege. Am nächsten unbestätigten Halt wartet sie auf den Server; nach zwölf Sekunden ohne Abgleich wird die Zeitfortschreibung begrenzt und die Verbindung als verzögert gekennzeichnet. Die Simulation läuft serverseitig beim nächsten Abruf zeitlich weiter.
- Konkurrenzfahrzeuge sind optional. Fahrgastumstiege bleiben auf das eigene Unternehmen begrenzt. Fahrzeuge im Depot fahren nicht. Busse auf einfachen Linien wenden automatisch; die Fahrzeugdetails zeigen Hinfahrt oder Rückfahrt. Ringlinien fahren fortlaufend im Kreis.

## Anzeige und schnelle Seitenwechsel

Im Profil lässt sich „Geldbeträge anzeigen“ zwischen „Vollständig“ (Standard, z. B. 999.000.000,00 €) und „Abgekürzt“ (z. B. 999 Mio. €) umstellen. Die Auswahl wird im E-Mail-Spielkonto gespeichert und gilt für alle Welten und Geräte. Finanzübersicht, Flotte, Fahrzeugmarkt, Linien, Baukosten und Live-Fahrgelder verwenden dieselbe Formatierung.

Interne Links wechseln ohne vollständiges Neuladen der Anwendung. Innerhalb derselben Welt wird der bereits geladene Spielstand sofort weiterverwendet; die laufende Serversynchronisierung aktualisiert ihn im Hintergrund. Direkte URLs, Neuladen, neue Browser-Tabs sowie Zurück/Vorwärts bleiben unterstützt.

## Live-Flottenverwaltung

Die Flottenseite zeigt den nächsten Halt, den zuletzt bedienten Halt, Hin-/Rückfahrt, Streckenfortschritt und tatsächliche Belegung je Fahrzeug. An Halten wird bis zur realen Abfahrt heruntergezählt; unterwegs bis zur Ankunft. Alle Zeiten gelten in Weltzeit und folgen dem Zeitfaktor der Welt. Ein Fahrgastwechsel wartet auf die Bestätigung des Servers.

Die Filter für Fahrzeugtyp, Depot, Linie und Betriebsstatus sind kombinierbar; die Suche findet auch Haltestellennamen. „Ohne Linienzuweisung“ zeigt Reservefahrzeuge. Bei veralteter Verbindung bleiben Positionen begrenzt stehen und ein Hinweis zeigt den letzten bestätigten Stand. Fehlende Depotverbindungen, unbefahrbare Rückfahrten und neu abzugleichende Einsätze werden eigens ausgewiesen. Die Anzeige erzeugt keine Fahrgäste oder Einnahmen.

## Konten, Verträge und Betrieb (Version 23)

Passwörter erlauben 8–256 Zeichen bei Registrierung, Anmeldung, Passwortänderung und geschützter Ersteinrichtung. Normale Konten sehen keinen Admin-Link; die Verwaltungs-API prüft die Rolle weiterhin serverseitig. Migration 0007 korrigiert ausschließlich das bereits vorhandene, ausdrücklich benannte Besitzerkonto (ID und E-Mail werden gemeinsam geprüft), ohne Passwort- oder Kontodaten anderer Nutzer zu ändern. Neue Registrierungen erhalten dadurch keine Rechte.

Unter Unternehmen lassen sich Umsteigeverträge anbieten, annehmen, ablehnen und kündigen. Der Tagespreis je Partei wird aus beiden Flotten und Terminals berechnet und vor beiden Zustimmungen gezeigt. Er bleibt für diesen Vertrag fest. Die erste Zahlung erfolgt bei Annahme, danach alle 24 realen Stunden, unabhängig vom Zeitfaktor und auch offline. Kündigung beendet weitere Tageszahlungen; ein bezahlter Tag wird nicht erstattet. Diese laufenden Spielkosten können negatives Guthaben verursachen. Beim Schließen der Welt oder Wegfall eines aktiven Partners endet der Vertrag.

Linienplanung ist weiterhin ohne Baukosten möglich; die Oberfläche zeigt dafür keine 0-Euro-Zeile mehr. Der Ticketpreis wird direkt in Euro und Cent eingegeben; eine Empfehlung dient als Orientierung. Bestehende prozentuale Alttarife behalten ihren bisherigen Europreis bis zur Bearbeitung. Das Punktesystem vergleicht weiterhin Zeit und Geld; überteuerte Fahrten werden auch bei fehlenden Alternativen abgelehnt.

Die Acht-Fahrzeuge-Grenze pro Linie entfällt. Das konfigurierbare Limit beträgt standardmäßig 20.000 Fahrzeuge je Unternehmen. Neue Fahrzeuge starten versetzt; bestehende Fahrzeuge werden am Linienanfang in gleichmäßige Zeitfenster eingeordnet und warten dort bei Bedarf. Fahrgäste oder Fahrzeuge werden dafür nicht auf der Strecke versetzt. Busse halten bei jedem Haltestellenbesuch 25 Spielsekunden; die Fahrzeuganzeige weist zusätzliche Taktwartezeit aus.

Nutzungswerte werden aus echten Fahrgastwechseln für den aktuellen Spieltag gesammelt, getrennt für Fahrzeuge, Linien und Haltestellen. Die mittlere Abfahrtsbelegung ist kapazitätsgewichtet. Direkteinstiege bezeichnen Reiseanfänge; eigene und Partner-Umsteiger bezeichnen den tatsächlichen Einstieg nach einer Vorfahrt. Ohne beobachtete Einstiege stehen Striche statt erfundener Prozentwerte. Alte Allzeit-Zähler werden nicht als Tagesmesswerte übernommen.

Die Kartenoption Konkurrenz steuert Fahrzeuge, Linien, Gleise, Haltestellen und Anlagen gemeinsam. Während des Bauens blockieren keine Live-Fenster die Werkzeuge. Fahrzeugsymbole sind kleiner. Erneutes Anklicken des letzten geplanten Halts entfernt ihn aus dem Entwurf. Straßenrichtungen sind ab Zoomstufe 16 zuschaltbar und werden im Browser gespeichert: Pfeile erscheinen ausschließlich auf Einbahnstraßen und zeigen die erlaubte Fahrtrichtung.

Statische Infrastruktur wird bei Geld- und Telemetrieänderungen nicht neu gezeichnet. OSM-Gebiete bleiben im Arbeitsspeicher, im HTTP-Cache und in einem begrenzten IndexedDB-Cache mit zwölf Gebieten verfügbar. Server-Hydrierung lädt unabhängige gespeicherte Gebiete parallel; kleine Downloadteile verwenden höchstens zwei gleichzeitige Abrufe. Fehlgeschlagene Teilabrufe behalten erfolgreiche Teilgebiete und haben ein begrenztes Zeitfenster. Erstabrufe bleiben von den externen OSM-Diensten abhängig. Gebietsbedarf erscheint nur bei in den Welteinstellungen aktiviertem Kartendebug und nur für Admins.


## Unternehmensprofile, Warteschlangen und Mehrfachkauf (Version 25)

„Zum Unternehmen“ in Fahrzeug- und Haltestellendetails öffnet das zugehörige Unternehmensprofil. Dort lassen sich Umsteigeverträge mit diesem Unternehmen anbieten, annehmen oder kündigen; die Übersicht verlinkt eingegangene Angebote. Die Preisvorschau und Abrechnung je echtem Tag bleiben erhalten.

Im Fahrzeugmarkt und im Depot kann eine ganze Stückzahl eines Modells bestellt werden. Vor der Bestellung stehen Stück- und Gesamtpreis fest. Der Server prüft die gesamte Bestellung einschließlich Kapital, eigenem Depot, Linienerreichbarkeit und verbleibenden Plätzen im einstellbaren Unternehmenslimit von standardmäßig 20.000 Fahrzeugen. Bei Ablehnung wird kein Teilkauf verbucht. Eigene Namensvorgaben werden bei mehreren Fahrzeugen nummeriert.

Haltestellen zeigen tatsächliche Wartende je Linie. Die Warteschlangen wachsen auch zwischen Fahrzeugankünften; Umsteiger erscheinen erst nach Ausstieg und abgeschlossener Gehzeit. Bei einem Serverrückstand werden keine zukünftigen Ankünfte vorgezogen. Die Live-Aktualisierung übermittelt nur kompakte Wartendenzahlen zusätzlich zur Fahrzeugtelemetrie.

Einstiegsanteile beziehen sich auf alle tatsächlich erfassten Einstiege am aktuellen Spieltag und werden über sämtliche Linien am jeweiligen Halt zusammengezählt. Die Anzeige nennt die Fallzahlen für Direkt-, eigene und Partnerumsteiger. Unter zehn Einstiegen erscheinen statt wenig aussagekräftiger Prozentwerte die echten Fallzahlen und ein Hinweis auf die geringe Datenbasis. Frühere Tage und Fahrten vor Beginn der Erfassung werden nicht nachträglich erfunden.

Der Kopfbereich und die Kennzahlen sind kompakter. Die aufklappbare Fahrzeugliste auf der Karte entfällt; die Filter bleiben vorhanden. Ein Kartenklick auf ein Fahrzeug ersetzt offene Haltestellendetails und umgekehrt.


## Betrieb und Auswertungen (Version 26)

- Bus–Zug- und eigene Fußumstiege sind am selben Standort und bis 100 m möglich. Bei Bahnhöfen und Flughäfen zählt die zugängliche belegte Fläche, nicht nur der Mittelpunkt der ersten Kachel. Tests prüfen eine reale Reisekette mit gleichzeitig vorhandenen Direktfahrgästen und Umsteigern. Nachfragesampling enthält nahe und weiter entfernte Ziele, ohne zusätzliche Fahrgäste zu erfinden.
- Am ersten Halt eines Rings sowie beiden Enden eines Pendels steigen alle aus. Eine notwendige Weiterfahrt über diesen Halt hinaus wird als Fortsetzung wieder eingereiht. Sie erzeugt keinen neuen Linienwechsel in der Statistik und verkauft dasselbe Ticket nicht doppelt. Bestehende Fahrzeugläufe werden auf die neue Fahrdynamik umgerechnet; vorhandene Fahrgäste bleiben erhalten.
- Der manuell eingestellte Ticketpreis gilt je Fahrt. Grundpreis + Entfernung ist ausschließlich eine Empfehlung: Bus 1,20 € + 0,18 €/km, Bahn 1,80 € + 0,16 €/km, Flug 8,00 € + 0,12 €/km, Schiff 2,00 € + 0,10 €/km. Gezahlt wird beim tatsächlichen Ausstieg. Der eingestellte Preis fließt in die Routenwahl und die Preisbereitschaft ein.
- Fahrzeugspezifische Beschleunigung und Bremsverzögerung bestimmen eine dreieckige oder trapezförmige Geschwindigkeitskurve. Kurze Abschnitte erreichen die Höchstgeschwindigkeit nicht. Werte sind ein vereinfachtes Fahrmodell, keine vollständige Traktions- oder Flugphysik.
- Bahnhof und Zugdepot verbinden alle Gleise innerhalb von 75 m zur belegten Fläche, einschließlich gegenüberliegender Anfahrten. Bahnlinien können bis zu 32 eigene Bahnhöfe enthalten und werden auf der Karte oder in der Liste geordnet. Linien folgen weiterhin dem gebauten Gleisnetz.
- Häfen sind für 300.000 € baubar, benötigen Wasser innerhalb von 300 m und bilden eigene Schiffslinien. Die Schiffsroute bleibt eine schematische Verbindung der Häfen; Wasserwege und Landhindernisse werden noch nicht automatisch geroutet.
- Im Fahrzeugmarkt entsteht ein Zug aus einer fertigen Garnitur oder Lokomotiven und Personenwagen. Preise, Kapazität, Länge und Betriebskosten werden summiert; die niedrigste Höchstgeschwindigkeit begrenzt den Verband. Bis zu 32 Bausteine bilden einen Fahrzeugeinsatz im Unternehmenslimit. Neue Modelle: ÖBB 1116 Taurus, Vectron AC, CityShuttle-Wagen und ÖBB Doppelstockwagen. Alle 13 Zugmodelle bzw. Bausteine besitzen Fotos mit Urheber- und Lizenzangaben.
- Im Backend-Katalog sind trainRole (unit, locomotive, coach), acceleration und braking ergänzt. Ältere Exceldateien bleiben importierbar. Neue Modelle und Preise werden weiterhin ausschließlich über den geschützten Backendzugang veröffentlicht.
- Das Fahrzeuglimit ist eine technische Welteinstellung: standardmäßig 20.000 Einsätze pro Unternehmen, im Adminpanel von 1 bis 20.000 änderbar. Der Kaufpreis und die tatsächliche Depot-/Linienerreichbarkeit gelten zusätzlich.
- Statistik hat eine eigene URL /welt/atlas/statistik. Prozentwerte und Tagesfallzahlen erscheinen dort, nicht mehr in Fahrzeug-, Haltestellen- oder Linienfenstern. Aktuelle Position und Fahrgäste an Bord bleiben auf der Karte sichtbar. Wartende werden je Standort aufsummiert und als Zahl über dem Symbol angezeigt.
- Finanzen zeigt tägliche und wöchentliche Buchungen mit Datumswahl: Fahrgelder, Betrieb, Zinsen, Verträge, Fahrzeuge, Infrastruktur, Verkäufe und Kredite. Die letzten 90 Spieltage bleiben gespeichert. Vor Beginn der Erfassung wird keine historische Aufteilung erfunden. Das Wochenintervall beginnt montags in der UTC-Spielzeit.
- Aktive Umsteigeverträge passen ihren Tagespreis an die aktuelle Größe beider Unternehmen an. Änderungen werden für die nächste Zahlung alle 24 echten Stunden verwendet; bereits bezahlte Tage werden nicht rückwirkend verteuert.


## Version 27: Betrieb, gemeinsame Anlagen und Verwaltung

- Ticketpreise sind feste, direkt eingegebene Fahrtpreise. Grundpreis plus Entfernung wird nur empfohlen. Tages- und Nachtnachfrage sind gleich. Ein Nachfragefaktor von 0 bis 20 ist pro Welt einstellbar.
- Standardlimits: 20.000 Fahrzeuge und 100 Linien je Unternehmen. Linien können bis zu 256 Halte umfassen. Der Sammelbau baut bis zu 100 ausgewählte Straßenpositionen atomar. Das Baumenü enthält keine Bestandsliste. „Neue Linie“ auf der Karte öffnet den dortigen Planer.
- Linien lassen sich direkt in der Liste umbenennen und nach Verkehrsart, fehlenden Fahrzeugen oder Land filtern. Sortierung nach Name, Fahrzeuganzahl oder Tagesauslastung ist in beide Richtungen möglich. Flotte und Depots haben ebenfalls optionale Länderfilter. Die Flottentabelle zeigt 50 Fahrzeuge pro Seite und den gebuchten Fahrzeuggewinn des Spieltags.
- Vier Gleistypen: Nebenbahn 80, Regionalgleis 160, Hauptstrecke 230 und Schnellfahrstrecke 320 km/h. Elektrifizierung erhöht Bau- und Instandhaltungskosten. Gleislänge und Typ bestimmen die vorberechnete Instandhaltung. Die langsamste benutzte Gleisklasse begrenzt den Linienbetrieb.
- Bahnhöfe haben 100 bis 1.000 m Bahnsteiglänge. Rein elektrische Verbände brauchen eine elektrifizierte Linie und einen elektrifizierten Weg vom eigenen Depot. Eine kürzeste nichtelektrische Strecke kann im Planer mit Gleiswegpunkten umgangen werden. Durchfahrten auf die gegenüberliegende Bahnhofsseite halbieren den Halt von 45 auf 22,5 Spielsekunden. Wenden bleibt bei 45 Sekunden.
- Flughäfen haben 1 bis 4 Landebahnen mit je 240 Bewegungen pro Spieltag. Zuweisungen reservieren konservativ auf ganze Umläufe gerundete Starts und Landungen. Die Detailansicht zeigt Belegung und Kapazität. Weitere Landebahnen kosten 900.000 € und benötigen zusätzliche freie Fläche.
- Infrastruktur kostet pro Spieltag: Bushalt 2 €, Busbahnhof 12 €, Bahnhof 40 € pro 100 m, Flughafen 500 € je Landebahn, Hafen 120 €, Hangar 90 €, andere Depots 60 €. Gleise kosten je Typ 35/65/100/160 € pro km, mit Strom zusätzlich 15 €/km. Bauvorschauen nennen Investition und Instandhaltung. Fahrzeuggrundkosten und Kilometerkosten werden bei geänderter Zuweisung, Linie, Katalog oder Energieindex zwischengespeichert.
- Fremde Busstopps sind direkt nutzbar, gegen 4 € je Halt bzw. 18 € je Busbahnhof und aktiver Linie pro Spieltag. Bahnhöfe, Häfen und Flughäfen benötigen eine Freigabe. Grundgebühren sind 80/100/600 € je aktiver Linie und Spieltag. Eigentümer können den Satz zwischen 25 und 200 % einstellen und weitere Anfragen ausschalten. Bestehende Freigaben bleiben erhalten.
- Fremde Gleise sind immer verbindbar. Pro Linie und Spieltag wird nach angefangenen Streckenkilometern, Eigentümer und Gleistyp abgerechnet; benachbarte kurze Abschnitte desselben Eigentümers/Typ werden vor dem Aufrunden addiert. Gebühren sind 7/13/20/32 €/km, mit Strom 3 €/km zusätzlich. Die Linienvorschau zeigt die Summe aller Fremdnutzungsgebühren.
- Halte, Stationen und Gleise können abgerissen werden, sobald keine Linie sie mehr verwendet. Depots mit Fahrzeugen und Flughäfen mit Hangar sind ebenfalls gesperrt. Beim Löschen einer Linie bleiben Fahrzeuge erhalten und kehren zum nächstgelegenen passenden, erreichbaren eigenen Depot zurück.
- Postfach mit privaten Nachrichten zwischen Unternehmen einer Welt. Systemnachrichten weisen auf Stations- und Umsteigeanfragen hin und verlinken die Verwaltung. Fremde Benutzer erhalten diese Nachrichten weder in Welt- noch in Live-Antworten. Es werden höchstens 1.000 Nachrichten je Welt gespeichert.
- Welteinstellungen und Unternehmensverwaltung einer Welt haben eigene URLs. Änderungen an Name, Kapital und Sperrstatus sind auf Administratoren begrenzt und werden protokolliert. Auf der Startseite gibt es keinen Link zur Weltenverwaltung.
- Unternehmenskredite sind pro Welt abschaltbar. Voraussetzung: 7 Spieltage, 5 Fahrzeuge, 1.000 Fahrgäste. Limit und Tageszinssatz hängen vom Fahrzeug-/Anlagenwert und Beförderungsvolumen ab; 0,5 % Bearbeitungsgebühr. Der bei Aufnahme bestätigte Zins bleibt für diesen Kredit fest. Bestehende Kredite können auch bei deaktivierter Neuaufnahme zurückgezahlt werden.
- Energieindizes: Diesel/Kerosin 1, Strom 0,65. Admins können für den nächsten Spieltag gemeinsam oder getrennt −90 bis +200 % einstellen. Die Änderung wird genau einmal zum Tageswechsel angewandt. Ohne Eingriff bleiben die Indizes stabil. Eine externe Marktpreisquelle ist noch nicht angebunden; es werden keine vermeintlich echten Marktänderungen erfunden.
- Unternehmensprofile zeigen gesamte Einstiege, Fahrgäste und kapazitätsgewichtete Abfahrtsauslastung der letzten abgeschlossenen UTC-Spielwoche sowie echtes und simuliertes Alter. Wochenstatistiken beginnen mit dieser Version; ältere nicht erfasste Wochen werden nicht rekonstruiert. Datierung alter Unternehmen verwendet den frühesten bekannten Welt-/Buchungszeitpunkt.
- Länderzuordnung nutzt Natural Earth 1:50m (Public Domain): https://www.naturalearthdata.com/about/terms-of-use/ . Sie dient nur optionalen Filtern. Küsten, Kleinstinseln und Grenzpunkte können „Nicht zugeordnet“ sein. Sie schränkt das weltweite Bauen nicht ein.

Große Spielstände werden rückwärtskompatibel gelesen und bei Bedarf mit gzip komprimiert in D1 gespeichert. Der Test umfasst den Kauf, das Speichern, Laden und Kontoauslesen von 20.000 abgestellten Fahrzeugen. Ein Lasttest mit 20.000 gleichzeitig fahrenden Fahrzeugen ist damit nicht abgedeckt. Die serverseitige Ereignisverarbeitung bleibt pro Anfrage begrenzt und holt weitere Ereignisse nach. Die Browserprüfung war wegen einer fehlenden lokalen CUA-Kernel-Datei nicht verfügbar; HTML-Rendering, TypeScript, Spieltests und lokale API-Prüfungen wurden durchgeführt.


## Version 28: Fahrgastketten, Betrieb und Moderation

- Abrissprüfungen berücksichtigen auch alte `fromFacility`/`toFacility`-Linien und stillgelegte Linien aller Unternehmen. Eine noch genutzte Station kann nicht abgerissen werden. Bereits vorher entfernte Anlagen werden nicht aus unbekannter Historie rekonstruiert.
- Kachelübergreifende Reisen verwenden ein endliches Budget der angeschlossenen Einwohner statt des Produkts zweier kleiner Weltanteile. Bus–Zug–Bus und A→B→C sind mit Verträgen nur zwischen benachbarten Unternehmen getestet, einschließlich echter Einstiege nach Ankunft des Zubringers. Streckenlänge relativ zur Luftlinie bewertet Umwege zusätzlich zur Zeit. Die Rechnergewichte stammen unveränderlich aus der Weltkonfiguration.
- Umsteigeangebote verfallen nach 15 echten Tagen als „Zurückgezogen“. Nur der Antragsteller zieht offene Angebote zurück. Annahme, Ablehnung, Rücknahme, Ablauf und Kündigung erzeugen passende Systemnachrichten; aktive Gebühren bleiben größenabhängig.
- Unternehmensmeldungen erfordern Text. Eine separate, nur administrativ lesbare Tabelle erlaubt insgesamt genau eine offene Meldung je Unternehmen. Bearbeiten oder Löschen gibt den Platz frei. Weder Ziel noch meldender Spieler sehen Status, Meldehistorie oder Systemnachrichten dazu.
- Statistik ist nach Tag/Woche, Datum, Verkehrsart und Suche filterbar. Linien-, Fahrzeug-, Haltestellen- und Unternehmensstatistik bleibt zwei Kalendermonate erhalten. Vor Einführung nicht gespeicherte Werte werden nicht nachträglich erfunden. Linien zeigen den gebuchten Gewinn/Verlust des letzten Spieltags.
- Die Kapitalanzeige ersetzt die Weltauswahl im Kopf. Profilmenü: Einstellungen und Welten-Popup. Registrierung wählt keine Welt. Kein oberer KPI-Streifen. Fahrzeugklick erhält den aktuellen Zoom; Verweise aus der Flotte nutzen Zoom 14.
- Rivalenfahrzeuge und fremde Bauwerke haben getrennte Filter. Infrastruktur ist zunächst sichtbar und bleibt im Baumodus immer sichtbar. Geplante Halte sind ab Zoom 8 anklickbar, Wegpunkte ab dem ersten Halt möglich. Gültige Baupositionen bleiben beim Zoomen erhalten. Vier Nachbarkacheln werden bei Straßenzoom vorsichtig vorgeladen, maximal zwei parallel. Adressen stammen aus einem zwischengespeicherten Photon/OSM-Rückwärtseintrag; fehlende Angaben werden durch Koordinaten ersetzt.
- Kleine Depots: 500 Busse, 150 vollständige Züge, 100 Schiffe; Hangars: 1.000 Flugzeuge. Große Bodendepots haben die doppelte Fläche und Kapazität. Jede Ausbaustufe verdoppelt die Kapazität gegen Geld. Auch Fahrzeuge auf Linie belegen ihren Heimatdepotplatz. Alte belegte Depots werden verlustfrei auf ausreichende Kapazität angehoben. Bauwerke lassen sich beim Platzieren um 90° drehen.
- Überlange Züge dürfen kürzere Bahnsteige bedienen; die Ein-/Ausstiegszeit verdoppelt sich. Die Durchfahrt auf der anderen Seite halbiert weiterhin die Grundhaltezeit. Bestehende Läufe werden mit Position und Passagieren migriert.
- `energyType` und `consumptionPerKm` im Backend-XLSX: Diesel/Kerosin in L/km, Strom in kWh/km. Verbrauchswerte sind Spielannahmen. Personenwagen haben Verbrauch und Kilometerwartung null, aber Tageswartung. Gemischte Verbände rechnen jeden Energietyp getrennt ab.
- Energiepreise starten bei 1,60 €/L Diesel, 0,85 €/L Kerosin und 0,20 €/kWh. Jeden UTC-Spieltag gibt es eine kleine deterministische Schwankung mit sanfter Rückkehr zum Ausgangsniveau. Admin-Änderungen für den nächsten Tag ersetzen die Automatik einmalig je Energietyp. Keine externe Echtpreisquelle ist angeschlossen. Kosten werden zeitanteilig mit den jeweils geltenden Tagespreisen abgerechnet.

Zusätzliche Prüfung: gleichzeitige Meldeversuche, keine Preisgabe an Spieler, tatsächliche dreiteilige Partner-Reisekette, alte Abrissreferenzen, Verbrauchseinheiten und Depotkapazität. Browser-Sichtprüfung bleibt wegen der defekten lokalen CUA-Kernel-Infrastruktur nicht durchgeführt; serverseitiges Rendering, TypeScript, API- und Simulationstests decken diese Grenze nicht vollständig ab.


## Version 29: Baufluss, Flottenbefehle und Leistung

- Neue Standardgrenze: 2.500 Linien. Alte Standardwerte von 100 werden angehoben; die Verwaltung erlaubt 1–10.000 Linien. Eigene explizite neuere Einstellungen bleiben bestehen.
- Energiepreise ändern sich automatisch höchstens einmal je echter UTC-Kalenderwoche (Montag), unabhängig vom Simulationstempo. „Stabile Preise“ unterdrückt diese Änderungen. Manuelle Prozente werden am nächsten echten UTC-Tag einmalig angewandt, auch bei stabilen Preisen. Am selben Termin ersetzen sie die automatische Änderung des jeweiligen Energieträgers. Die Preise bleiben eine ausdrücklich bezeichnete Spielsimulation; es gibt keinen laufenden Marktfeed. Als öffentliche Referenz wurde der Weekly Oil Bulletin der EU-Kommission geprüft: https://energy.ec.europa.eu/data-and-analysis/weekly-oil-bulletin_en . Dieser liefert wöchentliche Ölproduktpreise, aber keine gemeinsame Diesel-/Kerosin-/Stromschnittstelle für diese Umsetzung.
- Variable Energie- und Kilometerwartungskosten werden je tatsächlich abgeschlossener Strecke zwischen zwei Halten gebucht. Preise und Mengen werden je Modell verwendet; eine Ankunft wird nicht doppelt abgerechnet. Tagesgrundwartung bleibt zeitanteilig. Alte Spielstände wechseln ohne rückwirkende doppelte Kilometerbuchung. Bereits laufende Busse behalten bei der höheren Ortsgeschwindigkeit ihre Position, Fahrgäste und Ereigniszähler.
- Ortsverkehr verwendet maximal 50 km/h und höchstens die Modellgeschwindigkeit. Die alten Durchschnittswerte werden dafür verdoppelt und gedeckelt, weil Beschleunigung, Bremsen und Haltezeit bereits separat simuliert werden. Das ist ein vereinfachtes Straßengeschwindigkeitsmodell, keine vollständige OSM-Maxspeed-Auswertung.
- Kleine Bodendepots starten bei 50 Bussen, 40 vollständigen Zügen bzw. 30 Schiffen. Große haben die doppelte Kapazität und bei Neubau 3×2 Kacheln; klein 2×1. Zwei Ausrichtungen genügen. Ausbaustufen erhöhen nur Kapazität und Unterhalt, ohne zusätzliche Fläche. Bereits bezahlte Stufen bleiben erhalten; belegte alte Depots werden nicht unter ihren Bestand verkleinert. Hangars bleiben größer. Bestehende Gebäude werden nicht auf Nachbarflächen vergrößert.
- Flughäfen reservieren je Flugzeug und Flughafen zwei bis vier Slots pro Spieltag, statt sämtliche Umläufe des vereinfachten Fahrmodells aufzusummieren. Das ist eine Spielquote zur Kapazitätsbegrenzung, keine exakte realweltliche tägliche Flughafenbewegungszahl. Pro Landebahn bleiben 240 reservierbare Slots.
- In der Flotte lassen sich Fahrzeuge einzeln oder seitenweise auswählen und gemeinsam einer Linie zuweisen, ins Heimatdepot schicken, verlegen oder verkaufen. Depot-Bestandslinks filtern dieselbe Liste. Befehle validieren Eigentum, Erreichbarkeit, Fahrzeugtyp und gesamte Zielkapazität vor allen Änderungen. Verkauf erfordert Bestätigung.
- Linienplaner links auf der Karte. Wegpunkte werden immer angehängt; Bahn und Schiff unterstützen Pendel- und Ringverkehr. Nicht aufeinanderfolgende Wiederholungen desselben Halts sind erlaubt. Ein Bus-Ring kann einen letzten Wegpunkt auf dem Schließabschnitt haben. Linienkarten verlinken ihre Statistik.
- Sammelbau zeigt jeden Einzugsradius und erlaubt individuelle Namen je Bauposition. Ausgewählte Planungsstationen und geöffnete Standorte zeigen ebenfalls ihren Radius. Bestehende Anlagen öffnen während des Baus kein Detailfenster. Erfolgreiches Bauen lädt die aktuelle Kamerakachel erneut aus dem Cache und setzt die Ansicht fort. Bahnlinien überdecken die anklickbaren Gleisabschnitte nicht mehr.
- Kartenfilter bleiben im lokalen Speicher erhalten. Partneranlagen und Partnerlinien erscheinen automatisch; Rivalenfahrzeuge bleiben separat schaltbar. Nur eigene und Partnerfahrzeuge geben ihre Belegung preis, auch in den Serverantworten. Die Verfolgung zentriert viermal pro Sekunde mit kurzer Kartenanimation. Fahrzeugklicks zoomen moderat auf Stufe 15, bei bereits naher Ansicht höchstens eine weitere Stufe bis 16. Manuell nähere Ansichten bleiben erhalten.
- Geldkapital wird auf Cent gespeichert. Ein interner Bruchteilsrest verhindert Rundungsgewinne/-verluste durch häufige Abfragen. Das ist keine wesentliche CPU-Optimierung; die große Entlastung kommt aus der Nachfrageberechnung und dem Verzicht auf Simulation beim bloßen Öffnen von Welteinstellungen.
- Gleichartige Quell-/Zielzugänge werden vor der Routenbewertung zusammengefasst, mit mengenmäßig gewichteten Gehzeiten. Alle zugänglichen Unternehmen bleiben enthalten; Nachfragevolumen und Kapazitätsgrenzen werden beibehalten. Ein lokaler synthetischer Test reduziert 13.650 Kachelreisen auf 957 Gruppen und misst etwa 90 ms kalt / unter 1 ms im Cache. Das ist kein Live-Lasttest und keine Zusage für 2.500 gleichzeitig betriebene Linien.

TypeScript, Server-Rendering, Spiel-/Migrationsprüfungen und lokale API-Tests prüfen die Änderungen. Eine visuelle Browser-Sichtprüfung ist weiterhin wegen der nicht verfügbaren lokalen CUA-Kernel-Datei offen.


## Version 30: Weltweiter Fahrzeugkatalog

1.084 freigegebene Modelle: 458 Busse, 308 Bahnmodelle/-komponenten, 197 Flugzeuge und 121 Schiffe. Der Import fügt 1.062 Modelle hinzu. Die 22 bisherigen Katalogzeilen einschließlich Preisen, technischen Werten, Bildern und stabilen IDs bleiben unverändert. Bereits bezahlte Fahrzeugpreise werden nicht neu geschrieben.

Die neue geprüfte Excel-Kopie enthält alle vier ursprünglichen Blätter und 197 Formeln. Eine alte überlappende 22-Zeilen-Tabelle wurde entfernt; die vollständige 1.084-Zeilen-Tabelle und der Quellenindex bleiben erhalten. Die Download-Originaldatei wird nicht verändert. `data/catalog-import-1084.json` ist der reproduzierbare geprüfte Importstand; `data/vehicle-catalog.json` bleibt der kleine Startkatalog für eine Neuinstallation ohne veröffentlichten Backendkatalog.

Die Importwerte sind überwiegend ausdrücklich deklarierte Spielannahmen, keine technische Einzelzertifizierung von 1.084 realen Fahrzeugen. 762 zuvor fehlende Nicht-Zuglängen werden ergänzt: 760 typbasierte Spiellängen und zwei Hersteller-/Betreiberangaben (A380 72,7 m laut Airbus, Concorde 62,1 m laut British Airways). Quellen und Unterscheidung stehen in den Modellnotizen und der Excel-Anleitung. Bestehende, bereits geschätzte Zuglängen bleiben erhalten.

Sechs zusätzliche frei lizenzierte Commons-Fotos: Concorde, MAN Lion’s City 12, Volvo 7900 Electric, ICE 4 BR 412, A380-800, Shinkansen N700. Variantenhinweise für Lion’s City 12C und N700-1000 erscheinen direkt beim Bild und in den Notizen. Urheber, Lizenzlinks, Originaldateien und Größenänderungen stehen unter `public/vehicles/import-v30-credits.json` sowie `CREDITS.md`. Die verbleibenden 1.056 neuen Bilder sind eigene generische CC0-Typillustrationen, ausdrücklich keine Modellfotos. Bilder und bestehende bezahlte Kaufpreise werden beim Erweitern nicht verwechselt oder ersetzt.

Der Markt rendert höchstens 24 Modelle je Seite und bietet Modell-/Bauartsuche, Herstellerfilter und Sortierung nach Name, Preis, Kapazität und Tempo. Dies gilt auch im Zugbaukasten; bereits gewählte Komponenten bleiben beim Filtern erhalten. Die Marktseite berechnet nicht nebenbei die Live-Positionen des gesamten Fahrzeugbestands.

Backendgrenzen: höchstens 2.048 Eingabezeilen, 3.072 einschließlich archivierter Modelle; begrenzte HTTP-Nutzlast 2 MB, gespeicherter Katalog 1,8 MB. Der neue Stand benötigt rund 1,34 MB. Ein Flugmodell darf bis 2.500 km/h angeben, damit der Concorde-Spielwert 2.000 km/h nicht verworfen oder in der Kostenprognose abgeschnitten wird. Ohne Bild sind künftig gekennzeichnete Illustrationen möglich; bekannte Fotos benötigen weiterhin vollständige Lizenzangaben. Fehlende Nicht-Zuglängen können als unbekannt gelesen werden, Zuglängen sind weiter verpflichtend.

Prüfungen: tatsächlicher Excel-Rundlauf über alle 1.084×29 Felder, alle Originalmodelle unverändert, Bilddateien und Credits vorhanden, neue E-Bus-Käufe und Zugverbände, 24-Karten-Rendering und Filtersuche, Schlüsselpflicht, CAS/idempotente Revisionen und großer lokaler D1/API-Import. Die Browser-Sichtprüfung bleibt wegen der nicht verfügbaren lokalen CUA-Infrastruktur offen.

## Version 31: Bilder für alle Modelle und Katalognavigation

Alle 1.084 Modelle haben eine Darstellung: 763 Modelle verwenden frei lizenzierte Fotos, 321 eine eigene schematische Modellillustration. Enthalten sind 736 neu zugeordnete Fotomodelle mit 584 Bilddateien; einige Varianten teilen dasselbe gekennzeichnete Familienfoto. Reine Innenräume, unbrauchbare Detailbilder, falsche Zugplattformen und nicht nachgewiesene namensgleiche Schiffe wurden bei der Prüfung verworfen. Die Illustrationen zeigen Bauart und Modellnamen, sind keine maßstabsgetreuen Herstellerzeichnungen. Für jedes der 1.084 Modelle liegt außerdem eine individuelle CC0-Ersatzillustration vor, falls sein Foto nicht geladen werden kann.

Fotoquellen, Urheber, Lizenz und Bearbeitungshinweise stehen in `public/vehicles/CREDITS.md`; die vollständigen Commons-Metadaten und Modellzuordnungen in `public/vehicles/credits-v31.json`. Familien-/Variantenfotos sind direkt an der Modellkarte ausdrücklich gekennzeichnet. Die Aufnahme kann eine andere Lackierung oder Ausführung zeigen. Fotos sind auf höchstens 640 Pixel verkleinert; alle lokalen Dateien wurden decodiert und geprüft. Es werden keine Herstellerlogos in den eigenen Illustrationen nachgezeichnet.

Suche und Seitennavigation stehen jetzt oben und unten in allen Fahrzeugkatalogen einschließlich Zugbaukasten. Vor-/Zurück-Schalter und direkte Seitenauswahl zeigen die aktuelle Seite und Anzahl der Treffer. Eine Änderung der Suche startet bei Seite 1; das Blättern unten bringt den Anfang der neuen Liste in die Ansicht. Die Suche kombiniert Wörter unabhängig von Reihenfolge und Großschreibung und berücksichtigt Akzente sowie Umlaut-Umschreibungen wie ÖBB/OEBB. Weiterhin höchstens 24 Modellkarten und nachgeladene Bilder je Seite.

Die bearbeitbare Excel-Datei ist mit dem Katalog synchronisiert. Nur Bildfelder, Bildhinweise und zugehörige Anleitungen ändern sich; IDs, Preise, Verfügbarkeit und sämtliche Betriebsdaten bleiben erhalten. Die 197 vorhandenen Formeln, Tabellen und Formatierung bleiben bestehen. Typprüfung, Server-Rendering, vollständiger Excel-Rundlauf und lokale API-/Simulationstests prüfen die Änderung. Eine interaktive Browser-Sichtprüfung bleibt wegen der defekten lokalen CUA-Infrastruktur offen.

## Version 32: Abfahrtstafeln und gemeinsam genutzte Stationen

Haltestellen, Bahnhöfe, Flughäfen und Häfen zeigen im bestehenden Detailfenster eine Abfahrtstafel. Sie verwendet die gespeicherten Fahrzeugeinsätze und deren Bewegungspläne einschließlich Beschleunigung, Haltezeit, Bahnsteiglänge, Durchfahrt und Taktwartezeit. Eine geplante Linie ohne Fahrzeuge erzeugt keine Abfahrten. Angezeigt werden bis zu zwölf bevorstehende Abfahrten mit Linie, Richtung/Ziel, Unternehmen, Fahrzeug und Uhrzeit in UTC-Weltzeit. Bei abweichendem Welttempo steht die verbleibende echte Zeit dabei. Linien lassen sich filtern und über die Tafel auf der Karte anzeigen.

Die Zeiten sind Prognosen aus dem letzten Serverstand. Bei mehr als zwölf Sekunden ohne Abgleich oder einem Rückstand der Ereignisverarbeitung werden keine veralteten Prognosen angezeigt. Fahrzeugdaten mit nicht mehr passender Liniengeometrie werden ebenfalls ausgeschlossen. Die Tafel verändert keine Fahrzeugpositionen, Warteschlangen, Passagierzahlen oder Buchungen und benötigt keine zusätzliche Serverabfrage. Bewegungspläne gleichartiger Fahrzeuge werden je Linien-/Modellgruppe vorbereitet; die sekündliche Anzeige berechnet daraus nur die nächsten begrenzten Ergebnisse.

Fußanschlüsse innerhalb von 100 Metern werden mit Stationsname, Entfernung und Hinweis auf zu knappe Abfahrten angezeigt. Die Gehzeit verwendet wie die Reiseketten 80 Meter pro Minute, mindestens eine Sekunde bei getrennten Anlagen. Direkte Halte an gemieteten Anlagen gelten auch dann als direkte Halte, wenn Anlage und Linie verschiedenen Unternehmen gehören. Anlagen- und Haltestellennamen werden dafür weltweit im Spielstand aufgelöst. Das korrigiert zuvor fehlende Mietlinien und unbenannte fremde Halte in Fahrzeugdetails und Flottenansicht. Eigene Linien und Vertragspartner sind bei ausgeblendeter Konkurrenz enthalten.

Geprüft: alle vier Verkehrsmittel, Hin-/Rückrichtung, Ringlinien, ausdrücklich wiederholte Halte, einseitige Endpunkte ohne erfundene Abfahrt, kurze Bahnsteige und Durchfahrtsfaktoren, Taktwartezeiten, reales/vervielfachtes Welttempo, Fremdanlagen und Vertragsfilter, 100-Meter-Grenze sowie unveränderte Simulationsdaten. Ein synthetischer Test mit 20.000 gleichartigen Fahrzeugen an einer Station benötigt lokal etwa 10 ms Vorbereitung und 4 ms zur Auswahl der nächsten zwölf Abfahrten. Das ist kein Produktionslasttest. TypeScript und die bestehenden Simulation-/Renderingtests werden ausgeführt; die interaktive Browser-Sichtprüfung bleibt wegen der lokalen CUA-Infrastruktur offen.


## Zugbearbeitung, Fahrzeugalter und öffentliche Ausschreibungen

Die Zugwerkstatt ist kein eigener Reiter mehr. Abgestellte, nicht angebotene Züge haben in der Flotte den Button **Zug bearbeiten**. Der Editor öffnet sich direkt darüber; vorhandene Teile und weitere Züge aus demselben Depot können verwendet werden. Ausgebaute Bausteine bleiben im Depotlager. Alte Werkstattlinks leiten zur Flotte weiter. Das Lager bleibt auch bei leerem Zugdepot erreichbar.

Alle Verkehrsmittel erfassen Betriebsalter in Weltzeit, Kilometer und Zustand. Neu gekaufte Fahrzeuge beginnen bei 100 %. Bei Altbeständen ist die Vorgeschichte unbekannt; die Anzeige zählt ausdrücklich erst seit Erfassung. Abgeschlossene Fahrtabschnitte verursachen Kilometerabnutzung, dazu kommt geringe Alterung in Weltzeit. Ein schlechterer Zustand erhöht die Wartungskosten pro Kilometer; Energieverbrauch, Beschleunigung und Kapazität bleiben unverändert. Im Depot kann gegen den vorher angezeigten Preis gewartet werden. Alter und Kilometer bleiben dabei erhalten. Verkauf und Umbau setzen die Historie nicht zurück; bei zusammengeführten Teilen gilt konservativ das älteste Baualter und der schlechteste Zustand. Der direkte Verkaufserlös berücksichtigt den Zustand. Gesundheitsänderungen werden als Live-Delta übertragen und lösen keinen vollständigen Kartenabruf aus.

Öffentliche Ausschreibungen sind standardmäßig ausgeschaltet. In den Welteinstellungen können sie aktiviert und automatisch alle sieben Welttage erzeugt werden; eine Runde ergänzt bis zu drei offene automatische Angebote. Die Administration kann eine Runde auch manuell auslösen oder eigene Aufträge für beliebige weltweit gesuchte Orte veröffentlichen: Städteverbindung, lokales Sitzplatzangebot, mehr bediente Haltezonen und rein elektrischer Stadtverkehr. Gruppen, Ortseinzug, Sitzplätze, Subvention, Übernahmefrist und Laufzeit sind einstellbar. Automatische Ortsvorschläge nutzen reale Städte; manuelle Aufträge sind nicht auf diese Vorschläge begrenzt.

Spieler finden Aufträge unter **Unternehmen → Ausschreibungen** sowie bei den Finanzen. Das erste Unternehmen, das die Vorgaben mit eigenem, tatsächlich mit Fahrzeugen bedientem Angebot erfüllt und übernimmt, erhält den Vertrag. Leere geplante Linien zählen nicht. Verbindungen dürfen eigene Anschlusslinien mit höchstens 100 Metern Fußweg nutzen. Die ausgeschriebene Kapazität muss bei Städteverbindungen in beiden Richtungen bestehen; maßgeblich ist der Engpass entlang des Weges. Das ist angebotene Sitzplatzkapazität, keine garantierte Fahrgastnachfrage. Takt, Fahrzeiten und vorhandene Fahrzeugtypen gehen in die Berechnung ein.

Subventionen werden zeitanteilig für qualifizierte Bedienung gebucht, auch beim nachträglichen Serverabgleich. Ein kurzer Einsatz um Mitternacht erhält keinen vollen Tagesbetrag. Wegfallende Kapazität beendet weitere Zuschüsse; nach drei Welttagen ohne Erfüllung endet der Vertrag. Abgelaufene Angebote und abgeschlossene Verträge werden begrenzt aufbewahrt. Beim Abschalten in der Welt enden offene und laufende Aufträge, bereits ausgezahlte Beträge bleiben erhalten. Eine eigene Finanzkategorie zeigt öffentliche Subventionen.

Prüfungen umfassen Kalender-/Kilometerverschleiß, Wartung, erhaltene Historie beim Handel und Zugumbau, Live-Deltas, tatsächliche Kapazität und Umstiege, idempotente anteilige Auszahlung, Fristen, Berechtigungen und Serverpersistenz. Browserprüfung: gespeicherter Zugumbau direkt aus der Flotte sowie administrative Ausschreibungserstellung und Spielerliste.


## Sortierbare Flotte und erweiterte Ausschreibungen

Die Fahrzeugliste sortiert den gesamten gefilterten Bestand vor der Seiteneinteilung: Name (natürliche Nummernreihenfolge), KM, Alter, Zustand, heutiger Fahrzeuggewinn, Auslastung, Kapazität, Höchstgeschwindigkeit, Depot, Linie oder Verkehrsart. Die Richtung ist umschaltbar. Die Kilometeranzeige heißt kurz **KM**. Unbekanntes historisches Betriebsalter bleibt bei Altbeständen separat gekennzeichnet.

Automatische Ausschreibungen haben ein einstellbares Intervall von 1–2.160 Stunden mit wählbarer Welt- oder Echtzeit, 1–10 neue Angebote je Runde und ein Limit von 1–50 offenen automatischen Angeboten. Standard bleiben 168 Stunden Weltzeit, drei neue und höchstens drei offene Angebote. Verpasste Runden werden nicht gestapelt; manuelles Auslösen verschiebt den automatischen Termin nicht. Alle zehn Vorlagen sind einzeln wählbar: Städteverbindung mit Umstieg, lokales Sitzplatzangebot, Flächenerschließung, elektrischer Stadtverkehr, Direktverbindung, Taktverkehr, Umsteigeknoten und Bahnhof-/Flughafen-/Hafenzubringer. Nicht verfügbare Gruppen sowie Zubringer ohne tatsächlich gebaute Zielanlage werden bei der automatischen Erzeugung übersprungen. Manuelle Aufträge sind weiter für beliebige weltweit gesuchte Orte möglich.

Die Vergabe erfolgt ausschließlich über **Bedingungen prüfen**. Das erste Unternehmen, dessen erfolgreiche Prüfung serverseitig gespeichert wird, erhält den Vertrag. Vorhandene und neue tatsächlich bediente Linien zählen. Es gibt weder Bewerbungen noch automatische Vergabe beim Ausbau; auch alte Angebote verwenden diese Regel. Gleichzeitige Anfragen können nicht mehrere Gewinner erzeugen.

Eigene Bus-/Bahn-/Flug-/Schiffslinien können eine Verbindung mit Fußumstieg bis 100 m bilden. Der Engpass des tatsächlich bedienten Netzes begrenzt die angebotenen durchgehenden Sitzplätze; ungefahrene Pläne und Partnerfahrzeuge liefern keine eigene Kapazität. Bei Direktverbindungen ist ein Linienwechsel ausgeschlossen. Taktaufträge prüfen die mit vorhandenen Fahrzeugen mögliche Abfahrtsfolge; ein eingegebener Wunschtakt allein genügt nicht. Ein Umsteigeknoten benötigt eigene, bediente Linien verschiedener Verkehrsarten mit unmittelbaren Fußanschlüssen bis 100 m; es zählt die schwächere Kapazität am stärksten einzelnen Knoten. Zubringer müssen in beiden Richtungen einen Fahrgasthalt höchstens 100 m neben einer gebauten passenden Zielanlage erreichen. Gefordert werden angebotene Sitz-/Umsteigeplätze, keine garantierten tatsächlichen Passagierzahlen.

Die Spielerseite zeigt Typenfilter, Fortschritt, konkrete Bedingungen, Fristen, Gewinner und Zuschüsse. Öffentliche und eigene Ausschreibungen sind getrennte Reiter. Tests prüfen Welt-/Echtzeittrennung, Intervalle und Obergrenzen, Typenauswahl, konkurrierende Prüfungen, Bus–Bahn-Umstiege, Direktverkehr, Takt, Umsteigeknoten, gebaute Zubringerziele und Sortierreihenfolgen über den gesamten Bestand.

## Aktueller Stand: Anschlüsse, Ausschreibungen und Anlagenhandel

- Flughäfen haben einen Fußumsteigebereich von 1.000 m ab ihrer Baufläche, automatisch auch bestehende Anlagen. Sonstige getrennte Stationen bleiben bei 100 m.
- Ausschreibungen zählen ganzzahlige tägliche Sitzplätze tatsächlich eingesetzter Fahrzeuge und den Engpass einer durchgehenden eigenen Verbindung. Ein leeres Liniennetz genügt nicht. Einstellbar sind Angebotsminimum/-maximum je Runde, Laufzeitspanne und feste Tageszahlung oder Fahrgastbonus (z. B. 15 % auf tatsächlich gebuchtes qualifiziertes Fahrgeld). Der Bonus entsteht erst beim Ausstieg. Abrechnung und historische Nachholung sind gegen doppelte Zahlung geschützt.
- Manuelle Ziele umfassen Orte einschließlich Dörfern sowie Länder und Bundesländer/Provinzen mit vereinfachten Natural-Earth-Grenzen. Quellen/Lizenz: `public/regions/CREDITS.md`. Grenzen sind kartografische Spielgrenzen, keine parzellenscharfen Daten.
- Versteigerungen verkaufen Anlagen und ausgewählte Gleisabschnitte. Gebote werden reserviert; überbotene Gebote werden erstattet. Eigentum, Instandhaltung und künftige Miet-/Nutzungsgebühren wechseln bei Ablauf. Belegte Depots müssen vor dem Verkauf geleert werden. Die Abrechnung trennt auch bei Offline-Nachholung am tatsächlichen Auktionsende.
- Die Flotte bietet Auswahl des gesamten gefilterten Bestands über alle Seiten. Mehrfachzuweisungen zeigen nur passende und aus allen Heimatdepots erreichbare Linien. Der Live-Betrieb-Banner entfällt.
- Ungültige Bauflächen bleiben vollständig rot sichtbar, einschließlich markiertem Problemfeld. Busbahnhöfe können nach Entfernung aller Linien abgerissen werden. Linienbearbeitung lässt sich abbrechen; während der Planung werden Fahrzeuge ausgeblendet.
- Flugreichweite gilt je Teilstrecke. Das optionale Backend-Katalogfeld `rangeKm` überschreibt die nach Modellfamilie geschätzte **Spielreichweite**. Diese Schätzungen sind keine Herstellerzertifizierung. Für Bus/Bahn/Schiff wurde kein neues Reichweiten-/Tankstellensystem eingebaut.
- Karten behalten mehr erfolgreiche Kacheln lokal, zeigen Cachetreffer früher und starten Vorladen/Anbieterwechsel schneller. Dichte OSM-Antworten werden sofort unterteilt. Ungecachte Daten bleiben von der Verfügbarkeit und Antwortzeit öffentlicher Kartendienste abhängig.

Lokale Sicherung und Wiederherstellung: [BACKUP.md](BACKUP.md). Aktuelle Prüfungen umfassen TypeScript, Rendering, Simulation, echte lokale HTTP/API-Persistenz und Browserprüfung von Mehrfachauswahl sowie erfolgreicher Ausschreibungsübernahme.


## Welt laden ohne Simulations-Timeout

Beim Öffnen einer Welt wird zuerst ein authentifizierter, gefilterter gespeicherter Spielstand geladen. Dieser Abruf benötigt weder Kartenhydration noch Nachfrageberechnung, Offline-Nachholung oder einen Datenbankschreibvorgang. Während des anschließenden Live-Abgleichs bleibt die Welt geöffnet; die Anzeige kennzeichnet den gespeicherten Stand und friert Fahrzeugprognosen und Weltzeit bis zur ersten bestätigten Aktualisierung ein. Einkäufe und andere Aktionen werden weiter serverseitig geprüft.

Live-/Vollabgleiche erlauben bis zu 60 Sekunden statt 20 Sekunden Antwortzeit. Zeitüberschreitungen, Verbindungsprobleme und ungültige Proxy-Antworten erscheinen verständlich auf Deutsch. Eine unterbrochene Aktion kann mit derselben Anfragekennung sicher erneut angefragt werden; der Server speichert sie höchstens einmal. Tests prüfen die unveränderte Revision und das unveränderte Kapital beim Öffnen sowie das Laden trotz einer nicht verfügbaren gespeicherten Kartenreferenz.


## Einmalzahlungen, Flugnachfrage und Anlagenübersicht

Ausschreibungen unterstützen zusätzliche Einmalzahlungen bei Vertragsstart und erfolgreichem Abschluss, jeweils 0–10 Mio. €. Tageszuschuss darf bei einer reinen Einmalvergütung null sein. Startzahlung erfolgt erst nach der ersten erfolgreichen, gespeicherten Bedingungsprüfung; Abschlusszahlung nur bei erfülltem Angebot am regulären Vertragsende, einschließlich nachgeholtem Offline-Abgleich. Rückgabe, Aufhebung oder nicht erfülltes Angebot zahlen keine Abschlussprämie. Bereits gezahlte Startbeträge bleiben erhalten. Marker im Vertrag und die vorhandene Revisionsprüfung verhindern doppelte Buchungen; sämtliche Beträge erscheinen als öffentliche Subventionen. Automatische Aufträge übernehmen die in den Welteinstellungen gesetzten Einmalbeträge. Alte Aufträge erhalten keine rückwirkenden Prämien.

Die begrenzte Auswahl von Reisezielen berücksichtigt nur physisch erreichbare Ziele und verdrängt Fernziele nicht mehr vollständig durch nahe Halte. Das bestehende endliche Budget von 35 % der erschlossenen Einwohnerfahrten für gebietsübergreifende Reisen bleibt erhalten: Wenn Nah- und Fernziele vorhanden sind, entfallen 30 Prozentpunkte auf Ziele unter 80 km und 5 Prozentpunkte auf Ziele ab 80 km. Höchstens acht Ziele je Quellzugang. Preise, Umstiege, Fußwege, Verträge, reale Zubringerankünfte und Fahrzeugkapazität werden weiter geprüft. Leere Flughäfen erzeugen keine erfundenen Passagiere; Einnahmen entstehen erst bei tatsächlicher Ankunft. Dichte Zubringernetze können Flüge rentabel machen, schwache Einzugsgebiete und Überkapazität bleiben verlustträchtig.

Ein eigenes Flugzeugdepot kann auch Linien bedienen, die seinen Flughafen nicht anfahren. Der Heimatstandort bleibt erhalten; die bisherigen Reichweitenlimits je Flugabschnitt gelten weiter. Es wird keine zusätzliche Leerflug-Simulation eingeführt.

Flotte, Depots, Neufahrzeugmarkt, Gebrauchtmarkt und Anlagenversteigerungen verwenden dieselbe Reiterleiste samt Bestandszahlen. Gleise sind in der geöffneten Angebotsauswahl mit eigenem Filter sichtbar. Einzelne Gleissegmente können gewählt werden; die Karte verlinkt direkt auf den gewählten Gleisabschnitt. Teilung erhält den gesamten Unterhalt der ursprünglichen Anlage. Linienkarten zeigen Streckenlänge in Kilometern, bei Pendellinien den Hinweg und bei Ringen den gesamten Ring.


## Aktueller Stand: Standardwartung und zuverlässige Aktionen

Der Zustands-Prozentwert und die manuelle Depotwartung sind aus der Bedienung entfernt. Es gelten die normalen Grundkosten pro Welttag und Kilometerwartungskosten des Fahrzeugmodells; Energie wird weiterhin separat nach tatsächlich gefahrenen Abschnitten berechnet. Alter und Kilometer bleiben erhalten. Der alte Zustandswert erhöht weder Wartungskosten noch mindert er Fahrzeug- oder Bausteinrückkaufpreise. Alte manuelle Wartungsanfragen werden ohne Abbuchung mit einem erklärenden Fehler abgewiesen.

Welt-Schreibvorgänge verwenden zusätzlich zur Revisionsprüfung eine datenbankweite, höchstens 60 Sekunden gültige Sperre. Live-Abfragen warten nicht auf einen belegten Schreiber und geben dann den gespeicherten Stand zurück. Neue Live-Simulationsläufe beginnen höchstens alle 1,5 Sekunden; vollständige Zustandsabfragen können einen frischen Abgleich auslösen. Während eigener Aktionen pausiert der Browser seine Live-Abfragen. Spieleraktionen antworten nach dem Speichern ohne anschließende vollständige Nachfrageprognose; Kennzahlen werden beim nächsten Abgleich aktualisiert und sind durch `forecastPending` gekennzeichnet. Bestätigte gespeicherte Kennzahlen können ohne erneute Routenberechnung gelesen werden. Reine Umbenennungen verwerfen den Nachfragecache nicht mehr.

Jede neue Browser-Spielaktion erhält eine Anfragekennung. Bei Verbindungsabbruch oder vorübergehender Proxy-/Serverstörung wird dieselbe Kennung wiederverwendet, einschließlich eines erneuten Klicks auf dieselbe unbestätigte Aktion innerhalb von fünf Minuten. Erfolgreiche Kennungen werden atomar mit dem Spielstand gespeichert (höchstens 4.096 Einträge aus zwei Tagen). Wiederholungen führen dieselbe Aktion nicht noch einmal aus. Die Kennung ist an Spieler, Welt und exakten Anfrageninhalt gebunden; Kennungen und Prüfsummen bleiben für Besucher unsichtbar. Die vorübergehende Sperrtabelle ist von Backups ausgeschlossen.

Die Karte bietet einen direkten Linienübersicht-Button und den Filter **Nur im Kartenausschnitt**. Auch Linien, deren Strecke den Ausschnitt durchquert, werden gefunden; Datumsgrenze und verschobene Weltkopien sind berücksichtigt. **Gleise auswählen** aktiviert gut anklickbare Gleisflächen mit orangefarbener Mehrfachauswahl. Bis zu 50 eigene Gleise können als Auswahl in die Versteigerung übernommen oder nach Bestätigung gemeinsam abgerissen werden. Der Server prüft für die gesamte Löschgruppe Eigentum, laufende Versteigerungen und Liniennutzung vor der ersten Änderung. Versteigerungen lassen sich beim Anbieten und beim Durchsuchen nach Bahnhof, Flughafen, Hafen und allen vier Depotarten filtern.

Die Nachfrage bleibt deterministisch aus Einwohnern, Nutzungen, Start-Ziel-Gebieten und Weltparametern abgeleitet. Das Netz beeinflusst Erschließung, erreichbare Zielauswahl, Routenbewertung und Kapazität. Es gibt keine zufällige Befüllung von Fahrzeugen; Umsteiger müssen tatsächlich aus einem vorherigen Fahrzeug ankommen.

## Kompakte Übersicht, Warteziele und Ortssuche

Die Depotseite zeigt direkt die eigenen Depots ohne die vier zusammenfassenden Flotten-Kacheln; diese bleiben in der Fahrzeugübersicht. Die Hauptnavigation trägt keine Linienanzahl mehr. Live-Abgleich und Verbindungsverzögerungen erscheinen platzsparend im Header; lange Statusbanner entfallen. Bestätigte Fahrzeugbewegungen und serverseitige Aktionsprüfung bleiben unverändert maßgeblich.

Haltestellendetails zeigen pro bedienter Linie bis zu drei häufigste Zielhalte mit tatsächlichen wartenden Personenzahlen. Gleiche Ziele werden zusammengefasst; angekündigte, noch nicht eingetroffene Umsteiger zählen nicht als wartend. Unzulässige Firmenumstiege und Fahrten zum selben Halt bleiben ausgeschlossen. Die Daten werden zusammen mit den vorhandenen Warteschlangenzahlen im kompakten Live-Paket übertragen.

Neue kreisförmige Standardgebiete öffentlicher Aufträge sind fünf statt drei Kilometer groß. Bestehende offene automatische Drei-Kilometer-Gebiete werden einmalig erweitert, sofern Verbindungsendpunkte weiterhin getrennt bleiben. Laufende, manuell erstellte und polygonale Aufträge bleiben erhalten.

Die ausdrücklich abgesendete Ortssuche nutzt Photon mit verzögertem Nominatim-Ersatzdienst. Ein atomarer, isolatübergreifender Abstand von mindestens 1,1 Sekunden begrenzt Suchanfragen; es gibt kein Autocomplete. Erfolgreiche Ergebnisse bleiben sieben Tage in D1 und können bei Ausfall bis 30 Tage als Ersatz dienen, leere Treffer eine Stunde. Gleichzeitige Requests teilen keine ausfallgefährdeten Netzwerk-Promises. Koordinaten funktionieren ohne externen Dienst. Attribution: OpenStreetMap; Anbieterregeln: https://operations.osmfoundation.org/policies/nominatim/.

Eine tägliche, je Land zeitlich versetzte weltweite Zielwahl ist noch kein Teil der Simulation. Dafür wären vorab erzeugte, stabile Herkunft-Ziel-Kohorten mit einem endlichen täglichen Personenbudget sinnvoll; einzelne persistente Datensätze für die gesamte Weltbevölkerung wären für die aktuelle Architektur zu groß. Die vorhandene Nachfrage arbeitet weiter mit endlichen, deterministischen Flüssen aus erschlossenen Gebieten und tatsächlichen Warteschlangen, Umstiegen und Kapazitäten.

## Nachfragecache über Serverinstanzen hinweg

Die vollständige Nachfrageprognose einschließlich Flüssen bleibt unter `routingForecast` im komprimierten Server-Spielstand gespeichert. Damit müssen neu gestartete Worker dieselbe unveränderte Welt nicht erneut durchrechnen. Der Cache nutzt eine versionierte 64-Bit-Prüfsumme plus Textlänge über den vollständigen bisherigen Netzschlüssel: Kartenstände, Welteinstellungen, Modellkatalog, Linienführung und Fahrpreise, aktive Fahrzeuge und Depots, Infrastruktur, Unternehmenssperren, aktive Umsteigefreigaben und nachfragerelevante Ausschreibungsdaten. Änderungen daran verwerfen das Ergebnis vor seiner Verwendung. Reine Anzeigenamen, Kapitalstände, Kilometer und Warteschlangen ändern das Netz nicht. Die derzeitige Nachfragekurve ist zeitlich konstant (`hourFactor = 1`); bei Einführung tageszeitabhängiger Ziele muss der Cache zusätzlich den Nachfragezeitabschnitt enthalten. Bei einer Änderung des Berechnungsverfahrens ist die Signaturversion zu erhöhen.

Der private Cache wird aus sämtlichen Besucher-Spielständen entfernt und nicht im Live-Paket übertragen. Er dient ausschließlich der Prognose und endlicher Warteschlangenzuflüsse; Geld und Personen werden weiterhin über tatsächlich gespeicherte Fahrzeugereignisse gebucht. Nach relevanten Netzänderungen ist weiterhin eine vollständige erste Neuberechnung nötig; weitere identische Abgleiche und neue Worker können das gespeicherte Ergebnis verwenden.

## Update vom 3. November 2026

- Die Kartenübersicht steht unter „Neue Linie“ in einer gemeinsamen rechten Schaltflächengruppe. Gleis-Hovertexte bleiben deaktiviert.
- Automatisch erzeugte Städte- und Direktverbindungen sind verkehrsmitteloffen. Bestehende offene automatische Verbindungsangebote werden einmalig umgestellt; laufende Verträge behalten ihre Zusagen. Zufallsvergütung variiert Tageszuschuss und Bonusbasis zwischen 50 und 150 Prozent; Start-/Abschlussbeträge können entfallen. Bei Basisbetrag 0 wird im Zufallsmodus eine vertragsbezogene Basis verwendet. Ergebnisse werden im Angebot gespeichert und während des Vertrags nicht neu gewürfelt. Manuelle Aufträge bleiben exakt konfigurierbar.
- Der Standard für Fahrzeug-/Anlagenwartung beträgt 115 Prozent, in den Welteinstellungen anpassbar. Energie, Investitionspreise und Nutzungsgebühren werden nicht pauschal erhöht. Die Umstellung belastet keine Zeit vor dem ersten aktualisierten Abgleich nach. Tages-/Kilometerwartung, Statistiken und Kaufansichten verwenden denselben Faktor.
- Bis zu zehn Umstiege sind erlaubt. Ältere gespeicherte Weltkonfigurationen erhalten einmalig das neue Limit; danach kann die Administration es wieder absenken. Kapazitätsgesperrte Direktwege lassen längere, zulässige Reiseketten zu. Zusätzliche Umstiege bleiben durch die bestehenden Zeit-/Preis-/Umstiegsgewichte unattraktiver, solange ein besserer benutzbarer Weg besteht.
- Gleisanlagen werden anhand der tatsächlichen physischen Kreuzungen und Enden normalisiert. Bauzwischenpunkte teilen keine Anlage. Passende aneinandergebaute Abschnitte werden ohne Eigentums-/Gleistypwechsel zusammengeführt. Eigentum und gesamter Unterhalt bleiben erhalten. Bereits laufende Auktionen behalten ihre angebotenen Geometrien. Nach der Normalisierung bleibt eine physisch gleich verlaufende besetzte Zugfahrt einschließlich Personen und nächster Ankunft erhalten; die reine Änderung der Anlagenaufteilung startet sie nicht neu.
- Das Unternehmensprofil zeigt CCC, B, BB, BBB, A, AA oder AAA für die letzte abgeschlossene UTC-Weltwoche. Grundlage sind laufende Einnahmen inklusive Zuschüssen minus Betrieb, Zinsen und Verträge. Investitionen, Verkäufe, Kreditaufnahme und Tilgung verändern das Rating nicht. Ohne Einnahmen/Kosten wird noch kein Rating vergeben. Die Schwellen stehen im Profil.

### Live-Abgleich und Speicher

Neue Worker laden für die Simulation schlanke Nachfragekarten (Bevölkerungszellen und Geometriegrenzen), während Bauen und Straßenrouting vollständige Karten erhalten. Schlanke Karten werden unter `demand-v1:` in D1 zwischengespeichert; vollständige Karten-API-Antworten bleiben vollständig. Zugang-/Abgangsgehzeiten werden für den Routencache normalisiert und anschließend exakt zurückgerechnet. Dominierte Umstiegszustände werden verworfen; der Routencache ist begrenzt. Bei Kapazitätsrunden bleiben weiterhin mögliche optimale Wege nutzbar, bis eine ihrer Linien tatsächlich blockiert ist. Kostenänderungen aktualisieren Kennzahlen, ohne Personen oder Wege neu zu erfinden. Private Routing-/Normalisierungsschlüssel gelangen nicht in Besucherspielstände.

Der Browser überspringt Abfragen nicht mehr bei inaktiver Registerkarte und startet beim Zurückkehren/Fokussieren sofort einen Abgleich. Browser dürfen Hintergrundtimer drosseln. Das Offline-Ereignisprotokoll bleibt maßgeblich; es werden keine unbestätigten Fahrzeugbewegungen erfunden. Die zuvor pausierte Cloud-Automation wurde nicht stillschweigend reaktiviert. Dieses Update erzeugt keinen neuen dauerhaften Cloud-Zeitplan.

Logistik wurde auf Wunsch zunächst als Konzept ausgearbeitet. Frachtbestände, Fahrzeuge und wirksame getrennte Pax-/Fracht-Weltoptionen wären eine eigene Erweiterung; die vorhandene Simulation erhält keine wirkungslosen Fracht-Schalter.
