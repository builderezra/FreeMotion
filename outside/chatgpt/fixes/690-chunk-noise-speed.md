# Chunk Noise holds its pattern when keyframed Speed reaches zero

Starting main snapshot: `f771657683ae61e4aff657e4beab8fac248e8dfe`

Branch: `chatgpt/690-chunk-noise-speed` in `/private/tmp/freemotion-home-menu-20261004`

Delivery: local only, no push or release.

`REQUESTS.md:27375-27406` keeps #690 open for concrete effect bugs. `REQUESTS.md:32459-32461` and `audits/912-audit.json:843-851` document the same rate-times-elapsed-time fault in other effects and establish the shared integrator. Chunk Noise still used `Math.floor(t*bnSpd)` in `js/compositor.js:6814`: keyframing Speed from 8 Hz to zero made its blocks snap to the first-frame pattern. A user could trigger it by adding Chunk Noise to an opaque layer, setting Speed keyframes at 8 Hz then zero, and scrubbing through the second keyframe.

The kernel now integrates keyframed Speed into an accumulated pattern-frame count and keeps its original arithmetic for unanimated Speed. Changed `js/compositor.js`, its `index.html` cache tag (208 → 209), and one focused `{ item: 'TBD' }` regression in `tests/tests.js`.

I ran the new focused browser regression: **1/1 passed**. It checks a linear ramp against equivalent steady motion, a stopped pattern against later time, and static-speed controls. JavaScriptCore syntax and `git diff --check` passed. Installed-iPhone appearance was not checked.
