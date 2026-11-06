import {systemMessage} from './infrastructure';
import {book} from './finance';
import {vehicleModel} from './vehicle-models';
import type {Action,Company,WorldState} from './game';
export const REAL_DAY=86400000;
export type TransferContract={id:string;from:string;to:string;status:'offered'|'active'|'declined'|'cancelled'|'withdrawn';dailyFee:number;created:number;accepted?:number;paidUntil?:number;ended?:number;charged?:number};
export function contractQuote(a:Company,b:Company,catalog?:WorldState['vehicleCatalog']){
 const size=(c:Company)=>Math.max(1,(c.fleet||[]).reduce((n,v)=>n+1+vehicleModel(v,catalog?.models).capacity/100,0)+(c.facilities||[]).filter(f=>f.type==='airport'||f.type==='station'||f.type==='port').length*2);
 return Math.ceil(10+2*Math.sqrt(size(a)*size(b)));
}
export function canTransfer(state:Pick<WorldState,'contracts'>,a:string,b:string){return a===b||!!state.contracts?.some(c=>c.status==='active'&&((c.from===a&&c.to===b)||(c.from===b&&c.to===a)));}
export function settleContracts(state:WorldState,now:number){for(const c of state.contracts||[]){if(c.status==='offered'&&now-c.created>=15*REAL_DAY){c.status='withdrawn';c.ended=now;systemMessage(state,c.from,'Umsteigeangebot automatisch zurückgezogen','Das Angebot wurde innerhalb von 15 echten Tagen nicht angenommen.','unternehmen?unternehmen='+encodeURIComponent(c.to));}if(c.status!=='active')continue;const parties=[c.from,c.to].map(id=>state.companies.find(co=>co.id===id&&!co.suspended));if(parties.some(co=>!co)){c.status='cancelled';c.ended=now;continue;}c.dailyFee=contractQuote(parties[0]!,parties[1]!,state.vehicleCatalog);if(!c.paidUntil||now<c.paidUntil)continue;const days=Math.floor((now-c.paidUntil)/REAL_DAY)+1,fee=days*c.dailyFee;for(const co of parties){co!.cash-=fee;co!.earned-=fee;book(co!,state.simTime||now,3,fee);}c.charged=(c.charged||0)+fee;c.paidUntil+=days*REAL_DAY;}}
export function contractAction(state:WorldState,actor:string,action:Action,now=Date.now()){
 if(!action.type.startsWith('contract-'))return false;
 const own=state.companies.find(c=>c.id===actor);if(!own||own.suspended)throw Error('Aktives eigenes Unternehmen erforderlich.');
 state.contracts??=[];settleContracts(state,now);
 if(action.type==='contract-offer'){
  const other=state.companies.find(c=>c.id===action.company&&!c.suspended);if(!other||other.id===actor)throw Error('Wähle ein anderes aktives Unternehmen.');
  if(state.contracts.some(c=>['offered','active'].includes(c.status)&&[c.from,c.to].includes(actor)&&[c.from,c.to].includes(other.id)))throw Error('Zwischen diesen Unternehmen besteht bereits ein Angebot oder Vertrag.');
  if(state.contracts.filter(c=>c.status==='offered'&&c.from===actor).length>=10)throw Error('Maximal zehn offene Vertragsangebote.');
  const dailyFee=contractQuote(own,other,state.vehicleCatalog);if(action.dailyFee!==dailyFee)throw Error('Die Unternehmensgröße und der Preis haben sich geändert. Prüfe den neuen Tagespreis.');
  state.contracts.push({id:crypto.randomUUID(),from:actor,to:other.id,status:'offered',dailyFee,created:now});systemMessage(state,other.id,'Neues Umsteigeangebot',own.name+' bietet einen Umsteigevertrag für '+dailyFee+' € je echtem Tag an.','unternehmen?unternehmen='+encodeURIComponent(actor));
 }else{
  const c=state.contracts.find(c=>c.id===action.contract&&[c.from,c.to].includes(actor));if(!c)throw Error('Vertrag nicht gefunden.');
  if(action.type==='contract-accept'){
   if(c.status!=='offered'||c.to!==actor)throw Error('Nur der Empfänger kann ein offenes Angebot annehmen.');
   const parties=[c.from,c.to].map(id=>state.companies.find(co=>co.id===id));const price=parties.every(Boolean)?contractQuote(parties[0]!,parties[1]!,state.vehicleCatalog):c.dailyFee;if((action.dailyFee??c.dailyFee)!==price)throw Error('Der Tagespreis hat sich geändert. Prüfe den aktuellen Preis.');c.dailyFee=price;if(parties.some(co=>!co||co.suspended||co.cash<c.dailyFee))throw Error('Beide Unternehmen benötigen den angezeigten Tagespreis als Guthaben.');
   for(const co of parties){co!.cash-=c.dailyFee;co!.earned-=c.dailyFee;book(co!,state.simTime||now,3,c.dailyFee);}c.status='active';c.accepted=now;c.paidUntil=now+REAL_DAY;c.charged=c.dailyFee;
  }else if(action.type==='contract-decline'&&c.status==='offered'&&c.to===actor){c.status='declined';c.ended=now;}
  else if(action.type==='contract-cancel'&&c.status==='offered'&&c.from===actor){c.status='withdrawn';c.ended=now;}else if(action.type==='contract-cancel'&&c.status==='active'){c.status='cancelled';c.ended=now;}
  else throw Error('Diese Vertragsaktion ist nicht möglich.');
 }
 if(action.type!=='contract-offer'){const agreement=state.contracts.find(g=>g.id===action.contract);if(agreement)systemMessage(state,agreement.from===actor?agreement.to:agreement.from,agreement.status==='active'?'Umsteigevertrag angenommen':agreement.status==='withdrawn'?'Angebot zurückgezogen':agreement.status==='declined'?'Angebot abgelehnt':'Umsteigevertrag beendet',own.name+(agreement.status==='active'?' hat dein Angebot angenommen.':agreement.status==='withdrawn'?' hat das Angebot zurückgezogen.':agreement.status==='declined'?' hat das Angebot abgelehnt.':' hat den Vertrag beendet.'),'unternehmen?unternehmen='+encodeURIComponent(actor));}
 // Keep active agreements plus a bounded history.
 state.contracts=[...state.contracts.filter(c=>['active','offered'].includes(c.status)),...state.contracts.filter(c=>!['active','offered'].includes(c.status)).slice(-40)];return true;
}
