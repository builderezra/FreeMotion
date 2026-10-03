# B26 Clarity & Dehaze — local build report

Starting commit: `3b65fae1a5edd5abd99ab5f6bd286e4e23a28c18` on isolated `chatgpt/690-continuation`. Nothing was pushed or applied to the shared checkout.

Changed files: `js/compositor.js` (effect registration and pixel kernel), `js/fx-registry.js` (Colouring category), `index.html` (both changed script cache tags), `tests/tests.js` (one focused `{ item: 'TBD' }` regression).

Clarity & Dehaze adds four keyframeable controls: Clarity, Texture and Dehaze at −100..100, and Radius at 10–200 project pixels. Neutral values are byte-identical. Clarity adjusts midtone local contrast, Texture adjusts smaller details, and Dehaze uses a quarter-resolution dark-channel minimum and an estimated atmospheric level; negative Dehaze adds haze. Spatial box/min filters run in linear time with reused quarter-resolution scratch buffers, and colour changes leave alpha intact. The effect is offered on ordinary layers in Colouring. Adjustment-layer support is deferred because its full-frame neighbourhood and atmospheric estimate would need the adjustment preview crop to be disabled for preview/export parity.

Read: B26 at `tools/design/plans/2026-09-29-idle-backlog/backlog.md:1225-1228`, the current Unsharp Mask and Highlights & Shadows kernels, pixel-effect routing, and registry gates. Exact search found no existing Dehaze effect or duplicate request in `REQUESTS.md`/`audits/*.json` on this snapshot.

Ran: JavaScriptCore compiled changed JS and `tests/tests.js`; one focused production-kernel probe confirmed neutral identity, each control affecting a 32×32 synthetic image, darker darks under positive Dehaze, and alpha preservation. A single 720×1280 JavaScriptCore timing probe measured about 46 ms for one combined-effect frame on this Mac; it is not a browser or iPhone performance claim. `git diff --check` passed. Real footage visual quality, editor interaction and phone performance remain unverified.
