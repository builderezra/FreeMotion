# Smooth Bevel Depth on reduced previews

- **Starting commit:** `f771657683ae61e4aff657e4beab8fac248e8dfe` (local main snapshot)
- **Local branch:** `chatgpt/690-smooth-bevel-preview`
- **Scope:** `REQUESTS.md:27375-27406` keeps #690 effect polish open. `audits/912-audit.json:916-923` records the analogous Honeycomb plate-scale clamp; it does not cover Smooth Bevel. `REQUESTS.md:32153` concerns Smooth Bevel's separate light-angle control.

At `js/compositor.js:7952`, Depth was converted to reduced-preview pixels and then rounded and clamped to at least one plate pixel. With a 28% playback plate, Depth 1 and 4 both became radius 1; the full-resolution export distinguishes them. The one-pixel plate floor also makes a shallow bevel cover about 3.6 project pixels in that preview.

**Changed:** `js/compositor.js` now clamps Depth in project pixels and samples a fractional-radius two-pass blur on a reduced plate. It also converts project pixels on a plate above 1x resolution. The full-resolution integer path is preserved. `tests/tests.js` adds one `{ item: 'TBD' }` regression with distinct Depth 1 and 4 export and phone-preview controls, plus a 2x plate control. `index.html` bumps `js/compositor.js?v=208` to `v=209`.

**Checks run:** Direct JavaScriptCore execution of the actual compositor kernel: full-resolution Depth 1 vs 4 changed 2,136 bytes, reduced 28% preview changed 126 bytes. On a 2x plate, Depth 1 was byte-identical to Depth 2 at 1x and differed by 570 bytes from Depth 1 at 1x. Against the starting kernel, the old reduced preview changed 0 bytes for Depth 1 vs 4; the new full-resolution default Depth 6 output changed 0 bytes. Both changed JavaScript files passed syntax parsing; `git diff --check` passed. The full browser regression and a physical iPhone playback/export comparison were not run in this branch.

Nothing was pushed, deployed or changed in the shared Claude checkout.
