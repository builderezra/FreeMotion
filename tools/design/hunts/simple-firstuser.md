> **Note from the cloud helper (11 Oct):** stage 2.7 (the ◇ transitions, his #1122 pick A) exists on branches `hunt/simple-transitions` / `hunt/simple-tip` (an older base) but is not yet in the release chain `wip/v17.39-tree`..`wip/v17.44-tree`, which is why the crossfade step below finds nothing. Screenshots were converted to 760 px JPEGs; the file names match.

# Simple mode, used like a first-time phone user (job SU1)

**Build tested:** worktree `wt/v1744` (branch wip/v17.44-tree, HEAD `e551532`, Simple stages 2.1–2.6), served at
`http://localhost:8804/`. Headless Chromium phone emulation: 380×800, DPR 2, `isMobile`, `hasTouch`, real taps and CDP touch
drags. Spot checks at 380×667. Four browser sessions in all: the walkthrough, two fresh-profile reproduction runs (`r1`, `r2`)
and one follow-up session (`x*`). Only one browser ran at a time. Screenshots are in `tools/design/hunts/simple-firstuser/`; the file names below are
relative to that folder. Nothing in the worktree was changed (`git status` is clean).

**Media:** three 4 s 640×360 test clips (A/B/C, each with its own sine tone; WebM VP9+Opus and MP4 H.264+AAC) and a 20 s MP3.
The project used the default **9:16 Phone** canvas, as a beginner would.

## 1. Verdict

"Basically unusable and is nothing" goes too far for the core, but a first-time user would honestly feel it. The basic
clip-after-clip editing works: adding clips, trim grips, ✂ split, Speed presets, delete with ripple, undo and export. Once you
know where things are, each one takes a tap or two. But a beginner runs into three or four visible breaks in the first two
minutes:

- **The playhead line is missing** in a new project. Every "at the line" action (split, title, music) is blind, and Simple's
  own message says "Move the playhead…".
- **The first title comes out cut off** at both edges.
- **Music runs on into black** at the end of the video, and comes back every time the video gets shorter.
- **More drops you into Full's expert panel.** That panel covers Simple's Clips/Text/Sound/Overlay row and can't be swiped.
- **Speed is hidden under "Audio".**
- **The crossfade step can't be done at all.** Transitions don't exist yet; they are Phase 6.

On top of that, most of what people expect from CapCut isn't there yet: filters, captions, stickers, a music library,
transitions. Most of these are planned for Phases 3 and 6, not 2.x. So it isn't "nothing", but it doesn't yet feel like a
finished simple editor. His reaction is fair for a first try, even though the engine underneath is sound.

### The beginner task, step by step

| Step | What a beginner looks for | Found? | Taps / gestures (mine → ideal) | Result |
|---|---|---|---|---|
| 1 New project | the + on Home | yes | 2 → 2 | Opens in **Full**. New project has no Simple choice (D3 A: the device's last editor) |
| 2 Switch to Simple | something saying "Simple" | only if you know the ⚙ (its accessible name is "Canvas settings") | 2 → 2 | Works and is remembered per project. A first-visit toast covers the tiny + |
| 3 Add 3 clips | a big "+ Add" | yes ("Clips") | 1 + picker → 1 | Clips are laid end to end. **Playhead line missing** and **readout says 00:08:00 at 0:00** |
| 4 Trim one | handles on the clip edge | yes, once the clip is selected | 2 (scroll, drag grip) → 2 | Works, with a "2.7 s" readout and ripple close-up |
| 5 Split one | ✂ at the line | yes | 4 (scroll, ✂ refused, select, ✂) → 2 | Refused at first with "Move the playhead onto the clip to split" while the playhead was on a clip (just not the selected one) |
| 6 Title | "Text" | yes | 2 + typing → 2 | Title is **cut off** at both edges. Tray and label go **stale** (they show an overlay's tools and "Text") |
| 7 Music | "Sound" / "Music" | yes, but only from your own files | 2 + picker, then about 6 gestures to make it fit the video → 3 | Added at the **playhead** (4.5 s), 20 s long, so **14 s of black**. Fitting it needs pinch, scroll and exact grip drags with no snapping |
| 8 Speed on a clip | "Speed" | **no**, it is under "Audio" | 6 (More → Full's Speed panel was a dead end, then Audio → Speed → 2×) → 4 | Works and ripples. The music then runs **1 s** into black |
| 9 Crossfade | a ◇ / transition at the cut | **no**: nothing at the cut, in the tray or in More (Presets) | about 4, then gave up | **Not possible** |
| 10 Export | the ⬆ | yes | 2 → 2 | Full's dialog. MP4 fails **in this environment** (no H.264 encoder here). The GIF (53 s for 360p) and WAV exports worked. The export **includes the black tail** |

Console: no `pageerror` and no app `console.error` in any session. The only messages were environment warnings ("AAC audio
encoding unavailable", the software-WebGL fallback) and one decode error for the MP4 file (no H.264 decoder in this Chromium).

## 2. Problems, ranked by how badly each stops a beginner

Every **broken** row was reproduced at least twice: in the walkthrough plus `r1`/`r2`, or two separate tries in the follow-up
session.

| # | Problem | Step | Screenshot | Type | Planned? |
|---|---|---|---|---|---|
| 1 | **No playhead line in a project that was empty when Simple opened.** `#timeline-panel` keeps `tl-empty-start` from the empty state, so `#tl-centerline` stays `display:none` after clips are added. This happens 3/3 times. Reopening the project doesn't fix it; only a page reload does. Split, Text, Music and "Add after clip" all act at an invisible line, and the split refusal tells you to "move the playhead". | 3–8 | `03c-three-clips.jpg`, `04a-after-swipe-left.jpg`, `crop-04a.jpg`, `r1-01-after-add.jpg`; fixed only after reload: `11f-after-reload.jpg` | **broken** | **Not covered: a bug against the plan.** DESIGN §7.3: "The moment any layer exists it drops to the normal-height row, and the playhead shows" |
| 2 | **No transitions at all.** There is nothing at a cut, nothing in the tray, and nothing in More (Presets only has looks). The task's crossfade step cannot be done. Crossfades made in Full survive Simple edits (2.4), but Simple can't make one. | 9 | `09a-at-cut-between-clip1-clip2.jpg`, `09e-presets-panel.jpg` | **missing** | DESIGN §15 **Phase 6** (Transitions); his 10 Oct pick A (#1122: ◇ over each cut, tray row with crossfade and dip to black / white). Not in 2.1–2.6 |
| 3 | **Music runs on into black.** Music is added at the playhead, never trimmed, and marked Stay put. My run had 14 s of black (8 s in `r1`/`r2`). Even after an exact manual trim, any speed-up, trim or delete brings the black back ("Black 2.0s" in `r1` and `r2`). The black band only explains ("the sound runs 13.8 s past the last clip") and offers no fix button. Fitting the song by hand means pinch, scroll and grip drags. **Trim grips don't snap** to the video's end (snapping only happens on moves), and the edge auto-scroll overshot. The export includes the black tail (last GIF frames are black; the WAV is 10.9 s against 9.85 s of video). | 7, 8, 10 | `07b-after-music.jpg`, `07d-past-video-end.jpg`, `07e-tap-black-band.jpg`, `r2-04b-after-speed.jpg`, `gif1/contact.jpg` | **confusing / missing** | Running into black is **by design** (D17 B, his pick; DESIGN §4.5, §5.4 keeps "End with the video" for pictures only). A one-tap "end the song with the video" for music and snapping on trims are **NOT planned** |
| 4 | **"More" covers Simple's project-tools row and won't close.** The docked panel's top (y 605 at 800 px, 499 at 667 px) lies over Clips · Text · Sound · Overlay. A tap on "Sound" hits the panel (`DIV.quick-row`). Pressing More again leaves the panel open; only tapping empty timeline closes it. Reproduced 3/3. | 6–9 | `08b-more-panel.jpg`, `r1-03b-after-more-again.jpg`, `x8-380x667-more-open.jpg` | **broken** | **A bug against the plan:** D10 A, "a project-tools row that never goes away" (BUILD-PLAN-PHASE2 §0 header, DESIGN §8.2) |
| 5 | **More's panel can't be scrolled with a finger on its cards.** In Simple it is squeezed to 195 px, against Full's 317. The third row of categories (Customise Shape, Presets, Effects) and most sub-panel controls (for example Speed's "Speed %" field) are below the fold. A swipe that starts on a card or between cards does nothing: scrollTop stays 0 in walkthrough, `r1`, `r2` and `x6`, and the mouse wheel does nothing either. Only a drag that starts on the thin top strip (grab bar or quick row) scrolls it. The same swipe scrolls a plain 195 px box in the same browser (scrollTop 111), so the emulation isn't the cause. | 8, 9 | `09c-more-scrolled.jpg`, `r2-03-more-panel-after-swipe.jpg`, `x6-more-handle-dragged.jpg` | **broken** (in Chrome phone emulation; not tried on a real iPhone) | **NOT planned** |
| 6 | **More = Full's expert panel**: Colouring, Outline & Shadows, Mixing, Customise Shape, and a Speed page with keyframe ◆, graph and "Park the playhead, then press one of these…". Its quick-row **"Trim end to playhead" leaves a black gap** in Simple (2.5 s and 1.5 s gaps in two tries), although Simple "never makes gaps". | 8 | `08c-more-speed-panel.jpg`, `x9-more-trim-end-to-playhead.jpg`, `x10-more-trim-end-2.jpg` | **confusing / broken** (the gap) | "More stays for everything else" is **by design** (DESIGN §8.5; Look, Captions and Effects come in Phase 3). The gap from Full's quick-row trims is **NOT planned** (D8 A says Simple never makes gaps; More-panel edits aren't covered) |
| 7 | **Speed is hidden under "Audio"**, along with Volume, Reverse and Take sound out. A beginner looks for "Speed", doesn't see it, and tries More, which leads to Full's Speed panel. | 8 | `08a-clip2-selected-tray.jpg`, `08d-audio-row.jpg`, `08e-speed-row.jpg` | **confusing** | **Decided by him:** #1122 option E (one "Audio" tool). The label is worth re-asking, for example "Speed & sound" |
| 8 | **The first title is cut off.** Text is added at 160 pt, so "My Summer Trip" runs past both edges of the 9:16 frame ("ly Summer Tri"), in the preview and in the export. | 6, 10 | `06c-after-title-done.jpg`, `r1-06-after-mp4.jpg`, `gif1/contact.jpg` | **broken-looking** | **NOT planned** (Full's default size; the text-style library is Phase 7) |
| 9 | **Stale tray and label after typing a title.** After Done, the tray shows an overlay's tools (Into row, Crop, Forward, Back) instead of Edit words, and the timeline label still says "Text". It only corrects after deselecting and reselecting. Reproduced 3/3. | 6 | `06c-after-title-done.jpg`, `06d-title-reselected.jpg`, `r2-02-after-text-done.jpg` | **broken** | **NOT planned** (bug: the tray's signature ignores the text and kind) |
| 10 | **Time readout wrong after adding clips.** It shows **00:08:00** (the last clip's start) while the time and preview are at 0:00, and it stays wrong until the next scrub. Reproduced 3/3. | 3 | `03c-three-clips.jpg`, `r1-01-after-add.jpg`, `r2-01-after-add.jpg` | **broken** | **NOT planned** (bug) |
| 11 | **✂ refuses with a misleading line.** With one clip selected and the playhead over another, ✂ says "Move the playhead onto the clip to split" instead of splitting the clip under the line (CapCut's behaviour). The selection outline is faint, so the beginner doesn't know which clip is meant. Reproduced 3/3. | 5 | `05b-split-tap-with-clipA-selected.jpg`, `x1-split-refused.jpg`, `x2-split-refused-2.jpg` | **confusing** | The behaviour is per DESIGN §8.5 (✂ splits the selection). The wording and the fallback are **NOT planned** |
| 12 | **After reopening, an off-screen clip is still selected.** The tray (Delete included) acts on a clip he can't see, while a different clip sits under the playhead. Reproduced in `r1` and `r2`. | any | `11f-after-reload.jpg`, `r2-05-after-reload.jpg` | **confusing (risk of deleting the wrong clip)** | **NOT planned** |
| 13 | **Weak first ten seconds.** Full shows a big "+ Tap here to start creating"; Simple shows a 36 px dashed + that the first-visit toast covers. There is no first-run hint (it isn't built), New project doesn't offer Simple, and Create doesn't open the picker. | 1–3 | `01b-editor-after-create.jpg` vs `02c-simple-empty.jpg` | **missing** | DESIGN §7.3 (big empty state, picker on Create) is **Phase 3**. The first-run hint (DESIGN §8.2 / §7.3 strings) is in no 2.x stage |
| 14 | **No visible ▶.** The time pill is the play button (Full's #364 design). The readout is mm:ss:**frames** with no total length. | all | `03c-three-clips.jpg` | **confusing** | **NOT planned** for Simple (D18 keeps Full's pill) |
| 15 | **Tray tools hidden under the pinned More / Delete.** Lift off, Duplicate and Crop sit under the pins (Lift off half-visible), Replace is off-screen, and there is no scroll cue. Measured in `r1` and `r2`. | 3–8 | `03c-three-clips.jpg`, `08a-clip2-selected-tray.jpg` | **confusing** | Partly: DESIGN §8.5 says "the row may scroll with a fade edge". The fade edge isn't there |
| 16 | **Wasted space.** 142 px (at 800) and 115 px (at 667) are empty under the tools, while the preview is only 286 px or 180 px tall. At 667 the video is about 96 px wide. | all | `02d-simple-empty-no-toast.jpg`, `x7-380x667-clip-selected.jpg` | **confusing** | **NOT planned** (the stage clamp `clamp(180px, 100svh − 514px, 40svh)` is deliberate) |
| 17 | **Selecting the music puts a 2 px transform box with a rotate handle** on the middle of the video. Reproduced 2/2. | 7 | `07m-music-full-length.jpg`, `x3-music-selected-t2.jpg` | **confusing** | **NOT planned** |
| 18 | **Missing basics a CapCut user expects**: filters / Look, captions and auto-captions, stickers and effects, text templates and animations, a built-in music library, background blur or fill for letterboxed clips, auto ratio from the first clip, a speed badge on the clip, a waveform on music. | — | `07a-sound-menu.jpg`, `03c-three-clips.jpg` | **missing** | **Phase 3:** Look, Captions with Find speech, Effects, Extras (D21: shapes, elements, templates). **Phase 7:** text styles and stickers library, beat markers. **NOT planned:** music library, background blur, auto ratio, speed badge |
| 19 | **In Full, the ⚙ disappears while a layer is selected**, and it is the only door back to Simple. Reproduced 2/2. | switch | `x4-full-with-selection-no-cog.jpg` | **confusing** | **NOT planned** (by his rule Full can't change; D22 A, one door) |
| 20 | **The export dialog is Full's**: 120 fps, Custom, "Export just this layer", loop region. There is no simple "1080p · Export" choice, and the black tail from #3 is included. | 10 | `10a-export-dialog.jpg` | **confusing** | **NOT planned** |
| 21 | **Small naming issues.** Music is called "the sound" (DESIGN §8.9 says "the song"). After a split, clips renumber ("Clip 3" becomes "Clip 4"). | 5, 7 | `05d-after-split.jpg`, `07b-after-music.jpg` | **confusing** | §8.9 naming partly planned; renumbering **NOT planned** |

### Unconfirmed (seen once, not repeated)

- **Edge auto-scroll overshoot.** Dragging the song's tail grip to the left edge shrank it from 20 s to 0.1 s in about
  2 s (`07f-music-trim-edge-scroll.jpg`).
- **Vague message for a file that wouldn't load.** Adding the MP4 showed only "Nothing could be added", with no reason or
  file name, for under 5 s (`r2-06a-mp4-1s.jpg`). The load itself failed because this Chromium has no H.264 decoder
  (environment).
- **Playhead jumped to 0:00** after the music hold-drag and an Undo.
- **Playhead moved** from 2.73 s to about 3.7 s after the failed MP4 export.

## 3. What already works well

- **The switch** takes 2 taps, closes the cog, is remembered per project and survives a reload.
- **Adding clips:** one picker lays three clips end to end and selects the first. Filmstrips draw at once.
- **Trim grips** show a live length ("2.7 s") and close up behind the trim. **Length** takes a typed value (4.01 → 3 worked).
- **✂ split**, **Speed presets** (0.5–3×, the rest of the row slides up) and **delete with ripple** are each one undo step.
  A title follows its clip.
- **Pinch to zoom**, **hold-drag to move an item**, and undo / redo all worked.
- **Sound menu:** your own files, Sound effects, Record voice.
- **The black band** at the end at least shows that the music runs past the video and by how much.
- **Exports:** GIF and WAV exports worked. The audio mix was right: clip tones, the song under them, and the 2× clip pitched
  up (pitch follows speed by his #916 answer).
- **No crashes:** no page errors in about 1 h across four sessions.

## 4. What could not be tested here, and why

- **Real devices.** His iPhone / Safari and any real Android phone were not tested: only Chromium's mobile emulation.
  Touch physics, the iOS keyboard, the Photos picker and Safari's media stack may behave differently. In particular, #5 (the
  panel not scrolling) needs a check on the phone.
- **MP4 / H.264 and AAC.** This headless Chromium has no H.264 encoder or decoder and no AAC encoder. So an MP4 export
  can't be made here (the app says so clearly) and MP4 clips don't load. The test used WebM clips and GIF / WAV exports.
  None of this is the app's fault.
- **Speed.** Export and editing speed on a real phone were not judged. The GIF export took 53 s on this shared, loaded
  4-CPU box.
- **Not exercised:** live collab with a friend (stage 2.6), the PC layout (1280 px), a sideways phone, Record voice (no
  microphone), and the Sound effects library contents.
- **Stage 2.7.** No "stage 2.7" exists in REQUESTS.md #980 or BUILD-PLAN-PHASE2.md; Phase 2 ends at 2.6. Transitions are
  DESIGN Phase 6, and Look, Captions, Effects and the first-ten-seconds flow are Phase 3.
