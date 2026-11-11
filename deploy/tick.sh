#!/usr/bin/env bash
set -euo pipefail
PORT="${PORT:-8787}"
BIND_IP="${BIND_IP:-127.0.0.1}"
: "${SIMULATION_TRIGGER_SECRET:?SIMULATION_TRIGGER_SECRET fehlt in /etc/logistik/logistik.env}"
printf 'Authorization: Bearer %s\n' "$SIMULATION_TRIGGER_SECRET" | \
  curl -fsS -m 110 -X POST -H @- -H 'Content-Type: application/json' --data '{}' \
  -o /dev/null -w 'tick HTTP %{http_code}\n' \
  "http://${BIND_IP}:${PORT}/api/logistik/internal/tick"
if [[ -d /opt/logistik/app-test ]]; then
  printf 'Authorization: Bearer %s\n' "$SIMULATION_TRIGGER_SECRET" | \
    curl -fsS -m 110 -X POST -H @- -H 'Content-Type: application/json' --data '{}' \
    -o /dev/null -w 'tick (Test) HTTP %{http_code}\n' \
    "http://${BIND_IP}:${TEST_PORT:-8788}/api/logistik/internal/tick" || true
fi
