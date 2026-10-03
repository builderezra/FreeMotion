# FM Foundry Slab: sixth original font family

Starting commit: `c4f51b7f02a34ad188f9331c0931a03b04a114dd` in a new isolated clone, branch `chatgpt/original-foundry-slab`.

Ezra's direct request is quoted at `TASKS.md:228`: “invent / make a bunch of really good looking fonts so we dont have to pay for font rights but users still have a nice long catalogue to choose from”. This is one more distinct original family toward that larger request, not completion of it.

FM Foundry Slab is a sturdy, proportional, low-contrast slab serif for title cards, sports graphics and posters. The two faces are drawn from hand-positioned source geometry in `fonts/original/source/build_foundry_slab.py`, without reading or tracing any other font. Regular/Bold WOFF2 faces map 178 characters: printable ASCII, common European accents, punctuation and currency signs. A warm-light specimen at `fonts/original/source/fm-foundry-slab-preview.png` shows both weights and actual 32/48px samples; it was visually inspected. The source note records provenance and permitted FreeMotion use.

Changed files: `fonts/original/fm-foundry-slab-{regular,bold}.woff2`; `fonts/original/source/{build_foundry_slab.py,render_foundry_slab.py,fm-foundry-slab-preview.png,fonts.css,ORIGINALITY_AND_USE.md}`; `fonts/README.md`; `js/studio-fonts.js`; `index.html` (font script cache tag 6→7); `tests/tests.js` (one `{ item: 'TBD' }` regression).

Checks run: new focused browser regression passed 1/1, covering both loaded faces, visibly heavier Bold ink and a live text-picker sample. An existing Vector Mono control could not be confirmed in this run: one attempt reached the test but lacked `FM.glintRing` from `js/home.js`; two retries stopped before tests because the app frame lacked `FM.renderScene`. This is a partial app boot, not evidence that Foundry Slab broke Vector Mono. Both WOFF2 faces reopened with fontTools: 178 mapped code points, all printable ASCII, 400/700 weights, GPOS kerning and installable embedding. Python and JavaScriptCore syntax and `git diff --check` passed. Installed-iPhone rendering/export remain unverified.

No push, PR, deployment or shared-checkout edit.
