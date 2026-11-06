import assert from 'node:assert/strict';
import React from 'react';
import {renderToStaticMarkup} from 'react-dom/server';
import {act} from '../lib/game.ts';
import {worldHref,parseGamePath} from '../lib/app-routes.ts';
import TimetableControl from '../app/timetable-control.tsx';
import TrainEditor from '../app/train-editor.tsx';
import OperationsPage from '../app/operations-page.tsx';
import JourneyPage from '../app/journey-page.tsx';
import {fixture,time} from './v33-fixtures.mjs';
const f=fixture('render33'),render=(C,p)=>renderToStaticMarkup(React.createElement(C,p)),common={world:f.world,myId:f.c.id,busy:false,onAction:async()=>true};
for(const section of ['workshop','operations','journey'])assert.equal(parseGamePath(worldHref(f.world.id,section)).section,section);
f.line.headwayMinutes=12.5;let html=render(TimetableControl,{...common,company:f.c,line:f.line});assert.match(html,/Taktplanung/);assert.match(html,/12,5 Min/);assert.doesNotMatch(html,/Wunschtakt in Minuten/,'Closed controls do not calculate or render 2,500 planning forms');
act(f.state,f.c.id,{type:'vehicle-buy',depot:'rd',consist:[{model:'train-taurus',count:1},{model:'train-cityshuttle',count:2}]});html=render(TrainEditor,{...common,vehicleId:f.c.fleet.at(-1).id});assert.match(html,/Umbau verbindlich ausführen/);assert.match(html,/Bausteinlager/);assert.match(html,/Neue Bausteine/);assert.match(html,/Vorhandene Zugeinheit verbinden/);assert.match(html,/Siemens ÖBB 1116 Taurus/);
f.state.usage={started:time,lines:{bus:{day:Math.floor(time/86400000),direct:3,own:0,partner:0,load:3,capacity:3,calls:1,denied:117,checked:1,full:1}},stops:{},vehicles:{}};f.state.waiting={s0:{bus:117}};html=render(OperationsPage,common);assert.match(html,/Überlastung/);assert.match(html,/117/);assert.match(html,/100.0 %/);assert.match(html,/Wöchentlich/);assert.match(html,/keine eindeutigen Personen/);assert.match(html,/\?anlage=s0/);
html=render(JourneyPage,{world:f.world});assert.match(html,/Verbindung prüfen/);assert.match(html,/A · Start wählen/);assert.match(html,/B · Ziel wählen/);assert.match(html,/feste Bewertungsgewichte/);assert.doesNotMatch(html,/Gewichte ändern/);
console.log('PASS v33 rendered UI: dedicated routes, lazy timetable form, existing-consist workshop, overload totals/history/hotspot links, and passenger checker with immutable world weights.');

