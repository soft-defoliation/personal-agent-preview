/* Preview only. Production authentication, chats and uploads must never be cached here. */
const scope = self.registration.scope;
const prefix = 'personal-agent-preview:' + scope + ':';
const cacheName = prefix + 'v4';
const assets = new Set(['./','./index.html','./app.css','./app.js','./manifest.webmanifest','./icon.svg','./icon-192.png','./icon-512.png'].map(path => new URL(path, scope).href));
self.addEventListener('install', event => {
  event.waitUntil(caches.open(cacheName).then(cache => cache.addAll([...assets].map(url => new Request(url, {cache:'reload', credentials:'omit'})))));
});
self.addEventListener('activate', event => {
  event.waitUntil(caches.keys().then(keys => Promise.all(keys.filter(key => key.startsWith(prefix) && key !== cacheName).map(key => caches.delete(key)))).then(() => self.clients.claim()));
});
self.addEventListener('fetch', event => {
  const req = event.request;
  if (req.method !== 'GET' || !assets.has(req.url)) return;
  event.respondWith(fetch(req).catch(async error => {
    const copy = await (await caches.open(cacheName)).match(req);
    if (copy) return copy;
    throw error;
  }));
});
