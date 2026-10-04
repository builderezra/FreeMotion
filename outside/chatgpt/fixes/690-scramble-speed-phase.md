# Scramble Text holds the reached pattern when Speed stops

Starting commit: `a3f899b517e144267aed0ae479a57fed5dfcffa7` on the isolated reviewed branch. Work branch: `codex/690-scramble-speed-phase` at `/private/tmp/freemotion-scramble-phase-20261004`. No push, PR, deployment, or edit to Claude's checkout.

`REQUESTS.md` #690 (around line 27375) is the standing request to find bugs and polish effects. `audits/912-audit.json` → `bugs-effects.bugs[3]` records the analogous Snow/Rain rate-rewind and recommends integrating keyframed rates. `REQUESTS.md` #904's Scramble Text finding and the existing #904 regression concern its character alphabet, not Speed. The reviewed branch had no Scramble Speed fix.

Scramble Text selected its noise pattern with `floor(time × current Speed)`. A 12 Hz → 0 linear keyframe ramp over two seconds therefore jumped to the first noise pattern at the stop. The text effect now integrates only animated Speed to choose its pattern, clamping the rate to the control's 0–30 Hz range. A plain numeric Speed follows its original path.

Changed files: `js/compositor.js` (animated phase), `index.html` (compositor cache tag 258 → 259), `tests/tests.js` (one `{ item: 'TBD' }` focused regression), and this report. The new regression and the existing #904 Scramble control passed together **2/2** in the browser harness. JavaScriptCore parsed both changed JavaScript files; `git diff --check` passed. Physical iPhone typography remains unverified.
