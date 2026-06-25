var CACHE_NAME = 'ontrack-v3';
var ASSETS = [
  './',
  './index.html',
  './styles.css',
  './config.js',
  './data.js',
  './app.js',
  './supabase.js',
  './manifest.json'
];

self.addEventListener('install', function (e) {
  e.waitUntil(
    caches.open(CACHE_NAME).then(function (cache) {
      return cache.addAll(ASSETS);
    })
  );
});

self.addEventListener('activate', function (e) {
  e.waitUntil(
    caches.keys().then(function (names) {
      return Promise.all(
        names.filter(function (n) { return n !== CACHE_NAME; })
          .map(function (n) { return caches.delete(n); })
      );
    })
  );
});

self.addEventListener('fetch', function (e) {
  e.respondWith(
    fetch(e.request).then(function (response) {
      var clone = response.clone();
      caches.open(CACHE_NAME).then(function (cache) {
        cache.put(e.request, clone);
      });
      return response;
    }).catch(function () {
      return caches.match(e.request);
    })
  );
});
