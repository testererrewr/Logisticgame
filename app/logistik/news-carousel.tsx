'use client';
import {useCallback,useEffect,useMemo,useState} from 'react';
import {activeNews,newsDay,type NewsItem} from '../../lib/logistics/world-events';
import {openProfile} from './profile-dialog';

const KICKER:Record<string,string>={price:'MÄRKTE',fair:'MESSEN & EVENTS',construction:'VERKEHR',strike:'STREIK',flavor:'BRANCHE',border:'GRENZEN',harvest:'LANDWIRTSCHAFT',fuel:'ENERGIE',achievement:'AUS DER WELT',special:'AUS DER WELT',alliance:'ALLIANZEN',project:'WELTPROJEKT',history:'WELTGESCHICHTE'};
type Feed={id:string;kind:string;text:string;day:number;user_id:string|null;name:string;congrats:number;mine:number|null};
type Item={news?:NewsItem;feed?:Feed;id:string};
export default function NewsCarousel({day,worldId}:{day:number;worldId?:string}){
 const [feed,setFeed]=useState<Feed[]>([]),[me,setMe]=useState('');
 const load=useCallback(async()=>{if(!worldId)return;try{const r=await fetch('/api/logistik/social?world='+encodeURIComponent(worldId),{cache:'no-store'}),d=await r.json() as any;if(r.ok){setFeed(d.feed||[]);setMe(d.me);}}catch{}},[worldId]);
 useEffect(()=>{void load();const t=setInterval(()=>void load(),60000);return()=>clearInterval(t);},[load]);
 const items=useMemo<Item[]>(()=>{const news=activeNews(day).sort((a,b)=>b.day-a.day||(a.kind==='flavor'?1:0)-(b.kind==='flavor'?1:0)).map(n=>({news:n,id:n.id}));const f=feed.slice(0,12).map(x=>({feed:x,id:'f'+x.id}));const out:Item[]=[];const len=Math.max(news.length,f.length);for(let k=0;k<len;k++){if(news[k])out.push(news[k]);if(f[k])out.push(f[k]);}return out;},[Math.floor(day),feed]);
 const [i,setI]=useState(0);useEffect(()=>setI(0),[Math.floor(day)]);
 if(!items.length)return null;const it=items[Math.min(i,items.length-1)];
 const go=(d:number)=>setI(x=>(x+d+items.length)%items.length);
 const congrats=async(id:string)=>{try{const r=await fetch('/api/logistik/social',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({action:'congrats',id})});if(r.ok)void load();}catch{}};
 return <section className="log-newspaper" aria-label="Tagesnachrichten" onKeyDown={e=>{if(e.key==='ArrowLeft')go(-1);if(e.key==='ArrowRight')go(1);}} tabIndex={0}>
  <header><b>Der Logistik-Kurier</b><span>Ausgabe Spieltag {Math.floor(day)} · {items.length} Meldungen</span></header>
  <div className="log-newspaper-body">
   <button className="log-news-arrow" aria-label="Vorherige Meldung" onClick={()=>go(-1)}>‹</button>
   {it.news?(()=>{const n=it.news,left=Math.max(0,n.until-newsDay(day));return <article key={it.id}>
    <small className={'log-news-kicker '+n.kind}>{KICKER[n.kind]}{n.city?' · '+n.city:n.country?' · '+n.country:''}</small>
    <h3>{n.headline}</h3><p>{n.text}</p>
    {n.kind!=='flavor'&&<small className="log-news-meta">{n.day===Math.floor(newsDay(day))?'Heute erschienen':`Erschienen am ${new Date(Date.UTC(2026,0,1)+(n.day-1)*864e5).toLocaleDateString('de-DE')}`} · gilt noch {left<1?Math.round(left*24)+' Std.':Math.ceil(left)+' Tage'}</small>}
   </article>;})():(()=>{const f=it.feed!;return <article key={it.id}>
    <small className="log-news-kicker fair">{KICKER[f.kind]||'AUS DER WELT'}</small>
    <h3>{f.kind==='achievement'?'🏅 ':f.kind==='special'?'💎 ':''}{f.text}</h3>
    <div className="log-news-actions">{f.user_id&&<button className="log-news-link" onClick={()=>openProfile(f.user_id!)}>Profil von {f.name} ansehen</button>}{f.user_id&&f.user_id!==me&&<button className={'log-news-congrats'+(f.mine?' done':'')} disabled={!!f.mine} onClick={()=>void congrats(f.id)}>🎉 {f.mine?'Gratuliert':'Gratulieren'}</button>}{f.congrats>0&&<small>{f.congrats} {f.congrats===1?'Glückwunsch':'Glückwünsche'}</small>}</div>
    <small className="log-news-meta">Spieltag {Math.floor(f.day)}</small>
   </article>;})()}
   <button className="log-news-arrow" aria-label="Nächste Meldung" onClick={()=>go(1)}>›</button>
  </div>
  <footer>{items.map((x,k)=><button key={x.id} className={k===i?'on':''} aria-label={'Meldung '+(k+1)} onClick={()=>setI(k)}/>)}</footer>
 </section>;
}
