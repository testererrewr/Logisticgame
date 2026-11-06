export class RoadRequestPool {
 private inFlight=new Map<string,Promise<unknown>>();private queue:(()=>void)[]=[];private active=0;private last=0;private timer:ReturnType<typeof setTimeout>|undefined;
 constructor(private gapMs=1200,private concurrency=2){}
 run<T>(key:string,work:()=>Promise<T>):Promise<T>{const existing=this.inFlight.get(key);if(existing)return existing as Promise<T>;const result=new Promise<T>((resolve,reject)=>{this.queue.push(()=>{this.active++;this.last=Date.now();Promise.resolve().then(work).then(resolve,reject).finally(()=>{this.active--;this.inFlight.delete(key);this.pump();});});});this.inFlight.set(key,result);this.pump();return result;}
 private pump(){if(this.timer||this.active>=this.concurrency||!this.queue.length)return;const wait=this.last+this.gapMs-Date.now();if(wait>0){this.timer=setTimeout(()=>{this.timer=undefined;this.pump();},wait);return;}this.queue.shift()!();this.pump();}
}
