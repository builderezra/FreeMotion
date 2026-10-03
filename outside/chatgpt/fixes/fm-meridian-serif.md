# FM Meridian Serif: one new original display family

Starting commit: `f8c2f757b8b96145a2708456a528c46934a1e349` (local all-fixes integration snapshot). Branch: `chatgpt/original-fonts-next`.

Added a high-contrast editorial serif to the included FreeMotion font catalogue, with independently drawn Regular and Bold outlines. The original vector recipe is `fonts/original/source/build_meridian.py`; it generates `fonts/original/fm-meridian-serif-{regular,bold}.woff2` without reading or tracing another font. A specimen is in `fonts/original/source/fm-meridian-serif-preview.png`. The picker gets a live sample through the bundled-font catalogue. This is one additional original family, not completion of the requested long catalogue.

Changed files: `js/studio-fonts.js`, `index.html` (cache tag 2→3), `tests/tests.js` (one `{ item: 'TBD' }` regression), `fonts/original/source/{ORIGINALITY_AND_USE.md,fonts.css,build_meridian.py,render_meridian.py,fm-meridian-serif-preview.png}`, and the two new WOFF2 files in `fonts/original/`.

Checks run: the focused browser regression passed (`Regression 1/1 ✓`), both WOFF2 files reopened with fontTools and map 105 characters including ASCII letters, digits and everyday punctuation, with 400/700 weights and installable embedding. JavaScript syntax and `git diff --check` passed. The specimen PNG was visually inspected. Meridian is a display face for short Latin titles; unsupported accented letters/scripts use the configured serif fallback.

No push, PR, deployment or shared-checkout edits.
