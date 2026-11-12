#!/usr/bin/env bash
# Stellt das Spiel auf eine neue Domain um. Die alte Domain leitet danach dauerhaft weiter.
# Aufruf: sudo bash domain-switch.sh [neue-domain] [alte-domain]
set -euo pipefail
[[ $EUID -eq 0 ]] || { echo "Bitte mit sudo ausführen." >&2; exit 1; }
NEW="${1:-playloadstar.com}"; OLD="${2:-play.crackgaming.org}"
ENV=/etc/logistik/logistik.env; [[ -f "$ENV" ]] && { set -a; . "$ENV"; set +a; }
BIND_IP="${BIND_IP:-127.0.0.1}"; PORT="${PORT:-8787}"; TEST_PORT="${TEST_PORT:-8788}"
IP="$(curl -fsS4 https://api.ipify.org 2>/dev/null || true)"
for d in "$NEW" "www.$NEW"; do got="$(getent ahostsv4 "$d" | awk 'NR==1{print $1}')"; [[ -n "$IP" && "$got" != "$IP" ]] && { echo "!! $d zeigt auf '${got:-nichts}', dieser Server ist $IP. Erst den A-Eintrag beim Domain-Anbieter setzen und warten." >&2; exit 1; }; done
command -v docker >/dev/null || { echo "Kein Docker gefunden." >&2; exit 1; }
C="${CADDY_CONTAINER:-$(docker ps --format '{{.Names}} {{.Image}}' | awk 'tolower($0) ~ /caddy/ {print $1; exit}')}"
[[ -n "$C" ]] || { echo "Kein Caddy-Container gefunden. Name angeben: CADDY_CONTAINER=name sudo bash $0" >&2; exit 1; }
SRC="$(docker inspect -f '{{range .Mounts}}{{if eq .Destination "/etc/caddy/Caddyfile"}}{{.Source}}{{end}}{{end}}' "$C")"
[[ -z "$SRC" ]] && { DIR="$(docker inspect -f '{{range .Mounts}}{{if eq .Destination "/etc/caddy"}}{{.Source}}{{end}}{{end}}' "$C")"; [[ -n "$DIR" ]] && SRC="$DIR/Caddyfile"; }
[[ -n "$SRC" && -f "$SRC" ]] || { echo "Caddyfile des Containers $C nicht gefunden." >&2; exit 1; }
BAK="$SRC.vor-domainwechsel.$(date +%Y%m%d%H%M%S)"; cp "$SRC" "$BAK"
node - "$SRC" "$NEW" "$OLD" "$BIND_IP" "$PORT" "$TEST_PORT" <<'JS'
const fs=require('fs'),[file,nw,old,ip,port,test]=process.argv.slice(2);let s=fs.readFileSync(file,'utf8');
const app=`${nw} {\n\tencode zstd gzip\n\t@test header_regexp Cookie lgx_inst=test\n\thandle @test {\n\t\treverse_proxy ${ip}:${test}\n\t}\n\thandle {\n\t\treverse_proxy ${ip}:${port}\n\t}\n}`;
const www=`www.${nw} {\n\tredir https://${nw}{uri} permanent\n}`,moved=`${old} {\n\tredir https://${nw}{uri} permanent\n}`;
function put(host,block){const re=new RegExp('(^|\\n)[ \\t]*'+host.replace(/\./g,'\\.')+'[ \\t]*\\{');const m=re.exec(s);if(!m){s=s.trimEnd()+'\n\n'+block+'\n';return;}let i=s.indexOf('{',m.index),d=0,end=-1;for(;i<s.length;i++){if(s[i]==='{')d++;else if(s[i]==='}'&&!--d){end=i+1;break;}}const lead=m.index+(m[1]?1:0);s=s.slice(0,lead)+block+s.slice(end);}
put(nw,app);put('www.'+nw,www);if(old&&old!==nw)put(old,moved);fs.writeFileSync(file,s);
JS
if docker exec "$C" caddy validate --config /etc/caddy/Caddyfile --adapter caddyfile >/dev/null 2>&1; then
  docker exec "$C" caddy reload --config /etc/caddy/Caddyfile --adapter caddyfile >/dev/null 2>&1 || docker restart "$C" >/dev/null
else echo "!! Konfiguration ungültig – Sicherung wiederhergestellt." >&2; cp "$BAK" "$SRC"; exit 1; fi
if [[ -f "$ENV" ]]; then if grep -q '^DOMAIN=' "$ENV"; then sed -i "s/^DOMAIN=.*/DOMAIN=$NEW/" "$ENV"; else echo "DOMAIN=$NEW" >> "$ENV"; fi; fi
echo "✅ $NEW ist eingerichtet (HTTPS-Zertifikat holt Caddy automatisch). $OLD und www.$NEW leiten weiter."
echo "   Danach in der Verwaltung → Integrationen die neuen Weiterleitungs-Adressen bei Google, Discord, Stripe und PayPal eintragen."
