# #1046 — Keep an AI edit together when it deletes a layer

Starting commit: `449a1466fabaf383e6b328cadf400b56201431c7` (`codex/690-batch3-preset-feedback`). Sources checked: exact `REQUESTS.md` #1046 and batch3 `VERIFIED.md` §1 item 7. Audit JSON AI mentions concern earlier animated-property work, not this undo split.

The shared AI operation applier now mutes history only while applying its synchronous batch, with a `finally` that always unmutes. Director build, re-roll and Refine still commit their finished batch once; the Assistant's existing outer mute nests safely. A cancelled Director run commits even if it replaced or deleted layers without changing the count; an unchanged snapshot remains a no-op.

Changed files: `js/ai-ops.js`, `js/ai.js`, `index.html` (AI ops/Director caches 18→19 and 11→12), `tests/tests.js` (one `{ item: 'TBD' }` regression), and this report. The regression applies two property edits around a deletion, checks complete one-step Undo/Redo, and checks the Assistant control.

Checks: focused production-applier Node behavior passed three operations with exactly one history step; changed JavaScript syntax and `git diff --check` passed. The browser regression is **pending** while `.ship-in-progress` prohibits Chromium. Keep this commit staged until it passes.
