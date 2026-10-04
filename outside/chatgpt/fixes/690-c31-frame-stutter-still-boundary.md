# #690/C31 — Frame Stutter exact holds on still images

Starting commit: `c71d0c8b67bae915de33e76509b5413f96465bbf` on the clean Codex-only preferred checkpoint.

Frame Stutter previously remembered the first image drawn after a quantum boundary. A cold seek to a still image with animated placement or crop therefore held the current picture, while continuous playback held a later frame. A decoded image can be redrawn synchronously at the exact boundary; the existing history-free upstream-effect and parent/mask gates remain in force. Hold, Strobe and Trail now use that boundary for eligible stills, while crop editing keeps its whole-frame preview on the prior path.

Changed files: `js/compositor.js` (narrow still-image sampler), `js/exporter.js` (new main-renderer resume identity for image Frame Stutter), `index.html` (compositor cache 318, exporter cache 136), `tests/tests.js` (one focused `{ item: 'TBD' }` regression and three intentional image-golden updates), and this report.

Exact boundary sampling intentionally changes three image default hashes: Hold `d6c619cd → ce56ef21`, Strobe `755ef8d5 → 52e66bf9`, Trail `83e9eef1 → c68ce8d9`. As with the earlier shape C31 fix, the old values sampled the next rendered frame when a hold boundary fell off the project frame grid. The new test passed in native Chromium at full/half preview sizes for Hold and Trail cold-seek parity, exact boundary pixels, visible prior Trail, and a one-frame MP4 resume marker. The existing #482 Frame Stutter visual regression passed after its explicit golden update. JavaScriptCore syntax and `git diff --check` passed. Video and complex stacks remain separate C31 work; nothing was released.
