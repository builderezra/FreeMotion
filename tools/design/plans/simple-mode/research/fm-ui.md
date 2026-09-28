# FreeMotion's editing UI on phone and PC: a map for the simple-mode design

Research note for the simple-mode design (step 1). Written 28 Sep 2026 from a read of the code at `2d06a3f5` (v17.11).
The working tree also has uncommitted edits by the loop session (`index.html`, `js/timeline.js`, `js/collab-link.js`),
so a line number can be a few lines off from the commit. I cited the working tree as I read it.

**Method.** I read the code. I did not run the app, the suite or a browser. Every layout statement comes from the CSS and
JS as written, not from a measurement. Anything I could not confirm from the code is marked **UNVERIFIED**. CapCut facts
come from the sibling note `research/capcut-mobile.md`, and from the two web pages listed under Sources.

Files read: `index.html`, `styles.css` (the layout blocks), `js/timeline.js`, `js/app.js`, `js/addmenu.js`,
`js/inspector.js`, `js/fx-browser.js`, `js/fx-registry.js`, `js/filters.js`, `js/mobile.js`, `js/text-edit.js`,
`js/captions.js`, `js/exporter.js`, `js/home.js`, `js/storage.js` (`FM.projects.create`, the project sanitiser), and the
header comment of each feature module (`audio-fx`, `sfx`, `voice-rec`, `tracker`, `crop-tool`, `mask-tool`,
`template-fill`, `medialib` and others).

---

## 0. Summary

- **One breakpoint decides phone versus PC: 700px of viewport width.** The CSS switches at `max-width: 700px` /
  `min-width: 701px` (76 media queries in `styles.css`). About 30 `matchMedia` calls in 17 JS files mirror the same
  number. The app does not check the device or the user agent, so a phone held sideways (844×390) gets the PC layout
  (`js/settings.js:41-47`, `styles.css:6282-6288`).
- **Both layouts use the same DOM, placed by one CSS grid on `#app`.** The four regions are the top bar, the stage, the
  inspector panel and the timeline panel. The phone stacks them: bar / stage (40% of the small viewport) / timeline, with
  the inspector as a fixed bottom sheet. The PC puts the stage across the top, and splits the bottom band into the
  inspector (left) and the transport plus timeline (right). The PC's old left rail is hidden, and at load
  `pcTransportLayout` physically moves its buttons into the transport row (`js/app.js:7562`).
- **The timeline draws one row per layer, and every row is equal.** `scene.layers[0]` is the top row and the frontmost
  layer (`js/compositor.js:15229`). A clip is a box at `left = start × px-per-second`. Nothing in the timeline ripples:
  trims, splits, moves and deletes all leave gaps and never shift a neighbour (`js/timeline.js:86-140`). The playhead is
  a fixed line at the centre of the screen, and the content scrolls under it (`js/timeline.js:11-16`, `:5355`).
- **The inspector has two states.** With nothing selected it shows the **Add menu**: tabs Elements · Shape · Media ·
  Audio · Template (`js/addmenu.js:219`). With a layer selected it shows the **layer editor**: a row of clip actions plus
  a grid of up to 12 numbered categories, filtered per layer type (`js/inspector.js:2492`, `:3620-3662`). On a phone,
  the same Add menu opens in a bottom sheet from the timeline's Add row, and the layer editor docks under the selected
  clip's row.
- **Best place to mount a second editing UI: a sibling of `#timeline` inside `#timeline-panel`, switched by a body
  class.** The stage, canvas handles, transport row, text editor, browsers, export and canvas dialog all stay shared.
  Two existing calls are the natural dispatch points: `FM.timeline.rebuild()`, with 90 external call sites, and
  `FM.inspector.refresh()` (see §5).
- **Most of the "make it look nice" machinery can be reused unchanged:** the effects browser, the filter library, the
  text editor, the captions editor, export, canvas settings, templates and the media library. What is tied to the complex
  editor is the timeline itself (per-layer rows, the Add row, ≡ reordering, groups, keyframe dots), plus parenting,
  cameras, controllers (nulls), adjustment and masking groups, Edit Group, the point, vector and graph editors, and 3D.
- **Mapped onto CapCut's categories:** Edit, Audio, Text, Overlay, Effects, Filters and Ratio exist. Adjust, Canvas
  (background), Captions, Templates and Stickers are partial. Five things are missing: **clip transitions**, **clip
  In/Out animations** (text has them; video and images do not), **freeze frame**, **stabilise** and **background
  removal**. Captions find the timing only; they do not transcribe (`js/captions-vad.js:4`). The table is in §8.

---

## 1. How the app decides between the phone and PC layouts

| What | Where | Note |
|---|---|---|
| The one number | `styles.css` has 48 × `@media (min-width: 701px)` and 34 × `@media (max-width: 700px)` | No UA sniffing. Width alone. |
| The phone grid | `styles.css:3826` (block start), `:3838-3846` | `#app { grid-template-rows: auto var(--stage-h) 1fr }` with `--stage-h: 40svh`. |
| The PC grid | `styles.css:6275-6293` | Three columns (`--rail-w`, `--insp-w`, `1fr`) and two rows (stage, then a band of `max(150px, min(232px, 46vh))`). |
| The PC rail is gone | `styles.css:7888-7893` | `body { --rail-w: 0px }` and `#topbar { display: none }`. What it held now lives in the transport row. |
| JS mirrors of the number | `js/mobile.js:7`, `js/timeline.js:52`, `js/app.js:948/6278/7565`, `js/addmenu.js:1004`, `js/text-edit.js:29`, plus 12 more files | Each module asks `matchMedia` itself. `text-edit.js:19-28` warns that a gate which disagrees with the CSS by one pixel is worse than none. |
| Mouse versus touch | `js/app.js:1633` (`(hover: hover) and (pointer: fine)`); `js/timeline.js:2190` (`e.pointerType === 'touch'`) | Input type is judged separately from layout. A touch on the PC layout still gets the hold-to-drag clip behaviour. |
| Crossing the line live | `js/mobile.js:449` closes the sheets; `js/app.js:7562-7568` rebuilds or tears down the PC transport | Rotating a tablet swaps layouts in place. |
| No per-user layout setting | `js/settings.js:41-48`, `:85-88` | `layout: 'studio'` is a leftover and is ignored ("I just want two layouts not three", queue 249). |

**For simple mode:** a mode switch is a *second axis* (simple or complex) on top of this one (phone or PC). The
simplest consistent pattern is a body class, set from one place and read by both CSS and JS. `body.white-chrome` is
already done this way from one constant (`js/app.js:937`).

---

## 2. The layout on each device

### 2.1 Phone (≤ 700px)

```
┌───────────────────────────────────────┐  #topbar-m  (index.html:337-409)
│ ‹  Project name   ?  notes  ⚙  Export │   back · name (or clip name when editing) · help · notes · cog · export
│                                       │   in selection mode: group · duplicate · mask-group · delete · ⋯
├───────────────────────────────────────┤
│                                       │  #stage > #canvas-wrap > canvas#preview   (index.html:412-425)
│              CANVAS                   │  height = 40svh (styles.css:3838-3839)
│                                    ▐▌ │  #view-bar / #opt-bar: floating rails glued to the right edge (styles.css:754-793)
├───────────────────────────────────────┤
│ ⋯ ⧉ ◐ |◀   00:03:12   ▶| ↶ ↷ ⛶       │  #transport  (index.html:528-564): 40px row
├──────┬────────────────────────────────┤
│ ruler│      │ (fixed centre line)       │  #timeline > #tl-inner > #tl-rulerrow, #tl-tracks, #tl-playhead
│ ◉ A │ [clip A ████]│                   │  one .track-row per layer: head (eye) + lane + ≡ handle
│ ◉ B │   [clip B ███│███]               │
│  +  Tap to add a layer                 │  .tl-addrow: the Add row (at FM.addAt)
└───────────────────────────────────────┘
```

- **Top bar** `#topbar-m` (`index.html:337-409`). While one clip is selected, the name field shows the clip's name
  (`#clip-name-m`), and back means "close clip options". That label comes from `FM.syncSelectionChrome`
  (`js/app.js:941-985`). The cog opens the **canvas dialog**, not Settings (`js/mobile.js:362-363`, clicking the hidden
  `#btn-canvas`).
- **Stage.** Canvas only. The view rail (`#view-bar`: fit · layers-isolate · add camera · canvas zoom · guides ·
  timeline zoom, `index.html:429-469`) and the options rail (`#opt-bar`: preview rate · loop · snap · export marks,
  `index.html:514-527`) float over its right edge. The ⛶ and ⋯ buttons in the transport open them
  (`js/app.js:7175-7300`).
- **Transport** `#transport` (`index.html:528-564`). Left: options ⋯, layer actions (copy and paste), the Add-row
  switch, previous edge. Centre: the time readout, which is also play and pause (tap), a type-a-time field
  (double-click), and set-thumbnail (hold). Right: next edge, undo, redo, ⛶ view options. `#transport-extra`
  (`index.html:574-590`) is `display:none` but still in the DOM and still wired. For example, `#btn-split` →
  `FM.splitLayer` (`js/app.js:8053-8054`).
- **Timeline.** See §3. With an empty project, the Add row fills the timeline and says "Tap here to start creating"
  (`js/timeline.js:2794-2796`, `:2864`).
- **Add.** The green + button is hidden (`styles.css:4019`, queue 294). The **Add row** opens `#add-sheet`
  (`js/timeline.js:3029-3040` → `FM.mobile.openAdd`, `js/mobile.js:398`). The sheet reaches up to the bottom of the
  canvas (`styles.css:4616-4626`, with `--add-sheet-top` measured in `js/mobile.js:391-397`) and renders the shared Add
  menu (`variant: 'sheet'`, `js/mobile.js:386-387`).
- **Inspector.** A fixed bottom sheet (`styles.css:3893-3901`, max 52vh). Its open or closed state follows the
  selection (`js/mobile.js:48-90`, `syncSheet`). With one clip selected, the timeline draws **only that clip's row**
  (the "solo view", `js/timeline.js:2838` `soloLayerId`, used at `:3487-3490`). The sheet then **docks just under that
  row** (`js/mobile.js:271-294`, `dockSheet`, capped at 66% of the screen height). This is the Alight Motion pattern:
  the options sit directly under the clip.
- **Text editing takes over the whole screen.** The toolbar goes on top, the field docks under it, and the inspector
  and timeline are hidden (`styles.css:3858-3871`, `body.text-editing`). Drawing mode does the same (`body.drawing`).

### 2.2 PC (≥ 701px)

```
┌──────────────────────────────────────────────────────────────────────┐
│                                                                   ▐▌ │  #main/#stage: grid row 1, full width
│                             CANVAS                                ▐▌ │  #view-bar / #opt-bar float on the right
├──────────────────────────┬───────────────────────────────────────────┤
│ Add  (or Inspector)      │ ‹ ⋯ ⧉ ◐ |◀  ▶ 00:03  ▶| ↶ ↷ [del ⋯]  v ? ✎ ⚙ ⇪ ⛶│ #transport (+ #t-home, #t-sel, #t-far)
│ [Elements|Shape|Media|   │ ruler ──────────────│─────────────────────── │
│  Audio|Template]         │ ◉ A  [clip A ████] │                         │ #timeline
│  tiles…                  │ ◉ B    [clip B ███│███]                      │
│  (A/S/D key rail)        │ ───────────── add line (7px) ────────────── │ .tl-addrow--line
└──────────────────────────┴───────────────────────────────────────────┘
   #inspector-panel (col 1-2)       #timeline-panel (col 3)
```

- **Grid** (`styles.css:6275-6293`). `#main` sits in row 1 across columns 2-4. `#inspector-panel` sits in row 2,
  columns 1-3 (width `--insp-w: clamp(300px, 24vw, 400px)`, `:6278`). `#timeline-panel` sits in row 2, column 3. The
  band's height is `--tl-h`, and `#tl-resizer` can drag it (the resizer reaches back across the inspector, `:6388`).
- **The rail is hidden, and its buttons now live in the transport row.** `pcTransportLayout` (`js/app.js:7562-7674`)
  moves real DOM nodes and records where each came from, so the teardown can put them back when the window gets
  narrower:
  - `#t-home` on the far left: back to Home (`:7594-7596`).
  - `#t-sel`, on the right after redo: parent · delete · group · mask-group · more, shown according to the selection
    (`:7620`, `pcTransportSync` `:7676`).
  - `#t-far`, absolutely positioned at the far right: version · help · notes · cog · share · export · ⛶
    (`:7660`, `styles.css:7875`). Below 1160px it drops into a band under the row, and the panel grows by 40px
    (`styles.css:7908-7917`).
- **The inspector band** has a title row ("Add" or "Inspector", plus the project-name field `#proj-name-s`,
  `index.html:488`), then `#key-rail` (A/S/D clip keys, `index.html:491-495`, shown by `FM.timeline.syncKeyRail`
  `js/timeline.js:5306`), then `#inspector`. With nothing selected, the Add menu fills it (`variant: 'panel'`, measured
  to fit the band without scrolling, `js/addmenu.js:1003-1004`, `js/tilefit.js`). With a layer selected, the layer
  editor fills it.
- **The Add row is a 7px line** on the PC (`.tl-addrow--line`). Clicking it *deselects*, because on the PC "the add
  menu IS the inspector band whenever nothing is selected" (`js/timeline.js:3031-3035`).
- **The cog** (`#btn-settings`) opens the **canvas dialog** inside a project and **Settings** on Home
  (`js/app.js:7026-7057`).
- **Text editing** is a floating card over the stage. The inspector column collapses and the timeline stays visible
  (`styles.css:6397-6409`, `js/text-edit.js:19-29`).

### 2.3 What is the same on both

The canvas and on-canvas handles (`js/canvas-edit.js`), the transport's centre and right-hand clusters, the fixed-centre
playhead, the view and options rails, the Add menu component, the layer editor's categories, the effects browser (a
sheet that reaches up to the canvas on both, since queue 303, `js/fx-browser.js:22-30`), export, and the canvas dialog.
Ezra's rule "phone and PC work the same" already holds for *what* exists. It does not hold for *where* the Add menu and
inspector sit: on the phone they are sheets over the timeline, and on the PC a band beside it.

---

## 3. How the timeline is rendered

### 3.1 The data it draws

- A flat `FM.scene.layers` array. Index 0 is the top row and the frontmost layer (`js/compositor.js:15229`). Groups
  are layers with children linked by `parent`. A collapsed group hides its members, and **Edit Group** narrows the
  timeline to one subtree (`js/timeline.js:3403-3411` `liveGroupCtx`, `:3487-3489`).
- Each layer carries `start`, `duration`, `trimStart`, `speed`, `reversed`, `fadeIn`/`fadeOut` (**audio only**:
  `js/scene.js:1105` says "Audio fade multiplier", and `compositor.js` never reads it) and `effects[]`. Keyframes use
  absolute project time (`js/scene.js:373-380`). Base shape: `FM.makeLayer`, `js/scene.js:681-749`.
- **Audio is a `video` layer with no picture.** The inspector detects that (`js/inspector.js:3614-3618` `isAudioOnly`),
  and audio shows as a row like any other.
- **New layers go at `FM.addAt`**, the Add row's index, through the single insert function `FM.insertLayer`
  (`js/app.js:2880-2890`). **They start at the playhead**: a new media clip starts at `FM.time`, and the first clip in a
  project starts at 0 (`js/app.js:2999`). So adding clips **stacks** them. It never appends them after the last one.

### 3.2 The DOM

- `FM.timeline` is a **singleton bound to fixed ids** at `init()`: `#tl-ruler`, `#tl-tracks`, `#tl-playhead`,
  `#tl-inner`, `#timeline` (`js/timeline.js:4469-4475`). The Add menu, the inspector and the transport are all wired
  by id in the same way.
- `rebuild()` (`js/timeline.js:5210`) empties `#tl-tracks` and redraws everything, with `buildTracks()`
  (`:3441-3522`) doing the work:
  - an empty project → only the Add row (`:3474-3481`);
  - for each visible layer, a `.track-row` = `buildHead` (eye, name, group chevron; `:1344`) + `buildLane`
    (`:2026`) + the `≡` reorder handle `buildDragHandle` (`:1614`, not built in the phone's solo view, `:3506`);
  - the Add row, inserted before the row at `FM.addAt` (`:3511-3521`, built by `buildAddRow` at `:2946`). It is a real
    slot in the reorder model: rows open around it, and it can be dragged (`:1636-1870`, `:3107-3400`).
- **It refuses to redraw during a live gesture.** A clip move, trim, keyframe drag, slip or reorder sets
  `rebuildPending`, and the redraw runs at the end of the gesture (`:5212-5220`). 90 call sites outside the file call
  `FM.timeline.rebuild()` (grep count), so this is the de facto "the scene changed, redraw" signal.

### 3.3 A clip (`buildLane`, `js/timeline.js:2026-2790`)

- `.clip` at `left = PAD + start × pxPerSec`, `width = max(8, duration × pxPerSec)` (`:2037-2038`). Its colour comes
  from `clipColorOf` (`:493`), or from a keyframed colour gradient (`:2045-2054`).
- Inside it: a name label, a speed badge (`:2090`), a **filmstrip** for video (`:2139`), a **waveform** for audio
  (`:2171`), **caption cue chips** with their own trim grips (`:2501-2606`), and **keyframe dots** (`:2663-2671`).
- **Moving a clip:** with a mouse, the drag starts at once (`:2276-2287`). With touch, a tap selects and a hold of
  **350ms** picks the clip up (`:2190-2240`). Dragging moves the whole selection together, and locked or Viewer clips
  never move (`:2200`, `:2283`). The move itself is `applyClipMoveAt` (`:4110`). It snaps (`snapStart` `:639`) and
  it scrolls when you reach an edge (`:4217`).
- **Trimming:** a grip on each edge (`:2291-2345`) → `applyTrimAt` (`:3842`), with a readout while you drag
  (`:3743-3840`). The head trim also shifts caption cues and the effects clock (`FM.trimLayerHead` `:4033`).
- **Slip** (moving the source window inside the clip) has a ghost preview (`:2433-2470`, `:1006-1068`).
- **Right-click** opens the layer menu (`FM.layerMenuItems`, `js/app.js:5147`). **Double-click** opens Element
  Properties (`:2289-2290`).
- **Clip ops** (the A/S/D keys, the key rail and the inspector's action row) all use `clipOpAction` / `clipKeyAction`
  (`js/timeline.js:185-213`): trim left to the playhead, split, trim right, move the clip to the playhead, or extend it
  to the playhead. **None of these ripple.** `clipTrimStart` moves `start` forward and leaves a gap (`:86-108`).
- **Split** is `FM.splitLayer` (`js/app.js:4855`). It clones the layer, divides the source (aware of speed ramps and
  reverse), gives the outer fades to the outer halves, carries the effects clock on to the second half, and stamps a
  shared `splitOf` so child layers keep following. It works on video, image, text and shape only.

### 3.4 The playhead, the ruler and scrolling

- **The playhead is fixed at the centre of the screen on both layouts.** `#tl-centerline` (`index.html:609`) is pinned
  by CSS at `left: 50vw`. The JS never moves it. `updatePlayhead()` (`js/timeline.js:5355`) scrolls `#timeline` so that
  `FM.time` sits under it, and a scroll by the user drives `FM.time` the other way (`:17-21`). `PAD` is the left padding
  that lets t=0 reach the centre (`:11-16`).
- **Zoom** is `pxPerSec() = laneViewW / SPAN_AT_ZOOM1 × zoom` (`:1096`). You can pinch, use the ⛶ rail buttons, or
  press the keyboard keys (`setZoom` `:5433`). Flings keep coasting, tuned in pixels so they feel the same at every zoom
  (`:3522-3620`).
- A tap on the ruler adds or removes a marker ("benchmark"). Markers are also snap targets (`:649-671`).

### 3.5 What this means for a CapCut-style timeline

The row model is "one layer, one row, every row equal". CapCut's model is a spine (the main track) plus lanes for
overlays, text, audio and effects (`capcut-mobile.md` §2). The current `buildTracks` loop has no idea of a lane holding
*several* layers, a ripple, or a join between clips. **So `timeline.js` is not something a simple timeline should be
built inside.** A new renderer is simpler. It can reuse the helpers: `pxPerSec`/`timeToX` (`FM.timeline.timeToX`
`:4359`), `snapT`, `drawFilmstrip` (`:990`), `drawWaveform` (`:961`), `clipColorOf`, the fixed-centre playhead and
the momentum code. Those helpers are module-private today, apart from `timeToX` and a few seams, so they would need
exporting.

---

## 4. How the Add menu and the inspector are organised

### 4.1 The Add menu (`js/addmenu.js`, 1524 lines, one component in two places)

Mounted by `FM.addMenu.render(container, { variant })` (`:966-1000`):
- **PC:** in the inspector when nothing is selected (`js/inspector.js:6904-6919`, `variant: 'panel'`).
- **Phone:** in `#add-sheet` (`js/mobile.js:386-446`, `variant: 'sheet'`).
- It remembers the last tab. Keys 1–5 open a tab, and Shift+1–4 add Text, Captions, Sketching or Custom shape at once
  (`js/app.js:8761-8765`).

| Tab (order, `TABS` `:219`) | Options |
|---|---|
| **Elements** (`:238-325`) | Text · Captions · Sketching · Custom shape (the four `INSTANT` tools, `:174-217`) · Camera · Controller (a null) · Adjustment · New group · Custom elements (saved elements) |
| **Shape** (`:326-376`) | Square, Squircle, Rectangle, Ellipse, Triangle, Star, Heart, Hexagon, Pentagon, Diamond, Plus, Pie, Semicircle, Arc, Ring, Arrow, Chevron, Trapezoid, Parallelogram, Line, Polygon, plus generated polygons |
| **Media** (`:377-463`) | Import media (the shared `#file-input`), the media library (recent imports, `FM.mediaLib`), Sample clip, AI Scene, Assistant |
| **Audio** (`:464-516`) | Import audio (a video picked here gives only its sound), the audio library, Sound effects (synthesised, `js/sfx.js:8-15`), Record voice |
| **Template** (`:517-625`) | Your saved templates (`FM.templates.list()`, `js/storage.js:3063`) → `insertInto` (`:3333`). An empty panel explains how to make one. |

### 4.2 The inspector (`js/inspector.js`, 7078 lines)

- `refresh()` (`:6862`) rebuilds the whole panel on every edit. The only exception is the scroll position, which is
  kept within one view.
- **No selection** → the Add menu (above). **One layer** → `view === 'home'`: the **action row** `quickRow` (`:3374`:
  move or extend to the playhead, trims, split and more, depending on which side the playhead is) plus the **category
  grid**. With **two or more selected**, the multi-select actions show instead.
- **The categories** (`CATEGORIES`, `:2492-2546`), filtered per type by `catsFor` / `catsForBase` (`:3620-3662`):

| Key | Label | Shown for |
|---|---|---|
| `color` | Colouring | visual layers |
| `border` | Outline & Shadows | visual layers |
| `blend` | Mixing (opacity + blend families, `:5909-5935`) | all but camera |
| `transform` | Position / Scale (with keyframes and easing) | all |
| `speed` | Speed (with speed-ramp keyframes, `:5756`) | all but camera |
| `volume` | Volume + fades + audio effects | video and audio only |
| `element` | Element Properties (edit shape, crop, replace media; text opens the text editor) | per type |
| `editgroup` | Edit Group | groups only |
| `captions` | Captions (cue list, `FM.captionsEditor`) | text and caption tracks |
| `presets` | Presets (saved looks, search and tags, `:6001`) | most |
| `effects` | Effects, with three tabs: **visual / filters / audio** (`fxTab`, `:2473`, `:6818-6819`) | all |
| `cameraopts` | Camera Options | cameras only |

  Audio-only layers get just Speed · Volume · Effects (`:3646`). Text, shape and image drop Volume, which leaves a
  clean 3×3 (`:3659`).
- **Opening a category:** `FM.inspector.openCategory(key)` (`:6818`) also accepts `'filters'` and `'audiofx'`, which
  open the Effects view on that tab. `openCategoryByIndex` (`:6837`) handles the number keys.
- **Full-screen browsers the inspector opens:**
  - `#fx-browser`, the effects browser: search, featured, recents, favourites, and category banners (`js/fx-browser.js`,
    `FM.fxBrowser.open(layer, opts)` `:1889`). ~188 effect types (`js/compositor.js:50-1400`) in 12 categories:
    Colouring · Blur · Warping · Generative · Stylize · Drawing/Edge · Shakes/Movement · Repetition · Keying ·
    Opacity/Visibility · Text · 3D (`js/fx-registry.js:150`, labels `:120-139`).
  - `#afx-browser`, audio effects: 24 types including EQ, reverb, delay, compressor, pitch, telephone and vocal remove
    (`js/audio-fx.js`, `js/audio-fx-browser.js:352`).
  - The **filters** view inside Effects: 56 filters in 8 sections (Cinematic, Vivid, Glow, Mono, Retro, Stylised,
    "tuff", Custom; `js/filters.js:71+`). A filter is an ordinary filter-container effect with a Strength control
    (`FM.filters.makeInstance`, `:610`).
  - The elements browser (`js/elements-browser.js:165`) and template-fill "Insert your media"
    (`js/template-fill.js:292`).

---

## 5. Where a second editing UI could be mounted

| Option | How | For | Against |
|---|---|---|---|
| **A. A sibling timeline in `#timeline-panel` (recommended)** | Add e.g. `<div id="sm-timeline">` beside `#timeline` in `#timeline-panel` (`index.html:591`). Hide one or the other with a body class (e.g. `body.ed-simple #timeline {display:none}`). A new `js/simple-timeline.js` renders spine + lanes. `FM.timeline.rebuild()` / `updatePlayhead()` dispatch to it while the class is on. | Stage, canvas handles, transport, `#tl-centerline` (already CSS-pinned, so it works for any content beneath it), text editor, browsers, export, the canvas dialog and collab chrome are all shared. The panel's grid row (`styles.css:2432`) already sizes whatever sits there. The 90 `rebuild()` callers need no change. | Every module that queries `.track-row` / `.clip` / `#tl-tracks` directly (collab presence's remote playheads, `FM.timeline.timeToX`, the dock code in `mobile.js:282-289`) must learn about the second DOM, or be told to stand down. |
| **B. A render mode inside `timeline.js`** | A branch in `buildTracks` (`:3441`) that groups layers into lanes. | One file owns every timeline gesture. | That file is 5,452 lines, and its gesture state (`clipMove`, `trimDrag`, `reorderActive`, the Add row's slot maths `:1636-1870`) assumes one row per layer. Ripple and lanes would thread through all of it. High risk, for a UI that wants different gestures anyway (ripple trim, drag to reorder the spine). |
| **C. A second `#app`** | Duplicate the whole editor shell. | Total isolation. | Everything is wired by id (`FM.timeline.init`, `FM.inspector`, `pcTransportLayout`), so this duplicates the app. Rejected. |

**The inspector side for option A:**
- **Phone.** CapCut's bottom toolbar (Edit · Audio · Text · Effects · Overlay · Captions · Ratio · Background · Filters
  · Adjust · Stickers, `capcut-mobile.md` §4) would replace the **Add row** as the way in. It could open the existing
  `#add-sheet` with a **filtered** Add menu, or with new simple panels. The layer editor sheet (`#inspector-panel`,
  docked by `dockSheet`) can host simple panels built from existing category builders, reached through
  `FM.inspector.openCategory('speed' | 'volume' | 'filters' | 'effects' | …)`.
- **PC.** The inspector band (row 2, columns 1-3) becomes the simple toolbar and its panels. The same two seams apply:
  `FM.inspector.refresh()`'s **no-selection branch** (`js/inspector.js:6904-6919`, where the Add menu mounts today) and
  **`catsFor`** (`:3620`, the one place the per-type category list is decided; a mode filter fits there).
- **The Add menu seam.** `FM.addMenu.render(container, opts)` has no tab filter today. A `tabs`/`exclude` option
  applied to `TABS` and the Elements list (`js/addmenu.js:219`, `:247-325`) would let simple mode hide Camera,
  Controller, Adjustment, New group and Custom shape without forking the component. **Design question:** CapCut splits
  "add" by category (Audio → music, Text → text, Overlay → media on top). FreeMotion's Add menu splits by *what the
  thing is*. Whether simple mode keeps the tabbed menu or opens one category at a time is for step 2.

**Hazards a mounted simple UI must respect** (each one already bit the app once):
- **Body classes that take over layout:** `m-editing`, `sel-mode`, `sel-multi` (`js/app.js:949-951`),
  `text-editing` and `drawing` (`styles.css:3858-3872`, `:6390-6418`), `add-open`, `insp-open`. Simple mode must say
  what each means for it.
- **`pcTransportLayout` moves buttons** into `#t-home` / `#t-sel` / `#t-far` and records where each came from
  (`js/app.js:7562-7674`). A simple layout that moves the same buttons must use that record, or the teardown will put
  them back in the wrong place.
- **`FM.refreshAll` is wrapped** by `mobile.js` (`:329-339`), and `refreshAll` itself (`js/app.js:878-907`) calls
  the inspector, the timeline, the readout, the top bar, the notepad, the selection chrome and the PC transport, in that
  order. Any new UI must hook into that chain rather than beside it.
- **Keyboard shortcuts assume the complex editor.** 1–5 open Add tabs, Shift+1–4 add tools, and A/S/D run the
  non-ripple clip ops (`js/app.js:8761-8814`).
- **Collab read-only gates** live inside the doors themselves, e.g. `openAdd` refuses for a Viewer
  (`js/mobile.js:399-402`) and clip moves refuse through `roNow()` (`js/timeline.js:2200`, `:2283`, `:2329`). New doors need
  the same guard. `fm-collab.md` covers the model.

---

## 6. What a simple editor can reuse

"As-is" means: call the existing entry point and get working, correctly styled behaviour on both layouts.

| Component | Entry point | Reuse | Notes |
|---|---|---|---|
| Canvas preview + render loop | `FM.requestRender` (`js/app.js:123`), `FM.renderScene` (`js/compositor.js:15989`) | **As-is** | Renders the scene whatever UI edits it. |
| On-canvas move / scale / rotate | `js/canvas-edit.js` | **As-is** | CapCut's drag-and-pinch on the preview is the same idea. |
| Transport, play, undo/redo | `#transport`, `FM.play`/`FM.pause` (`js/app.js:2454`, `:2580`), `js/history.js` | **As-is** | The left cluster (options ⋯, layer menu, Add-row switch) is complex-only. |
| Fixed-centre playhead | `#tl-centerline` + CSS | **As-is** | CapCut uses the same model. |
| Media import + library | `#file-input`, `pickFiles` (`js/addmenu.js:61-70`), `FM.mediaLib.use` (`js/medialib.js:168`), `FM.addMediaLayer` (`js/app.js:2972`) | **Adapt** | Import is reusable. **Where the clip lands is not**: it starts at the playhead on a new stacked layer (`:2999`). Simple mode needs "append to the spine" or "insert at the playhead and ripple". |
| Add menu | `FM.addMenu.render` | **Adapt** | Needs a tab and option filter (§5). The Shape and Template tabs work as they are. |
| Effects browser | `FM.fxBrowser.open(layer)` (`js/fx-browser.js:1889`) | **As-is** | Already a sheet that stops at the canvas on both layouts. The 3D, Keying and Repetition categories may want hiding (design question). |
| Filter library | `FM.filters.all/bySection/makeInstance` (`js/filters.js:563-627`) | **Data as-is; UI adapt** | The browsing UI is the inspector's Effects view on the `filters` tab (`openCategory('filters')`). A CapCut-style strip of filter thumbnails would need a small new picker over the same data. |
| Colour adjust | Colouring effects (`js/fx-registry.js:11-47`), adjustment layer | **Adapt** | CapCut's Adjust is one panel of sliders. Here that is several separate effects. A simple "Adjust" panel could be a preset stack of brightness, contrast, saturate, exposure, temperature and so on. |
| Text editor | `FM.textEdit.start(layerId)` (`js/text-edit.js:698`) | **As-is** | Full-screen on the phone, a floating card on the PC. Align · Font · Size · Colour + Done. |
| Text styling / animation | Inspector `color`, `border` and `element` for text; `textAnim` presets (`js/compositor.js:2592-2601`) | **As-is via `openCategory`** | In presets exist for text: fade, fade-up, typewriter, pop, slide, drop, wave. |
| Captions | `FM.addCaptionLayer` (`js/app.js:3418`), `FM.captionsEditor.mount(container, layer)` (`js/captions.js:337`), `detectRow` (`:467`) | **As-is** | Cue times are local to the layer, so cues move with their clip (`js/captions.js:37-39`). Detection gives **timing only**, not words. |
| Speed, volume, fades, reverse, replace, extract audio, flip | Inspector `speed`/`volume`; `FM.replaceMedia` (`js/app.js:4658`), `FM.extractAudio` (`:1007`), `FM.flipLayer` (`:1004`) | **As-is** | Speed with ramps; fades are audio only. |
| Crop, masks, chroma/luma key | `js/crop-tool.js`, `js/mask-tool.js`, the `chromakey`/`lumakey` effects | **As-is** | |
| Split | `FM.splitLayer` (`js/app.js:4855`) | **As-is** | The two halves are contiguous, so a spine stays gapless. |
| Trim / move / extend ops | `js/timeline.js:86-170` | **Complex-only** | They leave gaps. Simple mode needs ripple versions. |
| Export | `#btn-export` → `showExportDialog` (`js/app.js:5529`, `:6887`); `FM.exporter` (`js/exporter.js:1159`) | **As-is** | The export options "Export just this layer" and "Selected clip only" are complex-flavoured, but harmless. |
| Canvas settings (ratio, resolution, fps, background) | `FM.openCanvasDialog` (`js/app.js:8319`, `:8424`), `#canvas-dialog` (`index.html:957-1041`) | **As-is** | This is CapCut's Ratio and part of Canvas. It also holds the Friends (collab) block. |
| Templates | `FM.templates.insertInto` (`js/storage.js:3333`), `FM.templateFill.open` (`js/template-fill.js:292`), Home's Templates tab | **As-is** | User-made only. Nothing ships with the app. |
| Sound effects, voice recording, audio effects | `FM.sfx.open` (`js/sfx.js:726`), `FM.voiceRec.open` (`js/voice-rec.js:455`), `FM.audioFxBrowser.open` | **As-is** | |
| Tracker (follow a point) | `js/tracker.js` | **As-is, optional** | Writes x/y keyframes. |
| **Complex-only** | the per-layer timeline rows, the Add row and its switch, ≡ reorder, group chevrons and Edit Group (`FM.enterGroup` `js/app.js:4127`), keyframe dots and the graph editor (`js/graph-editor.js`), motion paths, parenting, camera (`FM.addCameraLayer` `:3395`), controller/null (`:3097`), adjustment layer (`:3407`), masking groups, point edit, the vector pen, audio-react, the 3D effects category, blend-mode families, the Presets category (saved looks) | — | Hide them, or reach them only through "open in the full editor". |

---

## 7. Where a mode switch could live

| Place | Where in code | Reach | Fit |
|---|---|---|---|
| **New project dialog** | `#hm-dialog` (`index.html:711-767`), `createFromDialog` (`js/home.js:2893-2909`) → `FM.projects.create(opts)` (`js/storage.js:2540`) | Once, at creation | **Good for "how a project starts".** Two big choices at the top ("Simple / Full") before Name. `create` already copies optional flags onto both the document and the index card (`sizePicked`, `ofElement`, `templateDraft` at `:2554-2595`), so `mode` would travel the same way. The project sanitiser (`sanitizeProjectFields`, `js/storage.js:1028-1070`) would need a line rejecting anything that is not a known value. |
| **Home cards** | `projectCard` (`js/home.js:1351`); meta chips `:1375-1379`; the ⋯ menu `:1384+` | Every project | **Good for showing it.** A "Simple" chip beside aspect · res · fps · layers, and "Open in simple / full editor" in the ⋯ menu. The index record (`js/storage.js:2585`) would carry `mode` so Home does not have to read each document. |
| **The cog → canvas dialog** | `#canvas-dialog` with `#cv-mini` (Canvas · App settings) and `#cv-friends` (`index.html:1019-1040`); opened by `m-settings` (`js/mobile.js:362`) and `btn-settings` (`js/app.js:7026`) | One tap from inside any project, on both layouts | **Good for a project-level switch.** It already groups "this project's settings" with Friends, which matters if the mode affects collab. |
| **Phone top bar** | `#topbar-m` (`index.html:337-409`) | Always visible | **Risky.** Queue 139: any extra control "shifts the settings cog sideways into the spot the delete bin occupies in select mode". The bar is full. |
| **PC transport `#t-far`** | `js/app.js:7660` | Always visible | Full already. Below 1160px it spills into a second band (`styles.css:7908-7917`). |
| **Over the stage, top-left** | The spot the PC project-name field used to float in (`styles.css:6347-6350`, now hidden, `:7937`) | Always visible, one tap | A possible home for a quick switch pill on both layouts. It needs a design pass against the canvas handles and guides. **UNVERIFIED** whether it collides with anything. |
| **The view rail** | `#view-bar` (`index.html:429-469`) | Two taps (⛶ then the button) | Holds view toggles, so a UI mode is thematically close. It is out of sight by default. |

**How the state could be stored:** `project.mode` (the project's default editor) plus an index field, created through
`FM.projects.create`. Whether the *view* can differ per device (a complex-mode user and a simple-mode user on the same
live project) is a design decision for step 2. It interacts with collab presence (`fm-collab.md` §0 suggests adding
`mode` to presence). Nothing today stores a per-project UI preference apart from the notes and help panel sizes (#968).

---

## 8. FreeMotion's features mapped onto CapCut's categories

Legend: **Exists** (a comparable feature is there), **Partial** (some of it, or a different shape), **Missing**.
The CapCut sub-features come from `capcut-mobile.md` §4-§10 and the two pages under Sources.

| CapCut category | CapCut contents (short) | FreeMotion | Where / what is missing |
|---|---|---|---|
| **Edit** (clip toolbar) | split, speed (normal + curve), volume, delete, duplicate, replace, crop/rotate/mirror, reverse, freeze, extract audio, mask, chroma key, remove BG, stabilise, opacity, animations | **Partial** | **Exists:** split (`js/app.js:4855`), speed with ramps (`js/inspector.js:5756`), volume, delete, duplicate (`#m-dup`), replace (`js/app.js:4658`), crop (`crop-tool.js`), flip (`js/app.js:1004`), rotate (transform), reverse (`:5197`), extract audio (`:1007`), masks (`mask-tool.js`), chroma/luma key, opacity (Mixing). **Missing:** freeze frame (no match in the code), stabilise, background removal (no segmentation), and clip In/Out/Combo animations for video and images (only keyframes and the Opacity/Visibility effects). **Missing: ripple.** Every edit leaves gaps (§3.3). |
| **Audio** | music library, device audio, sound effects, extract, record, fades, beats, voice effects, reduce noise | **Partial** | **Exists:** import audio (a video gives its sound), extract from a video clip, sound effects (synthesised, `js/sfx.js`), record voice (`js/voice-rec.js`), volume with keyframes, audio fades, 24 audio effects incl. pitch / telephone / vocal remove (`js/audio-fx.js`). **Missing:** a music library, beat markers (audio-react follows loudness, `js/audio-react.js`, but makes no markers), noise reduction or voice enhancement. |
| **Text** | add text, text templates, styles, In/Out/Loop animation, text-to-speech | **Partial** | **Exists:** text editor (`js/text-edit.js`), font, colour, stroke, shadow, background plate, curve, per-unit In animations (`js/compositor.js:2592-2601`), text effects category (counter, typewriter-like and others), keyframes. **Missing:** a shipped text-template library (user-saved elements only), text-to-speech, bubbles. |
| **Stickers** | a sticker/GIF/emoji library | **Partial** | Shapes (21 + polygons), Sketching (a freehand pencil), user-saved **Custom elements** (`js/elements-browser.js`). **Missing:** any shipped sticker, GIF or emoji library. |
| **Overlay** | media on top of the main track, with blend and opacity | **Exists** (it is the core model) | Every layer above another is an overlay. Blend families and opacity (`js/inspector.js:5909-5935`), masks, keying. What differs is the *presentation*: FreeMotion has no main track, so there is no "overlay" as a separate idea. |
| **Effects** | video effects, body effects | **Exists / Partial** | ~188 effect types in 12 categories, with search, favourites and presets (`js/fx-browser.js`, `js/fx-registry.js`). **Missing:** body effects (need person segmentation). This is also the *most* complex surface: 3D, Keying and Repetition are After Effects-grade. |
| **Filters** | one-tap looks + intensity | **Exists** | 56 filters in 8 sections, Strength, favourites (`js/filters.js`). Reached via Effects → Filters tab. |
| **Adjust** | brightness, contrast, saturation, exposure, temperature, highlights/shadows, sharpen, vignette… as one panel | **Partial** | Every control exists as a separate Colouring or Blur effect (`js/fx-registry.js:11-47`), and the **Adjustment layer** grades everything beneath it. **Missing:** one combined slider panel, HSL, curves, LUT import. |
| **Ratio** (Aspect ratio / Format) | ratio presets | **Exists** | Canvas dialog aspect chips 16:9 · 9:16 · 4:5 · 1:1 · 4:3 · Custom, resolution, fps (`index.html:963-991`), plus "Scale the layers to fit". The New project dialog has the same choices (`index.html:717-760`). |
| **Canvas** (Background) | colour, image, blur behind the frame | **Partial** | Solid colour or transparent (`index.html:992-1000`). A blurred background exists only per layer, as the "Fill Behind" effect in Blur (`js/fx-registry.js:142` comment). **Missing:** an image background, and a one-tap "blur behind all clips". |
| **Captions** | auto captions (speech to text), templates, batch edit | **Partial** | Caption tracks with timed cues, full text styling, a cue list editor, and ‹ › cue navigation in the text editor (`js/captions.js`). **Auto-detect finds speech *timing* only; there is no transcription** (`js/captions-vad.js:4`). **Missing:** speech-to-text, caption style templates, SRT import (**UNVERIFIED**: I did not search the import code for SRT). |
| **Templates** | a browsable library of templates you fill with your own clips | **Partial** | Home → Templates tab, Add → Template tab, "Insert your media" slot-filling (`js/template-fill.js`), which keeps the timing and effects. **Missing:** shipped templates (all are user-made). |
| **Transitions** (on the cut between main-track clips) | a library of transitions | **Missing** | No clip-to-clip transitions. The nearest things are overlapping two layers by hand with opacity keyframes, or the Dissolve and Block Dissolve effects (`js/fx-registry.js:46`). Transitions need an idea of "the cut between A and B", which only a spine gives. |
| **Keyframes** (CapCut has them, hidden under the preview) | per-item diamonds | **Exists (far deeper)** | Per-property keyframes, easing graph, motion paths, speed ramps. Keyframe times are **absolute** (`js/scene.js:373-380`), which `fm-collab.md` flags as the main hazard for rippling. |
| **Extras FreeMotion has and CapCut's simple tier does not** | — | — | Parenting, cameras, controllers, groups and masking groups, point editing, a vector pen, motion tracking, audio-react, 3D effects, AI Scene and Assistant (BYOK). These are the "complex-only" list in §6. |

---

## 9. Answers in one line each (for the design panel)

- **Phone vs PC today:** one 700px width breakpoint. The layouts share DOM and differ in grid placement plus a few
  sheets. A phone held sideways gets the PC layout.
- **Transport row:** shared on both. On the PC, the old rail's buttons are moved into it at load.
- **Timeline:** one row per layer, no lanes, no ripple, fixed-centre playhead, full redraw on `rebuild()`.
- **Add row:** a movable insertion point (`FM.addAt`) between rows. On the phone it opens the Add sheet; on the PC it
  deselects so the Add menu shows.
- **Add menu:** five tabs, one component, mounted in the PC inspector and the phone sheet.
- **Inspector:** a clip action row plus up to 12 categories filtered per layer type. Effects has visual, filters and
  audio tabs.
- **Mount point for a simple UI:** a sibling of `#timeline` in `#timeline-panel`, a body class, `rebuild()` /
  `updatePlayhead()` / `inspector.refresh()` as the dispatch seams, and `catsFor` plus a new Add-menu tab filter to
  trim the choices.
- **Mode switch:** creation → New project dialog. Display → Home card chip and ⋯ menu. Quick switch in a project → the
  cog's canvas dialog (one tap on both layouts), or a pill over the stage (needs a design pass). Not the phone top bar.
- **Biggest gaps against CapCut:** ripple and a spine, transitions, clip animations, freeze, stabilise, background
  removal, speech-to-text captions, a music, sticker or template library.

---

## 10. Unverified or not checked

- No layout number here was measured. Grid tracks, widths and heights are read from the CSS. Real boxes at 380px and
  1280px were not captured.
- The top-left-of-stage position for a switch pill: I did not check it against canvas handles, guides, the view rail,
  collab presence cursors or the phone's safe area.
- SRT import: not searched for.
- The effect count (~188) counts `{ type: '…' }` entries in `FM.EFFECTS` (`js/compositor.js:50-1400`). Some are
  hidden (`hidden: true`), so the number the browser shows is somewhat lower. I did not compute the exact visible count.
- The audio-only fade finding rests on `js/scene.js:1105` plus a grep showing that `compositor.js` never reads
  `fadeIn` / `fadeMul`. A comment in `FM.splitLayer` (`js/app.js:4877`) talks about fading "the picture". It reads as
  describing the audio path, but I did not confirm it by running the app.

## Sources

- CapCut feature and timeline facts: sibling note `tools/design/plans/simple-mode/research/capcut-mobile.md`
  (§2, §4, §5, §7, §9, §10, each with its own sources).
- CapCut, "How to Use CapCut": <https://www.capcut.com/resource/how-to-use-capcut>
- Envato Tuts+, "How to Quickly Use CapCut for Video Editing (Tutorial, 2025)":
  <https://photography.tutsplus.com/tutorials/how-to-quickly-use-capcut-for-video-editing-tutorial-2024--cms-108707>
- FreeMotion collab internals: sibling note `research/fm-collab.md`.
