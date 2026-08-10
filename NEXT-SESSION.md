# Next session — the live queue

Read this first if the session starts with "keep going", "go", or a vague pick-up.
Top to bottom is the order Ezra asked for. **v4.74, everything below is unbuilt.**

Standing: Ezra is working on the **PC Studio layout** now — *"from now on going to be talking mainly
about pcs studio layout, so just dont change the other versions layout."* Classic desktop and the
phone layout are off-limits unless he asks. (Bug FIXES on phone are of course still wanted — the
audio import fix below was one.)

---

## Done this session (for context, not to redo)

- **v4.71 / v4.72 — desktop Studio layout.** Settings → Layout → Classic / Studio. Left rail (stops at
  the canvas, not the full height), editing panel docked beside the timeline, band runs edge to edge.
  Pure grid re-placement of four regions that are all direct children of `#app`; ONE `#inspector-panel`
  node, never duplicated. Regression test `studio-layout`.
- **v4.73 — audio import on phone.** Was silently dropping the file: `handleFiles` classified by
  `file.type` only, and phones hand back an EMPTY type for .m4a/.flac/.opus. Now falls back to the
  extension (`FM.mediaKind`). Also narrowed the picker's `accept` for the audio entry, because iOS
  greys audio out in Files when the accept list also carries `image/*`/`video/*`.
- **v4.74 — car shape tyres.**
- **BUG-HUNT.md** — 74 findings, 69 confirmed, from a 22-agent hunt. Nothing in it is fixed yet.

---

## The queue

### 1. Edit points — tapping the canvas closes the edit menu
*"When I'm trying to edit points on a shape and I tap on the canvas to select the point it just closes
the edit menu."* Tapping a point should SELECT it and keep the panel open. Look at `js/point-edit.js`
and whatever canvas pointer handler treats a tap as "deselect / close panel" — the point-edit overlay
almost certainly isn't claiming the event. Note BUG-HUNT has a confirmed finding at
`js/point-edit.js:41` (the overlay ignores flipH/flipV and the parent chain) — same file, different bug.

### 2. Tick shape — smoother, same look
*"currently it's got some jagged edges, try to keep it looking the same."* The tick is one of the six
shapes boundary-traced from stock art (see BEFORE-PUBLISHING.md §8), so it has dense, slightly noisy
points. Resample/smooth the polygon in `S.check` (js/compositor.js, near `S.car`) — keep the
silhouette, mark points smooth (`[x,y,1]`) and drop the jitter. Redrawing it from scratch would also
close the §8 tracing liability for that one shape.

### 3. Motion blur for the OBJECT, not just the footage
*"I'm only seeing motion blur footage, we need a motion blur for the actual object like we discussed."*
Related to the long-standing task #48: transform blur can't smear effect- or camera-driven motion.
There should be a motion blur that smears the layer's own movement (position/rotation/scale
keyframes), listed distinctly from Motion Blur (Footage).

### 4. Every individual slider gets its own keyframes
*"The key frames are still not as individual as I want. Every single Individual slider needs to have
its own key frames. For instance — moving the clip around and zooming in the clip in move and
transform need to be seperate."* Today position and scale share a keyframe track. Each slider
(x, y, scale/scaleX/scaleY, rotation, skew, anchor…) needs an independent one. **Big job** — touches
`js/inspector.js` (the ◆ per row), `FM.animatedProps` in `js/scene.js`, and the timeline's keyframe
rows. Note BUG-HUNT's confirmed finding: `deleteKeyframesAt`/`propKey` already cover FEWER containers
than `animatedProps`, so the delete/copy paths need to be part of this, not an afterthought.

### 5. Remove the motion blur toggle in Move & Transform
*"pretty sure it doesn't even work."* Verify first, then remove it (don't just hide it).

### 6. Elements tab — a real browser, not a loose list
*"make sure all the elements are grouped together and not siting loose in the same menu that holds
camera and all that, you need to press a button that opens up a new menu that is like the effects
menu but for your elements, and has search and all that."* So: Elements tab keeps Camera / Null /
Adjustment / Empty group, and the user's saved elements move behind one button that opens a
full browser modelled on `js/fx-browser.js` — grid, search, categories.

### 7. Tiles effect — only repeats what's on the canvas
*"if I move the clip off screen the tiles only duplicate what's on the actual screen/canvas."*
Screenshot: `~/.claude/uploads/a8308134-d9f7-4702-8894-2d76d40f5bf3/3835f848-IMG_2372.PNG` — shows
blank/partial tiles instead of the clip repeating. The tile source is being sampled from the composited
frame rather than from the layer's own plate, so anything outside the canvas is simply missing.
This has been "fixed" twice before (v2.35-era gap, and "Tiles should repeat beyond the visible frame")
— so verify the actual sampling source this time, don't trust the earlier fix.

### 8. Freehand drawing is buggy and moves the canvas
*"still really buggy and puts the canvas in a weird spot."* `js/draw-tool.js` plus the
`body.drawing` CSS (which collapses `#app` to a single row). Needs reproducing and watching, not
reading — and now also needs checking against the Studio layout, where the stage geometry differs.

---

## How to work here

- Verify by RUNNING, not reading — the harness lesson has paid off repeatedly. Mutation-check every
  new test assertion: three in a row this session looked fine and could not actually fail.
- `index.html`'s version label is the source of truth. Bump it, bump the `?v=` on every file touched,
  add a POLISH-LOG line, commit locally. Ezra pushes via GitHub Desktop.
- Mobile check at ~380px on anything visual, unprompted.
