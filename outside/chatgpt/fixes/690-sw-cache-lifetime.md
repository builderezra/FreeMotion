# Keep offline cache writes alive after responses

Starting commit: `ffb3742e4c70943b589844ae9bf89907377f33c5` on isolated `codex/690-sw-cache-lifetime`.

Queue #112 promises a second-launch offline shell, while #430 prunes superseded cached assets without breaking it. A successful network navigation returned its page before `index-fallback` had been stored or the stale marker removed; a versioned asset similarly returned before its cache write finished. Since those writes were outside `respondWith` and `waitUntil`, a service worker could terminate before they completed. The existing pruning task alone extended the navigation lifetime.

Changed `sw.js` so navigation fallback storage, stale-marker removal, pruning and versioned-asset storage all extend the fetch event until every task settles. A cache rejection does not turn a good network response into an error. `index.html` advances the service-worker registration URL to `sw.js?v=1`; its `updateViaCache: 'none'` policy stays in place. `tests/tests.js` adds one focused `{ item: 'TBD' }` regression that holds both cache writes open after the network response, checks the worker lifetime remains open, and checks that a rejected asset write settles safely.

Checks: new focused browser regression 1/1; existing queue #306 dropped-navigation control 1/1. The first browser attempt stopped at the harness's known pre-test app-frame boot guard; the retry passed. JavaScriptCore syntax for both changed JavaScript files and `git diff --check` passed. Actual installed-iPhone offline relaunch and storage-pressure behavior remain unverified. Local only; no push, PR, deployment or edit to Claude's shared checkout.
