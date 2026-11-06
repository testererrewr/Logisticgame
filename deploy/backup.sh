#!/usr/bin/env bash
# Konsistente Sicherung der Spieldatenbank (SQLite unter STATE_DIR).
# Aufruf: sudo bash deploy/backup.sh   (läuft zusätzlich täglich per Timer)
set -euo pipefail
if [[ -f /etc/logistik/logistik.env ]]; then set -a; . /etc/logistik/logistik.env; set +a; fi
STATE_DIR="${STATE_DIR:-/var/lib/logistik/state}"
BACKUP_DIR="${BACKUP_DIR:-/var/backups/logistik}"
KEEP="${BACKUP_KEEP:-14}"

stamp="$(date +%Y-%m-%d_%H%M%S)"
target="$BACKUP_DIR/$stamp"
mkdir -p "$target"
chmod 700 "$BACKUP_DIR"

found=0
while IFS= read -r -d '' db; do
  name="$(basename "$db")"
  sqlite3 "$db" ".backup '$target/$name'"
  found=1
done < <(find "$STATE_DIR" -type f -name '*.sqlite' -size +0 -print0 2>/dev/null)

if [[ $found -eq 0 ]]; then
  echo "Keine Datenbank unter $STATE_DIR gefunden – nichts gesichert."
  rmdir "$target" 2>/dev/null || true
  exit 0
fi
gzip -9 "$target"/*.sqlite
echo "Sicherung erstellt: $target"

# Alte Sicherungen aufräumen
ls -1d "$BACKUP_DIR"/*/ 2>/dev/null | sort | head -n -"$KEEP" | xargs -r rm -rf
