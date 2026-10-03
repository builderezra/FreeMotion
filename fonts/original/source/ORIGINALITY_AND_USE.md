# FreeMotion original display fonts

This set contains two original Latin display families drawn in `build_fonts.py`. The generator defines every glyph as vector centerlines, constructs the outlines, writes TrueType and WOFF2 files, and adds native kerning pairs. It does not import a base font, trace existing glyph outlines, or copy another font's metrics. The Python packages in `requirements.txt` are build tools; their font files are not inputs.

| Family | Design | Files |
| --- | --- | --- |
| FM Aster Round | Friendly open forms, rounded terminals, wider spacing | Regular and Bold |
| FM Circuit Sans | Condensed proportions, square terminals, angular polygonal bowls | Regular and Bold |

Each file maps 287 Unicode characters: A–Z, a–z, digits, common punctuation, currency and quote symbols, plus many accented Latin-1 and Latin Extended-A characters. Both families use 1000 units per em, 700-unit caps, 500-unit lowercase height, and 1050/-330 vertical metrics. Regular/Bold are marked 400/700. GPOS kerning covers common pairs such as AV, To, and Ya. The OS/2 embedding flag is 0 (installable embedding).

These are display fonts intended for FreeMotion titles, labels, and graphics. `preview.png` shows the full samples; `preview-32-48.png` checks sentence readability at actual 32 px and 48 px sizes. Keep a fallback font for scripts and symbols outside the 287-character coverage. FreeMotion can set its own distribution terms for these generated assets.

To regenerate: install `requirements.txt`, run `python build_fonts.py`, then run the two `render_*.py` scripts. `fonts.css` shows the browser family names and weights.
