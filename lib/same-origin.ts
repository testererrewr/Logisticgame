/** CSRF origin check that also works behind a TLS reverse proxy (Caddy):
 * the browser sends https://domain, while the app may see http://127.0.0.1. */
export function sameOrigin(req:Request){
 const origin=req.headers.get('origin');if(!origin)return true;
 let o:URL,u:URL;try{o=new URL(origin);u=new URL(req.url);}catch{return false;}
 if(o.origin===u.origin)return true;
 const hosts=[u.host,req.headers.get('x-forwarded-host')||'',req.headers.get('host')||''].flatMap(h=>h.split(',')).map(h=>h.trim().toLowerCase()).filter(Boolean);
 return hosts.includes(o.host.toLowerCase());
}
