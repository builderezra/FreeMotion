# #690 / C31 — reversed straight video in Time Warp Scan

Starting commit: `a1ba94410c268b28c9d27c1db4f737cf22a93168` on fresh isolated `codex/690-c31-video-reverse`. The exact #690 standing brief and C31 plan row were checked; no matching `audits/*.json` record was found.

A finite positive constant-speed video playing backward now qualifies for the bounded historical-strip decoder. Each strip samples `FM.layerLocalTime` at its crossing, which maps backward through source frames. Speed ramps, frame blending, crops, masks, parenting and other complex stacks stay excluded.

Changed files: `js/compositor.js` (eligibility), `index.html` (compositor cache 301), `tests/tests.js` (one `TBD` regression), and this report. The new indexed-video check confirms the source advances from frame 30 to frame 7 in reverse, then compares continuous playback with a cold seek at full/half preview and compares main MP4 frames. It and the preceding straight-video indexed regression passed 2/2 on the final cache-tagged branch. One earlier run failed both indexed-video tests during browser bootstrap; two subsequent focused runs passed the pair. JavaScriptCore syntax and `git diff --check` passed. No broad suite was run; this is a local C31 increment, not resolution of the whole finding or a release.
