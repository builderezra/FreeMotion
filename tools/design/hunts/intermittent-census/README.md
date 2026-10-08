# H52: the intermittent census (partial, rewritten after every slice)

Tree: `wip/v17.26-tree` 5fe2deb0 (v17.26 on 2e3fd7a9), headless Chromium 1194 in a 4-core container, with the same scratch skip of the three tests that hang here (`690 swiping the share sheet away…`, `690 an export holds the screen awake…`, `every tile in the browser picks…`). Passes: N = normal, T = every test under a 2x CPU throttle (`Emulation.setCPUThrottlingRate` held at 2 for the whole run), L = four busy loops running beside it (one per core). Width 1280 or 380.

## Passes so far (each pass is 4 slices, so a restart costs one slice)

| pass | summary | reds |
|---|---|---|
| N1280 | 2/4 slices: Regression 568/572 ✗Pending 0/0 built + Regression 564/571 ✗ · NOT RUN HERE 3 Pending 0/0 built | 8 |

## Red names by pass (a name red in some passes and green in others is the intermittent kind)

| test | N1280 |
|---|---|
| 915.5Br a reused VIDEO is stored as a pointer that says video, and reopens as a playing video, not blank | RED |
| 921 S3 Stop sharing revokes the code that was handed out | RED |
| 921 S4 splash.mp4, a PNG and a WAV all arrive, land in this device’s own records, and the picture renders | RED |
| 921 S6 a shared copy finds its owner by itself: a here from the owner makes it offer again at once, its token lets it in, and a dropped link comes bac | RED |
| an export survives the tab being backgrounded (queue 47) | RED |
| home push: the press answers the tap, survives the wait, and hands over without a pop | RED |
| playhead: a rebuild during the return-to-home pop keeps --tl-panel-left honest | RED |
| the VIDEO strip decode is capped too, not just the image one | RED |
