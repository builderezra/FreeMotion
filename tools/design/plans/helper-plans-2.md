# Plans for the next 5 oldest open items (P2)

Against `origin/main` b46b47d (v17.23). Plans only: no app, test or tool code changed, and nothing was run in a browser for this.
**Verified** = I read the line (or ran a script over the source). **Guess** = needs a real device.

## Which five, and why these

Continuing the order of `helper-plans-1.md` (which took "Editing lags", the identity pass, #47, #129, #202). The next real items in `tools/next.sh` order, after skipping: #206 (held by him), #215 / #604 / #677 (their plan is `export-no-sound.md`), #352 (already marked done in its title), the standing instructions (#506, #532, #545, #591, #690, #694 and so on), the `(hunt …)` items and #980:

| # | Item | REQUESTS.md line | State |
|---|---|---|---|
| A | #482 go through EVERY effect and improve it | 13083 | being built in batches by the Mac builder |
| B | #508 opening a project is janky | 18698 | instrument built, waiting on his paste |
| C | #619 pressing a template should offer to swap the media | 22624 | built; conflicts with a later answer (#505) |
| D | #663 audio still cuts in and out on mobile | 26479 | watcher built; effects are the known trigger |
| E | #676 opening the add menu opens it twice | 26942 | two fixes shipped, waiting on his answer |

As in P1, most of these wait on him, so each plan says what to build so the waiting stops mattering.

---

## A. #482 Improve every effect

**His clause.** "THE BIG ONE, IF I WANT IT: go through EVERY effect and improve it." (23 Aug.)

**State (read in the entry, `REQUESTS.md:13315-13330`).** Not a plan problem: there is already a 1,399-line plan, `tools/design/plans/2026-09-29-idle-backlog/backlog.md` §A, 15 batches. Shipped: batch 1 (v17.15), 2 (v17.19), 3 (v17.20), 5 (v17.21), 6 (v17.23). Waiting: batch 4 (the Filters tab) on his A, B or C pick (sheet in `tools/design/482/batch4`) and a Gradient Overlay default (Keep 0.8 or Gentler 0.5). `tools/next.sh` shows #482 under "STALE ASKS", meaning the entry records an answer beside an open ask: someone should read his reply, then strike or answer the ask.

**A finding that shortens the work (verified by script over `js/compositor.js`).** The entry's 31 Aug table of nine sliders "that stop short" is stale. All nine ceilings have since been raised: Halftone Dots size 30→120 (`js/compositor.js:209`), Find Edges amount 4→24 (`:243`), Lens Distortion k1 0.8→3 (`:1589`), Dither scale 16→64 (`:204`), Iridescence bands 10→60 (`:595`), Emboss amount 3→18 (`:259`), CRT scale 8→40 (`:327`), Chunk Noise size 60→300 (`:522`), Shockwave strength 120→600 (`:1454`). So do not re-do the "29 sliders" work: re-run the scan first (the entry says the instrument exists) and cut whatever it still finds.

**What to build next (in the backlog's own order).** Batches 7 to 15. Per the backlog table (`backlog.md:71-88`) these need a picture first: batch 8.2 (preset chips), 9.1 and 9.2 (search, chips, options drawer), 15.4. The rest need only before/after images. Batch 7 (audio choices) starts with an enabler (7.1) that the rest need, so it goes first.

**Risks.** Raising a ceiling adds reach but changes what an effect can be (his own rule, #545: nothing visual ships unseen). Every batch so far shipped "every default sample-identical or byte-identical", which is the right guard to keep.

**Test that proves it.** Each batch's own tests plus the preview-versus-export test from `preview-export-parity.md` for every effect touched (H5 found stateful temporal effects are the unguarded class).

**Needs pictures first:** batch 4 (already drawn, waiting on him), 8.2, 9.1, 9.2, 15.4.

---

## B. #508 Opening a project is janky

**His clauses (verbatim).** "the button you press … doesn't smoothly glide to the left with like a nice animation and then the project comes in smoothly from the right" (24 Aug). "the animation for opening a project still isn't smooth, work hard on making this look good" (27 Aug). Confirmed still bad on his device 1 Sep.

**What exists (verified).**
- The push has two phases (queue 128): the card glides out at once, the editor slides in after (`PUSH_IN_MS = 520`, `js/home.js:179`). Phone only: `pushAllowed` is `max-width: 700px` (`js/home.js:~486`).
- The instrument is built. Every push records its frames from the glide until 400 ms after Home is gone and writes `fm.lastOpenReport` (`js/home.js:168`), shown in Settings under "Your last project open" with Copy (`js/settings.js:936`, `:951`). Test `tests/tests.js:75993`.
- Measured on the Mac: 56 frames over 900 ms, worst gap 17.9 ms, 0 of 56 over 33 ms, and the backdrop-blur hypothesis refuted with 16 cards (entry text).

**The gap in the evidence (verified from the entry).** Every measurement was on the fast Mac. The very failure the repo keeps naming ("measured on THIS machine, found acceptable, moved on") is still unaddressed here: **nobody has measured the open under CPU throttle.** The driver already has the seam: `tests/_cdp.py:251-269` (`window.__fmWantCpu = {rate, until}`), used by the 921 S8 test (`tests/tests.js:39787`).

**Plan.**
1. Do the missing measurement at 4x and 6x throttle, with 16 cards and with a 30-layer project, by copying test 75993 and setting `__fmWantCpu`. Pass criteria: no gap over 33 ms during the 520 ms push. This needs no new code in the app.
2. If it fails (a **guess** that it will, since a phone is 4-6x slower on layout and first paint), the suspect named in the entry is the editor's first build landing inside the push tail. The smallest fix: start the heavy build one frame *before* the push begins (while the card is still gliding out) so it is not competing with the slide-in, or postpone non-visible work (filmstrips, waveforms, the layer-list build) until `animationend` of `fm-push-in` (`styles.css:7229`). Both are changes to the order of calls in `js/home.js` and `js/storage.js` open path.
3. Keep asking him for one paste of "Your last project open", but make it unnecessary: the same flight-recorder idea as `helper-plans-1.md` §1 would write the report on every open, not only after a tap he remembers to copy.

**Risks.** Reordering the build can show a half-built editor for one frame (a visible flash); test with a screenshot at the first frame of the slide-in. The desktop swap stays instant (measured case only).

**Test.** The existing 508 test plus a throttled variant asserting worst gap under 33 ms; it must fail with the build reorder reverted.

**Needs pictures first:** no (it is motion), but a short screen recording of before and after at 6x would show him the result.

---

## C. #619 Pressing a template should offer to swap the media

**His clauses (verbatim, 27 Aug).** "And templates when you press on them just create themselves as a project, not what I wanted and I specified many times to fix this" and "I know it's a big thing to do idc". Earlier (#343, 17 Aug): "when you press on them you can quickly swap out the media for ur own clips".

**State (verified).** The feature exists and works: the fill-in sheet "Insert your Media" (`js/template-fill.js`, titles at `:191`, `:210`, buttons `Replace Media` `:259`, `Your words` `:216`, `Your colour` `:240`). Text and shape layers are fillable slots since v13.68. It is reached from the card's three-dot menu, **New project from template** (`js/home.js:2003`, `use()` at `:2040`).

**The conflict (verified).** His 1 Sep answer on #505, "the element opens as its own document", made the **card tap open the template for editing** (`edit()` `js/home.js:2027`, wired by `selectify(card, th, t.id, edit)` at `:2078`; the comment at `:2019-2026` says so). So "pressing a template" today edits the template, and the media-swap he asked for in #619 is one menu away. The two answers pull in opposite directions on the same tap. The entry itself notes this.

**Plan (needs his pick, so draw it).** Replace the single tap with a tiny two-choice sheet and let him pick:
- **A (recommended):** tap the card → a small sheet with two big buttons, **Use this template** (opens the fill-in sheet, i.e. today's `use()`) and **Edit this template** (today's `edit()`).
- **B:** tap = use (his #619 words), edit stays on the three-dot menu ("Edit template"). Reverses #505 for templates only; elements stay as they are.
- **C:** leave as is and add a one-line hint on the card ("Tap to edit · ⋯ to use").
Drawn at 380 px with the three card states, sent as a sheet.

**Risks.** Changing the tap reverses a decision he made on 1 Sep; the three tests that mention the tap (`tests/tests.js:61427`, `:75746`, and the 505 pair) assert the current behaviour and must flip with a stated reason (the repo's rule, as the 619 entry did for its own flips).

**Test.** Tap the card; assert the sheet shows both labels; tap each; assert the fill-in sheet opens or the template workspace opens. Must fail on HEAD (no sheet today).

**Needs pictures first:** **yes** (the sheet and the three options).

---

## D. #663 Audio still cuts in and out on mobile

**His clause (verbatim).** "Seems fixed for the scratchy popping but audio still doesn't play consistently on mobile, it cuts in and out". His trigger, from his 10 Sep paste: it is fine until he adds EFFECTS (#845). One 1205 ms cut-out and one self-restart inside 1.2 s of playing were in the paste.

**State (verified).** The watcher exists (`js/audio-health.js`, 276 lines; tests `tests/tests.js:66547`, `:80378`). Two audio faults were fixed on 25 Sep (#934). The entry's hypothesis that the picture's cost caused it was measured and refuted.

**A concrete suspect found by reading (this one is new).** While playing, `tick()` calls `FM.audioFxLive.applyAt(FM.time)` on **every animation frame** (`js/app.js:2478`). That reaches each live effect chain's `applyAt` (`js/audio-fx.js:1619-1625`), which loops over **every parameter of every effect** and calls `b.u.set(key, valueAt(...), when, sceneTime)`. `set` is `AudioParam.setValueAtTime(v, when)` with **no check that the value changed** (`js/audio-fx.js:243-247`). So a static, un-animated chain of 3 effects with 4 params each appends about 12 timeline events per frame, around 720 a second, to Web Audio's per-parameter event lists for as long as the project plays. The pitch shifter's `reshape` also does `cancelScheduledValues` plus ramps (`js/audio-fx.js:~1415-1421`). **Guess:** on iOS Safari a growing event list and the main-thread cost of 60 calls a second per param could produce exactly "fine without effects, glitchy with them". I cannot say how Safari prunes that list.

**Plan.**
1. In `applyAt`, skip `set` when the parameter is not keyframed and its value equals the last one written to that parameter (store `b._last[key]`). Keyframed and custom setters are untouched. Result: static chains write once, then nothing.
2. Make it provable on the phone without a paste: add the number of `setValueAtTime` calls per second to the "Your last playback" report (`js/audio-health.js`), so one report says whether it was the cause.
3. Keep the ask to him as is (one report, effects on).

**Risks.** A value that was changed by something other than `applyAt` (a ramp, a glide) must invalidate the cache; the code already tracks `glided` for the pitch shifter (`js/audio-fx.js:~1405`). Export is separate (`schedule()`), so renders are untouched.

**Test.** A stand-in `AudioParam` that counts `setValueAtTime`: play 1 s of fake ticks on a 3-effect static chain; today the count grows with ticks, after it is the parameter count. Must fail on HEAD. Plus the existing tests for chains, which already guard the audible result.

**Needs pictures first:** no.

---

## E. #676 Opening the add menu opens it twice

**His clause (verbatim).** "also add to the list when you open the add menu it opens twice for some reason" (30 Aug). #706 (2 Sep) is the same report.

**State (verified).** Measured as one open and one render (the entry). Fixes since: the hinge keyframe owns `transform` while the slide transition is off (`styles.css:9954`; the base rule keeps the slide for the close, `styles.css:4807`); a short downward drag no longer re-opens the sheet (#934). The sheet's top is measured once, before it opens (`js/mobile.js:391-396`, called at `:403`); the only other caller is `FM.mobile.syncAddSheetTop` in the export object (`:451`). Test `tests/tests.js:76240`.

**What is still unexplained, and a candidate nobody has named.** After `.open` is added, the menu's pager (tabs and pages) is already built and is rendered *before* the sheet moves (`redrawAdd()` at `js/mobile.js:403`). If that pager scrolls or re-lays out after the open (remembered tab, `scrollLeft` restore), the user would see the content shift one more time after the sheet arrived, which reads as "opens twice". **Guess:** I did not trace the pager's own scroll. The entry itself says the one thing it cannot see here is CSS animation, so reading will not settle it.

**Plan.**
1. Ask the device, not the guess: the same flight-recorder trick as #508. For 700 ms after each `openAdd`, record `#add-sheet.getBoundingClientRect().top` and `#add-grid` scroll offsets every frame into `fm.lastAddOpenReport`. "Twice" is then a number: more than one plateau or any reversal in the top.
2. Show it in Settings next to "Your last project open", with Copy.
3. Meanwhile ask him for a **3-second screen recording** of one open (cheaper than a description, and it shows which of the two shapes it is).
4. If the pager is the cause: build the pager at its final scroll position before the sheet moves, or fade the content in after `animationend`.

**Risks.** The recorder runs only for 700 ms after an open, so it costs nothing in normal use.

**Test.** Drive `openAdd`, collect the recorded tops, assert a single monotonic motion (reuse the `getComputedStyle` approach of test 76240 but over time). Must fail if the pager is moved after the open.

**Needs pictures first:** no.

---

## Order I would build them in

1. D (the `applyAt` skip: small, safe, and it may fix a real audio problem he reports every few weeks). 2. B step 1 (the throttled measurement, no app change). 3. E (the recorder). 4. C once he picks (draw the sheet first). 5. A as the builder already does, batch by batch.

## Verified vs guess

Verified: every `file:line` above, the stale-table script result for #482, the existence of the instruments and seams. Guess: whether Safari's Web Audio event list grows and hurts (D), whether the add menu's pager moves after the sheet arrives (E), whether the project open is janky under throttle (B). These three are exactly what the proposed recorders and the throttled test would answer.
