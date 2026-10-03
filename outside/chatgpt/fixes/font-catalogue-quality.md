# Font catalogue quality follow-up

Starting commit: `87979bea18dd256f7e5c0f49d73c043b3987adbc` (`chatgpt/original-fonts`).

Local branch: `chatgpt/font-catalogue-quality` in `/private/tmp/freemotion-font-quality-20261004`. No push, PR, deployment, or shared-checkout edit.

## Result

Fraunces 72pt Soft Regular now loads the actual Regular face. Previously, the picker registered the Bold binary at both 400 and 700, so unbolded text also looked bold. The new binary is an unchanged copy of the [upstream Regular TTF at the same pinned commit](https://github.com/undercasetype/Fraunces/blob/d6d385783609ceb11ac0f220f3abd9f1631c8a36/fonts/static/ttf/Fraunces72ptSoft-Regular.ttf), SHA-256 `855fd0759e5a8ac74c2dcf969e42f516e66b719fa4e1d6b3142c6eb257d3548b`. Its family is Fraunces 72pt Soft, style Regular, weight 400, and embedding flag 0. The project's [pinned upstream OFL 1.1 text](https://github.com/undercasetype/Fraunces/blob/d6d385783609ceb11ac0f220f3abd9f1631c8a36/OFL.txt) covers the file; its unchanged copyright and licence notice remains beside both bundled faces.

The original-font generator now stages all four weights before publishing WOFF2 files to `fonts/original/`, the location loaded by the app. TrueType intermediates remain ignored in `fonts/original/source/fonts/` for the preview renderers. A fixed original creation timestamp makes regeneration byte-for-byte stable. The source CSS now points to the shipped WOFF2 files.

## Changed files

- Added `fonts/open/fraunces-72pt-soft/Fraunces72ptSoft-Regular.ttf`; updated `fonts/open/source-manifest.json`, `js/studio-fonts.js`, and its `index.html` cache tag.
- Updated `fonts/original/source/build_fonts.py`, `fonts.css`, `ORIGINALITY_AND_USE.md`, and added `fonts/original/source/.gitignore` for generated TTF intermediates.
- Added one `{ item: 'TBD' }` regression in `tests/tests.js` for separate Fraunces 400/700 faces.

## Checks I ran

- Validated all 29 manifest files against size and SHA-256, and inspected the new TTF's 400 weight, name, character map, and embedding flag.
- Regenerated all four original WOFF2 files and confirmed their bytes match the starting commit exactly.
- In a focused local Chrome page, both Fraunces faces loaded; canvas widths for the same text were 602.53 px Regular and 642.40 px Bold.
- Python and JavaScript syntax checks and `git diff --check` passed.

The repository's integrated `tests/run.html?only=Fraunces...` harness failed to boot its app iframe on three attempts before it could execute the new regression. This is **unverified in the integrated suite**; the independent browser face-loading check above passed. iPhone/Safari appearance remains unverified.
