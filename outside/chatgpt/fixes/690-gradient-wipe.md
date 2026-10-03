# B39 Gradient Wipe — local build report

Starting commit: `fcda7fd254eef5781e1ae028b31abc369af09552` on isolated `chatgpt/690-continuation`. Nothing was pushed or applied to the shared checkout.

Changed files: `js/compositor.js` (map-layer wipe controls, routing and renderer), `js/fx-registry.js` (Matte listing), `index.html` (script cache tags), and `tests/tests.js` (one focused `{ item: 'TBD' }` regression).

Gradient Wipe reveals the target in another layer's Luma, Alpha, Red, Green or Blue order, with keyframeable Progress, Softness and Invert. The map can sit anywhere in the stack. Unselected maps leave the target unchanged; Progress 0 hides it and Progress 1 reveals it exactly. The renderer reuses the depth-indexed layer-picker canvas pool, renders the map at full opacity and preserves the target's colours while changing alpha.

Read: B39 at `tools/design/plans/2026-09-29-idle-backlog/backlog.md:1252`, #690 at `REQUESTS.md:27376-27403`, and the existing Wipe and Luma Matte paths in `js/compositor.js`.

Ran: JavaScriptCore parsed the changed scripts and test source. One focused production-helper probe confirmed registration, exact Progress endpoints, threshold, Softness and Invert; `git diff --check` passed. The saved regression renders a two-half map in the browser, but that render and phone preview/export parity remain unverified here.
