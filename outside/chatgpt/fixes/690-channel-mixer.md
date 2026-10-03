# B50 Channel Mixer — local build report

Starting commit: `cf34fcb2041ad521c0358b50116a6196dc337ca6` on isolated `chatgpt/690-continuation`. Nothing was pushed or applied to the shared checkout.

Changed files: `js/compositor.js` (3×4 colour matrix and routing), `js/fx-registry.js` (Colouring/adjustment support), `js/inspector.js` (show only the selected output's four controls), `index.html` (three script cache tags), and `tests/tests.js` (one focused `{ item: 'TBD' }` regression).

Channel Mixer can build each output colour from red, green, blue and a constant; each coefficient and constant can be keyframed. The Output selector changes the four controls shown in the inspector without changing the rendered result. Mix blends the result with the input, alpha is preserved, and the identity matrix returns without touching pixels. The same point operation works on ordinary and adjustment layers.

Read: B50 at `tools/design/plans/2026-09-29-idle-backlog/backlog.md:1263`, exact #690 at `REQUESTS.md:27376-27403`, request/audit searches for Channel Mixer, and the existing Channel Remap, visual inspector and adjustment routes.

Ran: JavaScriptCore parsed the changed scripts and test source. One focused production-kernel probe checked identity, a three-output matrix, constant, Mix, transparent pixels and selector independence; `git diff --check` passed. Browser inspector behavior and visual quality remain unverified.
