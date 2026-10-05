# #690/C31 — Frame Stutter holds upstream keyed Colour Balance

Starting commit: `913fd481cc09f9fddad42a2d2d228f479533d1c6` on the clean Codex-only preferred checkpoint. The exact #690 standing brief and C31 plan were checked. No `audits/*.json` record names this Frame Stutter finding; `audits/912-audit.json` mentions Colour Balance only in unrelated filter recipes.

Colour Balance evaluates each source pixel from its own keyed parameters, without temporal state. When it precedes Frame Stutter, the held grade belongs to the hold boundary rather than the current playhead. The safe upstream gate now includes Colour Balance; the existing exclusions for nonlocal effects and downstream stacks remain. The main-renderer MP4 resume identities for video, shape and image holds advance because the same saved project can now render different pixels.

Changed files: `js/compositor.js`, `js/exporter.js`, `index.html` (compositor cache 356, exporter cache 166), `tests/tests.js` (one new focused `{ item: 'TBD' }` regression and updated existing resume-identity assertions), and this report.

The native Chromium regression failed before the change with current-time Colour Balance and passed after at 120 and 60 px, checking exact 0.5-second hold, cold seek and sequential playback on a moving shape. The adjacent keyed Vibrance regression passed. One incomplete editor bootstrap was retried; JavaScript syntax and diff checks passed. Decoded-image and video Colour Balance holds were not separately exercised in this increment.
