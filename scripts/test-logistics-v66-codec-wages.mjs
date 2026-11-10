import assert from 'node:assert/strict';
import {encodeCompany,decodeCompany,compactState} from '../lib/logistics/company-codec.ts';
import {newState,build} from '../lib/logistics/engine.ts';
import {wageFor,CREW_ROLES,LEVEL_HOURS} from '../lib/logistics/drivers.ts';

const s=newState();const a=build(s,'depot',47,15),b=build(s,'warehouseSmall',47.5,15.5);
s.lines.push({id:'l',name:'x',mode:'truck',good:'all',stops:[{siteId:a.id,action:'load',quantity:1},{siteId:b.id,action:'unload',quantity:1}],startDay:1,endDay:null,active:true,legs:[]});
const path=Array.from({length:20000},(_,i)=>[47+i*2e-5,15+Math.sin(i/40)*.01]);
for(let i=0;i<4;i++)s.lines[0].legs.push({fromId:a.id,toId:b.id,km:123.4,path,source:'osm-strassen'});
s.roadRoutes=[{fromId:'alt',toId:'weg',km:5,path,source:'osm-strassen'}];
const c=compactState(structuredClone(s),500);assert.equal(c.roadRoutes.length,0,'ungenutzte Routen entfernt');assert.ok(c.lines[0].legs[0].path.length<=500);assert.equal(c.lines[0].legs[0].km,123.4,'Kilometer bleiben');
const back=await decodeCompany(await encodeCompany(s));assert.equal(back.lines[0].legs.length,4);

assert.equal(wageFor('truck',0),CREW_ROLES.truck.wage);assert.equal(wageFor('truck',LEVEL_HOURS[4]),Math.round(CREW_ROLES.truck.wage*1.6));
console.log('PASS v66 Spielstand wird bei Übergröße automatisch verkleinert; Lohn steigt je Stufe um 15 %.');
