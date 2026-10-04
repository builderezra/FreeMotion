# #690 — native middle dots in two original fonts

Starting commit: `1c84e76377bc51e32db0c3778844ce5d091da921` on fresh isolated `codex/690-font-middle-dot`.

Actual-size font review exposed a replacement-looking box for U+00B7 MIDDLE DOT in FM Blackthorn and FM Aperture Stencil. Their independent builders now draw a centered diamond and a square dot respectively; all four Regular/Bold WOFF2 assets were regenerated. The stable saved font IDs and family names remain unchanged. `js/studio-fonts.js` gives just these two assets version 2 URLs for preview and export, and `index.html` bumps its script cache tag to 14. One `TBD` regression in `tests/tests.js` loads both weights in a browser and checks a narrow, visible native glyph. Updated actual 24/32/48/96 px specimens are in `outside/chatgpt/font-study/quality-gate/`.

Checks: the focused browser regression passed. FontTools compared every previously mapped glyph's outline and advance in all four assets: all were unchanged, and U+00B7 was added. The rebuilt middle dots were visually inspected at the real sizes. JavaScriptCore syntax and `git diff --check` passed. This repairs punctuation but does **not** clear either family's overall design-quality hold or fulfill the many-distinct-original-font request. No broad suite, push, PR, deploy or shared Claude checkout edit.
