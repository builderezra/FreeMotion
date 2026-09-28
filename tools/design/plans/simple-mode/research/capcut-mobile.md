# CapCut on MOBILE (iOS / Android): feature inventory and timeline model

Research note for the simple-mode design (step 1 of `../STATUS.md`). Written 28 Sep 2026.
Read-only web research; nothing was built and no CapCut build was run.

**Versions this describes:** iOS "CapCut: Photo & Video Editor" 19.6.0 (21 Sep 2026) [S1]; Android 19.1.0 (21 Aug 2026) [S2].
A separate tablet app, **CapCut Pad**, now exists and is desktop-style, not the phone UI [S67][S49].

**How to read the confidence tags**
- **[S-off]**: stated by CapCut or Apple (official page or App Store editorial).
- **[S]**: stated by a dated secondary source (a tutorial or guide). Most 2026 guides were written from documentation, not hands-on use. capcutguide.com says so on every page.
- **[C]**: community evidence only (a forum post, TikTok or YouTube title/description, or a review).
- **[U]**: **unverified**. It is recalled from the app's long-standing UI or inferred, and no written source confirms it. Treat it as a hypothesis to check on a phone.

**Limits of this research, said plainly.** Tutorial YouTube transcripts would not load: YouTube now blocks caption downloads without a token. Reddit blocks scripted access, and TikTok pages came back empty. So the exact **order** of toolbar buttons in the Sep-2026 build is reconstructed and not verified. Button **presence** is well sourced. CapCut moves buttons often and says so itself: "some tools, buttons, or menus have been moved, redesigned, or reorganized" [S9]. Every guide from 2026 warns that labels vary by build, region and account.

---

## 0. Summary for the design panel

1. **One magnetic main track.** Clips sit end to end from 0:00 in pick order. Trimming, deleting, speed changes and freezes ripple everything after them, so the main track never has a gap. The phone app has **no switch to turn the magnet off** (the desktop app has one). The only way to get free placement is to put a clip on an overlay lane [S10][S13][S11][C: S18].
2. **Everything else is a timed item on its own lane:** overlays (video/photo), text, stickers, captions, effects, filter/adjust segments, and audio (music, sound FX, voiceover, extracted audio, text-to-speech). Each has an **absolute start time** and its own length. On mobile these items **are not attached to main-track clips**. Delete or trim a main clip and the overlays, captions and music stay where they were, so they drift out of sync [S29][S52][S55][S69]. The desktop app has a "Linkage" toggle; I found no evidence of one on mobile.
3. **Overlays are capped in depth.** The cap applies to lanes stacked at the same moment, not to the total number of overlay clips. The error is "Maximum Overlay Tracks Reached" [S21], and the long-standing number is **6** [S19][S20]. A creator confirmed a limit still exists in Aug 2025 [C: S22]. The 2026 number is unverified.
4. **The timeline shows one category at a time.** Tap Text, Overlay, Effects or Audio and that category's lanes open for editing. When you back out ("«"), the other categories fold down to thin coloured lines or tiny thumbnail "bubbles" [S10]. That folding is how CapCut fits a multi-lane timeline on a phone.
5. **The bottom toolbar changes with what is selected.** With nothing selected it shows the project tools: Edit, Audio, Text, Overlay, Effects, Captions, Filters, Adjust, Aspect ratio, Background (and Stickers). With a clip selected it becomes a long, sideways-scrolling strip of clip tools: Split, Speed, Animation, Volume, Delete, Remove BG, Mask, Replace, Duplicate, Reverse, Freeze, Stabilize, and so on [S10][S12][S3]. The pain point everyone cites: "If you can't find a tool, tap an empty area of the timeline to deselect" [S12].
6. **Transitions exist only between main-track clips** (a small white square at each cut, plus "Apply to all") [S26].
7. **Paywall drift matters for the "simple" pitch.** In 2025–26, auto captions dropped to about **5 free generations a month**. Auto reframe, 4K, some export options and many assets went to Pro, and exports can carry a watermark [S56][S53][S37][S48][S55][S12].

---

## 1. Summary table

Tier key: **Core-simple** = a beginner meets it in the first session. **Handy** = found within a few projects. **Pro-ish** = buried, or needs editing knowledge.

| Area | Feature | Where on mobile | Tier | Confidence |
|---|---|---|---|---|
| Timeline | Magnetic main track, clips in pick order | automatic | Core-simple | S (S11, S10, S13) |
| Timeline | Trim by dragging clip edges (ripples) | timeline | Core-simple | S (S10) |
| Timeline | Reorder main clips by long-press + drag | timeline | Core-simple | S (S11) |
| Timeline | Split at playhead | clip toolbar: Split | Core-simple | S (S10, S43) |
| Timeline | Delete (gap closes) | clip toolbar: Delete | Core-simple | S (S13) |
| Timeline | Pinch to zoom, swipe under a fixed playhead | timeline | Core-simple | S (S43, S28) |
| Timeline | Undo / redo | above timeline | Core-simple | U |
| Timeline | "+" at end of main track to append media | timeline | Core-simple | U |
| Timeline | Mute all clip audio (speaker at track head) | timeline | Handy | C (S58, S59 "some versions") |
| Timeline | Cover (thumbnail) | head of main track | Handy | U |
| Timeline | CapCut-branded ending clip added by default | end of main track; settings toggle | Handy | C (S66) |
| Overlay | Add overlay (picture-in-picture) | Overlay → Add overlay | Handy | S-off (S6), S (S14, S29) |
| Overlay | Move a clip main → overlay, and back | clip toolbar: Overlay / (back to main) | Pro-ish | S-off (S5), C (S23, S25) |
| Overlay | Layer order among overlays | overlay toolbar (Layer) | Pro-ish | C (S24); label U |
| Overlay | Blend modes + opacity | overlay toolbar: Blend | Handy | S-off (S4) |
| Overlay | Lane cap ("Maximum Overlay Tracks Reached", ~6) | n/a | hidden limit | S/C (S19–S22) |
| Clip | Speed: Normal 0.1×–100×, Pitch toggle | Speed → Normal | Core-simple | S-off (S1), S (S10) |
| Clip | Speed: Curve presets (Montage, Hero, Bullet, Jump Cut, Flash in, Flash out) + Custom | Speed → Curve | Handy | S (S27, S10) |
| Clip | Smooth slow-mo (optical flow) | Speed | Pro-ish | S-off (S1) |
| Clip | Volume slider; fade | Volume / Fade | Core-simple | S (S58, S11) |
| Clip | Animations In / Out / Combo | Animation | Handy | S-off (S4) |
| Clip | Rotate / Mirror / Crop | Edit (sub-group) | Handy | S (S10, S38) |
| Clip | Replace (keeps slot length + effects) | Replace | Handy | S (S10) |
| Clip | Duplicate | Duplicate | Handy | S-off (S5), C (S25) |
| Clip | Freeze frame (inserts a still segment) | Freeze | Handy | S (S11, S40) |
| Clip | Reverse (processed, progress shown) | Reverse | Handy | S (S17, S39) |
| Clip | Extract audio | Extract audio / Audio → Extract | Handy | S (S10, S11) |
| Clip | Filters (+ intensity, Apply to all clips) | Filters | Core-simple | S-off (S4), S (S15) |
| Clip | Adjust (brightness, contrast, saturation … HSL, curves) | Adjust | Handy → Pro-ish | S (S16), C (S25) |
| Clip | Mask (linear/split, circle, rectangle, mirror, filmstrip, heart/star; feather, invert) | Mask | Pro-ish | S (S41, S10) |
| Clip | Remove BG: Auto removal / Custom removal / Chroma key | Edit → Remove BG (a.k.a. Cutout) | Handy (auto), Pro-ish (chroma) | S-off (S3, S7) |
| Clip | Stabilize (Recommended / Minimum cut / Most stable) | Edit → Stabilize | Handy | S (S36) |
| Clip | Keyframes (diamond) + easing graphs | diamond near Play | Pro-ish | S (S10, S65), C (S67) |
| Clip | Camera tracking (face/body/hands/custom) | Edit → Camera tracking | Pro-ish | S-off (S3) |
| Clip | Auto reframe (Pro) | Edit → Auto reframe | Handy | S-off (S3), S (S37) |
| Clip | Retouch / beauty, Video quality (enhance) | clip toolbar | Handy | S (S14) |
| Clip | Opacity (main clip) | clip toolbar | Pro-ish | U (Blend/opacity sourced for overlays only) |
| Between clips | Transitions (+ duration, Apply to all) | white square at each cut | Core-simple | S (S26) |
| Text | Add text, style, move/pinch on preview | Text → Add text | Core-simple | S (S31, S63) |
| Text | Text templates | Text → Text template | Core-simple | S (S10, S17) |
| Text | Text animations In / Out / Loop | text → Animation | Handy | S (S32, S63) |
| Text | Text tracking (follows an object) | text → Tracking | Pro-ish | S (S10) |
| Text | Text to speech ("Text to audio") | Text → Text to audio | Handy | S-off (S3, S4) |
| Captions | Auto captions (language, source, Generate) | Captions → Auto captions | Core-simple | S (S30, S53, S54) |
| Captions | Batch edit captions; one style for all | caption toolbar | Handy | S (S10, S30) |
| Captions | Import SRT | not on mobile | n/a | S (S30, S31) |
| Stickers | Stickers / GIFs / emoji | Stickers (or Text → Stickers) | Core-simple | S (S11, S17) |
| Effects | Video effects / Body effects | Effects | Core-simple | S (S42, S10) |
| Audio | Music library (Sounds), device audio | Audio → Sounds / device | Core-simple | S (S57, S11) |
| Audio | Sound effects (own lane) | Audio → Sound effects | Handy | S (S57) |
| Audio | Voiceover record (from playhead) | Audio → Record | Handy | S (S57, S11) |
| Audio | Beats (Auto generate markers) | audio → Beats | Pro-ish | S-off (S4) |
| Audio | Reduce noise / Voice isolation / Enhance voice / Voice effects | clip/audio toolbar | Handy | S-off (S3), S (S10) |
| Project | Aspect ratio (Original, 9:16, 16:9, 1:1, 4:5 …) | Aspect ratio (older: Format / Ratio) | Core-simple | S (S71, S11, S10) |
| Project | Background (colour / image / blur behind the frame) | Background (older: Canvas) | Handy | S (S10) |
| Project | Templates (fill the media slots) | Templates tab on Home | Core-simple | S-off (S4), S (S45) |
| Project | AutoCut (auto-assemble from picks) | Home tools | Core-simple | S (S46) |
| Export | Resolution 480p–4K, fps 24–60, bitrate, Smart HDR, codec | Export (top right) | Core-simple (defaults) / Pro-ish (the knobs) | S (S10, S60, S61, S44) |

---

## 2. The timeline model, exactly

### 2.1 Main track (the "spine")

- **Where clips land.** A new project is created from the media picker; you tap one or more items, then Add. "CapCut places them in the timeline in the order you select them" [S11]. One guide warns: "Do not rely on selection order alone; confirm the actual playback order" [S75]. The first clip starts at 0:00.
- **Magnetic, always.** "When you are trimming videos by dragging the edges, the adjacent clips will move along. In this way, there won't be gaps (and hence black screens)" [S10]. On delete, "Adjacent clips automatically slide in to close the gap" [S13]. On reorder, "Press and hold any clip … drag it to a new position. Surrounding clips shift automatically to close the gap or make space" [S11].
- **No off switch on mobile.** A forum reply from Jul 2024: "you can't on the main track but you can emulate it by uploading your clips as 'overlays' so that they go on the overlay layer which doesn't have the main track magnet" [C: S18]. The desktop app does have a Main track magnet toggle (§14).
- **Consequences that follow from the magnet** (these follow from the model; I found no source that states each one):
  - A speed change lengthens or shortens the clip, and everything after it on the main track ripples [U].
  - **Freeze** "inserts a still image of that frame as a separate clip in the timeline" [S11]. capcutguide says it "creates a still segment at that point" and you drag its edges to set the hold [S40]. The default hold length is **unverified** (commonly 3 s).
  - **Duplicate** puts the copy on the main track next to the original, pushing later clips [U for placement; the button's existence is S-off S5].
  - **Split** makes two segments "that still refer to the same source media" [S28].
  - **Replace** keeps the slot: "The replaced video clip shares the same duration and effects of the original clip" [S10].
- **You cannot leave an intentional gap on the main track.** One secondary guide says you can "leave a gap for pacing" after a split [S11]. That conflicts with the magnet and with the forum reply [S18], so I treat it as a writer error. The workarounds are a black/colour clip or a freeze on the main track [U].
- **The ends of the main track.** A CapCut-branded **ending clip** is added by default. It can be deleted per project, or turned off with a setting ("Add default ending"). Sources disagree on whether that setting sits in Me → Settings or in export settings [C: S66]. The "+" button at the end (append) and the "Cover" and "Mute clip audio" controls at the head are [U]/[C] (S58: "Some versions of CapCut also display a speaker icon that toggles mute directly").
- **Project length** is the furthest end of any item, not just the main track. "If your overlay is longer than the main clip, the rest the video will show black screens with only the overlays" [S10].
- **Photos** on the main track get a fixed default length that you change per photo by dragging an edge. There is no bulk setting, and I did not confirm the default length [C: search result from aeanet.org; U for the number].

### 2.2 Overlay lanes (CapCut's word for picture-in-picture)

- **Adding one.** Overlay → Add overlay → pick → Add. It appears centred and full-size, with a blue box; pinch to scale, twist to rotate, drag to move [S-off S6][S14]. The picker has tabs for Recent, the user's Space (cloud) and Library (stock) [S64].
- **Its own time.** "An overlay is a separate visual layer with its own timing" [S29]. You long-press to drag it in time, and drag its edges to trim [S10][S29]. **It is not attached to a main clip.** If you move part of the main track, "you'll need to move those synchronized elements individually" [S69, search-summary text]. capcutguide adds: "Snapping helps position an edge; it is not proof that captions, music and overlays will move together" [S28].
- **How many.** Overlays in one lane can sit one after another. The cap is on lanes stacked at the same moment: "Maximum Overlay Tracks Reached" [S21], historically **6** ("CapCut has set a limit of six overlays", Aug 2023 [S19]; the "more than 6 overlays" workaround video from Feb 2022 [S20]). The workarounds are to place overlays sequentially in one lane, or to export and re-import to flatten [S21]. A limit was still being hit in Aug 2025 [C: S22]. **The 2026 number is unverified.**
- **Main ↔ overlay.** A main-track clip can be moved to an overlay lane: select it, Duplicate, then "Overlay" moves the copy "to a lower track, directly beneath the original video" [S-off S5]; the same pair of steps appears in [C: S25]. There is also a way back to the main track [C: S23, Dec 2025]. The label on the reverse button is **unverified**.
- **Where lanes are drawn vs. how they stack.** On mobile, overlay lanes are **drawn under the main-track row** [S-off S5: "a lower track, directly beneath the original video"], yet they **render on top** of the main video. So the vertical order on screen is not the stacking order. One secondary source says the opposite ("main video … located at the bottom of the timeline") [S68]. That is how the desktop app looks, and I trust the official page for mobile. **Worth checking on a phone.**
- **Order among overlays.** There is a control to bring an overlay forward or send it backward [C: S24, Aug 2025]. On mobile, "select the intended overlay and inspect the available arrangement controls" [S29]. The button label ("Layer"?) is **unverified**.
- **Overlay-only options.** Blend (a mode and an opacity) [S-off S4]. Overlays get almost the full clip toolbar (Split, Speed, Animations, Volume, Retouch, Adjust, Video quality …) [S14]. **Transitions do not apply to overlays** [S26]. An overlay video keeps its own audio, which you mix separately [S29].

### 2.3 Text, sticker and caption lanes

- Every text box or sticker is its own timed item. "Drag the edges of the text layer in the timeline to control when it appears and disappears" [S11].
- Auto captions fill a caption lane (or lanes) with one text item per phrase. Separate lanes show as separate rows: "auto-captions and manual text appear as separate horizontal lanes" [S52 search text].
- None of these follow edits to the main track: "Removing silence, changing speed or replacing a voiceover can leave them pointing at the wrong words" [S52]. Descript's comparison piece: "Change something in your timeline, and you may need to regenerate and re-fix your captions" [S55].
- Stacking: "If multiple text layers overlap in time, the one placed higher in the stack will appear in front" [S68]. How text stacks against overlays is **unverified**. The official "text behind a person" recipe needs a cut-out overlay copy of the subject for the text to sit behind, which implies an overlay can render above text [S5].

### 2.4 Effects, filters and adjustments

- Effects → Video effects / Body effects. "The effects will be shown as a purple clip underneath the main video" while you are in the effects view. Back on the main timeline, "you won't see the purple clip, there is instead a colored line … indicating that segment has effects applied" [S10].
- Effects can land as a separate timed segment, not directly on a clip. CapCut Help: "Some effects are added as separate layers instead of directly on clips, making them seem invisible" [S-off S8]. The same page says "Effects only apply to selected clips. If nothing is selected, the effect won't be added". So the two ways of adding an effect behave differently, and CapCut's own help is muddled about it.
- Filters can be applied to a selected clip, with an intensity slider and "Apply To All Clips" [S-off S4][S15]. Adding a Filter or Adjust with nothing selected makes a timed segment that affects everything under it (an adjustment layer). I believe this from the app, but the only source is weak and generic ("Adjustment layers can affect multiple clips below them" [S68]). **Unverified.**
- An effect segment has a way to choose what it applies to (main track, all layers, or one overlay). I recall this as an "Object" control; **unverified**.

### 2.5 Audio lanes

- Each source type gets its own lane: "Sound effects … land on a separate, independent track" [S57]. Music and sound effects sit in lanes below the video [S58]. The voiceover "lives in a dedicated audio lane … typically appears as a pink or purple bar" [S58].
- The sources are: library music (Sounds), device files, sound effects, voiceover recorded from the playhead ("The playhead determines where your recording begins") [S57], extracted audio ("Go to Audio, then Extract, and select a video file") [S11], and text-to-speech output [S51][S3].
- Audio items are free-standing timed clips like overlays. They do not follow main-track edits (the same evidence as §2.2 and §2.3).
- Per-item tools: Volume (clip audio is quoted as 0 to 200% [S58], unverified), Fade in/out [S11], Split, Speed, Beats ("Swipe across to Beats and enable Auto Generate. You'll now see yellow dots within the audio waveform" [S-off S4]), keyframes on volume [S58], Voice effects / changer, Reduce noise / Voice isolation [S10], and Enhance voice [S-off S3].

### 2.6 Stacking order, top to bottom (best reconstruction)

```
 (front)  text / stickers / captions      <- order within a kind: higher in stack = in front      [S68]
          overlays (lanes 1..~6)          <- reorderable (forward / backward)                     [C S24]
          effect segments                 <- apply to main / everything / one overlay (U)          [S8]
          filter / adjust segments        <- apply to what is under them (U)
 (back)   MAIN TRACK video                <- always the base picture                              [S2][S68]
          background (colour/image/blur)  <- fills canvas where the main clip doesn't             [S10]
 audio:   clip audio + music + SFX + voiceover + extracted + TTS, all mixed; no stacking
```

Text-vs-overlay order is **unverified** (see §2.3). The note from the Wikipedia article is useful for the design: "Editing projects is limited to single-layer editing, but the app supports overlay options that enable additional effects, including multi-layer editing" [S2].

### 2.7 Category-focused display (the phone trick)

- With nothing selected, the main track shows as a filmstrip of thumbnails. Other items appear folded: effects as "a colored line" [S10], and overlays as a small "waterdrop-shaped thumbnail" you tap to reopen the overlay panel [S10].
- Tapping a category button (Overlay, Text, Effects, Audio) enters that category's view: its lanes open to full height and its sub-toolbar shows. "Tap the double arrow icon once you finish editing the Overlay clip. It will take you back to the main timeline" [S10].
- Result: at most one category is fully open at a time, which keeps a phone screen readable at the cost of a mode the user must understand.

### 2.8 Navigation

- The playhead is a fixed vertical line in the centre of the timeline. "Swipe the timeline horizontally until the intended moment meets the stationary playhead" [S43]. Pinch to zoom in and out [S28][S11]. Scroll vertically to reach lanes that are off-screen [S68].
- Selecting a clip draws a white frame with handles [S10][S58]. Split, Freeze, keyframes and voiceover all act at the playhead [S43][S40][S57].

### 2.9 Picture of the screen (reconstruction; layout details marked U are unverified)

```
+------------------------------------------------+
| X   ?          1080P v                 [Export]|   top bar: Export top-right [S14][S10]; rest U
|                                                |
|                 PREVIEW (pinch/drag            |   drag/pinch/rotate items on canvas [S10]
|                  the selected item)            |
|                                                |
| 00:03 / 00:15     |>      <> keyframe   ↶ ↷  ⤢ |   keyframe diamond near Play [S10]; undo/redo U
+------------------------------------------------+
|  ----o----o-----(folded fx/overlay/text)-----  |   folded categories [S10]
| [🔈][Cover]|[clip1][□][clip2][□][clip3]|[ + ]  |   main track; □ = transition button [S26]; head/tail U
|            |▮▮▮ overlay lane (when open) ▮▮▮   |   overlay drawn below main [S5]
|            |~~~~ music ~~~~   ~~ SFX ~~        |   audio lanes below [S58]
|                      | <- fixed playhead [S43] |
+------------------------------------------------+
| «  Edit  Audio  Text  Effects  Overlay  Captions  … (scrolls sideways)  |
+------------------------------------------------+
```

---

## 3. Start flow and the empty state

1. **Home screen.** Bottom tabs in 2024 builds: Edit, Templates, (Library), Inbox, Me [S14][S15][S16]. In later builds the first tab is labelled Home or Edit [U]. At the top is a big blue **New project** button; below it are one-tap tools such as AutoCut [S46], and then the list of drafts [S16]. On a fresh install the drafts list is empty [U].
2. **New project → media picker.** It opens the camera roll. Tabs include Recent, the user's cloud Space, and a stock **Library** [S64]. You can pick several items; "CapCut places them in the timeline in the order you select them" [S11]. A numbered badge shows on each picked item [U]. Tap **Add** [S14][S16].
3. **No blank editor.** You pick media first and then land in the editor with a filled main track. I found no source for a blank-canvas start on mobile; the stock Library (blank/colour clips) is the workaround [U]. capcutguide describes "New project" as "the blank-project control rather than a template" [S-guide, capcut-tutorial], but it still goes through the picker.
4. **Default ratio.** "The first piece of media you import to the timeline panel will set the aspect ratio" (search-summary text; the "Original" preset keeps it) [U, weakly sourced]. Guides tell users to set the ratio **first**, because "text and overlay positions don't translate between ratios. Edit in 9:16, switch to 16:9 at the end, and half your captions will sit off-screen" [S12].
5. **Autosave.** "CapCut will save the project draft automatically" [S10].
6. **Other ways in (templates, AutoCut)** are in §10.

---

## 4. The bottom toolbar with nothing selected

**Labels that are sourced** (order approximate; see the limits note at the top):

| # | Button | What it opens | Source | Tier |
|---|---|---|---|---|
| 1 | **Edit** | the clip toolbar for the clip at the playhead (Apple and CapCut paths such as "Edit > Remove BG", "Edit > Enhance voice", "Edit > Stabilize") | S-off S3, S7; S36 | Core-simple |
| 2 | **Audio** | Sounds (library), device audio, Sound effects, Extract, Record (voiceover) | S11, S57, S10 | Core-simple |
| 3 | **Text** | Add text, Text template, Stickers (some builds), Text to audio/speech, (older builds) Auto captions | S17, S10, S3, S4 | Core-simple |
| 4 | **Stickers** | in some builds a top-level button, in others inside Text | S11 vs S17 | Core-simple |
| 5 | **Overlay** | Add overlay (plus the overlay lanes) | S-off S6, S14 | Handy |
| 6 | **Effects** | Video effects, Body effects (Photo/AI effects in some builds) | S42, S10, S6 | Core-simple |
| 7 | **Captions** | Auto captions (plus other caption tools); older builds had it inside Text | S30, S53 | Core-simple |
| 8 | **Filters** | filter library + intensity | S15 | Core-simple |
| 9 | **Adjust** | colour and exposure sliders | S16 | Handy |
| 10 | **Aspect ratio** (older: **Format** or **Ratio**) | ratio presets, then ✓ | S71 ("bottom-right"), S11, S10, S12 | Core-simple |
| 11 | **Background** (older: **Canvas**) | Colour, Image, Blur behind the frame | S10 | Handy |

- **A best-guess order for 2025–26** (unverified): Edit · Audio · Text · Effects · Overlay · Captions · Aspect ratio · Background · Filters · Adjust · Stickers. The 2026 tutorial [S12] names the first five as "Edit, Audio, Text, Overlay, Effects", and sources disagree on whether Effects comes before Overlay.
- The strip scrolls sideways, and the later buttons sit off-screen on a phone. Every guide says "swipe the toolbar" [S10][S39][S33].
- **Sub-toolbars.** Tapping a category swaps the strip for that category's tools and adds a back button "«" on the left [S10]. For example, Text shows Add text · Text template · Auto captions · Stickers … ("Auto Captions … sits in between the Text template and Stickers features" in the older layout [S10]).

**How the switching feels** (from the sources): it is quick when you know the model and confusing when you don't. The 2026 beginner guide calls it out directly: "That context-switching toolbar confuses most beginners. If you can't find a tool, tap an empty area of the timeline to deselect, then look again" [S12]. The Text button disappears once a clip is selected: "Do not tap on the video, otherwise, you will be directed to the video editing toolbar, where you won't see the Text icon" [S10]. capcutguide adds: "A text-format panel will not appear when the video clip is selected, and an effect inspector may disappear when nothing on the timeline is active" [S-guide, capcut-after-update].

---

## 5. Toolbars when something is selected

### 5.1 A main-track video clip

Tools that are **present** according to sources. The order below is my reconstruction [U].

Split [S10] · Speed [S10] · Animation(s) [S4] · Effects (clip-level) [S42] · Volume [S59] · Delete [S10] · Remove BG / Cutout [S3][S7][S62] · Extract audio [S10] · Edit (Rotate · Mirror · Crop) [S10][S38] · Filters [S10] · Adjust [S10] · Mask [S10][S41] · Replace [S10] · Overlay (move to an overlay lane) [S5][S25] · Duplicate [S5][S25] · Reverse [S17][S39] · Freeze [S11][S40] · Stabilize [S36] · Voice effects / Voice changer [S10] · Reduce noise / Voice isolation [S10] · Enhance voice [S3] · Retouch [S14] · Video quality [S14] · Camera tracking [S3] · Auto reframe [S3] · Opacity [U] · Motion blur, AI "Style" effects and similar [U].

The **keyframe diamond** is not in this strip. "The Keyframe icon sits under the preview window … next to the Play button" [S10].

- VideoProc on the Edit sub-group: "Here will be another Edit option right between the Extract Audio and Filters tool, tap it. Hit the Mirror tool inside the Edit option" [S10]. So "Edit" appears twice: once in the project toolbar (open the clip tools) and once inside the clip toolbar (Rotate, Mirror, Crop). That repetition is itself a small usability hazard.

### 5.2 An overlay clip

Nearly the same as a main clip: "You can split, trim, change volume, and so on in the same way you edit the main clip" [S10]. Tuts+ lists Split, Speed, Animations, Volume, then (scrolling right) Retouch, Adjust, Video quality [S14]. On top of that come Blend (mode and opacity) [S4], Chroma key / Remove BG (the usual green-screen route is to add the keyed clip as an overlay) [S34], layer ordering [C S24], and a way back to the main track [C S23]. **No transitions** [S26].

### 5.3 A text item

Edit (the words) · Style (font, colour, stroke, background, shadow, opacity) · Effects (word-art) · Bubble · Animation (In / Out / Loop) [S10][S63][S32] · Tracking [S10] · Text to audio [S3] · Split / Duplicate / Delete [U] · keyframes [S33]. Text styles use tabs ("Next to the Style tab for text, you can also apply Effects, Bubble, and Animation" [S10]).

### 5.4 An audio item

Volume · Fade · Split · Speed · Beats · Voice effects · Reduce noise · Delete · Replace [S11][S57][S4][S10]. Replacing a template's music ("Select the music layer, tap Change") is mentioned for template projects [S11].

### 5.5 An effect / filter / adjust segment

Replace · Adjust (intensity and parameters) · a choice of what it applies to · Copy · Delete [U, apart from the existence of the segments, S8/S10].

---

## 6. Per-clip tools in detail, with tiers

| Tool | Behaviour on mobile | Tier | Source |
|---|---|---|---|
| **Split** | cuts the selected clip at the playhead into two segments of the same source | Core-simple | S28, S43 |
| **Trim** | drag the white edge handles; the main track ripples | Core-simple | S10 |
| **Delete** | removes the clip; later main clips close up | Core-simple | S13 |
| **Reorder** | long-press, then drag; neighbours shift | Core-simple | S11 |
| **Speed – Normal** | 0.1× to 100×; "toggle the Pitch option" | Core-simple | S1, S10 |
| **Speed – Curve** | presets Montage, Hero, Bullet, Jump Cut, Flash in, Flash out; **Custom** gives about 5 draggable beat points ("The vertical position of a point controls relative speed") | Handy | S27 (and search summary) |
| **Smooth slow-mo** | optical-flow frame blending for slowed clips | Pro-ish | S1, S67 |
| **Volume** | slider (quoted as up to 200%); some builds have a mute toggle | Core-simple | S58, S59 |
| **Fade** | fade-in/out durations (audio) | Handy | S11 |
| **Animations** | **In, Out, Combo** for video clips. "Combos are great because the animation can be placed anywhere in the clip and the length can be tailored" | Handy | S4 |
| **Duplicate** | copies the clip (see §2.1 for placement) | Handy | S5 |
| **Replace** | swaps in new media, keeping the slot length and effects; you can slide the source within the slot | Handy | S10 |
| **Freeze** | inserts a still at the playhead; drag it to set the hold | Handy | S11, S40, C S74 |
| **Reverse** | processes the clip with a progress pop-up | Handy | S17, S39 |
| **Crop** | Free or a fixed ratio; inside Edit | Handy | S38 |
| **Rotate / Mirror** | inside Edit | Handy | S10 |
| **Mask** | shapes (linear/split, circle, rectangle, mirror/filmstrip, others); size, position, rotation, feather, invert; usually on an overlay copy | Pro-ish | S41, S10 |
| **Chroma key** | Edit → Remove BG → Chroma key; colour picker, Intensity, Shadow, (Feather edge) | Pro-ish | S34, S7 |
| **Remove background** | Auto removal (one tap), Custom removal (Smart brush / erasers) | Handy | S3, S7, S35 |
| **Stabilize** | Recommended / Minimum cut / Most stable | Handy | S36 |
| **Keyframes** | diamond near Play; move the playhead, change the value, a diamond is added; graph icon for easing ("Tap the 'graph' icon beside the diamond"). A user review names the "Flow 1" and "Flow 2" graph presets. The App Store claims "Keyframe animation supported for all settings" | Pro-ish | S10, S65, S67 |
| **Opacity** | overlay: inside Blend; main clip: **unverified** | Pro-ish | S4 |
| **Blend modes** | overlays only (list of modes unverified) | Pro-ish | S4 |
| **Retouch** | face and beauty tweaks | Handy | S14 |
| **Video quality / enhance** | AI upscale or enhance | Handy | S14 |
| **Auto reframe** | pick a target ratio and the crop follows the subject; **Pro** on mobile per CapCut Help | Handy | S3, S37 |
| **Camera tracking** | tap a face, body, hands or custom area to keep it centred; "AI movement" adds beat-timed zooms | Pro-ish | S3 |
| **Text/sticker tracking** | the item follows a tracked object | Pro-ish | S10 |
| **Extract audio** | moves the clip's sound to its own audio lane | Handy | S10, S11 |
| **Voice effects / changer, Reduce noise, Voice isolation, Enhance voice** | audio clean-up and character voices | Handy | S10, S3 |
| **Transitions** | tap the white square at a main-track cut; preview; Duration slider; **Apply to all**; main track only; "Cuts on separate tracks and overlay clips may not change" | Core-simple | S26 |
| **Filters** | library by mood (Food, Scenery, Retro, Night Scene …), intensity, Apply to all clips | Core-simple | S4, S15 |
| **Adjust** | brightness, contrast, saturation …; HSL, curves and a colour wheel are mentioned by creators | Handy → Pro-ish | S16, C S25 |
| **Main ↔ overlay switch** | see §2.2 | Pro-ish | S5, C S23 |
| **Multi-select / batch clip edits** | no bulk mute ("CapCut does not currently offer a bulk-mute option") and no bulk photo length; general multi-select **unverified** | n/a | S59, aeanet |
| **Group / compound clip** | desktop-only in the sources ("Several Desktop elements act as one timeline object: Create a Compound Clip") | n/a on mobile | S75 |

---

## 7. Text, captions, text-to-speech

- **Manual text** is Text → Add text. Type, then style: font, colour, stroke/outline, shadow, background with opacity [S31][S17][S63]. Drag it on the preview and pinch to resize [S12]. Drag its timeline edges to time it [S11][S31]. A tip from CapCut's own help: finish one text item, then copy and paste it and replace the words, because "newly added manual text layers do not have one universal batch control for position, style or size" [S31].
- **Text templates**: pre-styled, animated titles you retype [S10][S17][S32]. Fonts and templates vary by region and account, and the catalogue has "Commercial" filters [S31].
- **Text animation**: In / Out / Loop presets plus a duration slider; keyframes for custom motion [S32][S63]. (Video clips use In / Out / **Combo**; text uses In / Out / **Loop**.)
- **Auto captions**: Captions → Auto captions. Choose the language and the source ("Generate from": original sound, voiceover, or both [S30][S10]), pick a caption template (many locked for free users [S53]), then **Generate** [S53][S30]. Result: timed text items on a caption lane. Editing: tap one to fix it, or **Batch edit** opens a keyboard list of all the lines [S10]. One style for all via "Apply to all captions", which is "not every block updates consistently" [S30]. Word-by-word highlight styles come from caption templates [S54].
- **Caption limits**: free accounts get about **5 generations per rolling 30 days, across all devices** [S56][S53]. Descript describes captions as part of the 2025 paywall [S55], and Pexo says "auto captions moved to the Pro plan in 2026" [S12]. **No SRT import on mobile** [S30][S31]. You cannot re-recognise only a selected portion [capcutguide word-by-word]. Captions **do not re-sync** after cuts; see §2.3.
- **Text to speech**: select a text item, then **Text to audio** (the Apple 2026 label) or "Text-To-Speech", pick a voice ("over 100 AI voices"), and AI writing helpers **Improve / Expand / Shorten** [S-off S3][S4][S51]. The output is an audio clip on an audio lane [S51].
- **Auto lyrics** exists as a caption source for songs [capcutguide auto-captions; metricool lists it, though that description may be of the web editor].
- **Bilingual captions** are documented on mobile [S-guide captions-subtitles].

---

## 8. Audio

| Source | Route | Lane | Tier | Source |
|---|---|---|---|---|
| Library music | Audio → Sounds → browse/search → "+" | music lane below video | Core-simple | S57, S11 |
| Device audio | Audio → device/folder tile | music lane | Handy | S57, S11 |
| Sound effects | Audio → Sound effects | "separate, independent track" | Handy | S57 |
| Voiceover | Audio → Record (from the playhead, 3-second countdown) | voiceover lane | Handy | S57, S58 |
| Extracted | Audio → Extract (pick a video), or select clip → Extract audio | audio lane | Handy | S11, S10 |
| Text to speech | Text → Text to audio | audio lane | Handy | S3 |
| Clip's own audio | lives inside the video clip; Volume / mute | (inside the clip) | Core-simple | S58 |

The tools are listed in §5.4. Music from a TikTok account is also offered in some regions [U].

---

## 9. Transitions, animations, keyframes: how they relate to time

- **Transitions** belong to a **cut on the main track**, not to a clip. Changing one does not move the clips ("Transitions do not shorten clips" per [S26]). Whether a transition's overlap shortens total duration is unverified; the guide's wording suggests it does not. There is a duration cap (the search summary said "up to 5 seconds"; unverified). Very short clips limit the available duration [S26].
- **Clip animations** (In / Out / Combo) live inside a clip's own time. Combo covers a stretch you choose [S4].
- **Keyframes** belong to one item. "Each timeline element owns its own markers … Adding diamonds to the base video doesn't move the layer above it" [S33]. Split behaviour (how keyframes divide across a split) is **unverified** and worth testing, since it matters for FreeMotion's hole-poking step.

---

## 10. Templates and other ways in

- **Templates tab**: browse trends and themes, open one, and it tells you how many photos/clips to pick. "Your own images and text will replace placeholders from the original clip … All the audio and video effects are retained" [S-off S4]. Templates also open from a TikTok "Use template in CapCut" link, which only works on mobile [S45]. Edit what the template exposes (media, text, crop, sometimes music), then Export. Some templates add a watermark or need Pro [S12][S45].
- **AutoCut** (Home tools): pick clips/photos → Next → compare styles/music → **Edit** or **Edit more** to continue in the normal editor → Export [S46]. A second route starts from one long recording [S46].
- **Script to video**: type or paste a script and get stock footage, an AI voiceover and captions as a rough cut [S12]. On mobile this is rolled out unevenly [S-guide ai-tools].

---

## 11. Export flow

1. Tap **Export** (top right; older builds said Share, or showed an up-arrow) [S10][S14][S11].
2. Settings: **Resolution** 480p / 720p / 1080p / 2K / 4K [S10][S60]; **Frame rate** 24 / 25 / 30 / 50 / 60 [S10]; **bitrate** (called code rate on some builds) with a **Recommended** default and Higher/Lower [S11][S44]; **Smart HDR** toggle, off by default [S60]; **codec** H.264 or HEVC [S61]. A resolution chip at the top of the editor also sets resolution [U]. 2K/4K can be Pro, depending on device, region, app version and frame rate [S48].
3. Rendering progress, then the file is in the camera roll with share buttons (TikTok first, then Instagram, Facebook, WhatsApp …) [S14][S1].
4. Free exports can carry a CapCut watermark, and the branded ending clip applies unless removed [S12][S17][S66]. Exporting straight to TikTok historically avoided the watermark [S17].
5. The App Store claims "4K 60fps exports and smart HDR" [S-off S1].

---

## 12. AI features on mobile (and what is paid)

| Feature | Route | Tier | Paid? | Source |
|---|---|---|---|---|
| Auto captions | Captions → Auto captions | Core-simple | about 5 free a month | S30, S56 |
| Text to speech + AI writing (Improve / Expand / Shorten) | Text → Text to audio | Handy | some voices paid | S3 |
| Remove background (Auto / Custom) | Edit → Remove BG | Handy | varies (badge) | S3, S35 |
| Enhance voice / Reduce noise / Voice isolation | Edit → Enhance voice | Handy | varies | S3, S10 |
| Camera tracking + AI movement | Edit → Camera tracking | Pro-ish | varies | S3 |
| Auto reframe | Edit → Auto reframe | Handy | **Pro** | S3, S37 |
| AutoCut | Home | Core-simple | free/Pro badge | S46 |
| Retouch, Video quality (enhance/upscale) | clip toolbar | Handy | varies | S14 |
| Script to video, AI avatars, AI image/video generation | Home / tools | Handy | credits | S12, S-guide ai-tools |
| Body effects, AI effects (style transfer) | Effects | Handy | many Pro | S42 |

**Plan structure (Sep 2026):** Free; **Standard** US$9.99/mo (App Store, mobile-oriented: fewer watermarks, more assets); **Pro** US$19.99/mo; a CapCut marketing page quotes $179.99/yr [S47][S1]. Diamond badges: blue means Standard, purple means Pro [S48].

---

## 13. What CapCut hides or limits (important for "simple")

1. **No free layering on the main track.** The main track is one spine, gapless and always starting at 0. You cannot drop a clip "anywhere"; it goes before or after a neighbour [S10][S13][S18].
2. **The magnet cannot be turned off on mobile.** The only escape is overlays [C S18].
3. **Overlays are a second-class layer:** a lane cap (~6), no transitions, and time placement that is **not linked** to the story on the main track [S19–S22][S26][S29].
4. **Nothing is linked to main clips on mobile:** text, captions, stickers, effects, music, SFX and voiceover all stay at absolute time when you cut the main track. Users re-sync by hand, and captions sometimes need regenerating [S52][S55][S69]. **This is the biggest gap between CapCut's simplicity and what a beginner expects.** (Desktop has a Linkage toggle; see §14.)
5. **The main ↔ overlay conversion is buried** (Duplicate → Overlay; a way back exists) and is taught as a trick [S5][C S23].
6. **Stacking order is hidden.** On screen, overlay rows sit below the main row while rendering on top [S5], and text-vs-overlay order is not shown anywhere. Reordering is a separate control [C S24].
7. **Only one category is open at a time.** Folded lanes are thin lines or bubbles; users must know which button reopens them [S10]. The context toolbar hides project tools while a clip is selected [S12][S10].
8. **No SRT import, no compound clips or groups, no bulk edits** on mobile [S30][S75][S59].
9. **The ratio should be set first.** Changing it later does not reposition text or overlays [S12].
10. **Monetisation shapes the UI:** Pro badges, caption quotas, watermarks and the branded ending clip [S56][S12][S66].
11. **iPad split:** CapCut Pad is a desktop-style, landscape-only multi-track app. A reviewer says "the phone app is better on iPad" [C S67]. That is a warning for FreeMotion's "phone and PC work the same" goal: CapCut itself did **not** make the phone and big-screen editors the same.

---

## 14. Cross-device and desktop differences (briefly; the desktop researcher covers these in depth)

- **Desktop timeline switches** (not on mobile): Main track magnet, Auto snapping, **Linkage** (items tied to a main clip move or delete with it), Preview axis [C: techpp search summary; YouTube titles "Turn Off Track Magnet & Auto linkage"].
- **Desktop tracks are real tracks**: overlays go "on a timeline track above the base clip". Mobile uses the Overlay button and lanes [S29][S34].
- **Projects move between devices through Spaces (cloud).** There are known failures when a mobile template project is opened on desktop ("template media can appear as a single frame or blank item") [S45][S49].
- **Teams / Spaces**: shared projects, roles (Owner/Admin/Member) and shared assets. I found no evidence of **real-time co-editing** on mobile; capcutguide "did not … test co-editing" [S70]. So CapCut offers no model to copy for "a simple user and a complex user live on the same project". FreeMotion is ahead of it here.

---

## 15. Takeaways for FreeMotion's simple mode (my opinion, not a source claim)

- CapCut's simplicity comes from **three constraints**: a magnetic spine, time-anchored lanes by category, and a toolbar that follows the selection. All three can be expressed as views and rules over a free-layer model like FreeMotion's. The spine is the ordered list of base clips; lanes are free layers grouped by kind.
- **Beat CapCut on the gap it leaves.** Tie overlays, text, captions and audio to the main clip they started over (CapCut desktop "Linkage"; Final Cut "connected clips"), so that cutting the spine carries them along. A beginner assumes this and CapCut mobile does not do it.
- **Copy the category focus (one open category, the others folded)** and the **white-square transition button at each cut**. Both are proven on phones.
- **Avoid CapCut's traps:** the doubled "Edit" label, tools that vanish while a clip is selected, the hidden stacking order, and the main↔overlay trick. Offer one visible "Move to main / Move to overlay" action and show the stacking order.
- **Don't copy the lane cap or the paywalls.** The overlay cap is a performance guard on phones. FreeMotion should decide its own limit from measurement, not by copying six.

---

## 16. Conflicts and unverified items to check on a real phone (for the hole-poking step)

1. Exact toolbar **order** in the current build, with nothing selected and with a clip selected.
2. The 2026 overlay lane cap (was 6).
3. How text stacks against overlays, and the name and scope of the layer-order control (overlays only, or text too?).
4. Whether a filter/adjust segment added with nothing selected affects all layers under it (an adjustment layer), and whether the effect "Object" (apply-to) selector exists.
5. How long a freeze lasts by default, how long a photo lasts, and where a duplicate is placed.
6. Where keyframes go when a clip is split, and how speed changes rescale them.
7. Whether a transition overlaps its two clips (shortening total time) or not.
8. Whether the mobile app has any linkage for text or captions in current builds. None was found. The hint that "overlay timelines link to the main timeline" appeared only in an AI search summary without a source, so it is disregarded.
9. Opacity on a main-track clip (sourced only for overlays).
10. Where the "Add default ending" toggle lives.
11. Hollyland says you can "leave a gap" on the main track [S11]; that conflicts with [S18] and the magnet model.
12. CapCutModa says the main track is at the bottom of the mobile timeline [S68]; that conflicts with CapCut's official "lower track, directly beneath the original video" [S5].

---

## 17. Sources

Official (CapCut / Apple)
- [S1] App Store, CapCut: Photo & Video Editor (v19.6.0, 21 Sep 2026; features; prices): https://apps.apple.com/us/app/capcut-photo-video-editor/id1500855883
- [S3] App Store story "5 Tips for AI-Powered CapCut Edits" (published 11 Jul 2026): https://apps.apple.com/us/story/id1745127492
- [S4] App Store story "Unlock CapCut's hidden features" (metadata 4 May 2026): https://apps.apple.com/qa/ipad/story/id1705686145
- [S5] CapCut, "How to Put Text Behind a Person in CapCut 2026" (mobile steps: Duplicate, then Overlay): https://www.capcut.com/resource/how-to-put-text-behind-a-person-in-capcut
- [S6] CapCut, "How to Add Overlays on CapCut" (27 Aug 2026): https://www.capcut.com/resource/how-to-add-capcut-overlays
- [S7] CapCut, "How to Remove Background in CapCut" (mobile Edit → Remove BG): https://www.capcut.com/resource/how-to-remove-background-in-capcut
- [S8] CapCut Help, "Why Are Effects Not Applying in CapCut?": https://www.capcut.com/help/effectss-not-applying-in-capcut
- [S9] CapCut Help, "Why did feature locations or the UI change after I updated?" (7 Jan 2026): https://www.capcut.com/help/capcut-ui-update-changes
- [S67] App Store, CapCut Pad (features; user reviews on "Flow 2" graph and iPad usability): https://apps.apple.com/us/app/capcut-pad/id6753943963

Reference
- [S2] Wikipedia, CapCut (Android 19.1.0, 21 Aug 2026; "limited to single-layer editing … overlay options"): https://en.wikipedia.org/wiki/CapCut

Secondary guides (dated where visible)
- [S10] VideoProc, "How to Use CapCut – The Complete Guide" (updated 15 Jan 2026): https://www.videoproc.com/video-editor/how-to-use-capcut.htm
- [S11] Hollyland, "CapCut Video Editing: Complete Beginner's Guide": https://www.hollyland.com/blog/topics/capcut-video-editing
- [S12] Pexo, "CapCut Tutorial for Beginners 2026" (10 Sep 2026): https://pexo.ai/blog/capcut-tutorial-9296
- [S13] UniFab, "How to Use CapCut in 2026" (22 Jul 2026): https://unifab.ai/resource/how-to-use-capcut
- [S14] Envato Tuts+, picture-in-picture in CapCut (2 Sep 2024, iOS 17): https://photography.tutsplus.com/tutorials/how-to-create-picture-in-picture-videos-in-capcut--cms-108806
- [S15] Envato Tuts+, filters in CapCut: https://photography.tutsplus.com/tutorials/how-to-quickly-add-filters-to-videos-in-capcut--cms-108764
- [S16] Envato Tuts+, quick CapCut editing (5 Jul 2024): https://photography.tutsplus.com/tutorials/how-to-quickly-use-capcut-for-video-editing-tutorial-2024--cms-108707
- [S17] Storyblocks, "CapCut 101": https://www.storyblocks.com/resources/tutorials/how-to-use-capcut
- [S19] Alphr, "How to Use Overlays in CapCut" (23 Aug 2023): https://www.alphr.com/capcut-how-to-use-overlay/
- [S21] Help Fix That, "Maximum Overlay Tracks Reached": https://helpfixthat.com/maximum-overlay-tracks-reached-capcut/
- [S26] capcutguide, transitions (23 Sep 2026): https://capcutguide.com/capcut-transitions/
- [S27] capcutguide, velocity / speed curve (20 Sep 2026): https://capcutguide.com/capcut-velocity-edit/
- [S28] capcutguide, cut/trim/split (20 Sep 2026): https://capcutguide.com/how-to-cut-trim-split-video-capcut/
- [S29] capcutguide, add an overlay (16 Sep 2026): https://capcutguide.com/how-to-add-overlay-in-capcut/
- [S30] capcutguide, auto captions (20 Sep 2026): https://capcutguide.com/capcut-auto-captions/
- [S31] capcutguide, add text (16 Sep 2026): https://capcutguide.com/how-to-add-text-in-capcut/
- [S32] capcutguide, text animation (23 Sep 2026): https://capcutguide.com/capcut-text-animation/
- [S33] capcutguide, keyframes: https://capcutguide.com/how-to-use-keyframes-in-capcut/
- [S34] capcutguide, green screen (15 Aug 2026): https://capcutguide.com/capcut-green-screen-tutorial/
- [S35] capcutguide, remove background (16 Aug 2026): https://capcutguide.com/remove-background-capcut-without-green-screen/
- [S36] capcutguide, stabilize (16 Aug 2026): https://capcutguide.com/stabilize-video-capcut/
- [S37] capcutguide, auto reframe (13 Aug 2026; Pro): https://capcutguide.com/capcut-auto-reframe/
- [S38] capcutguide, crop (4 Sep 2026): https://capcutguide.com/how-to-crop-video-in-capcut/
- [S39] capcutguide, reverse (4 Sep 2026): https://capcutguide.com/how-to-reverse-video-in-capcut/
- [S40] capcutguide, freeze / zoom / pan (23 Sep 2026): https://capcutguide.com/zoom-in-out-capcut/
- [S41] capcutguide, masking (27 Aug 2026): https://capcutguide.com/capcut-masking-tutorial/
- [S42] capcutguide, effects (20 Sep 2026): https://capcutguide.com/capcut-effects/
- [S43] capcutguide, playhead: https://capcutguide.com/capcut-playhead/
- [S44] capcutguide, export settings (13 Sep 2026): https://capcutguide.com/capcut-export-settings/
- [S45] capcutguide, templates (30 Aug 2026): https://capcutguide.com/capcut-templates/
- [S46] capcutguide, AutoCut: https://capcutguide.com/capcut-autocut/
- [S47] capcutguide, pricing (20 Sep 2026): https://capcutguide.com/capcut-pricing-free-vs-pro/
- [S48] capcutguide, Pro features (20 Sep 2026): https://capcutguide.com/capcut-pro-features/
- [S49] capcutguide, CapCut for iPad (23 Sep 2026): https://capcutguide.com/capcut-for-ipad/
- [S50] capcutguide, feature availability (4 Sep 2026): https://capcutguide.com/capcut-video-editor-features-guide/
- [S51] capcutguide, text to speech: https://capcutguide.com/capcut-text-to-speech/
- [S52] capcutguide, caption timing (20 Sep 2026): https://capcutguide.com/fix-capcut-caption-timing/
- [S53] Riverside, captions in CapCut (mobile "Captions" icon; 5 free a month): https://riverside.com/blog/how-to-add-captions-in-capcut
- [S54] Typito, auto captions 2026: https://typito.com/blog/capcut-auto-captions-add-subtitles-in-capcut/
- [S55] Descript, "CapCut captions aren't free anymore": https://www.descript.com/blog/article/capcut-captions-arent-free-anymore-heres-a-better-option
- [S56] VideoWizardTools, auto-caption limit: https://videowizardtools.com/capcut-auto-captions-limit/
- [S57] Hollyland Store, adding audio: https://store.hollyland.com/blogs/creator-hub/add-audio-to-capcut
- [S58] Hollyland, volume on mobile: https://www.hollyland.com/blog/topics/adjust-volume-in-capcut-mobile
- [S59] Hollyland Store, mute a clip: https://store.hollyland.com/blogs/creator-hub/set-a-clip-to-mute-in-capcut
- [S60] GeekInstructor, export settings (Oct 2023): https://www.geekinstructor.com/capcut-export-settings/
- [S61] Miracamp, export (mobile codec H.264/HEVC): https://www.miracamp.com/learn/capcut/how-to-export-high-quality-videos
- [S62] Miracamp, remove background (Cutout): https://www.miracamp.com/learn/capcut/how-to-remove-background
- [S63] Miracamp, add text: https://www.miracamp.com/learn/capcut/how-to-add-text
- [S64] CreateThat, overlays (6 Dec 2024; picker tabs Recent / Space / Library): https://www.createthat.ai/blog/how-to-add-overlays-in-capcut
- [S65] CreateThat, keyframes (28 Nov 2024; graph icon): https://www.createthat.ai/blog/how-to-add-keyframes-in-capcut
- [S68] CapCutModa, "How to see all layers in CapCut Mobile" (low quality; conflicts noted): https://capcutmoda.com/blogs/how-to-see-all-layers-in-capcut-mobile/
- [S69] Accio, CapCut track management (quoted from the search summary only): https://www.accio.com/blog/mastering-capcut-how-to-get-all-things-on-the-same-track
- [S70] capcutguide, Teams collaboration (17 Sep 2026): https://capcutguide.com/capcut-teams-collaboration/
- [S71] SendShort, aspect ratio (2026; "Aspect Ratio (bottom-right)"): https://sendshort.ai/guides/capcut-aspect-ratio/
- [S75] capcutguide, merge clips (Compound Clip and Group are desktop): https://capcutguide.com/how-to-merge-clips-in-capcut/
- Also cited by name in the text ("capcutguide …"):
  after-update https://capcutguide.com/capcut-after-update/ ·
  word-by-word captions https://capcutguide.com/capcut-word-by-word-captions/ ·
  captions & subtitles https://capcutguide.com/capcut-captions-subtitles/ ·
  AI tools https://capcutguide.com/capcut-ai-tools/ ·
  tutorial hub https://capcutguide.com/capcut-tutorial/ ·
  photo length (search result only) https://www.aeanet.org/how-to-set-image-duration-in-capcut-mobile/ ·
  Metricool (describes the WEB editor; not used for mobile claims) https://metricool.com/capcut-video-editing/

Community
- [S18] Steam Community thread "How do I turn off the main track magnet option on CapCut mobile" (2 Jul 2024): https://steamcommunity.com/discussions/forum/1/4406291470270278556/
- [S20] YouTube, "How To Add More Than The Maximum Overlay In CapCut" (11 Feb 2022, "more than 6 overlays"): https://www.youtube.com/watch?v=I8zbKbEX3NQ
- [S22] TikTok @amxy0811, "I didn't know CapCut had an overlay limit until now" (29 Aug 2025): https://www.tiktok.com/@amxy0811/video/7543820875879992606
- [S23] YouTube, "How to Switch Between Overlay Track and Main Track in CapCut Mobile – Lesson 159" (2 Dec 2025): https://www.youtube.com/watch?v=3MtZZFm0AiE
- [S24] YouTube, "How to Change Overlay Layer Order in CapCut | Android & iPhone" (10 Aug 2025): https://www.youtube.com/watch?v=pGtUSAXBnpo
- [S25] TikTok @deflatoxin (duplicate → overlay → mask; HSL, curves, colour wheel): https://www.tiktok.com/@deflatoxin/video/7430356967715130629
- [S66] Lemon8 @dollcrew_, removing the default ending: https://www.lemon8-app.com/@dollcrew_/7495402143071945259?region=us
- [S74] YouTube, "How to Make a Freeze Frame Effect in CapCut Mobile – Lesson 30" (18 Jul 2025): https://www.youtube.com/watch?v=3fGZFAQVdgk
