import {stableHash} from './business-rules';
export function containerQuantity(id:string,factory:boolean,km:number){
 const bucket=stableHash(id+'/quantity-class-v15')%100,size=stableHash(id+'/quantity-size-v15');
 if(bucket<(km>1000?(factory?35:45):(factory?50:65)))return 10+(size%24)*10;
 if(bucket<(km>1000?(factory?65:75):(factory?85:95)))return 300+(size%18)*100;
 return 2500+(size%(factory?216:96))*100+(km>2000?2400:0);
}
export function containerTerms(km:number){return {fee:Math.round((18+km*.09)*100)/100,days:Math.max(10,Math.ceil(12+km/75))};}
export function effectiveOfferDeadline(day:number,deadline:number,km:number,rush:boolean){const days=containerTerms(km).days;return Math.max(deadline,day+5+(rush?Math.max(2,Math.ceil(days*.45)):days));}
