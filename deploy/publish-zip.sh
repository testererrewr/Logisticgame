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
cp -a "$src"/. "$REPO"/
echo "==> Fahrzeugfotos von Wikimedia Commons ergänzen (falls noch fehlend)"
(cd "$REPO" && timeout 900 node scripts/fetch-vehicle-photos.mjs) || echo "(Fotoimport übersprungen)"
git add -A
if git diff --cached --quiet; then echo "Keine Änderungen gegenüber GitHub."; else
  git -c user.name="testererrewr" -c user.email="testererrewr@users.noreply.github.com" commit -qm "Update $(basename "$ZIP" .zip)"
  git config credential.helper store
  git push
fi
bash /opt/logistik/app/deploy/update.sh
