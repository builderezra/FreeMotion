# ⚠️ READ FIRST — eight ways a measurement lied, all on 20 Aug 2026

Every one of these produced a confident WRONG answer that survived until something forced a second look.
They are listed by SYMPTOM, because that is how you meet them.

1. **"The screen renders nothing / the sheet is empty."** `tests/_shot.sh` uses `--virtual-time-budget`,
   under which a CSS transition never completes — so a sheet that slides up is photographed still parked
   off-screen. Use `tests/_shotlive.py` for anything that animates. *(Cost: an hour on queue 428, and a
   report that the Media and Audio tabs were broken when they were fine.)*
2. **"Every tab shows the same thing."** There are TWO add-menu instances in the DOM — the phone sheet
   and the parked PC panel. A document-wide `querySelector` drives the wrong one. Scope to `#add-sheet`.
3. **"Nothing moved, so the feature is dead."** Check the fixture could move at ALL first: a timeline
   with four layers does not overflow, so `scrollTop` stays 0 and a broken feature and a working one look
   identical. *(Cost: three wrong diagnoses of a flaky test, plus a near-miss on queue 429 an hour after
   fixing the same trap elsewhere.)*
4. **"The menu is still open."** `#ctx-menu` persists in the DOM after any earlier use. Asking whether it
   EXISTS fails against correct code; ask whether it is visible.
5. **"The control is there."** Searching a panel's text for "Outline" passes on the CARD TITLE
   ("Outline & Shadows"). Assert the actual control — a `label.chk-row` with a checkbox — not a word.
6. **"The colour did not change back."** Sampling 120ms after a pause catches the transition mid-flight:
   rgb(230,243,247) vs rgb(233,244,247) is correct behaviour and an impatient test.
7. **"This entry says it is missing."** THREE open entries were already shipped (395 in full, 277 nine of
   ten clauses, 418 clause 2). An entry records what was ASKED, not what is still missing, and nothing
   keeps the two in step. Read the file the entry names before building.

8. **"The element moved hundreds of pixels."** The timeline REBUILDS on resize — the add row and its +
   are replaced — so an element reference held across the resize measures a DETACHED node as all-zeros.
   A probe reported the + moving −453.5px that way. Re-query by selector after anything that can rebuild.

**The one rule underneath all eight:** a measurement that CANNOT fail is not evidence. Before believing
a probe, ask what it would have shown if the thing were broken — and if the answer is "the same", the
probe is the bug. Every new sweep in `tests.js` now carries a coverage guard for exactly this reason.

---

# Bug hunt — v4.70 (2026-08-09)

Full report (same data, browsable): https://claude.ai/code/artifact/982670b6-f36f-406e-98f5-613a92190595

22 finder agents over 29,000 lines (all 54 JS files + styles.css + index.html explicitly assigned,
plus cross-cutting sweeps for XSS, leaks, async races and numeric edge cases). Every finding was then
put to two independent skeptics — one on reachability, one on correctness. 171 agents in total.

**74 findings — 69 confirmed, 4 unverified, 1 refuted.** Severity after skeptic adjustment: 1 critical, 25 high, 44 medium, 4 low.

**RE-SWEPT AT v5.77** (six agents, every open finding re-read against the code as it stands, not against
the v4.70 line numbers, which have all moved): **12 already fixed, 2 not reproducible, 59 still reachable**
— of those 59, **29 are high** and 2 are only PARTIALLY fixed, meaning the exact bug described is gone but
the defect class is still reachable by another route. Struck-through headings carry the version that
fixed them. The still-live ones are unmarked and their line numbers in the body text are STALE — find the
code by name, not by line.

`unverified` means its skeptics were killed by a session limit — **not** that it was doubted. Of every
skeptic verdict that returned, exactly one refuted its finding.

Nothing in the source was changed BY the hunt — but a lot has been fixed SINCE. Entries struck through
carry the version that fixed them. **Do not schedule work from this file without re-checking the code
first:** three items picked off it in v5.74 turned out to be already fixed, and each time the REAL
remaining bug was a different one nearby that the stale entry hid. Re-verify, then build.

## Came back clean

- **XSS: zero findings** across all 39 `innerHTML` sites.
- Save/load round-trips pixel-identical (MAE 0); no dropped fields.
- No throws across all 193 effects at extreme params, at two times.
- 12/12 regression tests green; no horizontal overflow at 375px.

## The dominant theme: preview != export

Most of the serious findings are one root cause — lengths measured in *plate* pixels while the plate
shrinks with the playback quality tier. v4.69 fixed this for `ctx.filter`/shadows; the rest was missed.
Measured directly in the running app:

| effect | full | tier 0.62 | tier 0.36 |
|---|---|---|---|
| blur *(control, fixed v4.69)* | 45.9% | 47.4% | 48.3% — flat |
| stroke | 21.4% | 33.4% | 54.3% (+154%) |
| mattechoker | 18.9% | 26.2% | 41.7% (+121%) |
| glass | 11.9% | 20.8% | 23.9% (+100%) |
| motionblur | 22.5% | 30.1% | 43.2% (+92%) |

41 of 84 measurable effects are affected. Separately, an **adjustment layer grades only the top-left
rs-squared of the frame** during playback: 100% -> 64.2% -> 38.4% -> **12.9%** across the tiers.

Fixing the `plateScale` family first closes the largest block of this list from one root cause.

## Critical (1)

### ~~Group Selection inside Edit Group creates a parent cycle that hard-bricks the project~~ — VERIFIED FIXED, re-swept at v5.77
`js/app.js:1270`  · found by `app-state`

- **What:** FM.groupSelection() makes a new group `g` and sets `g.parent = FM.groupContext` (line 1268), then reparents every member with `if (!l.parent || !ids.includes(l.parent)) l.parent = g.id` (line 1270). FM.selectAll() (line 1163) ignores the group scope and selects EVERY layer in the project, including the group the user is currently inside. That group is parentless, so it becomes a member and gets `parent = g.id` — while `g.parent` already points back at it. The result is G.parent === G2 and G2.parent === G. FM.groupBounds' inner `walk` (js/compositor.js:7005) is the one parent walk in the codebase with no cycle guard (every other one uses `hops < 64` or a `seen` set), so it recurses until the stack blows.
- **Trigger:** Add two shapes → Select All → Group Selection → ⋯ → Edit group → Select All (Ctrl+A or ⧉ → "Select All Layers") → Group Selection (⧉ menu, enabled at selN ≥ 2).
- **Costs:** Verified in the running v4.70 app: groupSelection throws `RangeError: Maximum call stack size exceeded`, and from that moment FM.refreshAll() and FM.canvasEdit.update() throw on every call — the timeline, inspector and selection chrome are dead. The cycle lives in FM.scene.layers, so the pagehide/visibilitychange flushSync persists it. After a reload FM.storage.load() throws at its `FM.refreshAll()` call, so the `.then()` that runs `FM.home.init()` never executes: the editor shows "No layers yet" over a 4-layer document and `FM.home.open()` then throws `Cannot read properties of null (reading 'classList')`. There is no route back to the Home screen, so the project cannot be closed or deleted and every OTHER project becomes unreachable too. Permanent data loss with no in-app recovery.
- **Fix:** In FM.groupSelection, exclude the open group from `members` and refuse any member that would close a cycle — e.g. `const members = FM.scene.layers.filter(l => ids.includes(l.id) && l.type !== 'camera' && l.id !== FM.groupContext);` and, after computing `g.parent`, drop the reparent for any `l` where `l.id === g.parent`. Belt-and-braces: give FM.groupBounds' `walk` the same `seen`/hop guard every other parent walk uses (js/compositor.js:7005), so a cycle from any future path degrades instead of killing the app. Scoping FM.selectAll (js/app.js:1163) to `FM.groupContext ? the group's subtree : all layers` fixes the trigger and also stops Ctrl+A + Delete inside a group from nuking the whole project.

## High (25)

### ~~Filmstrip ImageBitmaps are never closed — FM.clearClipStrip has zero call sites, so every imported clip pins ~66MB (1080p) / ~265MB (4K) of native memory for the whole session~~ — FIXED in v5.08, re-verified v5.74
`js/app.js:1221`  · found by `leaks`

> **FIXED — do not re-hunt this.** The diagnosis below was correct when written (v5.07) and was fixed
> by commit 893366f "v5.08: release filmstrip bitmaps, and stop decoding them at source size". The
> entry was never updated, so it still reads as live and costs every later agent a full re-hunt. The
> line numbers below are pre-v5.08 and no longer resolve.
>
> Re-measured at v5.72 with an ImageBitmap accounting harness (wrap `createImageBitmap`, wrap
> `ImageBitmap.prototype.close`, count bytes still un-closed), driving the real `index.html` in
> headless Chrome at 390x844 DPR 3, importing 3 real 2048x2048 video clips and deleting all three:
>
> | | pre-fix (893366f^) | v5.72 |
> |---|---|---|
> | decoded strip frame size | 2048x2048 | 64x64 |
> | per clip (8 frames) | 134,217,728 B (128 MB) | 131,072 B (128 KB) |
> | pinned after deleting all 3 | 402,653,184 B (384 MB) | **0 B** |
> | bitmaps closed / created | 0 / 24 | **24 / 24** |
>
> Filmstrip quality was checked too, since "smaller" must not silently mean "blurry": rendering the
> same high-detail source through the real timeline with capped vs full-resolution bitmaps gives
> mean abs difference 2.98/255, PSNR 28.1 dB, and the capped strip retains 97.9% of the full-res
> strip's edge energy. Identical at DPR 2 and DPR 3, because the filmstrip canvas backing store is a
> fixed 32px tall (`strip.height = 32`, js/timeline.js) and is never DPR-scaled — the canvas, not the
> bitmap, is the resolution limit, so decoding above 64px buys nothing at any DPR.
>
> One path of the SAME bug class was still live at v5.72 and is now fixed separately: the
> project-switch teardown in `FM.projects.open` (js/storage.js) dropped media records with
> `FM.media.remove` while releasing **neither** cache. Measured on a real switch: 5 ImageBitmaps
> created, 0 closed, 4 still reachable after six forced GCs. Now routed through
> `FM.releaseProjectMedia`, which releases both before dropping the registry entry.

- **What:** FM.buildClipStrip (js/frames.js:118-154) decodes 8 ImageBitmaps per video clip at FULL SOURCE RESOLUTION (`frames.push(await createImageBitmap(el))` — line 145, no resizeWidth/resizeHeight) and one full-resolution bitmap per image clip (line 133), caching them on the media record as `m.stripFrames`. It is called from js/timeline.js:919 for every video/image clip the timeline draws. The matching releaser `FM.clearClipStrip` exists at js/frames.js:156 but `grep -rn clearClipStrip` over the whole repo returns exactly one hit — its own definition. Nothing ever calls it. Every teardown path releases the neighbouring caches and skips this one: `FM.deleteLayer` (js/app.js:1221) and `FM.deleteSelected` (js/app.js:1196) call `FM.clearFrameCache(m)` but not `FM.clearClipStrip(m)`, and both deliberately KEEP the media record alive in the registry for undo (js/app.js:1223-1225), so the bitmaps stay reachable — not merely uncollected, but pinned by a live reference. `FM.replaceMediaWith` (js/app.js:1519) has the same omission. `m.stripFrames` is written exactly once per record and never reset, so nothing else can drop them either.
- **Trigger:** Import a video clip (its filmstrip builds on the first timeline rebuild), then delete the clip. Repeat while editing — e.g. import 6 phone clips (1920x1080) and delete the 5 you don't want.
- **Costs:** Each deleted 1080p clip permanently pins 8 x 1920x1080x4 = ~66MB of decoded ImageBitmap surface; a 4K clip pins ~265MB; a 12MP photo pins ~48MB. Five discarded 1080p clips = ~330MB of native memory that no GC can reclaim (the media record is still referenced). This memory lives outside the JS heap, so it applies no GC pressure and just accumulates until iOS Safari jetsams the tab — the app reloads and the user loses everything since the last 600ms autosave.
- **Fix:** Call the releaser everywhere the frame cache is already released: add `if (FM.clearClipStrip) FM.clearClipStrip(m);` next to `FM.clearFrameCache(m)` at js/app.js:1196, js/app.js:1221, js/app.js:1519 and js/app.js:563. Additionally, cap the decode size — pass `{ resizeWidth, resizeHeight }` to `createImageBitmap` in js/frames.js:145/133 sized to the 32px-tall filmstrip tile the timeline actually draws (js/timeline.js drawFilmstrip), which cuts the per-clip cost from ~66MB to well under 1MB and makes the leak harmless even if a path is missed.
- **Measured:** Verified by grep: FM.clearClipStrip appears exactly once in the whole tree — its own definition at js/frames.js:156. Zero call sites.

### ~~Editor keyboard shortcuts stay live under the full-screen home/project-browser overlay — Backspace deletes a layer and autosaves it~~ — VERIFIED FIXED, re-swept at v5.77
`js/app.js:2574`  · found by `mobile-js`

- **What:** The global `window.addEventListener('keydown', …)` in app.js only bails out for modifier combos and for editable targets (`inEdit`). It has no check for whether a full-screen overlay owns the screen. `#home-screen` (z-index 200, `position:fixed; inset:0`) covers the entire app, but the last-opened project stays loaded in `FM.scene` with its `selectedId` intact — `FM.home.open()` only pauses playback, it never unloads or deselects. So every bare-key editor shortcut still reaches the hidden project: Space → `FM.togglePlay()`, Backspace/Delete → `FM.deleteSelected()`, S → split, M → marker, [ / ] → loop marks. `FM.deleteSelected()` (app.js:1181) ends with `FM.history.commit()`, and `commit()` calls `FM.storage.autosave()` (js/history.js:61), so the destruction is persisted, not just in-memory. The same hole applies to `#fx-browser`, `#afx-browser`, `#export-dialog`, `#canvas-dialog` and the Settings panel, whose buttons are not INPUT/SELECT/TEXTAREA and so never set `inEdit`.
- **Trigger:** Open a project, tap back to the home screen (project browser). With focus on <body> (which is where it lands after the back button), press Backspace — the habitual browser "go back" key. Or press Space, the habitual "scroll the list" key.
- **Costs:** Backspace silently deletes the selected layer from the project behind the overlay and autosaves the deletion — the user sees nothing happen and finds the layer gone next time they open the project. Space starts playback of the invisible project: audio plays out of nowhere and the rAF render loop runs behind an opaque overlay until they find the editor again.
- **Fix:** Add an overlay guard immediately after `if (inEdit) return;` at js/app.js:2574: `if (FM.home && FM.home.isOpen()) return;` `if (FM.settings && FM.settings.isOpen && FM.settings.isOpen()) return;` `if (document.querySelector('#fx-browser:not(.hidden), #afx-browser:not(.hidden), #export-dialog:not(.hidden), #canvas-dialog:not(.hidden)')) return;` (Escape must stay reachable, so place the guard so the `e.code === 'Escape'` branch is still allowed to run, or let each overlay keep its own Escape handler as home.js and settings.js already do.)

### ~~Undo/redo leaves the live audio-effect chain wired to detached effect objects, so undone values keep playing and later slider edits are inaudible~~ — VERIFIED FIXED, re-swept at v5.77
`js/audio-fx-live.js:59`  · found by `audio`

- **What:** `buildAudioFxChain` captures each effect instance object by reference (`built.push({ u, inst, def })`) and `applyAt` reads `b.inst.params` forever after. `sync()` only rebuilds when the *structural* signature changes — `signature()` is `type + enabled` per entry and deliberately excludes params: "Param values do not; they ride applyAt." That is only safe while the instance OBJECTS are stable. `history.restore()` does `FM.scene.layers = JSON.parse(str).layers`, replacing every `layer.audioFx[i]` with a brand-new object, and `refreshAll()` (app.js:420) never calls `reconcileAudio`/`syncAll`. On the next `FM.play()` → `audioFxLive.syncAll()`, the signature is byte-identical, so line 59 early-returns and the chain keeps driving itself from the orphaned pre-undo objects.
- **Trigger:** Add a Reverb to a clip, play it, pause. Drag Mix from 0.3 to 0.9 (a slider edit commits history). Press Ctrl+Z. Press Play.
- **Costs:** Preview still plays Mix 0.9 — the undo is inaudible. Worse, from that point on the inspector edits the NEW object while the chain reads the OLD one, so every further parameter drag on that effect does nothing in preview until the user adds/removes/disables an effect. Export (`exporter.js:174` builds a fresh chain from the live scene) renders the correct value, so preview and export silently disagree.
- **Fix:** Make the cache key identity-aware, not just structure-aware. In `sync()`, stash the filtered instance list on the rec and compare it element-by-element before the early return:  ```js const list = (layer.audioFx || []).filter(f => f && f.enabled !== false && FM.audioFxRegistry.get(f.type)); const same = m._afxInsts && m._afxInsts.length === list.length && m._afxInsts.every((x, i) => x === list[i]); if (m._afxChain && m._afxSig === sig && same) return; ... m._afxInsts = list;   // set alongside m._afxChain / m._afxSig ```  This also fixes the sibling case of reordering two effects of the same type (identical signature, different order).

### ~~A clip that outlives its source restarts the audio from the beginning~~ — FIXED v9.37 (the guard existed on ONE of the two paths; the auditor called it closed, the skeptic found the hole)

`js/app.js:1060` (resume branch) · `js/scene.js` layerSourceAdvance · found by the audio-cluster workflow

- **What is established:** with a keyframed Speed ramp the clip window is left alone on purpose
  (inspector.js writes the keyframe and skips the source clamp its sibling applies for a static speed
  change), so a ramp averaging above 1x makes the transport ask for a source time past the end of the
  media. An instrumented run in the real app logged the element's currentTime snapping back four times
  across one 4s clip, with playbackStats.seeks = 4 — on a song layer that is the first half-second
  looping audibly for the whole tail.
- **What is NOT established, and was actively disproved:** the proposed cause — that `play()` on an
  ENDED element rewinds to zero — does not happen in this Chrome. `tests/_restartloop.html` drives the
  exact sequence on a real `<audio>`: the element is ended and paused, the resume line runs, `play()`
  RESOLVES (not rejected), and currentTime stays at the duration. No rewind.
- **The actual lead:** the instrumented run logged currentTime landing on **0.055**. Assigning a
  past-the-end `local` clamps to the duration, so it can never produce 0.055 — `local` itself must have
  been small. That points at the speed-ramp integral in `FM.layerSourceAdvance` wrapping or resetting,
  not at the resume line. Start there.
- **What shipped:** a guard on the resume branch that refuses to resume when `local >= el.duration`.
  It is defensive and correct on its own terms (and covers engines that DO take the spec's rewind
  allowance), but it is explicitly NOT a verified fix for the observed restarts, and the comment at the
  site says so.

### ~~FLAKE: one desktop suite run in ~4 comes back 230/231, and the failing test is not yet identified~~ — IDENTIFIED AND FIXED v8.91 (the voice-recorder rig built a fresh AudioContext per fake mic and closed it again; under load the next one had not produced a first quantum inside the 4s budget and the take came out empty. One shared context for the run, never closed. Four consecutive green suites after, against three ship-blocking failures in one night before.)

`tests/_cdp.py`  · observed 2026-08-13 at v6.62

- **What:** A desktop run (1280x900) reported `Regression 230/231` once; three immediate re-runs and the
  380px run were all 231/231. The run was made with `--quiet`, which at the time printed only the
  summary line, so the failing test's name was lost. `--quiet` has since been changed to keep failures.
- **Trigger:** Unknown — roughly 1 run in 4 at the time of observation. Not correlated with any edit:
  the working tree was the rotate-dial change, which is inspector CSS/JS only, and the 380px run of the
  identical tree was green.
- **Costs:** Worse than the failure itself. A suite that is red 25% of the time for unknown reasons
  makes every "green, therefore shipped" claim in this repo weaker, and trains whoever is running it to
  re-run until green — which is exactly how a real regression gets waved through.
- **Fix:** Not yet diagnosed. Next step is a loop of ~10 desktop runs capturing failures now that
  `--quiet` keeps them, to name the test; then decide whether the test or the app is at fault. Do NOT
  simply retry-until-green in the meantime.

### ~~Dragging an audio-drive source clip recomputes a full loudness envelope every frame and caches every one forever~~ — FIXED v9.31
`js/audio-react.js:221`  · found by `audio`

- **What:** `envSig()` folds the clip's timing (`start | trimStart | duration | reversed | speed`) into the cache key. `audioEnvelopeSync` is called from `behaviors.js:148` on every rendered frame for any layer carrying an Audio Drive behavior. A cache miss fires `FM.audioEnvelope` as a microtask — a synchronous main-thread RMS pass whose cost is proportional to the clip's ENTIRE decoded sample count (`for j in [s0,s1): acc += mono[j]*mono[j]`, summed over `clipDur*fps` frames ≈ `clipDur*sampleRate` iterations) — and the result is written into `m._audioEnvCache[sig]` with no cap and no eviction. Dragging or trimming the source clip mutates `start`/`duration`/`trimStart` on every `pointermove` and calls `FM.requestRender()` (timeline.js:1266, timeline.js:1490), so each rAF produces a brand-new signature: a new full-clip recompute plus a new permanently-retained envelope.
- **Trigger:** Import a 3-minute song, add an Audio Drive behavior on a text layer with `sourceId` = that song, then drag the song clip along the timeline (or drag its trim handle) for a few seconds.
- **Costs:** ~60 full-track RMS passes per second on the main thread (≈8M float ops each on a 3-min 44.1 kHz track), so the drag stutters to unusability on a phone. Each pass also permanently retains a `times`+`values` array pair (~100 KB for a 200 s clip at 30 fps), so a 10-second drag strands tens of MB that nothing ever frees — repeated drags end in a mobile-Safari reload.
- **Fix:** Bound the cache and stop chasing an in-flight retime. In `audioEnvelopeSync`, evict before inserting and only kick off a compute once the signature has held still:  ```js // evict: keep at most ~4 envelopes per media rec const keys = Object.keys(m._audioEnvCache); if (keys.length > 4) delete m._audioEnvCache[keys[0]]; ```  and gate the fire-and-forget branch on the signature being unchanged since the previous call (`if (m._audioEnvLastSig !== sig) { m._audioEnvLastSig = sig; return null; }`), so a drag computes once on release instead of once per frame.

### ~~Adjustment layer grades only the top-left rs×rs fraction of the frame on any non-1:1 preview canvas~~ — VERIFIED FIXED, re-swept at v5.77
`js/compositor.js:6656`  · found by `compositor-masks`

- **What:** applyAdjustment allocates `_adjCv` at PROJECT size (W×H) and leaves it unstamped, so `baseT(a)` resolves to the identity transform. It then snapshots the frame with `a.drawImage(ctx.canvas, 0, 0)` — an unscaled 1:1 blit. The preview canvas is not project-sized: app.js resizeCanvas() sets `canvas.width = P.width * s` for the playback quality tier (PLAY_TIERS down to 0.28) and renderScene stamps `__fmRS = s`. So a 0.28-scale canvas is copied into the top-left 28%×28% of a project-sized buffer, graded there, and then blitted back through `baseT(ctx)` (which scales by 0.28) — leaving the grade covering only the top-left rs×rs of the visible frame. Same failure with the zoomed/cropped preview (`__fmRS` up to 6, `__fmOX/__fmOY` non-zero). Contrast drawManualBlendLayer (line 6131-6133), which correctly sizes its plate to `ctx.canvas.width/height` and copies the `__fmRS/__fmOX/__fmOY` stamps.
- **Trigger:** Add an adjustment layer with any grade (CSS filter, or a PIXEL_ADJ effect such as Tint/Levels/Threshold/Posterize/Duotone/RGB Split, or Pixelate) and press Play — or just let the adaptive quality tier drop below 1, which it does on any phone. Also fires whenever the preview is zoomed (cropped canvas).
- **Costs:** During playback the grade visibly detaches from the picture: a square patch in the top-left corner is graded and the rest of the frame is not, and the patch shrinks as the quality tier drops. Stopping playback (tier back to 1) makes it snap back to correct, and export is correct — so preview and export disagree, and the user cannot judge the grade while scrubbing or playing. A pen-masked adjustment layer (the "local grade" path at line 6679-6681) is broken the same way, since it masks the same mis-scaled buffer.
- **Fix:** Match the target's pixel grid instead of the project's, exactly as drawManualBlendLayer does: size `_adjCv` to `ctx.canvas.width/height`, copy `__fmRS/__fmOX/__fmOY` from `ctx.canvas` onto it, and use those device dimensions for the clearRect, the getImageData/putImageData pixel pass and the pixelate down/up-scale. The final `ctx.drawImage(_adjCv, 0, 0)` must then be done with an identity transform (setTransform(1,0,0,1,0,0)) rather than under baseT, since the plate is now already in device pixels.
- **Measured:** Measured: frame graded 100% -> 64.2% -> 38.4% -> 12.9% across tiers 1.0/0.8/0.62/0.36 — exactly rs², with the top-left corner always 100% and the bottom-right 0%.

### ~~A pen-masked layer is rendered through ANOTHER layer's mask when its Luma Matte / Displacement Map / Compound Blur source layer also has a pen mask~~ — FIXED v5.77
`js/compositor.js:1259`  · found by `compositor-masks`

- **What:** FM.buildMaskAlpha returns the module-level scratch canvas `_bufCv` (masks.js:99, `let _bufCv = null`; masks.js:169, `return buf`) — one shared buffer for the whole app. drawPenMaskLayer grabs that reference at line 1259, then calls `drawLayer(octx, tmp, t, scene)` at line 1269 and only USES the reference afterwards at line 1274. That nested drawLayer can re-enter buildMaskAlpha: drawLumaMatte (line 2694), drawCompoundBlur (line 2762) and the displacemap/polardisplace/matchgrade paths all render their source layer with `Object.assign({}, mLayer, …)`, which preserves `mLayer.masks`. The inner call clears and repaints `_bufCv` with the SOURCE layer's mask, and the outer destination-in at line 1274 then stencils the outer layer with it. (`_penMaskCv` at line 1252 is aliased the same way — the inner drawPenMaskLayer clears and reuses the outer call's in-flight plate.)
- **Trigger:** Layer A has a pen mask (Effects → Mask) and a Luma Matte effect whose "Matte layer" is layer B; layer B also has a pen mask. Play or scrub — every frame renders wrong.
- **Costs:** Layer A is drawn through layer B's mask shape instead of its own — content appears in regions the user explicitly masked out, and disappears from regions they masked in. It is not a transient: preview and export both render it, so the user ships the wrong frame. Same for Displacement Map, Polar Displacement, Compound Blur and Match Grade.
- **Fix:** Make both scratch buffers re-entrancy-safe. Depth-index `_penMaskCv` with a pool keyed on recursion depth, the way `_mbPool` (line 1294) and `_dspPool` already are, and stop holding a raw reference to `_bufCv` across a nested render — either call FM.buildMaskAlpha AFTER `drawLayer(octx, tmp, t, scene)` returns, or immediately blit `_bufCv` into the per-depth pool slot before the nested draw.

### ~~Motion blur composites its accumulator with an identity transform, ignoring the preview canvas's render-scale/crop stamps~~ — FIXED v5.77
`js/compositor.js:1389`  · found by `compositor-transform`

- **What:** Every other offscreen composite in this file blits through `baseT(ctx)` in PROJECT units (drawPixelEffect:1519-1523, draw3DTiltLayer:3280-3285, drawFeatheredMaskLayer:1233-1237, drawPenMaskLayer:1279-1283). drawMotionBlur instead resets the target to identity and blits raw pixels. Its accumulator `acc` is sized `PW*ps × PH*ps` where `ps = plateScale(ctx) = Math.min(1, __fmRS)` — the cap at 1 means acc NEVER matches a supersampled target, and acc.__fmOX is hardcoded 0 so it never matches a cropped target either. The comment on the line ('acc already shares the target's pixel grid') only holds when __fmRS ≤ 1 and __fmOX/__fmOY are 0.
- **Trigger:** Turn on Motion Blur for any moving layer and look at the preview whenever the preview canvas is supersampled or cropped. Both are normal states: app.js:316 sets `__fmRS = previewScale()` which goes up to 4 whenever the comp is displayed larger than its own pixels (any desktop/retina preview of a small comp), and app.js:302 sets `__fmRS = s (1..6), __fmOX = crop.x, __fmOY = crop.y` for any viewport zoom ≥ 1.35.
- **Costs:** The blurred layer jumps to a completely different place on screen and renders at the wrong size. Measured on a 320×240 comp into a 640×480 preview canvas (the exact stamps renderScene derives itself): without motion blur the layer occupies canvas bbox {x0:260,y0:180,x1:379,y1:299}; with motion blur enabled it occupies {x0:129,y0:90,x1:190,y1:149} — half size, top-left quadrant. With the zoomed crop path (__fmRS 2, __fmOX 80, __fmOY 60) it lands at {129,90,190,149} instead of {100,60,220,180}. Export renders at 1:1 so it is correct there: preview and export disagree, and the preview is the one that is wrong.
- **Fix:** Composite in project units like every sibling path: replace `ctx.setTransform(1, 0, 0, 1, 0, 0);` with `baseT(ctx);` and `ctx.drawImage(acc, 0, 0);` with `ctx.drawImage(acc, 0, 0, PW, PH);` (identical output at scale 1, so export/thumbnails stay byte-for-byte).

### ~~A group nested inside another group loses its own opacity/effects/blend — or gets drawn twice~~ — FIXED v6.60. Units now NEST instead of racing: each unit gets a nesting depth, the DEEPEST unit holding a member is the one that draws it, and the SHALLOWEST is the one renderScene dispatches, so the whole nest goes down as one. `_mgA`/`_mgB` are pooled BY THAT DEPTH — no counter needed, because two units at the same depth are never alive at once (a sibling is fully flattened and blitted before the next starts). The nested-drawn flag is per BUILD, not per unit: the fill-behind pass flattens some units before the main layer loop does, and a flag on the unit would make the main loop's rebuild skip every nested unit the earlier pass had drawn, emptying the group.

  Probe `tests/_nestgroup.html`: both scene orders now read exactly 64 (was 128 outer-first — inner group dropped — and 191 inner-first — leaf composited twice); control still 128. A byte-identity sweep over 16 grouped scenes at export size (`tests/_groupident.html`) shows all 11 non-nested rows UNCHANGED — plain groups, effects, blend, mask, siblings, adjustment member, colour grade, and both single-unit nestings — and all 5 nested rows changed. The pre-fix checksums are their own indictment: three different nested scenes all hashed to `e581dd48`, which is the checksum of ONE plain group at 0.5, and the outer-plus-loose-sibling scene hashed identical to two flat sibling groups. Locked in by a mutation-checked test.

> **REPRODUCED AND SHARPENED, 2026-08-13 (v6.54). Not yet fixed — and the suggested fix below will
> break if applied naively.** Probe: `tests/_nestgroup.html`, one decisive pixel. A white leaf inside
> group B inside group A, both at opacity 0.5, over black: correct is 255 × 0.25 = **64**. Measured on
> today's build:
>
> | scene order | centre px | meaning |
> |---|---|---|
> | outer group first (what `groupSelection` produces) | **128** | only ONE 0.5 applied — the inner group is silently dropped |
> | inner group first (Edit group → Add → Group) | **191** | the leaf is composited TWICE, once per unit |
> | control: a single group at 0.5 | 128 | correct, so the probe is trustworthy |
>
> **THE TRAP the original fix note misses.** `buildGroupUnit` renders onto `_mgA`/`_mgB`, which are
> MODULE-LEVEL SINGLETONS (compositor.js:8866). Recursing into `drawGroupUnit` for a nested unit —
> exactly what the fix proposes — would have the inner call clobber the outer call's plate mid-flatten.
> So the fix needs the depth-pooled buffer pattern this file already uses twice (`_pfPool`/`_pfDepth`
> at :1854, `_t3Pool`/`_t3Depth` at :4642) BEFORE the recursion is added, or it will produce a
> different, weirder bug than the one it fixes.
>
> Also needed: after drawing an inner unit, the outer loop must skip that unit's whole subtree —
> `memberIds` is built by a recursive `walk`, so it already contains every descendant leaf, and they
> would otherwise be drawn a second time by the outer loop.
>
> Deliberately not attempted at the tail of a twenty-release overnight run: it is the most central
> function in the app, the export path goes through it, and it wants a fresh head plus a byte-identity
> sweep over grouped scenes. The probe makes it a ten-minute verification once someone starts.
`js/compositor.js:6800`  · found by `compositor-transform`

- **What:** collectGroupUnits builds one unit per group that needs flattening, then claims member ids first-come-first-served. When an outer group and an inner group both need a unit, whichever appears first in scene.layers claims the shared leaf members and the other unit is either orphaned (never drawn) or drawn as a second, overlapping copy. drawGroupUnit compounds it by skipping nested group rows entirely (`if (... || L.type === 'group') continue;` at 6818) and drawing their leaves with a bare `drawLayer`, so the inner group's `_flat` proxy — the thing that carries its opacity/effects/blend/shadow — is never constructed.
- **Trigger:** Group two shapes (→ group B), then group B with another layer (→ group A). FM.groupSelection puts the outer group ahead of the inner one in scene.layers. Set opacity (or add any effect / non-normal blend) on BOTH A and B. The reversed order is reachable too: enter group A, then Add → Elements → Group, which unshifts the inner group to index 0.
- **Costs:** Outer-first (the ordering FM.groupSelection produces): the inner group's opacity/effect/blend is silently dropped. Confirmed by render — A=0.5 and B=0.5 over black gives centre pixel 128 (only one 0.5 applied) instead of 64. Inner-first: the leaf is composited twice, once per unit — same scene gives 192. Either way the user's edit on the inner group does not do what it says, with no error.
- **Fix:** Make units nest instead of race: when a member is already claimed by an inner unit, the outer unit must claim that unit's `_flat` result rather than its raw leaves — i.e. in drawGroupUnit's member loop, if a nested group also needs a unit, recurse into drawGroupUnit(a, innerUnit, t, scene) for it (marking it drawn) instead of `continue`-ing past the group row and drawing its leaves directly.

### ~~A keyframed transform.anchorX/anchorY NaNs the draw and makes the layer vanish permanently~~ — VERIFIED FIXED, re-swept at v5.77
`js/compositor.js:6338`  · found by `compositor-transform`

- **What:** The compositor reads the anchor as a RAW NUMBER in eight places (6072, 6087, 6338, 6476, 6550, 6557, 6568, 6578) — never through FM.evalProp. inspector.js:1587-1590 documents this and deliberately withholds the ◆ keyframe button for anchor. The AI op path does not honour that contract: ai-ops.js:34 lists `anchorX: [0,1], anchorY: [0,1]` in TRANSFORM_RANGE, and `addKeyframe` (ai-ops.js:325-351) accepts any TRANSFORM_RANGE key and writes `container[key] = { kf: [...] }` straight onto layer.transform. js/ai-manifest.js:52 actively advertises it to the model: 'setProp transform.* or keyframe any of them … anchorX/anchorY(0..1)'. storage.js's sanitizeImportedLayers never rebuilds layer.transform either, so an imported .fmproj can carry the same object.
- **Trigger:** Ask the AI panel to animate a layer's anchor point (e.g. 'animate the anchor to the top-left so it grows from the corner'). The manifest tells the model this is a legal keyframe path, so it emits addKeyframe with path 'transform.anchorX'.
- **Costs:** `-sw * {kf:[…]}` is NaN, the whole traced path is NaN, and the layer renders nothing. Confirmed: same shape renders 3600 lit pixels normally and 0 lit pixels with `transform.anchorX = {kf:[{t:0,v:0.5},{t:2,v:0}]}`. No exception is thrown, so there is no error to see — the layer is just gone, and the {kf} object is serialised into the saved project, so it stays gone across reload.
- **Fix:** Resolve the anchor numerically at the one place it is read — add `const ax = (typeof tr.anchorX === 'number' && isFinite(tr.anchorX)) ? tr.anchorX : 0.5;` (same for ay) and use ax/ay at all eight sites, mirroring the guard canvas-edit.js:134 already uses. Also drop `anchorX`/`anchorY` from ai-ops.js's addKeyframe-eligible set (or the TRANSFORM_RANGE whitelist used by that op) and remove the claim from ai-manifest.js:52.
- **Measured:** Measured: shape layer renders 6000 lit px with a plain anchor, 0 with a keyframed one; a keyframed transform.x on the same layer still renders 6000.

### ~~A negative value from an overshooting ease voids the entire ctx.filter string, so all CSS-filter effects on the layer switch off~~ — VERIFIED FIXED, re-swept at v5.77
`js/compositor.js:886`  · found by `numeric`

- **What:** effectFilter() concatenates raw FM.evalProp results into a CSS filter list with no domain clamp. blur(), brightness(), contrast(), saturate(), grayscale(), sepia(), invert() and drop-shadow's radius all require a NON-NEGATIVE value; one out-of-domain function makes the whole filter list a parse error, and assigning an invalid string to ctx.filter is silently IGNORED by the browser (the context keeps its previous value, which after baseT/save is 'none'). So a single negative frame drops EVERY filter effect on that layer, not just the one that went negative. The graph editor's built-in Overshoot preset (FM.EASE_PRESETS.overshoot = [.34,1.56,.64,1]) has cy(t) peaking at ~1.096, so on a DECREASING keyframe pair the interpolated value undershoots the target by ~10% of the span — which is below zero whenever the end keyframe is 0. Elastic (peak 1.354) undershoots by 35%. Effect params get exactly the same 8-preset easing editor as transforms (inspector.js:3067 → FM.buildEasingEditorFor(layer, k => fx.params[k], ...)), so this is one click.
- **Trigger:** Select a layer → Effects → add Brightness → keyframe Amount = 1 at t=0 and Amount = 0 at t=2 (a normal fade-to-black) → tap the easing-curve button next to Amount → pick the built-in "Overshoot" preset. Same with Gaussian Blur radius 20 → 0 ("blur out to sharp"), or Bloom/Glow radius → 0, or the Elastic preset.
- **Costs:** Measured in the running app on a white 200×160 shape: brightness keyframed 1→0 with Overshoot renders centre pixel R=23 at t=0.6 (correct), then R=255 — FULL WHITE — for every frame from t=0.8 to t=1.9, then R=0 at t=2. The layer flashes to full brightness for 1.2 s of a 2 s fade instead of continuing to darken. With the blur example the co-stacked brightness(0.25) is dropped too: R=63 at t=0.5 vs R=255 at t=1.2, filter string 'blur(-1.931486774713079px) brightness(0.25)'. The exporter calls the same effectFilter, so the flash is baked into the exported MP4 exactly as previewed — the user has no way to see it as a preview artifact.
- **Fix:** Clamp every non-negative-domain value at the point it is stringified in effectFilter (js/compositor.js:886-901): use Math.max(0, v('radius', 6)) * S for blur, Math.max(0, v('amount', 1)) for brightness/contrast/saturate/grayscale/sepia/invert, and Math.max(0, gr) * S for the glow drop-shadow radius. hue-rotate is the only one that legally takes any sign. (Belt-and-braces: also skip pushing a part whose value is not Number.isFinite.)
- **Measured:** Measured: a layer carrying grayscale(1)+brightness(-0.2) renders [255,210,74] — the original colour, both effects off. Confirmed the browser keeps the previous ctx.filter when handed an invalid string.

### ~~Warp effects displace by PLATE pixels, so wave/ripple/glass/tileshift/fractalwarp are 1.4-3x stronger in the preview than in the export~~ — FIXED v6.43 (ripple 233.8%→0.9%, fractalwarp 60.2%→1.8%, glass 23.6%→3.0%, wave 5.7%→3.8%; scale-1 extents byte-identical, so exports unchanged. Tile Shift measured already flat at 3.6% before the fix.)
`js/compositor.js:2970`  · found by `numeric`

- **What:** drawWarpEffect builds its plate at W = round(PW * ps) where ps = plateScale(ctx), and passes ps to the map function as the 9th argument specifically so absolute-pixel params can be converted (line 2617: `const m = mapFn(x, y, W, H, cx, cy, maxR, pr, t, ps);`). WARP_FX.curl takes that argument and uses it (`cuWl = ... * (ps||1)`), which is the intended convention. WARP_FX.wave, .ripple, .glass, .fractalwarp and .tileshift do not even declare the parameter, so their amplitude and wavelength — user-facing values in px — are interpreted in reduced plate pixels. Dividing by ps, the effective displacement in PROJECT pixels is amount/ps.
- **Trigger:** Put a Wave (or Circular Ripple / Frosted Glass / Tile Shift / Fractal Warp) on any layer with default params and look at the preview on a desktop, where #canvas-wrap is narrower than the project (a 1080x1920 comp in a ~400px stage gives ps ~0.7, and hitting play drops it through PLAY_TIERS to ps ~0.2-0.4). Then export.
- **Costs:** Measured horizontal extent of a 200px white square, expressed in project px, at render scales 1 / 0.5 / 0.28: wave(amount 30) 259 / 270 / 293; ripple(amount 30) 231 / 298 / 89; glass(amount 30) 260 / 318 / 400 (frame-filling); tileshift(size 120) 260 / 400 / 200; fractalwarp(amount 50) 246 / 320 / 189. Control: curl, which does apply ps, is stable at 239 / 238 / 232. The user dials in a wave they like while scrubbing, hits play and it changes strength mid-playback, and the exported file matches neither.
- **Fix:** Add `ps` to each map function's signature and multiply every absolute-pixel quantity by `(ps||1)`, exactly as WARP_FX.curl does: in wave (line 2970) amp and wl (and wl2 derives from wl); in ripple (2980) amp and wl; in glass (3023) gam; in tileshift (3051) ts_sz; in fractalwarp (3027) fwAmt and the 57/40/29/53/15/19/47/61/35/27/13/21 frequency divisors.
- **Measured:** Measured across the quality tiers: glass 11.9%->23.9% (+100%), ripple 16.5%->26.3% (+60%), fractalwarp 10.7%->16.5% (+55%). Blur, fixed in v4.69, stays flat at +5%.

### ~~Particles ignores plateScale: emitter origin and speeds are project units used as plate pixels, so the effect is invisible in every reduced-scale preview~~ — FIXED v6.44 (lit bbox in project px at scale 1/0.5/0.28 went 11,0→235,207 · 22,0→318,238 · 39,39→179,189 to 11,0→235,207 · 12,0→234,206 · 11,0→236,204; scale 1 unchanged, so exports are byte-identical)
`js/compositor.js:4697`  · found by `compositor-effects`

- **What:** `drawCanvasEffect` allocates its plate at `W = round(PW * ps)` and passes `ps` as the 10th argument to every canvas-effect fn. `CANVAS_FX.particles` (line 4659) declares only 9 parameters, so it never receives `ps`. It then uses `layer.transform.x/y` — PROJECT coordinates — directly as PLATE pixel coordinates for the emitter origin, and applies `speed` (px/s), `gravity` (px/s^2) and `sizeStart/sizeEnd` (px) as plate-pixel quantities. Its own fallback `cx = W * 0.5` (line 4693) is correctly in plate units, which is what makes the mismatch on the `trx` branch unambiguous. Every sibling motion effect does the conversion: `drift` (4703, `* k` where `k = ps`), `orbit` (4708, `* (ps||1)`), `wiggle` (4566), `shake` (4570), `lightwrap` (3828), `border` (2470).
- **Trigger:** Add the Particles effect to any layer and look at the canvas on a phone, or let playback drop a quality tier on desktop. The preview canvas is deliberately sized to display size (js/app.js:212-218, PREVIEW_SS never exceeds 1) and the playback ladder shrinks it further (PLAY_TIERS = [1, 0.8, 0.62, 0.48, 0.36, 0.28], js/app.js:108, applied via resizeCanvas() at js/app.js:200), so `ctx.canvas.__fmRS` is ~0.3 on a phone.
- **Costs:** Measured in the running app: project 1080x1920, emitter shape at (540,1200), t=1.5s, Particles at catalog defaults. Rendering into a 1080-wide canvas (export / 1:1) lights 6301 project pixels of particles spanning x 391-666, y 953-1338. Rendering the identical scene into a 324-wide canvas (__fmRS 0.30, a normal phone preview) lights 1600 project pixels whose bbox is x 520-557, y 1180-1217 — exactly the 40x40 emitter shape and nothing else. Because the origin (540,1200) is used as a plate coordinate on a 324x576 plate, the whole particle system is emitted off-plate. The user sees no particles at all while editing, then they appear in the exported video.
- **Fix:** Take `ps` as the 10th parameter and convert everything measured in project units into plate pixels, exactly as `drift`/`orbit`/`wiggle` do: `const k = ps || 1;` then `const ox0 = statX ? trx * k : cx, oy0 = statY ? trY * k : cy;` (also scale the `FM.evalProp(trx, bt)` and `emitterWorldPos(...)` results on the animated/parented branches), and multiply `speed`, `gravity`, `sizeS` and `sizeE` by `k`. At ps === 1 every multiplication is a no-op, so exports and 1:1 previews stay byte-identical.

### ~~In-flight preview frame-cache is handed to the exporter, so reversed/slow-mo clips export at preview resolution~~ — FIXED v6.51 (in-flight dedupe keyed on fps + scaled-ness; prepareCaches re-checks after it settles)
`js/frames.js:60`  · found by `export`

- **What:** `FM.buildFrameCache` de-duplicates concurrent builds on the media record alone: the `rec.frameCache` reuse check on line 59 correctly compares BOTH `fps` and `scaled`, but the very next line returns any in-flight build regardless of what it was started with. `prepareCaches` (js/exporter.js:261-269) exists specifically to guarantee a full-resolution export cache — it force-clears a `scaled` cache, then calls `buildFrameCache` with no `maxDim` (so `scaled === false`). When a preview build is still running, `m.frameCache` is still null (it is only assigned at frames.js:99), so the clear on line 262 is a no-op, `!m.frameCache` is true, and line 268 receives the *preview* promise back. `prepareCaches` awaits it and returns, and the export frame loop then composites that clip from the preview bitmaps — downscaled to `maxDim` 640 (mobile / low-memory) or 960 (desktop) per FM.frameCacheLimits (js/app.js:695-708) — which js/compositor.js:6550-6557 draws up to the layer's full frame box (`ctx.drawImage(src, ..., cw, ch)`; the comment there even notes "src may be a DOWNSCALED cache bitmap"). The cache is also at the preview fps (`Math.min(P.fps, 24)`, js/app.js:715) rather than the export fps.
- **Trigger:** Open any project containing a reversed (or frame-blend slow-mo) video clip. js/storage.js:133 fires `FM.ensureReverseCache(l)` for every such layer on load, fire-and-forget, and that decode takes many seconds to minutes (up to 900 seeks). Press Export (MP4, GIF or PNG frames) while the "Preparing frames…" toast is still showing — i.e. the normal "open the project I want to render and hit export" flow.
- **Costs:** The exported file is not pixel-exact: a 1080x1920 reversed clip is rendered from 540x960 bitmaps upscaled 2x (2160x3840 source on a phone: 360x640 upscaled 6x), so the clip is visibly soft/blocky in the delivered MP4/GIF/PNG sequence while every other layer is sharp. It also carries at most 24 distinct frames per second inside a 30/60 fps export. The user gets no warning; re-exporting a minute later silently produces a different, sharper file.
- **Fix:** Make the in-flight dedupe key-aware. In `FM.buildFrameCache`, record what the running build is for and only share it on a match: `rec._buildKey = fps + '|' + scaled;` when starting, and `if (rec._building && rec._buildKey === fps + '|' + scaled) return rec._building;` otherwise `await rec._building` (catching rejection) before falling through to a fresh build. Equivalently/additionally, in `prepareCaches` re-run the discard check after the await: `if (m.frameCache && (m.frameCache.fps !== fps || m.frameCache.scaled)) { FM.clearFrameCache(m); await FM.buildFrameCache(m, fps, onProgress, { maxBytes: 1610612736 }); }`.
- **Measured:** Verified: the COMPLETED-cache guard at frames.js:59 is correct (checks fps and scaledness, and exporter.js:262 force-clears a scaled cache) — but the very next line, "if (rec._building) return rec._building;", has no scaledness check, so an in-flight preview build is handed to the exporter.

### ~~buildFrameCache hands an in-flight PREVIEW cache to the exporter, so a reversed/slow-mo clip is encoded from a 640px downscale~~ — FIXED v6.51 (same fix; this is the same defect found twice)
`js/frames.js:60`  · found by `async-races`

- **What:** buildFrameCache de-dupes concurrent builds with `if (rec._building) return rec._building;` — but that check ignores the caller's opts entirely. Line 59 deliberately refuses to REUSE a finished scaled cache for a full-res caller ("a downscaled preview cache is never silently reused for a full-res export"), then line 60 hands over an in-flight scaled build to that same caller. The preview path (js/app.js:718 `FM.ensureReverseCache`) passes `FM.frameCacheLimits()` = `{maxDim: 640|960, maxBytes: 128–384MB}` → `scaled = true`, longest side resized to 640 on a phone. The export path (js/exporter.js:268) passes `{maxBytes: 1610612736}` with no maxDim → full source resolution. exporter.js:262 `if (m.frameCache && (m.frameCache.fps !== fps || m.frameCache.scaled)) FM.clearFrameCache(m)` cannot defend against this: while a build is in flight `m.frameCache` is still null (it is only assigned at frames.js:99), so the clear is a no-op, `!m.frameCache` is true, and buildFrameCache returns the preview promise. The exporter then encodes every frame of that clip from `fc.frames[idx]` (js/compositor.js:6500), i.e. from 360×640 ImageBitmaps at 24fps.
- **Trigger:** Home → a project containing a reversed (or frame-blend slow-mo) video clip → ⋯ → "Export video…" → press Export MP4. Opening the project fires the preview build fire-and-forget at js/storage.js:133 (`FM.scene.layers.forEach(l => { … FM.ensureReverseCache(l); })`, not awaited); js/home.js:282 opens the export dialog 260ms later. A 10s clip needs ~240 seeks (~7–19s), so the build is still in flight when Export is pressed. Same result from: toggle Reverse in the inspector, or press Play, then export before the "Preparing frames…" toast clears.
- **Costs:** The exported MP4 shows the reversed/slow-mo clip as a 360×640 bitmap stretched to 1080×1920 — obviously blurry — and at the 24fps cache rate rather than the chosen export fps. Preview and export disagree, and the same project exported twice gives different quality depending on whether the preview decode had finished, so the user cannot tell what they will get.
- **Fix:** Record the in-flight build's identity alongside the promise (e.g. `rec._buildingKey = fps + '|' + scaled` set next to `rec._building`, cleared in the same `finally`). Return `rec._building` only when `rec._buildingKey` matches the requested `fps + '|' + scaled`; on a mismatch, chain a fresh build after it — `rec._building = rec._building.then(() => { FM.clearFrameCache(rec); return startBuild(); }, startBuild)` — so the export always gets a cache built to its own opts.
- **Measured:** Verified: the COMPLETED-cache guard at frames.js:59 is correct (checks fps and scaledness, and exporter.js:262 force-clears a scaled cache) — but the very next line, "if (rec._building) return rec._building;", has no scaledness check, so an in-flight preview build is handed to the exporter.

### ~~Edit Shape's "Stroke width" slider reads layer.stroke.width raw and overwrites a keyframed border with a plain number~~ — FIXED v6.45 (bound through evalProp/setProp; the "Line width" rows in the open-path branch and Edit Points had the same defect and were fixed with it)
`js/inspector.js:2873`  · found by `inspector-params`

- **What:** The Element Properties (Edit Shape) panel binds the border width with a plain rangeRow that reads and writes `layer.stroke.width` directly. Border & Shadow makes that exact same field keyframable (`kfNumRow(stk, 'width', 'Size', 0, 100, 1, 6, '')`, line 2743), so it can legitimately hold a `{kf:[…]}` object. rangeRow then does `range.value = get()` with an object (invalid, so the browser silently substitutes the mid-range 30) and `el('span','fx-val', String(get()))`, which prints the literal text "[object Object]".
- **Trigger:** Select a shape (rect/ellipse/polygon/star/pie/ring...). Open Border & Shadow, switch Border on, tap ◆ on Size and set two keyframes (e.g. 30 at 0s, 2 at 1s). Now open Element Properties ("Edit Shape") and nudge the "Stroke width" slider once.
- **Costs:** The `{kf:[…]}` container is replaced by a single number — every border-size keyframe is destroyed silently, the border animation vanishes from preview, export and the saved project, and there is no indication anything was thrown away. Before you even touch it the row is already wrong: the readout says "[object Object]" and the thumb sits at 30 regardless of the layer's real width. Verified live: `{"width":{"kf":[{t:0,v:30},{t:1,v:2}]}}` became `{"width":42}` after one slider input event.
- **Fix:** Bind through the keyframe-aware helper the Border panel already uses: `body.appendChild(kfNumRow(stk, 'width', 'Stroke width', 0, 60, 1, 8, ''));` (or, keeping the slider, `() => FM.evalProp(stk.width, FM.time)` for the getter and `v => FM.setProp(stk, 'width', v, FM.time)` for the setter). The identical raw read exists for open shapes at line 2869 and line 1842 ("Line width" in Edit Points) — the Border panel keyframes stroke.width for open paths too, so both need the same change.

### ~~Edit Shape's "Stroke color" swatch shows black for a keyframed stroke colour and wipes the keyframes on the first pick~~ — FIXED v6.45 (same binding fix; the test drives the real panel, not the helper)
`js/inspector.js:2875`  · found by `inspector-params`

- **What:** Same raw-binding defect on the colour channel. `stroke.color` is keyframable from Border & Shadow (`kfColorRow(stk, 'color', 'Color', …)`, line 2742) and is then a `{kf:[…]}` object, but Edit Shape passes it straight into colorField. `stk.color || '#ffffff'` lets the object through, `normHex()` stringifies it to "[object object]", fails its hex regex and returns '#000000'; the setter assigns a bare string over the whole container.
- **Trigger:** Select a shape, open Border & Shadow, switch Border on, tap ◆ on Color and set two colour keyframes (e.g. #ffffff at 0s, #ff0000 at 1s). Open Element Properties ("Edit Shape") and look at "Stroke color", then pick any colour or type a hex.
- **Costs:** The swatch and hex field both read #000000 instead of the colour at the playhead, so the panel misreports the layer. Picking any colour replaces the `{kf:[…]}` object with a plain string — every stroke-colour keyframe is lost silently and the colour animation stops rendering. Verified live: `{"kf":[{t:0,v:"#ffffff"},{t:1,v:"#ff0000"}]}` showed as swatch "#000000" and became `"#00ff00"` after one hex input event.
- **Fix:** Use the keyframe-aware row: replace the whole `sr` block with `body.appendChild(kfColorRow(stk, 'color', 'Stroke color', '#ffffff'));`, or keep colorField but pass `() => FM.evalProp(stk.color, FM.time) || '#ffffff'` and `v => FM.setProp(stk, 'color', v, FM.time)`.

### ~~Aspect-ratio-locked crop re-derives the ratio from the already-rounded crop each step, so dragging Width destroys the source aspect~~ — FIXED v6.46 (ratio captured once per gesture in the panel-builder scope, which the release refresh clears). NOTE: its test models the arithmetic rather than driving the real closure — attachGlide did not respond to synthesised pointer events — so a rebinding of the row would not be caught. Drive the real box if this area is touched again.
`js/inspector.js:1758`  · found by `inspector-params`

- **What:** resizeCrop recomputes the locked ratio from the CURRENT crop (`c.h / c.w`) on every call and writes back an integer-rounded height. Each step's rounded result becomes the next step's ratio, so the rounding error compounds across the hundreds of pointermove events in one drag. The ratio decays steadily and, once the height bottoms out on the `Math.max(1, …)` floor while the width is still large, collapses to exactly 1:1.
- **Trigger:** Select a photo or video layer, open Element Properties ("Edit Shape"). Leave "Aspect Ratio Locked" on — it is the default (`let _szLock = true`, line 1695). Drag the Width value box to the left.
- **Costs:** The crop silently stops matching the locked ratio, so preview and export are cropped to the wrong shape while the lock button still says the ratio is held. Measured on a 1920x1080 source: a slow drag from Width 1920 down to 1016 produced h=508 instead of the correct 572 (16:9 became 2:1); dragging down to the minimum and back up produced a 901x901 square crop instead of 901x507. The Height box has the same defect via `c.w / c.h`.
- **Fix:** Capture the ratio once and hold it for the whole gesture instead of re-deriving it from the mutated crop — e.g. store `const lockR = c.h / c.w` at pointerdown (or fall back to `MH / MW`) and use that fixed value in both branches, so `nh = clamp(round(nw * lockR))` and `nw = clamp(round(nh / lockR))`.

### ~~Edit Points overlay ignores flipH/flipV (and the parent chain), so point drags move the shape the wrong way~~ — FULLY FIXED. Flips v6.53; parent chain v6.54, by routing toCanvas/toLocal through FM._layerCTM (the compositor's own matrix) instead of hand-deriving it. Measured with the fallback forced: overlay (-10,-20) vs compositor (251.9,58.8). The hand path remains as a fallback and keeps the flip fix.
`js/point-edit.js:41`  · found by `tools`

- **What:** The compositor's placement matrix is T·R·S·K·F — `applyLayerTransform` ends with `if (layer.flipH || layer.flipV) ctx.scale(layer.flipH ? -1 : 1, layer.flipV ? -1 : 1)` (js/compositor.js:5363), and it is preceded by `applyParentChain` (js/compositor.js:5331). point-edit's `xform()`/`toCanvas()`/`toLocal()` re-derive that matrix by hand and compose only T·R·S·K: they read scale/scaleX/scaleY/rotation/skewX/skewY/anchorX/anchorY and never read `l.flipH`, `l.flipV` or `l.parent`. So the overlay's mapping is the compositor's matrix with the innermost mirror (and the whole parent transform) missing.
- **Trigger:** Draw a freehand or vector path (or select any point shape), open the layer ⋯ / right-click menu and tap "Flip Horizontally" (FM.layerMoreItems, js/app.js:2212 — no type guard, available on every layer). Then open Edit Shape, which auto-enters Edit Points (js/inspector.js:2848), and drag a vertex.
- **Costs:** The point markers, insert rings, curve preview and tangent handles are drawn mirrored about the layer's anchor, so they sit away from — often on the opposite side of — the shape actually on screen. Because `toLocal` is the exact inverse of the same wrong matrix, the overlay tracks the finger while the RENDERED point moves the opposite way: drag a handle right and the shape's point goes left. The Edit Points panel's X/Y readouts (`getSel()` → `toCanvas`) report the mirrored position too. Same failure for a parented point shape: the overlay sits at the layer's raw local coords, detached from where the compositor draws it (canvas-edit.js handles this via `parentXform`; point-edit does not).
- **Fix:** Stop re-deriving the matrix. `FM._layerCTM(layer, t, scene)` (js/compositor.js:5385) already returns the compositor's exact project-space matrix including the parent chain, z-perspective and the flips — map (shapeW*(u-ax), shapeH*(v-ay)) through it in `toCanvas` and through its inverse in `toLocal`. Minimum in-place fix: add `fx: l.flipH ? -1 : 1, fy: l.flipV ? -1 : 1` to `xform()`, apply `px *= m.fx; py *= m.fy;` in `toCanvas` BEFORE the skew step (the flip is innermost), and divide `rx`/`ry` by `m.fx`/`m.fy` at the end of `toLocal`.

### ~~reIdLayers doesn't remap effect layer references (fx.params.source), so Luma Matte / Displacement Map / Compound Blur / Match Grade silently break on project duplicate, import, and template insert~~ — VERIFIED FIXED, re-swept at v5.77
`js/storage.js:530`  · found by `storage`

- **What:** reIdLayers() mints fresh layer ids and remaps exactly two classes of cross-layer reference: l.parent (line 526) and behaviors[].params.targetId / sourceId (lines 530-533). It does NOT touch layer.effects[].params.source, which is the layer-id reference written by every effect declared with `layer: true` in the registry — displacemap (compositor.js:496), polardisplace (:500), lumamatte (:705), compoundblur (:715), matchgrade (:721). fx-registry.js:172 confirms the key: `if (def.layer) out.unshift({ key: 'source', ... type: 'layer' ... })`. reIdLayers is the re-id path for FM.projects.duplicate() (storage.js:752), FM.storage.applyScene() (:461, i.e. .fmotion.json import), FM.templates.useAsNew()/insertInto() (:886, :898) and FM.elements.insert() (:959). After re-id the stored source id refers to a layer that no longer exists in the new scene, and the compositor's lookup `scene.layers.find(l => l.id === srcId && l.id !== layer.id)` returns undefined. (layer.karaokeOf, audio-tools.js:142, is the same unremapped-ref class.)
- **Trigger:** Build a project with a shape/gradient layer B and a video layer A carrying Luma Matte with "Matte layer" = B. On the Home screen tap the project's ⋯ menu → Duplicate (identically: Save project file… then Import project file…, or Save as template… then use the template).
- **Costs:** In the copy, layer A renders with no matte at all — the full uncut rectangle instead of the cutout — because compositor.js:2676 hits `if (!mLayer || _dspLvl > 6) { drawLayer(ctx, clean, t, scene); return; }`. Same silent fallback for Compound Blur (no blur map), Match Grade (no grade), Displacement Map / Polar Displacement (fall back to self-displacement by own luma). No error, no toast; the broken reference is then autosaved into the copy, so it is permanent. The user's duplicated/imported/templated project renders differently from the original.
- **Fix:** In reIdLayers, remap effect layer refs (and karaokeOf) through the same table, right after the behaviors pass:      out.forEach(l => {       if (Array.isArray(l.effects)) l.effects.forEach(fx => {         if (fx && fx.params && fx.params.source) fx.params.source = map[fx.params.source] || '';       });       if (l.karaokeOf) l.karaokeOf = map[l.karaokeOf] || null;     });  (js/app.js:1391 and :1485 need the same addition for the in-project duplicate/paste paths, but there the rule differs: only remap when map[id] exists, since a ref pointing outside the duplicated subtree must be left alone.)

### ~~Motion tracker ignores layer.crop and builds its template from the wrong source pixels~~ — FIXED v8.93 (the crop origin is added going into cache space and taken off coming out; the two conversions are now one exported factory, so the suite checks they are inverses without building a frame cache)
`js/tracker.js:210`  · found by `behaviors-tracker`

- **What:** geom() sizes the layer with FM.layerSize(), which for a cropped video/image returns the CROP box (compositor.js:6978-6981), so projToContent() returns coordinates in CROP-BOX space — local content (0,0) is source pixel (crop.x, crop.y), matching how the compositor samples the clip (compositor.js:6557). But track() converts that seed to cache pixels with `rx = cw / m.width`, where m.width is the FULL source width (media.js:39). The crop origin is never added, so the template patch is grabbed from source pixel (seed.x, seed.y) instead of (crop.x + seed.x, crop.y + seed.y). boxContentPx is likewise derived from full-source dimensions.
- **Trigger:** Crop a video layer (Free Crop tool, or the inspector crop rows -> layer.crop set at crop-tool.js:150), then open Move & Transform and tap the auto-track button (inspector.js:1906). tracker.pick() only rejects non-video and parented layers — there is no crop guard. Tap a face, press Track. Example: 1080x1920 clip cropped to {x:0,y:600,w:1080,h:1080}; tapping the centre of the frame yields seed (540,540), whose true source pixel is (540,1140); the tracker templates source (540,540) — 600px away.
- **Costs:** The tracker locks onto a completely different feature and writes x/y keyframes that follow it, so the tapped point does not stay pinned and the clip drifts/jumps. It fails silently: the seed box drawn by paint() uses contentToProj(), the exact inverse of projToContent(), so it lands correctly on the tapped feature and gives the user no warning. The old x/y keyframes are destroyed (layer.transform.x/y are replaced wholesale at lines 268-269).
- **Fix:** Add the crop origin on the way in and take it back off on the way out. In track(), after rx/ry: `const cr = (FM.cropOf && layer.crop) ? FM.cropOf(layer, seedT) : { x: 0, y: 0 };` then line 210 becomes `const scx = (cr.x + seed.x) * rx, scy = (cr.y + seed.y) * ry;` and line 234 becomes `pos[k] = { cx: nx / rx - cr.x, cy: ny / ry - cr.y };`. (A minimal alternative, matching the existing parented-layer guard at line 124, is to refuse cropped layers in pick() with a toast.)
- **Measured:** Verified: rx/ry derive from m.width/m.height (tracker.js:181-182) and layer.crop appears nowhere in the tracking path.

### ~~Tracker retains a full-frame Float32Array for every cached frame, doubling an already over-budget cache~~ — FIXED v8.94 (one-slot grayscale cache since the walks are monotonic; the byte budget goes through FM.frameCacheLimits() instead of a hard-coded 96–360MB; and the frame cache is handed back after a track unless the layer is reversed or frame-blended)
`js/tracker.js:184`  · found by `behaviors-tracker`

- **What:** grayAt() memoises the grayscale conversion of every frame index it touches into grayCache, and nothing ever evicts or clears it for the life of track(). Each entry is a Float32Array(cw*ch) — exactly the same byte count as the RGBA ImageBitmap it was derived from — so peak memory is ~2x the frame-cache budget. That budget is itself hard-coded (line 177) instead of going through FM.frameCacheLimits(), which caps a 2GB phone at 128MB / 640px (tests/tests.js:148-167, the v4.70 OOM fix); the tracker floors at 96MB and ceilings at 360MB on every device. The memoisation buys nothing on the common path: walk(1) and walk(-1) visit disjoint, monotonically-ordered index ranges, so only the immediately-previous index is ever re-read (and only when project fps > trkFps).
- **Trigger:** On a phone, tap the auto-track button on a ~60s 1080x1920 video clip and press Track. clipFrames = 1800, so budget = min(360MB, max(96MB, 1800*400*225*4)) = 360MB; with maxDim 440 each frame is 248x440x4 = 436KB, giving count = 825 frames. buildFrameCache holds 825 ImageBitmaps (~360MB) and grayCache accumulates 825 Float32Arrays (~360MB) on top.
- **Costs:** ~720MB resident on a device whose measured frame budget is 96-128MB — mobile Safari OOM-kills the tab mid-track, losing the session. Even when it survives, the tracker's cache is left on m.frameCache afterwards (nothing clears it), so the memory stays held for the rest of the session and FM.ensureReverseCache later short-circuits on it (app.js:714).
- **Fix:** Replace the unbounded map with a one-slot cache, since the walks are monotonic: `let _gIdx = -1, _gVal = null; const grayAt = (idx) => { if (idx === _gIdx) return _gVal; const bmp = fc.frames[idx]; if (!bmp) return null; _gIdx = idx; _gVal = grayFrom(bmp, cw, ch, scratch); return _gVal; };` and clamp the byte budget through the device limit: `const lim = FM.frameCacheLimits ? FM.frameCacheLimits() : { maxBytes: 96*1024*1024 }; const budget = Math.min(lim.maxBytes, Math.max(48*1024*1024, clipFrames*400*225*4));`. Also FM.clearFrameCache(m) after the track if the layer is not reversed/frame-blended.
- **Measured:** Verified: grayCache is a plain object with no eviction (tracker.js:184), and walk(1)/walk(-1) visit every frame, so one full cw x ch buffer is retained per frame on top of a frame cache already budgeted up to 360MB.

### ~~Export / Canvas modals (z-index 50) render behind the phone inspector sheet (z-index 55) — their buttons are invisible and unclickable~~ — VERIFIED FIXED, re-swept at v5.77
`styles.css:1166`  · found by `css-mobile`

- **What:** The three app modals share one rule at z-index 50, but every piece of phone chrome added later sits above them: #inspector-panel is z-index 55 (styles.css:1292), #ai-panel 58, #toast 60, #add-fab 61, #add-sheet 63. #app / #main create no stacking context (no transform, no z-index, position:static), so the dialog and the sheet compete in the root stacking context and the sheet wins. showExportDialog() in js/app.js:1943 only does classList.remove('hidden') — it never closes or lowers the sheet.
- **Trigger:** Phone (<=700px). Press-and-hold a track head to enter multi-select and pick 2+ layers (js/timeline.js:542). body.sel-multi keeps #m-export visible (styles.css:1367 hides only #m-settings/#m-proj-more) while syncSheet() holds the inspector sheet open at max-height:52vh. Tap the green Export button.
- **Costs:** Verified live at 380x720: the .export-card spans y=162.75..557.25 while the opaque inspector sheet covers y=500..720. document.elementFromPoint() at the centre of both #exp-go ("Export MP4") and #exp-cancel returns insp-grab — the sheet's close handle. The user sees a headless dialog with no buttons; tapping where Export is dismisses the sheet instead of exporting. The same applies to #export-overlay's Cancel button once an export is running, and to #canvas-dialog.
- **Fix:** Raise the modal layer above all phone chrome: change styles.css:1166 to `position: fixed; inset: 0; z-index: 100;` (above #add-sheet's 63). This also fixes the FAB/Add-sheet stacking on the same dialogs.
- **Measured:** Verified in source: modal is z-index 50 (styles.css:1166), phone inspector sheet is z-index 55 (styles.css:1292).

### ~~Preview playback/scrubbing seeks the same <video> a frame-cache build is stepping, baking wrong frames into the cache _(unverified)_~~ — FIXED v9.35 (28 of 30 frames measured wrong)
`js/app.js:605`  · found by `async-races`

- **What:** frames.js serializes its own seek consumers through `seekLock` (frames.js:15) so the filmstrip and the frame cache never interleave on one element. Nothing outside frames.js honours that lock, and `rec._building` is never read outside frames.js (only frames.js:60,101,103 reference it). `FM.seekVideosToTime` bails out for a reversed layer only when the cache already EXISTS (`if (layer.reversed && m.frameCache) return;`), which is exactly false for the whole duration of a build, so it writes `m.el.currentTime` on line 608. `tick()` does the same every animation frame at js/app.js:798-802 (`if (layer.reversed) { if (!m.frameCache) { … m.el.currentTime = local } }`). The builder's only defence is seekAndPaint's 0.2s tolerance and two retries (js/frames.js:35); a competing seek stream burns both retries, `fin()` resolves anyway, and `createImageBitmap(el)` (frames.js:90-92) captures whatever frame the preview left on the element. Note 0.2s is ~5 slots at the cache's 24fps, so even a single competing seek inside tolerance yields a wrong frame with no retry at all.
- **Trigger:** Press Play, then — while it is playing — tick "Reverse (video + audio)" in the inspector (js/inspector.js:2607). `layer.reversed = v` is set before the await, so tick() immediately starts seeking that element ~60×/second while `ensureReverseCache` decodes it. Same corruption from dragging the playhead while the "Preparing frames…" toast is up, or from any edit that calls `FM.seekVideosToTime()` (clip move, speed change, split) during the build.
- **Costs:** The decoded frame cache contains frames from wherever the playhead happened to be, for the whole span the user kept playing/scrubbing. Reversed playback and scrubbing then render visibly wrong pictures (jumps to unrelated moments in the clip), and it persists for the rest of the session — the cache is only rebuilt if reverse is toggled off and on or the project is reopened. `el.currentTime = wasTime` at frames.js:98 also yanks the element back to where it sat when the build started, discarding the user's scrub position.
- **Fix:** Make the preview stand down while a build owns the element: add `if (m._building) return;` at the top of the per-layer body in `FM.seekVideosToTime` (js/app.js:604) and guard the reversed branch in `tick()` the same way (js/app.js:798). A build already restores `currentTime` when it finishes, and `ensureReverseCache` calls `render()` afterwards, so the preview picks the frame back up on completion.

### ~~Dragging an effect's ⠿ reorder grip on a phone drags the whole inspector sheet down and deselects the layer instead _(unverified)_~~ — VERIFIED FIXED, re-swept at v5.77
`js/mobile.js:75`  · found by `mobile-js`

- **What:** `makeSwipeDown()` claims any downward pointer drag inside `#inspector-panel` as a dismiss gesture whenever the panel is scrolled to the top. It exempts controls that own vertical drags via a hard-coded selector list, but `.fx-grip` — the effect-reorder handle — is not in that list. `.fx-grip` is declared `touch-action: none` (styles.css:683) precisely because it owns its gesture, and inspector.js:675 starts the reorder on pointerdown (`if (e.target.closest('.fx-grip')) beginReorder();`). The pointerdown bubbles to the panel, mobile.js sets `active = true`, and on the first 6px of downward movement it claims the gesture: `panel.setPointerCapture(pid)` steals the pointer away from the `head.setPointerCapture()` that inspector.js took, so the reorder's own `pointermove`/`pointerup` on `head` stop firing (its `down`/`mode` state is never cleaned up), and `e.preventDefault()` + `translateY` make the sheet follow the finger. On release, `settle()` fires `dismiss()`, which in `m-editing` is `FM.selectLayer(null)`.
- **Trigger:** On a phone (≤700px), select a layer, open Effects, add two or more effects so the ⠿ grips appear (inspector.js:727 only renders the grip when `effects.length > 1`), then press a grip and drag it downward to move that effect below the one under it. Same for the audio-effect grips at inspector.js:880.
- **Costs:** The reorder never happens — the effect list is unchanged. Instead the whole inspector sheet slides down under the finger and, on release, the layer is deselected and the sheet closes, throwing the user back to the un-selected timeline. Reordering effects downward is simply impossible on a phone; the user's edit is silently dropped.
- **Fix:** Add `.fx-grip` (and `.row-drag`, which is the same kind of explicit drag handle) to the exemption selector at js/mobile.js:75: `… '.mt-trackpad, .mt-dial-ring, .mt-scrub, .mt-vbox-val, .fx-scrub, .fx-grip, .row-drag, .es-canvas, .ge-canvas, .cw-canvas, input, textarea, select'`

### ~~Sample clip is dead on Safari/iOS: MediaRecorder is constructed with a mimeType isTypeSupported already rejected, and the leaked AudioContext eventually kills all app audio~~ — RE-OPENED then FIXED v9.36 (the old "not reproducible" was reached in Chrome)
`js/sample.js:34`  · found by `home-media`

- **What:** Lines 31-33 probe two webm codec strings and, when both fail, fall through to the bare literal `'video/webm'` — a value that was never tested. Safari's MediaRecorder only produces `video/mp4`, so all three webm strings are unsupported and `new MediaRecorder(stream, { mimeType: 'video/webm' })` throws NotSupportedError. The throw happens at line 34, *after* `const ac = new AC()` (line 20), `osc.start()` (line 28) and `dest`/`stream` are created, and there is no try/finally — so the AudioContext, its running oscillator and the canvas captureStream tracks are never torn down. `FM.addSampleClip` is `async`, so the throw becomes an unhandled rejection; the two real call sites (`js/addmenu.js:98` and `js/timeline.js:1434`) call it bare with no `.catch`, so nothing is reported to the user. (The only guarded call site is the dev path at `js/app.js:2176`.)
- **Trigger:** On an iPhone/iPad or macOS Safari, open Add → Media → tap "Sample clip" (or timeline context menu → "Add sample clip").
- **Costs:** The button does nothing at all — no clip, no toast, no error — and every tap strands one live AudioContext with a running oscillator. js/media.js:90 documents that iOS caps live AudioContexts at ~4, so after roughly four taps every audio feature in the app (playback, waveforms, audio FX, export mixing) stops working until the page is reloaded.
- **⚠️ WHY THE OLD "NOT REPRODUCIBLE" VERDICT IS VOID (17 Aug, adversarial re-sweep).** It was reached **in Chrome headless — the one browser where a Safari-only bug cannot fire.** So the refutation tested a browser the finding does not apply to and concluded the finding was false. **This matters more than most entries here because Ezra's own device report says `Safari · iOS`**, so this is a dead button on the machine he actually uses.
  The code is **unchanged, verbatim as filed**: `git log --oneline -- js/sample.js` returns exactly ONE commit — the file has never been edited since it was created — and `grep -rn "isTypeSupported\|MediaRecorder" js/` hits only sample.js and voice-rec.js, so no guard landed elsewhere either. The ladder probes two webm strings and then falls through to the bare literal `'video/webm'`, the one value `isTypeSupported` was never asked about. There is no `video/mp4` rung. The teardown at sample.js:60 sits *after* the throw point and behind an await that never resolves, with no `finally` — so every tap strands a live AudioContext with a running oscillator, and iOS caps those at about four.
- **Fix:** Add `video/mp4` (and `video/mp4;codecs=avc1,mp4a`) to the isTypeSupported ladder and, if nothing matches, construct `new MediaRecorder(stream)` with no mimeType (letting the UA pick) rather than a string it just rejected. Wrap everything from line 20 onward in try/catch (or try/finally) so `osc.stop()`, `ac.close()` and `stream.getTracks().forEach(t => t.stop())` always run, and surface `FM.toast('Could not record a sample clip on this browser')` on failure.


## ⚠️ Adversarial re-sweep, 17 Aug — every remaining open finding verified against the live code

Each one was audited by an agent that read the real code (line numbers in these entries are often stale, so it searched by symbol) and was then handed to a second agent whose only job was to REFUTE the verdict. Run because an entry picked up earlier that day turned out to have been fixed releases ago with its own suggested fix already in the file verbatim — trusting this file costs a release.

**Result: 0 stale, 6 confirmed still-real, 1 disputed.** The file is in better shape than feared, with one exception that matters:

- **`Sample clip is dead on Safari/iOS` was RE-OPENED.** It had been marked REFUTED / NOT REPRODUCIBLE — but that verdict was reached in **Chrome headless, the one browser where a Safari-only bug cannot fire**. Ezra's own device report says Safari on iOS. A real bug on his actual device had been closed by testing the wrong browser. *(Lesson worth keeping: "not reproducible" is only meaningful on a platform where the bug could reproduce.)*
- **`a clip that outlives its source restarts the audio` is DISPUTED** — the auditor found the guard, the skeptic found it exists on only ONE of the two paths (`syncMediaToClock` has it; `FM.play()` does not). Treat as still real until measured.
- Confirmed still-real, by impact: **preview seeking the same `<video>` a frame-cache build is stepping** (high — bakes wrong frames into reversed/slow-mo clips), **Sample clip on iOS** (high), then the crop-easing latch, the karaoke double-twin, preset capture dropping loopMode, and `FM.media.set()` leaking the replaced media.

## Medium (44)

### ~~AI validator whitelists setProp path 'solo', which blanks the whole scene with no UI left to undo it~~ — FIXED v6.49 (case deleted; guarded by a test that reads the shipped source, since the panel is not wired in the harness)
`js/ai-ops.js:67`  · found by `ai-security`

- **What:** applySetProp accepts `path: 'solo'` and writes `layer.solo = true` on a single layer. `solo` is still a live engine flag: js/compositor.js:6915-6918 computes `const soloActive = scene.layers.some(l => l.solo)` and then `if (soloActive && !L.solo) continue;` — every non-soloed layer stops drawing. js/exporter.js:124,128 mirrors the same gate for audio, and js/scene.js:188-190 (FM.soloSilenced) mutes non-soloed layers in preview. The per-layer solo toggle was removed on purpose in v1.75 (commit 69563ae); the only remaining writer is the export dialog's 'Hide other layers' (js/app.js:2000-2002), and its `finally` at js/app.js:2030 restores each layer's PREVIOUS value, so it cannot clear an AI-set solo either. `git log -S"case 'solo'" -- js/ai-ops.js` shows this line was added in v1.35 (AI Director) and simply outlived the UI that could reverse it.
- **Trigger:** Open the AI Director panel and use the Refine box (or the Generate prompt) with editor vocabulary such as "solo the hero title" or "just show the title, hide the rest". `path` is a free-form string in the tool schema (js/ai-manifest.js:96), so the model emits `{op:'setProp', ref:'title', path:'solo', value:true}` and applyOps accepts it.
- **Costs:** Every other layer disappears from the canvas preview AND from the exported file, and non-soloed video layers go silent. `solo: true` is part of the layer object, and FM.storage.serializeScene (js/storage.js:181) saves `layers: scene.layers` wholesale, so it is autosaved and survives reload. There is no control anywhere in the app to turn it back off — the project looks permanently gutted unless the user happens to hit undo immediately.
- **Fix:** Delete `case 'solo'` from applySetProp so the op is dropped with a logged reason like every other unknown path. Solo is now an export-dialog-internal transient, not a persistable layer property, so nothing outside app.js should be able to set it.

### ~~After the no-key demo, Refine and Re-roll stay stuck in mock mode even with a real key, silently discarding the user's instruction~~ — FIXED v6.50 (dry now derives from FM.aiKey.has(), not the sticky _lastBuild flag)
`js/ai.js:274`  · found by `ai-security`

- **What:** `refine()` derives its dry-run flag from the sticky `FM.ai._lastBuild.dry` (`var dry = !!(FM.ai.DRY_RUN || (lb && lb.dry));`) and never consults `FM.aiKey.has()`. `rerollTask()` does the same at js/ai.js:240 (`state.dry = lb.dry;`). `_lastBuild` is set with `dry: true` by the demo run at js/ai.js:216 and is never cleared when a key exists. With `state.dry` true, `call()` short-circuits at js/ai.js:25 to `FM.aiMock.respond(...)` — no network, no key use, no model.
- **Trigger:** With a saved key, open the panel (compose mode), click the key note 'Key: sk-ant-… · change' (js/ai-panel.js:120), then click '▶ Watch a demo run (no key, no spend)' (js/ai-panel.js:86-87 → runDemo, js/ai-panel.js:188, `dryRun: true`). On the done screen, type a real request into the Refine box, e.g. "make the background dark navy", and press Enter.
- **Costs:** The instruction is thrown away: js/ai-mock.js:93-104 keyword-matches only gold/red/blue/green/big/small/bold/glow, so "dark navy" falls through to the hardcoded fallback and a drop shadow is added to the demo title instead. The op is applied and committed to history, and the panel reports 'Refined your scene · 1 op · Critic · Opus' (js/ai.js:296) — attributing canned mock output to an Opus vision call that never happened. Every subsequent Refine and every ↻ re-roll in that session stays in mock mode until a fresh Generate runs.
- **Fix:** In both refine() and rerollTask(), compute dry from the live key state rather than the stale build flag: `var dry = !!FM.ai.DRY_RUN || !FM.aiKey.has();`. The demo's mock layers are real layers with real ids, so a genuine critic call resolves them fine.

### ~~The spend cap is not checked in refine() or rerollTask(), so post-build Opus+vision calls run unbounded~~ — FIXED v6.50 (same gate generateScene uses, at the top of both)
`js/ai.js:278`  · found by `ai-security`

- **What:** generateScene gates its two expensive stages on the cap (js/ai.js:168 for the builder fan-out, js/ai.js:194 before the critic). Neither refine() nor rerollTask() contains any `FM.aiBudget.spentCents() >= FM.aiBudget.capCents` check, and refine() also never resets the meter — it just keeps calling `call(MODELS.critic, ...)`, which is Opus with the full capability digest as the system prompt plus a base64 PNG of the rendered frame and maxTokens 1500. `capCents` is a fixed 25 with no UI to raise it (grep shows the only references are js/ai.js:168,194 and js/ai-budget.js:20,36 — the comment 'the panel lets the user change it' is not true).
- **Trigger:** Run a Generate until the budget ring fills and goes red (`ringFill.classList.toggle('over', frac >= 1)`, js/ai-panel.js:290), then keep using the Refine box on the done screen, or click the ↻ re-roll buttons.
- **Costs:** Each click fires a full Opus vision request on the user's own key with nothing stopping it. The ring is the only feedback and it saturates at 1 (`Math.min(1, …)`, js/ai-budget.js:36), so past the cap it stops conveying how much is being spent. The 25¢ cap the app enforces on its own pipeline is trivially exceeded by the two entry points the user is most likely to click repeatedly.
- **Fix:** Add the same gate at the top of refine() and rerollTask(), after the state.running guard: `if (FM.aiBudget && FM.aiBudget.spentCents() >= FM.aiBudget.capCents) { if (FM.toast) FM.toast('Budget cap reached'); return; }`.

### ~~Toggling Reverse during playback leaves the clip's <video> playing its forward audio over the backwards picture~~ — FIXED v6.48 (tick silences the reversed element every frame; both toggles reconcile; reconcileAudio stops the synth buffer when the last reversed clip goes). Structural, not listened to.
`js/app.js:798`  · found by `audio`

- **What:** `FM.play()` starts a forward clip's element with `m.el.play()` and unmuted volume. `tick()`'s reversed branch only ever writes `m.el.currentTime` — it never pauses or mutes the element, because the invariant "a reversed clip's element was never started" is established at `FM.play()` time and assumed to hold. Neither reverse toggle re-establishes it mid-playback: the inspector checkbox (inspector.js:2607-2611) and the layer context menu (app.js:1761-1765) both set `layer.reversed` and call only `timeline.rebuild / requestRender / seekVideosToTime` — never `FM.reconcileAudio()`. `seekVideosToTime` (app.js:600) also doesn't pause anything, and it early-returns entirely once `m.frameCache` exists (which `await FM.ensureReverseCache(layer)` has just built). So the element is left running, and `FM.audioPlay.start()` is never called for the newly reversed clip either.
- **Trigger:** Press Play on a project containing a video clip with sound, and while it is playing tick "Reverse (video + audio)" in the Speed panel (or pick Reverse from the clip's context menu).
- **Costs:** The picture immediately runs backwards from the frame cache while the element keeps emitting the clip's FORWARD audio at full level — and because tick's reversed branch also skips the volume/fade/solo/mute reconcile, that stray audio ignores every subsequent volume, fade or mute change until the user pauses and plays again. Un-reversing mid-playback is the mirror image: nothing calls `audioPlay.start()`, so the still-running reversed `AudioBufferSourceNode` plays on while tick resumes the element — backwards and forwards audio at the same time.
- **Fix:** Two-line fix, both halves needed. (1) Enforce the invariant where it lives — in tick's reversed branch, silence the element the same way the forward branch does when the playhead leaves the window:  ```js if (layer.reversed) {   try { if (!m.el.paused) m.el.pause(); m.el.muted = true; } catch (e) {}   if (!m.frameCache) { ... } } ```  (2) Make both reverse toggles call `FM.reconcileAudio()` after flipping `layer.reversed`, and drop `reconcileAudio`'s `if (!FM.scene.layers.some(l => l.reversed)) return;` guard (app.js:921) — or replace it with `FM.audioPlay.stop()` — so un-reversing the last reversed clip actually stops the synthesized buffer instead of letting it run out.

### ~~Zoomed preview renders stretched/wrong-aspect after any stage resize — the pinned #canvas-wrap box is never re-measured~~ — FIXED v8.90 (the resizers CALL the re-measure; the ResizeObserver this was written around still fires in neither browser here, which is why it was reverted twice before)

> **ATTEMPTED AND REVERTED, 2026-08-13 (v6.52).** The fix is right and I got half of it proven: calling `FM.refreshPreviewScale()` by hand after a stage change DOES re-measure (canvas 983x983 → 799x799), and its debounce key genuinely needs the stage box added or it early-returns on a pure resize. What I could NOT verify is the hook itself. A ResizeObserver attached BY HAND in the same page reports zero callbacks while the stage measurably goes 630px → 350px, so callback delivery is missing in both the browser pane and the test iframe — and inside run.html the stage will not resize at all, so a behavioural test there measures the harness, not the app. Rather than ship a layout hook I cannot demonstrate, it is reverted. To finish it: add the stage box to `_lastKey` in `FM.refreshPreviewScale` (app.js ~404) AND the observer in `init()`, then verify in a REAL browser window by resizing it.
`js/app.js:307`  · found by `app-playback`

- **What:** In the viewport-crop branch of resizeCanvas(), the wrap is frozen at a hard pixel box (`wrapEl.style.width = kw+'px'; wrapEl.style.height = kh+'px'`) so overlays keep a comp-sized rectangle while the canvas leaves flow. That inline width/height overrides `#canvas-wrap { aspect-ratio: var(--comp-ar) }` (styles.css:150), so the wrap no longer self-corrects — but nothing re-runs resizeCanvas() when the stage changes size. There is no `window.addEventListener('resize', resizeCanvas)` anywhere in the codebase (grep of all resizeCanvas call sites: ai-ops.js:141, app.js:128/133/200/361/575/841/888/938/2123/2509, draw-tool.js:183/267, history.js:39, storage.js:128/480/889 — none is a resize/layout hook). When the stage shrinks, `max-height: 92%` clamps the pinned height while the pinned width stays put, so the wrap's aspect changes and the canvas — sized in % of that wrap — is stretched.
- **Trigger:** Zoom the preview past 1.35x (view-bar +, or pinch), then change the stage size without touching zoom: (a) drag the desktop timeline splitter #tl-resizer up, or (b) rotate the phone / resize the window / open the on-screen keyboard.
- **Costs:** The comp renders visibly distorted and stays that way until something else happens to call resizeCanvas(). Verified live at localhost:8777: a 1:1 circle became a wide ellipse; #canvas-wrap went from aspect 0.5624 to 1.1985 against a comp aspect of 0.5625 — a 2.13x horizontal stretch (screenshot confirmed). Second repro at 700x900 -> 700x620: wrap aspect 0.561 -> 0.814. Same missing hook also strands the backing store at a stale resolution even when not cropped: shrinking the window from 1280x900 to 1280x420 left the canvas at 961x1709 when 367x653 was correct — 6.8x more pixels painted every frame, which on a phone after a rotation is pure wasted GPU/memory (and the reverse direction leaves the preview soft).
- **Fix:** Re-run resizeCanvas() whenever the stage box changes. One hook covers window resize, phone rotation, the timeline splitter, the inspector drawer and drawing mode, because resizeCanvas() already resets the pin and re-measures at its top (app.js:283-288). In init(), next to the existing `resizeCanvas()` at app.js:2123, add:    if (window.ResizeObserver) new ResizeObserver(() => FM.refreshPreviewScale ? FM.refreshPreviewScale() : resizeCanvas()).observe(document.getElementById('stage'));  (refreshPreviewScale's 120ms debounce keeps a drag from reallocating the backing store per frame; note its `_lastKey` cache at app.js:352-362 must also include the wrap size, or feed the observer straight into a debounced resizeCanvas() instead.)

### ~~requestPlay() starts playback after the user has already left the editor — audio and the rAF loop run under the Home screen~~ — FIXED v6.48 (generation token bumped by FM.pause, re-checked after every await)
`js/app.js:873`  · found by `app-playback`

- **What:** FM.requestPlay() awaits the frame-cache decode (seconds for a reversed / frame-blend clip) and then calls FM.play() unconditionally. FM.play() only guards `if (FM.playing) return` (app.js:835) — it has no notion of the user having navigated away or switched projects in the meantime. Every navigation path only calls FM.pause() (home.js:896, storage.js:701), which sets FM.playing = false; nothing cancels or invalidates the in-flight requestPlay, so the awaited continuation resumes and starts playback for a screen that is no longer visible.
- **Trigger:** Add a reversed (or frame-blend slow-mo) video clip with no frame cache yet, tap play — the sticky 'Preparing frames…' toast appears — and while it is decoding tap the back arrow to Home (or open a different project from Home).
- **Costs:** Verified live at localhost:8777 by stubbing only the decode duration and driving the real requestPlay/play/pause: at t=800ms Home is open and playing=false; at t=3400ms (decode done) playing=true with Home still open and FM.time advancing 0.92 -> 1.72 over the next 800ms, with #btn-play left showing the PAUSE icon. On a real clip m.el.play() also unmutes, so the project browser starts playing the clip's audio with no visible transport, and the rAF tick + full render loop keep running behind the overlay (battery/CPU on a phone). With FM.loop on it never stops on its own. Via FM.projects.open() the same continuation instead starts the newly opened project playing by itself, and FM._reviewFrom left over from FM.reviewPlay (app.js:905) then yanks the playhead to a time belonging to the previous project on the next pause.
- **Fix:** Give the request a generation token that any pause invalidates. Add `let _playGen = 0;` beside `let rafId = null, lastTs = 0;` (app.js:14); bump it in FM.pause() (`_playGen++;` next to `FM.playing = false;` at app.js:877); and in requestPlay capture `const gen = ++_playGen;` at the top, then guard the tail: `if (gen !== _playGen) return; FM.play();`. The same guard belongs inside the loop before each await's continuation, since `FM.media.get(l.id)` returns undefined once a project switch has dropped the old recs and `m.frameCache` on line 870 then throws.

### ~~Undo after "Replace media…" undoes a different edit and can never restore the original file~~ — FIXED v6.49 (mediaRev marker makes the commit a real step, and the outgoing blob is no longer deleted)
`js/app.js:1550`  · found by `app-state`

- **What:** FM.replaceMediaWith swaps only out-of-history state: the media registry (line 1521, `FM.media.set(id, nrec)`) and — via line 1548 — the IndexedDB blob, which is deleted outright. For an image→image swap (or a video whose duration/trim clamp is a no-op) nothing in the layer's JSON changes, so the `FM.history.commit()` on line 1550 hits history.js:52's `if (index >= 0 && stack[index] === s) return;` guard and adds no undo step. The user's next Ctrl+Z therefore lands on the previous, unrelated action while the media stays replaced, and the original file is already gone from both the registry and IDB.
- **Trigger:** Import a photo (layer A) → add a rectangle (layer B) → right-click A → "Replace media…" → pick a different image → press Ctrl+Z once.
- **Costs:** Verified in the running app: after one Ctrl+Z the rectangle B is deleted (layers 2 → 1, B gone) and A still shows the replacement image. Pressing Ctrl+Z again keeps unwinding earlier unrelated edits — A's media stays replaced at every step, because the original blob was removed from IndexedDB and the registry entry overwritten. The user loses an edit they did not intend to undo, and the original footage is unrecoverable.
- **Fix:** Do not delete the outgoing blob. Follow the same rule deleteLayer already documents (js/app.js:1223-1225): keep the old rec and its IDB entry so undo can come back to it, storing the new file under a fresh media key recorded ON the layer (e.g. `layer.mediaKey = newId`), which puts the media identity inside the history snapshot. Then the replace produces a real undo step and Ctrl+Z restores the original clip. Minimum viable fix if the media key can't move into the doc: stamp a serialisable marker on the layer (e.g. `layer.mediaRev = (layer.mediaRev||0)+1`) before `FM.history.commit()` so the commit is never swallowed by the identical-state guard, and stop calling `FM.storage.removeMedia(id)` on the replace path.

### ~~A layer added while inside Edit Group gets no timeline row at all~~ — FIXED v6.47 (all eight creators route through FM.insertLayer)
`js/app.js:1027`  · found by `app-state`

- **What:** FM.addEmptyGroup (line 1246) and FM.groupSelection (line 1268) both nest into the open group with `if (FM.groupContext) g.parent = FM.groupContext;`. None of the other creators do: FM.addTextLayer (972), FM.addNullLayer (987), FM.addShapeLayer (1027), FM.addPathLayer (1059), FM.addCameraLayer (1106), FM.addAdjustmentLayer (1118), FM.addCaptionLayer (1134) and FM.addMediaLayer (955) all `FM.scene.layers.unshift(layer)` with `parent: null`. The timeline's Edit Group view filters with `if (gctx) { if (!inSubtree(layer, gctx)) return; }` (js/timeline.js:1188), and a parentless layer is in no subtree, so the row is never built. The compositor knows nothing about groupContext, so the layer still renders.
- **Trigger:** Group two layers → ⋯ → "Edit group" → Add → Rectangle (or Text, Captions, a freehand drawing, an imported clip).
- **Costs:** Verified in the running app: layers went 3 → 4 → 5 while the timeline stayed at 2 rows, and no empty-state message appeared either. The new layer is selected and visibly drawn on the canvas but has no clip in the timeline — it cannot be trimmed, moved in time, split, reordered, keyframed from the timeline, or even seen to exist. It is also not actually in the group, so animating the group afterwards silently leaves it behind. On a phone the timeline IS the layer list, so the layer is completely unreachable until the user happens to back out of the group.
- **Fix:** Give every creator the line addEmptyGroup already has. Cleanest is one hook at the single insertion point — e.g. an `FM.insertLayer(layer)` helper that does `if (FM.groupContext && !layer.parent) layer.parent = FM.groupContext;` then `FM.scene.layers.unshift(layer)` — and route all eight `FM.scene.layers.unshift(layer)` sites (js/app.js:955, 972, 987, 1027, 1059, 1106, 1118, 1134) through it.

### ~~deleteSelected leaves FM.groupContext pointing at the group it just deleted, blanking the timeline~~ — FIXED v6.47 (shared exitDeadGroupContext(), also applied to resetProject)
`js/app.js:1197`  · found by `app-state`

- **What:** FM.deleteLayer validates the group view before removing a layer (`if (FM.groupContext === id && FM.exitGroup) FM.exitGroup(true);`, line 1212), and history.restore does the same for undo (js/history.js:32-34). FM.deleteSelected does neither: it filters the group and its descendants out of FM.scene.layers on line 1197 and never checks whether FM.groupContext survived. Since FM.selectAll (line 1163) selects every layer in the project regardless of the group scope, the group the user is inside is routinely in the delete set.
- **Trigger:** Group two layers → ⋯ → "Edit group" → Select All (Ctrl+A or ⧉ → "Select All Layers") → press Delete/Backspace (or the top-bar delete button, which routes to deleteSelected when more than one layer is selected).
- **Costs:** Verified in the running app: after the delete, `FM.groupContext` still equals the deleted group's id, `#group-crumb` is still visible showing the dead group's name, and `body.group-editing` is still set. Adding any layer afterwards gives timelineRows = 0 with no empty-state message either — the timeline is a completely blank panel while the layer exists, is selected and is drawn on the canvas. Any group created while in this state (addEmptyGroup / groupSelection) is written with `parent` pointing at the deleted id and that dangling parent is autosaved. The same gap exists in FM.resetProject (line 559), which also wipes every layer without clearing groupContext.
- **Fix:** After the filter on js/app.js:1197, add the same validation history.restore uses: `if (FM.groupContext && !FM.scene.layers.some(l => l.id === FM.groupContext)) { if (FM.exitGroup) FM.exitGroup(true); else FM.groupContext = null; }` — placed before the FM.refreshAll() on line 1203 so the crumb and body class clear with it. Add the identical check to FM.resetProject (js/app.js:559).

### ~~Fade-in on a reversed clip starts partway up (a pop) when the clip begins after the playhead~~ — FIXED v6.55 (envelope re-anchored at `Math.max(when, base)`). Confirmed by rendering both patterns through an OfflineAudioContext: old reads 0.40 at the audio's start with a 0.4s gap and 0.6s fade — exactly |into|/(|into|+fi) — new reads 0.000.
`js/audio-play.js:123`  · found by `audio`

- **What:** For a reversed clip whose start is ahead of the playhead, `into = FM.time - layer.start` is negative and the source is correctly scheduled to begin at `base = when - into/pr` (a future time). But the fade envelope is anchored at `when`, not at `base`: `setValueAtTime(0, when)` followed by `linearRampToValueAtTime(vol, base + fi/pr)` produces one straight line spanning the silent gap AND the fade window. By the time audio actually starts at `base`, the gain has already climbed to `vol * |into| / (|into| + fi)`. The keyframed-volume branch directly above gets this right — it clamps each point with `rt = Math.max(when, base + b / pr)` so its first `setValueAtTime` lands on `base` — which is what makes this an oversight rather than a design choice.
- **Trigger:** Put a reversed video clip with a 1 s Fade in at 10 s on the timeline, park the playhead at 0, press Play.
- **Costs:** When the clip begins, gain is already at 10/11 ≈ 0.91 instead of 0, so the fade-in is effectively gone and the clip starts with an audible pop. The exporter anchors the same envelope at the clip's own start (`gain.gain.setValueAtTime(FM.fadeMul(layer, oStart - layer.start, clipDur) * vol, at(startOut))`, exporter.js), so the rendered file fades correctly and preview disagrees with export.
- **Fix:** Anchor the first event where the audio actually starts, matching the animVol branch:  ```js const t0 = Math.max(when, base);   // real time at buffer position max(0, into) gain.gain.setValueAtTime(FM.fadeMul(layer, Math.max(0, into), clipDur) * vol, t0); if (fi > 0 && base + fi / pr > t0) gain.gain.linearRampToValueAtTime(vol, base + fi / pr); ```

### ~~Text layers ignore transform.anchorX/anchorY, so moving a text layer's anchor slides the text across the canvas~~ — FIXED v6.52 (translate by (0.5 - anchor) * size; zero at the default, so untouched layers are byte-identical). NOTE: a saved layer with a NON-default text anchor renders in a new place — the intended one.
`js/compositor.js:6333`  · found by `compositor-transform`

- **What:** Every other layer type offsets its content by the anchor (`-sw * tr.anchorX` for shapes at :6338, `-cw * tr.anchorX` for media at :6550). The text branch never reads the anchor at all — it draws at x=0 governed by `ctx.textAlign` and at `i*lh - total/2` vertically, i.e. permanently anchored at 0.5/0.5. But inspector.js:2088-2096 compensates x/y by `(nx - oldX) * asz.w * aEffX()` on every anchor write, and canvas-edit.js:134-136 hit-tests against `-s.w * ax .. s.w * (1-ax)`.
- **Trigger:** Select a text layer → Move & Transform → Anchor → drag the anchor pad or type 0 into Anchor X.
- **Costs:** The text jumps instead of staying put, which is the exact opposite of what the anchor placer promises ('Keep it visually still'). Confirmed by render: 'HELLO' at fontSize 40, x=160, occupies canvas bbox x 97..224 at anchorX 0.5; after the inspector's anchor-0 write (anchorX=0 plus x += -w/2) it occupies 31..158 — a 66px slide. The pivot does not move either, so scaling/rotating still happens about the centre, and the selection box + tap target shift off the glyphs so the text can no longer be selected by tapping it.
- **Fix:** Honour the anchor for text the way the shape/media branches do: after `applyLayerTransform`, for `layer.type === 'text'` apply `const sz = FM.layerSize(layer); ctx.translate((0.5 - ax) * sz.w, (0.5 - ay) * sz.h);` (ax/ay defaulted to 0.5), which maps the centred text box onto `-w*ax .. w*(1-ax)` and matches what the inspector's compensation and canvas-edit's hit-test already assume.

### ~~Pattern-size pixel effects ignore the ps argument, so checker/stripes/crosshatch/blocknoise draw cells up to 2.5x too large in the preview~~ — FIXED v6.56. Measured half-period at scale 1/0.5/0.28: checker 24→48→85.7 becomes 24→24→25; stripes 8→16→28.6 becomes 8→8→10.7. Scale 1 unchanged, so exports are byte-identical. NOTE: crosshatch and blocknoise took the same one-line fix but are NOT measured — the probe reads horizontal runs and neither draws that shape (the halftone control reads zero too, which is how I know it is the instrument).
`js/compositor.js:2393`  · found by `numeric`

- **What:** drawPixelEffect renders into a plate of W = round(PW * ps) and hands the pixel function ps as its 6th argument, with the contract stated inline at line 1516: "ps: effects sized in ABSOLUTE pixels multiply by it so a reduced plate still matches the export". PIXEL_FX.halftone and PIXEL_FX.halftonelines honour it (`Math.round(size * (ps||1))`). PIXEL_FX.checker, .stripes, .crosshatch and .blocknoise omit the parameter entirely, so their px-denominated size/spacing param indexes reduced plate pixels and the pattern period in project space becomes size/ps.
- **Trigger:** Add Checkerboard (or Stripes / Crosshatch / Block Noise) to a layer and compare the preview with the export, or just press play — the adaptive quality ladder changes ps mid-playback and the pattern visibly resizes.
- **Costs:** Measured median half-period along the centre row, converted back to project px: checker(size 24) = 24px at ps=1, 34.3px at ps=0.7, 60px at ps=0.4; stripes(size 16) = 8 / 11.4 / 20; crosshatch(spacing 10) = 9 at ps=1 and 22.5 at ps=0.4. The preview shows roughly half as many checker squares / stripes as the exported file will, and the pattern jumps size every time the playback tier changes.
- **Fix:** Add `ps` as the 6th parameter and scale the size after clamping, matching halftone: checker (2393) `chkSz = Math.max(1, Math.round(chkSz * (ps||1)))`; stripes (2405) `stp_period = Math.max(2, Math.round(stp_size * (ps||1)))`; crosshatch (2463) `sp = Math.max(1, Math.round(sp * (ps||1)))`; blocknoise (2410) scale bnSz (and therefore bnSzY) by `(ps||1)` with a floor of 1.
- **Measured:** Measured: checker 4.2%->1.9% (-55%), dots 3.1%->5.0% (+60%), dither 4.1%->6.3% (+54%), stripes 4.6%->6.1% (+34%) between full scale and tier 0.36.

### ~~Tiles "Repeat: Whole clip" clobbers drawCanvasEffect's shared scratch mid-flight, drawing an extra un-effected copy of the layer~~ — FIXED v6.59 by DEPTH-POOLING A/B (`_cfPool`) and the expanded plate (`_expPool`), which is the third singleton on this path: renderExpandedPlate's own drawLayer can re-enter drawCanvasEffect and call expand() again, so `_expC` had the same aliasing one level up. Measured on the reported scene (400x400, 40x40 square at x=380, Drift -200px/s + Tiles gap 40, t=1), fully-opaque px in the square's UN-DRIFTED footprint: 1521/1521 before — byte-identical to the same scene with the Drift effect deleted outright, i.e. the Drift was gone completely — and 819 after, against 897 for the "On screen" repeat mode that never calls expand(). Locked in by a mutation-checked test.

  The `if (ctx.canvas === _cfA) ctx.clearRect(...)` special case is gone with it, and one thing there is worth recording rather than assuming: that guard was NOT dead code — instrumented on the pre-fix build it fired 4 times across the suite. But deleting it while keeping the singletons leaves the suite green at 229/229, so no test actually observes what its clearing did. It is removed on a structural argument, not a measured one: with the pool, a call's own A comes from its own depth slot while ctx belongs to a shallower one, so the two can never be the same canvas and the branch is unreachable by construction.
`js/compositor.js:3206`  · found by `compositor-effects`

- **What:** `drawCanvasEffect` uses module singletons `_cfA`/`_cfB` (not a depth-indexed pool like `_pfPool`/`_wpPool`/`_mbPool`). The comment at 3195 argues that is safe because a nested canvas effect always finishes before `_cfB` is used — true for the `drawLayer` at 3186, but NOT for the `expand` callback at 3205. `expand()` runs `renderExpandedPlate`, whose `drawLayer(ec, tmp, t, scene)` (line 3162) re-enters `drawCanvasEffect` for the layer's other canvas effect. That nested call clears and rewrites both `_cfA` (the outer call's finished source plate, `A`) and `_cfB` (the outer call's already-cleared destination, `B`) while the outer `tiles` fn is holding references to them.
- **Trigger:** Put a clip so it hangs off the edge of the frame (the only case where `renderExpandedPlate` returns non-null — line 3151), add Tiles (its catalog defaults are Layout = Extend, Repeat = Whole clip, lines 423/430), and add any second canvas effect below it in the stack: Wiggle, Shake, Spin, Pulse, Drift, Orbit, or any 3D solid.
- **Costs:** Verified by instrumented render in the app. Trace of one frame: `CLEAR A, CLEAR A, CLEAR B, DRAW A->B, CLEAR A, DRAW B->A` (A now holds the wiggled layer), `CLEAR B` (outer), then `CLEAR EXP(784x424), CLEAR A, CLEAR B, DRAW A->B, DRAW B->EXP` — the nested render inside expand() wipes both. Measured outcome: 400x400 comp, 40x40 shape at x=380 with Drift -200px/s + Tiles(gap 40, Repeat = Whole clip). The rectangle 361-399 x 181-219 (where the layer sits with the Drift NOT applied) comes back 1444/1444 pixels fully opaque; with Repeat = On screen (which never calls expand) the same rectangle is only 836 pixels. So an extra copy of the clip, missing the other effect, is stamped on top of the tiling, and a full-frame ghost sits underneath it.
- **Fix:** Give `drawCanvasEffect` a depth-indexed pool exactly like `_pfPool`/`_wpPool` — `const _cfPool = []; let _cfDepth = 0;` with `try { ... } finally { _cfDepth--; }` — so a nested canvas effect (whether reached via the drawLayer at 3186 or via expand()) never touches the outer call's A/B. That also removes the need for the special-case `if (ctx.canvas === _cfA)` clear at 3212.

### ~~Two stacked Mirror effects: the inner Mirror is a complete no-op because drawMirror reads and writes the same _miA canvas~~ — FIXED v6.58 by DEPTH-POOLING the plate, which makes the inner call's source and destination different canvases by construction. Measured on the reported scene (240x240, 50x50 shape at x=180): `[L→R]` alone is 0 opaque px both before and after; `[L→R, T→B]` was 2500 opaque px at x 155-204 — the square's original un-mirrored position — and is now 0. Locked in by a mutation-checked test that fails with exactly that message on the pre-fix build.
`js/compositor.js:5129`  · found by `compositor-effects`

- **What:** `drawMirror` renders the clean layer into the module singleton `_miA` and then composites the mirrored strips from `_miA` into `ctx`. When a second Mirror sits above it in the stack, the outer `drawMirror` calls `drawLayer(actx, tmp)` with `actx` being `_miA`'s own context, so the inner call's `ctx.canvas === _miA` — its source and destination are the same bitmap. Every strip blit is source-over onto the pixels it is reading, so nothing is ever replaced. Unlike every sibling (drawTint 4924, drawPosterize 4855, drawThreshold 4957, drawDuotone 4990, drawRgbSplit 4823, drawFogLayer 4894, drawCanvasEffect 3212, draw3DTiltLayer 3281) it has no `ctx.canvas === scratch` handling at all.
- **Trigger:** Add two Mirror effects to one layer — the standard kaleidoscope build (Mirror Left->Right plus Mirror Top->Bottom).
- **Costs:** Verified in the app: 240x240 comp, 50x50 shape at x=180 (entirely in the right half). With `[Mirror L->R]` alone the frame contains 0 opaque pixels — correct, the effect keeps the empty left half and mirrors it. Adding a second Mirror `[Mirror L->R, Mirror T->B]` yields 5000 opaque pixels, and the scanline dump puts them at x 155-204 — the layer's ORIGINAL, un-mirrored position. The inner Mirror did literally nothing; content it should have replaced survives. Adding an effect resurrected pixels the previous effect had removed.
- **Fix:** Depth-index the scratch (`const _miPool = []; let _miDepth = 0;` with try/finally) so a nested Mirror gets its own plate. A bare `if (ctx.canvas === _miA) ctx.clearRect(...)` guard is not enough here — the strip loop reads `_miA` while writing it, so the mirrored output must go to a separate canvas that is then blitted.

### ~~Two stacked Pixelate effects: the un-pixelated layer ghosts through because drawPixelate composites onto its own scratch plate without clearing it~~ — FIXED v6.57 by DEPTH-POOLING the plates (a clearRect guard alone breaks the `size <= 1` path, which blits the plate into ctx). Measured, stack [40,12] on a 240x240 comp: 9216 fully-opaque px before — identical to a single fine pass, so the coarse stage was being undone — and 5184 after.
`js/compositor.js:5204`  · found by `compositor-effects`

- **What:** `drawPixelate` renders the clean layer into the module singleton `_pxA`, then draws the downscaled `_pxS` back into `ctx`. When a second Pixelate is stacked above it, the inner call's `ctx.canvas === _pxA` — the very canvas that already holds the clean, un-pixelated layer — and it composites source-over without clearing first. Every sibling effect has the guard for exactly this case (drawTint 4924 `if (ctx.canvas === _tiA) ctx.clearRect(0, 0, PW, PH);`, drawPosterize 4855, drawThreshold 4957, drawDuotone 4990, drawRgbSplit 4823, drawFogLayer 4894); drawPixelate has none, and neither does its `size <= 1` early return at 5190.
- **Trigger:** Add two Pixelate effects to one layer (e.g. a coarse mosaic plus a finer one).
- **Costs:** Verified in the app: 240x240 comp, 100x100 shape centred at (120,120). With one Pixelate at catalog defaults, pixel (70,70) is fully transparent (alpha 0) — mosaic cell rounding removed the corner. With a second Pixelate stacked, the same pixel is fully opaque (200,60,30,255): the clean layer left underneath in `_pxA` shows through. 784 pixels differ visibly, with a maximum alpha delta of 255. The result is a mosaic with the sharp original bleeding through everywhere pixelation made the plate transparent.
- **Fix:** Depth-index `_pxA`/`_pxS` the way `_pfPool` does (try/finally around a `_pxDepth` counter) so the nested call gets its own plate. A plain `if (ctx.canvas === _pxA) ctx.clearRect(0,0,W,H)` before line 5204 fixes the mosaic path only — it would erase the source on the `size <= 1` path at 5190, so that branch needs to become a no-op when `ctx.canvas === _pxA`.

### ~~crop-tool commit() replaces layer.crop wholesale, destroying a keyframed crop animation~~ — FIXED v8.48
`js/crop-tool.js:150`  · found by `tools`

- **What:** `layer.crop.x/y/w/h` are animatable containers — `FM.cropOf` evaluates each with `FM.evalProp` (js/compositor.js:6969) and the Edit Shape panel offers a ◆ keyframe button and an easing curve for them (js/inspector.js:1733-1746), writing through `FM.setProp(layer.crop, 'w', nw, FM.time)` (js/inspector.js:1764). crop-tool's `commit()` assigns a brand-new object of four plain numbers, so any `{kf:[…]}` container — every crop keyframe and its easing — is overwritten and gone.
- **Trigger:** On a video/image layer open Edit Shape, tap ◆ to keyframe the crop at 0s, scrub forward and change Width/Height (second keyframe) — you now have an animated crop reveal. Then tap "Free crop" (js/inspector.js:1777, the button sits in the same panel as the ◆), drag any box on the video, and tap Done.
- **Costs:** The entire crop animation collapses to one static rect. It is not recoverable from the UI: `commit()` then calls `FM.history.commit()`, which snapshots the flattened crop and triggers `FM.storage.autosave()`, so the loss is committed to history and persisted to localStorage. Nothing warns the user; the Free-crop bar's Done is indistinguishable from any other Done.
- **Fix:** Write through the same API the panel uses, so `{kf}` containers survive and an animated crop auto-keys at the playhead: `if (!l.crop) l.crop = { x: 0, y: 0, w: MW, h: MH };` then `[['x', clamp(rect.x,0,MW)], ['y', clamp(rect.y,0,MH)], ['w', clamp(rect.w,1,MW)], ['h', clamp(rect.h,1,MH)]].forEach(([k, v]) => FM.setProp(l.crop, k, Math.round(v), FM.time));` (FM.setProp, js/scene.js:301, upserts into an animated container and plain-assigns a static one).

### ~~Free-crop overlay ignores flipH/flipV, so the committed crop is the mirror of the box the user dragged~~ — FIXED v8.49
`js/crop-tool.js:36`  · found by `tools`

- **What:** Same root cause as the point editor: crop-tool's `xform()`/`toCanvas()`/`toLocal()` rebuild the layer matrix as T·R·S·K and never read `l.flipH`/`l.flipV`/`l.parent`, while the compositor draws the media through T·R·S·K·F (`ctx.scale(layer.flipH ? -1 : 1, …)` at js/compositor.js:5363, applied after skew, then `drawImage(src, …, -cw*tr.anchorX, -ch*tr.anchorY, cw, ch)` at js/compositor.js:6550). `evtSrc()` maps the pointer to source pixels through that missing mirror.
- **Trigger:** Select a video or image layer, ⋯ → "Flip Horizontally", then Edit Shape → "Free crop", drag a box around something on the left of the picture and tap Done.
- **Costs:** During the drag the dimmed mask, the rule-of-thirds grid and the eight handles all render mirrored, so the hole does not sit under the box the finger is drawing. The rect written to `l.crop` is the horizontal mirror of the region the user framed, so after Done the clip keeps the wrong half of the frame — and because the crop is stored in source pixels, the same wrong region is what exports. A parented media layer fails the same way (overlay drawn at the layer's unparented position).
- **Fix:** Same fix as point-edit.js: either map through `FM._layerCTM(l, FM.time, FM.scene)` and its inverse, or add the flip signs to `xform()` and apply `px *= m.fx; py *= m.fy;` before the skew in `toCanvas`, dividing `rx`/`ry` by them at the end of `toLocal`. Both files should share one helper so they cannot drift from the compositor again.

### ~~MP4 export's only event-loop yield is a setTimeout, so backgrounding the tab throttles the export to a crawl~~ — STRUCK AS STALE, already fixed (queue 47)
`js/exporter.js:371`  · found by `export`

- **What:** The MP4 frame loop never returns to the task queue on its own: `await seekAllVideos(...)` resolves as a microtask whenever there are no video layers (or every seek short-circuits at js/exporter.js:44), and `FM.renderScene` / `encoder.encode` / `frame.close()` are synchronous. Because `VideoEncoder`'s `encodeQueueSize` is only decremented by a task on the control thread, the queue climbs to 9 within nine frames and the loop then parks on `await new Promise(r => setTimeout(r, 4))` — a timer, which browsers clamp to >=1000ms in a hidden tab and to roughly once per minute under Chrome's intensive throttling after 5 minutes hidden. This file already contains the fix for exactly this failure: `nextTick()` (js/exporter.js:244-250, MessageChannel-based, with a comment describing a 2s GIF export turning into minutes when the user switched apps) — but only `runGif` calls it. `runFrames` is incidentally safe because `canvas.toBlob` queues a real task; `run()` is not.
- **Trigger:** Export MP4 of a project with no video layers (a text/shape/image title animation — the app's bread-and-butter content), then switch to another app or another tab, which this codebase already documents users doing mid-export.
- **Costs:** Encoding throughput collapses from hundreds of frames/second to about nine frames per timer wakeup. A 30s 30fps export (900 frames) that finishes in ~20s in the foreground needs ~100 wakeups: ~100 seconds once the tab is hidden, and over 30 minutes once intensive throttling engages at the 5-minute mark. The progress bar and Cancel button are only serviced at those same wakeups, so the export looks hung.
- **Fix:** Use the throttle-proof yield in the MP4 loop, the same way runGif does: replace the backpressure wait with `while (encoder.encodeQueueSize > 8) await nextTick();` and add an unconditional `await nextTick();` at the end of each iteration (after `opts.onProgress`) so progress paints and the Cancel tap can land even when the queue is short.
- **ALREADY DONE when re-checked (17 Aug) — struck as stale, not fixed.** Both halves of that fix are in the file and have been since the queue-47 work: `while (encoder.encodeQueueSize > 8) await nextTick();` and an unconditional `await nextTick();` at the end of every iteration, with a comment carrying the measurement (763ms for 360 frames as one unbroken task before; 54ms longest task and Cancel landing in 148ms after). Verified by reading the live code, not by trusting this entry.

### ~~Cancel is ignored for the whole of a single clip's frame decode, which can run for minutes~~ — FIXED v9.32
`js/exporter.js:255`  · found by `export`

- **What:** `prepareCaches` checks `FM._exportCancel` only at the top of the per-layer loop. The expensive work is the single `await FM.buildFrameCache(...)` call on line 268, which performs up to 900 sequential seek-and-capture operations (js/frames.js:87-96) with no cancellation hook of any kind — `buildFrameCache` never reads `FM._exportCancel`. So a Cancel pressed during "Decoding frames… 12%" sets the flag but nothing reads it until that one clip's decode has fully finished; only then does `break` fire, and the export still proceeds through `buildAudioMix`, the AAC probe, muxer construction and `pickVideoCodec` before the frame loop's first cancel check at line 363 finally throws.
- **Trigger:** Project containing one long reversed (or frame-blend slow-mo) video clip — e.g. a 60s 4K phone clip. Press Export, then press Cancel while the overlay reads "Decoding frames… N%".
- **Costs:** Cancel is a dead button. The overlay stays up and the app keeps seeking and decoding for the full remaining decode — tens of seconds at 1080p, several minutes at 4K (`seekAndPaint` waits up to 500ms per frame, and there are up to 900 of them) — while allocating up to 1.5GB of ImageBitmaps the user just said they did not want. On a phone that is both an unresponsive-feeling app and a real OOM risk.
- **Fix:** Give `FM.buildFrameCache` an abort signal and honour it per frame. Minimal version: accept `opts.shouldAbort` and add `if (opts.shouldAbort && opts.shouldAbort()) break;` at the top of the `for (let i = 0; i < count; i++)` loop in js/frames.js (setting `count = i` / `decoded = ok` so the partial cache is coherent, or discarding it), and pass `{ maxBytes: 1610612736, shouldAbort: () => FM._exportCancel }` from exporter.js:268. Then re-check `FM._exportCancel` immediately after the await and `break`.

### ~~Saving an effect as a preset silently rewrites bounce/elastic/hold/overshoot keyframe easing to linear~~ — FIXED v8.95 (EASE_OK is derived from FM.EASES + FM.EASE_PRESETS instead of naming four; the entry's own repro now round-trips to 40 at t=2.5 and 21.31 at t=3.5, matching the original exactly, where the preset used to give 22.5 and 12.5)
`js/fx-presets.js:55`  · found by `fx-registry`

- **What:** `EASE_OK` whitelists only 4 of the app's easing names. `saneKf()` rewrites any keyframe whose `e` is not in that map to `'linear'`. But scene.js defines `FM.EASES = {linear, easeIn, easeOut, easeInOut, bounce, elastic, hold}` and `FM.EASE_PRESETS` adds `overshoot`/`anticipate` — and graph-editor.js:108 writes those names bare (`kf.e = key; delete kf.bez;`), so there is no `bez` for evalProp to fall back on. Every preset round-trip therefore flattens bounce, elastic, hold, overshoot and anticipate to a straight ramp. `readCustom()` re-applies this on every read, so the loss is permanent.
- **Trigger:** Keyframe an effect param (e.g. Gaussian Blur → Radius), tap the easing button on that param row (inspector.js:401), pick Bounce / Elastic / Hold / Overshoot in the curve editor, then ⋯ → "Save as preset…". Hold that effect's tile in the Add-Effect browser and apply the saved preset.
- **Costs:** The applied preset animates linearly instead of the motion the user authored and previewed. Measured live in the app on a blur radius keyed [t1=0, t2=40 bounce, t3=5 hold, t4=20 overshoot]: original value at t=2.5 is 40 (the hold holds), the preset instance gives 22.5; at t=3.5 the original is 21.31 (overshoot), the preset gives 12.5. No warning is shown.
- **Fix:** Derive the whitelist from the live tables instead of hard-coding four names. scene.js (index.html line 434) loads before fx-presets.js (line 441), so this is safe at IIFE time: `const EASE_OK = Object.assign({}, FM.EASES, FM.EASE_PRESETS, { custom: 1 });` — `custom` only matters alongside a valid `bez`, which saneKf already preserves.

### ~~save() reports success when the localStorage write failed, and its own "not saved" toast is overwritten by "Saved"~~ — VERIFIED FIXED, re-swept at v5.77
`js/fx-presets.js:147`  · found by `fx-registry`

- **What:** `writeCustom()` swallows the QuotaExceededError and only toasts; `save()` ignores it and unconditionally returns `true`. inspector.js:567 treats that as success and immediately calls `FM.toast('Saved — hold … in the Effects browser to use it')`. `FM.toast` (app.js:616) reuses a single `#toast` element and overwrites its text, so the "Storage full — preset not saved" warning is destroyed in the same tick and never seen.
- **Trigger:** With localStorage at quota — reachable on a large project, since storage.js:61 stores the whole scene doc in localStorage and already ships a "Storage full — autosave paused" path (storage.js:42) — select a layer, open an effect's ⋯ menu, choose "Save as preset…" and confirm the name.
- **Costs:** The user is told the preset was saved. It was not written; it is absent from the effect's preset sheet and gone after reload. The one warning that would have explained it is replaced before it can render.
- **Fix:** Make `writeCustom` return `true`/`false` (`try { …; return true; } catch (e) { …; return false; }`) and have `save` return that value, so the caller's else-branch fires instead of the false "Saved" toast.

### ~~Rotate-mode easing editor never touches rotationX/rotationY, so a 3D tilt keeps linear easing while the spin eases~~ — FIXED v9.34
`js/graph-editor.js:13`  · found by `inspector-keyframes`

- **What:** graph-editor's MODE_PROPS.rotate lists only ['rotation'], but the Move & Transform panel's MT_PROPS.rotate (js/inspector.js:1591) is ['rotation','rotationX','rotationY'] and its ◆ keyframes all three whenever the extra channels are in use. buildEasingEditor therefore collects (pickKfs) and rewrites (applyPreset/applyBez) only the `rotation` keyframe, silently leaving rotationX/rotationY on whatever easing they had. kfFocusProps (inspector.js:2921) also uses the full MT_PROPS.rotate list, so the timeline highlights those keyframes as the ones you are editing while the easing button skips them.
- **Trigger:** Select a layer → Move & Transform → Rotate. Set an X tilt (e.g. rotationX = 30, any non-zero value). Tap ◆ at 0s — rotation AND rotationX are both keyframed. Scrub to 1s, drag the Rotation dial and the X-tilt box (auto-keys both at 1s). Tap the easing-curve button and pick any preset, e.g. Ease In-Out.
- **Costs:** Only the flat spin eases; the 3D tilt keeps animating linearly. Verified live: after picking Ease In-Out, at t=0.25 rotation = 11.25° (eased) while rotationX = 37.5° (still linear, would be 33.75° eased). The two channels of one rotation drift apart for the whole segment, identically in preview and export, with no indication in the UI that half the rotation was skipped.
- **Fix:** Make MODE_PROPS.rotate match MT_PROPS.rotate: `rotate: ['rotation', 'rotationX', 'rotationY'],`. (move/scale/skew already agree; rotate is the only row out of sync.)

### ~~Easing preset is applied to properties whose animation already ended, silently re-easing an earlier, unrelated segment~~ — FIXED v9.34
`js/graph-editor.js:96`  · found by `inspector-keyframes`

- **What:** pickKfs picks one keyframe per animated channel of the mode. When the playhead is past a channel's LAST keyframe, findIndex returns -1 and the fallback clamps idx to kf.length-1 — that channel's final segment. That fallback is right for a single-property editor, but the transform editor edits every channel of the mode together, so a channel whose animation finished long before the playhead gets its last (already-played) segment rewritten by applyPreset/applyBez. The canvas only ever draws cur.kfs[0], so nothing on screen shows the second channel being changed.
- **Trigger:** Move & Transform → Move. Tap ◆ at 0s and again at 1s (keyframes X and Y at both times). Scrub to 2s and drag the X value box (auto-keys X only, so X = 0/1/2s and Y = 0/1s). With the playhead at 1.5s or 2s, tap the easing-curve button and pick a preset, e.g. Bounce.
- **Costs:** Y's 0→1s move — long finished at the playhead and not the segment shown in the graph — is also converted to Bounce. Verified live: with x.kf = [0,1,2] and y.kf = [0,0.5] at FM.time = 1.5, clicking Bounce produced x = ['0:linear','1:linear','2:bounce'] and y = ['0:linear','0.5:bounce']. The layer's vertical motion changes shape in preview and export without the user asking or seeing it.
- **Fix:** Skip a channel whose animation does not bracket the playhead when more than one channel is in play, e.g. inside the forEach: `if (t > kf[kf.length - 1].t + 1e-3 && props.length > 1) return;` before the `keys.push/kfs.push`. That keeps the last-segment fallback for the single-property editors (volume / speed / effect param / crop) while stopping the transform editor from reaching back into a finished segment.

### ~~The Move & Transform X/Y number box cannot be dragged off a snap target — it re-reads the snapped value as the drag origin~~ — FIXED v9.24
`js/inspector.js:1624`  · found by `inspector-params`

- **What:** mtVBox's applyDx takes its origin from `getVal()` — the value that was already written and then snapped — and adds only the current event's dx. mtSetXY (line 1606) snaps anything within 8 project units of an align target back onto it. So every pointermove smaller than the 8-unit snap radius is immediately undone, and the next event starts from the target again: sub-threshold motion never accumulates and the drag can never escape. The Move trackpad beside it does this correctly (line 2000 accumulates `pd.ix + total displacement` and snaps the accumulated raw value), which is why only the number box is stuck.
- **Trigger:** Move & Transform → Move mode. Drag the X value box horizontally at a normal speed (scrub is 1:1 with project px, and a finger/mouse produces roughly 1-6 px per pointermove). The moment X reaches the frame centre, either frame edge, or any X position the layer occupies on one of its own keyframes, keep dragging.
- **Costs:** The control goes dead — the number and the layer freeze on the snap target and no amount of further dragging moves them; only a single jump of more than 8 px in one event escapes. Measured live on a 1080-wide project: X walked 700 → 549, snapped to 540, then stayed at 540 for the remaining ~210 px of drag. Y behaves the same, and it gets worse on an animated layer because FM.alignTargets adds every keyframe position as another sticky point.
- **Fix:** Accumulate the gesture the way the trackpad does instead of re-reading the written value: record `drag.base = getVal()` and `drag.acc = 0` in the pointerdown handler (line 1629), then in applyDx do `drag.acc += dx * (opts.scrub || 1); setVal(clamp(drag.base + drag.acc));`. The snap in mtSetXY then acts on a raw value that has genuinely travelled past the 8-unit radius, so it sticks on approach but releases on the way out.
- **Fixed v9.24** by the structural version of that: one `scrubGesture(getVal, setVal, clamp)` holding `base + acc`, used by BOTH number scrubbers (`mtVBox` and `mtScrub`), so a third one cannot be added later without it. Two things the writeup did not know: (a) the same read-back kills any setter that ROUNDS, not just one that snaps — Motion Blur **Samples** (0.08/px into a `Math.round`) never moved at all, and Crop Width dies the same way on any project narrower than ~1400; (b) the accumulator has to be clamped back to what the limits allowed (`acc = v - base`), or dragging 200px past an end banks 200px that must be un-dragged before the value moves again. Measured live at 375px — before: X 600 → 552 → 540, 540, 540, 540; after: 600 → 552 → 504 → 456 → 408 → 360, with a short drag from 560 still snapping onto 540.

### ~~Crop "Easing curve" button on an un-cropped media layer does nothing, then latches and hijacks the next panel refresh~~ — FIXED v9.38
`js/inspector.js:1746`  · found by `inspector-keyframes`

- **What:** mediaSizePanel deliberately does not stamp a crop onto the layer just to display it (`const m = cropMediaOf(layer);   // read-only`, line 1722), so layer.crop is undefined until ensureCrop runs. The easing button sets FM._cropEasing = true unconditionally, but the sub-view that renders it is gated on `layer.crop` (line 3079). With no crop the guard fails, refresh() falls through to the normal Edit Shape panel, and _cropEasing stays true — nothing resets it while you remain in the element view. The next refresh that happens after a crop exists then swaps the panel out.
- **Trigger:** Select a video or image layer that has never been cropped → Edit Shape → tap the easing-curve button on the left rail (appears to do nothing) → then tap ◆ to keyframe the crop.
- **Costs:** The first tap is silently dead. The second tap (◆) calls ensureCrop, which creates layer.crop, then FM.inspector.refresh() — and the panel jumps out of the crop editor into the easing graph showing "Animate this property (tap ◆), add a second keyframe, then shape its easing here." The user pressed the keyframe diamond and lost the panel they were working in. Same jump happens on the mtVBox release path after dragging Width/Height, which also calls ensureCrop then refresh.
- **Fix:** Don't latch a flag the view can't honour. Match the dimmed motion-path button pattern used a few lines up (inspector.js:1919-1923): `easeBtn.addEventListener('click', () => { if (!layer.crop) { if (FM.toast) FM.toast('Keyframe the crop first (tap ◆), then shape its easing here', 2400); return; } FM._cropEasing = true; FM.inspector.refresh(); });` — and dim the button while layer.crop is absent.

### ~~Undo while the pen-mask editor is open is silently reverted by the next drag~~ — FIXED v9.25
`js/mask-tool.js:268`  · found by `compositor-masks`

- **What:** open() caches the point list once into the module-level `pts` (line 268, `pts = seedPts(m)` — a clone) and every later read and write goes through that cached array. FM.history.restore() (js/history.js:24) replaces FM.scene.layers wholesale with objects freshly parsed from JSON, so the mask object the editor now resolves via `mask()` is a NEW object carrying the restored path — but `pts` still points at the pre-undo array. Nothing tears the editor down: refreshAll (js/app.js:420) doesn't touch FM.maskTool, and the Ctrl+Z handler (js/app.js:2537) and the top-bar undo button (js/app.js:2273) have no isActive() guard. The next pointer move then runs `flush()`, which for a static path executes `m.path = pts` (line 68), writing the stale array back over the restored one. js/point-edit.js does not have this bug — it re-reads `subsOf(l)` from the live layer on every operation.
- **Trigger:** Inspector → Effects → Masks → "Edit path"; drag a mask point (commits an undo step); press Ctrl+Z (or tap the top-bar undo arrow); then drag any point again.
- **Costs:** The teal overlay does not follow the undo — it keeps showing the pre-undo shape while the rendered layer snaps back, so the handles sit visibly off the mask. The moment the user touches a point, every pre-undo coordinate is written back into the model and committed, so the undo is silently discarded and the user's step back is lost.
- **Fix:** Make the editor follow the model instead of caching it. Either re-seed on identity change — in the rAF `draw()` loop, when not mid-drag, compare the resolved mask object against the one seeded from and call `pts = seedPts(m); closed = pts.length >= 3 && m.closed !== false; sel = -1;` when it differs — or have history.restore() close any open on-canvas tool (`if (FM.maskTool && FM.maskTool.isActive()) FM.maskTool.stop()`) before swapping FM.scene.layers.
- **Fixed v9.25** with BOTH halves of that, because they cover different routes. `reseed(m)` re-points the editor whenever the mask object it seeded from is no longer the one the scene holds; `history.restore()` calls it the instant it swaps `FM.scene.layers`, and the rAF `draw()` loop checks the same identity every frame for the routes that never touch history (loading a project). The history call is not redundant with the draw check: `undo()` is synchronous, so a drag beginning before the next animation frame would still have written the stale array back. Closing the editor was rejected — it throws away the user's place in a roto edit for no reason, and the editor can simply follow. `dirty` is cleared on re-seed too, or Done would flush the restored path back and, on an animated path, inject a keyframe the undo had just removed.
- **A second, unreported bug fell out of writing the test:** `lastTap` (the double-tap-to-delete timer) is module state that outlived the editor. Close the editor and reopen it inside 350ms, tap the point that happens to share an index with the last one you touched, and it was deleted. Reset in `open()` and in `reseed()`. Found because two tests in a row tapped index 2 within 350ms of each other and the second one silently deleted a corner.
- **Checked and clear:** `js/point-edit.js` re-reads `subsOf(l)` on every operation, and crop, fill-drag and text-edit hold no geometry of their own, so the mask editor was the only tool that needed this.

### ~~backfill() writes w:0/h:0 for every video, which trips isAudio() — the whole pre-existing video library is filed under Add → Audio as songs~~ — FIXED v8.47
`js/medialib.js:168`  · found by `home-media`

- **What:** `backfill()` (added v3.72) seeds one library entry per media layer in every stored project and hardcodes `w: 0, h: 0` because it reads only the layer JSON, never the file. `isAudio()` (added later, v4.14 — commit 70467ea) infers "this is a song" from exactly that shape: `e.kind !== 'image' && !e.w && !e.h`. Backfilled entries carry no `audio` flag, so a backfilled `kind:'video'` entry with w=0/h=0 satisfies the heuristic and is classified as audio. `libEntries()` in js/addmenu.js:53 partitions strictly on that predicate (`!!lib.isAudio(m) === !!wantAudio`), so those entries are excluded from the Media tab and pushed into the Audio tab. `getThumb()` (medialib.js:116) also bails early for anything isAudio() says is a song, so they can never acquire a picture. Backfilled `kind:'image'` entries are unaffected (the `e.kind !== 'image'` clause saves them), so the symptom is video-only. The `fm.medialibFilled` flag means this never self-corrects: the bad entries sit in localStorage `fm.medialib` permanently.
- **Trigger:** Any user who ran v3.72–v4.13 with existing projects (backfill executed then and set fm.medialibFilled) and has since upgraded. Open the editor → Add → Media tab.
- **Costs:** The Media tab shows only photos; every clip the user ever put in a project appears instead under the Audio tab, drawn with the music-note icon and no thumbnail, labelled by filename only. Tapping one still inserts a video layer, so the tab it lives in is simply lying about what it is — the user's clip library is effectively lost from the place it is supposed to be.
- **Fix:** Set the flag explicitly in backfill instead of leaving it to be inferred: `audio: false` for `l.type === 'video'`/`'image'` entries (backfill only ever walks those two types, per line 162). Ship a small one-time repair pass keyed off a new localStorage flag that rewrites existing `fm.medialib` entries with `fp === ''` and `kind !== 'image'` to `audio: false`, so already-poisoned indexes heal.

### ~~Turning on Demo mode does not blank the phone Add sheet's media tiles — filenames and thumbnails of personal media stay on screen~~ — FIXED v8.96
`js/mobile.js:269`  · found by `mobile-js`

- **What:** The phone `+` bottom sheet's Add menu is rendered exactly once, at mobile.js init. `demo()` (addmenu.js:166) is only evaluated inside `card()`, which only runs from `drawBody()` — and `drawBody()` only re-runs when the user clicks a different tab or types in the Elements search. `FM.settings.apply()` (settings.js:46) notifies `listeners`, but nothing in addmenu.js or mobile.js subscribes, and the `demo-mode` body class it toggles at settings.js:50 has no CSS rule anywhere in styles.css or theme-glass.css — so `demo()` is the setting's only effect. Opening and closing the sheet does not redraw it: `openAdd()`/`closeAdd()` (mobile.js:258–259) just toggle classes. The already-drawn Media/Audio grid therefore keeps the real filenames and the already-inserted `<img class="addmenu-thumb">` frames.
- **Trigger:** On a phone: tap +, tap the Media tab (your imported clips appear with real thumbnails and filenames), tap one to add it — the sheet closes with the Media tab still active. Go to home → cog → Settings → turn Demo mode ON, return to the project, tap + again.
- **Costs:** The sheet reopens on the Media tab still showing e.g. "Holiday_Bali_2024.mp4" and the video's own frame — exactly the camera-roll exposure the setting exists to prevent, during the screen recording the user just turned it on for. It only starts obeying the setting after they happen to tap another tab, or reload the app. Nothing tells them the setting hasn't applied.
- **Fix:** Make the sheet's menu re-derive `demo()` when it is shown. In mobile.js's `openAdd()`, redraw the hosted menu before opening — e.g. keep a handle to the render options and call `FM.addMenu.render(addGrid, addOpts)` at the top of `openAdd()` — or, in addmenu.js `render()`, hang the tab's `drawBody` on the container and have `openAdd()` invoke it. (A bare `FM.settings.onChange(drawBody)` inside `render()` would leak one listener per PC-inspector re-render, so drive it from `openAdd()` instead.)

### ~~Duplicating or importing a project silently kills every Luma Matte / Displacement Map / Compound Blur, because reIdLayers never remaps effect params.source~~ — VERIFIED FIXED, re-swept at v5.77
`js/storage.js:526`  · found by `compositor-masks`

- **What:** reIdLayers re-ids every layer and remaps the cross-layer references it knows about — `l.parent` (line 526) and behaviors' `targetId`/`sourceId` (lines 530-533) — but effects also carry a layer id. fx-registry.js:172 gives every `layer: true` effect a `source` param holding a layer id, and the compositor resolves it by identity: `scene.layers.find(l => l.id === srcId && l.id !== layer.id)` (line 2671 for lumamatte, 2747 for compoundblur; displacemap, polardisplace and matchgrade do the same). After re-id the old id exists nowhere, `find` returns null, and drawLumaMatte's "no matte chosen yet" branch (line 2675) draws the layer untouched. sanitizeImportedLayers doesn't touch effects, so the dead id is written straight into the new project doc.
- **Trigger:** Home screen → project card → Duplicate (storage.js:751), or Project menu → Export project file then Import project file (storage.js:461), on any project containing a Luma Matte, Displacement Map, Polar Displacement, Compound Blur or Match Grade.
- **Costs:** The copy renders with every one of those effects dead — the layer that was cut out by a matte now covers the whole frame, the layer that was warped by a displacement map is flat. Nothing warns; the effect still shows in the inspector with an empty source picker, so the user has to re-pick the source layer on every affected effect (and may not notice until export). Duplicate is the normal way to make a variant of a project, so this loses work that was already saved correctly.
- **Fix:** In reIdLayers, next to the behaviors remap, add the effect-source remap through the same null-prototype table: `out.forEach(l => (l.effects || []).forEach(fx => { if (fx && fx.params && fx.params.source) fx.params.source = map[fx.params.source] || ''; }));`. Mirror it in the copy/paste remap in js/app.js around line 1483, which follows the same batch-mate → clone / live-outside-layer → keep / dead-ref → clear rule for parent and behaviors.

### ~~Switching projects drops every media record without closing its frame-cache ImageBitmaps — up to 160MB of native memory orphaned per project switch on a phone~~ — FIXED v5.74
`js/storage.js:711`  · found by `leaks`

> **FIXED.** Reproduced first, on unfixed code, driving a real `FM.projects.create()` → `open()`
> switch in headless Chrome at 390x844 DPR 3 with 3 image clips plus one frame cache: **5
> ImageBitmaps created, 0 closed**, and **4 of 5 still reachable after six forced `gc()` calls** — so
> this was retained, not merely awaiting collection. After the fix: **5 of 5 closed**.
>
> The teardown loop is now `FM.releaseProjectMedia` (js/storage.js), called from `projects.open`. It
> releases both decoded caches *before* `FM.media.remove`, which is the only safe order — once the
> registry entry is gone there is no reference left to release anything through. Split out of
> `open()` and exported so it can be regression-tested without stubbing localStorage and
> `FM.storage.load` in the live app page.
>
> **Still open, and NOT fixed by this change:** the loop walks `FM.scene.layers`, so media records
> belonging to layers deleted earlier in the session are still never visited — the separate finding
> below. Those records no longer hold either decoded cache (both are released at delete time), so
> what they still orphan is the `<video>` element, the blob URL and any decoded `audioBuffer`, not
> ImageBitmap surface.

- **What:** `FM.projects.open()` tears down the outgoing project's media by calling `FM.dropAudioGraph(m)` then `FM.media.remove(l.id)`. `FM.media.remove` (js/media.js:15-19) only revokes the object URL and deletes the store entry — it does not touch `m.frameCache`. So the ImageBitmap array built by `FM.buildFrameCache` (js/frames.js:91-93) is dropped without any `.close()`. `FM.storage.load()` (js/storage.js:133) eagerly calls `FM.ensureReverseCache(l)` for every reversed or frame-blend-slow clip on load, so this cache is populated the moment such a project is opened. The correct pattern exists two files over: `FM.resetProject` (js/app.js:562-565) does `FM.clearFrameCache(m); dropAudioGraph(m); FM.media.remove(l.id);` in that order. `m.stripFrames` is not released here either (see the separate finding). Note that `FM.frameCacheLimits()` (js/app.js:1338-1347) sizes this cache at up to 160MB on mobile and larger on desktop, precisely because it is expected to be released promptly.
- **Trigger:** Open a project containing a reversed clip (or a frame-blend slow-mo clip) from the Home screen, go back to Home, and open a different project. Repeat while browsing projects.
- **Costs:** Each switch orphans up to the full frame-cache byte budget (160MB on mobile, larger on desktop) of decoded ImageBitmap surface plus the filmstrip bitmaps, unclosed. Because ImageBitmap memory is native rather than JS-heap, it exerts no GC pressure, so reclamation is delayed indefinitely — exactly the OOM-kill the byte cap was added to prevent (js/frames.js:66-69). Browsing four or five projects on a phone can exhaust memory and jetsam the tab.
- **Fix:** In js/storage.js:707-712, release the bitmaps before dropping the record, mirroring FM.resetProject:         if (FM.clearFrameCache) FM.clearFrameCache(m);         if (FM.clearClipStrip) FM.clearClipStrip(m);         if (FM.dropAudioGraph) FM.dropAudioGraph(m);         FM.media.remove(l.id);
- **Measured:** Verified: the switch teardown (storage.js:707-712) calls dropAudioGraph + media.remove but never FM.clearFrameCache (frames.js:108), the only thing that closes frameCache ImageBitmaps. It also walks FM.scene.layers, so media for layers deleted earlier is never visited.

### ~~Templates and elements report "saved" when the localStorage index write fails on quota, and strand their IndexedDB pack forever~~ — FIXED v9.21
`js/storage.js:871`  · found by `storage`

- **What:** FM.templates.save() writes the heavy pack (layer JSON + full media Files) to IndexedDB, then writes the index entry to localStorage with writeJSON(TPL_INDEX, idx) and unconditionally `return true`. writeJSON (line 19) swallows the failure — it returns false and calls warnQuota(e), which toasts only if _quotaWarned is still false, and _quotaWarned is already true whenever autosave has hit quota earlier in the session (line 42). The return value is discarded. FM.elements.save() (:920) and FM.elements.saveFromProject() (:947) have the identical shape, as does FM.fonts.import() (:1024). Worse, the orphaned IDB pack is unreclaimable: pruneOrphans skips every key with a 'tpl:' / 'elem:' / 'font:' prefix unconditionally (line 829) and never cross-checks them against TPL_INDEX/ELEM_INDEX/FONT_INDEX.
- **Trigger:** With localStorage near the ~5MB quota (the state storage.js:37-38 explicitly anticipates: "The scene JSON can outgrow the ~5MB quota on a heavy project"), open the Home screen, tap a project's ⋯ → "Save as template…", type a name and confirm. The TPL_INDEX write throws QuotaExceededError. The template index also carries an inline base64 JPEG card per entry (line 870), so a modest template library reaches the quota on its own.
- **Costs:** home.js:261 toasts "Template saved" (ok === true) but the template never appears in the Templates list and is unrecoverable. Meanwhile the pack — which contains full copies of the project's video/image Files — sits in IndexedDB under 'tpl:<id>' with no index entry pointing at it, and the boot sweep is coded to never collect it. The user believes their work is backed up as a template, and permanently loses that IDB space.
- **Fix:** Check the write and roll the pack back so the caller's toast tells the truth:        if (!writeJSON(TPL_INDEX, idx)) {         try { const db = await openDB(); await idbDel(db, 'tpl:' + tid); db.close(); } catch (e) {}         return false;       }       return true;  Apply the same to FM.elements.save (:920), FM.elements.saveFromProject (:947) and FM.fonts.import (:1024). Separately, teach pruneOrphans to collect 'tpl:'/'elem:'/'font:' keys that no index entry references, instead of skipping the prefixes outright.

### ~~Switching projects leaks the media record of every layer deleted this session — blob URL never revoked, <video> element pinned for the page lifetime~~ — FIXED v8.46
`js/storage.js:707`  · found by `storage`

- **What:** FM.projects.open() drops the outgoing project's media by iterating FM.scene.layers only. FM.deleteLayer (app.js:1219-1224) deliberately KEEPS the media registry entry after a layer is deleted so undo can restore it, so those records are not in FM.scene.layers. Nothing else ever sweeps them: FM.media.all() is never called anywhere in the codebase, and the only other cleanup, FM.resetProject (app.js:562), iterates FM.scene.layers too. FM.media.remove() (media.js:15-19) is what calls URL.revokeObjectURL(r.url), so skipping it leaves the object URL live and the record — holding `el` (a <video> with preload='auto'), `url`, `file`, and any decoded `audioBuffer` — referenced by media.js's module-level `store` for the rest of the page's life. FM.history.reset() at open() line 723 clears the undo stack, so the record is unreachable garbage from that moment on.
- **Trigger:** In project A, import a video, then delete that layer (its record is intentionally retained for undo). Tap the brand/back to go Home and open project B. Repeat with another clip.
- **Costs:** Every deleted media layer permanently pins its whole source file in memory once you switch projects — the blob URL is never revoked and the buffered <video> element is never released. On a phone this accumulates across the session with no upper bound; a handful of deleted 100MB+ clips is enough to get the tab jetsammed by iOS Safari, which reads to the user as the app randomly reloading and losing the last unsaved edits.
- **Fix:** Drop the whole registry on a project switch rather than only the layers still present — history.reset() below makes every retained record unreachable anyway:        Object.keys(FM.media.all()).forEach(k => {         const m = FM.media.get(k);         if (!m) return;         if (FM.clearFrameCache) FM.clearFrameCache(m);         if (FM.dropAudioGraph) FM.dropAudioGraph(m);         FM.media.remove(k);       });

### ~~Media records for layers deleted during a session are never swept — the project-switch teardown only walks FM.scene.layers, so they leak for the whole page lifetime~~ — FIXED v8.44 (in-session) + v8.46 (project switch)
`js/storage.js:707`  · found by `home-media`

- **What:** `FM.deleteLayer` / `FM.deleteSelected` deliberately keep the media record so undo can restore the layer (js/app.js:1223-1225) — that part is intentional. The bug is that nothing ever collects them afterwards. `FM.media.remove()` is called from exactly two places (`js/app.js:565` in resetProject and `js/storage.js:711` in projects.open), and both iterate `FM.scene.layers` — i.e. only layers still present. A deleted layer is by definition not in that array, so its record is unreachable by every sweep. `FM.projects.open()` calls `FM.history.reset()` at js/storage.js:723, which makes those records provably unreachable by undo too, yet they survive the switch. `FM.media.all()` therefore grows monotonically for the whole session, each entry holding a blob URL, a `<video>` element and — if the timeline ever drew that clip's waveform — a full decoded `rec.audioBuffer` (js/media.js:100, never nulled).
- **Trigger:** Import a clip or song → delete the layer → import another → delete it, repeating a few times; or just build a project by trying and discarding footage, then go Home and open a different project.
- **Costs:** Every discarded media layer permanently pins its source blob, its media element and (for anything whose waveform was drawn) a raw PCM AudioBuffer — roughly 46 MB per stereo minute at 48 kHz, so a discarded 3-minute track is ~140 MB that is never reclaimed even after switching projects. A normal trial-and-error editing session on a phone walks straight into an OOM tab kill.
- **Fix:** After `FM.history.reset()` in `FM.projects.open()`, sweep the whole registry rather than the outgoing scene: iterate `Object.keys(FM.media.all())` and for every id not present in the newly-loaded `FM.scene.layers`, run `FM.dropAudioGraph` + `FM.clearFrameCache` + `FM.media.remove`. Undo history has just been reset, so nothing can reference them. Optionally also null `rec.audioBuffer` in `FM.deleteLayer` — the waveform array is what the timeline needs, not the PCM.

### ~~Trim grips ignore layer.reversed — trimming a reversed video edits the wrong end of the source and drops footage~~ — FIXED v8.92 (reversed branch in applyTrimAt AND FM.extendClipTo, the two sites this entry named; the documented repro now gives window [0,3] showing source 3s at the new head, which is what the inspector's Trim-start button already produced — the two paths agree again)
`js/timeline.js:1242`  · found by `timeline`

- **What:** applyTrimAt() has no `reversed` branch. It always treats the source window as [trimStart, trimStart + duration*speed] with time running forward: the right grip grows the window's END (clamped against `srcDur - L.trimStart`), and the left grip advances `L.trimStart` by `delta*spL` while leaving the window end fixed. But FM.layerLocalTime (js/scene.js:512) evaluates a reversed clip as `trimStart + (duration*sp - adv)` — the clip plays the window BACKWARDS, so its first frame is the window END and its last frame is the window START. Every edit is therefore applied to the opposite end from the one the user grabbed. The rest of the codebase already knows this: splitLayer special-cases `if (layer.reversed)` (js/app.js:1646) and the inspector's Trim-start button guards with `if (layer.type === 'video' && !layer.reversed)` (js/inspector.js:1192). applyTrimAt (and FM.extendClipTo, js/app.js:1601) never got the same treatment.
- **Trigger:** Import a 10s video, right-click the clip → "Reverse". Clip is start=0, duration=5, trimStart=0, so it plays source 5s→0s. Now drag its LEFT trim grip 2s to the right (the same edit the inspector's "Trim start to playhead" button performs).
- **Costs:** The user cuts 2s off the head and instead loses 2s off the tail, and every frame in the clip shifts. After the drag: start=2, duration=3, trimStart=2 → window [2,5], so at t=2 the clip still shows source 5s (its old first frame) and source 2s→0s is silently discarded. The inspector button on the identical clip gives window [0,3] showing source 3s at t=2 — two UI paths for one operation disagree. The mirror case is worse on the right grip: dragging the tail of a reversed clip out changes the picture at the clip's START (window end grows) while the last frame stays put, and a reversed clip with trimStart===0 can never have its head extended at all, because `if (L.type === 'video' && trimDrag.trim + delta * spL < 0) delta = -trimDrag.trim / spL` pins delta to 0 even when the whole rest of the source is unused. Preview and export agree (both go through layerLocalTime), so it is wrong pixels everywhere, not a preview-only artifact.
- **Fix:** Branch on `L.reversed` inside applyTrimAt, mirroring splitLayer/inspector. Reversed + left grip: leave `L.trimStart` alone (the kept later span keeps its trimStart) and clamp `delta` so the shortened window still fits. Reversed + right grip: hold the window END fixed by decreasing `L.trimStart` by the extra source consumed (`trimStart -= (nd - trimDrag.dur) * sp`), clamped at 0 — that is the available-source limit for a reversed clip, not `srcDur - trimStart`. Apply the same branch to FM.extendClipTo (js/app.js:1610-1622), which has the identical omission.

### ~~deleteKeyframesAt/propKey cover fewer property containers than animatedProps — trim-path, repeater, dash and mask keyframes can be neither deleted nor copied from the timeline~~ — FIXED v9.23
`js/timeline.js:127`  · found by `timeline`

- **What:** The timeline draws a diamond for every container FM.animatedProps(layer) returns (js/timeline.js:1059), and that list includes layer.trimPath.{start,end,offset}, layer.repeater.{copies,offsetX,offsetY,rotation,scale,opacity}, layer.stroke.dash.offset, layer.masks[].path and layer.audioFx[].params (js/scene.js:290-295). deleteKeyframesAt builds its own `slots` list that omits all five, and because it is called with `only = entry.prop`, the scoped delete can only ever match a container that is in that list — for the omitted ones the loop finds nothing and returns silently. propKey has the same gap (its own comment says it "Must cover EVERY slot FM.animatedProps exposes", and it does not), so copyKfAt skips those keyframes too.
- **Trigger:** Add a shape layer → Border/Style panel → enable "Repeater" → click the ◆ button next to "Copies" at t=0, scrub to t=2, change Copies, so two diamonds appear on the clip. Double-click either diamond (tooltip: "Drag to retime · double-click to delete"). Same for Trim path Start/End, dash Offset, and any keyframed audio-effect parameter.
- **Costs:** Nothing happens. FM.timeline.rebuild() runs and redraws the identical diamond, and FM.history.commit() pushes an empty undo step. On a phone the long-press menu's "Delete keyframe" is the ONLY delete route for these and it is equally dead. "Copy keyframe" on the same diamond returns 0 entries, so FM.kfClipboard stays empty and the "Paste keyframe at playhead" item never appears — the user's copy silently vanishes. The keyframe is only removable by scrubbing to its exact time and clicking the inspector's ◆ toggle.
- **Fix:** Append the missing containers to `slots` in deleteKeyframesAt and to propKey/resolveSlot: `if (layer.trimPath) ['start','end','offset'].forEach(...)`, `if (layer.repeater) ['copies','offsetX','offsetY','rotation','scale','opacity'].forEach(...)`, `if (layer.stroke && layer.stroke.dash) slots.push({c: layer.stroke.dash, k: 'offset'})`, `(layer.masks||[]).forEach((m,i) => slots.push({c: m, k: 'path'}))`, `(layer.audioFx||[]).forEach(...)`. Better: derive `slots` from a single shared table that FM.animatedProps also consumes, so the two lists cannot drift again.

### ~~Keyframe paste addresses effect parameters by array index, so pasting onto another layer writes into an unrelated effect's parameter~~ — FIXED v9.20
`js/timeline.js:173`  · found by `timeline`

- **What:** copyKfAt stores an effect keyframe under the path `effect.<index>.<param>` and resolveSlot resolves it as `(layer.effects||[])[index]` on the paste target, with no check that the target's Nth effect is the same effect type. pasteKfAtPlayhead then does `if (!FM.isAnimated(p)) { p = { kf: [] }; slot.c[slot.k] = p; }`, which happily creates the parameter on the target effect even when that effect has no such parameter. Cross-layer paste is an advertised feature ("lets you copy on one layer and paste onto another" — js/timeline.js:149). Dozens of unrelated effects share the parameter name `amount` with wildly different ranges (grayscale 0..1, twirl -360..360, temperature -100..100 — js/compositor.js:40-217), so the index collision lands on a real, live parameter very often.
- **Trigger:** Layer A has one effect, Twirl, with `amount` keyframed to 140 at t=1. Long-press that diamond → "Copy keyframe". Select layer B, whose one effect is Grayscale. Park the playhead and use "Paste keyframe at playhead" (keyframe menu, layer ⋯ menu, or the empty-timeline right-click menu).
- **Costs:** B's Grayscale `amount` — a 0..1 parameter — is replaced by an animated container holding 140, so B renders fully desaturated from the paste point onward instead of at whatever level the user set, and the change is committed to history and autosaved. When the target effect has no matching parameter at all (e.g. `effect.0.radius` pasted onto Grayscale), a junk `radius: {kf:[…]}` is injected into that effect's params and serialized into the project file, while the user sees no keyframe appear and no error.
- **Fix:** Record the effect TYPE in the key (e.g. `effect.<type>.<ordinal>.<param>`) and in resolveSlot match on type, returning null when the target has no effect of that type. Additionally require the parameter to already exist on the target effect (`if (!(slot.k in slot.c)) return;`) before creating a keyframe container, so a param that the effect does not define is never injected.

### ~~Multi-select clip drag clamps each clip against its own duration, permanently breaking the selection's relative timing~~ — FIXED v9.19
`js/timeline.js:1486`  · found by `timeline`

- **What:** During a group clip drag the primary is floored at `-(primary.duration - 0.1)` and each secondary is independently floored at `-(its own duration - 0.1)`. Once a shorter clip reaches its floor it stops following the shared `delta` while the longer clips keep moving, so the offsets between the selected clips change. On pointerup the change is made permanent: FM.shiftLayerKeyframes is applied per layer using each layer's own actual delta, FM.autoFitDuration() runs, and FM.history.commit() records it. Dragging back inside the same gesture recovers (origStart is fixed), but releasing while clamped does not. The touch hold-to-move path builds the same group and hits the same clamp. The code elsewhere states the invariant it is violating: "a touch hold-move on one selected clip must not silently break the others' relative sync" (js/timeline.js:966).
- **Trigger:** Select two clips — a 6s clip starting at 4s (press this one to make it primary) and a 1s clip starting at 0.5s. Drag the pair 3s to the left (dragging a clip past 0 into negative start is deliberate AM behaviour, per the comment at line 1474) and release.
- **Costs:** The primary lands at start=1 (delta -3) but the 1s clip is clamped at -0.9 instead of -2.5, so it only moves 1.4s. The gap between the two clips silently changes from 3.5s to 1.9s and is committed — the user's arrangement is altered by an amount they never dragged, with no visual warning during the drag (each bar just stops independently).
- **Fix:** Compute one floor for the whole drag before applying it: `const groupFloor = Math.max(...[primary, ...group].map(l => -(l.duration - 0.1) - (l.origStart - primary.origStart)))`, clamp the primary's proposed start to that, then apply the resulting delta to every member unclamped. The selection then stops as a unit the moment its left-most/shortest member would go under, preserving relative timing.

### ~~track() never yields, so the UI freezes and the progress toast it updates can never repaint~~ — FIXED v9.30
`js/tracker.js:242`  · found by `behaviors-tracker`

- **What:** track() is async but contains exactly one await — FM.buildFrameCache at line 178. Everything after it (grayFrom + getImageData per frame, both walk() passes with their coarse+fine SAD scans, the template adaptation loop, the RDP simplification and the keyframe write) runs in a single uninterrupted synchronous block. The onProgress callback fires inside that block and calls FM.toast, which mutates the DOM, but the browser cannot repaint until the whole call returns.
- **Trigger:** Press Track on any clip longer than a few seconds (the Track button handler at js/tracker.js:284-293 passes an onProgress that toasts every 8th frame). Verified by inspection: `awk 'NR>=169 && NR<=274 && /await|setTimeout|requestAnimationFrame/' js/tracker.js` returns only line 178.
- **Costs:** The whole app locks up for the duration of the match — no repaint, no scrolling, no way to cancel. The 'Tracking... N%' toast the code goes to the trouble of computing is dead: it is written to the DOM but the value never appears on screen, so the user sees a frozen 'Tracking...' and a dead UI. On a phone a multi-second main-thread block risks the OS watchdog.
- **Fix:** Make walk async and yield every N frames so the toast paints and the tab stays alive: change `const walk = (dir) => {` to `const walk = async (dir) => {`, add `if ((k - seedIdxInList) % 8 === 0) await new Promise(r => requestAnimationFrame(r));` next to the onProgress call, and change line 245 to `await walk(1); await walk(-1);`. (exporter.js:247 already has a nextTick() helper built on MessageChannel for exactly this, if a non-throttled yield is preferred.)
- **Measured:** Verified: the only await in track() is buildFrameCache at tracker.js:178; both walk() passes are synchronous loops, so onProgress() can never repaint.

### ~~Tracker writes its keyframes to a stale layer object if the scene changed during the decode, then reports success~~ — FIXED v9.30
`js/tracker.js:268`  · found by `async-races`

- **What:** `FM.tracker.track` captures the layer object (`const L = picking.layer` at js/tracker.js:285) and then awaits `FM.buildFrameCache` at line 178 — tens of seconds for a normal clip. Afterwards it writes straight to that captured reference (`layer.transform.x = { kf: kfX }`). `FM.history.restore` (js/history.js:24) replaces `FM.scene.layers` wholesale with freshly JSON-parsed objects, so after an undo the captured `layer` is detached from the scene. There is no re-lookup by id and no liveness check — compare `FM.splitLayer`, which does exactly that guard at js/app.js:1691 (`if (idx < 0) return;   // A was deleted/undone during the await`). The follow-up `FM.history.commit()` then snapshots an unchanged scene, hits the `stack[index] === s` early-return in js/history.js:52, and adds nothing.
- **Trigger:** Select a video clip → tracker → tap a feature → "Track". While "Tracking… 40%" is showing (the overlay is torn down at line 286, so the whole editor is live), press Cmd+Z / the undo button, or delete the tracked clip.
- **Costs:** The tracked keyframes are written to an orphaned object and silently discarded, yet the handler at js/tracker.js:292 still toasts "Tracked — 47 keyframes added, drag them to touch up". The user is told a minute of tracking succeeded and finds no keyframes on the clip and nothing to undo.
- **Fix:** Re-resolve the layer after the await and bail if it is gone or has been swapped: at the top of the write block do `const live = FM.layerById(FM.scene, layer.id); if (!live || live !== layer) return false;` then write `live.transform.x/y`. Returning false makes the caller's existing branch toast "Could not track" instead of claiming success.
- **Measured:** Verified: `layer` is captured before the await at tracker.js:178 and written at 268-269 with no liveness re-check, then success is returned.
- **Both FIXED TOGETHER in v9.30, and they had to be.** Making the walk yield is what lets the editor stay alive during a track — which is exactly what widens the window for the stale-layer race, so fixing the freeze alone would have made the second bug easier to hit. The yield uses MessageChannel, not requestAnimationFrame as the note above suggests: rAF stops firing in a hidden tab, so switching apps mid-track would park the tracker indefinitely, and setTimeout(0) is floored to a second or more when backgrounded. exporter.js had already learned both and its helper is copied here for the same reason.
- **THERE ARE NOW TWO GUARDS, and a mutation check proved why one was not enough.** Removing the write-site liveness check SURVIVED the first test suite: on a long clip the walk bails at its first checkpoint, so execution never reaches the write and that assertion was dead. The write is only the last line of defence on a SHORT clip — the walk checks every 8th frame, so a ten-frame clip seeded in the middle never reaches a checkpoint at all. That is its own test now, and it pulls the clip during `buildFrameCache`, which is the window the entry describes. A third assertion holds the in-walk check, whose value is not correctness (the write guard covers that) but not spending the rest of a phone's CPU matching frames for a layer nobody can see: measured 119 frames of wasted work without it, ~12 with.

### ~~The green + FAB stays live over an open modal's backdrop, so the Add sheet stacks on top of the Canvas-settings / Export dialog~~ — VERIFIED FIXED, re-swept at v5.77
`styles.css:1562`  · found by `css-mobile`

- **What:** #add-fab is position:fixed with z-index 61 and is only hidden by body.m-editing / body.insp-open / body.add-open / body.group-editing. None of those classes is set when a modal dialog opens, so with nothing selected the FAB paints on top of the dialog's rgba(0,0,0,.65) backdrop and remains clickable. Its click handler (js/mobile.js:260) opens #add-sheet at z-index 63 — also above the dialog.
- **Trigger:** Phone (<=700px), no layer selected. Tap the gear (#m-settings -> Canvas settings) or the green Export button. The + is still drawn bottom-right over the scrim; tap it.
- **Costs:** Verified live at 380x720: with #canvas-dialog open (card y=183.75..536.25, z-index 50), #add-fab renders at x=310..364 / y=646..700 over the backdrop, and clicking it opens #add-sheet at y=315.7..720, z-index 63 — covering the Background swatches, the Size row and the Cancel / Apply buttons of the still-open dialog. Picking a shape from that sheet adds a layer to the project while the modal is orphaned behind it.
- **Fix:** Hide the FAB whenever a modal is up — add `body.modal-open #add-fab, body.modal-open #insp-toggle { display: none; }` next to the existing `body.add-open #add-fab` rule (styles.css:1602) and toggle `modal-open` in showExportDialog/hideExportDialog and the canvas-dialog open/close in js/app.js. (Raising the dialogs above 63 per the previous finding also resolves the stacking half.)
- **Measured:** Measured: #add-fab is z-index 61, position fixed; the modal is z-index 50 (styles.css:1166). The FAB outranks an open modal.

### ~~The + FAB covers the ≡ row-reorder handle of whichever timeline row lands in the bottom ~75px, so dragging it opens the Add sheet~~ — NO LONGER REPRODUCIBLE, re-measured at v9.22
**Struck as STALE, not fixed, and the difference matters.** Queue 294 replaced the floating + button
with the "Tap to add a layer" row that lives IN the timeline. `#add-fab` is still in the markup and the
stylesheet, but re-measured live at 380x820 with 11 layers and nothing selected — precisely the state
this entry specifies — it does not render at all (`display:none`, zero box), so it covers nothing and
no `.row-drag` handle resolves to it. The fix this entry proposes (padding-bottom on the scroller)
would now be padding reserved for a button that is not there.
**If the FAB is ever brought back, this entry becomes live again** — the z-index reasoning in it is
still correct, and the row handles still sit at the right edge where it used to be.
`styles.css:1768`  · found by `css-mobile`

- **What:** .row-drag is position:sticky right:5px, 30x30, pinned to the right edge of the timeline scrollport. #add-fab is position:fixed right:16px bottom:20px, 54x54, z-index 61 — it overlaps the right 19px of every handle in the bottom 74px band. .row-drag's z-index:6 lives inside #timeline-panel and cannot beat a fixed element in the root stacking context.
- **Trigger:** Phone (<=700px), nothing selected (so the FAB is not hidden by body.m-editing / body.insp-open), and enough layers that a track row sits in the bottom ~75px of the screen. Press-and-drag that row's ≡ handle to reorder it.
- **Costs:** Verified live at 380x720 with 11 layers: #add-fab occupies x=310..364 / y=646..700; the .row-drag handles occupy x=345..375. document.elementFromPoint() at the centre of the 6th visible handle (345,645,30,30) returns add-fab. The reorder drag never starts — the Add sheet opens instead. js/mask-tool.js:249 and js/motion-path.js:216 already park the FAB (`fab.style.display='none'`) for exactly this collision with their bottom bars; the timeline rows never got the same treatment.
- **Fix:** Reserve the FAB's corner in the timeline scroller: inside the @media (max-width:700px) block add `#tl-tracks { padding-bottom: 84px; }` so every row can be scrolled clear of the FAB before it is grabbed.
- **Measured:** Measured: the FAB is 54x54 at 16px/20px bottom-right insets; .row-drag is 30x30 at right:5px, z-index 6. They overlap in x (16-35px from the right edge) and the FAB wins on z.

### ~~The per-layer visibility eye in the timeline track head is a 15x15px tap target; a near-miss selects the layer instead~~ — FIXED v9.22
`styles.css:1036`  · found by `css-mobile`

- **What:** .th-eye is a bare flex box around a 15x15 svg with no padding and no enlarged hit pseudo-element, so its hit rect is exactly 15x15 CSS px. It sits inside .track-head, whose own pointer handler selects the layer, so anything outside those 15px is swallowed by select.
- **Trigger:** Phone (<=700px). Tap the eye icon in a timeline track head to hide/show a layer.
- **Costs:** Measured live at 380x720: getBoundingClientRect() on .th-eye returns 15x15 (~4mm — well under the 44px touch minimum). document.elementFromPoint() only 8px from the icon's centre already returns .track-head, which calls FM.selectLayer — so a slightly-off tap selects the layer, sets body.m-editing and slides the inspector sheet up over the timeline instead of toggling visibility. Every other small control in this file was explicitly enlarged (.sb-handle::before inset:-14px at styles.css:181, .kf-dot::after inset:-12px at styles.css:1146, .fxb-star padding:8px at styles.css:789); the eye was missed.
- **Fix:** Grow the hit area without moving the glyph, the same way .kf-dot does: `.th-eye { position: relative; }` and `.th-eye::after { content: ""; position: absolute; inset: -11px -8px; }` — a ~31x37px target that still leaves the thumbnail as the select surface.
- **Measured:** Measured in the live DOM: .th-eye is 15 x 15 px, against a 44 px minimum.

### ~~Audio-drive envelope cache (m._audioEnvCache) has no eviction and is keyed on continuously-varying slider values — one slider drag adds 101 permanent entries and fires 101 full-clip envelope recomputes~~ — FIXED v9.31 (it was NOT unverified — same root cause as the drag entry, confirmed by test)
`js/audio-react.js:227`  · found by `leaks`

- **What:** `FM.audioEnvelopeSync` memoises computed envelopes into `m._audioEnvCache[sig]`, a plain object on the media record with no size cap and no eviction anywhere in the file. The key comes from `envSig` (js/audio-react.js:193-210), which folds in `gain`, `attack`, `release` and the source clip's `start|trimStart|duration|reversed|speedSig`. Those are not discrete: `audioDelta` (js/behaviors.js:146-148) derives `attack = 0.005 + smooth * 0.055` and `release = 0.03 + smooth * 0.37` from the Smoothing slider, and `audioDelta` runs inside `FM.behaviorValue`, which the compositor calls per layer per frame (js/compositor.js:5312, 6895). The inspector renders Smoothing as a `rangeRow` (js/inspector.js:2276-2279) whose `input` listener fires on every step and calls `FM.requestRender()` (js/inspector.js:118). So each slider step produces a brand-new sig, a permanent new cache entry, and a fresh `FM.audioEnvelope` run scheduled as a microtask (line 225). The code comment at js/audio-react.js:191-192 claims a retime means "the stale entry is abandoned" — it is abandoned but never deleted.
- **Trigger:** Add an Audio Drive behavior to a layer, point it at a video clip with audio, then drag the "Smoothing" slider from 0 to 1 (min 0, max 1, step 0.01 — js/behaviors.js:70). Dragging "Sensitivity" (0.5-4 step 0.1) or moving/trimming the source clip on the timeline does the same via the `timing` component of the key.
- **Costs:** One drag of Smoothing creates 101 cache entries that are never freed and queues 101 complete envelope computations. Each computation's RMS pass is O(clipDuration x sampleRate) (js/audio-react.js:140-153) — ~2.9M multiply-adds for a 60s 48kHz clip — and runs as a microtask, i.e. before the next frame, so the slider visibly freezes for seconds on a phone. Memory grows monotonically for the session: a 60s clip at 30fps stores two 1801-element arrays per entry (~29KB), so ~3MB per slider drag, on a record that survives layer deletion (js/app.js:1223-1225). Repeated tweaking plus retiming the source clip compounds it.
- **Fix:** Bound the cache the same way the file's sibling caches already are (js/audio-fx.js:74-75 and js/audio-fx.js:100-101 both do `if (keys.length > 12) delete cache[keys[0]]`). At js/audio-react.js:226-227, before writing, evict the oldest: `const ks = Object.keys(m._audioEnvCache); if (ks.length > 8) delete m._audioEnvCache[ks[0]];`. Separately, quantise the continuous key components in `envSig` (round attack/release/gain to 3 decimals and layer.start/duration to the frame grid) so a slider drag collapses to a handful of distinct keys instead of one per step.

### ~~Karaoke has no in-flight guard, so a second tap during the (feedback-free) vocal render adds a second instrumental twin~~ — FIXED v9.39 (it was NOT unverified — reproduced by test)
`js/audio-tools.js:127`  · found by `async-races`

- **What:** `FM.toggleKaraoke` decides OFF→ON by looking for an existing twin (`FM.karaokeTwinOf(layer)`, line 123) and then awaits `layerAudioBuffer` + `vocalRemovedBuffer` + `loadVideoFile` before the twin is created at line 138. Nothing marks the operation in flight, and the button that calls it is never disabled: js/inspector.js:2379 `karBtn.addEventListener('click', async () => { if (FM.toggleKaraoke) await FM.toggleKaraoke(layer); … })`. A second invocation runs the identical `existing` check against a scene that still has no twin, so it proceeds too. The decode itself is also un-deduped — `layerAudioBuffer` does `if (m.audioBuffer === undefined) m.audioBuffer = await FM.decodeAudio(m.file)`, and `m.audioBuffer` stays `undefined` until the first decode resolves, so both calls open their own AudioContext and decode the whole file.
- **Trigger:** Select a stereo music/video clip → inspector Volume section → tap "Remove vocals (karaoke)" → tap it again a few seconds later. The first tap produces no UI feedback at all until after the decode completes (the toast is only fired at line 130, after `await layerAudioBuffer`), and it auto-hides at 2000ms while an offline render of a multi-minute track keeps going — so a second tap is the natural response to "nothing happened".
- **Costs:** Two layers tagged `karaokeOf: <sourceId>` are added, both playing the identical instrumental WAV phase-locked — the backing track plays at roughly double amplitude (clipping on loud material) plus a stray hidden layer in the timeline. It also runs two full OfflineAudioContext renders and holds two ~46MB WAVs plus two <video> elements at once, which is an OOM risk on a phone.
- **Fix:** Guard re-entry on the media record before the first await: after the `existing` check add `if (m._karaokeBusy) return; m._karaokeBusy = 1;` and clear it in a `try/finally` around the rest of OFF→ON (m is `FM.media.get(layer.id)`). Also disable `karBtn` for the duration in js/inspector.js:2379.

## Low (4)

### ~~addEffect stores NaN for any non-range, non-colour param because clamp() is called with undefined bounds~~ — FIXED v9.17
`js/ai-ops.js:310`  · found by `ai-security`

- **What:** The param loop special-cases only `segment` and `color`; everything else falls to `clamp(num(inp[p.key], p.default), p.min, p.max)`. fx-registry's `toggle` params (js/fx-registry.js:158) and the `layer` source-picker param (js/fx-registry.js:172) are built with no min/max, so `clamp(v, undefined, undefined)` evaluates `Math.max(undefined, Math.min(undefined, v))` → NaN. The registry default that makeInstance seeded is overwritten with NaN precisely when the model DID supply a value.
- **Trigger:** The capability digest advertises the param (js/ai-manifest.js:35 emits `roundcorners [style(undefined..undefined, def 1), radius(0..400, def 80)]`), so a builder rounding a card emits `{op:'addEffect', ref:'card', type:'roundcorners', params:{style:1, radius:80}}`.
- **Costs:** `params.style` becomes NaN. At render, js/compositor.js:4411 does `const style = Math.round(fparam(p, 'style', 0, t));` — fparam returns NaN (NaN is not `== null`), `Math.round(NaN)` is NaN, so the `style === 1` branch at line 4423 never runs and the Apple-squircle mask the AI asked for silently draws as a plain 80px rounded rectangle. The NaN also serialises to `null` in the saved project. Displacement Map's `source` param degrades the same way (NaN → no source layer → the effect is a no-op).
- **Fix:** Handle the bound-less types before the numeric branch: `else if (p.type === 'toggle') { params[p.key] = (inp[p.key] === true || num(inp[p.key], p.default) === 1) ? 1 : 0; } else if (p.type === 'layer') { params[p.key] = str(inp[p.key], 64) || p.default; } else { params[p.key] = clamp(...); }`. Also make effectVocab in ai-manifest.js print toggles as `key(0|1, def N)` instead of `undefined..undefined`.

### ~~Transparent GIF/PNG export nulls the live project background, which a visibilitychange save then persists~~ — FIXED v9.18
`js/exporter.js:426`  · found by `export`

- **What:** `runGif` (and `runFrames` at line 484) implements the Transparent option by mutating the live, persisted project object — `P.background = null` — for the entire duration of the export, restoring it only in the `finally`. `P` is `FM.scene.project`, the exact object `sceneDoc()` serialises (js/storage.js:33-35), and js/storage.js:1067 writes it synchronously on every `visibilitychange` to hidden: `document.addEventListener('visibilitychange', () => { if (document.visibilityState === 'hidden' && FM.scene) FM.storage.flushSync(); })` (`pagehide` at :1066 does the same). Any such write landing inside the export window persists `project.background: null`. The `finally` restores the value in memory only — nothing marks the project dirty or re-saves afterwards, so localStorage keeps the null until some later save happens to run.
- **Trigger:** Tick "Transparent", export a GIF or PNG frame sequence, and switch to another app / lock the phone while it renders (the long-export-plus-app-switch behaviour this file already documents at lines 241-243). The visibilitychange handler fires and writes the scene doc with the background nulled.
- **Costs:** The persisted project loses its background colour. It self-heals only if a later save runs after the export finishes; if the PWA is force-quit from the app switcher or the tab is OOM-killed first — most likely right after an export, the app's most memory-hungry operation — the project reopens with no background, and every subsequent render and export is missing it. The same window also lets `save()`'s thumbnail capture (js/storage.js:679) bake a background-less thumbnail into the project index.
- **Fix:** Do not mutate persisted state to signal a render option. Set a transient flag the compositor reads instead — e.g. `FM._exportTransparent = true` in the exporter's try (cleared in the finally), and change js/compositor.js:6908 to `if (!cam && P.background && !FM._exportTransparent)` plus the matching camera-path background guard. If the mutation must stay as a stopgap, call `FM.storage.markDirty(); FM.storage.save();` after restoring `P.background = savedBg` so the correct value is re-persisted immediately.

### ~~Preset capture drops a keyframed effect param's loopMode, so a looping animation stops at its last keyframe~~ — FIXED v9.40
`js/fx-presets.js:77`  · found by `fx-registry`

- **What:** `sanePreset()` rebuilds an animated param as `{ kf: kf }`, keeping only the keyframe array. `FM.evalProp` (scene.js) reads `p.loopMode` ('cycle' / 'pingpong') off the prop object to repeat past the last keyframe, and that sibling field is discarded here — and again on every `readCustom()`.
- **Trigger:** Keyframe an effect param, open its easing editor and tap the Loop button (graph-editor.js:176 sets `p.loopMode`) — or set the layer's loop in the timeline, which writes loopMode onto every animated prop including effect params (timeline.js:1146). Then ⋯ → "Save as preset…" and apply that preset from the effect's hold-to-open preset sheet.
- **Costs:** The preset instance freezes on its last keyframe value instead of cycling. Measured live: the source param (keys at t=1..4, loopMode 'cycle') evaluates to 40 at t=5; the preset instance evaluates to 20 — the clamped last value.
- **Fix:** Carry the field through with a whitelist, e.g. `const o = { kf: kf }; if (v.loopMode === 'cycle' || v.loopMode === 'pingpong') o.loopMode = v.loopMode; params[key] = o;`

### ~~FM.media.set() overwrites a live record without revoking it — every "Replace media…" pins the old file's object URL, <video> element and decoded AudioBuffer for the page lifetime~~ — FIXED v9.41
`js/media.js:13`  · found by `home-media`

- **What:** `set()` is a bare assignment: `store[id] = rec`. All the teardown (revoking `rec.url`) lives in `remove()`, which `FM.replaceMediaWith` never calls. That function explicitly captures the outgoing record (`const old = FM.media.get(id)` at js/app.js:1518) and uses it for `FM.clearFrameCache(old)` and `dropAudioGraph(old)` — but then does `FM.media.set(id, nrec)` at js/app.js:1521 and drops `old` on the floor with its blob URL still valid. The old `<video>` element still has that URL as its `src`, so the browser keeps the whole source file resident, and if the timeline had drawn a waveform for that clip `old.audioBuffer` holds a full decoded PCM buffer (js/media.js:100, never cleared) — ~46 MB per stereo minute at 48 kHz.
- **Trigger:** Select a video clip → Replace media… → pick a different file. Repeat (e.g. auditioning several takes for the same slot).
- **Costs:** Each replace permanently pins the previous file's blob URL, media element and decoded audio. Doing it a handful of times on a phone with multi-minute clips is hundreds of MB of unreleasable memory, which is what OOM-kills mobile Safari mid-edit. Nothing ever frees it — not deleting the layer, not switching projects, not closing the project.
- **Fix:** Make `set()` release whatever it displaces: `set(id, rec) { const p = store[id]; if (p && p !== rec && p.url) { try { URL.revokeObjectURL(p.url); } catch (e) {} if (p.el) { try { p.el.pause(); p.el.removeAttribute('src'); p.el.load(); } catch (e) {} } p.audioBuffer = null; } store[id] = rec; }`. That fixes replaceMediaWith without touching any caller.

---

# Bug hunt — 2026-08-20 (v10.63), two sweeps and one hole in the safety net

Run when REQUESTS.md had no actionable item left. Both sweeps came back with **no product defects**,
which is worth writing down as plainly as a list of bugs would be — and one of them found a real fault
in the tooling that is supposed to catch bugs.

## 1. The border-ring artefact (queue 424's cause) — no second instance
`background-origin` defaults to the padding box while `background-clip` defaults to the border box, so
a box with a gradient background and a see-through border paints its border ring by REPEATING the
gradient tile, showing the tile's opposite edge as a hairline. That is what the line under the empty
timeline turned out to be.
Swept for it live rather than by reading CSS (the empty add-row's two declarations sit in different
rules, so a static scan misses exactly the case that started this): every element on four screens,
flagged when it had a gradient background, default origin/clip, and a border under 0.35 alpha. **Five
candidates, all `.addmenu-card--soft` and `#cv-go`.** Measured the cards by screenshotting with and
without `background-origin: border-box` injected: **the pixels are identical**, so their gradients do
not differ enough across the tile for the repeat to show. Nothing to fix.

## 2. A slider at 0 becoming a default — none left, and now gated
`FM.evalProp` returns 0 for an ABSENT parameter, never null, so `FM.evalProp(p.size, t) || 16` cannot
tell "no value" from "the user dialled it to zero". Queue 403 found one of those by accident.
Swept all 199 effects: for every parameter where 0 is a legal, reachable value, rendered at 0 and at
the parameter's own default. **No parameter treats 0 as its default.** The class is clean.
Kept as a test rather than a paragraph, so the next `|| N` is caught: `effects: a slider at 0 means
zero, it does not quietly become the default`.
**Two false-hit lessons are baked into that test, both of which cost a run to find:**
- Comparing 0 against *a hair above 0* flags QUANTISATION, not substitution — effects that draw on a
  whole-pixel grid legitimately jump when nudged, and which ones tripped depended on the canvas size.
  Comparing 0 against the DEFAULT is the actual fingerprint of `|| N`.
- The subject has to be ASYMMETRIC and detailed. A flat square is invisible to anything that moves
  pixels: mirroring it, stretching a uniform region of it, or spinning it 90° all return the identical
  picture, which reads as "0 renders exactly as the default". An outlined star, off-centre, does not.

## 3. 🚨 THE REAL FIND: a suite that never ran was reported as GREEN
`ship.sh` refused to commit on a red suite and `mutate.sh` refused to mutate against a red tree — but
**neither asked whether any test had actually run.** A `tests/tests.js` with a syntax error registers
ZERO tests, so nothing fails, so both called it green. Demonstrated deliberately: an unbalanced brace
spliced into the file came back *"every test still passed"*. ship.sh would have committed and pushed
it while printing a tick; mutate.sh cached the empty run as a proven-green baseline, which would then
have blessed every mutation checked against it.
**Closed structurally** (`tools/_testfloor.sh`, sourced by both): the suite's registered test count is
recorded in `tools/.test-floor` and only ever allowed to rise. Zero tests, no summary line at all, or a
count below the floor each refuse and say why. Deliberately removing a test is the one case that trips
it, and the message gives the one line that lowers the number.

## 4. Three more sweeps, all clean (same session)
Recorded because "we looked and found nothing" is worth as much as a finding when the next session is
deciding where to spend its time.
- **Export audio (#215's territory).** Read the whole path expecting a silent drop. It is already
  exhaustively instrumented: the AAC-probe failure and the encode failure each toast the user and are
  named in `FM._audioTrackDropped`, the soundtrack is encoded BEFORE the muxer exists so a file can
  never advertise a track it does not have, and `buildAudioMix` records a REASON for every clip it
  skips and reports them. Nothing silent left on that path. Whatever #215 is, it is not here.
- **User data reaching markup.** Every `innerHTML` in the app is a static literal or a trusted icon
  constant; nothing interpolates a layer, project or file name. Captions — the most obviously
  user-typed string in the app — go through `textContent`, with a comment saying why. Clean.
- **A layer scaled to 0.** `canvas-edit.js` reads `evalProp(tr.scale, t) || 1` in places, which looked
  like the selection frame would stay full size while the layer vanished. Measured instead of assumed:
  the frame's width falls by ~25px per 0.5 of scale, which is exactly a 400px layer at the preview's
  0.125 zoom, so it tracks correctly and collapses at 0. The `|| 1` sites turn out to be division
  guards in the text-wrap drag, not defaults. No defect.

## 5. Undo fidelity — clean, and now a permanent sweep
Twelve kinds of edit (delete, duplicate, add, move, trim, reorder, rename, transform, add-effect,
opacity, project background, group), each done once and undone once, comparing the whole document
before and after as a string. **All twelve restore byte-identically.**
Kept as `history: one edit then undo puts the document back exactly, for every kind of edit`, because
the snapshot is a whole-document string — so a field that stops being captured by a FUTURE change
fails here regardless of which feature added it. Mutation-checked by dropping `project.background`
during restore, which the sweep reports by name and character offset.
It also counts how many operations actually CHANGED the document and fails if fewer than eight did:
an operation that quietly stops doing anything would otherwise turn into silent coverage loss.

## 6. Save → load round-trip — clean, and now a permanent sweep
Built one document carrying as many features at once as can exist without media files (keyframes with
eases, stroke with dashes, shadow, two effects including a colour param, a repeater, a colour grade,
blend, lock, trim path, project markers, a loop region, a multi-selection), wrote it with `flushSync`
and read it back with `load`. **Byte-identical.**
One false alarm on the way, worth recording because it would fool the next person too: an effect's
COLOUR is a `params.color` entry (`js/fx-registry.js:210` turns `def.color` into an ordinary param),
not a top-level `fx.color`. A probe that put it at the top level saw it stripped and read that as data
loss — the sanitiser was right and the probe was wrong.
Kept as `storage: a feature-rich project survives a save and a load unchanged`, mutation-checked by
making `sceneDoc()` drop `repeater` on the way out. Materialising a default (the loader writing
`enabled: true` onto an effect that omitted it) is normalisation rather than loss, so the fixture
states those explicitly instead of the test needing to know which they are.

## 7. Duplicate fidelity — clean, and now a permanent sweep
One layer carrying 34 properties at once (keyframes, stroke + dashes, shadow, two effects, repeater,
colour grade, trim path, blend, lock, volume/fades), duplicated with `inPlace` so nothing is
deliberately renamed or recoloured. **Every property carried, and it is a genuine deep copy** —
editing the copy's stroke, effect params or transform does not reach back into the original.
Kept as `layers: duplicating one copies every property, and copies it deeply`. Mutation-checked by
making `FM.cloneLayer` drop `colorGrade`, and that check earned its keep twice: the first run caught
the mutation but reported `Cannot read properties of undefined (reading 'slice')` instead of naming
the field, because a LOST property comes back undefined. A test whose failure message breaks in the
one case it exists for is half a test; it names the property now.

## 8. Keyframes land on their own value — clean, and now swept across every ease
At its own time a keyframe must give back exactly the number you typed, whatever easing is on it.
That is not free: a MIDDLE keyframe is reached as the END of the previous segment, so the value only
lands if the easing function returns exactly 1 at 1 — and the generative families (bounce, elastic,
cyclic, random, steps) have no particular reason to. **All twelve presets land exactly.**
Kept as `keyframes: every ease lands exactly on the value you set, at every keyframe`, read from
`FM.EASE_FAMILIES` so an ease added later is covered the day it is added. Mutation-checked by scaling
the segment fraction by 0.999, which puts all twelve a hair off and is reported per ease.

## 9. Copy → paste fidelity — clean, and now a permanent sweep
Same family as the duplicate sweep. A layer carrying 33 properties, copied and pasted: **every property
reproduced**, the pasted layer is independent of both the original AND the clipboard entry (editing it
reaches neither), and a second paste makes a second distinct layer rather than another view of one.
**Two deliberate behaviours had to be understood before this could be written honestly**, and both
looked exactly like lost data on the first run:
- Paste lands the clip at the PLAYHEAD and shifts its keyframe times by the same delta, so the
  animation stays aligned to the clip. The test parks the playhead on the layer's own start, making
  that delta zero — rather than carrying a model of the shift that could happily agree with a broken one.
- Paste SNAPS the start to a frame boundary. A start of 0.25s at 30fps is frame 7.5 and comes back as
  0.2667. The fixture uses 0.5s (frame 15 exactly) so the snap is a no-op.
Mutation-checked by making `FM.copySelection` drop `repeater` from its snapshot.

### ✅ CHASED AND FIXED (20 Aug): the order-sensitive test was time-sensitive
The lead below was real, and the cause was not test ORDER but WALL CLOCK. `a vertical flick on the
timeline keeps gliding` released a fling, slept a fixed **260ms**, and required `scrollTop` to have
advanced. The glide advances on requestAnimationFrame, so that fixed window does not ask "did the code
fling" — it asks "did enough frames run on this machine in a quarter of a second". Under a mutation run,
with a second Chrome and a suite competing for the box, the answer is sometimes no. That is why it went
red under a mutation (removing a field from clipboard snapshots) that cannot touch flinging at all.
It now POLLS for up to 1500ms and stops the moment the list has moved. The assertion is unchanged in
meaning, and mutation-checking it — making `startScrollMomentum` a no-op — still reports "the list
stopped dead when the finger lifted", so nothing was weakened to buy the stability.
**The general lesson, and it applies to every timing assertion in this suite:** wait for the CONDITION,
never for a duration. A fixed sleep in a test that measures animation is a bet on the machine.

**SWEPT for others, and the criterion is worth keeping because the obvious search over-flags badly.**
62 tests sleep 150ms or more and then assert on a comparison — but almost none of them are at risk, and
the distinction is what drives the thing being measured:
- **CLOCK-driven is safe.** Playback reads `FM.clockNow()` rather than accumulating rAF deltas (the
  comment above `tick()` says so deliberately), so "the playhead advanced after 500ms" holds even when
  frames are dropped. Every playback/audio-context test in that list is fine.
- **DOM-refresh sleeps are safe.** Waiting 150ms for `refreshAll()` to land is deterministic work, not
  animation.
- **rAF-driven MOTION is the risky class** — momentum, glides, edge auto-scroll — because there the
  assertion is really counting frames.
Narrowing to that class leaves 11 tests, and reading the top candidates shows most are still safe: the
clip-flick test's sleep sits BETWEEN two gestures and its assertions compare fling VELOCITIES recorded
at pointerup (deterministic), and the edge-scroll test's sleeps are setup settles before the gesture.
**Only the vertical-glide test actually asserted "it moved far enough inside a fixed window", and it is
fixed.** If another timing failure ever appears, this is the criterion to apply — not "find the sleeps".

### ⚠️ The original lead, kept for the record
During that mutation run, `a vertical flick on the timeline keeps gliding, like a horizontal one` also
went red ("the list stopped dead when the finger lifted, 150 → 150") — while the mutation only removed
`repeater` from clipboard snapshots, which cannot affect flinging. The baseline immediately before was
green. So that test is likely sensitive to timing or to what ran before it. Worth confirming with an
isolation run; a test that fails for reasons unrelated to what it asserts costs more than it protects.


## 10. ⚠️ THE VERTICAL-GLIDE TEST IS STILL INTERMITTENT — and the earlier diagnosis was incomplete
Section 9 above concluded the test was time-sensitive and fixed it by polling for up to 1500ms instead
of sleeping 260ms. **That was not the whole story.** On 20 Aug a baseline run (nothing mutated, tree
otherwise green) failed it again with `150 → 150`: the scroll position did not move AT ALL inside the
full 1.5 seconds. A slow machine cannot produce that — polling would have caught any movement.
**So the fling sometimes never ARMS**, which is a different fault from "the glide had not gone far
enough yet". Candidates, none yet tested:
- a previous test leaving a captured pointer or an unreleased drag, so the synthetic `pointerdown`
  lands on a scroller that is already mid-gesture;
- the fixture's 24 layers not overflowing on that run (the test guards this, but only at setup);
- `_lastScrollFling` being armed while `startScrollMomentum` early-outs against a clamped `scrollTop`
  — the guard the v10.53 comment describes ("it stops if scrollTop refuses to move").
**Next step:** run it in isolation and in a loop, and record `FM._tlLastScrollFling()` on the failing
run — the velocity being present with no movement would point straight at the clamp.
✅ **DONE CHEAPLY (20 Aug): the test now answers that question itself.** The velocity assertion was
sitting AFTER the movement one, so every intermittent failure died before it ever looked at the fling and
threw away the one fact worth having. Reordered: it now reports either *"the release recorded no fling
velocity at all — the gesture never armed"* or *"a fling WAS armed (v=…) but the list did not move"*.
Same assertions, same strictness; the next occurrence names which half broke with no extra runs and
nobody having to reproduce it deliberately. Chasing an intermittent failure by re-running it is the
expensive way; making it explain itself costs one edit.

### ✅ AND IT SOLVED IT ON THE FIRST RUN — the code was never wrong, the FIXTURE was
The reordered test reported: *"a fling WAS armed (v=271.212) but the list did not move: 150 → 150"*.
That is the whole answer. The drag is five 30px steps = **150px**, and the guard only required **40px**
of overflow — so on any run where the list was slightly shorter, the FINGER consumed the entire
scrollable range and `startScrollMomentum` correctly stopped because `scrollTop` was already pinned at
the bottom. The v10.53 comment even documents that behaviour ("it stops if scrollTop refuses to move").
So: not a race, not test order, not the machine — a fixture asking the glide to run off the end of the
list. The guard now requires 270px (150 for the drag + 120 of measurable headroom) and says so when it
trips. **Three wrong diagnoses preceded this one** (test order, then wall-clock timing, then a clamp
bug), and all three were guesses; the run that solved it was the one where the test was made to report
what it actually saw.
Kept as an open lead rather than a fix, because the earlier entry claimed this was solved and it is not.

## 11. A test written for queue 427 that was too strict to ship (same session)
Guarding the play pill's accent colour is worth doing — 427 spent a fortnight open on a cascade bug
that did not exist, and a colour that changes on play is easy to delete by accident. The test as drafted
asserted the pill returns EXACTLY to its resting colour after pause, and measured `rgb(230,243,247)`
against `rgb(233,244,247)`: the colour transition is still in flight 120ms after the pause. Three levels
apart, and correct behaviour. It needs to poll until the colour settles, or compare with a tolerance,
rather than sampling once — the same lesson as section 9, in a place I did not expect it.
It was reverted rather than shipped red; re-adding it with that fix is a five-minute job.

## 12. Swept the other gesture fixtures for the same fault — and deliberately changed nothing
Having found that the vertical-glide fixture let its own drag eat the scroll range, the obvious next move
is to "harden" every other gesture test the same way. Checked them instead:
- **`dragging the add row into the edge scrolls the timeline` (the closest match)** guards on 10px of
  overflow and asserts 5px of movement — tight. But its drag does NOT consume the range: the pointer is
  held still at the edge and the AUTO-SCROLL does the moving, from `scrollTop = 0`. Different shape,
  sound as written.
- **`a flick that starts ON a clip glides like one on empty lane`** compares recorded fling VELOCITIES
  captured at pointerup, never a distance, so range cannot affect it.
**So nothing was changed**, and that is the point of the entry. Three of tonight's diagnoses were
pattern-matched rather than measured — the sibling-footer theory for queue 426, and two of the three
wrong causes for the glide — and each cost a build or a false "fixed". A guard raised on a test that was
never failing is the same mistake with a tidier face: it makes the suite look safer while proving
nothing, and it moves a number someone chose for a reason.
**The rule this leaves:** widen a fixture's margins when a failure shows you it is too narrow, not when a
sibling test turned out to be.

## 13. Audited the suite for traps 4 and 5 — one real fix, one deliberate no-change
Having been caught by both on 20 Aug, the useful move was to ask whether they were live anywhere else.

**Trap 4 (a persistent element checked for EXISTENCE rather than visibility) — one real instance, fixed.**
`#ctx-menu` survives in the DOM with its old items after any earlier test uses it. Six places in
`tests.js` touch it; five guard properly (by `getBoundingClientRect().width` or the `hidden` class) and
one — the hold-to-reset check — read `.ctx-item`s straight out of it. That could have found a stale
"Reset…" from an earlier menu and passed while the hold did nothing. Now guarded, and stated in the code
as a TIGHTENING rather than a new claim: the assertion under it is unchanged, it just cannot be answered
by a menu nobody opened.

**Trap 5 (asserting a word that the container's own TITLE contains) — two candidates, both sound.**
- `inspector: the blend card is called Mixing` searches the panel for "Mixing", which the closed card
  GRID also contains — so on its own that line proves nothing about the card opening. But the next line
  requires "Opacity", a control that only exists inside the OPEN card, and that is a real canary. The
  pair holds, so **nothing was changed.**
- The shortcuts-sheet check opens the overlay and reads its own text; the string cannot appear unless the
  sheet lists those keys. Sound.

**Why one was fixed and the other left alone**, since the two look similar: the context-menu case is a
demonstrated fault (it caught me in this same file the same day) and the guard can only ever remove a
false pass — it cannot make a test flakier. The Mixing case is a weak line with a strong neighbour, and
rewriting it would be changing a test that is not wrong. *Widen on evidence, not on resemblance* — the
rule from section 12, applied to the next thing that resembled a bug.

## 14. Audited trap 3 across the whole suite — and found the distinction that decides whether it matters
Scanned all 741 test blocks: 17 touch a scroll position, 6 assert that one MOVED, and three of those six
carry no guard proving the fixture could move at all (`add panel: pages can be turned with a mouse`,
`timeline: a clip name stays at the clip start`, `both ends of the add-row switch land somewhere you can
see`). The other three guard properly.
**But a missing room guard is only dangerous in one DIRECTION, and that is the useful finding:**
- **Asserting something MOVED, with no room:** the test FAILS. Costly — the vertical-glide test burned
  three wrong diagnoses before its `150 → 150` was traced to the drag eating the whole range — but it is
  a loud, honest failure. The guard's job there is to make the failure explain itself.
- **Asserting something did NOT move (jitter, stiffness, "stays put"), with no room:** the test PASSES,
  and proves nothing. That is the lie. It is exactly what my own queue 429 probe did: four layers, no
  overflow, `scrollTop` stuck at 0, and "the + never moved sideways" was true of a list that never
  scrolled.
**So the three unguarded tests above are the safe kind** — all assert movement — and they were left
alone, on the same rule as section 13: widen on evidence, not on resemblance. What IS worth doing is
noting them here, so that if one of them ever fails mysteriously the first question is already written
down: *did the fixture have room to move?*
**And the rule for anything NEW:** a test asserting that something stays still must prove the thing had
the opportunity to move. Otherwise it is measuring nothing and reporting success.

## 15. The dangerous class, scanned — and an HONEST partial result
Section 14 established which direction lies: a test asserting something **stayed still** passes when the
fixture could never have moved. So the whole suite was scanned for that class. 741 blocks; **24 assert
that something did not move, shift, drift or jump.**
⚠️ **What I cannot honestly tell you is how many of those 24 are unguarded.** The automated check for
"does it prove the thing COULD have moved" flags 18 — and that number is wrong, demonstrably:
- Many are STATIC layout assertions ("the help button sits to the RIGHT of the version chip") where the
  word "moved" appears in an error message and nothing is expected to move at all. They need no control.
- And `the playhead survives a rebuild that lands mid project-open` is flagged as unguarded when the
  v6.31 work on it explicitly added *"a control assertion proving the panel really was moving so the test
  cannot pass vacuously"*. The regex simply does not recognise how that control is written.
**So: a class worth auditing, a scan that finds the candidates, and no trustworthy verdict on them.**
Saying "18 tests are unguarded" would be exactly the kind of confident wrong number this file's opening
section is about. The 24 are listed by running the scan again — it is six lines of python over
`tests.js`, splitting on `\n  test('` and looking for a "did not move" error message beside a
`getBoundingClientRect`/`scrollTop` read.
**The check to apply by hand, one test at a time:** does this test PERFORM AN ACTION and then assert
something did not move? If yes, ask what happens when the action silently no-ops — if the answer is
"it passes", it needs a control that proves the action happened. If the assertion is about static
layout, it needs nothing.
**Unfinished on purpose.** Judging 24 tests properly is a session's work, and doing it badly would
replace a real question with a false all-clear.

✅ **SAMPLED BY HAND — 2 of the 24, both flagged "unguarded" by the scan, and BOTH ARE GUARDED:**
- `the Add layer can be dragged by its grip…` throws *"dragging the grip down opened no gap — nothing on
  screen followed the finger"* BEFORE it asserts the tap did not fire. The drag is proven to have
  happened.
- `captions: dragging a cue edge…` throws *"the cue chip only moved Npx across the whole drag — it is
  not tracking"* before asserting the chip did not jump on release. Same shape.
**So the base rate looks good and the scan's 18 is mostly noise** — this file's culture already demands
controls ("a control assertion proving the panel really was moving so the test cannot pass vacuously"
was written into the playhead work at v6.31). Two samples is not a proof, and it is offered as a sample:
the remaining 22 are worth a pass one day, at LOW priority, and the check is the one written above.
The reason to keep this section at all is the direction rule in section 14 — it is what any NEW
"stays put" test must satisfy, and that is where the next false pass would come from, not from here.

## 16. Does a resize storm rebuild the timeline? No — measured, and it clears a suspect
Found while fixing queue 429: the timeline REBUILDS on resize (that is what detached the probe's element
references). On iOS the chrome sliding away fires resize repeatedly during a swipe, so the obvious worry
is a rebuild storm on every scroll — which would be a real contributor to the standing phone-lag items
(95, 125, 387).
**Measured (`tests/_resizecost.html`, 12 clips):**
- ONE resize (820→880): `timeline.rebuild()` once, **6.3ms**; `FM.refreshAll()` **zero** times.
- EIGHT resizes in ~250ms, which is what the chrome animating actually looks like: `rebuild()` still
  **once**, 1.7ms total; `refreshAll()` **zero** times.
**So the resizes are already coalesced** and the cost is a couple of milliseconds, not a storm. That
suspect is out of the phone-lag hunt, and saying so is worth as much as a fix — it is one fewer place
for the next round to spend a night.
⚠️ Note the asymmetry worth remembering: the FIRST resize cost 6.3ms and the batch of eight cost 1.7ms
total. The first one lands on a cold layout; repeats are cheap. So a single rotation is dearer than a
whole toolbar animation.

## 17. BYOK API key handling — audited, clean
`CLAUDE.md` names this explicitly ("his apps handle real sensitive data — BYOK AI keys"), so it is worth
having audited rather than assumed. Traced the key from entry to transmission:
- **Storage:** `js/ai-key.js` (38 lines) keeps it in memory and, only when "remember" is ticked, in
  localStorage under its own key `fm.anthropic.key`. There is a `forget()` that clears both.
- **Display:** never shown in full — `masked()` renders `sk-ant-…` plus a tail.
- **Transmission:** HTTPS only (`https://api.anthropic.com/v1/messages`), and the key travels in the
  `x-api-key` HEADER — not in a URL, not in a query string, not in the request body.
- **Error paths:** the failure branch builds its message from the response JSON and carries an explicit
  comment that it "never logs the request body or key". No `console.log` of the request anywhere.
- **The leak that would matter most — the key ending up in a SAVED PROJECT** and therefore in anything he
  shares or exports — does not happen: nothing writes it onto a layer, the scene or the project index.
  `sceneDoc()` is `{project, layers, selectedId, selectedIds}` and the key is not reachable from any of
  them.
**Nothing to fix.** Recorded because the alternative is re-auditing it every time the rule is read.

## 18. 🚨 THE SERVICE WORKER CACHE GROWS FOREVER — found 20 Aug, NOT fixed, and it touches his media
**What is true today.** Versioned assets (`?v=`) are cached CACHE-FIRST and keyed on the full URL, which
is correct — those bytes are immutable for that URL. But nothing ever removes the OLD ones:
- `activate` deletes caches whose NAME differs from `CACHE`, and `CACHE` is the constant
  `'freemotion-v1'` — so there is never another name to delete;
- the only other `delete` in the file is the stale-marker key.
So every release's copy of every changed file stays cached permanently. This session alone shipped 50+
versions; `js/compositor.js` is ~11,000 lines and `styles.css` is large, so the accumulation is tens of
megabytes rather than a rounding error.
**Why it matters more than "wasted space":** on a phone the origin's storage is ONE budget shared with
IndexedDB — which is where his imported media lives. Under pressure a browser evicts the whole origin,
not the tidy parts of it. So an unbounded asset cache is a slow path to losing project media, and it also
squeezes the export crash-resume store (#47) which needs room for up to 512MB of chunks.
**Why it is recorded rather than fixed tonight:** a careless prune breaks offline use, which is the
feature the cache exists for. Two designs, and the second is the one to build:
1. *Prune on activate* — simple, but `activate` only fires when `sw.js` itself changes byte-wise, and it
   does not change on most releases. So it would prune rarely and unpredictably. **Rejected.**
2. *Prune after a successful navigation* — the response IS the current index.html, and the stale-marker
   path already parses that text. Collect the `?v=` URLs it references, walk `cache.keys()`, and delete
   versioned entries that are not among them. Self-maintaining, runs at most once per navigation, and
   conservative by construction: anything the live page names is kept.
⚠️ **Whoever builds it: verify offline still works afterwards.** Load, go offline, reload — the app must
still come up. That is the assertion this change can break, and nothing currently covers it.

## 19. 🚨 `FM.speedAt` never actually returned a number — FIXED v10.89

**How it was found.** The queue's actionable items were all waiting on Ezra, so: a sweep of
`FM.layerLocalTime`, the map from project time to SOURCE time. Everything that reads a frame goes
through it — the compositor, the reverse cache, `seekVideosToTime`, the exporter — and its history in
this repo is edge cases: the comment above `FM.speedAt` records a ramped speed collapsing the entire
timeline via a trim.

Five invariants, swept over reversed × speed × trimStart × duration (`tests/_srctime.html`):
finite · inside `[trimStart, trimStart + total advance]` · monotonic · the ends land on the window's
ends · null outside the clip. **2,624 samples, and every valid combination held.** That is a real
clearance for the ramped path.

**The find.** `FM.speedAt`'s own doc-comment says *"Every call site that needs a number must come
through here"* — and its non-animated branch was `return sp || 1`, which hands back whatever truthy
thing is on the layer, **including an object**. A well-formed animated prop is caught by `isAnimated`;
a malformed one (`{keys:[…]}` rather than `{kf:[…]}`) is truthy, fails `Array.isArray(p.kf)`, and
escapes. The caller multiplies by it: **NaN source time at every sample — no picture, no error, and
the same in the export.**

Reachable rather than hypothetical: `.fmotion.json` is untrusted input, and the load path deliberately
does not re-run most sanitisers — *"anything an import once let through has been autosaved back into
localStorage and comes in unchecked here forever after."*

**Two lessons worth more than the fix.**

1. **The probe missed the second instance and the SUITE TEST caught it.** `FM.layerSourceAdvance` has
   the identical hole, and the probe had a `? :` fallback for it that quietly papered over the NaN. The
   suite version asserts the total source window is finite *before* it uses it, and went red on the
   first run. A fallback in a probe is a place a bug can hide.
2. **The malformed case had to be IN the table.** Without it the sweep is 2,600 green samples proving
   the happy path, and it would have shipped the hole it was written to find. A sweep is only as good
   as its worst row.

⚠️ The same raw `layer.speed || 1` idiom survives in about ten other call sites (audio-play,
audio-react, captions, exporter, app.js). Logged as **REQUESTS 451** rather than swept in silently —
several of them deliberately want the STATIC value and are not a find-and-replace.


## 20. Caption cues across clip edits — MOVE and SPLIT clean, TRIM **unresolved** (21 Aug)

Caption cue times are LAYER-LOCAL: `localTime(layer, t) = t - layer.start`, with **no trim offset**. The
timeline's own comment claims they "travel with it for free when the clip is moved or trimmed", and that
claim is worth checking rather than trusting, because moving and trimming are not the same shape of edit:
moving changes `start` alone, while trimming the head changes `start` AND `duration`. If a cue is measured
from `start`, trimming the head would slide every caption later in project time — and captions already
timed against the audio would all move.

**MOVE — clean, measured.** A clip moved +1.5s carried every cue by exactly 1.5s
(2.500–3.500 → 4.000–5.000, and so on for all three).

**SPLIT — clean, by reading the code.** `FM.splitLayer` re-bases B's cues to its new start and trims A's
to its new length, and says so in a comment. Nothing to add.

**TRIM — NOT ESTABLISHED, and this is recorded as unresolved rather than as a pass.** The probe
(`tests/_capdrift.html`) drives the real `.clip-grip` elements with real-timed pointer events, and:

- the first run reported **"cues stayed put"** on both edges — against a clip whose `start` and
  `duration` had not changed at all. Nothing was trimmed, so nothing could drift. A clean sweep that
  measured nothing.
- adding `FM.timeline._trimming()` as a CONTROL — a seam that exists in this repo precisely so a test can
  tell "a trim started" from "nothing happened" — turned that into an honest **"NO TRIM EVER STARTED"**
  on the left edge. On the right edge a trim *did* start and still changed no duration.

So the harness is now trustworthy and the question is still open. **Two guesses worth measuring first,
not acting on:** the 6s clip may be wider than the 380px viewport, so the grip found on screen maps to a
time the clamp then refuses; and the left grip's pointerdown may be bailing before `trimDrag` is created.

⚠️ **The lesson is the one this file keeps re-learning.** A gesture probe without a control does not
report "no bug" — it reports nothing, in the shape of "no bug". The control is what turned a false clean
into a known unknown.

### ✅ FINISHED THE SAME SESSION — and the trim half was a real bug. FIXED v10.91

The reason no trim ever started: **a TOUCH trim requires a deliberate 550ms hold before it arms**
(queue 336 — *"accidentally touching for a second moves it"*). A probe that presses and drags
immediately arms nothing. Not a bug; a design the fixture did not know about, and one a desktop
(mouse) path would never have revealed.

With the hold added, and the clip centred so both grips are actually on the 380px screen:

    TRIM LEFT   start 2.000 → 2.367   cue A  2.200–2.500  →  2.567–2.867     ❌ every caption slid
    TRIM RIGHT  duration 1.600 → 1.233  cue A  2.200–2.500  →  2.200–2.500   ✅ correct

**Captions timed against the audio were dragged off it by a head trim.** The app already answers this
shape of edit everywhere else — a video head trim advances `trimStart` so the picture stays put while
the window moves over it — and a caption track has no `trimStart`, so the offset goes onto the cues.
Non-destructive: a cue behind the new head keeps a negative time and comes back when the head is
dragged out, exactly as a video's frames do.

**A third false reading, after the fix:** the probe's verdict keyed off the CLIP's `start`, which MUST
change on a head trim — so it reported ❌ against a build that had just been fixed. It compares the cue
PROJECT times now, which is the actual question.

**And the fix wrote the rule twice.** A mutation in the grip's copy SURVIVED, because the suite drives
the seam rather than the grip. One `shiftCues` writer, two callers, mutation now caught.


## 21. 🚨 Ungrouping discarded the group's transform — FIXED v10.92

**The asymmetry that gives it away.** `groupSelection` creates the group with a NEUTRAL (0,0) transform
and says why: *"any x/y here would instantly displace every member the moment they're grouped."* That is
exactly the right care on the way IN. `FM.ungroup` was three lines — re-parent the members, drop the
group — and never looked at the transform at all.

**Measured by rendering**, not by reasoning about the transform stack:

    three shapes, ink box     44,89..155,199
    grouped, group moved      74,54..185,194
    ungrouped                 44,89..155,199   ← exactly the pre-move position

Arrange a group, position it, ungroup to tweak one member, and everything jumps back. A positioning
decision discarded in silence.

**Fixed** by composing the group's transform into each member the way `applyParentChain` composes it at
render time — the parent's rotate/scale act on the child's local position, its rotation adds, its scale
multiplies. The test moves, rotates AND scales the group at once, so a translate-only bake fails.

**Animated group transforms are deliberately not baked, and now say so.** A keyframed group position
cannot be folded into a child without resampling the child's own curve; a silent approximation of
someone's animation is worse than a sentence. The old behaviour said nothing at all.

### Two false cleans on the way in — both were the probe

1. **The ink box was measured by ALPHA, and the project draws its own background.** Every state read
   `0,0..199,199` with the full 40000 pixels of ink, which "proves" nothing moved whatever happened.
   Matching the shapes BY COLOUR is what made the measurement mean anything.
2. **The fixture wrote `grp.x`** — a layer's position lives at `transform.x`, which is what
   `applyParentChain` reads. So the "moved" group had not moved, and the row compared two identical
   states and called it a pass. A control line (*this MUST differ*) is what caught it.

Same lesson as section 20, in a different subsystem: **a sweep is only as good as its controls.**


## 22. Duplicating a group — CLEAN, and a permanent orphan-parent sweep came out of it (21 Aug)

**Hunted because it is the same family as section 21:** parenting is by ID, and duplicating a group has
to re-point the COPIES of its members at the NEW group. If any of them still pointed at the original,
the two groups would share children and moving one would move the other — the kind of thing you only
notice after building something on top of it.

**Measured, and it is clean.** 4 layers → 8 on duplicate; the copy has its own 3 members; moving the
copy leaves the original's members exactly where they were.

⚠️ **One wrong expectation in the probe, corrected rather than left.** It asserted the ink should DOUBLE
after a duplicate. `duplicateSelection` places the copy IN PLACE, exactly over the original, so the ink
box is identical by design — the probe was reading correct behaviour as a failure. The real question is
independence, which is the block that follows it.

### The sweep that came out of it — `no operation leaves a layer parented to something that no longer exists`

A layer's `parent` is an ID, and several operations remove layers: delete (which cascades into a group's
members), ungroup, split, duplicate, undo. A `parent` left pointing at a layer that is gone breaks that
layer's chain silently — `applyParentChain` walks until it cannot find the id and stops, so the layer
renders as if it were at the root and **jumps**, with nothing said. That is corruption which surfaces
three operations later as "my layer moved" and cannot be traced back.

So it is a permanent suite sweep over delete-a-group, ungroup, duplicate-then-delete-the-original, and
undo-a-group-delete — each step asserting the operation DID something first, because a sweep over
operations that silently no-op is a green run that proves nothing. Both removal paths mutation-proved.
