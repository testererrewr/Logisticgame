'use client';
import {useEffect,useMemo,useState} from 'react';
import {activeNews,newsContinent,NEWS_CONTINENTS,type NewsItem} from '../../lib/logistics/world-events';
import {openProfile} from './profile-dialog';
const KICKER:Record<string,string>={price:'Märkte',fair:'Messen & Events',construction:'Verkehr',strike:'Streik',flavor:'Branche'};
export default function NewsPage({day,worldId}:{day:number;worldId:string}){
 const [filter,setFilter]=useState('all'),[feed,setFeed]=useState<any[]>([]);
 useEffect(()=>{fetch('/api/logistik/social?world='+encodeURIComponent(worldId),{cache:'no-store'}).then(r=>r.json()).then((d:any)=>setFeed(d.feed||[])).catch(()=>{});},[worldId,Math.floor(day)]);
 const groups=useMemo(()=>{const all=activeNews(day),map=new Map<string,NewsItem[]>();for(const n of all){const c=newsContinent(n);(map.get(c)??map.set(c,[]).get(c)!).push(n);}return NEWS_CONTINENTS.map(c=>({c,items:(map.get(c)||[]).sort((a,b)=>b.day-a.day)})).filter(g=>g.items.length);},[Math.floor(day)]);
 const left=(n:NewsItem)=>{const l=Math.max(0,n.until-day);return l<1?Math.round(l*24)+' Std.':Math.ceil(l)+' Tage';};
 return <section className="log-news-page">
  <header className="log-news-masthead"><b>Der Logistik-Kurier</b><span>Ausgabe Spieltag {Math.floor(day)}</span></header>
  <div className="log-tabs"><button className={filter==='all'?'on':''} onClick={()=>setFilter('all')}>Alle</button>{groups.map(g=><button key={g.c} className={filter===g.c?'on':''} onClick={()=>setFilter(g.c)}>{g.c} ({g.items.length})</button>)}{feed.length>0&&<button className={filter==='feed'?'on':''} onClick={()=>setFilter('feed')}>Aus der Welt ({feed.length})</button>}</div>
  {groups.filter(g=>filter==='all'||filter===g.c).map(g=><div key={g.c} className="log-news-section"><h2>{g.c}</h2><div className="log-news-columns">{g.items.map(n=><article key={n.id} className={'log-news-card '+n.kind}><small className="log-news-kicker">{KICKER[n.kind]}{n.city?' · '+n.city:''}{n.country?', '+n.country:''}</small><h3>{n.headline}</h3><p>{n.text}</p>{n.kind!=='flavor'&&<small className="log-news-meta">Tag {n.day} · noch {left(n)}</small>}</article>)}</div></div>)}
  {(filter==='all'||filter==='feed')&&feed.length>0&&<div className="log-news-section"><h2>Aus der Welt</h2><div className="log-news-columns">{feed.map((f:any)=><article key={f.id} className="log-news-card community"><small className="log-news-kicker">Spieltag {Math.floor(f.day)}</small><h3>{f.text}</h3>{f.user_id&&<button className="log-news-link" onClick={()=>openProfile(f.user_id)}>Profil ansehen</button>}</article>)}</div></div>}
 </section>;
}
