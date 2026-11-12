#!/usr/bin/env bash
# Richtet die tägliche Sicherung auf einem zweiten Server ein.
#   sudo bash /opt/logistik/app/deploy/offsite-setup.sh root@backup.example.org:/srv/logistik-backups
set -euo pipefail
[[ $EUID -eq 0 ]] || { echo "Bitte mit sudo ausführen." >&2; exit 1; }
TARGET="${1:?Ziel angeben, z. B. root@1.2.3.4:/srv/logistik-backups}"; HOST="${TARGET%%:*}"; DIR="${TARGET#*:}"
ENVF=/etc/logistik/logistik.env; KEY=/root/.ssh/logistik_backup
[[ -f "$KEY" ]] || ssh-keygen -q -t ed25519 -N '' -f "$KEY" -C logistik-backup
echo "==> Schlüssel auf $HOST hinterlegen (einmalig Passwort eingeben)"
ssh-copy-id -i "$KEY.pub" -o StrictHostKeyChecking=accept-new "$HOST"
ssh -i "$KEY" "$HOST" "mkdir -p '$DIR'"
sed -i '/^BACKUP_REMOTE=/d;/^BACKUP_KEEP=/d' "$ENVF"; { echo "BACKUP_REMOTE=$TARGET"; echo "BACKUP_KEEP=${BACKUP_KEEP:-5}"; } >> "$ENVF"
install -m 644 /opt/logistik/app/deploy/systemd/logistik-offsite.service /opt/logistik/app/deploy/systemd/logistik-offsite.timer /etc/systemd/system/
systemctl daemon-reload; systemctl enable --now logistik-offsite.timer
echo "==> Erste Sicherung läuft …"; bash /opt/logistik/app/deploy/offsite-backup.sh
echo "Fertig. Ab jetzt täglich um 03:40. Wiederherstellen: sudo bash /opt/logistik/app/deploy/offsite-restore.sh"
