# Lokale Komplettsicherung

Das private ZIP enthält `source/` (vollständiger veröffentlichter Quellcode einschließlich Bilder, Katalogdaten und Lizenzangaben) und `data/` (exportierte Backendtabellen, entpackte Spielstände/Karten/Kataloge und lokale SQLite-/SQL-Kopien). Enthalten sind Benutzer-E-Mails und Passwort-Hashes. Dieses ZIP nicht öffentlich hochladen. Aktive Sitzungen und Rate-Limits werden bewusst nicht übertragen; die Tabellendefinitionen bleiben vorhanden.

Die Schlüssel liegen separat im lokalen Ausgabeordner. Weder Backup- noch Katalogschlüssel gehören in Git oder das ZIP. Laufzeitumgebungsvariablen müssen auf einem neuen Server erneut gesetzt werden; ihre Werte sind nicht im Quellcode gespeichert.

## Erneuter Export

Mit Node.js aus `source/`:

```powershell
node scripts/export-backup.mjs --base https://weltverbund.serphil.chatgpt.site --key-file C:/Pfad/Weltverbund-Backup-Schluessel.txt --out C:/Pfad/Neue-Daten
```

Der Server benötigt `BACKUP_READ_HASH`: SHA-256 des separaten Backupschlüssels, als geheime Laufzeitvariable. Zugriff nur über Bearer-Schlüssel; normale Spiel- und Adminsitzungen reichen nicht. Weitere bestehende Variablennamen stehen in `cloudflare-env.d.ts` und den jeweiligen Servermodulen, insbesondere `ADMIN_EMAIL`, `CATALOG_PUSH_HASH`, `SIMULATION_OWNER_EMAIL` und `ADMIN_SETUP_HASH` soweit verwendet. Vor Übernahme die vorhandene Hostingkonfiguration prüfen.

## Bearbeiten und Wiederherstellen

`data/editable-worlds/*.json` enthält lesbare Weltkonfiguration und Spielstand. Zuerst eine Kopie anlegen. IDs und gegenseitige Referenzen müssen erhalten bleiben.

```powershell
python scripts/restore-backup.py C:/Pfad/data C:/Pfad/neu.sqlite --editable-worlds
```

Ohne `--editable-worlds` werden die exakten Raw-Tabellen wiederhergestellt. Das Ziel muss neu sein; vorhandene Datenbanken werden nicht überschrieben. Das Werkzeug erzeugt SQLite und einen SQL-Dump und prüft die Datenbankintegrität. Karten und Kataloge werden aus den Raw-Tabellen wiederhergestellt; Änderungen an ihren lesbaren Kopien werden nicht automatisch importiert. Kataloge über den vorhandenen Backend-Import veröffentlichen.

Der Export liest Tabellen seitenweise ohne Live-Pause. Jede gespeicherte Welt ist intern konsistent; über mehrere Tabellen gibt es bei weiterlaufendem Betrieb keinen gemeinsamen globalen Snapshotzeitpunkt. Metadaten und Schema stehen in `manifest.json`. Für einen Umzug erst lokal prüfen, dann den SQL-Dump in eine neue passende Datenbank importieren; es gibt absichtlich keinen öffentlichen Wiederherstellungs-Endpunkt.

## Projekt fortsetzen

Node.js und Python installieren, `npm ci`, dann die Befehle aus `package.json` verwenden. `scripts/run-framework.mjs dev` startet die lokale Vorschau. Den aktuellen `README.md` und `SIMULATION.md` zur Server-Simulation lesen. Für echtes Hosting Datenbankbindung und geheime Umgebungsvariablen konfigurieren; die vorhandene `.openai/hosting.json` gehört zur bisherigen Sites-Instanz und darf nicht unbesehen auf ein anderes Projekt zeigen.
