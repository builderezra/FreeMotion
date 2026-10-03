# Colour Wheels, local continuation

Starting commit: `63b2fb08a7650e8669a7c2f7241bf61310c00bea` on local branch `chatgpt/690-continuation`.

`tools/design/plans/2026-09-29-idle-backlog/backlog.md:1184-1186` calls for a shadows/midtones/highlights grade with hue, amount and brightness for each range, plus Balance, Blending and Keep brightness. This adds Colour Wheels to the Colouring effects browser. Its three PC pucks set hue and amount; all twelve keyframeable sliders remain available on PC and phone. The neutral defaults preserve pixels exactly. A 256-entry luminance lookup drives one per-pixel pass, and the same kernel runs on a clip or an adjustment layer. The grade preserves alpha.

Changed: `js/compositor.js` (effect and pixel kernel), `js/fx-registry.js` (category and adjustment eligibility), `js/inspector.js` and `styles.css` (PC pucks), `index.html` (changed asset cache tags), and one `tests/tests.js` regression tagged `TBD`.

Checks run: JavaScriptCore syntax parse, a focused production-kernel probe for neutral identity, shadow tint, midtone brightening, highlight darkening and alpha preservation, and `git diff --check`. Browser pointer interaction, phone layout and preview/export visual comparison remain unverified in this sandbox.

This is local and unpushed; it does not change the shared Claude checkout or live app.
