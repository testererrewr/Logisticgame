import json,sqlite3,tempfile,sys
from pathlib import Path
sys.path.insert(0,str(Path(__file__).resolve().parent));from full_game_sql import write_d1_sql
root=Path('.sites-runtime/tests').resolve()
with tempfile.TemporaryDirectory(dir=root,prefix='sql-restore-') as tmp:
 assert Path(tmp).resolve().is_relative_to(root)
 db=sqlite3.connect(':memory:');db.executescript('CREATE TABLE users(id TEXT PRIMARY KEY);CREATE TABLE aaa_world(id TEXT PRIMARY KEY,owner TEXT NOT NULL REFERENCES users(id),state TEXT NOT NULL CHECK(json_valid(state)));CREATE UNIQUE INDEX idx_world ON aaa_world(id);')
 payload=json.dumps({'data':"ä€漢字'"*60000,'zero':'\x00'},ensure_ascii=False);db.execute('INSERT INTO users VALUES (?)',('owner',));db.execute('INSERT INTO aaa_world VALUES (?,?,?)',('w','owner',payload));db.commit();schema=[dict(zip(['type','name','tbl_name','sql'],r)) for r in db.execute("SELECT type,name,tbl_name,sql FROM sqlite_master WHERE sql IS NOT NULL AND name NOT LIKE 'sqlite_%' ORDER BY type,name")];path=Path(tmp)/'backup.sql';write_d1_sql(db,path,schema);sql=path.read_text(encoding='utf-8');restored=sqlite3.connect(':memory:');restored.execute('PRAGMA foreign_keys=ON');statement='';count=0
 for line in sql.splitlines(keepends=True):
  statement+=line
  if sqlite3.complete_statement(statement):assert len(statement.encode('utf-8'))<=100000;restored.execute(statement);statement='';count+=1
 assert not statement.strip();assert restored.execute('SELECT state FROM aaa_world').fetchone()[0]==payload;assert restored.execute('PRAGMA foreign_key_check').fetchall()==[];assert restored.execute('PRAGMA integrity_check').fetchone()[0]=='ok';assert not restored.execute("SELECT name FROM sqlite_master WHERE name='__weltverbund_restore_chunks'").fetchone();print('PASS portable SQL: parent-first foreign keys, valid large JSON with Unicode/quotes/zero byte, bounded statements, exact text restoration and staging cleanup ('+str(count)+' statements).')
