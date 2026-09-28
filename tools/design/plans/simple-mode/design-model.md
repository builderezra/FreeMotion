# Simple mode: the model-first design

Step 2 of `STATUS.md` (design panel), **model-first lens**. Written 29 Sep 2026 against HEAD `2d06a3f5` (v17.11), with
the uncommitted loop edits in the working tree. **Design only. Nothing is built.** His gate stands: *"don't build it until
I say to do it"* (INBOX.md:28).

Built on the six research notes in `research/`. Where this design relies on code it cites `file:line`. Where it relies on
a research claim it names the note (`fm-model §6`, `fm-collab §9.1`, …). **UNVERIFIED** marks anything read but not run.

Working names in this file: **Quick** is the new CapCut/Premiere editor, **Full** is today's editor. They are
placeholders; the real names are decision D1 (§17). In code the new timeline structure is the **spine** (`FM.spine`),
never "magnet" (that already means snapping, `js/timeline.js:4463`) and never "parent" (that means transform parenting,
`js/scene.js:707`).

---

## 0. The whole design in twelve lines

1. **One project, one document, two editors.** Quick is a second *view and command set* over the same `{project, layers}`
   (DaVinci Resolve's Cut/Edit pages), never a second format (Rush → Premiere's one-way, lossy copy).
2. **`start` stays the only stored time.** The renderer, the exporter and the Full editor read exactly what they read today.
3. **Three optional keys on a layer** carry everything Quick needs: `sm.main` (this clip is on the main track), `sm.on`
   (this item follows that main clip, or `'*'` rides the whole track, or `'free'`), and later `trIn` / `clipAnim` (looks).
4. **Main-track order is the order of `start`.** No order list, no fractional index: a Full-editor drag is then always
   a meaningful Quick-editor reorder.
5. **Magnetism is a behaviour of Quick's commands, not of the document.** Every Quick edit is an explicit, one-step,
   undoable "ripple" that shifts `start` **and** the absolute keyframes (`FM.shiftLayerKeyframes`, `js/scene.js:377`) of
   exactly the clips it moves, by exactly the length added or removed.
6. **Attachments follow their clip.** An item's offset is not stored: it is `start − host.start`, so it can never drift.
7. **Any project opens in Quick with no conversion.** A pure classifier works out the main track, overlays, text, captions,
   audio and "made in Full" blocks. Opening writes nothing; the first Quick edit adopts the classification in the same
   undo step.
8. **Full-editor content Quick can't edit renders exactly as it is**, shows as a locked block, and moves as a unit.
9. **The editor you see is per device and never syncs.** Switching sends no collab ops; presence says who is in which.
10. **Collab**: a Quick ripple is one commit, one tx, checked against other people's leases and drags *before* it runs;
    anything the engine still splits shows as a visible gap or overlap chip with a one-tap fix, never lost data.
11. **One undo history** across both editors; the switch is not an undo step.
12. **Six shippable phases**, from invisible plumbing to transitions, each behind the previous one's tests.

---

## 1. The core idea (one paragraph)

FreeMotion keeps its single document: a flat, z-ordered array of free layers, each with its own absolute `start` and
`duration`. Quick is a second editor over that same array. It *reads* the array as CapCut does, as one main track of clips
end to end with overlays, text, captions, effects and audio in sections around it, and it *writes* back through a small set
of commands that keep that reading true: insert, delete, trim, split, reorder and speed all ripple the clips after the edit
point, and everything stuck to a moved clip moves with it. The only new stored facts are which clips form the main track
and which items follow which clip, as optional keys that the Full editor, the renderer, the exporter, old builds and every
storage route already carry untouched. So switching is instant and loses nothing in either direction, a Full project opens
in Quick as it is, and a Quick user and a Full user can share one live project because they are editing the same thing.

---

## 2. The data model

### 2.1 What was weighed

| Option | What is stored | For | Against | Verdict |
|---|---|---|---|---|
| **A. Project-level ordered list** `project.spine = [{id}, …]` (fm-collab §9.4 A) | an id list, keyed in collab | concurrent inserts and reorders compose as keyed-array ops; leases do not bite on `P/…` paths | a **layer-id reference outside the layer**: every re-id route (`reIdLayers` `js/storage.js:2044-2080`, duplicate/paste `js/app.js:4313-4360`) must remap it, and an **element pack carries no `project` at all** (fm-model §9), so a pasted or element-inserted main clip loses its place; dangling ids when Full deletes a clip; needs a `KEYED` entry (`js/collab-path.js:251`) and a hand `SCHEMA_REV` bump | Rejected |
| **B. Per-layer flag + fractional `ord`** (fm-model §13.2) | `sm:{main, ord}` | order explicit, no id refs | **two truths about order** (`ord` and `start`) that the Full editor will contradict every time it drags a main clip; split/duplicate/paste all need `ord` repair | Rejected, but kept the per-layer namespace |
| **C. Main track as a `group`** (fm-model §13.5 C) | a group layer, clips as children | Full already shows it as one collapsible row | `parent` becomes membership, so a main clip can no longer be parented to a null; any group look flattens the whole track into one unit (`js/compositor.js:15611-15622`); `collapsed` is shared in collab | Rejected |
| **D. Derived at view time, nothing stored** (Resolve's Cut page, pro-editors §4) | nothing | tolerant of any Full edit | membership changes silently when a Full user nudges something; a beginner's clip can fall off the track | Used **only** as the fallback when nothing is stored (§5) |
| **E. Derived `start`** from an order list, as a collab derived writer (fm-collab §9.3 b) | order list; `start` computed | concurrent structural edits compose | forces magnetism on the Full user (a drag fights the finger unless every Full drag/trim site learns about it); keyframes are absolute (`js/scene.js:373-376`), so the writer must still shift whole `kf` lists and the keyframe race (fm-collab §9.1 row 2) is **not** fixed; clip-relative keyframes would touch every `evalProp` call (674 in `js/compositor.js` alone, by grep) | Rejected now; kept as the Phase 6 upgrade path (§15) |
| **F. Per-layer flag, order = `start`, magnetism in the commands** | `sm:{main:true}` on main clips, `sm:{on}` on attached items | no id list, no second order truth, no derived writer, no schema-fingerprint change, Full edits stay free and are always meaningful to Quick | concurrent ripples from two devices compose as absolute numbers (fm-collab §9.1 rows 1, 3, 7) | **Chosen.** The collab cost is handled in §10: a pre-flight check stops the common case, and the rare case shows as a visible, one-tap-fixable seam. |

The deciding facts:
- `start` is read by the compositor, exporter, audio, Full timeline, captions, tracker and collab. Keeping it the stored
  truth means **no renderer or export change for the whole main-track feature** (transitions are separate, §12).
- Unknown top-level layer keys and unknown project keys survive load, import, undo, templates, elements, duplicate, split
  and collab (fm-model §9, table "What happens to fields the sanitisers don't know"). A namespaced `sm` object rides every
  route for free.
- DaVinci Resolve is the one working precedent for one project, two editors, and there magnetism is a behaviour of the
  Cut page's commands (pro-editors §4). Final Cut stores attachment as a link with a derived offset (pro-editors §3).
  F takes both.

### 2.2 The stored shapes

**A main-track clip** (a `video` or `image` layer, or a Full-made block, §9):

```json
{ "id": "layer_k3v9q2", "type": "video", "start": 4.0, "duration": 3.2, "trimStart": 1.5,
  "sm": { "main": true } }
```

**An attached item** (overlay, text, sticker/shape, effect segment, sound effect, voiceover):

```json
{ "id": "layer_t0x81m", "type": "text", "start": 5.1, "duration": 2.0,
  "sm": { "on": "layer_k3v9q2" } }
```

**A rider** (moves with every ripple at its own time, cue by cue; the default for a caption track):

```json
{ "id": "layer_cap001", "type": "text", "text": "", "captions": [ { "start": 0.4, "end": 1.9, "text": "hi" } ],
  "sm": { "on": "*" } }
```

**Explicitly free** (stays at its absolute time, the default for music):

```json
{ "id": "layer_song01", "type": "video", "audioOnly": true, "sm": { "on": "free" } }
```

**The project** (a version stamp for this namespace, because the app has none, `js/storage.js:1411`; and the editor the
project was made in, which a device with no memory of it opens first):

```json
{ "project": { "name": "Beach day", "width": 1080, "height": 1920, "fps": 30,
               "sm": { "v": 1, "home": "simple" } } }
```

**Phase 4 looks, stored as ordinary layer fields, NOT under `sm`**, because the renderer and the Full inspector honour
them too (export parity):

```json
{ "trIn":     { "type": "crossfade", "d": 0.5 },
  "clipAnim": { "in":  { "type": "zoom-in", "d": 0.4 },
                "out": { "type": "fade",    "d": 0.3 } } }
```

`trIn` sits on the **incoming** main clip and means "this clip overlaps its predecessor by `d` and they blend". Both are
clip-local clocks, so a ripple never has to touch them (the same reason caption cues and fades already move for free,
fm-model §6 table).

**Rules for the namespace** (each one comes from a real failure recorded in fm-model):

| Rule | Why |
|---|---|
| Top-level key `sm`, plain JSON, no key starts with `_` | `_` keys are dropped on every save, clone, snapshot and sync (`js/scene.js:757`, `js/collab-path.js:19-22`) |
| `sm.main` is `true` or absent | one boolean, nothing to disagree about |
| `sm.on` is a layer id, `'*'`, `'free'`, or absent | absent means "work it out" (§4.3) |
| `sm.on` is the **only** id reference, and it is added to every remap site | `reIdLayers` (`js/storage.js:2044-2080`), duplicate (`js/app.js:4313-4360`), paste (`js/app.js:~4296`, `~4515`); a test enumerates the sites (§14.6) |
| A dangling `sm.on` is tolerated, never pruned | the same stance as a dangling `parent` (`js/scene.js:858-866`): pruning is a write the other person's undo cannot restore (fm-collab §9.4 A) |
| Nothing about **which editor a person is using** goes in the document | `project` syncs to everyone (fm-collab §5); the other person's editor would flip |

### 2.3 What is deliberately NOT stored

| Thing | Where it comes from instead |
|---|---|
| Main-track order | sort main clips by `start`, then by array index (lower in the stack first), then by id |
| An attached item's offset | `item.start − host.start`, computed when needed |
| Which section an item is in | its type (§5.2), exactly the "sections derived from existing fields" table in fm-model §13.3 |
| Which lane inside a section | packed at draw time (§8.4) |
| Gaps and overlaps on the main track | seams between consecutive main clips (§3.1) |
| The editor in use | per device: `localStorage['fm.editor.<projectId>']`, plus `editor` on this device's index card (`js/storage.js:2585`) |

### 2.4 The read model (runtime only, never saved)

`FM.spine.read(scene)` returns a structure every Quick screen and command works from. It is pure, deterministic and
cached against a cheap signature of the layers (count plus a hash of `id/start/duration/sm/parent/type/visible`).

```js
{
  sig: '…',                       // cache key
  adopted: true,                  // true when any layer carries sm.main (§5.3)
  eps: 0.5 / fps,                 // half a frame: "touching" tolerance (fm-model §6: times are float seconds)
  main: [                         // in order
    { id, start, end, len,        // len = duration − (trIn ? trIn.d : 0): what the clip adds to the sequence
      seam: { kind: 'join' | 'gap' | 'overlap' | 'trans', amt } }   // seam BEFORE this clip
  ],
  units: {                        // every top-level unit that is not on the main track
    [id]: { kind: 'overlay' | 'text' | 'captions' | 'audio' | 'effect' | 'block',
            host: '<mainId>' | null,
            how: 'stored' | 'derived' | 'ride' | 'free',
            pro: 'none' | 'look' | 'block' }
  },
  followers: { [mainId]: ['<unitId>', …] },
  riders: ['<unitId>', …],
  lanes: { captions: [[ids]], text: [[ids]], overlay: [[ids]], effect: [[ids]], audio: [[ids]] },
  anomalies: [ { kind: 'gap' | 'overlap' | 'dangling' | 'mainNotEligible', ids, amt } ]
}
```

A **unit** is a top-level layer, or a group together with all its members (members are never shown on their own in Quick,
§9).

---

## 3. Ripple ("magnet") algorithms

### 3.1 Seams and tolerance

Between main clips `a` (earlier) and `b`:

```
expected = b.trIn ? b.trIn.d : 0
diff     = (a.end − b.start) − expected        // positive: they overlap more than intended
seam     = |diff| ≤ eps          → b.trIn ? 'trans' : 'join'
           diff < −eps           → 'gap',     amt = −diff
           diff >  eps           → 'overlap', amt =  diff
first clip: start > eps          → 'gap' from 0
```

Times are float seconds; edits snap to the frame grid (`js/timeline.js:3849-3865`), so half a frame is the right
tolerance and every Quick command rounds its results to the frame grid.

### 3.2 The one primitive: shift a unit

```js
function shiftUnit(u, dt) {                     // u = a layer, or a group plus every descendant
  for (const l of layersOf(u)) {
    l.start = snap(l.start + dt);
    FM.shiftLayerKeyframes(l, dt);               // js/scene.js:377-380 — keyframes are ABSOLUTE project time
  }
}
```

Nothing else about a clip is on the absolute clock (fm-model §6 table): caption cues, text in/out, audio fades, the effect
phase and the Phase 4 looks are all clip-local and move for free. A group's span moves with its members because every
layer in the unit gets the same `dt`, so `FM.refitGroupsFor` (`js/app.js:828`) is not needed.

### 3.3 The one ripple

```js
// Move every main clip that starts at or after T (except `skip`), plus everything that follows those clips,
// by exactly dt. Riders are edited at their own times. Nothing else moves. (The HeyGen rule, pro-editors §1:
// "a ripple moves only the items after the edit, by exactly the length removed" — never re-pack the track.)
function ripplePlan(R, T, dt, skip) {
  const moves = new Map();
  for (const c of R.main) {
    if (skip.has(c.id) || c.start < T - R.eps) continue;
    moves.set(c.id, dt);
    for (const f of R.followers[c.id] || []) moves.set(f, dt);
  }
  const rides = R.riders.map(r => ({ r, op: 'shift', T, dt }));
  return { moves, rides };
}
```

Followers of clips **before** `T` stay, even if they overhang past `T`: they follow their host, not the clock.

### 3.4 Every command, as a plan

Every Quick command is a pure function from `(R, args)` to a **plan** `{ moves, rides, sets, adds, removes, zMoves }`.
One runner (§3.6) checks the plan, applies it and commits once.

**Append clips** (the "+" at the end, the first import of a new Quick project):
```
T = last main end (or 0 when empty)
for each picked file, in pick order: add clip { start: T, sm:{main:true} }; T += clip.len
z: each new clip goes directly above the previous main clip in the array (§3.5)
no ripple
```

**Insert clips at the playhead** (media added from the toolbar):
```
seam = the main seam nearest FM.time (a clip's start or end), or the end when empty
D    = Σ len of the new clips
plan = ripplePlan(R, seam, +D, ∅) + adds at seam
```
Import today stacks at the playhead as a free layer (`js/app.js:2990-3002`); in Quick, `FM.addMediaLayer`'s placement is
replaced by this plan (§14).

**Delete a main clip `c`**:
```
removes = [c.id, ...followers(c)]                  // FCP, LumaFusion, Premiere mobile all agree (pro-editors §3, §5)
rides   = riders: removeSpan(c.start, c.end)       // captions over a deleted clip go with it
plan   += ripplePlan(R, c.end, −c.len, {c})
toast: "Deleted clip and 2 things on it · Undo"
```

**Trim the tail of `c`** to `newDur` (clamped to the source left, `FM.maxDurForSource` `js/scene.js:1000`, and ≥ 1 frame,
and ≥ the next clip's `trIn.d`):
```
dt   = newDur − c.duration
sets = c.duration = newDur
if dt < 0: rides removeSpan(c.start + newDur, c.end)
plan += ripplePlan(R, c.end_old, dt, {c})            // followers of c are anchored to its start: they stay
```

**Trim the head of `c`** by `h` (positive trims in, negative extends back into the source):
```
FM.trimLayerHead(c, h)                               // js/timeline.js:4033: start += h, trimStart advances through
                                                     // the speed ramp, caption cues and the fx clock follow
moves c: −h, followers(c): −h                        // c keeps its slot; its picture (and what is stuck to it) slides left
rides removeSpan(c.start, c.start + h)  (h > 0)
plan += ripplePlan(R, c.end_old, −h, {c})
```
Net effect: `c.start` is unchanged, its keyframes and attachments stay on the same frames of footage, later clips close up.

**Split `c` at the playhead** (reuses `FM.splitLayer`, `js/app.js:4855`, which is async and uses `FM.time`):
```
B = splitLayer(c)                  // B is a plain clone (js/app.js:4866): B.sm.main is already true
delete B.trIn                      // the cut between the halves is a hard cut
delete c.clipAnim.out, B.clipAnim.in
for f of followers(c) with stored on === c.id and f.start ≥ t: f.sm.on = B.id
no ripple
```
Split already divides keyframes, fades, text animation, caption cues and the fx clock, and stamps `splitOf`
(fm-model §6). `splitLayer` inserts B at `idx + 1` (`js/app.js:5029`), below A; that is fine for a hard cut. The spine
lines above belong **inside** `splitLayer` so a Full-editor split keeps attachments right as well.

**Reorder**: move `c` to between `p` and `n`:
```
cues = riders: cutSpan(c.start, c.end)              // keep them to put back
step 1  ripplePlan(R, c.end, −c.len, {c} ∪ followers(c))     // close the hole
step 2  seam' = p.end in post-step-1 positions (or 0 if first)
        ripplePlan(R1, seam', +c.len, {c} ∪ followers(c))    // open the new hole
step 3  move c and followers(c) by seam' − c.start
        riders: pasteSpan(cues, offset = seam' − c.start)
```
Composed from the two primitives, so gaps elsewhere are preserved exactly.

**Speed of `c`** to `sp` (flat speed only in Core):
```
before = c.duration
FM.setClipSpeed(c, sp)               // extracted from js/inspector.js:5850-5880: keeps the source span, clamps
                                     // to the source left, scales c's keyframes about c.start (scaleLayerKeyframes)
ratio  = c.duration / before
for f of followers(c): move f by (c.start + (f.start − c.start)·ratio) − f.start      // stuck to the same frame
rides: scaleSpan(c.start, c.start + before, ratio)
plan += ripplePlan(R, c.start + before, c.duration − before, {c} ∪ followers(c))
```
A clip with a speed **ramp** (`speed` is `{kf}`) shows its ramp as "made in Full" (§9); Quick offers flat speed only.

**Replace** (`FM.replaceMedia`, `js/app.js:4658`): keeps the slot length, like CapCut. If the new media is shorter, the
duration clamps and the difference ripples as a tail trim.

**Duplicate a main clip**: `copy = FM.cloneLayer(c)` (`js/scene.js:807`), `copy.sm = {main:true}`, then insert at `c.end`.
The things stuck to `c` are not copied (CapCut does the same, capcut-mobile §2.1).

**Extract audio** (`FM.extractAudio`, `js/app.js:1007`): the twin gets `sm = {on: c.id}` and never `main`.

**Lift to overlay** ("Move to overlay"):
```
plan  = ripplePlan(R, c.end, −c.len, {c} ∪ followers(c))
after: c.sm = { on: <main clip now under c.start> }; followers(c) re-home to the same clip
zMoves: c goes directly above the top-most main clip (FM.moveLayers, js/app.js:5324)
```

**Drop to main** ("Move to main track") for an overlay `o`:
```
seam = main seam nearest o.start
plan = ripplePlan(R, seam, +o.len, ∅); move o by seam − o.start; o.sm = { main: true }
zMoves: o joins the main block (§3.5)
```

**Close a gap / fix an overlap** (tapping a seam chip, §5.4):
```
gap     at b: ripplePlan(R, b.start, −amt, ∅)
overlap at b: ripplePlan(R, b.start, +amt, ∅)
Tidy all: left to right, one commit
```

**Add a transition** (Phase 4) at the seam before `b`, length `d` (clamped to half of each neighbour):
```
b.trIn = { type, d }; plan = ripplePlan(R, b.start, −d, ∅)      // b and after slide back d to overlap a
remove: b.trIn deleted; ripplePlan(R, b.start, +d, ∅)
```

**Rider span operations** (captions and any `'*'` item):
```
shift(T, dt):          caption track: each cue whose absolute start ≥ T − eps moves by dt;
                       other rider: shiftUnit(r, dt) if r.start ≥ T − eps
removeSpan(a, b):      caption track: drop cues wholly inside [a,b), clip cues that straddle, then shift(b, −(b−a))
cutSpan / pasteSpan:   lift the cues inside [a,b) and put them back at an offset (reorder)
scaleSpan(a, b, k):    cue times inside [a,b) scale about a; the rest shift(b, (b−a)(k−1))
afterwards:            re-base the caption layer so its start/duration cover its cues (cues are layer-local,
                       js/captions.js:35-37)
```
A caption list is one atomic value in collab (`js/collab-path.js:262`), so each rider edit is one whole-list write.

### 3.5 Stacking rules for what Quick adds

The array is z-order, index 0 on top (`js/compositor.js:16167`). Quick keeps a band order when it *adds*, and never
re-sorts what is already there:

```
top    captions  → index 0
       text      → just below the lowest caption track
       overlay   → just below the lowest text item
       effect    → directly above the top-most main clip (an adjustment layer grades everything below it,
                   js/compositor.js:16175, so here it colours the main track only)
       main      → a new main clip goes directly above the main clip it follows in time
bottom audio     → the end of the array (it draws nothing)
```

Main clips never overlap except at transitions, so their order among themselves changes no pixels; "later clip above
earlier" is kept only so a Phase 4 transition has a natural front clip (the renderer does not depend on it, §12.1).

`FM.insertLayer` (`js/app.js:2880-2890`) is "the ONE insert". Quick keeps that promise by setting `FM.addAt` to the band
slot before calling it, rather than adding a second insert.

### 3.6 The runner: one edit, one step

```js
FM.spine.edit = async function (label, makePlan) {
  if (FM.collab && FM.collab.readOnly && FM.collab.readOnly()) return refuse('view');
  const R = FM.spine.read(FM.scene);
  const plan = makePlan(R);
  if (!plan) return;
  const touched = plan.touchedIds();                           // moves ∪ sets ∪ removes ∪ riders
  const locked = touched.filter(id => layer(id).locked);
  if (locked.length) return refuse('locked', locked[0]);        // "“Clip 3” is locked" — never a partial edit
  const b = FM.spine.blockers(touched);                        // §10.3: other people's leases and live drags
  if (b) return refuse('busy', b);                              // "Sam is editing “Title”. Try again in a moment."
  FM.history.mute();                                            // js/history.js:272
  try {
    if (!R.adopted) FM.spine.adopt(R);                          // §5.3: first Quick edit stores the classification
    await apply(plan);                                          // moves → shiftUnit; removes → FM.deleteLayer; …
  } finally { FM.history.unmute(); }
  FM.refreshAll();                                              // js/app.js:878 (autoFitDuration runs first)
  FM.history.commit();                                          // ONE step; ONE collab diff; ONE tx
  FM.spine.say(label, plan);                                    // short toast, with Undo
};
```

`FM.splitLayer`, `FM.deleteLayer` and friends call `FM.history.commit()` themselves (e.g. `js/app.js:5045`); inside
`mute()` those collapse into the runner's single commit.

### 3.7 Invariants the suite asserts (per command, over seeded random spines)

1. No seam changes kind except at the edit point (a gap left elsewhere stays exactly as it was).
2. Every follower's `start − host.start` is unchanged (or scaled by `ratio` for speed).
3. Every moved layer's keyframes moved by the same `dt` as its `start`.
4. Nothing that is `free` moved.
5. Undo restores the document byte for byte (solo).
6. The export frame at every seam matches the preview frame (the exporter and preview share `FM.renderScene`).

---

## 4. Attachments

### 4.1 What follows what

| Added in Quick | Stored as | Behaviour |
|---|---|---|
| Overlay (picture-in-picture), sticker/shape, text | `sm.on = <main clip under the playhead>` | moves, splits and is deleted with its clip |
| Effect segment (adjustment layer) | same | same |
| Sound effect, voiceover | same | same |
| Music | `sm.on = 'free'` | stays at its absolute time: "edit the pictures to the music" (iMovie background music, LumaFusion unlinked track; pro-editors §5) |
| Caption track | `sm.on = '*'` | each cue rides the edit under it; cues over a deleted clip go with it |
| Anything added after the last clip | `'free'` | nothing to follow |

This deliberately beats CapCut's phone app, where nothing follows the main track and text and captions drift out of sync
(capcut-mobile §0 point 2, §13 point 4). Adobe's newest simple editor made the same choice (pro-editors §2).

### 4.2 Why only the host id is stored

Final Cut stores `offset` in the host's time and derives the absolute time (pro-editors §3). FreeMotion already stores the
absolute `start`, so storing an offset too would be a second truth that the Full editor would break the first time it
dragged the item. Instead `offset = start − host.start` is read when needed. A Full-editor drag of an attached item just
changes its offset; nothing has to chase it.

### 4.3 Items with no stored link (Full-made content)

When `sm.on` is absent, Quick works the link out when it needs it, which is what Resolve's Cut page appears to do
(pro-editors §4, marked inference there):

```
host = the main clip containing item.start (± eps)
follow iff host exists AND overlap(item, host) ≥ 50% of item.duration
captions tracks default to '*'; everything else that fails the test is free
```

So a title over clip 3 moves with clip 3; a song or a title across the whole video stays put. The link is **not written**
on open or on adoption: it stays derived, and because a ripple moves an item together with its derived host, the
derivation gives the same answer afterwards. It is written only when a person states it (Pin/Unpin, §4.4) or when Quick
creates the item.

### 4.4 Controls

- **Quick, item selected:** a small link toggle in the item's tool strip, "Follows clip" on / off (writes `sm.on` to the
  host or `'free'`). Long-press drag of an item in Quick keeps it following whatever clip it lands on (re-homes `sm.on`).
- **Full, layer menu** (`FM.layerMenuItems`, `js/app.js:5147`), Phase 3: "Stick to the clip under it" / "Unstick",
  "Make main clip" / "Take off main track". Full users keep every option (#966).
- **Visible link:** in Quick, selecting a main clip underlines everything following it and draws a short tick at each
  connection point (Premiere Rush's yellow line, pro-editors §2).

### 4.5 Edge rules

- An item can follow only a main clip. `sm.on` naming a non-main or missing layer is treated as absent (derived).
- A main clip never follows anything (`sm.on` on a main clip is ignored), so there are no cycles.
- Deleting a host deletes its followers **in Quick**. In Full, `FM.deleteLayer` stays as it is (`js/app.js:3677`): the
  followers survive with a dangling link and simply become derived. Full users are not surprised.
- A split host hands the followers after the cut to the second half (§3.4).
- A follower whose host is trimmed short keeps its time and overhangs; Quick draws the overhang and does not trim it.

---

## 5. Opening any project in Quick, and back (view, not conversion)

### 5.1 The principle

Switching editors is a **view switch** on the same document, never a conversion, in both directions. Every precedent with
two formats converts one way and loses things (Rush → Premiere, Premiere mobile → desktop with a list of lost features,
Final Cut iPad → Mac, iMovie → Final Cut; pro-editors §2, §3, §5). The one two-way precedent, Resolve, has no conversion at
all (pro-editors §4).

- **Full → Quick:** classify (pure), draw. Nothing is written.
- **Quick → Full:** draw the layers. Nothing is written. The `sm` keys are ignored by every Full screen (optional Phase 3
  badges aside).

### 5.2 The classifier

Pure, deterministic, O(n log n). It never writes.

```js
FM.spine.classify = function (scene) {
  const L = scene.layers, fps = scene.project.fps || 30, eps = 0.5 / fps;
  const idx = new Map(L.map((l, i) => [l.id, i]));

  // 1. UNITS — a top-level layer, or a group folded together with all its descendants (membership is the
  //    parent link, not array position: js/scene.js:911).
  const rootOf = l => { let r = l, g; while ((g = byId(r.parent)) && g.type === 'group') r = g; return r; };
  const units = unique(L.map(rootOf));

  // 2. KIND
  const kind = u =>
      u.type === 'camera'                              ? 'hidden'     // never drawn; drives the view (js/compositor.js:15831)
    : u.type === 'group' || u.type === 'null'          ? 'block'
    : /^mask-/.test(u.blendMode || '')                 ? 'block'      // clipping masks act on what is below (js/app.js:1057-1060)
    : u.type === 'adjustment'                          ? 'effect'
    : u.type === 'text'  && u.captions && u.captions.length ? 'captions'   // FM.captions.isTrack, js/captions.js:31-33
    : u.type === 'text'                                ? 'text'
    : u.type === 'shape'                               ? 'overlay'
    : u.type === 'video' && audioOnly(u)               ? 'audio'      // 0×0 media or audioOnly (js/inspector.js:3614-3617)
    : 'visual';                                                        // video with a picture, image

  // 3. MAIN TRACK — stored wins; otherwise derive
  const stored = units.filter(u => u.sm && u.sm.main === true && eligibleMain(u));
  let main;
  if (stored.length) main = stored;
  else {
    const cands = units.filter(u => kind(u) === 'visual' && u.visible !== false && !u.parent
                                  && u.duration > 0 && fillsFrame(u, scene));
    cands.sort((a, b) => idx.get(b.id) - idx.get(a.id));              // bottom of the stack first
    main = [];
    for (const u of cands) if (!main.some(m => overlaps(m, u, eps))) main.push(u);
  }
  main.sort((a, b) => a.start - b.start || idx.get(b.id) - idx.get(a.id) || (a.id < b.id ? -1 : 1));

  // 4. SEAMS (§3.1), 5. HOSTS (§4.3), 6. PRO LEVEL (§9.1), 7. LANES (§8.4)
  …
};

// eligibleMain: a visual clip, or a block whose root carries sm.main (a Full user grouped main clips, §9.3)
// fillsFrame: NOT a picture-in-picture — its drawn box at its start is ≥ 90% of the canvas width OR height, and its
//             centre is within 10% of the canvas centre. Letterboxed footage passes; a shrunk corner clip does not.
//             Uses FM.media dims; with no media record yet (a collab guest still receiving), falls back to
//             transform scale ≥ 0.9 and centred.
// overlaps(a, b, eps): a.start < b.end − eps && b.start < a.end − eps
```

Why "bottom of the stack first": in CapCut the main track is the base picture (capcut-mobile §2.6). A typical Full edit has
a base footage row and things on top; greedy from the bottom picks that base, and the manual cross-fade copies a Full user
puts on the row above become overlays that follow the clip they sit on.

### 5.3 Adoption: the first Quick edit stores what was classified

Until someone edits in Quick, nothing is stored and the classifier re-derives on every draw, so a Full user's changes are
reflected at once. The first Quick **command** (not the switch, not a tap, not a selection) writes `sm: {main: true}` on the
derived main clips, inside that command's single undo step (`FM.spine.adopt`, §3.6). From then on membership is stable:
a Full user adding a full-frame clip does not silently join the main track; it shows as an overlay with a one-tap "Move to
main track".

Adoption writes nothing else: no `sm.on` (links stay derived, §4.3), no moves, no reordering of the array.

### 5.4 What Quick shows that it did not make

| Found | Shown as |
|---|---|
| A gap between main clips (Full left one, or two people edited at once) | a dark striped "gap" chip in the main track, its length on it; tap → **Close gap** |
| An overlap more than the transition expects | a notch on the later clip; tap → **Fix** (slides the rest right) |
| The first clip starting after 0 | a gap chip at the front |
| A first clip with a negative `start` (allowed today, `js/timeline.js:4109-4110`) | drawn from 0, its hidden head shown as a fade on the left edge; untouched |
| Nothing that qualifies as main | an empty main track with "+ Add clips", everything else in its sections |

One **Tidy main track** item in Quick's ⋯ menu closes every gap and overlap left to right in one undo step. There is no
automatic tidying, ever: opening or switching writes nothing (the Full user's deliberate gap is theirs).

### 5.5 "Should a Full project be allowed to become a Quick project?"

His question (INBOX.md:28). The answer this design gives him: **there is nothing to turn.** Every project opens in either
editor at any time. The only permanent change is *choosing* to tidy or to make clips main, and each is one undoable step.
What Quick can't edit renders exactly as it did and shows as a locked block he can open in Full with one tap (§9).

---

## 6. The switch

- **Where:** a small two-segment pill, `Quick | Full`, pinned to the stage's top-left corner on both layouts (the corner
  the PC project name used to float in, `styles.css:6347-6350`, now hidden at `:7937`; fm-ui §7). One tap. Not in the
  phone top bar (it is full; queue 139, fm-ui §7). This is decision D3.
- **State:** `FM.editor.mode` ('simple' | 'full'), mirrored to `body.ed-simple`, the same one-constant pattern as
  `body.white-chrome` (`js/app.js:937`). Remembered per project on this device (`localStorage['fm.editor.<pid>']`) and on
  this device's index card, so Home can badge it.
- **What survives the switch:** the document (nothing is written), the playhead `FM.time`, playing/paused, selection
  (a group member selected in Full maps to its block in Quick; a block selected in Quick maps to the group in Full),
  undo/redo, time zoom (pixels per second is carried across), any open collab session.
- **What closes:** exclusive tools (text editor, mask, crop, points, graph editor). Their state is committed first, exactly
  as a deselect does today.
- **Animation:** each clip box animates from its Full row to its Quick lane (a FLIP morph, ~280 ms); the rows fold into
  sections. Per #974 he can have several switch animations shipped and played at random to choose over time.
- **Refusals:** none. The switch works for a Viewer, mid-collab, mid-playback. It is refused only while an export is
  running.

---

## 7. Starting a project, and choosing the editor

**New project** (`#hm-dialog`, `index.html:711-767`; `createFromDialog`, `js/home.js:2893`):

```
┌──────────────────────────────────────┐
│ New project                          │
│ ┌──────────────┐ ┌─────────────────┐ │
│ │  ▭▭▭▭ ▭▭▭    │ │  ▭  ▭           │ │
│ │  Quick       │ │  Full           │ │    two big picture cards, last choice preselected
│ │  clips in a  │ │  layers         │ │    one plain line under each, no more
│ │  row         │ │  anywhere       │ │
│ └──────────────┘ └─────────────────┘ │
│ Size  [9:16] 16:9  1:1  4:5  …       │    unchanged
│ Name  [Untitled              ]       │
│                      [ Create ]      │
└──────────────────────────────────────┘
```

- **Quick → Create** goes straight to the media picker (multi-select, numbered in pick order), then into Quick with the
  clips appended in that order (§3.4 Append). "From the first clip" is a size choice, like CapCut's Original.
- **Full → Create** is exactly today's flow.
- `FM.projects.create` (`js/storage.js:2540`) gets `opts.home`; it writes `project.sm = {v:1, home}` and `rec.editor` on
  the index entry, the same way it already copies `sizePicked`/`elementDraft` (`:2554-2595`).
- **Home cards** (`projectCard`, `js/home.js:1351`): a small chip beside aspect · res · fps ("Quick" or nothing), and in the
  ⋯ menu "Open in Quick" / "Open in Full".
- **Opening a project** uses, in order: this device's memory for it → `project.sm.home` → Full (old projects).
- **Templates** open in the template's `project.sm.home`; the "Insert your media" sheet (`js/template-fill.js:292`) works
  in both.
- **The empty Quick project** (if the picker is cancelled): the main track is one big "+ Add clips" target with his moving
  colours (#326, #354, #398), "Tap to add your clips" (≤ 34 characters, the existing rule, `js/timeline.js:2795`).

The default card (decision D2) is the last one used; on a fresh install, Quick.

---

## 8. The Quick editor on phone and PC

### 8.1 Where it mounts

A sibling of `#timeline` inside `#timeline-panel` (fm-ui §5 option A): `<div id="sm-timeline">`, shown by `body.ed-simple`.
The stage, canvas handles, transport, fixed-centre playhead line `#tl-centerline` (CSS-pinned at `left: 50vw`,
`index.html:609`), text editor, effects/filters/audio browsers, export and canvas dialog are shared as they are.
`FM.timeline.rebuild()` (`js/timeline.js:5210`) and `updatePlayhead()` (`:5355`) dispatch to `FM.simpleTimeline` while the
class is on, so their 90 callers need no change.

### 8.2 Phone (≤ 700 px), drawn at 380 px

```
┌──────────────────────────────────────┐
│ ‹  Beach day            ?     Export │  #topbar-m, unchanged
├──────────────────────────────────────┤
│ [Quick|Full]                         │  the switch
│                                      │
│              CANVAS                  │  40svh, drag / pinch / rotate on the preview (js/canvas-edit.js)
│                                      │
├──────────────────────────────────────┤
│      ▶  0:03 / 0:15          ↶  ↷    │  transport: the complex-only left cluster hidden
├──────────────────────────────────────┤
│ CC  ▪▪  ▪ ▪▪   │                     │  Captions   ┐ sections in stacking order:
│ Aa     ════════│══                   │  Text       │ higher on screen = in front
│ ◧   ▭▭▭        │                     │  Overlays   ┘ (CapCut hides this; we show it)
│┃[▓▓▓▓▓▓]◇[▓▓▓▓│▓▓▓]◇[▓▓▓▓▓]  [ + ]  │  MAIN: tall filmstrip; ◇ = the transition button at each cut
│ ♪  ~~~~~~~~~~~~│~~~~~~~~~~~~~~~      │  Audio
│                │ ← fixed playhead    │
├──────────────────────────────────────┤
│ Clips  Text  Captions  Overlay  Audio  Effects  Filters  Ratio  Background → │
└──────────────────────────────────────┘
```

- **Sections fold.** Each section with items shows one compact lane; one with more stacked items shows a count and opens
  to all its lanes when tapped, the others folding to thin coloured lines (CapCut's one-category-at-a-time trick,
  capcut-mobile §2.7). Sections with nothing in them are not drawn.
- **Gestures:** tap selects; hold 350 ms and drag reorders a main clip (neighbours open a slot) or moves an item (the same
  hold timing as today, `js/timeline.js:2190-2240`); drag an edge grip to trim (the main track ripples live); pinch to
  zoom; swipe to scrub under the fixed playhead.
- **Bottom toolbar, nothing selected:** Clips · Text · Captions · Overlay · Audio · Effects · Filters · Ratio ·
  Background. It scrolls sideways (the last two are off-screen at 380 px).
- **Something selected:** the strip becomes that item's tools, with a fixed **‹ Done** at the left. CapCut's worst
  beginner trap is tools vanishing while a clip is selected (capcut-mobile §4); **Done** is always visible and tapping
  empty timeline also deselects.
- **Tool panels** open in the existing bottom sheet (`#inspector-panel`, docked by `dockSheet`, `js/mobile.js:271-294`) in
  his small/big two-size style (#927, #975), built from the existing category builders through
  `FM.inspector.openCategory` (`js/inspector.js:6818`).

### 8.3 PC (≥ 701 px)

```
┌─────────────────────────────────────────────────────────────────────┐
│ [Quick|Full]                                                        │
│                               CANVAS                                │
├──────────────────────────┬──────────────────────────────────────────┤
│ Clips                    │ ‹  ▶ 0:03 / 0:15  ↶ ↷           ? ⚙ Export│
│ Text                     │ CC  ▪▪  ▪ ▪▪    │                        │
│ Captions                 │ Aa     ═════════│═══                     │
│ Overlay        (panel    │ ◧   ▭▭▭         │                        │
│ Audio           opens    │┃[▓▓▓▓▓▓]◇[▓▓▓▓▓│▓▓▓]◇[▓▓▓▓▓▓▓] [ + ]    │
│ Effects         here)    │ ♪  ~~~~~~~~~~~~~│~~~~~~~~~~~~~~~~~~      │
│ Filters                  │                 │                        │
│ Ratio · Background       │                                          │
└──────────────────────────┴──────────────────────────────────────────┘
  the inspector band: the same buttons, same order        #timeline-panel → #sm-timeline
```

- **Same model, same buttons, same names, same order** as the phone ("you don't have to learn both", INBOX.md:28). The
  toolbar is a column in the inspector band instead of a strip; a tool's panel opens in the band, as the Add menu does now
  (`js/inspector.js:6904-6919`).
- All sections are open (there is room).
- **Keys** (Premiere-style, and they ripple): Space play · S split · Delete delete-and-close · Q trim start to playhead ·
  W trim end to playhead · ⌘Z / ⌘⇧Z. Files dropped on the main track insert at the seam under the pointer.
- The Full editor's own keys (1–5 Add tabs, Shift+1–4, A/S/D, `js/app.js:8761-8814`) are off in Quick.

### 8.4 Lanes inside a section (view only)

```
items of the section, in array order (front first) → for each, put it in the first lane with no time overlap
(± eps); open a new lane if none fits
```

This keeps the array as the only stacking truth. The cost is that lanes can reshuffle when items move; if that proves
annoying, an optional `sm.row` hint can be added later (fm-model §13.3).

### 8.5 Tools per item

| Selected | Tools (left to right) |
|---|---|
| **Main clip** | Split · Speed · Volume · Delete · Duplicate · Replace · Crop · Filters · Adjust · Animation (Ph.4) · Reverse · Extract audio · Move to overlay · Open in Full |
| **Overlay** | Split · Delete · Duplicate · Speed · Volume · Opacity & blend · Crop · Filters · Adjust · Follows clip · Layer order · Move to main track · Open in Full |
| **Text** | Edit · Style · Animation · Duplicate · Delete · Follows clip |
| **Captions** | Edit lines · Style · Find speech · Delete |
| **Audio** | Volume · Fade · Split · Speed · Sound effects · Follows clip · Delete |
| **Effect segment** | Change · Strength · Delete · Follows clip |
| **Block** (made in Full) | Move · Delete · Duplicate · Open in Full |
| **Transition ◇** (Ph.4) | the transition picker · Length · Apply to all |

### 8.6 Every CapCut feature, mapped

**Core** is in the first Quick release (Phases 2–4). **Later** comes after. **Never** is left out on purpose. "Exists"
names where FreeMotion already has the engine (fm-ui §6, §8).

| CapCut | FreeMotion engine | Quick |
|---|---|---|
| Magnetic main track, append, insert, reorder, delete, trim, split | `FM.splitLayer`, trims, `FM.deleteLayer` + **`FM.spine` (new)** | **Core** |
| Speed (normal) | speed with ramps (`js/inspector.js:5756`) | **Core** (flat); curves **Later** |
| Volume, mute, audio fades | exists | **Core** |
| Duplicate, replace, reverse, extract audio | `js/app.js:4313`, `:4658`, `:5197`, `:1007` | **Core** |
| Crop, rotate, flip | `js/crop-tool.js`, transform, `FM.flipLayer` | **Core** |
| Filters (+ strength, apply to all) | 56 filters, `js/filters.js` | **Core** (a thumbnail strip over the same data) |
| Adjust (one slider panel) | separate colour effects | **Core** (one panel that writes a fixed stack of existing effects) |
| Text, styles, In/Out animation | `js/text-edit.js`, `textAnim` presets | **Core** |
| Captions (type the words, find the speech timing) | caption tracks, `js/captions.js`, `captions-vad.js` | **Core**. Honest label: it finds *when* people speak; you type the words |
| Auto captions that write the words | none (`js/captions-vad.js:4`) | **Later** (needs speech-to-text; "better nothing than a bad version", #152) |
| Overlay (picture-in-picture), blend, opacity | the core model | **Core** |
| Move main ↔ overlay | **new** (§3.4) | **Core**, as one visible button each way (CapCut buries it) |
| Audio: import, record voice, sound effects | `js/voice-rec.js`, `js/sfx.js` | **Core** |
| Effects | ~188 types, `js/fx-browser.js` | **Core**, with the 3D category hidden in Quick |
| Ratio, background colour | canvas dialog (`js/app.js:8319`) | **Core** |
| Export | `js/exporter.js` | **Core**, unchanged |
| Undo / redo | `js/history.js` | **Core** |
| Transitions at each cut | **none** | **Core, Phase 4** (model + renderer, §12.1) |
| Clip In/Out/Combo animations for video and photos | **none** (text only) | **Core, Phase 4** (clip-local, §12.1) |
| Templates (fill your clips in) | `js/template-fill.js` | **Core** entry from the Quick start flow |
| Freeze frame | none | **Later** (a held still inserted on the main track) |
| Keyframe diamond | full keyframes exist | **Later** (one "animate this" diamond; everything deeper stays in Full) |
| Mask, chroma key | exist | **Later** in Quick (Pro-ish in CapCut too); always in Full |
| Stickers, text templates, music library | user-made elements and templates only | **Later** (needs shipped content) |
| Background blur or image behind the frame | per-layer "Fill Behind" only | **Later** |
| Beat markers | audio-react follows loudness only | **Later** |
| Stabilise, remove background, noise reduction, retouch, auto reframe, camera tracking | none, or the tracker only | **Later**, each on its own merits |
| Text-to-speech | removed on his rule "if it doesnt show up at export delete it" (#392) | **Never** unless it can export |
| Body effects, AI avatars, script-to-video | none | **Never** for now |
| Overlay lane cap (6), watermark, branded ending clip, paywalls | — | **Never** |

---

## 9. Full-editor content in Quick

### 9.1 Three levels

| Level | Examples | In Quick |
|---|---|---|
| **none** | a plain clip, text, image, overlay, adjustment layer | fully editable with Quick's tools |
| **look** | anything Quick can edit *around* but not *inside*: transform keyframes, a speed ramp, masks, behaviours, 3D or layer-referencing effects, a transform parent (a null), audio-react | editable timing, volume, filters; a small **✦ Full** badge; the Quick panel shows "Edited in Full" for the settings it can't show; nothing it can't show is ever reset |
| **block** | a group (with all its members), a null, a clipping mask, a masking group | one locked item: **Move · Delete · Duplicate · Open in Full**. No trim, no split, no look edits inside |
| **hidden** | the camera | not drawn in the timeline; a one-line note in ⋯ "This project has a camera (edit in Full)" |

### 9.2 How it renders

Exactly as in Full: Quick changes no pixels. The preview is `FM.renderScene` (`js/compositor.js:15989`) whichever editor
is showing, and export is the same pipeline. His rule "the preview must not lie about the export" (#392) holds by
construction.

### 9.3 How it is protected

- Quick commands only ever write `start` (via `shiftUnit`), `duration`, `trimStart`, `speed` (flat), volume, fades,
  `sm`, the looks it owns, and the fields of the panels it opens. A block's insides are only ever **shifted as a unit**.
- **A block on the main track:** if a Full user groups main clips (`FM.groupSelection`, `js/app.js:3897`), the members
  keep `sm.main`, the group is the unit, and Quick shows one "block" clip in that slot of the main track: it ripples and
  reorders as one piece, like CapCut desktop's compound clip.
- **Open in Full** switches editor and selects the layer (or enters its group, `FM.enterGroup`, `js/app.js:4127`).

### 9.4 What the Full editor shows of Quick's keys (Phase 3, optional)

A thin stripe on the left edge of a main clip's bar and a small link glyph on a follower. The four layer-menu items from
§4.4. Nothing else changes in Full.

---

## 10. Collaboration across the two editors

### 10.1 What changes on the wire: almost nothing

- `sm`, `trIn` and `clipAnim` are plain layer keys; they sync as ordinary path ops with no collab code change
  (fm-collab §2.1: "Any new layer or project field travels with no collab code change").
- A Quick command is one commit, so it is **one full diff and one tx** (`beforeSnap`, `js/collab-session.js:1253-1263`):
  `s start` plus one whole-list `s` per animated property on each moved layer, `li`/`lr` for added and removed layers.
- **No derived writer, no `KEYED`/`ATOMIC` change, no new op kind.** The schema fingerprint is untouched by the main track.
  Phase 0 still bumps `SCHEMA_REV` (`js/collab-core.js:29`) by hand, because it adds an `sm` shape check to the sanitiser
  and a room must not mix builds that disagree about invariants (fm-collab §3: sanitiser changes need a bump).
- **The editor each person uses never syncs.** It is not in `FM.scene`. Switching sends nothing.

### 10.2 Presence: who is in which editor

- Add `ed: 's' | 'f'` to `sample()` (`js/collab-presence.js:236-270`), `cleanPr()` (`:280-298`) and the roster
  (`hostRoster`, `:509-530`). An old build drops the unknown field, so it needs no bump (fm-collab §9.4 F).
- The people chip shows a small Q or F. In Full, main clips being dragged by a Quick user (their `af` held path is
  `L/<mainId>/start`) show "Sam is arranging clips". In Quick, a Full user's selection outlines the item or block.

### 10.3 Stopping interference before it happens

`FM.spine.blockers(ids)` runs before every Quick command (§3.6) and refuses the **whole** command if any layer it would
touch is:
- leased by someone else (`ls` in the roster; a lease makes the host refuse every op on that layer,
  `js/collab-host.js:834`, `:871`), or
- held in a live drag by someone else (presence `act: 'drag'` with `af` on that layer).

The message names the person and the thing: *"Sam is editing “Title”. Try again in a moment."* This removes the worst rows
of fm-collab §9.1 (rows 4 and 5, a ripple half-refused by a lease) in the common case, because a tx is not atomic
(`js/collab-host.js:866-880`) and a half-applied ripple is the bug to avoid.

### 10.4 What is left, and how it shows

| Case | Result | What people see |
|---|---|---|
| Quick ripple lands while a Full user is mid-drag on a clip it moves (the drag started after the pre-check) | Full's device defers the remote value and re-asserts theirs on release (`release`, `js/collab-session.js:407-453`) | a gap or overlap chip on that seam in Quick; one tap fixes it |
| Two Quick users ripple the same stretch at the same moment | per-path last-writer-wins on absolute starts | the same chip |
| Quick ripple vs a Full user's keyframe edit on a moved clip | the whole `kf` list is last-writer-wins (`js/collab-path.js:262`) | animation offset from its clip. **Pre-existing** between two Full users today (fm-collab §9.4 B); a ripple widens it. Mitigated by the pre-check (an open graph editor holds a lease) and by moving only the clips that must move |
| Per-person undo of a ripple after someone moved one of its clips | that path is soft-skipped (`js/collab-session.js:1147-1153`) | a gap chip, and the existing toast "Part of this was changed by Sam since" |

Every case converges (the engine guarantees identical copies) and none loses a clip, a keyframe list or a caption; the
failure is always a **visible seam** with a one-tap fix. That is the honest line between this design and option E, which
would make those seams impossible at the price of forcing magnetism on the Full user and changing the keyframe clock.

### 10.5 Roles and joining

- Roles are unchanged: a Viewer's Quick toolbar is disabled exactly as the Full editor's doors are (`roNow`,
  `js/timeline.js:317`; `openAdd`'s guard, `js/mobile.js:399-402`).
- A guest opens the shared project in their own remembered editor, or in `project.sm.home`. The owner cannot force an editor
  on anyone (it is a view).
- A guest whose media has not arrived yet sees main clips without filmstrips; trims that need the source length
  (`FM.maxDurForSource`) cap at the current length until the media lands (**UNVERIFIED**: how `collab-media` exposes
  source length before transfer, fm-model §13.1).

### 10.6 Hardening later (Phase 6)

1. **All-or-nothing tx** (`x: 1`): the host checks role and lease for every op before applying any; refused as a whole, the
   sender reverts the whole step. A new tx field needs a `PROTO` bump (fm-collab §9.4 H).
2. **Derived layout** (option E) if real sessions show seam chips often: `project.spine` keyed list + a layout writer in
   `normalizeDerived` (`js/collab-bridge.js:131-139`) + `DERIVED_FIXTURE`. The command layer in §3 stays; only where
   `start` comes from changes. Designed so it can be added without touching Quick's UI.
3. Collab comments pinned to a moved layer (`lid`) could shift with it; today they keep their absolute `t`.

---

## 11. Undo

- **One history for both editors** (Resolve shares one stack across its editing pages, pro-editors §4). Solo, it is the
  existing snapshot stack (`js/history.js:25-29`, 120 steps); `sm` is inside the snapshot, so it undoes for free.
- **One Quick command = one step**, including adoption (§5.3), ripples, rider edits and follower deletes.
- **Switching editors is not a step** (it is not in the document) and does not clear the stack.
- Undo in Quick of a step made in Full works and vice versa; after an undo, Quick re-reads and redraws.
- **In collab** it is per person (fm-collab §4.5): a ripple's step undoes as a whole unless a peer changed a moved clip
  since, in which case that path is soft-skipped and a seam chip appears (§10.4).
- The undo toast names the Quick action: "Undid Delete clip".

---

## 12. Export, templates, captions

### 12.1 Export parity

- **Phases 0–3 change nothing in the renderer or exporter.** A Quick project is an ordinary project; what exports is what
  the preview shows, in either editor. A gap exports as the background colour, as it does today and as CapCut does with its
  magnet off (pro-editors §1).
- **Phase 4 adds two renderer features, used by both editors and the exporter:**
  - `trIn` on a main clip: during the overlap `[b.start, b.start + d]` the renderer blends the outgoing clip `a` (found as
    the main clip whose end is `b.start + d ± eps`, from a per-frame cached spine index) and `b`. Crossfade is opacity only,
    so it is correct whichever of the two is in front (the one in front ramps in or out). Slide, push, zoom and wipe are
    transient transform/clip changes on both clips. No keyframes are written.
  - `clipAnim` on any visual layer: an In, Out or Combo transient transform/opacity applied on the clip-local clock, the
    same shape as text's `textAnim` presets (`js/compositor.js:2592-2601`).
  - Both are split correctly by the split hook (§3.4) and shown in Full's inspector as ordinary settings.
- A test renders every seam and every animation boundary through `FM.renderScene` and through the exporter's frame path
  and compares.

### 12.2 Templates and elements

- A template is a pack `{project, layers, media}` (`js/storage.js:3000-3055`); `sm` rides in the layers and in `project`,
  so a Quick template opens in Quick with its main track and links intact. `reIdLayers` remaps `sm.on` (§14.3).
- **Inserting a template into a Quick project:** its main clips splice into the main track at the seam nearest the
  playhead (§3.4 Insert); its other items keep their links. A template with no main track inserts as overlays following
  the clip under the playhead, or as a block if it holds groups.
- **An element** (no `project`, `js/storage.js:3024-3047`) inserts as an overlay item or a block, following the clip under
  the playhead.
- "Insert your media" (`js/template-fill.js`) works on any project in either editor. In Quick, **Replace** on a main clip is
  the same slot-fill.

### 12.3 Captions

- A caption track is one `text` layer with layer-local cues (`js/captions.js:1-16`, `:35-37`). In Quick it is the Captions
  section, it rides the main track cue by cue (§3.4 riders), and it is edited with the existing cue editor
  (`FM.captionsEditor.mount`, `js/captions.js:337`).
- **Captions → Add** creates the track (`FM.addCaptionLayer`, `js/app.js:3418`) and offers **Find speech**, the existing
  timing detector (`detectRow`, `js/captions.js:467`). It finds *when* someone speaks; he types *what*. The label says
  exactly that. Speech-to-text is Later (§8.6).
- Stacked caption tracks all show (#574); several caption tracks are several lanes in the section.

---

## 13. Edge cases

| # | Case | Handling |
|---|---|---|
| 1 | Keyframes across a split | `FM.splitLayer` already cuts every keyframed property with exact eases (fm-model §6); Quick adds only the `sm`/looks hook |
| 2 | Speed ramp on a main clip | shown as a "look" (✦ Full); Quick's speed control is disabled with "Speed curve set in Full"; ripples still work because `duration` is what moves neighbours |
| 3 | Reversed clip | trims and splits already handle `reversed` (`js/app.js:4870+`); Quick adds nothing |
| 4 | Negative `start` on the first clip | drawn from 0; Quick never writes a negative start; Tidy moves it to 0 |
| 5 | Two main clips with the same start | ordered by stack then id; shown as an overlap chip |
| 6 | Main clip hidden (`visible:false`) or muted/solo | drawn dimmed; still on the track; ripples as normal |
| 7 | Locked layer that a command would move | the whole command is refused, naming it (§3.6); never a partial ripple |
| 8 | Main clip transform-parented to a null | stays on the main track as a "look"; the null is not moved by ripples (parenting is transform, not time) |
| 9 | Behaviour or effect referencing another layer (`targetId`, `params.source`) | a "look"; ids are unchanged by ripples, so references keep working |
| 10 | Audio-react driven by a moved music clip | music is free by default, so it does not move; if the source is a moved main clip's audio, both move together |
| 11 | Camera | hidden unit; excluded from project length already (`js/app.js:852-870`); ripples never touch it |
| 12 | Adjustment layer spanning many clips | an effect item; follows a clip only if ≥ 50% of it lies over that clip; otherwise free |
| 13 | Caption cue straddling a deleted clip | clipped to the surviving part (§3.4 removeSpan) |
| 14 | `sm.on` dangling (host deleted in Full, or pasted into another project) | treated as absent: derived link (§4.3) |
| 15 | Full duplicate/paste of a main clip | the copy loses `sm.main` (it becomes an overlay) and keeps `sm.on`; one helper `FM.spine.onCopy` at every copy site (§14.3) |
| 16 | Full-mode split | the §3.4 hook runs in `splitLayer` itself, so links are right in both editors |
| 17 | Extract audio | twin follows its clip; never main |
| 18 | Group made from main clips in Full | block on the main track (§9.3) |
| 19 | Very short clips (< 2 frames) | trims clamp to 1 frame; transitions clamp to half the shorter neighbour |
| 20 | Source shorter than the slot (replaced media, missing file) | duration clamps and the difference ripples; a missing file shows the existing offline look |
| 21 | Image (still) clips | default length from Settings (`FM.defaultLayerDuration`, `js/app.js:2736-2739`); extendable without limit |
| 22 | Project length | still `FM.autoFitDuration` (`js/app.js:852`), the furthest end of anything, so an overlay past the last clip shows over the background (CapCut does the same) |
| 23 | Markers, loop in/out, collab comment pins | absolute; not moved by ripples in Core; a marker option is Later |
| 24 | Canvas size change | unchanged path (`FM.rescaleProjectContents`, `js/scene.js:1202-1280`); classification's frame test re-runs |
| 25 | A 2,000-layer project (the collab cap, `js/collab-host.js:565`) | classification is O(n log n) and cached; the Quick timeline draws only the visible time range (§14.2) |
| 26 | A ripple over hundreds of animated clips | one tx may approach the 5,000-op limit (`C.LIMITS`, fm-collab §6). **UNVERIFIED** whether the session splits an oversized diff; Phase 2 measures it, and the runner refuses with a message rather than half-apply if the plan's op estimate exceeds the limit |
| 27 | Old build in the room | `SCHEMA_REV` bump keeps it out (§10.1); without the bump it would sync `sm` faithfully but not strip it on copy, giving an overlap chip at worst |
| 28 | Export while in Quick | same exporter; "Export just this layer" and "Selected clip only" still work |
| 29 | Text editor open, switch editor | the text edit commits first, as a deselect does |
| 30 | Undo right after the adopting edit | removes the edit and the `sm.main` flags together; the project is back to un-adopted |

---

## 14. Code plan

### 14.1 New files (plain `<script src>`, no build, each with a `?v=` buster, `CLAUDE.md` gate)

| File | What | Size (est.) |
|---|---|---|
| `js/spine.js` | `FM.spine`: `classify`, `read` (cached), `ripplePlan`, one plan builder per command (§3.4), rider span ops, `adopt`, `onCopy`, `blockers`, `edit` runner, `say` | ~900 lines |
| `js/editor-mode.js` | `FM.editor`: `mode`, `set(mode)` (body class, memory, dispatch, FLIP animation), per-project memory, the stage pill, presence `ed` feed | ~250 |
| `js/simple-timeline.js` | `FM.simpleTimeline`: `init`, `rebuild`, `updatePlayhead`, section lanes, main filmstrip, seam chips, ◇ buttons, gestures (select, hold-drag reorder, trim grips with live ripple preview, pinch, fling), visible-range drawing | ~1,600 |
| `js/simple-tools.js` | the toolbar (strip on phone, column on PC), per-kind tool lists (§8.5), panels built from inspector builders, the Adjust panel, the filter strip | ~900 |
| `tests/simple.js` or a block in `tests/tests.js` | tagged `{ item: '<new number>' }`; see §14.6 | — |

### 14.2 Changes to existing files

| File:line | Change |
|---|---|
| `index.html:591` (`#timeline-panel`) | add `<div id="sm-timeline" hidden>` beside `#timeline`, and `#sm-tools` in the inspector column; the stage pill markup near `#stage` (`index.html:412-425`); four `<script>` tags |
| `styles.css` | a `body.ed-simple` block for each layout (phone at `:3826+`, PC at `:6275+`): hide `#timeline`, the transport's left cluster and the Add row; lane and chip styles |
| `js/timeline.js:5210` `rebuild()` and `:5355` `updatePlayhead()` | first line: `if (FM.editor && FM.editor.mode === 'simple') return FM.simpleTimeline.rebuild();` (and the same for the playhead). Export the helpers Quick reuses: `pxPerSec` (`:1096`), `drawFilmstrip` (`:990`), `drawWaveform` (`:961`), `clipColorOf` (`:493`), `snapT`, the fling code (`:3522-3620`) |
| `js/timeline.js:4033` `FM.trimLayerHead` | none; reused as is |
| `js/app.js:878` `refreshAll` | no change needed: it calls `FM.timeline.rebuild()`, which dispatches. `FM.syncSelectionChrome` (`:941-985`) learns the Quick top-bar label |
| `js/app.js:2972-3002` `FM.addMediaLayer` | when `mode === 'simple'`, placement comes from `FM.spine` (append or insert-at-seam) instead of "at the playhead, capped at the end" (`:2999`) |
| `js/app.js:2880` `FM.insertLayer` | unchanged; Quick sets `FM.addAt` to the band slot first (§3.5) |
| `js/app.js:4855-5046` `FM.splitLayer` | after B is built: `FM.spine.onSplit(A, B, t)` (drops `B.trIn`, splits `clipAnim`, re-homes followers). Runs in both editors |
| `js/app.js:4313-4360` duplicate, `~4296`/`~4515` paste, `ai-ops.js:467` | call `FM.spine.onCopy(copy, map)`: strip `sm.main`; remap `sm.on` through the batch map when the host was copied too |
| `js/app.js:1007` `FM.extractAudio` | twin: `sm = {on: src.id}` |
| `js/app.js:5147` `FM.layerMenuItems` | Phase 3: Make main clip / Take off main track / Stick to clip / Unstick |
| `js/app.js:8761-8814` keyboard | a `mode` gate: Quick's keys (§8.3) in Quick, today's in Full |
| `js/inspector.js:5850-5880` speed slider | extract the flat branch into `FM.setClipSpeed(layer, sp)` (same code); the slider calls it; Quick calls it then ripples |
| `js/inspector.js:3619` `catsFor` | a `mode` filter hook (Quick's panels reuse categories through `openCategory`, `:6818`) |
| `js/inspector.js:6904-6919` no-selection branch | in Quick, render `FM.simpleTools` instead of the Add menu |
| `js/addmenu.js:219` `TABS`, `:977` `render` | a `tabs` / `exclude` option (Quick's Overlay and Audio buttons open filtered tabs; Camera, Controller, New group, Custom shape hidden) |
| `js/mobile.js:48-90` `syncSheet`, `:271-294` `dockSheet`, `:398` `openAdd` | dock the sheet under the Quick timeline instead of under a row; `openAdd` routes to Quick's filtered menu |
| `js/storage.js:1633` `sanitizeImportedLayers` | `sanitizeSm(l)`: `sm` must be a plain object; `main` → `true` or deleted; `on` → a valid id (`KEYVAL`-shaped), `'*'`, `'free'`, or deleted; other keys dropped. `trIn`/`clipAnim` validated the same way in Phase 4 (types from a whitelist, durations clamped) |
| `js/storage.js:1028` `sanitizeProjectFields` | `project.sm`: `{v: 1, home: 'simple' \| 'full'}`, anything else dropped |
| `js/storage.js:2044-2080` `reIdLayers` | `if (l.sm && typeof l.sm.on === 'string' && map[l.sm.on]) l.sm.on = map[l.sm.on];` (unmapped ids stay; they are tolerated as dangling) |
| `js/storage.js:2540-2595` `FM.projects.create` | `opts.home` → `project.sm`, `rec.editor` |
| `js/home.js:2893` `createFromDialog`, `index.html:711-767` | the two cards; Quick's route to the picker then append |
| `js/home.js:1351` `projectCard` | the chip; ⋯ "Open in Quick / Full" |
| `js/collab-presence.js:236-270`, `:280-298`, `:509-530` | the `ed` field |
| `js/collab-core.js:29` | `SCHEMA_REV = 3` in the phase that adds `sanitizeSm` |
| `js/compositor.js` (Phase 4) | `trIn` blend and `clipAnim` transients in the per-layer draw, beside the text-animation code (`:2592-2601`); a per-frame cached main-track index for finding the outgoing clip |
| `tests/tests.js:68197-68208` (the brand-name guard) | widen it to the mode pill, the New project cards, Quick's toolbar and panel labels (his structural-safeguard rule; his-prefs §12 point 2) |
| `BEFORE-PUBLISHING.md` | list every Quick screen built from a CapCut/Premiere reference as it lands |

### 14.3 One helper per rule, so no site is forgotten

The whitelist-drift memory note records four silent bugs from field lists; here the risk is a copy site that forgets
`sm`. So `FM.spine.onCopy` is the only thing that touches `sm` on a copy, and a test (§14.6 T6) drives **every** copy route
(duplicate, duplicate-in-place, paste, paste of several, extract audio, element insert, template insert, AI op clone,
project duplicate) and asserts no copy is a second main clip at the same time and every `sm.on` points inside the batch or
at the original host.

### 14.4 The dispatch seam, drawn

```
refreshAll ─▶ FM.inspector.refresh ─┬─ full:   Add menu / layer editor           (today)
                                    └─ simple: FM.simpleTools.render
           ─▶ FM.timeline.rebuild ──┬─ full:   buildTracks                         (today)
                                    └─ simple: FM.simpleTimeline.rebuild ─▶ FM.spine.read(scene)
tap a Quick tool ─▶ FM.spine.edit(label, plan) ─▶ mute ▸ adopt? ▸ apply ▸ unmute ▸ refreshAll ▸ commit
                                                                                         └▶ collab diff → one tx
```

### 14.5 Performance budget (to be measured at 380 px on his iPhone, not assumed)

- `FM.spine.read`: one pass to sign, O(n log n) on a change; target < 2 ms for 500 layers.
- Quick `rebuild`: draw only items in the visible time range ± one screen; filmstrip thumbnails cached per clip and zoom
  bucket; target < 8 ms at 200 items.
- A ripple over 60 clips: `shiftLayerKeyframes` is linear in keyframes; one commit, one snapshot.
- Trim drag: the live ripple preview moves DOM boxes only (no scene writes) until release, then one command. This also
  keeps collab quiet during the drag (a single tx at the end).

### 14.6 Tests (the proof `ship.sh` demands, each must fail with its source reverted)

| # | Test |
|---|---|
| T1 | classifier: 12 hand-built projects (plain spine, PIP, letterbox, groups, masks, camera, gaps, negative start, overlaps, captions, music, empty) → expected sections and hosts |
| T2 | every command over 200 seeded spines: the §3.7 invariants |
| T3 | keyframes: after every command, each moved layer's keyframes moved by its `dt` (and scaled for speed) |
| T4 | riders: cues removed, clipped, shifted, moved and scaled exactly |
| T5 | adoption: first edit writes `sm.main` on exactly the derived main clips, in the same undo step |
| T6 | copy routes: §14.3 |
| T7 | `reIdLayers` remaps `sm.on`; `sanitizeSm` rejects junk; unknown `sm` keys dropped, known ones kept on every route (load, import, undo, template, element, collab clone) |
| T8 | switch: no scene write, no history step, no collab op; selection, playhead and zoom kept |
| T9 | collab: a Quick ripple is one tx; a ripple onto a leased layer is refused whole with the named message; convergence of a Quick guest and a Full guest over 300 seeded rounds (`921`-style fuzz) and a seam check that reports, not asserts, anomalies |
| T10 | export parity: seam frames and (Phase 4) transition and animation frames, preview vs exporter |
| T11 | phone layout at 380 px: toolbar reachable, Done always visible, sheet docks, nothing off-screen (both suite widths) |
| T12 | the brand-name guard covers Quick's labels |

---

## 15. Phases (each ships on its own, each proven before the next)

| Phase | What ships | Visible to him? | Gate |
|---|---|---|---|
| **0. Plumbing** | `sanitizeSm`, `reIdLayers` remap, `FM.spine.onCopy` at every copy site, the split hook, `FM.setClipSpeed` extraction, exported timeline helpers, presence `ed`, `SCHEMA_REV` 3 | No (safe no-ops on today's projects) | T6, T7; full suite green at both widths |
| **1. The model** | `js/spine.js` complete: classify, read, every command, riders, runner, blockers; driven from tests and the console only | No | T1–T5, T9 (engine half) |
| **2. Quick editor, first cut** | `editor-mode.js`, `simple-timeline.js`, `simple-tools.js`: the pill, the main track, sections, trim/split/delete/reorder/speed/volume/duplicate/replace, text, captions, overlay, audio, filters, ratio, export; blocks; seam chips and Tidy. **Behind Settings → Labs → "Quick editor (preview)"**, so it lands on his phone without changing anything for anyone else | Yes, in Labs | T8, T10 (seams), T11; a 380 px screenshot sheet |
| **3. The way in** | New project cards, Home chip and ⋯ items, template routing, Full-editor badges and layer-menu items, presence badges, the switch animation(s); Labs flag removed | Yes | his pick on D1–D3 |
| **4. Looks** | transitions (◇ at each cut, Apply to all) and clip In/Out/Combo animations, in the compositor, in both editors and export | Yes | T10 (transitions); drawn options first (his design rule) |
| **5. Later list** | freeze, Adjust as one panel if not already in 2, filter strip polish, keyframe diamond, stickers and text templates once there is content, speed curves | Yes, item by item | per item |
| **6. Collab hardening** | all-or-nothing tx (`PROTO` bump), and derived layout (option E) only if real sessions show seam chips often | Only if needed | T9 extended |

A phase never depends on a later one. Phase 2 is the first thing he can hold; Phases 0–1 are invisible and cannot break a
project (the `sm` keys are absent from everything that exists today).

---

## 16. Risks

| Risk | Size | Mitigation |
|---|---|---|
| Two people ripple the same stretch at once → gap/overlap | Medium likelihood in busy sessions, low harm | pre-check (§10.3); visible seam chips; Tidy; Phase 6 option E |
| Keyframe list race widened by ripples | Low likelihood, medium harm (animation offset) | pre-check covers open keyframe tools; only moved clips are written; pre-existing today |
| Classifier picks the "wrong" main track on an odd Full project | Medium | view only until the first Quick edit; "Move to main track" / "Move to overlay" fix it in one tap; T1 fixtures from his real projects |
| A copy route forgets `sm` (duplicate main clip) | Medium (whitelist drift, four past bugs) | one helper, one test over every route (§14.3) |
| Two timelines to maintain | Ongoing cost | Quick reuses helpers, browsers, inspector builders and the renderer; only the timeline and toolbar are new |
| Phone performance with filmstrips and many lanes | Medium | visible-range drawing, folded sections, measured budgets (§14.5) |
| Captions disappoint without transcription | Medium | say plainly "finds when people speak"; transcription is Later |
| Oversized tx on a huge ripple | Low | measure in Phase 2; refuse whole rather than half-apply |
| Looks copied from CapCut | Certain, if unguarded | BEFORE-PUBLISHING list, our own composition and names; the widened brand-name guard |
| Transitions need the renderer and cost the phone frames | Medium | Phase 4 on its own; crossfade first; measured |
| Mode word collisions (magnet, parent, Studio, Pro) | Low once named | code says `spine`; UI names are D1 |

---

## 17. Decisions for Ezra (one line each; the recommended one first)

| # | Question | Picks |
|---|---|---|
| D1 | What are the two editors called? | **A. Quick / Full (recommended)** · B. Simple / Advanced · C. Cut / Motion · D. Easy / Pro (clashes with the paid "pro version") |
| D2 | What does New project start in? | **A. Two cards, last one used is picked; first time: Quick (recommended)** · B. Always Quick · C. Always Full |
| D3 | Where is the switch? | **A. A small Quick/Full pill on the canvas corner, both layouts (recommended)** · B. Inside the cog · C. In the playback bar |
| D4 | When you move or delete a clip, what happens to the text and stickers on it? | **A. They go with it; music stays put (recommended)** · B. Nothing moves with it (CapCut phone) · C. Everything moves, music too |
| D5 | Deleting a clip that has things on it | **A. Deletes them too, with Undo in the toast (recommended)** · B. Leaves them where they were |
| D6 | Gaps in the main track | **A. Quick never makes them; gaps made in Full show as a chip you tap to close (recommended)** · B. Quick closes all gaps the moment you switch (this rewrites the project) · C. A magnet on/off switch on PC like CapCut desktop (phone and PC would then differ) |
| D7 | A project made in Full, opened in Quick | **A. Opens as it is; what Quick can't edit shows as a locked block you can open in Full (recommended)** · B. Refuse to open · C. Make a copy converted for Quick |
| D8 | Who is the first version for? | **A. Someone who has never edited, on the phone; the same screens serve the fast expert (recommended)** · B. The fast expert first |
| D9 | Transitions in the first version? | **A. Straight after the first version, as their own release (recommended)** · B. In the first version (it waits longer) · C. Later |
| D10 | Build it? | **A. Start with the invisible parts (Phases 0–1), then the Labs preview (recommended)** · B. Keep planning · C. Not now |

Every other choice in this file is a detail decided with the recommended option, per his rule; he will say if one is wrong
after he sees it.
