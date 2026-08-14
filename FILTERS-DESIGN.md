# Filters — the design, before any of it is built

Ezra's request is REQUESTS.md #113. This file is the plan it asked for, written after four passes over
the code that a filter has to plug into. It exists so the shape is decided once, in the open, rather
than discovered halfway through — because the effect list is touched by the compositor, the inspector,
the timeline, audio-react, save/load, undo, duplicate, presets and Paste Style, and a wrong shape means
redoing all of them.

**His constraint, verbatim, because everything below serves it:**

> "Make sure when you add a filter it doesn't just add a bunch of effects and change their variables
> for you, even if that's what some of the filters are, I want it to show up in the effects menu and
> actually be grouped as one thing … basically effects inside effects (filters) and at the top you will
> have an opacity slider, so you can turn down the effects strength and it will automatically apply it
> to every effect under that filter."

---

## The decisions

### 1. A filter is ONE effect, not a nested list that gets flattened

An effect instance today is `{ type, enabled, params }` — no id, no name (`js/fx-registry.js:471`).
Every handle in the app is therefore **object identity** or **array index**.

Twenty-four compositor kernels peel themselves off the stack with the same line:

```js
Object.assign({}, layer, { effects: (layer.effects || []).filter(e => e !== fx) })
```

If `layer.effects` were flattened on read into fresh child objects, that filter would never match, the
kernel would re-select the same child forever, and `_pfDepth` — an **uncapped** pool index allocating
two comp-sized canvases per level — would climb until the tab died. Not a glitch: a hang.

So the container is a **normal POSTFX type**. `layer.effects` stays a flat array of exactly the shape
it has today. One entry happens to be a filter, and its kernel renders its own children into its own
plate. Every one of those 24 sites keeps working untouched, and a project with no filters renders
**byte-identically** — which is the thing to assert first.

This also makes the bespoke case free. Ezra: *"Some filters will just be their own thing."* A filter
with children splices them; a filter with no children and its own kernel rides the existing
PIXEL_FX / WARP_FX / CANVAS_FX dispatch. Same type, same strength control, one code path.

### 2. Strength is a cross-fade, never a parameter scale

The obvious reading of "turn down the strength" is to multiply the children's parameters. That is
wrong, and measurably so:

- A param slot holds **either** a number **or** `{kf:[…]}` (`js/scene.js:43`). Scaling a keyframed
  child means rewriting keyframe values in place — destructive and not reversible at strength 1.
- Params are heterogeneous: px radii, degrees, 0..1 amounts, colour strings, mode integers. Half a
  hue-rotation is not half the effect; half a colour string is meaningless; scaling Mirror's mode
  integer corrupts the look rather than weakening it.

So: render the children into a plate, render the untouched input, **blend at alpha = strength**.
Strength 1 is then byte-identical to the children rendering normally and strength 0 is a true no-op —
both trivially assertable. The compositor already has this exact shape in group units
(`js/compositor.js:8882`), which is the precedent to copy rather than invent.

### 3. Nesting is capped at 1, enforced in the add path

Filters hold effects. Filters do **not** hold filters. A filter at strength < 1 already costs two full
rasterisations; nesting would cost 2^depth, each holding a comp-sized plate pair (~8MB at 1080×1920),
and no depth counter in the compositor is capped. Enforced where a filter is added, not at render time.

### 4. One walker, landed FIRST, before any UI exists

Seven places walk `layer.effects` exactly one level deep. If children are invisible to them, each
fails **silently**:

| site | what breaks |
|---|---|
| `FM.animatedProps` (`js/scene.js:336`) | no timeline diamonds; and clip-drag retiming + Speed stretch leave a filter's keyframes behind at the old absolute time |
| `deleteKeyframesAt` (`js/timeline.js:200`) | keyframes you can see and cannot delete — the exact bug its own comment says already shipped once |
| `propKey`/`resolveSlot` (`js/timeline.js:236`) | keyframe copy/paste lands on the wrong parameter |
| `audio-react` (`js/audio-react.js:20`) | an audio link silently retargets a different effect |
| `storage.js:609`, `app.js:1845`, `app.js:1949` | a Luma Matte / Compound Blur / Match Grade / Displacement Map inside a filter keeps a **dead layer id** after duplicate or import, renders plain, and autosaves broken |

So `FM.eachFx(layer, fn)` lands first and all seven sites route through it in the same change. Patching
them one bug report at a time is how this class of defect stays alive for months.

### 5. The address grammar has to widen at the same time

Keyframes are addressed `'effect.<i>.<key>'` and audio-react targets by **position**, with a comment
saying so outright: *"Index, not id — makeInstance doesn't stamp ids, so position in layer.effects is
the identity."* Inserting a container renumbers everything after it.

Widen to `'effect.<i>.<j>.<key>'` with a back-compatible parse of the 3-part form. (Stamping stable ids
at `makeInstance` would fix the pre-existing fragility too, and is worth costing — but it is a
migration, so not in v1 unless the id can be optional.)

### 6. CSS-filter children cannot be ordered — decided before the library is authored

**Measured, not assumed:** `[blur, pixelate]` and `[pixelate, blur]` render **0 differing bytes**;
likewise `[brightness, posterize]` and `[blur, mirror]`. The control — adding blur at all — moved
66,816 bytes. Nine types (blur, brightness, contrast, saturate, hue, grayscale, sepia, invert, glow)
are collected into one `ctx.filter` string applied **before** the content draw, whatever order the
author gives them.

A "VHS" filter authored as grade → grain → scanlines would silently render grade-first. So either those
nine are excluded from filter containers in favour of their pixel equivalents (levels, colorbalance and
friends are PIXEL_FX and **do** respect order), or the UI greys their drag grip and says "always
applied first". **What must not ship is a reorderable list that does nothing.**

### 7. Filters get their own file, registry and validator

`js/filters.js`, `FM.FILTERS` + `FM.filters`, mirroring `fx-presets.js`'s structure with its own
validator. Not bent into `FM.EFFECT_PRESETS`: `sanePreset` returns null for anything that does not name
exactly one registry effect, 75 tests reference the preset system, and that validator is what stands
between localStorage garbage and the compositor.

The registry object is `Object.create(null)` — see the live bug below.

### 8. Everything that filters the stack by registry type must be taught about containers

Paste Style (`js/inspector.js:1480`), the effect clipboard (`:250`), effect presets (`:3444`) and
`supportsLayer` each drop entries the registry does not know. A user who builds a look with a filter,
copies it and pastes would get the filter **silently deleted**. A filter is applicable if at least one
child is; unsupported children are dropped from **inside** the container, keeping the container.

`supportsLayer` for a container returns the AND over its children — so a filter containing Squish is
simply not offered on a group, which is the existing rule applied one level in.

---

## A live bug found while scouting — worth fixing on its own

`REG` and the dispatch tables are plain object literals read with bare bracket access. Verified by
running the lookup: `FM.fxRegistry.get('toString')` returns `Object.prototype.toString` — truthy, a
function. `POSTFX['toString']` is truthy too. `supportsLayer` passes it, and the inspector's expanded
branch then does `reg.params.forEach` on a function → `TypeError`, **killing the effects panel**.

Reachable today because `layer.effects` is the one major layer sub-structure with **no import
sanitisation at all** (`sanitizeImportedLayers` rebuilds audioFx, behaviors, masks, trimPath, repeater
and camera from their schemas — and never touches effects). The autosave load path sanitises nothing.

Fix: `Object.create(null)` for the registries plus own-property guards on the lookups, and a
`sanitizeEffects()` modelled on the existing `sanitizeAudioFx` — whitelist type by own-property lookup,
rebuild params from the schema with clamps, cap child count, forbid container-in-container in data.

---

## Corrections to the above, found while building step 1 (v7.38)

Five read-only agents re-checked every claim in this file against the code. The decisions all survive;
several of the *facts* underneath them did not. Recorded here rather than quietly edited, because two of
them would have sent steps 3–5 down the wrong road.

- **§2's precedent is the wrong one, and its zero is backwards.** Group units do **not** cross-fade.
  `buildGroupUnit` rasterises members into a plate and `drawLayer` blits it at `globalAlpha = opacity`
  **over the scene below** — there is no untouched copy of its own input underneath, so at alpha 0 a
  group *vanishes*. A filter at strength 0 must show the **unfiltered layer**. Copying group units gives
  the wrong zero. The real precedent is `CANVAS_FX.liquidglass` (`js/compositor.js:5892-5895`) —
  `B.drawImage(A,0,0); B.globalAlpha = amt; B.drawImage(_gA,0,0);` — with its true no-op early-out at
  `:5830`, `if (amt <= 0) { B.drawImage(A, 0, 0); return; }`. **Copy liquidglass, not group units.**
- **§1's "twenty-four kernels" is the right count of the wrong thing.** Only **20** depend on `fx`
  object identity; they come in two shapes, the literal `filter(e => e !== fx)` (13 sites) and an
  fx-optional ternary (7). The other 4 filter a **different layer's** effects **by type** — Luma Matte,
  Compound Blur, Match Grade, Displacement Map. Those 4 are a *separate* hazard: they look one level
  deep, so they would miss a Displacement Map nested inside a filter.
- **§4's "seven places" is a large undercount — there are ~110 `.effects` accesses.** The table lists
  the seven that need the walker, and three of its line numbers point at comments rather than code
  (`app.js:1845`/`:1949` are prose; the real remaps are `app.js:2040` and `:2147`. `scene.js:336` is
  `const out = []`; the walk is `:351`). Omitted entirely: the whole compositor render path (~45 sites,
  none recursing), the inspector's effect-stack UI (~25, index-based), `fx-browser.js:78-81`,
  `ai-ops.js:321/342`, `touchup-tool.js:68`, and three registry-type filters
  (`inspector.js:252/1531/3495`) that would **silently delete a container and all its children**.
- **§5 is not one grammar, it is three.** `'effect.<i>.<key>'` (timeline), `'fx:<i>:<key>'`
  (audio-react), and `'effect:<i>:<key>'` (ai-ops, arriving from the model and never built locally).
  All three index `layer.effects` one level deep. On the upside `FM.kfClipboard` is memory-only, so
  widening the first needs no data migration.
- **§1's memory figure is half the real one.** `drawPixelEffect` allocates **two** canvases per depth
  level, so a 1080×1920 pair is ~16.6MB, not ~8MB. And "no depth counter is capped" is nearly right:
  eleven are uncapped, but `_dspLvl > 6` and `_dispDepth < 3` **are** capped — those two are the house
  pattern to copy when capping nesting.
- **§7's live bug was already fixed** — `REG` has been `Object.create(null)` since v6.74, and
  `supportsLayer` gained a `typeof` guard in the same commit. The inspector degrades rather than throws.
  What was *still* open is now closed in v7.38: six more tables (§ below) and the missing input
  validation.

**Step 1 shipped in v7.38** and went wider than this file scoped it. Ten type-keyed tables are now
prototype-free and enumerated in `FM._FX_TABLES` so the suite walks the whole set; the effects browser's
localStorage-keyed `PSEUDO`/`PSEUDO_TILES` are closed (that was the one path still *throwing*); and
`sanitizeEffects()` runs on both the import and the autosave-load path — which is also the project
open/switch path, since `projects.open()` calls `FM.storage.load()`.

**Still open after step 1, and worth doing before step 3:** `sanitizeImportedLayers` has exactly one
caller, so template insert, element insert, project duplicate, layer paste and undo/redo restore all
still bypass every sanitiser; and three localStorage-backed routes write straight into `layer.effects`
with type-only filtering — `FM.fxClipboard` (`fm.fxclip`), `FM.fxPresets` (`fm.fxpresets`) and
`FM.layerPresets` (`fm.layerpresets`). A filter container arriving through any of those gets no
validation at all. Logged as REQUESTS #217 and #218.

## Build order

Each step is shippable and verifiable on its own. Steps 1–2 are worth doing even if filters were
cancelled tomorrow, which is why they go first.

1. **Harden the registries** — `Object.create(null)`, own-property guards, `sanitizeEffects()` on the
   import and autosave paths. Fixes the live panel-crash path above.
2. **`FM.eachFx` + the widened address grammar** — route all seven one-level walkers through it. No
   filters exist yet, so the assertion is that everything behaves byte-identically.
   **SHIPPED v7.39.** `FM.eachFx` / `FM.isFxContainer` / `FM.fxAt` / `FM.fxAddr` / `FM.fxAddrParse` live in
   `js/scene.js`; the container is `{ type: FM.FX_CONTAINER, enabled, params, effects: [] }` and depth is
   capped at 1 by the walker itself (a child is never descended into) as well as in `sanitizeEffects`.
   All three grammars share `fxAddrParse`, which consumes leading integers but never the last segment,
   so a param key that is itself a number stays a key. Routed: `animatedProps`, `deleteKeyframesAt`,
   `propKey`, `resolveSlot`, audio-react's parser + option builder, ai-ops' path parser, and all three
   layer-id remaps (`app.js` duplicate + paste, `storage.js` reIdLayers). Seven mutation checks.
3. **The container type + strength cross-fade** in the compositor. Assert: no-filter projects
   byte-identical; strength 1 identical to the children applied directly; strength 0 a true no-op.
   **SHIPPED v7.40.** `drawFilterContainer` (js/compositor.js, next to drawPixelEffect, whose plate
   mechanism it copies). `filter` is a real FM.EFFECTS entry carrying one `strength` param, marked
   `hidden` so `all()`/`byCategory()` keep it out of the effects grid while `get()` still resolves it
   for the load path. Routed via `POSTFX.filter` + a branch in `applyPostFx`. Depth capped at 4
   (`FC_MAX_DEPTH`), unlike the older pools.
   Both ends skip the plates entirely — strength 0 draws the layer with the filter absent, strength 1
   draws it with the children spliced in where the filter stood — so they are byte-identical rather
   than merely close. The mix is `A` at `1-s` then `B` at `s` with **`lighter`**, which adds
   premultiplied values and so gives a true `A*(1-s)+B*s` in colour AND alpha. Mutating it back to the
   liquidglass `source-over` shortcut turns the halfway test red, which is the measurement that the
   §2 correction was worth making.
   Two mutants came back GREEN and were *equivalent*, not dead tests: the strength-0 early-out (the
   lerp already returns exactly A at s=0) and the child `enabled` filter (drawLayer's stack loop
   already drops disabled effects). The second is kept as a perf short-circuit for the all-children-off
   case and the comment says so rather than claiming a guard it does not provide.
4. **The inspector row** — expandable, children scoped to their own stack descriptor, accordion scoped
   to siblings-at-depth, reorder as one unit in v1.
   **SHIPPED v7.41.** `fxRow` gained a 4th `stack` param, the same descriptor shape `AFX_STACK`
   already used for audio — so `listOf()`/`after` drive the accordion, the delete, the grip test and
   `attachFxGestures`. Children get `{ list: () => fx.effects, after: afterFx }`. `fxBrowser.open`
   takes `{ into: fx }` and re-checks the container is still in the live stack at add time (an undo
   between open and pick can remove it). Creation is a plain `+ Add Filter` button rather than a
   "group the effects you already have" action — there is no multi-select in this stack, so the only
   unambiguous meaning of that would be "all of them".
   **The bug worth remembering:** `.fx-row.fx-open .fx-disc { rotate(90deg) }` is a DESCENDANT
   selector, and a filter's children live inside the open filter's DOM — so three closed effects all
   rendered the open chevron. Every DOM assertion was green (aria-expanded correct, no bodies); only
   the 380px screenshot showed it. Now scoped with `>` and asserted on the computed transform.
5. **The third browser tab** + `fxModeToggle`'s third entry with its own wording and gate, and its own
   thumbnail path (the per-effect tuners assume `hero.effects[0]` **is** the effect — ~60 callbacks).
   **SHIPPED v7.46, minus thumbnails.** `fxModeToggle` gained `['filters', 'Filters', okFilters]`, gated
   on the VISUAL side (a filter is a group of visual effects) plus a non-empty library; `fxTabFor`
   widened to match. `filtersSection(layer)` is a sectioned browse LIST — name, description, and the
   registry labels of what the look contains, which is the thing a thumbnail could not tell you and
   which matters here because the whole promise is that a filter is not a black box.
   **Thumbnails are NOT done and are REQUESTS #219.** `FM.fxThumbs.mountPreset` cannot be reused:
   `preset.fx` is a single effect TYPE string (`fx-thumbs.js:908` → `FM.fxRegistry.get(preset.fx)`), so
   filters need their own recipe branch keyed `f:<filterId>` with `hero.effects = [makeInstance(id)]`.
   Easier than an effect tile in one respect — the authored params ARE the look, so none of the ~60
   tuner callbacks apply. Static, not animated.
6. **The library itself**, authored against the ordering rule in §6.

Nothing in 3–6 is safe to start before 1–2 land.
