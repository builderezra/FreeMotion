# B53 Deflicker — local build report

Starting commit: `36039096df5bd649cfc4b4c5c70823f0f2cbc52e` on isolated `chatgpt/690-continuation`. Nothing was pushed or applied to the shared checkout.

Changed files: `js/compositor.js` (effect definition, routing and temporal pixel kernel), `js/fx-registry.js` (Blur category and description), `index.html` (script cache tags), and `tests/tests.js` (one focused `{ item: 'TBD' }` regression).

Deflicker samples up to about 4,096 source pixels per frame, remembers an effect instance's exposure, and applies a bounded RGB gain toward its smoothed exposure. A normalized 8×8 luminance pattern resets history when the picture changes sharply, reducing the risk of correcting a hard cut as flicker. The controls are Smoothing, Strength and Maximum correction. A seek, large time gap, resolution change, or preview/export transition resets the history; alpha remains unchanged. It is intended for whole-frame exposure flicker, not local light pulses.

Read: B53 at `tools/design/plans/2026-09-29-idle-backlog/backlog.md:1266`, the standing #690 request at `REQUESTS.md:27376-27403`, and the existing Auto Grade and Temporal Denoise paths. A search of `REQUESTS.md` and `audits/*.json` found no existing Deflicker implementation record.

Ran: JavaScriptCore loaded the compositor and registry and passed one focused production-kernel probe: an alternating exposure pulse was reduced, a changed image reset history, and export began fresh. JavaScriptCore parsed changed scripts and the saved regression; `git diff --check` passed. Browser/phone appearance and preview/export parity remain unverified. The cut detector is heuristic: a new shot with nearly the same spatial brightness pattern may be smoothed briefly, while large subject motion may reset the smoothing.
