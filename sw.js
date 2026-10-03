// Service worker de la app del conductor: permite abrirla sin cobertura.
// Sube el número de versión cuando cambies index.html para que los móviles se actualicen antes.
const CACHE = 'deca-conductor-v3';
const BASICOS = [
  './', './index.html', './manifest.webmanifest', './icon-192.png', './icon-512.png',
  'https://cdn.jsdelivr.net/npm/qrcode-generator@1.4.4/qrcode.min.js',
  'https://cdnjs.cloudflare.com/ajax/libs/jspdf/2.5.1/jspdf.umd.min.js',
  'https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2.45.4/dist/umd/supabase.js'
];
self.addEventListener('install', e => {
  e.waitUntil(caches.open(CACHE).then(c => Promise.all(BASICOS.map(u => c.add(u).catch(() => null)))).then(() => self.skipWaiting()));
});
self.addEventListener('activate', e => {
  e.waitUntil(caches.keys().then(ks => Promise.all(ks.filter(k => k !== CACHE).map(k => caches.delete(k)))).then(() => self.clients.claim()));
});
self.addEventListener('fetch', e => {
  const req = e.request;
  if(req.method !== 'GET') return;
  const url = new URL(req.url);
  if(url.hostname.endsWith('supabase.co')) return;           // los datos siempre del servidor
  if(req.mode === 'navigate'){
    // páginas: primero la red (para tener siempre la última versión); sin red, la guardada
    e.respondWith(fetch(req).then(r => { const copia = r.clone(); caches.open(CACHE).then(c => c.put(req, copia)); return r; })
      .catch(() => caches.match(req).then(r => r || (/\/$|index\.html$/.test(url.pathname) ? caches.match('./index.html') : undefined))));
    return;
  }
  // librerías, iconos…: lo guardado primero; si no está, de la red y se guarda
  e.respondWith(caches.match(req).then(r => r || fetch(req).then(resp => {
    if(resp.ok && (url.origin === location.origin || /cdn\.jsdelivr\.net|cdnjs\.cloudflare\.com/.test(url.hostname))){ const copia = resp.clone(); caches.open(CACHE).then(c => c.put(req, copia)); }
    return resp;
  })));
});

// Al tocar un aviso (carga nueva, «¿has descargado?»…) se abre la app
self.addEventListener('notificationclick', e => {
  e.notification.close();
  e.waitUntil(self.clients.matchAll({type: 'window', includeUncontrolled: true}).then(cs => {
    const c = cs.find(x => /index(-prueba)?\.html|\/$/.test(new URL(x.url).pathname));
    return c ? c.focus() : self.clients.openWindow('./index.html');
  }));
});
