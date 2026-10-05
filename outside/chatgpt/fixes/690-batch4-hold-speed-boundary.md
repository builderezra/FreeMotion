# Batch 4: footage stays aligned at a hold-speed drop

Starting commit: `98ad127a4dfa427f4c244e5c8b16947cbcb79fb6` (`codex/690-batch4-offline-scope`).

The speed-ramp integral averaged the values on either side of a hold key across one 120 Hz sample, booking part of an abrupt speed drop into the wrong side of the key. The integral now splits at keyframe boundaries and uses the left limit of a hold key before the step. This removes the lasting source-time shift and keeps a clip's post-split footage aligned with the unsplit clip.

Changed files: `js/scene.js`, `index.html` (scene cache 120), `tests/tests.js` (one `TBD` hold-step/split regression).

Checks: focused production-function check measured 0.000002 s error at a 100×→1× drop and 0.000002 s split shift; changed-JS syntax and `git diff --check` passed. The focused muted Chromium regression subsequently passed (1/1) when the app frame loaded.
