import type {TenderSettings} from './tender-types';
export function randomTenderRewards(settings:TenderSettings,grant:number,days:number,random:()=>number=Math.random){
 if(!settings.randomRewards)return {grantPerDay:grant,rewardType:settings.autoReward==='mixed'?(random()<.5?'pax' as const:'fixed' as const):settings.autoReward,bonusPercent:settings.bonusPercent,startPayment:settings.startPayment,completionPayment:settings.completionPayment};
 const vary=(base:number)=>Math.min(10000000,Math.round(base*(.5+Math.max(0,Math.min(.999999,random())))*100)/100);
 return {grantPerDay:vary(grant),rewardType:settings.autoReward==='mixed'?(random()<.5?'pax' as const:'fixed' as const):settings.autoReward,bonusPercent:Math.max(1,Math.min(100,Math.round(vary(settings.bonusPercent)))),startPayment:random()<.5?0:vary(settings.startPayment||grant*3),completionPayment:random()<.2?0:vary(settings.completionPayment||grant*days/4)};
}
