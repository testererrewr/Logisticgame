# Nachfrage und Fahrgastwahl – Weltverbund v11

## Das verwendete Modell

Die Spielkarte nutzt echte OpenStreetMap-Gebäude, Straßen und POIs. Jede 50 × 50 m große Zone kann gleichzeitig Einwohner, Arbeitsplätze sowie Einkaufs- und Freizeitpotenzial besitzen. Diese Mengen sind Schätzungen aus Gebäudegrundflächen, Geschossen und OSM-Tags. Unbebaute Flächen ohne entsprechende POIs erhalten keine erfundenen Menschen oder Ziele.

Die laufende Berechnung betrachtet ausschließlich bewohnte bzw. genutzte Zonen, die im Einzugsgebiet eines bedienten Halts liegen. OSM-Daten werden dennoch einmalig für das ganze gewählte Gebiet geladen: Nur so lässt sich unterscheiden, wo wirklich Gebäude und freie Flächen liegen.

### 1. Fahrtwünsche erzeugen

Die Standardeinstellung ist eine Basis von 2,4 Hin- und Rückfahrten je Einwohner und Spieltag. Arbeitswege erhalten 50 %, Einkaufen 30 % und Freizeit 20 %. Diese Werte lassen sich pro Welt ändern. Fehlende Ziele oder Anschlüsse können einen Teil dieser potenziellen Fahrten unbedienbar machen.

Für einen Ausgangspunkt werden wenige attraktive Ziele je Zweck bestimmt. Eine größere Zielnutzung ist attraktiver, Entfernung senkt die Anziehung:

`Zielgewicht = sqrt(Arbeitsplätze oder Einkaufs-/Freizeitpotenzial) / (2 + Entfernung in 50-m-Zellen)`

Es werden bis zu drei Ziele je Zweck in einer räumlich begrenzten Suche verwendet. Hin- und Rückwege sind eigene Fahrtwünsche. Eine neue konkurrierende Linie kopiert diese Fahrtwünsche nicht. Neue Haltestellen können vorher unbediente Nachfrage erschließen.

Fernverkehr verwendet gemeinsame Städtepaare und räumlich getrennte Haltestellen-Einzugsgebiete. Nur tatsächlich angebundene Einwohner- und Zielanteile gehen in diese Nachfrage ein. Ein Flughafen auf einer leeren Wiese produziert deshalb keine eigenen Passagiere. Ein Zubringer muss Menschen aus Wohnzonen zu ihm bringen; am Ziel muss ebenfalls eine vollständige Verbindung bestehen.

Arbeitswege, Einkaufen und Freizeit besitzen unterschiedliche Stunden- und Wochenendprofile. Die Profile beziehen sich derzeit auf UTC. Der Basiswert ist daher eine Kalibrierung der potenziellen Nachfrage; die tatsächliche Tagesmenge hängt zusätzlich von Profil, Anschlüssen und Kapazitäten ab.

### 2. Das gemeinsame Netz durchsuchen

Alle aktiven Unternehmen konkurrieren um dieselben Fahrtwünsche. Die Suche bewertet aber nur Reiseketten innerhalb eines Unternehmens. Eine Reise kann beispielsweise so verlaufen:

`Wohnzone → Bus von Firma A → Flughafen → Flug von Firma A → Bus von Firma A → Arbeits-/Freizeitziel`

Ein Wechsel zu fremden Unternehmen ist derzeit gesperrt, auch nach einem Fußweg und bei identischen Haltekoordinaten. Dafür wird zukünftig ein ausdrücklicher Vertrag benötigt. Der Gesamtbedarf wird durch diese Einschränkung nicht pro Unternehmen kopiert.

Standard-Reichweiten:

| Halt | Zugang zu Fuß | Fußumstieg |
|---|---:|---:|
| Normale Bushaltestelle | 150 m | höchstens 150 m |
| Busbahnhof | 300 m | höchstens 300 m |
| Bahnhof oder Flugplatz | 300 m | höchstens 300 m |

Ein Fußumstieg muss innerhalb der Reichweite **beider** beteiligten Halte liegen. Eine normale Haltestelle in 200 m Entfernung vom Flughafen reicht also nicht. Ein beim Bau ausgewählter Busbahnhof mit 300 m Radius kann diese Verbindung ermöglichen. Eine normale Haltestelle kostet 10.000 Spiel-Euro, ein Busbahnhof 55.000. Ein späterer Typwechsel ist ausgeschlossen. Die Radien und maximal erlaubten Umstiege sind Welteinstellungen.

Bushalte liegen an echten Straßen. Die Busroute benutzt den tatsächlichen Straßengraphen einschließlich Einbahnstraßen und Rückweg. Bahnlinien benötigen eigene Bahnhöfe und gebaute Gleise. Fluglinien benötigen eigene Flugplätze.

### 3. Die ganze Reise bewerten

Eine geringere Punktzahl ist besser:

`Punkte = Fahrminuten × Zeitgewicht + Warteminuten × Wartegewicht + Gehminuten × Gehgewicht + Ticketpreis × Preisgewicht + Umstiege × Umstiegsgewicht`

Basiswerte: 1 Punkt je Fahrminute, 1,5 je Warteminute, 1,3 je Gehminute, 1 je Euro und 8 je Umstieg. Positive Mindestwerte für Fahrzeit und Gehzeit verhindern endlose kostenfreie Wege in der Routensuche. Die Wartezeit wird aus Umlaufzeit und Fahrzeugzahl angenähert; sie ist kein echter minutengenauer Fahrplan.

Die Basiswerte werden mit Fahrgastpräferenzen multipliziert:

| Gruppe | Anteil | Zeitfaktor | Preisfaktor | Verhalten |
|---|---:|---:|---:|---|
| Zeitorientiert | 35 % | 1,8 | 0,25 | Spart bevorzugt Reisezeit |
| Preisorientiert | 35 % | 0,35 | 3 | Spart bevorzugt Geld |
| Ausgewogen | 30 % | 1 | 1 | Beachtet beide Seiten |

Auch Geh-, Warte- und Umstiegsgewichte besitzen gruppenspezifische Faktoren. Der **Demand-Rechner im Spiel verwendet exakt dieselbe Bewertungsfunktion**. Seine Testregler verändern keine Welt. Die tatsächlich verwendeten Regeln werden nur im Admin-Panel gespeichert.

Beispiel aus dem Rechner:

| | Verbindung A | Verbindung B |
|---|---:|---:|
| Fahren / Warten / Gehen | 18 / 4 / 3 Minuten | 27 / 7 / 5 Minuten |
| Gesamtticket | 4 € | 2 € |
| Umstiege | 1 | 0 |
| Punkte: zeitorientiert | 58,1 | 75,0 |
| Punkte: preisorientiert | 28,4 | 24,6 |
| Punkte: ausgewogen | 39,9 | 46,0 |

Ohne Kapazitätsengpass wählen damit 65 % A und 35 % B. Bei exakt gleicher Bewertung wird aufgeteilt. Wenn eine Teilstrecke voll ist, wird nach der nächsten erreichbaren Alternative gesucht. Rein zu Fuß erreichbare Reisen verursachen keine Tickets oder Fahrzeugeinstiege.

### 4. Kapazität für die ganze Reisekette reservieren

Eine zugeteilte Reise belastet jede benutzte Linie. Eine Fahrt mit zwei Umstiegen bleibt **eine Reise**, erzeugt aber drei Einstiege. Die Oberfläche unterscheidet daher erfolgreiche Reisen, Reisen mit Umstieg, reine Fußreisen und Fahrzeugeinstiege. Es werden niemals aus einem Fahrtwunsch drei unterschiedliche Personen gemacht.

Kapazitäten werden gleichzeitig und proportional verteilt. So bekommt nicht die zuerst durchlaufene Firma oder Zone alle freien Plätze. Gleichwertige Wege werden als verzweigter Pfadgraph zusammengefasst. Gleich gute unternehmenseigene Alternativen bleiben zusammengefasst; vollständige Netze verschiedener Anbieter teilen denselben Bedarf.

## Echtzeit und Welteinstellungen

- Standard: 1× – eine echte Minute ist eine Spielminute.
- Weitere Faktoren: z. B. 10×, 60×, 360× oder 1440×; eigene Werte zwischen 0,1 und 1440 sind möglich.
- Neue Welten beginnen als Entwurf. Beim ersten Start beginnt ihre Spieluhr mit der aktuellen Zeit.
- Gestartete Online-Welten laufen dauerhaft weiter. Es gibt keine Pause. Eine endgültig geschlossene Welt erhält keine weitere Abrechnung und kann nicht neu gestartet werden.
- Eine Geschwindigkeitsänderung wirkt ab dem Speichern. Vorherige Zeit wird mit dem vorherigen Faktor abgerechnet.
- Bei geschlossener Seite wird die verstrichene Spielzeit beim nächsten Serverkontakt abgerechnet. Es braucht keine offene Browserseite und kein dauerhaft laufendes Browser-Skript.
- Die Integration erfolgt über Zeitintervalle und Stundenprofile. Häufiger aktualisieren erzeugt keinen finanziellen Vorteil.

Die Nachfrage bleibt eine aggregierte Verkehrsfluss-Simulation, der Betrieb wird zusätzlich ereignisbezogen verarbeitet. Prognosen reservieren endliche Nachfrage und Modellkapazitäten. Nur anfängliche Einstiege erzeugen neue ganze Fahrgäste in Warteschlangen. Bruchteile verschiedener Start-Ziel-Paare werden je Linie gebündelt und anschließend anhand der aufsummierten Nachfrageschuld verteilt. Dadurch entstehen auch bei vielen kleinen Einzelmärkten zeitnah ganze Personen, ohne den endlichen Gesamtbedarf zu überschreiten. Umsteiger werden erst nach der tatsächlichen Ankunft des Zubringers und dem Fußweg beim Anschluss verfügbar. Auf dem Fahrzeug bleiben Belegung, Ausstiegshalt und Einstiegstarif gespeichert. Ticketerlöse entstehen genau einmal beim Ausstieg; laufende Kosten werden über verstrichene Spielzeit integriert.

Die Karte interpoliert reale Fahrzeugumlaufpositionen anhand der serverseitigen Spieluhr. Eine reine Hinweg-Buslinie endet am Endpunkt, Ring und Pendellinien wiederholen ihren ausdrücklich gewählten Verlauf. Die Werte im Nachfrage-Labor sind Prognosen; bestätigte Einstiege und Geldbuchungen sind echte Serverereignisse. Es gibt noch keine individuelle Personendatei, Staus oder Signale. Anschlussverteilungen werden nach Kohorten angenähert. Bis zu 20.000 Ankünfte pro Serveranfrage werden nachgeholt; weitere bleiben gespeichert und lösen einen Aufholhinweis aus.

## Weitere sinnvolle Ideen

Diese Punkte sind Vorschläge für spätere Ausbaustufen, noch keine implementierten Funktionen:

1. **Verlässlichkeit und Pünktlichkeit:** erwartete Verspätungsminuten und Anschlussrisiko als zusätzliche Kosten. Ein knapper Billig-Anschluss wäre dann weniger attraktiv.
2. **Persönliche Budgets und Reisebereitschaft:** Reisende mit maximalem Ticketbudget oder maximaler Gesamtdauer wählen gegebenenfalls Auto, Fahrrad oder verzichten auf die Reise.
3. **Lokale Zeitzonen:** Pendler-, Laden- und Freizeitprofile nach tatsächlicher Stadtzeitzone statt des gemeinsamen UTC-Profils.
4. **Tagesgenaue Fahrtwünsche:** feste Wohn-/Arbeitsbeziehungen, Schichtarbeit, Schulwege und Rückfahrten. Nachfrage sollte trotzdem nach Kohorten berechnet werden.
5. **Reale Fußwege:** Übergänge entlang von Fußwegen und Brücken statt Luftlinien-Radien. Das würde Flüsse, Zäune und abgeschnittene Bahnhofsseiten berücksichtigen.
6. **Ereignisse und Saisonalität:** Wetter, Ferien, Stadien, Konzerte, Tourismus und Wochenmärkte verändern reale Zielpotenziale zeitlich begrenzt.
7. **Netzeffekte:** bessere Takte und zuverlässige Anschlüsse erschließen langfristig zusätzliche ÖPNV-Nachfrage. Dieser Effekt sollte getrennt vom vorhandenen gemeinsamen Fahrtwunsch-Pool bleiben.
8. **Tarifverbünde:** ein durchgehendes Ticket wird nach gefahrenen Teilstrecken oder festen Partnerverträgen zwischen Firmen verteilt.

## Geprüfte Eigenschaften

Automatische Tests prüfen unter anderem:

- keine Verdoppelung des Bedarfs durch eine zweite Firma;
- faire Gleichstände zwischen 32 vollständigen eigenen Netzen;
- vollständige eigene Bus–Flug–Bus-Reisen und die Sperre fremder Anschlüsse;
- 150-/300-m-Grenzen und fehlende Anschlüsse;
- Kapazitätsgrenzen und unbediente Nachfrage;
- Preis- und Zeitpräferenzen;
- echte Zeitfaktoren, endgültige Schließung, Faktorwechsel und Abrechnung unabhängig von der Abrufhäufigkeit;
- Adminrechte, geschütztes Besitzerkonto, Sperren, Sitzungsentzug und Welt-Lebenszyklus.

## Durchgehende Weltkarte und Depots

Fahrzeugmodelle beeinflussen die Angebotsseite: Ihre Kapazität und Umlaufzeit bestimmen täglich verfügbare Plätze, ihre Abfahrtsfolge die Wartezeit und ihre Geschwindigkeit die Reisezeit. Die Nachfrage selbst bleibt derselbe gemeinsame, endliche Pool. Schnellere Modelle können zeitbewusste Fahrgäste gewinnen; größere Modelle können mehr Nachfrage bedienen. Die Angebotsprognose rechnet näherungsweise mit 18 Betriebsstunden pro Spieltag und einer nach Abfahrten gewichteten Geschwindigkeit gemischter Flotten. Unzugewiesene Fahrzeuge tragen nichts zum Angebot bei.

Die Karte kann von der Welt bis zur Straße gezoomt werden. Gebäudedaten und Straßennetze werden erst bei lokaler Ansicht in 4-km-Kacheln nachgeladen. Der 50-m-Nachfragekern bleibt an tatsächlich erschlossene Nutzungen gebunden. Bis zu acht benachbarte Datengebiete können eine Stadtbusroute bilden; gleiche Straßenkoordinaten verbinden die gerichteten OSM-Graphen. Fernbus- und Schiffsverläufe bleiben im ersten Modell schematisch.

Busse benötigen ein eigenes Depot innerhalb von 250 km des gesamten Verlaufs. Züge brauchen ein eigenes Zugdepot im verbundenen Gleisnetz; Nähe allein genügt nicht. Flugzeugdepots werden direkt am Flughafen gebaut. Ohne passendes Depot erhalten Linien keine Transportkapazität, und weitere Fahrzeuge sind gesperrt. Depots erhöhen keine Haltestellenradien und erzeugen keine Passagiere.

## Eigenständige Haltestellen

Bushaltestellen und Busbahnhöfe sind eigene Bauwerke eines Unternehmens. Mehrere Linien können dieselbe Haltestelle bedienen. Der Typ und seine Reichweite gelten für alle bedienenden Linien und werden beim Bau festgelegt. Die Linienreihenfolge wird im eigenen Linienfenster bearbeitet und folgt dem gerichteten Straßennetz. Unbediente Haltestellen erzeugen keine zusätzlichen Passagiere oder Einzugsgebiete im aktiven Verkehrsnetz. Das Verkaufen einer Linie entfernt ihre Haltestellen nicht.

## Weltweite Gebiete und Anzeige vor dem Linienbau

Die Bedarfsgrundlage entsteht in jedem frei gewählten Kartengebiet aus echten OSM-Gebäuden und POIs, unabhängig von der früheren Liste benannter Städte. Die Kartenanzeige zeigt Einwohner, Arbeitsplätze, Einkauf/Freizeit und geschätzte Wege pro Spieltag schon ohne Linie. Sie zeigt damit vorhandenes Potenzial; die Netzstatistik zählt weiterhin die berechneten erschlossenen Reiseketten.

Die Zielsuche berücksichtigt bei dünner Besiedlung das gesamte 4-km-Datengebiet. Sie endet nicht mehr nach 30 Rasterzellen. Arbeits- und Einkaufsziele werden einmal pro geladenem Schnappschuss indexiert. Für die Verteilung werden weiterhin nur erschlossene Ausgangszellen und erreichbare Verbindungen ausgewertet. Benachbarte Datengebiete und Fernverbindungen bleiben Teil desselben Unternehmensnetzes. Kein Unternehmen erhält eine eigene Kopie des Fahrgastpools. Ungeladene Gebiete werden nicht als unbewohnt gespeichert; fehlgeschlagene Downloads bleiben sichtbare Ladefehler.

## Kostenlose Linien und echte Fahrzeugzuweisung

Alle neu angelegten Linien starten mit null Fahrzeugen. Ohne gekauften, zugewiesenen und depotseitig erreichbaren Bestand werden keine Verkehrsverbindungen für diese Linie in den Fahrgastgraph eingefügt. Es gibt keine Kapazität, Fahrgeldeinnahmen oder Fahrzeugbetriebskosten. Fahrzeuge ohne Linienzuweisung erzeugen ebenfalls keine Beförderung. Der gemeinsame Nachfragepool bleibt unabhängig von der Unternehmenszahl bestehen.

Neue Buslinien sind standardmäßig gerichtete offene Wege. Nur ausdrücklich gewählte Pendellinien besitzen getrennte Hin- und Rückkanten; Ringlinien schließen zum ersten Halt. Reine Wegpunkte verändern die Straßenroute und deren Fahrstrecke, erzeugen aber keine Zugangsknoten, zusätzliche Halte oder Umsteigemöglichkeiten im Fahrgastmodell.


## Gerichtete Straßen und Haltestellenseiten

Ein Halt bindet Fahrgäste an einen Ort, nicht unveränderlich an eine Fahrtrichtung eines OSM-Knotens. Für die Linienplanung werden Projektionen auf nahe befahrbare Straßenabschnitte innerhalb von 25 m geprüft. Die Auswahl minimiert den gesamten Verlauf einschließlich kurzer Zugangswege. Eine gegenüberliegende Fahrbahn ist damit nutzbar, ohne das Fahrzeug gegen eine Einbahn zu schicken. Wegpunkte behalten die konkret gewählte Fahrbahn. Es gibt noch keine Simulation getrennter Bussteige, Fußgängerampeln oder Straßenüberquerungsverbote.


## Version 27

Tag, Nacht und Wochentag verwenden denselben Nachfragefaktor 1. Eine zeitunabhängige Prognose wird je unveränderter Netztopologie wiederverwendet. Die Weltkonfiguration skaliert den Bedarf zusätzlich mit `demandMultiplier`. Der tatsächliche Fahrpreis ist der feste Ticketpreis der Linie. Grundpreis plus Entfernung ist nur eine Preisempfehlung. Fortsetzungen am Linienrand zählen nicht erneut als neu erzeugte Passagiere.

Stationsnutzung und Umsteigeverträge sind getrennt: Eine fremde Station zu mieten erlaubt das eigene Halten, ersetzt aber keinen Vertrag zum Übernehmen von Passagieren aus fremden Fahrzeugen. Eigene Anschlüsse brauchen keinen Vertrag; der 100-m-Fußweg gilt ebenso für Bus/Bahn/Flug/Schiff-Kombinationen.


## Version 28: Kachelgrenzen und Entfernung

Kachelübergreifender Bedarf wird aus angeschlossenen Einwohnern gebildet. Sind Ziele in anderen Kacheln angeschlossen, sind 35 % des Budgets dafür und 65 % für lokale Ziele vorgesehen. Ohne externe Ziele bleibt das lokale Budget vollständig. Bis zu acht externe Zielgruppen pro Ursprung werden nach Wurzel ihrer Attraktivität und abnehmender Entfernung gewichtet. Das ersetzt das nahezu verschwindende Produkt zweier kleiner Bevölkerungsanteile. Eine fehlende vollständige Verbindung erzeugt keine fahrbereiten Passagiere.

Die Routenwahl bewertet gefahrene Kilometer geteilt durch die Luftlinie (mindestens 250 m) als Streckenfaktor. Dadurch kosten Umwege zusätzliche Punkte. Alle Teilstrecken zählen; Vertrag A–B und B–C genügt für A→B→C. Ein A–C-Vertrag ist nicht erforderlich. Tageszeit verändert die Menge nicht.

Der Rechner zeigt die festen Weltgewichte einschließlich Entfernung. Verändert werden nur die Reisebeispiele. Statistische Einstiege unterscheiden direkte Fahrten, eigene und fremde Linienwechsel; Fortsetzungen am Endhalt bleiben getrennt.


## Version 29: Zugangsgruppen

Vor der Routenwahl werden lokale Märkte mit derselben Menge zugänglicher Quell- und Zielstationen sowie demselben Zweck zusammengeführt. Ihre Fahrtenmengen werden addiert und ihre Fußwege nach Fahrtenmenge gewichtet. Dadurch werden konkurrierende Zugänge beibehalten, während dieselbe Linienauswahl nicht für jede einzelne 50-m-Kachel neu gesucht wird. Zellmengen und Kachelgrenzen bleiben die Grundlage der Bedarfserzeugung. Die mittleren Fußwege sind eine bewusste Näherung zugunsten der Leistung.
