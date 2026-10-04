const CACHE = 'larp-demo-v0.1.0';
const ASSETS = ['./','./index.html','./manifest.json','./icon-192.png','./icon-512.png','./apple-touch-icon.png'];
self.addEventListener('install', event => {event.waitUntil(caches.open(CACHE).then(cache => cache.addAll(ASSETS)));self.skipWaiting();});
self.addEventListener('activate', event => {event.waitUntil(caches.keys().then(keys => Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k)))));self.clients.claim();});
self.addEventListener('fetch', event => {event.respondWith(caches.match(event.request).then(cached => cached || fetch(event.request)));});
self.addEventListener('notificationclick', event => {event.notification.close();event.waitUntil(clients.matchAll({type:'window',includeUncontrolled:true}).then(list => {if(list.length)return list[0].focus();return clients.openWindow('./');}));});