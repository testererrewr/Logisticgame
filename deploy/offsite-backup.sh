#!/usr/bin/env bash
# Sichert die Spieldatenbank (ohne Betriebsregister) auf den zweiten Server. Behält BACKUP_KEEP Stände.
set -euo pipefail
EF=/etc/logistik/logistik.env; [[ -f "$EF" ]] && { set -a; . "$EF"; set +a; }
: "${BACKUP_REMOTE:?BACKUP_REMOTE fehlt – zuerst offsite-setup.sh ausführen}"; KEEP="${BACKUP_KEEP:-5}"; HOST="${BACKUP_REMOTE%%:*}"; DIR="${BACKUP_REMOTE#*:}"
STATE_DIR="${STATE_DIR:-/var/lib/logistik/state}"; KEY=/root/.ssh/logistik_backup; SSH=(ssh -i "$KEY" -o BatchMode=yes)
DB="$(find "$STATE_DIR" -name '*.sqlite' ! -name 'metadata.sqlite' | head -1)"; [[ -n "$DB" ]] || { echo "Datenbank nicht gefunden." >&2; exit 1; }
TMP="$(mktemp -d /var/tmp/logistik-offsite.XXXX)"; trap 'rm -rf "$TMP"' EXIT
NAME="logistik-$(date +%Y%m%d-%H%M).sqlite"
sqlite3 -cmd ".timeout 120000" "$DB" ".backup '$TMP/$NAME'"
if [[ "${BACKUP_REGISTRY:-0}" != "1" ]]; then sqlite3 "$TMP/$NAME" "DROP TABLE IF EXISTS logistics_partner_registry; DROP TABLE IF EXISTS logistics_partner_grid; VACUUM;"; fi
gzip -6 "$TMP/$NAME"
rsync -e "${SSH[*]}" -t "$TMP/$NAME.gz" "$HOST:$DIR/" 2>/dev/null || scp -i "$KEY" -o BatchMode=yes -q "$TMP/$NAME.gz" "$HOST:$DIR/"
"${SSH[@]}" "$HOST" "cd '$DIR' && ls -1t logistik-*.sqlite.gz | tail -n +$((KEEP+1)) | xargs -r rm -f"
echo "Sicherung übertragen: $NAME.gz ($(du -h "$TMP/$NAME.gz" | cut -f1)) → $BACKUP_REMOTE"
