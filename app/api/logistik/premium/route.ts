import {NextRequest,NextResponse} from 'next/server';
import {currentUser} from '../online/route';
import {sameOrigin} from '../../../../lib/same-origin';
import {publicOrigin} from '../../../../lib/logistics/auth-extra';
import {premiumStatus,paymentConfig,stripeCheckout,stripeSession,stripeFulfil,verifyStripe,paypalCheckout,paypalCapture} from '../../../../lib/logistics/premium-server';
import {logError} from '../../../../lib/logistics/error-log';
import {allowAction,TOO_FAST} from '../../../../lib/logistics/rate-limit';

const reply=(d:unknown,status=200)=>NextResponse.json(d,{status,headers:{'Cache-Control':'no-store'}});
const go=(to:string)=>new Response(null,{status:302,headers:{Location:to,'Cache-Control':'no-store'}});

export async function GET(req:NextRequest){try{const sp=req.nextUrl.searchParams,u=await currentUser(req);
 if(sp.get('stripe')){const cfg=await paymentConfig();if(!u||!cfg?.stripeKey)return go('/premium?fehler=1');const s=await stripeSession(cfg.stripeKey,sp.get('stripe')!);if(s?.client_reference_id!==u.id)return go('/premium?fehler=1');await stripeFulfil(s);return go(s.payment_status==='paid'?'/premium?danke=1':'/premium?offen=1');}
 if(sp.get('paypal')){const cfg=await paymentConfig();if(!u||!cfg?.paypal)return go('/premium?fehler=1');const ok=await paypalCapture(cfg,String(sp.get('token')||''),u.id).catch(()=>false);return go(ok?'/premium?danke=1':'/premium?fehler=1');}
 return reply({status:u?await premiumStatus(u.id):null});}
 catch(e:any){await logError('premium',e,{url:req.url});return go('/premium?fehler=1');}}

export async function POST(req:NextRequest){try{
 const sig=req.headers.get('stripe-signature');
 if(sig){const raw=await req.text(),cfg=await paymentConfig();if(!cfg?.stripeKey||!cfg.stripeWebhook||!await verifyStripe(raw,sig,cfg.stripeWebhook))return reply({error:'Signatur ungültig.'},400);
  const ev=JSON.parse(raw);if(['checkout.session.completed','checkout.session.async_payment_succeeded'].includes(ev.type))await stripeFulfil(ev.data?.object);return reply({received:true});}
 const u=await currentUser(req);if(!u)return reply({error:'Bitte zuerst anmelden.'},401);if(!sameOrigin(req))return reply({error:'Ungültiger Ursprung.'},403);if(!allowAction('premium:'+u.id,1,3))return reply({error:TOO_FAST},429);
 const b=await req.json() as any,cfg=await paymentConfig();if(!cfg)return reply({error:'Premium ist derzeit nicht verfügbar.'},400);const origin=publicOrigin(req);
 if(b.provider==='stripe'&&cfg.stripeKey){const {env}=await import('cloudflare:workers');const row=await env.DB!.prepare('SELECT email FROM users WHERE id=?').bind(u.id).first<{email:string}>();return reply({url:await stripeCheckout(cfg,{id:u.id,email:row?.email||''},origin)});}
 if(b.provider==='paypal'&&cfg.paypal)return reply({url:await paypalCheckout(cfg,u,origin)});
 return reply({error:'Diese Zahlungsart ist nicht aktiv.'},400);}
 catch(e:any){await logError('premium',e,{url:req.url});return reply({error:e.message},422);}}
