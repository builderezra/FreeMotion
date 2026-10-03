# #690 B52 — Panasonic V-Log to Rec.709 increment

Starting commit: `288c20fca660b45059168c854607e9b464b563ea` on isolated `chatgpt/690-continuation`.

Added a selectable V-Log/V-Gamut grade for footage recorded in that Panasonic profile. It uses the V-Log inverse and V-Gamut-to-BT.709 matrix published in [Panasonic's reference manual](https://pro-av.panasonic.net/en/cinema_camera_varicam_eva/support/pdf/VARICAM_V-Log_V-Gamut.pdf), then the [BT.709 output curve](https://www.itu.int/dms_pubrec/itu-r/rec/bt/r-rec-bt.709-6-201506-i%21%21pdf-e.pdf). Exposure, highlight roll-off and Mix are controls. The same point kernel serves layer effects and adjustment grades, preview and export. This is a working first profile of B52; Apple Log, S-Log3, C-Log3 and device-specific D-Log M are still pending verified transforms.

Changed: `js/compositor.js`, `js/fx-registry.js`, `index.html` cache tags, one `{ item: 'TBD' }` regression in `tests/tests.js`, and this report.

Checks: JavaScriptCore loaded the production compositor and registry; the kernel changed Panasonic's 18%-grey code value 108/255 to neutral BT.709 code value 104/255 and applied the matrix to a coloured sample. The focused regression also covers zero Mix, exposure, transparency and adjustment routing. Script syntax and `git diff --check` passed. Browser visual output and real camera footage remain unverified.

Limits: the effect assumes the browser hands the compositor the original V-Log RGB code values. Video colour metadata may cause a browser to transform pixels before canvas access, and that path has not been verified on an iPhone. It does not auto-detect camera profiles; selecting it for other footage will give a wrong grade. Highlight roll-off is an editorial curve after the documented colour conversion, not a vendor LUT look.
