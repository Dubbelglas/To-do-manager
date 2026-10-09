const CACHE_NAME = 'todo-manager-pages-v41';
const APP_FILES = [
    './',
    './index.html',
    './styles.css',
    './app.js',
    './task-data.js',
    './spreadsheet.js',
    './task-events.js',
    './toolbar.js',
    './xlsx.full.min.js',
    './manifest.webmanifest',
    './icons/app-icon.svg',
    './icons/app-icon-192.png',
    './icons/app-icon-512.png',
];

self.addEventListener('install', (event) => {
    event.waitUntil(caches.open(CACHE_NAME).then((cache) => cache.addAll(APP_FILES)));
    self.skipWaiting();
});

self.addEventListener('activate', (event) => {
    event.waitUntil((async () => {
        const cacheNames = await caches.keys();
        await Promise.all(cacheNames
            .filter((name) => (name.startsWith('todo-manager-pages-') || name === 'todo-manager-v1') && name !== CACHE_NAME)
            .map((name) => caches.delete(name)));
        await self.clients.claim();
    })());
});

self.addEventListener('fetch', (event) => {
    const request = event.request;
    if (request.method !== 'GET' || new URL(request.url).origin !== self.location.origin) return;

    event.respondWith((async () => {
        const cache = await caches.open(CACHE_NAME);
        const cachedResponse = await cache.match(request);
        if (cachedResponse) return cachedResponse;

        try {
            const response = await fetch(request);
            if (response.ok) await cache.put(request, response.clone());
            return response;
        } catch (error) {
            if (request.mode === 'navigate') {
                return (await cache.match('./index.html')) || (await cache.match('./'));
            }
            throw error;
        }
    })());
});
