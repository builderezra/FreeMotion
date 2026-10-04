# #690 / C31 — historical Contrast before video Time Warp Scan

Starting commit: `d004f528f14cc92bd730e805184b8859d4af5327` on fresh isolated `codex/690-c31-video-contrast`. The exact #690 standing request and C31 plan row were checked; no matching `audits/*.json` record was found.

A straight video can now cold-seek Time Warp Scan when its upstream effects are any ordered Brightness/Contrast stack. Both filters are point-local, so the existing bounded decoder can apply their keyed values while drawing each historical crossing strip. Camera, crop, parent, masks, speed/reverse, other effects and multiple video plans retain the existing path. A shape's synchronous scan redraw accepts upstream Contrast under the same point-local restriction.

Changed files: `js/compositor.js` (narrow eligibility), `index.html` (compositor cache 298), `tests/tests.js` (one focused `TBD` regression), and this report. The new H.264 fixture uses keyed Contrast after Brightness and checks full/half-size cold seek against continuous playback, a current-time control, and main MP4 output. The prior indexed-video regression checks that the straight-video path is unchanged. The focused pair passed 2/2 on final diagnostic runs; JavaScriptCore syntax and `git diff --check` passed. One earlier run had intermittent parity mismatches in both the new and pre-existing video tests during browser bootstrap; the mismatch did not recur on two subsequent runs, and the new regression now reports channel-level detail if it does. No broad suite was run.

C31 remains open for non-point-local effects and other video stacks; this local checkpoint is not a release.
