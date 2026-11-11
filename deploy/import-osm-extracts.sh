#!/usr/bin/env bash
# Betriebsregister aus fertigen OpenStreetMap-Länderdateien (Geofabrik) statt Overpass-Einzelabfragen.
# Jede Region: Download (.osm.pbf, mit MD5-Prüfung) → osmium filtert die relevanten Objekte → Import in die Spieldatenbank → Datei löschen.
# Fortsetzbar: fertige Regionen werden übersprungen. Läuft, während das Spiel weiterläuft.
#
#   sudo bash /opt/logistik/app/deploy/import-osm-extracts.sh welt --hintergrund     # ganze Welt im Hintergrund
#   sudo bash /opt/logistik/app/deploy/import-osm-extracts.sh austria germany        # nur bestimmte Länder
#   sudo bash /opt/logistik/app/deploy/import-osm-extracts.sh liste                  # verfügbare Regionen
#   sudo bash /opt/logistik/app/deploy/import-osm-extracts.sh status                 # Fortschritt, Fehler, Speicherplatz
#   sudo bash /opt/logistik/app/deploy/import-osm-extracts.sh neu-einordnen          # vorhandene Betriebe nach aktuellen Regeln neu einordnen
#   Optionen: --neu (fertige Regionen erneut laden) · --abschliessen (Overpass-Weltimport danach als fertig markieren)
set -uo pipefail
[[ $EUID -eq 0 ]] || { echo "Bitte mit sudo ausführen." >&2; exit 1; }
APP="${APP:-/opt/logistik/app}"
[[ -f /etc/logistik/logistik.env ]] && { set -a; . /etc/logistik/logistik.env; set +a; }
STATE_DIR="${STATE_DIR:-/var/lib/logistik/state}"
WORK="${OSM_WORK:-/var/lib/logistik/osm-extrakte}"
LOG="$WORK/import.log"; ERR="$WORK/fehler.log"
mkdir -p "$WORK/fertig"

args=(); NEU=0; FINISH=0; BG=0
for a in "$@"; do case "$a" in --neu) NEU=1;; --abschliessen) FINISH=1;; --hintergrund) BG=1;; *) args+=("$a");; esac; done
[[ ${#args[@]} -gt 0 ]] || { sed -n '2,12p' "$0"; exit 1; }

if [[ $BG -eq 1 ]]; then
  pass=("${args[@]}"); [[ $NEU -eq 1 ]] && pass+=(--neu); [[ $FINISH -eq 1 ]] && pass+=(--abschliessen)
  systemctl reset-failed logistik-osm-import 2>/dev/null || true
  systemd-run --unit=logistik-osm-import --collect --property=Nice=10 --property=IOSchedulingClass=idle bash "$(realpath "$0")" "${pass[@]}"
  echo "Import läuft im Hintergrund (auch nach dem Abmelden)."
  echo "  Live mitlesen:  journalctl -u logistik-osm-import -f"
  echo "  Fortschritt:    sudo bash $(realpath "$0") status"
  echo "  Abbrechen:      systemctl stop logistik-osm-import   (später einfach neu starten, fertige Länder werden übersprungen)"
  exit 0
fi

exec 3>&1  # fd 3 = Konsole/Journal (Fortschritt), nicht ins Fehlerlog
ts(){ date '+%Y-%m-%d %H:%M:%S'; }
storage(){ # Speicherplatz des Servers und Größe der Spieldatenbank
  local dbf; dbf="$(find "$STATE_DIR" -name '*.sqlite' ! -name 'metadata.sqlite' 2>/dev/null | head -1)"
  df -h --output=size,used,avail,pcent "${WORK:-/}" | tail -1 | awk '{printf "Speicher: %s belegt von %s (%s) · frei %s", $2,$1,$4,$3}'
  [[ -n "$dbf" ]] && printf ' · Spieldatenbank %s' "$(du -h "$dbf" | cut -f1)"
  [[ -n "$dbf" && -f "$dbf-wal" ]] && printf ' (+ %s WAL)' "$(du -h "$dbf-wal" | cut -f1)"
  echo
}
log(){ echo "[$(ts)] $*" | tee -a "$LOG"; }
fail(){ echo "[$(ts)] FEHLER $*" | tee -a "$LOG" >> "$ERR"; }

if [[ "${args[0]}" == "status" ]]; then
  S0=$(cat "$WORK/neu-seit" 2>/dev/null || echo 0); echo "Fertige Regionen: $(find "$WORK/fertig" -name '*.ok' -newermt "@$S0" 2>/dev/null | wc -l)"
  echo "Aktuelle Region: $(grep -o '\[[0-9]*/[0-9]*\] .*' "$LOG" 2>/dev/null | tail -1)"
  for f in "$WORK"/*.osm.pbf; do [[ -f "$f" ]] && echo "Download läuft: $(basename "$f") · $(du -h "$f" | cut -f1) · zuletzt geändert $(( $(date +%s)-$(stat -c %Y "$f") )) s her"; done
  pgrep -a -f 'wget|osmium|sqlite3' 2>/dev/null | grep -v pgrep | cut -c1-160 | sed 's/^/Prozess: /' 
  [[ -f "$WORK/regionen.txt" ]] && echo "Geplante Regionen: $(wc -l < "$WORK/regionen.txt")"
  echo "Laufender Dienst: $(systemctl is-active logistik-osm-import 2>/dev/null || echo nein)"
  storage
  DB="$(find "$STATE_DIR" -name '*.sqlite' ! -name 'metadata.sqlite' 2>/dev/null | head -1)"
  [[ -n "$DB" ]] && echo "Betriebe im Register: $(sqlite3 "$DB" 'SELECT count(*) FROM logistics_partner_registry' 2>/dev/null)"
  echo; echo "Letzte Meldungen:"; tail -n 15 "$LOG" 2>/dev/null
  [[ -s "$ERR" ]] && { echo; echo "Letzte Fehler ($ERR):"; tail -n 20 "$ERR"; }
  exit 0
fi

need=(); command -v osmium >/dev/null || need+=(osmium-tool); command -v sqlite3 >/dev/null || need+=(sqlite3); command -v wget >/dev/null || need+=(wget); command -v curl >/dev/null || need+=(curl)
if [[ ${#need[@]} -gt 0 ]]; then log "Installiere ${need[*]} …"; apt-get update -y >>"$LOG" 2>&1; apt-get install -y "${need[@]}" >>"$LOG" 2>&1 || { fail "Paketinstallation fehlgeschlagen: ${need[*]} (Details in $LOG)"; exit 1; }; fi
command -v node >/dev/null || { fail "node nicht gefunden"; exit 1; }
[[ -f "$APP/scripts/osm-extract-import.mjs" ]] || { fail "$APP/scripts/osm-extract-import.mjs fehlt – zuerst das Update installieren."; exit 1; }
DB="$(find "$STATE_DIR" -name '*.sqlite' ! -name 'metadata.sqlite' | head -1)"
[[ -n "$DB" ]] || { fail "Spieldatenbank in $STATE_DIR nicht gefunden"; exit 1; }
DB_USER="$(stat -c %U "$DB")"
sql(){ runuser -u "$DB_USER" -- sqlite3 -bail -cmd ".timeout 60000" "$DB" "$@"; }
sql "PRAGMA busy_timeout=60000; SELECT 1;" >/dev/null || { fail "Datenbank $DB nicht beschreibbar als $DB_USER"; exit 1; }
sql "CREATE TABLE IF NOT EXISTS logistics_partner_registry(id TEXT PRIMARY KEY,kind TEXT NOT NULL,name TEXT NOT NULL,lat REAL NOT NULL,lon REAL NOT NULL,payload TEXT NOT NULL,loaded INTEGER NOT NULL);" 2>>"$ERR" || true

if [[ "${args[0]}" == "neu-einordnen" ]]; then
  log "Ordne vorhandene Betriebe neu ein …"
  printf '.mode list\n.separator "\x1f"\nSELECT id,payload FROM logistics_partner_registry;\n' | sql > "$WORK/register.tmp" || { fail "Register konnte nicht gelesen werden"; exit 1; }
  (cd "$APP" && node --no-warnings --experimental-strip-types --import ./scripts/ts-resolve.mjs scripts/reclassify-registry.mjs < "$WORK/register.tmp" 2> >(tee -a "$LOG" >&3)) | sql || fail "Neu-Einordnung fehlgeschlagen"
  rm -f "$WORK/register.tmp"
  log "$(storage)"; exit 0
fi
log "Lade Geofabrik-Regionsverzeichnis …"
if ! wget -q --tries=5 --waitretry=20 -O "$WORK/index.json.tmp" https://download.geofabrik.de/index-v1-nogeom.json; then
  [[ -s "$WORK/index.json" ]] && log "Verzeichnis nicht erreichbar – verwende gespeicherte Kopie." || { fail "Geofabrik-Verzeichnis nicht erreichbar (Netzwerk/DNS prüfen: curl -I https://download.geofabrik.de)"; exit 1; }
else mv "$WORK/index.json.tmp" "$WORK/index.json"; fi

if [[ "${args[0]}" == "liste" ]]; then node "$APP/scripts/osm-extract-regions.mjs" "$WORK/index.json" liste | column -t -s $'\t'; exit 0; fi
node "$APP/scripts/osm-extract-regions.mjs" "$WORK/index.json" "${args[@]}" > "$WORK/regionen.txt" || { fail "Regionsauswahl fehlgeschlagen: ${args[*]}"; exit 1; }
TOTAL=$(wc -l < "$WORK/regionen.txt"); log "Plan: $TOTAL Regionen · Arbeitsordner $WORK · Datenbank $DB"

# Overpass-Weltimport pausieren, damit er nicht parallel dieselben Daten abfragt
sql "UPDATE logistics_runtime SET payload=json_set(payload,'\$.enabled',json('false')) WHERE id='world-import-v10';" 2>>"$ERR" && log "Overpass-Weltimport pausiert (Admin → Betriebsregister)."

FILTER=(nwr/shop nwr/craft nwr/industrial nwr/forestry nwr/farm nwr/building=warehouse
  nwr/office=logistics,transport,forestry,forest_management
  nwr/amenity=restaurant,cafe,fast_food,pub,bar,hospital,clinic,pharmacy,doctors,dentist,veterinary,recycling,fuel,marketplace,social_facility,nursing_home
  nwr/landuse=farmyard,quarry,industrial,forest nwr/man_made=works,mineshaft,adit,petroleum_well,water_works)

ok=0; START=$(date +%s)
mkdir -p "$WORK/fertig"; [[ $NEU -eq 1 ]] && { date +%s > "$WORK/neu-seit"; chown --reference="$WORK" "$WORK/neu-seit" 2>/dev/null || true; log "Kompletter Neuimport: alle Regionen werden neu geprüft. Ein Abbruch ist kein Problem – ohne --neu neu starten, dann geht es an der Stelle weiter."; }
SINCE=$(cat "$WORK/neu-seit" 2>/dev/null || echo 0); NEU=0
done_ok(){ [[ -f "$1" ]] && (( $(stat -c %Y "$1") >= SINCE )); }
for pass in 1 2 3; do
n=0; failed=0
[[ $pass -gt 1 ]] && { log "Wiederholungsrunde $pass für fehlgeschlagene Regionen (nach 5 Minuten Pause) …"; sleep 300; }
while IFS=$'\t' read -r id url; do
  n=$((n+1)); fid="${id//\//_}"; mark="$WORK/fertig/$fid.ok"
  if done_ok "$mark"; then continue; fi
  log "[$n/$TOTAL] $id"
  pbf="$WORK/$fid.osm.pbf"; flt="$WORK/$fid.filtered.osm.pbf"; geo="$WORK/$fid.geojsonseq"; t0=$(date +%s)
  size=$(curl -sIL -m 30 --retry 2 "$url" | awk 'tolower($1)=="content-length:"{v=$2} END{gsub("\r","",v); print v+0}')
  free=$(df --output=avail -B1 "$WORK" | tail -1)
  if [[ ${size:-0} -gt 0 && $free -lt $((size*3)) ]]; then fail "$id: zu wenig Speicher (frei $((free/1024/1024)) MB, benötigt ca. $((size*3/1024/1024)) MB) – übersprungen"; failed=$((failed+1)); continue; fi
  good=0; log "  lade $(( ${size:-0}/1024/1024 )) MB …"
  for try in 1 2 3; do
    timeout --kill-after=30 $(( 900 + ${size:-0}/200000 )) wget -q -c --tries=8 --waitretry=20 --timeout=60 -O "$pbf" "$url" 2>>"$ERR"; rc=$?; [[ $rc -eq 124 || $rc -eq 137 ]] && log "  Download hängt – Abbruch nach Zeitlimit, neuer Versuch (Datei wird fortgesetzt)"; if [[ $rc -ne 0 || ! -s "$pbf" ]]; then fail "$id: Download fehlgeschlagen (Versuch $try, wget-Code $rc) $url"; sleep $((try*60)); continue; fi
    want=$(timeout 90 wget -q --tries=3 --timeout=30 -O - "$url.md5" 2>/dev/null | awk '{print $1}'); have=$(md5sum "$pbf" | awk '{print $1}')
    if [[ -n "$want" && "$want" != "$have" ]]; then fail "$id: Prüfsumme falsch (erwartet $want, erhalten $have) – lade neu"; rm -f "$pbf"; sleep 30; continue; fi
    good=1; break
  done
  [[ $good -eq 1 ]] || { failed=$((failed+1)); rm -f "$pbf"; continue; }
  log "  heruntergeladen: $(du -h "$pbf" | cut -f1) in $(( $(date +%s)-t0 )) s · filtere …"
  if ! osmium tags-filter "$pbf" "${FILTER[@]}" -o "$flt" --overwrite 2>>"$ERR"; then fail "$id: osmium tags-filter fehlgeschlagen (Datei evtl. beschädigt – wird beim nächsten Lauf neu geladen)"; rm -f "$pbf" "$flt"; failed=$((failed+1)); continue; fi
  rm -f "$pbf"
  if ! osmium export "$flt" -f geojsonseq -a type,id --geometry-types=point,linestring,polygon -o "$geo" --overwrite 2>>"$WORK/osmium-export.log"; then fail "$id: osmium export fehlgeschlagen (Details: $WORK/osmium-export.log)"; rm -f "$flt" "$geo"; failed=$((failed+1)); continue; fi
  rm -f "$flt"
  before=$(sql "SELECT count(*) FROM logistics_partner_registry;" 2>/dev/null || echo 0)
  if ! (cd "$APP" && node --no-warnings --experimental-strip-types --import ./scripts/ts-resolve.mjs scripts/osm-extract-import.mjs "$geo" "$id" 2> >(tee -a "$LOG" >/dev/null) | sql) 2>>"$ERR"; then fail "$id: Datenbankimport fehlgeschlagen (Details in $ERR)"; rm -f "$geo"; failed=$((failed+1)); continue; fi
  after=$(sql "SELECT count(*) FROM logistics_partner_registry;" 2>/dev/null || echo 0)
  rm -f "$geo"; ok=$((ok+1))
  echo "$(ts) neu: $((after-before)) · Register gesamt: $after" > "$mark"
  elapsed=$(( $(date +%s)-START )); done_n=$(find "$WORK/fertig" -name '*.ok' -newermt "@$SINCE" | wc -l)
  log "  fertig in $(( $(date +%s)-t0 )) s · +$((after-before)) neue Betriebe · Register: $after · Fortschritt $done_n/$TOTAL"
  log "  $(storage)"
done < "$WORK/regionen.txt"
[[ $failed -eq 0 ]] && break
done

log "Durchlauf beendet: $ok Regionen importiert, $failed fehlgeschlagen, $(find "$WORK/fertig" -name '*.ok' -newermt "@$SINCE" | wc -l)/$TOTAL insgesamt fertig."
log "$(storage)"
if [[ $failed -gt 0 ]]; then log "Fehlgeschlagene Regionen: einfach denselben Befehl erneut starten (fertige werden übersprungen). Details: $ERR"; fi

if [[ $FINISH -eq 1 || ( "${args[0]}" == "welt" && $failed -eq 0 ) ]]; then
  now=$(( $(date +%s)*1000 ))
  sql "PRAGMA busy_timeout=60000;
INSERT INTO logistics_runtime(id,updated,payload) VALUES('world-import-v10',$now,'{}') ON CONFLICT(id) DO NOTHING;
UPDATE logistics_runtime SET updated=$now,payload=json_set(payload,'\$.enabled',json('false'),'\$.cursor',61200,'\$.completedRoots',61200,'\$.completedArea',61200,'\$.pending',json('[]'),'\$.attempt',0,'\$.nextTry',0,'\$.lastError','Durch Geofabrik-Extraktimport ersetzt','\$.updated',$now) WHERE id='world-import-v10';
INSERT OR REPLACE INTO logistics_loaded_areas(id,loaded,source,count) WITH RECURSIVE n(i) AS (SELECT 0 UNION ALL SELECT i+1 FROM n WHERE i<61199) SELECT 'world-root-v10:'||i,$now,'Geofabrik OSM-Extrakt',0 FROM n;" 2>>"$ERR" \
   && log "Weltimport als vollständig markiert: Die Karte fragt keine Overpass-Gebiete mehr ab." || fail "Abschluss-Markierung fehlgeschlagen"
fi
log "Kartenübersicht neu berechnen …"; bash "$APP/deploy/partner-maintenance.sh" raster >>"$LOG" 2>&1 || fail "Kartenübersicht konnte nicht berechnet werden"
[[ $failed -eq 0 ]]
