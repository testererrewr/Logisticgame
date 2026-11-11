#!/usr/bin/env bash
# Sicherung der Spieldaten. Standard: alle Spielstände, Konten, Welten, Allianzen …
# ohne das riesige Betriebsregister (lässt sich jederzeit neu importieren). Vollsicherung: BACKUP_FULL=1
set -euo pipefail
EF="${ENV_FILE:-/etc/logistik/logistik.env}"; if [[ -f "$EF" ]]; then set -a; . "$EF"; set +a; fi
STATE_DIR="${STATE_DIR:-/var/lib/logistik/state}"
BACKUP_DIR="${BACKUP_DIR:-/var/backups/logistik}"
KEEP="${BACKUP_KEEP:-5}"
SKIP_TABLES="${BACKUP_SKIP_TABLES:-logistics_partner_registry map_snapshots logistics_loaded_areas}"
pack(){ if command -v zstd >/dev/null; then zstd -q -T0 -3; else gzip -1; fi; }
ext=$(command -v zstd >/dev/null && echo zst || echo gz)

stamp="$(date +%Y-%m-%d_%H%M%S)"
target="$BACKUP_DIR/$stamp"
mkdir -p "$target"; chmod 700 "$BACKUP_DIR"
found=0
while IFS= read -r -d '' db; do
  name="$(basename "$db")"; start=$(date +%s); found=1
  if [[ "$name" == "metadata.sqlite" ]]; then cp "$db" "$target/$name"; continue; fi
  if [[ "${BACKUP_FULL:-0}" == "1" ]]; then
    echo "Vollsicherung $name ($(du -h "$db" | cut -f1)) …"
    sqlite3 "$db" ".timeout 60000" "VACUUM INTO '$target/$name'"
    pack < "$target/$name" > "$target/$name.$ext" && rm -f "$target/$name"
  else
    tables=$(sqlite3 "$db" ".timeout 60000" "SELECT name FROM sqlite_master WHERE type='table' AND name NOT LIKE 'sqlite_%' AND name NOT LIKE '_cf_%'" | tr '\n' ' ')
    keep=""; for t in $tables; do [[ " $SKIP_TABLES " == *" $t "* ]] || keep="$keep $t"; done
    echo "Sichere Spielstände aus $name (ohne Betriebsregister) …"
    [[ -n "${keep// /}" ]] && sqlite3 "$db" ".timeout 60000" ".dump $keep" | pack > "$target/$name.sql.$ext"
  fi
  echo "  fertig in $(( $(date +%s)-start )) s"
done < <(find "$STATE_DIR" -type f -name '*.sqlite' -size +0 -print0 2>/dev/null)
if [[ $found -eq 0 ]]; then echo "Keine Datenbank unter $STATE_DIR gefunden – nichts gesichert."; rmdir "$target" 2>/dev/null || true; exit 0; fi
echo "Sicherung erstellt: $target ($(du -sh "$target" | cut -f1))"
ls -1d "$BACKUP_DIR"/*/ 2>/dev/null | sort | head -n -"$KEEP" | xargs -r rm -rf
