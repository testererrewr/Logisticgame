#!/usr/bin/env bash
# Eine mit world-export.sh exportierte Welt auf diesem Server einspielen.
#   sudo bash /opt/logistik/app/deploy/world-import.sh /root/welt-<welt-id>.sql.gz
set -euo pipefail
[[ $EUID -eq 0 ]] || { echo "Bitte mit sudo ausführen." >&2; exit 1; }
[[ -f /etc/logistik/logistik.env ]] && { set -a; . /etc/logistik/logistik.env; set +a; }
STATE_DIR="${STATE_DIR:-/var/lib/logistik/state}"
F="${1:-}";[[ -f "$F" ]] || { echo "Exportdatei angeben." >&2; exit 1; }
DB="$(find "$STATE_DIR" -name '*.sqlite' ! -name 'metadata.sqlite' | head -1)";[[ -n "$DB" ]] || { echo "Datenbank nicht gefunden – zuerst das Spiel installieren und einmal starten." >&2; exit 1; }
DB_USER="$(stat -c %U "$DB")"
echo "Spiel kurz anhalten …"; systemctl stop logistik-tick.timer logistik 2>/dev/null || true
bash "$(dirname "$(realpath "$0")")/backup.sh" || echo "(Sicherung übersprungen)"
if [[ "$F" == *.gz ]]; then zcat "$F"; else cat "$F"; fi | runuser -u "$DB_USER" -- sqlite3 -bail -cmd ".timeout 60000" "$DB"
echo "Welt eingespielt. Spiel startet wieder …"; systemctl start logistik logistik-tick.timer
echo "Fertig. Spieler melden sich auf diesem Server mit ihren bisherigen Zugangsdaten an."
