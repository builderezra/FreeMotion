# #690/C31 — Frame Stutter holds upstream keyed Vibrance

Starting commit: `d3be408ec206d8992e7cced074e71057906aa8c4` on the clean Codex-only preferred checkpoint.

Vibrance evaluates one source pixel at a time without temporal state. When keyed before Frame Stutter, its colour belongs to the held boundary, not the current playhead. The safe upstream gate now includes Vibrance; restrictions on nonlocal effects and downstream stacks remain. Main-renderer MP4 resume identities for video, shape and image Frame Stutter advance because the same saved project can produce different pixels.

Changed files: `js/compositor.js`, `js/exporter.js`, `index.html` (compositor cache 355, exporter cache 165), `tests/tests.js` (one new focused `{ item: 'TBD' }` regression plus existing resume identity assertions), and this report.

The new native Chromium regression failed before the change with current-time Vibrance and passed after. It compares exact 0.5-second hold, cold seek and sequential playback on a moving coloured shape at 120 and 60 px. The adjacent keyed Gamma hold passed. An incomplete app-frame bootstrap was discarded and retried. JavaScriptCore parsed all three changed scripts, and `git diff --check` passed. Decoded image and video Vibrance holds were not separately exercised in this increment.
