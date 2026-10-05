# #1024 keyframe button names

Starting commit: `b40271c331a043e48c93a60afc30ff707df7940b` on isolated `codex/690-batch2-keyframe-names`.

The inspector's ◆ buttons now name their parameter and announce whether they will animate it, add a key at the playhead, or remove the key already there. One shared helper covers transform, effect numeric, ordinary numeric, scaled numeric, and colour rows; visible controls keep their current appearance and click behavior.

Changed files: `js/inspector.js`, `index.html` (inspector cache 418→419), `tests/tests.js` (one focused `{ item: 'TBD' }` regression), this report.

Checks: the focused Chromium regression passed for a real control from all five builders and the three Opacity states; Node syntax and `git diff --check` passed. The browser run used an isolated local server on port 8878 while the shared ship marker existed, with one-minute load 2.21 (<4); no collaboration or full-suite test ran. This commit remains staged behind #1019/#1020 collaboration checks and is not in the preferred reviewed branch yet.
