"""Package tracked source, the matching complete build and a validated live database into one private ZIP."""
import argparse,hashlib,json,subprocess,sys,tempfile,zipfile
from pathlib import Path
p=argparse.ArgumentParser();p.add_argument('--backup',required=True);p.add_argument('--out',required=True);p.add_argument('--version',required=True);a=p.parse_args();root=Path(__file__).resolve().parents[1];out=Path(a.out).resolve();backup=Path(a.backup).resolve()
if out.exists():raise SystemExit('Ziel-ZIP existiert bereits; keine Datei wird überschrieben.')
if not (root/'dist/server/index.js').exists():raise SystemExit('Fertiger Build fehlt.')
out.parent.mkdir(parents=True,exist_ok=True)
with tempfile.TemporaryDirectory(prefix='weltverbund-pack-',dir=out.parent) as temp:
 work=Path(temp).resolve();assert work.is_relative_to(out.parent)
 subprocess.run([sys.executable,str(root/'scripts/restore-full-game.py'),str(backup),str(work/'game.sqlite')],check=True,capture_output=True,text=True,encoding='utf-8')
 manifest=json.loads((work/'game.manifest.json').read_text(encoding='utf-8'));commit=subprocess.check_output(['git','rev-parse','HEAD'],cwd=root,text=True).strip();tracked=subprocess.check_output(['git','ls-files','-z'],cwd=root).decode().split('\0');checks=[]
 with zipfile.ZipFile(out,'w',compression=zipfile.ZIP_DEFLATED,compresslevel=6) as z:
  def add(path,name):
   h=hashlib.sha256()
   with path.open('rb') as src,z.open(name,'w',force_zip64=True) as dest:
    while data:=src.read(1024*1024):h.update(data);dest.write(data)
   checks.append(h.hexdigest()+'  '+name)
  def text(name,value):
   data=value.encode('utf-8');z.writestr(name,data);checks.append(hashlib.sha256(data).hexdigest()+'  '+name)
  for name in tracked:
   if name and (root/name).is_file():add(root/name,'game/'+name)
  for file in (root/'dist').rglob('*'):
   if file.is_file():add(file,'game/'+file.relative_to(root).as_posix())
  add(backup,'data/live-backup.jsonl.gz')
  for name in ['game.sqlite','game.sql','game.manifest.json']:add(work/name,'data/'+name)
  text('data/resume-clock.sql',"UPDATE logistics_worlds SET last_tick=CAST((julianday('now')-2440587.5)*86400000 AS INTEGER);\n")
  add(root/'FULL-GAME-RESTORE.md','START-HIER.md')
  text('DELIVERY.json',json.dumps({'version':a.version,'commit':commit,'backup':manifest},ensure_ascii=False,indent=2)+'\n')
  z.writestr('SHA256SUMS.txt','\n'.join(checks)+'\n')
 with zipfile.ZipFile(out) as z:
  bad=z.testzip()
  if bad:raise RuntimeError('ZIP-Prüfung fehlgeschlagen: '+bad)
 print(json.dumps({'zip':str(out),'bytes':out.stat().st_size,'sha256':hashlib.file_digest(out.open('rb'),'sha256').hexdigest(),'tables':len(manifest['tables']),'rows':manifest['rows'],'backupCreated':manifest['created'],'commit':commit},ensure_ascii=False))
