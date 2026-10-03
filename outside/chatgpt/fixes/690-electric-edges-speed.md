# #690 — Electric Edges Speed keeps its crackle phase

Starting commit: `f771657683ae61e4aff657e4beab8fac248e8dfe` (`main`). Local branch: `chatgpt/690-electric-edges-speed` in `/private/tmp/freemotion-electric-20261004`.

The Electric Edges kernel chose a flicker pattern with `Math.floor(t * eeSpd)`. When a user keyframed Speed to zero, the pattern snapped to frame zero; a speed ramp also jumped because it multiplied the current rate by all elapsed time. This is the same rate-versus-position distinction described for other effects in `REQUESTS.md` #913 and `audits/912-audit.json`, under the standing effect-polish brief #690. For keyframed Speed, the kernel now integrates the clamped rate from time zero to the current frame. Numeric Speed retains its prior appearance.

Changed files: `js/compositor.js` (Electric Edges phase), `tests/tests.js` (one focused `{ item: 'TBD' }` regression for a ramp and stop), and `index.html` (compositor cache tag 208 → 209).

Checks: the focused headless-Chrome regression passed (`Regression 1/1`); JavaScriptCore parsed both changed JavaScript files; `git diff --check` passed. Installed-iPhone appearance was not checked.

Local only; no push, PR, deployment, or shared-checkout edit.
