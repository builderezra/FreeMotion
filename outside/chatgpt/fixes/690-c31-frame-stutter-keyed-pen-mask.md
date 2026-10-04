# #690/C31 — Frame Stutter holds an upstream keyed pen mask

Starting commit: `65b06b35224b9ccabe2e785cfecc91cccdade280` on the clean Codex-only preferred checkpoint.

When a drawn pen mask sits before Frame Stutter in the effects stack, it belongs to the held picture. The history-based fallback cached the mask at the first rendered time after a quantum boundary, so a cold seek showed the mask at the playhead. One enabled, identified pen mask with a matching upstream marker now uses Frame Stutter's whole-plate boundary redraw. Unmarked masks, extra masks, downstream markers and video plans retain their existing effect-order paths.

Changed files: `js/compositor.js` (narrow upstream-mask eligibility), `js/exporter.js` (shape Frame Stutter resume identity 5), `index.html` (compositor cache 322, exporter cache 140), `tests/tests.js` (one focused `{ item: 'TBD' }` regression), and this report.

The new native Chromium regression failed before the change and passed afterward. A keyed rectangular pen mask moves over a stationary shape; cold-seek and sequential frames at 0.7 seconds now match the exact 0.5-second masked frame at full/half preview size. The existing #560 effect-order regression passed. JavaScriptCore syntax and `git diff --check` passed. No release or shared Claude checkout edit.
