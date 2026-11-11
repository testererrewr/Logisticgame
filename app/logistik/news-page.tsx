'use client';
import {useEffect,useMemo,useState} from 'react';
import {activeNews,newsContinent,NEWS_CONTINENTS,spanLong,type NewsItem} from '../../lib/logistics/world-events';
import {openProfile} from './profile-dialog';
const KICKER:Record<string,string>={price:'Märkte',fair:'Messen & Events',construction:'Verkehr',strike:'Streik',flavor:'Branche',border:'Grenzen',harvest:'Landwirtschaft',fuel:'Energie'};
export default function NewsPage({day,worldId}:{day:number;worldId:string}){
 const [filter,setFilter]=useState('all'),[feed,setFeed]=useState<any[]>([]);
 useEffect(()=>{fetch('/api/logistik/social?world='+encodeURIComponent(worldId),{cache:'no-store'}).then(r=>r.json()).then((d:any)=>setFeed(d.feed||[])).catch(()=>{});},[worldId,Math.floor(day)]);
 const groups=useMemo(()=>{const all=activeNews(day),map=new Map<string,NewsItem[]>();for(const n of all){const c=newsContinent(n);(map.get(c)??map.set(c,[]).get(c)!).push(n);}return NEWS_CONTINENTS.map(c=>({c,items:(map.get(c)||[]).sort((a,b)=>b.day-a.day)})).filter(g=>g.items.length);},[Math.floor(day)]);
 const left=(n:NewsItem)=>spanLong(Math.max(1,(n.until-day)*24));
 return <section className="log-news-page">
  <header className="log-news-masthead"><div className="log-news-topline"><span>Unabhängig · Überparteilich · Frachtorientiert</span><span>Preis 2,50 €</span></div><b>Der Logistik-Kurier</b><div className="log-news-dateline"><span>Ausgabe Nr. {Math.floor(day)}</span><span>{new Date().toLocaleDateString('de-DE',{weekday:'long',day:'numeric',month:'long',year:'numeric'})}</span><span>{activeNews(day).length} Meldungen</span></div></header>
  {(()=>{const lead=activeNews(day).filter(n=>n.kind!=='flavor').sort((a,b)=>b.day-a.day||(b.factor||1)-(a.factor||1))[0];return lead&&filter==='all'?<article className={'log-news-lead '+lead.kind}><small className="log-news-kicker">{Math.floor(lead.day)===Math.floor(day)&&<span className="log-news-new">NEU</span>}Aufmacher · {KICKER[lead.kind]}{lead.city?' · '+lead.city:''}</small><h2>{lead.headline}</h2><p>{lead.text}</p><small className="log-news-meta">noch {left(lead)}</small></article>:null;})()}
  <div className="log-tabs"><button className={filter==='all'?'on':''} onClick={()=>setFilter('all')}>Alle</button>{groups.map(g=><button key={g.c} className={filter===g.c?'on':''} onClick={()=>setFilter(g.c)}>{g.c} ({g.items.length})</button>)}{feed.length>0&&<button className={filter==='feed'?'on':''} onClick={()=>setFilter('feed')}>Aus der Welt ({feed.length})</button>}</div>
  {groups.filter(g=>filter==='all'||filter===g.c).map(g=><div key={g.c} className="log-news-section"><h2>{g.c}</h2><div className="log-news-columns">{g.items.map(n=><article key={n.id} className={'log-news-card '+n.kind}><small className="log-news-kicker">{Math.floor(n.day)===Math.floor(day)&&<span className="log-news-new">NEU</span>}{KICKER[n.kind]}{n.city?' · '+n.city:''}{n.country?', '+n.country:''}</small><h3>{n.headline}</h3><p>{n.text}</p>{n.kind!=='flavor'&&<small className="log-news-meta">Tag {n.day} · noch {left(n)}</small>}</article>)}</div></div>)}
  {(filter==='all'||filter==='feed')&&feed.length>0&&<div className="log-news-section"><h2>Aus der Welt</h2><div className="log-news-columns">{feed.map((f:any)=><article key={f.id} className="log-news-card community"><small className="log-news-kicker">Spieltag {Math.floor(f.day)}</small><h3>{f.text}</h3>{f.user_id&&<button className="log-news-link" onClick={()=>openProfile(f.user_id)}>Profil ansehen</button>}</article>)}</div></div>}
 </section>;
}
