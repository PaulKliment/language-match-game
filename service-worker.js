const CACHE_NAME = "spojovacka-cache-v1";

// Změněno na relativní cesty s tečkou, aby to fungovalo všude (i v podsložkách)
const ASSETS = [
  "./",
  "./index.html",
  "./style.css",
  "./script.js",
  "./words.json",
  "./manifest.json",
  "./icons/icon-192.png",
  "./icons/icon-512.png",
  "./sounds/correct.mp3",
  "./sounds/wrong.mp3"
];

// Instalace SW
self.addEventListener("install", event => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => {
        console.log("PWA: Cache otevřena, stahuji soubory...");
        return cache.addAll(ASSETS);
      })
  );
});

// Aktivace SW (Vyčištění staré cache při aktualizaci kódu)
self.addEventListener("activate", event => {
  event.waitUntil(
    caches.keys().then(keys => {
      return Promise.all(
        keys.map(key => {
          if (key !== CACHE_NAME) {
            console.log("PWA: Mažu starou cache:", key);
            return caches.delete(key);
          }
        })
      );
    })
  );
});

// Fetch (Načítání offline)
self.addEventListener("fetch", event => {
  event.respondWith(
    caches.match(event.request)
      .then(response => {
        // Vrátí soubor z cache, pokud tam je. Jinak jde na internet.
        return response || fetch(event.request);
      })
  );
});