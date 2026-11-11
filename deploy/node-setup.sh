#!/usr/bin/env bash
set -euo pipefail
[[ $EUID -eq 0 ]] || { echo "Bitte mit sudo ausführen." >&2; exit 1; }
NAME="${1:?Name}"; DOMAIN="${2:?Domain}"; TOKEN="${3:?Token}"; MAIN="${4:?Hauptserver}"
BASE="/opt/logistik-$NAME"; APP="$BASE/app"; ENVF="/etc/logistik/$NAME.env"; STATE="/var/lib/logistik-$NAME/state"
log(){ echo; echo "==> $*"; }
export DEBIAN_FRONTEND=noninteractive

log "Node.js 22"
if ! command -v node >/dev/null || ! node -e 'const [a,b]=process.versions.node.split(".").map(Number);process.exit(a>22||a===22&&b>=13?0:1)'; then
  curl -fsSL https://deb.nodesource.com/setup_22.x | bash - >/dev/null
  apt-get install -y nodejs >/dev/null
fi
node -v

mem_mb=$(awk '/MemTotal/{print int($2/1024)}' /proc/meminfo)
if [[ $mem_mb -lt 3500 ]] && ! swapon --show | grep -q .; then
  log "Nur ${mem_mb} MB RAM – lege 4 GB Swap an"
  fallocate -l 4G /swapfile || dd if=/dev/zero of=/swapfile bs=1M count=4096
  chmod 600 /swapfile && mkswap /swapfile >/dev/null && swapon /swapfile
  grep -q '^/swapfile' /etc/fstab || echo '/swapfile none swap sw 0 0' >> /etc/fstab
fi

mkdir -p "$STATE" "/var/backups/logistik-$NAME" /etc/logistik
chown -R logistik:logistik "/var/lib/logistik-$NAME" "$BASE"

if [[ -f "$ENVF" ]]; then
  log "Konfiguration $ENVF existiert bereits – bleibt erhalten"
  sed -i "s#^LOGISTIK_NODE_TOKEN=.*#LOGISTIK_NODE_TOKEN=$TOKEN#; s#^LOGISTIK_MAIN_URL=.*#LOGISTIK_MAIN_URL=$MAIN#; s#^DOMAIN=.*#DOMAIN=$DOMAIN#" "$ENVF"
else
  used="$(grep -h '^PORT=' /etc/logistik/*.env 2>/dev/null | cut -d= -f2 | tr '\n' ' ')"
  PORT=8790; while [[ " $used " == *" $PORT "* ]] || ss -ltnH "( sport = :$PORT )" | grep -q .; do PORT=$((PORT+1)); done
  cat > "$ENVF" <<EOF
DOMAIN=$DOMAIN
PORT=$PORT
BIND_IP=127.0.0.1
STATE_DIR=$STATE
BACKUP_DIR=/var/backups/logistik-$NAME
SIMULATION_TRIGGER_SECRET=$(openssl rand -hex 32)
LOGISTIK_NODE_NAME=$NAME
LOGISTIK_NODE_TOKEN=$TOKEN
LOGISTIK_MAIN_URL=$MAIN
LOGISTIK_WORLDS=keine
EOF
fi
chown root:logistik "$ENVF"; chmod 640 "$ENVF"
set -a; . "$ENVF"; set +a

log "Bauen und starten (dauert einige Minuten)"
SKIP_BACKUP=1 ENV_FILE="$ENVF" APP="$APP" SERVICE="logistik-node@$NAME" bash "$APP/deploy/update.sh" --no-pull

log "Webserver für https://$DOMAIN"
if ss -ltnpH '( sport = :443 or sport = :80 )' 2>/dev/null | grep -v '"caddy"' | grep -q .; then
  echo "Ports 80/443 sind von einem anderen Webserver belegt. Dort eintragen:  $DOMAIN  →  reverse_proxy 127.0.0.1:$PORT"
else
  if ! command -v caddy >/dev/null; then
    apt-get install -y debian-keyring debian-archive-keyring apt-transport-https >/dev/null
    curl -1sLf 'https://dl.cloudsmith.io/public/caddy/stable/gpg.key' | gpg --dearmor --yes -o /usr/share/keyrings/caddy-stable-archive-keyring.gpg
    curl -1sLf 'https://dl.cloudsmith.io/public/caddy/stable/debian.deb.txt' > /etc/apt/sources.list.d/caddy-stable.list
    apt-get update -y >/dev/null && apt-get install -y caddy >/dev/null
  fi
  mkdir -p /etc/caddy/sites
  printf '%s {\n\tencode zstd gzip\n\treverse_proxy 127.0.0.1:%s\n}\n' "$DOMAIN" "$PORT" > "/etc/caddy/sites/logistik-$NAME.caddy"
  if [[ ! -f /etc/caddy/Caddyfile ]] || grep -q '/usr/share/caddy' /etc/caddy/Caddyfile; then echo 'import sites/*.caddy' > /etc/caddy/Caddyfile; elif ! grep -q 'import sites/\*.caddy' /etc/caddy/Caddyfile; then echo 'import sites/*.caddy' >> /etc/caddy/Caddyfile; fi
  caddy validate --config /etc/caddy/Caddyfile --adapter caddyfile >/dev/null && { systemctl enable caddy >/dev/null; systemctl reload caddy || systemctl restart caddy; }
  if command -v ufw >/dev/null && ufw status | grep -q 'Status: active'; then ufw allow 80/tcp >/dev/null; ufw allow 443/tcp >/dev/null; fi
fi

log "Beim Hauptserver anmelden"
bash "$APP/deploy/node-agent.sh" "$NAME" || true
systemctl enable --now "logistik-node-agent@$NAME.timer" "logistik-node-tick@$NAME.timer" >/dev/null
echo
echo "Fertig: Weltserver „$NAME“ läuft auf https://$DOMAIN (intern Port $PORT)."
echo "In der Verwaltung des Hauptservers kannst du jetzt Welten hierher umziehen."
echo "Weitere Weltserver auf diesem VPS: einfach einen weiteren Befehl aus der Verwaltung einfügen."
