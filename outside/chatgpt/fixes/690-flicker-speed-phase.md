# Flicker keeps its pattern phase when keyframed Speed changes

Starting commit: `7c62fb209cbd74369b81e8ae3e9857b29e8d3830` on the clean reviewed local branch. Isolated work branch: `codex/690-flicker-speed` at `/private/tmp/freemotion-flicker-speed-20261004`. No shared Claude checkout edit, push, PR or deployment.

`REQUESTS.md:27375-27403` is Ezra's standing #690 direction to find bugs and improve effects. `REQUESTS.md:32459-32461` and `audits/912-audit.json` → `bugs-effects.bugs[3]` document the same keyframed-rate rewind in Snow & Rain and recommend integrating the rate. #904's Flicker finding concerns the separate Pattern control; neither that request nor the reviewed branch contains a Flicker Speed phase fix.

Flicker selected its hashed opacity pattern with `floor(elapsed time × current Speed)`. A Speed ramp or held rate change could therefore jump to a different pattern at the keyframe. For animated Speed only, the kernel now integrates the same clamped 1–30 Hz rate before selecting a pattern. Numeric Speed and the Pattern seed keep their previous calculation.

Changed files: `js/compositor.js`, `index.html` (compositor cache tag 261 → 262), `tests/tests.js` (one `{ item: 'TBD' }` regression), and this report. The focused browser regression passed **1/1**, covering a linear ramp, held rate change, and numeric/constant-keyframed control. The existing #904 Flicker Pattern control was attempted twice but the app frame missed core scripts before any test ran; this is a harness boot failure, not a failing assertion. JavaScriptCore syntax and `git diff --check` passed. Physical-device appearance is unverified.
