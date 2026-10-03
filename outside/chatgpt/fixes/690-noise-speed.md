# Noise Speed holds its grain when a keyframed rate stops

Starting commit: `f8c2f757b8b96145a2708456a528c46934a1e349` (`chatgpt/690-all-local`). Local branch: `chatgpt/690-noise-speed` at `/private/tmp/freemotion-noise-speed-20261004`. No push, PR or deployment.

## I read

`REQUESTS.md:27383-27386` asks to “go re audit, find some bugs” and to “polish” effects under standing #690. `REQUESTS.md:32459-32461` marks Snow & Rain and Turbulent Displace keyframed-rate rewinds fixed under #913, with the fix sketch “Integrate the rate over time”; `audits/912-audit.json:843-851` records that earlier, distinct finding. I checked `REQUESTS.md`, `audits/*.json`, and existing local fix reports for a Noise Speed keyframe fix and found none.

The Noise control allows Speed 0–60 Hz (`js/compositor.js:151-154`). Before this change, its kernel said “speed 0 FREEZES the static” but chose the pattern with `const frame = Math.floor(t * spd) | 0` (`js/compositor.js:6636-6639` at the starting commit). Keyframing Speed from 8 Hz to zero therefore changed the full-frame grain back to pattern zero at the stop. A normal user only meets this when animating the Noise Speed slider to a stop; the abrupt re-patterning is visible at that keyframe. This is medium severity, high confidence from the code and focused browser regression.

The kernel now integrates keyframed Speed into its frame count (`js/compositor.js:6639-6646`), while its unanimated branch retains the original multiplication. Changed files: `js/compositor.js`, `index.html` (compositor cache tag 248 → 249), `tests/tests.js` (one `{ item: 'TBD' }` regression), and this report.

## I ran

The focused browser regression passed **1/1**. It checks that a 0→16 Hz ramp reaches the same grain as steady 8 Hz at two seconds, a stop holds that grain, and the default static value remains the implicit 24 Hz pattern. JavaScriptCore syntax checks for both changed JavaScript files and `git diff --check` passed. The first browser attempt did not load the app script tree; a fresh focused run completed successfully. Actual installed-iPhone appearance remains unverified.
