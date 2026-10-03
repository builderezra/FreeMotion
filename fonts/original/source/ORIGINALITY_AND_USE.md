# FreeMotion original display fonts

This set contains four original Latin display families. `build_fonts.py` draws Aster Round and Circuit Sans from geometric centerlines. `build_meridian.py` separately draws Meridian Serif with high-contrast contours, flared serifs, and independently constructed glyphs. `build_lilt.py` draws Lilt Marker with hand-placed irregular loops, flowing strokes and a gentle right lean. The generators write TrueType and WOFF2 files and add native kerning pairs. They do not import a base font, trace existing glyph outlines, or copy another font's metrics. The Python packages in `requirements.txt` are build tools; their font files are not inputs.

| Family | Design | Files |
| --- | --- | --- |
| FM Aster Round | Friendly open forms, rounded terminals, wider spacing | Regular and Bold |
| FM Circuit Sans | Condensed proportions, square terminals, angular polygonal bowls | Regular and Bold |
| FM Meridian Serif | Editorial high contrast, fine crossbars, flared serifs and open lowercase | Regular and Bold |
| FM Lilt Marker | Readable casual hand lettering with rounded marker strokes | Regular and Bold |

Aster Round and Circuit Sans each map 287 Unicode characters: A–Z, a–z, digits, common punctuation, currency and quote symbols, plus many accented Latin-1 and Latin Extended-A characters. Meridian Serif maps 105 characters: basic Latin letters, digits, common punctuation and signs, and several typographic quotes and dashes. Lilt Marker maps all 95 printable ASCII characters plus thirteen typographic marks and currency symbols (108 total). Meridian and Lilt are intended for short English titles; unsupported accents and scripts use the CSS fallback. All four families use 1000 units per em and include Regular/Bold marked 400/700. GPOS kerning covers common pairs such as AV, To, and Ya. The OS/2 embedding flag is 0 (installable embedding).

These are display fonts intended for FreeMotion titles, labels, and graphics. `preview.png` shows Aster and Circuit; `preview-32-48.png` checks their sentence readability at actual 32 px and 48 px sizes. `fm-meridian-serif-preview.png` and `fm-lilt-marker-preview.png` show the newer families' letterforms and both weights. Lilt's specimen also includes real 32 px and 48 px samples. Keep a fallback font for scripts and symbols outside each family's coverage. FreeMotion can set its own distribution terms for these generated assets.

To regenerate: install `requirements.txt`, run `python build_fonts.py`, `python build_meridian.py` and `python build_lilt.py`, then run the `render_*.py` scripts. Each generator stages its faces before updating the WOFF2 files in `fonts/original/` that the app actually loads. TrueType intermediates remain in `source/fonts/` for the specimen renderers. `fonts.css` shows the browser family names and weights.
