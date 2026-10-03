# FM Lilt Marker: second new original font family

Starting commit: `582be7d71ce251167c1d3885a074c718e12bf970` (local all-fixes integration snapshot). Branch: `chatgpt/original-handwritten-next`.

Added a casual handwritten display family with original, hand-placed stroke and loop drawings in `fonts/original/source/build_lilt.py`. It generates Regular and Bold WOFF2 faces without reading or tracing any existing font. The letterforms are independently drawn from Meridian Serif and the older Aster/Circuit families. The picker displays a live sample; the inspected specimen at `fonts/original/source/fm-lilt-marker-preview.png` includes actual 32 px and 48 px samples. This is another increment toward Ezra's long original-font catalogue, not completion of that catalogue.

Changed files: `js/studio-fonts.js`, `index.html` (font script cache tag 3→4), `tests/tests.js` (one `{ item: 'TBD' }` regression), `fonts/original/source/{ORIGINALITY_AND_USE.md,fonts.css,build_lilt.py,render_lilt.py,fm-lilt-marker-preview.png}`, and `fonts/original/fm-lilt-marker-{regular,bold}.woff2`.

Checks run: the focused browser regression passed (`Regression 1/1 ✓`). Both WOFF2 files reopened with fontTools: 108 mapped characters, all 95 printable ASCII characters present, 400/700 weights, installable embedding. JavaScript syntax and `git diff --check` passed. The final specimen PNG was visually inspected. Lilt is for short English titles; accents and non-Latin scripts use the configured cursive fallback.

No push, PR, deployment or shared-checkout edits.
