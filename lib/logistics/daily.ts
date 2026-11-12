import {credit,log,good,GOODS,RECIPES,FREIGHT_NAMES,type State,type GoodId} from './engine';

export interface QuizQuestion {q:string;a:[string,string,string,string];ok:number}
export const QUIZ:QuizQuestion[]=[
 {q:'Welcher Hafen ist der größte Containerhafen Europas?',a:['Hamburg','Rotterdam','Antwerpen','Le Havre'],ok:1},
 {q:'Wie lang ist ein Standard-Container (TEU)?',a:['10 Fuß','20 Fuß','40 Fuß','45 Fuß'],ok:1},
 {q:'Welcher Kanal verbindet Mittelmeer und Rotes Meer?',a:['Panamakanal','Nord-Ostsee-Kanal','Suezkanal','Korinth-Kanal'],ok:2},
 {q:'Was bedeutet „FEU“?',a:['Forty-foot Equivalent Unit','Freight Export Unit','Full Euro Unit','Fast Express Unit'],ok:0},
 {q:'Welche Spurweite hat die Normalspur?',a:['1000 mm','1435 mm','1520 mm','1668 mm'],ok:1},
 {q:'Wie viele Europaletten passen ungefähr auf einen Standard-Sattelauflieger?',a:['18','24','33','45'],ok:2},
 {q:'Welche Maße hat eine Europalette?',a:['100 × 120 cm','80 × 120 cm','60 × 80 cm','120 × 120 cm'],ok:1},
 {q:'Welcher Fluss ist die wichtigste Binnenwasserstraße Europas?',a:['Donau','Elbe','Rhein','Seine'],ok:2},
 {q:'Wofür steht „Incoterm EXW“?',a:['Ex Works','Express Worldwide','Export Warehouse','Extra Weight'],ok:0},
 {q:'Welches Land hat das längste Schienennetz der Welt?',a:['China','Russland','USA','Indien'],ok:2},
 {q:'Was ist ein „Reefer“?',a:['Ein Tankcontainer','Ein Kühlcontainer','Ein Flachcontainer','Ein Lotse'],ok:1},
 {q:'Welcher Flughafen hat weltweit das höchste Frachtaufkommen (regelmäßig Platz 1)?',a:['Frankfurt','Dubai','Hongkong','Memphis'],ok:2},
 {q:'Wie heißt der Kanal zwischen Nord- und Ostsee?',a:['Mittellandkanal','Nord-Ostsee-Kanal','Dortmund-Ems-Kanal','Elbe-Seitenkanal'],ok:1},
 {q:'Was regelt die Lenk- und Ruhezeit-Verordnung in der EU?',a:['Tempolimits','Fahrzeiten von Berufsfahrern','Mautgebühren','Ladungssicherung'],ok:1},
 {q:'Wie viele Stunden darf ein LKW-Fahrer in der EU normalerweise pro Tag lenken?',a:['6','9','12','14'],ok:1},
 {q:'Welches Schiff transportiert lose Schüttgüter wie Erz oder Getreide?',a:['Bulker','RoRo-Schiff','Feeder','Tanker'],ok:0},
 {q:'Was ist ein „Feeder“-Schiff?',a:['Ein Fischerboot','Ein kleines Zubringer-Containerschiff','Ein Eisbrecher','Ein Kreuzfahrtschiff'],ok:1},
 {q:'Wofür steht „RoRo“?',a:['Road–Road','Roll-on/Roll-off','Rotterdam–Rostock','Route Optimization'],ok:1},
 {q:'Welche Stadt beherbergt den größten Hafen der Welt nach Containerumschlag?',a:['Singapur','Shanghai','Busan','Los Angeles'],ok:1},
 {q:'Was misst die Einheit „TEU“?',a:['Gewicht','Containerkapazität','Geschwindigkeit','Tiefgang'],ok:1},
 {q:'Welcher Pass ist die wichtigste Nord-Süd-Straßenverbindung über die Alpen nach Italien?',a:['Brenner','Gotthard','Großglockner','Stilfser Joch'],ok:0},
 {q:'Welcher Tunnel ist der längste Eisenbahntunnel der Welt?',a:['Eurotunnel','Gotthard-Basistunnel','Seikan-Tunnel','Lötschberg-Basistunnel'],ok:1},
 {q:'Was ist „Just-in-Time“?',a:['Lieferung genau zum Bedarfszeitpunkt','Expresszustellung','Nachtlieferung','Lagerung auf Vorrat'],ok:0},
 {q:'Was transportiert ein Silo-LKW typischerweise?',a:['Stückgut','Schüttgut wie Zement oder Mehl','Flüssiggas','Fahrzeuge'],ok:1},
 {q:'Wie heißt das Dokument für Seefracht, das als Wertpapier dient?',a:['Lieferschein','Konnossement (Bill of Lading)','CMR-Frachtbrief','Packliste'],ok:1},
 {q:'Wofür steht der „CMR“-Frachtbrief?',a:['Internationaler Straßengüterverkehr','Containerumschlag','Luftfracht','Bahnfracht'],ok:0},
 {q:'Welcher Kanal verkürzt die Seereise zwischen Atlantik und Pazifik?',a:['Suezkanal','Panamakanal','Kieler Kanal','Beagle-Kanal'],ok:1},
 {q:'Was ist ein „Hub“ in der Logistik?',a:['Ein Zentrallager oder Umschlagknoten','Ein Fahrzeugtyp','Ein Zollformular','Ein Kran'],ok:0},
 {q:'Welche Antriebsart haben die meisten Containerschiffe heute?',a:['Dampfturbine','Dieselmotor (Schweröl)','Elektro','Segel'],ok:1},
 {q:'Welches Land ist der größte Weizenexporteur der Welt (in den letzten Jahren meist)?',a:['Russland','Deutschland','Brasilien','Japan'],ok:0},
 {q:'Welche Ladung braucht eine durchgehende Kühlkette?',a:['Kies','Tiefkühlkost','Stahlträger','Holzpellets'],ok:1},
 {q:'Wie heißt das Verladen eines LKW-Aufliegers auf die Bahn?',a:['Kombinierter Verkehr','Containerisierung','Cabotage','Transshipment'],ok:0},
 {q:'Was bedeutet „Kabotage“?',a:['Ladungsdiebstahl','Inlandstransporte durch ausländische Unternehmen','Überladung','Leerfahrt'],ok:1},
 {q:'Welcher See ist Teil eines wichtigen Binnenschifffahrtswegs in Nordamerika?',a:['Lake Tahoe','Die Großen Seen','Salzsee','Lake Okeechobee'],ok:1},
 {q:'Was ist eine „Leerfahrt“?',a:['Fahrt ohne Ladung','Fahrt bei Nacht','Fahrt ohne Fahrer','Fahrt mit halber Ladung'],ok:0},
 {q:'Welche Fracht reist typischerweise per Luftfracht?',a:['Kohle','Eisenerz','Medikamente und Elektronik','Sand'],ok:2},
 {q:'Was bedeutet „Last Mile“?',a:['Die letzte Etappe zum Empfänger','Die längste Strecke','Die Grenzkontrolle','Die Mautstrecke'],ok:0},
 {q:'Welche Stadt ist Europas größter Binnenhafen?',a:['Duisburg','Basel','Wien','Mannheim'],ok:0},
 {q:'Was ist ein „Gigaliner“?',a:['Ein Großraumflugzeug','Ein besonders langer LKW (Lang-LKW)','Ein Containerschiff','Ein Güterzug'],ok:1},
 {q:'Was zeigt eine „Ladeliste“ an?',a:['Die Route','Die geladenen Güter','Die Fahrerpausen','Den Kraftstoffverbrauch'],ok:1},
];

const hash=(t:string)=>{let h=2166136261;for(const c of t){h^=c.charCodeAt(0);h=Math.imul(h,16777619);}return h>>>0;};
export const QUIZ_REWARD=3000;
export const quizDay=()=>Math.floor(Date.now()/864e5);
let generated:QuizQuestion[]|null=null;
function generatedQuiz():QuizQuestion[]{if(generated)return generated;const out:QuizQuestion[]=[],goods=GOODS.filter(g=>!(g as any).seasonal&&g.id!=='containers'),types=Object.keys(FREIGHT_NAMES) as (keyof typeof FREIGHT_NAMES)[];
 const opts=(right:string,pool:string[],seed:string):{a:[string,string,string,string];ok:number}=>{const wrong=[...new Set(pool.filter(x=>x!==right))];const pick:string[]=[];for(let i=0;pick.length<3&&i<60;i++){const w=wrong[hash(seed+'/'+i)%wrong.length];if(w&&!pick.includes(w))pick.push(w);}const ok=hash(seed+'/ok')%4;const a=[...pick];a.splice(ok,0,right);return {a:a.slice(0,4) as any,ok};};
 for(const g of goods){const r=opts(FREIGHT_NAMES[g.type as keyof typeof FREIGHT_NAMES],types.map(t=>FREIGHT_NAMES[t]),'t'+g.id);out.push({q:`Als welche Frachtart wird „${g.name}“ transportiert?`,...r});}
 for(const rc of RECIPES as any[]){const inputs=Object.keys(rc.inputs||{});if(!inputs.length||!good(rc.output))continue;const right=inputs.map(i=>good(i as GoodId)?.name||i).join(' + ');const pool=RECIPES.map((x:any)=>Object.keys(x.inputs||{}).map(i=>good(i as GoodId)?.name||i).join(' + '));const r=opts(right,pool,'r'+rc.id);out.push({q:`Woraus wird „${good(rc.output)!.name}“ hergestellt?`,...r});}
 for(const rc of RECIPES as any[]){const inputs=Object.keys(rc.inputs||{});if(inputs.length!==1||!good(rc.output))continue;const r=opts(good(rc.output)!.name,RECIPES.map((x:any)=>good(x.output)?.name||'').filter(Boolean),'o'+rc.id);out.push({q:`Was entsteht in der Verarbeitung aus „${good(inputs[0] as GoodId)?.name}“?`,...r});}
 const priced=goods.filter(g=>g.sale>0);for(let i=0;i<120&&priced.length>4;i++){const four=[0,1,2,3].map(k=>priced[hash('p'+i+'/'+k)%priced.length]);if(new Set(four.map(x=>x.id)).size<4)continue;const best=four.reduce((m,x)=>x.sale>m.sale?x:m);out.push({q:'Welche dieser Waren ist pro EH am wertvollsten?',a:four.map(x=>x.name) as any,ok:four.indexOf(best)});}
 return generated=out;}
export const quizFor=(_day?:number)=>{const all=[...QUIZ,...generatedQuiz()];return all[hash('quiz/'+quizDay())%all.length];};

export function answerQuiz(s:State,answer:number){const day=Math.floor(s.day),utc=quizDay(),p:any=s;if(p.dailyQuiz?.utc===utc)throw Error('Das heutige Quiz ist schon beantwortet.');const q=quizFor(),ok=answer===q.ok;p.dailyQuiz={day,utc,answer,ok};if(ok){credit(s,QUIZ_REWARD,'Prämien & Erfolge');log(s,`🧠 Tagesquiz richtig! +${QUIZ_REWARD.toLocaleString('de-DE')} €`,'good');}else log(s,`🧠 Tagesquiz: leider falsch. Richtig war „${q.a[q.ok]}“.`,'info');}

export interface DailyTask {day:number;good:string|null;qty:number;base:number;reward:number;done?:boolean}
export function newDailyTask(s:State,day:number):DailyTask{
 const stats=s.deliveryStats||{},prev:Record<string,number>=(s.progress as any)?.statsYesterday||{},moved=Object.entries(stats).map(([g,v])=>[g,(v||0)-(prev[g]||0)] as [string,number]).filter(([,d])=>d>0).sort((a,b)=>b[1]-a[1]).slice(0,5);
 if(!moved.length)return {day,good:null,qty:100,base:Object.values(stats).reduce((a,b)=>a+(b||0),0),reward:2000};
 const [g,d]=moved[hash(day+'/task/'+(s.companyName||''))%moved.length],qty=Math.max(50,Math.round(d*(.6+(hash('q'+day)%50)/100)/10)*10);
 return {day,good:g,qty,base:stats[g as GoodId]||0,reward:Math.max(2000,Math.min(30000,Math.round(qty*8/100)*100))};
}
export function taskProgress(s:State,t:DailyTask){const stats=s.deliveryStats||{},cur=t.good?stats[t.good as GoodId]||0:Object.values(stats).reduce((a,b)=>a+(b||0),0);return Math.max(0,cur-t.base);}
export function claimDailyTask(s:State){const t:DailyTask|undefined=(s.progress as any)?.task;if(!t||t.day!==Math.floor(s.day))throw Error('Keine Tagesaufgabe für heute.');if(t.done)throw Error('Bereits eingelöst.');if(taskProgress(s,t)<t.qty)throw Error('Tagesaufgabe noch nicht erfüllt.');t.done=true;credit(s,t.reward,'Prämien & Erfolge');log(s,`📅 Tagesaufgabe erfüllt: ${t.qty.toLocaleString('de-DE')} EH ${t.good?good(t.good as GoodId)?.name||t.good:'Fracht'} · +${t.reward.toLocaleString('de-DE')} €`,'good');}
export function rollDaily(s:State){const p:any=s.progress;if(!p)return;const day=Math.floor(s.day);if(p.task?.day!==day){p.task=newDailyTask(s,day);}p.statsYesterday={...(s.deliveryStats||{})};}
