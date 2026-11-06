# Logistik in Weltverbund – Konzept und Aufwand

Historisches Konzept vom 3. November 2026 für eine Integration in das ursprüngliche Personenverkehrsspiel. **Inzwischen gibt es eine eigenständige Logistik-V1 unter `/logistik`; siehe `LOGISTIK-START.md`.** Die nachstehenden Aufwandsschätzungen und Integrationspläne beziehen sich auf einen zukünftigen Ausbau des alten, serverseitigen Spiels.

## Was technisch möglich ist

Personenverkehr und Logistik können in derselben Welt nebeneinander laufen. Die vorhandenen Linien, Fahrzeuge, Gleise, Depots, Häfen, Flughäfen, Finanzbücher und serverseitigen Ankunftsereignisse sind dafür eine brauchbare Grundlage. Fracht braucht zusätzlich eigene Warenmengen, Fahrzeugkapazitäten und Lieferzustände. Eine reine Umbenennung von Passagieren würde keine belastbare Logistiksimulation ergeben.

## Zwei getrennte Weltoptionen

- **Personenverkehr aktiv:** erzeugt neue Fahrgastnachfrage und erlaubt Personenverkehrsangebote.
- **Logistik aktiv:** erzeugt neue Lieferaufträge und erlaubt Frachtverkehrsangebote.

Die Kombinationen wären Personenverkehr, reine Logistik oder Mischbetrieb. Abschalten sollte vorhandene Fahrzeuge, Waren und Konten erhalten. Vor der Umsetzung muss festgelegt werden, ob bereits unterwegs befindliche Lieferungen noch abgewickelt oder bis zum Wiedereinschalten angehalten werden. Änderungen erhalten einen Zeitstempel, damit Offline-Nachholung weiterhin nach den jeweils gültigen Regeln abrechnet.

## Kleinste sinnvolle erste Version

Ein Warentyp „Stückgut“, wenige konkrete Versender und Empfänger, Lagerbestände mit begrenzter Erzeugung beziehungsweise Nachfrage und straßengebundene Lieferungen zwischen Logistikterminals. Fahrzeuge benötigen ein eigenes Nutzlastfeld (Tonnen oder Paletten), getrennt von Fahrgastplätzen. Lieferungen erhalten ein Ziel, eine Menge und einen endlichen Auftrag. Erlöse entstehen erst bei tatsächlicher Ankunft; Leerfahrten und laufende Kosten bleiben kostenpflichtig. Eine Seite zeigt wartende, unterwegs befindliche und zugestellte Fracht sowie Gewinn und Verlust.

Als grobe Planungsgröße: etwa **3–6 konzentrierte Entwicklungstage** einschließlich Datenmodell, Oberfläche, Migration und Tests. Das ist eine Aufwandsschätzung für diesen Umfang, kein zugesagter Liefertermin.

## Zweite Etappe

Bahn-, Schiffs- und Luftfracht, Umladung über mehrere Linien, Lagerkapazitäten, Ladezeiten und mindestens zwei Gütergruppen. Gleise, Stationsflächen und Flughafenslots können gemeinsam mit dem Personenverkehr genutzt werden; Frachtkapazitäten und Fahrzeuge werden getrennt gerechnet. Im Zugbau wären Güterwagen und ihre Kapazitäten zu ergänzen. Für Flughäfen wären Frachtflugzeuge und passende Terminals nötig.

Grobe zusätzliche Planungsgröße: **5–10 Entwicklungstage**. Der Aufwand steigt vor allem durch Kapazitätsverteilung, Umladevorgänge, gemeinsame Anlagen und Offline-Abrechnung.

## Spätere Wirtschaftssimulation

Produktionsketten mit Rohstoffen und Fertigwaren, variable Lagerhaltung, Lieferfristen, Verträge und Nachfrageschwankungen. Diese Stufe sollte ein eigener Ausbau mit mehreren Etappen sein. Sie braucht klare Regeln gegen unbegrenzte Warenerzeugung und sich selbst finanzierende Lieferkreise.

## Was aus dem bestehenden Spiel übernommen werden kann

Liniengeometrien, Anlagenbesitz, Nutzungsrechte, Auktionen, Finanzbuchungen, einmalige Aktionskennungen und die serverseitige Verarbeitung realer Ankunftsereignisse. Der verbesserte Routen- und Nachfragecache kann getrennte Einträge für Personen und Güter bekommen. Bei Warenwechseln oder geänderten Kapazitäten müssen diese Einträge gezielt ungültig werden.

## Tests, die vor einer Veröffentlichung nötig wären

Mengen müssen vom Versender bis zum Empfänger erhalten bleiben. Umladung darf keine Fracht duplizieren. Geld darf für dieselbe Lieferung nur einmal entstehen. Volle Lager und Fahrzeuge müssen Transport bremsen. Offline-Zeit, parallele Aktionen, Versteigerungen und das Abschalten einer Sparte dürfen weder Waren noch Forderungen verschwinden lassen.
