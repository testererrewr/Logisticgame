import type {WorldState,Company,Action,Mode} from './game';
import {configOf,type WorldConfig} from './world-config';
export const modeNames={bus:'Bus',train:'Bahn',plane:'Flugzeug',ship:'Schiff'};
export const modeOfFacility=(kind:string):Mode|undefined=>({busdepot:'bus',station:'train',traindepot:'train',airport:'plane',airdepot:'plane',port:'ship',shipdepot:'ship'} as Record<string,Mode>)[kind];
export const modeEnabled=(rules:Partial<WorldConfig>|undefined,mode:Mode)=>rules?.enabledModes?.[mode]!==false;
export function assertMode(rules:Partial<WorldConfig>|undefined,mode:Mode){if(!modeEnabled(rules,mode))throw Error(modeNames[mode]+' ist in dieser Welt deaktiviert.');}
export function assertWorldAction(state:WorldState,c:Company,a:Action){
 let mode:Mode|undefined;
 if(['busstop','busstop-batch','buildbus'].includes(a.type))mode='bus';
 else if(['track','buildrail','vehicle-refit'].includes(a.type))mode='train';
 else if(a.type==='airdepot'||a.type==='airport-expand')mode='plane';
 else if(a.type==='facility')mode=modeOfFacility(a.kind);
 else if(['build','buildurban'].includes(a.type))mode=a.mode;
 else if(a.type==='vehicle-buy')mode=modeOfFacility(c.facilities?.find(f=>f.id===a.depot)?.type||'');
 else if(a.type==='vehicle-assign'||a.type==='toggle'&&!c.lines.find(l=>l.id===a.line)?.active)mode=c.lines.find(l=>l.id===a.line)?.mode;
 else if(a.type==='vehicle-batch'&&a.command==='assign')mode=c.lines.find(l=>l.id===a.line)?.mode;
 if(mode&&mode in modeNames)assertMode(state.rules,mode);
}
export function reconcileWorldModes(state:WorldState,config:WorldConfig){
 state.rules=configOf(config);for(const c of state.companies){for(const l of c.lines)if(!modeEnabled(config,l.mode))l.active=false;for(const v of c.fleet||[])if(!modeEnabled(config,v.mode))delete v.line;}
 for(const offer of state.usedMarket||[])if(!modeEnabled(config,offer.mode)){const v=state.companies.find(c=>c.id===offer.seller)?.fleet?.find(v=>v.id===offer.vehicle);if(v?.listing===offer.id)delete v.listing;}
 for(const t of state.tenders||[])if(t.mode!=='any'&&!modeEnabled(config,t.mode)&&['open','active'].includes(t.status)){t.status='cancelled';t.closed=state.simTime||Date.now();}
 state.usedMarket=state.usedMarket?.filter(o=>modeEnabled(config,o.mode));
}
