import assert from 'node:assert/strict';
import {profile,mineGoods,identifyPartner,businessType} from '../lib/logistics/engine.ts';
for(let i=0;i<200;i++){const site={id:'mine-'+i,kind:'mine',name:'Mine',lat:47,lon:15,tags:{}};const g=Object.keys(profile(site).production);assert.ok(g.length<=2,'höchstens 2 Rohstoffe: '+g);}
assert.deepEqual(mineGoods({id:'k',kind:'mine',name:'Braunkohle Tagebau',lat:0,lon:0,tags:{name:'Braunkohle Tagebau',resource:'coal'}})[0],'coal');
assert.ok(mineGoods({id:'q',kind:'mine',name:'Steinbruch',lat:0,lon:0,tags:{landuse:'quarry',name:'Kalksteinbruch Wopfing'}}).includes('limestone'));
assert.equal(identifyPartner({man_made:'works',name:'Molkerei Berglandmilch'}),'dairy');
assert.equal(identifyPartner({landuse:'industrial',name:'Schlachthof Graz'}),'slaughterhouse');
assert.equal(identifyPartner({landuse:'industrial',name:'Magna Steyr Fahrzeugtechnik'}),'automotive');
assert.equal(identifyPartner({landuse:'forest',name:'Forstbetrieb Steiermark'}),'forestry');
assert.equal(businessType({id:'x',kind:'factory',name:'',lat:0,lon:0,tags:{industrial:'heating_station'}}),'Heizwerk / Fernwärme');
console.log('PASS v67 Bergwerke höchstens 2 Rohstoffe (aus OSM-Angaben), Molkerei/Schlachthof/Fahrzeugindustrie/Forst erkannt, Betriebsart angezeigt.');
