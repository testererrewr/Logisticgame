#!/usr/bin/env bash
# Führt „Update für alle ausrollen“ aus der Verwaltung aus: Hauptinstanz auf den Stand der Testinstanz bringen.
set -uo pipefail
[[ -d /opt/logistik/app-test ]] || exit 0
set -a; . /etc/logistik/logistik.env; set +a
STATE_DIR="${STATE_DIR:-/var/lib/logistik/state}"
DB=""
while IFS= read -r f; do
  if sqlite3 -cmd ".timeout 20000" "$f" "SELECT 1 FROM sqlite_master WHERE name='logistics_runtime'" 2>/dev/null | grep -q 1; then DB="$f"; break; fi
done < <(find "$STATE_DIR" -name '*.sqlite' ! -name 'metadata.sqlite' 2>/dev/null)
[[ -n "$DB" ]] || exit 0
q(){ runuser -u logistik -- sqlite3 -cmd ".timeout 30000" "$DB" "$1"; }
req="$(q "SELECT updated FROM logistics_runtime WHERE id='rollout-request'")"
[[ -n "$req" ]] || exit 0
status(){ q "INSERT OR REPLACE INTO logistics_runtime(id,updated,payload) VALUES('rollout-status',$(date +%s)000,json_object('text','$1'))"; }
status "läuft"
commit="$(git -C /opt/logistik/app-test rev-parse HEAD)"
echo "==> Rollout auf Stand ${commit:0:8}"
if runuser -u logistik -- env HOME=/opt/logistik bash -c "cd /opt/logistik/app && git fetch -q && git merge -q --ff-only $commit" \
   && SKIP_BACKUP=1 APP=/opt/logistik/app SERVICE=logistik bash /opt/logistik/app/deploy/update.sh --no-pull; then
  q "DELETE FROM logistics_runtime WHERE id='rollout-request'"; status "erfolgreich (Stand ${commit:0:8})"
else
  q "DELETE FROM logistics_runtime WHERE id='rollout-request'"; status "fehlgeschlagen (Stand ${commit:0:8}), Log: journalctl -u logistik-rollout"
fi
