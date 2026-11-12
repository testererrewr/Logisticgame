export const CURRENCIES:Record<string,{name:string;symbol:string}>={EUR:{name:'Euro',symbol:'€'},USD:{name:'US-Dollar',symbol:'$'},GBP:{name:'Britisches Pfund',symbol:'£'},CHF:{name:'Schweizer Franken',symbol:'CHF'},JPY:{name:'Japanischer Yen',symbol:'¥'},CNY:{name:'Chinesischer Yuan',symbol:'¥'},PLN:{name:'Polnischer Złoty',symbol:'zł'},SEK:{name:'Schwedische Krone',symbol:'kr'},TRY:{name:'Türkische Lira',symbol:'₺'},INR:{name:'Indische Rupie',symbol:'₹'},AUD:{name:'Australischer Dollar',symbol:'A$'},CAD:{name:'Kanadischer Dollar',symbol:'C$'}};
let current='EUR';
try{if(typeof localStorage!=='undefined'){const c=localStorage.getItem('log-currency');if(c&&CURRENCIES[c])current=c;}}catch{}
export const currencyCode=()=>current;
export const currencySymbol=()=>CURRENCIES[current]?.symbol||'€';
export function setCurrency(code:string){if(!CURRENCIES[code])return;current=code;try{localStorage.setItem('log-currency',code);}catch{}try{window.dispatchEvent(new CustomEvent('log-display-change'));}catch{}}
export const localizeMoneyText=(t:string)=>current==='EUR'?t:t.replace(/€/g,currencySymbol());
