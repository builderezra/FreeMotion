# #690/C31 — Time Warp Scan keyed upstream Brightness

Starting commit: `4fa16b3a6dc73df3746cec9552ee0d7191fd4e67`.

Time Warp Scan's cold seek already reconstructed a moving shape's historical strips, but an active upstream Brightness disabled that path and left earlier scanned regions painted with the current picture. A narrowly eligible point-local Brightness now renders at each strip's crossing time, including its animated amount. Other active effects, media, masks and behavior-driven sources remain outside this eligibility.

Changed files: `js/compositor.js` (safe eligibility), `js/exporter.js` (new main MP4 resume identity), `index.html` (compositor 294/exporter 133 cache tags), and `tests/tests.js` (one focused `{ item: 'TBD' }` regression and the prior resume-token expectation).

Checks: the new keyed-grade Freeze/Reveal cold-seek regression passed at full and half preview sizes; the existing simple-shape scan/export-resume regression passed. A local 1080×1920, 20-second/60-fps cold seek with keyed Brightness took 90 ms on headless Chrome; it is a development-machine measurement, not a phone benchmark. Changed JavaScript syntax and `git diff --check` passed. App launches that omitted the FX registry were retried or loaded that same registry asset explicitly before invoking the focused tests. No broad suite ran.

C31 remains partial for other upstream/downstream stacks, temporal effects, media, complex parents and masks. No deployment or release.
