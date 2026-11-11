#!/usr/bin/env bash
# Prüft jede Minute, ob der Spielserver antwortet, und startet ihn bei Bedarf neu.
set -uo pipefail
set -a; . /etc/logistik/logistik.env; set +a
PORT="${PORT:-8787}"; BIND_IP="${BIND_IP:-127.0.0.1}"
STATE=/run/logistik-watchdog; mkdir -p "$STATE"
since=$(systemctl show logistik -p ActiveEnterTimestampMonotonic --value 2>/dev/null || echo 0)
now=$(awk '{print int($1*1000000)}' /proc/uptime)
# Nach einem (Neu-)Start 3 Minuten Zeit zum Hochfahren lassen
if (( since > 0 && now - since < 180000000 )); then echo 0 > "$STATE/fails"; exit 0; fi
restart() { echo "Watchdog: $1 – starte logistik neu"; logger -t logistik-watchdog "$1 – Neustart"; echo 0 > "$STATE/fails"; systemctl restart logistik; exit 0; }
# Speicher: vor dem Absturz neu starten (Standard: 75 % des Arbeitsspeichers)
total=$(awk '/MemTotal/{print $2*1024}' /proc/meminfo)
limit=$(( total * ${WATCHDOG_MEMORY_PERCENT:-75} / 100 ))
used=$(systemctl show logistik -p MemoryCurrent --value 2>/dev/null)
[[ "$used" =~ ^[0-9]+$ ]] && (( used > limit )) && restart "Speicher $((used/1048576)) MB über Grenze $((limit/1048576)) MB"
# Absturz des Spielservers im Log
if journalctl -u logistik --since "-2min" --no-pager 2>/dev/null | grep -qE "heap out of memory|V8 fatal error"; then restart "Speicherabsturz im Log"; fi
# Antwortet der Server?
if curl -fsS -m 25 -o /dev/null "http://${BIND_IP}:${PORT}/api/logistik/health"; then echo 0 > "$STATE/fails"; exit 0; fi
fails=$(( $(cat "$STATE/fails" 2>/dev/null || echo 0) + 1 )); echo "$fails" > "$STATE/fails"
(( fails >= 2 )) && restart "Server antwortet nicht ($fails Prüfungen)"
echo "Watchdog: keine Antwort ($fails/2)"
