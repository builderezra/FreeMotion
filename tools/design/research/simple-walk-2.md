# A beginner's walk of the Simple chain tip (R7): 30 seconds from 3 clips, a title, music and a transition

**Build walked:** `hunt/simple-2.6` (the whole chain: 2.1 to 2.6 plus 2.4b and 2.5b), headless Chromium 1194, fresh profile, v17.24 label. **380x760 with real touch events** (`Input.dispatchTouchEvent`) and **1280x800 with a real mouse**. Screenshots: `simple-walk-2/` (640 px JPGs, named `w380-NN-…` and `w1280-NN-…`; the full-size PNGs stay with me). Labels: **Measured** = I ran it and read the number, **Seen** = a screenshot shows it, **Read** = I read the line.
**How honest "without reading anything" can be:** I know this app, so I took the first obvious control each time, did not open the help, and wrote down every place the obvious control was not there or did something I would not have guessed. I did not use a phone. I stopped at the Export sheet: headless Chromium cannot mux an MP4 with sound (the sheet says so), so the film was built to the end but not rendered.
Media: three 10 s clips (red "Clip A", green "Clip B", blue "Clip C", 360x640 with a tone each), a 30 s tone for the music, a typed title "My Trip".

## What worked (so the list below is read in proportion)
Home to a project in two taps (+, Create); the cog's **Simple ⇄ Full** switch; **Clips** adds three clips in one pick and lays them end to end (`3 clips · 0:30`); **Text** opens the editor with the word selected, so typing replaces it; **Sound** gives a three-item menu (*Music from your files*, *Sound effects*, *Record voice*) that needs no explaining. Pinch zoom and a swipe to scrub work under a finger.

## Stuck points, worst first

### 1. There is no transition in Simple. The goal's fourth ingredient cannot be made. (blocker)
Everywhere a beginner would look, none: the clip tray (Length, Speed, Volume, Move earlier/later, Lift off, Duplicate, Crop, Replace, Reverse, Take sound out, More, Delete), **More** (Colouring, Outline & Shadows, Mixing, Position / Scale, Speed, Volume, Customise Shape, Presets, Effects, plus three unlabelled icon buttons) and the join between two clips. Seen: `w380-12-three-clips.jpg`, `w380-19-more2.jpg`, `w380-17-seam.jpg`.
Read: `js/spine-words.js:75` and `:84` only know a crossfade that already exists (*removed 1 crossfade*, *Move the playhead out of the crossfade to split it*); nothing creates one. DESIGN §12.1 schedules *"Transitions that do not shorten clips"* (`trIn`) for **Phase 6**, so this is by plan, not a miss. For this brief it is the first thing that stops a first-time user, and what they would do is open Full.

### 2. A new project opens in Full, not Simple; Simple is one tap behind the cog (high)
After Create the beginner sees the Full editor (9 toolbar icons, "Tap here to start creating"), at 380 and at 1280. The only road to Simple is the cog, then a small *Simple ⇄ Full* switch whose selected half is Full, with a *What should you use?* button beside it. Seen: `w380-03-created.jpg`, `w380-04-cog.jpg`, `w1280-03-created.jpg`. Read: `js/editor-mode.js:31` (a NEW project's editor comes from `fm.editor.last`, which a first-run device does not have, so it is Full). A first-time user has no reason to open the cog. (Guess: a decision, D3 A, not an oversight; it is the right place to look if the aim is that beginners meet Simple first.)

### 3. Music and title land at the playhead, and a long song stretches the film (high)
The song went in at 4.7 s (where my earlier swipe had left the playhead) and ran to 34.7 s. **Measured: `project.duration` = 34.667 s**, not 30. No line said so, and a song has no *End with the video* button: `js/simple-timeline.js:622` offers it only when a **picture** runs past the end (`o.pictures.length`). The way out is to drag the music's right grip back 30 s (new in 2.5b) across a 7-second view, which needs a zoom-out first. Seen: `w380-28-music.jpg`. Same cause for the title: *Text* adds it at the playhead, so a title that should open the film opens at 4.7 s; at 1280 after a fourth clip it opened at 30 s (`w1280-08-text.jpg`).

### 4. At 1280, a clip's tray shows 6 of its 13 tools and cuts a word (known; option E fixes it)
One scrolling row with no scrollbar: Length, Speed, Volume, "Move…" (cut), More, Delete; the other seven (Lift off, Duplicate, Crop, Replace, Reverse, Take sound out, Move later) are off to the right with nothing saying so. Seen: `w1280-07-three-clips.jpg`. `hunt/simple-a1-e` (S9) makes it 10 tools on two rows. At 380 the same tray scrolls (that is a phone's habit) but the title's tray cuts *Stay put* to *Stay p…* (`w380-26-text-done.jpg`).

### 5. On a PC the first Simple screen is drawn on top of Full's Add grid (high on first impression)
Switching to Simple in an empty project at 1280 leaves Full's inspector tiles (Controller, Adjustment, New group, Custom elements, …) under Simple's quiet line (*0 clips · 0:00*) and the Clips / Text / Sound / Overlay bar: the labels overlap each other. Seen: `w1280-05-simple.jpg` (and still there 1.5 s later). Read: `js/simple-tools.js:72-92` parks the bar at the bottom of `#inspector-panel` and does not hide the panel's own children when no layer is selected. It goes away once a clip is selected, so it is a first-minute problem only.

### 6. The time readout lies after adding clips: it says 00:20:00 while the playhead is at 0 (medium; harmless but alarming)
**Measured at 380 and at 1280:** after adding three clips `FM.time` is 0 and `#time-readout` reads `00:20:00`. Cause (Read): the runner sets `FM.time` at `js/spine-edit.js:1292` and moves the playhead (`FM.timeline.updatePlayhead()`) but never calls `FM.updateReadout()` (`js/app.js:1595`); the last `FM.addMediaLayer` had left the readout at the third clip's start. A one-line fix: call `FM.updateReadout` beside `updatePlayhead` there. Seen: `w380-12-three-clips.jpg`, `w1280-07-three-clips.jpg`. A fourth clip appended later read correctly (30), because the last layer added and the runner's time happened to agree.

### 7. The join between two clips cannot be tapped while the first clip is selected (medium)
After the pick, clip 1 is selected and its trim grip (24 px) covers the seam; tapping the join re-hits the grip and nothing happens. Seen: `w380-17-seam.jpg`. (This is also where a transition would go, if there were one.)

### 8. The default zoom shows 7 seconds, so the film cannot be seen as a whole without a pinch; zoomed out, the clips are 23 px wide (medium)
Seen: `w380-12`, `w380-15-zoomout.jpg` (three clips 23 px wide, labels and grips on top of each other); the middle zoom (`pxPerSec` 5.8) is the usable one and takes two pinches to find.

### 9. **More** is a 190 px window that cannot be closed from itself (medium)
At 380 the panel opens as a strip under the tools with the first three buttons unlabelled (trim head, split, trim tail icons), and its content is cut off at the bottom of the screen (*Look + animations*, *Effects only*, then nothing). A swipe down, tapping *More* again and the back chevron do not close it; **tapping an empty lane** (which deselects) does. Seen: `w380-19-more2.jpg`. 

### 10. A title's tray offers *Into row* and *Crop* but no *Edit text* and no *Length* (medium)
Selecting the title chip (a 28 px lilac square above the clip row) gives Into row, Crop, Forward, Back, Stay put, More, Delete. Changing the words means tapping the title on the canvas; its 5 s length means finding its grips. Seen: `w380-26-text-done.jpg`.

### 11. The Export sheet in Simple still shows *Export just this layer* (low; against the design)
DESIGN §12.1 and the surface table (`DESIGN.md:2899`, `:3623`) say Simple hides *Export just this layer* and *Selected clip only*. At 380 the sheet shows the first (`index.html:969`); I found no build plan that carries the change (`grep` for *Export just* in the BUILD-PLAN files returns nothing), so it has no owner. Seen: `w380-29-export.jpg`.

### 12. Small ones
- At 1280 the *What should you use?* button runs to the very edge of its card (`w1280-04-cog.jpg`).
- *Clips* tapped twice in a row opens the picker twice (the first tap lands while the "Simple editor" note is up).

## What I would do first (an opinion, change it)
1. Decide #1 now: either say in the cog switch that transitions are in Full, or pull the Phase 6 crossfade forward for Simple. 2. #3 and #6 are small and certain (an "End with the video" for a long sound; one call to `FM.updateReadout`). 3. #5 is a first-impression bug on every PC; it is a hidden panel, not a redesign. 4. #4 is waiting on Ezra picking E.

## Not covered
The walk did not cover: a real phone (iOS Safari), the export itself, a project with a picture or a voice recording, captions, or Friends. Each step above was run once, so a stuck point I list as "Seen" could be timing; the ones marked Measured I ran twice.
