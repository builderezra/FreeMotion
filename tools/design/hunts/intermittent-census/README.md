# H52: the intermittent census (partial, rewritten after every slice)

Tree: `wip/v17.26-tree` 5fe2deb0 (v17.26 on 2e3fd7a9), headless Chromium 1194 in a 4-core container, with the same scratch skip of the three tests that hang here (`690 swiping the share sheet away…`, `690 an export holds the screen awake…`, `every tile in the browser picks…`). Passes: N = normal, T = every test under a 2x CPU throttle (`Emulation.setCPUThrottlingRate` held at 2 for the whole run), L = four busy loops running beside it (one per core). Width 1280 or 380.

## Passes so far (each pass is 4 slices, so a restart costs one slice)

| pass | summary | reds |
|---|---|---|
| N1280 | 4/4 slices: Regression 568/572 ✗Pending 0/0 built + Regression 564/571 ✗ · NOT RUN HERE 3 Pending 0/0 built + Regression 547/572 ✗ · NOT RUN HERE 2 Pending 0/0 built + Regression 454/569 ✗ · NOT RUN HERE 91 Pending 0/0 built | 55 |
| N380 | 1/4 slices: Regression 568/572 ✗Pending 0/0 built | 4 |

## Red names by pass (a name red in some passes and green in others is the intermittent kind)

| test | N1280 | N380 |
|---|---|---|
| 915.5Br a reused VIDEO is stored as a pointer that says video, and reopens as a playing video, not blank | RED | RED |
| home push: the press answers the tap, survives the wait, and hands over without a pop | RED | RED |
| playhead: a rebuild during the return-to-home pop keeps --tl-panel-left honest | RED | RED |
| the VIDEO strip decode is capped too, not just the image one | RED | RED |
| #215: an audio warning survives the frame loop, and a verdict does not carry into the next export | RED | . |
| #662: an export leaves a report that names the audio outcome | RED | . |
| 47 | RED | . |
| 482 2.6 Motion Blur (Object) - Shutter phase -100 trails behind only, +100 runs ahead, a layer that has just stopped still smears behind, the preview  | RED | . |
| 482 3.0 Echo and Reverb - Tone, Low cut, Tape wobble, Pre-delay and Width are in the catalogue at defaults that are the old sound, and saved and new E | RED | . |
| 486: the H.265 check agrees with a fully-specified codec probe, not a bare fourcc | RED | . |
| 501: the add-row switch is white at rest and flashes accent when it moves the row | RED | . |
| 658 | RED | . |
| 671 | RED | . |
| 690 CONTROL a Custom project still takes the size of the first clip, as its tile says Auto adjusts | RED | . |
| 690 Replace media puts the new clip where the old one was at the same size, instead of blowing it up by its pixel count | RED | . |
| 690 a 30 fps clip exported at 30 fps shows every source frame once, in order | RED | . |
| 690 a big clip whose file never finished saving before the app closed is named when the project reopens | RED | . |
| 690 a clip with no sound track at all (a time-lapse) exports as no soundtrack, while a sound track that will not decode is still reported | RED | . |
| 690 a frame cache being built for a clip he has left stops at once, instead of seeking a video that will never load | RED | . |
| 690 a new project keeps the aspect and size he picked when the first thing he adds is a phone clip of another shape | RED | . |
| 690 a reversed 30 fps clip exported at 30 fps shows every source frame once, backwards | RED | . |
| 690 a shape made a Clipping Mask keeps the project background outside it, and a moving one leaves no trail in the export | RED | . |
| 690 an MP4 of a project with a transparent background leaves no trail behind a moving shape | RED | . |
| 690 an export seek answers only once its own frame is there, not while the element is still seeking | RED | . |
| 690 an export started while the timeline is still drawing a clip thumbnails has no black or misplaced frame | RED | . |
| 690 leaving the app mid-play stops playback where he left, with the clip silent while he is away | RED | . |
| 690 opening a project after looking into others shows its filmstrips as fast as opening it directly | RED | . |
| 690 pausing a clip with sound leaves the preview on the frame the playhead stopped on | RED | . |
| 690 stepping or scrubbing a 30 fps clip frame by frame shows every frame, each once | RED | . |
| 776: the intro film plays through and is never faded out while the splash is still up | RED | . |
| 783: the dark look's intro is never bright after the mark has animated, and the light look's still ends white | RED | . |
| 893: an export with no soundtrack does not print the previous export’s mix peak in its report | RED | . |
| 921 S3 Stop sharing revokes the code that was handed out | RED | . |
| 921 S4 splash.mp4, a PNG and a WAV all arrive, land in this device’s own records, and the picture renders | RED | . |
| 921 S6 a shared copy finds its owner by itself: a here from the owner makes it offer again at once, its token lets it in, and a dropped link comes bac | RED | . |
| 957 the empty project clapper opens, slams shut on the board with lines out of the tip, and stops when it cannot be seen | RED | . |
| 974 the clapper's three timings each play as drawn: A open then every 6 s, B one clap then shut, C non-stop | RED | . |
| 981 review: a real double-tap on the empty area - the first tap opens the add menu at once, and a second tap that lands on the menu as it swings up pi | RED | . |
| 981 review: with less motion the add menu arrives on its plain 220 ms slide, and its cards still take no tap for a double-tap window (300 ms) after th | RED | . |
| 988 the clapper on timing C rests between snaps - a clap every 3 s or more with the stick still and shut for 2 s between - while A and B are as they w | RED | . |
| a trim grip needs a hold on touch, arms visibly, and is instant on mouse (queue 336) | RED | . |
| an export survives the tab being backgrounded (queue 47) | RED | . |
| effect panels carry no explanation block, and motion blur cranks past one frame (queue 378/379) | RED | . |
| every category card has its own gradient ring, out of step with the others (queue 339) | RED | . |
| export: SOLO on a silent layer kills the whole soundtrack, and now says so (queue 215) | RED | . |
| export: a soundtrack that cannot be built SAYS so instead of shipping a mute file (queue 47) | RED | . |
| export: a soundtrack that fails to ENCODE says so, so it is not mistaken for the muxer (queue 215) | RED | . |
| export: frames the video could not reach in time are counted, not passed off as real (queue 47) | RED | . |
| play: holding the Play button plays, it does not silently toggle Loop instead | RED | . |
| presets can be searched, tagged, grouped and renamed (queue 331 clauses 4-9) | RED | . |
| saving a preset updates the open Presets card by itself (queue 330) | RED | . |
| the Presets card leads with its save button and its ✕ is drawn, not typed (queue 331) | RED | . |
| the benchmark line stops at the lanes, and the loading pill sits under the panels (queue 348/393) | RED | . |
| the hoisted curl / fractal-warp / tunnel kernels match their own reference bodies | RED | . |
| the phone move/extend buttons are not the same drawing (queue 338) | RED | . |
