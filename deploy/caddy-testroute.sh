#!/usr/bin/env bash
set -euo pipefail
[[ $EUID -eq 0 ]] || { echo "Bitte mit sudo ausführen." >&2; exit 1; }
set -a; . /etc/logistik/logistik.env; set +a
DOMAIN="${DOMAIN:-play.crackgaming.org}"; BIND_IP="${BIND_IP:-127.0.0.1}"; PORT="${PORT:-8787}"; TEST_PORT="${TEST_PORT:-8788}"
command -v docker >/dev/null || { echo "Kein Docker gefunden – trage den Block bitte im Webserver selbst ein."; exit 1; }
C="${CADDY_CONTAINER:-$(docker ps --format '{{.Names}} {{.Image}}' | awk 'tolower($0) ~ /caddy/ {print $1; exit}')}"
[[ -n "$C" ]] || { echo "Kein laufender Caddy-Container gefunden. Name angeben: CADDY_CONTAINER=name sudo bash $0" >&2; exit 1; }
SRC="$(docker inspect -f '{{range .Mounts}}{{if eq .Destination "/etc/caddy/Caddyfile"}}{{.Source}}{{end}}{{end}}' "$C")"
if [[ -z "$SRC" ]]; then DIR="$(docker inspect -f '{{range .Mounts}}{{if eq .Destination "/etc/caddy"}}{{.Source}}{{end}}{{end}}' "$C")"; [[ -n "$DIR" ]] && SRC="$DIR/Caddyfile"; fi
[[ -n "$SRC" && -f "$SRC" ]] || { echo "Caddyfile des Containers $C nicht gefunden (kein Volume auf /etc/caddy)." >&2; exit 1; }
echo "Caddy-Container: $C"; echo "Caddyfile:       $SRC"
if grep -q 'lgx_inst=test' "$SRC"; then echo "Weiterleitung zur Testinstanz ist bereits eingetragen."; exit 0; fi
cp "$SRC" "$SRC.vor-testinstanz.$(date +%Y%m%d%H%M%S)"
node - "$SRC" "$DOMAIN" "$BIND_IP" "$PORT" "$TEST_PORT" <<'JS'
const fs=require('fs'),[file,domain,ip,port,test]=process.argv.slice(2);let s=fs.readFileSync(file,'utf8');
const block=`${domain} {\n\tencode zstd gzip\n\t@test header_regexp Cookie lgx_inst=test\n\thandle @test {\n\t\treverse_proxy ${ip}:${test}\n\t}\n\thandle {\n\t\treverse_proxy ${ip}:${port}\n\t}\n}`;
const start=s.search(new RegExp('(^|\\n)[^\\n#]*'+domain.replace(/\./g,'\\.')+'[^\\n]*\\{'));
if(start<0){s=s.trimEnd()+'\n\n'+block+'\n';}else{let i=s.indexOf('{',start),depth=0,end=-1;for(;i<s.length;i++){if(s[i]==='{')depth++;else if(s[i]==='}'){depth--;if(!depth){end=i+1;break;}}}if(end<0){console.error('Block für '+domain+' nicht sauber gefunden.');process.exit(1);}const lead=s[start]==='\n'?start+1:start;s=s.slice(0,lead)+block+s.slice(end);}
fs.writeFileSync(file,s);
JS
if docker exec "$C" caddy validate --config /etc/caddy/Caddyfile --adapter caddyfile >/dev/null 2>&1; then
  docker exec "$C" caddy reload --config /etc/caddy/Caddyfile --adapter caddyfile && echo "✅ Caddy neu geladen – Testwelten laufen jetzt über die Testinstanz."
else
  echo "!! Neue Konfiguration ist ungültig – stelle die Sicherung wieder her." >&2
  cp "$(ls -1t "$SRC".vor-testinstanz.* | head -1)" "$SRC"; exit 1
fi
