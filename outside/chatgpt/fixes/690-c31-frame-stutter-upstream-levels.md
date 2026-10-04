# #690/C31 — Frame Stutter holds upstream keyed Levels

Starting commit: `81d68d6bb2da7de0b074af760409c0e2e7a55d1e` on the clean Codex-only preferred checkpoint.

An animated Levels grade before Frame Stutter belongs to the held source frame. Levels is a source-local, history-free pixel lookup, so the whole-plate boundary redraw now includes it instead of caching the grade at the cold-seek playhead. Existing restrictions for nonlocal effects and downstream stacks remain. The main MP4 resume identities for video, shape and image Frame Stutter advance because all three can now render a different upstream Levels plate.

Changed files: `js/compositor.js` (Levels boundary eligibility), `js/exporter.js` (resume identities), `index.html` (compositor cache 323, exporter cache 141), `tests/tests.js` (one new focused `{ item: 'TBD' }` regression and updated existing resume assertions), and this report.

The new native Chromium regression failed before the change and passed after it: keyed Levels and a moving shape at 0.7 seconds now match the exact 0.5-second held plate after a cold seek and sequential playback at full/half preview size. The adjacent moving-shape/upstream-grade regression passed, including its MP4 resume check. JavaScriptCore parsed the three changed scripts; `git diff --check` passed. Video and decoded-still Levels boundary rendering were not separately exercised in this increment.
