# FM Cloud Pop original display font

Starting commit: `ffb3742e4c70943b589844ae9bf89907377f33c5` (`chatgpt/690-all-local`). Branch: `chatgpt/original-cloud-pop` in `/private/tmp/freemotion-cloud-pop-20261004`.

Ezra asked for a broad, attractive catalogue of original FreeMotion fonts without third-party font fees. This increment adds one distinct, upright soft display family for playful titles. Its Regular/Bold glyphs are built from independent geometric paths in `fonts/original/source/build_cloud_pop.py`, not third-party font outlines or metrics. Both WOFF2 faces map all 95 printable ASCII characters and 83 further Unicode characters, including common accented Latin names and typographic punctuation. The source note in `fonts/original/source/ORIGINALITY_AND_USE.md` records the generation and use terms. `fonts/original/source/fm-cloud-pop-preview.png` was visually inspected at full size, including 32 px and 48 px samples.

Changed files: `fonts/original/fm-cloud-pop-{regular,bold}.woff2`; `fonts/original/source/build_cloud_pop.py`, `render_cloud_pop.py`, `fm-cloud-pop-preview.png`, `fonts.css`, `ORIGINALITY_AND_USE.md`; `fonts/README.md`; `js/studio-fonts.js`; `index.html` (font script v8); `tests/tests.js` (one `{ item: 'TBD' }` regression).

Checks: fontTools verified 178 mapped characters and complete printable ASCII in both faces, 400/700 weights, installable embedding and GPOS. The focused Cloud Pop browser regression passed (1/1) after one partial app boot; it loads both faces through the same `forScene` path awaited by export, checks distinct canvas ink weights, and checks the live font picker sample. A separate existing this-frame PNG test could not start because the test iframe reported incomplete app bootstrap before its test ran. JavaScript syntax, Python syntax and `git diff --check` passed. Full video export was not run; export output is UNVERIFIED.

No shared Claude checkout files were edited; no push, PR or deployment was performed. This is one additional family, not completion of the long-catalogue request.
