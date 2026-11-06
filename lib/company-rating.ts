import type {Company} from './game';
import {companyWeek} from './company-metrics';
export function companyRating(c:Company,time:number){
 const {from,to}=companyWeek(c,time),rows=Object.entries(c.finances?.days||{}).filter(([day])=>day>=from&&day<=to).map(([,v])=>v);
 const revenue=rows.reduce((n,v)=>n+(v[0]||0)+(v[9]||0)+(v[10]||0),0),cost=rows.reduce((n,v)=>n+(v[1]||0)+(v[2]||0)+(v[3]||0),0),profit=revenue-cost,margin=profit/Math.max(1,revenue,cost);
 const grade=!revenue&&!cost?'—':margin>=.3?'AAA':margin>=.15?'AA':margin>=.05?'A':margin>=0?'BBB':margin>=-.1?'BB':margin>=-.3?'B':'CCC';
 return {from,to,revenue,cost,profit,margin,grade};
}
