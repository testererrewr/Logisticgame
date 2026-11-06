import {stableHash} from './business-rules';
export function containerQuantity(id:string,factory:boolean,km:number){
 const bucket=stableHash(id+'/quantity-class-v14')%100,size=stableHash(id+'/quantity-size-v14');
 if(bucket<(factory?50:65))return 10+(size%24)*10;
 if(bucket<(factory?85:95))return 300+(size%18)*100;
 return 2500+(size%(factory?216:56))*100+(km>2000?2400:0);
}
export function containerTerms(km:number){return {fee:Math.round((18+km*.09)*100)/100,days:Math.max(7,Math.ceil(7+km/120))};}
