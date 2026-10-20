// AudioPIN Lock — service worker: lets the installed app open with no network.
// Network first, so a fresh upload to GitHub Pages shows up straight away; the cache is the fallback.
const CACHE = 'audiopin-lock-v2';   // bump this whenever the file list changes, so installed copies refresh
const FILES = [
  './lock.html', './manifest.webmanifest',
  './icon-192.png', './icon-512.png', './icon-512-maskable.png',
  './rain.wav', './knock.wav', './chirp.wav', './cowbell.wav', './cat.wav'
];

self.addEventListener('install', event => {
  // One missing file must not stop the app from installing, so each is cached on its own.
  event.waitUntil(caches.open(CACHE).then(cache => Promise.all(FILES.map(f => cache.add(f).catch(() => null)))));
  self.skipWaiting();
});

self.addEventListener('activate', event => {
  event.waitUntil(caches.keys().then(keys => Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k)))));
  self.clients.claim();
});

self.addEventListener('fetch', event => {
  if (event.request.method !== 'GET') return;
  event.respondWith(
    fetch(event.request)
      .then(response => {
        if (response.ok) {
          const copy = response.clone();
          caches.open(CACHE).then(cache => cache.put(event.request, copy));
        }
        return response;
      })
      .catch(() => caches.match(event.request, { ignoreSearch: true }))
  );
});
