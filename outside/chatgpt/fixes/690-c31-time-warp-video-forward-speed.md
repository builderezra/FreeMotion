# #690 / C31 — constant forward-speed video Time Warp Scan

Starting commit: `37aea798a0b861db9cf26789f4f9d2791a6e3dde` on fresh isolated `codex/690-c31-video-speed`. The exact #690 request and C31 plan row were rechecked; no matching `audits/*.json` record was found.

The bounded historical-strip decoder now admits a straight video clip at a finite positive constant forward speed. Its existing per-crossing `FM.layerLocalTime` calculation selects the historical source frame, including half and double speed. Reverse, animated speed ramps and frame blending remain excluded because they use different source-frame/cache behavior.

Changed files: `js/compositor.js` (narrow eligibility), `index.html` (compositor cache 299), `tests/tests.js` (one focused `TBD` regression), and this report. The new indexed-video regression compares continuous playback with cold seek at full and half preview sizes for 0.5× and 2× source speed, then compares half-speed MP4 output to continuous playback. The preceding straight-video indexed regression passed alongside it (2/2). JavaScriptCore syntax and `git diff --check` passed. No broad suite was run.

C31 remains open for reverse, speed ramps, frame blend, crop, masks, non-point-local effects, multiple video plans and native Worker scanning. This is a local checkpoint, not a release.
