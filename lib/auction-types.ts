export const auctionTypes={airport:'Flughäfen',station:'Bahnhöfe',port:'Häfen',busdepot:'Busdepots',traindepot:'Zugdepots',airdepot:'Flugzeugdepots',shipdepot:'Schiffsdepots',track:'Gleise'};
export function matchesAsset(kind:string,type:string|undefined,filter:string){return filter==='all'||filter==='facility'&&kind==='facility'||filter==='track'&&kind==='track'||type===filter;}
