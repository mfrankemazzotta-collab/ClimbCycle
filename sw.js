/* ClimbCycle service worker — offline support, NETWORK-FIRST.
   Always prefer fresh files when online (so app updates show up immediately),
   falling back to cache only when offline. Avoids the stale-asset trap of a
   cache-first worker during active development. Bump CACHE to invalidate. */
var CACHE = 'climbcycle-v3';
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
  /* Network-first: fetch fresh, cache a copy, fall back to cache when offline. */
  e.respondWith(
    fetch(req).then(function(res){
      if(res && res.status === 200 && res.type === 'basic'){
        var copy = res.clone();
        caches.open(CACHE).then(function(c){ c.put(req, copy); });
      }
      return res;
    }).catch(function(){ return caches.match(req); })
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
