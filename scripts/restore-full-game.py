"""Validate a complete owner download and restore it into a NEW SQLite database."""
import argparse,gzip,json,sqlite3,time
from pathlib import Path
from full_game_sql import write_d1_sql
p=argparse.ArgumentParser();p.add_argument('backup');p.add_argument('database');p.add_argument('--resume-clock',action='store_true');a=p.parse_args();target=Path(a.database)
if target.exists():raise SystemExit('Zieldatenbank existiert bereits; keine Datei wird überschrieben.')
manifest=None;complete=None;counts={};db=sqlite3.connect(target)
try:
 with gzip.open(a.backup,'rt',encoding='utf-8-sig') as stream:
  for line in stream:
   entry=json.loads(line)
   if entry['type']=='manifest':
    if manifest or entry.get('format')!='weltverbund-full-v1':raise ValueError('Ungültiges Sicherungsformat.')
    manifest=entry;db.execute('PRAGMA foreign_keys=OFF')
    for obj in manifest['schema']:
     if obj['type']=='table':db.execute(obj['sql'])
    counts={t:0 for t in manifest['tables']}
   elif entry['type']=='row':
    if not manifest or entry['table'] not in counts:raise ValueError('Unbekannte Tabelle.')
    row=entry['value'];columns=','.join('"'+k.replace('"','""')+'"' for k in row);name=entry['table'].replace('"','""');db.execute('INSERT INTO "'+name+'" ('+columns+') VALUES ('+','.join('?' for _ in row)+')',list(row.values()));counts[entry['table']]+=1
   elif entry['type']=='complete':complete=entry
 if not manifest or not complete or counts!=manifest['counts'] or counts!=complete['counts']:raise ValueError('Sicherung unvollständig oder Zeilenzahlen verändert. Export wiederholen.')
 for obj in manifest['schema']:
  if obj['type'] in ('index','trigger','view'):db.execute(obj['sql'])
 if a.resume_clock and 'logistics_worlds' in counts:db.execute('UPDATE logistics_worlds SET last_tick=?',(int(time.time()*1000),))
 db.commit();integrity=db.execute('PRAGMA integrity_check').fetchone()[0]
 if integrity!='ok':raise ValueError(integrity)
 foreign=db.execute('PRAGMA foreign_key_check').fetchall()
 if foreign:raise ValueError('Fremdschlüsselprüfung: '+str(len(foreign))+' Fehler')
 write_d1_sql(db,target.with_suffix('.sql'),manifest['schema'])
 summary={'format':manifest['format'],'created':manifest['created'],'finished':complete['finished'],'tables':counts,'rows':sum(counts.values()),'integrity':integrity,'foreignKeys':'ok','excluded':manifest['excluded'],'coreSnapshot':manifest['coreSnapshot']};target.with_suffix('.manifest.json').write_text(json.dumps(summary,ensure_ascii=False,indent=2),encoding='utf-8');print(json.dumps(summary,ensure_ascii=False))
except Exception:
 db.close()
 raise
finally:db.close()
