# Simple mode: design, collaboration-first

Design step 2 of `STATUS.md`. This is one of three independent designs (this one leads with live collaboration). Written
29 Sep 2026 against HEAD `2d06a3f5` (v17.11) plus the loop session's uncommitted edits. **Design only: nothing here is
built, and nothing gets built until Ezra says so** ("don't build it until I say to do it", INBOX.md:28).

Sources: the six research notes in `research/` (cited as `[collab §x]`, `[model §x]`, `[ui §x]`, `[capcut §x]`,
`[pro §x]`, `[prefs §x]`). Code is cited `file:line`. I re-read the load-bearing lines myself for this note:
`js/collab-bridge.js:116,131-139,142-150`, `js/collab-host.js:606-715,826-843,871-872`, `js/collab-diff.js:149-227,491-540`,
`js/collab-path.js:139-160,251,262`, `js/storage.js:1563-1650`, `js/scene.js:377-380`, `js/timeline.js:5068-5080`. Other
lines come from the research notes; the tree has uncommitted edits, so a few may be off by a handful of lines.

---

## 0. The collaboration answer, first

**The question from the brief:** *"how someone using the CapCut version or Premiere Pro version is going to be able to do a
collab with someone who is also using the After Effects slash a light motion version. Like how are they both going to work
on it at the same time and not interfere?"*

**The short answer.** They edit the same project, not two copies. The simple editor never sends "move these twelve clips".
It sends the one thing the person changed: a clip's length, its place in the order, a new clip. **Where every main-track clip
sits in time is not stored. Every device works it out**, with the same small function, from data that merges cleanly. And
**keyframes travel on the wire measured from their own clip's start**, so moving a clip never touches its animation in
transit. Those two rules together make a ripple commute with everything the other person can do. Their edits land in
either order and the result is the same and correct: no gaps, no overlaps, animation still on its clip.

### 0.1 Why the obvious way fails
Built naively, a ripple writes a new absolute `start` on every later clip, plus every animated property's whole keyframe
list on each one. Keyframe times are absolute (`js/scene.js:373-380`) and keyframe lists are atomic on the wire
(`js/collab-path.js:262`). Two such edits don't add up. The host takes whichever arrives last, per field. Every device
converges on a document that is **consistent but wrong**: overlaps on the main track, animation left behind its clip, a
leased clip that stays put while the others slide over it. The collab research tabulated ten cases, and six of them break
this way [collab §9.1].

### 0.2 Three ways to carry a ripple, and the pick

| | **R1. A semantic op the owner computes** (`{o:'ripple', after, by}`) | **R2. Ordinary field ops under one lease set** (lease every follower, send all starts and keyframes, CAS) | **R3. Ripple as a consequence** (recommended) |
|---|---|---|---|
| What travels for "trim clip 2 by 1 s" | 1 new op | 1 + N `start` + N×(keyframe lists) + N leases | **1 op: clip 2's `duration`** |
| Composes with a concurrent ripple | yes (the host adds the shifts) | no (absolute values; last wins) | **yes (two field edits; the layout sums them)** |
| Composes with a concurrent keyframe edit | no (lists are still absolute and atomic) | no | **yes (keyframes are clip-relative on the wire, §3.3)** |
| A follower leased by someone else | the host must refuse or move it | the whole ripple waits, or lands in part | **it just moves; the lease protects its content, not its time (§10.4)** |
| Undo | a new inverse op kind | N soft-skips, so it leaves holes | **one field back; the layout re-derives (§11)** |
| Protocol cost | new op grammar, breaks spec D2 (every op comes from the diff), and a second implementation of every edit command inside the host | none new, but blocks people and still loses edits | **no new op kind. One new path rule, a keyframe time base on the wire, one host invariant, a `SCHEMA_REV` bump** |
| Validity if a tx lands in part (a tx is not atomic, `js/collab-host.js:866-880`) | invalid in between | invalid | **valid by construction: the layout is total over ANY document** |

**R3 is the pick.** It keeps the good part of R1: the owner's device does compute the consequence, as a host invariant in
the same batch (§10.2). But it does that with the machinery that already exists: the invariant step turns into `fix` ops
that are applied straight to the host's base (`js/collab-host.js:695-715`). There is no new grammar.

It also settles the one disagreement between the two research notes:
- The collab note wanted a derived start [collab §9.3 b].
- The model note warned that a derived write would snap the complex user's drags back [model §13.4.2].

Both are right, and the design honours both. Starts are derived **from data both editors obey**. And **every gesture on a
main-track or stuck layer writes the model's own fields (order, gap, offset, length), never `start`** (§3.6), so the layout
never has to fight a finger.

### 0.3 The non-interference guarantee (stated precisely in §10.9)
1. A **free** layer (not on the main track and not stuck to a clip) never changes time because of anything done on the main
   track.
2. A layer that is **stuck** to a clip keeps its exact offset into that clip, and every layer keeps its keyframes' exact
   offsets into itself, whatever anyone does in whatever order.
3. The main track is **always valid** on every device after every batch: no overlaps, and no gap nobody made. This holds
   even when a tx is refused in part.
4. Nothing you are holding moves under your finger. That includes the **frame** you are working on: when a remote ripple
   slides your clip, your playhead slides with it (§10.5).
5. Two people changing the **same field** still resolve as today: the last one to let go wins, and a delete wins. That is
   the only kind of overlap left, and presence shows it coming.

---

## 1. The core idea in one paragraph

FreeMotion keeps **one project format and one document**: `{project, layers}`. The simple editor is a second **view and
command set** over that same document, the way DaVinci Resolve's Cut page and Edit page are two UIs over one timeline with
one undo history [pro §4]. It is not a second format (Adobe built that twice and both times it was one-way and lossy
[pro §2]). Two small, optional, per-layer fields turn free layers into a CapCut-style structure without changing anything
for projects that don't use them:
- **`main`** puts a clip on the main track, with an order key and an optional gap before it.
- **`stick`** ties an overlay, text, caption or sound to a clip at an offset into it. This is Final Cut's connected clip
  [pro §3], in a word that doesn't clash with FreeMotion's "magnet" (snapping) or "parent" (transform).

A layer on the main track, or stuck to something, **has its start computed, not stored**. Both editors obey this. The
simple editor ripples: nothing on the main track ever leaves a gap. The full editor pushes: main-track clips never overlap,
and neighbours stay still unless they are pushed. Everything else is exactly today's free-layer model. Switching editors is
instant, changes nothing in the document, and is per person. So in a live session one friend can be in Simple and the other
in Full at the same moment, on the same project, and every edit either of them makes means the same thing to both.

---

## 2. Data model

### 2.1 New fields (all optional, all plain JSON, no `_` prefix, so they survive every route) [model §9, §13.2]

```jsonc
// A layer ON THE MAIN TRACK
"main": {
  "k": "a0Vx7",      // order key: a fractional-index string. The track is sorted by (k, id).
  "gap": 0           // seconds of empty space BEFORE this clip (>= 0, absent = 0). Needed so a Full-editor
                     // project with gaps can be adopted without moving anything (§5), and so the Full editor
                     // can leave room. The Simple editor never creates one; it shows one as a block you can close.
}

// A layer STUCK TO ANOTHER LAYER (overlay, text, caption track, sound, adjustment)
"stick": {
  "to": "layer_k3…",  // the host layer's id (a main clip, or any layer that is not itself stuck)
  "off": 1.25         // seconds from the host's start to this layer's start (may be negative)
}

// The project
"project": { "sm": { "v": 1, "home": "simple" } }   // v = version of this namespace (the app has no scene
                                                     // versioning, js/storage.js:1411); home = which editor a
                                                     // project opens in by default. A default, not a live setting.
```

Rules (enforced by the sanitiser and as a host invariant, §10.2):
- `main` and `stick` are exclusive. If both are present, `main` wins and `stick` is dropped.
- A `stick` host must exist and must not itself be stuck (one level deep). A chain is cut at the inner link.
- `main.gap` is clamped to 0…3600. `stick.off` is clamped to −3600…3600, matching `sanitizeTiming`'s ±3600 floor
  (`js/storage.js:1580`).
- `camera` layers can't be on the main track or stuck (they are stretched to the project, `js/app.js:852-870`). `group`
  and `null` layers can't be on the main track.
- **`start` of a derived layer is still written into the saved document**, as a cache. Old code, the exporter and the Full
  editor keep reading `start` unchanged. It is simply overwritten by the layout on every refresh.

### 2.2 What is derived (pure functions of the document, never authored)

| value | from |
|---|---|
| `start` of a main clip | the sum of the gaps and lengths of every main clip before it in `(k, id)` order |
| `start` of a stuck layer | `host.start + stick.off` |
| `project.duration` | as today (`FM.autoFitDuration`, `js/app.js:852-880`), run **after** the layout |
| sections / lanes in the Simple timeline | from type (`[model §13.3]`), packed on the fly. Never stored. |

### 2.3 What stays per device (never in the document) [collab §5]
- **Which editor this device is showing:** `localStorage['fm.editor.<projectId>']`, falling back to `project.sm.home`, then
  `'full'` for projects made before this ships. It is also sent in presence (§10.6).
- Simple-timeline zoom, scroll, which lane is unfolded, and the last-used toolbar: `localStorage` or `_` keys.

### 2.4 The project index (Home cards)
`fm.projects` entries gain `editor: 'simple'|'full'`, copied from `project.sm.home` the same way `sizePicked` and
`templateDraft` travel (`js/storage.js:2554-2595`). Home can then badge cards without opening each document.

### 2.5 Why per-layer fields and not a project-level list of ids
The collab note leaned towards `project.mainTrack = [{id}…]` [collab §9.4 A]. Per-layer is better for collaboration:

| | project list of ids | **per-layer `main.k`** |
|---|---|---|
| Deleted clip | leaves a dangling entry; pruning it breaks undo | **nothing dangles**; `lr` removes the clip and its order together |
| Insert whose neighbour was deleted at the same moment | anchor falls back to index 0, i.e. the start of the video (`js/collab-diff.js:131-134`) | **no anchor**: a key between two others still sorts correctly |
| Two reorders of different clips | host-stated `ord` of the whole list | **two independent field writes** |
| Undo of a reorder | restates the whole list, and can revert a peer's later reorder [collab §4.5] | **puts back one key** |
| Held list order mid-drag | needs `adoptOrder` extended [collab §9.4 D] | **not needed** |
| Id remap on duplicate/paste/import | needs one | not needed for `main`. Needed for `stick.to` only, which is the `parent` precedent (`js/storage.js:2044-2080`) |
| Empty-list atomic trap (`js/collab-path.js:273`) | must be declared in `KEYED` | **not applicable** |

The cost of per-layer: a lease on a clip also blocks **reordering that clip**. That is the right behaviour ("Sam is cropping
this clip"), and it never blocks moving **other** clips around it.

---

## 3. Algorithms

### 3.1 The layout (the only place a derived start is written)

```js
// js/track.js — runs in refreshAll, before every collab diff (normalizeDerived), before export,
// and as a host invariant. Pure over the document apart from the in-place writes marked ★.
FM.track.layout = function (scene) {
  const L = scene.layers, byId = indexById(L);
  // 1. main track
  const mains = L.filter(l => l.main && !isExcluded(l))                 // camera/group/null never main
                 .sort((a, b) => cmp(a.main.k, b.main.k) || cmp(a.id, b.id));   // (k, id): total, deterministic
  let t = 0;
  for (const l of mains) {
    t = r6(t + clampGap(l.main.gap));
    setStart(l, t);                                                     // ★
    t = r6(t + l.duration);
  }
  // 2. stuck layers (one level deep, so a single pass is enough)
  for (const l of L) {
    if (!l.stick || l.main) continue;
    const h = byId[l.stick.to];
    if (!h || h.stick) continue;          // orphan or chain: left where it is; the host invariant repairs it (§4.4)
    setStart(l, r6(h.start + l.stick.off));                            // ★
  }
};
function setStart(l, s) {                 // the ONE writer of a derived start
  const d = s - l.start;
  if (Math.abs(d) < 5e-7) return;
  FM.shiftLayerKeyframes(l, d);           // same JS turn as the start write — see §3.3 for why that matters
  l.start = s;
}
const r6 = x => Math.round(x * 1e6) / 1e6; // float sums are deterministic across devices in the same order;
                                           // rounding stops 1e-16 residue becoming "a change" to the diff
```

- **Cost.** One sort and one pass: O(n log n), n ≤ 2000 layers (`js/collab-host.js:565`). It is skipped entirely when no
  layer has `main` or `stick` (a one-flag check), so existing projects pay nothing.
- **Totality.** Every document has exactly one layout. Refused ops, half-landed txs, stale undo, an old build's edits: none of
  them can produce an overlapping main track. That is the property the simple editor needs from collaboration, and it holds
  because the start is computed, not trusted.

### 3.2 Order keys

```js
FM.track.keyBetween(a, b)   // a < result < b in string order; a=null → before the first; b=null → after the last
// Base-62 midpoint (the standard fractional-indexing construction), then a 2-character random suffix
// so two people inserting into the same gap at the same moment rarely mint the same key.
// If they do, the (k, id) sort still gives one deterministic order, and both clips are kept.
```
Keys grow by about one character per six inserts into the same spot, so keys stay short. There is never a "rekey
everything" step, because rekeying would be N concurrent writes.

### 3.3 Keyframes travel clip-relative ("clip time on the wire")

This is the change that makes ripple and keyframe editing commute. **The app keeps absolute keyframe times in `FM.scene`,
exactly as today.** Every renderer, keyframe dot, graph editor and inspector read (about 800 `evalProp` call sites) is
untouched. Only **what crosses the wire and sits in the collab base** changes:

```
wire/base form of a keyframe list under a layer:  t_rel = r6(t_abs − layer.start)
live (FM.scene) form:                             t_abs = t_rel + layer.start      (the receiver's own start)
```

Where the conversion happens (all inside collab; the app never sees it):

| site | change |
|---|---|
| `diffNode` / `diffObject` on the live side (`js/collab-diff.js:491-540`) | when the key is `kf` under root `L/<id>/…` and not inside another atomic value, compare `rel(live, liveLayer.start)` with base, and emit the **relative** value |
| `applySet` with `o.live` (`js/collab-diff.js:190-227`) | a `kf` value is written as `abs(v, liveLayer.start)` |
| `applySet` of `L/<id>/start` with `o.live` | shift that layer's keyframes by the change (`FM.shiftLayerKeyframes`), so the relative form stays fixed |
| `applyLi` / whole-layer `s` values, snapshots (`onSnap`, `js/collab-session.js:994-1025`), `C.join` (`:1841-1949`) | convert a whole layer's `kf` lists with the same two functions |
| base, `canon` hash, undo records, the ring | already in D-space, so relative. No change. |

What this buys:
- **A free move no longer ships animation.** Today moving a clip sends `start` plus every keyframe list, because
  `shiftLayerKeyframes` rewrites them (`js/timeline.js:5073-5075`). Under this rule it sends `start` only. That also fixes
  the latent move-against-keyframe-edit race between two Full users today [collab §9.4 B].
- **A ripple never ships animation either.** The derived start moves, `setStart` shifts the absolute keyframes locally, and
  the relative form is unchanged, so the diff sends nothing.
- **A concurrent keyframe edit lands correctly in either order.** Its relative list is turned back into absolute time using
  the receiver's current start (worked through in §10.3, case F).
- **Sanitisers don't care.** `sanitizeKeyframes` only filters and sorts (`js/storage.js:1610-1632`). A uniform shift keeps
  the order, so the host's invariants run on relative lists unchanged.

The one obligation this creates for app code: **any code that moves a layer's start and means "animation comes too" must
shift the keyframes in the same synchronous turn.** Most writers already do (`js/inspector.js:3466`, `js/app.js:4468/4772/5073`,
`js/storage.js:3343/3619`). **One does not.** The timeline's clip drag writes `start` on every pointer move and shifts
keyframes only at pointer-up (`js/timeline.js:5073-5075`). A 100 ms hot tick in between would read that as a keyframe edit.
Fix: shift per move from the drag's origin (§14). A structural guard catches any writer that forgets: in tests, the diff
asserts that no layer emits a `start` change together with **every** keyframe list moving by exactly minus that change (§10.10
T3).

A head trim is different, and correctly so. It moves `start` and **not** the keyframes, because the picture stays still in
project time. The relative keyframe times genuinely change, so they travel. That is the one move that should send them.

### 3.4 Simple-editor commands (in `js/track.js`, shared with the Full editor where marked)

All of them are ordinary local mutations followed by one `FM.history.commit()`. The observer diff turns them into field ops.
The "ops" column is what actually crosses the wire.

| command | local mutation | ops on the wire |
|---|---|---|
| **Add clips** (append, in pick order) | new layers with `main.k = keyBetween(lastK, null)`, placed in the bottom z band (§3.7) | `li` × n |
| **Insert at the playhead** | split the clip under the playhead if it is mid-clip, otherwise use that cut; `k` between the two neighbours | `li` (+ the split's ops) |
| **Delete (ripple)** | `lr X`. If X had a gap, `next.main.gap += X.gap`: the HeyGen rule, "move only what's after, by exactly the length removed" [pro §1]. Stuck items: see decision D5 (§17) | `lr` (+1 `s gap` only when X had a gap) (+`lr` per stuck item) |
| **Trim end (ripple)** | `duration` | `s duration` |
| **Trim start (ripple)** | `trimStart += Δsrc`, `duration −= Δ`, keyframes shifted by −Δ (the picture moves earlier with the content) | `s trimStart`, `s duration`, keyframe lists (relative times really changed) |
| **Split** | the existing `FM.splitLayer` (`js/app.js:4855`) plus: B gets `main = {k: keyBetween(A.k, next.k), gap: 0}`, inserted next to A in z. Items stuck to A with `off ≥ A.newDuration` are re-stuck to B with `off −= A.newDuration`. A caption track stuck to A is split at the same time too | `s duration` on A, `li` B, `s stick` per moved item |
| **Reorder** (hold and drag) | `X.main.k = keyBetween(p, n)`; X's gap is left behind: `oldNext.gap += X.gap; X.gap = 0` | `s main/k` (+ gap writes only if gaps exist) |
| **Speed** | as the inspector does today (`js/inspector.js:5855-5880`): `speed`, `duration`, keyframes scaled about the start | `s speed`, `s duration`, keyframe lists |
| **Replace** | `FM.replaceMedia` (`js/app.js:4658`); the slot keeps its length | as today |
| **Duplicate** | the copy goes right after the original: `k = keyBetween(X.k, next.k)`. Its stuck items are copied and re-stuck to it | `li` (+`li` per stuck item) |
| **To overlay** | `delete main`; `start` = its current derived start (written explicitly); `stick` to the main clip under its new start, worked out after the track closes up; move up into the overlay z band | `d main`, `s start`, `s stick`, `mv` |
| **To main track** | `delete stick`; `main.k` at the slot nearest the playhead or the drop point; move down into the main z band | `d stick`, `s main`, `mv` |
| **Close gap** | `gap = 0` | `s main/gap` |

### 3.5 Full-editor commands on main-track clips (same module, a different rule: push, don't ripple)

The Full editor's promise is "anything anywhere". On the main track the one thing it can't do is overlap two clips, so it
**pushes** instead. Neighbours stay still unless pushed:

```js
FM.track.full.trimEnd(X, newDur) {            // shorten → a gap opens after X; lengthen → eat the gap, then push
  const d = newDur - X.duration, n = next(X);
  if (n) n.main.gap = Math.max(0, (n.main.gap || 0) - d);
  X.duration = newDur;                         // anything beyond the gap is a push, which the layout does for free
}
FM.track.full.slide(X, wantStart) {           // horizontal drag of a main clip
  const slot = slotFor(wantStart, X);          // crossing the MIDDLE of a neighbour swaps with it (reorder)
  if (slot.changed) reorderInto(X, slot);      // as §3.4 Reorder
  const prevEnd = endOfPrev(X);
  const g0 = X.main.gap || 0, g1 = Math.max(0, wantStart - prevEnd);
  X.main.gap = g1;
  const n = next(X); if (n) n.main.gap = Math.max(0, (n.main.gap || 0) - (g1 - g0));   // followers hold still
}
FM.track.full.trimStart(X, newStart) {        // the picture stays where it is, as today
  const d = newStart - X.start;                // + = trim in, − = extend back
  X.main.gap = Math.max(0, (X.main.gap || 0) + d);   // clamped: can't extend back over the previous clip
  /* trimStart / duration / keyframes: exactly as today's head trim (js/timeline.js:3929-3960) */
}
```

Every one of these is **idempotent from the gesture's origin state**. The existing move code already works from
`origStart` (`js/timeline.js:5073-5075`). So the Full timeline calls them on every pointer move, the layout places the clip,
and nothing snaps back. Stuck layers in the Full editor: dragging writes `stick.off` (`off = wantStart − host.start`). The
layer menu (`FM.layerMenuItems`, `js/app.js:5147`) gains: **Put on main track · Take off main track · Stick to the clip
under it · Unstick**.

### 3.6 The rule that ends the "snap back" worry
> **On a main-track or stuck layer, no gesture in either editor ever writes `start`. It writes `main.gap`, `main.k`,
> `stick.off`, `duration` or `trimStart`, and the layout places the layer.**

The host enforces it too: an `s L/<id>/start` on a layer that is derived **both before and after its tx** is refused and
answered with the host's value (§10.2). That catches a device that hadn't yet heard the clip joined the main track.

### 3.7 Z bands for the Simple editor's inserts (stacking stays the array order; nothing is reordered behind anyone's back)
New layers made **by the Simple editor** go in at the top of their band. From the top: **text/captions → overlays →
effects (adjustment) → main clips → sounds**. The insert point is found by scanning for the first layer of a lower band
(`FM.insertLayer`, `js/app.js:2880-2890`, with a computed `FM.addAt`). The Full editor can reorder anything, and the Simple
view simply shows the real order.

---

## 4. Attachments ("stuck to a clip")

### 4.1 Behaviour
- **What sticks by default in Simple:** anything added while a main clip is under the playhead sticks to that clip, at
  `off = playhead − clip.start`. That covers overlays, text, stickers/shapes, caption tracks, sound effects and voice
  recordings. **Music does not stick.** Imported songs go on the audio lane free, so cutting the video never drags the song
  (iMovie's background music, LumaFusion's unlinked track [pro §5]). This is where FreeMotion beats CapCut's phone app,
  which links nothing and leaves captions and overlays drifting after every cut [capcut §13.4].
- **It shows:** a thin line from the item's first frame down to its host clip, drawn only while either one is selected
  (Rush's yellow line [pro §2], LumaFusion's link line [pro §5]).
- **Moving the item** changes `off`. **Moving, trimming or reordering the host** carries the item. **Unstick** is on the
  item's tool strip in Simple and in its layer menu in Full.
- **Deleting a host** deletes what is stuck to it, with an Undo toast that names them. Keeping them instead is decision D5.
- **Splitting a host** re-sticks items past the cut to the second half (§3.4), so a later reorder of either half carries
  the right items.
- **Extract audio** (`js/app.js:1007`) makes the audio twin **stuck to its clip at off 0**. This is a small improvement:
  today the twin is a free duplicate.

### 4.2 Why stored and not inferred
Resolve's Cut page appears to infer "what's over what" at edit time [pro §4 inference]. That is tolerant, but "attached to"
changes silently when something is nudged over a different clip, and **inference can't be made deterministic across two
devices mid-edit**: each device infers from its own view. A stored `stick` is one field under LWW, visible and undoable.

### 4.3 Id remapping (the one id reference this design adds)
`stick.to` is remapped wherever `parent` is: `reIdLayers` (`js/storage.js:2044-2080`), duplicate (`js/app.js:4313-4360`)
and paste (`js/app.js:~4296`, `~4515`). A pasted or inserted item whose host is not in the same batch keeps its absolute
time and loses `stick`. That rule is the same as for a dangling `parent`, and it is tested (§10.10 T11).

### 4.4 Orphans (the host was deleted while someone was using the item)
The host invariant (§10.2) finds any `stick.to` that names no layer, or names a stuck layer. In the **same batch** it emits
`d stick` plus `s start = <the item's start in the host's base>`. The host's base holds the last derived start, because
derived starts are written into the base as fix ops (§10.2). Fix ops are applied straight to base, with no lease check
(`js/collab-host.js:708-713`), so the repair lands even while the item is being typed into. The item becomes free at
exactly the time it last played, and nothing jumps.

---

## 5. Opening a Full project in Simple, and back: a view, not a conversion

His question: *"whether we should allow you to turn a project that's already in the After Effects version into the Premiere
Pro version and so forth."* The precedents are plain [pro §c]: every two-format editor converts one way and loses things.
Resolve's two pages convert nothing. So:

- **Any project opens in either editor, instantly, with no change to the document.** Switching is a view.
- **A Full project with no main track** opens in Simple showing everything in its sections: clips in Overlays, text in
  Text, and so on. It has an empty main track and one card: **"Make a main track from these clips"** (decision D9).
- **"Make a main track" (adopt)** is an explicit, single, undoable step that **moves nothing**:

```js
FM.track.adopt(scene, {stickOthers: true}) {
  // 1. candidates: video/image, not parented, not stuck, not audio-only, visible, start >= 0
  // 2. choose the non-overlapping set with the most total length (weighted interval scheduling);
  //    ties go to the lower layer (higher array index = further back = more "base picture")
  // 3. in start order: main = {k: keyBetween(prevK, null), gap: r6(start - prevEnd)}   // gap >= 0 by construction
  // 4. if stickOthers: every other layer (not camera/null/group) whose start falls inside a chosen clip
  //    [s, s+dur) gets stick = {to: clip.id, off: r6(start - s)}; anything starting in a gap or before 0 stays free
  // → the layout re-derives EXACTLY the starts that were already stored. Nothing moves, nothing is lost.
}
```
  - Owner or editor only. When `C.othersHere()` (`js/collab-core.js:401-405`) it confirms "This changes the project for
    everyone", the same pattern as the canvas-size change [collab §9.4 K].
  - After adopting, the Simple view shows any gaps as blocks with a ✕. **"Close all gaps"** is a separate, explicit step.
- **Back to Full:** nothing to do. The Full editor honours `main` and `stick` (push instead of ripple, badges on main clips,
  the link line). **"Free everything"** in the Full editor's project menu removes `main` and `stick` from every layer and
  writes their current starts. It is one undoable step, it moves nothing, and afterwards the project is exactly today's
  model.
- **Guard for old builds editing offline** (the PWA updates itself, so this is rare). A new build stamps
  `project.sm.sig = hash(derived starts)` on save. On open, if the stored starts differ from the layout **and** `sig` does
  not match the stored starts, an old build moved clips freely. The new build then **re-adopts from the stored starts**
  (recomputes gaps and keys) instead of snapping them back. That turns a silent data loss into a no-op.

---

## 6. The switch UX

- **Where** (decision D3): a two-segment pill **Simple | Full** floating at the **top-left of the stage**, on phone and PC
  alike. That is one tap and always visible. It stays off the phone top bar, which is full: queue 139 says any extra
  control pushes the cog into the delete bin's spot [ui §7]. It is repeated in the cog's canvas dialog (`#canvas-dialog`,
  `index.html:957-1041`), next to Friends, and on PC it has a key (Ctrl/⌘+E).
- **What it does:** it sets `body.ed-simple`, stores `fm.editor.<id>`, re-renders the timeline panel and the inspector, and
  sends presence. **No document change, no undo step, no autosave.**
- **What carries across:** the playhead (the fixed centre line is shared, `#tl-centerline`), play state, zoom (mapped by
  seconds visible), undo and redo, and the selection if the selected layer has a home in the target view. If it doesn't
  (a camera, say), selection clears and the "Full-editor items" chip pulses once.
- **What closes first:** an open text editor is flushed (`FM.textEdit.flush`), and any exclusive tool is closed, which
  releases its lease. The pill is disabled while a pointer is down or a gesture is running (`bridge.interacting()`,
  `js/collab-bridge.js:153-163`).
- **Feel** (#373 "clean animation", #612 hinge): the per-layer rows fold into their section lanes and the main clips slide
  together into one filmstrip row, about 280 ms, and the reverse on the way back. Per #974 ("make them all happen … random"),
  the build can ship two or three morphs at random for him to judge in use.

---

## 7. The start flow and choosing the mode

**New project** (`#hm-dialog`, `index.html:711-767`; `createFromDialog`, `js/home.js:2893-2909`):

```
┌──────────────── New project ────────────────┐
│  ┌─────────────────┐   ┌─────────────────┐  │
│  │ [clip▦][clip▦]  │   │  ▭ ▭    ◯       │  │   two big picture cards
│  │  ═══════════    │   │ ═══  ══  ═══    │  │   (drawn, not described: #929)
│  │   Simple        │   │   Full          │  │
│  │ Clips in a row, │   │ Layers anywhere │  │   one line each, no more (#294)
│  │ text, captions  │   │ keyframes, 3D   │  │
│  └─────────────────┘   └─────────────────┘  │
│  Size: 9:16 · 16:9 · 1:1 · 4:5   (as today) │
└─────────────────────────────────────────────┘
```

- **Simple → the media picker straight away** (multi-select; clips land in the order picked, numbered badges), then the
  Simple editor with the main track filled. This is CapCut's flow [capcut §3]. Cancelling the picker still opens an empty
  Simple project whose main track is one big "+ Add clips" (#326: the obvious, big start).
- **Full → today's flow** unchanged.
- The last choice is pre-selected next time (decision D2). `FM.projects.create(opts)` (`js/storage.js:2540`) takes
  `opts.editor` and writes `project.sm = {v:1, home}` plus the index `editor` field.
- **Templates** open in the editor they were saved from (`project.sm.home` travels in the pack, `js/storage.js:3024-3047`).
  "Insert your media" (`js/template-fill.js`) is the way in for someone who has never edited [prefs §5].
- **Home cards** get a small chip (a filmstrip glyph for Simple) beside aspect · res · fps (`js/home.js:1375-1379`). The ⋯
  menu gains "Open in Simple / Open in Full".

---

## 8. The Simple editor on phone and PC

### 8.1 Where it mounts [ui §5 option A]
A sibling `<div id="sm-timeline">` beside `#timeline` inside `#timeline-panel` (`index.html:591`), switched by
`body.ed-simple`. `FM.timeline.rebuild()` (`js/timeline.js:5210`, 90 callers) and `updatePlayhead()` dispatch to
`FM.simpleTimeline` while the class is on. The stage, canvas handles, transport, text editor, effects browser, export,
canvas dialog and collab chrome are all shared.

### 8.2 Phone (≤700px)

```
┌─────────────────────────────────────┐
│ ‹  My trip            ?  ✎  ⚙ Export│  top bar: unchanged
├─────────────────────────────────────┤
│ (Simple|Full)                    ▐▌ │  switch pill, top-left of the stage
│                CANVAS               │  drag / pinch / rotate the selected item (canvas-edit, as today)
│                  ●Sam               │  a friend's cursor, as today
├─────────────────────────────────────┤
│   ▶  00:03 / 00:15          ↶  ↷  ⛶ │  transport; the complex left cluster is hidden
├─────────────────────────────────────┤
│ T   ──   ───                        │  folded lanes: thin coloured lines (CapCut's "one open category"
│ ▣   ─────                           │   trick [capcut §2.7]); tap a line to unfold that lane
│ ┃[▦▦clip1▦▦]▫[▦clip2▦]▫[▦▦clip3▦][+]│  MAIN TRACK: tall filmstrip; ▫ = the cut (transitions later);
│ ♪   ~~~~~~~~~~~~ song ~~~~~~~~~~~~  │   [+] = add clips at the end
│ Cc  ▭▭ ▭▭▭    ▭▭                    │  captions
│                 │                   │  fixed centre playhead (shared)
├─────────────────────────────────────┤
│ ⊕Clips  T Text  Cc Captions  ♪ Audio  ▣ Overlay  ◐ Filters  ⧉ Ratio ▸│  project tools, scroll sideways
└─────────────────────────────────────┘
```

With a main clip selected, the bottom strip becomes that clip's tools, and **its first button is always "‹ Tools"** so the
project tools are never lost. That avoids CapCut's worst trap, "if you can't find a tool, tap an empty area to deselect"
[capcut §4]. Tapping empty timeline also deselects.

```
│ ‹ Tools  ✂ Split  ⏩ Speed  🔊 Volume  ◐ Filters  ✦ Effects  ⬒ Crop  ⇄ Replace  ⧉ Duplicate  ↥ To overlay  ⟲ Reverse  ♪ Extract audio  🗑 Delete ▸│
```

Tool panels open as the existing bottom sheet, docked under the timeline (`dockSheet`, `js/mobile.js:271-294`). Speed,
Volume, Filters and Effects reuse the existing builders through `FM.inspector.openCategory('speed'|'volume'|'filters'|'effects')`
(`js/inspector.js:6818`).

Gestures on the main track: **tap** selects; **hold 350 ms and drag** reorders, with the others parting to show the slot
(the existing hold threshold, `js/timeline.js:2190-2240`); the **edge grips** ripple-trim with a length readout; **pinch**
zooms. Dragging a main clip **up** into the overlay lane is "To overlay", and dragging an overlay **down** onto the main
track is "To main track". Both are also buttons, so neither is hidden behind a gesture (CapCut buries this [capcut §13.5]).

### 8.3 PC (≥701px), the same tools in the same order, laid out for the screen (#852)

```
┌──────────────────────────────────────────────────────────────────────┐
│ (Simple|Full)                    CANVAS                           ▐▌ │
├──────────────────────────┬───────────────────────────────────────────┤
│ ⊕ Clips     T Text       │ ‹ ▶ 00:03 / 00:15  ↶ ↷      v ? ✎ ⚙ ⇪ ⛶  │
│ Cc Captions ♪ Audio      │ T   [Title──]      [Name──]               │  lanes UNFOLDED: the PC
│ ▣ Overlay   ◐ Filters    │ ▣       [pip ▦▦▦]                         │   has the height
│ ⧉ Ratio     ▢ Background │ ┃[▦▦clip1▦▦]▫[▦clip2▦]▫[▦▦clip3▦▦]  [+]   │
│                          │ ♪ ~~~~~~~~~~~~~~~ song ~~~~~~~~~~~~~~~~   │
│ (tool panel opens here)  │ Cc ▭▭ ▭▭▭    ▭▭                            │
└──────────────────────────┴───────────────────────────────────────────┘
```
The inspector band (`#inspector-panel`) shows the tool grid when nothing is selected, where the Add menu mounts today
(`js/inspector.js:6904-6919`). With a clip selected it shows that clip's tools, in the same order and with the same names as
the phone strip. Keys: S split, Delete ripple-deletes, Ctrl/⌘+D duplicates, arrows step one frame, Ctrl/⌘+E switches editor.
The complex keys (1–5 Add tabs, A/S/D clip keys, `js/app.js:8761-8814`) are rebound or off in Simple.

### 8.4 The feature list against CapCut's (Core = the first shippable Simple editor; Later = a later phase; Never = not in Simple)

| CapCut | FreeMotion's route for Simple | Tier |
|---|---|---|
| Magnetic main track, clips in pick order | `main` + layout (§3) | **Core** |
| Trim edges (ripple), split, delete (ripple), reorder by hold-drag | §3.4 | **Core** |
| Undo / redo | shared `FM.history` / collab undo | **Core** |
| Speed (normal) + pitch | inspector `speed` (pitch follows speed, per #916) | **Core** |
| Speed curves (Montage, Hero …) | presets over the existing ramps (`js/inspector.js:5756`) | Later |
| Volume, mute, audio fade | inspector `volume` | **Core** |
| Duplicate, replace, crop/rotate/mirror, reverse, extract audio | existing (`js/app.js:1004/1007/4658/5197`, `crop-tool.js`) | **Core** |
| Filters + intensity + apply to all | `FM.filters` (`js/filters.js:563-627`) + a thumbnail strip; "apply to all main clips" loops over the track | **Core** |
| Adjust (one slider panel) | one sheet driving a fixed stack of existing colouring effects | Later |
| Effects | the effects browser, with the 3D, Keying and Repetition categories hidden in Simple | **Core** (curated) |
| Transitions at a cut (the ▫) | new: `main.tr = {type, d}` on the clip after the cut, rendered as a cross-blend using frames past each clip's ends | Later (phase 5) |
| Clip In / Out / Combo animations | new presets on video/image, built like `textAnim` | Later |
| Freeze frame | split + a still grabbed from the frame, inserted as a main clip | Later |
| Text: add, style, move on canvas | `FM.addTextLayer` + `FM.textEdit` (sticks to the clip under the playhead) | **Core** |
| Text In animations / Out / Loop | In exists (`js/compositor.js:2592-2601`); Out/Loop are new | Core (In) / Later |
| Text templates | the user's saved elements (`js/elements-browser.js`) | Core (own) / Later (shipped set) |
| Captions: manual cues, timing detection | caption track (`js/captions.js`), `detectRow` (timing only, `js/captions-vad.js:4`) | **Core** |
| Auto captions that write the words | needs speech-to-text, which isn't local today (#152: better nothing than a bad version) | Later |
| Overlay (PiP) + blend + opacity | a stuck `video`/`image` layer; Mixing (`js/inspector.js:5909-5935`) | **Core** |
| Stickers | shapes + Sketching + custom elements | Core (own) / Later (library) |
| Audio: import, sound effects, record voice | `js/sfx.js`, `js/voice-rec.js`, import | **Core** |
| Music library, beats markers, noise reduction | none in the engine | Later |
| Ratio | canvas dialog aspect chips | **Core** |
| Background: colour | canvas dialog | **Core** |
| Background: blur / image | a one-tap "Fill Behind" on every main clip | Later |
| Templates (fill the slots) | `js/template-fill.js` | **Core** |
| Keyframes (the diamond) | Full is one tap away | Never in Simple |
| Masks, chroma key | effects / `mask-tool.js` from the clip strip "More" | Later |
| Remove BG, stabilise, retouch, auto reframe, body effects, camera tracking | not in the engine | Never, unless the engine gains them |
| Overlay cap of 6, branded ending, paywall badges | CapCut's business, not a feature | Never |

---

## 9. Full-only content seen in Simple

Rule: **the preview always shows everything** (#392: the preview must not lie about the export). Simple never hides a
pixel. It limits what you can **change**, and says where to change it, in one line.

| Content | Shown in Simple as | What Simple can do to it |
|---|---|---|
| Group (with members) | one block in its lane, "Group · 3", with a small Full mark | move and trim in time (the existing group move), delete, duplicate. Its inside: "Open in Full" |
| Null / controller, camera | a chip under the lanes: **"Full-editor items (2)"** | nothing. The chip lists them; tapping one switches to Full with it selected |
| Adjustment layer | the Effects lane | move, trim, delete, stick or unstick |
| A parented layer | in its lane | everything except canvas transform, which uses the existing parent-aware handles |
| Keyframed properties | a small ◆ on the clip; the matching Simple control shows "Animated — edit in Full" instead of a slider | the rest of the clip's tools |
| Pro effects (3D, keying, repetition …) | listed in the clip's Effects sheet | switch on or off, remove; "Edit in Full" for their settings |
| Speed ramp | a "Curve" badge; the Speed sheet shows "Custom curve (Full)" | reset to a plain speed |
| Masks, clipping-mask blends, order-dependent effects | as they render | nothing that changes the z-order. Simple only inserts at band tops, so it never reorders |
| Main clip moved above overlays in Full | still on the main track, with a small "on top" mark | as normal |
| Markers, loop region | on the ruler, read-only | nothing |

---

## 10. Collaboration across the two modes (the lens)

### 10.1 What each side sends (no new op kinds)
The grammar stays the eight ops (`js/collab-core.js:116-120`). Simple and Full both mutate `FM.scene` and commit, and the
observer diff sends the difference, as spec D2 requires. What changes is **what the difference contains**. The derived
start is never in it (§10.2), and keyframes are relative (§3.3).

### 10.2 Host and session rules (the new pieces)
1. **Derived-start path rule** (`js/collab-path.js`, beside `syncable`): `L/<id>/start` is **not emitted by any device's
   diff** when the layer is derived (it has `main`, or a live `stick`) in **both** base and live. Detaching (`d main` +
   `s start`) still sends start, because live is no longer derived.
2. **Host layout invariant.** `bridge.invariants()` (`js/collab-bridge.js:142-150`) gains `doc: FM.track.layoutOn`. It runs
   in `invariantFix` (`js/collab-host.js:695-715`) whenever an accepted op touched `main`, `stick`, `duration`, `trimStart`,
   `speed`, or a structural op (`li`/`lr`/`mv`). Its output (derived starts plus orphan repairs, §4.4) goes out as
   **`fix` ops in the same batch** and is applied straight to base. Fix ops never pass the lease gate (`:708-713`).
3. **Guests apply derived-start fix ops to base only, never to live.** Live is always laid out locally
   (`bridge.normalizeDerived` runs `FM.track.layout` first, `js/collab-bridge.js:131-139`). So a guest with a pending edit
   of its own never flickers to the host's not-yet-updated value. The owner's own diff also never emits them, which is
   why the owner's edits can't be refused by a guest's lease on a clip they merely shift (the trap in [collab §9.4 C]).
4. **The host refuses `s L/<id>/start` on a layer derived before and after its tx**, answered with the host's value
   (`currentStateOps`, `js/collab-host.js:751-795`). The sender's device lays it out again, and a toast says "That clip is
   on the main track now".
5. **Sanitiser shape rules** for `main` and `stick` (§2.1) in `sanitizeImportedLayers` (`js/storage.js:1633-1646`). They
   already run on the host's clones (`inv.layer`).
6. **Version gate.** Clip time on the wire changes what a `kf` value means on the wire. The `KEYED`/`ATOMIC` tables and
   this rule are **not** covered by the schema fingerprint [collab §3], so this needs **`SCHEMA_REV` 2 → 3 by hand**
   (`js/collab-core.js:29`). Also add a main track with two stuck items to `DERIVED_FIXTURE` (`js/collab-core.js:177-188`)
   so a future change to the layout moves the fingerprint by itself. A mixed room is refused at the door with today's
   "update the app" message.

### 10.3 Every cross-mode case, worked

S = a Simple user, F = a Full user, same project, live. Clips on the main track are C1…C6.

| # | S does | F does, at the same moment | What travels | Result on every device |
|---|---|---|---|---|
| A | trims C2 shorter by 1 s | nothing | `s L/C2/duration` | C3…C6 slide 1 s left. Their stuck items and animation come with them. 1 op. |
| B | trims C2 | trims C4 | two `s duration` | both apply; the layout sums them; C5–C6 move by both. **Either order gives the same result.** |
| C | trims C2 (ripple) | **moves C5** in Full (slide into its gap) | `s C2/duration`; `s C5/main/gap` (+ `s C6/main/gap`) | C5 keeps the gap F gave it, **measured from C4's end**, wherever C4 now is. No overlap is possible. |
| D | trims C2 | **trims C4's end** in Full (push rule) | `s C2/duration`; `s C4/duration`, `s C5/main/gap` | the same as C: commutes. |
| E | inserts a clip after C3 | deletes C4 in Full | `li X {main.k between C3,C4}`; `lr C4` | X sorts after C3; C4 is gone; C5 follows X. Neither anchor is needed. (Today an `li` whose anchor is deleted goes to index 0, `js/collab-diff.js:131-134`.) |
| F | trims C2 (ripple: C5 moves +0 → −1 s) | **adds a keyframe to C5** (scale at its 2.0 s mark) | `s C2/duration`; `s L/C5/transform/scale/kf` in **relative** form | Host order S→F: C5 moves, then F's relative list lands at C5's new start → the key sits at C5+2.0. Order F→S: the key lands at the old start + 2.0, then the layout moves C5 and shifts its keys → C5+2.0. **The same either way.** (Today: the whole list is last-writer-wins and the animation is left 1 s away from its clip.) |
| G | reorders C5 before C2 | selects C5 and drags its opacity slider | `s C5/main/k`; `s C5/transform/opacity` (held on F's device) | independent fields. F's slider never jumps; C5 moves in time under F's playhead, and F's playhead goes with it (§10.5). |
| H | reorders C5 | reorders C5 somewhere else | two `s C5/main/k` | last to let go wins, as today. Presence showed both of them holding C5. |
| I | inserts into the C3/C4 cut | a second Simple user inserts into the same cut | two `li` with keys between C3 and C4 (different random suffixes) | both kept, in one deterministic order (by key, then id). |
| J | trims C2 | **has the crop tool open on C5 (a lease)** | `s C2/duration` | accepted. C5 moves in time; its crop is untouched. F's playhead is re-anchored so the frame F is cropping stays on screen (§10.5). F sees one quiet line: "Sam trimmed an earlier clip". **No refusal toast for S about a clip S never touched.** (Today: S's starts on C5 are refused, C5 stays put, the others slide over it [collab §9.1 row 5].) |
| K | deletes C5 | has the mask tool open on C5 | `lr C5` refused by the lease (`js/collab-host.js:871-872`) | **nothing moves**, because there were no separate start ops to land in part. S gets the existing "Sam is editing this — Delete anyway" (`js/collab-session.js:1660-1684`). |
| L | deletes C4 (and what is stuck to it) | is typing in title T, stuck to C4 (the text lease) | `lr C4` ok; `lr T` refused by the lease | host invariant: T is orphaned → `d T/stick`, `s T/start = last` in the same batch. T stays exactly where it was, now free. S gets "Kept Sam's title — they're editing it". |
| M | drags C3 up to the overlay lane ("To overlay") | edits C3's effect | `d C3/main`, `s C3/start`, `s C3/stick`, `mv C3`; F's effect op | independent paths; the effect edit lands on the overlay. The main track closes up. |
| N | nothing | in Full, uses "Put on main track" on free clip V | `s V/main {k, gap}`, and V's start is no longer sent | V joins the track at the slot its start fell into; S's timeline shows it arrive; it pushes if it lands mid-clip. |
| O | nothing | F drags free text Q over C2 and uses "Stick to the clip under it" | `s Q/stick` | Q now rides with C2 for everyone. |
| P | nothing | F moves **C3's z-order** above the overlays (`mv`) | `mv C3` + `ord` | stacking only. Its place on the track is unchanged (independent axes [collab §9.1 row 8]). |
| Q | presses Undo (her last ripple trim) | has since moved C5's gap | S's inverse: `s C2/duration` back | only C2's length reverts; C5 keeps F's gap; the layout re-derives. **No holes.** (Today undo soft-skips the one clip F touched and leaves a gap or overlap [collab §9.1 row 7].) |

### 10.4 Leases, precisely
- **What a lease protects:** the layer's own authored fields (content, look, length, order key, gap, stick offset). That is
  unchanged: every op on the layer from anyone else is refused (`js/collab-host.js:834,871-872`).
- **What a lease does not protect: the layer's derived start.** It isn't an op, so there is nothing to refuse. A leased
  main clip still shifts in time when someone edits an earlier clip. **This is the design's one deliberate change of
  meaning**, and it is right: a lease exists so two people's hands don't fight over one layer's contents, not to freeze
  the whole video behind someone's crop tool.
- **Simple-editor tools that take a lease** are the existing ones: the text editor, crop, mask and point tools
  (`LEASED`, `js/collab-presence.js:193-203`). Arranging, trimming, splitting and deleting take none. They rely on
  held/deferred and last-to-let-go-wins, as every Full gesture does today.
- **Before sending, a Simple command checks the roster's leases** (`ls` in `hostRoster`, `js/collab-presence.js:509-530`)
  for every layer it will write. Split writes C and its stuck items, for example. It greys out with the holder's name
  instead of sending a half-refusable tx. So in practice partial landing happens only in real races, and §3.1's totality
  keeps even those valid.

### 10.5 "Keep my frame": no jump under the eye
When a remote batch changes the derived start of **the layer this device has a tool open on, or its primary selection
while the playhead is inside it**, the session shifts `FM.time` by the same Δ (not while playing, not while following
someone). The timeline scrolls with it. The frame being worked on stays still, and the ruler slides. That is the
time-domain version of held/deferred, done in `onBatch` after apply (`js/collab-session.js:888-907`), and it is local
view state only.

### 10.6 Presence: each person's mode and what they are touching
- **New field `ed: 's'|'f'`** in `sample()` (`js/collab-presence.js:236`) and `cleanPr()` (`:280`), and `ed` in the roster
  (`hostRoster`, `:509`). `cleanPr` rebuilds objects field by field, so the field is safe.
- **New `act` values:** `'arrange'` (hold-dragging on the main track) and `'stick'` (dragging an item's offset). `af` (the
  first held path) then reads, for example, `L/C5/main/k`.
- **Drawn:**
  - **People chip:** each face carries a tiny editor glyph (filmstrip = Simple, layers = Full), plus the existing colour
    and role.
  - **In Simple:** a remote person's selection outlines the clip or lane item in their colour, with their initial. A Full
    person's selection of something with no home in Simple (a null, a camera) puts their dot on the "Full-editor items"
    chip. `act:'arrange'` from anyone shows their clip lifted in their colour, "Sam is moving this".
  - **In Full:** main clips carry a thin rail mark, and a Simple person's `arrange`/`trim` on one outlines it with "Sam ·
    main track". Stuck items show their link line while either end is selected, locally or remotely.
- **Follow / Watch along** (`js/collab-presence.js:1274-1311`) mirrors the playhead and play state only, as today. It works
  across editors, because time is shared.
- **Toasts:** none for ordinary ripples by others. One quiet, throttled line when a remote edit moves the thing you are
  working in (§10.5). Refusals as today.

### 10.7 Roles
No change and no mode-based permission. Owner, editor, commenter and viewer (`js/collab-host.js:31`) apply the same way in
both editors. A viewer or commenter can open either editor read-only (`C.readOnly`, `js/collab-core.js:374-395`); the new
Simple doors carry the same `roNow()` gate as `openAdd` (`js/mobile.js:399-402`). "Ask to edit" works in both. A "Only I
arrange the main track" owner switch is possible (a host role rule on `main/*` and main-clip `duration`) and is decision D7
(recommended: no).

### 10.8 Switching modes mid-session
- It is local only (§6). Presence `ed` updates on the next frame. Nothing in the document changes.
- An open exclusive tool closes first, so its lease is released (the existing tool-close path). The text editor is flushed
  so the typing becomes its own undo step (`js/history.js:309-326`).
- Held gestures can't span a switch: the pill is disabled while `interacting()`.
- The other person sees the glyph flip, and nothing else.

### 10.9 The non-interference guarantee, stated precisely
For any project, any set of members each in either editor, and any interleaving the host sequences:
- **(G1) Convergence** (as today): every device ends with a byte-identical base, and with an identical live layout (the
  layout is a pure function of base).
- **(G2) Validity:** after every batch, on every device, the main track has no overlaps, and every gap is one that some
  person made on purpose (a `main.gap` somebody wrote). This holds under partial refusal, stale undo and old-build edits,
  because §3.1 is total.
- **(G3) Free layers are untouched by the track:** a layer with neither `main` nor `stick` changes `start` only through an
  op that writes its own `start`.
- **(G4) Relationships are preserved:** for every stuck layer, `start − host.start = stick.off`. For every keyframe on
  every layer, `t − layer.start` equals what its last writer set. That is true for every device and every order.
- **(G5) Nothing moves under a finger:** a value this device is dragging is never overwritten mid-gesture (the existing
  held/deferred rule, `js/collab-session.js:515-520`). A clip this device is working in keeps its frame under the playhead
  (§10.5).
- **(G6) Not guaranteed, and said plainly:** two people writing **the same field** resolve last-to-let-go-wins. A delete
  beats an edit. A delete of a host takes its stuck items (D5). Presence shows these coming.

### 10.10 Tested with no network (the 921 fake net)
All of these run inside `withFakeNet921` (`tests/tests.js:36674`): fake sockets, in-page WebRTC with `iceServers: []`. They
are named `921 S9 …` so `?only=921` still runs every collab test, and tagged with the simple-mode request's number once it
has one. Each one is also run at `--width 380`.

| id | test | catches |
|---|---|---|
| T1 | **Clip time round trip:** 200 seeded kitchen-sink scenes with random starts: diff → apply reproduces the live **absolute** keyframes exactly, and base holds relative ones. Extends `921 S1 diff then apply…` (`:29393`) | a conversion site missing |
| T2 | **Ripple ⟂ keyframe, both orders:** S trims C2 while F adds a key on C5; run it with S first and with F first; the key sits at the same clip-relative time on all three devices, and the track is contiguous | case F |
| T3 | **"A start writer forgot the keyframes" detector:** mid clip-drag (Full), a hot-tick diff emits `start` only; plus a generic assertion hook in the diff for the fingerprint of a forgetting writer (`start` Δ with every list moved −Δ) | §3.3's one obligation (it would have caught `js/timeline.js:5073`) |
| T4 | **Ripple past a lease:** F holds a mask lease on C5; S trims C2; no refusal for S; C5 moved; F's mask path unchanged; F's `FM.time` moved by Δ | cases J and §10.5 |
| T5 | **Leased delete moves nothing:** S deletes C5 while F holds it → refused; every start is unchanged | case K |
| T6 | **Orphan repair:** S deletes C4 while F types in T, stuck to it → T survives, free, at the same absolute time, on every device | case L, §4.4 |
| T7 | **Same-gap inserts:** two Simple guests insert into one cut in the same tick → both kept, the same order everywhere, and the order is stable across a snapshot rejoin | case I |
| T8 | **Full slide / push never snaps back:** F drags C3 right into C4's gap and then past it, with hot ticks running → the live start is never reverted mid-drag; the final gaps are as the rules say | §3.5–3.6 |
| T9 | **Undo, no holes:** S ripple-trims, F then slides C5, S undoes → only C2 reverts; the layout is contiguous; no "left alone" toast | case Q |
| T10 | **Offline replay:** S goes offline, makes 20 simple edits, and comes back while F edited → CAS on the small fields; clashes counted; the track is valid after the merge | §10.11 |
| T11 | **Id remap:** paste or duplicate a clip with a stuck title, with and without its host in the batch | §4.3 |
| T12 | **Fuzz:** a host and three guests (two Simple, one Full), 300 seeded rounds of random commands from BOTH command sets, plus drops, role changes and rejoins. After each round: G1 (hash), G2 (`start == layout(base)` and no overlap), G3, G4 | everything, together |
| T13 | **Schema gate:** a `SCHEMA_REV 2` peer is refused (extends `921 S1 the schema fingerprint gate`, `:30320`) | a mixed room |
| T14 | **Presence:** `ed` round-trips; an unknown value is dropped by `cleanPr`; the chip shows the glyph | §10.6 |
| T15 | **Tier 3:** real app frames on `h.`/`a.`/`b.localhost` with `?fmtest=collab` (`tools/serve.sh`), one in Simple and one in Full, doing cases A, F and J through the real UI | the whole path |
| T16 | **Performance:** the layout on 500 main clips + 500 stuck items under the 4× CPU throttle (`921 S8 a 500-layer project…`) inside the hot-tick budget on a phone | tick cost |

Each ships with its mutation proof (`tools/prove.sh`), for example: turn the relative conversion off → T1/T2 fail; drop the
id tie-break → T7 fails; let derived starts through the diff → T4 and T8 fail. Every negative test gets its positive control
first (memory: "a negative test needs a control").

### 10.11 Failure and offline
- **A guest offline:** it edits into the outbox as today (≤5000 ops, `js/collab-session.js:971-992`). On reconnect each op
  is CAS-checked against the value its author saw (`q:1`, `js/collab-host.js:350-387`). Simple edits are small fields
  (`duration`, `main.k`, `gap`), so a clash means **someone really changed the same thing**. The existing "save my version
  as a copy" applies. An offline insert whose neighbours changed still sorts correctly, because it needs no anchor.
- **The owner offline:** star topology, no migration, as today. Guests keep working offline.
- **A dropped batch / a gap in `seq`:** snapshot, as today. The layout is re-run after the in-place snapshot diff.
- **Divergence backstop:** the hash covers base, and base includes the host-written derived starts. In test builds, a
  guest also compares its live layout with its base once quiet and fails loudly on a mismatch. In the app it reports once
  and takes a snapshot.
- **An old build offline, reconnecting:** refused by `SCHEMA_REV`. Its local copy keeps the edits, and §5's `sig` check
  re-adopts if it is opened later.
- **A tx refused in part** (a lease or role on one of its layers): whatever lands is valid (G2), and the refused ops are
  answered with the host's values as today.

---

## 11. Undo

- **Solo:** one snapshot stack (`js/history.js:25-29`) across both editors. Switching is not a step. Each commit gets a
  short label and the editor it was made in: `FM.history.commit({label:'Trim', ed:'s'})`, an optional argument at
  `js/history.js:275`. So Undo in Simple of something made in Full says so: "Undid: camera move (made in Full)". Adopt
  and Free everything are single steps.
- **In a session:** per person, as today (`js/collab-session.js:1078-1230`). Because a ripple is one field, **undoing a
  ripple is one field**, and the soft-skip holes of the naive design disappear (case Q). A reorder undo puts back one
  `main.k`, never the whole list. A structural undo that can't be honoured fails whole with "Can't undo — Sam changed it
  since", as today.
- **A person's stack spans their mode switches.** Undo in Simple can undo their own earlier Full edit, and it is labelled.
- **Cross-person:** S undoing an insert after F stuck a title to the inserted clip → the clip goes and the title becomes an
  orphan → the host repairs it (§4.4): "Kept Sam's title".

---

## 12. Export, templates and captions

- **Export** reads `start` from `FM.scene` as today. `FM.exporter` (`js/exporter.js:1159`) calls `FM.track.layout()` first,
  so a stale cache can never reach a file. The export dialog hides "Export just this layer" and "Selected clip only" in
  Simple. The preview equals the export because the layout is one function used by both.
- **Templates:** `main`, `stick` and `project.sm` are plain keys, so the pack keeps them (`js/storage.js:3015-3055`).
  `reIdLayers` remaps `stick.to`. **Inserting a template:**
  - into a project **with** a main track: the template's main clips go into the track after the clip under the playhead,
    with fresh keys, and their stuck items come too;
  - into one **without**: the first main clip gets `gap = playhead`, so the template's track starts where it was inserted
    and nothing jumps to 0 (`js/storage.js:3333-3345`, `3608-3625`).
  - "Insert your media" swaps media into main-clip slots, and the slots keep their length (CapCut's Replace).
- **Captions:** the Captions tool makes **one caption track per spoken main clip, stuck to it**, so cutting the video
  carries the words. That is the gap CapCut leaves open [capcut §2.3]. Cues stay clip-local (`js/captions.js:35-37`).
  Splitting a clip splits its caption track (§3.4). Detection finds timing only (`js/captions-vad.js:4`); the words are
  typed. Speech-to-text is Later, and only if it can run on the device (#921 "no servers").

---

## 13. Edge cases

1. **Ties:** equal `main.k` → id order. Equal starts can't happen on the track.
2. **Group containing main clips (made in Full):** members stay on the track, and the layout moves them. The group's span is
   refitted by `FM.refitGroupsFor` (`js/app.js:809-850`) at commit, not as a derived write, so a deliberate group trim is
   kept. Hole-poke: whether a stale span during a remote ripple misleads the Full timeline.
3. **A main clip parented to a null:** allowed. Parenting is transform, the track is time.
4. **The inspector's type-a-start** (`js/inspector.js:3466`) on a main clip → translated to `full.slide`; on a stuck item →
   `off`.
5. **A clip dragged before 0 in Full:** on the track the gap clamps at 0; stuck items may sit before 0, as free ones can.
6. **Audio-only clip on the main track** (put there in Full): allowed, and drawn with a waveform. Simple never puts audio
   there itself.
7. **A text layer on the main track** (a title card): allowed from Full; Simple shows it as a card. A "title card" tool is
   Later.
8. **Stuck item longer than its host, or past its end:** allowed. It plays on; the line shows the link.
9. **The host is split while someone sticks something to it at the same moment:** that item stays on A with `off >
   A.duration`, at the same absolute time. It is deterministic and nothing jumps. If B is later reordered, the item stays
   with A, and a split step re-sticks only what it saw.
10. **Delete with a gap before it** → the gap passes to the next clip (§3.4). "Close gap" is explicit.
11. **Delete of the last main clip:** the track is empty, Simple shows "+ Add clips", and overlays keep their absolute times
    (they become orphans → free).
12. **3600 s cap:** a ripple can't push the project past the `autoFitDuration` clamp (`js/storage.js:1016`). The layout
    doesn't clamp; the command refuses with "That would make the video longer than an hour".
13. **Speed change on a clip with stuck items:** offsets are in project seconds, so items keep their offset from the clip's
    start and don't scale with it. That matches CapCut desktop linkage and FCP.
14. **Reverse:** length unchanged, nothing moves.
15. **A guest before the media arrives:** `duration` is synced, so the layout is right; the filmstrip shows a placeholder.
16. **2000-layer cap:** the host refuses `li` past it (`js/collab-host.js:565`); Simple's add shows the same message.
17. **Paste into Simple:** pasted clips go onto the track after the selection (or append); pasted overlays stick to the
    clip under the playhead.
18. **Duplicate in Full of a main clip** (`js/app.js:4313`): in place as today → the copy **drops `main`** and becomes a free
    overlay copy at the same time. In Simple, duplicate → after the original on the track.
19. **Extract audio twin** (`js/app.js:1007`): it must not copy `main`; it becomes stuck at off 0 (§4.1).
20. **Markers, loop in/out, comment pins:** absolute times, not moved by a ripple (CapCut doesn't move them either). A clip
    comment (`lid`) could store a clip-relative time later.
21. **Two tabs on one device** (the `rev` guard, `js/storage.js:50-133`): unchanged; the layout is local to each.
22. **A negative-start free clip** (supported, `js/storage.js:1565-1580`): untouched.
23. **Switching during export:** the switch is disabled while exporting (`act:'export'`).
24. **A project opened by an old build offline:** §5 `sig` re-adopt.
25. **Hot ticks on projects with more than 12 layers** only diff hot layers (`js/collab-session.js:175-186`). That is no
    longer a problem for ripples, because derived starts don't travel and the host lays out its own base.
26. **Behaviours' time basis** is unverified [model §5]. If behaviours read absolute time, a ripple shifts their phase.
    Hole-poke item.
27. **Keyframes inside caption cues' effects** travel inside the atomic `captions` value and aren't converted. If they are
    absolute, the same hole as today. Hole-poke item.

---

## 14. Code plan

### 14.1 New files (plain `<script src>`, no build, globals on `FM`)

| file | what | about |
|---|---|---|
| `js/track.js` | the model: `layout`, `keyBetween`, `isDerived`, sanitiser shape rules, `adopt`, `freeAll`, `orphans`, Simple commands (§3.4), Full commands (§3.5), band insert (§3.7), `sig` | 700 lines |
| `js/simple-timeline.js` | the Simple timeline: the main filmstrip, lanes (packed on the fly), folding, gestures (tap / hold-drag / grips / pinch), the link line, gap blocks, presence overlays. Reuses `timeToX`, `drawFilmstrip`, `drawWaveform` and `clipColorOf` once exported from `js/timeline.js` (`:990`, `:961`, `:493`, `:4359`) | 1800 lines |
| `js/simple-ui.js` | the switch pill, project and clip tool strips (phone) and grids (PC), tool sheets that call existing builders, "Full-editor items" chip, adopt card, keys | 900 lines |

### 14.2 Changes to existing files

| file:line | change |
|---|---|
| `index.html:591` | `#sm-timeline` beside `#timeline`; the pill over `#stage`; three `<script>` tags; bump every changed `?v=` (ship.sh refuses otherwise) |
| `styles.css` | `body.ed-simple` blocks at both breakpoints (`:3826+` phone, `:6275+` PC) |
| `js/app.js:852-880` | `autoFitDuration` runs after `FM.track.layout` |
| `js/app.js:878-907` | `refreshAll`: layout first; dispatch to the Simple UI while `ed-simple` |
| `js/app.js:1007` | `extractAudio`: the twin drops `main` and gets `stick {to: source, off: 0}` |
| `js/app.js:2880-2890, 2972-2999` | `insertLayer` / `addMediaLayer`: in Simple, band insert + append/insert on the track instead of "at the playhead, stacked" |
| `js/app.js:3677` | `deleteLayer`: in Simple, the ripple rule (gap hand-on) + delete stuck items (D5) |
| `js/app.js:4313-4360, ~4296, ~4515` | duplicate / paste: remap `stick.to`; the Full duplicate drops `main` (edge 18) |
| `js/app.js:4855` | `splitLayer`: B's `main.k`; re-stick items past the cut; split a stuck caption track |
| `js/app.js:5147` | `layerMenuItems`: Put on / Take off main track · Stick / Unstick |
| `js/timeline.js:4110` | `applyClipMoveAt`: main/stuck layers go through `FM.track.full.slide` / `off`; free layers shift keyframes **per move** (§3.3) |
| `js/timeline.js:5068-5080` | move commit: no end-of-drag keyframe shift (it already happened); commit as today |
| `js/timeline.js:3842, 3929-3960` | trims: main clips through `FM.track.full.trimEnd/trimStart` |
| `js/timeline.js:2026+` | `buildLane`: the rail mark on main clips, the link line for stuck items |
| `js/timeline.js:5210` | `rebuild()` dispatches to `FM.simpleTimeline` while `ed-simple` |
| `js/inspector.js:3466` | `setStart`: main/stuck aware (edge 4) |
| `js/inspector.js:3619` | `catsFor`: an editor filter (Simple hides Presets, Camera Options, Edit Group; Effects curated) |
| `js/inspector.js:6904-6919` | no-selection branch: the Simple tool grid on PC |
| `js/addmenu.js:219, 247-325` | a `tabs`/`exclude` option so Simple can reuse the Add sheet without Camera, Controller, Adjustment, New group |
| `js/mobile.js:386-446, 271-294` | open the Simple sheets; dock under the timeline in Simple |
| `js/history.js:275` | `commit(meta)`: optional `{label, ed}` stored beside the snapshot |
| `js/storage.js:1633-1646` | `sanitizeImportedLayers`: `main`/`stick` shape rules |
| `js/storage.js:2044-2080` | `reIdLayers`: remap `stick.to`; drop it when the host is outside the batch |
| `js/storage.js:2540-2595` | `create(opts.editor)`; the index `editor` field |
| `js/storage.js:3333-3345, 3608-3625` | template/element insert rules (§12) |
| `js/home.js:2893-2909, 1351-1384` | the New project cards; the card chip and ⋯ items |
| `js/exporter.js:1159` | layout before rendering; hide the two clip-only options in Simple |
| `js/collab-path.js:139-175` | the derived-start rule in `syncable`/`canon`/`clone`'s path filter (§10.2.1). ⚠️ canon, clone and the diff walk must agree, as today |
| `js/collab-diff.js:190-227, 491-540` | clip time on the wire (§3.3): `diffNode`/`diffObject` live side, `applySet`/`applyLi` live side, the `start` apply shift |
| `js/collab-bridge.js:131-139` | `normalizeDerived`: `FM.track.layout` first |
| `js/collab-bridge.js:142-150` | `invariants().doc` = layout + orphan repair on the base |
| `js/collab-host.js:606-715` | `applyAndFix` triggers `inv.doc` on `main/stick/duration/trimStart/speed` + structural; `invariantFix` emits its diff |
| `js/collab-host.js:129-162` | `allowed`: refuse `s start` on a layer derived before and after (§10.2.4) |
| `js/collab-session.js:500-573` | derived-start fix ops go to base only; `onBatch` "keep my frame" (§10.5); `C.join`/`onSnap` convert keyframes |
| `js/collab-presence.js:236, 280, 509` | `ed` in `sample`, `cleanPr`, `hostRoster`; `act` `'arrange'`/`'stick'` |
| `js/collab-core.js:29, 177-188` | `SCHEMA_REV = 3`; `DERIVED_FIXTURE` gains a track with stuck items |
| `tests/tests.js` | §10.10's T1–T16, plus model tests for `layout`/`adopt`/`keyBetween` and a label guard that no mode or section label names another company (widening `:68197-68208`, per his "safeguards must be structural") |
| `BEFORE-PUBLISHING.md` | add the Simple timeline and toolbar as CapCut-derived screens |

---

## 15. Phased delivery (each phase ships on its own and leaves the app better)

| phase | what ships | what he can see | gate |
|---|---|---|---|
| **0. Clip time on the wire** | §3.3 conversion, the per-move keyframe shift in the clip drag, `SCHEMA_REV 3`, T1/T3/T13 | a real fix today: in a live session, moving a clip while a friend animates it no longer loses or displaces the animation, and a move sends far less | full suite + `?only=921` at 380 |
| **1. The model inside Full** | `js/track.js` (layout, `main`, keys, gaps), the Full editor's push rules, layer-menu "Put on / Take off main track", rail marks, host invariant + derived-start rule, T4/T5/T8/T12 (main only) | a magnetic main track usable in Full today | as above |
| **2. The Simple editor, first version** | the switch pill, `#sm-timeline` (main track + lanes), phone strips and PC grid, Core tools (§8.4), "Make a main track", Full-only content handling (§9), presence `ed` | the thing he asked for, on his phone | 380px screenshots through the app, sent as pictures |
| **3. Stuck items and the start flow** | `stick` everywhere (Simple default-stick, Full stick/unstick, link line, orphan repair), captions per clip, To overlay / To main, the New project cards, Home chips, T6/T7/T9/T11 | "text follows its clip"; choosing Simple when starting | as above |
| **4. Collaboration polish** | "keep my frame", cross-editor presence drawing, toasts, T10/T14/T15/T16, soak | two people, two editors, live, not in each other's way | tier-3 run + his Mac↔iPhone test |
| **5. Make it nice** | Adjust panel, background blur, freeze, clip In/Out animations, speed-curve presets | CapCut's "make it look nice" set | as above |
| **6. Transitions** | `main.tr`, the ▫ at each cut, the renderer's cross-blend, apply to all | the white square at the cut | render parity (preview = export) |
| Later | speech-to-text captions (if on-device), music library, stickers library, shipped templates | — | his call |

Phase 0 is invisible on purpose and first on purpose. It is the riskiest change (the wire), it fixes a real bug with no
new UI, and every later phase stands on it.

---

## 16. Risks

1. **Clip time on the wire is a protocol change.** Every start writer that means "animation comes too" must shift keyframes
   in the same turn. One known writer doesn't (`js/timeline.js:5073`). **Mitigation:** fix that one in Phase 0; T3's
   detector turns any future forgetful writer into a red test; the version gate stops mixed rooms.
2. **Derived starts are not on the wire from guests.** A layout bug would be a divergence the op stream can't correct.
   **Mitigation:** the host writes them into base (so they are in the hash); a strict live-vs-base check in tests; the
   layout is in `DERIVED_FIXTURE`, so any change to it moves the fingerprint.
3. **The lease meaning changes** (a leased clip can move in time). **Mitigation:** "keep my frame" (§10.5) and one quiet
   line. This is the right trade, but he should know it (it's in D7's picture).
4. **The Full editor's push rules are new behaviour in "his" editor** (#966: the complex side keeps every option). Nothing
   is taken away: "Take off main track" and "Free everything" restore today's model, and a project that never touches the
   track sees no change at all. D6 lets him pick.
5. **The size of the second UI** (two new files around 2,700 lines). **Mitigation:** mount beside, not inside,
   `timeline.js` [ui §5]; reuse every builder through `openCategory`; phases 2–3 are the bulk.
6. **Phone performance:** the layout on every hot tick. **Mitigation:** skip when no layer has `main`/`stick`; memoise by a
   signature of `(k, gap, duration, stick)`; T16 under the 4× throttle.
7. **Identity:** a CapCut-shaped screen is borrowing, like the Alight Motion one [prefs §10]. **Mitigation:** logged in
   BEFORE-PUBLISHING.md as it lands; no company names in labels (the widened guard test).
8. **Captions expectations:** people expect CapCut's words-from-speech. We only find timing. **Mitigation:** say so in one
   line on the Captions tool; STT is Later.
9. **Three designers, one synthesis:** if the judges pick a project-level track list instead of per-layer keys, §2.5's
   table is the argument, and §10's cases need re-deriving.

---

## 17. Decisions for Ezra (a picture each, one recommended; "do recommended" covers all)

| # | question | options | recommended |
|---|---|---|---|
| **D1** | What are the two editors called? | **A. Simple / Full** · B. Quick / Full · C. Cut / Motion · D. Easy / Studio. ("Pro" is avoided: he already uses it for a paid tier, #856) | **A** |
| **D2** | How does a new project start? | **A. Two big picture cards every time, remembering the last pick** · B. Always Simple, switch after · C. A setting | **A** |
| **D3** | Where does the switch live? | **A. A pill on the top-left of the video, on phone and PC, and in the cog** · B. Only in the cog · C. In the top bar (it's full on the phone) | **A** |
| **D4** | Do text, overlays and sounds stick to the clip they're added over? | **A. Yes by default, with a thin line and "Unstick" (music excluded)** · B. No, like CapCut's phone app · C. Ask each time | **A** |
| **D5** | Deleting a clip that has things stuck to it | **A. They go too, with an Undo toast naming them** · B. They stay where they are, unstuck | **A** |
| **D6** | In Full, dragging a main-track clip | **A. It slides into empty space and pushes neighbours when it touches them** · B. It comes off the main track and moves freely · C. It only reorders | **A** |
| **D7** | In a live session, can the owner stop others arranging the main track? | **A. No lock; you see who's moving what, and your frame stays put when they do** · B. An owner switch "Only I arrange the main track" | **A** |
| **D8** | Can a Full project be opened in Simple? | **A. Yes, any project, any time; "Make a main track" builds one without moving anything** · B. Only projects started in Simple · C. A one-way copy (the way Premiere Rush did it, now retired) | **A** |
| **D9** | Go-ahead to build | **A. Phase 0 + 1 first** (a collab fix plus the track inside Full, no new screens) · B. Phases 0–2 together, so the first thing he sees is the Simple editor · C. Not yet | **B**: he wants to see progress ("I want to feel and see progress", 20 Sep), and 0–1 alone show him nothing new |
