import en from '../../lang/en.json';
export const LANGUAGES:Record<string,string>={de:'Deutsch',en:'English'};
const DICTS:Record<string,Record<string,string>>={en:en as Record<string,string>};
let lang='de';
try{if(typeof localStorage!=='undefined'){const l=localStorage.getItem('log-lang');if(l&&LANGUAGES[l])lang=l;}}catch{}
export const currentLanguage=()=>lang;
export const t=(text:string)=>lang==='de'?text:(DICTS[lang]?.[text]||text);
export function setLanguage(code:string){if(!LANGUAGES[code])return;try{localStorage.setItem('log-lang',code);}catch{}location.reload();}
