# #690 — FM Palais Deco native middle dot

Starting commit: `76e23b549d0cbb85006f9ba2bf34d5ae89d48c55` (`codex/690-reviewed-local`).

An actual-size Regular/Bold Palais Deco sheet showed a fallback box where captions use U+00B7 MIDDLE DOT. The source builder now draws a narrow family-native dot; both WOFF2 weights were rebuilt and only their asset URLs advanced to version 2. All 227 previously mapped glyph outlines and advance widths are byte-identical in both fonts. The 24/32/48/96px light/dark specimen at `outside/chatgpt/font-study/palais-quality-gate/fm-palais-deco-actual-sizes.png` shows the corrected caption and a visually distinctive engraved family. Its fine channels still need a moving-video quality judgment before any final catalogue approval; the many-original-font request remains open.

Changed files: `fonts/original/source/build_palais_deco.py`, two `fonts/original/fm-palais-deco-*.woff2` assets, `js/studio-fonts.js`, `index.html` (loader cache 15), `tests/tests.js` (one `TBD` regression), this report and the specimen PNG.

Checks: both rebuilt WOFF2 files parsed with 228 mapped characters; all old glyph outlines/metrics compared identical with the starting assets. The new native Chromium glyph test and existing Blackthorn/Aperture glyph regression passed 2/2. JavaScriptCore syntax for the changed scripts and `git diff --check` passed. The source review used the actual generated family; no audit JSON finding was substituted for it.
