# Laser Beam keeps its pulse beat when keyframed Pulse changes

Starting commit: `fea155080e50eba09e179532f6930c1aff498af1` on the clean reviewed branch. Isolated work branch: `codex/690-laser-pulse-phase` at `/private/tmp/freemotion-laser-pulse-20261004`. No shared Claude checkout edit, push, PR or deployment.

`REQUESTS.md:27375-27403` authorizes the continuing #690 effects bug hunt. `REQUESTS.md:32459-32461` and `audits/912-audit.json` → `bugs-effects.bugs[3]` record the analogous keyframed-rate rewind and recommend integrating rate over time. The earlier Laser Beam report covers its creation and viewport placement; no keyed-Pulse phase fix was present.

Laser Beam multiplied the current Pulse frequency by all elapsed effect time. A frequency ramp or held step could jump the beam to a different point in its brightness beat. Animated, nonzero Pulse now accumulates its clamped cycles from the effect clock's start. Numeric Pulse keeps its exact prior calculation, and zero Pulse still leaves the beam steadily on.

Changed files: `js/compositor.js`, `index.html` (compositor cache tag 266 → 267), `tests/tests.js` (one focused `{ item: 'TBD' }` regression), and this report. The regression failed before the fix and passed 1/1 afterward; one earlier browser attempt missed core scripts before assertions. JavaScriptCore syntax and `git diff --check` passed. Installed-device appearance remains unverified.
