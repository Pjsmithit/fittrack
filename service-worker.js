// Cache-first app shell so the program, logging, and progress screens
// all work with no network. YouTube video embeds still require a live
// connection — that's inherent to embedding YouTube, not something a
// service worker can route around, and the app surfaces that state
// explicitly (see js/views/exerciseDetail.js).

const CACHE_NAME = "fittrack-shell-v8";

const SHELL_ASSETS = [
  "./",
  "./index.html",
  "./manifest.webmanifest",
  "./css/styles.css",
  "./js/app.js",
  "./js/db.js",
  "./js/dom.js",
  "./js/router.js",
  "./js/version.js",
  "./js/dayPicker.js",
  "./js/dayTemplateEditor.js",
  "./js/exercisePicker.js",
  "./js/exerciseLibrary.js",
  "./js/programGenerator.js",
  "./js/views/setup.js",
  "./js/views/program.js",
  "./js/views/programDetail.js",
  "./js/views/customBuilder.js",
  "./js/views/editProgram.js",
  "./js/views/day.js",
  "./js/views/exerciseDetail.js",
  "./js/views/logging.js",
  "./js/views/progress.js",
  "./js/views/logGrid.js",
  "./js/views/editLog.js",
  "./data/exercise-library.json",
  "./icons/icon-192.png",
  "./icons/icon-512.png",
  "./icons/icon-192-maskable.png",
  "./icons/icon-512-maskable.png",
  "https://cdn.jsdelivr.net/npm/chart.js@4.4.4/dist/chart.umd.min.js",
];

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(SHELL_ASSETS)).then(() => self.skipWaiting())
  );
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) => Promise.all(keys.filter((k) => k !== CACHE_NAME).map((k) => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener("fetch", (event) => {
  const url = new URL(event.request.url);

  // Never intercept YouTube embed/API traffic — let it hit the network
  // directly (or fail visibly if offline) rather than serving a stale
  // or broken cached response.
  if (url.hostname.includes("youtube")) return;

  event.respondWith(
    caches.match(event.request).then((cached) => {
      if (cached) return cached;
      return fetch(event.request)
        .then((response) => {
          if (event.request.method === "GET" && response.ok) {
            const clone = response.clone();
            caches.open(CACHE_NAME).then((cache) => cache.put(event.request, clone));
          }
          return response;
        })
        .catch(() => cached);
    })
  );
});
