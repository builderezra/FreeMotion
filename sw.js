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
/* Where the fallback path leaves its note for the page (queue 306). A cache entry rather than a
 * postMessage: the page boots long after the navigation was answered, so there is no live worker
 * conversation to join, and a message sent to nobody is exactly the kind of thing that would make
 * this warning fail to appear on the one occasion it mattered. */
const STALE_KEY = 'served-stale-shell';

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

  /* The page itself: network first, cache as a fallback for offline.
   *
   * QUEUE 306 — THE SILENT DOWNGRADE. Ezra, repeatedly and for weeks: *"an older version of our
   * project shows up when you refresh"*, *"The glitch that shows the old version of FreeMotion that has
   * a more alight motion look STILL shows up when I press refresh… it's such a big issue, PLEASE"*.
   * Nobody has reproduced it on this machine, and this is the one untested path that fits the whole
   * description rather than part of it: serve a stale index.html and every `?v=` URL it names is an OLD
   * url, which the asset branch below then answers CACHE-FIRST — so a single failed fetch does not give
   * you a slightly-off page, it hands you a complete older build of the app.
   *
   * Two changes, and the second matters more than the first.
   *
   * 1. ONE RETRY BEFORE GIVING UP. The trigger is `fetch` THROWING, and on a phone that is a momentary
   *    radio blip on refresh, not a train tunnel. A single immediate retry costs nothing when the
   *    network is fine and removes the entire class of "it did it again for one second".
   *
   * 2. IT SAYS SO WHEN IT HAPPENS. The real damage here is that the downgrade is SILENT — the app just
   *    looks wrong, with no way for him or me to tell whether the service worker did it. So the
   *    fallback path now records that it fired, and which build it served, and the app reads that on
   *    boot and tells him in plain words. That turns "I cannot reproduce it" into one observation from
   *    his own phone: if the message appears, this was the cause and the guessing stops; if it never
   *    appears while the glitch does, this path is exonerated and the search moves elsewhere.
   *    The marker is CLEARED on every good navigation, so it can only ever describe this load.
   */
  if (req.mode === 'navigate') {
    e.respondWith((async () => {
      const c = await caches.open(CACHE);
      let fresh = null;
      /* REVALIDATE — do not accept the browser's own HTTP cache for the page (queue 306).
       *
       * A plain `fetch(req)` for a navigation is allowed to be answered from the HTTP cache, and GitHub
       * Pages serves HTML with `Cache-Control: max-age=600`. So for TEN MINUTES after a deploy, a refresh
       * can return the PREVIOUS index.html without ever touching the network — and that response is `ok`,
       * so none of the machinery below fires: no stale marker, no warning, nothing to see. Every `?v=`
       * inside that old page then names an old asset URL, which the asset branch answers CACHE-FIRST.
       * The result is a complete older build of the app, arriving silently, on a perfectly good
       * connection. That matches his report better than the offline path does — and it explains why the
       * offline warning has never appeared while the glitch has.
       * `cache: 'no-cache'` still uses the network and still allows a 304, so it costs a revalidation
       * round trip and nothing more. The blip retry is unchanged. */
      try {
        fresh = await fetch(req, { cache: 'no-cache' });
      } catch (_) {
        try { fresh = await fetch(req, { cache: 'no-cache' }); } catch (_2) { fresh = null; }   // the blip retry
      }
      // Only keep a good response; a 404 or an opaque error cached here would BE the offline page.
      if (fresh && fresh.ok) {
        c.put('index-fallback', fresh.clone());
        c.delete(STALE_KEY);          // this load is current — nothing to warn about
        return fresh;
      }
      if (fresh) return fresh;        // a real error response is the server's answer, not ours to replace
      const cached = await c.match('index-fallback') || await c.match(req);
      if (!cached) return Response.error();
      /* Stamp what we are about to hand over. Read from a CLONE — the body can only be consumed once,
         and consuming it here would serve an empty page, which is a far worse bug than the one this is
         trying to diagnose. A version we cannot parse still records the fact, as '?'. */
      try {
        const html = await cached.clone().text();
        const m = html.match(/>\s*(v\d+\.\d+)\s*<\/span>/);
        await c.put(STALE_KEY, new Response(m ? m[1] : '?'));
      } catch (_) { /* the warning is a nicety; never let it stop the page loading */ }
      return cached;
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
