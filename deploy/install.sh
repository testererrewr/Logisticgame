#!/usr/bin/env bash
# Erstinstallation auf einem frischen Linux-VPS (Ubuntu 22.04/24.04 oder Debian 12).
#
#   sudo bash install.sh --savegame /root/savegame
#
# Optionen:
#   --domain play.crackgaming.org     Domain für Caddy/HTTPS
#   --repo   https://github.com/testererrewr/Logisticgame.git
#   --branch main
#   --savegame /pfad/zum/ordner       Ordner mit game.sql (+ resume-clock.sql) – nur beim ersten Mal
#   --empty                           ohne Spielstand mit leerer Datenbank starten
set -euo pipefail
[[ $EUID -eq 0 ]] || { echo "Bitte mit sudo/root ausführen." >&2; exit 1; }

DOMAIN="play.crackgaming.org"
REPO="https://github.com/testererrewr/Logisticgame.git"
BRANCH="main"
SAVEGAME=""
PORT=8787
APP=/opt/logistik/app
STATE_DIR=/var/lib/logistik/state
while [[ $# -gt 0 ]]; do
  case "$1" in
    --domain) DOMAIN="$2"; shift 2;;
    --repo) REPO="$2"; shift 2;;
    --branch) BRANCH="$2"; shift 2;;
    --savegame) SAVEGAME="$(realpath "$2")"; shift 2;;
    --empty) SAVEGAME="--empty"; shift;;
    *) echo "Unbekannte Option: $1" >&2; exit 1;;
  esac
done
log() { echo; echo "==> $*"; }

log "Systempakete"
export DEBIAN_FRONTEND=noninteractive
apt-get update -y
apt-get install -y curl git ca-certificates gnupg sqlite3 openssl debian-keyring debian-archive-keyring apt-transport-https

log "Node.js 22"
if ! command -v node >/dev/null || ! node -e 'const [a,b]=process.versions.node.split(".").map(Number);process.exit(a>22||a===22&&b>=13?0:1)'; then
  curl -fsSL https://deb.nodesource.com/setup_22.x | bash -
  apt-get install -y nodejs
fi
node -v

log "Caddy"
if ! command -v caddy >/dev/null; then
  curl -1sLf 'https://dl.cloudsmith.io/public/caddy/stable/gpg.key' | gpg --dearmor --yes -o /usr/share/keyrings/caddy-stable-archive-keyring.gpg
  curl -1sLf 'https://dl.cloudsmith.io/public/caddy/stable/debian.deb.txt' > /etc/apt/sources.list.d/caddy-stable.list
  chmod o+r /usr/share/keyrings/caddy-stable-archive-keyring.gpg /etc/apt/sources.list.d/caddy-stable.list
  apt-get update -y && apt-get install -y caddy
fi

log "Arbeitsspeicher prüfen (Build braucht ~3 GB)"
mem_mb=$(awk '/MemTotal/{print int($2/1024)}' /proc/meminfo)
if [[ $mem_mb -lt 3500 ]] && ! swapon --show | grep -q .; then
  echo "Nur ${mem_mb} MB RAM – lege 4 GB Swap an."
  fallocate -l 4G /swapfile || dd if=/dev/zero of=/swapfile bs=1M count=4096
  chmod 600 /swapfile && mkswap /swapfile && swapon /swapfile
  grep -q '^/swapfile' /etc/fstab || echo '/swapfile none swap sw 0 0' >> /etc/fstab
fi

log "Benutzer und Ordner"
id logistik >/dev/null 2>&1 || useradd --system --home-dir /opt/logistik --create-home --shell /usr/sbin/nologin logistik
mkdir -p /opt/logistik "$STATE_DIR" /var/backups/logistik /etc/logistik
chown logistik:logistik /opt/logistik "$STATE_DIR" /var/lib/logistik
chmod 750 /var/lib/logistik

log "Code von GitHub ($REPO, $BRANCH)"
if [[ -d "$APP/.git" ]]; then
  runuser -u logistik -- git -C "$APP" pull --ff-only
else
  runuser -u logistik -- git clone --branch "$BRANCH" "$REPO" "$APP"
fi

log "Konfiguration /etc/logistik/logistik.env"
if [[ ! -f /etc/logistik/logistik.env ]]; then
  cat > /etc/logistik/logistik.env <<EOF
DOMAIN=$DOMAIN
PORT=$PORT
STATE_DIR=$STATE_DIR
BACKUP_DIR=/var/backups/logistik
SIMULATION_TRIGGER_SECRET=$(openssl rand -hex 32)
# Weltimport: Runden je Minute (je max. 2 OSM-Abfragen) und Overpass-Timeout in Sekunden
LOGISTIK_WORLD_IMPORT_ROUNDS=3
LOGISTIK_WORLD_IMPORT_TIMEOUT=25
EOF
fi
chown root:logistik /etc/logistik/logistik.env
chmod 640 /etc/logistik/logistik.env
sed -i "s/^DOMAIN=.*/DOMAIN=$DOMAIN/" /etc/logistik/logistik.env

log "Installieren und bauen"
bash "$APP/deploy/update.sh" --no-pull || {
  # update.sh startet den Dienst – beim allerersten Mal ohne Datenbank darf das scheitern
  [[ -f "$APP/dist/server/wrangler.json" ]] || { echo "Build fehlgeschlagen." >&2; exit 1; }
}

if [[ -n "$SAVEGAME" ]]; then
  log "Spielstand importieren"
  bash "$APP/deploy/import-savegame.sh" "$SAVEGAME"
elif [[ -z "$(find "$STATE_DIR" -name '*.sqlite' 2>/dev/null)" ]]; then
  echo "Hinweis: Noch keine Datenbank. Spielstand später mit"
  echo "  sudo bash $APP/deploy/import-savegame.sh /pfad/zum/savegame"
  echo "importieren (oder --empty für eine leere Datenbank)."
fi

log "Caddy für https://$DOMAIN"
mkdir -p /etc/caddy/sites
sed "s/play\.crackgaming\.org/$DOMAIN/; s/127\.0\.0\.1:8787/127.0.0.1:$PORT/" "$APP/deploy/Caddyfile" > /etc/caddy/sites/logistik.caddy
if [[ ! -f /etc/caddy/Caddyfile ]] || grep -q '/usr/share/caddy' /etc/caddy/Caddyfile; then
  # Standard-Caddyfile des Pakets durch unsere ersetzen
  [[ -f /etc/caddy/Caddyfile ]] && cp /etc/caddy/Caddyfile /etc/caddy/Caddyfile.original
  echo 'import sites/*.caddy' > /etc/caddy/Caddyfile
elif ! grep -q 'import sites/\*.caddy' /etc/caddy/Caddyfile; then
  echo 'import sites/*.caddy' >> /etc/caddy/Caddyfile
fi
caddy validate --config /etc/caddy/Caddyfile --adapter caddyfile
systemctl enable caddy >/dev/null
systemctl reload caddy || systemctl restart caddy

if command -v ufw >/dev/null && ufw status | grep -q 'Status: active'; then
  log "Firewall: Ports 80/443 freigeben"
  ufw allow 80/tcp && ufw allow 443/tcp
fi

log "Test der Hintergrundabrechnung"
sleep 3
runuser -u logistik -- env $(grep -E '^(PORT|SIMULATION_TRIGGER_SECRET)=' /etc/logistik/logistik.env | xargs) bash "$APP/deploy/tick.sh" || echo "(Tick fehlgeschlagen – siehe journalctl -u logistik)"

echo
echo "Fertig. Öffne https://$DOMAIN"
echo "Status:  systemctl status logistik     Log: journalctl -u logistik -f"
echo "Update:  sudo bash $APP/deploy/update.sh"
