import en from '../../lang/en.json';
export const LANGUAGES:Record<string,string>={de:'Deutsch',en:'English'};
const DICTS:Record<string,Record<string,string>>={en:en as Record<string,string>};
let lang='de';
try{if(typeof location!=='undefined'){const q=new URLSearchParams(location.search).get('lang');if(q&&LANGUAGES[q]){try{localStorage.setItem('log-lang',q);}catch{}lang=q;}}if(typeof localStorage!=='undefined'){const l=localStorage.getItem('log-lang');if(l&&LANGUAGES[l])lang=l;}}catch{}
export const currentLanguage=()=>lang;
export const dictionary=(code:string)=>DICTS[code];
export const t=(text:string)=>lang==='de'?text:(DICTS[lang]?.[text]||text);
export function setLanguage(code:string){if(!LANGUAGES[code])return;try{localStorage.setItem('log-lang',code);}catch{}const u=new URL(location.href);u.searchParams.set('lang',code);location.href=u.toString();}
