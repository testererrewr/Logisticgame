#!/usr/bin/env bash
# Richtet die Testinstanz ein: Testwelten bekommen Updates sofort, alle anderen erst per „Update für alle ausrollen“.
set -euo pipefail
[[ $EUID -eq 0 ]] || { echo "Bitte mit sudo ausführen." >&2; exit 1; }
SRC=/opt/logistik/app; DST=/opt/logistik/app-test; ENVF=/etc/logistik/logistik.env
[[ -d "$SRC/.git" ]] || { echo "$SRC fehlt." >&2; exit 1; }
set -a; . "$ENVF"; set +a
TEST_PORT="${TEST_PORT:-8788}"; BIND_IP="${BIND_IP:-127.0.0.1}"
command -v rsync >/dev/null || apt-get install -y rsync >/dev/null
echo "==> Kopiere Hauptinstanz nach $DST"
rsync -a --delete --exclude dist.prev "$SRC"/ "$DST"/
chown -R logistik:logistik "$DST"
grep -q '^LOGISTIK_SPLIT=' "$ENVF" || echo 'LOGISTIK_SPLIT=1' >> "$ENVF"
grep -q '^TEST_PORT=' "$ENVF" || echo "TEST_PORT=$TEST_PORT" >> "$ENVF"
install -m 644 "$SRC"/deploy/systemd/*.service "$SRC"/deploy/systemd/*.timer /etc/systemd/system/
systemctl daemon-reload
systemctl enable --now logistik-test logistik-rollout.timer
systemctl restart logistik
echo
echo "Fertig. Testinstanz läuft auf $BIND_IP:$TEST_PORT."
echo
echo "Jetzt im Caddy (Docker) den Block für die Domain so ersetzen und Caddy neu laden:"
echo
echo "${DOMAIN:-play.crackgaming.org} {"
echo "	encode zstd gzip"
echo "	@test header_regexp Cookie lgx_inst=test"
echo "	handle @test {"
echo "		reverse_proxy $BIND_IP:$TEST_PORT"
echo "	}"
echo "	handle {"
echo "		reverse_proxy $BIND_IP:${PORT:-8787}"
echo "	}"
echo "}"
echo
echo "Danach in der Verwaltung bei einer Welt „🧪 Testwelt“ anhaken."
