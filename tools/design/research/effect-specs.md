# R3: ten build-ready specs from R1's list (effects for beginners)

Against `origin/main` b46b47d3 (v17.23); main is now v17.24 with the same app code (`tests/tests.js` lines moved; test lines below are v17.24, by title). Specs only: nothing in the app, tests or tools was changed or run. **Read** = I read the line. **Guess** = needs a browser or a design decision. Source list: `research/missing-effects` (R1). **Ezra's rule here:** "as much choice as possible" (#966), and nothing visual ships before he has seen it (#545), so every spec ends with what to show him.

## How I chose the ten

R1's 25 mix real effects with UI features (a transition picker, auto captions, beat detection). R3 asks for specs "in the existing effect shape", so I took the ones that **are an effect or a preset of one**, and ranked those by what a beginner reaches for: the five transitions (R1 #2 to #6, the biggest gap R1 found), the shape wipe (#16), colour wheels (#20), confetti (#15), Ken Burns (#11) and speed curve presets (#8). Left out on purpose, with the reason: **echo trails** (#18) and **skin smooth** (#19) need frame history or an edge-preserving filter, which is exactly the preview-versus-export risk class `hunt/preview-export-parity` found; **freeze frame** (#7), **split screen** (#12), **beat markers** (#9) and **stabilise** (#10) are clip tools, not effects.

## The shape every new effect takes (Read, so no spec repeats it)

| touch point | where | what to add |
|---|---|---|
| 1. the row | `FM.EFFECTS` array, `js/compositor.js:50-1647` (append before the closing `];` at `:1647`) | `{ type, label, params: [{ key, label, min, max, step, def, unit?, legacy?, q?, options? }], color?, defColor? }`, as `wipe` does at `:710` and `particles` at `:1399` |
| 2. dispatch | `POSTFX` set, `js/compositor.js:3741` | `type: 1` (it is routed by this set; `particles` is in it, `:3764`) |
| 3. the kernel | one of `PIXEL_FX` (`:5174`, `(d, W, H, p, t, ps, bb, layer, scene)` per pixel, like `wipe` `:7721`), `WARP_FX` (`:10521`, per-point), or `CANVAS_FX` (`:12534`, `(A, B, W, H, bb, p, t, tl, layer, ps, expand, scene)`, like `vignette` `:12551` and `particles` `:14339`) | see each spec. `CANVAS_FX` receives the layer already drawn clean into `A` and writes `B` (`drawCanvasEffect`, `js/compositor.js:11765`) |
| 3b. a kernel that moves the layer | `moverSource`, `js/compositor.js:12381-12392` | **required for any kernel that moves, rotates or scales the layer** (Zoom, Whip pan, Spin): draw from `moverSource(A, W, H, ps, expand, layer, t, scene, [matrix])` instead of `A`, as Spin (`:14190`) and Swing (`:14172`) do, or the layer's off-frame content is lost (#986 C27) |
| 3c. search words | `def.tags` array or `SEARCH_ALIASES`, `js/fx-registry.js:545`, `:576` | add words a beginner types, for example `transition`, `intro`, `outro`, or the effect cannot be found by them |
| 3d. the default-visibility gate | `482: every effect does something visible at its own defaults` (`tests/tests.js:75286`) | every new type must draw something at its own defaults, or this existing test goes red (it matters for T7) |
| 4. the menu | `CATEGORY_OF`, `js/fx-registry.js:9-70` | a type with no entry lands in "stylize" (`:571`). Transitions fit the existing `opacity` or `matte` categories (`CATEGORY_ORDER` has both); a new "Transition" category needs its own icon (test `every effect category has its own distinct icon (queue 461)`, `tests/tests.js:48104`) and a picture shown to him first |
| 5. the tile picture | `OVERRIDES`, `js/fx-thumbs.js:742` | only if the default tile looks wrong |
| 6. the fingerprint | `C.SCHEMA_REV` and `C.SCHEMA_FP`, `js/collab-core.js:44`, `:243` | a new effect type changes the effect definitions the fingerprint hashes (`921 S1 the schema fingerprint gate`, near `tests/tests.js:30460`); bump the REV (main is 7, Simple takes 8, so use the next free number at merge) |

**The rules each spec is held to**
- **Byte-identical for existing projects** (`EFFECTS-PLAN.md:7`). A brand-new type cannot touch an old project by construction. When a spec changes an EXISTING effect (confetti, only), the new param's fallback must equal what is hard-coded now and the kernel must return to the old code path before reading anything new.
- **Preview and export identical.** One `renderScene` serves both. A kernel is safe if it is a pure function of `(clean layer render, params at t, layer start and duration, plate scale)`: **no state between frames, no `Math.random`, no wall clock.** Every pixel parameter is multiplied by the plate scale `ps` (the preview draws a smaller plate), and a spec says so. Randomness uses the app's own index hash, never `Math.random`. **Note `pHash` is a closure inside the particles kernel (`js/compositor.js:14343`), not a shared helper, so a second effect that wants it must first hoist it** to module scope (a refactor of existing code that must stay byte-identical for Particles).
- **Tests (the repo's three gates, `EFFECTS-PLAN.md:42-60`):** (1) identity against HEAD for anything old, (2) the effect still does something (changes more than 0 pixels), (3) each control moves pixels. Plus two of mine: **scale invariance** (the picture at plate scale 0.5 matches the 1.0 render scaled down, in the style of the existing `effects: warp strength does not change with the preview scale`, `tests/tests.js:25845`), and **the registry sees it** (it appears in `FM.fxRegistry.all()` with a category).

## The transition family: one shared control, five looks

**Text layers already have in-animations:** the Animate presets include Fade in, Slide in, Spin in and Zoom in from big (`js/inspector.js:5738-5739`). So the gap T1, T2 and T5 fill is for **non-text layers** (photos, video, shapes); say so in the menu so they are not offered twice on text.

There is no concept of a transition today (R1 section A); `dissolve`, `wipe` and `radialwipe` need a hand-keyframed Progress. So the five below share one rule that makes them work the moment they are added:

| shared param | range | default | meaning |
|---|---|---|---|
| `mode` | options: 0 Manual, 1 In (clip start), 2 Out (clip end), 3 In and out | **3** | Auto modes compute progress from the clip's own start and duration, so a beginner who taps the effect sees it work with no keyframes |
| `dur` | 0.1 to 3 s, step 0.05 | **0.5** | length of each end; clamped to half the clip |
| `progress` | 0 to 1, step 0.005, keyframable | 0 | used only in Manual. **0 = the clip as it is, 1 = fully transitioned away** |

Auto progress (from `t` and the clip window): **use `(layer._clipStart ?? layer.start)` and `(layer._clipDuration ?? layer.duration)`, not `layer.start` / `layer.duration`.** On a group proxy those two are fake (`start = t - 1; duration = 2`, "always inside its window", `js/compositor.js:18519-18521`), and the real values travel as `_clipStart` / `_clipDuration` (Flash (darken) already reads them, `:7633`). A split half has its own window and a `splitOf` lineage that the existing code resolves (`:7635`); say what a transition does on a split half (the first half's Out is its own end, which is usually not what he means) before building. `pIn = clamp(1 - (t - start) / dur)` and `pOut = clamp(1 - (start + duration - t) / dur)`; in mode 3 use `max(pIn, pOut)`. Put it in one helper `trProgress(p, t, layer)` in `js/compositor.js` next to `fparam`, so all five agree. **A transition on a clip that overlaps another** (a true cross-cut) is not addressed here: it needs the transition picker on the join (R1 #1), which is UI work.

**T1. Zoom** (`zoomtrans`, `CANVAS_FX`)
- Params: shared three, plus `zoom` 1 to 4 (step 0.05, def **1.8**), `blur` 0 to 1 (step 0.05, def **0.5**).
- Kernel: draw from `moverSource(...)` (touch point 3b) rather than `A`, then scale it about the centre of `bb` by `s = 1 + progress * (zoom - 1)` and fade alpha by `1 - progress`; if `blur > 0`, draw `round(6 * blur)` ghost copies between `s_prev` and `s` at falling alpha (cheap, no pixel loop). Pixel-free, so a phone costs a few `drawImage` calls.
- Test: gate 3 per control; `progress = 0` equals no effect within 0 bytes (control); scale invariance.
- Show him: a 3-frame strip for In and Out.

**T2. Whip pan** (`whippan`, `CANVAS_FX`)
- Params: shared, plus `angle` 0 to 360 (def **0**, degrees), `distance` 20 to 200 % of the frame (def **100**), `blur` 0 to 1 (def **0.6**).
- Kernel: draw from `moverSource(...)` (touch point 3b), then translate by `progress * distance * (W or H along angle)`; smear by `round(8 * blur)` trailing copies along the opposite direction at falling alpha; alpha fades over the last 30%.
- Both px and the distance scale by `ps` (distance is a percentage of the plate, so it already does).

**T3. White flash** (`flashwhite`, `CANVAS_FX`, uses `color: true, defColor: '#ffffff'`)
- Params: shared (In means the clip arrives out of a flash, Out means it leaves into one), `strength` 0 to 1 (def **1**).
- Kernel: like `vignette` (`:12551`), fill the colour over the picture with `globalCompositeOperation = 'source-atop'` at alpha `strength * progress`, so only picture pixels flash and the clip's alpha is untouched. **It is not the twin of `flashdark`:** `flashdark` (`js/compositor.js:681` row, `:7603` kernel) is a repeating strobe (Speed in Hz, default 10, plus Softness, Darkest and Pattern), not a one-shot darken, so do not name this one "Flash (white)" as if they were a pair; give it a name that says one flash (for example "Flash in/out").

**T4. Glitch cut** (`glitchcut`, `CANVAS_FX`). **There is already a Glitch** (`js/compositor.js:304-318`: Slices default 14, RGB tear, Re-roll, Uneven slices, Block damage, Pattern, Edges), so first ask whether this is a new effect at all: **propose "Glitch cut" as an `EFFECT_PRESETS` entry on `glitch`** (`js/fx-presets.js`) unless an in/out mode is truly needed; a separate effect only duplicates a control set that already has the same default Slices (14).
- Params: shared, plus `amount` 0 to 100 px (def **60**), `slices` 4 to 40 (def **14**), `split` 0 to 40 px (def **8**, the colour split).
- Kernel: split the layer into `slices` horizontal bands; shift band `k` by `amount * ps * (pHash(k * 7 + frame) - 0.5) * 2 * progress`, where `frame = round(t * scene.project.fps)` so the pattern changes per project frame and is identical in preview and export (**this quantisation is the thing to test**); `pHash` must be hoisted first (see the rules above). If `split > 0`, add a red-tinted and a cyan-tinted copy offset by `+split` and `-split` with `'lighter'`. Alpha fades over the last 30%.
- Guess: whether the two tinted copies read well on a bright picture. Show him.

**T5. Spin in/out** (`spintrans`, `CANVAS_FX`). **Label "Spin in/out", not "Spin": "Spin" is an existing effect (`js/compositor.js:1127`).**
- Params: shared, plus `turns` 0.25 to 3 (step 0.25, def **0.5**), `zoom` 1 to 3 (def **1.4**, hides the corners), `blur` 0 to 1 (def **0.4**, rotational ghosts).
- Kernel: draw from `moverSource(...)` (as Spin `:14190` and Swing `:14172` do), then rotate about the centre of `bb` by `progress * turns * 360` degrees, scale by `1 + progress * (zoom - 1)`, alpha fade over the last 30%. Keep the angle convention the existing rotation uses so a spin-in reads clockwise-in as spin-out reads clockwise-out (**check `layerCTM`, `js/compositor.js:15291`, before choosing the sign**).

## Six more

**T6. Shape wipe** (`shapewipe`, `PIXEL_FX` matte, category `matte`; R1 #16)
- Params: `progress` 0 to 1 (def **0.5**, step 0.005, as `wipe`), `shape` options 0 Circle, 1 Diamond, 2 Heart, 3 Star (def **0**), `softness` 0 to 200 px (def **0**, as `wipe`), `centerx` and `centery` 0 to 100 % (def **50**; reuse `wCx` and `wCy`, `js/compositor.js:9160`, so a centred wipe is byte-identical to its own default), `mode` options 0 Reveal, 1 Cover (def **0**).
- Kernel: for each pixel, a shape distance `s(x, y)` measured from the centre in units of the radius `r = progress * maxR` (**`radialwipe` is an angular clock wipe and has no `maxR`** (`js/compositor.js:7728` sweeps an angle from `start`); use `Math.hypot(cx, cy)` for the farthest corner, or `wR(p, t, maxR)` (`:9162`) which takes a `maxR` you give it): circle `hypot`, diamond `|x| + |y|`, star by the polar form `r(theta)` of a five-point star (closed form, no loop), heart by the implicit curve `(x^2 + y^2 - 1)^3 - x^2 y^3`. Alpha multiplies by a smoothstep over `softness * ps`. All closed forms, so cost is the same order as `radialwipe`.
- Test: the three gates, plus "progress 0 hides everything / 1 shows everything" for every shape.

**T7. Colour wheels** (`colorwheels`, `PIXEL_FX`, category `color`; R1 #20)
- Params (all keyframable): `liftHue`, `gammaHue`, `gainHue` 0 to 360 (def **0**); `liftAmt`, `gammaAmt`, `gainAmt` 0 to 1 (step 0.01, def **0**); `mix` 0 to 1 (def **1**).
- Kernel, per channel `c` in [0, 1]: `out = pow(max(0, c * (1 + gainTint) + liftTint), 1 / (1 + gammaTint))`, where each tint is the wheel's hue turned into an RGB offset in [-1, 1] and scaled by its amount and a fixed 0.35 (tune by eye). **At all three amounts 0 the kernel returns before touching a pixel**, so adding it changes nothing until he moves a wheel. **That fails the default-visibility gate** (`482: every effect does something visible at its own defaults`, `tests/tests.js:75286`), which requires every effect to draw something at its own defaults, so T7 needs a visible default look (a mild grade). It also has to be compared with what exists: **`layer.colorGrade`** is already a colour wheel plus lift / gamma / gain on every layer (`js/inspector.js:6483-6492`, "Color Tune" and "Grade (lift / gamma / gain)"), and `colorbalance` has Affects ranges (`js/compositor.js:613`). Say what T7 adds that those do not, or drop it. This is the one spec with real maths; the 0.35 and the exact curve are **Guess** until he sees it on a photograph (the existing `colorbalance` and `highlightsshadows` rows, `js/fx-registry.js:42`, are the neighbours to compare with so it does not duplicate them).

**T8. Confetti and colourful particles** (a change to the EXISTING `particles`, `CANVAS_FX` `:14339`; R1 #15)
- Add one param to the row at `js/compositor.js:1399`: `palette` options 0 Two colours (today), 1 Confetti, 2 Hearts, 3 Sparkle, **def 0**.
- Kernel: at the top, `if (!paletteParam) { ...today's path untouched... }` so every saved Particles is **byte-identical** (absent param reads as 0). For palettes 1 to 3 pick each particle's colour from a fixed 6-colour list with a **separate hash stream** (`pHash(i * 4 + 3)` already sets the per-particle rotation phase, `js/compositor.js:14423`, so reusing it would tie a particle's colour to its spin phase; use another offset). Particles are already a closed form of `t` and the index, so preview equals export, and for Hearts/Sparkle map to the existing `shape` (add a heart to its option list: **append** it as option 5; never renumber 0 to 4). **Appending option 5 also requires widening `Math.round(rd('shape', 0, 0, 4))` at `js/compositor.js:14359` to 5**, or a saved 5 reads as 4.
- Also add three entries to `FM.EFFECT_PRESETS` (`js/fx-presets.js:17`, whose rows are `{ id, fx, name, desc, dur, params }`): "Confetti burst", "Hearts rise", "Sparkle drift", so a beginner never meets the param.
- Tests: **identity against HEAD for a Particles saved with the old keys must be 0** (the gate that matters most here), each palette differs from the others, and the three presets exist. **Bump `SCHEMA_REV` and re-pin `SCHEMA_FP`**, and note the fingerprint does **not** hash the options list (`js/collab-core.js:226-228` hashes key, type, default, legacy, min, max and keyframable), so appended options are invisible to the gate: two builds that differ by the heart option would join one session (see `plans/fp-options`).

**T9. Ken Burns** (a built-in layer preset, not an effect; R1 #11)
- Where: `FM.layerPresets` (`js/inspector.js:561`) only stores presets the user saves; there are no built-ins. Add a `builtins` list that works like `FM.EFFECT_PRESETS`: each entry is `{ id, name, make(layer) }` and `make` writes keyframes for `transform.scale`, `x`, `y` at `layer.start` and `layer.start + layer.duration` from the layer's current rest values. A preset that stretches to the clip's end cannot be stored as fixed times (the saved form is `shiftKf`-relative, `:571-585`), which is why `make` is a function.
- Presets: "Slow zoom in" (scale x1.00 to x1.15), "Slow zoom out" (x1.15 to x1.00), "Pan left" and "Pan right" (x moves 6 % of the frame), "Zoom and drift" (both). Easing: the app's own `easeInOut` (`js/scene.js:33`).
- Preview equals export trivially (it only writes keyframes into properties that already render identically). **Test:** apply to a clip, assert the keyframes exist at the two times with the expected scale, and that undo removes them in one step. **Show him** a before and after of one photo.
- Open question: whether he wants it on EVERY photo added (R1's suggestion) or as a tap. A tap is safer and reversible; automatic is a visible change to every import.

**T10. Speed curve presets** (presets writing speed keyframes; R1 #8)
- Where: speed keyframes already exist on the layer (`layer.speed.kf`, shape `{ t, v, e }` as in `tests/tests.js` speed tests, e.g. the seed in `js/collab-core.js` fixture `speed: { kf: [...] }`). Add built-in presets next to the speed control in the inspector (the same `builtins` pattern as T9).
- Presets as fractions of the clip (times scale to the clip, values are the speed): **Montage** `0: 1, 0.2: 0.3, 0.5: 3, 0.8: 0.3, 1: 1`; **Hero** `0: 1, 0.3: 0.25, 0.6: 3, 1: 1`; **Bullet** `0: 1, 0.35: 0.1, 0.65: 0.1, 1: 1`; **Jump** `0: 1, 0.45: 1, 0.5: 4, 0.55: 1, 1: 1`; **Flash in** `0: 4, 0.15: 1, 1: 1`; **Flash out** `0: 1, 0.85: 1, 1: 4`. **These values are my first draft, not tuned: Guess.** He should hear and see each on a real clip before they ship.
- **Read before building:** how a speed ramp changes the clip's timeline duration (the tests `trimming a speed-ramped clip…`, `tests/tests.js:94418`, show it matters). If a ramp that slows the middle makes the clip longer on the timeline, a preset that changes the length must say so, and neighbouring clips may need a ripple. I did not trace that.
- Test: apply each, assert the keyframes, and that the exported audio length matches the preview (the existing speed-ramp audio tests are the model).

## Order

1. **T3 (Flash), T1 (Zoom), T5 (Spin), T2 (Whip pan)**: small, pixel-free, one shared helper. Ship them together as "Transitions" behind a design pass on the menu category. About three days with tests.
2. **T8 (confetti)** and **T9 (Ken Burns)**: low risk, high delight.
3. **T4 (Glitch cut)**, **T6 (Shape wipe)**, **T10 (speed presets)**, **T7 (Colour wheels)** last: more design (the maths and the numbers) and the most need for him to see them.

## What I did not do

Nothing was built or run, so every number marked default is a proposal, and the kernel descriptions are designs, not tested code. I did not verify how `layerCTM` signs rotation (T5), how a speed ramp changes a clip's length (T10), or that the existing categories are the right home for transitions (T1 to T5): that last one is Ezra's call.
