#!/usr/bin/env bash
set -uo pipefail
NAME="${1:?Name}"; ENVF="/etc/logistik/$NAME.env"; APP="/opt/logistik-$NAME/app"; SVC="logistik-node@$NAME"
[[ -f "$ENVF" ]] || exit 0
set -a; . "$ENVF"; set +a
LOG=/var/log/logistik-$NAME-agent.log
say(){ echo "[$(date '+%F %T')] $*" | tee -a "$LOG"; }
api(){ curl -fsS -m 300 "$@"; }
findDb(){ find "$STATE_DIR" -name '*.sqlite' ! -name 'metadata.sqlite' 2>/dev/null | head -1; }
ver="$(git -C "$APP" rev-parse --short HEAD 2>/dev/null || echo '?')"
resp="$(api -X POST -H 'Content-Type: application/json' --data "{\"token\":\"$LOGISTIK_NODE_TOKEN\",\"version\":\"$ver\",\"port\":$PORT,\"worlds\":\"$LOGISTIK_WORLDS\"}" "$LOGISTIK_MAIN_URL/api/logistik/node?action=heartbeat")" || { say "Hauptserver nicht erreichbar"; exit 0; }
field(){ node -e 'let d="";process.stdin.on("data",c=>d+=c).on("end",()=>{try{const v=process.argv[1].split(".").reduce((o,k)=>o?.[k],JSON.parse(d));process.stdout.write(v==null?"":String(v));}catch{}})' "$1" <<<"$resp"; }
setWorlds(){ if grep -q '^LOGISTIK_WORLDS=' "$ENVF"; then sed -i "s#^LOGISTIK_WORLDS=.*#LOGISTIK_WORLDS=$1#" "$ENVF"; else echo "LOGISTIK_WORLDS=$1" >> "$ENVF"; fi; LOGISTIK_WORLDS="$1"; }
addWorld(){ local cur="${LOGISTIK_WORLDS//keine/}"; [[ ",$cur," == *",$1,"* ]] && return; setWorlds "$(echo "$cur,$1" | sed 's/^,//; s/,$//')"; }
delWorld(){ local cur; cur="$(echo ",${LOGISTIK_WORLDS}," | sed "s/,$1,/,/g; s/^,//; s/,$//")"; setWorlds "${cur:-keine}"; }

move="$(field move.world)"
if [[ "$move" =~ ^[-a-zA-Z0-9_]{6,100}$ ]]; then
  say "Übernehme Welt $move vom Hauptserver"
  tmp="$(mktemp)"; trap 'rm -f "$tmp"' EXIT
  if ! api -o "$tmp" "$LOGISTIK_MAIN_URL/api/logistik/node?action=export&t=$LOGISTIK_NODE_TOKEN&world=$move"; then say "Export fehlgeschlagen"; exit 1; fi
  grep -q '^COMMIT;' "$tmp" || { say "Export unvollständig"; exit 1; }
  DB="$(findDb)"; if [[ -z "$DB" ]]; then bash "$APP/deploy/tick.sh" >/dev/null 2>&1 || true; sleep 3; DB="$(findDb)"; fi
  [[ -n "$DB" ]] || { say "Keine Datenbank auf diesem Weltserver gefunden"; exit 1; }
  systemctl stop "logistik-node-tick@$NAME.timer" "$SVC"
  cp "$DB" "$DB.vor-umzug" 2>/dev/null || true
  if runuser -u logistik -- sqlite3 -bail -cmd ".timeout 60000" "$DB" < "$tmp"; then
    addWorld "$move"; systemctl start "$SVC" "logistik-node-tick@$NAME.timer"
    api -X POST -H 'Content-Type: application/json' --data "{\"token\":\"$LOGISTIK_NODE_TOKEN\",\"world\":\"$move\",\"ok\":true}" "$LOGISTIK_MAIN_URL/api/logistik/node?action=confirm" >/dev/null && say "Welt $move läuft jetzt hier" && rm -f "$DB.vor-umzug"
  else
    say "Einspielen fehlgeschlagen – alter Stand bleibt"; [[ -f "$DB.vor-umzug" ]] && mv "$DB.vor-umzug" "$DB"; systemctl start "$SVC" "logistik-node-tick@$NAME.timer"
    api -X POST -H 'Content-Type: application/json' --data "{\"token\":\"$LOGISTIK_NODE_TOKEN\",\"world\":\"$move\",\"ok\":false}" "$LOGISTIK_MAIN_URL/api/logistik/node?action=confirm" >/dev/null || true
  fi
  exit 0
fi

back="$(field back.world)"
if [[ "$back" =~ ^[-a-zA-Z0-9_]{6,100}$ ]]; then
  say "Gebe Welt $back an den Hauptserver zurück"
  delWorld "$back"; systemctl restart "$SVC"; sleep 5
  out="/root/welt-$back.sql"
  if ENV_FILE="$ENVF" OUT_DIR=/root bash "$APP/deploy/world-export.sh" "$back" >/dev/null && [[ -f "$out.gz" ]]; then
    if api -X POST -H 'Content-Type: application/gzip' --data-binary @"$out.gz" "$LOGISTIK_MAIN_URL/api/logistik/node?action=upload&t=$LOGISTIK_NODE_TOKEN&world=$back" >/dev/null; then say "Welt $back zurückgegeben"; else addWorld "$back"; systemctl restart "$SVC"; say "Rückgabe fehlgeschlagen – Welt läuft weiter hier"; fi
  else addWorld "$back"; systemctl restart "$SVC"; say "Export fehlgeschlagen – Welt läuft weiter hier"; fi
  exit 0
fi

upd="$(field update)"
if [[ "$upd" == "1" ]]; then say "Update auf neuesten Stand"; SKIP_BACKUP=1 ENV_FILE="$ENVF" APP="$APP" SERVICE="$SVC" bash "$APP/deploy/update.sh" >>"$LOG" 2>&1 || say "Update fehlgeschlagen"; fi
