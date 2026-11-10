'use client';
import {Component,type ReactNode} from 'react';

let installed=false,sent=0;const seen=new Set<string>();
export function reportClientError(kind:string,error:unknown,extra:Record<string,unknown>={}){
 try{const e=error instanceof Error?error:new Error(typeof error==='string'?error:JSON.stringify(error));const key=kind+e.message;if(seen.has(key)||sent>=25)return;seen.add(key);sent++;
  const world=new URLSearchParams(location.search).get('welt')||undefined;
  void fetch('/api/logistik/errors',{method:'POST',headers:{'Content-Type':'application/json'},keepalive:true,body:JSON.stringify({kind,name:e.name,message:e.message,stack:e.stack,url:location.pathname+location.search,world,...extra})}).catch(()=>{});
 }catch{}
}
export function installErrorReporter(){if(installed||typeof window==='undefined')return;installed=true;
 window.addEventListener('error',ev=>{if(ev.error||ev.message)reportClientError('window',ev.error||new Error(ev.message+' @ '+ev.filename+':'+ev.lineno));});
 window.addEventListener('unhandledrejection',ev=>reportClientError('promise',ev.reason));
}
export class ErrorBoundary extends Component<{children:ReactNode;label?:string},{failed:Error|null}>{
 state={failed:null as Error|null};
 static getDerivedStateFromError(failed:Error){return {failed};}
 componentDidCatch(error:Error,info:{componentStack?:string|null}){reportClientError('react',error,{component:info.componentStack||'',tab:this.props.label});}
 render(){if(!this.state.failed)return this.props.children;return <section className="log-crash" role="alert"><h2>Diese Ansicht ist abgestürzt</h2><p>Der Fehler wurde automatisch ins Fehlerprotokoll gemeldet.</p><code>{this.state.failed.message}</code><div><button className="log-primary" onClick={()=>this.setState({failed:null})}>Erneut versuchen</button><button className="log-secondary" onClick={()=>location.reload()}>Seite neu laden</button></div></section>;}
}
