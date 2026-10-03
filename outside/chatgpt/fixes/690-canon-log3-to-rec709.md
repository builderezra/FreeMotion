# #690 B52 — Canon Log 3/Cinema Gamut to Rec.709 increment

Starting commit: `1d9895b7e4b739bcdefde48f1f7c5b71a08bf528` on isolated `chatgpt/690-continuation`.

The Log to Rec.709 effect now offers an explicit Canon Log 3/Cinema Gamut profile. The inverse Log 3 segments and Cinema Gamut D65 primaries follow the [Academy Software Foundation OpenColorIO Canon transform](https://github.com/AcademySoftwareFoundation/OpenColorIO/blob/main/src/OpenColorIO/transforms/builtins/CanonCameras.cpp). The linear gamut matrix was calculated from those primaries and the [ITU-R BT.709 D65 primaries](https://www.itu.int/dms_pubrec/itu-r/rec/bt/r-rec-bt.709-6-201506-i%21%21pdf-e.pdf). Its rows are `(1.92386130, -0.79876066, -0.12510063)`, `(-0.20431085, 1.49589851, -0.29158766)`, and `(-0.02368502, -0.42012701, 1.44381203)`. The existing Rec.709 output curve, exposure, roll-off and Mix apply after conversion. Existing saved effects still default to Panasonic.

Changed: `js/compositor.js`, `js/fx-registry.js`, `index.html` cache tags, one `{ item: 'TBD' }` regression in `tests/tests.js`, and this report. The decode table is built once at startup, and profile selection happens once per frame.

Checks: JavaScriptCore loaded the production compositor and registry. A focused production-kernel probe mapped Canon Log 3 18%-grey input code 88 to neutral Rec.709 code 105, applied the Cinema Gamut matrix to a warm sample, and kept a transparent pixel unchanged. Script syntax and `git diff --check` passed. Actual Canon footage, browser colour-management behavior and the browser regression remain UNVERIFIED.

This profile is for footage recorded as **Canon Log 3 with Cinema Gamut**. Canon Log 3 with BT.2020, BT.709 or another gamut needs a separately labelled conversion. Device-specific DJI D-Log M remains pending, so B52 is partial.
