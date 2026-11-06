import assert from 'node:assert/strict';
import {coordinatePlace,photonPlaces} from '../lib/places.ts';
import {tileAt,tileCenter,sphericalDistance} from '../lib/geography.ts';
assert.deepEqual(coordinatePlace('48.22144, 14.23681').point,[48.22144,14.23681]);
assert.deepEqual(coordinatePlace('-33.86;151.21').point,[-33.86,151.21]);
assert.equal(coordinatePlace('Traun Österreich'),null);
assert.throws(()=>coordinatePlace('91, 14'));
assert.throws(()=>coordinatePlace('48, 181'));
const points=[[48.22144,14.23681],[-33.86,151.21],[35.68,139.69],[-34.6,-58.38],[84.5,15],[-84.5,10]];
for(const point of points){const center=tileCenter(tileAt(point));assert.ok(center);assert.ok(sphericalDistance(point,center)<3000,'Arbitrary global tiles retain the chosen location');}
assert.equal(new Set(points.map(tileAt)).size,points.length);
assert.equal(tileCenter('geo_bad_1'),null);
const feature=(id,value,coordinates)=>({geometry:{type:'Point',coordinates},properties:{osm_type:'R',osm_id:id,name:'Traun',osm_value:value,state:'Oberösterreich',country:'Österreich'}});
const places=photonPlaces({features:[feature(1,'river',[13.8,47.9]),feature(2,'town',[14.23681,48.22144]),feature(2,'town',[14.23681,48.22144]),feature(3,'town',[181,40]),feature(4,'town',[0,NaN])]});
assert.equal(places.length,2);assert.match(places[0].label,/Fluss/);assert.match(places[1].label,/Stadt/);assert.deepEqual(places[1].point,[48.22144,14.23681]);
assert.throws(()=>photonPlaces({}));
console.log('PASS: worldwide coordinate lookup, arbitrary global map tiles, polar coverage, distinct river/town results and invalid geocoder data rejection.');
