# #690 — Colour-safe Unsharp Mask control

Starting commit: `8324f0c00d10d4677fddb99ba0057f333edc47d6` on isolated `chatgpt/690-continuation`.

The filter review in `audits/912-audit.json` noted colour fringing around saturated edges because Unsharp Mask sharpens red, green and blue independently. A new **Protect colour** slider blends that legacy channel-by-channel result toward a shared luminance sharpening offset. New manual instances default to 100%, so a neutral pixel beside a saturated edge stays neutral. The slider has `legacy: 0`, and the kernel treats a missing key as zero: existing saved effects and filter recipes retain their former look. The control can be keyframed.

Changed `js/compositor.js`, its cache tag in `index.html`, one focused `{ item: 'TBD' }` regression in `tests/tests.js`, and this report. A production-kernel probe of grey beside red yielded cyan `(130,255,255)` through the old path and neutral `(249,249,249)` with full protection; missing and explicit zero controls were byte-identical. JavaScriptCore syntax and `git diff --check` passed. Browser inspector layout and photographic visual quality remain UNVERIFIED.
