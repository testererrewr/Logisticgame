#!/usr/bin/env bash
set -euo pipefail
cd "$(dirname "$0")/.."

DOMAIN="${DOMAIN:-playloadstar.com}"
PORT="${PORT:-8787}"
BIND_IP="${BIND_IP:-127.0.0.1}"   # z. B. Docker-Gateway-IP, wenn ein Caddy im Docker-Container weiterleitet
STATE_DIR="${STATE_DIR:-/var/lib/logistik/state}"

if [[ ! -f dist/server/wrangler.json ]]; then
  echo "Kein Build gefunden (dist/server/wrangler.json fehlt). Zuerst: sudo bash deploy/update.sh" >&2
  exit 1
fi
mkdir -p "$STATE_DIR"

umask 077
export LOGISTIK_VERSION="$(git log -1 --format='%h · %s · %cd' --date=format:'%d.%m.%Y %H:%M' 2>/dev/null | sed 's/Update Logisticgame-//; s/-komplett//' | tr -d '\n"' || echo unbekannt)"
env | grep -E '^(DOMAIN|SIMULATION_TRIGGER_SECRET|SIMULATION_OWNER_EMAIL|ADMIN_EMAIL|ADMIN_SETUP_HASH|CATALOG_PUSH_HASH|BACKUP_READ_HASH|LOGISTIK_[A-Z0-9_]+)=' > dist/server/.dev.vars || true

export WRANGLER_SEND_METRICS=false CLOUDFLARE_CF_FETCH_ENABLED=false
exec node --import ./scripts/sites-env.mjs ./node_modules/wrangler/bin/wrangler.js dev \
  --config dist/server/wrangler.json \
  --local \
  --persist-to "$STATE_DIR" \
  --ip "$BIND_IP" \
  --port "$PORT" \
  --inspector-port 0 \
  --local-upstream "$DOMAIN" \
  --upstream-protocol https
