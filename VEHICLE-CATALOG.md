# Fahrzeugkatalog über Excel verwalten

Der Katalog wird ausschließlich über ein Kommandozeilenwerkzeug und einen eigenen Backend-Schlüssel veröffentlicht. Im Spiel und im Admin-Panel gibt es keinen Excel-Upload. Ein normales Konto oder ein Admin-Cookie berechtigt nicht zum Katalog-Push. Der Server speichert nur den SHA-256-Hash des separaten Schlüssels in `CATALOG_PUSH_HASH`.

Die mitgelieferte Datei `Fahrzeugkatalog.xlsx` enthält das Eingabeblatt **Fahrzeuge** und eine Erklärung aller Felder unter **Hinweise**. Die zwölf Startmodelle haben stabile IDs. Preise und Kosten sind Spielwerte. Referenzdaten und Hersteller- beziehungsweise Betreiberquellen stehen daneben. Elf Modelle besitzen lizenzierte Fotos, der Damen Waterbus 2407 eine bezeichnete Typillustration. Bildnachweise stehen außerdem unter `public/vehicles/CREDITS.md`.

Im Quellcodeordner zunächst Node.js 22 oder neuer und die Abhängigkeiten aus der Sperrdatei verwenden:

```powershell
npm ci
```

Datei lokal prüfen:

```powershell
node scripts/vehicle-catalog.mjs "PFAD/Fahrzeugkatalog.xlsx"
```

Änderungen mit dem laufenden Server vergleichen. `SCHLUESSEL.txt` bezeichnet die separat mitgelieferte Schlüsseldatei. Das Werkzeug liest sie direkt, ohne den Inhalt auszugeben:

```powershell
node scripts/vehicle-catalog.mjs "PFAD/Fahrzeugkatalog.xlsx" --server https://weltverbund.serphil.chatgpt.site --token-file "PFAD/Weltverbund-Katalog-Schluessel.txt"
```

Der Vergleich zeigt die Serverrevision sowie hinzugefügte, geänderte und archivierte IDs. Erst `--push` veröffentlicht. `N` durch die zuvor angezeigte Serverrevision ersetzen:

```powershell
node scripts/vehicle-catalog.mjs "PFAD/Fahrzeugkatalog.xlsx" --server https://weltverbund.serphil.chatgpt.site --token-file "PFAD/Weltverbund-Katalog-Schluessel.txt" --push --expected-revision N
```

Die Schlüsseldatei gehört nur auf den Verwaltungsrechner. Sie ist kein Benutzerpasswort und gehört weder ins Git-Repository noch in Excel oder in die Spieloberfläche. Alternativ liest das Werkzeug `CATALOG_PUSH_TOKEN` aus seiner Prozessumgebung. HTTPS ist Pflicht, ausgenommen lokale Tests über `localhost` oder `127.0.0.1`. HTTP-Weiterleitungen werden abgelehnt.

## Änderungen und bestehende Fahrzeuge

- Eine Modell-ID darf ihre Verkehrsart nicht wechseln. Für eine andere Baureihe eine neue ID anlegen.
- `available = FALSE` nimmt ein Modell aus dem Verkauf. Bereits gekaufte Fahrzeuge behalten ihr Modell und ihren bezahlten Kaufpreis. Weggelassene bekannte IDs werden mit ihrem letzten Datensatz archiviert.
- Zahlen als Zahlen eingeben. Die Prüfung lehnt ungültige Typen, doppelte IDs, unzulässige Werte und unsichere Bild-/Quelladressen ab. Jede Verkehrsart braucht mindestens ein kaufbares Modell.
- Der gesamte bearbeitete Katalog wird veröffentlicht. Deshalb vor dem Push immer den Vergleich lesen. Eine zwischenzeitliche Änderung wird mit HTTP 409 abgelehnt.
- Katalogversionen werden in D1 gespeichert. Laufende Welten übernehmen sie mit der nächsten Serveraktualisierung. Die Abrechnung trennt die Zeiträume an den Veröffentlichungszeitpunkten. Neue Werte werden nicht rückwirkend auf frühere Zeiträume angewendet. Ein erneuter identischer Push erzeugt keine neue Revision.
- `image` akzeptiert bestehende `/vehicles/`-Dateien oder HTTPS-Bildadressen. Neue lokale Bilddateien müssen zusätzlich mit dem Spiel veröffentlicht werden. Der Excel-Push lädt keine Bilddateien hoch. Fotograf, Originallink und Lizenz immer mitführen.

Der Ausgangskatalog liegt zusätzlich in `data/vehicle-catalog.json`. Ein bereits veröffentlichter Laufzeitkatalog hat Vorrang vor späteren Änderungen dieser Ausgangsdatei. Änderungen für den Livebetrieb deshalb über den geschützten Push vornehmen.

## Backend-Schnittstelle

`GET /api/internal/vehicle-catalog` liefert die aktuelle Revision und Modelle. `PUT` erwartet `{ "baseRevision": N, "models": [...] }`. Beide benötigen `Authorization: Bearer <Backend-Schlüssel>`. Normale Benutzer- und Admin-Sitzungen reichen nicht. Das XLSX wird auf dem Verwaltungsrechner eingelesen; der Spielserver erhält ausschließlich geprüfte JSON-Daten.


## Zugkomponenten ab Version 27

Der Katalog enthält 22 Modelle, davon 13 Zugmodelle oder Komponenten. `traction` ist eine zusätzliche optionale Excel-Spalte: `electric`, `diesel`, `dual` oder `none`. Ältere Dateien ohne diese Spalte bleiben lesbar; bei unbekanntem Antrieb gilt `diesel`, bis der Betreiber den Wert ergänzt. Vorhandene Traktionsangaben daher bei Exporten mitführen. `trainRole` unterscheidet `unit`, `locomotive` und `coach`. Alle drei sind in einem Verband kombinierbar, solange Antrieb und Fahrgastplätze vorhanden sind. Länge, Grundkosten und Kilometerkosten addieren sich. Die niedrigste Höchstgeschwindigkeit bestimmt den Verband.

Neue Bausteine: ÖBB 2016 Hercules, ÖBB 1144, Desiro 5022, Desiro ML 4744 Cityjet, Talent 4024 und Doppelstock-Steuerwagen. Echte Fotos ersetzen die bisherigen vier Bausteinzeichnungen. Bildnachweise stehen in den Katalogzeilen, auf den Fahrzeugkarten und in `public/vehicles/credits.json`. Preise, Kosten und Beschleunigungswerte bleiben als Spielannahmen gekennzeichnet. Hersteller-/Betreiberquellen belegen technische Referenzen.


## Verbrauch ab Version 28

Zwei neue Spalten: `energyType` (`diesel`, `kerosene`, `electricity`, `none`) und `consumptionPerKm` (0–1.000). Verbrauch in Litern je Kilometer, bei Strom in kWh/km. Diese Werte sind Spielannahmen und werden als solche in den Notizen ausgewiesen. Personenwagen müssen `none`, Verbrauch 0 und `costPerKm` 0 verwenden; sie behalten ihre Tageswartung. Katalogprüfung und Server lehnen widersprüchliche Wagenwerte ab. Ein gemischter Verband summiert die Mengen je Energietyp getrennt, nicht Liter und kWh miteinander.

Energiepreise werden in den Welteinstellungen in €/L bzw. €/kWh geführt. Bei Betriebskosten kommen Tageswartung, Kilometerwartung und Verbrauch × aktueller Tagespreis zusammen. Tageswechsel und Katalogveröffentlichungen grenzen Abrechnungsintervalle ab. Fotos und bestehende Kaufpreise bleiben erhalten.


## Weltweiter Import ab Version 30

Die geprüfte Datei `Fahrzeugkatalog_Weltweit_1084_geprueft.xlsx` ist die vollständige neue Arbeitsdatei mit 1.084 Modellen. Kleine alte Vorlagen enthalten diese Ergänzungen nicht; ein vollständiger Push einer alten Vorlage würde fehlende IDs wie bisher archivieren. Vor jedem späteren Push den Vergleich und die aktuelle Revision prüfen.

Die 22 bisherigen Modelle bleiben unverändert. 1.062 neue Einträge enthalten überwiegend als solche markierte Spielannahmen. Ergänzte Längen unterscheiden bestätigte Einzelangaben von 760 typbasierten Schätzungen. Die ursprüngliche Download-Datei bleibt erhalten. Der reproduzierbare JSON-Importstand liegt unter `data/catalog-import-1084.json`; die Excel-Datei bleibt der vorgesehene Bearbeitungsweg.

Der Server akzeptiert 4–2.048 Zeilen, bis 3.072 einschließlich archivierter Modelle, und maximal 1,8 MB gespeicherte JSON-Daten innerhalb einer auf 2 MB begrenzten Anfrage. Das neue Paket liegt bei etwa 1,34 MB. Supersonische Flugzeuge erlauben bis 2.500 km/h; andere Prüfungen bleiben erhalten.

Ein fehlendes Foto wird als beschriftete generische Typillustration gezeigt. Die Ergänzung enthält sechs lizenzierte Fotos und 1.056 neue CC0-Illustrationsverweise; Lizenz-/Urheberfelder und Variantenhinweise sind ausgefüllt. Keine fremde Aufnahme wird als ein anderes exaktes Modell ausgegeben. Bilddateien müssen vor dem Daten-Push mit der Website veröffentlicht werden. Die Fahrzeuggalerie bleibt auf 24 Karten je Seite begrenzt.
