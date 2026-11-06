import type {Company,Line} from './game';
import {runPlan} from './operations';
import {defaultModel,vehicleModel,urbanSpeed,type VehicleModel} from './vehicle-models';
export function validateHeadway(value:unknown){if(value===null||value===0||value===undefined)return undefined;if(typeof value!=='number'||!Number.isFinite(value)||value<.25||value>1440)throw Error('Wunschtakt: 0,25–1.440 Minuten Weltzeit oder Automatik.');return Math.round(value*100)/100;}
export function timetableSummary(c:Company,line:Line,catalog?:VehicleModel[]){
 const assigned=(c.fleet||[]).filter(v=>v.line===line.id&&v.mode===line.mode),groups=new Map<string,{model:VehicleModel;count:number}>();for(const v of assigned){const key=v.model+':'+JSON.stringify(v.consist||[]),group=groups.get(key);if(group)group.count++;else groups.set(key,{model:vehicleModel(v,catalog),count:1});}
 if(!groups.size){const model=defaultModel(line.mode,catalog);groups.set(model.id,{model,count:0});}
 let longest=0,frequency=0;for(const {model,count}of groups.values()){const plan=runPlan(c,line,line.city&&line.mode==='bus'?urbanSpeed(model):model.speed,model.acceleration,model.braking,false,false,model.lengthM||0);if(plan){longest=Math.max(longest,plan.duration/60000);frequency+=count/(plan.duration/60000);}}
 const target=line.headwayMinutes||0,natural=frequency?1/frequency:null;return {vehicles:assigned.length,target:target||null,cycle:longest,expected:natural===null?null:Math.max(target,natural),required:target&&longest?Math.ceil(longest/target):null,missing:target&&longest?Math.max(0,Math.ceil(longest/target)-assigned.length):0,reference:assigned.length?'vorhandene Fahrzeugtypen':defaultModel(line.mode,catalog).name};
}
