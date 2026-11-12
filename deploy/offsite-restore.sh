#!/usr/bin/env bash
# Stellt eine Sicherung vom zweiten Server wieder her – komplett oder nur einzelne Welten.
#   sudo bash offsite-restore.sh                     → zeigt verfügbare Sicherungen
#   sudo bash offsite-restore.sh alles [DATEI]       → alle Welten und Konten (Betriebsregister bleibt)
#   sudo bash offsite-restore.sh welt <WELT-ID> [DATEI] → nur diese Welt
set -euo pipefail
[[ $EUID -eq 0 ]] || { echo "Bitte mit sudo ausführen." >&2; exit 1; }
EF=/etc/logistik/logistik.env; [[ -f "$EF" ]] && { set -a; . "$EF"; set +a; }
: "${BACKUP_REMOTE:?BACKUP_REMOTE fehlt}"; HOST="${BACKUP_REMOTE%%:*}"; DIR="${BACKUP_REMOTE#*:}"; KEY=/root/.ssh/logistik_backup; SSH=(ssh -i "$KEY" -o BatchMode=yes)
STATE_DIR="${STATE_DIR:-/var/lib/logistik/state}"; APP=/opt/logistik/app
MODE="${1:-liste}"
list(){ "${SSH[@]}" "$HOST" "cd '$DIR' && ls -1t logistik-*.sqlite.gz"; }
if [[ "$MODE" == "liste" ]]; then echo "Sicherungen auf $BACKUP_REMOTE (neueste zuerst):"; list | nl; echo; echo "Wiederherstellen: $0 alles [DATEI]  oder  $0 welt <WELT-ID> [DATEI]"; exit 0; fi
if [[ "$MODE" == "welt" ]]; then W="${2:?Welt-ID angeben}"; FILE="${3:-}"; else FILE="${2:-}"; fi
[[ -n "$FILE" ]] || FILE="$(list | head -1)"; [[ -n "$FILE" ]] || { echo "Keine Sicherung gefunden." >&2; exit 1; }
DB="$(find "$STATE_DIR" -name '*.sqlite' ! -name 'metadata.sqlite' | head -1)"; DB_USER="$(stat -c %U "$DB")"
TMP="$(mktemp -d /var/tmp/logistik-restore.XXXX)"; trap 'rm -rf "$TMP"' EXIT
echo "==> Lade $FILE"; scp -i "$KEY" -o BatchMode=yes -q "$HOST:$DIR/$FILE" "$TMP/"; gunzip "$TMP/$FILE"; BAK="$TMP/${FILE%.gz}"
q(){ runuser -u "$DB_USER" -- sqlite3 -bail -cmd ".timeout 120000" "$DB" "$@"; }
echo "==> Spiel anhalten und aktuellen Stand lokal sichern"; systemctl stop logistik-tick.timer logistik logistik-test 2>/dev/null || true
cp "$DB" "$DB.vor-restore.$(date +%Y%m%d%H%M%S)"
chown "$DB_USER" "$BAK"
if [[ "$MODE" == "alles" ]]; then
  tabs=$(sqlite3 "$BAK" "SELECT name FROM sqlite_master WHERE type='table' AND name NOT LIKE 'sqlite_%' AND name NOT IN ('logistics_partner_registry','logistics_partner_grid','_cf_KV','d1_migrations')")
  { echo "ATTACH '$BAK' AS bak; BEGIN;"; for t in $tabs; do echo "DELETE FROM main.\"$t\"; INSERT INTO main.\"$t\" SELECT * FROM bak.\"$t\";"; done; echo "COMMIT;"; } | q
else
  [[ "$W" =~ ^[-a-zA-Z0-9_]{6,100}$ ]] || { echo "Ungültige Welt-ID." >&2; exit 1; }
  mkdir -p "$TMP/state"; ln -s "$BAK" "$TMP/state/backup.sqlite"
  STATE_DIR="$TMP/state" bash "$APP/deploy/world-export.sh" "$W" >/dev/null
  tabs=$(q "SELECT m.name FROM sqlite_master m WHERE m.type='table' AND EXISTS(SELECT 1 FROM pragma_table_info(m.name) c WHERE c.name='world_id')")
  { echo "BEGIN;"; for t in $tabs; do echo "DELETE FROM \"$t\" WHERE world_id='$W';"; done; echo "DELETE FROM logistics_company_chunks WHERE owner LIKE '$W|%';"; echo "COMMIT;"; } | q 2>/dev/null || true
  zcat "/root/welt-$W.sql.gz" | q; rm -f "/root/welt-$W.sql.gz"
fi
echo "==> Spiel startet wieder"; systemctl start logistik logistik-tick.timer; systemctl start logistik-test 2>/dev/null || true
echo "Fertig: $MODE aus $FILE wiederhergestellt. Vorheriger Stand liegt als $DB.vor-restore.* daneben."
