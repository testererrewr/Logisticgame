#!/usr/bin/env bash
# Führt Aufträge aus der Verwaltung aus (Sicherung, Pflege, Wiederherstellung). Läuft jede Minute als root.
set -uo pipefail
EF=/etc/logistik/logistik.env; [[ -f "$EF" ]] && { set -a; . "$EF"; set +a; }
STATE_DIR="${STATE_DIR:-/var/lib/logistik/state}"; APP=/opt/logistik/app
DB="$(find "$STATE_DIR" -name '*.sqlite' ! -name 'metadata.sqlite' 2>/dev/null | head -1)"; [[ -n "$DB" ]] || exit 0
DB_USER="$(stat -c %U "$DB")"; q(){ runuser -u "$DB_USER" -- sqlite3 -cmd ".timeout 30000" "$DB" "$@"; }
[[ -n "$(q "SELECT name FROM sqlite_master WHERE name='logistics_runtime'")" ]] || exit 0
put(){ local text; text="$(printf '%s' "$2" | tail -c 6000 | sed "s/'/''/g")"; q "INSERT OR REPLACE INTO logistics_runtime(id,updated,payload) VALUES('$1',$(date +%s)000,json_object('text','$text','ok',$3))"; }
if [[ -n "${BACKUP_REMOTE:-}" && -f /root/.ssh/logistik_backup ]]; then HOST="${BACKUP_REMOTE%%:*}"; DIR="${BACKUP_REMOTE#*:}"
  last="$(q "SELECT updated FROM logistics_runtime WHERE id='ops-backups'")"; if [[ -z "$last" || $(( $(date +%s)000 - last )) -gt 900000 ]]; then
   list="$(ssh -i /root/.ssh/logistik_backup -o BatchMode=yes -o ConnectTimeout=10 "$HOST" "cd '$DIR' && ls -1t --full-time logistik-*.sqlite.gz 2>/dev/null | awk '{print \$NF\"|\"\$5\"|\"\$6\" \"substr(\$7,1,5)}'" 2>&1)"; put ops-backups "$list" true; fi
else put ops-backups "" false; fi
req="$(q "SELECT payload FROM logistics_runtime WHERE id='ops-request'")"; [[ -n "$req" ]] || exit 0
action="$(q "SELECT json_extract(payload,'$.action') FROM logistics_runtime WHERE id='ops-request'")"; arg="$(q "SELECT COALESCE(json_extract(payload,'$.world'),'') FROM logistics_runtime WHERE id='ops-request'")"; file="$(q "SELECT COALESCE(json_extract(payload,'$.file'),'') FROM logistics_runtime WHERE id='ops-request'")"
q "DELETE FROM logistics_runtime WHERE id='ops-request'"
[[ "$arg" =~ ^[-a-zA-Z0-9_]{0,100}$ && "$file" =~ ^[-a-zA-Z0-9_.]{0,100}$ ]] || { put ops-status "Ungültige Anfrage." false; exit 0; }
put ops-status "läuft: $action …" true
case "$action" in
 backup) out="$(bash "$APP/deploy/offsite-backup.sh" 2>&1)"; rc=$?; q "DELETE FROM logistics_runtime WHERE id='ops-backups'";;
 maintenance) out="$(bash "$APP/deploy/db-maintenance.sh" 2>&1)"; rc=$?;;
 restore-world) out="$(bash "$APP/deploy/offsite-restore.sh" welt "$arg" $file 2>&1)"; rc=$?;;
 restore-all) out="$(bash "$APP/deploy/offsite-restore.sh" alles $file 2>&1)"; rc=$?;;
 *) out="Unbekannte Aktion $action"; rc=1;;
esac
put ops-status "$action $( [[ $rc -eq 0 ]] && echo erfolgreich || echo fehlgeschlagen ) · $(date '+%d.%m. %H:%M')
$out" $( [[ $rc -eq 0 ]] && echo true || echo false )
