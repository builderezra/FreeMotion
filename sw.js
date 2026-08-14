/* FreeMotion — service worker (queue 112).
 *
 * This file was ZERO BYTES. Registration still succeeded, because an empty script is a perfectly valid
 * service worker that does nothing, so the app has been advertising itself as an installable PWA while
 * having no offline story at all. He edits on a phone; a PWA that cannot open on a train is a PWA in
 * name only.
 *
 * THE CONSTRAINT THAT SHAPES EVERYTHING HERE: this app already has an update mechanism, and a careless
 * service worker would break it. index.html's version label is the source of truth, every script is
 * loaded with a `?v=N` cache-buster, and tapping the version chip unregisters the worker and reloads
 * from a brand-new URL. A worker that served a stale index.html would pin someone to an old build with
 * no way back except that chip — worse than no worker. So:
 *
 *   · NAVIGATIONS ARE NETWORK-FIRST. index.html is the one file whose contents change without its URL
 *     changing, so the network always gets first refusal. The cache is the fallback for when there is
 *     no network — which is the entire point of the feature.
 *   · VERSIONED ASSETS ARE CACHE-FIRST, keyed on the FULL url including `?v=`. That query is a promise
 *     that a given URL's bytes never change, so a hit can be served without asking. Bumping the version
 *     changes the URL, which is a miss, which fetches. The update mechanism does the invalidation for
 *     free and there is nothing to keep in sync.
 *   · THERE IS NO PRECACHE LIST. A hand-maintained list of files would be a second copy of what
 *     index.html already says, and it would go stale the moment a `?v=` bumped — the exact class of
 *     two-sources-of-truth bug this codebase keeps getting bitten by. The cache fills as the app loads,
 *     so the second launch is the offline-capable one.
 *
 * Nothing here touches IndexedDB or blob: URLs, so imported media is unaffected — that lives in
 * storage.js and never goes through fetch.
 */
'use strict';

const CACHE = 'freemotion-v1';

self.addEventListener('install', (e) => {
  // Take over immediately. index.html reloads once on controllerchange (and deliberately skips that on
  // a first install), so waiting would only delay the worker by one launch for no benefit.
  self.skipWaiting();
});

self.addEventListener('activate', (e) => {
  e.waitUntil((async () => {
    const keys = await caches.keys();
    await Promise.all(keys.map(k => (k === CACHE ? null : caches.delete(k))));
    await self.clients.claim();
  })());
});

function isVersionedAsset(url) {
  // Same-origin static assets only. `?v=` is the contract that these bytes are immutable for this URL;
  // anything without it is treated as changeable and goes to the network.
  return url.origin === self.location.origin && url.searchParams.has('v');
}

self.addEventListener('fetch', (e) => {
  const req = e.request;
  if (req.method !== 'GET') return;                       // never cache a write
  let url;
  try { url = new URL(req.url); } catch (_) { return; }
  if (url.protocol !== 'http:' && url.protocol !== 'https:') return;   // blob:/data: media — not ours
  if (url.origin !== self.location.origin) return;        // CDN scripts keep their own caching rules

  // The page itself: network first, cache as a fallback for offline.
  if (req.mode === 'navigate') {
    e.respondWith((async () => {
      try {
        const fresh = await fetch(req);
        // Only keep a good response; a 404 or an opaque error cached here would BE the offline page.
        if (fresh && fresh.ok) {
          const c = await caches.open(CACHE);
          c.put('index-fallback', fresh.clone());
        }
        return fresh;
      } catch (_) {
        const c = await caches.open(CACHE);
        return (await c.match('index-fallback')) || (await c.match(req)) || Response.error();
      }
    })());
    return;
  }

  if (!isVersionedAsset(url)) return;                     // unversioned → straight to the network

  e.respondWith((async () => {
    const c = await caches.open(CACHE);
    const hit = await c.match(req);
    if (hit) return hit;
    try {
      const fresh = await fetch(req);
      if (fresh && fresh.ok) c.put(req, fresh.clone());
      return fresh;
    } catch (err) {
      // Offline and never seen: nothing useful to give back, so fail honestly rather than
      // returning an empty 200 that the app would try to execute as a script.
      throw err;
    }
  })());
});
