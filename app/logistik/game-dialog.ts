type DialogKind='confirm'|'prompt'|'alert';

function showDialog(kind:DialogKind,message:string,initial=''):Promise<boolean|string|null>{
 return new Promise(resolve=>{
  const backdrop=document.createElement('div');
  backdrop.className='log-dialog-backdrop';
  backdrop.style.zIndex='100000';
  const panel=document.createElement('section');
  panel.className='log-ranking-dialog log-game-confirm';
  panel.setAttribute('role',kind==='alert'?'alertdialog':'dialog');
  panel.setAttribute('aria-modal','true');
  panel.setAttribute('aria-label',kind==='prompt'?'Eingabe':'Bestätigung');
  const heading=document.createElement('h2');heading.textContent=kind==='prompt'?'Eingabe':kind==='alert'?'Hinweis':'Bitte bestätigen';
  const body=document.createElement('p');body.textContent=message;
  const controls=document.createElement('div');controls.className='log-trailer-toolbar';
  const input=kind==='prompt'?document.createElement('input'):null;
  panel.appendChild(heading);panel.appendChild(body);
  if(input){input.value=initial;input.setAttribute('aria-label',message);panel.appendChild(input);}
  const yes=document.createElement('button');yes.className='log-primary';yes.textContent=kind==='alert'?'Schließen':'Bestätigen';
  const no=kind==='alert'?null:document.createElement('button');if(no){no.className='log-secondary';no.textContent='Abbrechen';}
  const previous=document.activeElement instanceof HTMLElement?document.activeElement:null;
  const close=(value:boolean|string|null)=>{document.removeEventListener('keydown',onKey,true);backdrop.remove();previous?.focus();resolve(value);};
  const onKey=(e:KeyboardEvent)=>{if(e.key==='Escape'){e.preventDefault();e.stopImmediatePropagation();close(kind==='prompt'?null:false);}else if(e.key==='Enter'&&kind==='prompt'&&document.activeElement===input){e.preventDefault();close(input!.value);}};
  yes.onclick=()=>close(kind==='prompt'?input!.value:true);
  if(no)no.onclick=()=>close(kind==='prompt'?null:false);
  controls.appendChild(yes);if(no)controls.appendChild(no);panel.appendChild(controls);backdrop.appendChild(panel);
  backdrop.onclick=e=>{if(e.target===backdrop)close(kind==='prompt'?null:false);};
  document.body.appendChild(backdrop);document.addEventListener('keydown',onKey,true);
  (input||yes).focus();
 });
}

export const gameConfirm=(message:string)=>showDialog('confirm',message) as Promise<boolean>;
export const gamePrompt=(message:string,initial='')=>showDialog('prompt',message,initial) as Promise<string|null>;
export const gameAlert=(message:string)=>showDialog('alert',message) as Promise<boolean>;
