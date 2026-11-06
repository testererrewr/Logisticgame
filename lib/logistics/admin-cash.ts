import {credit,debit,log,type State} from './engine';
export function adjustCompanyCash(state:State,amount:number,reason:string){
 if(typeof amount!=='number'||!Number.isFinite(amount)||Math.abs(amount)<.01||Math.abs(amount)>1e12||Math.abs(amount*100-Math.round(amount*100))>.00001)throw Error('Betrag: 0,01 bis 1.000.000.000.000 Euro, höchstens zwei Nachkommastellen.');
 if(typeof reason!=='string'||reason.trim().length<3||reason.trim().length>160)throw Error('Buchungsgrund: 3–160 Zeichen.');
 const before=state.cash,after=Math.round((before+amount)*100)/100;if(after<0)throw Error('Der Abzug übersteigt den Kontostand.');if(!Number.isFinite(after)||after>1e15)throw Error('Kontostand zu hoch.');
 if(amount>0)credit(state,amount,'Admin-Gutschrift');else debit(state,-amount,'Admin-Abzug');state.cash=after;
 log(state,`Administration: ${amount>0?'+':''}${amount.toLocaleString('de-DE',{minimumFractionDigits:2})} € · ${reason.trim()}`,'info');return {before,cash:after,amount};
}
