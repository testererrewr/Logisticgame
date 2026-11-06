export type MoneyDisplay='full'|'compact';
const full=new Intl.NumberFormat('de-DE',{style:'currency',currency:'EUR',minimumFractionDigits:2,maximumFractionDigits:2});
const compact=new Intl.NumberFormat('de-DE',{style:'currency',currency:'EUR',notation:'compact',minimumFractionDigits:0,maximumFractionDigits:1});
export function formatMoney(amount:number,display:MoneyDisplay='full'){return (display==='compact'&&Math.abs(amount)>=1000000?compact:full).format(amount);}
