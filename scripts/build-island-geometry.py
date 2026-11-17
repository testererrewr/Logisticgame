"""Build island outlines from Natural Earth 1:10m land (public domain).
Usage: python scripts/build-island-geometry.py source.geojson
Requires shapely. Continental pieces are dissolved before classification.
"""
import json,sys,hashlib
from pathlib import Path
from shapely.geometry import shape,Point
from shapely.ops import unary_union
source=Path(sys.argv[1]);raw=json.loads(source.read_text('utf-8'))
land=unary_union([shape(f['geometry']) for f in raw['features']])
parts=list(land.geoms)
# The four large connected continental landmasses, plus Eurasia west of -180.
continents=set(sorted(range(len(parts)),key=lambda i:parts[i].area,reverse=True)[:4])
chukotka=next(i for i,p in enumerate(parts) if p.covers(Point(-173,66)))
continents.add(chukotka)
rows=[]
for i,p in enumerate(parts):
 if i in continents:continue
 # About 100m simplification; runtime allows 150m at the coastline.
 p=p.simplify(.001,preserve_topology=True)
 polys=list(p.geoms) if p.geom_type=='MultiPolygon' else [p]
 for poly in polys:
  rings=[list(poly.exterior.coords)]+[list(r.coords) for r in poly.interiors]
  encoded=[]
  for ring in rings:
   last=(0,0);deltas=[]
   for x,y in ring:
    point=(round(x*10000),round(y*10000));deltas.append([point[0]-last[0],point[1]-last[1]]);last=point
   encoded.append(deltas)
  rows.append([[round(x,4) for x in poly.bounds],encoded])
out=Path('data/island-geometry.json');out.write_text(json.dumps(rows,separators=(',',':')),'utf-8')
print('Island polygons:',len(rows),'bytes:',out.stat().st_size,'source SHA256:',hashlib.sha256(source.read_bytes()).hexdigest())
