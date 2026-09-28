# FreeMotion's project / scene data model, read for a "simple mode"

Research note for step 1 of the simple-mode design (see `../STATUS.md`). Read-only: nothing in the repo was
changed. Read against HEAD `2d06a3f5` (v17.11), 28 Sep 2026. Every claim cites `file:line`. Where something
was inferred from reading and not run, it says **unverified**.

---

## 0. The short version

- **A project is one plain-JSON object, `FM.scene = { project, layers, selectedId, selectedIds }`.** The
  `layers` array is the whole document. There are no tracks, no sequences and no clip containers. Each layer
  is a free clip with its own `start` and `duration` in project seconds (`js/scene.js:655-662`,
  `js/scene.js:681-749`).
- **The array order is the z-order, and index 0 is the top.** The compositor draws from the last index to the
  first (`js/compositor.js:16167`). The timeline draws one row per layer in array order
  (`js/timeline.js:1-3`, `js/timeline.js:3484-3504`). Time position and stacking position are independent.
- **Keyframe times are absolute project time.** Caption cues, text in/out animation, fades and the effect
  phase clock are clip-local. So moving a clip means rewriting its keyframes as well (`FM.shiftLayerKeyframes`,
  `js/scene.js:377-380`). That is the biggest cost of a magnetic "ripple" main track.
- **There is no scene versioning**, and the code says so (`js/storage.js:1411`). The `version: 1` in
  `newScene` is never saved, and the file's `v: 1` is never read. **Unknown top-level layer and project keys
  survive** every path: load, import, undo, templates, elements, duplicate, split and collab. Unknown keys
  inside effects, audio effects, behaviours, masks, camera options, trim path and repeater are **dropped**,
  because those parts are rebuilt from a schema. Keys that start with `_` are dropped everywhere.
- **Nothing like a track exists today.** There is no ripple, no gap-closing, no lanes and no sequencing
  helper. The "magnet" in the UI is only the snapping toggle. The nearest relatives are these: groups (a span
  plus `parent` links, which the timeline can collapse into one row), a caption track (one text layer holding
  many timed cues), `splitOf` (the family link shared by the two halves of a split), and the insert-at-playhead
  clamp that butts a new import onto the end.
- **A simple-mode main track *can* be optional metadata on existing layers.** Complex mode and old projects
  would ignore it, and it would survive storage and collab untouched, if it follows four rules:
  1. It is top-level, plain JSON, with a name that does not start with `_`.
  2. It never stores another layer's id. Id references need hand-written remapping in at least four places.
  3. The editor mode each person sees is per-device, not in the document. The document syncs to everyone.
  4. Ripple is an explicit edit, not a collab "derived write". A derived write would force magnetism on the
     complex-mode user.

  §13 covers the risks: keyframe arrays are atomic in collab, and the per-person undo can apply partly.

---

## 1. Where the model lives

| Concern | File |
|---|---|
| Scene factory, layer factory, keyframe maths, time maths, split lineage, parent repair | `js/scene.js` |
| Project creation, one insert point, auto project length, split, duplicate, group, reorder, import | `js/app.js` |
| Autosave format, load, import, project files, sanitisers, templates, elements, backup | `js/storage.js` |
| Undo and redo (snapshot stack) | `js/history.js` |
| Rendering order, groups as units, adjustment layers, camera, blend modes | `js/compositor.js` |
| Timeline rows, drag, trim, snapping, collapse | `js/timeline.js` |
| Caption cue model | `js/captions.js` |
| Live collaboration document rules (paths, keyed and atomic arrays, ops, derived writes) | `js/collab-path.js`, `js/collab-diff.js`, `js/collab-bridge.js`, `js/collab-core.js`, `js/collab-session.js` |

Media (the video and image files) is **not in the scene**. It lives in a runtime registry, `FM.media`, keyed
by layer id, and in IndexedDB under the same id (`js/storage.js:1-3`, `js/scene.js:1-5`). A clip's **source
length is only in that media record** (`m.duration`). It is not stored on the layer (`js/timeline.js:2330`,
`js/inspector.js:5808-5812`).

---

## 2. `FM.scene`

Created at boot as `FM.scene = FM.newScene()` (`js/app.js:6`):

```js
{ project: { name:'Untitled', width:1080, height:1920, fps:30, duration:0, background:'#000000' },
  layers: [], selectedId: null, version: 1 }                                  // js/scene.js:655-662
```

- **What is saved:** `sceneDoc()` writes `{project, layers, selectedId, selectedIds}` (`js/storage.js:155-157`).
  **`version` is not saved and nothing reads it** (a grep for `.version` finds no reader of the scene field).
- **`selectedIds`** (a multi-selection) is set by the app and saved with the document (`js/storage.js:153-157`,
  `js/storage.js:910-913`).
- **Runtime-only state** uses keys that start with `_` (`_bgSnap`, `_expanded`, `_clipStart` and others).
  `FM.jsonReplacer` drops them on every save, clone and undo snapshot (`js/scene.js:757`). The codebase has been
  caught out by this once: `_fromPreset` had to be renamed `fromPreset` so it would persist
  (`js/inspector.js:606-612`).
- **Collab's document** is only `{project, layers}`. The path roots are `P` and `L` (`js/collab-path.js:66-83`),
  so selection is per device.

---

## 3. Layers

### 3.1 Fields every layer gets from `makeLayer` (`js/scene.js:681-749`)

| Field | Meaning |
|---|---|
| `id` | `layer_…` from `uid()`. It has a random suffix so ids are unique across projects, because media is keyed by it (`js/scene.js:12-19`). |
| `type` | `video` \| `image` \| `text` \| `shape` \| `group` \| `null` \| `camera` \| `adjustment` (see 3.2) |
| `name`, `visible`, `locked`, `clipColor` | Row label, eye, lock, bar colour |
| `blendMode` | `'normal'` by default. The table is at `js/compositor.js:23-46`, and also includes `mask-include` and `mask-exclude` (clipping masks, `js/compositor.js:42-43`). |
| `start`, `duration` | Placement in project seconds. `start` can be **negative**: a clip can be dragged past 0 (`js/timeline.js:4109-4110`), and the sanitiser keeps the value (`js/storage.js:1565-1580`). |
| `trimStart` | **Source in-point** in source seconds (see §6) |
| `reversed`, `speed`, `frameBlend` | Playback. `speed` is a number **or a keyframed prop** (a speed ramp). |
| `volume`, `fadeIn`, `fadeOut` | Audio. `volume` can be keyframed. Fades are **audio only** (`js/audio-play.js:126-155`). |
| `effects: []` | Visual effect stack (§5) |
| `wiggle` | `{enabled, amp, freq}`, a procedural jitter |
| `parent`, `parentMode`, `parentWeight` | Transform parenting (AM style), which also carries **group membership** (§3.3) |
| `transform` | `{x, y, scale, rotation, opacity, anchorX, anchorY}`. Optional extras read by the renderer: `scaleX`, `scaleY`, `skewX`, `skewY`, `z` (`js/compositor.js:12738-12790`). |

Other plain fields, added by features rather than the factory: `muted`, `solo`, `collapsed` (a group row),
`flipH`, `flipV`, `crop{x,y,w,h}`, `shadow{…}`, `colorGrade{…}`, `fill`, `fillMode`, `fillOpacity`, `fillImage`,
`fillImgX`, `fillImgY`, `fillGradient{…}`, `stroke{…,dash}`, `trimPath{…}`, `repeater{…}`, `masks[]`, the legacy
`mask{…}`, `audioFx[]`, `behaviors[]`, `labelColor`, `clipColorSet`, `loopMode`, `fxTimeOffset`, `splitOf`,
`mediaRev`, `audioOnly`, `karaokeOf`, `fromPreset`, `pivot` (a group), `maskGroup` (a group). This list comes from a
tally of `layer.*` reads across `compositor/inspector/app/timeline/exporter/audio-play`.

### 3.2 Per type

| Type | Created by | Type-specific fields and notes |
|---|---|---|
| `video` | `FM.addMediaLayer` (`js/app.js:2972`) | Media in `FM.media`. **Audio is also `video`**: songs, SFX and voice recordings all come in through `loadVideoFile` and `addMediaLayer` (`js/app.js:5456`, `js/sfx.js:684`, `js/voice-rec.js:750`). "Audio only" is derived, not stored: the media is 0×0 (`js/inspector.js:3614-3617`), or `audioOnly: true` is set on an Extract Audio twin (`js/app.js:1028`, `js/audio-react.js:410-414`). |
| `image` | `FM.addMediaLayer` | Stills get their length from Settings (`FM.defaultLayerDuration`, `js/app.js:2736-2739`). |
| `text` | `FM.addTextLayer` (`js/app.js:3072`) | `text, fontSize, color, fontFamily, align, bold, italic, letterSpacing, lineHeight, wrapWidth, stroke, textAnim{preset,unit,durIn,durOut,stagger}` (`js/scene.js:720-733`). Also `textCurve`, `subStyles`, `captionBg`. |
| caption track | `FM.addCaptionLayer` (`js/app.js:3418-3430`) | **A `text` layer with `captions: [{start, end, text, effects?, animFrom?, animTo?}]`** and an empty `text`. It is not its own type (`js/captions.js:1-16`, `js/captions.js:31-33`). Cue times are **layer-local** (`js/captions.js:35-37`). Cues can overlap, and overlapping cues are stacked (`js/scene.js:1162-1171`). |
| `shape` | `js/app.js:3148`, `js/app.js:3318`, the drawing tool | `shape` (rect/ellipse/line/polygon/path…), `shapeW, shapeH, fill, stroke, cornerRadius, sides` (`js/scene.js:734-747`). Paths use `points` or `subs` and `closed`. On an open path, `trimStart`/`trimEnd` mean draw-on (0..1), **not** source trim (`js/scene.js:573-586`). |
| `group` | `FM.groupSelection` (`js/app.js:3897-3951`), `FM.addEmptyGroup` (`js/app.js:3737-3742`) | `collapsed`, `maskGroup`, `pivot`. Members point at it through `parent`. Span = the members' span when it is created (`js/app.js:3937-3951`), refitted only after re-times (`FM.refitGroupsFor`, `js/app.js:830-850`). |
| `null` | `FM.addNullLayer` (`js/app.js:3097`) | Draws nothing; a transform controller for its children |
| `camera` | `FM.addCameraLayer` (`js/app.js:3395-3404`) | One per scene (refused at `js/app.js:3397`, filtered on element insert at `js/storage.js:3616`). `fov`, `focus{}`, `fog{}` (`js/storage.js:1337-1350`). Never drawn. The **first visible camera** drives the composite (`js/compositor.js:15831-15833`). It does not count towards project length, and one that starts at 0 is stretched to it (`js/app.js:852-870`). |
| `adjustment` | `FM.addAdjustmentLayer` (`js/app.js:3406-3416`) | Its effects grade **everything below it in the array** (`applyAdjustment` on the target drawn so far, `js/compositor.js:16175`, `js/compositor.js:15380`) |

**Templates and elements are not layer types.** Both are **packs**: `{layers, media}`, and a template also
carries `project`, while an element carries a `canvas` size (`js/storage.js:3000-3055`). Inserting one re-ids
every layer, moves it to the playhead with its keyframes, and puts it into the array: an element goes on top
(`js/storage.js:3608-3625`), and a template's insert is at `js/storage.js:3333-3345`. After that they are
ordinary layers with no link back to where they came from.

### 3.3 Parents, children and groups

- `parent` is **one field with two meanings**. It is transform inheritance (any layer can parent to any layer,
  AM style), and when the parent is `type:'group'` it is also group membership. Only group ancestors hide their
  members (`FM.isLayerVisibleAt`, `js/scene.js:1127-1139`).
- **Membership is the link, not the position in the array.** The code states it outright: *"the array order is
  Z-ORDER, and group membership is the `parent` link — not the position"* (`js/scene.js:911`). Members can be
  scattered, and `FM.normalizeGroupOrder` deliberately repairs only duplicate ids (`js/scene.js:891-938`).
- A group with anything visual of its own (effects, opacity, blend, mask group, shadow and so on) is
  composited as **one flattened unit**, drawn at the z-slot of its bottom-most member
  (`js/compositor.js:15611-15690`).
- Parent cycles are cut on load and import (`FM.repairParentCycles`, `js/scene.js:867-889`).
- **Unverified:** as read, a group's own `start`/`duration` does **not** limit when its members render.
  `isLayerVisibleAt` checks only a group ancestor's `visible`, and a flattened unit's proxy uses a synthetic
  start (`js/compositor.js:2356`).
- **Cross-layer id references** in the document: `parent`, `splitOf`, `karaokeOf`, `behaviors[].params.targetId`
  and `.sourceId`, and effect `params.source` for "layer" parameters (Luma Matte and similar). Each one is
  remapped **by hand** in `reIdLayers` (`js/storage.js:2044-2080`) and in duplicate and paste
  (`js/app.js:4313-4360`, `js/app.js:4296`, `js/app.js:4515`).

---

## 4. Animatable properties and keyframes

- A property is either a plain value or `{kf:[…], loopMode?}` (`js/scene.js:23-26`, `js/scene.js:43`).
- A keyframe is `{t, v, e, bez?, ez?, to?, ti?, split?}`:
  - `t` is in **absolute project seconds** (`js/scene.js:373-376`).
  - `v` is a number, a `#rrggbb` colour (interpolated channel by channel), or an array (mask path, point set).
  - `e` is the name of the easing *into* this keyframe.
  - `bez` is a custom cubic curve, and `ez` a parameterised ease such as bounce or steps.
  - `to`/`ti` are motion-path tangents.
  - `split:1` marks the seam keyframe a split adds.
  Sources: `js/scene.js:72-131`, `js/app.js:5002-5021`.
- `loopMode` (`cycle`/`pingpong`) is per property; `layer.loopMode` fills it in as a derived write
  (`js/timeline.js:620-628`).
- Keyframe writes snap to the frame grid, and "the same keyframe" means within half a frame
  (`js/scene.js:287-318`).
- **`FM.animatedProps(layer)` lists every keyframed container on a layer** (`js/scene.js:560-600`): transform,
  volume, speed, fill and colour, gradient centre, media-fill pan, stroke, crop, shadow, trim path, draw-on,
  dash, repeater, mask paths, point sets, effect parameters (including a filter's children) and audio-effect
  parameters. Moving a clip calls `shiftLayerKeyframes` over this list (`js/scene.js:377-380`), and a speed
  change calls `scaleLayerKeyframes`, which leaves the speed ramp itself alone (`js/scene.js:405-414`).

---

## 5. Effects, audio effects, behaviours, masks, blend

- **`layer.effects`** is a flat array of `{type, enabled, params:{key: number|kf-prop|string|bool}, uid?}`. One
  kind of entry, the **filter container** (`type:'filter'`), holds `effects:[…]` one level deep, plus a `name`.
  A **pen-mask marker** is `{type:'penmask', maskId, uid?}`. There is one stack walker, `FM.eachFx`
  (`js/scene.js:468-482`). Caption cues can carry their own stacks, and `FM.eachRefFx` walks those too
  (`js/scene.js:501-516`).
- **`layer.audioFx`** has the shape `{type, enabled, params, uid?}` (`js/storage.js:1167-1188`).
- **`layer.behaviors`** has the shape `{type, prop, enabled, params, uid?}` and modifies `x/y/scale/rotation/opacity`
  every frame (`js/storage.js:1233-1268`, `js/compositor.js:12742-12746`). Its time basis is **unverified**.
- **`layer.masks`** has the shape `{id, enabled, mode:add|subtract|intersect, feather, opacity, invert, closed, path}`.
  The path is static points or keyframed points, in **canvas space** (`js/storage.js:1312-1332`). The legacy
  single `layer.mask` still renders (`js/compositor.js:2782-2837`).
- **Order-dependent pixels:** clipping masks (`blendMode` `mask-include`/`mask-exclude` act on everything drawn
  below, `js/app.js:1057-1060`), adjustment layers, Copy Background, and Fill Behind
  (`js/compositor.js:14440-14456`, `js/compositor.js:16143-16165`) all depend on the array order.

---

## 6. How time works for a clip

**Placement:** a clip is on screen for `start ≤ t < start + duration` (`js/scene.js:1128`).

**Source mapping:** `FM.layerLocalTime` (`js/scene.js:1068-1080`):

```
into = t - start
flat speed:  src = trimStart + (reversed ? duration*speed - into*speed : into*speed)
ramped:      src = trimStart + (reversed ? total - adv(into) : adv(into)),   adv = ∫ speed over [start, start+into]
```

- **Source in-point = `trimStart`.** There is **no stored out-point**. The out-point is derived as
  `trimStart + (source advanced over duration)`. The only thing that knows how much source is left is the
  media record (`js/timeline.js:3906`, `FM.maxDurForSource` at `js/scene.js:1000-1018`).
- A **head trim** moves `start` up, shortens `duration` and advances `trimStart` through the speed curve, so the
  picture stays put in project time (`js/timeline.js:3929-3960`). Keyframes are not touched, because they are
  absolute. A **tail trim** changes only `duration`.
- A **speed change** keeps the amount of source used, changes `duration`, and scales the clip's keyframes about
  its start (`js/inspector.js:5855-5880`).
- A **split** does these things (`js/app.js:4855-5046`):
  - It makes B a plain clone, sets `start = t`, and advances `trimStart` through the ramp.
  - It divides fades, text animation and caption cues between the halves.
  - It carries the effect-phase clock across with `fxTimeOffset`.
  - It stamps both halves with the same `splitOf`.
  - It cuts every keyframed property at the playhead and gives each half an exactly divided ease curve.
  - It **inserts B at `idx + 1`**, so the second half lands on **its own new row, just below A**.

**Which clocks are absolute and which are clip-local.** This table decides what a ripple has to rewrite.

| Thing | Clock | Moves with the clip automatically? |
|---|---|---|
| All keyframes (`animatedProps`), speed-ramp keys, mask-path keys | **absolute** (`js/scene.js:373-376`, `js/scene.js:1027-1029`) | **No.** Needs `shiftLayerKeyframes`. |
| Caption cue `start`/`end` | clip-local (`js/captions.js:35-37`) | Yes |
| Text in/out animation (`textAnim.durIn/durOut`) | anchored to the clip's edges (`js/app.js:4885-4890`) | Yes |
| `fadeIn`/`fadeOut` (audio) | clip-local (`js/scene.js:1107-1113`) | Yes |
| Effect phase (Drift, Shake…) | clip-local via `FM.fxLocalTime` (`js/scene.js:799-805`) | Yes |
| `project.markers[].t`, `loopIn`/`loopOut`, collab comment `t` | absolute | No |

Times are floating-point seconds, not frames. Edits snap edges to the frame grid (`js/timeline.js:3849-3865`).
Anything that asks "do these two clips touch?" needs a tolerance.

---

## 7. Timeline order and render order

- **One array, two readings.** Timeline row *i* is `layers[i]`, drawn top to bottom (`js/timeline.js:3484-3504`).
  The renderer walks `for (i = length-1; i >= 0; i--)`, so **`layers[0]` is drawn last and sits on top**
  (`js/compositor.js:16167`). Row order equals z-order. The horizontal position is time, and it has nothing to
  do with the row.
- **New layers** all go through `FM.insertLayer` (`js/app.js:2880-2890`) at `FM.addAt`, which is the
  add-row marker and defaults to the top. Inside Edit Group a new layer goes in at index 0 and is parented to
  that group.
- **Reorder** is `FM.moveLayers(ids, beforeId)` (`js/app.js:5324-5347`). It is a permutation that never drops a
  layer and commits one undo step.
- **Collapsed groups** hide their members' rows (`js/timeline.js:1269-1273`, `js/timeline.js:3487`). Edit Group
  shows one group's subtree (`js/timeline.js:3486`). On a phone, selecting a layer shows only its row
  (`js/timeline.js:3484-3487`).
- Imports land **at the playhead, capped at the project's end**. That is the one "butt it onto the end"
  behaviour that exists (`js/app.js:2992-2999`).
- Clip drags: the whole selection stops together at one shared floor and ceiling. A clip may not start past
  the project's end as it was when the drag began (`js/timeline.js:4071-4123`). Edges snap to other clips
  (`snapStart`/`snapEdge`), and the "magnet" button only switches snapping on and off
  (`FM.timeline.isSnapping`, `js/timeline.js:4463`). **Clips overlap freely, and nothing ripples.**

---

## 8. Project settings

`project` = `{name, width, height, fps, duration, background, markers?, loopIn?, loopOut?, thumbPinned?, sizePicked?,
notes?, comments?, fromTemplate?, ofTemplate?, ofElement?, returnTo?}` (`js/scene.js:657`, `js/storage.js:1028-1072`,
`js/collab-comments.js:7`, `js/storage.js:3024-3040`).

- **Canvas:** `width` and `height` are clamped to even numbers between 16 and 7680, and `fps` to 1..120, on
  every open and import (`js/storage.js:1004-1018`). The **first import sets the canvas size** unless the size
  was chosen in New project (`sizePicked`, `js/app.js:2982-2991`). `FM.rescaleProjectContents` maps content
  when the size changes (`js/scene.js:1202-1280`).
- **Background:** a colour string, or `null` for transparent (`js/storage.js:1061`).
- **Duration is derived, then stored.** `FM.autoFitDuration` sets `project.duration` to the furthest clip end,
  not counting the camera, rounded to the millisecond (0 when empty). It runs on every `refreshAll`
  (`js/app.js:852-880`), and collab runs it before every diff (`js/collab-bridge.js:131-139`). The value is
  saved, but it is never the source of truth. It is clamped to 3600 s (`js/storage.js:1016`).
- The **project index** (`fm.projects`, one entry per card) holds a copy of name, size, fps and duration, plus
  flags such as `elementDraft` and `templateDraft` (`js/storage.js:2586-2592`). That is the precedent for a
  per-project flag Home can read without opening the document.

---

## 9. Storage: format, version, sanitisers, unknown fields

**Where documents live:**
- `localStorage['fm.proj.<id>']` holds `{"rev":N, project, layers, selectedId, selectedIds}`. `rev` is written
  first. It is a counter that stops one tab overwriting a newer save from another tab (`js/storage.js:50-133`).
  A write that would change nothing is skipped (`js/storage.js:121-125`).
- Media blobs live in IndexedDB `freemotion/media`, keyed by layer id (`js/storage.js:10-14`).
- Autosave is debounced by 600 ms and **only history commits trigger it** (`js/storage.js:867-870`,
  `js/history.js:309`).

**Project file** (`.fmotion.json`): `{app:'freemotion', v:1, project, layers, selectedId, selectedIds, media, fonts, omitted}`
(`js/storage.js:979`). The import check looks at `app`, `project` and `layers`, **but never at `v`**
(`js/storage.js:1969-1976`).

**Versioning:** there is none. The comment in `sanitizeEffects` says so: *"there is NO scene versioning and no
other load-time layer normalisation in this app"* (`js/storage.js:1411`). Migrations are done **in place, by
shape, inside sanitisers**. The one example converts the old `layer.motionBlur` flag into an `objectblur`
effect (`js/storage.js:1426-1441`).

**Which sanitisers run where:**

| Route | Runs |
|---|---|
| **Normal open** (`storage.load`, `js/storage.js:873-920`) | Project clamp, `sanitizeMasks`, `sanitizeEffects` and `sanitizeUnsafeValues` on each layer, then cycle repair. Timing, keyframe, behaviour and audio-effect checks do **not** run here (see the comment at `js/storage.js:893-899`). |
| **Import / template / element / duplicate project** (`reIdLayers` → `sanitizeImportedLayers`, `js/storage.js:2044-2047`, `js/storage.js:1633-1646`) | All of: masks, audio effects, trim path and repeater, behaviours, effects, camera, unsafe values, timing, keyframes |
| **Undo/redo** (`history.restore`, `js/history.js:71`) | `sanitizeImportedLayers` on the whole snapshot |
| **Collab host, on clones** (`js/collab-bridge.js:142-150`) | `sanitizeImportedLayers` per layer, project clamp, cycle repair, duplicate-id repair |

**What happens to fields the sanitisers don't know**. This matters most for simple mode:

| Where the unknown key sits | Fate |
|---|---|
| Top level of a layer (e.g. `layer.foo`) | **Kept** on every route. No sanitiser lists a layer's top-level keys. Copies are JSON clones (`FM.cloneLayer` at `js/scene.js:807`, `reIdLayers` at `js/storage.js:2046`, `packFromProject` at `js/storage.js:3025`). |
| Top level of `project` | **Kept.** `sanitizeProjectFields` only checks the keys it names (`js/storage.js:1028-1072`). But an **element does not carry `project` at all**, and a template drops `notes`, `fromTemplate`, `ofTemplate`, `ofElement` and `returnTo` (`js/storage.js:3024-3047`). |
| Inside `effects[]`, `audioFx[]`, `behaviors[]`, `masks[]`, `trimPath`, `stroke.dash`, `repeater`, camera `focus`/`fog` | **Dropped.** These are rebuilt from the schema, keeping only known keys plus a validated `uid` (`js/storage.js:1150-1165`, `js/storage.js:1500`). |
| Any key that starts with `_` | **Dropped** on save, clone, snapshot and collab (`js/scene.js:757`, `js/collab-path.js:19-22`) |
| Collab: a key that does not match `/^[A-Za-z$][\w$]{0,63}$/`, or `constructor`/`prototype` | Never synced (`js/collab-path.js:22-28`, `js/collab-path.js:158-175`) |

The `whitelist-drift` memory note records four bugs where a field list dropped fields silently. None of the
routes above is a top-level field list, which is why a new top-level key is safe. Anything that rebuilds a
layer from a named list of fields (the look-preset `save`, `js/inspector.js:569-580`) would not carry a new key,
and that is correct for a look preset.

---

## 10. Undo and history

- **Solo:** undo keeps up to 120 **whole-document JSON snapshots** of `{project, layers, selectedId, selectedIds}`,
  byte-capped at 48 MB (`js/history.js:25-29`, `js/history.js:275-306`).
  - Each discrete action calls `FM.history.commit()`. A commit identical to the previous one is dropped.
  - Actions made of several steps use `mute()`/`unmute()` so they commit once (`js/history.js:270-274`).
  - Undo restores the snapshot, re-sanitises it (`js/history.js:64-71`) and autosaves (`js/history.js:325`).
  - Media is not in the snapshot. A layer id keeps its media, and dropped snapshots release media nothing can
    reach any more (`js/history.js:296-306`).
  - Any new metadata is snapshotted, undone and redone for free.
- **In a collab session, undo is per person, not snapshots** (`js/history.js:312-326`). Each person's step is
  a list of path operations with before/after records.
  - An `s`/`d` whose value someone else changed since is **skipped, and the rest applies**.
  - A structural op (insert, remove, move) whose target changed makes the whole step fail with "Can't undo —
    X changed it since" (`js/collab-session.js:1140-1182`, inversion at `js/collab-diff.js:600-625`).

---

## 11. Anything like a "track" today

| Concept | What it is | Useful for a main track? |
|---|---|---|
| Timeline row | One per layer, in z-order (`js/timeline.js:1-3`) | No: rows are layers, not lanes |
| Caption track | One `text` layer holding many timed cues (`js/captions.js:1-16`) | **Yes, as the captions section.** It is already "many clips on one row". |
| Group | A span plus `parent` links, and one collapsible row (`js/app.js:3897-3990`) | Possible way to show the main track in complex mode (§13, option C) |
| `splitOf` | A family link shared by split halves (`js/scene.js:786-797`, `js/app.js:4897`). Renamed per batch on import (`js/storage.js:2052-2057`). | **Pattern to copy**: a shared string that is not an id reference |
| Insert-at-playhead clamp | Import butts onto the project's end (`js/app.js:2992-2999`) | Nearly "append to the end" |
| Snapping | Edges snap to other clips (`js/timeline.js:4135`) | Helps the UI, not the model |
| `autoFitDuration` | Project length = furthest end (`js/app.js:852`) | Already right for a main track |

**Absent:** ripple delete, ripple trim, magnetic insert, close gap, lanes or layer sections, transitions
between clips (no model or renderer support; the only "dissolve" is an effect, `js/compositor.js:556`),
connected or attached clips, and any stored out-point.

---

## 12. Collab facts that limit the design

- The document syncs as **path-level operations** (`s`/`d` on a key, `li`/`lr`/`mv` for layers, and
  `ai`/`ar`/`am` for arrays whose elements have ids) (`js/collab-diff.js:444-583`).
  - Layers are keyed by `id`, and a reorder also sends the resulting absolute order
    (`js/collab-diff.js:352-380`).
  - `effects`, `audioFx` and `behaviors` are keyed by `uid`; masks, notes and comments by `id`
    (`js/collab-path.js:251`).
- **`kf`, `captions`, `markers`, `path`, `subs`, `crop`… are ATOMIC arrays** (`js/collab-path.js:262`): the
  whole array is replaced, so concurrent edits resolve as **last writer wins on the whole array**.
- **Derived writes:** `autoFitDuration`, `inheritLoopModes` and `_fillFxParams` run before every diff on every
  device, and the no-op rule keeps them off the wire (`js/collab-bridge.js:126-139`,
  `js/collab-path.js:175-183`). The schema fingerprint **hashes the derived writers and the sanitiser output**.
  Changing either needs a `SCHEMA_REV` bump, and builds on different revisions refuse to join each other
  (`js/collab-core.js:22-29`, `js/collab-core.js:200-220`, `js/collab-signal.js:1556-1562`).
- Anything written into `project` reaches everyone, including a `collapsed` flag on a group row. The editor
  mode and selection must stay per device.

---

## 13. Assessment: what a simple-mode main track needs, and can it be optional metadata?

### 13.1 What the model lacks

| A CapCut-style main track needs | FreeMotion today | Gap |
|---|---|---|
| **Membership:** which clips are the main track | Nothing | A flag per layer |
| **Order along the track** | Only `start`, sorted | Either use `start` order, or add an explicit order key (below) |
| **Magnetism:** no gaps, no overlaps, each clip starts where the previous one ends | Clips are free and overlap freely | A **ripple operation** that rewrites `start` **and every keyframe time** of each clip after the edit (keyframes are absolute, §6) |
| **Ripple delete, ripple trim, ripple speed change, insert between clips, split in place** | Split exists but puts the second half on a new row. Delete leaves a gap. | Hooks in split, duplicate, delete, trim and speed |
| **Sections:** overlay, text, captions, audio, effects | Rows are layers in z-order | Can be **derived from type** (13.3). A "row inside a section" hint is optional. |
| **Main track under overlays** | The array order decides the stacking | Rule: main-track clips sit below other layers. Clips on the main track never overlap, so their order among themselves changes no pixels, until transitions exist. |
| **Overlays and text that follow a main clip** (FCP connected clips, CapCut's linking) | Nothing links one clip's timing to another's. `parent` only links transforms. | Only if the design wants it. It means an attachment reference, which is an id reference (hazards in 13.4). |
| **Transitions** | None | Model **and** renderer work. The adjacent clips overlap, plus a record describing the transition. Not metadata-only. |
| **Source length for "how far can this extend"** | Held only in the media record, not in the document | Fine for a local editor. A collab guest whose media has not arrived yet cannot compute extend limits (**unverified**: how collab-media exposes duration before transfer). |

### 13.2 Proposed shape. This is input for step 2, not a decision.

**Per layer: one optional, namespaced, top-level object.** Complex mode ignores it; simple mode reads it.

```js
layer.sm = { main: true, ord: 'a0V' }   // on main-track clips only; every other layer has no `sm` at all
// ord: a fractional-index string (sorts between neighbours without renumbering others)
```

- **No layer ids inside it.** `ord` is a sortable string, so there is nothing to remap in the four id-remap
  sites. It follows the `splitOf` precedent, not the `karaokeOf` one.
- **Starts stay stored.** `sm` records intent (membership and order). `start` stays the value the renderer,
  exporter and complex mode read, so **no renderer or export change** is needed for a main track without
  transitions.
- **Project level:** `project.sm = { v: 1 }`. It is a version stamp for this namespace alone, because the app
  has no scene versioning (`js/storage.js:1411`). A future migration would then have something to test. An
  optional `defaultEditor` could sit here if the design wants a project to remember how it opens. The **editor
  a person is using must not live here**, because `project` syncs to everyone (§12).
- **Project index:** a `mode` or `editor` field on the `fm.projects` entry, if Home should badge cards. This
  follows the `elementDraft` precedent at `js/storage.js:2586-2592`.

**Where the metadata survives without new code:** load, import, undo/redo, templates, backups, collab (the key
`sm` and its sub-keys match `KEY_RE`), autosave, and the project file. **Where it needs a line of
simple-mode-aware code** (a hook, not a new mechanism):

| Site | Why |
|---|---|
| `FM.splitLayer` (`js/app.js:4855`) | B is a clone, so it inherits `sm.ord`. It needs an `ord` between A and A's successor. |
| `FM.cloneLayer`, non-plain (`js/scene.js:807`), and `duplicateLayer` (`js/app.js:4313`) | A duplicate made in complex mode would become a **second main clip at the same time**. Decide: strip `sm` (it becomes an overlay copy) or give it the next `ord` and ripple. |
| `FM.extractAudio` (`js/app.js:1008`) | The audio twin is a duplicate and must not be a main clip |
| Paste (`js/app.js:~4296`, `~4515`) and element/template insert (`js/storage.js:3333`, `3608`) | Keep or strip `sm` on foreign layers |
| `FM.groupSelection` (`js/app.js:3897`) | Grouping main clips in complex mode: they leave the main track, or the group becomes the main clip |
| `FM.deleteLayer` (`js/app.js:3677`) | Ripple-close the gap, **only when the delete comes from simple mode** |
| Speed and trim writers (`js/inspector.js:5800-5880`, `js/timeline.js:3840-3960`) | Ripple after a length change, **only in simple mode** |

### 13.3 Sections derived from existing fields (no new data)

| Section | Layer test |
|---|---|
| Main track | `sm.main` |
| Overlay | `video` with a picture, `image`, `shape`, not main |
| Text | `text` without cues |
| Captions | `text` with `captions.length > 0` (`FM.captions.isTrack`, `js/captions.js:31-33`) |
| Audio | `video` with 0×0 media, or `audioOnly` (`js/audio-react.js:410-414`) |
| Effects | `adjustment` |
| No simple equivalent | `group`, `null`, `camera`, and anything with `parent` set. Show as locked "made in the full editor" items, or hide. This is for the design step to decide. |

Rows inside a section can be **packed on the fly in array order** (clips that do not overlap in time share a
row). That keeps the array as the only source of stacking. The cost is that rows can reshuffle as clips move.
An optional `sm.lane` hint would keep them still, but it becomes a second opinion about order that complex mode
can contradict.

### 13.4 Can complex mode and old projects "ignore it"? Yes, with these caveats

1. **Complex mode can break simple mode's rules without knowing.** It can drag a main clip into an overlap,
   reorder it above an overlay, or parent it. Simple mode therefore has to **check the main track when it
   opens a project** (or view), and repair or show the break. It must not assume the chain is intact.
2. **Do not make ripple a collab derived write.** Putting a "re-pack the main track" normaliser in
   `normalizeDerived` would:
   - run on the complex-mode user's device too, snapping their deliberate drags back, which is exactly the
     interference the brief rules out;
   - change the schema fingerprint and force a `SCHEMA_REV` bump (`js/collab-core.js:200-220`).

   The better fit is an **explicit edit** made by the simple-mode device. Its ops go out like any other edit and
   land in that person's own undo step.
3. **Keyframe arrays are atomic in collab.** A ripple that shifts N later clips replaces each one's whole `kf`
   arrays. If a complex-mode user adds a keyframe to one of those clips at the same moment, one of the two
   edits wins the whole array: that keyframe is lost, or the ripple's shift is lost. **This is the biggest risk
   the model poses to "no interference"**, and it goes away only if keyframes become clip-relative, which is a
   breaking model change. Mitigations for the design step:
   - ripple only the clips that actually move;
   - hold the ripple while a peer is touching those layers (the collab "held" machinery);
   - accept last-writer-wins, and show that it happened.
4. **Per-person undo can apply partly.** If a peer changed any moved clip's `start` since, the `s` ops on it
   are skipped and the rest apply (`js/collab-session.js:1147-1153`). The main track could come out gappy or
   overlapping. Simple mode's own check (caveat 1) is the safety net.
5. **Old builds.** The PWA updates itself. A collab peer on an older build would sync `sm` keys faithfully,
   because they are plain keys, but would not enforce any of it.
6. **Mode switching is per person.** The editor being shown must not live in `project`, and neither should
   `collapsed` if the main track is shown as a group (next point).

### 13.5 Three ways to lay out the main track in the data. For step 2 to judge.

- **A. Flag only (`sm.main`), order = sort by `start`.**
  - Least data.
  - Two people reordering at once can cross their starts. A repair can then sort and re-pack, which is
    deterministic and loses no clips, but one person's intended order may be lost.
- **B. Flag plus fractional `ord`** (proposed above).
  - The order is explicit: a reorder writes one `ord` and some starts.
  - Two concurrent inserts do not collide.
  - Split, duplicate and paste need `ord` handling.
- **C. The main track is a `group` layer with a flag (`sm.mainTrack`), and main clips are its children.**
  - Complex mode already shows a group as **one collapsible row** (`js/timeline.js:3487`), keeps its span right
    (`FM.refitGroupsFor`) and can open it with Edit Group.
  - The costs:
    - `parent` then means main-track membership, so a main clip cannot also be parented to a null.
    - Transforming or adding effects to the group flattens the whole track into one unit
      (`js/compositor.js:15611-15622`).
    - `collapsed` is shared in collab.
    - A layer added inside Edit Group becomes a main member automatically (`js/app.js:2880-2890`).
  - It answers "60 main clips = 60 rows in complex mode", which A and B leave open.

**Not verified here (for the other researchers or the design step):**
- whether a group's span should gate its members;
- how behaviours reckon time;
- how collab-media exposes a clip's source length before the file has arrived;
- whether CapCut's own overlays follow a ripple by default (the CapCut researcher's area).
