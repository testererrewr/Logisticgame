const offlinePage = `<!doctype html>
<html lang="de">
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<meta name="theme-color" content="#101c2a">
<title>Loadstar · Verbindung unterbrochen</title>
<style>
  *{box-sizing:border-box}
  body{margin:0;min-height:100dvh;display:grid;place-items:center;padding:20px;background:#0c1623;color:#e7eff5;font:16px system-ui}
  main{max-width:420px;padding:26px;background:#132535;border:1px solid #375568;border-radius:18px}
  p{color:#b8cddd;line-height:1.5}
  a{display:inline-flex;align-items:center;min-height:44px;padding:10px 16px;background:#5de1ba;color:#0c1623;border-radius:9px;font-weight:700;text-decoration:none}
</style>
<main><h1>Verbindung unterbrochen</h1><p>Loadstar braucht eine Internetverbindung, um deine Welt zu laden.</p><a href="">Erneut verbinden</a></main>
</html>`;

self.addEventListener('install', event => event.waitUntil(self.skipWaiting()));
self.addEventListener('activate', event => event.waitUntil(self.clients.claim()));

self.addEventListener('fetch', event => {
  const {request} = event;
  const url = new URL(request.url);
  if (request.mode !== 'navigate' || request.method !== 'GET' ||
      url.origin !== self.location.origin || url.pathname.startsWith('/api/')) return;

  // Always load the active deployment. Game state, checkout and sessions stay online.
  event.respondWith(fetch(request).catch(() => new Response(offlinePage, {
    status: 503,
    headers: {'Content-Type': 'text/html; charset=utf-8', 'Cache-Control': 'no-store'},
  })));
});
