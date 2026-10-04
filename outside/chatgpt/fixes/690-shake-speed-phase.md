# Shake keeps its motion and smear when keyframed Speed changes

Starting commit: `4051188ef8079a05f385eff3a57c96ab9b330424` on the clean reviewed branch. Isolated work branch: `codex/690-shake-phase` at `/private/tmp/freemotion-shake-phase-20261004`. No shared Claude checkout edit, push, PR or deployment.

`REQUESTS.md:27375-27403` authorizes the continuing #690 effects bug hunt. `REQUESTS.md:32459-32461` and `audits/912-audit.json` → `bugs-effects.bugs[3]` record the analogous keyframed-rate rewind and recommend integrating rate over time. The reviewed branch's #482 Shake work and #690 scene-FPS fix do not address keyed Speed phase.

Shake multiplied the current Speed by all elapsed effect time, so a Speed change jumped its position, twist and zoom noise to a new phase. Its smear also sampled the previous frame with that same current rate, producing the wrong motion trail. Animated Speed now integrates from the effect clock's start for both the current and previous frame; numeric Speed retains its original path.

Changed files: `js/compositor.js`, `index.html` (compositor cache tag 264 → 265), `tests/tests.js` (one focused `{ item: 'TBD' }` regression), and this report. The new browser regression failed before the fix and passed 1/1 after it; the existing Shake scene-FPS control passed 1/1. JavaScriptCore syntax and `git diff --check` passed. Installed-device appearance remains unverified.
