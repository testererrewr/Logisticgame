#!/usr/bin/env bash
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

d1_command() { # einen SQL-Befehl über Wrangler in der lokalen D1-Datenbank ausführen
  runuser -u logistik -- env HOME=/opt/logistik WRANGLER_SEND_METRICS=false bash -c \
    "cd '$APP' && node --import ./scripts/sites-env.mjs ./node_modules/wrangler/bin/wrangler.js d1 execute DB --local --config dist/server/wrangler.json --persist-to '$STATE_DIR' --command '$1'"
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

d1_command "CREATE TABLE _init(x); DROP TABLE _init;"
DB="$(find "$STATE_DIR" -name '*.sqlite' ! -name 'metadata.sqlite' | head -1)"
[[ -n "$DB" ]] || { echo "Datenbankdatei wurde nicht angelegt." >&2; exit 1; }
echo "Datenbankdatei: $DB"
if [[ "$SRC" == "--empty" ]]; then
  echo "Lege leere Datenbank aus den Migrationen an …"
  for f in $(ls "$APP"/drizzle/*.sql | sort); do echo "  $(basename "$f")"; sqlite3 -bail "$DB" < "$f"; done
else
  echo "Importiere Spielstand …"
  sqlite3 -bail "$DB" < "$SRC/game.sql"
  sqlite3 "$DB" "UPDATE logistics_worlds SET last_tick=CAST((julianday('now')-2440587.5)*86400000 AS INTEGER);"
  echo "Benutzer: $(sqlite3 "$DB" 'SELECT count(*) FROM users') · Welten: $(sqlite3 "$DB" "SELECT group_concat(name, ', ') FROM logistics_worlds")"
fi
chown -R logistik:logistik "$STATE_DIR"

systemctl start logistik
systemctl start logistik-tick.timer 2>/dev/null || true
echo "Fertig. Spielstand importiert, Server läuft wieder."
