"""Erzeugt data/sea-grid.json: Wasser/Land-Raster (0,2°) für Schiffsrouten aus data/countries.json.
Kanäle und Meerengen, die im groben Raster zu schmal wären, werden als Wasser freigeschnitten."""
import json,sys
from PIL import Image,ImageDraw
RES=5  # Zellen je Grad -> 0,2°
W,H=360*RES,180*RES
img=Image.new('1',(W,H),0)  # 0 = Wasser, 1 = Land
d=ImageDraw.Draw(img)
def px(lon,lat):return ((lon+180)*RES,(90-lat)*RES)
for c in json.load(open('data/countries.json')):
    g=c['geometry'];polys=g['coordinates'] if g['type']=='MultiPolygon' else [g['coordinates']]
    for poly in polys:
        outer=poly[0]
        if len(outer)>2:d.polygon([px(x,y) for x,y in outer],fill=1)
        for hole in poly[1:]:
            if len(hole)>2:d.polygon([px(x,y) for x,y in hole],fill=0)
# Polareis: kein Seeweg nördlich 72° N bzw. südlich 62° S (Handelsschiffe fahren über Suez/Panama/Kap)
d.rectangle([0,0,W,int((90-72)*RES)],fill=1)
d.rectangle([0,int((90+62)*RES),W,H],fill=1)
# Wasserstraßen (lat,lon)-Polylinien
CANALS=[
 [(31.50,32.30),(31.00,32.32),(30.60,32.33),(30.00,32.57),(29.40,32.75),(28.60,33.10),(27.80,33.70)],  # Suezkanal + Golf von Suez
 [(9.40,-79.92),(9.10,-79.70),(8.90,-79.53)],                         # Panamakanal
 [(41.45,29.25),(41.20,29.10),(41.00,28.98),(40.85,28.95)],            # Bosporus
 [(40.85,28.95),(40.70,27.80),(40.45,26.75)],                         # Marmarameer
 [(40.45,26.75),(40.20,26.40),(39.90,26.00)],                         # Dardanellen
 [(36.00,-6.20),(35.97,-5.60),(36.05,-5.20)],                         # Gibraltar
 [(56.60,12.30),(56.15,12.60),(55.85,12.70),(55.55,12.85),(55.20,12.95),(54.90,13.10)],  # Kattegat-Öresund-Ostsee
 [(56.30,11.20),(55.70,10.95),(55.35,11.05),(54.90,11.05),(54.55,11.20)],  # Großer Belt-Fehmarnbelt
 [(54.37,10.14),(54.20,9.80),(53.89,9.14)],                           # Nord-Ostsee-Kanal
 [(38.30,15.64),(38.10,15.60),(37.95,15.55)],                         # Straße von Messina
 [(1.20,103.50),(1.22,103.85),(1.30,104.20)],                         # Singapurstraße
 [(12.75,43.30),(12.55,43.40),(12.40,43.55)],                         # Bab el-Mandeb
 [(26.60,56.20),(26.40,56.50)],                                       # Hormus
 [(51.05,1.45),(50.95,1.60)],                                         # Dover
 [(45.40,12.40),(45.30,12.55)],                                       # Venedig Lagune
]
for line in CANALS:
    d.line([px(lon,lat) for lat,lon in line],fill=0,width=3)
# Zeilenweise Lauflängen (beginnend mit Wasser)
rows=[]
pix=img.load()
for y in range(H):
    runs=[];cur=0;n=0
    for x in range(W):
        v=pix[x,y]
        if v==cur:n+=1
        else:runs.append(n);cur=v;n=1
    runs.append(n);rows.append(runs)
json.dump({'res':RES,'w':W,'h':H,'source':'data/countries.json (Ländergrenzen) + freigeschnittene Kanäle/Meerengen','rows':rows},open('data/sea-grid.json','w'),separators=(',',':'))
img.convert('L').resize((W//2,H//2)).save(sys.argv[1] if len(sys.argv)>1 else 'sea-grid.png')
