// Auto Dynamic Versioning using Year-Month-Day to avoid manual changes
const CACHE_VERSION = "pantry-service-v1.0.2_" + new Date().toISOString().slice(0,10);
const CACHE_NAME = "pantry-cache-" + CACHE_VERSION;

const ASSETS_TO_CACHE = [
  "./",
  "./index.html",
  "./manifest.json"
];

// 1. Install Event: Nayi files ko cache storage mein safely store karna
self.addEventListener("install", (event) => {
  // force skip waiting taaki naya service worker back-end mein instantly active ho jaye
  self.skipWaiting();
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      console.log("Caching new assets under name:", CACHE_NAME);
      return cache.addAll(ASSETS_TO_CACHE);
    })
  );
});

// 2. Activate Event: Purane aur bekar caches ko instantly automatic clean up/delete karna
self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.map((cache) => {
          if (cache !== CACHE_NAME) {
            console.log("Deleting old obsolete cache:", cache);
            return caches.delete(cache);
          }
        })
      );
    }).then(() => self.clients.claim()) // App ka immediate control naye service worker ko dena
  );
});

// 3. Fetch Event (Network-First Pipeline): Pehle live internet/GitHub check karega, naya data dikhaega
// Agar wifi/internet nahi chal raha hoga tabhi phone storage ke cache se app open karega.
self.addEventListener("fetch", (event) => {
  if (event.request.method !== "GET") return;

  event.respondWith(
    fetch(event.request)
      .then((networkResponse) => {
        // Agar live internet sahi chal raha hai, toh background cache ko silent update karo
        if (networkResponse && networkResponse.status === 200) {
          const responseToCache = networkResponse.clone();
          caches.open(CACHE_NAME).then((cache) => {
            cache.put(event.request, responseToCache);
          });
        }
        return networkResponse;
      })
      .catch(() => {
        // Agar offline hain (No Internet), tabhi cached fallback response handle hoga
        return caches.match(event.request).then((cachedResponse) => {
          if (cachedResponse) {
            return cachedResponse;
          }
          // Agar dono jagah fail ho jaye to basic fetch return karo
          return fetch(event.request);
        });
      })
  );
});
