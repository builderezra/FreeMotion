# #1043 — Undo a multi-file pick in one step

Starting commit: `32133ae8d40af4fc5b69d784ceeca42f704f9dca` (`codex/690-batch3-embedded-font`). Sources checked: exact `REQUESTS.md` #1043 and batch3 `VERIFIED.md` §1 item 4. The audit JSON `handleFiles` references concern drop-target and project-switch bugs, not this multi-file Undo count.

The picker/drop path decodes a multi-file selection first, then inserts the ready records in one short muted history batch and commits once. A single-file pick retains its immediate path. History stays live during slow decoding, so an edit made while files open remains its own step. The existing project-switch check releases decoded records rather than adding them to another project.

Changed files: `js/app.js`, `index.html` (app cache 484→485), `tests/tests.js` (one `{ item: 'TBD' }` regression), and this report. The regression imports three small PNGs, checks one Undo removes all and one Redo restores all, then checks a single PNG remains one step.

Checks: focused production-handler Node behavior passed the multi/single step counts; changed JavaScript syntax and `git diff --check` passed. The browser regression is **pending** while `.ship-in-progress` prohibits Chromium. Keep this commit staged until the browser check passes.
