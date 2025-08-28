const cacheName = "cache-v1";
const cacheFiles = [
	"/",
	"/index.html",
	"/script.js",
	"/style.css",
	"/manifest.json",
	"/media/apple-touch-icon.png",
	"/media/icon-192.png",
	"/media/icon-512.png",
	"/media/image-not-found.png"
	"/media/pause.png",
	"/media/play.png",
	"/media/skipNext.png",
	"/media/skipPrev.png",
];

self.addEventListener("install", event => {
	event.waitUntil(
		(async () => {
			const cache = await caches.open(cacheName);
			await cache.addAll(cacheFiles);
		})()
	);
});

self.addEventListener("fetch", event => {
	event.respondWith(
		(async () => {
			const cacheResponse = await caches.match(event.request);
			if (cacheResponse) return cacheResponse;
			const networkResponse = await fetch(event.request);
			const cache = await caches.open(cacheName);
			cache.put(event.request, networkResponse.clone());
			return networkResponse;
		})()
	);
});
