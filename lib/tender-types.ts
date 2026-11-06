export type TenderType='connection'|'local'|'coverage'|'frequency'|'interchange'|'feeder';
export const TENDER_TEMPLATES={
 connection:{name:'Städteverbindung mit Umstiegen',type:'connection'},
 local:{name:'Sitzplätze im Stadtgebiet',type:'local'},
 coverage:{name:'Mehr bediente Haltezonen',type:'coverage'},
 electric:{name:'Elektrischer Stadtverkehr',type:'local',electricOnly:true},
 direct:{name:'Direktverbindung ohne Umstieg',type:'connection',directOnly:true},
 frequency:{name:'Dichter Takt im Stadtgebiet',type:'frequency',maxHeadwayMinutes:10},
 interchange:{name:'Umsteigeknoten für mehrere Verkehrsarten',type:'interchange'},
 airport_feeder:{name:'Zubringer zum Flughafen',type:'feeder',targetKind:'airport'},
 rail_feeder:{name:'Zubringer zum Bahnhof',type:'feeder',targetKind:'station'},
 port_feeder:{name:'Zubringer zum Hafen',type:'feeder',targetKind:'port'},
} as const;
export type TenderTemplate=keyof typeof TENDER_TEMPLATES;
export type TenderSettings={randomRewards:boolean;startPayment:number;completionPayment:number;enabled:boolean;automatic:boolean;intervalHours:number;clock:'world'|'real';perRound:number;perRoundMin:number;durationMinDays:number;durationMaxDays:number;autoReward:'fixed'|'pax'|'mixed';bonusPercent:number;maxOpen:number;award:'claim'|'race';types:Record<TenderTemplate,boolean>};
export const DEFAULT_TENDERS:TenderSettings={randomRewards:true,startPayment:0,completionPayment:0,enabled:false,automatic:true,intervalHours:168,clock:'world',perRound:3,perRoundMin:3,durationMinDays:7,durationMaxDays:30,autoReward:'fixed',bonusPercent:15,maxOpen:3,award:'claim',types:Object.fromEntries(Object.keys(TENDER_TEMPLATES).map(k=>[k,true])) as Record<TenderTemplate,boolean>};
export function tenderTypeLabel(t:{type:TenderType;electricOnly?:boolean;directOnly?:boolean;targetKind?:string}){if(t.type==='feeder')return t.targetKind==='airport'?'Flughafenzubringer':t.targetKind==='port'?'Hafenzubringer':'Bahnhofszubringer';return t.directOnly?'Direktverbindung':t.electricOnly?'Elektrischer Verkehr':({connection:'Städteverbindung',local:'Lokales Sitzplatzangebot',coverage:'Flächenerschließung',frequency:'Taktverkehr',interchange:'Umsteigeknoten'})[t.type];}
