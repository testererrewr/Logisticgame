#!/usr/bin/env bash
# Nächtliche Datenbank-Pflege. Löscht keine Spielstände: nur alte Protokolle, verwaiste Speicherteile und beidseitig gelöschte Nachrichten.
set -uo pipefail
EF=/etc/logistik/logistik.env; [[ -f "$EF" ]] && { set -a; . "$EF"; set +a; }
STATE_DIR="${STATE_DIR:-/var/lib/logistik/state}"
DB="$(find "$STATE_DIR" -name '*.sqlite' ! -name 'metadata.sqlite' | head -1)"; [[ -n "$DB" ]] || { echo "Datenbank nicht gefunden." >&2; exit 1; }
DB_USER="$(stat -c %U "$DB")"; q(){ runuser -u "$DB_USER" -- sqlite3 -cmd ".timeout 120000" "$DB" "$@"; }
has(){ [[ -n "$(q "SELECT name FROM sqlite_master WHERE type='table' AND name='$1'")" ]]; }
now=$(( $(date +%s)*1000 )); before=$(du -h "$DB" | cut -f1)
echo "==> Prüfung (nur lesend)"; q "PRAGMA quick_check;" | head -3
has logistics_error_log && q "DELETE FROM logistics_error_log WHERE last<$((now-90*86400000));" && echo "   alte Fehlerprotokolle (>90 Tage) entfernt"
has logistics_analytics_daily && q "DELETE FROM logistics_analytics_daily WHERE day<date('now','-400 days'); DELETE FROM logistics_analytics_visitors WHERE day<date('now','-400 days');" && echo "   alte Statistik (>400 Tage) entfernt"
has logistics_messages && q "DELETE FROM logistics_messages WHERE del_from=1 AND del_to=1;" 2>/dev/null && echo "   beidseitig gelöschte Nachrichten entfernt"
if has logistics_company_chunks; then q "DELETE FROM logistics_company_chunks WHERE created<$((now-3600000)) AND id NOT IN (SELECT substr(state,5,instr(substr(state,5),':')-1) FROM logistics_world_companies WHERE state LIKE 'gzc:%');" && echo "   verwaiste Speicherteile entfernt"; fi
echo "==> Statistiken auffrischen und Protokolldatei kürzen"; q "PRAGMA optimize;" ; q "PRAGMA wal_checkpoint(TRUNCATE);" >/dev/null
echo "Fertig. Größe vorher $before, jetzt $(du -h "$DB" | cut -f1)."
