const CACHE_NAME = 'karakiya-subscriptions-v1';

const APP_SHELL = [
  './',
  './index.html',
  './logo.png',
  './manifest.json'
];

const CDN_ASSETS = [
  'https://cdn.tailwindcss.com',
  'https://unpkg.com/react@18/umd/react.development.js',
  'https://unpkg.com/react-dom@18/umd/react-dom.development.js',
  'https://unpkg.com/@babel/standalone/babel.min.js',
  'https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2'
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    (async () => {
      const cache = await caches.open(CACHE_NAME);
      await cache.addAll(APP_SHELL);
      await Promise.all(CDN_ASSETS.map(async (url) => {
        try {
          const response = await fetch(url);
          if (response.ok) {
            await cache.put(url, response);
          }
        } catch (err) {
          console.warn('Не удалось закэшировать ' + url, err);
        }
      }));
      await self.skipWaiting();
    })()
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(keys.filter((key) => key !== CACHE_NAME).map((key) => caches.delete(key)))
    ).then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', (event) => {
  const url = new URL(event.request.url);

  // Запросы к Supabase всегда ходит по сети — без связи приложение само покажет локальные данные
  if (url.hostname.endsWith('supabase.co')) {
    return;
  }

  event.respondWith(
    (async () => {
      const cached = await caches.match(event.request);
      if (cached) {
        return cached;
      }
      try {
        return await fetch(event.request);
      } catch (err) {
        // Навигация без сети — отдаём оболочку приложения
        if (event.request.mode === 'navigate') {
          return caches.match('./index.html');
        }
        throw err;
      }
    })()
  );
});
