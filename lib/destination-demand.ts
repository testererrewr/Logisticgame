// Keep one finite inter-area trip budget. Nearby stops must not crowd every
// reachable long-distance destination out of the bounded destination shortlist.
export function destinationDemand<T extends {km:number;attraction:number}>(targets:T[]):(T&{share:number})[]{
 const nearby=targets.filter(t=>t.km<80),distant=targets.filter(t=>t.km>=80);
 const choose=(rows:T[],budget:number,scale:number,limit:number)=>{const ranked=rows.map(t=>({...t,weight:Math.sqrt(t.attraction)/(1+t.km/scale)})).sort((a,b)=>b.weight-a.weight).slice(0,limit),total=ranked.reduce((n,t)=>n+t.weight,0);return ranked.map(t=>({...t,share:total?budget*t.weight/total:0}));};
 return [...choose(nearby,distant.length ? .30 : .35,15,distant.length?4:8),...choose(distant,nearby.length ? .05 : .35,300,nearby.length?4:8)];
}
