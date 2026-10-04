# Frame Stutter keeps its hold clock when keyframed Rate changes

Starting commit: `ceb86cd6531207ca5095446f8654ff43960bf4f7` on the clean reviewed branch. Isolated work branch: `codex/690-frame-stutter-rate` at `/private/tmp/freemotion-frame-stutter-rate-20261004`. No shared Claude checkout edit, push, PR or deployment.

`REQUESTS.md:27375-27403` authorizes the continuing #690 effects bug hunt. `REQUESTS.md:32459-32461` and `audits/912-audit.json` → `bugs-effects.bugs[3]` record the analogous keyframed-rate rewind and recommend integrating rate over time. The reviewed branch's #482 Frame Stutter work covers Phase, Irregular holds and Trail strength, but did not fix animated Rate.

Frame Stutter multiplied the current Rate by all elapsed effect time. A Rate ramp could move the Strobe gap to the wrong moment, while a held Rate step could renumber the current quantum and replace its held frame immediately. Animated Rate now accumulates the clamped rate from the effect clock's start; numeric Rate keeps its exact previous calculation. The existing held-frame cache and Phase/Irregular holds logic continue to use that resulting phase.

Changed files: `js/compositor.js`, `index.html` (compositor cache tag 265 → 266), `tests/tests.js` (one focused `{ item: 'TBD' }` regression covering Strobe and a retained held frame), and this report. The regression failed before the fix and passed 1/1 afterward. Two attempts after the patch stopped before assertions because the browser frame missed core app scripts; the fresh local server passed. JavaScriptCore syntax and `git diff --check` passed. Installed-device appearance remains unverified.
