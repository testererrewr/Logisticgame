import fs from 'node:fs/promises';
import {modelIllustrationFile} from '../lib/vehicle-art.mjs';
const xml=s=>String(s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&apos;'}[c]));
const r=(x,y,w,h,fill,rx=0,extra='')=>`<rect x="${x}" y="${y}" width="${w}" height="${h}" rx="${rx}" fill="${fill}" ${extra}/>`;
const p=(d,fill,extra='')=>`<path d="${d}" fill="${fill}" ${extra}/>`;
const line=(x,y,xx,yy,color,width=2)=>`<path d="M${x} ${y}L${xx} ${yy}" fill="none" stroke="${color}" stroke-width="${width}" stroke-linecap="round"/>`;
const wheel=(x,y,size=16)=>`<circle cx="${x}" cy="${y}" r="${size}" fill="#233b4b"/><circle cx="${x}" cy="${y}" r="${size*.5}" fill="#c4d1d7"/><circle cx="${x}" cy="${y}" r="${size*.19}" fill="#78909c"/>`;
const glass='#294e62',glassLight='#7da3b2',silver='#e3e9eb';
function windows(x,y,n,w,h,gap=6){return Array.from({length:n},(_,i)=>r(x+i*(w+gap),y,w,h,glass,3)+line(x+i*(w+gap)+4,y+4,x+i*(w+gap)+w-4,y+4,glassLight,1)).join('');}
function bus(m,color){
 const type=m.vehicleType.toLowerCase(),artic=/gelenk/.test(type),doubleArtic=/doppelgelenk/.test(type),deck=/doppeldeck/.test(type),mini=/klein|kompakt/.test(type),coach=/reise/.test(type),trolley=/oberleitung/.test(type),school=/schulbus/.test(type),length=mini?350:artic?650:490,x=(800-length)/2,y=deck?125:157,h=deck?135:103,body=school?'#dcaa3c':color;
 let out=`<ellipse cx="400" cy="284" rx="${length*.51}" ry="10" fill="#1a4151" opacity=".09"/>`;
 out+=p(`M${x+13} ${y}H${x+length-36}Q${x+length-4} ${y+2} ${x+length} ${y+34}V${y+h-13}Q${x+length} ${y+h} ${x+length-13} ${y+h}H${x+13}Q${x} ${y+h} ${x} ${y+h-13}V${y+13}Q${x} ${y} ${x+13} ${y}`,silver);
 out+=r(x,y+Math.round(h*.58),length,h*.26,body,0)+line(x+10,y+h-6,x+length-12,y+h-6,'#b1c0c7',3);
 const rows=deck?2:1,w=mini?37:artic?31:43,n=Math.floor((length-55)/(w+5));for(let row=0;row<rows;row++)out+=windows(x+17,y+12+row*47,n,w,deck?34:coach?45:39,5);
 out+=p(`M${x+length-38} ${y+10}Q${x+length-6} ${y+11} ${x+length-7} ${y+40}V${y+57}H${x+length-38}Z`,glass);
 const doors=coach?1:mini?1:artic?3:2;for(let d=0;d<doors;d++){let dx=x+length-52-d*(length-110)/doors;out+=r(dx,y+(deck?62:12),30,deck?65:80,'#afc1ca',2)+r(dx+3,y+(deck?65:15),24,deck?42:45,glass,1)+line(dx+15,y+(deck?65:15),dx+15,y+h-5,'#c4d3d8',1);}
 if(artic){for(let a=1;a<=(doubleArtic?2:1);a++){const ax=x+length*a/(doubleArtic?3:2)-10;out+=r(ax,y+2,24,h-4,'#677b84',1);for(let i=0;i<6;i++)out+=line(ax+3+i*3,y+5,ax+3+i*3,y+h-7,'#c1cbd0',1);}}
 out+=wheel(x+67,y+h,17)+wheel(x+length-75,y+h,17);if(artic)out+=wheel(x+length*.58,y+h,17);if(doubleArtic)out+=wheel(x+length*.34,y+h,17);
 if(trolley)out+=line(x+length*.45,y,x+length*.68,y-48,'#456372',3)+line(x+length*.5,y,x+length*.73,y-48,'#456372',3)+line(x+length*.64,y-48,x+length*.79,y-48,'#456372',2);
 if(m.energyType==='electricity')out+=r(x+19,y+h-26,24,10,'#6b986b',3);return out;
}
function train(m,color){
 const loco=m.trainRole==='locomotive',coach=m.trainRole==='coach',high=/hochgeschwind|hochgeschwindigkeit/i.test(m.vehicleType),deck=/doppelstock|double|duplex|dd|kiss/i.test(m.vehicleType+' '+m.name),count=loco||coach?1:Math.max(1,Math.min(5,Math.round((m.lengthM||75)/27))),gap=8,total=loco?320:coach?415:Math.min(700,300+count*80),w=(total-gap*(count-1))/count,start=(800-total)/2,y=deck?150:170,h=deck?96:76;let out=`<ellipse cx="400" cy="282" rx="${total*.5}" ry="8" fill="#1a4151" opacity=".08"/>`+line(35,277,765,277,'#a3b5bd',3)+line(35,285,765,285,'#d4dfe3',2);
 for(let i=0;i<count;i++){const x=start+i*(w+gap),nose=high&&!coach&&!loco&&i===count-1;out+=p(`M${x+12} ${y}H${x+w-(nose?37:12)}Q${x+w-12} ${y} ${x+w} ${y+(nose?42:12)}V${y+h-7}H${x}V${y+12}Q${x} ${y} ${x+12} ${y}`,silver)+r(x+2,y+h-25,w-4,14,color)+line(x+7,y+h-6,x+w-7,y+h-6,'#7c939e',2);
 if(loco){out+=r(x+24,y+8,42,31,glass,4)+r(x+w-66,y+8,42,31,glass,4);for(let z=0;z<7;z++)out+=line(x+88+z*20,y+16,x+88+z*20,y+40,'#9aaeb6',4);}else{const n=Math.max(2,Math.floor((w-30)/(deck?22:25))),ww=(w-28-(n-1)*5)/n;out+=windows(x+14,y+12,n,ww,deck?22:27,5);if(deck)out+=windows(x+14,y+42,n,ww,22,5);}
 if(loco||(!coach&&i===count-1)){out+=p(`M${x+w-28} ${y+8}L${x+w-9} ${y+27}V${y+39}H${x+w-28}Z`,glass);}
 out+=wheel(x+27,y+h+8,10)+wheel(x+48,y+h+8,10)+wheel(x+w-48,y+h+8,10)+wheel(x+w-27,y+h+8,10);
 if(i<count-1)out+=r(x+w,y+20,gap,h-30,'#6b818d',2);
 if(m.traction==='electric'&&i===0)out+=p(`M${x+w*.47} ${y}L${x+w*.38} ${y-23}L${x+w*.53} ${y-41}L${x+w*.65} ${y-23}L${x+w*.55} ${y}`, 'none','stroke="#486371" stroke-width="2.5"')+line(x+w*.48,y-41,x+w*.59,y-41,'#486371',4);
 }return out;
}
function plane(m,color){
 const turbo=/turboprop|klein-|pendler/i.test(m.vehicleType),wide=/großraum/i.test(m.vehicleType),superSonic=/überschall/i.test(m.vehicleType),length=superSonic?650:wide?660:turbo?415:540,x=(800-length)/2,y=superSonic?191:wide?181:193,h=wide?59:turbo?34:42,tail=x+length*.08,wing=x+length*.48;let out=`<ellipse cx="400" cy="281" rx="${length*.44}" ry="10" fill="#1a4151" opacity=".07"/>`;
 out+=p(`M${wing} ${y+h*.4}L${wing-length*.11} ${y-74}L${wing-length*.04} ${y-76}L${wing+length*.13} ${y+h*.4}Z`,'#b1c5ce');
 out+=p(`M${x+18} ${y+h*.3}L${tail-22} ${y-78}Q${tail-14} ${y-87} ${tail-4} ${y-84}L${tail+39} ${y+h*.3}Z`,color);
 out+=p(`M${x} ${y+h*.5}Q${x+17} ${y} ${x+80} ${y}H${x+length-70}Q${x+length-29} ${y} ${x+length} ${y+h*.52}Q${x+length-27} ${y+h} ${x+length-70} ${y+h}H${x+70}Q${x+12} ${y+h} ${x} ${y+h*.5}`,silver);
 out+=p(`M${x+22} ${y+h*.7}H${x+length-32}Q${x+length-48} ${y+h} ${x+length-70} ${y+h}H${x+70}Q${x+36} ${y+h} ${x+22} ${y+h*.7}`,color);
 out+=windows(x+100,y+9,Math.max(5,Math.floor((length-190)/16)),6,8,9);
 out+=p(`M${x+length-70} ${y+6}Q${x+length-48} ${y+8} ${x+length-31} ${y+20}L${x+length-61} ${y+20}Z`,glass);
 out+=p(`M${wing} ${y+h*.5}L${wing+length*.26} ${y+h+36}L${wing+length*.1} ${y+h+40}L${wing-length*.06} ${y+h*.6}Z`,'#bbcdd5');
 out+=p(`M${x+20} ${y+h*.6}L${x+length*.18} ${y+h+17}L${x+length*.23} ${y+h+15}L${x+length*.12} ${y+h*.35}Z`,'#9db6c3');
 const engines=turbo?2:/a340|a380|747|an-124|il-96|concorde/i.test(m.name)?4:2;for(let i=0;i<engines/2;i++){const ex=wing+length*.055+i*42;out+=r(ex,y+h+10,46,turbo?15:22,color,10)+r(ex+38,y+h+13,8,turbo?9:16,glass,3);if(turbo)out+=line(ex+48,y+h-7,ex+48,y+h+37,'#47616d',3);}
 return out;
}
function ship(m,color){
 const cruise=/kreuzfahrt/i.test(m.vehicleType),hydro=/tragflächen/i.test(m.vehicleType),fast=/schnell/i.test(m.vehicleType),ropax=/ropax|autofähre/i.test(m.vehicleType),length=cruise?680:ropax?580:fast?450:360,x=(800-length)/2,bottom=260,decks=cruise?6:ropax?3:fast?2:2;let out='';
 for(let i=0;i<3;i++)out+=p(`M${45+i*14} ${278+i*8}Q${155+i*11} ${270+i*8} ${265+i*12} ${278+i*8}T${485+i*12} ${278+i*8}T${755-i*12} ${278+i*8}`,'none',`stroke="${i?'#c4dce3':'#98c6d3'}" stroke-width="${i?1.5:3}"`);
 out+=p(`M${x} ${bottom-39}H${x+length}L${x+length-48} ${bottom+14}Q${x+length-58} ${bottom+20} ${x+length-75} ${bottom+20}H${x+44}Z`,color)+line(x+34,bottom+8,x+length-65,bottom+8,'#e0ebef',3);
 for(let d=0;d<decks;d++){const dx=x+25+d*(cruise?14:10),dy=bottom-39-(d+1)*20,width=length-65-d*(cruise?35:28);out+=r(dx,dy,width,21,silver,3)+windows(dx+10,dy+6,Math.floor((width-20)/18),11,7,7);}
 const bridgeX=x+length-(cruise?120:100),bridgeY=bottom-39-decks*20;out+=p(`M${bridgeX-90} ${bridgeY+12}V${bridgeY-15}H${bridgeX+10}L${bridgeX+28} ${bridgeY+12}Z`,silver)+windows(bridgeX-83,bridgeY-8,5,14,10,3)+line(bridgeX-30,bridgeY-15,bridgeX-30,bridgeY-44,'#657f8c',2);
 if(cruise||ropax){out+=p(`M${x+length*.34} ${bridgeY+10}L${x+length*.36} ${bridgeY-21}H${x+length*.44}V${bridgeY+10}Z`,color)+r(x+length*.355,bridgeY-24,length*.09,8,glass,2);}
 if(hydro)out+=line(x+length*.28,bottom+12,x+length*.22,bottom+28,'#476777',4)+line(x+length*.75,bottom+12,x+length*.7,bottom+28,'#476777',4);
 return out;
}
export function renderModelIllustration(m){
 const palette=['#347d8b','#4c718e','#4e8673','#6b7198','#9b7646','#3a789e'],hash=[...m.manufacturer].reduce((n,c)=>n+c.charCodeAt(0),0),color=palette[hash%palette.length],nameSize=m.name.length>47?18:m.name.length>34?22:26,mode={bus:'BUS',train:'BAHN',plane:'FLUGZEUG',ship:'SCHIFF'}[m.mode],art={bus,train,plane,ship}[m.mode](m,color);
 return `<svg xmlns="http://www.w3.org/2000/svg" width="800" height="360" viewBox="0 0 800 360" role="img" aria-labelledby="title desc"><title id="title">${xml(m.name)} – schematische Modellillustration</title><desc id="desc">Eigene Illustration nach Bauart ${xml(m.vehicleType)}. Keine maßstabsgetreue Herstellerzeichnung. Angaben sind Spielwerte. CC0 1.0.</desc><metadata>Weltverbund original schematic artwork. https://creativecommons.org/publicdomain/zero/1.0/</metadata><defs><linearGradient id="bg" x2="0" y2="1"><stop stop-color="#f7faf9"/><stop offset="1" stop-color="#eaf0f1"/></linearGradient></defs>${r(0,0,800,360,'url(#bg)')}${r(30,28,4,48,color,2)}<g font-family="Arial, sans-serif"><text x="48" y="42" font-size="10" font-weight="700" letter-spacing="2" fill="#6b818b">${mode} · ${xml(m.manufacturer.toLocaleUpperCase('de'))}</text><text x="48" y="72" font-size="${nameSize}" font-weight="700" fill="#294a59">${xml(m.name)}</text><text x="48" y="94" font-size="12" fill="#6b818b">${xml(m.vehicleType)}</text>${art}<text x="35" y="329" font-size="10" font-weight="600" letter-spacing="1.1" fill="#6b818b">SCHEMATISCHE MODELLILLUSTRATION</text><text x="765" y="329" text-anchor="end" font-size="11" fill="#59717e">${xml(m.capacity)} Plätze · ${xml(m.speed)} km/h · Spielwerte</text></g></svg>`;
}
if(process.argv.includes('--write')){const models=JSON.parse(await fs.readFile('data/catalog-import-1084.json','utf8')),paths=new Set();for(const m of models){const path=modelIllustrationFile(m.id);if(paths.has(path))throw Error('Illustration hash collision');paths.add(path);await fs.writeFile('public'+path,renderModelIllustration(m));}await fs.writeFile('data/vehicle-illustration-ids.json',JSON.stringify(models.map(m=>m.id))+'\n');console.log('Original schematic model illustrations: '+models.length);}
