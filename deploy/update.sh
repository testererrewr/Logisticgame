#!/usr/bin/env bash
set -euo pipefail
[[ $EUID -eq 0 ]] || { echo "Bitte mit sudo ausführen." >&2; exit 1; }
APP="${APP:-/opt/logistik/app}"
SERVICE="${SERVICE:-logistik}"
ENV_FILE="${ENV_FILE:-/etc/logistik/logistik.env}"
set -a; . "$ENV_FILE"; set +a
PORT="${PORT:-8787}"
[[ "$SERVICE" == "logistik-test" ]] && PORT="${TEST_PORT:-8788}"
export APP SERVICE ENV_FILE
BIND_IP="${BIND_IP:-127.0.0.1}"

as_app() { runuser -u logistik -- env HOME=/opt/logistik bash -c "cd '$APP' && $1"; }

if [[ "${1:-}" != "--no-pull" ]]; then
  echo "==> Hole neuen Stand von GitHub"
  as_app "git pull --ff-only"
  exec bash "$APP/deploy/update.sh" --no-pull
fi

echo "==> Abhängigkeiten installieren"
as_app "npm ci --include=dev --no-audit --no-fund"

echo "==> Bauen (kann einige Minuten dauern)"
as_app "rm -rf dist.prev && if [ -d dist ]; then cp -a dist dist.prev; fi"
if ! as_app "npm run build"; then
  echo "!! Build fehlgeschlagen – vorherige Version bleibt aktiv." >&2
  as_app "if [ -d dist.prev ]; then rm -rf dist && mv dist.prev dist; fi"
  exit 1
fi
as_app "rm -rf dist.prev"
[[ -f "$APP/dist/server/wrangler.json" ]] || { echo "!! Build ohne dist/server/wrangler.json" >&2; exit 1; }

echo "==> Sicherung vor dem Neustart"
if [[ "${SKIP_BACKUP:-0}" == "1" ]]; then echo "(Sicherung auf Wunsch übersprungen – SKIP_BACKUP=1)"; else bash "$APP/deploy/backup.sh" || echo "(Sicherung übersprungen)"; fi

echo "==> systemd-Dienste aktualisieren und neu starten"
install -m 644 "$APP"/deploy/systemd/*.service "$APP"/deploy/systemd/*.timer /etc/systemd/system/
systemctl daemon-reload
systemctl enable "$SERVICE" >/dev/null 2>&1
systemctl restart "$SERVICE"
if [[ "$SERVICE" == "logistik" ]]; then systemctl enable --now logistik-tick.timer logistik-backup.timer logistik-watchdog.timer >/dev/null; fi
if [[ "$SERVICE" == "logistik" && -d /opt/logistik/app-test ]]; then systemctl enable --now logistik-rollout.timer >/dev/null 2>&1 || true; fi
if [[ "$SERVICE" == logistik-node@* ]]; then n="${SERVICE#logistik-node@}"; systemctl enable --now "logistik-node-tick@$n.timer" "logistik-node-agent@$n.timer" >/dev/null 2>&1 || true; fi

echo -n "==> Warte auf den Server "
for i in $(seq 1 90); do
  code="$(curl -s -o /dev/null -w '%{http_code}' "http://$BIND_IP:$PORT/" || true)"
  if [[ "$code" =~ ^(200|30[0-9])$ ]]; then echo " ok ($code)"; exit 0; fi
  echo -n "."; sleep 2
done
echo; echo "!! Server antwortet nicht. Log: journalctl -u $SERVICE -n 100 --no-pager" >&2
exit 1
