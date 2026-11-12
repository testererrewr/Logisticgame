import {currentLanguage,dictionary} from './index';
const ATTRS=['placeholder','title','aria-label'];
const SKIP='script,style,textarea,code,pre,[data-no-translate],.leaflet-tile-pane';
const RULES:[RegExp,string][]=[[/^Spieltag (\d+)$/,'Game day $1'],[/^Tag (\d+)$/,'Day $1'],[/^(\d[\d.,]*) EH$/,'$1 units'],[/^(\d+) Tage$/,'$1 days'],[/^vor (\d+) Min\.$/,'$1 min ago'],[/^Stufe (\d+)$/,'Level $1']];
let started=false;
function tr(dict:Record<string,string>,raw:string){const core=raw.replace(/\s+/g,' ').trim();if(!core||core.length>300)return null;let out=dict[core];if(out===undefined){for(const [re,to] of RULES)if(re.test(core)){out=core.replace(re,to);break;}}if(!out||out===core)return null;const lead=raw.match(/^\s*/)![0],tail=raw.match(/\s*$/)![0];return lead+out+tail;}
export function startDomTranslation(){if(started||typeof document==='undefined')return;const lang=currentLanguage();if(lang==='de')return;const dict=dictionary(lang);if(!dict)return;started=true;document.documentElement.lang=lang;
 const skip=(el:Element|null)=>!!el?.closest(SKIP);
 const text=(n:Text)=>{if(skip(n.parentElement))return;const t=tr(dict,n.nodeValue||'');if(t!==null&&t!==n.nodeValue)n.nodeValue=t;};
 const attrs=(el:Element)=>{for(const a of ATTRS){const v=el.getAttribute(a);if(v){const t=tr(dict,v);if(t!==null&&t!==v)el.setAttribute(a,t);}}};
 const walk=(root:Node)=>{if(root.nodeType===3){text(root as Text);return;}if(root.nodeType!==1||skip(root as Element))return;attrs(root as Element);const w=document.createTreeWalker(root,NodeFilter.SHOW_ELEMENT|NodeFilter.SHOW_TEXT);let n:Node|null;while((n=w.nextNode())){if(n.nodeType===3)text(n as Text);else attrs(n as Element);}};
 walk(document.body);
 new MutationObserver(list=>{for(const m of list){if(m.type==='characterData')text(m.target as Text);else if(m.type==='attributes')attrs(m.target as Element);else m.addedNodes.forEach(walk);}}).observe(document.body,{subtree:true,childList:true,characterData:true,attributes:true,attributeFilter:ATTRS});}
