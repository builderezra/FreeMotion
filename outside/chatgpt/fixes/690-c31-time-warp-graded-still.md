# #690/C31 — Time Warp Scan holds keyed grades on cropped stills

Starting commit: `66e23a4dda939ea4552f8668db435d98a2b732e1` on the clean Codex-only preferred checkpoint.

A cropped still image with Brightness or Contrast before Time Warp Scan used the history-dependent path. After a cold seek, its frozen band could show the current grade instead of the grade at each strip's crossing time. Decoded still images are synchronous, and Brightness and Contrast are point-local, so the historical strip renderer now admits an ordered upstream stack of those two effects. Other active upstream effects, video, masks, complex parents, and crop editing retain their existing gates.

Changed files: `js/compositor.js` (narrow eligibility), `index.html` (compositor cache 317), `tests/tests.js` (one focused `{ item: 'TBD' }` regression), and this report.

The new native Chromium regression passed 1/1 for keyed Brightness and Contrast with an animated crop, moving still, Freeze/Reveal, and full/half preview. A control changed the grade to its current value and confirmed the historical frozen pixels differ. The adjacent animated-crop regression passed 1/1. JavaScriptCore syntax and `git diff --check` passed. C31's complex stacks remain open; this is local work, not a release.
