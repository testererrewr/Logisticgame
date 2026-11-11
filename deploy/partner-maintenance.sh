#!/usr/bin/env bash
set -euo pipefail
[[ $EUID -eq 0 ]] || { echo "Bitte mit sudo ausführen." >&2; exit 1; }
EF="${ENV_FILE:-/etc/logistik/logistik.env}"; [[ -f "$EF" ]] && { set -a; . "$EF"; set +a; }
STATE_DIR="${STATE_DIR:-/var/lib/logistik/state}"; APP="${APP:-/opt/logistik/app}"
DB="$(find "$STATE_DIR" -name '*.sqlite' ! -name 'metadata.sqlite' | head -1)"; [[ -n "$DB" ]] || { echo "Datenbank nicht gefunden." >&2; exit 1; }
DB_USER="$(stat -c %U "$DB")"; sql(){ runuser -u "$DB_USER" -- sqlite3 -bail -cmd ".timeout 120000" "$DB" "$@"; }
MODE="${1:-alles}"; t0=$(date +%s)
if [[ "$MODE" != "raster" ]]; then
  echo "==> Index für Kartenabfragen (einmalig einige Minuten)"
  sql "CREATE INDEX IF NOT EXISTS logistics_partner_kind_area ON logistics_partner_registry(kind,lat,lon);"
  echo "==> Betriebsarten neu erkennen (mehrsprachig) – läuft je nach Größe 10–40 Minuten"
  sql ".mode list" ".separator '\t'" "SELECT id,kind,COALESCE(json_extract(payload,'\$.tags'),'{}') FROM logistics_partner_registry;" \
    | (cd "$APP" && node --no-warnings --experimental-strip-types --import ./scripts/ts-resolve.mjs scripts/reclassify-partners.mjs) \
    | runuser -u "$DB_USER" -- sqlite3 -bail "$DB" >/dev/null
fi
echo "==> Kartenübersicht (Raster) neu berechnen"
sql "CREATE TABLE IF NOT EXISTS logistics_partner_grid(level INTEGER NOT NULL,gy INTEGER NOT NULL,gx INTEGER NOT NULL,kind TEXT NOT NULL,n INTEGER NOT NULL,slat REAL NOT NULL,slon REAL NOT NULL,PRIMARY KEY(level,gy,gx,kind));
CREATE TABLE IF NOT EXISTS logistics_partner_grid_new AS SELECT * FROM logistics_partner_grid WHERE 0;
DELETE FROM logistics_partner_grid_new;
INSERT INTO logistics_partner_grid_new SELECT 0,CAST((lat+90)/2 AS INTEGER),CAST((lon+180)/2 AS INTEGER),kind,count(*),sum(lat),sum(lon) FROM logistics_partner_registry GROUP BY 2,3,4;
INSERT INTO logistics_partner_grid_new SELECT 1,CAST((lat+90)/0.5 AS INTEGER),CAST((lon+180)/0.5 AS INTEGER),kind,count(*),sum(lat),sum(lon) FROM logistics_partner_registry GROUP BY 2,3,4;
INSERT INTO logistics_partner_grid_new SELECT 2,CAST((lat+90)/0.1 AS INTEGER),CAST((lon+180)/0.1 AS INTEGER),kind,count(*),sum(lat),sum(lon) FROM logistics_partner_registry GROUP BY 2,3,4;
BEGIN;DELETE FROM logistics_partner_grid;INSERT INTO logistics_partner_grid SELECT * FROM logistics_partner_grid_new;COMMIT;
DROP TABLE logistics_partner_grid_new;
CREATE INDEX IF NOT EXISTS logistics_partner_grid_area ON logistics_partner_grid(level,kind,gy,gx);"
echo "Betriebe je Art:"; sql "SELECT kind, sum(n) FROM logistics_partner_grid WHERE level=0 GROUP BY kind ORDER BY 2 DESC;" | awk -F'|' '{printf "  %-22s %12s\n",$1,$2}' || true
echo "Fertig in $(( ($(date +%s)-t0)/60 )) Minuten."
