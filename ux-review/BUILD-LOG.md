# Building the UX review's "Start here" fixes

His word, 25 Sep, after the review was published: **"Go"**. Read as: build the 12 Start-here fixes on
this branch, in order, without touching `main`. Each fix gets a test that FAILS against the code before it
and PASSES after (the prove.sh rule), run in headless Chromium at 1280 and 380 px.

**Before merging to main:** this branch does not bump the version label, the `?v=` cache-busters or
POLISH-LOG, so it can merge cleanly under whatever `main` has shipped since. `tools/ship.sh` will ask for
those at merge time, and it is right to: a missed buster serves the old file.

| # | Fix | Status | Test (name contains) | Proof |
|---|-----|--------|----------------------|-------|
| 1 | Tap a layer on the preview to select it | **Not built: your decision.** v2.93 "the canvas never selects… Layers are picked from the timeline." Needs your call (see report). | | |
| 2 | Dragging an animated layer moves the whole animation | **Not built: your decision.** v3.00 "canvas dragging no longer drops keyframes (your clarification)". Needs your call. | | |
| 3 | Keyframe diamonds show a stale state after the playhead moves | Built | `keyframe diamonds follow the playhead` | Fails on 7bb5058 ("at 1.2 s … the rail diamond still claims a keyframe is here"), passes after, 1280 + 380. The 61 other `keyframe` tests pass. |
| 4 | No visible play button | **Your decision + a design question.** Queue 364: *"Make it so that the play button is now the project time pill"*. A glyph inside the pill is a visual change, so per the design rule it needs pictures of options before anything is built. | | |
| 6 (old) | Effects library won't scroll | **Retracted, not a bug.** The review's test browser kept a 1280x720 real window under the 390x844 phone screen, so swipes starting below y=720 went nowhere. With the window fixed, the library and the blend-mode list both scroll from anywhere (measured: 205 px and 249 px). Replaced in the top 12 by "photos imported together stack at 0:00". | | |
