# Particle Emitter preserves births when keyframed Rate changes

Starting commit: `8efc6234d4705714fa2cf14ddf6ac897c3953c5d` on the clean reviewed branch. Isolated work branch: `codex/690-particles-rate` at `/private/tmp/freemotion-particles-rate-20261004`. No shared Claude checkout edit, push, PR or deployment.

`REQUESTS.md:27375-27403` authorizes the continuing #690 effects bug hunt. `REQUESTS.md:32459-32461` and `audits/912-audit.json` → `bugs-effects.bugs[3]` document the analogous keyframed-rate rewind and recommend integrating rate. The existing Particle Emitter code handles preview plate scale, but no keyed-Rate birth fix was present in code or reports.

At a held 20→40 particles/s step, the emitter previously redated every existing particle and instantly created indices 20–39. Animated Rate now accumulates births from the effect start and inverts that monotone clock for each live particle's birth time. The 2,000-sprite cap and exact numeric-Rate path remain. The inverse only visits the live window and uses a bracketed Newton solve with a bounded bisection fallback.

Changed files: `js/compositor.js`, `index.html` (compositor cache tag 267 → 268 in isolation, advanced to 269 after the separate Flame change was integrated), `tests/tests.js` (one focused `{ item: 'TBD' }` regression), and this report. The regression failed on the starting commit with 41/51 particles where 21/31 were due, then passed 1/1 after the fix; a final rerun after solver review also passed 1/1. A temporary worst-window direct-kernel probe measured about 0.55 ms for keyed Rate versus 0.24 ms for numeric Rate with 2,000 particles; the probe was removed. JavaScriptCore syntax and `git diff --check` passed. Installed-device appearance remains unverified.
