# Plans for the 5 oldest open items in REQUESTS.md (P1)

Against `origin/main` b46b47d (v17.23). Plans only: no app, test or tool code changed.
**Verified** = I read the line. **Guess** = I could not check it from the code.

## How the 5 were picked (and what I skipped)

I ran `tools/next.sh` with its INBOX gate bypassed (read-only copy; the gate is for the loop session). It lists 3 unnumbered items first, then numbered ones. I skipped, on purpose:
- standing instructions that are not buildable (the unnumbered "Continue the EFFECTS-PLAN build rounds", #352 already marked done in its title, #506, #532, #545, #591 and so on);
- `(hunt …)` items and #980 Simple mode, as ordered;
- #206 (HELD by him, he is doing it himself) and #215 (its plan is already `export-no-sound.md` on `hunt/export-no-sound`).

That leaves these five, oldest first. **Honest headline: four of the five are "built out, waiting on him", so their plans are about what to build that makes the waiting unnecessary.**

| # | Item | REQUESTS.md line | State today |
|---|---|---|---|
| A | "Editing lags, and gets bad fast" (unnumbered) | 3536 | two causes fixed; waits on his verdict |
| B | "The visual identity pass before any public release" (unnumbered) | 5671 | HELD by him; design, **needs pictures first** |
| C | #47 Export must not lose the render, and get off the main thread | 5053 | half (a) shipped; half (b) worker not started |
| D | #129 2-second screen recording shows no picture | 286 | diagnostics shipped; waits on his paste |
| E | #202 One simple video layer lags | 10035 | ladder cleared; waits on a reading taken WHILE PLAYING |

A, D and E all end in the same sentence: "paste a report". The single most useful thing in this file is plan **A+E** (§1): the app records the evidence itself so he is never asked again.

---

## 1. A + E — Editing lags / one video layer lags (plan them together)

**His clauses (verbatim from the entries).** A: "Editing lags, and gets bad fast." E: "One simple video layer lags badly, and the video does not load properly." His later reading (E, 19 Aug): 10.7 fps, render 294.69 ms, 9 shape layers, 24 effects, 1458k px, iPhone Safari.

**What is known (read in the entries, spot-checked in code).**
- Cost is almost perfectly pixel-bound (entry E: 163.5 ms at 1458k px, 34.6 ms at 365k px). The quality ladder is the right tool; it only acts while playing or dragging (`notePlaybackCost`, `js/app.js:311`). His "tier 0 at 10.7 fps" was a paused sample, so the ladder never ran.
- Entry A says "gets bad **fast**": that is a growth-over-time symptom, not a steady cost.

**New, from my H3 hunt (verified): the one growth-over-time cause nobody has fixed.** `makeThumb` (`js/storage.js:2133`) renders the whole scene on a **project-size canvas** (`:2140`, `FM.renderScene` at `:2147`) and runs at most every 12 s while he edits (`:2468`). Every effect scratch canvas is resized up to full size to do it, then back down for the preview. At 1080×1920 that is 11.2 MB of canvas per capture, about 3.35 GB per hour allocated (computed with a script in H3, `app-memory.md` §1), and a visible hitch every 12 s that cannot be told apart from "editing lags". **Guess:** on iOS Safari this is what turns "laggy" into "bad fast".

**Where / exact change.**
1. `js/storage.js:2140`: create `src` at the card size (`s = min(360/W, 360/H, 1)`, already computed at `:2149`) instead of project size. The compositor already scales px params to the plate (`plateScale`, `pxToPlate`, `js/compositor.js:3899`, `:3929`), so a small plate renders a faithful small picture. Set `width = height = 0` on every temp canvas when done.
2. New `js/perf-probe.js` "flight recorder": a ring of the last ~60 slow frames (gap, render ms, tier, layer/effect count, canvas px, whether `makeThumb` ran inside the window), written to `localStorage` at most once a minute. **Verified gap:** `perf-probe.js` has no `localStorage` use at all, so today the only evidence path is a 10-second manual Measure. Settings → What's slow gets a "Last slow stretch" block with the existing Copy button. He never has to press Measure; "still laggy?" is answered by the app.
3. Optional (his own line in entry E): when a scene's measured frame cost at full size is beyond real time, show one plain toast "this scene is too heavy to preview at full quality, the preview is sharing pixels" once per project.

**Risks.** (1) A smaller thumbnail render must match what the card shows today: effects that sample px units (blur radius, pixelate) are covered by `pxToPlate`, but any effect not scaled would look different. H5's report (`preview-export-parity.md`) lists them. (2) The flight recorder must not itself cost frames: only write on a slow frame, never per frame.

**Test that proves it.** (a) Count `document.createElement('canvas')` calls with width above 400 during `FM.storage.makeThumb`: 0 expected, ≥1 on main (the suite already hooks `createElement`, around `tests/tests.js` 91712). (b) Stub `performance.now` to inject 12 slow gaps and assert the recorder has 12 rows and `localStorage` was written once. Each must fail against HEAD source (the `tools/prove.sh` rule).

---

## 2. B — The visual identity pass (NEEDS PICTURES FIRST, do not build)

**His clauses.** "The UI is modelled on Alight Motion and has to be made our own before publishing." Held by him; raised whenever he mentions launching.

**What the repo already says is left (verified, `BEFORE-PUBLISHING.md`).** The "What done looks like" list has 7 items (home layout, Add menu, own icon set, own colour and type, own words, own motion, sweep for their marks). Desktop Studio layout is done (v4.71 and v8.83 note). The whole **phone layout, his primary target, is untouched**. Plus effect names and order (#484/#954), and six traced shapes to redraw.

**Plan.** Not buildable as code yet. Per his standing rule (CLAUDE.md "use Claude Design for every design request"): step 1 is pictures.
1. Draw 3 home-screen options and 3 Add-menu options at 380 px and at the size they ship, labelled with a recommended pick; send him a sheet.
2. He picks; then the order is: own words (cheap, label-only), colour and type tokens (one `:root` block in `styles.css`), then the layout changes, then icons.
3. **Cheapest honest first step with no design needed:** `grep -rin "alight" js/ index.html styles.css manifest.json` (the check the file prescribes) and reword the code comments that name the app. Safe because comments only.

**Risks.** Effect ids must never change when labels do, or every saved project loses its effects (the file says so); renames are a label-only change plus a test that every id still resolves. **Test:** a test that reads the shipped strings and asserts none of the borrowed menu words remain (the pattern #436/#437 used).

---

## 3. C — #47 Export must not lose the render, and get off the main thread

**His clauses.** "Export must not lose the render on a crash, and should get off the main thread." (a) crash-safe, (b) off the main thread.

**(a) is DONE** (v7.51-v7.55 and the later report/note work, per the entry; chunk replay with signature check, 512 MB cap, reaping after three days). I did not re-verify it in code beyond finding `FM.exporter` at `js/exporter.js:1160`. The entry's own verified-by-crash note is the evidence.

**(b) is the open half, and it is bigger than the entry says. Measured by grep on b46b47d:**
- `js/compositor.js` is 19,475 lines with **94 `document.createElement` calls**, 254 `drawImage` calls, 0 `OffscreenCanvas`, and the repo has no `new Worker` anywhere.
- The compositor draws from `HTMLVideoElement` and `Image` elements. The exporter seeks those elements (`seekVideo`, `js/exporter.js:173-213`, sets `el.currentTime`). **Elements do not exist in a worker.** A worker needs `VideoDecoder` plus a demuxer, and `vendor/` holds only `mp4-muxer.js`. No demuxer is in the repo. This is the real obstacle, more than the canvases.
- Plus `js/gl-warp.js` and `js/gl-color.js` (WebGL canvases) and `FM.media` lookups (6 sites in the compositor).

**His answer (27 Aug, per the entry): do the safety work first; the worker only if still wanted after, and not before the no-audio bug (#604).** So the plan keeps the order.

**Smallest staged plan.**
- **S0 (a day, no behaviour change):** a script that lists every DOM touch in `compositor.js` by function, so the move can be sized. Output a table, no code change.
- **S1:** make `renderScene` take a canvas factory (`FM._mkCanvas(w,h)` returns `document.createElement` today, `OffscreenCanvas` in a worker) instead of 94 direct calls. Pure refactor, protected by the existing render tests.
- **S2:** frame source abstraction: `getFrame(layer, t)` returning an `ImageBitmap`. Main thread implements it with today's `seekVideo`; a worker later with `VideoDecoder`. **Needs a demuxer: a vendor choice for him** (mp4box.js, MIT, about 100 KB).
- **S3:** worker export behind a Labs switch with automatic fallback to today's path; keep chunk replay as it is (it already writes chunks to IndexedDB, which workers can use).

**Risks.** Preview and export must stay pixel-identical (H5 found stateful temporal effects are the weak spot; `_mflow` state lives in the compositor, `js/compositor.js:12249-12270`); Safari's OffscreenCanvas and WebGL-in-worker support is a **guess**, I cannot check it from code.

**Test that proves it.** Render the same 30-frame project via main path and worker path and compare a hash of every frame (the exporter's resume test `tests/_xresume.html` is the pattern); must fail with the factory change reverted.

**Cheap win without the worker:** yield to the event loop every N frames so the progress UI and Cancel stay responsive. **Guess:** the entry says the freeze is the drawing; I did not measure it here.

---

## 4. D — #129 A 2-second screen recording shows no picture

**His clause (verbatim).** "Added a screen recording from my camera roll that's very short and it still has the issue of being on the timeline but not actually showing any video."

**What shipped (verified present):** `FM.blankClipFacts` `js/media.js:394`; `FM.codecSupport` `js/media.js:423`; the H.265 probe `FM._hevcFromProbe` `js/media.js:319`; a "refused at load" report (`js/media.js:204`); Settings → "A clip with no picture" with Copy; a real HEVC fixture `tests/_fixtures/hevc-2s.mov` with test 129 (`tests/tests.js:66721`, `:83293`).

**What is left.** Only evidence from his phone, or a fix if the file really is undecodable there. Two outcomes:
1. **Browser can decode the codec but the element stalls** (container or colour-range quirk): fix in the loader, e.g. retry via a fresh element with `preload="auto"` and `playsInline`, then fall back to the WebCodecs path the exporter already needs for frames (`js/frames.js`). **Guess:** I cannot know which without his paste.
2. **Browser cannot decode HEVC at all** (his phone should, iOS Safari does): then transcoding is a new feature and needs a wasm decoder in `vendor/`. Not worth building until the report says so.

**Plan that does not need him.** Make the report arrive without a paste: the "A clip with no picture" record is already written at failure; add it to the same flight recorder as §1 so one Copy carries both. Also: a visible banner on the clip itself ("no picture, tap for why") instead of only a Settings entry (**verified:** today the only surface is a toast and Settings).

**Risks.** A false alarm on a clip that is simply slow to start (the 15 s timer, `js/media.js:596` area). **Test:** the existing 129 tests plus one asserting the banner shows on the HEVC fixture when the decoder refuses; must fail against HEAD.

---

## 5. E — see §1 (planned with A). Extra, E only

His third measurement said render 294.69 ms at tier 0 of 6. The ladder's behaviour is already tested and cleared (v11.29, entry). The one open product question is the plain-language warning when a scene exceeds real time (§1 item 3). Do not spend another round on the ladder itself (the entry's own words).

---

## Order I would build them in

1. §1 thumbnail fix (small, real-user, measurable). 2. §1 flight recorder (ends the "paste a report" waiting on A, D, E). 3. §4 clip banner. 4. §3 S0 and S1 (refactor, no behaviour change). 5. §2 pictures; nothing else until he picks.

## What was verified and what is a guess

Verified: every file:line above, the grep counts in §3, the state of each entry (read in full for the headers and tails; the long middles I skimmed by search). Guess: Safari canvas collection and OffscreenCanvas support, whether the 12 s thumbnail is what makes his editing "bad fast", whether the phone clip is a codec or container problem. Numbers computed with a script: the thumbnail MB per capture (H3).
