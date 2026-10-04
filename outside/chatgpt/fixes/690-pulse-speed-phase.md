# Pulse keeps its beat through keyframed Speed changes

Starting commit: `d0aa007a380b143640146e2f1f935d03f92d1585` on the isolated reviewed branch. Work branch: `codex/690-pulse-speed-phase` at `/private/tmp/freemotion-pulse-phase-20261004`. No push, PR, deployment, or shared Claude checkout edit.

`REQUESTS.md` #690 is Ezra's standing effect-polish and bug-hunt request. `audits/912-audit.json` → `bugs-effects.bugs[3]` and `REQUESTS.md` #913 finding 4 document the analogous keyframed rate-rewind in Snow/Rain, fixed there by integrating speed. The reviewed branch's Pulse and #482 wave-shape coverage had no animated-Speed phase fix.

Pulse used `speed(now) × elapsed clip time` for both its sine and shaped waves. A Speed keyframe from 1.5 Hz to 0.1 Hz at two seconds therefore jumps the beat from about three cycles to 0.2 cycles. Pulse now integrates keyframed Speed from the layer's clip start, using the reached cycle count for every wave. Plain numeric Speed retains the previous multiplication and default look.

Changed files: `js/compositor.js`, `index.html` (compositor cache tag 259 → 260), `tests/tests.js` (one focused `{ item: 'TBD' }` regression), and this report. The regression checks the sine and Triangle waves across a step, with a static-speed control. The new browser regression and the existing #482 Pulse control passed together **2/2** after one app-frame boot failure before tests ran. JavaScriptCore syntax and `git diff --check` passed. Physical iPhone appearance remains unverified.
