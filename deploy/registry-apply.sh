#!/usr/bin/env bash
# Spielt ein Betriebsregister-Paket (von einem externen Importserver) schonend in die Spieldatenbank ein.
set -uo pipefail
[[ $EUID -eq 0 ]] || { echo "Bitte mit sudo ausführen." >&2; exit 1; }
FILE="${1:?Paketdatei angeben, z. B. /root/register-paket-20261112-1200.sql.gz}"
[[ -f /etc/logistik/logistik.env ]] && { set -a; . /etc/logistik/logistik.env; set +a; }
STATE_DIR="${STATE_DIR:-/var/lib/logistik/state}"; APP="${APP:-/opt/logistik/app}"; CHUNK="${CHUNK:-4000}"; PAUSE="${PAUSE:-0.4}"
DB="$(find "$STATE_DIR" -name '*.sqlite' ! -name 'metadata.sqlite' | head -1)"; [[ -n "$DB" ]] || { echo "Datenbank nicht gefunden." >&2; exit 1; }
DB_USER="$(stat -c %U "$DB")"; sql(){ runuser -u "$DB_USER" -- sqlite3 -bail -cmd ".timeout 60000" "$DB" "$@"; }
TMP="$(mktemp -d)"; trap 'rm -rf "$TMP"' EXIT
echo "==> Entpacke $FILE"; zcat -f "$FILE" | grep '^INSERT' | split -l "$CHUNK" - "$TMP/teil-"
total=$(ls "$TMP" | wc -l); i=0; t0=$(date +%s)
for f in "$TMP"/teil-*; do i=$((i+1)); { echo 'BEGIN;'; cat "$f"; echo 'COMMIT;'; } | sql || { echo "!! Fehler in Teil $i – Abbruch. Erneut starten ist gefahrlos." >&2; exit 1; }; rm -f "$f"
  (( i % 25 == 0 || i == total )) && echo "   $i/$total Teile · $(( $(date +%s)-t0 )) s"; sleep "$PAUSE"; done
echo "==> Kartenübersicht neu berechnen"; bash "$APP/deploy/partner-maintenance.sh" raster || echo "(Kartenübersicht fehlgeschlagen – später: bash $APP/deploy/partner-maintenance.sh raster)"
echo "Fertig: $(sql 'SELECT COALESCE(max(rowid),0) FROM logistics_partner_registry;') Einträge (höchste Nummer)."
