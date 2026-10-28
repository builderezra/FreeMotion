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
/* bughunt6 #2 — HOW LONG A LAUNCH WAITS FOR THE NETWORK before it opens the offline copy instead. The page fetch had no
 * limit: on one bar, or on Wi-Fi that reaches nothing, the installed app showed a blank screen until the platform gave
 * up (about a minute on iOS), then as long again for the blip retry, with a complete offline copy in the cache.
 * 8 s is the app's own number (FM.latestBuild and fmCanFetchLatest give up there too), and it is generous on purpose:
 * #306 is what a short timer brings back, an older build served on a connection that was only slow. When it runs out the
 * launch takes the ordinary offline path, stale marker and all, so the app still says what it served.
 * self.FM_NAV_TIMEOUT_MS is a seam for tests/tests.js, which runs this file in a stub scope with a few hundred ms.
 * Nothing sets it in a real worker. */
const NAV_BUDGET_MS = (typeof self.FM_NAV_TIMEOUT_MS === 'number' && self.FM_NAV_TIMEOUT_MS > 0) ? self.FM_NAV_TIMEOUT_MS : 8000;

self.addEventListener('install', (e) => {
  // Take over immediately. index.html reloads once on controllerchange (and deliberately skips that on
  // a first install), so waiting would only delay the worker by one launch for no benefit.
  self.skipWaiting();
});

self.addEventListener('activate', (e) => {
  e.waitUntil((async () => {
    const keys = await caches.keys();
    await Promise.all(keys.map(k => (k.startsWith('freemotion-') && k !== CACHE ? caches.delete(k) : null)));
    await self.clients.claim();
  })());
});

/* DROP SUPERSEDED COPIES (queue 430). Versioned assets are cached cache-first and keyed on the full
 * URL, which is right — but nothing ever removed the OLD ones, so every release's copy of every changed
 * file stayed forever. On a phone that matters more than disk: the origin's storage is ONE budget shared
 * with IndexedDB, where his imported media lives, and under pressure a browser evicts the whole origin.
 *
 * PRUNED AFTER A GOOD NAVIGATION, not on `activate`: activate only fires when sw.js itself changes
 * byte-wise, which is not most releases, so it would prune rarely and unpredictably.
 *
 * BY PATH, NOT BY PRESENCE — and this is the safety that matters. "Delete anything index.html does not
 * name" would evict assets referenced from CSS (the wordmark is `url('brand-wordmark.png?v=2')`, which
 * appears in no HTML), and offline they would be gone. So: for each versioned URL the live page names,
 * remember its PATH and its `v`. Delete a cached entry only when its path is one of those AND its `v`
 * differs — a superseded copy of a file still in use. Anything whose path the page never mentions is
 * left alone, because this cannot know who needs it.
 * Parsing nothing deletes nothing, so a surprise in the HTML is a no-op rather than a wipe. */
/* bughunt6 #1 — RESOLVED AGAINST THE PAGE, NOT THE ORIGIN. The live app is a GitHub Pages project site: the worker's
 * scope is /FreeMotion/, index.html names its files relatively (`js/app.js?v=490`), and the cache keys are what the page
 * fetched, /FreeMotion/js/app.js?v=490. The names used to be resolved against `self.location.origin`, so `live` held
 * /js/app.js, matched no key, and from v10.69 on nothing but old lessons was ever deleted on his phone. Every check of
 * queue 430 ran at a site root, where the origin and the page's folder are the same place.
 * What that left behind, measured from git (each path?v=N sized as it first shipped): about 170 MB for opening the app
 * once a day since v10.69, 605 MB for opening it after every release, 768 MB as the ceiling since v7.19 (compositor.js
 * alone: 197 versions, 249 MB). The refuter's estimate for his iPhone is 0.2 to 0.4 GB, in the one storage budget his
 * projects' media shares in IndexedDB.
 * THE BASE IS THE NAVIGATION'S OWN URL (`req.url`), the address the browser resolves the page's links against. A
 * redirect never gets here: a navigation is fetched with redirect 'manual', so its answer is not `ok`. Not
 * `registration.scope` or `location.href`: the test stubs carry only `location.origin`. At a site root this resolves
 * every name exactly as before, and a missing base throws inside the try, which parses nothing and deletes nothing.
 * THE BACKLOG GOES IN ONE PASS, BY THE SAME RULE. This walks EVERY key in the cache, not only the ones added since the
 * last load, so the first good navigation under this worker (the reload index.html makes on `controllerchange`, right
 * after it activates) deletes every superseded copy already on the phone. Nothing is added to `activate`: a fetch waits
 * for activation to finish, so a sweep there would hold up that reload, and activate has no page of its own to read.
 * A second pass deletes nothing; a pass the browser cuts short is finished by the next launch. It keeps what it always
 * kept: the version the page names, every path the page does not name (the CSS wordmark, the fx-art thumbnails), this
 * release's lessons and index-fallback. What that rule cannot reach: files index.html stopped naming altogether
 * (js/statusbar.js in 4 versions, js/tts.js in 2, brand-wordmark.png?v=2), about 0.1 MB together. */
async function pruneSuperseded(res, c, pageUrl) {
  let html = '';
  try { html = await res.text(); } catch (_) { return; }
  const live = new Map();                      // path -> the v= this build uses
  const re = /(?:src|href)="([^"]+\?v=[^"]*)"/g;
  let m;
  while ((m = re.exec(html))) {
    try {
      const u = new URL(m[1], pageUrl);
      live.set(u.pathname, u.searchParams.get('v'));
    } catch (_) {}
  }
  if (!live.size) return;                      // parsed nothing → touch nothing
  /* THE TUTORIALS (#1082) are named by no HTML: js/tutorials.js fetches each lesson with the app's VERSION LABEL as
     its ?v=, so they are judged against that label instead — a lesson cached by an older release is superseded. */
  const label = (html.match(/>\s*v(\d+\.\d+)\s*<\/span>/) || [])[1] || null;
  let reqs;
  try { reqs = await c.keys(); } catch (_) { return; }
  await Promise.all(reqs.map((r) => {
    let u;
    try { u = new URL(r.url); } catch (_) { return null; }
    if (!isVersionedAsset(u)) return null;     // index-fallback and the stale marker are not assets
    if (label && /\/tutorials\//.test(u.pathname)) return u.searchParams.get('v') === label ? null : c.delete(r);
    const want = live.get(u.pathname);
    if (want == null) return null;             // this page never mentions that path — not ours to judge
    return u.searchParams.get('v') === want ? null : c.delete(r);
  }));
}

function isVersionedAsset(url) {
  // Same-origin static assets only. `?v=` is the contract that these bytes are immutable for this URL;
  // anything without it is treated as changeable and goes to the network.
  return url.origin === self.location.origin && url.searchParams.has('v');
}

function keepCacheWorkAlive(e, tasks) {
  // The response can finish before these writes do. Keep the worker alive until every task settles,
  // even when Cache Storage rejects a write (for example because the phone is out of space).
  const settled = Promise.allSettled(tasks);
  if (e && typeof e.waitUntil === 'function') e.waitUntil(settled);
}

/* bughunt6 #2 — THE ANSWER THAT LANDS AFTER THE BUDGET STILL REFRESHES THE OFFLINE COPY, for the next launch: the fetch
 * keeps running under waitUntil after the page was served from the cache. Three things it does NOT do, on purpose.
 * It does not clear the stale marker: this launch WAS the offline copy, and the app must still say so.
 * It does not prune: the open page is that offline copy, still loading its own files from the cache.
 * And it replaces the copy only when every script and stylesheet the new page names is already cached. That page never
 * ran, so a release's new files were never fetched, and an offline copy naming files the phone does not hold would hang
 * on them at the next launch instead of opening. A copy of the same release (the usual case) is replaced. */
async function refreshFallbackLate(attempts, c, pageUrl) {
  const res = await attempts;
  if (!res || !res.ok) return;
  let html = '';
  try { html = await res.clone().text(); } catch (_) { return; }
  const need = [];
  const re = /(?:src|href)="([^"]+\?v=[^"]*)"/g;
  let m;
  while ((m = re.exec(html))) {
    try {
      const u = new URL(m[1], pageUrl);
      if (isVersionedAsset(u) && /\.(?:js|css)$/.test(u.pathname)) need.push(u.href);
    } catch (_) {}
  }
  const held = await Promise.all(need.map((href) => c.match(href)));
  if (held.some((r) => !r)) return;
  await c.put('index-fallback', res);
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
      const attempts = (async () => {
        try {
          return await fetch(req, { cache: 'no-cache' });
        } catch (_) {
          try { return await fetch(req, { cache: 'no-cache' }); } catch (_2) { return null; }   // the blip retry
        }
      })();
      /* bughunt6 #2 — ONE BUDGET FOR BOTH TRIES (NAV_BUDGET_MS, at the top). The timer starts with the first fetch and is
         not restarted for the retry, so a retry gets only the time the first try left and the wait cannot double. Past
         it, with an offline copy, the page comes from the cache below and the fetch carries on in the background. With
         nothing cached (a first launch) it keeps waiting, as it always did: there is nothing better to show. */
      let timer = null;
      const outOfTime = {};
      const first = await Promise.race([attempts, new Promise((r) => { timer = setTimeout(() => r(outOfTime), NAV_BUDGET_MS); })]);
      clearTimeout(timer);
      if (first !== outOfTime) fresh = first;
      else if (await c.match('index-fallback') || await c.match(req)) keepCacheWorkAlive(e, [refreshFallbackLate(attempts, c, req.url)]);
      else fresh = await attempts;
      // Only keep a good response; a 404 or an opaque error cached here would BE the offline page.
      if (fresh && fresh.ok) {
        keepCacheWorkAlive(e, [
          c.put('index-fallback', fresh.clone()),
          c.delete(STALE_KEY),         // this load is current — nothing to warn about
          pruneSuperseded(fresh.clone(), c, req.url),
        ]);
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
      if (fresh && fresh.ok) keepCacheWorkAlive(e, [c.put(req, fresh.clone())]);
      return fresh;
    } catch (err) {
      // Offline and never seen: nothing useful to give back, so fail honestly rather than
      // returning an empty 200 that the app would try to execute as a script.
      throw err;
    }
  })());
});
