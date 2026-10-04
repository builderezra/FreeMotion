# #690 / C31 — linear video speed ramp in Time Warp Scan

Starting commit: `ffcf1a6b2bfbce9aacadc6e4922202fe0122ad18` on fresh isolated `codex/690-c31-video-ramp`. The exact #690 standing brief and C31 plan row were checked; no matching `audits/*.json` record was found.

The bounded historical-strip decoder now admits a nonlooping video speed ramp with finite positive, strictly ordered linear keyframes. At each crossing it uses the existing integrated `FM.layerLocalTime`, so past strips use their actual source frame. Malformed, zero/negative, eased or looping speed curves, along with frame blending and other complex stacks, remain excluded.

Changed files: `js/compositor.js` (narrow eligibility), `index.html` (compositor cache 302), `tests/tests.js` (one `TBD` indexed-video regression), and this report. The new test checks the 0.5×→1.5× ramp's actual source progression (frame 1→22), full/half cold-vs-continuous preview, and main MP4 parity. It and the preceding straight-video indexed regression passed 2/2 on the final branch. JavaScriptCore syntax and `git diff --check` passed. An earlier focused run also passed after an incomplete app bootstrap was repaired. No broad suite was run; C31 remains open and this is not a release.
