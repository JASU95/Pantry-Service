// Auto Dynamic Versioning: દરરોજ તારીખ પ્રમાણે વર્ઝન ઓટોમેટિક બદલાશે, હાથેથી ચેન્જ નહીં કરવું પડે
const CACHE_VERSION = "pantry-service-v1.0.3_" + new Date().toISOString().slice(0,10);
const CACHE_NAME = "pantry-cache-" + CACHE_VERSION;

const ASSETS_TO_CACHE = [
  "./",
  "./index.html",
  "./manifest.json"
];

// 1. Install Event: નવી ફાઈલો બેકગ્રાઉન્ડમાં ડાઉનલોડ થશે
self.addEventListener("install", (event) => {
  // force skip waiting: નવો કોડ આવતા જ જુના સર્વિસ વર્કરને તરત હટાવી દેશે
  self.skipWaiting();
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      console.log("Caching new assets under name:", CACHE_NAME);
      return cache.addAll(ASSETS_TO_CACHE);
    })
  );
});

// 2. Activate Event: જુની કેશ ફાઈલોને એપ ઓપન થતા જ તરત ડીલીટ કરી નાખશે
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
    }).then(() => self.clients.claim()) // એપનું કંટ્રોલ તરત જ નવા કોડને આપી દેશે
  );
});

// 3. Fetch Event (Network-First Pipeline): પહેલા લાઈવ ઈન્ટરનેટ/GitHub ચેક કરશે
self.addEventListener("fetch", (event) => {
  if (event.request.method !== "GET") return;

  event.respondWith(
    fetch(event.request)
      .then((networkResponse) => {
        // જો ઈન્ટરનેટ ચાલુ છે તો ગિટહબ પરથી નવો ડેટા જ બતાવશે અને બેકગ્રાઉન્ડમાં સ્ટોર કરશે
        if (networkResponse && networkResponse.status === 200) {
          const responseToCache = networkResponse.clone();
          caches.open(CACHE_NAME).then((cache) => {
            cache.put(event.request, responseToCache);
          });
        }
        return networkResponse;
      })
      .catch(() => {
        // જો ફોનમાં ઈન્ટરનેટ બિલકુલ બંધ હશે, ત્યારે જ જૂની સેવ થયેલી ફાઈલ ખોલશે
        return caches.match(event.request).then((cachedResponse) => {
          if (cachedResponse) {
            return cachedResponse;
          }
          return fetch(event.request);
        });
      })
  );
});
