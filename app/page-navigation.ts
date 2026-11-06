'use client';
import {useEffect,useState} from 'react';
import {parseGamePath} from '../lib/app-routes';
const navigationEvent='weltverbund:navigate';
function navigate(path:string,replace=false){
 const url=new URL(path,window.location.href);
 if(url.origin!==window.location.origin||parseGamePath(url.pathname).kind==='missing'){replace?window.location.replace(path):window.location.assign(path);return;}
 const target=url.pathname+url.search+url.hash;
 if(target===window.location.pathname+window.location.search+window.location.hash)return;
 window.history[replace?'replaceState':'pushState']({weltverbund:true},'',target);
 window.dispatchEvent(new Event(navigationEvent));window.scrollTo({top:0,behavior:'instant'});
}
export const pageNavigation={push:(path:string)=>navigate(path),replace:(path:string)=>navigate(path,true)};
export function usePageLocation(initialPath:string,initialSearch:string){
 const [location,setLocation]=useState(initialPath+(initialSearch?'?'+initialSearch:''));
 useEffect(()=>{
  const sync=()=>setLocation(window.location.pathname+window.location.search);
  const back=(event:PopStateEvent)=>{event.stopImmediatePropagation();sync();};
  const click=(event:MouseEvent)=>{
   if(event.defaultPrevented||event.button!==0||event.ctrlKey||event.metaKey||event.shiftKey||event.altKey)return;
   const anchor=event.target instanceof Element?event.target.closest('a'):null;
   if(!anchor||anchor.hasAttribute('download')||anchor.target&&anchor.target!=='_self')return;
   const url=new URL(anchor.href,window.location.href);
   if(url.origin!==window.location.origin||parseGamePath(url.pathname).kind==='missing')return;
   if(url.hash&&url.pathname===window.location.pathname&&url.search===window.location.search)return;
   event.preventDefault();pageNavigation.push(url.pathname+url.search+url.hash);
  };
  sync();window.addEventListener(navigationEvent,sync);window.addEventListener('popstate',back,true);document.addEventListener('click',click);
  return()=>{window.removeEventListener(navigationEvent,sync);window.removeEventListener('popstate',back,true);document.removeEventListener('click',click);};
 },[]);
 const split=location.indexOf('?');return {pathname:split<0?location:location.slice(0,split),query:new URLSearchParams(split<0?'':location.slice(split+1))};
}
