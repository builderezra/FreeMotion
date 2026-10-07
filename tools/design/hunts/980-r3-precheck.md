# H33: Simple mode pre-check, full suite on the r3 tip (`980-p22-r3`) at 1280 and 380

Branch tip `origin/980-p22-r3` = a51b5e1d (version label v17.24, merge base `470ee20e`; chain fu-lock-r7 > 980-s12-r3 > 980-phase1-r3 > 980-p21-r3 > 980-p22-r3). Compared with `origin/main` 2e3fd7a9 (v17.25) in the same container. Headless Chromium 1194 (Chrome 141), software GL, `tests/_cdp.py`, `FM_CHROME` set. **Measured** = I ran it. Nothing was changed in the app, tests or tools.

## Totals
| width | tests that ran (distinct) | pass | fail | NOT RUN HERE | not run at all (hung) |
|---|---|---|---|---|---|
| 1280 | 2394 | 2242 | **57** | 95 | 2 |
| 380 | 2394 | 2241 | **58** | 95 | 2 |
**59 distinct red tests** (56 at both widths; 947 only at 1280; two only at 380: "a vertical swipe that starts ON a clip scrolls the timeline" and "an effect that changes nothing on this layer is detected"). The suite has 2396 tests; the two hung ones were not run (below). Each width was run as slices (the H13 method), because the Bash tool cannot hold a 35 minute pass; slice files are `h33*` in my scratchpad, and the per-slice summaries are in the last section.

**What the 59 are, in one line each (details in the table):** 31 are the container's own limits (no H.264 encoder or decoder: `NO_VIDEO_CODEC`, "Could not load video", "closed codec", the intro film), all red on main alone too; 16 more are also red on main alone; 9 are red in the pass but pass alone (order effects); **3 are new on the branch and red alone: `978 on a PC ⤢ swaps them with the flight`, `980 FU lock: every self-test plant still lands exactly once`, and `simple P2.2 · tray B at 1280×800, 1280×720 and 960×700 every tool is on show`**.

## The container's own limits (left out, as asked)
- **No H.264/AAC/real MP4 export:** `NO_VIDEO_CODEC`, `Failed to execute 'encode' on 'VideoEncoder': Cannot call 'encode' on a closed codec`, `Could not load video: *.mp4`, `splash.mp4 did not decode`, the intro-film tests (776, 783), 486's `canPlayType` check. 31 reds.
- **NOT RUN HERE, by the suite's own name:** 89 need real touch emulation (Linux headless Chrome loses the page's mouse once touch emulation is turned off), 4 need an AAC encoder, 2 need a QR/barcode reader, 1 says the machine is too slow to stand in for the phone. Same at both widths.
- **Two tests hang the driver here** and were skipped, found with a 100 s limit and a 10 minute watchdog: `690 swiping the share sheet away after Save keeps the Export ready card, and a second Save hands the same file…` (killed alone at 1280) and `690 an export holds the screen awake while it renders, takes the lock back after the phone drops it…` (no result in 10 minutes at 1280; when it was skipped the rest of the slice ran). **I did not run either on `origin/main`**: my attempt was refused mid-session, so whether they also hang on main is **not known**. The slice with the first one hit a stalled page for 23 minutes before I killed it. Both are export and wake-lock tests, which is where this container is weakest.
- `690 Undo and Redo keep open the effect whose slider he just moved` and the test after it are NOT RUN HERE (real touch) when run alone; inside a slice the first run of this region stalled, which is why the slice was cut at them.

## How each red was classified
For every red I ran it **alone on the branch** and **alone on main 2e3fd7a9** (both widths), and compared with the **v17.24 release full pass I made for H13** in the same container (`origin/release/v17.24`; its 380 pass is missing slice 3, so "H13" is only reliable at 1280). Tests that exist only on the branch cannot be compared with main.


### NEW on the branch: red alone too (test only exists on the branch) (2)

| test | red at | first error line | alone on branch 1280/380 | alone on main 1280/380 | v17.24 pass (H13, 1280) |
|---|---|---|---|---|---|
| 980 FU lock: every self-test plant still lands exactly once in Full’s source, so the lock can still prove it sees (the margin, the toast, the floor, and all nineteen chan | 380/1280 | the sanitiser plant’s anchor appears 0 times in js/storage.js (want 1):       if (['linear', 'radial', 'angular'].indexOf(l.fillGradient.type) < 0) l.fillGradient.type = 'linear';     }   }    — the l | FAIL/FAIL | -/- | not red |
| simple P2.2 · tray B at 1280×800, 1280×720 and 960×700 every tool is on show and nothing in the band above it is cut off — the title and Its tools are below show whole —  | 380/1280 | 960×700: [5,4] duplicateClip lies outside the band (240–301 in 0–300) · delete lies outside the band (240–301 in 0–300) · the tray scrolls sideways (301 px in 299) | FAIL/FAIL | -/- | not red |

### NEW on the branch: red alone, passes alone on main (1)

| test | red at | first error line | alone on branch 1280/380 | alone on main 1280/380 | v17.24 pass (H13, 1280) |
|---|---|---|---|---|---|
| 978 on a PC ⤢ swaps them with the flight — the pair stays standing on the cog the whole way — lands Friends big, remembers it, and the tail hangs from the block next to t | 380/1280 | at 10% of the swap the pair has left the cog’s line (524): Canvas 1818,727,2104,1048, Friends 1188,235,1438,540 | FAIL/FAIL | pass/pass | not red |

### test only on the branch; red inside the pass, passes alone (order-dependent) (3)

| test | red at | first error line | alone on branch 1280/380 | alone on main 1280/380 | v17.24 pass (H13, 1280) |
|---|---|---|---|---|---|
| simple P1 · T19 on a phone at 380 the Simple row reads ⋯ ✂ (gap) \|◀ with \|◀ where Full has it, the clip row is hit-testable, and ✎ hides by visibility | 380/1280 | a tap on the clip row lands on addmenu-lbl, not the Simple timeline | pass/pass | -/- | not red |
| simple P2.2 · review More is always in reach beside 🗑 at 1280 and 380 (the only way to every other setting), and a plain mouse wheel scrolls the tray to the rest (#976) | 380/1280 | CONTROL (380): Length is not reachable: its centre (27,535) hits addmenu-card addmenu-card--ico | pass/pass | -/- | not red |
| simple P2.2 · tray B at 380 the phone keeps its one row with More and Delete pinned at the right end, and its words (control: the same before and after his pick B) | 380/1280 | 380: length cannot be pressed | pass/pass | -/- | not red |

### order-dependent: red inside the pass, passes alone on branch and main (6)

| test | red at | first error line | alone on branch 1280/380 | alone on main 1280/380 | v17.24 pass (H13, 1280) |
|---|---|---|---|---|---|
| home push: the press answers the tap, survives the wait, and hands over without a pop | 380/1280 | the parked editor sits at x=40 in a 900px viewport (transform matrix(1, 0, 0, 1, 39.9424, 0), classes "fm-push-wait") — part of it is on screen, so the PREVIOUS project shows beside the leaving home s | pass/pass | pass/pass | red |
| playhead: a rebuild during the return-to-home pop keeps --tl-panel-left honest | 380/1280 | --tl-panel-left drifted 17.0px during the pop (truth -17.0) — the playhead will sit that far off for the rest of the session | pass/pass | pass/pass | red |
| 921 S3 Stop sharing revokes the code that was handed out — the offer is closed, and the next share mints a different one | 380/1280 | the module is not holding the offer whose code is on screen, so this test cannot see whether it is revoked | pass/pass | pass/pass | red |
| 981 review: a real double-tap on the empty area - the first tap opens the add menu at once, and a second tap that lands on the menu as it swings up picks nothing from it, | 380/1280 | the empty area under the Adjustment card is covered at 71,696 by svg in span.addmenu-ic in button.addmenu-card.addmenu-card--soft in div.addmenu-grid.addmenu-grid--fill in div.addmenu-page in div.addm | NOT RUN/NOT RUN | NOT RUN/NOT RUN | red |
| 981 review: with less motion the add menu arrives on its plain 220 ms slide, and its cards still take no tap for a double-tap window (300 ms) after the empty area opens i | 380/1280 | CONTROL: the menu is not arriving on the 220 ms reduced-motion slide (fm-hinge-up) | pass/pass | pass/pass | red |
| a vertical swipe that starts ON a clip scrolls the timeline | 380 | a horizontal drag on a clip no longer scrubs — the axis lock ate the primary gesture | pass/pass | pass/pass | red |

### also red on main (pre-existing here) (16)

| test | red at | first error line | alone on branch 1280/380 | alone on main 1280/380 | v17.24 pass (H13, 1280) |
|---|---|---|---|---|---|
| 921 S6 a shared copy finds its owner by itself: a here from the owner makes it offer again at once, its token lets it in, and a dropped link comes back with the banner sa | 380/1280 | the re-offer came 3024 ms after `here` — §13.5 says retry IMMEDIATELY on the owner’s announce | FAIL/FAIL | FAIL/FAIL | red |
| play: holding the Play button plays, it does not silently toggle Loop instead | 380/1280 | a slow press on Play did nothing at all — this is "I pressed play and nothing happened" | FAIL/FAIL | FAIL/FAIL | red |
| saving a preset updates the open Presets card by itself (queue 330) | 380/1280 | no layer to work from | -/- | FAIL/FAIL | red |
| the Presets card leads with its save button and its ✕ is drawn, not typed (queue 331) | 380/1280 | no layer to work from | -/- | FAIL/FAIL | red |
| presets can be searched, tagged, grouped and renamed (queue 331 clauses 4-9) | 380/1280 | no layer to work from | -/- | FAIL/FAIL | red |
| the hoisted curl / fractal-warp / tunnel kernels match their own reference bodies | 380/1280 | twirl: 97 of 1170 points landed on a DIFFERENT source pixel after truncation (allowed 94) | FAIL/FAIL | FAIL/FAIL | red |
| 47 — a resumed export says so, and the fact outlives the overlay | 380/1280 | the export did not stop where this test stopped it — the rest of this measures nothing | -/- | FAIL/FAIL | red |
| 658 — the thumbnail pin turns the playhead blue, and the yellow stops lying | 380/1280 | the playhead is marked while parked on nothing | FAIL/FAIL | FAIL/FAIL | red |
| 957 the empty project clapper opens, slams shut on the board with lines out of the tip, and stops when it cannot be seen | 380/1280 | the clapper keeps animating behind Home (5 animations), repainting under a screen that covers it | FAIL/FAIL | FAIL/FAIL | red |
| 974 the clapper's three timings each play as drawn: A open then every 6 s, B one clap then shut, C non-stop | 380/1280 | timing A runs 10 clapper animations (stick, board, three lines = 5): dh-jolt, dh-clap, dh-whack, dh-whack, dh-whack, dh-whack, dh-clap, dh-jolt, dh-whack, dh-whack | FAIL/FAIL | FAIL/FAIL | red |
| 947 review: a real press in the middle of the ripple - on the dim over a Home project, on Cancel, on the turned + - takes the card away at once and never reaches Home | 1280 | pc, a real click on the + turned into an ×: setup: at 286 ms the press landed on the card, not on the dim | NOT RUN/NOT RUN | FAIL/NOT RUN | red |
| 988 the clapper on timing C rests between snaps - a clap every 3 s or more with the stick still and shut for 2 s between - while A and B are as they were | 380/1280 | at the end of its cycle timing C is -0.0 degrees open - the next lap would start shut, a seam: {'A':{'period':6000,'it':null,'hit':600,'still':4720,'seam':27.99896380736874},'B':{'period':1000,'it':1, | FAIL/FAIL | FAIL/FAIL | red |
| 482 2.6 Motion Blur (Object) - Shutter phase -100 trails behind only, +100 runs ahead, a layer that has just stopped still smears behind, the preview matches the export,  | 380/1280 | 1 pictures differ from v17.18 at the new defaults - a new control changed a look he already has: objectblur/image 4c5d02ef/6c54b3e8/37cd550f -> bf60f540/6c54b3e8/37cd550f | FAIL/FAIL | FAIL/FAIL | not red |
| 482 3.0 Echo and Reverb - Tone, Low cut, Tape wobble, Pre-delay and Width are in the catalogue at defaults that are the old sound, and saved and new Echoes and Reverbs re | 380/1280 | 4 Echo / Reverb cases sound different from v17.19 at the new defaults - a new control changed a sound he already has (if Chrome itself was just updated, re-capture these on v17.19 first): reverb new 3 | FAIL/FAIL | FAIL/FAIL | not red |
| 482 6.7 Glow Scan - a scan that sweeps Once or waits between sweeps on a 10 s clip is not told it changes nothing, and one at Strength 0 still is | 380/1280 | a Glow Scan with {"loop":1,"pause":2,"span":1} on a 10 s clip is measured as unknown - its sweep falls between the moments the check looks at, so the panel tells him a working effect changes nothing | FAIL/pass | FAIL/FAIL | red |
| an effect that changes nothing on this layer is detected — and a working one is not (queue 477) | 380 | Channel Remap changes nothing on a flat #cc22cc fill (both red and blue are 204) and the check said null — which is the whole of his complaint | FAIL/pass | pass/FAIL | red |

### container limit (no H.264/AAC here); also red on main (31)

| test | red at | first error line | alone on branch 1280/380 | alone on main 1280/380 | v17.24 pass (H13, 1280) |
|---|---|---|---|---|---|
| 915.5Br a reused VIDEO is stored as a pointer that says video, and reopens as a playing video, not blank | 380/1280 | Could not load video: q915br-clip-1791370297898.mp4 | -/- | FAIL/FAIL | red |
| the VIDEO strip decode is capped too, not just the image one | 380/1280 | splash.mp4 did not decode — this test cannot verify the video branch, so it must not report green | -/- | FAIL/FAIL | red |
| 921 S4 splash.mp4, a PNG and a WAV all arrive, land in this device’s own records, and the picture renders | 380/1280 | the video has no decoded element in the registry after arriving, so nothing could ever draw it | -/- | FAIL/FAIL | red |
| an export survives the tab being backgrounded (queue 47) | 380/1280 | NO_VIDEO_CODEC | -/- | FAIL/FAIL | red |
| export: a soundtrack that cannot be built SAYS so instead of shipping a mute file (queue 47) | 380/1280 | NO_VIDEO_CODEC | -/- | FAIL/FAIL | red |
| export: frames the video could not reach in time are counted, not passed off as real (queue 47) | 380/1280 | NO_VIDEO_CODEC | -/- | FAIL/FAIL | red |
| export: SOLO on a silent layer kills the whole soundtrack, and now says so (queue 215) | 380/1280 | NO_VIDEO_CODEC | -/- | FAIL/FAIL | red |
| #215: an audio warning survives the frame loop, and a verdict does not carry into the next export | 380/1280 | NO_VIDEO_CODEC | -/- | FAIL/FAIL | red |
| #662: an export leaves a report that names the audio outcome | 380/1280 | NO_VIDEO_CODEC | -/- | FAIL/FAIL | red |
| export: a soundtrack that fails to ENCODE says so, so it is not mistaken for the muxer (queue 215) | 380/1280 | NO_VIDEO_CODEC | -/- | FAIL/FAIL | red |
| 486: the H.265 check agrees with a fully-specified codec probe, not a bare fourcc | 380/1280 | this browser will not even claim H.264 support, so canPlayType is not answering and nothing below can be trusted | -/- | FAIL/FAIL | red |
| 776: the intro film plays through and is never faded out while the splash is still up | 380/1280 | the dark intro never started playing (the film reached 0s) — this run cannot judge it, but that is also exactly what a broken intro looks like | -/- | FAIL/FAIL | red |
| 783: the dark look's intro is never bright after the mark has animated, and the light look's still ends white | 380/1280 | setup: only 0 frames of the dark intro were read — the frame is not rendering, so this run cannot judge it | -/- | FAIL/FAIL | red |
| 671 — a browser with no usable H.264 profile is told so, not handed a codec that just failed | 380/1280 | an ordinary export now fails: NO_VIDEO_CODEC | -/- | FAIL/FAIL | red |
| 893: an export with no soundtrack does not print the previous export’s mix peak in its report | 380/1280 | NO_VIDEO_CODEC | -/- | FAIL/FAIL | red |
| 690 a 30 fps clip exported at 30 fps shows every source frame once, in order | 380/1280 | Failed to execute 'encode' on 'VideoEncoder': Cannot call 'encode' on a closed codec. | -/- | FAIL/FAIL | red |
| 690 a reversed 30 fps clip exported at 30 fps shows every source frame once, backwards | 380/1280 | Failed to execute 'encode' on 'VideoEncoder': Cannot call 'encode' on a closed codec. | -/- | FAIL/FAIL | red |
| 690 an export started while the timeline is still drawing a clip thumbnails has no black or misplaced frame | 380/1280 | Failed to execute 'encode' on 'VideoEncoder': Cannot call 'encode' on a closed codec. | -/- | FAIL/FAIL | red |
| 690 an export seek answers only once its own frame is there, not while the element is still seeking | 380/1280 | Failed to execute 'encode' on 'VideoEncoder': Cannot call 'encode' on a closed codec. | -/- | FAIL/FAIL | red |
| 690 opening a project after looking into others shows its filmstrips as fast as opening it directly — nothing waits behind clips from projects he left | 380/1280 | Could not load video: hf2-HF2stripA-1791374060050.mp4 | -/- | FAIL/FAIL | red |
| 690 a frame cache being built for a clip he has left stops at once, instead of seeking a video that will never load | 380/1280 | splash.mp4 did not decode — this test cannot drive a real frame cache build, so it must not report green | -/- | FAIL/FAIL | red |
| 690 a new project keeps the aspect and size he picked when the first thing he adds is a phone clip of another shape | 380/1280 | Failed to execute 'encode' on 'VideoEncoder': Cannot call 'encode' on a closed codec. | -/- | FAIL/FAIL | red |
| 690 CONTROL a Custom project still takes the size of the first clip, as its tile says Auto adjusts | 380/1280 | Failed to execute 'encode' on 'VideoEncoder': Cannot call 'encode' on a closed codec. | -/- | FAIL/FAIL | red |
| 690 Replace media puts the new clip where the old one was at the same size, instead of blowing it up by its pixel count | 380/1280 | Failed to execute 'encode' on 'VideoEncoder': Cannot call 'encode' on a closed codec. | -/- | FAIL/FAIL | red |
| 690 a shape made a Clipping Mask keeps the project background outside it, and a moving one leaves no trail in the export | 380/1280 | NO_VIDEO_CODEC | -/- | FAIL/FAIL | red |
| 690 an MP4 of a project with a transparent background leaves no trail behind a moving shape | 380/1280 | NO_VIDEO_CODEC | -/- | FAIL/FAIL | red |
| 690 pausing a clip with sound leaves the preview on the frame the playhead stopped on | 380/1280 | Failed to execute 'encode' on 'VideoEncoder': Cannot call 'encode' on a closed codec. | -/- | FAIL/FAIL | red |
| 690 stepping or scrubbing a 30 fps clip frame by frame shows every frame, each once | 380/1280 | Failed to execute 'encode' on 'VideoEncoder': Cannot call 'encode' on a closed codec. | -/- | FAIL/FAIL | red |
| 690 leaving the app mid-play stops playback where he left, with the clip silent while he is away | 380/1280 | Failed to execute 'encode' on 'VideoEncoder': Cannot call 'encode' on a closed codec. | -/- | FAIL/FAIL | red |
| 690 a big clip whose file never finished saving before the app closed is named when the project reopens — never a silent empty clip | 380/1280 | Error: Could not load video: IMG_4409.MOV     at el.addEventListener.once (http://hd5k.localhost:8810/js/media.js?v=54:204:350) | -/- | FAIL/FAIL | red |
| 690 a clip with no sound track at all (a time-lapse) exports as no soundtrack, while a sound track that will not decode is still reported | 380/1280 | Failed to execute 'encode' on 'VideoEncoder': Cannot call 'encode' on a closed codec. | -/- | FAIL/FAIL | not red |

## What I would tell the laptop
- **Ship-blocking candidates (new on the branch, red alone, not container):** 978 (the PC ⤢ swap flight, "the pair has left the cog's line"), 980 FU lock (the self-test plant's anchor appears 0 times in Full's source; this is the lock proving it can still see, so it is the one that matters most for "Full must not change"), and simple P2.2 tray B at 1280/1280×720/960×700 (every tool on show). Each needs a look on the Mac before the step ships; I did not read the test bodies or the code beyond the error line.
- **Order-dependent, also seen on v17.24:** home push, the playhead `--tl-panel-left` drift, 921 S3 and 981 less-motion pass alone on branch and main and were red in the H13 pass of the release; not new.
- **The three simple tests that pass alone** (`simple P1 · T19`, `simple P2.2 · review More is always in reach`, `simple P2.2 · tray B at 380`) are red inside the pass and green alone: an order effect inside the branch's own new tests (a later test's state), worth a bisect with `?after=&upto=` on the laptop where the real-finger tests run.
- **Pre-existing here, red on main too:** 921 S6, the Play-hold test, the twirl kernels, 658, the clapper tests (957, 974, 988), 482 2.6/3.0/6.7, 947 and the 380-only Channel Remap one. Whether each is container-specific or a real defect on main was not investigated.

## Per-slice results (suite order)
| slice | 1280 | 380 |
|---|---|---|
| 0: start to "921 S2 undo is per person" | Regression 568/572 ✗Pending 0/0 built | Regression 567/572 ✗Pending 0/0 built |
| 1: to "filter: Strength is validated on load" | Regression 565/572 ✗ · NOT RUN HERE 3 | Regression 565/572 ✗ · NOT RUN HERE 3 |
| 2: to "864 the project menu is light" | Regression 554/573 ✗ · NOT RUN HERE 2 | Regression 553/573 ✗ · NOT RUN HERE 2 |
| 3: to "690 Undo and Redo keep open" | Regression 133/207 ✗ · NOT RUN HERE 58 | Regression 134/207 ✗ · NOT RUN HERE 57 |
| 4: that test alone | Regression 0/1 ✓ · NOT RUN HERE 1 | Regression 0/1 ✓ · NOT RUN HERE 1 |
| 5: the next two (real touch) | Regression 0/2 ✓ · NOT RUN HERE 2 | Regression 0/2 ✓ · NOT RUN HERE 2 |
| 6: after the screen-awake hang to the end | Regression 422/468 ✗ · NOT RUN HERE 30 | Regression 422/468 ✗ · NOT RUN HERE 31 |

Slice times at 1280 (first three): 261 s, 802 s, 653 s; later slices were about 8 to 17 minutes each. Raw outputs are not committed (90 KB each); the red lists above are complete.