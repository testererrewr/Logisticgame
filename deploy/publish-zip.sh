#!/usr/bin/env bash
set -euo pipefail
[[ $EUID -eq 0 ]] || { echo "Bitte mit sudo ausführen." >&2; exit 1; }
ZIP="${1:?Pfad zur Update-ZIP angeben, z. B. /root/Logisticgame-Update-7-komplett.zip}"
REPO="${REPO_DIR:-/root/Logisticgame}"
[[ -f "$ZIP" ]] || { echo "$ZIP nicht gefunden." >&2; exit 1; }
[[ -d "$REPO/.git" ]] || { echo "$REPO ist kein Git-Repository." >&2; exit 1; }

cd "$REPO"
git pull --ff-only
tmp="$(mktemp -d)"; trap 'rm -rf "$tmp"' EXIT
unzip -q "$ZIP" -d "$tmp"
src="$tmp"; [[ -d "$tmp/Logisticgame" ]] && src="$tmp/Logisticgame"
GAL="$REPO/data/logistics-vehicle-gallery.json"; keep=""
if [[ -f "$GAL" ]]; then keep="$tmp/gallery-server.json"; cp "$GAL" "$keep"; fi
cp -a "$src"/. "$REPO"/
if [[ -n "$keep" ]]; then node -e 'const fs=require("fs"),[a,b,root]=process.argv.slice(1);const zip=JSON.parse(fs.readFileSync(a)),srv=JSON.parse(fs.readFileSync(b));for(const [k,v] of Object.entries(srv)){if(v&&v.path&&fs.existsSync(root+"/public"+v.path)&&v.match!=="symbol"&&v.match!=="illustration")zip[k]=v;}fs.writeFileSync(a,JSON.stringify(zip,null,1));' "$GAL" "$keep" "$REPO" || cp "$keep" "$GAL"; fi
(cd "$REPO" && timeout 900 node scripts/fetch-vehicle-photos.mjs --quiet-if-complete) || echo "(Fotoimport übersprungen)"
git add -A
if git diff --cached --quiet; then echo "Keine Änderungen gegenüber GitHub."; else
  git -c user.name="testererrewr" -c user.email="testererrewr@users.noreply.github.com" commit -qm "Update $(basename "$ZIP" .zip)"
  git config credential.helper store
  git push
fi
if [[ -d /opt/logistik/app-test && "${ROLLOUT:-test}" != "all" ]]; then
  echo "==> Update nur für die Testwelten (Testinstanz)"
  APP=/opt/logistik/app-test SERVICE=logistik-test bash /opt/logistik/app-test/deploy/update.sh
  echo
  echo "Testwelten laufen mit dem neuen Stand. Alle anderen Welten: Verwaltung -> Update für alle ausrollen"
  echo "(oder sofort für alle: ROLLOUT=all SKIP_BACKUP=1 bash $0 $ZIP)"
else
  bash /opt/logistik/app/deploy/update.sh
  if [[ -d /opt/logistik/app-test ]]; then APP=/opt/logistik/app-test SERVICE=logistik-test bash /opt/logistik/app-test/deploy/update.sh || true; fi
fi
