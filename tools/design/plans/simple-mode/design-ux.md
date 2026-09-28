# Simple mode: the UX-first design

Step 2 of `STATUS.md` (one of three independent designs; this one leads with how it feels on a phone and a PC).
Written 29 Sep 2026 against HEAD `2d06a3f5` (v17.11) plus the working tree. **Design only. Nothing is built.** Ezra's gate:
*"don't build it until I say to do it"* (INBOX.md:28).

Research this rests on (all in `research/`): `capcut-mobile.md` (cited **CC §n**), `pro-editors.md` (**PE §n**),
`fm-model.md` (**FMM §n**), `fm-collab.md` (**FMC §n**), `fm-ui.md` (**FMU §n**), `his-prefs.md` (**HP §n**).
Code references are `file:line` and were spot-checked for this note (function locations in `js/app.js`, `js/scene.js`,
`js/timeline.js`, `js/storage.js`, `js/home.js`, `js/collab-*.js`, `index.html`). Anything I did not confirm is marked
**UNVERIFIED**.

Working names in this document: **Quick** (the new, CapCut/Premiere-style editor) and **Full** (today's editor). They are
placeholders until Ezra picks (decision D1). Internally the code says `quick` / `full`, and the stored data uses a neutral
key, `seq`, so a rename later never touches saved projects.

---

## 1. The core idea, in one paragraph

**One project, one document, two editors that are two ways of looking at it.** Quick and Full show the same
`FM.scene.layers`, the same canvas, the same playhead and the same undo history; switching is a view change that takes
one tap and about a third of a second, and never converts or rewrites anything (the Resolve Cut/Edit model, PE §4; the
opposite of Rush→Premiere, which Adobe has now retired, PE §2). Quick adds exactly one idea to the data: some video and
image layers are flagged as **the main track** (`layer.seq.main`), and Quick's commands keep those clips end to end, so
trimming, deleting, speeding up or reordering one slides everything after it, *and everything sitting on top of those
clips slides with them* (the thing CapCut's phone app does not do, CC §13.4). Everything else (overlays, text, captions,
audio, effect segments) stays an ordinary free layer, shown in its own section of the Quick timeline instead of one row
per layer. Full keeps every option and stays free: a Full edit is never "wrong", it may only leave a gap or an overlap
on the main track, which Quick then shows honestly with a one-tap fix. Because the time axis, zoom and fixed-centre
playhead are shared, the switch animation is almost purely vertical: each clip keeps its horizontal place and flies up
or down from its row into its section, and back.

---

## 2. The data model

### 2.1 What is stored (all optional, all plain JSON, all top-level, no `_` prefix)

```jsonc
// A clip on the main track (video with a picture, or image)
{ "id": "layer_k3v9a", "type": "video", "start": 4.2, "duration": 3.1, "trimStart": 1.0, "speed": 1,
  /* …every existing field unchanged… */
  "seq": { "main": true } }

// Phase 5: the same clip with a transition INTO it from the clip before
  "seq": { "main": true, "tIn": { "k": "fade", "d": 0.5 } }

// Anything that must NOT follow the main track (music by default; any item the user sets to "Stay put")
{ "id": "layer_p81qz", "type": "video", "name": "Song.mp3", "seq": { "stay": true } }

// Every other layer: no "seq" key at all. It follows the main-track clip it starts on (§4).

// Project: a version stamp for this namespace and the editor a NEW device opens it in
"project": { "name": "Beach day", "width": 1080, "height": 1920, "fps": 30,
             "seq": { "v": 1, "home": "quick" } }
```

Per device, never in the document (so nobody's editor flips because of someone else, FMC §5):

```jsonc
// localStorage
"fm.ed.<projectId>": "quick"        // the editor THIS device last used for this project
"fm.ed.new":         "quick"        // the choice pre-selected in the New project dialog (remembered)
// project index entry (fm.projects, per device; precedent: elementDraft at js/storage.js:2586-2592)
{ "id": "p_…", "name": "Beach day", "duration": 42.5, "editor": "quick" }
```

### 2.2 Why this shape (and not the alternatives)

| Choice | Picked | Why |
|---|---|---|
| Where the main track lives | **A flag on each clip** (`seq.main`), order = `start` | `start` is already the truth the renderer, exporter and Full read (FMM §6). A main track with no gaps has exactly one order, so storing a second order (`ord`, or a `project.mainTrack` list, FMM §13.5 B, FMC §9.4 A) would be a second opinion Full can contradict. Nothing to remap on import/duplicate/paste, no `KEYED` table change, **no `SCHEMA_REV` bump** for phases 1-4 (FMC §3). |
| Are starts derived? | **No. Quick's commands write them explicitly** | A derived start would drag keyframes along only if keyframe time stopped being absolute, and `FM.evalProp` has **888 call sites** across 20 files (grep, 29 Sep; `js/scene.js:72`). It would also snap a Full user's deliberate drags back, which is the interference the brief rules out (FMM §13.4 point 2). Resolve does the same: magnetism is a behaviour of the Cut page's commands (PE §4). |
| How "attached" is stored | **Not stored. Worked out at edit time** from where an item starts, with a stored opt-out (`seq.stay`) | No layer id inside the metadata, so nothing to remap in the four id-remap sites (FMM §3.3, rule 2 of FMM §0), nothing goes stale when a Full user moves things, and nothing new to merge in collab. It is how the Resolve Cut page behaves (PE §4, inference there). §4 has the rule and why it is predictable enough. |
| Which editor you see | **Per device, per project** (localStorage), with `project.seq.home` only as the default for a device that has never opened it | FMC §5: an editor mode in `FM.scene` would flip the other person's screen. `home` is written once, at creation, and never by the switch, so switching makes no document write, no sync op and no undo step. |
| Sections (Overlays, Text, Captions, Audio, Effects) | **Derived from the layer type**, never stored | FMM §13.3. Final Cut's audio lanes "do not affect the content of your project" (PE §3). |
| Stacking | Main clips live at the **bottom of the array** (end = back); new overlays/text go to index 0 (front) | Array order is z-order, index 0 on top (`js/compositor.js:16167`). Quick keeps "main track behind everything"; if Full breaks it, Quick's check shows it (§3.6). |

### 2.3 Derived things (computed at draw or edit time; never saved)

```js
FM.seq.EPS          = 0.5 / fps                          // half a frame: "touching" tolerance (FMM §6, times are floats)
FM.seq.isMain(l)    = !!(l.seq && l.seq.main) && (l.type === 'video' || l.type === 'image')
FM.seq.main(scene)  = layers.filter(isMain).sort((a,b) => a.start - b.start || idxOf(b) - idxOf(a))
FM.seq.section(l)   = isMain(l) ? 'main'
                    : proOnly(l) ? 'pro'                         // §9
                    : FM.captions.isTrack(l) ? 'captions'        // js/captions.js:31-33
                    : l.type === 'text' || l.type === 'shape' ? 'text'
                    : l.type === 'adjustment' ? 'effects'
                    : audioOnly(l) ? 'audio'                     // 0×0 media or audioOnly (js/inspector.js:3614)
                    : 'overlay'                                  // video/image with a picture, not main
FM.seq.hostOf(l, main) // §4.1: the main clip this item follows, or null
FM.seq.check(scene)    // §3.6: gaps, overlaps, start ≠ 0, main clip in front of an overlay
```

### 2.4 Sanitising (the storage rules FMM §9 makes safe)

- `layer.seq` and `project.seq` are top-level keys, so they already survive load, import, undo, templates, backups,
  collab and the project file with **no new code** (FMM §9, "Top level of a layer … Kept on every route").
- Add one shape check in `sanitizeImportedLayers` (`js/storage.js:1633-1646`) and one in `sanitizeProjectFields`
  (`js/storage.js:1028`): drop `seq` if it is not a plain object; coerce `main`/`stay` to booleans; drop a `tIn` whose `k`
  is not a known transition or whose `d` is not a finite number in 0.1..2; **keep unknown plain sub-keys** (the
  whitelist-drift lesson: refuse bad shapes, keep plain fields). `project.seq.home` must be `'quick'|'full'`, else dropped.

---

## 3. The ripple ("stick together") algorithms

Rules every operation obeys:
1. **Move by exactly the amount removed or added. Never re-pack the track.** (HeyGen's bug, PE §1: their first version
   closed *every* gap.) A gap a Full user left on purpose somewhere else stays.
2. **One user action = one undo step** (`FM.history.mute()`/`unmute()` then one `commit()`, `js/history.js:270-275`).
3. **Keyframes move with their layer** through the existing `FM.shiftLayerKeyframes` (`js/scene.js:377`). Caption cues,
   text in/out, audio fades and the effect clock are clip-local and move for free (FMM §6 table).
4. **Attachments are worked out BEFORE anything moves**, from one snapshot (§4.1), so the order of moves never changes who
   follows whom.
5. **Only Quick's commands ripple.** Full's `deleteLayer`, trims and drags are untouched. The ripple lives in a wrapper
   (`js/seq.js`), never inside the shared functions.

### 3.1 The one primitive

```js
// Shift the main track after time T by delta, and everything that follows those clips.
function rippleFrom(T, delta, opt = {}) {
  const main  = FM.seq.main(FM.scene);
  const hosts = opt.hosts || FM.seq.hostMap(main);          // {layerId: hostClipId|null}, taken BEFORE any change
  const moved = new Set();
  for (const c of main)
    if (c.start >= T - EPS && !opt.exclude?.has(c.id)) { shift(c, delta); moved.add(c.id); }
  for (const l of FM.scene.layers) {
    if (FM.seq.isMain(l)) continue;
    if (FM.captions.isTrack(l) && !(l.seq && l.seq.stay)) { rippleCues(l, T, delta); continue; }   // §4.3
    const h = hosts[l.id];
    if (h && moved.has(h)) shift(l, delta);
  }
  shiftMarkers(T, delta);         // project.markers[].t at or after T (absolute, FMM §6)
  shiftComments(moved, delta);    // collab comments pinned to a moved layer (FMC §9.1 row 10)
  return moved;
}
function shift(l, d) { if (!d) return; l.start = snap(l.start + d); FM.shiftLayerKeyframes(l, d); }
```

`snap` rounds to the frame grid, as timeline edits already do (`js/timeline.js:3849-3865`).

### 3.2 The operations

```js
// Append (the "+" at the end of the main track, and what New project does with the picked clips)
appendMain(layers)          → T = end of last main clip (0 if none); place each at T, T+d1, …; seq.main = true;
                              put them at the BOTTOM of the array; one commit.

// Insert at the playhead (Clips tool with the playhead inside the track)
insertMain(layers, t)       → T = cutNearest(t)  // the edge of the clip under t that is nearer; end if past the track
                              total = Σ durations; rippleFrom(T, +total); place at T…; one commit.

// Delete (gap closes; things on the clip go with it; "Stay put" things stay)
deleteMain(c)               → hosts = hostMap(); gone = [c, …items whose host is c];
                              for x of gone: FM.deleteLayer(x.id, true);           // js/app.js:3677
                              rippleFrom(c.start + c.duration, -c.duration, {hosts});
                              toast("Clip deleted" + (gone.length > 1 ? " with " + (gone.length-1) + " things on it" : "") + " · Undo")

// Trim the tail (drag the right edge, or D at the playhead)
trimTail(c, newDur)         → newDur = clamp(newDur, 1 frame, FM.maxDurForSource(c))   // js/scene.js:1000
                              old = c.duration; c.duration = newDur; d = newDur - old;
                              if (d < 0) slideStranded(c, c.start + newDur);   // items of c that now start past its end
                              rippleFrom(c.start + old, d, {exclude: c, hosts});

// Trim the head (drag the left edge, or A at the playhead). The clip keeps its slot; the picture inside it moves.
trimHead(c, x)              → FM.trimLayerHead(c, x);        // js/timeline.js:4033: start+=x, duration-=x, trimStart advanced
                              shift(c, -x);                   // back to its slot; its keyframes follow the picture
                              for items whose host is c: shift(item, -x), clamp at c.start;   // they stay on their frame
                              rippleFrom(oldEnd, -x, {exclude: c, hosts});

// Split: nothing new. FM.splitLayer (js/app.js:4855) makes two contiguous halves; B is a clone, so it inherits
// seq.main. Items after the split point now "start on" B, which is what anyone expects.

// Speed (Speed tool): the existing writer changes duration and scales the clip's keyframes about its start
// (js/inspector.js:5855-5880). Then:
setSpeedMain(c, s)          → old = c.duration; <existing writer>; d = c.duration - old;
                              for items whose host is c: offset *= c.duration / old  // stay on the same moment of the clip
                              rippleFrom(c.start + old, d, {exclude: c, hosts});

// Reorder (hold and drag a clip along the track)
moveMain(c, toIndex)        → only the clips BETWEEN the old and new slot move, each by ±c.duration; c moves into the
                              slot; items follow their hosts; gaps elsewhere untouched.

// Duplicate: a copy of the clip (not its items) inserted right after it: insertMain([copy], c.start + c.duration).
// Replace: FM.replaceMedia (js/app.js:4658) keeps the slot; if the new source is shorter, trimTail to what exists.
// Make overlay (lift): delete seq.main; rippleFrom(c.end, -c.duration, {exclude: c}); c stays at its time, moves to the
//   top of the array. The main track closes up under it.
// Make main clip (drop): insertMain([c], c.start) and move c to the bottom of the array.
```

### 3.3 Live dragging

A trim or reorder drag shows the ripple while the finger moves (CapCut does, CC §2.1). At pointerdown `FM.seq.gesture()`
snapshots `{start, duration, trimStart, kf}` of every layer the operation can touch; each pointermove restores the
snapshot and re-applies the operation with the new value (so errors never accumulate); pointerup commits once. The
timeline already refuses to rebuild mid-gesture (`js/timeline.js:5212-5220`); the Quick timeline copies that rule, and
collab's `held` machinery already covers every path touched during the gesture (FMC §2.6).

### 3.4 What Quick never does

No automatic re-pack on open, on switch or after a remote change. No derived writer in collab. No silent edits. The
only writes are the ones a person asked for (iMovie's lesson, PE §5: never let a mode change rewrite the project).

### 3.5 Snapping in Quick

Overlay, text, audio and effect items snap to cuts, the playhead and each other using the existing `snapT` logic
(`js/timeline.js:639`). There is **no magnet button in Quick**: the main track always sticks together, and the word
"magnet" (which means snapping in Full, `js/timeline.js:351`) never appears in Quick (the naming clash in PE §7).

### 3.6 The main-track check (`FM.seq.check`) and "Tidy"

Runs on every Quick redraw (cheap: one pass over the sorted main clips). It returns, never fixes:

| Problem | How Quick shows it | One-tap fix |
|---|---|---|
| Gap between clips (made in Full, or by a friend) | A dark block in the main track with its length, e.g. `1.2s gap` | **Close gap** = `rippleFrom(next.start, -gap)` |
| Gap before the first clip | Same block at 0:00 | **Close gap** |
| Two main clips overlap | A red notch at the cut | **Fix** = `rippleFrom(later.start, +overlap, {exclude: earlier})` |
| A main clip is in front of an overlay (Full reordered it) | Small ⚠ on the clip | **Put behind** = `FM.moveLayers([id], null→bottom)` (`js/app.js:5324`) |
| First clip starts before 0 | Clip drawn cut off at 0 | **Fix** = shift the whole track to 0 |

Each fix is one undoable commit. A `⋯ → Tidy the main track` item does them all left to right.

---

## 4. Attachments: "things follow the clip they start on"

### 4.1 The rule

```js
hostOf(l, main):
  if (isMain(l) || l.seq?.stay || FM.captions.isTrack(l) || proOnly(l)) return null;
  for (const c of main)                                          // sorted by start
    if (l.start >= c.start - EPS && l.start < c.start + c.duration - EPS) return c.id;
  return null;                                                   // before 0:00 or after the track ends: stays put
```

- **An item that starts exactly on a cut belongs to the clip after the cut** (it was placed there to start with it).
- **The link is shown**, so it is never a surprise: when an item is selected, a thin line in its section colour runs from
  its left edge down to the clip it follows (Rush's yellow connection line and LumaFusion's link line, PE §2, §5), and
  the tray shows a switch **"Stay put"** (off) that turns it into a `seq.stay` item.
- **Defaults:** everything follows, **except** audio added through Audio → Music and voice recorded "for the whole
  video", which get `seq.stay: true` (iMovie's background-music area, LumaFusion's unlinked track, PE §5). A sound effect
  follows (it was placed on a moment).
- **Moving an item re-links it** automatically, because the link is where it starts. Dragging a title from clip 2 onto
  clip 4 means it now follows clip 4, with no extra step.

### 4.2 Why derived and not stored (and the one cost)

A stored `attachedTo: <clipId>` (Final Cut, PE §3) would need id remapping in `reIdLayers`, duplicate and paste
(`js/storage.js:2044-2080`, `js/app.js:4313-4360`), would go stale the moment a Full user drags either end, and would be a
new cross-layer reference to merge in collab. The derived rule has none of that. **The cost:** an item that *ends* on a
different clip than it starts on follows only its start clip. That is also what Final Cut, LumaFusion and Premiere mobile
do (the connection point is the item's first frame, PE §3, §5).

### 4.3 Captions: follow cue by cue (better than CapCut)

A caption track is one text layer holding many cues in layer-local time (`js/captions.js:1-16`, `:35-37`). It spans many
clips, so it does not follow one host. Instead `rippleCues(track, T, delta)`:

```js
local = T - track.start
if (track.start >= T - EPS) { shift(track, delta); return; }          // whole track is after the edit
for cue of track.captions:
  if (delta > 0 && cue.start >= local - EPS) { cue.start += delta; cue.end += delta; }
  if (delta < 0) {                                                      // the span [local, local+|delta|) was removed
    cut0 = local, cut1 = local - delta
    if (cue.start >= cut1 - EPS)      { cue.start += delta; cue.end += delta; }
    else if (cue.end <= cut0 + EPS)   { /* before the cut: untouched */ }
    else if (cue.start >= cut0 && cue.end <= cut1) drop(cue)            // wholly inside what was removed
    else clip cue to the part that survives, then shift its tail part by delta
  }
track.duration = max(track.duration + delta, lastCue.end)  // never cut off the last cue
```

So deleting a clip removes the captions spoken over it and pulls the rest back in sync. CapCut leaves them "pointing at
the wrong words" (CC §2.3); this is the single most visible way Quick beats it. The whole `captions` array is one atomic
value in collab (`js/collab-path.js:262`), which §10 covers.

### 4.4 Deleting a clip with things on it

Default (decision D6): **they go with it**, in the same undo step, and the toast says so: *"Clip deleted with 2 things on
it · Undo"*. This matches Final Cut, LumaFusion and Premiere mobile (PE §3, §5). "Stay put" items never go.

---

## 5. Opening a Full project in Quick, and back: a view, not a conversion

### 5.1 Any project opens in either editor

- **Full → Quick:** nothing changes in the document. Quick draws what is there. Main clips (if any) on the main track;
  every other layer in its section; anything Quick cannot edit in the "From the full editor" lane (§9); gaps and overlaps
  shown by the check (§3.6).
- **Quick → Full:** nothing changes either. Full draws one row per layer as today, with two small additions so a Full
  user can see Quick's world: main clips carry a thin "main" stripe along their bottom edge, and a clip with a
  transition shows a small ⧓ mark at its head.

### 5.2 An old project with no main track yet

Every project made before this ships has no `seq` keys. Opening one in Quick shows:

```
┌──────────────────────────────────────────┐
│  No main track yet.  [ Make one from my clips ]   ✕ │   one line, above the timeline, dismissable
```

**"Make one from my clips"** (`FM.seq.buildMain()`) is one undoable commit that **only adds flags**:

```js
cands = layers.filter(l => (l.type === 'video' && hasPicture(l) || l.type === 'image')
                         && !proOnly(l) && coversCanvas(l))          // roughly full-frame: it is a "shot", not a sticker
              .sort((a, b) => a.start - b.start || idx(b) - idx(a)) // at the same time, prefer the one further BACK
picked = []; end = -Infinity
for c of cands: if (c.start >= end - EPS) { picked.push(c); end = c.start + c.duration; }
for c of picked: c.seq = { ...c.seq, main: true }
```

It moves nothing. If the picked clips have gaps, the check then shows them and the person decides whether to close them
(one **Tidy** tap). This is the "tidy this into a main track" explicit action the research recommends instead of a
conversion (PE design pattern c). Because it only adds flags and is undoable, no "duplicate first" step is needed.

### 5.3 "Take off / Put on the main track" in Full

Full's layer menu (`FM.layerMenuItems`, `js/app.js:5147`) gains one toggle for video and image layers: **Put on main
track** / **Take off main track** (flag only; Full never ripples). That gives Full users control of the flag without
learning Quick.

---

## 6. The switch

### 6.1 Where it lives (decision D2)

**Recommended: the first control in the transport row, on both layouts.** The transport is the one row that is identical
on phone and PC (FMU §2.3), and in Quick its left cluster (options ⋯, layer copy/paste ⧉, the Add-row switch ◐) is Full-only
(FMU §6, "Transport … left cluster is complex-only"), so the switch takes the room they leave. On PC it sits right after
`‹ home` in `#t-home` (`js/app.js:7594-7596`). The phone top bar is full and moving anything there shifts the cog into the
bin's spot (queue 139, FMU §7), so it does not go there.

```
PHONE, Full                                   PHONE, Quick
│ ⇄Full ⋯ ⧉ ◐ |◀  00:03:12  ▶| ↶ ↷ ⛶ │        │ ⇄Quick   ◀  00:03 / 00:15  ▶  ↶ ↷ ⛶ │
PC                                            (the ⇄ pill: 2 short words, one tap, current editor shown)
│ ‹ ⇄Quick  |◀ ▶ 00:03  ▶|  ↶ ↷      v ? ✎ ⚙ ⇪ ⛶ │
```

The pill shows the editor you are **in**, with a small two-state icon (a filmstrip row ▭▭▭ for Quick, stacked bars ≡ for
Full). Tap = switch. Long-press (phone) or right-click (PC) = a two-item menu with a one-line description of each, for
the person who is not sure what it does. **Key `E`** switches on a PC (bare `E` is unbound today: the letter keys in use
are A, S, D and M, `js/app.js:8751`, `:8809`; verify at build time).

Also reachable from: the cog's canvas dialog ("Editor: Quick · Full"), Home's ⋯ menu ("Open in Quick / Open in Full"),
and the Help sheet.

### 6.2 How fast

- No document write, no commit, no autosave, no collab op. The only write is `fm.ed.<projectId>` in localStorage.
- Target: the new timeline is drawn and the morph has started **within one frame of the tap** (both renderers draw from
  the in-memory scene; the Quick renderer reuses the filmstrip and waveform caches, `js/timeline.js:990`, `:961`).
- Morph length **320 ms** (`cubic-bezier(.2,.8,.2,1)`); `prefers-reduced-motion` gets a 120 ms crossfade.
- The switch is refused (pill shakes once) only during a live gesture; everything else is closed cleanly first (§6.4).

### 6.3 The animation: rows fold into the main track, and unfold back

Because both editors use the same `pxPerSec`, the same scroll-to-time mapping and the same fixed centre line
(`#tl-centerline`, `index.html:609`; `js/timeline.js:5355`), **every clip's x position and width are the same in both
views.** The morph is a FLIP animation keyed by layer id, and it is almost entirely vertical:

```
FULL (one row per layer)                         QUICK (sections)
┌ Title          [▭▭ text ▭]                ┐    ┌ Text     [▭▭ text ▭]                    ┐
│ Sticker              [★]                  │ →  │          [★]                             │
│ Overlay clip       [▒▒ pip ▒▒]            │    │ Overlay       [▒▒ pip ▒▒]               │
│ Clip 3                    [███ c3 ███]    │ ↘  │ ▭▭▭▭ [██ c1 ██][█ c2 █][███ c3 ███] +  │  ← main clips drop into ONE row
│ Clip 2          [█ c2 █]                  │ ↘  │                                          │
│ Clip 1  [██ c1 ██]                        │ ↘  │ Audio  [~~~~~~~~ song ~~~~~~~~~~~~]      │
│ Song    [~~~~~~~~ song ~~~~~~~~~~~~]      │    └                                          ┘
└ + add row                                 ┘
```

Frame by frame (Full → Quick):
1. **0 ms.** Measure every `.clip` rect in `#timeline` (by `data-id`). Draw `#qt-timeline` hidden, measure its clip rects.
2. **0-120 ms.** Row heads (eye, name, ≡ handle), keyframe dots and the Add row fade and shrink to the left edge.
3. **0-320 ms.** Each clip box flies from its old rect to its new one. Main clips converge into the main row and their
   corners round into the joined filmstrip; overlay/text/audio clips glide to their lanes. Clips keep their colour
   (`clipColorOf`, `js/timeline.js:493`), so the eye can follow each one.
4. **180-320 ms.** Section labels and the main-track `+` fade in; the Quick toolbar rises from the bottom edge (phone) or
   the band's tabs slide in (PC), with the hinge motion Ezra liked (#612, HP §9).
5. **320 ms.** Old DOM hidden, new DOM live.

Quick → Full plays it backwards: the main row splits into rows, clips fall into their rows, heads slide in. His #974 ask
("make them all happen … random which one") is honoured by offering two more variants in the random pool, **fold**
(the timeline hinges shut and opens as the other one) and **slide** (the two timelines slide sideways past each other);
the morph is the recommended default (decision D9).

### 6.4 What happens to everything else on a switch

| Thing | What happens |
|---|---|
| Playhead / `FM.time` | Unchanged. Playback keeps playing through the morph. |
| Zoom and scroll | Shared: same zoom value, and the new timeline is scrolled so `FM.time` sits under the centre line. |
| Selection (`selectedId(s)`) | Kept. In Quick a selected pro-only item is selected and shows its chip panel (§9). Multi-selection is kept; Quick's tray shows only the tools that work on all of them. In Full, the phone's solo view opens on the selected clip as today (`js/timeline.js:3487`). |
| Open tools | Text editor, drawing, crop, mask, graph editor: committed and closed first (they are exclusive tools with leases, FMC §4.4). |
| Edit Group (`FM.groupContext`) | Exited before switching to Quick. |
| Undo history | Untouched (one history, PE §4 "one undo stack"). The switch itself is not an undo step. |
| Sheets (`#add-sheet`, inspector sheet) | Closed; Quick's own sheet opens again if a tool was open for the same item. |
| Collab | Presence sends `ed` so friends' people chips update (§10). Nothing else. |

---

## 7. Starting a project, and choosing the editor

### 7.1 The New project dialog (decision D3)

**Recommended: two big cards at the top of the existing dialog** (`#hm-dialog`, `index.html:711-767`), pre-selected to
whatever this device picked last (`fm.ed.new`), then the fields that are already there (name, aspect ratio, resolution, fps,
background).

```
┌ New project ─────────────────────────────┐
│ ┌──────────────────┐ ┌──────────────────┐ │
│ │ ▭▭▭▭  Quick      │ │ ≡   Full         │ │   drawn icons, one line each, no paragraph (#294)
│ │ Clips one after  │ │ Layers anywhere, │ │
│ │ another          │ │ every option     │ │
│ └──────────────────┘ └──────────────────┘ │
│ Name  [ Beach day            ]            │
│ Aspect ratio  [9:16] 16:9  1:1  4:5 …     │   ← already here; sets the canvas FIRST, which fixes
│ …                                         │     CapCut's "set the ratio first" trap (CC §3.4, §13.9)
│                     [ Cancel ] [ Create ] │
```

`createFromDialog` (`js/home.js:2893`) passes `editor` into `FM.projects.create(opts)` (`js/storage.js:2540`), which
already copies optional flags to both the document and the index card (`sizePicked`, `ofElement`, `templateDraft`,
FMU §7). It writes `project.seq = {v:1, home}` and the index `editor`.

### 7.2 Quick: pick media straight away

After **Create** in Quick, the system file picker opens at once (the existing `#file-input`, `pickFiles`,
`js/addmenu.js:61-70`), with `multiple` and `accept="video/*,image/*"`. The clips land on the main track **in the order the
browser hands them over**, one after another from 0:00 (`appendMain`), and the editor opens with the first frame showing.
This is CapCut's "no blank editor" start (CC §3), without its separate picker screen.

- **Order.** A browser picker does not reliably report the order you tapped (CapCut's own guide warns about relying on
  it, CC §2.1). So the landing order is the browser's, and the main track's `⋯` menu has **Sort by date taken**
  (`File.lastModified`; **UNVERIFIED** how iOS Safari fills it for Photos picks; check on his iPhone). Hold-and-drag
  reorders any clip.
- **Cancelled picker:** the Quick editor opens empty (§7.4).
- **"Custom · Auto adjusts" aspect** keeps today's rule: the first clip sets the canvas (`js/app.js:2982-2991`).

### 7.3 Full: exactly as today

Empty timeline with the big moving-colour add button (#326, #354, #398).

### 7.4 The empty Quick editor (what a first-timer sees)

```
│                                          │
│            (black canvas)                │
│                                          │
│ ⇄Quick      ◀  00:00 / 00:00  ▶   ↶ ↷    │
│                                          │
│   ┌────────────────────────────────┐     │
│   │   +   Add clips                │     │   the main track IS the button: full width, his moving
│   └────────────────────────────────┘     │   colours (#398), playhead hidden while empty (#354)
│                                          │
│ Clips  Text  Captions  Audio  Overlay …  │
```

One hint line appears the first time clips exist, under the timeline, and goes away on the first tap anywhere:
*"Tap a clip to cut it, speed it up or give it a look."* No tutorial; the guided help (#855) and onboarding
(BP:168-193) are held until near launch and slot in later without changing these screens.

### 7.5 Home: how a project's editor is shown (decision D10)

**Recommended: the first chip in the card's meta line**, with the same tiny icon as the switch:
`▭▭▭ Quick · 9:16 · 1080p · 30fps · 12 clips` (Quick counts **clips**; Full keeps "layers"). Added in `projectCard`
(`js/home.js:1351`, meta chips at `:1375-1379`) from the index's `editor` field, so Home never opens the document. The
card's ⋯ menu gets **Open in Quick** and **Open in Full**; tapping the card opens it in the editor shown on the chip.

Which editor a project opens in: this device's memory (`fm.ed.<id>`) → else `project.seq.home` → else **Full** for a
project with no `seq` at all (every old project, so nothing changes for work he already has) → else Quick.

---

## 8. The Quick editor on phone and PC

### 8.1 The phone (≤ 700px), 380 px wide

```
┌──────────────────────────────────────┐
│ ‹  Beach day            ?  ⚙  Export │  #topbar-m, unchanged (notes button hidden in Quick)
├──────────────────────────────────────┤
│                                      │
│            CANVAS  (40svh)           │  drag / pinch / rotate the selected item (js/canvas-edit.js)
│                                   ▐▌ │
├──────────────────────────────────────┤
│ ⇄Quick   ◀  00:03 / 00:15  ▶   ↶ ↷ ⛶ │  transport
├──────────────────────────────────────┤
│ Text ▬▬▬    ▬▬            │          │  ← sections that are FOLDED: one 10px line each, in their colour.
│ Overlay        ▬▬▬        │          │     Tap a line to open that section.
│ 🔈 ▭▭[██ c1 ██]◇[█ c2 █]◇[███ c3 ███] + │  ← main track: 56px filmstrip, ◇ = the cut button, + = add clips
│ Audio ~~~~~~~~~~ song ~~~~│~~~~~~    │  ← audio lane, thin (24px), always open
│                           │ playhead │
├──────────────────────────────────────┤
│ [✂ Split][⏩ Speed][🔊 Volume][◐ Look][⬒ Crop] … [🗑] │  ← CLIP TRAY: only while something is selected
├──────────────────────────────────────┤
│  Clips  Text  Captions  Audio  Overlay  Effects  Filters  Canvas │  ← PROJECT TOOLS: always here
└──────────────────────────────────────┘
```

Height budget at 380×667 (the smallest phone he is likely to test): top bar 44 + stage 40svh ≈ 267 + transport 40 + tray
52 + tools 56 = 459, which leaves ~208 px for the timeline: the main track (56) + audio (24) + ruler (18) + two folded
lines (20) + one open section of two lanes (2×32) = 182. **UNVERIFIED** until measured at 380 px (the global rule).

### 8.2 The PC (≥ 701px): the same pieces, placed in his Studio band

```
┌──────────────────────────────────────────────────────────────────────────────┐
│                                CANVAS                                     ▐▌ │
├───────────────────────────────┬──────────────────────────────────────────────┤
│ Clips Text Captions Audio …   │ ‹ ⇄Quick |◀ ▶ 00:03 ▶| ↶ ↷         ? ✎ ⚙ ⇪ ⛶ │
│ [✂ Split][⏩ Speed][🔊]… [🗑]  │ Text     [▭ title ▭]      [▭ caption ▭]      │
│ ┌───────────────────────────┐ │ Overlay        [▒▒ pip ▒▒]                   │
│ │ the open tool's panel     │ │ ▭▭▭ [██ c1 ██]◇[█ c2 █]◇[███ c3 ███]  +      │
│ │ (e.g. Speed: 0.5× 1× 2×…) │ │ Audio  [~~~~~~~~~~ song ~~~~~~~~~~~~~]        │
│ └───────────────────────────┘ │                   │ playhead                  │
└───────────────────────────────┴──────────────────────────────────────────────┘
  #inspector-panel (left band)     #timeline-panel → #qt-timeline
```

- **Same structure, same names, same order, same icons** as the phone: project tools as tabs across the top of the left
  band, the clip tray under them, the tool's panel below. On the phone the tool's panel is a sheet that rises from the
  toolbar (hinge, with the comic tail pointing at its button, #548); on the PC it fills the band. "You don't have to
  learn both" (INBOX.md:28).
- **All sections open** on the PC when the band is tall enough (`--tl-h`, `styles.css:6275-6293`); otherwise they fold
  exactly as on the phone.
- **Keys** (the same letters as Full, so nothing to relearn, but rippling): **A** trim start to playhead, **S** split,
  **D** trim end to playhead (`js/timeline.js:185-213` in Full, ripple versions in Quick), **Delete** delete (closes the
  gap), **Space** play, **E** switch editor, ⌘Z/⌘Y undo/redo.

### 8.3 Fixing CapCut's four pain points

| CapCut problem (research) | Quick's answer |
|---|---|
| **Tools vanish when a clip is selected**; "tap an empty area … then look again" (CC §4, §13.7) | **Two rows.** The project tools row never goes away. Selecting something adds the clip tray *above* it. Tapping Text while a clip is selected adds text at the playhead; no deselect needed. (Decision D8.) |
| **"Edit" appears twice** (project toolbar and inside the clip toolbar, CC §5.1) | **No button is called "Edit".** Project tools are named for what they add (Clips, Text, Captions, Audio, Overlay, Effects, Filters, Canvas); clip tools for what they do (Split, Speed, Crop …). Crop, rotate and flip are one tool, **Crop**. |
| **Nothing is attached on mobile**; overlays, text, captions and music drift (CC §13.4) | Things **follow the clip they start on**, captions follow cue by cue, music stays put, and the link line shows it (§4). |
| **Stacking order is hidden**: overlay rows are drawn *below* the main track but render *on top* (CC §2.2, §13.6) | **Higher on screen = in front**, exactly like Full's rows (index 0 on top). Text and overlays are drawn above the main track, audio below. The switch morph depends on this and makes it obvious. |
| **Main ↔ overlay is a buried trick** (Duplicate → Overlay, CC §13.5) | One visible tray tool: **Make overlay** on a main clip, **Make main clip** on an overlay. |
| **One category open at a time, the rest are "bubbles"** (CC §2.7) | Kept on the phone because it is what makes lanes fit, but folded sections stay visible as labelled coloured lines you tap directly, and selecting an item on the canvas opens its section by itself. The PC shows all of them. |

### 8.4 The timeline, in detail

- **Main track row.** Clips as joined filmstrips (the existing `drawFilmstrip`), the clip's own sound as a faint
  waveform inside the clip (video and audio merged into one item, Resolve's Cut page, PE §4). At its head a **🔈 mute
  all clip sound** toggle (sets `muted` on every main clip in one commit). At the tail a **+** (append clips).
- **◇ at each cut.** Phase 5: opens the transition sheet (thumbnails, Duration, **Use on every cut**). Until transitions
  ship, the ◇ is not drawn (better nothing than a bad version, #152).
- **Sections** above the main track: **Text** (text and shapes), **Captions**, **Overlay**; below it: **Audio**, and
  **Effects** (effect segments). Each section packs its items into as few lanes as fit (greedy in array order, front-most
  first, so an item drawn higher is in front where two overlap). Lanes are not stored (FMM §13.3).
- **"From the full editor"** lane, folded by default, holds pro-only items (§9).
- **Beyond the end of the main track**, if something else is longer, the main row shows a dark hatched band labelled
  `black` so it is clear why the video runs on (CapCut's surprise, CC §2.1 "black screens").
- **Gestures:** tap selects; hold (350 ms, the same timing as Full, `js/timeline.js:2190-2240`) picks a clip up to
  reorder (main) or move in time (items); edge grips trim; pinch zooms; swipe scrolls under the fixed playhead. Mouse on
  PC drags at once, as in Full.

### 8.5 Project tools (nothing needs to be selected)

| Tool | Opens | Built from |
|---|---|---|
| **Clips** | Add clips (append, or insert at the nearest cut), your recent media, Sample clip | `pickFiles`, `FM.mediaLib.use` (`js/medialib.js:168`), `appendMain`/`insertMain` |
| **Text** | Add text · Saved styles (your saved text elements) | `FM.addTextLayer` (`js/app.js:3072`) then `FM.textEdit.start` (`js/text-edit.js:698`) |
| **Captions** | Type captions · Find speech · Style | `FM.addCaptionLayer` (`js/app.js:3418`), `FM.captionsEditor.mount` (`js/captions.js:337`), `detectRow` (`:467`) |
| **Audio** | Music from files · Sound effects · Record voice · Take sound from a clip | Add menu's Audio tab (`js/addmenu.js:464-516`), `FM.sfx.open`, `FM.voiceRec.open`, `FM.extractAudio` |
| **Overlay** | Add a video or picture on top | `FM.addMediaLayer` (`js/app.js:2972`) at index 0, at the playhead |
| **Effects** | Add an effect segment at the playhead (3 s) that changes everything under it | `FM.addAdjustmentLayer` (`js/app.js:3407`) + `FM.fxBrowser.open` with 3D, Keying and Repetition hidden |
| **Filters** | Filter strip with thumbnails, Strength, **Use on every clip** | `FM.filters.*` (`js/filters.js:563-627`) |
| **Canvas** | Ratio · Background colour · **Blur behind** (every main clip) | `FM.openCanvasDialog` (`js/app.js:8319`); Fill Behind effect on each main clip |

### 8.6 The clip tray (per selection), left to right, with Delete pinned at the right end

| Selected | Tools |
|---|---|
| **Main clip** | Split · Speed · Volume · Look (filters) · Adjust · Crop · Replace · Duplicate · Reverse · Take sound out · Make overlay · Order (sort by date) · **🗑** |
| **Overlay** | Split · Speed · Volume · Look · Adjust · Blend · Remove a colour (chroma key) · Crop · Order (Forward / Back) · Make main clip · Stay put · **🗑** |
| **Text** | Edit words · Style · Animate (In / Out, the existing `textAnim` presets) · Duplicate · Stay put · **🗑** |
| **Caption track** | Edit lines · Style · Find speech · **🗑** |
| **Audio** | Volume · Fade · Speed · Split · Voice (a short list of audio effects) · Stay put · **🗑** |
| **Effect segment** | Change effect · Strength · **🗑** (length by dragging its edges) |
| **From the full editor** | Open in full editor · **🗑** |

Each tool opens its panel by reusing the inspector's existing category builders through `FM.inspector.openCategory(key)`
(`js/inspector.js:6818`): `speed`, `volume`, `filters`, `effects`, `blend`, `element`, `captions`. The panel is rendered
inside Quick's sheet (phone) or band (PC), with a `simple` flag that hides keyframe diamonds, easing and the rarely-used
rows. The new code is the tray and the small **Adjust** panel (one list of sliders that writes a single filter-container
effect named "Adjust" with brightness, contrast, saturation, exposure, temperature and vignette children).

### 8.7 The feature list against CapCut's (Core = first release of Quick, Later = after, Never = not in Quick)

| CapCut (CC §1, §4-§12) | Quick | Tier | Engine today (FMU §8) |
|---|---|---|---|
| Magnetic main track; ripple trim, delete, reorder | Yes | **Core** | New (`js/seq.js`) |
| Split at playhead | Yes | **Core** | `FM.splitLayer` |
| Pinch zoom, fixed playhead, undo/redo | Shared | **Core** | Exists |
| "+" at the end to append | Yes | **Core** | New |
| Mute all clip audio at the head | Yes | **Core** | `muted` |
| Overlay (picture in picture), blend, opacity | Yes | **Core** | Exists |
| Main ↔ overlay | One visible button | **Core** | New |
| Overlay order forward/back | Yes | **Core** | `FM.moveLayers` |
| Overlay lane cap (~6) | No cap | **Never** | Measure performance instead (CC §15) |
| Speed 0.1×–100×, keep pitch | Yes (range per engine) | **Core** | Speed category |
| Smooth slow-mo | "Smooth" switch | **Core** | `frameBlend` exists |
| Speed curve presets | Montage, Hero, Bullet… as presets over the existing ramp | **Later** | Speed ramps exist |
| Volume, fade | Yes | **Core** | Exists (fades are audio only) |
| Clip animations In / Out / Combo | Yes | **Later** | Missing for video/image |
| Crop, rotate, mirror | One **Crop** tool | **Core** | `crop-tool.js`, `FM.flipLayer` |
| Replace (keeps slot) | Yes | **Core** | `FM.replaceMedia` |
| Duplicate | Yes | **Core** | Exists |
| Reverse | Yes | **Core** | Exists |
| Freeze frame | Yes | **Later** | Missing |
| Extract audio | "Take sound out" | **Core** | `FM.extractAudio` |
| Filters + intensity + apply to all | Yes | **Core** | 56 filters exist |
| Adjust (sliders) | One panel | **Core** | Colouring effects exist |
| Mask | Open in full editor | **Later** | Exists in Full |
| Chroma key | "Remove a colour" on overlays | **Core** | Exists |
| Remove background (auto) | No | **Never** (for now) | No segmentation; don't fake it (#152) |
| Stabilise | Yes | **Later** | Missing |
| Keyframes | Full editor only; ✦ chip shows they exist | **Never** in Quick | Full's reason to exist |
| Camera tracking, auto reframe, retouch, video quality | No | **Never** | — |
| Transitions at cuts, apply to all | Yes | **Core** (Phase 5: needs renderer work) | Missing |
| Text add, style, move on canvas | Yes | **Core** | Exists |
| Text animations In / Out / Loop | In / Out now; Loop later | **Core** / Later | `textAnim` |
| Text templates | Saved text styles | **Later** | Saved elements exist |
| Text to speech | No | **Never** (removed once under #392) | — |
| Auto captions that write the words | "Find speech" finds *where*; you type | **Core** (timing) / **Later** (words) | Timing only (`js/captions-vad.js:4`) |
| Batch edit captions, one style for all | Yes | **Core** | Cue list editor; one track = one style |
| Import SRT | Yes | **Later** | **UNVERIFIED** whether it exists |
| Stickers | Shapes + your saved elements | **Core** / library **Later** | Exists |
| Video effects | Per clip and as segments; 3D/Keying/Repetition hidden | **Core** | 188 effects |
| Body effects | No | **Never** | — |
| Music library | Your own files only | **Never** (no servers, licensing) | — |
| Sound effects, voiceover | Yes | **Core** | `sfx.js`, `voice-rec.js` |
| Beats | Markers from the beat | **Later** | audio-react follows loudness only |
| Reduce noise, voice effects | A short "Voice" list | **Core** | 24 audio effects |
| Aspect ratio, background colour | Yes | **Core** | Canvas dialog |
| Blur behind | Yes | **Core** | Fill Behind effect |
| Templates (fill the slots) | From Home, as today | **Core** (existing) | `template-fill.js` |
| AutoCut (pick clips → auto edit) | "Quick edit from my clips" | **Later** | — |
| Branded ending, watermark, paywalls | No | **Never** | — |

---

## 9. Pro-only content in Quick

**The picture never lies:** Quick's preview and export render everything, exactly as Full does (#392, HP §12.15).
What changes is what Quick lets you *edit*.

### 9.1 Two levels

```js
proOnly(l) = ['group', 'null', 'camera'].includes(l.type)
          || (l.parent && FM.scene.layers.some(p => p.id === l.parent))     // transform parenting or group membership
          || /^mask-/.test(l.blendMode || '')                              // clipping masks (js/compositor.js:42-43)
hasProExtras(l) = FM.animatedProps(l).some(hasKeyframes)                     // js/scene.js:560-600
               || l.masks?.length || l.behaviors?.length || l.trimPath || l.repeater
               || isSpeedRamp(l) || l.effects.some(fx => ['3d','keying','repetition'].includes(categoryOf(fx)))
```

- **Pro-only items** go in the folded **"From the full editor"** lane as hatched blocks in their normal colour. Tap one:
  it is selected (outlined on the canvas), and the tray shows its name, one sentence, *"Made in the full editor."*, and two
  tools: **Open in full editor** and **🗑**. Quick never moves them by hand, but a ripple **does** shift them if they start
  on a clip that moves (a group is shifted as a unit, then `FM.refitGroupsFor`, `js/app.js:830-850`), so a Full user's
  controller animation stays over the right shot.
- **Items with pro extras** stay fully editable in Quick (split, trim, move, speed, delete; keyframes ride along through
  `shiftLayerKeyframes`). They wear a small **✦** corner chip. Their panels list what Quick cannot edit on one line,
  *"Also has: keyframes · 3D effect"*, with **Open in full editor**. The Effects list shows every effect on the clip so
  it can be switched off or removed, even ones Quick's browser would not offer.

### 9.2 "Open in full editor"

Runs the switch (§6) with the item selected; the morph lands with that item's row scrolled into view and the inspector
open on the relevant category (`FM.inspector.openCategory`). Coming back with the pill returns to Quick with the same
selection.

---

## 10. Collaboration across the two editors

The collab engine syncs `{project, layers}` by path-level ops with last-writer-wins, a host sequencer and per-layer
leases (FMC §2). Quick adds **no new op kinds, no new document lists and no derived writers** in phases 1-3, so a Quick
user and a Full user are simply two editors of the same document. What needs care is that a Quick ripple writes many
absolute values at once (FMC §9.1).

### 10.1 What people see

- **Presence says which editor each person is in.** Add `ed: 'q'|'f'` to the presence sample and `cleanPr`
  (`js/collab-presence.js:236`, `:280`) and to the roster (`:509`). Old builds drop the field (`cleanPr` rebuilds objects),
  so no version bump (FMC §9.4 F). The people chip reads *"Sam · Quick"*.
- **Remote ripples glide instead of jumping.** When a batch changes `start` on two or more main clips, both timelines
  animate the boxes over 200 ms (the same FLIP code as the switch) and tint the moved clips in the mover's colour for a
  second, with a line in the timeline: *"Sam moved 4 clips"* (Descript's "who is working where", PE §6).
- **In Quick**, items a Full user holds (their lease, `pr.ls`) wear that person's colour ring; in Full, main clips a
  Quick user is dragging (their `af` held path) are outlined the same way.

### 10.2 Rules that stop the two from breaking each other

1. **The editor is never in the document** (§2.2). One person switching never changes anyone's screen.
2. **A ripple checks leases first.** Before `commit`, Quick asks the session whether any layer the operation would move is
   leased by someone else (`collab-host.js:834`, `:871-872`: a lease refuses every op on that layer). If so it changes
   nothing and says *"Sam is editing 'Title' — try again in a moment."* This removes FMC §9.1 rows 4 and 5 (half a ripple
   landing around a held clip).
3. **A ripple is sent all-or-nothing, as compare-and-set (Phase 4).** Today a tx is not atomic and only offline replays
   use CAS (FMC §2.5, §9.4 H). Add a tx flag `all: 1` that the host honours by CAS-checking every op before applying any,
   and have Quick mark its ripple commits with it (`FM.collab.nextCommitAtomic()`). If the host refuses (someone else
   moved a clip first), Quick **re-runs the same intent** once against the fresh document (it kept `{op:'delete', id}` or
   similar), and only if that is refused too says *"Someone else just changed the clips — try again."* Two Quick users
   deleting and inserting at the same moment then compose correctly (fixes FMC §9.1 row 3). A new tx field needs a
   `PROTO` bump (FMC §9.4 H), so this is Phase 4's one version bump.
4. **Held keyframes are rebased when their clip moves under them (Phase 4).** Today, if a Full user is mid-drag on a
   keyframe of clip 7 while a ripple moves clip 7, their device parks the remote kf list and re-asserts its own at
   release (FMC §2.6), so the animation ends up 2 s away from its clip. In `release()` (`js/collab-session.js:407`): for
   each held `kf` path whose layer's `start` changed remotely during the hold, shift the live list by that change before
   re-asserting. Small and local; fixes FMC §9.1 row 2 for the common case.
5. **A Full user dragging a main clip is free.** Their drag holds, and the last person to let go wins (FMC §2.6). If that
   leaves a gap or overlap on the main track, Quick shows it with **Close gap / Fix** (§3.6). Nothing snaps back under
   their finger (the "(c)" outcome FMC §9.4 K warns about).
6. **Viewers and commenters** in Quick see the timeline and play; the tray and project tools are hidden except Comments,
   following the existing `roNow()` guards (`js/timeline.js:2200`) and `C.readOnly`.
7. **Before Phase 4 ships**, while a session is live Quick is look-and-select only, with one line: *"Editing clips with
   friends comes next. Switch to Full to edit together."* So no half-guarded ripple ever reaches a shared project.

### 10.3 What remains imperfect (said plainly)

- A Full user's **finished** keyframe edit (not held) that lands a moment after a ripple still overwrites the shifted list
  with the unshifted one (atomic kf arrays, FMC §2.6). Rule 3 protects the Quick side, not the Full side. The window is
  the time between two people's commits on the same clip, and the fix for good is clip-relative keyframe time, which is
  a model change across 888 `evalProp` call sites and is **not** proposed here.
- Per-person undo can soft-skip part of a ripple (FMC §4.5). Quick's check shows any gap it leaves (§11).

---

## 11. Undo

- **One history for both editors**, as today: up to 120 whole-document snapshots solo (`js/history.js:25-29`), per-person
  op steps in collab (FMC §4.5). Switching editors is not a step, so ⌘Z after a switch undoes the last edit made in
  either editor, and the morph is not involved.
- **Every Quick command is one step**, however many layers it moves (mute/unmute around the ripple).
- **A live drag is one step** (snapshot at pointerdown, commit at pointerup, §3.3).
- **Undo in collab** may soft-skip a path a friend changed since (`js/collab-session.js:1140-1182`). If that leaves the
  main track gappy, the check shows it and the toast adds *"· Tidy"*. Quick never tidies by itself.
- **Toasts** name what the undo will bring back: *"Clip deleted with 2 things on it · Undo"*.

---

## 12. Export, templates and captions

- **Export is unchanged.** `FM.exporter` renders the document (`js/exporter.js:1159`); Quick shares `#btn-export`. The
  export sheet's complex-flavoured options ("Export just this layer") are hidden in Quick.
- **Transitions (Phase 5)** must render in the compositor, not the UI, so preview, export and a Full user all see them.
  A transition of length `d` on the cut into clip B draws A and B together over `[cut − d/2, cut + d/2]`: A uses source
  frames past its out-point if the source has them (else holds its last frame), B uses frames before its `trimStart`
  (else holds its first frame), blended by the transition. **Clip times do not change** (CapCut: "transitions do not
  shorten clips", CC §9), so the main track maths stays as it is. Hooks: `FM.isLayerVisibleAt` (`js/scene.js:1127`) widens
  the two clips' windows by `d/2`, `FM.layerLocalTime` (`js/scene.js:1068`) clamps to the source, and the render loop
  (`js/compositor.js:16167`) applies the blend. Old builds would not draw them, so Phase 5 bumps `SCHEMA_REV` to keep
  mismatched peers apart.
- **Templates.** A template made from a Quick project carries `seq` keys (top-level keys survive `packFromProject`,
  FMM §9) and `project.seq.home`, so "New project from template" and "Insert your media" (`js/template-fill.js:292`) open
  it in Quick with its main track intact. **Inserting** a template or element into a project: in Quick, its main clips go
  into the main track at the nearest cut (`insertMain`) and the rest follow them; in Full, `seq.main` is stripped from the
  inserted layers so a second main track never appears on top of the first (`js/storage.js:3333`, `:3608`).
- **Duplicate, paste, extract audio in Full** strip `seq.main` from the copy (a copy at the same time would be a second
  main clip overlapping the first). Extract audio's twin also gets no `seq` so it follows its clip.
- **Captions.** One caption track = one layer = one style for every line (CapCut's "apply to all" is free here). **Find
  speech** runs the existing detection, which finds *when* someone speaks and makes empty cues to type into; it does not
  write the words (`js/captions-vad.js:4`). The sheet says so in one line. Writing the words is **Later** (an on-device
  model or his own AI key), not faked (#152). Captions follow the main track cue by cue (§4.3).

---

## 13. Edge cases

| # | Case | Behaviour |
|---|---|---|
| 1 | Old project, no `seq` keys, opened in Quick | Everything in sections; banner **Make one from my clips** (§5.2). Nothing changes until tapped. |
| 2 | Main clip dragged past 0:00 in Full (negative `start`, `js/timeline.js:4109`) | Drawn cut at 0; check offers **Fix** (shift the track to 0). |
| 3 | Gap or overlap made in Full or by a friend | Shown as a block/notch with **Close gap / Fix** (§3.6). Never automatic. |
| 4 | Main clip hidden (`visible: false`) | Drawn dimmed, still on the track, still counts for timing. |
| 5 | Main clip locked | Its own edits are refused (as in Full), but a ripple still shifts it in time with its content untouched; the lock icon shows. Refusing would break the track. |
| 6 | An audio-only layer flagged main (possible via old data) | `isMain` requires a picture, so it shows in Audio; the flag is left alone. |
| 7 | Trim to nothing | Clamped to one frame; to remove a clip, Delete. |
| 8 | Source length unknown (media still arriving from a friend, FMM §13.1) | Extend-trim is refused past the current length with a spinner on the grip; shrinking works. |
| 9 | Speed-ramped clip | Speed tool shows "Has a speed curve from the full editor" + **Use one speed** (resets the ramp; one step). Ripple uses the ramp's real duration. |
| 10 | Reversed clip | Works; split and trims already handle reverse (`js/app.js:4855`). |
| 11 | Split a clip with keyframes | `FM.splitLayer` cuts every property at the playhead (FMM §6). |
| 12 | An item starts exactly on a cut | Follows the clip after the cut (§4.1). |
| 13 | Item on a deleted clip | Deleted with it unless Stay put; toast counts them (§4.4). |
| 14 | Caption track across many clips | Cue-level ripple (§4.3); cues wholly inside a removed clip are removed. |
| 15 | Main clips inside a group (grouped in Full) | Shown in the main track hatched with a ✦ "in a group" chip; not editable in Quick; a ripple shifts the group as a unit. |
| 16 | Main clip parented to a null | ✦ chip; editable; the null (pro-only) is shifted by a ripple only if it starts on a moved clip. |
| 17 | Adjustment layer | Effects section; follows the clip it starts on. |
| 18 | Camera layer | Pro-only; never follows (it stretches to the project, `js/app.js:852-870`). |
| 19 | Markers and comment pins | Shift with the ripple (§3.1). Loop in/out do not. |
| 20 | Overlay longer than the main track | Video runs on; main row shows a hatched `black` band. |
| 21 | Canvas ratio changed later | Existing `FM.rescaleProjectContents` (`js/scene.js:1202`); Quick adds nothing. |
| 22 | Switch during a drag, a text edit, drawing, Edit Group, playback | Drag: refused. Tools: committed and closed first. Group: exited. Playback: keeps playing. |
| 23 | Undo pressed mid-drag | Ignored until release (as today). |
| 24 | Same project in two tabs, different editors | Each tab reads its own memory at open; the storage `rev` counter (`js/storage.js:50-133`) already stops one tab overwriting the other. |
| 25 | A `.fmotion.json` from someone else | Carries `seq`; opens in `project.seq.home` on a device that never saw it. |
| 26 | Template or element inserted | §12. |
| 27 | Paste across projects | In Quick: main clips are inserted at the nearest cut; in Full: `seq.main` stripped. |
| 28 | 60+ clips | A ripple is O(layers × keyframed props); `shiftLayerKeyframes` is already used on drags. Measure at 200 clips on his phone before Phase 2 ships. |
| 29 | 2000-layer collab cap (`collab-host.js:565`) | Unchanged. |
| 30 | Offline friend replays a ripple | It goes as `q:1` CAS anyway (FMC §2.6); refusals toasted with "save my version as a copy". |
| 31 | Friend on an older build | Syncs `seq` keys faithfully (plain keys), enforces nothing; presence `ed` dropped. Phase 4/5 bumps keep incompatible builds out. |
| 32 | Phone held sideways (844×390) | Gets the PC layout, as today (FMU §1). The Quick band layout is the PC one. |
| 33 | Picked 20 photos | Each gets `FM.defaultLayerDuration` (Settings, `js/app.js:2736`), placed end to end. |
| 34 | A clip made main in Full sits ABOVE overlays | ⚠ with **Put behind** (§3.6). |
| 35 | Keyboard focus in a text field | A/S/D/E/Delete ignored, as the existing handler does. |

---

## 14. Code plan

### 14.1 New files (plain `<script src>`, no build, global `FM`)

| File | What | Size guess |
|---|---|---|
| `js/seq.js` | The model and algorithms, **no DOM**: `isMain`, `main`, `section`, `hostMap`, `hostOf`, `rippleFrom`, `rippleCues`, `appendMain`, `insertMain`, `deleteMain`, `trimHead`, `trimTail`, `setSpeedMain`, `moveMain`, `lift`/`drop`, `check`, `tidy`, `buildMain`, `gesture()` snapshots, `proOnly`, `hasProExtras`. Pure functions over `FM.scene` so the suite can drive them headless. | ~700 lines |
| `js/quick-timeline.js` | `FM.quickTimeline`: renders `#qt-timeline` (main track, sections, folded lines, gap/overlap marks, link line), gestures (tap, hold-drag reorder, trims, pinch, scroll), `rebuild()`, `updatePlayhead()`, and the shared FLIP helper used by the switch and by remote-ripple glides. | ~1,500 |
| `js/quick-tools.js` | `FM.quickTools`: project tools row, clip tray, tool sheets (phone) / band panels (PC), the Adjust panel, the filter strip, empty state and first-run hint. Reuses inspector builders via `openCategory`. | ~1,000 |
| `js/editor-switch.js` | `FM.editor` (`'quick'|'full'`), `FM.setEditor(mode, {animate})`, the pill, key `E`, per-device memory, body class `ed-quick`, the morph choreography and its variants (#974 random pool). | ~400 |
| `styles.css` (new block, not a new file) | `body.ed-quick …` rules: hide Full-only transport buttons, the Add row, the notes button; sizes for tray/tools; section colours taken from `clipColorOf`'s palette. | ~500 |

### 14.2 Changes to existing files

| File:line | Change |
|---|---|
| `index.html:499` `#timeline-panel` | Add `<div id="qt-timeline" hidden></div>` beside `#timeline` (`:591`) and `<nav id="q-tools" hidden>` (tray + project tools) at the bottom of the panel. The centre line (`:609`) is shared as is. |
| `index.html:528` `#transport` | Add `<button id="ed-switch">` as its first child. |
| `index.html:711` `#hm-dialog` | Add the two editor cards above Name. |
| `index.html:1065`, `:1068`, `:1109` | Script tags: `seq.js` after `scene.js` (`:1052`); `quick-timeline.js` after `timeline.js`; `quick-tools.js` after `inspector.js`; `editor-switch.js` before `app.js`. Each with `?v=`, and every changed file's `?v=` bumped (ship.sh gate). |
| `js/timeline.js:5210` `rebuild()` | First line: `if (FM.editor === 'quick') return FM.quickTimeline.rebuild();` so the 90 external callers need no change (FMU §3.2). Same dispatch in `updatePlayhead` (`:5355`). Export `drawFilmstrip` (`:990`), `drawWaveform` (`:961`), `clipColorOf` (`:493`), `pxPerSec` (`:1096`), `snapT` on `FM.timeline._h` for reuse. |
| `js/timeline.js:185-213` `clipKeyAction` | In Quick, A/S/D call `FM.seq.trimHead`, `FM.splitLayer`, `FM.seq.trimTail` at the playhead. |
| `js/inspector.js:6862` `refresh()` | In Quick on PC, the band renders `FM.quickTools.panel()` instead of the Add menu / layer editor; on phone it stands down (Quick's sheet owns the bottom). |
| `js/inspector.js:3619` `catsFor` | Accept a `simple` filter so reused category builders hide keyframe rows, easing and 3D/Keying/Repetition. |
| `js/addmenu.js:219` `TABS` | Add an `only`/`exclude` option to `render()` (`:966`) so Quick's Audio and Clips sheets reuse the tab contents. |
| `js/mobile.js:48-90` `syncSheet`, `:271-294` `dockSheet`, `:398` `openAdd`, `:329-339` refreshAll wrapper | Return early in Quick (Quick's sheet is separate); `openAdd` routes to Quick's Clips tool. |
| `js/app.js:878-907` `refreshAll` | Call `FM.quickTools.sync()` in the chain (not beside it, FMU §5 hazard). |
| `js/app.js:941-985` `syncSelectionChrome` | In Quick, the phone top bar keeps the project name (the tray names the selection). |
| `js/app.js:7562-7674` `pcTransportLayout` | Move `#ed-switch` into `#t-home` with the recorded-origin mechanism so teardown puts it back. |
| `js/app.js:8761-8814` keys | `E` → `FM.setEditor(toggle)`; A/S/D/Delete dispatch to Quick versions when `ed-quick`. |
| `js/app.js:2972` `addMediaLayer` | Accept `{main: true, at: T}` from Quick: skip the playhead landing (`:2992-2999`) and let `seq.js` place it; insert at the bottom of the array. |
| `js/app.js:2880` `insertLayer` | Honour an explicit index so Quick can put main clips at the bottom and items at 0 regardless of `FM.addAt`. |
| `js/app.js:4313` `duplicateLayer`, `:1007` `extractAudio`, paste (`~:4296`, `~:4515`) | Strip `seq.main` from the copy in Full (§12). Quick calls its own `insertMain` instead. |
| `js/app.js:5147` `layerMenuItems` | Full: **Put on / Take off main track**; **Stays put / Follows its clip**. |
| `js/storage.js:2540` `create(opts)` | Copy `opts.editor` to `project.seq = {v:1, home}` and the index `editor` (as `sizePicked` is copied). |
| `js/storage.js:1028` `sanitizeProjectFields`, `:1633-1646` `sanitizeImportedLayers` | The `seq` shape checks (§2.4). |
| `js/storage.js:3333` template insert, `:3608` element insert | Strip or route `seq.main` by editor (§12). |
| `js/home.js:1351` `projectCard` (`:1375-1379`) | The editor chip; ⋯ gets **Open in Quick / Open in Full**. |
| `js/home.js:2893` `createFromDialog` | Read the editor cards; remember `fm.ed.new`; for Quick, open the picker after the project opens. |
| `js/collab-presence.js:236` `sample`, `:280` `cleanPr`, `:509` `hostRoster` | `ed` field (Phase 4). |
| `js/collab-session.js:407` `release` | Held-keyframe rebase (Phase 4, §10.2 rule 4). |
| `js/collab-host.js:847-934` `receive`, `:350-387` `cas` | `all:1` all-or-nothing CAS tx (Phase 4); `PROTO` bump in `js/collab-core.js:22-29`. |
| `js/scene.js:1127` `isLayerVisibleAt`, `:1068` `layerLocalTime`; `js/compositor.js:16167` | Transitions (Phase 5); `SCHEMA_REV` bump. |
| `tests/tests.js:68197-68208` | Widen the brand-name guard from effect labels to the switch, the New project cards, Home chips and every Quick label ("safeguards must be structural", HP §12.2). |
| `BEFORE-PUBLISHING.md` | Log each Quick screen that borrows CapCut's arrangement as it lands (the standing rule). |

### 14.3 Tests (per phase, in `tests/tests.js`, run at desktop and 380 px)

- `seq.js` unit tests with fixtures that **contain what separates right from wrong** (the memory note): a gap left on
  purpose elsewhere must survive a ripple; an item starting exactly on a cut; a caption cue straddling a deleted clip; a
  keyframed clip moved by a ripple (its animation must play at the same point of the clip); a Stay-put song.
- Switch tests: no document write, no history entry, `FM.time` unchanged, selection kept, each clip's x unchanged across
  the switch (±1 px), refused during a drag.
- Quick timeline at 380 px: every tray tool reachable (the unnumbered "options run off screen" bug is the precedent),
  project tools never disappear when a clip is selected.
- Collab (Phase 4) in the `921` harness: Quick and Full devices; lease refusal of a ripple; `all:1` refusal and intent
  retry; held-kf rebase; presence `ed`.
- Every ship goes through `tools/ship.sh`, so every changed test must fail with its fix reverted (`prove.sh`).

---

## 15. Phases (each one ships on its own and is useful on its own)

| Phase | What he gets | Built | Collab |
|---|---|---|---|
| **0. Decide** | The visualizers and this sheet's picks (§17) | Nothing | — |
| **1. See any project as clips** | The switch pill and key, the morph, the Quick timeline drawing any project (main track, sections, pro lane, gaps), Home chip and ⋯ items, per-device memory, "Make one from my clips", Full's "Put on / Take off main track". Selecting opens today's inspector for that item. | `seq.js` (read side + `buildMain`), `quick-timeline.js` (draw + select), `editor-switch.js` | Works in a session (view only; no new ops) |
| **2. Edit clip after clip** | New project cards → picker → clips land in order; the empty state; ripple trim, delete, split, reorder, speed, duplicate, replace, make overlay / main; things follow their clip; Stay put; Close gap / Fix / Tidy; the two-row toolbar with Clips, Text, Audio, Overlay, Filters, Canvas; A/S/D/Delete. | `seq.js` (write side), `quick-tools.js` | Look-and-select only while live (§10.2 rule 7) |
| **3. Make it look nice** | Captions (cue-level follow, Find speech), Effects segments, Adjust panel, filter strip with "use on every clip", Blur behind, Voice list, text In/Out, ✦ chips and "Open in full editor" everywhere. | Mostly `quick-tools.js` | As phase 2 |
| **4. Quick and Full together, live** | Presence `ed`, lease check before a ripple, all-or-nothing CAS with intent retry, held-keyframe rebase, remote ripple glide and "Sam moved 4 clips". Lifts the rule-7 limit. | `collab-presence/session/host/core` | `PROTO` bump |
| **5. Transitions** | ◇ at each cut, transition sheet, "use on every cut", rendered in preview and export for everyone. | compositor, scene, Quick UI | `SCHEMA_REV` bump |
| **6. Later list** | Freeze, clip In/Out animations, speed-curve presets, stabilise, beat markers, SRT, words for captions, sticker and text-style libraries, "Quick edit from my clips", onboarding (#855, held for launch). | Per item | — |

Every phase ends with the 380 px check and a full suite run (global rule, `LOOP.md` rule 7).

---

## 16. Risks

| Risk | Why it matters | What reduces it |
|---|---|---|
| **Absolute keyframes under collab** | A finished Full keyframe edit landing just after a ripple leaves animation behind its clip (§10.3). | Lease check + CAS on Quick's side, held-kf rebase; the real fix (clip-relative time, 888 `evalProp` sites) stays out of scope and is named, not hidden. |
| **Phone height** | Two toolbar rows + stage + transport can squeeze the timeline below usable on a small phone. | Measure at 380×667 in Phase 2; fallback: the tray replaces the tools row's *labels* with icons only while a clip is selected (still never hides a tool). |
| **Picker order** | Clips may land in an order the person did not tap. | Sort by date + easy reorder; verify iOS behaviour on his phone before promising "in the order you pick". |
| **The derived attachment rule surprises someone** | An item that ends over another clip follows only its start clip. | The link line on selection, Stay put, and every precedent works the same way (PE §3). |
| **Full users make messy main tracks** | Gaps, overlaps, main clips in front. | The check shows it with one-tap fixes; nothing automatic. |
| **Transitions renderer** | Blending two clips past their trims touches the hottest render path. | Last core phase, its own version bump, measured for phone lag first (LOOP.md "the lag … for mobile"). |
| **Identity** | A CapCut-shaped screen is the same borrowing as the Alight Motion one (HP §10). | Own words (no "Edit", no "Overlay track magnet"), own motion (the morph), BEFORE-PUBLISHING entries, and the widened brand-name test. |
| **Two renderers drift** | Quick and Full timelines both draw clips; a fix to one may miss the other. | Shared helpers exported from `timeline.js`; the switch test compares x positions across both. |
| **Scope creep toward CapCut's whole list** | The ceiling is CapCut, not the target. | The Core / Later / Never table (§8.7) is the contract; Later items need his go-ahead one by one. |
| **Performance of ripples on long projects** | Every moved layer rewrites its keyframes. | Only layers that actually move are touched; measure at 200 clips. |

---

## 17. Decisions for Ezra (a picture each, one recommended, "do recommended" answers all)

| # | Question | Options | Recommended |
|---|---|---|---|
| **D1** | What are the two editors called? | **A. Quick / Full** · B. Clips / Layers · C. Cut / Motion · D. Simple / Advanced | **A.** Says what each is for, does not talk down to experienced people, and "Full" promises nothing is taken away. Avoids "Pro" (you use that word for a paid tier, #856). |
| **D2** | Where is the switch? | **A. First button in the play bar, phone and PC** · B. Beside the project name at the top · C. Only in the ⚙ menu · D. A pill floating over the video | **A.** One tap, always there, same place on both, no crowding of the top bar. |
| **D3** | How does a new project choose? | **A. Two cards in New project, remembers your last pick** · B. Always start Quick · C. Always start Full · D. Two separate "+" buttons on Home | **A.** |
| **D4** | Opening an old project in Quick | **A. Show it as it is, with a "Make one from my clips" button** · B. Turn it into a main track automatically · C. Don't allow it | **A.** Nothing changes unless you ask; the button is one undo. |
| **D5** | Do text, stickers and overlays follow their clip? | **A. Yes, and music stays put; any item can be set to "Stay put"** · B. No, like CapCut on the phone · C. Ask each time | **A.** It's what a non-editor expects and the thing CapCut gets wrong. |
| **D6** | Deleting a clip that has things on it | **A. They go too, the toast says how many, Undo brings all back** · B. They stay and slide to the cut | **A.** |
| **D7** | Can the main track be "unstuck" (gaps allowed) on PC? | **A. No, always stuck together on phone and PC** · B. A switch on PC only (CapCut desktop) | **A.** Same on both (your rule); Full is the free editor. |
| **D8** | When a clip is selected | **A. Its tools appear above the main toolbar, which never disappears** · B. Its tools replace the toolbar (CapCut) | **A.** |
| **D9** | The switch animation | **A. Morph: rows fly into the main track and back** · B. Fold (hinge) · C. Slide · D. All three at random (#974) | **A**, with D available if you want to live with all three first. |
| **D10** | How Home shows the editor | **A. First chip on the card's info line ("▭▭▭ Quick")** · B. A badge on the thumbnail · C. Icon only | **A.** |
| **D11** | Who comes first | **A. Someone who has never edited (plain words, big start), with the same keys as Full for experienced people** · B. Experienced-in-a-hurry first | **A.** |
| **D12** | Build it? | **A. Build Phase 1 (see any project as clips + the switch) and show you** · B. Keep planning · C. Build Phases 1-3 in one go | **A.** Small, visible, nothing risky, and you can feel the switch before the big parts. |

The four #923 questions (names, per project or per clip, who first, build yet) are D1, D2/D3 (per project; per clip is
not offered, because a clip's behaviour depending on which editor made it would be two rules for one thing), D11 and D12.
