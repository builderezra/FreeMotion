# B27 Venetian Blinds — local build report

Starting commit: `3fc2e59e3ae8ad7da2b6477fedd168ac68628ab5` on isolated `chatgpt/690-continuation`. Nothing was pushed or applied to the shared checkout.

Changed files: `js/compositor.js` (catalogue, routing and matte kernel), `js/fx-registry.js` (Keying category and description), `index.html` (both script cache tags), and `tests/tests.js` (one focused `{ item: 'TBD' }` regression).

Venetian Blinds reveals a layer in 2–60 parallel slats. Progress is keyframeable, Angle rotates the slats, Edge softness feathers their opening edges in project pixels, and positive or negative Stagger sets which end opens first. Fit slats to Frame divides the whole project frame; Visible layer divides the layer's alpha bounds. Zero and full Progress preserve the exact empty/full matte endpoints. The effect changes alpha only, and follows the existing pixel-effect route for preview and export.

Read: the B27 row at `tools/design/plans/2026-09-29-idle-backlog/backlog.md:1235`, the open #690 brief at `REQUESTS.md:27376-27403`, and the existing Wipe, Radial Wipe, pixel dispatch and registry patterns. Exact searches found no existing Venetian Blinds entry in `REQUESTS.md`, `audits/*.json`, or `js/*.js` on this snapshot.

Ran: JavaScriptCore compiled the changed scripts and test source; one focused production-kernel probe confirmed registration/routing, visible-layer slat fit, stagger direction, feathered alpha, exact endpoints and untouched RGB. `git diff --check` passed. Browser interaction, actual visual quality and phone performance remain unverified.
