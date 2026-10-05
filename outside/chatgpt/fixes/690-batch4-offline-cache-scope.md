# Batch 4: offline cleanup stays inside FreeMotion

Starting commit: `fa323416f5f9681d408ebb7b82f3981af10425c2` (`codex/690-batch4-detect-speech`).

The FreeMotion service worker and version chip previously removed every cache or worker registration on the shared origin, including Listing Kit's offline copy. Worker activation now deletes only superseded `freemotion-` caches. The version chip unregisters only the worker scoped to FreeMotion's directory and clears only FreeMotion caches before fetching a fresh build.

Changed files: `sw.js`, `index.html` (worker registration query 2), `tests/tests.js` (one `TBD` regression for both cleanup paths).

Checks: focused production-handler Node check retained another app's worker/cache and removed FreeMotion's obsolete cache; inline-script and changed-JS syntax plus `git diff --check` passed. Browser regression remains pending under the Claude ship lock; this branch is not promoted to the preferred checkpoint until it passes. Other apps' own cache-cleanup code lies outside this repo.
