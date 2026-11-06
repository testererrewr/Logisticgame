"""Bounded SQLite/D1 dump with parent-first inserts and chunked large text cells."""
import math
MAX_SQL_BYTES=80000

def ident(value):return '"'+value.replace('"','""')+'"'
def literal(value):
 if value is None:return 'NULL'
 if isinstance(value,str):
  if '\x00' in value:return "CAST(X'"+value.encode('utf-8').hex()+"' AS TEXT)"
  return "'"+value.replace("'","''")+"'"
 if isinstance(value,bytes):return "X'"+value.hex()+"'"
 if isinstance(value,float) and not math.isfinite(value):raise ValueError('Non-finite database number')
 return str(value)

def write_d1_sql(db,path,schema):
 tables=[r['name'] for r in schema if r['type']=='table'];remaining=set(tables);order=[]
 while remaining:
  ready=sorted(t for t in remaining if not {r[2] for r in db.execute('PRAGMA foreign_key_list('+ident(t)+')')} & (remaining-{t}))
  if not ready:ready=sorted(remaining)
  order.extend(ready);remaining.difference_update(ready)
 with path.open('w',encoding='utf-8',newline='\n') as out:
  def emit(sql):
   if len(sql.encode('utf-8'))>100000:raise ValueError('SQL statement exceeds D1 limit')
   out.write(sql.rstrip(';')+';\n')
  emit('PRAGMA defer_foreign_keys=ON')
  for kind in ('table','index'):
   for obj in schema:
    if obj['type']==kind:emit(obj['sql'])
  buffer='__weltverbund_restore_chunks'
  if buffer in tables:raise ValueError('Reserved restore table already exists')
  emit('CREATE TABLE '+ident(buffer)+' (id INTEGER PRIMARY KEY,data TEXT NOT NULL)')
  for table in order:
   prefix='INSERT INTO '+ident(table)+' VALUES ';pending=[];size=len(prefix)
   def flush():
    nonlocal pending,size
    if pending:emit(prefix+','.join(pending));pending=[];size=len(prefix)
   for values in db.execute('SELECT * FROM '+ident(table)):
    cells=[literal(v) for v in values];row='('+','.join(cells)+')'
    if len((prefix+row).encode('utf-8'))>MAX_SQL_BYTES:
     flush();large=sorted((i for i,v in enumerate(values) if isinstance(v,str)),key=lambda i:len(cells[i].encode('utf-8')),reverse=True)
     staged=[]
     for i in large:
      # Hex chunks preserve Unicode, quotes and embedded zero bytes exactly.
      raw=values[i].encode('utf-8');emit('INSERT INTO '+ident(buffer)+"(id,data) VALUES ("+str(i)+",'')")
      for start in range(0,len(raw),30000):emit('UPDATE '+ident(buffer)+" SET data=CAST(CAST(data AS BLOB)||X'"+raw[start:start+30000].hex()+"' AS TEXT) WHERE id="+str(i))
      cells[i]='(SELECT data FROM '+ident(buffer)+' WHERE id='+str(i)+')';staged.append(i);row='('+','.join(cells)+')'
      if len((prefix+row).encode('utf-8'))<=MAX_SQL_BYTES:break
     emit(prefix+row);emit('DELETE FROM '+ident(buffer));continue
    added=len(row.encode('utf-8'))+1
    if pending and size+added>MAX_SQL_BYTES:flush()
    pending.append(row);size+=added
   flush()
  emit('DROP TABLE '+ident(buffer))
  for obj in schema:
   if obj['type'] in ('trigger','view'):emit(obj['sql'])
