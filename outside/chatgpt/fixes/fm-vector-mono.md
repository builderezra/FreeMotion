# FM Vector Mono: fifth original font family

Starting commit: `5cf39d1174959af058fe8176569c226f12782f28` (isolated consolidated local branch). Branch: `chatgpt/original-geometric-next`.

Ezra's direct request is logged at `TASKS.md:228`: “invent / make a bunch of really good looking fonts so we dont have to pay for font rights but users still have a nice long catalogue to choose from”. This is one further distinct original family toward that larger catalogue, not the end of the request.

Added FM Vector Mono Regular and Bold, a wide geometric monospaced face suited to countdowns, scorecards, credits and technical title cards. `fonts/original/source/build_vector_mono.py` draws each glyph from hand-positioned original geometry and reads no other font file. Both WOFF2 faces have the same 700-unit glyph advance and map 178 characters: all 95 printable ASCII characters plus common European accents, punctuation and currency marks. The actual 32/48px specimen `fonts/original/source/fm-vector-mono-preview.png` was visually inspected. `ORIGINALITY_AND_USE.md` records source and permitted project use.

Changed files: `fonts/original/fm-vector-mono-{regular,bold}.woff2`; `fonts/original/source/{build_vector_mono.py,render_vector_mono.py,fm-vector-mono-preview.png,fonts.css,ORIGINALITY_AND_USE.md}`; `fonts/README.md`; `js/studio-fonts.js`; `index.html` (studio-fonts tag 4→5); `tests/tests.js` (one `{ item: 'TBD' }` regression).

Checks run: new focused browser regression 1/1 passed, including both loaded faces, equal-width `111111`/`WWWWWW`, heavier Bold ink, and a live font-picker sample. Existing Lilt Marker control passed 1/1 on retry; its first attempt stopped before any test because the browser harness did not finish loading the app frame. Both WOFF2 files reopened with fontTools: 178 mapped code points, all printable ASCII present, fixed advances, correct 400/700 metadata and installable embedding. Python and JavaScriptCore syntax checks and `git diff --check` passed. Browser rendering on an installed iPhone remains unverified.

No push, PR, deployment or shared-checkout edit.
