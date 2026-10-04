# Swing keyframed Speed keeps its phase

Starting commit: `a3f899b517e144267aed0ae479a57fed5dfcffa7` (`codex/690-reviewed-local`). Isolated clone: `/private/tmp/freemotion-swing-speed-phase-20261004`, branch `codex/690-swing-speed-phase`.

Standing request #690 asks for bug finding and effect polish. The related `audits/912-audit.json` finding describes other keyframed rates rewinding because they multiply the current rate by elapsed time. Swing had the same distinct fault: `sin(2π × speed(now) × clip-local time + phase)` changes the whole accumulated phase whenever Speed is keyed. Slowing a 0.75 Hz Swing to zero from composition seconds 1 to 3 had carried 0.75 cycles, but the old expression returned it to its initial angle at the stop.

Swing now integrates keyframed Speed from the clip effect clock's origin, as Spin and Orbit do. Both undamped and damped Swing use that accumulated phase. Unanimated Speed retains its original arithmetic and existing behavior.

Changed files: `js/compositor.js` (Swing phase), `tests/tests.js` (one focused rendered `{ item: 'TBD' }` regression covering a shifted clip, zero-speed hold, static control, and damping), `index.html` (compositor cache tag 258 → 259), and this report.

Checks: the focused browser regression passed (`Regression 1/1`); JavaScriptCore parsed both changed JavaScript files; `git diff --check` passed. The first browser attempt reported an incomplete app frame; a fresh local port completed successfully. No installed-device rendering was run.

Local commit and bundle only. No push, PR, deployment, integration, or shared-checkout edit.
