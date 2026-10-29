const V='nb-v23',SHELL=['./','index.html','assets/style.css?v=12','assets/app.js?v=13','assets/deck.js?v=1','assets/deck.css?v=1','assets/econ.js?v=2','assets/gov.js?v=2','assets/my.js?v=4','assets/my.css?v=3','assets/sharp.js?v=1','assets/fun.js?v=1','manifest.webmanifest','icons/icon-192.png','og-image.png','favicon.ico'];
self.addEventListener('install',e=>{e.waitUntil(caches.open(V).then(c=>c.addAll(SHELL)));self.skipWaiting()});
self.addEventListener('activate',e=>{e.waitUntil(caches.keys().then(ks=>Promise.all(ks.filter(k=>k!==V).map(k=>caches.delete(k)))));self.clients.claim()});
self.addEventListener('fetch',e=>{const u=new URL(e.request.url);if(e.request.method!=='GET'||u.origin!==location.origin)return;
  // 데이터·HTML은 네트워크 우선(오프라인 시 캐시), 정적 자산은 캐시 우선
  const net=u.pathname.includes('/data/')||e.request.mode==='navigate';
  e.respondWith(net?fetch(e.request).then(r=>{const c=r.clone();caches.open(V).then(x=>x.put(e.request,c));return r}).catch(()=>caches.match(e.request,{ignoreSearch:true}).then(r=>r||(e.request.mode==='navigate'?caches.match('index.html'):r)))
    :caches.match(e.request).then(r=>r||fetch(e.request)))});
