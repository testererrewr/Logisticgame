import assert from 'node:assert/strict';
import {onIsland} from '../lib/logistics/islands.ts';
import {islandSaleFactor} from '../lib/logistics/engine.ts';
const islands=[['London',51.5074,-.1278],['Dublin',53.3498,-6.2603],['Tokio',35.6762,139.6503],['Borneo',1.5533,110.3592],['Denpasar',-8.65,115.2167],['Phuket',7.8804,98.3923],['Malta',35.8989,14.5146],['Sylt',54.9079,8.3033],['Rügen',54.418,13.433],['Gotland',57.6348,18.2948],['Victoria',48.4284,-123.3656],['Honolulu',21.3099,-157.8581],['Teneriffa',28.4636,-16.2518],['Kopenhagen',55.6761,12.5683],['Wellington',-41.2865,174.7762],['Auckland',-36.8485,174.7633],['Hobart',-42.8821,147.3272],['Grönland',64.1814,-51.6941]];
const mainland=[['Linz',48.3059,14.2862],['Oslo',59.9139,10.7522],['Schweden',60,15],['Finnland',62,26],['Aarhus',56.1629,10.2039],['Reggio Calabria',38.1113,15.6473],['Sydney',-33.8688,151.2093],['Chukotka',66,-173],['Lima',-12.0464,-77.0428],['New York Festland',41,-74],['Kapstadt',-33.9249,18.4241]];
for(const [name,lat,lon] of islands){assert.equal(onIsland(lat,lon),true,name);assert.equal(islandSaleFactor({lat,lon}),1.35,name+' sale');assert.equal(onIsland(lat,lon+360),true,name+' world wrap');}
for(const [name,lat,lon] of mainland){assert.equal(onIsland(lat,lon),false,name);assert.equal(islandSaleFactor({lat,lon}),1,name+' sale');}
assert.equal(onIsland(NaN,0),false);assert.equal(onIsland(0,Infinity),false);
console.log('PASS islands:',islands.length,'mainland exclusions:',mainland.length,'shared sale bonus and map wrapping.');
