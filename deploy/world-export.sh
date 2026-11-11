#!/usr/bin/env bash
# Eine einzelne Welt (mit Speditionen, Allianzen, Aufträgen, Spielerkonten) in eine Datei exportieren,
# um sie auf einem anderen Server weiterlaufen zu lassen.
#   sudo bash /opt/logistik/app/deploy/world-export.sh <welt-id>      → /root/welt-<welt-id>.sql.gz
set -euo pipefail
[[ $EUID -eq 0 ]] || { echo "Bitte mit sudo ausführen." >&2; exit 1; }
[[ -f /etc/logistik/logistik.env ]] && { set -a; . /etc/logistik/logistik.env; set +a; }
STATE_DIR="${STATE_DIR:-/var/lib/logistik/state}"
W="${1:-}";[[ "$W" =~ ^[-a-zA-Z0-9_]{6,100}$ ]] || { echo "Welt-ID angeben (siehe Verwaltung → Welten)." >&2; exit 1; }
DB="$(find "$STATE_DIR" -name '*.sqlite' ! -name 'metadata.sqlite' | head -1)";[[ -n "$DB" ]] || { echo "Datenbank nicht gefunden." >&2; exit 1; }
q(){ sqlite3 -bail -cmd ".timeout 60000" "$DB" "$@"; }
[[ "$(q "SELECT count(*) FROM logistics_worlds WHERE id='$W'")" == "1" ]] || { echo "Welt $W nicht gefunden." >&2; exit 1; }
OUT="/root/welt-$W.sql"; : > "$OUT"
echo "PRAGMA foreign_keys=OFF;" >> "$OUT"; echo "BEGIN;" >> "$OUT"
dump(){ # Tabelle, WHERE-Bedingung, Konfliktverhalten
  local t="$1" where="$2" mode="${3:-REPLACE}"
  q ".schema $t" | sed -E 's/^CREATE TABLE ("?[A-Za-z_]+"?)/CREATE TABLE IF NOT EXISTS \1/; s/^CREATE (UNIQUE )?INDEX /CREATE \1INDEX IF NOT EXISTS /' >> "$OUT"
  q ".mode insert $t" "SELECT * FROM $t WHERE $where;" | sed -E "s/^INSERT INTO/INSERT OR $mode INTO/" >> "$OUT"
  echo "  $t: $(q "SELECT count(*) FROM $t WHERE $where")"
}
USERS="(SELECT user_id FROM logistics_world_companies WHERE world_id='$W')"
ALLY="(SELECT id FROM logistics_alliances WHERE world_id='$W')"
echo "Exportiere Welt $W …"
dump logistics_worlds "id='$W'"
dump users "id IN $USERS" IGNORE
for t in $(q "SELECT m.name FROM sqlite_master m WHERE m.type='table' AND EXISTS(SELECT 1 FROM pragma_table_info(m.name) p WHERE p.name='world_id') ORDER BY m.name"); do
  dump "$t" "world_id='$W'"
done
for t in logistics_alliance_invites logistics_alliance_posts logistics_alliance_chronicle; do
  [[ -n "$(q "SELECT name FROM sqlite_master WHERE type='table' AND name='$t'")" ]] && dump "$t" "alliance_id IN $ALLY"
done
for t in logistics_entitlements logistics_user_achievements; do
  [[ -n "$(q "SELECT name FROM sqlite_master WHERE type='table' AND name='$t'")" ]] && dump "$t" "user_id IN $USERS" IGNORE
done
dump logistics_runtime "id LIKE '%$W%'"
[[ -n "$(q "SELECT name FROM sqlite_master WHERE type='table' AND name='logistics_company_chunks'")" ]] && dump logistics_company_chunks "id LIKE '$W%' OR id LIKE '%:$W:%' OR id LIKE '%|$W|%'"
echo "COMMIT;" >> "$OUT"
gzip -f "$OUT"
echo "Fertig: $OUT.gz ($(du -h "$OUT.gz" | cut -f1))"
echo "Auf den neuen Server kopieren und dort einspielen:  sudo bash /opt/logistik/app/deploy/world-import.sh /root/welt-$W.sql.gz"
