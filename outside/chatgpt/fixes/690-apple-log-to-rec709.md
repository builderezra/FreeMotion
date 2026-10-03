# #690 B52 — Apple Log/BT.2020 to Rec.709 increment

Starting commit: `a7eb2e87b23fe0e83b1d740319eac2b7e788e12e` on isolated `chatgpt/690-continuation`.

The Log to Rec.709 effect now offers Apple Log with BT.2020 primaries. The inverse curve follows the [Academy Software Foundation OpenColorIO Apple Log implementation](https://github.com/AcademySoftwareFoundation/OpenColorIO/blob/main/src/OpenColorIO/transforms/builtins/AppleCameras.cpp); [Apple documents BT.2020 primaries for Apple Log](https://developer.apple.com/documentation/avfoundation/avcapturecolorspace/applelog). The linear BT.2020-to-Rec.709 matrix was calculated from the D65 primaries in [ITU-R BT.2020](https://www.itu.int/dms_pubrec/itu-r/rec/bt/r-rec-bt.2020-2-201510-i%21%21pdf-e.pdf) and [ITU-R BT.709](https://www.itu.int/dms_pubrec/itu-r/rec/bt/r-rec-bt.709-6-201506-i%21%21pdf-e.pdf). Its rows are `(1.66049100, -0.58764114, -0.07284986)`, `(-0.12455047, 1.13289990, -0.00834942)`, and `(-0.01815076, -0.10057890, 1.11872966)`. The existing Rec.709 output curve, exposure, roll-off and Mix apply after conversion. Existing saved effects still default to Panasonic.

Changed: `js/compositor.js`, `js/fx-registry.js`, `index.html` cache tags, one `{ item: 'TBD' }` regression in `tests/tests.js`, and this report. The decode table is built once at startup, and profile selection happens once per frame.

Checks: JavaScriptCore loaded the production compositor and registry. A focused production-kernel probe mapped 8-bit Apple Log 18%-grey code 125 to neutral Rec.709 code 105, applied the BT.2020 gamut matrix to a warm sample, and kept a transparent pixel unchanged. Script syntax and `git diff --check` passed. Actual iPhone Apple Log footage, browser colour-management behavior and the browser regression remain UNVERIFIED.

The effect assumes canvas receives original Apple Log RGB code values; iOS or browser video colour conversion could invalidate this assumption. This profile is **Apple Log/BT.2020**, not Apple Log 2/Apple Wide Gamut. Canon Log3 and device-specific DJI D-Log M are still pending, so B52 remains partial.
