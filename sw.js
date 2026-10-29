
const CACHE = 'saldo-plus-v4';

const FILES = [
  './',
  './index.html',
  './manifest.json',
  './icon.svg',
  './icon-192.png',
  './icon-512.png'
];

self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE)
      .then(cache => cache.addAll(FILES))
  );

  self.skipWaiting();
});

self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys().then(keys =>
      Promise.all(
        keys
          .filter(key => key.startsWith('saldo-plus-') && key !== CACHE)
          .map(key => caches.delete(key))
      )
    )
  );

  self.clients.claim();
});

self.addEventListener('fetch', event => {
  const request = event.request;

  if (request.method !== 'GET') return;

  const url = new URL(request.url);

  if (url.origin !== self.location.origin) return;

  // Sempre tenta buscar a página atualizada no servidor.
  if (
    request.mode === 'navigate' ||
    url.pathname.endsWith('/index.html')
  ) {
    event.respondWith(
      fetch(request, { cache: 'no-store' })
        .then(response => {
          if (response && response.ok) {
            const copy = response.clone();

            caches.open(CACHE).then(cache =>
              cache.put(request, copy)
            );
          }

          return response;
        })
        .catch(() =>
          caches.match(request).then(cached =>
            cached || caches.match('./index.html')
          )
        )
    );

    return;
  }

  // Para os demais arquivos, usa o cache e recorre à rede se necessário.
  event.respondWith(
    caches.match(request).then(cached => {
      if (cached) return cached;

      return fetch(request).then(response => {
        if (response && response.ok) {
          caches.open(CACHE).then(cache =>
            cache.put(request, response.clone())
          );
        }

        return response;
      });
    })
  );
});
