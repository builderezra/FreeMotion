# Plans for the 5 oldest open items in REQUESTS.md (P1)

Against `origin/main` b46b47d (v17.23). Plans only: no app, test or tool code changed.
Against `origin/main` b46b47d (v17.23). **Corrected 7 Oct after the PM review (QF2):** items already shipped removed, wrong code assumptions fixed, the risks the first version missed added. Plans only: no app, test or tool code changed.

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

## 1. A + E: Editing lags / one video layer lags (planned together)

**His clauses.** A: "Editing lags, and gets bad fast." E: "One simple video layer lags badly, and the video does not load properly." His third reading (E, 19 Aug): 10.7 fps, render 294.69 ms, 9 shape layers, 24 effects, iPhone Safari.

**Known (read in the entries).** The cost is nearly linear in pixels (163.5 ms at 1458k px, 34.6 ms at 365k). The ladder is the right tool and only acts while playing or dragging (`notePlaybackCost`, `js/app.js:311`); his "tier 0" reading was a paused sample. The entry waits on a reading taken while playing.

**Two things I found by reading (verified):**
1. **The 12-second autosave thumbnail renders the whole scene at project size.** `makeThumb` is `js/storage.js:2133`; the full-size canvas is `:2140`; `renderScene` is `:2147`; the card scale `s` is `:2148`; the 12 s gate is `:2468`. At 1080×1920 that is 11.2 MB of canvas per capture (computed in H3). **Guess:** on iOS Safari this makes "laggy" into "bad fast".
2. **Selection-only layout work in every render** (`phone-perf.md`): see P3 §B.

**Plan.**
1. **Thumbnail: render at about 2× the card size (720 px on the longest side) and keep one halving step.** That is about 7× cheaper than 1080×1920 and keeps the averaging step. Zero `width` and `height` on the temporary canvases. The first draft said to render straight at 360 px; that is wrong, for a reason in the code's own comment: the progressive halving exists because "a single 1080→180 drawImage skipped most source pixels = the old mushy cards" (`js/storage.js` comment above `makeThumb`), and the compositor draws with default smoothing (only 2 `imageSmoothingQuality` lines in `js/compositor.js`), so a small plate would bring the mush back.
2. **Two more risks the first draft missed.** (a) `makeThumb` is shared: pinned thumbnails and the template and element pack pictures use it too (`liveThumbOf`), so they change as well. (b) `js/compositor.js:3890-3894` says thumbnails stay byte-identical *because* they are rendered unstamped at project size; px-unit effects that do not go through `pxToPlate` (`:3929`) will look different on the Home cards. That is a visible change to Home, so **show Ezra before/after cards (a photo, a video, a heavy-effect project) at the size Home draws them, before shipping.**
3. **A flight recorder in `js/perf-probe.js`** (a ring of the last ~60 slow frames written to `localStorage` at most once a minute, shown in Settings next to "Your last scrub" with Copy). Additive and invisible except for the new Settings line, so safe for the Full editor.
4. **Dropped from the first draft:** the "this scene is too heavy to preview" toast. It was attributed to Ezra and is not his: it is Claude's own note in the #202 tail ("plus, possibly, warning him…"). It also already exists twice: `FM.warnOversizeProject` toasts "This project is N megapixels — tap to fix the lag" (`js/app.js:2987-2999`), and `maybeOfferPerfProbe` toasts "Playback is struggling" once the ladder is spent (`js/app.js:472-487`). If the wording is the problem, reword the existing toast, and only after showing him the text.

**Test.** For the thumbnail: spy on the `HTMLCanvasElement` width setter (or `_fxScratchInfo`, `js/compositor.js:4696`) during `FM.storage.makeThumb` on a 1080×1920 project, and assert no plate wider than 720. (The first draft hooked `createElement`; that cannot work, because a canvas's width is set after it is created, and it would miss the effect pools, which are resized, not created. The pools bouncing back to full size is the main cost.) It must fail on HEAD. For the recorder: stub `performance.now` to inject 12 slow gaps and assert 12 rows and one write.

---

## 2. B: The visual identity pass (needs pictures first; check what v17.22 already did)

**His clause.** "The UI is modelled on Alight Motion and has to be made our own before publishing." Held by him; raised whenever he mentions launching.

**What changed since the first draft.** The first draft said the whole phone layout was untouched. That is out of date: **v17.22 (`f7716576`, "Home layout from the approved reference", two releases before b46b47d) re-laid-out Home**: a centred wordmark, Settings / Search / Profile across the top, four destinations around New (POLISH-LOG v17.22). `BEFORE-PUBLISHING.md` was not updated by that commit, so its "done" item 1 (a different Home layout) may be partly met and nobody has recorded it.

**Plan.**
1. **First, compare v17.22's Home against item 1 of "What done looks like" in `BEFORE-PUBLISHING.md` (`:114-137`) and update that file.** No code.
2. Then draw options only for what is still borrowed: the Add menu, colour and type, the words. Pictures first, at 380 px.
3. **The `grep -i alight` comment sweep is low-risk but not free, and it is held:** the mentions are spread over more than 20 `js/` files plus `index.html`, so `ship.sh`'s `?v=` gate needs a buster bump for each, and `prove.sh` needs `UNPROVABLE` for a comment-only change. Ask him first, and batch it into a release that already bumps those files.

**Risks.** Effect ids must never change when labels do. **Needs pictures first:** yes.

---

## 3. C: #47 Export must not lose the render, and get off the main thread

**His clauses.** (a) crash-safe, (b) off the main thread.

**(a) is done** (v7.51 to v7.55 plus the report work).

**(b): not now.** The entry's own ruling of 27 Aug is "NOT NOW … Revisit the moment #604 and #215 are closed", and both are still open. The first draft put the refactor fourth in the build order; that contradicts the entry.

**Already shipped, removed from the first draft:** the "cheap win: yield every N frames" idea. `js/exporter.js:1500-1508` already does "ONE unconditional yield per frame" over a `MessageChannel` (tagged #47), which keeps Cancel responsive.

**What stays (read-only):** **S0**, an inventory of every DOM touch in `js/compositor.js` by function, as a table (94 lines contain `document.createElement`, 118 occurrences; 254 lines contain `drawImage`, 268 occurrences: the first draft quoted line counts as call counts). No code change.

**Later, only after #604 and #215 close:**
- S1 is a refactor of about 94 sites in the whole renderer, risky for the Full editor for no visible gain. Its proof is **`UNPROVABLE`** (a pure refactor cannot fail when reverted) or a seam test that counts use of a new `FM._mkCanvas`. (The first draft said it would "fail with the factory change reverted": a contradiction.)
- The frame-hash comparison between the main path and a worker path belongs to S3, not S1.
- A worker needs a demuxer plus `VideoDecoder`; `vendor/` holds only `mp4-muxer.js` and there is no `new Worker` in app code. A demuxer is a vendor decision for Ezra. I wrote that mp4box.js is MIT; **I believe it is BSD-3-Clause; check the licence before vendoring.**

---

## 4. D: #129 A 2-second screen recording shows no picture

**His clause (verbatim).** "Added a screen recording from my camera roll that's very short and it still has the issue of being on the timeline but not actually showing any video."

**What shipped (verified):** `FM._hevcFromProbe` `js/media.js:319`, `FM.blankClipFacts` `:394`, `FM.codecSupport` `:423`, the refused-at-load report `:204`, the HEVC fixture, tests `tests/tests.js:66721` and `:83293`. The 15 s timer is `FM.decodeWait` (`js/media.js:292`; the first draft pointed at `:596`, which is the toast, `:598`).

**Corrections to the first draft:**
1. **The fallback decode path does not exist.** The first draft said to fall back "to the WebCodecs path the exporter already needs for frames (`js/frames.js`)". `js/frames.js` seeks the same `<video>` element and calls `createImageBitmap(el)` (`:86`, `:198`); the only WebCodecs use in the app is encoding (`EncodedVideoChunk` in `js/export-resume.js`). **If the element cannot decode the file, `frames.js` cannot either.** A real fallback needs a demuxer plus `VideoDecoder`: the same vendor decision as §3. Dropped.
2. **The "no picture, tap for why" banner on the clip is a new visual on the Full editor's timeline.** Under his standing design rule it needs options drawn at 380 px and his pick **before** it is built. The first draft did not say so.
3. `fm.lastBlankClip` is already persisted and copyable (`js/settings.js:1013`, "A clip with no picture"), so folding it into a flight recorder adds little. Dropped.

**What is left:** only evidence from his phone, or a real fallback if the file truly cannot decode there (a vendor decision). Ask him once for the paste.

**Needs pictures first:** the banner.

---

## 5. E: see §1 (planned with A). 

His third measurement is covered there. Do not spend another round on the ladder itself (the entry's own words).

---

## Order I would build them in (corrected)

1. §1 item 3, the flight recorder (additive). 2. §1 item 1, the thumbnail, **after Ezra has seen before/after cards.** 3. §2 item 1, update `BEFORE-PUBLISHING.md` (no code). 4. §3 S0 inventory only. 5. Nothing for §4 until the banner options have been drawn and he has picked.

## What was verified and what is a guess

Verified: the file:line references above against b46b47d (re-read after the PM's review), including `js/exporter.js:1500-1508`, `js/frames.js:86` and `:198`, `js/app.js:472-487` and `:2987-2999`. Guess: whether the thumbnail is what makes his editing "bad fast" on iOS, and the effect a 720 px plate has on Home's cards (hence the before/after step).
