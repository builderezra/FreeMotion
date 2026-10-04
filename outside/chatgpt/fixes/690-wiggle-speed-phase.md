# Wiggle keeps its path when keyframed Speed changes

Starting commit: `5673c230a9a03fee12bbf5988d27503bb0e69ce0` on the clean reviewed branch. Isolated work branch: `codex/690-wiggle-phase` at `/private/tmp/freemotion-wiggle-phase-20261004`. No edit to the shared Claude checkout, push, PR or deployment.

`REQUESTS.md:27375-27403` is the standing #690 request to find bugs and improve effects. `REQUESTS.md:32459-32461` and `audits/912-audit.json` → `bugs-effects.bugs[3]` record the analogous keyframed-rate rewind and recommend integrating rate over time. The reviewed branch's #482 Wiggle polish concerns Pattern, axes, rotation, scale and roughness; no Wiggle Speed phase fix or report was present.

Wiggle selected its noise position with `clip effect time × current Speed`. A Speed ramp therefore jumped to another point on the path instead of smoothly speeding up or slowing down. Animated Speed now integrates over the existing effect-clock interval; numeric Speed keeps its original calculation, including the phase carried through trims and splits.

Changed files: `js/compositor.js`, `index.html` (compositor cache tag 262 → 263), `tests/tests.js` (one focused `{ item: 'TBD' }` regression), and this report. The new browser regression failed before the fix on a Speed ramp and passed **1/1** after it. One intermediate retry failed before tests because the app frame missed core scripts; JavaScriptCore syntax and `git diff --check` passed. Physical-device appearance is unverified.
