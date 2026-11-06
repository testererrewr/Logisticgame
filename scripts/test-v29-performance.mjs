import assert from 'node:assert/strict';
import {newState,newCompany,urbanTrips} from '../lib/game.ts';
import {registerMap,mapBounds,cellPoint,meters} from '../lib/real-map.ts';
import {networkForecast} from '../lib/network.ts';
import {bindInfrastructure} from '../lib/infrastructure-context.ts';
const m={key:'geo_v29_dense',lat:52.52,lon:13.4,...mapBounds(52.52,13.4),date:'dense-v29',zones:Array.from({length:6400},(_,id)=>({id,x:id%80,y:Math.floor(id/80),residents:0,jobs:0,shopping:0,buildings:0,water:false})),nodes:[],roads:[]};
for(const z of m.zones)if(z.y>=37&&z.y<=43&&z.x>=8&&z.x<=72){z.residents=10;z.jobs=20;z.shopping=10;}
const cells=Array.from({length:13},(_,i)=>40*80+10+i*5);m.nodes=cells.map(id=>cellPoint(m,id));registerMap(m);
const state=newState(),c=newCompany('dense','Dense');state.companies=[c];c.facilities=[{id:'home',name:'Depot',type:'busdepot',city:m.key,point:m.nodes[0],cell:0,footprint:[]}];const km=m.nodes.slice(1).map((p,i)=>meters(m.nodes[i],p)/1000);c.lines=[{id:'dense-line',name:'Dense line',mode:'bus',city:m.key,a:m.key,b:m.key,path:m.nodes,stopPoints:m.nodes,stopAreas:cells.map(()=>m.key),segmentKm:km,length:km.reduce((a,b)=>a+b,0),routeMode:'shuttle',fare:1,ticketPrice:1.2,vehicles:4,active:true}];c.fleet=Array.from({length:4},(_,i)=>({id:'dv'+i,name:'Bus '+i,mode:'bus',model:'bus-mini',depot:'home',line:'dense-line',purchasePrice:100}));bindInfrastructure(state);
const start=performance.now(),forecast=networkForecast(state),cold=performance.now()-start,again=performance.now();networkForecast(structuredClone(state));const warm=performance.now()-again;
const trips=urbanTrips(m.key).length;assert.ok(forecast.summary.markets<trips/2,'Equivalent stop-access groups replace individual cell OD routing');assert.ok(forecast.summary.served<=forecast.summary.demand+.001);assert.ok(cold<15000,'Dense synthetic forecast stays bounded');assert.ok(warm<1000,'Unchanged topology reuses the forecast');
console.log('PASS dense synthetic routing: '+trips+' cell journeys → '+forecast.summary.markets+' access groups; '+Math.round(cold)+' ms cold / '+Math.round(warm)+' ms cached. This is not a production load test.');
