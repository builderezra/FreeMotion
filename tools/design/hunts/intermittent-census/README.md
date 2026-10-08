# H52: the intermittent census (partial, rewritten after every slice)

Tree: `wip/v17.26-tree` 5fe2deb0 (v17.26 on 2e3fd7a9), headless Chromium 1194 in a 4-core container, with the same scratch skip of the three tests that hang here (`690 swiping the share sheet away…`, `690 an export holds the screen awake…`, `every tile in the browser picks…`). Passes: N = normal, T = every test under a 2x CPU throttle (`Emulation.setCPUThrottlingRate` held at 2 for the whole run), L = four busy loops running beside it (one per core). Width 1280 or 380.

## Passes so far (each pass is 4 slices, so a restart costs one slice)

| pass | summary | reds |
|---|---|---|
| N1280 | 3/4 slices: Regression 568/572 ✗Pending 0/0 built + Regression 564/571 ✗ · NOT RUN HERE 3 Pending 0/0 built + Regression 547/572 ✗ · NOT RUN HERE 2 Pending 0/0 built | 31 |

## Red names by pass (a name red in some passes and green in others is the intermittent kind)

| test | N1280 |
|---|---|
| #215: an audio warning survives the frame loop, and a verdict does not carry into the next export | RED |
| #662: an export leaves a report that names the audio outcome | RED |
| 47 | RED |
| 486: the H.265 check agrees with a fully-specified codec probe, not a bare fourcc | RED |
| 501: the add-row switch is white at rest and flashes accent when it moves the row | RED |
| 658 | RED |
| 671 | RED |
| 776: the intro film plays through and is never faded out while the splash is still up | RED |
| 783: the dark look's intro is never bright after the mark has animated, and the light look's still ends white | RED |
| 915.5Br a reused VIDEO is stored as a pointer that says video, and reopens as a playing video, not blank | RED |
| 921 S3 Stop sharing revokes the code that was handed out | RED |
| 921 S4 splash.mp4, a PNG and a WAV all arrive, land in this device’s own records, and the picture renders | RED |
| 921 S6 a shared copy finds its owner by itself: a here from the owner makes it offer again at once, its token lets it in, and a dropped link comes bac | RED |
| a trim grip needs a hold on touch, arms visibly, and is instant on mouse (queue 336) | RED |
| an export survives the tab being backgrounded (queue 47) | RED |
| effect panels carry no explanation block, and motion blur cranks past one frame (queue 378/379) | RED |
| every category card has its own gradient ring, out of step with the others (queue 339) | RED |
| export: SOLO on a silent layer kills the whole soundtrack, and now says so (queue 215) | RED |
| export: a soundtrack that cannot be built SAYS so instead of shipping a mute file (queue 47) | RED |
| export: a soundtrack that fails to ENCODE says so, so it is not mistaken for the muxer (queue 215) | RED |
| export: frames the video could not reach in time are counted, not passed off as real (queue 47) | RED |
| home push: the press answers the tap, survives the wait, and hands over without a pop | RED |
| play: holding the Play button plays, it does not silently toggle Loop instead | RED |
| playhead: a rebuild during the return-to-home pop keeps --tl-panel-left honest | RED |
| presets can be searched, tagged, grouped and renamed (queue 331 clauses 4-9) | RED |
| saving a preset updates the open Presets card by itself (queue 330) | RED |
| the Presets card leads with its save button and its ✕ is drawn, not typed (queue 331) | RED |
| the VIDEO strip decode is capped too, not just the image one | RED |
| the benchmark line stops at the lanes, and the loading pill sits under the panels (queue 348/393) | RED |
| the hoisted curl / fractal-warp / tunnel kernels match their own reference bodies | RED |
| the phone move/extend buttons are not the same drawing (queue 338) | RED |
