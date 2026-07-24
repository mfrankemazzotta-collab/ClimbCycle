/* ClimbCycle service worker — offline shell + runtime cache.
   Cache-first with runtime population, so we don't need an exhaustive asset
   list (a wrong path there would break install). The first online load fills
   the cache; later loads work fully offline. Bump CACHE to invalidate. */
var CACHE = 'climbcycle-v1';
var SHELL = ['./', './index.html', './manifest.json', './icon.svg', './css/app.css'];

self.addEventListener('install', function(e){
  e.waitUntil(
    caches.open(CACHE).then(function(c){ return c.addAll(SHELL).catch(function(){}); })
      .then(function(){ return self.skipWaiting(); })
  );
});

self.addEventListener('activate', function(e){
  e.waitUntil(
    caches.keys().then(function(keys){
      return Promise.all(keys.filter(function(k){ return k !== CACHE; })
                             .map(function(k){ return caches.delete(k); }));
    }).then(function(){ return self.clients.claim(); })
  );
});

self.addEventListener('fetch', function(e){
  var req = e.request;
  if(req.method !== 'GET') return;
  var url = new URL(req.url);
  if(url.origin !== self.location.origin) return;   /* let cross-origin (fonts, Supabase) pass through */
  e.respondWith(
    caches.match(req).then(function(cached){
      if(cached) return cached;
      return fetch(req).then(function(res){
        if(res && res.status === 200 && res.type === 'basic'){
          var copy = res.clone();
          caches.open(CACHE).then(function(c){ c.put(req, copy); });
        }
        return res;
      }).catch(function(){ return cached; });
    })
  );
});

/* Focus/open the app when a reminder notification is tapped. */
self.addEventListener('notificationclick', function(e){
  e.notification.close();
  e.waitUntil(
    self.clients.matchAll({ type:'window' }).then(function(list){
      for(var i=0;i<list.length;i++){ if('focus' in list[i]) return list[i].focus(); }
      if(self.clients.openWindow) return self.clients.openWindow('./index.html');
    })
  );
});
