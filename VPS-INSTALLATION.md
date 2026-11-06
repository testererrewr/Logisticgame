# Weltverbund Logistik auf eigenem Linux-VPS (Caddy + GitHub)

Ziel: Das Spiel läuft unter **https://play.crackgaming.org** auf einem eigenen Server.
Der Code kommt von GitHub (`testererrewr/Logisticgame`), der Spielstand wird einmalig importiert.

Technik: Das Spiel ist ein Cloudflare-Worker (vinext + D1). Auf dem VPS läuft es mit derselben
Laufzeit (`workerd` über Wrangler im lokalen Modus), die Datenbank ist eine SQLite-Datei unter
`/var/lib/logistik/state`. Caddy macht HTTPS und leitet auf `127.0.0.1:8787` weiter.
Ein systemd-Timer ersetzt den Cloudflare-Cron (Abrechnung + Weltimport jede Minute).

---

## 1. DNS-Eintrag beim Domain-Anbieter

| Typ | Name / Host | Wert / Ziel | TTL |
|-----|-------------|-------------|-----|
| **A** | `play` | IPv4-Adresse deines VPS, z. B. `203.0.113.10` | 300 oder „Auto“ |
| AAAA *(nur falls der VPS IPv6 hat)* | `play` | IPv6-Adresse des VPS | 300 oder „Auto“ |

- Liegt die Domain bei **Cloudflare**: Proxy-Status auf **„DNS only“ (graue Wolke)** stellen.
  Wer die orange Wolke will: erst wenn das Zertifikat da ist, und dann unter SSL/TLS **„Full (strict)“** wählen.
- Keinen AAAA-Eintrag setzen, wenn der Server kein funktionierendes IPv6 hat – sonst schlägt das Zertifikat fehl.
- Falls CAA-Einträge existieren, muss `letsencrypt.org` erlaubt sein.
- Beim VPS-Anbieter (Firewall/Security-Group) die Ports **80** und **443** (TCP) öffnen, plus 22 für SSH.

Prüfen: `ping play.crackgaming.org` muss die VPS-IP zeigen.

## 2. Code auf GitHub hochladen

Das Repo ist **öffentlich** – deshalb liegt der Spielstand (Benutzerkonten, Passwort-Hashes)
**nicht** im Repo, sondern in der separaten `savegame`-ZIP. Die niemals hochladen.

Der Browser-Upload von GitHub schafft die rund 2800 Dateien nicht (max. 100 pro Upload), also per Git:

```bash
git clone https://github.com/testererrewr/Logisticgame.git
# Inhalt des Ordners "Logisticgame" aus der ZIP hier hineinkopieren (README.md überschreiben)
cd Logisticgame
git add -A
git commit -m "Weltverbund Logistik V23 mit VPS-Deploy"
git push
```

(Alternativ GitHub Desktop: Repo klonen, Dateien hineinkopieren, „Commit“ → „Push“.)

## 3. Server einrichten (einmalig)

Ubuntu 22.04/24.04 oder Debian 12, empfohlen ab 2 GB RAM (das Skript legt bei Bedarf Swap an).

Vom eigenen PC den Spielstand hochladen:

```bash
scp savegame-PRIVAT.zip root@DEINE-VPS-IP:/root/
```

Auf dem Server:

```bash
ssh root@DEINE-VPS-IP
apt-get update && apt-get install -y git unzip
unzip /root/savegame-PRIVAT.zip -d /root        # ergibt /root/savegame mit game.sql + resume-clock.sql
git clone https://github.com/testererrewr/Logisticgame.git /root/Logisticgame
sudo bash /root/Logisticgame/deploy/install.sh --savegame /root/savegame
```

Das Skript installiert Node.js 22, Caddy und sqlite3, legt den Benutzer `logistik` an, klont den
Code nach `/opt/logistik/app`, baut das Spiel, importiert den Spielstand, richtet systemd und Caddy
ein und holt automatisch das HTTPS-Zertifikat. Danach: **https://play.crackgaming.org** öffnen und
mit dem bisherigen Konto anmelden.

Beim Import wird der Echtzeit-Anker neu gesetzt – die Welten werden nicht um die Offline-Zeit vorgespult.

## 4. Updates

Änderungen auf GitHub pushen, dann auf dem Server:

```bash
sudo bash /opt/logistik/app/deploy/update.sh
```

Holt den neuen Stand, baut, sichert die Datenbank und startet neu. Schlägt der Build fehl,
bleibt die alte Version aktiv. Der Spielstand bleibt immer erhalten.

**Automatisch bei jedem Push (optional):** In GitHub unter *Settings → Secrets and variables → Actions*
die Secrets `VPS_HOST`, `VPS_USER` und `VPS_SSH_KEY` anlegen. Dann führt
`.github/workflows/deploy.yml` das Update nach jedem Push auf `main` selbst aus.

## 5. Betrieb

| Aufgabe | Befehl |
|--------|--------|
| Status | `systemctl status logistik` |
| Live-Log | `journalctl -u logistik -f` |
| Neustart | `sudo systemctl restart logistik` |
| Hintergrundtakt prüfen | `systemctl list-timers logistik-tick.timer` · `journalctl -u logistik-tick -n 5` |
| Sicherung jetzt | `sudo bash /opt/logistik/app/deploy/backup.sh` (täglich automatisch, 14 Stück, `/var/backups/logistik`) |
| Spielstand erneut importieren | `sudo bash /opt/logistik/app/deploy/import-savegame.sh /root/savegame` (alte DB wird vorher weggesichert) |
| Leere neue Datenbank | `sudo bash /opt/logistik/app/deploy/import-savegame.sh --empty` |

Konfiguration: `/etc/logistik/logistik.env` (Domain, Port, Scheduler-Secret, Weltimport-Tempo).
Nach Änderungen: `sudo systemctl restart logistik`.

## Wenn schon ein Caddy in Docker läuft (Ports 80/443 belegt)

Dann übernimmt dieser Container HTTPS, und der Spielserver lauscht auf der Docker-Gateway-IP,
damit nur Container ihn erreichen:

```bash
systemctl disable --now caddy                         # System-Caddy nicht nötig
GW=$(docker inspect cg_web_edge --format '{{range .NetworkSettings.Networks}}{{.Gateway}} {{end}}' | awk '{print $1}')
grep -q '^BIND_IP=' /etc/logistik/logistik.env && sed -i "s/^BIND_IP=.*/BIND_IP=$GW/" /etc/logistik/logistik.env || echo "BIND_IP=$GW" >> /etc/logistik/logistik.env
systemctl restart logistik
```

Im Caddyfile des Containers ergänzen und `docker exec cg_web_edge caddy reload --config /etc/caddy/Caddyfile`:

```
play.crackgaming.org {
	encode zstd gzip
	reverse_proxy GATEWAY-IP:8787
}
```

## Fehlersuche

- **Zertifikat kommt nicht:** `journalctl -u caddy -n 50`. Meist zeigt der DNS-Eintrag noch nicht auf den
  Server, Port 80/443 ist zu, oder Cloudflare-Proxy ist aktiv.
- **Seite zeigt 502:** Spielserver läuft nicht → `journalctl -u logistik -n 100`.
- **Build bricht ab (Speicher):** `free -h` prüfen; das Install-Skript legt bei < 3,5 GB RAM 4 GB Swap an.

## Änderungen in dieser Version (06.11.2026)

- **Flugzeug von Linie entfernt → neu zuweisen ging nicht:** Ein Flugzeug ohne Linie musste bisher erst sein
  laufendes (teils stundenlanges) Teilstück beenden und danach noch zum Hangar zurückfliegen, bevor eine neue
  Zuweisung wirksam wurde; in der Liste stand dabei weiter „Linie entfernt“. Jetzt dreht ein Flugzeug, das ohne
  Linie unterwegs ist, bei einer neuen Zuweisung sofort in der Luft um und fliegt direkt zum nächstgelegenen Stopp
  der neuen Linie. Andere Fahrzeuge zeigen „Linienwechsel nach Ankunft eingeplant“; der veraltete Status wird gelöscht.
- **Weltimport blieb hängen:** Jede Zeitüberschreitung *und jeder* Verbindungsfehler teilte ein 1°-Gebiet in vier
  Teile (bis 4096 Teilgebiete). Die Warteschlange lief voll (421 Teilgebiete nur rund um Graz) und es wurden nie
  neue Weltgebiete begonnen. Jetzt teilen nur echte Überlastungen/Zeitüberschreitungen, Verbindungsfehler werden
  später wiederholt, Overpass bekommt 25 s statt 7 s, und der Server-Timer arbeitet jede Minute mehrere Schritte ab –
  auch ohne geöffnete Seite.
- **VPS-Betrieb:** Herkunftsprüfung funktioniert hinter Caddy/HTTPS, OSM-Kennung zeigt auf play.crackgaming.org,
  Deploy-Skripte, systemd-Dienste, Caddyfile, tägliche Sicherung und optionales GitHub-Auto-Deploy.
