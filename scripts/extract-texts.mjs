import fs from 'node:fs';import path from 'node:path';
const root=path.resolve(process.argv[2]||'.'),out={};const files=[];
(function walk(d){for(const f of fs.readdirSync(d)){const p=path.join(d,f);const st=fs.statSync(p);if(st.isDirectory()){if(!['node_modules','dist','.git'].includes(f))walk(p);}else if(/\.(tsx|ts)$/.test(f))files.push(p);}})(path.join(root,'app'));
const de=/[äöüÄÖÜß]|\b(der|die|das|und|nicht|mit|für|ist|ein|eine|Fahrzeug|Linie|Auftrag|Spedition|Lager|Welt|Allianz)\b/;
for(const f of files){const src=fs.readFileSync(f,'utf8');const rel=path.relative(root,f);const add=t=>{t=t.replace(/\s+/g,' ').trim();if(/[{}<>=;\[\]]|=>|\(\)|className|\.map\(/.test(t))return;if(t.length<2||!/[A-Za-zÄÖÜäöü]/.test(t)||!de.test(t)||/^[\w.-]+$/.test(t)&&!/[äöüß]/.test(t))return;(out[t]??=new Set()).add(rel);};
 for(const m of src.matchAll(/>([^<>{}]{2,400})</g))add(m[1]);
 for(const m of src.matchAll(/'([^'\\\n]{3,400})'/g))add(m[1]);
 for(const m of src.matchAll(/`([^`\\$]{3,400})`/g))add(m[1]);}
const sorted=Object.fromEntries(Object.keys(out).sort((a,b)=>a.localeCompare(b,'de')).map(k=>[k,'']));
fs.writeFileSync(path.join(root,'lang/texte-de-en.json'),JSON.stringify(sorted,null,1));console.log(Object.keys(sorted).length+' Texte → lang/texte-de-en.json');
