# Spiel aus der vollständigen ZIP wiederherstellen

Die ZIP enthält Quellcode, alle enthaltenen Fahrzeug-/Produktbilder, den fertig gebauten Worker samt Webdateien und eine vollständige private Datenbanksicherung. Welten, Zeitfaktoren, Speditionen, Kontostände, Lager/Containerchargen, Verträge, Linien, Fahrzeuge einschließlich Statistiken, gebaute Anlagen/Gleise, Aufträge, Gebrauchtangebote, Adminregeln und der gesamte gespeicherte Betriebs-/Kartenimport sind enthalten. Auch die Daten des mitgeführten Vorgängerspiels sind enthalten.

Dieses Spiel benötigt einen Server mit Cloudflare Workers und D1 (oder eine technische Anpassung an einen anderen Server). Ein reiner HTML-/PHP-Webspace genügt nicht. Externe Kartengrundlagen und Straßenrouter benötigen weiterhin Internetzugriff; bereits gespeicherte Betriebs- und Routendaten sind im Backup enthalten.

Die Sicherung enthält Benutzerkonten einschließlich Passwort-Hashes. Bewahre sie privat auf. Aktive Login-Sitzungen, kurzlebige Sperren, Hoster-Zugangsschlüssel und Umgebungsgeheimnisse werden nicht kopiert. Bestehende Benutzer melden sich nach der Wiederherstellung mit ihrem bisherigen Passwort neu an. Das Besitzerkonto und seine Rechte bleiben erhalten.

## Lokal starten und den gesicherten Stand prüfen

Voraussetzung: Node.js ab 22.13, npm und Python 3.

1. ZIP entpacken und in `game` wechseln.
2. `npm ci`
3. Falls du Änderungen am Quellcode machst: `npm run build`. Der fertige Build ist bereits in `dist` enthalten.
4. In eine neue lokale D1-Datenbank importieren:

   `npx wrangler d1 execute DB --local --config dist/server/wrangler.json --persist-to .wrangler/state --file ../data/game.sql`

5. Direkt vor dem Start den Echtzeit-Anker neu setzen. Spieltag und Spielstände werden dabei nicht vorgespult:

   `npx wrangler d1 execute DB --local --config dist/server/wrangler.json --persist-to .wrangler/state --file ../data/resume-clock.sql`

6. `npm run start -- --port 8787`
7. `http://127.0.0.1:8787` öffnen und mit dem vorhandenen Konto anmelden.

## Auf einem eigenen Cloudflare-Account veröffentlichen

1. In `game`: `npm ci`, danach `npx wrangler login`.
2. Eine **neue, leere** D1-Datenbank anlegen: `npx wrangler d1 create weltverbund-logistik`.
3. Die von Cloudflare ausgegebene Datenbank-ID einsetzen:

   `node scripts/prepare-standalone.mjs --database-id DEINE-DATENBANK-ID --name weltverbund-logistik --database-name weltverbund-logistik`

4. SQL-Sicherung in diese leere Datenbank importieren:

   `npx wrangler d1 execute DB --remote --config wrangler.restore.json --file ../data/game.sql`

5. Unmittelbar vor dem Start den Echtzeit-Anker setzen:

   `npx wrangler d1 execute DB --remote --config wrangler.restore.json --file ../data/resume-clock.sql`

6. Veröffentlichen: `npx wrangler deploy --config wrangler.restore.json`.
7. Die ausgegebene Adresse öffnen und mit dem bisherigen Besitzerkonto anmelden. Stündliche Hintergrundabrechnung ist konfiguriert. Für einen späteren Sites-Import muss der neue Hoster eine eigene Site-ID und D1-Bindung vergeben; die alte `.openai/hosting.json` dokumentiert die Herkunft.

## Dateien und Prüfungen

- `data/game.sqlite`: wiederhergestellte SQLite-Datenbank.
- `data/game.sql`: vollständiger SQL-Dump für D1/SQLite. Tabellen werden vor den Daten angelegt, abhängige Datensätze nach ihren Eltern geladen und große Spielstandtexte in begrenzten Schritten zusammengesetzt.
- `data/resume-clock.sql`: setzt nur den Echtzeit-Anker auf den Importzeitpunkt.
- `data/game.manifest.json`: Sicherungszeit und genaue Zeilenzahlen je Tabelle; Integritäts- und Fremdschlüsselprüfung.
- `data/live-backup.jsonl.gz`: unveränderte private Server-Sicherung.
- `DELIVERY.json`: Quellcode-Commit, Versionsnummer und Sicherungszeit.
- `SHA256SUMS.txt`: Prüfsummen aller ZIP-Inhalte.

`python game/scripts/restore-full-game.py data/live-backup.jsonl.gz NEUE-DATENBANK.sqlite` rekonstruiert bei Bedarf eine weitere neue SQLite-Datei. Vorhandene Datenbanken werden nicht überschrieben.

Im laufenden Spiel kann der Besitzer unter Administration erneut **Alle aktuellen Spieldaten herunterladen** wählen. Bei jeder Veröffentlichung erhältst du zusätzlich die komplette ZIP mit dem dann aktuellen Stand. Eine bereits gespeicherte ZIP aktualisiert sich nicht nachträglich.

Technische Grundlage für den Import: https://developers.cloudflare.com/d1/best-practices/import-export-data/ und https://developers.cloudflare.com/d1/platform/limits/ .
