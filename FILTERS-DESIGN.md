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

## Build order

Each step is shippable and verifiable on its own. Steps 1–2 are worth doing even if filters were
cancelled tomorrow, which is why they go first.

1. **Harden the registries** — `Object.create(null)`, own-property guards, `sanitizeEffects()` on the
   import and autosave paths. Fixes the live panel-crash path above.
2. **`FM.eachFx` + the widened address grammar** — route all seven one-level walkers through it. No
   filters exist yet, so the assertion is that everything behaves byte-identically.
3. **The container type + strength cross-fade** in the compositor. Assert: no-filter projects
   byte-identical; strength 1 identical to the children applied directly; strength 0 a true no-op.
4. **The inspector row** — expandable, children scoped to their own stack descriptor, accordion scoped
   to siblings-at-depth, reorder as one unit in v1.
5. **The third browser tab** + `fxModeToggle`'s third entry with its own wording and gate, and its own
   thumbnail path (the per-effect tuners assume `hero.effects[0]` **is** the effect — ~60 callbacks).
6. **The library itself**, authored against the ordering rule in §6.

Nothing in 3–6 is safe to start before 1–2 land.
