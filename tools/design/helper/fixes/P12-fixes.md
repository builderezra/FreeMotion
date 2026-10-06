# QF2: corrections for plans P1 and P2 (PM sanity check, 7 Oct)

Correct plans/helper-1 and plans/helper-2 in place. Remove anything already shipped. Fix wrong code assumptions. Mark the out-of-date items. A plan the builder follows must be right: if you are unsure, say so in the plan.

## [FIX] P1 §1.1 (Editing lags + #202): render the 12-second autosave card thumbnail at card size instead of full project size
**Problem:** The code location is right. `makeThumb` is at storage.js:2133, the full-size `src` at :2140, `renderScene` at :2147 (the plan says :2149 for `s`, actually :2148) and the 12 s gate at :2468. The claim that the compositor would scale px parameters is also right: renderScene works out __fmRS from canvas.width/P.width (compositor.js:18745) and pxToPlate is at :3929.

The plan misses two risks. (1) The comment on makeThumb says the progressive halving exists because a single 1080->180 drawImage made 'the old mushy cards'. The compositor draws layers with default smoothing (only 2 imageSmoothingQuality lines in 19,475), so a 360px plate brings that downscale back, and pinThumbnail and template/element pack thumbnails (liveThumbOf) share this function. (2) The comment at compositor.js:3890-3894 says thumbnails stay byte-identical *because* they are rendered unstamped at project size. Px-unit effects not routed through pxToPlate will look different on the cards, which is a visible change to Home.

Test (a) is weak. A canvas's width is set after createElement, so the hook has to read the width afterwards. It also only checks `src`: the effect pools (H3 §2) are resized, not created, so the test cannot see them bouncing to full size, and that bouncing is the main cost.
**Fix / replacement:** Render at about 2x card size (720px on the longest side) and keep one halving step. That is about 7x cheaper than 1080x1920 and keeps the averaging step. Zero the width and height of the temp canvases. Show Ezra before/after cards (photo, video and a heavy-effect project) at the size Home shows them before shipping. In the test, spy on the HTMLCanvasElement width setter (or _fxScratchInfo) during FM.storage.makeThumb on a 1080x1920 project and assert no plate wider than 720. That fails on HEAD.
**Evidence:** git show b46b47d3:js/storage.js 2130-2162 (the halving comment: 'a single 1080→180 drawImage skipped most source pixels = the old mushy cards'). compositor.js:3890-3899 and 18738-18748. grep -c imageSmoothingQuality compositor.js = 2. h/hunt/app-memory app-memory.md §1-2 (pools resized on every use).

## [WRONG] P1 §1.3: an optional 'this scene is too heavy to preview at full quality' toast, attributed to 'his own line in entry E'
**Problem:** This is not Ezra's line. In #202 it is Claude's own note ('plus, possibly, warning him when a scene's cost has passed…'). The behaviour also already exists twice: FM.warnOversizeProject toasts 'This project is N megapixels — tap to fix the lag' (app.js:2987-2999), and maybeOfferPerfProbe toasts 'Playback is struggling' once the ladder is spent and frames are still late (app.js:472-487). A third toast would duplicate them.
**Fix / replacement:** Drop it. If wording is the problem, reword the existing struggling toast, and only after showing Ezra the text.
**Evidence:** REQUESTS.md@b46b47d3 #202 tail (entry lines 10035-10298): 'possibly, warning him when a scene's cost has passed what the preview can hold'. app.js:2987, :2999, :484.

## [FIX] P1 §2: the visual identity pass (BEFORE-PUBLISHING) — draw 3 home-screen and 3 Add-menu options, then a comment-only sweep of 'alight'
**Problem:** The plan is out of date. It says 'the whole phone layout… is untouched' and step 1 is drawing new home-screen options, but v17.22 (f7716576, two releases before b46b47d) re-laid-out Home 'from the approved reference': centred wordmark, Settings/Search/Profile across the top, four destinations around New. BEFORE-PUBLISHING.md was not updated by that commit, so its 'done' item 1 may be partly met and nobody has recorded it.

The comment sweep is low-risk but not free. The 'alight' mentions are spread across 20+ js files plus index.html, so ship.sh's ?v= gate needs a buster bump for each, and prove.sh needs UNPROVABLE for a comment-only change. The item is also HELD by him (raise it, let him decide). Not building the main work without pictures is correct.
**Fix / replacement:** First compare v17.22's Home against done-item 1 and update BEFORE-PUBLISHING.md. Then draw options only for what is still borrowed (the Add menu, colour/type, words). Ask before the comment sweep, and batch it into a release that already bumps those files.
**Evidence:** git show --stat f7716576 ('v17.22 — Home layout from the approved reference'; touches home.js and styles.css, not BEFORE-PUBLISHING.md). POLISH-LOG v17.22 line 1538. BEFORE-PUBLISHING.md:114-137. git grep -c -i alight b46b47d3 -- js/ index.html.

## [FIX] P1 §3: #47(b), export off the main thread (S0 inventory script, S1 canvas factory, S2 frame source with a demuxer, S3 worker behind Labs), plus a 'cheap win: yield every N frames'
**Problem:** The locations are right: FM.exporter at exporter.js:1160, seekVideo at :173, only vendor/mp4-muxer.js, no `new Worker` in app code, _mflow at compositor.js:12249. The counts are line counts: 94 lines contain createElement (118 occurrences) and 254 lines contain drawImage (268).

The 'cheap win' is already shipped. exporter.js:1500-1508 does 'ONE unconditional yield per frame' over MessageChannel, tagged (#47).

The staging contradicts the entry. The entry's 27 Aug ruling is 'NOT NOW… Revisit the moment #604 and #215 are closed', and both are still open, yet the plan's build order puts S0/S1 fourth. S1 is a 94-site refactor of the whole renderer, which is risky to Full-editor function for no visible gain.

The test is contradictory. A pure refactor (S1) cannot 'fail with the factory change reverted'; only S3's main-vs-worker hash comparison can.

Small error: the plan calls mp4box.js MIT. I believe it is BSD-3-Clause; check before vendoring.
**Fix / replacement:** Remove the yield idea. Keep only S0 (a read-only inventory) until #604/#215 close. When S1 happens, its proof is either UNPROVABLE (pure refactor) or a seam test that counts FM._mkCanvas use. The frame-hash test belongs to S3.
**Evidence:** exporter.js:1500-1508 (`await nextTick();` … '(#47)'). REQUESTS.md@b46b47d3 #47 entry lines 5053+, offsets 97-109 ('NOT NOW — and the reason is #604… Revisit the moment #604 and #215 are closed'). grep -c vs grep -o counts on compositor.js.

## [FIX] P1 §4: #129 short screen recording shows no picture — a fallback decode path, the report in the flight recorder, and a 'no picture, tap for why' banner on the clip
**Problem:** The locations are right: _hevcFromProbe at media.js:319, blankClipFacts at :394, codecSupport at :423, refused-at-load at :204, the HEVC fixture, and tests at tests.js:66721 and :83293. Two things are wrong.

(1) The fallback 'to the WebCodecs path the exporter already needs for frames (js/frames.js)' does not exist. frames.js seeks the same <video> element and calls createImageBitmap on it (frames.js:86, :198). The only WebCodecs use in the app is encoding (EncodedVideoChunk in export-resume.js). If the element cannot decode the file, frames.js cannot either. The plan's own §3 notes there is no demuxer.

(2) The clip banner is a new visual on the Full editor's timeline. Under his standing design rule it needs options shown to him first, and the plan does not say so.

Minor: the 15 s timer is FM.decodeWait at media.js:292; :596 is the toast.
**Fix / replacement:** Drop the frames.js/WebCodecs fallback. A real fallback needs a demuxer plus VideoDecoder, which is the same vendor decision as §3. Draw the banner options at 380px and get his pick before building. fm.lastBlankClip is already persisted and copyable (settings.js:1028), so folding it into the recorder adds little.
**Evidence:** git show b46b47d3:js/frames.js lines 78-86 and 198 (el.currentTime seeks, createImageBitmap(el)). git grep VideoDecoder b46b47d3 -- js/ finds only EncodedVideoChunk in export-resume.js. media.js:292 decodeWait=15000. media.js:598 is the toast.

## [FIX] P2 B: #508 opening a project is janky — throttled measurement, then move or defer the editor build out of the 520 ms push
**Problem:** The locations are right: lastOpenReport at home.js:168, PUSH_IN_MS=520 at :179, pushAllowed max-width 700px at :489-490, settings.js:936/:951, test 75993 (runs atPhoneWidth), _cdp.py:249-269 throttle seam, fm-push-in at styles.css:7229.

The proposed suite test ('no gap over 33 ms under 4-6x throttle') has three problems. The 508 test deliberately 'does not assert smoothness'. A frame-gap threshold on a loaded 8 GB Mac running a ~35-minute suite will flake. And fm-push-in is a translate3d animation driven by the compositor, so main-thread rAF gaps can pass while the phone still janks on GPU rasterising the new editor.

Step 2 calls filmstrips, waveforms and the layer list 'non-visible work', but they are on screen in the editor as it slides in. Deferring them shows an empty timeline arriving, which is a visible change to the Full editor.
**Fix / replacement:** Run the throttled reading as a one-off probe, not a ship-gating assertion. If a fix lands, guard it deterministically: assert that no heavy build call runs between push start and animationend (that fails on HEAD). Show him a before/after screen recording at phone width before shipping any deferral.
**Evidence:** home.js:168, :179, :489-490. tests.js:75993-76018 (atPhoneWidth, _pushAllowed). The test's own header: 'It does not assert smoothness'. styles.css:7229-7232 (translate3d keyframes).

## [FIX] P2 C: #619 pressing a template should offer the media swap — a two-choice sheet on tap (A), tap = use (B), or a hint (C)
**Problem:** The code and the conflict are accurately described: 'New project from template' at home.js:2003, edit() at :2027, use() at :2040, selectify(card…, edit) at :2078, the #505 comment at :2019-2025, and the #619 entry's own ⏸ note. Drawing options first is right for a change to the Full editor's Home tap.

The test section is wrong. Tests 61427 and 75746 do not drive the card tap: 75746 calls FM.templates.openForEdit directly, and 61427 tests update-in-place. So they will not 'flip'. The '505 pair' are 75628 (elements) and 75746. The plan also misses the existing 619 test at tests.js:78359 ('the template media-swap opens only with media'). Among the 505/619/343 tests nothing asserts what the card tap does, so the new test is the only guard.
**Fix / replacement:** Correct the risk paragraph: no existing test pins the tap, so write the new card-tap test (sheet shows both labels → each opens the right place) and keep 78359 green. Keep the picture-first step.
**Evidence:** tests.js:75746-75785 (const pid = await T.openForEdit(tid)). grep of test titles for items 505/619/343: 61427, 69749, 75628, 75746, 78359. home.js:2003-2078.

## [FIX] P2 E: #676 the add menu opens twice — a per-frame recorder of #add-sheet's top and the pager scroll for 700 ms, then a fix if the pager moves
**Problem:** The locations are right: syncAddSheetTop at mobile.js:391-397, called at :403, the hinge at styles.css:9954, the base slide at :4807, test 76240.

The statement that the only other caller is the export object is wrong: the window resize listener also calls syncAddSheetTop (mobile.js:449). The export object is not a caller.

P2's unverified pager guess has real support. addmenu.js:1424-1430 restores the pager's scrollLeft one requestAnimationFrame after render whenever startPage > 0, which happens after switching tabs or adding a layer in the same session. That is a content jump during the hinge.

The test's 'single monotonic motion / any reversal' will trip on the designed overshoot. The easing is cubic-bezier(.18,.85,.28,1.02) under rotateX with perspective, so the box goes slightly past its end.
**Fix / replacement:** Add the resize caller to the trace, and record pager.scrollLeft and the startPage jump. Give the reversal check a tolerance measured from the hinge's own overshoot (his tolerance-from-measurement rule). The recorder is additive, so it is safe for the Full editor.
**Evidence:** mobile.js:449 (window resize → syncAddSheetTop). addmenu.js:1424-1430 (requestAnimationFrame(jump) sets pager.scrollLeft = startPage*clientWidth). styles.css:9954-9958 (cubic-bezier(.18,.85,.28,1.02), perspective rotateX).

## Reviewer summary
I checked every code location the two plans cite against b46b47d3 by reading the files directly; nothing was run. Almost every reference lands within 0-2 lines of the right code, and the REQUESTS.md line numbers for all 10 items match. The problems are in substance, not in where the plans point.

**helper-1 (P1):**
- **Already shipped:** the #47 "cheap win" (yield during export so Cancel stays responsive) is already in the exporter, tagged #47 (exporter.js:1500-1508).
- **Wrong:** the #129 fallback relies on a WebCodecs decode path in frames.js that does not exist. frames.js only seeks the same video element.
- **Out of date:** the identity-pass plan wants to draw new Home layouts, but v17.22 already re-laid-out Home from an approved reference, and BEFORE-PUBLISHING.md was never updated to say so.
- **Duplicates existing toasts:** the "too heavy" toast is already covered by two existing toasts, and the line it calls Ezra's is Claude's own.
- **Missed risk in the thumbnail fix:** rendering the card at card size likely brings back the "mushy cards" that progressive halving was added to cure. Its test would miss the effect canvases being resized, which is the real cost.
- **Out of order:** #47 S0/S1 is scheduled although the entry says not until #604/#215 close. S1 is a pure refactor, so its test cannot fail when reverted.
- **Needs pictures first:** the #129 clip banner is a new visual in the editor's timeline, and the plan doesn't flag it.

**helper-2 (P2):**
- **#482:** the stale-table claim is correct. All nine ceilings are raised (Halftone 120, Find Edges 24, Lens ±3, Dither 64, Iridescence 60, Emboss 18, CRT 40, Chunk Noise 300, Shockwave 600). But the same entry already records this as "ROUND 3 SHIPPED v14.81", so it saves no work.
- **#663:** the claim that every effect parameter is rewritten every frame is verified (app.js:2478 → audio-fx.js:1618-1625, no change check). Pitch Shift's static setters are already change-gated, though, so the reshape part is wrong. As the cause of the cut-outs it is still unproven. The skip-unchanged fix is cheap, invisible and has a real counting test that fails on HEAD.
- **#508:** the "no gap over 33 ms" throttled assertion would flake and can't see the GPU-driven slide. The work it calls "non-visible" (filmstrips, waveforms, layer list) is on screen as the editor slides in.
- **#619:** the tests it says must "flip" don't drive the card tap. It also misses the existing 619 test at tests.js:78359.
- **#676:** it misses that a window resize also re-measures the sheet (mobile.js:449). Its "single motion" test would trip on the hinge's designed overshoot. Its pager guess does have real support: the add menu restores its page one frame after opening (addmenu.js:1424-1430).

Changes that touch the existing editor's look or behaviour (#619 tap, #508 build order, the #129 banner, the thumbnail) all need options or a before/after shown to Ezra first. The proposed Settings report rows are additive and fine for phone width.

Files checked: tools/design/plans/helper-plans-1.md on refs/remotes/h/plans/helper-1 (34e103ba) and tools/design/plans/helper-plans-2.md on refs/remotes/h/plans/helper-2 (b5dba317). The only file I wrote was a scratch copy of REQUESTS.md at /private/tmp/claude-501/-Users-ezrasmith-Claude-FreeMotion/1a172f83-0fdf-4f37-9706-58687655dccd/scratchpad/REQ.md.