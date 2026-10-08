# H52: the intermittent census (partial, rewritten after every slice)

Tree: `wip/v17.26-tree` 5fe2deb0 (v17.26 on 2e3fd7a9), headless Chromium 1194 in a 4-core container, with the same scratch skip of the three tests that hang here (`690 swiping the share sheet away…`, `690 an export holds the screen awake…`, `every tile in the browser picks…`). Passes: N = normal, T = every test under a 2x CPU throttle (`Emulation.setCPUThrottlingRate` held at 2 for the whole run), L = four busy loops running beside it (one per core). Width 1280 or 380.

## Passes so far (each pass is 4 slices, so a restart costs one slice)

| pass | summary | reds |
|---|---|---|
| N1280 | 4/4 slices: Regression 568/572 ✗Pending 0/0 built + Regression 564/571 ✗ · NOT RUN HERE 3 Pending 0/0 built + Regression 547/572 ✗ · NOT RUN HERE 2 Pending 0/0 built + Regression 454/569 ✗ · NOT RUN HERE 91 Pending 0/0 built | 55 |
| N380 | 4/4 slices: Regression 568/572 ✗Pending 0/0 built + Regression 564/571 ✗ · NOT RUN HERE 3 Pending 0/0 built + Regression 547/572 ✗ · NOT RUN HERE 2 Pending 0/0 built + Regression 454/569 ✗ · NOT RUN HERE 90 Pending 0/0 built | 56 |
| T1280 | 4/4 slices: Regression 567/572 ✗Pending 0/0 built + Regression 564/571 ✗ · NOT RUN HERE 3 Pending 0/0 built + Regression 545/572 ✗ · NOT RUN HERE 2 Pending 0/0 built + Regression 453/569 ✗ · NOT RUN HERE 90 Pending 0/0 built | 60 |
| T380 | 4/4 slices: Regression 567/572 ✗Pending 0/0 built + Regression 564/571 ✗ · NOT RUN HERE 3 Pending 0/0 built + Regression 544/572 ✗ · NOT RUN HERE 2 Pending 0/0 built + Regression 454/569 ✗ · NOT RUN HERE 89 Pending 0/0 built | 61 |
| L1280 | 4/4 slices: Regression 568/572 ✗Pending 0/0 built + Regression 564/571 ✗ · NOT RUN HERE 3 Pending 0/0 built + Regression 547/572 ✗ · NOT RUN HERE 2 Pending 0/0 built + Regression 453/569 ✗ · NOT RUN HERE 90 Pending 0/0 built | 57 |
| L380 | 4/4 slices: Regression 568/572 ✗Pending 0/0 built + Regression 564/571 ✗ · NOT RUN HERE 3 Pending 0/0 built + Regression 546/572 ✗ · NOT RUN HERE 2 Pending 0/0 built + Regression 455/569 ✗ · NOT RUN HERE 90 Pending 0/0 built | 56 |

## Red names by pass (a name red in some passes and green in others is the intermittent kind)

| test | N1280 | N380 | T1280 | T380 | L1280 | L380 |
|---|---|---|---|---|---|---|
| #215: an audio warning survives the frame loop, and a verdict does not carry into the next export | RED | RED | RED | RED | RED | RED |
| #662: an export leaves a report that names the audio outcome | RED | RED | RED | RED | RED | RED |
| 47 — a resumed export says so, and the fact outlives the overlay | RED | RED | RED | RED | RED | RED |
| 482 2.6 Motion Blur (Object) - Shutter phase -100 trails behind only, +100 runs ahead, a layer that has just stopped still smears behind, the preview  | RED | RED | RED | RED | RED | RED |
| 482 3.0 Echo and Reverb - Tone, Low cut, Tape wobble, Pre-delay and Width are in the catalogue at defaults that are the old sound, and saved and new E | RED | RED | RED | RED | RED | RED |
| 486: the H.265 check agrees with a fully-specified codec probe, not a bare fourcc | RED | RED | RED | RED | RED | RED |
| 501: the add-row switch is white at rest and flashes accent when it moves the row | RED | RED | RED | RED | RED | RED |
| 658 — the thumbnail pin turns the playhead blue, and the yellow stops lying | RED | RED | RED | RED | RED | RED |
| 671 — a browser with no usable H.264 profile is told so, not handed a codec that just failed | RED | RED | RED | RED | RED | RED |
| 690 CONTROL a Custom project still takes the size of the first clip, as its tile says Auto adjusts | RED | RED | RED | RED | RED | RED |
| 690 Replace media puts the new clip where the old one was at the same size, instead of blowing it up by its pixel count | RED | RED | RED | RED | RED | RED |
| 690 a 30 fps clip exported at 30 fps shows every source frame once, in order | RED | RED | RED | RED | RED | RED |
| 690 a big clip whose file never finished saving before the app closed is named when the project reopens — never a silent empty clip | RED | RED | RED | RED | RED | RED |
| 690 a clip with no sound track at all (a time-lapse) exports as no soundtrack, while a sound track that will not decode is still reported | RED | RED | RED | RED | RED | RED |
| 690 a frame cache being built for a clip he has left stops at once, instead of seeking a video that will never load | RED | RED | RED | RED | RED | RED |
| 690 a new project keeps the aspect and size he picked when the first thing he adds is a phone clip of another shape | RED | RED | RED | RED | RED | RED |
| 690 a reversed 30 fps clip exported at 30 fps shows every source frame once, backwards | RED | RED | RED | RED | RED | RED |
| 690 a shape made a Clipping Mask keeps the project background outside it, and a moving one leaves no trail in the export | RED | RED | RED | RED | RED | RED |
| 690 an MP4 of a project with a transparent background leaves no trail behind a moving shape | RED | RED | RED | RED | RED | RED |
| 690 an export seek answers only once its own frame is there, not while the element is still seeking | RED | RED | RED | RED | RED | RED |
| 690 an export started while the timeline is still drawing a clip thumbnails has no black or misplaced frame | RED | RED | RED | RED | RED | RED |
| 690 leaving the app mid-play stops playback where he left, with the clip silent while he is away | RED | RED | RED | RED | RED | RED |
| 690 opening a project after looking into others shows its filmstrips as fast as opening it directly — nothing waits behind clips from projects he left | RED | RED | RED | RED | RED | RED |
| 690 pausing a clip with sound leaves the preview on the frame the playhead stopped on | RED | RED | RED | RED | RED | RED |
| 690 stepping or scrubbing a 30 fps clip frame by frame shows every frame, each once | RED | RED | RED | RED | RED | RED |
| 776: the intro film plays through and is never faded out while the splash is still up | RED | RED | RED | RED | RED | RED |
| 783: the dark look's intro is never bright after the mark has animated, and the light look's still ends white | RED | RED | RED | RED | RED | RED |
| 893: an export with no soundtrack does not print the previous export’s mix peak in its report | RED | RED | RED | RED | RED | RED |
| 915.5Br a reused VIDEO is stored as a pointer that says video, and reopens as a playing video, not blank | RED | RED | RED | RED | RED | RED |
| 921 S4 splash.mp4, a PNG and a WAV all arrive, land in this device’s own records, and the picture renders | RED | RED | RED | RED | RED | RED |
| 921 S6 a shared copy finds its owner by itself: a here from the owner makes it offer again at once, its token lets it in, and a dropped link comes bac | RED | RED | RED | RED | RED | RED |
| 957 the empty project clapper opens, slams shut on the board with lines out of the tip, and stops when it cannot be seen | RED | RED | RED | RED | RED | RED |
| 974 the clapper's three timings each play as drawn: A open then every 6 s, B one clap then shut, C non-stop | RED | RED | RED | RED | RED | RED |
| 981 review: a real double-tap on the empty area - the first tap opens the add menu at once, and a second tap that lands on the menu as it swings up pi | RED | RED | RED | RED | RED | RED |
| 981 review: with less motion the add menu arrives on its plain 220 ms slide, and its cards still take no tap for a double-tap window (300 ms) after th | RED | RED | RED | RED | RED | RED |
| 988 the clapper on timing C rests between snaps - a clap every 3 s or more with the stick still and shut for 2 s between - while A and B are as they w | RED | RED | RED | RED | RED | RED |
| a trim grip needs a hold on touch, arms visibly, and is instant on mouse (queue 336) | RED | RED | RED | RED | RED | RED |
| an export survives the tab being backgrounded (queue 47) | RED | RED | RED | RED | RED | RED |
| effect panels carry no explanation block, and motion blur cranks past one frame (queue 378/379) | RED | RED | RED | RED | RED | RED |
| every category card has its own gradient ring, out of step with the others (queue 339) | RED | RED | RED | RED | RED | RED |
| export: SOLO on a silent layer kills the whole soundtrack, and now says so (queue 215) | RED | RED | RED | RED | RED | RED |
| export: a soundtrack that cannot be built SAYS so instead of shipping a mute file (queue 47) | RED | RED | RED | RED | RED | RED |
| export: a soundtrack that fails to ENCODE says so, so it is not mistaken for the muxer (queue 215) | RED | RED | RED | RED | RED | RED |
| export: frames the video could not reach in time are counted, not passed off as real (queue 47) | RED | RED | RED | RED | RED | RED |
| home push: the press answers the tap, survives the wait, and hands over without a pop | RED | RED | RED | RED | RED | RED |
| play: holding the Play button plays, it does not silently toggle Loop instead | RED | RED | RED | RED | RED | RED |
| playhead: a rebuild during the return-to-home pop keeps --tl-panel-left honest | RED | RED | RED | RED | RED | RED |
| presets can be searched, tagged, grouped and renamed (queue 331 clauses 4-9) | RED | RED | RED | RED | RED | RED |
| saving a preset updates the open Presets card by itself (queue 330) | RED | RED | RED | RED | RED | RED |
| the Presets card leads with its save button and its ✕ is drawn, not typed (queue 331) | RED | RED | RED | RED | RED | RED |
| the VIDEO strip decode is capped too, not just the image one | RED | RED | RED | RED | RED | RED |
| the benchmark line stops at the lanes, and the loading pill sits under the panels (queue 348/393) | RED | RED | RED | RED | RED | RED |
| the hoisted curl / fractal-warp / tunnel kernels match their own reference bodies | RED | RED | RED | RED | RED | RED |
| the phone move/extend buttons are not the same drawing (queue 338) | RED | RED | RED | RED | RED | RED |
| 921 S3 Stop sharing revokes the code that was handed out — the offer is closed, and the next share mints a different one | RED | RED | RED | . | RED | RED |
| 482 6.7 Glow Scan - a scan that sweeps Once or waits between sweeps on a 10 s clip is not told it changes nothing, and one at Strength 0 still is | . | RED | RED | RED | RED | . |
| 690 a Spin added at the start of its clip is not told it changes nothing while the box turns | . | . | RED | RED | RED | . |
| 794: the does-nothing-here probe stays quiet for Time Warp Scan and its ghost-gated siblings, and still calls a real no-op dead | . | . | RED | RED | . | RED |
| an effect that changes nothing on this layer is detected — and a working one is not (queue 477) | . | . | RED | RED | . | . |
| glide (#715): a mouse flick glides — a stall at release does not kill it, a parked pointer does not fling, fine mode never glides | . | . | RED | RED | . | . |
| effects: every bounded kernel is safe on the box the RENDERER actually computes | . | . | . | RED | . | . |
| the sheet previews the picked effects over the whole comp, and puts it all back (queue 277 + 390) | . | . | . | RED | . | . |

## Each red run alone, 3 times (1280 and 380)

| test | width | alone 1 | alone 2 | alone 3 |
|---|---|---|---|---|
| #215: an audio warning survives the frame loop, and a verdict does not carry into the next export | 1280 | FAIL | FAIL | FAIL |
| #215: an audio warning survives the frame loop, and a verdict does not carry into the next export | 380 | FAIL | FAIL | FAIL |
| #662: an export leaves a report that names the audio outcome | 1280 | FAIL | FAIL | FAIL |
| #662: an export leaves a report that names the audio outcome | 380 | FAIL | FAIL | FAIL |
| 47 — a resumed export says so, and the fact outlives the overlay | 1280 | FAIL | FAIL | FAIL |
| 47 — a resumed export says so, and the fact outlives the overlay | 380 | FAIL | FAIL | FAIL |
| 482 2.6 Motion Blur (Object) - Shutter phase -100 trails behind only, +100 runs ahead, a layer that has just stopped still smears behind, th | 1280 | FAIL | FAIL | FAIL |
| 482 2.6 Motion Blur (Object) - Shutter phase -100 trails behind only, +100 runs ahead, a layer that has just stopped still smears behind, th | 380 | FAIL | FAIL | FAIL |
| 482 3.0 Echo and Reverb - Tone, Low cut, Tape wobble, Pre-delay and Width are in the catalogue at defaults that are the old sound, and saved | 1280 | FAIL | FAIL | FAIL |
| 482 3.0 Echo and Reverb - Tone, Low cut, Tape wobble, Pre-delay and Width are in the catalogue at defaults that are the old sound, and saved | 380 | FAIL | FAIL | FAIL |
| 482 6.7 Glow Scan - a scan that sweeps Once or waits between sweeps on a 10 s clip is not told it changes nothing, and one at Strength 0 sti | 1280 | FAIL | FAIL | FAIL |
| 482 6.7 Glow Scan - a scan that sweeps Once or waits between sweeps on a 10 s clip is not told it changes nothing, and one at Strength 0 sti | 380 | FAIL | FAIL | FAIL |
| 486: the H.265 check agrees with a fully-specified codec probe, not a bare fourcc | 1280 | FAIL | FAIL | FAIL |
| 486: the H.265 check agrees with a fully-specified codec probe, not a bare fourcc | 380 | FAIL | FAIL | FAIL |
| 501: the add-row switch is white at rest and flashes accent when it moves the row | 1280 | FAIL | FAIL | FAIL |
| 501: the add-row switch is white at rest and flashes accent when it moves the row | 380 | FAIL | FAIL | FAIL |
| 658 — the thumbnail pin turns the playhead blue, and the yellow stops lying | 1280 | FAIL | FAIL | FAIL |
| 658 — the thumbnail pin turns the playhead blue, and the yellow stops lying | 380 | FAIL | FAIL | FAIL |
| 671 — a browser with no usable H.264 profile is told so, not handed a codec that just failed | 1280 | FAIL | FAIL | FAIL |
| 671 — a browser with no usable H.264 profile is told so, not handed a codec that just failed | 380 | FAIL | FAIL | FAIL |
| 690 CONTROL a Custom project still takes the size of the first clip, as its tile says Auto adjusts | 1280 | FAIL | FAIL | FAIL |
| 690 CONTROL a Custom project still takes the size of the first clip, as its tile says Auto adjusts | 380 | FAIL | FAIL | FAIL |
| 690 Replace media puts the new clip where the old one was at the same size, instead of blowing it up by its pixel count | 1280 | FAIL | FAIL | FAIL |
| 690 Replace media puts the new clip where the old one was at the same size, instead of blowing it up by its pixel count | 380 | FAIL | FAIL | FAIL |
| 690 a 30 fps clip exported at 30 fps shows every source frame once, in order | 1280 | FAIL | FAIL | FAIL |
| 690 a 30 fps clip exported at 30 fps shows every source frame once, in order | 380 | FAIL | FAIL | FAIL |
| 690 a Spin added at the start of its clip is not told it changes nothing while the box turns | 1280 | PASS | PASS | PASS |
| 690 a Spin added at the start of its clip is not told it changes nothing while the box turns | 380 | PASS | PASS | PASS |
| 690 a big clip whose file never finished saving before the app closed is named when the project reopens — never a silent empty clip | 1280 | FAIL | FAIL | FAIL |
| 690 a big clip whose file never finished saving before the app closed is named when the project reopens — never a silent empty clip | 380 | FAIL | FAIL | FAIL |
| 690 a clip with no sound track at all (a time-lapse) exports as no soundtrack, while a sound track that will not decode is still reported | 1280 | FAIL | FAIL | FAIL |
| 690 a clip with no sound track at all (a time-lapse) exports as no soundtrack, while a sound track that will not decode is still reported | 380 | FAIL | FAIL | FAIL |
| 690 a frame cache being built for a clip he has left stops at once, instead of seeking a video that will never load | 1280 | FAIL | FAIL | FAIL |
| 690 a frame cache being built for a clip he has left stops at once, instead of seeking a video that will never load | 380 | FAIL | FAIL | FAIL |
| 690 a new project keeps the aspect and size he picked when the first thing he adds is a phone clip of another shape | 1280 | FAIL | FAIL | FAIL |
| 690 a new project keeps the aspect and size he picked when the first thing he adds is a phone clip of another shape | 380 | FAIL | FAIL | FAIL |
| 690 a reversed 30 fps clip exported at 30 fps shows every source frame once, backwards | 1280 | FAIL | FAIL | FAIL |
| 690 a reversed 30 fps clip exported at 30 fps shows every source frame once, backwards | 380 | FAIL | FAIL | FAIL |
| 690 a shape made a Clipping Mask keeps the project background outside it, and a moving one leaves no trail in the export | 1280 | FAIL | FAIL | FAIL |
| 690 a shape made a Clipping Mask keeps the project background outside it, and a moving one leaves no trail in the export | 380 | FAIL | FAIL | FAIL |
| 690 an MP4 of a project with a transparent background leaves no trail behind a moving shape | 1280 | FAIL | FAIL | FAIL |
| 690 an MP4 of a project with a transparent background leaves no trail behind a moving shape | 380 | FAIL | FAIL | FAIL |
| 690 an export seek answers only once its own frame is there, not while the element is still seeking | 1280 | FAIL | FAIL | FAIL |
| 690 an export seek answers only once its own frame is there, not while the element is still seeking | 380 | FAIL | FAIL | FAIL |
| 690 an export started while the timeline is still drawing a clip thumbnails has no black or misplaced frame | 1280 | FAIL | FAIL | FAIL |
| 690 an export started while the timeline is still drawing a clip thumbnails has no black or misplaced frame | 380 | FAIL | FAIL | FAIL |
| 690 leaving the app mid-play stops playback where he left, with the clip silent while he is away | 1280 | FAIL | FAIL | FAIL |
| 690 leaving the app mid-play stops playback where he left, with the clip silent while he is away | 380 | FAIL | FAIL | FAIL |
| 690 opening a project after looking into others shows its filmstrips as fast as opening it directly — nothing waits behind clips from projec | 1280 | FAIL | FAIL | FAIL |
| 690 opening a project after looking into others shows its filmstrips as fast as opening it directly — nothing waits behind clips from projec | 380 | FAIL | FAIL | FAIL |
| 690 pausing a clip with sound leaves the preview on the frame the playhead stopped on | 1280 | FAIL | FAIL | FAIL |
| 690 pausing a clip with sound leaves the preview on the frame the playhead stopped on | 380 | FAIL | FAIL | FAIL |
| 690 stepping or scrubbing a 30 fps clip frame by frame shows every frame, each once | 1280 | FAIL | FAIL | FAIL |
| 690 stepping or scrubbing a 30 fps clip frame by frame shows every frame, each once | 380 | FAIL | FAIL | FAIL |
| 776: the intro film plays through and is never faded out while the splash is still up | 1280 | FAIL | FAIL | FAIL |
| 776: the intro film plays through and is never faded out while the splash is still up | 380 | FAIL | FAIL | FAIL |
| 783: the dark look's intro is never bright after the mark has animated, and the light look's still ends white | 1280 | FAIL | FAIL | FAIL |
| 783: the dark look's intro is never bright after the mark has animated, and the light look's still ends white | 380 | FAIL | FAIL | FAIL |
| 794: the does-nothing-here probe stays quiet for Time Warp Scan and its ghost-gated siblings, and still calls a real no-op dead | 1280 | PASS | PASS | PASS |
| 794: the does-nothing-here probe stays quiet for Time Warp Scan and its ghost-gated siblings, and still calls a real no-op dead | 380 | PASS | PASS | PASS |
| 893: an export with no soundtrack does not print the previous export’s mix peak in its report | 1280 | FAIL | FAIL | FAIL |
| 893: an export with no soundtrack does not print the previous export’s mix peak in its report | 380 | FAIL | FAIL | FAIL |
| 915.5Br a reused VIDEO is stored as a pointer that says video, and reopens as a playing video, not blank | 1280 | FAIL | FAIL | FAIL |
| 915.5Br a reused VIDEO is stored as a pointer that says video, and reopens as a playing video, not blank | 380 | FAIL | FAIL | FAIL |
| 921 S3 Stop sharing revokes the code that was handed out — the offer is closed, and the next share mints a different one | 1280 | PASS | PASS | PASS |
| 921 S3 Stop sharing revokes the code that was handed out — the offer is closed, and the next share mints a different one | 380 | PASS | PASS | PASS |
| 921 S4 splash.mp4, a PNG and a WAV all arrive, land in this device’s own records, and the picture renders | 1280 | FAIL | FAIL | FAIL |
| 921 S4 splash.mp4, a PNG and a WAV all arrive, land in this device’s own records, and the picture renders | 380 | FAIL | FAIL | FAIL |
| 921 S6 a shared copy finds its owner by itself: a here from the owner makes it offer again at once, its token lets it in, and a dropped link | 1280 | FAIL | FAIL | FAIL |
| 921 S6 a shared copy finds its owner by itself: a here from the owner makes it offer again at once, its token lets it in, and a dropped link | 380 | FAIL | FAIL | FAIL |
| 957 the empty project clapper opens, slams shut on the board with lines out of the tip, and stops when it cannot be seen | 1280 | FAIL | FAIL | FAIL |
| 957 the empty project clapper opens, slams shut on the board with lines out of the tip, and stops when it cannot be seen | 380 | FAIL | FAIL | FAIL |
| 974 the clapper's three timings each play as drawn: A open then every 6 s, B one clap then shut, C non-stop | 1280 | FAIL | FAIL | FAIL |
| 974 the clapper's three timings each play as drawn: A open then every 6 s, B one clap then shut, C non-stop | 380 | FAIL | FAIL | FAIL |
| 981 review: a real double-tap on the empty area - the first tap opens the add menu at once, and a second tap that lands on the menu as it sw | 1280 | PASS | PASS | PASS |
| 981 review: a real double-tap on the empty area - the first tap opens the add menu at once, and a second tap that lands on the menu as it sw | 380 | PASS | PASS | PASS |
| 981 review: with less motion the add menu arrives on its plain 220 ms slide, and its cards still take no tap for a double-tap window (300 ms | 1280 | PASS | PASS | PASS |
| 981 review: with less motion the add menu arrives on its plain 220 ms slide, and its cards still take no tap for a double-tap window (300 ms | 380 | PASS | PASS | PASS |
| 988 the clapper on timing C rests between snaps - a clap every 3 s or more with the stick still and shut for 2 s between - while A and B are | 1280 | PASS | PASS | PASS |
| 988 the clapper on timing C rests between snaps - a clap every 3 s or more with the stick still and shut for 2 s between - while A and B are | 380 | PASS | PASS | PASS |
| a trim grip needs a hold on touch, arms visibly, and is instant on mouse (queue 336) | 1280 | FAIL | FAIL | FAIL |
| a trim grip needs a hold on touch, arms visibly, and is instant on mouse (queue 336) | 380 | FAIL | FAIL | FAIL |
| an effect that changes nothing on this layer is detected — and a working one is not (queue 477) | 1280 | PASS | PASS | PASS |
| an effect that changes nothing on this layer is detected — and a working one is not (queue 477) | 380 | PASS | PASS | PASS |
| an export survives the tab being backgrounded (queue 47) | 1280 | FAIL | FAIL | FAIL |
| an export survives the tab being backgrounded (queue 47) | 380 | FAIL | FAIL | FAIL |
| effect panels carry no explanation block, and motion blur cranks past one frame (queue 378/379) | 1280 | FAIL | FAIL | FAIL |
| effect panels carry no explanation block, and motion blur cranks past one frame (queue 378/379) | 380 | FAIL | FAIL | FAIL |
| effects: every bounded kernel is safe on the box the RENDERER actually computes | 1280 | PASS | PASS | PASS |
| effects: every bounded kernel is safe on the box the RENDERER actually computes | 380 | PASS | PASS | PASS |
| every category card has its own gradient ring, out of step with the others (queue 339) | 1280 | FAIL | FAIL | FAIL |
| every category card has its own gradient ring, out of step with the others (queue 339) | 380 | FAIL | FAIL | FAIL |
| export: SOLO on a silent layer kills the whole soundtrack, and now says so (queue 215) | 1280 | FAIL | FAIL | FAIL |
| export: SOLO on a silent layer kills the whole soundtrack, and now says so (queue 215) | 380 | FAIL | FAIL | FAIL |
| export: a soundtrack that cannot be built SAYS so instead of shipping a mute file (queue 47) | 1280 | FAIL | FAIL | FAIL |
| export: a soundtrack that cannot be built SAYS so instead of shipping a mute file (queue 47) | 380 | FAIL | FAIL | FAIL |
| export: a soundtrack that fails to ENCODE says so, so it is not mistaken for the muxer (queue 215) | 1280 | FAIL | FAIL | FAIL |
| export: a soundtrack that fails to ENCODE says so, so it is not mistaken for the muxer (queue 215) | 380 | FAIL | FAIL | FAIL |
| export: frames the video could not reach in time are counted, not passed off as real (queue 47) | 1280 | FAIL | FAIL | FAIL |
| export: frames the video could not reach in time are counted, not passed off as real (queue 47) | 380 | FAIL | FAIL | FAIL |
| glide (#715): a mouse flick glides — a stall at release does not kill it, a parked pointer does not fling, fine mode never glides | 1280 | PASS | PASS | PASS |
| glide (#715): a mouse flick glides — a stall at release does not kill it, a parked pointer does not fling, fine mode never glides | 380 | PASS | PASS | PASS |
| home push: the press answers the tap, survives the wait, and hands over without a pop | 1280 | PASS | PASS | PASS |
| home push: the press answers the tap, survives the wait, and hands over without a pop | 380 | PASS | PASS | PASS |
| play: holding the Play button plays, it does not silently toggle Loop instead | 1280 | FAIL | FAIL | FAIL |
| play: holding the Play button plays, it does not silently toggle Loop instead | 380 | FAIL | FAIL | FAIL |
| playhead: a rebuild during the return-to-home pop keeps --tl-panel-left honest | 1280 | PASS | PASS | PASS |
| playhead: a rebuild during the return-to-home pop keeps --tl-panel-left honest | 380 | PASS | PASS | PASS |
| presets can be searched, tagged, grouped and renamed (queue 331 clauses 4-9) | 1280 | FAIL | FAIL | FAIL |
| presets can be searched, tagged, grouped and renamed (queue 331 clauses 4-9) | 380 | FAIL | FAIL | FAIL |
| saving a preset updates the open Presets card by itself (queue 330) | 1280 | FAIL | FAIL | FAIL |
| saving a preset updates the open Presets card by itself (queue 330) | 380 | FAIL | FAIL | FAIL |
| the Presets card leads with its save button and its ✕ is drawn, not typed (queue 331) | 1280 | FAIL | FAIL | FAIL |
| the Presets card leads with its save button and its ✕ is drawn, not typed (queue 331) | 380 | FAIL | FAIL | FAIL |
| the VIDEO strip decode is capped too, not just the image one | 1280 | FAIL | FAIL | FAIL |
| the VIDEO strip decode is capped too, not just the image one | 380 | FAIL | FAIL | FAIL |
| the benchmark line stops at the lanes, and the loading pill sits under the panels (queue 348/393) | 1280 | FAIL | FAIL | FAIL |
| the benchmark line stops at the lanes, and the loading pill sits under the panels (queue 348/393) | 380 | FAIL | FAIL | FAIL |
| the hoisted curl / fractal-warp / tunnel kernels match their own reference bodies | 1280 | FAIL | FAIL | FAIL |
| the hoisted curl / fractal-warp / tunnel kernels match their own reference bodies | 380 | FAIL | FAIL | FAIL |
| the phone move/extend buttons are not the same drawing (queue 338) | 1280 | FAIL | FAIL | FAIL |
| the phone move/extend buttons are not the same drawing (queue 338) | 380 | FAIL | FAIL | FAIL |
| the sheet previews the picked effects over the whole comp, and puts it all back (queue 277 + 390) | 1280 | PASS | PASS | PASS |
| the sheet previews the picked effects over the whole comp, and puts it all back (queue 277 + 390) | 380 | PASS | PASS | PASS |

## What this says (written after all 24 slices and 372 alone runs)

Numbers are from the tables above: 62 distinct reds across the six passes, every red re-run alone 3 times at 1280 and 3 at 380. Column order in the pass table is N1280, N380, T1280, T380, L1280, L380.

**Method note.** A container restart costs a slice, not a pass (4 slices per pass, each pushed as it finishes). The container only ran while this session was mid-turn, so the passes were driven from inside the turn.

### 1. The intermittents: red under pressure, green alone (these are the next ones to expect)

All six pass alone 3/3 at both widths, so none is a consistent bug. Each only shows in a full pass.

| test | red in | what the failure says |
|---|---|---|
| `effects: every bounded kernel is safe on the box the RENDERER actually computes` | 1 of 6 (N380) | `fxBounds took 29.2 ms on a 1080x1920 plate` against a time budget: a timing assertion |
| `the sheet previews the picked effects over the whole comp, and puts it all back (queue 277 + 390)` | 1 of 6 (N380) | `a previewed Invert changed nothing on the canvas`: a read before the preview painted |
| `an effect that changes nothing on this layer is detected (queue 477)` | 2 of 6 (T1280, T380) | `Channel Remap changes nothing on a flat #cc22cc fill`: the noopAt 45 ms budget, red only under the 2x throttle |
| `glide (#715): a mouse flick glides` | 2 of 6 (T1280, T380) | `a mouse flick that stalled for two samples before the click release`: a real-time timing assumption, red only under the 2x throttle |
| `794: the does-nothing-here probe stays quiet for Time Warp Scan…` | 3 of 6 | `control: Channel Remap on a flat #cc22cc fill must still be called dead`: same noopAt budget family as 477 |
| `690 a Spin added at the start of its clip is not told it changes nothing…` | 3 of 6 | `CONTROL: a Spin at speed 0… got no change`: same noopAt budget family |
| `921 S3 Stop sharing revokes the code that was handed out` | 5 of 6 (everything but T380) | `the module is not holding the offer whose code is on screen`: needs the previous test's state, green alone |

The three noopAt rows (477, 794, 690 Spin) are one cause with three names: the 45 ms budget inside noopAt. The builder's prediction that 477 would be red alone on a cold first 1080x1920 render did NOT reproduce here: alone at 1280 and at 380 it passed 3/3 each. Alone runs here start from a warm server, so a truly cold first render is not what these runs measured. Under the 2x throttle all three go red, so the budget is simply too tight for a slow phone.

### 2. Red in every full pass but GREEN alone: order-dependent, not load-dependent

These are deterministic inside the suite and pass 3/3 alone at both widths, so some earlier test leaves state behind that breaks them. They are the strongest finds in this census because the same failure was red in all six passes and a normal single-test run hides it.

- `home push: the press answers the tap, survives the wait, and hands over without a pop`
- `playhead: a rebuild during the return-to-home pop keeps --tl-panel-left honest`
- `981 review: a real double-tap on the empty area…`
- `981 review: with less motion the add menu arrives on its plain 220 ms slide…`
- `988 the clapper on timing C rests between snaps…`

The 981 and 988 failures read like the clapper animation list being left over from a previous test (`the clapper keeps animating behind Home (5 animations)` in 957 is the same family, though 957 and 974 stay red alone too).

### 3. Red alone as well, in every pass: this container, not the app

About 50 of the 62 reds fail alone 3/3 at both widths, in all six passes. They split into:

- **No H.264/AAC in this Chromium** (`NO_VIDEO_CODEC`, `Cannot call 'encode' on a closed VideoEncoder`, `splash.mp4 did not decode`, `Could not load video`): the whole `690 …` export family, the soundtrack `(queue 47/215)` family, `#215`, `#662`, `671`, `47 —`, `486`, `893`, `915.5Br`, `the VIDEO strip decode…`, `921 S4 splash.mp4…`, `776`, `783`, `690 a frame cache…`, `690 opening a project after looking into others…`, `690 a big clip…`.
- **`no layer to work from`** (6 tests: trim grip, effect panels, category cards, presets x3, phone move/extend buttons): these need an imported clip, so they inherit the same codec gap.
- **Fail alone for their own reason, not codec:** `482 2.6 Motion Blur` and `482 3.0 Echo and Reverb` (`pictures differ from v17.18` / `sound different from v17.19`: a baselines mismatch, red at every width and load), `the hoisted curl / fractal-warp / tunnel kernels match their own reference bodies` (`twirl: 97 of 1170 points… allowed 94`: a software-GL rounding difference), `501`, `658`, `play: holding the Play button plays`, `the benchmark line stops at the lanes…`, `957`, `974`. These are the ones worth a look on the builder's own machine: if they are green there, they are this container; if red, they are real.
- `482 6.7 Glow Scan…` is red alone 3/3 (`CONTROL:` line) yet green in two of the six full passes, so the suite hides it some of the time.

### 4. Load and throttle effect

Red counts: N1280 55, N380 56, T1280 60, T380 61, L1280 57, L380 56. The 2x throttle adds about 5 reds over normal (the noopAt family plus `glide`); four busy loops beside the run add about 1. Width changes almost nothing (±1).

### 5. What to do first

1. Raise or make adaptive the noopAt 45 ms budget (one fix clears 477, 794 and `690 a Spin…`), and give `glide (#715)` its stall tolerance.
2. Find what leaks into `home push`, `playhead: a rebuild…`, the two `981` tests and `988` (all green alone): bisect with `?after=&upto=` from the nearest earlier clapper or Home test.
3. Check the non-codec alone-reds in section 3 on a machine with a real codec.
