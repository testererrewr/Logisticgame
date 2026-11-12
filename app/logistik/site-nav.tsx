'use client';
import type {ReactNode,MouseEvent} from 'react';
import {DiscordButton,LangSwitch,useSite} from './site-config-client';

export function LogoMark({size=30}:{size?:number}){return <svg className="log-logo-mark" width={size} height={size} viewBox="0 0 64 64" aria-hidden="true"><defs><linearGradient id="lsg" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stopColor="#35d5b6"/><stop offset="1" stopColor="#5865f2"/></linearGradient></defs><rect width="64" height="64" rx="16" fill="url(#lsg)"/><path d="M32 11l6.2 13.4 14.6 1.6-10.9 9.9 3 14.4L32 43l-12.9 7.3 3-14.4-10.9-9.9 14.6-1.6z" fill="#fff"/><rect x="26" y="29" width="12" height="9" rx="1.6" fill="#0c1623" opacity=".85"/></svg>;}
export function Brand({onClick}:{onClick?:(e:MouseEvent<HTMLAnchorElement>)=>void}){return <a href="/" className="log-lobby-brand" onClick={onClick}><LogoMark/><span>LOADSTAR<i>.</i></span></a>;}

const LINKS:[string,string][]=[['/','Start'],['/welten','Welten'],['/roadmap','Roadmap'],['/premium','Premium'],['/neuigkeiten','Neuigkeiten']];
export function SiteNav({active,onNav,right}:{active:string;onNav?:(path:string,e:MouseEvent<HTMLAnchorElement>)=>void;right?:ReactNode}){const site=useSite();
 return <nav className="log-lobby-nav"><Brand onClick={onNav?e=>onNav('/',e):undefined}/><div className="log-site-links">{LINKS.filter(([p])=>p!=='/premium'||site?.premium).map(([p,l])=><a key={p} href={p} className={active===p?'on':''} onClick={onNav?e=>onNav(p,e):undefined}>{p==='/premium'?'⭐ ':''}{l}</a>)}<DiscordButton/><LangSwitch/></div>{right&&<div className="log-nav-user">{right}</div>}</nav>;}
