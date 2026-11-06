#!/usr/bin/env bash
# Spielstand (game.sql aus der Komplett-ZIP) in die Server-Datenbank importieren.
#
#   sudo bash deploy/import-savegame.sh /root/savegame          # Ordner mit game.sql + resume-clock.sql
#   sudo bash deploy/import-savegame.sh --empty                 # leere neue Datenbank (ohne Spielstand)
#
# Eine bereits vorhandene Datenbank wird NICHT überschrieben, sondern vorher
# nach STATE_DIR.vorher-<datum> verschoben.
set -euo pipefail
[[ $EUID -eq 0 ]] || { echo "Bitte mit sudo ausführen." >&2; exit 1; }
APP=/opt/logistik/app
set -a; . /etc/logistik/logistik.env; set +a
STATE_DIR="${STATE_DIR:-/var/lib/logistik/state}"

SRC="${1:-}"
[[ -n "$SRC" ]] || { echo "Ordner mit game.sql angeben (oder --empty)." >&2; exit 1; }
if [[ "$SRC" != "--empty" ]]; then
  SRC="$(realpath "$SRC")"
  [[ -f "$SRC/game.sql" ]] || { echo "$SRC/game.sql nicht gefunden." >&2; exit 1; }
fi
[[ -f "$APP/dist/server/wrangler.json" ]] || { echo "Erst bauen: sudo bash $APP/deploy/update.sh --no-pull" >&2; exit 1; }

d1() { # führt eine SQL-Datei in der lokalen D1-Datenbank aus
  runuser -u logistik -- env HOME=/opt/logistik WRANGLER_SEND_METRICS=false bash -c \
    "cd '$APP' && node --import ./scripts/sites-env.mjs ./node_modules/wrangler/bin/wrangler.js d1 execute DB --local --config dist/server/wrangler.json --persist-to '$STATE_DIR' --file '$1'"
}

systemctl stop logistik-tick.timer 2>/dev/null || true
systemctl stop logistik 2>/dev/null || true

if [[ -d "$STATE_DIR" ]] && [[ -n "$(ls -A "$STATE_DIR" 2>/dev/null)" ]]; then
  old="$STATE_DIR.vorher-$(date +%Y-%m-%d_%H%M%S)"
  echo "Vorhandene Datenbank wird nach $old verschoben."
  mv "$STATE_DIR" "$old"
fi
mkdir -p "$STATE_DIR"
chown -R logistik:logistik "$STATE_DIR"

tmp="$(mktemp -d)"; chmod 755 "$tmp"; trap 'rm -rf "$tmp"' EXIT
if [[ "$SRC" == "--empty" ]]; then
  echo "Lege leere Datenbank aus den Migrationen an …"
  for f in $(ls "$APP"/drizzle/*.sql | sort); do
    cp "$f" "$tmp/m.sql"; chmod 644 "$tmp/m.sql"; echo "  $(basename "$f")"; d1 "$tmp/m.sql"
  done
else
  echo "Importiere Spielstand (63 MB, das dauert einige Minuten) …"
  cp "$SRC/game.sql" "$tmp/game.sql"; chmod 644 "$tmp/game.sql"
  d1 "$tmp/game.sql"
  # Echtzeit-Anker auf jetzt setzen: die Welten werden NICHT um die Offline-Zeit vorgespult.
  if [[ -f "$SRC/resume-clock.sql" ]]; then cp "$SRC/resume-clock.sql" "$tmp/resume.sql"; else
    echo "UPDATE logistics_worlds SET last_tick=CAST((julianday('now')-2440587.5)*86400000 AS INTEGER);" > "$tmp/resume.sql"; fi
  chmod 644 "$tmp/resume.sql"; d1 "$tmp/resume.sql"
fi
chown -R logistik:logistik "$STATE_DIR"

systemctl start logistik
systemctl start logistik-tick.timer 2>/dev/null || true
echo "Fertig. Spielstand importiert, Server läuft wieder."
