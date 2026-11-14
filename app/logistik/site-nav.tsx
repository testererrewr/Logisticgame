'use client';
import type {ReactNode,MouseEvent} from 'react';
import {DiscordButton,LangSwitch,useSite} from './site-config-client';

export function LogoMark({size=30}:{size?:number}){
 return <img className="log-logo-mark" src="/loadstar-emblem.png" width={size} height={size} alt=""/>;
}
export function Brand({onClick}:{onClick?:(e:MouseEvent<HTMLAnchorElement>)=>void}){return <a href="/" className="log-lobby-brand" onClick={onClick}><LogoMark/><span>LOADSTAR</span></a>;}

const LINKS:[string,string][]=[['/','Start'],['/welten','Welten'],['/roadmap','Roadmap'],['/premium','Premium'],['/neuigkeiten','Neuigkeiten']];
export function SiteNav({active,onNav,right}:{active:string;onNav?:(path:string,e:MouseEvent<HTMLAnchorElement>)=>void;right?:ReactNode}){const site=useSite();
 return <nav className="log-lobby-nav"><Brand onClick={onNav?e=>onNav('/',e):undefined}/><div className="log-site-links">{LINKS.filter(([p])=>p!=='/premium'||site?.premium).map(([p,l])=><a key={p} href={p} className={active===p?'on':''} onClick={onNav?e=>onNav(p,e):undefined}>{p==='/premium'?'⭐ ':''}{l}</a>)}<DiscordButton/><LangSwitch/></div>{right&&<div className="log-nav-user">{right}</div>}</nav>;}
