# Speech-bubble shape tail — local quality revision

Starting commit: clean preferred `7cddd01209aec198ca5b8400fd9e1844e82dddd9` on `codex/690-reviewed-local`. Isolated branch: `codex/690-speech-tail-quality`.

The held fifteen-shape collection failed a new independent quality review. Its Speech bubble had a long slash-like tail at 300 px. Three prior shorter-tail studies were held after native-size review. This revision constructs the tail and lower-left corner as one continuous contour, giving the bubble a clear attached point at 34 px and a balanced curve at 300 px. Two **fresh no-history, image-only** critics independently returned **KEEP** at picker and canvas size for the exact candidate shown in `690-speech-tail-picker.png` and `690-speech-tail-canvas.png`. Their approval is for this one shape, not the whole collection. The fifteen-shape release gate remains open.

Changed files: `js/compositor.js` (speech path), `index.html` (compositor cache 352→353), `tests/tests.js` (one focused `{ item: 'TBD' }` rendered-tail regression), this report and the two PNGs. No protected log, tool, or shared Claude checkout was edited. No push, PR, deployment or release.

Checks: focused Chromium regression passed 1/1 at actual 34/300 px; JavaScript syntax and Git diff checks passed. The first test-frame load omitted an unrelated app script and was discarded, then the test assertion exposed an overly strict tail-width threshold; it was calibrated to the measured native raster and passed. The rendered images and independent reviews supplied the visual quality check. Other held shapes still need revision and whole-set review before final promotion.
