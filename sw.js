const CACHE='hsa-v2';
const CORE=['/', '/index.html', '/post.html', '/verify.html', '/vip.html', '/assets/css/style.css', '/assets/js/app.js'];
self.addEventListener('install', e=>{
  e.waitUntil(caches.open(CACHE).then(c=>c.addAll(CORE)).then(()=>self.skipWaiting()));
});
self.addEventListener('activate', e=>{ e.waitUntil(caches.keys().then(ks=>Promise.all(ks.filter(k=>k!==CACHE).map(k=>caches.delete(k)))).then(()=>self.clients.claim())); });
self.addEventListener('fetch', e=>{
  if(e.request.method!=='GET' || e.request.url.includes('/api/')) return;
  e.respondWith(
    caches.match(e.request).then(cached=>{
      return fetch(e.request).then(res=>{
        if(res && res.status===200 && e.request.url.startsWith('http')){
          const clone=res.clone();
          caches.open(CACHE).then(c=>c.put(e.request, clone));
        }
        return res;
      }).catch(()=>cached);
    })
  );
});
