# FreeMotion font catalogue

The app includes two original FreeMotion display families and eleven independently designed open-source families. The files are loaded from this directory as needed by the text picker and export renderer. New text uses the bundled Inter face; saved text keeps its existing `fontFamily` value.

`original/` contains FreeMotion's FM Aster Round and FM Circuit Sans in Regular and Bold. They were drawn for this project from vector instructions in `original/source/build_fonts.py`; that folder also contains the build requirements, design/provenance note, and visual specimens. The generated WOFF2 files are the files the app loads. These original files contain no third-party font outline or metrics input.

`open/` contains unchanged font binaries from their designers, each in its own folder beside the original SIL Open Font License or equivalent OFL text and copyright notice. `open/source-manifest.json` records a pinned download URL, SHA-256, and internal name for every binary and licence file. The catalogue keeps each designer's original family name. The [OFL 1.1](https://openfontlicense.org/open-font-license-official-text/) permits commercial software bundling and use without a font licence fee, subject to keeping the copyright and licence notices with the font software. Videos made with these fonts do not need a font attribution; the bundled font files do need their notices.

The original fonts are designed for Latin titles and graphics. Their 287-character mapping covers basic Latin, common punctuation and many accented Latin characters; text outside this coverage falls back to the CSS generic family. The independently designed fonts vary in script coverage. Consult each file's actual character map before promising support for a particular language.

No remote font service or paid font subscription is used at runtime. The versioned same-origin files become available offline after the service worker has cached them; opening the font picker fetches both weights of the included families. A first offline visit before those files have been cached cannot load an uncached face and the app reports that instead of silently exporting fallback text.
