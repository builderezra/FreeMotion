# Next session — the live queue

Read this first if the session starts with "keep going", "go", or a vague pick-up.
Top to bottom is the order Ezra asked for. **v4.76, everything below is unbuilt.**

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
- **v4.75 — Edit Points no longer closes on a missed tap** (miss is swallowed; touch target 14px -> 26px).
- **v4.76 — tick smoothed** (no point moved; only the end points marked smooth).
- **BUG-HUNT.md** — 74 findings, 69 confirmed, from a 22-agent hunt. Nothing in it is fixed yet.

---

## The queue

### 1. Motion blur for the OBJECT, not just the footage  — AND  ### 3 below are ONE job
*"I'm only seeing motion blur footage, we need a motion blur for the actual object like we discussed."*

**MEASURED 2026-08-10 — the object blur ALREADY EXISTS AND WORKS.** `layer.motionBlur`
(js/inspector.js:2519, the Move & Transform toggle) genuinely smears the layer's own transform motion.
Test: a 60px white square keyframed x 40->280 over 2s, sampled at t=1, shutter 0.9, 12 samples —
lit span 60px -> 64px with 6 partially-lit pixels along the centre row. 4px is the CORRECT physics
(120px/s * 0.9/30fps = 3.6px), not a bug.

So **item 3's premise is wrong — do NOT just delete the toggle**, that would remove a working feature.
The real problem is DISCOVERABILITY: Ezra looks in the Effects list, where he finds only
`motionflow` "Motion Blur (Footage)" (compositor.js:435) and `motionblur` "Directional Blur" (:311).
The object blur is a checkbox hidden in Move & Transform.

**The job:** surface the existing transform blur in the Effects list as its own entry (e.g. "Motion
Blur (Object)") sitting beside Motion Blur (Footage), driving the same `layer.motionBlur` state so
old projects keep working — then remove the Move & Transform toggle (item 3) because the control
has MOVED, not vanished. Fix the cross-reference in motionflow's description too, which currently
points at "Motion Blur in Move & Transform".

### 2. Every individual slider gets its own keyframes
*"The key frames are still not as individual as I want. Every single Individual slider needs to have
its own key frames. For instance — moving the clip around and zooming in the clip in move and
transform need to be seperate."* Today position and scale share a keyframe track. Each slider
(x, y, scale/scaleX/scaleY, rotation, skew, anchor…) needs an independent one. **Big job** — touches
`js/inspector.js` (the ◆ per row), `FM.animatedProps` in `js/scene.js`, and the timeline's keyframe
rows. Note BUG-HUNT's confirmed finding: `deleteKeyframesAt`/`propKey` already cover FEWER containers
than `animatedProps`, so the delete/copy paths need to be part of this, not an afterthought.

**DECIDED 2026-08-10 (asked Ezra directly): EVERY slider fully separate, INCLUDING X and Y.** Not
Position-as-one. So x, y, scale/scaleX/scaleY, rotation, skewX/skewY, opacity, anchor each get their
own independent keyframe track and their own diamond. He was shown the trade-off (a diagonal move now
needs a keyframe on both X and Y) and chose full separation anyway — do not quietly re-merge them.
Old projects must keep playing: migrate lazily rather than rewriting saved scenes on load.

### 3. Remove the motion blur toggle in Move & Transform
*"pretty sure it doesn't even work."* Verify first, then remove it (don't just hide it).

### 4. Elements tab — a real browser, not a loose list
*"make sure all the elements are grouped together and not siting loose in the same menu that holds
camera and all that, you need to press a button that opens up a new menu that is like the effects
menu but for your elements, and has search and all that."* So: Elements tab keeps Camera / Null /
Adjustment / Empty group, and the user's saved elements move behind one button that opens a
full browser modelled on `js/fx-browser.js` — grid, search, categories.

### 5. Tiles effect — only repeats what's on the canvas
*"if I move the clip off screen the tiles only duplicate what's on the actual screen/canvas."*
Screenshot: `~/.claude/uploads/a8308134-d9f7-4702-8894-2d76d40f5bf3/3835f848-IMG_2372.PNG` — shows
blank/partial tiles instead of the clip repeating. The tile source is being sampled from the composited
frame rather than from the layer's own plate, so anything outside the canvas is simply missing.
This has been "fixed" twice before (v2.35-era gap, and "Tiles should repeat beyond the visible frame")
— so verify the actual sampling source this time, don't trust the earlier fix.

### 6. Freehand drawing is buggy and moves the canvas
*"still really buggy and puts the canvas in a weird spot."* `js/draw-tool.js` plus the
`body.drawing` CSS (which collapses `#app` to a single row). Needs reproducing and watching, not
reading — and now also needs checking against the Studio layout, where the stage geometry differs.

---

## How to work here

- **The projects on this machine are all throwaway tests** — Ezra, 2026-08-10: *"I honestly don't care
  if you wreck any of my projects at the moment, none of them are anything more than tests."* So tests
  and harnesses may add, mutate and delete layers freely; still restore state in a `finally` out of
  basic hygiene, but don't skip a worthwhile test to protect a project.
- Verify by RUNNING, not reading — the harness lesson has paid off repeatedly. Mutation-check every
  new test assertion: three in a row this session looked fine and could not actually fail.
- `index.html`'s version label is the source of truth. Bump it, bump the `?v=` on every file touched,
  add a POLISH-LOG line, commit locally. Ezra pushes via GitHub Desktop.
- Mobile check at ~380px on anything visual, unprompted.
