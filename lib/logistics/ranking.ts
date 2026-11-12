import {BUILDINGS,type State} from './engine';
import {dealerValue} from './vehicle-sales';

export interface Row {legend?:string;premium?:boolean;tagColor?:string;allianceLogo?:string;logo?:string;color?:string;tag?:string;id:string;name:string;value:number;cash:number;revenue7:number;revenue30:number;profit30:number;vehicles:number;transported:number;buildings:number;lines:number;orders:number;profit7?:number;orders7?:number}
export function sumDays(s:State,days:number,key:'income'|'expenses'){const book=s.finance;if(!book)return 0;const today=Math.floor(s.day);let n=0;for(const [d,row] of Object.entries(book.days))if(Number(d)>today-days)n+=row[key]||0;return n;}
export function rowFor(id:string,name:string,s:State):Row{
 const vehicles=s.vehicles.filter(v=>!v.wrecked);
 const fleet=vehicles.reduce((n,v)=>{try{return n+dealerValue(v);}catch{return n;}},0);
 const buildings=s.sites.filter(p=>p.owned),property=buildings.reduce((n,p)=>n+(BUILDINGS.find(b=>b.id===p.kind)?.price||0)*.6,0);
 const r=(n:number)=>Math.round(n);
 return {id,name,value:r(s.cash+fleet+property),cash:r(s.cash),revenue7:r(sumDays(s,7,'income')),revenue30:r(sumDays(s,30,'income')),profit30:r(sumDays(s,30,'income')-sumDays(s,30,'expenses')),vehicles:vehicles.length,transported:r(s.vehicles.reduce((n,v)=>n+(v.transportedEh||0),0)),buildings:buildings.length,lines:s.lines.filter(l=>l.active&&!l.deleted).length,orders:s.contracts.filter(c=>c.kind==='haulage'&&c.completedDay!==undefined).length,profit7:r(sumDays(s,7,'income')-sumDays(s,7,'expenses')),orders7:s.contracts.filter(c=>c.kind==='haulage'&&c.completedDay!==undefined&&c.completedDay>Math.floor(s.day)-7).length};
}
export interface Highlight {icon:string;title:string;name:string;value:string;id?:string}
export function weeklyHighlights(rows:Row[],alliance?:{name:string;tag:string;progress:number}|null):Highlight[]{const out:Highlight[]=[];const eur=(n:number)=>Math.round(n).toLocaleString('de-DE')+' €';
 const top=(k:keyof Row,min=1)=>[...rows].filter(r=>Number(r[k]||0)>=min).sort((a,b)=>Number(b[k]||0)-Number(a[k]||0))[0];
 const a=top('revenue7');if(a)out.push({icon:'💰',title:'Umsatzkönig der Woche',name:a.name,value:eur(a.revenue7),id:a.id});
 const b=top('profit7');if(b)out.push({icon:'📈',title:'Höchster Gewinn',name:b.name,value:eur(b.profit7||0),id:b.id});
 const c=top('orders7');if(c)out.push({icon:'📦',title:'Fleißigste Spedition',name:c.name,value:(c.orders7||0)+' Aufträge erledigt',id:c.id});
 const d=top('vehicles');if(d)out.push({icon:'🚛',title:'Größte Flotte',name:d.name,value:d.vehicles+' Fahrzeuge',id:d.id});
 if(alliance&&alliance.progress>0)out.push({icon:'🤝',title:'Allianz der Woche',name:`[${alliance.tag}] ${alliance.name}`,value:Math.round(alliance.progress).toLocaleString('de-DE')+' EH Wochenziel'});
 return out;}
