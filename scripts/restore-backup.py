"""Restore into a NEW local SQLite file. Does not connect to production."""
import argparse,json,sqlite3,gzip,base64
from pathlib import Path
p=argparse.ArgumentParser();p.add_argument('backup');p.add_argument('database');p.add_argument('--editable-worlds',action='store_true');a=p.parse_args();root=Path(a.backup);target=Path(a.database)
if target.exists():raise SystemExit('Refusing to overwrite an existing database.')
m=json.loads((root/'manifest.json').read_text(encoding='utf-8'));db=sqlite3.connect(target);db.execute('PRAGMA foreign_keys=OFF')
for entry in m['schema']:
 if entry['type']=='table':db.execute(entry['sql'])
for table in m['tables']:
 for page in sorted((root/'tables'/table).glob('*.json')):
  for row in json.loads(page.read_text(encoding='utf-8')):
   if table=='worlds' and a.editable_worlds:
    edited=root/'editable-worlds'/(row['id']+'.json')
    if edited.exists():
     e=json.loads(edited.read_text(encoding='utf-8'));row.update(e);row['state']='gz:'+base64.b64encode(gzip.compress(json.dumps(e['state'],ensure_ascii=False,separators=(',',':')).encode())).decode();row['config']=json.dumps(e['config'],ensure_ascii=False)
   names=list(row);cols=','.join('"'+n.replace('"','""')+'"' for n in names);marks=','.join('?' for _ in names);db.execute('INSERT INTO "'+table+'" ('+cols+') VALUES ('+marks+')',[row[n] for n in names])
for entry in m['schema']:
 if entry['type'] in ['index','trigger','view']:db.execute(entry['sql'])
db.commit();target.with_suffix('.sql').write_text('\n'.join(db.iterdump()),encoding='utf-8');print('Restored',len(m['tables']),'tables into',target);print(db.execute('PRAGMA integrity_check').fetchone()[0]);db.close()
