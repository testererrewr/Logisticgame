import fs from 'node:fs';
const manifest=JSON.parse(fs.readFileSync('data/logistics-vehicle-photos.json','utf8'));
const gallery=Object.fromEntries(Object.entries(manifest.models).filter(([,v])=>v.photo).map(([id,v])=>[id,v.photo]));
fs.writeFileSync('data/logistics-vehicle-gallery.json',JSON.stringify(gallery,null,2)+'\n');
console.log(`Vehicle photographs: ${Object.keys(gallery).length}`);

const equipment=JSON.parse(fs.readFileSync('data/logistics-equipment-photos.json','utf8'));
fs.writeFileSync('data/logistics-equipment-gallery.json',JSON.stringify({trailers:equipment.trailers,wagons:equipment.wagons},null,2)+'\n');
