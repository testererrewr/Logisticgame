const buckets=new Map<string,{tokens:number;at:number}>();
export function allowAction(key:string,perSecond=3,burst=10){const now=Date.now(),b=buckets.get(key)||{tokens:burst,at:now};b.tokens=Math.min(burst,b.tokens+(now-b.at)/1000*perSecond);b.at=now;if(b.tokens<1){buckets.set(key,b);return false;}b.tokens-=1;buckets.set(key,b);if(buckets.size>50000)buckets.clear();return true;}
export const TOO_FAST='Zu viele Aktionen in kurzer Zeit – bitte einen Moment warten.';
