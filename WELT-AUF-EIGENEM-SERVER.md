# Eine Welt auf einem eigenen Server (VPS) betreiben

Jede Welt kann technisch auf einem eigenen Server laufen. Der Hauptserver bleibt die Lobby; die Welt wird dort nur noch verlinkt.

## 1. Neuen Server einrichten
Wie den Hauptserver installieren (gleiche Zip-Datei, `deploy/install.sh`) und eine eigene Domain eintragen, z. B. `welt2.crackgaming.org`.
Damit dort Betriebe auf der Karte sind: Geofabrik-Import für die Länder dieser Welt laufen lassen
(`sudo bash /opt/logistik/app/deploy/import-osm-extracts.sh germany austria --hintergrund` oder `welt`).

## 2. Welt umziehen
Auf dem **Hauptserver**:
```
sudo bash /opt/logistik/app/deploy/world-export.sh <welt-id>
scp /root/welt-<welt-id>.sql.gz root@<neuer-server>:/root/
```
Die Welt-ID steht in der Verwaltung unter „Welten“.

Auf dem **neuen Server**:
```
sudo bash /opt/logistik/app/deploy/world-import.sh /root/welt-<welt-id>.sql.gz
```
Mitgenommen werden: Welt, Speditionen, Fahrzeuge, Allianzen, Aufträge, Nachrichten, Erfolge und die Konten der Spieler dieser Welt (gleiche Zugangsdaten).

## 3. Festlegen, welcher Server welche Welt simuliert
In `/etc/logistik/logistik.env`:
- **Neuer Server:** `LOGISTIK_WORLDS=<welt-id>` – dieser Server simuliert nur diese Welt(en) (kommagetrennt).
- **Hauptserver:** `LOGISTIK_WORLDS=<id-1>,<id-2>` – alle Welten, die *dort* bleiben (die umgezogene Welt nicht mehr eintragen).
Danach `sudo systemctl restart logistik`.

Ohne `LOGISTIK_WORLDS` simuliert ein Server wie bisher alle Welten.

## 4. Lobby verlinken
Auf dem Hauptserver in der Verwaltung bei der Welt „Server dieser Welt“ eintragen, z. B. `https://welt2.crackgaming.org`.
In der Lobby steht dann „Auf eigenem Server spielen ↗“. Ein Server lehnt Anfragen zu Welten ab, die er laut `LOGISTIK_WORLDS` nicht betreibt – so kann eine Welt nie doppelt laufen.
