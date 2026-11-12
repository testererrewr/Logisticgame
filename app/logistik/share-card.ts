'use client';
export async function shareAchievements(o:{player:string;company:string;world?:string;value:number;eh:number;vehicles:number;earned:number;total:number;medals:string[]}){
 const W=1200,H=630,c=document.createElement('canvas');c.width=W;c.height=H;const g=c.getContext('2d')!;
 const grad=g.createLinearGradient(0,0,W,H);grad.addColorStop(0,'#0b1724');grad.addColorStop(1,'#123a3a');g.fillStyle=grad;g.fillRect(0,0,W,H);
 g.fillStyle='#14b8a6';g.fillRect(0,0,W,10);g.font='700 30px system-ui,sans-serif';g.fillStyle='#5eead4';g.fillText('LOADSTAR',60,80);
 g.font='800 64px system-ui,sans-serif';g.fillStyle='#fff';g.fillText(o.company.slice(0,28),60,170);g.font='400 30px system-ui,sans-serif';g.fillStyle='#cbd5e1';g.fillText(`${o.player}${o.world?' · '+o.world:''}`,60,215);
 const tiles:[string,string][]=[['Firmenwert',Math.round(o.value).toLocaleString('de-DE')+' €'],['Ausgeliefert',Math.round(o.eh).toLocaleString('de-DE')+' EH'],['Fahrzeuge',String(o.vehicles)],['Erfolge',`${o.earned} / ${o.total}`]];
 tiles.forEach(([k,v],i)=>{const x=60+i*275,y=280;g.fillStyle='#ffffff14';g.beginPath();(g as any).roundRect?.(x,y,255,150,18);g.fill();g.fillStyle='#94a3b8';g.font='500 24px system-ui,sans-serif';g.fillText(k,x+20,y+45);g.fillStyle='#fff';g.font='800 36px system-ui,sans-serif';g.fillText(v.length>14?v.slice(0,14):v,x+20,y+105);});
 g.font='48px system-ui,sans-serif';g.fillText(o.medals.slice(0,12).join(' '),60,520);g.font='400 24px system-ui,sans-serif';g.fillStyle='#94a3b8';g.fillText(location.host,60,590);
 const blob:Blob=await new Promise(r=>c.toBlob(b=>r(b!),'image/png'));const file=new File([blob],'loadstar-erfolge.png',{type:'image/png'});
 const nav:any=navigator;if(nav.canShare?.({files:[file]})){try{await nav.share({files:[file],title:'Meine Spedition',text:`${o.company} bei Loadstar – spiel mit: ${location.origin}`});return;}catch{}}
 const a=document.createElement('a');a.href=URL.createObjectURL(blob);a.download='loadstar-erfolge.png';a.click();setTimeout(()=>URL.revokeObjectURL(a.href),2000);}
