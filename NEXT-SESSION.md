# Next session — the live queue

Read this first if the session starts with "keep going", "go", or a vague pick-up.
Top to bottom is the order Ezra asked for. **v4.77, everything below is unbuilt.**

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
- **v4.77 — Motion Blur (Object) surfaced in the Effects list** (drives the existing layer.motionBlur).
- **BUG-HUNT.md** — 74 findings, 69 confirmed, from a 22-agent hunt. Nothing in it is fixed yet.

---

## The queue

### 1. Per-slider keyframes — FINISH IT (Scale rows + delete/copy parity)
**v4.78 shipped the main half**: every Move & Transform slider now has its own ◆ keying only its own
property, X and Y fully independent (verified: keying X leaves y a plain number). It needed no scene
migration — the data model always keyed one property at a time. Two pieces are LEFT:

**(a) The Scale mode rows still have no ◆.** X/Y/Z, Rotation/X tilt/Y tilt and X/Y Skew all got one
via `opts.kfKey` on `mtVBox` (js/inspector.js:1612). Scale's rows are Width/Height (js/inspector.js
~2044), which are DERIVED — `setW` writes through to scale/scaleX/scaleY rather than being a raw
transform key — so they need the mapping worked out before a ◆ can key the right channel. Do that.

**(b) delete/copy parity**, still outstanding and now more important because each slider is its own
track: `deleteKeyframesAt`/`propKey` (js/timeline.js:125-146) cover FEWER containers than
`FM.animatedProps` (js/scene.js:280-297) — BUG-HUNT confirmed it. Every new track must be individually
deletable, or you can make a keyframe you cannot remove.

The anchor sliders get NO diamond on purpose: the compositor reads anchorX/anchorY as raw numbers, so
a {kf} anchor NaNs the layer out of existence (BUG-HUNT, confirmed). Leave them alone until that is
fixed separately.

<!-- original request, kept for wording -->
### (was) Every individual slider gets its own keyframes
*"The key frames are still not as individual as I want. Every single Individual slider needs to have
its own key frames. For instance — moving the clip around and zooming in the clip in move and
transform need to be seperate."* Today position and scale share a keyframe track. Each slider
(x, y, scale/scaleX/scaleY, rotation, skew, anchor…) needs an independent one. **Big job** — touches
`js/inspector.js` (the ◆ per row), `FM.animatedProps` in `js/scene.js`, and the timeline's keyframe
rows. Note BUG-HUNT's confirmed finding: `deleteKeyframesAt`/`propKey` already cover FEWER containers
than `animatedProps`, so the delete/copy paths need to be part of this, not an afterthought.

**SCOUTED 2026-08-10 — this is a UI-ONLY change. The data model already does what he wants.**
`FM.setTransform(layer, key, value, time)` (js/scene.js) keys exactly ONE property, and
`transform.x` / `transform.y` / `scaleX` / `scaleY` are already independent `{kf:[…]}` objects. So
NOTHING in the scene format, the renderer, save/load or export needs to change, and old projects keep
playing untouched — there is no migration to write.

The grouping is entirely in the inspector:
- `MT_PROPS`  (js/inspector.js:1591) = which channels a MODE owns —
  move:['x','y','z'], rotate:['rotation','rotationX','rotationY'], scale:['scale','scaleX','scaleY'],
  skew:['skewX','skewY'], anchor:[] (anchor stays empty — a {kf} anchor NaNs the draw, see BUG-HUNT).
- `MT_PRIMARY` (js/inspector.js:1595) = which of those the ONE mode diamond keys by default —
  move:['x','y'] is exactly why moving keyframes X and Y together.
- js/inspector.js:1883 is where the diamond filters props through MT_PRIMARY.

**The job:** give every slider ROW its own ◆ that keys only its own property (via setTransform), and
stop the mode-level diamond from keying siblings. Keep the mode ◆ only if it reads as "key everything
in this mode"; otherwise drop it so there is exactly one diamond per slider. Then make
`deleteKeyframesAt`/`propKey` (js/timeline.js:125-146) cover the same property set as
`FM.animatedProps` (js/scene.js:280-297) — BUG-HUNT confirmed they already diverge, and splitting the
tracks makes that gap bite harder, since each new track needs to be individually deletable.

**DECIDED 2026-08-10 (asked Ezra directly): EVERY slider fully separate, INCLUDING X and Y.** Not
Position-as-one. So x, y, scale/scaleX/scaleY, rotation, skewX/skewY, opacity, anchor each get their
own independent keyframe track and their own diamond. He was shown the trade-off (a diagonal move now
needs a keyframe on both X and Y) and chose full separation anyway — do not quietly re-merge them.
Old projects must keep playing: migrate lazily rather than rewriting saved scenes on load.

### 2. Finish moving the object blur out of Move & Transform
*"Get rid of the motion blur toggle in move and transform, pretty sure it doesn't even work."*
**Its premise was wrong — it DOES work (measured, see v4.77).** v4.77 already added the
Motion Blur (Object) entry to the Effects list, so the ON switch has moved. What is left is the rest
of the move, so the control isn't in two places:
- give the Effects panel a row for Motion Blur (Object) when `layer.motionBlur.enabled` — shutter +
  samples, and an × that sets enabled:false (that × is how you turn it OFF now)
- then delete `motionBlurBlock` from Move & Transform (js/inspector.js:2519, called at :2552)
Do NOT delete it before the Effects row exists, or there is no way to turn it off or change shutter.

### 3. Elements tab — a real browser, not a loose list
*"make sure all the elements are grouped together and not siting loose in the same menu that holds
camera and all that, you need to press a button that opens up a new menu that is like the effects
menu but for your elements, and has search and all that."* So: Elements tab keeps Camera / Null /
Adjustment / Empty group, and the user's saved elements move behind one button that opens a
full browser modelled on `js/fx-browser.js` — grid, search, categories.

### 4. Tiles effect — only repeats what's on the canvas
*"if I move the clip off screen the tiles only duplicate what's on the actual screen/canvas."*
Screenshot: `~/.claude/uploads/a8308134-d9f7-4702-8894-2d76d40f5bf3/3835f848-IMG_2372.PNG` — shows
blank/partial tiles instead of the clip repeating. The tile source is being sampled from the composited
frame rather than from the layer's own plate, so anything outside the canvas is simply missing.
This has been "fixed" twice before (v2.35-era gap, and "Tiles should repeat beyond the visible frame")
— so verify the actual sampling source this time, don't trust the earlier fix.

### 5. Freehand drawing is buggy and moves the canvas
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
