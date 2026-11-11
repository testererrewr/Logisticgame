#!/usr/bin/env bash
set -euo pipefail
if [[ -f /etc/logistik/logistik.env ]]; then set -a; . /etc/logistik/logistik.env; set +a; fi
STATE_DIR="${STATE_DIR:-/var/lib/logistik/state}"
BACKUP_DIR="${BACKUP_DIR:-/var/backups/logistik}"
KEEP="${BACKUP_KEEP:-5}"

stamp="$(date +%Y-%m-%d_%H%M%S)"
target="$BACKUP_DIR/$stamp"
mkdir -p "$target"
chmod 700 "$BACKUP_DIR"

found=0
while IFS= read -r -d '' db; do
  name="$(basename "$db")"
  echo "Sichere $name ($(du -h "$db" | cut -f1)) …"
  start=$(date +%s)
  sqlite3 "$db" ".timeout 30000" ".backup '$target/$name'"
  echo "  kopiert in $(( $(date +%s)-start )) s"
  found=1
done < <(find "$STATE_DIR" -type f -name '*.sqlite' -size +0 -print0 2>/dev/null)

if [[ $found -eq 0 ]]; then
  echo "Keine Datenbank unter $STATE_DIR gefunden – nichts gesichert."
  rmdir "$target" 2>/dev/null || true
  exit 0
fi
echo "Komprimiere …"
if command -v zstd >/dev/null; then zstd -q -T0 -3 --rm "$target"/*.sqlite; else gzip -1 "$target"/*.sqlite; fi
echo "Sicherung erstellt: $target ($(du -sh "$target" | cut -f1))"

ls -1d "$BACKUP_DIR"/*/ 2>/dev/null | sort | head -n -"$KEEP" | xargs -r rm -rf
