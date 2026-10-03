# Original and no-fee font catalogue

Starting main snapshot: `f771657683ae61e4aff657e4beab8fac248e8dfe`

Local branch: `chatgpt/original-fonts` in `/private/tmp/freemotion-original-fonts-20261004`

Delivery: local only; no push or release.

## Result

FreeMotion now has a 13-family text catalogue: two newly drawn families, **FM Aster Round** and **FM Circuit Sans**, in Regular/Bold; and eleven established open-source families across sans, condensed, serif, script and mono styles. The new families are visibly separate from device and imported fonts in the text picker. The original glyph outlines are generated from the project-specific vector source in `fonts/original/source/build_fonts.py`; the source, specimens and build requirements are included. The open-source binaries remain unmodified and keep their designers' names and notices. `fonts/open/source-manifest.json` records pinned source URLs and SHA-256 for each file.

The included third-party fonts use SIL OFL 1.1; the local licence/copyright text is retained with each family. [OFL 1.1](https://openfontlicense.org/open-font-license-official-text/) permits commercial bundling without a font fee, with the licence notices kept with the font software. It does not require credit in videos exported with the fonts. These eleven families are **not** FreeMotion inventions.

## Changed files

- Added `fonts/original/` (four WOFF2 files and reproducible drawing source) and `fonts/open/` (17 static font files, 11 notices, hashes and visual catalogue specimen), plus `fonts/README.md`.
- Added `js/studio-fonts.js` for lazy same-origin loading, cache invalidation and scene-specific font readiness.
- Updated `js/text-edit.js`, `js/inspector.js`, `js/settings.js` and `styles.css` for the catalogue and style selection.
- Updated `js/storage.js`, `js/exporter.js` and `js/app.js` so project/template adoption and MP4, GIF, PNG-sequence and still-PNG exports load used faces before drawing. A missing included font gives an error instead of silently saving fallback-looking text.
- Updated `index.html` asset versions and added four focused `{ item: 'TBD' }` regressions in `tests/tests.js`.

## Checks I ran

- Focused desktop browser tests: 4/4 passed (catalogue loading, this-frame PNG font readiness, failed selection preserving the saved font, existing PC picker control).
- Focused 390px phone-layout browser test: 1/1 passed (included fonts remain one swipeable rail after its opening animation).
- Verified 28/28 bundled third-party font and licence files against the manifest SHA-256 values; inspected visual specimens of the original and included families. The staged diff check passed with the verbatim upstream licence text excluded; some copied notices contain original trailing spaces or CRLF, retained to preserve their verified hashes.

The browser test harness intermittently failed to boot its test iframe on other attempts; the successful focused runs above are the result, not a claim that the broad suite passed. Installed iPhone/Safari appearance, all export container formats on-device, and non-Latin fallback were **not** tested. The new original fonts map 287 mostly Latin characters; other scripts fall back to the browser's generic face. Distinctive family names were chosen, but formal trademark clearance was not performed. Font binaries are fetched when first used or the picker is opened, then cached by the existing service worker for later offline use; a first offline visit cannot load an uncached face.
