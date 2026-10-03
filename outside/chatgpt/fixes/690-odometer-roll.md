# B41 Odometer Roll — local build report

Starting commit: `01d2f0349e2ee7f9d23a9a39158d674b6b8bf09a` on isolated `chatgpt/690-continuation`. Nothing was pushed or applied to the shared checkout.

Changed files: `js/compositor.js` (text effect, measured digit slots, clipped wheel drawing), `js/fx-registry.js` (Text listing and text-only gate), `index.html` (script cache tags), and `tests/tests.js` (one focused `{ item: 'TBD' }` regression).

Odometer Roll adds from/to/progress, minimum digits, decimals, comma grouping and an option to keep text around the first number (for example `Score: 0%`). Each digit rolls vertically through its own clipped slot; higher digits begin turning near a carry. Fixed-width slots keep the text from jumping as numbers change. The normal text path handles curves and Animate presets.

Read: B41 at `tools/design/plans/2026-09-29-idle-backlog/backlog.md:1254`, #690 at `REQUESTS.md:27376-27403`, existing Number Roll, text layout/drawing paths, and exact request/audit searches for `odometer`.

Ran: JavaScriptCore parsed the changed scripts and test source. One focused production-function probe passed surrounding text, 09-to-10 digit carry, comma grouping and negative sign-slot cases; `git diff --check` passed. The saved browser regression was not run; actual browser/iPhone appearance and performance remain unverified.
