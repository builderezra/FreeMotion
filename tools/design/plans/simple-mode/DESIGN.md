# Simple mode: the design (synthesis)

Step 2 of `STATUS.md`, final output. Written 29 Sep 2026 against HEAD `2d06a3f5` (v17.11) plus the working tree. Step 3's
three hole-poking rounds are folded in (the log is §20; decided questions are struck in §19), and a coherence pass (step 4)
made every section agree with the patched ones. **§17 is the final decision list, D1–D21**; everything not on it is decided
with the recommended option.
**Design only. Nothing is built.** His gate: *"don't build it until I say to do it"* (INBOX.md:28).

This merges three designs (`design-model.md` = **M**, `design-ux.md` = **U**, `design-collab.md` = **C**) after three
judgements (`judge-soundness.md`, `judge-buildability.md`, `judge-ezra-fit.md`). All three judges picked the same core: **M's
option F, which U reached on its own**. This file takes that core, grafts the best of all three, and fixes every serious flaw
the judges found. §0.3 lists each flaw and its fix.

Research notes are cited as `capcut §n`, `pro §n`, `model §n`, `collab §n`, `ui §n`, `prefs §n` (all in `research/`). Code is
cited `file:line`. Lines marked **[checked]** I re-read myself for this file. **UNVERIFIED** marks anything read but not run.

**Working names:** **Simple** (the new editor) and **Full** (today's editor). The real names are decision D1. In code the
main-track engine is `FM.spine` and the stored key is `sm`. The code never says "magnet" (in FreeMotion that means snapping,
`js/timeline.js:4463`) or "parent" (that means transform parenting, `js/scene.js:707`).

---

## 0. The whole design on one page

### 0.1 In twelve lines
1. **One project, one document, two editors.** Simple is a second view and command set over the same `{project, layers}`,
   like DaVinci Resolve's Cut and Edit pages (pro §4). It is never a second file format. Every editor that used two formats
   converts one way and loses things (Rush → Premiere, now retired, pro §2).
2. **`start` stays the only stored time.** The renderer, exporter and Full editor read exactly what they read today.
3. **Two optional flags on a layer do the work:** `sm.main` (this clip is on the main track) and `sm.stay` (this item does
   not follow the clips), plus a few plain helpers (`sm.tail` "ends with the video", `sm.twin`, `sm.unit`, `sm.muteByMode`,
   §2.2). No layer id is stored anywhere, so nothing needs remapping.
4. **Main-track order is the order of `start`.** There is no order list to disagree with a Full drag.
5. **Magnetism lives in Simple's commands, not in the document.** Each Simple edit is one explicit, one-step, undoable
   change that moves `start` **and** the keyframes (`FM.shiftLayerKeyframes`, `js/scene.js:377` [checked]) of exactly the
   clips it moves, by exactly the length added or removed. Full never ripples.
6. **Things follow the clip they start on.** One rule, worked out when an edit runs. Music, voice-overs (a sound that runs
   on past its clip) and long things that run over three or more clips stay put. Captions ride cue by cue.
7. **Any project opens in Simple straight away, with nothing to convert.** A pure classifier works out the main track.
   Opening writes nothing. The first Simple edit that arranges clips stores what it worked out, inside that edit's own undo
   step.
8. **What Simple can't edit renders exactly as it is**: animated items get a ✦ badge and a line, groups that must render as
   one show as a hatched block, and each offers "Open in Full".
9. **The editor you see is per device and never syncs.** Switching sends nothing. Presence says who is in which editor.
10. **Collab comes in two steps.** Looks, text, captions, sound and split work live from the first editing release (Phase 2). Arranging
    clips (the edits that ripple) turns on in a live session in the "together" release (Phase 4), while everyone who can
    edit is connected; that release also sends keyframes as clip time on the wire so a ripple never fights an animation edit.
11. **One undo history** across both editors. Switching is not an undo step.
12. **Phase 1 is something he can hold:** the switch and any project drawn as clips, behind a "Simple editor" preview
    switch in Settings (§15; the word "Labs" is no longer anywhere on screen).

### 0.2 The one sentence for Ezra
> "Any project opens in either editor, nothing gets converted, clips stick together in Simple, the things on a clip go with
> it, and you and a friend can each use a different editor on the same project at the same time."

### 0.3 Every serious flaw the judges found, and how this design fixes it

| # | Flaw (judge, where) | Fix here |
|---|---|---|
| 1 | M: "the failure is always a visible seam" is false. A ripple against a keyframe edit leaves animation off its clip with no chip, and a whole-list caption write can clobber a friend's words (soundness §2 flaw 1) | Rippling edits are **off in a live session** until Phase 4 (U's rule 7, §10.2). Phase 4 first ships **clip time on the wire** (C §3.3), which removes the keyframe race outright. Caption words are protected because cue text is typed in the text editor, which takes a lease [checked: `js/captions.js:14-16`, `:355-358`; `LEASED` `js/collab-presence.js:193-203`], and from Phase 4 cue timing is keyed per cue (4a′), so a ripple slides a typist's cues without touching their words and is refused only if it would delete the cue being typed (§10.4). What is left is stated honestly (§10.6). |
| 2 | M and U: a derived link can re-home silently when a trim leaves an item's start over the next clip (soundness §2 flaw 2, §3 flaw 5) | Links are worked out **before** anything moves (U's `hostMap`), and a trim that cuts away the frame an item starts on **slides the item back onto its own clip** (decision D6), so the next derivation gives the same host. The "long things stay put" test runs **once**, at adoption, and is stored as `sm.stay`, so a later trim cannot flip it (§4). |
| 3 | M: two people adopting at once can make overlapping main clips (soundness §2 flaw 3) | Adoption only happens inside an arranging edit (including Full's Make overlay / Put in the clip row, which runs through the same runner and gate, §4.4), and arranging is off while others are in the session until Phase 4. In a session, per-person undo never un-adopts (§11). From Phase 5 the adopting edit is an all-or-nothing compare-and-set, so the second adopter's edit is re-run against the adopted project (§10.5). Before that, the rare case shows as an overlap chip. |
| 4 | M and U: "clamp to one frame" is below the sanitisers' floors, so the next undo turns a 1-frame clip into an overlap (soundness §5 point 1) | `MIN_LEN = max(1 frame, 0.1 s)`, the same floor as `FM.trimLayerHead` and above `sanitizeTiming`'s 0.05 s [checked: `js/storage.js:1581`]. Every command enforces it, **Split included** (a half under `MIN_LEN` is refused, §3.6), and trims refuse rather than floor when the source runs out (§3.6, `FM.trimClipEdge`). |
| 5 | U: ripples shift collab comment pins, which the host refuses for other people's comments (soundness §3 flaw 1, buildability §1) | Nothing ever rewrites a comment's `t` [checked: `editorCommentOp`, `js/collab-host.js:87-101`, allows only `text` and `resolved`]. A pin with a clip gets a new insert-time anchor on the clip's own clock: `ls` (source seconds) for a video, else `lo` (the clip clock, `FM.fxLocalTime`). `CM.pinTime` resolves it across the clip's split lineage, so it follows its footage through ripples, splits, head trims in either editor and speed changes without any write (§13 #24). Benchmarks stay absolute (they sit on the music); the loop region follows its footage (§3.6.2). |
| 6 | U: live drag writes the scene on every pointer move, which costs the phone and streams half-done ripples to peers (soundness §3 flaw 2, buildability §3.2) | **M's DOM-only preview**: during a trim or reorder drag only the timeline boxes move. The document is written once, on release (§3.8). |
| 7 | U: reorder does not carry caption cues; speed does not scale them (soundness §3 flaw 3) | M's rider operations: `cut`, `shift`, `lift/paste`, `scale`, stated per command (§3.5). Moved cues also carry their own effect keyframes (§3.5, a new finding). |
| 8 | U: a ripple moves a clip the person locked; M refuses. Two meanings of "locked" (soundness §3 flaw 4, ezra-fit §4) | Today "locked" means "selectable, never movable" [checked: `js/timeline.js:2283`, `:2364`, `:5054`]. So the edit is refused, saying how many are locked, with a one-tap **Do it anyway** that moves them in the same step and keeps the lock (decision D7, pictured; §3.7). |
| 9 | M: two attachment code paths (stored `sm.on` plus derived) and id remapping at six copy sites (buildability §3.1, ezra-fit §3) | **One path: derived, no id stored.** The only stored attachment fact is the `sm.stay` opt-out (U §4). Nothing to remap. |
| 10 | M: the first thing he can hold arrives late and all at once (buildability §3.1, ezra-fit C9) | **Phase 1 is visible** (U): the switch and any project drawn as clips, read-only, behind the Settings preview switch. |
| 11 | M: "on a fresh install, Quick" as the New-project default breaks ten dialog tests and changes his daily flow before he has chosen (buildability §3.1) | The cards ship in Phase 3, with the preview removed, so a one-time migration writes **Full** as the default on every device that already has projects; only a brand-new install (no projects) pre-selects Simple, and the dialog remembers the last pick after that (D3, §7.1). |
| 12 | M: T9 "reports, not asserts" cannot pass `prove.sh` (buildability §3.1) | The collab fuzz **asserts** convergence, "no clip, keyframe list or cue missing without a logged intent" (an intent-log oracle that logs undo, redo, cue removals and host fix ops too) and "every surviving follower is still on the clip it was on" (host stability), in §14.6 T11, and **reports** the seam count as an extra. |
| 13 | M, C: the switch pill sits on the collab people chip, the LIVE pill and the phone's comments bubble (ezra-fit §3) | Not on the stage. The stage's top-left is taken [checked: `.collab-people` `styles.css:10471-10472`; `.collab-live` `:10694-10695`; `.collab-cmt` `:10712-10713`]. The switch goes in the play bar at **slot 3** of Simple's row (the order is D18); in Full, D2 picks between slot 3 (◐ moves into ⋯), the first item inside ⋯ with a back-to-Simple button after a switch (recommended), or all five buttons at 31 px on phones from ~427 px wide, because 5 + 4 cannot fit at the play bar's 34 px buttons (§6.1). |
| 14 | M, C: different keys in the two editors (ezra-fit §3) | **Same A/S/D in both** (rippling in Simple, with the off-clip and nothing-selected cases in one table, §8.3), **E** switches, Delete ripples in Simple. Bare E is free [checked: `js/app.js:8751`, `:8809-8814`]. |
| 15 | M, C: tools replace the toolbar when a clip is selected, which is CapCut's worst trap (capcut §13.7) | **Two rows** (U): the clip's tools above, project tools always below (D10). Measured fallback on short screens: the clip tray goes icons only in a 40 px row (§8.2). |
| 16 | M: the toolbar copies CapCut's words and order (ezra-fit §3) | Own words and order: Clips · Text · Captions · Sound · Overlay · Look for all · Effects · Ask, one row that never scrolls; Canvas lives on ⚙ (§8.5). Logged in BEFORE-PUBLISHING. The brand-name guard is widened (§14.2). |
| 17 | U: no Simple editing in live sessions until Phase 4 answers his loudest question with "later" (ezra-fit §4) | Split into two kinds of edit. **Looks, text, captions, overlays, sound and split work live from the first editing release**: they are single-layer edits exactly like Full's. Only **arranging** (edits that move other clips) waits for Phase 4, which is the release straight after the editor (§10.2). |
| 18 | U: Phase 4 underestimated (all-or-nothing tx, async refusal, full revert) (buildability §3.2) | Split out as its own Phase 5 with an honest size, **after** clip time on the wire. Whether it comes before transitions is decided by the Phase 4 fuzz's seam count (§15). |
| 19 | U: Phase 1 relies on the phone sheet, whose dock measures Full's rows (buildability §1, §5) | A dock hook ships in Phase 1: `dockSheet` asks whichever timeline is showing for its bottom edge [checked: `js/mobile.js:271-294` measures `#tl-tracks .track-row`]. |
| 20 | All three: presence and collab-media draw on Full's timeline DOM, so remote selections would not show in Simple (buildability §5) | One `FM.timeline.host()` interface (clip boxes, inner layer, ruler, scroller, head width, time↔x) that both timelines answer; presence heads, taps, pointer time, follow-scroll and comment marks all draw through it (§10.3) [checked: `js/collab-presence.js:1012`, `:1020`; `js/collab-media.js:1325`]. |
| 21 | C: derived starts rewrite the Full editor (push and swap), override ~30 `start` writers, and change the wire first (all three judges) | Not adopted. C's derived layout stays on file as the Phase 8 upgrade path, only if measured seams call for it. Its **clip time on the wire**, **keep my frame**, **lease protects content not time**, **undo labels** and **semantic fuzz** are grafted. |
| 22 | C's graft needs care: the keyframe conversion set must equal the shift set; `js/ai-ops.js:116` writes `start` with no shift; the Full drag shifts keyframes only on release (soundness §4) | One shared collector `FM.timedLists(layer)` (today's `animatedProps` lists **plus every cue's effect lists**, Q3) feeds `shiftLayerKeyframes`, `scaleLayerKeyframes` and the wire conversion, so they cannot disagree. The Full drag shifts per move; `ai-ops` shifts. T14 checks a named roster of every `start` writer, in two lists (moves the animation / keeps keyframes absolute) (§10.4). |
| 23 | All three: the Assistant (#856) is missing as an easy door; no "first ten seconds" drawn end to end; no check against the collab chrome (ezra-fit §8) | **Ask** in the project tools when a key is set (D12). The first ten seconds are §7.3 and visualizer V2. The chrome check is visualizer V12 and test T12. |

---

## 1. The core idea (one paragraph)

FreeMotion keeps its single document: a flat, stacked array of free layers, each with its own absolute `start` and
`duration`. Simple is a second editor over that same array. It **reads** the array the way CapCut shows a project, as one main
track of clips end to end with overlays, text, captions, effects and sound in their own sections, and it **writes** back through
a small set of commands that keep that reading true: adding, deleting, trimming, reordering and speed changes all close up or
open the main track after the edit point, and everything on a moved clip moves with it. The only new stored facts are "this
clip is on the main track" and "this item stays put", as optional keys that the Full editor, the renderer, the exporter, old
builds and every storage route already carry untouched. So switching is instant and loses nothing either way, a Full project
opens in Simple as it is, and a Simple user and a Full user can share one live project because they are editing the same
thing.

---

## 2. The data model

### 2.1 Why this shape (the choices, briefly)

| Option | Verdict | Why |
|---|---|---|
| A project-level list of main-clip ids | Rejected | an id reference outside the layer; every re-id route must remap it; an element pack has no `project` (model §9); needs a `KEYED` entry and a schema bump |
| Per-layer flag + fractional order key (`ord` / `main.k`) | Rejected | two truths about order (`ord` and `start`) that a Full drag contradicts every time |
| Main track as a `group` | Rejected | `parent` would mean membership; a group look flattens the whole track (`js/compositor.js:15611-15622`) |
| Derived `start` from an order list (C) | **Phase 8 only** | forces push/swap on the Full editor, overrides ~30 `start` writers, changes the wire first (all three judges) |
| **Per-layer flags, order = `start`, magnetism in commands** (M option F = U's model) | **Chosen** | no id list, no second order truth, no derived writer, no renderer change, every Full edit stays legal and meaningful to Simple |

### 2.2 What is stored

```jsonc
// A clip on the main track (a video with a picture, an image, a shape or plain text used as a card, or a block, §9)
{ "id": "layer_k3v9q2", "type": "video", "start": 4.0, "duration": 3.2, "trimStart": 1.5,
  "srcW": 1920, "srcH": 1080, "srcRev": 0,     // native size + the mediaRev it describes, written at add and at every
                                               // route that sets a new media record (§5.2 fillsFrame, §14.2)
  "sm": { "main": true } }

// Who added this layer in a live session (§10.4 4c): a CREATION stamp, written only by the host on a guest's accepted new
// layer (never by host.local, never by a guest; absent = the owner, or a device the owner marked as his own). Kept on the
// keep-routes and on split B; stripped on every copy route (duplicate, paste, extract audio, AI clone) and on template /
// element save and export (§12.2), because whoever makes a copy owns it.
{ "id": "layer_t9", "type": "text", "by": { "mid": "m7", "name": "Sam", "color": "#e5a" } }

// An item that does NOT follow the clips, and whose end follows the end of the main track (music by default, §4.5)
{ "id": "layer_song01", "type": "video", "audioOnly": true, "sm": { "stay": true, "tail": true, "tailEnd": 80 } }
// tailEnd: the end it was last fitted or switched on at; a different end means he set its length on purpose (§4.5)

// The sound taken out of a clip (Take sound out / karaoke): a plain boolean, no id (§4.6)
{ "id": "layer_snd07", "type": "video", "audioOnly": true, "sm": { "twin": true } }

// The Mute-clip-sound mode muted this clip and will un-mute it when the mode goes off (§3.6 Mute row): true or absent
{ "id": "layer_c2", "type": "video", "muted": true, "sm": { "main": true, "muteByMode": true } }

// A capture date for Sort by date taken (§7.3): a plain layer field, NOT under sm, ms since epoch
{ "id": "layer_c3", "type": "video", "taken": 1726900000000 }

// The batch one multi-file pick came from (§5.2 import stacks): written by handleFiles at add time, stripped on copy
{ "id": "layer_c4", "type": "video", "pick": { "b": "pk_19a", "i": 2 } }

// Every other layer: no "sm" key at all. It follows the main clip it starts on (§4).

// The project: a version stamp for this namespace (the app has none, js/storage.js:1411), the fact that Simple has
// stored its main track (§5.3), and the editor a device with no memory of this project opens it in (a default).
"project": { "name": "Beach day", "width": 1080, "height": 1920, "fps": 30,
             "sm": { "v": 1, "adopted": true, "home": "simple", "muteClips": true, "mrev": 12 } }
// muteClips: the Mute clip sound mode; mrev: bumped by every change to the main track's structure (§10.4 4a)

// Phase 6 looks: ordinary layer fields, NOT under sm, because the renderer and the Full inspector honour them too.
{ "trIn": { "type": "crossfade", "d": 0.5 },                       // on the INCOMING main clip (§12.1)
  "clipAnim": { "in": { "type": "zoom-in", "d": 0.4 }, "out": { "type": "fade", "d": 0.3 } } }
```

`audioOnly: true` is now written **at add time** on every sound-only route (`addMediaLayer` when the media has no picture,
Add ▸ Audio, `FM.sfx`, `FM.voiceRec`), not only by `FM.extractAudio` (`js/app.js:1028`). Until now a song was known to be
sound only from its device-local media record (`isAudioOnly`, `js/inspector.js:3614-3617`); with no record it looked like a
full-frame picture (§5.2). **Every route that installs a new media record** (`swapInMedia` / `replaceMediaWith`, template
fill, `restoreReplacedMedia`, collab media landing: the same list that writes `srcRev`) also sets `audioOnly` from that record
(true when its width and height are 0, otherwise the key is deleted), except on a layer with `sm.twin` or `karaokeOf`: Full's
timeline and inspector treat `layer.audioOnly` as final (`js/timeline.js:2112`, `js/inspector.js:3664-3670`), so a song replaced
with a video (template fill offers every video layer as a slot, `js/template-fill.js:48`) kept a waveform and a sound-only
inspector. `srcW` / `srcH` are plain numbers (0 < n ≤ 16384) and `srcRev` a non-negative integer, kept by the
sanitiser beside `sm` (T7). `sm.tailEnd` is a finite number (§4.5); `pick` is `{b: string ≤ 32, i: integer 0..9999}` or
dropped; `project.sm.mrev` a non-negative integer. `taken` is kept by the sanitiser when it is a finite number with
0 < n ≤ 4102444800000 (1 Jan 2100: a constant, never `Date.now()`, so the host's invariant on clones,
`js/collab-bridge.js:144`, gives the same output on every device at every time); the "not in the future (+1 day)" test runs
only when the date is written, at add or Replace. It is written only for
files the user picked (§7.3), never for synthesised files (voice recordings, karaoke / extract-audio WAVs, sound effects, a
`File` rebuilt by `dataURLToFile` or by collab). `by` is kept only as `{mid, name ≤ LIM.NAME, color}` strings.

Per device, never in the document (the document syncs to everyone, collab §5). **One** store, not three (the old draft kept
`fm.editor.<id>` as well, and it disagreed with the card on duplicate and was never cleared on delete):

```jsonc
// the project index entry (per device, the elementDraft precedent, js/storage.js:2586-2592)
{ "id": "p_…", "name": "Beach day", "editor": "simple", "clips": 12 }   // editor THIS device last chose; clips for the chip
localStorage["fm.editor.new"] = "simple"                               // the card pre-selected in New project
sessionStorage["fm.editor.hop"] = "<projectId>"                        // an Open-in-Full hop, per tab (§6.2)
```

### 2.3 Rules for the `sm` key (each comes from a real past failure)

| Rule | Why |
|---|---|
| Top-level key `sm`, plain JSON, no key starts with `_` | `_` keys are dropped on every save, clone, snapshot and sync (`js/scene.js:757`, `js/collab-path.js:19-22`) |
| `main`, `stay`, `tail`, `twin`, `muteByMode` and `unit` are each `true` or absent; if `main` and `stay` both, `main` wins; `tail` implies `stay` | one boolean each, nothing to disagree about |
| `sm.main` is refused on audio-only layers and caption tracks (they fall back to the normal host rule); a shape, a non-caption text or a picture member of a block **may** be main. **`sm.main` is only ever stored on a member layer that draws a picture, never on a group layer**: `setFlag(group, 'main', …)` is refused and `sanitizeSm` drops it; a block's membership is its members' flags (§5.2 main blocks) | a unit that draws no picture cannot be a slot of the picture; the adopted classifier reads members, so a flag on the group was invisible |
| **The sanitiser reads only document fields.** "Audio-only" means `layer.audioOnly === true`; "caption track" means `type === 'text' && Array.isArray(captions)`. It never consults `FM.media`, `srcW`/`srcH`, the collab manifest or `FM.scene`. A clip that is sound-only only by its media record keeps a stored `sm.main`; the classifier ignores it at read time (§5.2 step 3) and lists it as an anomaly | load runs before hydration and a guest may never get the media, so a media-aware sanitiser gives different output on the owner and a guest, and before and after hydration: fix-op churn |
| **One writer:** `FM.spine.setFlag(layer, key, on)` merges into `layer.sm`, deletes the sub-key when off, and deletes `sm` once empty. No command assigns `sm` whole | `o.sm = {main:true}` would wipe unknown sub-keys (`sm.row`); `delete c.sm.main` would leave `sm: {}`, a second shape for "no flags" that re-sanitising on undo would rewrite |
| `sanitizeSm` maps any input to exactly that canonical form, so sanitising a valid document is a no-op; it runs on load (`js/storage.js:899`, beside `sanitizeMasks`/`Effects`/`UnsafeValues`), import, history restore and the collab clone | otherwise redo and host fix-ops rewrite the document |
| **No layer id is ever stored in `sm`** | id references need remapping at every copy route (model §0 rule 2); the whitelist-drift memory note |
| Unknown sub-keys (of `sm` and of `project.sm`) are **kept** when JSON-plain: not starting with `_`, not an `Object.prototype` name, a value that is null, a boolean, a finite number, a string ≤ 200 characters, or an array / object of these, within depth ≤ 3, ≤ 24 keys and ≤ 2 KB serialised. Anything outside that bound is dropped whole, never truncated, so the output stays canonical | the whitelist-drift lesson: refuse bad shapes, keep plain fields; "plain" is now defined, so a newer build's object-valued sub-key survives an older build |
| `project.sm.adopted` is the **only** meaning of "adopted" (§5.3). A stray `sm.main` on a never-adopted project is ignored by the derived pass | a flag carried in by an old build's paste or an element made from main clips would otherwise flip the whole project to "stored" and demote every real clip |
| `project.sm.v` is stamped by `create` and by `adopt()`. The sanitiser keeps it only as a finite integer clamped to [1, 1000] (never to `SM_V`: that path also runs on file load and import, and clamping would disable the newer-file guard). A build that reads `sm.v` greater than its own `SM_V` opens Simple **read-only** with one line, *"Made with a newer FreeMotion. Update to edit clips here"* (in a live room, *"Someone in this session has a newer FreeMotion"*); every arranging command refuses; Full stays editable. **In a live room only**, the host's project invariant (`js/collab-bridge.js:147`) clamps `sm.v` to its own `SM_V`, so an Editor cannot make Simple read-only for everyone. **`SM_V` changes only with a `SCHEMA_REV` bump**, enforced by hashing `SM_V` into the collab fingerprint (§14.2) | `SCHEMA_REV` only guards live rooms; a `.fmotion.json` or template carries old rules otherwise; a stray `P/sm/v = 99` from a peer would otherwise freeze the room with no way back |
| `project.sm.home` keeps any string ≤ 32 characters (a non-string is dropped); `FM.editor.homeFor` treats anything other than `'simple'` as `'full'` at read time. `project.sm.muteClips` is `true` or absent | an older build must not erase a newer build's third value, which the next autosave would persist |
| An **effect instance's** `sm` is kept only when it is exactly `1`, for top-level instances and container children alike: `sanitizeEffects` rebuilds each instance as `keepUid(f, {type, enabled, params})` (`js/storage.js:1500-1502`), which dropped it | the Simple-made marker (§8.5c) was removed on every load, undo, import and host check, so a Shake added in Simple turned Full-made (✦, read-only) after the next undo; shipped in Phase 1 with the other sanitiser changes, with `sm: 1` and `sm: 'x'` instances in the schema fixture |
| Nothing about which editor a person is using goes in the document | `project` syncs; the other person's editor would flip (collab §5) |

### 2.4 What is deliberately not stored

| Thing | Where it comes from |
|---|---|
| Main-track order | sort main clips by `start`, then lower in the stack first, then id |
| Which main clip an item follows, and its offset | worked out when needed (§4): the main clip its start sits on; offset = `start − host.start` |
| Which section an item is in | its kind (§5.2 table) |
| Which lane inside a section | packed at draw time (§8.6) |
| Gaps, overlaps, blends | seams between consecutive main clips (§3.1) |
| Which sound is a clip's sync twin | `isTwinOf(t, c)`: `karaokeOf === c.id`, or `sm.twin` plus the same source; both with an exact timing match (§4.6) |
| The editor in use | per device (§2.2) |

### 2.5 The read model (runtime only, never saved)

`FM.spine.read(scene)` is pure and deterministic. **Cache:** keyed on a document revision counter, `FM.docRev`, which
every history commit, every applied collab batch, every `history.mute`/`unmute` boundary, every `FM.media.set` / `delete`
(including a guest's media landing, `js/collab-media.js:1207`, and manifest meta arriving, §10.7) and every canvas resize
bumps. A hand-picked field hash is **not** used: the old signature (`id/start/duration/sm/parent/type/visible`) missed
`blendMode`, the caption list, `audioOnly`, transform and crop, media records and the project size, all of which the
classifier reads, so a Full user shrinking a clip into a picture-in-picture, or media arriving, left Simple drawing (and
adopting from) a stale main track. `read()` is called from `rebuild` only, never from the per-frame playhead path. The
runner (§3.7) calls `FM.spine.classify(FM.scene)` **uncached** before planning any arranging command or adoption. T1 proxies
the layer objects, lists every field `classify()` reads, and asserts each one invalidates the cache, so the key cannot drift
from the classifier (the list now includes the transform's opacity keys, opacity behaviours, `mask`, `masks`,
`effects[type=penmask]`, `pick` and a group's `sm.unit`, §5.2). `locked` is deliberately not a classifier input; the runner reads it live.

```js
{
  rev, adopted,                    // adopted = project.sm.adopted (§5.3), never "any layer has sm.main"
  eps: 0.5 / fps,                  // half a frame: "touching" tolerance (times are float seconds, model §6)
  main: [ { id, start, end, seam: { kind: 'join'|'hairline'|'gap'|'overlap'|'blend', amt } }   // in order; seam BEFORE it
        | { id: 'slot:<firstMemberId>', slot: true, start, end, members: [unitId, …], seam } ],   // a filled slot (§3.1)
  trackEnd,                        // end of the last main clip
  units: { [id]: { kind: 'overlay'|'text'|'captions'|'audio'|'effect'|'block'|'background'|'fullOnly'|'undecided',
                   media: 'here'|'arriving'|'missing',          // §5.2; 'undecided' = arriving with no size yet
                   host: '<mainId>' | 'slot:…' | null, pro: 'none'|'look'|'block', twinOf: '<mainId>' | null,
                   side: 'front'|'behind'|'mixed'|'none' } },   // side: z relative to the main clips it overlaps (§3.6.1)
  followers: { [mainId]: [unitId, …] },
  tail: [unitId, …],               // non-main units at or after trackEnd with no sm.stay: they follow the end (§4.3)
  riders: [captionTrackId, …],     // caption tracks: edited through the time map (§3.5)
  couplings: [ { from, to, via: 'parent'|'follow'|'matte'|'camera' } ],   // time links between layers (§3.10)
  wouldStay: [unitId, …],          // before adoption: items adoption would mark Stay put (§5.3)
  lanes: { captions: [[ids]], text: [[ids]], overlay: [[ids]], effect: [[ids]], audio: [[ids]] },
  anomalies: [ { kind: 'gap'|'hairline'|'overlap'|'mainInFront'|'negativeStart'|'undecided'|'missing'|'mainNoPicture', ids, amt,
                 overMain } ]                                   // overMain: an arriving unit overlaps the main row's span
}
```

`classify(scene)` **never reads `FM.scene`** (a pack is classified on its own layer list, §12.2). It builds, from its argument,
one `byId` Map and one `hiddenByGroup` Set (each layer walked once to its first group ancestor, memoised, cycle-capped at 64
hops as `js/scene.js:1131` does), plus a `splitOf → [halves sorted by start]` lineage index and a per-pass group-pivot cache.
It passes them as an optional `idx` to `FM.worldBox(layer, t, scene, idx)` and `R.linkOf`; `applyParentChain` and
`FM.clipAt` accept the same optional index (`idx.byId.get` and a binary search of the lineage), because today `FM.clipAt`
calls `FM.layerById`, an `Array.find` (`js/scene.js:787`, `:833-835`), and may then scan every layer, so three samples per
candidate through a parent chain made a big parented project quadratic. The renderer may build the index once per frame;
callers without one keep today's path. "Renders in a stretch" means `layer.visible && !hiddenByGroup.has(id)` and the window
`[start, start + duration)` meets the stretch (open interval): the same gate as `FM.isLayerVisibleAt`, without sampling, so a
scale-0 or keyframed intro counts. The candidate filters and slot detection are sweeps over intervals sorted by start (a
running max end per stack level for "covered by a higher candidate"), so the whole pass stays O(n log n).

A **unit** is a top-level layer, or a **block group** together with all its descendants. Group membership is the `parent`
link to a layer of type `group` (`js/scene.js:911`); `parent` pointing at anything else is **transform parenting**
(`js/scene.js:707`, the inspector's Parent picker, `js/inspector.js:5230`) and does not fold the child into anything: that
layer is its own unit. A group is a **block** only if it has to render as one piece: `groupNeedsUnit(g)` at any time
(`js/compositor.js:15611-15622`), `maskGroup`, or a keyframed transform or opacity on the group. **A group with `sm.unit ===
true`** (the wrapper an element or template insert makes, §12.2; Full's Ungroup drops it) is **not** a block for that reason: it
is a **moves-together group**, classified like a transparent group (each member is its own unit with its own kind, section and
tray, so a lower third's words and its bar's colour stay editable in Simple), except that its members follow one **anchor**
(§4.1). It is a block only if it is one for another reason. A plain tidy-up group ("Titles") is **transparent**: each
member is its own unit, and a caption track inside it is a rider.
**A transparent group's own layer is bookkeeping, not a unit.** `classify()` skips it (no kind, no section, no host).
`hostOf`, `removes`, followers, `pinStrays`, `R.tail`, whole-track adoption (§4.5), the tail fit and every `sm` flag never
apply to it, and `setFlag` refuses it. `R.linkOf` and `R.parentsMain` ignore a `parent` of type group (membership is not a
link, §3.10). **After the moves and the tail fit, before commit, every arranging command refits every transparent (and
moves-together) group that has members**, innermost first (the walk `FM.refitGroupsFor` uses): start = min member start,
duration = max member end − start. This cannot change a frame: such a group has no keyed transform, no unit-forcing effect and
no mask, and its window gates nothing (`FM.isLayerVisibleAt` gates members only on the group's `visible`,
`js/scene.js:1127-1139`). A transparent group with **no** members whose end is past the new `trackEnd` has its end clamped to
`max(start + MIN_LEN, trackEnd)`, its start kept. (Refitting only groups with a touched member left a "Titles" row from 0 to
20 s, or an empty row from `FM.addEmptyGroup`, `js/app.js:3782`, holding the video long after a delete, because
`FM.autoFitDuration` counts every layer, `js/app.js:893-906`, and the black band could not fit a row that is not a unit.) A
runner write, exempt from invariant 4 because the group never carries `sm`. When a Simple delete removes the last member it removes the empty group in the same step. The runner never calls
`FM.deleteLayer` on a transparent group (which recurses into every child, `js/app.js:3707-3709`); `plan.removes` lists member
ids only.
**A caption block.** A block that is not a main block or a wrapper and has at least one member where `FM.captions.isTrack(m)`
(a caption track plus a box in a group with a shadow or a group opacity, which `groupNeedsUnit` makes a block,
`js/compositor.js:15663-15668`) is listed in `R.riders` by block id. Every command's map (`f`, or `g` for Reorder and Sort) is
applied to each member as to a caption track (§3.5): its window, its cues, and its keys through `FM.spine.riderKeys`; the group
layer is then refit from its members and its own keys go through `riderKeys` too. A caption block is never a follower, never
goes through `isLong`, `pinStrays` or `R.tail`, never gets `sm.stay` / `sm.tail` at adoption (§4.5, §5.3), and its writes are
rider-only for the lock and lease rules (§3.7). (Before, such a block that covered the whole track was long, pinned and fitted
as one unit, so the speech moved and the cues stayed, with nothing said.) If the block also has a main member or a
frame-filling picture, any command whose map is not the identity over the block's span is refused before writing: *"Captions in
this group won't move with the clips · Open in Full"*. Editing its cue words keeps the ✦ line *"Captions in this group: edit
in Full"*.
Members of a block are never shown or moved on their own in Simple. Wherever a block's span is needed it is computed from
its members' min start and max end, never from the group layer's own fields (groups can be trimmed on their own grips,
`js/app.js:820-850`, and `FM.addGroup` makes an empty 0..P.duration group, `js/app.js:3737-3742`).

---

## 3. The ripple algorithms

### 3.1 Seams and tolerance

```
between consecutive main clips a, b:
  diff = a.end − b.start
  −1e-9 ≤ diff ≤ eps                                   → 'join'     (an overlap under half a frame is harmless: both render)
  −eps ≤ diff < −1e-9                                  → 'hairline', amt = −diff   (drawn like a join, no chip, listed in
                                                         R.anomalies; the runner lands it shut whenever it moves, below)
  diff < −eps and the stretch has slot members        → a SLOT ENTRY in R.main (below); the seams on both sides are 'join'
  diff < −eps                                          → 'gap',     amt = −diff
  eps < diff ≤ blendMax(a, b) and isBlend(a, b)        → 'blend',   amt =  diff   (a hand-made crossfade, below)
  diff > eps                                           → 'overlap', amt =  diff
first clip: start > eps → 'gap' (or a leading slot entry) from 0;  start < −eps → 'negativeStart'
blendMax(a, b) = 0.5·min(a.duration, b.duration)    // ONE definition: the seam table, the blend trim clamp and the greedy
MIN_LEN = max(1 / fps, 0.1)           // above sanitizeTiming's 0.05 (js/storage.js:1581) and equal to trimLayerHead's floor
                                      // compared with slack everywhere (Split, trims, the Delete floor): refuse only when
                                      // len < MIN_LEN − 1e-6, so a split exactly at MIN_LEN never passes or fails by an ulp
```

- **Blend.** `isBlend(a, b)` is true when the upper of the two in the stack has animated opacity (transform opacity, or an
  animated fade / dissolve effect) with at least one keyframe inside `[b.start, a.end]`. The upper clip may be the incoming
  one fading in or the outgoing one fading out. This is the only way to make a transition today (ui §420: "overlapping two
  layers by hand with opacity keyframes"), and new layers go on top by default (`FM.addAt = 0`, `js/app.js:2761`), so it is
  common. A blend is derived from geometry and keyframes; nothing is stored. It shows **no chip and no Fix**, Close all gaps
  skips it, Close gap and Fix never touch it, and every command keeps its `amt`. **No command may leave a blend seam with
  `blendMax < amt`**, and that is enforced by limiting or refusing the command, never by reclassifying: a trim of either clip
  stops at `newDuration ≥ 2·amt`, Speed and Split refuse, and a Delete whose new seam would not classify as a blend closes it
  to a join and says so (the §3.6 rows; the line is *"That clip fades into the next one"* / *"…into the one before"*, never
  *"Nothing more to trim"*). **Owned keys.** A blend has an **owner**, the upper clip, and **owned keys**: that clip's keys, on
  every property `isBlend` counted, in `[b.start − eps, a.end + eps]` (a fade-out is owned by `a`, a fade-in by `b`). Keyframe
  times are absolute (`js/scene.js:373-379`), so owned keys must move **with the seam, not with their clip's footage**, or a
  trim strands the fade outside the overlap and the crossfade becomes a hard cut with a red chip; each §3.6 row says what
  happens to them. Half the shorter clip is the ceiling (Q25 decided): a longer fade leaves no moment where the
  shorter clip plays alone, and CapCut limits transition length by clip length (`research/capcut-mobile.md:336`). An overlap with no
  animation, or a fade over `blendMax`, stays a red overlap chip. Phase 6's ◇ on a blend offers **Turn into a transition**
  (§12.1).
- **Slot.** A stretch between two main clips (or before the first) is a **slot** when it has **members**: non-audio units
  whose time window meets the stretch, visible **or hidden** (a hidden title card in a gap is still a card, not empty space),
  that start inside it and are not flagged `sm.stay` by the user. A slot is its own entry in `R.main`
  (`{id: 'slot:<firstMemberId>', slot: true, start, end, members, seam}`; `start/end` = the stretch, `0..R.main[0].start` for a
  leading slot), so it ripples as a piece: `followers['slot:…'] = members`, and "removing a clip removes its slot" uses the
  slot as `n` (delete clip 2 of `clip1 0-5, clip2 5-10, card 10-13, clip3 13+` gives `clip1 0-5, card 5-8, clip3 8+`). Its
  members have `host = 'slot:…'`; they are exempt from the half test / `isLong` (§4.1), from `pinStrays` and from adoption's
  `sm.stay`. A slot cannot be the target of Delete clip, a trim, Speed, Split, Make overlay or Duplicate; tapping it selects its
  contents; it can be reordered as one piece (hold-drag on the slot) and offers **Put in the clip row**; the joins on each side draw
  no chip; Close gap and Close all gaps never touch it. A stretch with no members but a visible full-frame picture rendering
  across it with `sm.stay` (a background) is a **covered gap**: no chip, never packed by Close gap or Close all gaps, nothing
  moves with it. Only a truly empty stretch is a `gap`.
- **Clips already under `MIN_LEN`** (older projects, splits made before Phase 1 at Full's old 0.02 s guard, imports floored at
  0.05 s by `sanitizeTiming`): Delete, Move earlier / later, Replace, Make overlay and look edits act on them normally, and
  Duplicate copies them as they are. Split, the Length row's −, a tail or head trim inward and a speed-up refuse with *"This clip
  is already as short as it can go"*; the Length row's + and a slow-down are allowed, so the clip can grow back past `MIN_LEN`.
- **Rounding.** Only points the **user picks** are rounded to the frame grid (`js/timeline.js:3849-3865`): a trim target,
  a split or insert point, a drag drop. **A ripple never rounds.** It moves every unit by exactly the displacement it
  computed, so every offset stays exact: joins, follower-to-host, keyframe-to-start, cue-to-clip and group members. (The
  old line "every command rounds its results" meant `l.start = snap(l.start + dt)` with keyframes moved by the raw `dt`,
  which desynced animation from its clip and turned a within-tolerance join into a gap chip after a plain delete, because
  imported clips are off the grid: `js/app.js:2992` uses the raw file length, e.g. 11.21 s.) When a command must land a
  unit on the grid (reorder, Make main clip), it computes `d = snap(target) − unit.start` **once** and applies that same `d`
  to the unit's start, keyframes, members, cue effects and riding cues.
- **A ripple never rounds, but it keeps joins exact, by landing, not by adding.** Visibility is strict (`t < start + duration`,
  `js/scene.js:1128`; null at `t ≥ end`, `:1069`) and the exporter samples at `start + f/fps` (`js/exporter.js:1467`), so a
  1-ulp gap at a join that lands on a frame time exports as a black frame (a Python-doubles run of "off-grid clip, five
  snapped splits, ripple-delete a middle piece" hit this in ~2.1-2.5 % of 20,000 sessions at 24/30/60 fps). Adding a
  correction does not seal it: in IEEE doubles `s + (target − s)` misses `target` in ~9 % of random cases and a summed form in
  ~25 %. So a plan entry may carry an **exact landing**, `addLand(moves, id, t)` (§3.3): the runner **assigns** `l.start = t`
  and passes `d = t − oldStart` once to the keys, members, cue effects and riding cues. After `ripple()` and `tailMove()`,
  walking the **new** main order (and each twin seam), the plan builder lands every `b` whose seam is to be a join at
  `newA.start + newA.duration`: (a) each pre-edit float-noise join (`|diff| < 1e-9`) or **hairline** in the moved range,
  including the seam that becomes adjacent across a deleted or lifted clip (measured as the sum of its two old seams); (b)
  **every seam the command creates**: Insert and Duplicate at the new neighbour's end, Make main clip at the seam, Reorder at
  `seam'`, both sides of a closed gap or Fix. Every later main clip, its followers, twins and the tail take the same correction
  inside their single move, so invariant 3 (one identical `d` per unit) holds to 1 ulp. Tail units that sat bit-exact on the old
  `trackEnd` land on the new one; the D6 slide-back lands at `max(c.start, newEnd − f.duration)`, and the effect-segment floor
  slide lands too. **Hairlines** (a positive gap of at most half a frame, which Full's 7 px magnet or snapping off can leave
  between a frame-rounded drag and an off-grid clip end, `js/timeline.js:666-675`, `:4222`, `:4246`) draw as joins but export a
  black frame whenever a frame time falls inside them, and a ripple by an off-grid `dt` makes that likely (probability
  gap × fps), so the command itself would cause it; landing them shut removes it. Hairlines left of the edit point, which nothing
  moves, are left alone; nothing is said (under half a frame). This is not rounding: the join was already a join (invariant
  13, §3.9).

### 3.2 Rules every command obeys
1. **Move by exactly the amount removed or added. Never re-pack the track, never round a ripple.** A gap or overlap left on
   purpose elsewhere stays exactly as it was (the HeyGen bug, pro §1). What moves is chosen by **main-track order**, never
   by comparing clock times (§3.4).
2. **One action = one undo step = one collab transaction** (the runner, §3.7).
3. **Keyframes move with their layer** through `FM.shiftLayerKeyframes`, which reads `FM.timedLists` (so cue-effect
   keyframes come too, Q3). Caption cues, the caption track's own keyframes and the camera's keyframes move through the
   command's time map (§3.5, §3.10). Text in/out and audio fades are clip-local and move for free (model §6). The effect clock
   (`FM.fxLocalTime = t − start + fxTimeOffset`, `js/scene.js:799-805`) moves for free on a **move**, but a **head trim** that
   changes which footage sits at `start` re-bases it: `FM.trimClipEdge` returns `fxShift` (the start delta of the footage;
   `L` for a head trim, 0 for a tail trim) and "apply r" writes it through `FM.shiftLayerFxClock`, as Full's A, grip and
   `trimLayerHead` do (queue 823, `js/timeline.js:105`, `:3969`, `:4045`).
4. **Links are worked out once, before anything moves** (`hostMap`, U), so the order of moves never changes who follows whom.
   At the same moment, for each arranging command, a unit with no `sm` key is a follower of the clip it starts on **unless it
   is long**: `isLong(u, R)` (§4.1) is true when it covers the whole main track, or runs past the end of the clip after its
   start clip (it touches three or more clips). There is no 50 % comparison anywhere, so float noise cannot flip it, and a
   two-clip straddler follows its start clip however its length divides. A long unit keeps its absolute time for this command
   and **is pinned with `sm.stay` in the same step**. **Only Delete cuts a long unit**, because it removes a whole clip: it
   cuts the deleted span out of every overlapping long unit through the delete map (§3.6, cases i-iii). Trims, Speed, Reorder
   and Make overlay never cut one: it keeps its absolute time and is pinned, as Final Cut and LumaFusion leave connected clips,
   so a trim under a narration that started on an earlier clip shifts the picture against it by the trimmed amount (§4.2).
   Because it is pinned (§4.3), no later command re-homes it. Nothing changes on draw, so this can never flip a link.
5. **Only Simple's commands ripple.** Full's delete, trims and drags are untouched. The ripple lives in `js/spine.js`, never
   inside the shared functions.
6. **Refuse, never half-apply.** A command that cannot do everything it planned does nothing and says why (§3.11).
7. **Companions travel as one.** A clip's sound twin (§4.6) gets the same trim, split, speed and reverse in the same plan.
8. **Every command states where the playhead lands** (§3.6.2).

### 3.3 The one primitive: shift a unit

```js
function shiftUnit(u, d) {                    // u = a layer, or a block group plus every descendant; d computed ONCE
  for (const l of layersOf(u)) { l.start += d; FM.shiftLayerKeyframes(l, d); }   // no snap; timedLists covers cue fx
}                                             // a block's own span moves with it; a transparent group is refit (§2.5)
```

A plan's `moves` is **additive**: every writer calls `addMove(moves, id, dt)` = `moves.set(id, (moves.get(id) || 0) + dt)`,
and the plan applies each id **once** with its summed `dt` (one `shiftUnit`, so keyframes shift once). **No command ever
writes `start` through `sets`**: every start change, including slide-backs (D6), effect-segment clamps and follower scaling on
units that do not otherwise ripple, is an `addMove` or an `addLand`. When one unit is both slid back and clamped in the same
command, its final start is computed once and gets one move. Three variants:
- **`addLand(moves, id, t)`** records an exact landing (§3.1): the runner assigns `l.start = t` (an assignment, not `+=`) and
  uses `d = t − oldStart` for keyframes, members, cue effects and riding cues. A unit with a land ignores any summed `dt`; the
  builder never gives one unit a land and a conflicting move.
- **A key-less move** (`{keys: false}`, used only for a unit a Delete cuts, §3.6): `shiftUnit` skips
  `FM.shiftLayerKeyframes` for it, because its keys go through `riderKeys` once, from their original times. Without it a
  cut unit's keys were shifted by the move and then mapped again (a duck at 8 s on a 20 s sound landed 4 s early).
- **`setUnitSpan(u, newStart, newEnd, g)`** is the only way a plan changes a unit's length outside a trim command: for a layer
  it lands the start, writes `duration`, maps keys through `g` and trims media through `FM.trimClipEdge`; for a **block** it
  applies the same map to every member (start and end through the map, clamped to ≥ `MIN_LEN`, keys through `g`, media members
  trimmed as the §3.6 Delete row does), then refits the block's group row(s) and sets the row's start to the members' min start
  (members render on their own windows and the row counts toward the length, so writing either one alone left the video long
  or members playing past the end). The tail fit (§4.5) and the black band's End with the video call it. The §4.3 effect clamp
  never applies to a block.

### 3.4 The one ripple (by main-track order)

```js
// Move main clips R.main[from..] (except those in `skip`), plus their followers and sync twins, by dt.
// If the edit is at or before the end of the track, the tail (end cards, §4.3) moves by the change of trackEnd.
function ripple(R, from, dt, skip, moves = new Map()) {
  for (let i = from; i < R.main.length; i++) {
    const c = R.main[i]; if (skip.has(c.id)) continue;
    addMove(moves, c.id, dt);
    for (const f of R.followers[c.id] || []) if (!skip.has(f)) addMove(moves, f, dt);
  }
  return moves;
}
// tailMove(R, newTrackEnd): for (u of R.tail) addMove(moves, u, newTrackEnd − R.trackEnd)
```

- **Each command passes an index, not a time.** Delete, Trim tail, Speed and Make overlay of `c` at index `i` pass
  `from = i+1`. Insert and Make main clip at the cut before `R.main[j]` pass `from = j`. Close gap / Fix before `b` passes
  `from = index(b)`. Reorder uses indices for both of its halves. The old rule (`c.start < T − eps` → skip) picked clips by
  the clock, so an overlap anywhere after the edit (a hand crossfade, two clips with one start, a friend's concurrent ripple,
  an old build) reordered the track silently: deleting `c = [5,10]` before `d = [9.5,14]`, `e = [14,18]` left `d` and moved
  `e` ahead of it.
- **Slot entries ripple like clips.** `addMove` of a slot entry moves each of its members; a slot has no source, so it
  is never trimmed, sped or split.
- **Removing a clip removes its slot, not its duration.** Delete and Make overlay of `c` (neighbours `p`, `n`) take out two
  seams and leave one: `dt = −(n.start − c.start)`, so `n` lands where `c` started and the seam `p|c` becomes `p|n` with its
  old amount (a join error within tolerance is kept exactly, never grown; a gap Full left stays a gap). `c`'s overlap or
  blend with `n` goes with `c`. If `c` is last, nothing after it moves and the tail follows the new track end.
- Followers of a clip **before** the edit stay, even if they hang past it: they follow their clip, not the clock.
- **Caption shifts anchor at the original start of the first moved main clip**, not at the edited clip's end, so cues and
  clips agree on what moves (§3.5 builds the time map from the same numbers).

### 3.5 Caption riders (one time map per command)

A caption track is one text layer whose cues are in layer-local seconds (`js/captions.js:1-16`, `:35-37` [checked]). It spans
many clips, so it does not follow one clip; its cues are edited where the main track changes. **Every command states one
piecewise-linear, non-decreasing time map `f` in project time**, built from the same indices and `dt`s as its ripple, and
applied to BOTH ends of every visible cue, to the track window, to the track's own keyframes, to the camera and its window
(§3.10), to the opt-in volume rider and to the loop region (§3.6.2). One map means a shift is never applied twice (a bug in
M's plan) and a cue that straddles an edit point always has an answer. **Reorder and Sort by date are the stated exception:** a
permutation cannot be non-decreasing, so they state a **piecewise translation `g`** instead (below), and every rider that
says "through `f`" uses `g` for them.

```
Delete [a, b), len = b − a      f(t) = t (t < a) · a (a ≤ t < b) · t − len (t ≥ b)     // a cue over the whole span keeps its
                                                                                        // outside parts joined: [s, e − len]
Insert D at seam                f(t) = t (t < seam) · t + D (t ≥ seam)                  // after splitAt(seam), below
Append Σlen                     Insert's f with seam = R.trackEnd, D = Σlen             // after splitAt(R.trackEnd) (Q20)
Trim tail / head, close gap     the same form with the landed dt
Speed of [a, a+old) → new       f(t) = a + (t − a)·k inside, t + (new − old) after       // cue [3,5] on clip [0,4] at 2× → [1.5,3]
Reorder c to seam s            one slot length L = n.start − c.start (L = c.duration when c is last), the SAME L the §3.6
  (original times)              row ripples by; c's trailing seam travels with c
  forward (s ≥ n.start)         P0 = [0, c.start) fixed · Pc = [c.start, n.start) moves seam' − c.start ·
                                P1 = [n.start, s) moves −L · P2 = [s, ∞) fixed
  backward (s ≤ c.start)        P1 = [s, c.start) moves +L · Pc = [c.start, n.start) moves seam' − c.start (= s − c.start) ·
                                P0 = [0, s) and P2 = [n.start, ∞) fixed
                                (with a plain trailing overlap, L < c.duration, [n.start, c.end) belongs to P1 / P2, so a
                                rider over the overlap follows n; c's own keys still move through shiftUnit)
Sort by date taken              one piece per main clip in the ORIGINAL order, [c.start, next.start) (the last clip's runs
                                to c.end), each moved by its own dt_c; the part of a piece past c.end (a closed gap) collapses
                                to c's new end, as in Delete; an overlap region [next.start, c.end) goes with next
Make overlay of c               Delete's f with a = c.start, b = n.start (b = c.end when c is last), len = b − a
```

**Make overlay** is the one command whose cue op differs from its `f`: cues use the lift / `paste(0)` form of its §3.6 row, and
every other rider (the camera and its window, the caption track's own keys and window, the opt-in volume rider, the loop region)
goes through this delete-form `f`, so the camera follows the clip row, not the lifted clip. (Reorder's map used to cut at
`c.end` and move P1 by `c.duration` while its ripple removed `n.start − c.start`, so with a gap or an overlap after `c` every
cue, camera key, track key, rider key and loop point over the moved clips landed off by the gap or the overlap.)

- **Piecewise translations (Reorder, Sort).** Cues: `splitAt` at every piece boundary (for Reorder: `c.start`, `n.start` **and**
  `s`, so a cue straddling the destination seam also splits), then each cue moves by its piece's offset (for Reorder this is
  the existing lift / paste). Keyframe riders use `FM.spine.riderKeys` (§3.10 rule 3) with boundary keys at every piece
  boundary. The caption track window: if its start and end lie in one piece it translates rigidly; otherwise the new window is
  the hull of `g` over its visible pieces, cues rebased and the head-extend effect-clock rule as today. The loop region: if
  `loopIn` and `loopOut` lie in one piece both go through `g`; otherwise it is cleared and the line adds *"· loop cleared"*
  (Undo restores it).

- **Straddlers.** `FM.captions.splitAt(cues, T)` replaces a cue with absolute start < T − eps < end by two cues with the same
  words and deep-copied `effects`: `[start, T)` and `[T, end)`. It is factored out of `FM.splitLayer`'s caption branch
  (`js/app.js:4914-4930`), which keeps using it. Mid-track halves carry **no** `animFrom`/`animTo` marks: `animSpan` honours
  them only at local 0 and at the layer's end (`js/captions.js:65-70`), and each half really should animate in and out around
  the inserted material. Insert, Append (Insert at the last seam: a cue running onto the end card shows its words before the
  new clips and over the card, never across them) and Make main clip split at the seam (a line cut by an inserted clip shows
  its words on both sides, not over the new footage; Q20); Reorder splits at `c.start`, `n.start` and the destination seam,
  so no two cues overlap after the paste. Freeze (Later) is the one deliberate exception and stretches (§3.6 freeze note).
- **Too short to keep.** After any map, a visible cue shorter than `MIN_CUE` (0.10 s, `js/captions.js:21`) is dropped before
  `normalize` can regrow it into the next cue (`:112-115`), and the line counts it: *"… and 1 caption too short to keep"*.
- **The track window moves through the map** (the old rules "`track.start` never moves" and
  `duration = max(duration, lastCue.end)` made a black tail after deleting the last clip under a full-length track, hid cues
  of a track that started inside a deleted clip, and revived cues a Full trim had hidden): `newStart = max(0, f(start))`,
  `newEnd = max(newStart + MIN_CUE, f(start + duration))`, and every cue is rebased by `oldStart − newStart` (the reverse of
  `shiftCues`' head rule, `js/timeline.js:3993`). If a paste leaves a visible cue before `newStart`, the window extends to it
  and `FM.shiftLayerFxClock(track, −d)` keeps the effect clock (the head-extend rule, `js/timeline.js:4022`). **The ends are
  snapped before mapping:** if `|(start + duration) − R.trackEnd| ≤ R.eps` the old end is taken to be `R.trackEnd` exactly, and
  if `|start − R.main[0].start| ≤ R.eps` the old start is taken to be `R.main[0].start`. A default track is sized to
  `P.duration` (`FM.addCaptionLayer`, `js/app.js:3465`), which `FM.autoFitDuration` rounds to the millisecond (`:906`), while
  imported lengths are raw (`:3033`), so about half of all default tracks ended a hair before `trackEnd`, stayed put under
  Append's `f` (t < seam) and never grew over the new clips; a caption typed there was clamped to the old end
  (`js/captions.js:124-130`). With the snap, Append, Insert at the end and Duplicate of the last clip map the end to the new
  `trackEnd`, and Delete of the last clip maps it exactly to the new end. In Simple, the Captions tool also sizes a **new** track
  to `R.trackEnd − R.main[0].start` from the read model when the main track is not empty, never to `P.duration`.
- **Hidden cues stay hidden.** `normalize` deliberately keeps cues a Full trim pushed outside the window (#452,
  `js/captions.js:81-110`). The map applies only to cues that overlap `[0, duration]` in local time. A hidden cue moves rigidly
  with the edge it hides past (past the end by `newEnd − oldEnd`, before the head by `newStart − oldStart`), so dragging the
  edge back out in Full still restores it. `cut` and `lift` never drop hidden cues.
- **The track's own keyframes ride too,** through the one rider procedure `FM.spine.riderKeys(track, map)` (§3.10 rule 3; it
  replaces the old `riderMapKeys` dedupe): every key in `FM.timedLists(track, {cues: false})` (transform, fill, stroke, shadow,
  the track's effects; the track's own lists **without** cue effects, which have their own owner below, or they moved twice)
  maps through the command's map in project time (keyframe times are absolute, `js/scene.js:373-379`), with boundary
  keys built like `splitLayer`'s seam key so the curves either side of an edit are kept exactly. It is called from the one
  place the cue ops are applied, so no command can forget it.
- **Cue-effect keyframes** (Q3, confirmed by reading): when the whole track moves as a unit, `shiftUnit` alone carries them
  (through `FM.timedLists`), with **no** extra per-cue shift, which would double it. Otherwise **each cue's effect keys move only
  by that cue's own map**: `+dt` for a shift, the speed affine about `a` for a scale, `+off` for a Reorder / Sort paste. A cue
  whose span contains a deleted `[a, b)` maps its keys through `f` with the same Cut(a, b) treatment as `riderKeys` (a seam key
  at `a` and `b`, keys strictly inside dropped, then mapped), so its keys after `b` move by −len with its content. After
  `splitAt`, each half's copied keys move with that half's own map, never by key time. No boundary key is ever inserted into a
  cue-effect list except that Cut pair. Which cue a key belongs to is the cue it sits in, not the key's time (a key can sit outside its cue's span). From
  4a the `+dt` for a shift is a **live-form** operation with no wire cost: a cue-effect key is sent relative to its cue
  (§10.4 4a), so a cue shifted within its track sends only its start/end ops. A speed scale still rewrites its keys (a
  content write, §10.4 4c).
- **A caption track that lies on one clip follows it.** A track whose window lies within one main clip (`start ≥ c.start − eps`
  and `start + duration ≤ c.end + eps`) and has no `sm.stay` is a **follower of that clip**, not a rider (Find speech's default
  "Just this caption clip" scope makes these, `js/captions.js:232`, `:480-481`). `shiftUnit` moves it whole; Delete removes it
  with `c` and counts it in the line (*"Deleted clip and 2 things on it"*), so no invisible 0.1 s track is left behind;
  Reorder carries it with `c`; head trim, tail trim and speed of `c` map its cues through that command's map and clamp its
  window to `c`. Tracks that span a cut keep riding.
- **An emptied track stays a caption track.** The classifier's test is `type === 'text' && Array.isArray(layer.captions)`
  (any length), not `FM.captions.isTrack` (≥ 1 cue, `js/captions.js:32-34`), so a delete that cuts every cue does not turn
  the track into a plain text follower.
- **Locked caption track.** A command whose only write to it is the rider (cue times, window, track keys) is exempt from the
  lock refusal; the lock stays (the full rider-only list is in §3.7). Otherwise one locked caption track would block every
  arranging edit.
- **A caption track stays with the sound it was timed from.** When Find speech succeeds, the runner looks at the layer that
  actually produced the cues (`used` / `src2` in `detectRow`, `js/captions.js:517-531`; the "clip" and "project" modes fall
  back through other sources, so not the picker's choice). If that layer is not a main clip and stays put (`sm.stay`, or
  `wouldStay` before adoption, or no host), the caption track gets `sm.stay` in the same undo step. Line: *"12 cues from
  ‘Voice 1’ · they stay with the voice-over"*. A main clip, or a sound that follows one (a sync twin), keeps the track a
  rider. **At adoption, caption tracks stay riders, whatever they cover** (the whole-track rule of §4.5 never applies to
  them: a rider's window end already follows the main-track end through `f`), except one whose span has no audible main clip
  under it and exactly one non-music stay-put sound covering it (a "most cue time over stay-put audio" test would freeze every
  caption track over a music bed). That exception and the tray are the only routes that give a caption track `sm.stay`. The
  Captions tray shows the choice always: **Follows the clips / Stays with the sound**.
- A caption track set to **Stay put** is not a rider: it keeps its absolute times.

### 3.6 Every command

Every command is a pure function `(R, args) → plan = { moves, sets, adds, removes, zMoves, cues, time, adopts, arranges }`.
Two flags, not one: **`arranges`** = the plan moves or removes an existing layer, or shifts or cuts existing cues (gated in a
live session, §10.2); **`adopts`** = the plan needs `FM.spine.adopt`. The runner gates `arranges || (adopts && !R.adopted)`,
because concurrent adoptions union `sm.main` and can overlap main clips (Q13). `i` below is `c`'s index in `R.main`; `p`, `n`
its neighbours. Every trim goes through one pure edge function:

> **`FM.trimClipEdge(layer, edge, delta, srcDur) → { start, duration, trimStart, landed, fxShift }`**, new in `js/timeline.js`,
> writes nothing. Its body is today's grip maths (`js/timeline.js:3881-3960`) minus the frame snap and the `atGrab` wrapper,
> with four branches, each flat and ramped: **forward head** (trimStart moves by `FM.headSourceDelta`; a pull-back is clamped
> to trimStart ≥ 0 by exact division, or by bisecting `FM.speedAdvanceOver` on a ramp); **reversed head** (trimStart stays;
> an extend is limited to `(srcDur − trimStart)/sp`); **forward tail** (`FM.maxDurForSource(srcDur − trimStart)`); **reversed
> tail** (the tail is the source window's START: shortening raises trimStart by the source cut, growing lowers it, limited
> by trimStart ≥ 0 via `FM.speedAdvanceSolve`). It clamps the **delta**, not just the duration, so the far edge never moves
> (today `FM.trimLayerHead`, `js/timeline.js:4033-4046`, floors `duration` at 0.1 but still adds the whole delta to `start`,
> never clamps trimStart ≥ 0, and advances trimStart on a reversed clip; its only callers are tests). The grip, the A and D
> keys (`clipTrimStart` / `clipTrimEnd`, `:86-127`), `FM.extendClipTo` (`js/app.js:4783+`) and both Simple trims call it,
> and "apply r" always writes `fxShift` through `FM.shiftLayerFxClock` (so the grip, A, `extendClipTo`, `trimLayerHead` and both
> Simple trims share one effect-clock rule on every branch: forward and reversed, trim-in and extend-back);
> `FM.trimLayerHead` becomes a wrapper that also re-bases cues. A **drag** uses `landed` silently, as the
> grip does. A **typed or picked exact value** whose `landed` differs by more than a frame, or is 0, is refused: *"Nothing
> more to trim"*, *"That's the start of the video"*, *"Not enough footage"* (when the source cannot give `MIN_LEN`; never
> floor past the source, Q21; `FM.maxDurForSource` returns `max(0.1, lo)` on a ramp, `js/scene.js:1015`, which can overrun).

| Command | Plan | Arranges |
|---|---|---|
| **Append clips** (the `+`, or New project's picked clips) | `T = R.trackEnd` (exact, no rounding); each clip `{start: T, sm:{main:true}}`, `T += len`; z per §3.6.1. The tail (an end card) moves `+Σlen`; cues `splitAt(R.trackEnd)` then Insert's `f` with seam = `R.trackEnd`, D = Σlen (§3.5); the camera and the caption track's own keys go through the same map whenever the plan moves the tail (§3.10 rule 3e). So clips land **before** the end card, as CapCut's ending clip. From the Clips tool the placement is **At the end** by default, with **After Clip N** (Insert at the cut `FM.spine.insertIndexAt` names) offered only when the playhead is strictly inside the main track (§8.5); the main track's `+` is always Append. **Empty main track but the project is not empty** (text-and-shape projects, his templates, `js/template-fill.js:36`) **and it has a visual non-main unit** (audio alone never asks; clips then land at T = 0): ask once with two drawn choices, *"Behind everything, as the background"* (T = 0, z directly above the top-most backdrop it overlaps, §3.6.1, else below every other visual; default: the backdrop rect is kept, and if he meant to replace it he deletes it) or *"After what's here"* (T = project end). Sound-only records in the same pick never enter the Append (§7.3) | once adopted: `arranges = R.tail.length > 0 \|\| cuesAfter(R.trackEnd − eps) > 0 \|\| tailFitWrites(R) > 0 \|\| untaggedWhole(R) > 0` (an end card, a cue shifted or split, an `sm.tail` item the runner would refit, or a non-main unit with no `sm` key covering the whole main track that passes adoption's exclusions, such as a watermark added in Full after adoption: gated, so `pinStrays` tags it `sm.stay` + `sm.tail` and the runner fits it in the same step, the line adding *"· the watermark now runs to the new end"*; before, such a watermark was left short and the new clips exported without it, with no band); otherwise **no**, so a live Append works in a plain clips-only project. The tap-time twin is `FM.spine.appendArranges(R)` (§8.5). Before adoption it **adopts** |
| **Insert at the playhead** | the cut `j = FM.spine.insertIndexAt(FM.time)`: the nearest cut, an exact tie at a clip's midpoint going *after* (the same helper names the Clips tool's *"After Clip N"*, §8.5, and places ⌘V, so the label and the command cannot disagree), before `R.main[j]` (or the end). **A blend seam refuses:** *"Clips 3 and 4 fade into each other · pick another cut"*, with a one-tap fallback that first turns the blend into a cut with §12.1's static-value strip and then inserts, the line adding *"· the fade became a cut"* (the same for Paste, Make main clip and a template splice at a blend seam); `D` = Σ lengths; new clips at `R.main[j−1].end`, or for `j = 0` at `R.main[0].start` in original positions (a leading gap or slot is kept before the inserted clips: "a gap left on purpose stays exactly as it was"); for `j = R.main.length`, at the last entry's end; `moves = ripple(R, j, +D, ∅)`; `cues: splitAt(seam)` then `f` | yes |
| **Delete a main clip `c`** | `dt = −(n.start − c.start)` (§3.4); `removes = [c, …followers(c)]` (followers are the non-long units on `c`, §3.2 rule 4, and a caption track lying inside `c`, §3.5) except, in a live session, items **made by another member** (§10.4 4c: those are kept with `sm.stay`). **Every long unit whose span overlaps `[a, b)`** (not a follower, not a caption track or caption block, not `fullOnly`, not in `R.tail`, not a block, with no `sm.stay` before this command) **goes through the command's own delete map `f`** with `a = c.start`, `b = n.start` (`b = c.end` when `c` is last), `len = −dt`; nothing is ever measured against `c.end` separately. (Picking only units that *start on* `c` left a narration starting on clip 1 uncut by a Delete of clip 2: out of step by `len` from clip 3 on and overhanging the end, while a Delete of clip 1 cut it.) (0) A cut unit's start change is a **key-less move** or a landing (§3.3); its keys go through `FM.spine.riderKeys(u, f)` **once, from their original times**, never shifted and then mapped, so every list stays sorted. (i) **Starts in `[a, b)`**: media (video, audio) is head-trimmed with `r = FM.trimClipEdge(u, 'head', b − start, srcDur)` (flat, ramped and reversed) and landed at `a`, so its footage stays in step; text, shape and still land at `a` with `newEnd = max(a + MIN_LEN, f(end))`. (ii) **Starts before `a`, ends in `(a, b]`**: `newEnd = max(start + MIN_LEN, a)`, a plain duration cut with no source change. (iii) **Starts before `a`, ends after `b`** (a middle cut): a unit whose `trimStart` does not advance (text, shape, still) gets `duration −= len`, no split; video or audio is split at `a` with `FM.splitLayer(u.id, a)`, the second half head-trimmed by `len` (`FM.trimClipEdge(B, 'head', len, srcDur)`) and landed at `a`, both halves pinned `sm.stay` in the same step. The whole command is refused if any half would fall under `MIN_LEN` (rule 6). (Effect clock) every cut unit whose start moved gets `fxShift = b − max(start, a)` through `FM.shiftLayerFxClock` once: for media it is the value `trimClipEdge` returned, for text, shape and image the plan writes it, so a Drift or Wiggle does not jump at the cut. **A block is never cut:** a long block (its insides are only shifted as a whole, §9.2) is pinned with `sm.stay` at its absolute times and the line adds *"kept 1 block in place"*. A unit that a survivor references (as transform parent, matte source, behaviour target or `karaokeOf`) refuses the whole command, naming both, **unless the deleted clip is a split-lineage half and the survivor resolves to a surviving half**, which is repointed in the same step (§3.10 rule 5). Transitions: `trIn` is dropped from `n` (its outgoing neighbour changed, §12.1). **Blends:** when `c` owns the blend `p|c` (it fades in over `p`), `n` lands at `p.end` (a join, `dt = −(n.start − p.end)`) and the line adds *"· the fade went with it"*; when `p` owns it, the new `p|n` seam keeps `amt` only if it still classifies as a blend (`p` still above `n` in z, `amt ≤ blendMax(p, n)`); otherwise `n` lands at `p.end`, `p`'s owned keys are stripped with §12.1's static fallback (never `{kf: []}`) and the line adds *"· removed 1 crossfade"*. A blend never becomes an overlap chip. `moves = ripple(R, i+1, dt, {c})` + tail; `cues: f` (delete). Line *"Deleted clip and 2 things on it"* + **[Undo]** (+ *"kept 1 item that runs on, trimmed to match"*, *"· removed 1 transition"*) | yes |
| **Trim the tail of `c`** to `n` | `r = FM.trimClipEdge(c, 'tail', n − c.duration, srcDur)`; apply r; `dt = r.duration − oldDur` (the **landed** amount); if `dt < 0`, each follower of `c` (from the pre-edit `hostMap`) with **`f.start ≥ c.start + r.duration − R.eps`** (the same tolerance `mainAt` uses, so a title starting exactly on the new end, as pressing **D** on its first frame gives, counts as cut away) slides back onto `c` (D6): compute `s' = max(c.start, c.start + r.duration − f.duration)` once, then `addLand(moves, f, s')`, so its keyframes, members and cue effects move by the same `d` (inv. 3); never a `sets` write to `start`; effect segments that fitted inside `c` are clamped to fit again (§4.3); long units left in place are pinned (§4.3); `moves = ripple(R, i+1, dt, ∅)` + tail; `cues: f`. **On a blend seam `c|n`** (§3.1): the trim stops at `newDuration ≥ 2·amt` (a drag stops there; a typed or picked value below it is refused with *"That clip fades into the next one"*); when `c` owns the blend, its owned keys map through `riderKeys` with the seam's displacement (for `dt < 0` the Delete map over `[n.start + dt, n.start)`, for `dt > 0` the Insert map at `n.start`), so the fade still ends at `c`'s new end over the same `amt`; when `n` owns it, the ripple already carries `n`'s keys (asserted) | yes |
| **Trim the head of `c`** by `h` (+ in, − extends back) | `r = FM.trimClipEdge(c, 'head', h, srcDur)`; `L = r.landed`; apply r **without writing `start`**: it writes only `duration`, `trimStart` and `r.fxShift = L` (through `FM.shiftLayerFxClock`, so Drift, Spin, Orbit, Wiggle and Shake keep their phase on the same footage, queue 823), and `c`'s keyframes shift by `−L` relative to its unchanged `start`, so `c` keeps its slot by construction and its keys stay on the same footage (the old "apply r, then `shiftUnit(c, −L)`" wrote `(s + L) − L`, which misses `s` in 6.5-7.9 % of frame-snapped cases at 24/30/60 fps and could open the `p|c` join; only the forward branch moves trimStart); each sync twin is trimmed and re-clocked the same way in the same plan; followers of `c` move `−L`, clamped at `c.start` (D6: they stay on the same footage frame); effect segments clamped (§4.3); `moves = ripple(R, i+1, −L, ∅)` + tail; `cues: f` built from `L`. **On a blend seam `p|c`**: the trim stops at `newDuration ≥ 2·amt` as for a tail trim; when `c` owns the blend (a fade-in), its owned keys (`t ≤ p.end + eps`) are exempt from the `−L`, and its other blend-property keys map through the Delete map over `[p.end, p.end + L)` (L > 0) or the Insert map at `p.end` (L < 0), so the lists stay sorted and the fade stays over the overlap; when `p` owns it, nothing moves at the seam (asserted) | yes |
| **Split `c` at the playhead** (the play bar's ✂, key **S**) | If playing, pause first. `t = snap(FM.time)`. Refuse if `t − c.start < MIN_LEN − 1e-6` or `c.end − t < MIN_LEN − 1e-6` (*"Too close to the edge of the clip. Trim instead?"*, one tap trims to the playhead). Refuse when `t` lies in any blend or overlap span `[b.start, a.end]` of the main track, whichever clip is selected or `mainAt` picks (*"Move the playhead out of the crossfade to split it"*): a split there made a half that overlaps a clip it is not next to, or a half shorter than its fade. Outside the span, refuse when the half beside a blend would be shorter than `2·amt`. Otherwise `FM.splitLayer(c.id, t)` (new optional `t`, default `FM.time`; `js/app.js:4855` [checked] already divides keyframes, fades, text animation, cues and the effect clock). **Phase 1 also raises Full's guard at `:4860` (`js/app.js:4905` in today's tree) from 0.02 s to 0.1 s**, the floor every other Full path already uses (the grips, `js/timeline.js:4264`, `:4273`, `:4284`, `:4419`; the playhead stretch, `js/app.js:~4862`; speed, `js/inspector.js:5830`, `:5835`, `:5882`, `:5890`): it refuses when `(t − layer.start) < 0.1 − 1e-6 \|\| (end − t) < 0.1 − 1e-6`, above `sanitizeTiming`'s 0.05 (`js/storage.js:1581`) and equal to `MIN_LEN` at every fps ≥ 10 (0.05 still let a Full split make a 0.067 s clip at 30 fps, which broke invariant 7 on the next Simple command), with the same *"Park the playhead inside the clip"* toast, so neither undo (`history.restore` → `_sanitizeLayers`) nor the live host's invariant fix ops (`applyAndFix` → `invariantFix`, owner and guest alike, `js/collab-host.js:609-697`, `:840`, `:883`) can grow a half into a one-frame overlap (Q28). The plan builder, not the runner, reads the time, so a split never lands at a later `FM.time`. B is a clone, so it has `sm.main`. The `onSplit` hook drops `B.trIn`, splits `clipAnim`, and calls `setFlag(A, 'tail', false)`: only the later piece can end with the video (A keeps `sm.stay`; true for reversed clips too, because `tail` is timeline-side). Sync twins split at the same `t`; a karaoke twin's `B′` gets `karaokeOf = B.id` (cloneLayer keeps A's id, §4.6). Followers after the cut now start on B. **Lease pre-check from Phase 2** (§3.7): a leased `c` refuses the split whole before any `li(B)` is sent | **no** |
| **Reorder `c`** to between `p'` and `n'` | Both halves are computed against the **original** `R` and summed with `addMove` (never "the closed-up positions"): close the hole `ripple(R, i+1, −L, S)`, open the slot `ripple(R, j, +L, S)`, with **one slot length `L = n.start − c.start`** (`L = c.duration` when `c` is last: the tail then follows the new track end), the same `L` §3.5's `g` uses, and `S = {c} ∪ followers(c)` in both; `c`'s trailing seam travels with it, so afterwards `c|n'` has `c`'s old `c|n` amount and `p|n` keeps `p|c`'s old amount, and outside the two edit points the track length and every other seam are unchanged (§3.9 inv. 1); **a clip on either side of a blend refuses** with Sort's line *"Some clips fade into each other · move them by hand"* (its owned keys would arrive at a join they were never made for); `c` and its followers get a **single** move of `seam' − c.start` (`seam'` = `R.main[j−1].end` in final positions; for `j = 0`, `R.main[0].start` in original positions, so a leading gap or slot stays before the moved clip; for `j = R.main.length`, the last entry's end); every rider goes through the piecewise translation `g` (§3.5): cues `splitAt(c.start)`, `splitAt(n.start)`, `splitAt(s)`, `lift`, map, `paste(seam' − c.start)`; the camera, the track's own keys and the volume rider through `riderKeys` with boundary keys at `c.start`, `n.start` and `s`; the track window and the loop region per §3.5. Transitions: `trIn` is dropped from the clip after `c`'s old place, from `c` itself and from the clip that now follows `c` (§12.1) | yes |
| **Speed of `c`** to `sp` (flat only) | Refuse when `span / sp < MIN_LEN − 1e-6`, with `span = FM.layerSourceAdvance(c, c.duration)` (*"Too short to speed up that much"*; never floor past the source, as Q21; so the commit never reaches `setClipSpeed`'s 0.1 floor, `js/inspector.js:5852-5862`, which would play past the out-point); the same check on each sync twin refuses the whole command, and so does a new length under `2·amt` of either adjacent blend (§3.1, the fade line). Otherwise `FM.setClipSpeed(c, sp)` (extracted, same code, from `js/inspector.js:5850-5880`: keeps the source span, scales `c`'s keyframes about `c.start`); `k = new/old length`; each follower gets `addMove(moves, f, (f.start − c.start)·(k − 1))`. **Followers keep their own length and key timing**: only where they start on `c` scales, as FCP's connected clips do on a retime, so a title's hold and text animation are never squashed; one that now runs past `c`'s new end is the §4.2 straddle cost (effect segments are clamped, §4.3). Caption tracks lying on `c` are the exception: their cues map through the speed `f` (§3.5), because they are timed to the sound; effect segments clamped (§4.3); long units left in place are pinned (§4.3); `moves = ripple(R, i+1, new − old, ∅)` + tail; `cues: f` (speed). Simple's Speed panel is its own thin panel that commits this plan once on release (§8.5) | yes |
| **Use one speed** (ramped `c` → flat) | keeps the **length**: `sp` = the source span (`FM.layerSourceAdvance(c, c.duration)`) ÷ the length, so the length and every other unit's start stay (the alternative, 1× keeping the source span like Reset speed, `js/app.js:5205-5228`, changes the length and would arrange). A flat speed changes which footage sits at each time inside `c`, so cues inside `[c.start, c.end)` (on a riding track or a caption follower of `c`) and their cue-effect keys go through `φ(t) = c.start + advOld(t − c.start)/sp`, with `advOld` = `FM.speedAdvanceOver` under the old ramp: monotone and fixing both ends of `c`, so no ripple, no boundary keys and no straddler split. Other followers and `c`'s own keys stay (the Speed rationale). The playhead, if inside `c`, maps through `φ` | no (gated when a cue moves) |
| **Duplicate a main clip** | `dupId = await FM.duplicateLayer(c.id, {noSave: true})` (reloads media, fresh id, drops `splitOf`, splices directly above `c`, `js/app.js:4313-4365`; a bare `FM.cloneLayer` has no media blob; `noSave` skips its own `FM.storage.save()`, so the un-rippled document never reaches disk mid-run, and the runner's one commit saves); refuse if undefined. Then `setFlag(dup, 'main', true)` (put back after `onCopy` strips it; the one route that does so, on purpose; `trIn` is **not** put back, so a copy never gets a transition from its own original); `addMove(moves, dup, c.end − c.start)` (landed at `c`'s end, §3.1) so start **and every keyframe** move together; when `c` owns a blend, its owned keys are stripped (§12.1's static fallback, never `{kf: []}`) from the copy for a fade-in or from the original for a fade-out, so the fade stays only at the outer seam and `c|dup` is a clean join (before, a fade-out original faded to black at the new join) (`FM.cloneLayer` keeps keyframes at the original's absolute times, `js/scene.js:807-829`); sync twins duplicated the same way, a karaoke twin's copy getting `karaokeOf = dupC.id` (separate `duplicateLayer` calls do not share an idMap, `js/app.js:4330-4354`); `moves = ripple(R, i+1, +len, ∅)` + tail; `cues: splitAt(c.end)`, `f`. `R` is read before the copy exists. Things on `c` are not copied (as CapCut). Insert's "add at seam" is only valid for layers with no keyframes; anything cloned goes through a move | yes |
| **Replace** (the tray, and template fill in an adopted or `home: 'simple'` project) | **No picker inside the runner, ever**: a dismissed picker can leave the promise unsettled (`js/app.js:4652-4656`), which would leave `FM.spine.running` true and history muted for good. `FM.replaceMedia` is split into `FM.pickReplacement(id) → Promise<nrec \| null>` (picker plus decode, called from the tap, outside the runner) and `FM.swapInMedia(id, nrec, {noSave})` (stash the old record, swap, fit, `mediaRev++`, `rec.rev`, and write `srcW`/`srcH`/`srcRev`). Simple runs `const nrec = await FM.pickReplacement(id); if (nrec) FM.spine.edit('Replace', R => plan(nrec…))`, and `apply` calls `swapInMedia`. Full's ⋯ Replace keeps using `FM.replaceMedia` = pick + swap. The slot is kept; a shorter source becomes the Tail-trim plan (slide-back, cues, ripple) in the same step. Template fill (`js/template-fill.js:261-270`) routes each slot through this command, one step per slot, so a Simple template filled with shorter phone clips has no gaps and every title stays on its clip; outside Simple it keeps today's `FM.replaceMedia` | yes if shorter |
| **Make overlay** (lift) `c` | `c` keeps its time; `setFlag(c, 'main', false)`; `c.trIn` is set to null and `n`'s `trIn` dropped (§12.1); `dt = −(n.start − c.start)`; `moves = ripple(R, i+1, dt, {c} ∪ followers(c))` + tail; **cues: the Reorder form with a zero paste**: `splitAt(c.start)`, `splitAt(n.start)`, `lift` the cues inside `[c.start, n.start)`, map the rest through the delete `f`, `paste(0)`, so `c`'s captions keep their absolute times over `c` (whose sound still plays there), overlapping `n`'s where needed (#574 draws stacked cues together, `js/captions.js:83-115`); **camera, track keys, volume rider and loop region: the delete-form `f`** (§3.5), cut at `c.start` and `n.start` with a clean-step boundary pair (§3.10 rule 3b); the caption track window goes through the same `f`, then extends to any pasted cue by the head-extend rule; when `riderKeys` drops at least one original camera key strictly inside `(c.start, n.start)` the line adds *"· camera move over the lifted clip cut"* (a notice, not the rule-4 ask: the camera is a keyframe rider, not a coupling; Undo restores it); `zMoves`: `c` takes the overlay band slot (§3.6.1): above every non-text, non-caption layer it overlaps, below its titles and captions; followers of `c` keep their time with it and get `sm.stay` in the same step (only a main clip can host, so otherwise they would silently re-home to whatever slid under them); long units left in place are pinned (§4.3); sync twins stay with `c` | yes |
| **Make main clip** (drop) for overlay `o` | `seam` = the cut nearest `o.start`, before `R.main[j]`; `moves = ripple(R, j, +len, {o})`; `addMove(moves, o, seam − o.start)` (never a `sets` write to `start`); `setFlag(o, 'main', true)` (on a block, through `FM.spine.setMembership`, which writes the flag on its picture members, §5.2); `cues: splitAt(seam)`, `f`, except that the cues wholly inside `[o.start, o.end)` move with `o` by `paste(seam − o.start)` when `o` is audible (has sound, not muted) and no audible main clip is under that span (the same test as §3.5's adoption exception); otherwise they stay (they may belong to the main clip under `o`); `zMoves`: `o` joins the main band | yes |
| **Put in the clip row, for a slot `s`** (the slot's own entry, §3.1; no longer an alias of Make main clip, whose plan would ripple the slot's other members and every later clip by `+len` and open a gap) | **No ripple and no move**: the stretch is already reserved in `R.main`, so `moves = ∅` apart from the tail fit, and `zMoves` put the new main unit in the main band. The flag: among the members that pass §5.2's `fillsFrame` (visible or hidden, blendMode and opacity ignored), if exactly one, `setFlag(it, 'main', true)` through `FM.spine.setMembership`, and the others follow it by the start rule; if two or more, the one that starts first (ties: lowest in the stack) is flagged and all members are wrapped with it in an `sm.unit` moves-together group whose anchor is that main member (§4.1); if none (a text-only card), refuse with *"Nothing in this card fills the frame · Open in Full"*. A main unit shorter than the stretch leaves an honest gap chip, never closed by itself. One undo step, label *"Put card in the clip row"* | yes |
| **Delete card** (the Slot tray, §8.5) | `removes = s.members` (plus any emptied transparent group, §2.5); `dt = −(n.start − s.start)` with `n` the next `R.main` entry (the §3.4 "removing a clip removes its slot" rule, the slot standing in for `c`); `moves = ripple(R, index(n), dt, s.members)` + tail; `cues: f` (delete). Line *"Deleted card · Undo"* | yes |
| **Close gap / Fix overlap** (tap a seam chip) | gap before `b`: `ripple(R, index(b), −amt, ∅)`; overlap: `+amt`; the seam's diff becomes exactly 0, landed (§3.1) (never a blend, a slot or a covered gap) | yes |
| **Close all gaps** (the play bar's ⋯, shown only when there is one) | every gap, overlap and hairline, left to right, one commit; blends, slots and covered gaps skipped. The ⋯ entry counts a hairline only when a frame time at the project fps falls inside it, so it never offers an invisible no-op | yes |
| **Sort by date taken** (⋯, shown only when at least two main clips carry `taken`) | Refuse if any seam in `R` is a blend or a slot, or any main clip is a block or a group member: *"Some clips fade into each other · move them by hand"*. Order: main clips by `taken` ascending, undated ones after the dated in their current relative order (stable; ties by current index); if unchanged, the line *"Already in date order"* and no step. Positions: packed end to end from `R.main[0].start` in the new order, keeping each length (gaps and overlaps closed, as Close all gaps, and the line says so). Each clip `c` gets one `addMove(dt_c = newStart_c − c.start)` for `c`, its followers and its twins; the tail moves by the change of `trackEnd`; long units and strays are pinned. Built directly from final positions, never as summed Reorders (each Reorder's ripple assumes the other clips stay put). Cues and keys use the piecewise translation of §3.5 (a piece per clip; cues over closed gaps collapse as in Delete); the loop region is cleared (*"· loop cleared"*). Undo label *"Sort 6 clips by date"* | yes |
| **Put behind** (a main clip Full moved above an overlay, U §3.6) | `zMoves`: back into the main band | no |
| **Add text / overlay / sticker / effect segment / sound** | a new layer in its side-aware band (§3.6.1), inserted through `FM.spine.insertAt`. When the main track is not empty, a new text, overlay, sticker or sound effect is clamped to the **track** end (not its host's end: titles cross cuts freely): with `t = FM.time` and `L` the default length, if `t ≥ R.trackEnd − MIN_LEN` (the playhead is at the end, which is where playback leaves it, `js/app.js:2409-2413`) then `start = max(R.main.at(-1).start, R.trackEnd − L)`, else `start = t`; `duration = max(MIN_LEN, min(L, R.trackEnd − start))`. It then follows the clip it starts on and never lengthens the video. A deliberate end card is still made by dragging an item past the end; existing tail items are untouched. Effect segments keep §4.3. **Music always gets `sm.stay` + `sm.tail`** (and `tailEnd`), even on an empty main track: with a main clip it is trimmed to end at the main-track end with `fadeOut = min(2, duration/4)`; with none it is left whole and the first arranging edit that makes the main track non-empty fits it in the same step (§4.5). Other sounds follow §4.1's one sound rule (a sound that runs more than 1 s past the clip it starts on stays put), whoever added them | no |
| **Stay put** toggle | `setFlag(u, 'stay', …)` | no |
| **Ends with the video** toggle (§4.5) | `setFlag(u, 'tail', …)`; switching on fits the end at once and writes `tailEnd`; off clears `tailEnd` | no |
| **Mute clip sound** (the main track's head 🔈, its one home) | The mode lives on the document as `project.sm.muteClips` (it syncs, which is right: the mute is part of the video); the 🔈 reads this key and never works the state out from the clips. **On** (a no-op if already on): for each main clip whose `muted` is not already true, set `muted = true` and `setFlag(c, 'muteByMode', true)`; clips he had muted himself get no flag. **Off:** for each clip carrying `sm.muteByMode`, clear the flag and set `muted = false`, except a clip with a sync twin or a `karaokeOf` companion (queue 914.9: unmuting an extracted original plays the sound twice); then clear `project.sm.muteClips`. While the mode is on, Append, Insert, Duplicate, Replace and Make main clip mute and flag the new main clip in the same step; Make overlay clears the flag and restores its sound. A change to `muted` anywhere else (the inspector, Full, a friend) clears that clip's `muteByMode` in the same commit, so a manual choice is never overwritten. `onSplit` / `onCopy` keep the flag. Live, the toggle runs through `FM.spine.edit` with the `blockers` pre-check, so a leased clip refuses the whole toggle, naming the friend | no |
| **Reverse / Un-reverse `c`** | `sets: {reversed: !c.reversed}` on `c` and on each sync twin (§4.6), and nothing else: start, duration, trimStart, speed, keyframes, followers, cues and comment pins keep their absolute times, as Full's toggle does (`js/app.js:5197-5202`) and as CapCut does; nothing is mirrored. Playhead stays. **The frame cache is never built inside `apply`** (a decode can take many seconds on a phone, with history muted and collab busy): after `commit` the runner calls `FM.ensureReverseCache(c)` (un-reverse calls `FM.maybeClearCache`), then `FM.reconcileAudio()`. A reversed clip with no cache still draws through the seek path (`js/app.js:1222`), and `requestPlay` (`:2566-2572`) already waits for the cache before playing. A decode failure shows the line *"Couldn't prepare the reversed clip, it will play slowly"* and keeps the edit. Twins never get a frame cache (`&& !l.audioOnly` in the `ensureReverseCache` guard, `js/app.js:1648`, and both warmers, `:2566`, `js/storage.js:494`): a twin needs only `m.audioBuffer` | no |
| **Transition picker / Length** (Phase 6) | `sets: trIn` on the incoming main clip; on an un-adopted project it `adopts` first (a look-class edit, like `setMembership`); **Use on every cut**: the same, in one step; **Turn into a transition** trims two main clips (§12.1) | no (Turn into: yes) |

Every arranging plan above also: carries the couplings (§3.10) and the camera through its map (`g` for Reorder and Sort);
clamps effect segments (§4.3); applies the same `trimClipEdge` / `setClipSpeed` / `splitLayer` / reverse call to each sync
twin of `c` (§4.6); re-seats float-noise joins (§3.1); and refits touched transparent groups (§2.5).

**Freeze frame (Later, Phase 7) must not be built as plain Insert.** It cannot be a speed (speed floors at 0.05,
`js/storage.js:1591`, `js/scene.js:~997`). `FM.snapshotPNG` cannot be used as it stands: it renders at `FM.time` through
`FM.renderScene`, whose windows are half-open, so after a split at `t` the soloed head half A (which keeps the id,
`js/app.js:4900-4919`) is not drawn and the frame is blank; the end-instant nudge lives only where the preview is drawn
(`js/compositor.js:16015-16033`); and it returns nothing, downloading a PNG instead (`js/app.js:4229-4276`). So the model is:
(a) factor a pure `FM.renderStill({t, soloId, scale}) → Promise<Blob>` out of it (the same `exportSoloPrep`, isolate and crop
hold-aside, `renderScene`, `toBlob`, no download); `FM.snapshotPNG` becomes `renderStill` plus the existing download, unchanged
in behaviour. (b) Capture **before** any split, with `c` whole: `blob = await FM.renderStill({t: tf, soloId: c.id})` (never
the whole scene, or titles are baked into the still), store it as an image media record, and only then build the plan (the
await is outside `apply`, like the reverse cache). (c) Choose the held frame and the insertion point by where `t` falls: if
`t − c.start < MIN_LEN`, hold the first frame (`tf = c.start`), no split, and Insert the still before `c` at `c.start`; if
`c.end − t < MIN_LEN` (including a playhead parked on the cut), hold the last frame (`tf = c.end − 1/fps`), no split, and
Insert after `c` at `c.end`; otherwise `tf = t`, split `c` at `t`, and Insert the still at `t` with a 3 s hold and `sm.main`.
For this command only, items starting within `eps` of the insertion point are re-hosted onto the still (not carried past the
hold), which overrides §4.1's "exactly on a cut → the clip after". **Caption cues are timed to speech, not picture, so they use
their own map, not the title rule:** a cue with `end ≤ t + eps` stays; a cue with `start ≥ t − eps` moves `+D` with B (its
words are spoken on B, not over the silent still); a cue straddling the insertion point keeps its start and moves its end by
`+D`, so it stays on screen through the hold. This deliberately differs from Insert's split (Q20): the still is the same moment
held, not new footage.

#### 3.6.1 Stacking bands for what Simple adds

The array is z-order, index 0 on top (`js/compositor.js:16167`). A Full stack interleaves main clips with text and overlays
(`FM.addAt` defaults to 0 and the add-row marker moves it, `js/app.js:2761`, `:2880-2889`), so bands are placed **relative to
the layers the new item overlaps in time**, never by global position:

```
(sides are computed on R before the plan, so every band is computed over sides, never over raw "non-main":
 B(x) = the behind units x overlaps in time: side 'behind' or kind 'background', and a BACKDROP (below);
 F(x) = the other non-main visuals x overlaps: side front, none or mixed, plus text and caption tracks)
caption track → above every layer it overlaps
text          → directly above the top-most non-caption layer it overlaps, below every caption track it overlaps
overlay       → directly above the top-most layer it overlaps that is not text or a caption track, and below every text
                and caption track it overlaps (Make overlay's lifted clip too: its own titles stay above it)
effect        → directly above the top-most main clip it overlaps (or above the top-most member of B(x) when it
                overlaps no main clip), and below every member of F(x); a behind unit is never an upper bound
                (an adjustment layer grades everything below it, js/compositor.js:16175)
main          → directly above the top-most of B(x) ∪ the main clips it overlaps, and below every member of F(x);
                if a mixed item makes both impossible, keep "above" and leave the mixed item alone, so the clip is
                never hidden; the first main clip of a project with none: directly above the top-most member of B(x),
                else directly below the lowest member of F(x)
sound         → the end of the array (draws nothing)
```

**The z pass never lifts what sits behind the clips on purpose.** Before the plan, every non-main visual `v` gets a **side**
relative to the main clips it overlaps in time: `front` (above all of them), `behind` (below all of them), `mixed`, or `none`.
After every arranging plan, in the same step:
(a) a pair `(v, m)` that overlapped before the plan is never re-ordered;
(b) for a pair the plan newly creates by moving **or resizing** `v` or `m` in time (the tail fit and a caption window stretched
by `f` included): if `v` is `front` or `none`, `zMove` `v` to just above `m`; if `v` is `behind`, `zMove` `v` to just below the
lowest main clip it now overlaps; if `v` is `mixed`, leave it alone. **A layer whose blendMode is mask-include or mask-exclude,
or a block containing one, is never zMoved**: for (b) it counts as `mixed`, so the set of layers it cuts never changes
silently;
(c) a layer the plan adds uses the side-aware bands above, never raw "non-main" (the old "below the lowest non-main visual"
put a new clip under a letterbox background or a template's full-canvas backdrop rect, where nothing of it showed).
So a letterbox background under landscape clips, the base of a screen-blend double exposure, a background plate under a keyed
clip, an adjustment layer below the clips (it grades everything drawn before it, `js/compositor.js:16159-16176`) and a
mask-include (destination-in, `:42-43`) all keep their place. The read model's `units[id].side = 'behind'` items draw in a
**Behind** section, the hatched lowest section of the sections box directly above the clip row (§8.2: the one stated exception
to "higher on screen = in front", labelled so); they are placed and moved only by
time, never lifted, and the overlay tray's Forward / Back stops at the main band instead of silently crossing it. The effect
band has a second slot: an adjustment layer that was below every main clip it overlaps stays `behind`.
`mainInFront` (an anomaly, §5.4) = a main clip sits above a `mixed` non-main visual it overlaps, or above a `front` one after a
Full edit. It is never raised for a `behind` item, so **Put behind** cannot fire on a deliberate background.
**Backdrops.** In a project with no main clips, a non-main unit that `fillsFrame(u)`, has opacity 1, normal blend and no mask,
and sits below every other visual it overlaps counts as a **backdrop** and is treated as side `behind` for placement only (its
kind is unchanged): the full-canvas rect of a text-and-shapes template (`js/template-fill.js:34-37`).

**Anchors are measured against FINAL spans:** each other layer's span after the plan's moves, after the §3.5 map of every
caption-track window, and after the §4.5 tail fit (each `sm.tail` item's end = the new `trackEnd`, clamped as `fitTails` does,
computed by the same helper `tailFitWrites` uses). An appended clip at `R.trackEnd` overlaps nothing at plan time (the watermark,
the grade and the caption window all end there until the fit), so a new or moved main clip that still overlaps no visual goes
directly above the main clip before it in main order (for Append, just above `R.main.at(-1)`), never at `FM.addAt`'s default
(0, the top, `js/app.js:2802`). `FM.spine.fitTails` never changes z; any overlap it creates was already placed by this rule.

**Stacking a unit.** (1) A unit's stacking index is the index of its bottom-most drawable member (not a group, camera or null),
matching the compositor, which draws a group unit at the z-slot of its bottom-most member (`js/compositor.js:16158`, `:16215-16221`).
`side`, `mainInFront`, the band anchors and rule (b) compare these unit indices, never a group row's or a non-bottom member's.
(2) Every `zMove`, the tray's Forward / Back and Put behind move whole units: a block moves as its group row plus every
descendant (`FM.groupDescendants`), passed together to one `FM.moveLayers(ids, beforeId)` call so their relative order is kept
and the mask stays the top-most member (`js/compositor.js:15692-15695`); a member of a transparent group moves alone, and its
group row is never moved or used as an anchor. (3) Anchors are unit slots: "directly above X" is `beforeId` = the top-most index
of X's block run (or X itself); "directly below X" is just after the bottom-most member of X's run. A computed slot that falls
strictly inside a block's run, or between a transparent group's row and its first member, snaps to just above that run, so a new
sticker never lands between a block's members and covers its title. (4) Full's group-row drag re-gathers a scattered
transparent group (`js/timeline.js:1644-1654`); that is existing Full behaviour (`js/scene.js:897-915`), stated, not guarded.

**A moves-together group** (`sm.unit`, §2.5) goes in as one piece in its authored internal order, at the band of its highest
visual member; its audio members may sit anywhere in the stack (they draw nothing).

**One insert helper.** `FM.insertLayer` (`js/app.js:2880` [checked]) stays "the ONE insert". Simple never leaves `FM.addAt`
moved (it is per-tab view state that Full's Add row and ◐ knob read, `js/app.js:2795-2929`, `index.html:537-544`, and nothing
reset it on a switch): every Simple insert route (Append, Insert and Make main clip adds, text, overlay, sticker, effect and sound
adds, ⌘V) calls `FM.spine.insertAt(layer, slot)` = `const keep = FM.clampAddAt(); FM.addAt = slot; FM.insertLayer(layer);
FM.addAt = keep + (slot <= keep ? 1 : 0); FM.clampAddAt();`, synchronously and never across an await, so Full's Add row stays
above the same layer it was above.

#### 3.6.2 Where the playhead lands

The plan's optional `time` is applied by the runner after `apply` and before `refreshAll`, clamped to `[0, project length]`.
It is not written while playing or following, and it is not a history step, a document write or a collab op. Rule: **the
frame you acted on stays under the line.**

| Command | `FM.time` after |
|---|---|
| A (trim head) | `c.start`, the first kept frame, which was under the playhead before (unlike Full's A, which moves the clip to the playhead; §8.3 says so) |
| D (trim tail) | unchanged: it is already the new end, the join |
| Delete | `c.start` (the join where the next clip slid in), or the new end if `c` was last |
| Insert / Append / Duplicate / Make main clip | the first inserted clip's start |
| Reorder | the moved clip's new start |
| Close gap / Fix / Close all gaps | unchanged, unless it was inside the removed span: then the seam |
| Split / Replace / look edits | unchanged |
| Use one speed | through `φ` (§3.6) if it was inside `c`, else unchanged |
| Speed / Make overlay | mapped onto the same moment of `c` if it was inside `c` (speed: `c.start + (t − c.start)·k`); otherwise moved by the ripple's `dt` if past the edit point |
| Sort by date taken | stays on the same frame of the clip it was in (`t + dt_c`), else 0 |
| Reverse | stays |

The **loop region** follows its footage: `loopIn` / `loopOut` go through the command's map `f` (an end inside a deleted span
snaps to the cut; Make overlay uses Delete's `f`, so a loop wholly over `c` collapses and is cleared; Use one speed uses `φ`); for Reorder and Sort through `g`, cleared when its ends lie in different pieces (§3.5). If the result is empty, or `autoFitDuration` would clear it (`js/app.js:871-875`), the line adds
*"· loop cleared"*. It is one `project` field pair written in the same commit, so Undo restores it.

### 3.7 The runner: one edit, one step, one transaction

```js
FM.spine.edit = async function (label, makePlan, opts = {}) {
  if (FM.spine.running) {                                                // single flight, then a FIFO of 4 (never coalesced)
    if (FM.spine.queue.length < 4) FM.spine.queue.push({ kind: 'edit', args: [label, makePlan, opts] });
    else FM.spine.say('wait');                                           // "One moment — still finishing the last edit."
    return;
  }
  FM.spine.running = true; document.body.classList.add('sm-running');   // the whole-editor busy state (below)
  try {
    const ro = FM.spine.roReason(); if (ro) return refuse(ro);           // 'view' | 'comment' | 'outbox' (§3.11)
    if (FM.spine.newerSchema()) return refuse('newer');                  // project.sm.v > SM_V (§2.3)
    const R0 = FM.spine.classify(FM.scene);                              // uncached (§2.5)
    const R  = R0.adopted ? R0 : FM.spine.adoptPreview(R0);              // plan against what adoption will store
    const plan = makePlan(R); if (!plan) return;                         // plans read intents stored at tap time (below)
    const gated = plan.arranges || (plan.adopts && !R0.adopted);
    const online = !!(C.session && C.session.online);                    // null-safe: a linked copy may have no session
    if (gated && othersCanEdit() && !(FM.spine.liveArrange && online && FM.collab.editorsAllConnected()))
      return refuse(!online ? 'offline' : FM.spine.liveArrange ? 'away' : 'live');   // §10.2
    if (gated && R0.anomalies.some(a => a.kind === 'undecided' && a.overMain)) return refuse('waiting');  // arriving (§5.2)
    const lk = plan.touched().filter(id => FM.spine.lockedUnit(id) && !plan.riderOnly(id));   // a block counts as one
    if (lk.length && !opts.unlock) return refuse('locked', lk);          // names them by kind; [Do it anyway] = opts.unlock
    const b = FM.spine.blockers(plan); if (b) return refuse('busy', b);  // leases: Phase 2; drags, act:'kf', cue lease: 4c
    const q = FM.spine.couplingsBroken(plan, R);                         // §3.10
    if (q.length && !opts.couplingsOk) return ask('couplings', q);       // "Do it anyway / Open in Full"; nothing written yet
    if (FM.flushPendingCommit) FM.flushPendingCommit();                  // js/canvas-edit.js:743, as history.undo does
    if (FM.textEdit && FM.textEdit.flush) FM.textEdit.flush();           // js/text-edit.js:835: typing is its own step
    const pre = FM.history.beginEdit();                                  // JSON copy of {project, layers}, then mute()
    let adoptPaths = null;
    try {
      if (opts.unlock) for (const id of lk) FM.spine.setLockedUnit(id, false);   // inside the step: ONE undo restores both
      if (!R0.adopted && plan.adopts) adoptPaths = FM.spine.adopt(R);    // §5.3: same undo step; returns the paths it wrote
      if (gated) FM.spine.pinStrays(R, plan);                            // hostless and long units → sm.stay (§4.3)
      await apply(plan);                                                 // no picker and no direct save inside (below)
      FM.spine.fitTails(R, plan);                                        // §4.5; then transparent groups refit (§2.5)
      if (opts.unlock) for (const id of lk) FM.spine.setLockedUnit(id, true);    // D7: the lock is kept
      if (FM.spine.blockers(plan)) { FM.history.restorePreEdit(pre); return refuse('busy'); }   // a lease landed mid-await
      if (C.active && FM.spine.tooBig(C.session.pendingDiff())) { FM.history.restorePreEdit(pre); return refuse('big'); }
    } finally { FM.history.unmute(); }
    FM.refreshAll();                                                     // js/app.js:878 (autoFitDuration runs first)
    FM.spine.landTime(plan);                                             // §3.6.2
    FM.history.commit({ label, ed: 's', arr: gated, adopt: adoptPaths }); // ONE step, ONE collab diff, ONE tx
    if (FM.textEdit && FM.textEdit.resync) FM.textEdit.resync();         // a ripple may have moved the open cue
    FM.spine.afterCommit(plan);                                          // e.g. the reverse frame cache (§3.6 Reverse)
    FM.spine.say(label, plan);                                           // #sm-say, not a toast (§3.12)
  } finally {
    FM.spine.running = false; document.body.classList.remove('sm-running');
    FM.spine.drain();                                                    // loops while the head entry can run (below)
  }
};
```

- **The queue** (`FM.spine.queue`, capped at 4) holds `{kind:'edit', args}` and `{kind:'undo' | 'redo'}` entries in tap order;
  nothing in it is ever replaced or coalesced, so Split → Delete → Speed inside one await gives three steps. Each edit entry
  stores its **intent from tap time** (the target id and the playhead), never a plan built on the old scene, and is refused
  or skipped normally if its target is gone (*"That clip was just deleted"*). A fifth tap shows the `wait` line and writes
  nothing. **`drain()` loops**: it peeks at the head entry and stops without shifting when it would block (history muted,
  `FM.jobDepth() > 0`, or `FM.spine.running`); otherwise it shifts the entry and runs it (an edit calls `FM.spine.edit`, which
  drains again from its own `finally`; an undo or redo calls `FM.history.undo` / `redo`) and continues. An entry is never
  re-pushed, so the loop cannot spin. Drain is called from the runner's `finally`, from `FM.jobEnd` when it returns 0 (not only
  from `jobWrapped`'s exit, so a manual `jobBegin` / `jobEnd` is covered), and from `FM.history.unmute()` when `muteDepth`
  reaches 0 with `jobDepth() === 0`, deferred with `queueMicrotask` so the caller's own `commit()` right after its unmute
  (`clipSplit`, `js/timeline.js:133-137`; `extractAudio`, `js/app.js:1054-1057`; `applyTurn`) lands first and the queued undo
  undoes exactly that commit. (Draining one entry, only from the runner and `jobWrapped`, left a ⌘Z pressed during a 4-clip
  `clipSplit`, whose every `FM.splitLayer` is jobWrapped and awaits `reloadMediaTo`, `js/app.js:4900`, `:5071`, re-queued by each
  inner exit and then stranded, later undoing an unrelated Simple edit; and a queued `[undo, edit]` waited for a commit that
  never came.) **Each entry is stamped at tap time with `FM.history.commitSeq`**, a counter bumped on every real stack push in
  `commit()`; at drain an entry with `commitSeq − entry.seq > 1` is dropped with a line (*"Undo skipped — something else changed
  first"*), because the one allowed step is the in-flight commit the press was aimed at. This also closes today's hole in Full's
  own split.
- **Undo and redo during a run.** `FM.history.undo()` / `redo()` (`js/history.js:325-326`) first check
  `FM.history.isMuted() || (FM.jobDepth && FM.jobDepth() > 0)`; when either is true they push `'undo'` / `'redo'` onto the
  queue and return false. They consume nothing, so a later Undo tap still has its step. Because the check lives in history, ↶,
  ↷, ⌘Z, ⇧⌘Z, ⌘Y, the Undo button in `#sm-say` and Ask all get it from one place; `syncButtons` shows ↶/↷ pressed/busy while
  the run is in flight. Belt and braces in collab: `S.undo` / `S.redo` (`js/collab-session.js:1227ff`), when `busy()`, queue
  the press through the same path (`{kind: 'undo', seq}`) instead of returning false and dropping it, never popping, and `runStep` returns early when `busy()`, **before** its `diffNow('full')` (`:1193`), putting the step
  back unconsumed as the backstop refusal does (`:1196-1199`), so no caller can diff a half-applied plan into an undo
  transaction. So Split then ⌘Z inside the await commits the split as its own step and then undoes exactly that step.
- **While running, the whole editor is busy**, not only the drags. `body.sm-running` is set with `running` (and throughout
  `FM.spine.compose`) and cleared in the runner's `finally` before `drain()`. Under it: (1) canvas pointer gestures, arrow-key
  nudges and the wheel / pinch camera zoom are ignored (the viewport pan and zoom with nothing selected stays live: it has no
  undo); drags and trim grips keep the existing pressed / inert state; (2) the open tool sheet and panel controls get the
  `inert` attribute, so a slider, stepper or text field cannot commit (the text editor was already flushed before `mute()`);
  (3) ⇄ shakes (§6.2 refusal c); (4) Share / Work with friends refuse with the `wait` line, and `C.share` itself returns early
  when `C.bridge.busy()` (`js/collab-bridge.js:177` already covers muted and `jobDepth`), so no base is ever taken from a
  half-applied document; (5) tray and tool buttons stay tappable and queue like keys, a queued tool showing its pressed state
  until it runs. Without this, a canvas nudge or slider commit during a seconds-long await (`FM.duplicateLayer` reloads media per
  layer, `js/app.js:4358-4368`) wrote into the muted scene with no step of its own, rode inside the command's commit (one ↶ removed
  both), and was silently reverted by `restorePreEdit` on a `busy` or `big` refusal; the wheel zoom's deferred 400 ms commit
  (`js/canvas-edit.js:743-745`) is flushed by `FM.flushPendingCommit()` before `beginEdit()`, as the code shows. In debug builds
  `restorePreEdit` asserts that `diffDoc(liveView(), pre)` touches only `plan.touched()` paths plus `adoptPaths` and the lock
  toggles, and reports anything else through `FM.reportError`.
- **`FM.spine.compose(intents)`** (Ask's batch, §8.5a) is a separate entry, not `edit`: it holds `running` for the whole batch
  and never uses the queue; a tray tap during it is refused with the `busy` line, not queued.
- **No picker and no direct save inside the runner.** A picker is always opened from the tap, before `FM.spine.edit` (§3.6
  Replace). `FM.duplicateLayer`, `FM.addMediaLayer` and `FM.swapInMedia` take `{noSave: true}`, which skips their own
  `FM.storage.save()` (`js/app.js:3051` and the duplicate / replace paths): `mute()` only counts (`js/history.js:272-274`) and
  does nothing to a direct save, so the un-rippled document would otherwise reach disk mid-run. The runner's one commit
  autosaves the finished result.
- **`FM.history.beginEdit()` / `restorePreEdit(pre)`.** `mute()` stores nothing, so `beginEdit` takes `pre =
  FM.spine.cloneDoc(FM.scene)` (a JSON copy of `{project, layers}`) and then mutes. `restorePreEdit(pre)` puts it back **in
  place, never by assignment**: `const d = D.diffDoc(liveView(), pre)`, then `D.apply(FM.scene, op)` for `d.ops` and
  `D.applyOrder(FM.scene, o)` for `d.orders` (the `onSnap` pattern, `js/collab-session.js:1001-1011`, whose comment says a
  replacement "would detach the inspector, the mask tool and every kfDrag alias"), in solo too, so there is one path. Then
  `FM.history._afterExternalChange(wasSelected, {pause:false})` (which runs `FM.restoreReplacedMedia`, bringing back the stashed
  file for a refused Replace), `FM.releaseUnreachableMedia` for a refused Duplicate's copied media, `FM.refreshAll()` and
  `FM.storage.autosave()`, so disk returns to the pre-edit document. It touches neither history's stack nor collab's, and calls
  neither `beforeSnap` nor `afterCommit`, so live equals the collab base again and the next diff is empty; queued remote
  batches drain on the next tick (`js/collab-session.js:410-416`).
- **The text editor is flushed before `mute()`.** On PC the text card is modeless and its tap-off commit is deferred to a
  `setTimeout(0)` (`js/text-edit.js:653-655`), so it would land inside the mute and be dropped, merging the typing into the
  ripple's step; the runner flushes first, exactly as undo does. The flushes come after the refusals, so a refused edit writes
  nothing. In a session `flush`'s commit closes the typing's collab step before the runner's opens, so `closeStep(meta)` stamps
  `arr` and the label only on the ripple.
- **`plan.touched()` and `plan.riderOnly(id)`.** The lock refusal (D7) applies only when the plan moves a layer as a whole (its
  start through a ripple, a reorder, a follower move or a block shift), trims it or changes its speed by command, deletes it,
  or changes its z-order (Full keeps locked layers in their z-order too, `js/timeline.js:1622`). A write is **rider-only**, so
  exempt with the lock left on, when it is: (a) the §4.5 tail fit of an `sm.tail` item (its start never moves); (b) the camera
  keyframe rider and its window (§3.10 rule 3); (c) the caption rider (§3.5); (d) an `sm` flag write through `setFlag`, and Mute
  clip sound and other panel property writes, which Full's lock never blocked either. The lease pre-flight still counts (a) and
  (b) as own-field writes; only the lock check skips them. **A block counts as one:** if any descendant is locked the block is
  locked for D7, Do it anyway unlocks and re-locks each locked member, and the refusal and the pulse use the block's own element.
- `othersCanEdit()` (new, `js/collab-core.js`, next to `othersHere`) is the one live-gate predicate:
  - **false** with no session and no linked copy, or on a guest when `!C.active || s.ended || s.active === false` (the same
    guard as `C.othersHere`, `js/collab-core.js:401-405`): a copy whose owner stopped sharing arranges freely. A `paused` bye
    keeps `S.active` true (`js/collab-session.js:864-870`), so a paused copy stays gated.
  - **true** with no session when the open project's index card has `collab` and `!collab.ended` (a linked copy opened from
    Home before the link is back, `js/collab-ui.js:4735-4738`; exposed as `C.isLinkedCopy(pid)`): otherwise its arranging edits
    would reach `recoverOutbox` (`js/collab-session.js:1346-1362`) and replay op by op on reconnect.
  - **always true** on a live guest (the owner can always write).
  - **on the owner**, true when either (a) a live member in `S.host.members` (not the owner) has role `editor`, or (b) the
    room's **persisted** member table `hostRoom.members[rid]` (`js/collab-ui.js:59`, `:2496-2507`; exposed read-only to
    collab-core as `U.roomEditors()`) has a record with role `editor` that is not in this session's `waived` set. The persisted
    table is needed because `S.host.members` does **not** keep a dropped friend: when the link closes after `LINK_GRACE`,
    `link.onclose` (`js/collab-ui.js:2534`, `:2868`) calls `dropPeer` → `host.part` → `delete members[mid]`
    (`js/collab-session.js:1556-1557`, `js/collab-host.js:321-322`), and after an owner resume or re-share `host.members`
    starts empty; yet the friend's outbox survives (`replayOutstanding`, `:1026-1031`; `recoverOutbox` on reload) and a token
    member comes back with the same mid (`js/collab-ui.js:2513-2522`). A member stops counting in exactly three ways: their
    device sends `bye` `'left'` (which reaches `forgetRid`, `:663-675`; `'paused'` or `'switched'` still counts); the owner
    removes them (`revokeRid`, `:677`); or the owner confirms once, from the `live` line (Phases 2-3), the `away` line (Phase
    4+) or a seam chip in both: *"Sam is offline · clips stay put"* +
    **[Arrange anyway]** (§3.11), whose confirm warns *"Anything Sam changed offline may land in the wrong place"*; confirming adds the rid to
    `waived` for this session only; a waived member who reconnects leaves `waived`, so the gate shuts again. Code-joined
    members have no rid and cannot come back on the same mid, so they count only through (a). An Editor who never taps Leave
    does **not** stop counting by itself after a while (decided with the recommended option, §17's decided list), because a
    guest's outbox has no expiry.
  - Viewers and Commenters never count: they cannot race (the host refuses their scene ops by role, `js/collab-host.js:869`,
    and only editors hold leases), so the owner is not frozen while someone watches along. The gate is re-read on every edit
    and at drag release, so a promotion through "Ask to edit" turns it on from the next edit, and a demotion turns it off.
- `FM.collab.editorsAllConnected()` (next to `othersCanEdit`, Phase 4; its wire parts ride 4d's `SCHEMA_REV` 7 bump). A
  **counting editor** is the set `othersCanEdit()` counts (live `H.members` editors plus `U.roomEditors()` records not in
  `waived`), so a waived member cannot keep `away` up. (a) A guest's hello gains `ob`: the cid of this device's newest unacked
  outstanding entry, or `-1` if the outbox is empty, taken after `recoverOutbox` on reload; the host stores it as
  `members[mid].obTo`. A member is **settled** when `obTo === -1` or its `lastCid ≥ obTo` (no extra message when the replay
  drains; `helloMsg`, `js/collab-session.js:1448-1459`, carried no outbox fact, so a rejoiner with nothing to send would never
  have read as ready). (b) **On the owner**, true only when every counting editor is present in `H.members` with roster
  `st !== 'off'` (presence silence past `OFFLINE_AFTER`, `js/collab-presence.js:517-520`; not `ep.open`, which stays open
  through a silent drop because `liveTick` returns early on the owner, `js/collab-session.js:1483`) and is settled. (c) The
  roster the owner broadcasts gains `ok` (0/1) per live member and `ab: [{name, color}]`, the counting editors not in
  `H.members` (after `waived`); **on a guest**, true only when `ab` is empty and every other editor row has `ok: 1` and
  `st !== 'off'` (`hostRoster` walks only `H.members`, `js/collab-presence.js:509-521`, and `H.part` deletes a member past
  grace, `js/collab-host.js:321-323`, so a guest reading only live rows never saw a third editor who had dropped). The `away`
  line names the first name in `ab` or the first not-ok row. While false, arranging refuses with `away` even after Phase 4 lifts the gate: a friend's offline adds and moves
  replay at their old absolute times, and followers have no stored host, so a new title would land over a different clip with
  no clash and no chip. (An own-follower repair that could later retire this term is optional in Phase 5, §10.5.)
- `FM.spine.blockers(plan)` has two halves. The **lease** half (a layer whose own fields the plan writes is held by someone
  else, read from `holderOf` / the roster's `ls`, `js/collab-presence.js:366-371`, which already reaches guests, exposed as
  `PZ.heldByOther(lid)`) runs for **every** command from Phase 2, split included. The **drag** half (`pr.ar.ids`, a Full
  `act:'drag'` with `af` or its `sel`, and `act:'kf'`, including someone animating the camera: *"Sam is animating the camera.
  Try again in a moment."*) waits for Phase 4 (§10.4 4c), as does the caption-lease rule of 4c. It is called again after
  `apply` because a lease can be granted by presence during the `await` (presence is not a batch, so the busy/queue guard below
  does not hold it back). The guest's one-hop window is closed only by Phase 5. **From 4b the runner asserts**, before sending,
  that every op the plan emits on a layer leased by someone else is in 4b's exempt set or was already a blocker; otherwise it
  aborts before sending, so the host never refuses a piece of a plan the pre-flight passed. `FM.spine.blockersForLayers(ids)` is
  the one predicate both this and undo's pre-flight (§10.2 door 2) call; undo's pre-flight runs its lease half from Phase 2 on
  every multi-layer or structural step, not only arranging ones (§10.2 door 2a).
- `FM.spine.tooBig(diff)` measures the **real** diff the commit will send, with `canon()` as `validateTx` does: refuse when
  ops > 0.8 × `C.LIMITS.TX_OPS`, bytes > 0.8 × `C.LIMITS.TX_BYTES`, or any single value > 0.8 × `C.LIMITS.OP_VALUE_BYTES`
  (the real names, `js/collab-core.js:35-38`; the old `C.LIMITS.txOps` is undefined, so `x > NaN` never fired). The count and
  total apply to a guest only (the owner's `H.local` has no count or byte check, only per-value `validOp`, `js/collab-host.js:223`,
  `:826-842`); it never refuses when `!C.active`. It runs **after** the live gate, so before Phase 4 a guest's ripple of any size
  is refused `live` first (T10 checks the order). From 4a′ the op count is dominated by **2 ops per shifted cue** (cue times are
  relative to the track, `js/captions.js:39`, so a delete early in a whole-video track rewrites start and end on every later
  cue), so the realistic trigger is a caption track of about 2,000 cues, not the layer count. The line depends on who is
  editing and never says "shorter stretch" (Delete, Reorder, Sort and a trim have none): for a guest (the only role the count
  and total refuse), *"Too big to send from here · ask Ezra"* (the owner's name from the roster, *"the owner"* when unnamed),
  with **[Open in Full]** only for a Delete or a trim, since Full's one-clip delete and trim do not ripple the caption track
  and stay small; the per-value branch reads *"That item is too big to send while sharing"* for owner and guest. (Falling back to
  sending the cue list as one atomic value would avoid the count but bring back the typist clobber 4a′ removed.)

`FM.splitLayer`, `FM.deleteLayer` and friends call `FM.history.commit()` themselves; inside `mute()` those are no-ops
(`js/history.js:277` [checked]). `FM.deleteLayer`'s own *"Deleted. …"* toast (`js/app.js:3730`) and its `rehomeOrphans`
(`:3532-3545`) are suppressed with a `silent` flag. While history is muted the collab engine is `busy()`, so hot ticks stand
down and incoming batches are **queued for the whole run and applied at commit, inside `beforeSnap`, before the diff**
[checked: `js/collab-bridge.js:177`, `js/collab-session.js:207`, `:416`, `:1253-1262`]. A remote change to a path the plan
wrote therefore wins and drops out of this step and its undo. After commit, if the queue was non-empty, the runner re-reads
the spine and, if any planned `start` differs from its target, `say()` appends *"(Sam moved ‘Clip 7’ at the same time)"* so
the seam chip is explained (§10.6). That is why one command is one transaction.

### 3.8 Dragging (trim, reorder, lift)

- **DOM-only preview** (M §14.5): while the finger moves, only the Simple timeline's boxes move (the clips after the edit
  slide live, the neighbours part for a reorder). The canvas shows the frame under the dragged edge from a throwaway copy of
  the clip, never written to the scene. **Nothing is written to the document, the undo stack or the wire until release**,
  then one `FM.spine.edit`.
- **Gated when it starts, checked again on release.** `FM.spine.canArrange(id)` returns null or the reason: `view` (`roNow`),
  `locked`, `live` (the §3.7 gate), and from Phase 4 `busy`. The Simple timeline calls it when a gesture arms (when the 350 ms
  hold fires on a main clip or item, and on pointerdown on a trim grip). If it fails, no preview starts: the finger scrubs as
  in Full (`js/timeline.js:2200`), a hold shows the one-line reason (with **Do it anyway** for `locked`), and the trim grips of
  the selected clip are not drawn at all, as Full hides them for Viewers (`:2329`). They come back on the roster change that
  re-greys the tray. The runner's own check stays as the backstop.
- **If the gate shuts mid-drag** (someone joins), the gesture is cancelled at once through the stale-gesture recovery: the
  boxes glide back, the canvas returns to the playhead frame, and the §10.2 line shows. Nothing was written (the gate is never
  taken from pointerdown, which would let a ripple reach a room that now has a peer).
- **Remote structural changes end the drag.** While `body.ed-simple` is on, `FM.cancelGesturesOn` (`js/app.js:3595-3627`,
  called for every remote structural op, `js/collab-session.js:529`, and on lease refusals, `js/collab-presence.js:402`) also
  calls `FM.simpleTimeline.abortGestures(pred)` beside `FM.timeline.abortGestures`: a friend deleting the clip being held ends
  the gesture through the stale-gesture recovery (boxes glide back, no write) with *"Sam removed that clip"*. At release, a
  reorder or lift plan refuses with *"Clips changed while you were dragging — try again"* if `c`, `p'` or `n'` is gone or no
  longer main, and a trim refuses if `c`'s `start`, `duration` or `trimStart` changed since the gesture armed. From Phase 4
  (4c) the drag also cancels as soon as a remote batch writes one of its own `ar.ids`.
- **Edge auto-scroll** (his #115, queue 524/690/707/751/823). Every Simple drag (reorder, lift, item move, trim grip) runs
  `FM.timeline.edgeScroll` against `host().scrollEl()`: one driver factored out of Full's `clipEdgeScroll` / `trimEdgeScroll`
  (`js/timeline.js:4217-4300`), so both editors share one copy. It keeps all four measured brakes (the `CLIP_SCROLL_MAX` frame
  cap, the far limit frozen at drag start, the stop at the ceiling, the origin shift reported through `onScrolled(moved)`),
  the `trimZonePx` band (`:4276`) and the per-frame `touchGesture()` stamp that stops `rebuild()` treating the drag as stale.
  The DOM-only preview absorbs each scrolled amount by shifting the drag origin; for a reorder the target slot is recomputed
  from the finger's time after each frame. The far limit is the main-track end plus the dragged clip for a reorder and the
  source end for a tail trim; it stops when the target is pinned (the last slot, or a source-limited trim). `FM.time` follows
  the centre line only on release (queue 690's adopt rule), never mid-drag. (A compact reorder view, where every clip shrinks to
  a square thumbnail while a reorder hold is armed, is drawn on the V3 sheet next to plain auto-scroll as an option only.)
- **Presence sees a Simple drag.** Once the hold or trim threshold is crossed (never on a tap), `FM.simpleTimeline.gesture()`
  returns `{k: 'trim'|'move', ids: [lid, …≤8]}` until release, cancel or stale-gesture recovery. In Phases 2-3 it is a
  local-only feed (it drives the stale-gesture recovery). **From Phase 4** (it rides the 4a schema bump, §10.3) `sample()`
  reads it and publishes `act: 'arrange'` with `ar`. `sample()` sets `act` in one fixed order: **export > type > kf > arrange >
  drag**: `'kf'` is read from `FM.keyframes.gesture()` ({lid} while an inspector keyframe edit or a timeline diamond drag is
  live and for 300 ms after; `af` = that lid); `'arrange'` from `FM.simpleTimeline.gesture()` (`ar` from it, `af` null); only
  if both are null does `bridge.interacting()` give `'drag'` (`js/collab-presence.js:243-248`). Neither signal is inferred
  from `interacting()`, which is true for any pointer down and would otherwise mask both. Without `ar`, `af` stays null during
  a drag (`S._held()` is empty until a write, `js/collab-session.js:1594`).
- **Lifting a main clip to an overlay** by dragging: reorder is the default. The drag switches to lift only once the finger is
  24 px or more above the main row's top edge and has held there ~150 ms, and switches back as soon as it drops below. In lift
  mode the ghost rises into a highlighted overlay lane, the neighbours close up in the preview, and a short label reads the
  command's name. Only the overlay section is a lift target; a drag over the folded strip (§8.2) or another section cancels
  back to reorder;
  with no overlays yet a temporary *"Drop here to make an overlay"* lane appears above main. The same rule the other way
  drops an overlay onto the main track.
- **PC mouse:** a mouse drag moves or reorders at once, with no hold, exactly like Full's mouse path (`js/timeline.js:2189-2190`);
  the 350 ms hold is for touch and pen only.
- The Simple timeline has its own "no redraw mid-gesture" rule, the same as Full's (`js/timeline.js:5212-5220` [checked]),
  including the stale-gesture recovery.

### 3.9 Invariants the suite asserts (per command, over seeded random main tracks with off-grid lengths, overlaps and blends)
1. **Main order is unchanged** apart from the edit, and no seam changes kind or amount (for a blend, `amt`) except at the edit
   point; every other seam's diff is unchanged to within 1e-9, and **a seam that was a float-noise join ends bit-exact**
   (`newA.start + newA.duration === newB.start`, §3.1), and so does **a hairline in the moved range and every seam the command
   creates**. A Reorder changes seams only at its two edit points (`c`'s trailing seam travels with it, §3.6): the track length
   and every other seam are unchanged. A slot entry keeps its length and its members keep their offset from its start.
1b. **A blend seam that was not refused stays a blend** (`isBlend` true) with the same `amt`, except where Delete closes it to a
   join and says so (§3.6 Delete row).
2. Every follower's host after the command (`hostOf`, slot members included) is the same clip or slot as before, and its
   `start − host.start` is unchanged, except: × `k` for Speed; set by the D6 slide-back (ends at the new end) for a tail trim;
   `−landed`, clamped at 0, for a head trim (the item stays on the same footage frame).
2b. **No non-main unit changes host through a command** unless it is a follower moved with its host or was pinned in that step
   (a long unit left in place, §4.3).
3. Every moved unit's `start`, keyframes (all of `FM.timedLists`, cue effects included), members and riding cues moved by the
   **identical** `d` (to 1 ulp with a landing, §3.3), **except units a Delete cuts**: every key of such a unit equals
   `f(original key)` (with the `riderKeys` boundary pair at `a`), and its `FM.fxLocalTime` at every surviving frame is
   unchanged.
4. Nothing that had `sm.stay` **before** the command moved, and its start never changes. **Delete may cut every overlapping long
   unit it pins for the first time (§3.6 cases i-iii), and that unit gets `sm.tail` when its cut span ends at the new track end
   (§4.3); no other command changes a long unit's start or duration.** Only an `sm.tail` item's end may change, to the
   main-track end. No caption cue
   outside the edited span moved except through the stated map; hidden cues stay hidden at the same offset.
4b. For every item the tail fit resized (§4.5), with `h = e = min(5 s, min(D, D′)/4)`, each key in its old first `h` is
   unchanged, each key in its old last `e` moved by exactly `D′ − D`, and every middle key keeps its relative order; a fit
   `D → D′` followed by `D′ → D` returns every key to its time within 1e-9 (apart from audio middle keys the shorter fit dropped).
5. Solo undo restores the document byte for byte.
6. The exported frame at every seam equals the preview frame, and every touching edge whose source is not continuous is
   ramped (de-clicked) in both the preview and the export (§12.1).
7. No command creates a clip shorter than `MIN_LEN` or shortens a clip that is already under it (§3.1), and undoing and redoing
   the step leaves every seam's kind unchanged.
8. Every effect segment that fitted inside its host before a command still fits after it (§4.3).
9. For every coupling (§3.10) whose two ends both move, both moved by the same `d`; otherwise the edit carried the warning.
10. `FM.time` equals the stated landing (§3.6.2); for A, the frame shown at `FM.time` is the first kept frame.
11. After any arranging command, `project.duration` equals the main-track end unless an item without `sm.tail` deliberately
    runs past it; a group row, an empty group or a bare null never counts as deliberate (§2.5, §4.5).
12. After a head trim, `trimStart ≥ 0` and `trimStart + duration·sp ≤ srcDur`, and the followers moved by exactly the amount
    `c` shrank; one undo plus redo leaves `trimStart` unchanged. After any trim, `FM.fxLocalTime(c, t)` is unchanged at every
    surviving footage frame. After any accepted speed change, `trimStart + duration·sp ≤ srcDur` and the source span is
    unchanged to 1e-6.
13. At 24, 30 and 60 fps, every export frame time `start + f/fps` in `[first main start, trackEnd)` that is not inside a gap,
    a slot, a covered gap, or a hairline that did not move and was not created by the command has at least one visible main clip
    (`FM.isLayerVisibleAt`): no float-noise or hairline black frame (§3.1).

### 3.10 Couplings: time links between layers

Keyframe times are absolute project time (`js/scene.js:373-376`), and some layers read other layers at time `t`: the camera
(`activeCam`/`camPose`, `js/compositor.js:15831-15840`), a transform parent (the parent chain is evaluated at the child's `t`,
`:2375-2400`), a Follow behaviour (`followValue` reads the target at `t − delay`, `js/behaviors.js:234-247`), and effects with
a layer reference (Luma Matte, Compound Blur, Match Grade, `js/app.js:4347`, `js/fx-registry.js:107`; a missing matte source
draws the layer unmatted, `js/compositor.js:8448-8453`), plus Audio Drive's `params.sourceId` (`js/behaviors.js:203`). A
ripple that moves one end and not the other plays Full-made work over the wrong footage with no warning. So the read model
lists `R.couplings`, and:

1. **Link rule (before the start rule, §4.1), resolved through the split lineage.** A non-main unit that is
   transform-parented to, matted by, Follow-targeting or Audio-Drive-sourcing layer `v` takes `v`'s host, so they move
   together. `R.linkOf(u)` resolves through the split lineage with its own **half-open** lookup, `R.lineageAt(refId,
   u.start)`: the lineage member with `start ≤ u.start < start + duration`, falling back to `FM.clipAt` when none, never trying
   the stored id first. (`FM.clipAt` tries the stored id first with an inclusive end, `js/scene.js:786-797`, so a follower
   starting exactly on the cut resolved to A, against §4.1's "exactly on a cut → the clip after"; `FM.clipAt` keeps its inclusive
   end for rendering, which needs A's last frame.) What **renders** through the lineage today is only the parent chain, Audio
   Drive and Bounce (`js/compositor.js:2382`, `:10548`; `js/behaviors.js:170-171`, `:203`). **Follow and the layer-reference
   effects read the stored id**: `followValue` calls `FM.layerById(scene, targetId)` (`js/behaviors.js:240`), every effect source
   is found by `scene.layers.find(l => l.id === srcId)` (`js/compositor.js:8449`, `:8530`, `:8615`, `:8704`; the collide pool's
   source, `:8153`), and a matte is drawn through `drawLayer`, which returns early outside the source's window (`:14686`,
   `js/scene.js:1128`). So after a split, past the cut a Follow freezes at A's last key and a matted layer disappears: a Full bug
   today, independent of Simple (`relinkSplitCopies`, `js/app.js:4540-4560`, handles copies only). **Phase 1 fixes it** as a
   Full change with its own POLISH-LOG line and a proof test that fails on HEAD: `followValue` resolves
   `FM.clipAt ? FM.clipAt(scene, targetId, t − delay) : FM.layerById(scene, targetId)`, and the four effect lookups and the
   collide source go through one helper, `refLayerAt(scene, srcId, t, selfId) = FM.clipAt(scene, srcId, t)`, keeping the
   `!== layer.id` guard (the `!p.splitOf` early-out keeps the cost at one property read for a project never split). The link rule
   depends on that fix: **until it ships, `R.linkOf` and rule 4's referenced end use the stored id for Follow and effect
   sources** (what actually renders), so the pre-flight asks in a split-then-reorder case instead of trusting a lineage member
   the renderer never reads. With both, the link rule stays consistent with "a split hands the items after the cut to the second
   half" (§4.3). A link straight to a main clip makes that clip the host
   (§4.1). A `parent` of type group is membership, not a link (§2.5), and a camera's `parent` is never a coupling:
   `camPose` / `FM.cameraView` read `cam.transform` directly and never walk a parent chain (`js/compositor.js:15834-15849`), so
   a null above the camera produces no coupling, no ask and no refusal.
1b. **A hidden helper goes with its only user.** A unit `v` with `visible === false` whose every referencer (as matte source,
   Follow target or transform parent, via `R.couplings`) resolves to the same main clip `c` takes `c` as its host
   (`R.soleReferrerHost(v) === c`, before the start rule). The matte source serves only its referencer (**premise to re-verify
   before 1b is built**: the old claim that it is drawn whatever its own visibility, `js/compositor.js:8448-8452`, meets
   `drawLayer`'s gate on `FM.isLayerVisibleAt`, which requires `layer.visible`, `js/scene.js:1128`, and the matte clone at `:8471`
   does not force `visible: true`; T3's hidden-helper case renders pixels to settle it); without this rule every reorder of `c` left it behind
   and asked about a layer he cannot see. Any other case keeps rule 4's ask (Q27 decided).
2. **Parents of main clips.** A null or controller that parents main clips gets no host from `hostOf` and is never pinned. It
   moves (keyframes and all) only when every one of its main-clip children moves by the same `d` in the plan (§13 #8 and §5.2
   now agree); a unit whose link chain ends at such a mover moves with the mover's `d` in the same plan, or raises the ask.
3. **Keyframe riders: one procedure, `FM.spine.riderKeys(layer, map)`,** used for the camera, the caption track's own keys
   (§3.5) and the opt-in volume rider (*"Keep volume changes with the clips"*, off by default, for volume and opacity keys on
   stay-put audio). The line adds *"and the camera moves"*. A camera or track set to Stay put keeps absolute times.
   (a) **Boundary keys are built the way `splitLayer` builds its seam key**, by factoring `js/app.js:4976-5066` into
   `FM.seamKey(p, t) → { key, nextBez }`: `key` is the evaluated value with the **head** of the divided bezier (copying `e`,
   `ez`); `nextBez` is the divided **tail**, which `riderKeys` writes (cloned) onto the original key after `t`, as `splitLayer`
   does with `b.bez = mine` (`js/app.js:5060-5064`; the segment-end key's `bez` governs the segment, `:5041`). Without the tail
   write the segment from the boundary to the next key replayed a whole ease-in-out from the seam value. It falls back to a copy
   of the curve and no tail write exactly where `splitLayer` does (arrays, point sets, spatial tangents, colour overshoot).
   **`FM.divideSegment(p, t1, t2)`** handles a Cut whose `a` and `b` lie in one segment `[k0, k1]`: it divides the **original**
   segment at `u(t1)` and `u(t2)` before any key is inserted, gives the a-key the head up to `u(t1)` and gives `k1` the tail from
   `u(t2)` (evaluating `seamKey(b)` on a list already carrying the a-key divided the wrong curve). **Every key `seamKey` builds
   carries `split: 1`**, as `splitLayer` stamps today (`js/app.js:5048-5051`), and so do the Cut pair, the insert-hold copy and
   the piecewise boundary pairs, so Bounce can tell a boundary from an authored key (below). So an ease-in-out move either
   side of an edit keeps its exact curve.
   (b) **Cut(a, b)**: when the property has a key strictly before `a` **and** one strictly after `b`, insert `seamKey(a)` and
   `seamKey(b)` (through `divideSegment` when they share a segment); otherwise insert nothing. Drop the keys strictly inside
   `(a, b)`, then map. After any rider map, remove a boundary key (never an original key) whose value equals both neighbours'
   and whose neighbours are hold or linear. (Inserting a pair on every Cut added two keys per property per delete even past the
   last key, and `safeKfProp` keeps only the first `AFX_MAX_KF` keys on load and undo, `js/storage.js:1119`, `:1404`, so a long
   edit history silently cut the end of a keyed effect.) Both boundary
   keys are **kept** at `a`, left then right, which `evalProp` treats as a clean step (`js/scene.js:86-92`, `span <= 0` gives
   `f = 1`). "Where two keys land on one frame, the later original survives" applies only to two **original** keys, never to
   a boundary pair. Undo restores the dropped keys.
   (c) **Insert-form maps** (Insert, Append, Make main clip, Duplicate, Fix overlap, a tail or head extend, Reorder's
   open-the-slot half): when a key sits on each side of the seam, insert `seamKey(seam)` before mapping (writing its `nextBez`
   onto `k1`) and a copy with the same value at `seam + D` after it, so `k1` carries the divided tail, so the camera holds still over the new material and the move over the old clips keeps its
   timing. Speed maps are affine and need no boundary keys. **Piecewise translations** (Reorder, Sort) put a boundary pair at
   every piece boundary, then translate each key by its piece's offset and stably re-sort.
   (d) **Loops:** skip boundary keys on a property with `loopMode ≠ 'none'` when the edit point is at or past its last key (the
   same guard as `js/app.js:4976`: `evalProp` takes the loop period from the first and last key, `js/scene.js:76-83`); map only
   the keys the edit reaches.
   (e) **Append:** the camera and the caption track's own keys go through the Append map (`f(t) = t + Σlen` for
   `t ≥ R.trackEnd`) whenever the plan moves the tail, even when Append does not arrange, so a zoom keyed over the end card
   still lands on the card.
   (f) **The camera's window moves too:** new start = `f(cam.start)`, new duration = `f(cam.start + cam.duration)` − new start,
   so a camera Full trimmed to `[3, 9)` does not switch off `D` seconds early after an Insert inside it (`activeCam` picks a
   camera by its window, `js/compositor.js:15831-15833`). Skipped when `cam.start === 0`, because `FM.autoFitDuration`
   (`js/app.js:869`) already stretches that camera to the new project end.
   (g) **Piecewise maps (Reorder, Sort) and the camera window:** a camera with `start === 0` is skipped (`autoFitDuration`
   re-spans it, `js/app.js:910`); a camera whose window lies inside one piece translates rigidly by that piece's offset.
   Otherwise (a trimmed camera whose window crosses a moved piece boundary) the camera is a coupling for rule 4's ask
   (*"1 camera move will slip"*). **Do it anyway** sets the window to the hull of `g` over its visible pieces and, over each hull
   stretch the original window did not cover, adds a boundary pair of hold keys at the camera's rest pose (scale 1, rotation 0,
   x / y at the project centre), so those frames still read as camera-less; if a rendered check shows they do not match exactly
   (z-depth parallax under an identity camera), the ask becomes a refusal, *"Open in Full to move this with its camera"*. The
   camera is never split (`FM.splitLayer` refuses it, `js/app.js:4903`, and there is only ever one camera, `js/app.js:3442`,
   `:4364`, `:4579`).
   **The camera and a caption track can carry behaviours** (every non-group layer gets the behaviours block,
   `js/inspector.js:5775-5776`, "the CAMERA gets them since v3.46"; `camPose` reads scale, x, y and rotation through
   `FM.behaviorValue`, `js/compositor.js:15881-15887`; the old claim cited the align toolbar at `:3630`). So: (1) `bounceDelta`
   (`js/behaviors.js:157-190`) also filters `k.split` keys in its non-lineage path, only when at least two unmarked keys remain
   (the same `merged.length >= 2` guard as `:175`), a Full change logged in POLISH-LOG with its own test that fails on HEAD, so
   a boundary pair no longer makes Bounce ring at a cut nobody made; (2) `R.couplings` lists the camera's own behaviour
   references (Follow `params.targetId`, Audio Drive `params.sourceId`, `js/behaviors.js:237-240`, `:203`) with `from` = the
   camera and `via` = `'follow'` / `'audio'`, so rule 5 refuses a delete of the target with *"The camera follows Clip 3 · Open
   in Full"*, and rule 4's ask fires when the plan moves the target by a `d` different from the camera's piece offset there.
4. **Pre-flight.** Any remaining coupling whose two ends the plan moves by different `d`, where the referenced end is
   time-varying, makes the runner ask once, before writing anything: *"1 camera move will slip"* (or *"1 parent"* / *"1
   matte"*) + **[Do it anyway]** + **[Why? ›]** (Why opens a small sheet with the whole sentence, *"This puts 1 camera move
   out of step with its clip"*, and Open in Full, so the warning is never cut by an ellipsis). "Do it anyway" is one step; Undo
   reverses it. **The tail fit counts** (§4.5): `couplingsBroken(plan, R)` computes each `sm.tail` unit's fit map `g` before
   anything is written, and a referenced unit whose keys `g` would move (any key outside the identity head zone) counts as moving
   that end; without Do it anyway, it gets only the duration change and its keys stay. The referenced end is
   the **set of lineage members** that cover any part of `u`'s span in the original `R`: the ask fires when the plan moves any of
   them by a different `d` than `u`, or deletes one while `u` survives.
5. **Deleting a referenced unit** (as transform parent, matte source, behaviour target, Audio Drive source or `karaokeOf`) while
   a survivor still references it refuses the whole command, naming both (*"Title 3 is attached to Null 1 · Open in Full"*),
   **except** when the deleted clip is a split-lineage half: then no follower that resolves to a surviving half is deleted, and
   inside the same plan each survivor's stored `parent` (or matte / behaviour ref) is rewritten to the surviving half that covers
   its start, the same repointing Full's `rehomeOrphans` does (`js/app.js:3544`), in one undoable commit. It refuses only when no
   surviving half covers the follower. Full's `rehomeOrphans` itself is not run behind Simple's back.

### 3.11 Refusal lines

Each fits one row of `#sm-say` at 380 px (§3.12), with at most two buttons; tests assert the exact strings **and** the geometry.
**Every line is written for 348 px** (380 − 2×16) at 13 px with its buttons (each button its text + 24 px, at least 44 px, 8 px
apart), using the longest name the display helper allows. Names in lines go through **`FM.spine.nameWord(mid)`** (the first 10
characters plus '…'; names may be 32 characters, `LIM.NAME`, `js/collab-core.js:40`). Measured with the phone font, the old
owner `live` line was 407 px and the couplings ask 631 px, so the ellipsis cut the consequence off; the rows below are the
measured forms.
**Every line that names a person** uses **`FM.spine.whoWord(mid)`**: the member's name through `nameWord`, except when it
equals the owner's own profile name (case-insensitive, trimmed) or the member is marked `self` (§10.4 4c): then *"your phone"*
when `rec.dev === 'phone'` (`js/collab-ui.js:2504`, already shown on the knock card as "Ezra (phone)", `:4091`), *"your
computer"* otherwise, and *"your other device"* when two same-name members share a `dev`. On a guest whose host name
(`hostLabel`, `:3825`) equals its own, the owner reads *"the device that started sharing"*. It feeds `live`, `away`, `busy`,
`locked by` and `view`.
Every line that names an item uses one helper, `FM.spine.itemWord(lid)` (the naming rule, §8.9): a main clip is *"Clip N"*
(its 1-based position on the main track in the committed scene when the line is shown), a text or caption item is its first
words in quotes cut to 16 characters with an ellipsis, anything else is its kind (*"the sticker"*, *"the image"*, *"the video on
top"*, *"the song"*, *"the voice-over"*, *"the effect"*). Never `layer.name`, which is the file name (`js/app.js:3000`).

| Reason | Line |
|---|---|
| `view` (a Viewer) | *"View only"* + **[Ask to edit]** (`U.askEdit()`, `js/collab-ui.js:4212`); when `askWaiting()`, *"Asked Ezra · waiting"* (*"Asked your other device · waiting"* on his own devices) with no button |
| `comment` (a Commenter) | *"You can comment here"* + **[Ask to edit]** (a Commenter can ask too, `js/collab-session.js:882-886`) |
| `outbox` (an Editor guest whose offline outbox is full, `s.outboxFull`, `js/collab-session.js:300-303`) | *"Too many offline changes"* + **[Save my version]** (reuses `js/collab-ui.js:4361-4365`) |
| `newer` | *"Made with a newer FreeMotion · update to edit"* (in a live room: *"Someone here has a newer FreeMotion"*) |
| `locked`, one | by kind: *"That clip is locked"*, *"The music is locked"*, *"That sound is locked"*, *"That text is locked"*, *"That block is locked"* + **[Do it anyway]** (Full's wording, `js/timeline.js:172-176`, queue 816) |
| `locked`, several | *"N clips are locked"* (*"N items are locked"* when the kinds are mixed) + **[Do it anyway]** (acts on all N in the same step; the lock is kept, D7) |
| `locked`, in a session (Phase 4) | when `whoChanged('L/<id>/locked')` (`js/collab-session.js:1132-1138`) names another member: *"Clip 7 is locked by Sam"* + **[Do it anyway]**; a guest, a pre-session lock or an aged-out entry keeps the generic line (never guess a name; no `lockedBy` field, which would be new whitelist-drift surface) |
| `live`, owner, one editor | *"Sam can edit · clips stay put"* (*"Your phone can edit · clips stay put"* on his own devices) + **[Options ›]**, a small menu of **Make Sam a Viewer** (*"Make it a Viewer"*) · **Open in Full**. Make Sam a Viewer calls **`U.setMemberRole(mid, 'viewer')`**, a helper factored out of the People menu's action (`js/collab-ui.js:568`) that runs `s.setPeerRole(mid, role)`, then `noteRole(mid, role)` (the persisted `hostRoom.members[rid].role` that `othersCanEdit()` (b) reads and a reconnect restores, `:2503`), then `redrawShare()`; the People menu uses the same helper, so there is one path. (Calling only `setPeerRole` left the persisted role at editor: the gate stayed shut after the tap and Sam came back an Editor on his next reconnect.) Before demoting, if presence shows Sam typing, dragging or animating, or holding a lease (`PZ.heldByOther`), the item asks first: *"Sam is typing · make Sam a Viewer anyway? Sam's unsent change will be undone"* **[Make Viewer] [Not now]** (a guest cannot rescue it: the host changes the role before it sends `role`, `js/collab-session.js:1522-1526`). Being a menu item, a role change always takes a second, deliberate tap (§3.12 rule 5). A dropped member is outside `host.members`, so `setPeerRole` refuses it (`:1521`): the disconnected line is *"Sam is offline · clips stay put"* + **[Arrange anyway]** (§3.7) |
| `live`, owner, two or more | *"2 others edit · clips stay put"* + **[Options ›]** (menu: **Who can edit ›**, opening the Share panel's people list and its role menu · **Open in Full**; Full's one-clip moves are not gated) |
| `live`, guest | *"Clips stay put while you both edit"* + **[Open in Full]** (a guest cannot change roles; the old *"Only Ezra can move clips while you're sharing"* was false whenever it showed, since Ezra's Simple arranging is gated too, and "sharing" is the owner's verb in #967's words) |
| `away` (Phase 4+: an editor is offline), owner, one away | *"Sam is offline · clips stay put"* + **[Arrange anyway]** (the §3.7 confirm and warning; adds the rid to `waived` for this session; the old `away` line had no button, so the release that lifted the gate removed the owner's escape) |
| `away`, owner, two or more | *"2 others offline · clips stay put"* + **[Options ›]** (Who can edit › · Open in Full) |
| `away`, guest | *"An editor is offline · clips stay put"* + **[Open in Full]** (a guest cannot waive) |
| `offline`, Phases 2-3 and any offline state before Phase 5 | owner: *"You're offline · text, captions and looks still work"* (no promise about reconnecting: before Phase 4 reconnecting lifts nothing, and nothing is queued). On a guest or a linked copy (`C.isLinkedCopy(pid)`): *"Offline · text and looks still work"* + **[Make it my own]** (**[Mine]** on a phone), which runs the existing Leave route factored into `U.leaveKeep(pid)` (the `LEAVE_KEEP` confirm, `patchCollab(pid, {ended: 'left'})`, `FM.projects.detachLinked`, *"You left — this is now your own copy"*, the device-full fallback; `js/collab-ui.js:3292-3308`, `js/storage.js:2744`; the Friends card's Leave calls the same helper), never Save my version, which would make a second project and leave this one gated. After it `othersCanEdit()` is false and the next arranging edit goes through (a copy whose owner closed the app, paused or never came back was otherwise gated for good) |
| `offline`, Phase 4+, only when online arranging is really available | *"Moving clips needs a connection · text and looks still work"* |
| `busy` | *"Sam is editing ‘Clip 3’ · try again soon"* (*"Someone else"* when unnamed; *"Sam is typing captions"*, *"Sam is animating the camera"* for those cases) |
| `waiting` (media arriving, §5.2) | *"Waiting for 2 clips to arrive"* (only while hydrating or in a session with media in flight) |
| `big` | guest: *"Too big to send from here · ask Ezra"* + **[Open in Full]** (Delete and trims only); a single value: *"That item is too big to send while sharing"* (§3.7) |
| `couplings` (the §3.10 rule 4 ask) | *"1 camera move will slip"* (*"1 parent"*, *"1 matte"*) + **[Do it anyway]** + **[Why? ›]** (§3.10 rule 4) |
| `wait` (a fifth queued tap) | *"One moment — still finishing the last edit."* |
| split on a block | *"Open in Full to split this"* |
| split in a gap / off the clip | *"Move the playhead onto the clip to split"* |
| split near an edge | *"Too close to the edge of the clip. Trim instead?"* |
| split in a crossfade | *"Move the playhead out of the crossfade to split it"* |
| trims | *"Nothing more to trim"* · *"That's the start of the video"* · *"Not enough footage"* · *"That clip fades into the next one"* / *"…into the one before"* · *"This clip is already as short as it can go"* |
| insert at a crossfade | *"Clips 3 and 4 fade into each other · pick another cut"* |
| a slot with nothing full-frame | *"Nothing in this card fills the frame · Open in Full"* |
| speed | *"Too short to speed up that much"* |
| sort, and reorder of a clip on a blend | *"Some clips fade into each other · move them by hand"* · *"Already in date order"* |
| drag changed under the finger | *"Clips changed while you were dragging — try again"* · *"Sam removed that clip"* |
| switch while exporting | *"Wait for the export to finish"* (mid-drag stays a shake) |

When a refusal names items, the runner outlines and briefly pulses each (`FM.timeline.host().clipEl(lid)`; a block's own
element for a block; for an id with no element in the Simple timeline, such as the camera, the element of its section, or no
pulse) and scrolls the first into view; Simple draws Full's small padlock (`js/timeline.js:1358-1371`) on every locked item.
Find speech with no result and a file that will not open reuse their existing toasts (`js/captions.js:549-552`,
`js/medialib.js:256`). Full's own lease toast (`js/collab-session.js:1669-1670`, the file name) keeps its wording until #967
picks it up; that is logged as a queue item, not changed here.

### 3.12 Where Simple speaks

`FM.toast` shrinks to fit (`#toast` has no width rule, `styles.css:3772-3777`; the repo says so at `js/app.js:3063`,
`js/media.js:590`, `js/storage.js:371`), so at 380 px most lines wrap to three rows; on the phone it sits at `bottom: 244px`,
over the ruler, the section bands and the play bar; `FM.toast(msg, ms, onTap)` makes the whole pill the button
(`js/app.js:1337-1352`) and `.toast-tap` is exempt from #935's `pointer-events: none` guard (`styles.css:10891-10896`), so an
Undo or Do-it-anyway pill caught taps meant for a clip; and `#toast` has no role or `aria-live` (`index.html:638`). So:

1. **Simple never calls `FM.toast` for its own lines**, and there are **two kinds of line**:
   (a) **Lines with no button** (moves and reorders, including *"Clip 2 moved to 3 of 5"*, a plain *"Undid"*, trim, speed and
   split results) **never replace the tray.** They go to `#sm-live`, a separate, always-present, visually hidden element
   (`role=status`, `aria-live=polite`, its text replaced each time), and the affected clip gets a brief outline pulse (a static
   outline under `FM.reducedMotion()`). The pressed tool stays mounted and keeps focus, so Move earlier can be pressed three
   times in a row by thumb or by Enter (when every line replaced the tray, the button vanished under the focus after one press
   and a second tap landed on text that only dismissed it).
   (b) **Lines with buttons** (refusals, a delete that took other items, multi-item or Assistant edits, Do it anyway, a soft
   undo) take `#sm-say`: a message state of the permanent tray row (§8.2), the same 52 px row, full width, so it adds no height
   and never covers `#sm-timeline`; `role=status`, `aria-live=polite`, always in the DOM. They never time out while focus or the
   pointer is inside them; otherwise after 4 s, extended to 10 s when the line has a button (WCAG 2.2.1). They dismiss on a
   selection change, a tap outside, Esc, or their own ✕ button (≥ 32×32). When a (b) line appears as the result of a tray
   button, focus moves to its first button, and when it dismisses, focus returns to the tool that raised it, or to the tray's
   first tool if that is gone. On PC it takes the tray's place in the band.
2. **Each action is its own real `<button>`** of at least 44×32 px (Undo · Do it anyway · Open in Full · Options › · the named
   item, such as *"Sam's title"*). A tap on the line's own text does nothing and does not dismiss it. A line has at most two
   buttons.
3. **One clause per line, one row at 380 px**, written for 348 px with its buttons (§3.11); the ellipsis is only a guard (the
   full text goes in `title` / `aria`), and T19 fails if it fires on any §3.11 string.
4. **No Undo button after a trim, speed, reorder or split**, because the play bar's ↶ is always there. A line with Undo appears
   only for a delete that took other items with it, a multi-item or Assistant edit, a Do-it-anyway, and a soft-skipped undo
   (*"Undid, except what Sam changed"* + **[Close gaps]**). Refusals always show a line. Examples: *"Deleted clip · kept Sam's
   title"* + **[Undo] [Show]**.
5. **Buttons never appear under a finger that is still tapping.** `FM.spine.say()` stamps the time it is called, and every
   `#sm-say` button ignores pointerdown and click until both 400 ms have passed and the pointerup of the tap that raised the line
   has happened; a pointerdown that began before the line appeared never activates it, and while arming the buttons read as
   disabled (`aria-disabled=true`). While a line shows, **the rightmost 56 px of the row (🗑's slot) holds no button and takes no
   tap**: the text starts at the left and its buttons follow it, left-aligned, and no button may overlap the rectangle 🗑 had in
   the tray it replaced. So a quick double tap on 🗑 can no longer land on *Do it anyway* for a locked clip or on the new line's
   *Undo*. A role change is never one tap: Make Sam a Viewer lives in the `live` line's Options menu (§3.11). (Full already keeps
   a 52 px margin by its bin for the same reason, `js/mobile.js:252`, and took Delete out of a mis-tap menu, queue 221.)
6. **Simple's design never calls `FM.toast` with `onTap`, in either editor** (the whole pill becomes the button and catches
   taps meant for what is under it; §6.1's arrival note in Full is a plain, non-interactive toast). The one exception is 4d's
   *"your title was kept"* line on a device in Full, shown through collab's existing `toastAction` only when a friend's delete
   kept your item (§10.4 4d).

---

## 4. Attachments: "things follow the clip they start on"

### 4.1 The rule, in his words and in code

**Plain words:** *Things stick to the clip they start on. Songs and voice-overs (a sound that runs on past its clip), and long
things that run across three or more clips, stay
put. Any item can be switched to Stay put.* Captions follow cue by cue.

```js
function hostOf(u, R, seen = new Set()) {      // u = a unit
  if (u.sm && (u.sm.main || u.sm.stay)) return null;
  if (R.isMain(u.id)) return null;             // the derived main set (R.main ids), so the preview equals the adopted result
  const k = R.units[u.id].kind;
  if (k === 'fullOnly' || k === 'undecided' || k === 'background') return null;   // the camera rides (§3.10)
  if (k === 'captions' && !R.withinOneClip(u)) return null;       // a spanning track rides (§3.5); one inside a clip follows
  if (R.parentsMain(u)) return null;                               // a rule-2 mover (§3.10): moved by the plan, never pinned
  if (seen.has(u.id)) return null;                                 // a reference cycle: listed in R.couplings, warned, never pinned
  seen.add(u.id);
  for (const v of R.linksOf(u)) {                                  // an sm.unit anchor first (type 'unit', §2.5), then transform
    if (R.isMain(v.id)) return v.id;                               //   parent, matte source, Follow target, Audio Drive source,
    const h = hostOf(v, R, seen); if (h) return h;                 //   each resolved through R.lineageAt(ref, u.start) (§3.10 rule 1)
  }
  const s = R.soleReferrerHost(u); if (s) return s;                // a hidden helper goes with its only user (§3.10 rule 1b)
  const c = R.mainAt(u.start);                                     // start−eps ≤ u.start < end−eps, over clips AND slot entries
  if (!c) return null;                                             // before 0, in a gap, or after the track: stays put / tail
  if (k === 'audio' && !(u.sm && u.sm.twin) && u.start + u.duration > c.end + 1.0) return null;   // the one sound rule
  if (!c.slot && isLong(u, R)) return null;                        // long things stay (before and after adoption)
  return c.id;                                                     // a clip id, or 'slot:…' for a slot member (§3.1)
}

function isLong(u, R) {                        // one derived predicate; no 50 % comparison anywhere, so no float flips
  const i = R.indexAt(u.start);                // u's start clip in R.main
  const whole = u.start <= R.main[0].start + R.eps && u.start + u.duration >= R.trackEnd - R.eps;
  const pastNext = i + 1 < R.main.length && u.start + u.duration > R.main[i + 1].end + R.eps;
  return whole || pastNext;                    // covers the whole track, or touches three or more clips
}
```

- An item starting **exactly on a cut** belongs to the clip after the cut (Freeze, Later, overrides this for its own still); the
  link rule's `R.lineageAt` is half-open for the same reason (§3.10 rule 1).
- **A moves-together group's anchor** (`sm.unit`, §2.5): its member carrying `sm.main`, else its earliest-starting member with
  no `sm.stay` (ties: higher in the stack). Every other member without `sm.main` or `sm.stay` has that anchor first in
  `R.linksOf(u)` as a link of type `'unit'`, so it takes the anchor's host through the link path, with its seen-set and cycle
  guard; the anchor itself uses the normal rule. The anchor is worked out fresh each time and never stored, so deleting it
  picks the next one, and Stay put on one member takes only that member out. The tray shows *"Moves with ‘Hello’"*.
- **The link is shown.** When an item is selected, a thin line in its section colour runs from its first frame down to the
  clip it follows (Rush's line, LumaFusion's link line, pro §2, §5). The clip tray shows **Stay put** (off). A tail item shows
  *"Stays at the end"* instead.
- **Moving an item re-links it** with no extra step, because the link is where it starts (U).
- **Defaults when Simple adds something:** it follows, except Sound → Music (`sm.stay` + `sm.tail`, §4.5, even on an empty main
  track).
- **One sound rule for every path** (Simple's adds, adoption and command-time pinning): a sound (kind `audio`, not a twin) that
  runs more than 1 s past the end of the clip it starts on gets no host (the line in `hostOf` above). Like `isLong`, it is
  evaluated only at adoption and when a command is planned, and the unit is pinned with `sm.stay` in that step, so it cannot flip
  on draw. So a Full-made 30 s song over clips 1-2, or a voice-over, stays put and is never deleted with clip 1, while a 0.8 s
  whoosh starting 0.4 s before a cut follows its clip. (Before, only whole-track or three-clip sounds and Simple's own recordings
  stayed put, though §13 #10-#11, Q4 and Q23 all assume music does.)
- **Lyrics timed to the song.** The ripple plan builder sets `plan.musicTimed` to the moved text units (not caption tracks, no
  `sm` key, not linked) that either start within one frame of a benchmark, or belong to a run of three or more back-to-back
  texts (each starting within 0.1 s of the previous one's end) that crosses at least one cut, **and** that have a stay-put,
  non-twin sound under them. When `plan.musicTimed.length ≥ 1`, the line reads *"Moved 6 texts with their clips"* +
  **[Keep on the music]**, which re-plans the same command with those units given `sm.stay` and replaces the step in place as
  one undo step. At adoption the same run-shape test (over one stay-put sound that is not the whole-track music bed, or on
  benchmarks) gives those texts `sm.stay`, like §3.5's voice-over exception. An ordinary title over a music bed never matches
  (a test of "overlaps a stay-put song" would fire after almost every ripple), and no project setting is added.
- **At command time, long things don't follow** (§3.2 rule 4): a unit with no `sm` key that `isLong` is not carried, and is
  pinned with `sm.stay` in the same step (§4.3). A two-clip straddler (a 2 s title starting 0.8 s before a cut) is not long: it
  follows its start clip through every ripple, head-trim clamp, D6 slide-back and speed scaling of where it starts on that clip
  (it keeps its own length, §3.6 Speed row). A whole-video
  title Full added after adoption is long (Q8), with no new stored flag.

### 4.2 Why derived, with one stored opt-out
- **No id to remap.** A stored link (`sm.on`, `stick.to`) needs remapping in `reIdLayers`, duplicate, paste, template and
  element insert and the AI clone (M §14.2), and goes stale the moment a Full user drags either end. The derived rule has
  none of that (U §4.2). It is also deterministic in collab: only the editing device works it out, and what it sends is the
  resulting values (buildability §3.2).
- **The two ways a derived link could flip are closed:**
  - **"Long things" can't flip**: `isLong` is a pure predicate of the positions (no ratio to land either side of), it runs at
    adoption (stored as `sm.stay`, §5.3) and, after it, only when a command is planned, never on draw; and any long unit a
    command leaves in place is pinned in that same step, so a later clip sliding under it cannot re-home it (§4.3).
  - **A trim can't strand an item over the next clip**, because a trim that cuts away the frame an item starts on (start ≥ the
    new end − eps, the same tolerance as `mainAt`) slides the item back onto its own clip (§3.6, D6). So after the command,
    the item still starts on its clip (invariant 2).
- **The one cost, said plainly:** an item that *ends* over a different clip follows only its start clip. Final Cut,
  LumaFusion and Premiere mobile do the same (pro §3, §5). Final Cut can keep a connected clip linked while it starts past its
  clip; that needs a stored link, so the derived model cannot express it (Q1). **And only Delete cuts a long item** (§3.2
  rule 4): a trim under a narration or whole-video title that started on an earlier clip leaves it at its absolute time
  (pinned), so the picture shifts against it by the trimmed amount, and a whole-video title that now overruns the end is shown
  by the black band with its **End with the video** button (§5.4).

### 4.3 Edge rules
- Only a main clip (or a slot entry, for its members) can be a host. **Host chains cannot cycle** (a main clip never follows
  anything); **link chains can** (mutual Follow and mutual mattes are allowed, `js/inspector.js:5290-5291`,
  `js/compositor.js:8448`; `js/behaviors.js:231-239` guards the render with `seen`), so `hostOf` carries a `seen` set and a
  cycle member gets no host, is listed in `R.couplings` and is never pinned. A unit that contains a main clip is never a
  follower.
- **Deleting a clip in Simple deletes what follows it** (D5), in the same step, with an Undo line that counts them, except
  long items (they are cut through the delete map, §3.6) and, in a live session, items another member made (kept with
  `sm.stay`, §10.4 4c). In Full, `FM.deleteLayer` stays exactly as it is (`js/app.js:3677`).
- **A split** hands the items after the cut to the second half automatically (they now start on it; links resolve through
  the lineage, §3.10 rule 1).
- **The tail: an end card follows the end of the track.** `R.tail` = the non-main units, not captions, not `fullOnly`, with no
  `sm.stay`, that start at or after `R.trackEnd − eps` (a group counts once, by its start). Adoption does **not** give them
  `sm.stay`. Every ripple at or before the track end moves them by the change of `trackEnd`, so Append lands new clips before a
  logo or text end card and a delete pulls it back (any gap before it is kept exactly). Stay put pins a tail item to its
  absolute time.
- **Strays and long units are pinned by every arranging edit.** `FM.spine.pinStrays(R, plan)` writes `sm.stay`, in the same
  step and before `apply`, on every non-main, unflagged unit that **`FM.spine.neverPinned(u, R)`** does not exclude (one
  predicate shared with `adopt()` and `adoptPreview()`, so the three cannot drift apart: a caption track or caption block, a
  `fullOnly` unit, one in `R.tail`, a slot member, a rule-2 mover or a unit whose link chain ends at one, a link-cycle member, and
  a unit `hostOf` hosts through the link rule or rule 1b), and whose pre-edit host is null
  **or** which this command's `isLong` test took out of its start clip's followers (tail trim, head trim, speed, reorder, Make
  overlay, delete; Delete cuts first and then pins). So no ripple can slide a clip under a Full-made item sitting in a gap, or
  under a long item left in place, and attach it by surprise (Q9). It changes nothing the user sees: the item was already
  staying put, and afterwards it behaves like one pinned at adoption. **When it pins a unit it also gives it `sm.tail`** (and
  `tailEnd`) under adoption's rule (§4.5), with the same exclusions (a caption track, the camera, `fullOnly`, undecided,
  background, a coupling's referenced end or a video with audible sound get `sm.stay` alone), when the unit's **post-plan** span
  ends at the new `trackEnd` ± eps, which a Delete cut makes true for a 0..end item; the tail fit then runs on it as a no-op.
  (Before, a whole-video title cut by one Delete was pinned with `sm.stay` alone, so the next Delete could neither cut it
  (invariant 4) nor fit it, and left a black band; a watermark added in Full after adoption was not fitted by a clips-only
  Append at all, §3.6 Append row.)
- **Hidden layers** (`visible: false`) are classified like any other and drawn dimmed with an eye badge (§8.2). **`fullOnly`
  units** (the camera, a bare null) get no `sm.stay`.
- **Effect segments stay inside their clip.** Simple creates one at the playhead with `length = min(3 s, host.end − start)`
  (if that is under `MIN_LEN`, it starts on the next clip). An effect-kind follower that ended at or before `host.end + 1e-9`
  before a command is clamped after it (`duration = min(duration, host.end − start)`, from the landed start), by every command that shortens a host:
  tail trim, head trim, speed-up, a shorter Replace. The clamp's `duration` goes in `plan.sets`, so the lock and lease
  pre-flight cover it; if flooring at `MIN_LEN` slides the start back, that slide is `addMove(moves, id, newStart − start)`,
  never a `sets` write to start (§3.3), so its keyed params move with it. A segment a user drags past a cut, or a Full-made one
  that already crosses one, is left alone and shows a small *"runs over the next clip"* hint (Q5). Clipping masks are blocks
  (§9.1) and need nothing new.
- **Groups:** a block group follows as one unit, by its members' start; a transparent group's members follow one by one, and
  its own layer is bookkeeping (§2.5).

### 4.4 Controls
- **Simple, item selected:** **Stay put** switch in the tray; drag the item to re-link it; the link line.
- **Full, layer menu** (`FM.layerMenuItems`, `js/app.js:5147` [checked]), Phase 3: **Make overlay / Put in the clip row**
  (§8.9's words); **Stay put** (on/off). All go through one helper, `FM.spine.setMembership(id, key, on)`, which **runs through
  the runner**: `FM.spine.edit(label, R => ({ sets: [flag write], adopts: !R.adopted, arranges: false }), { ed: 'f' })`. It
  therefore gets the uncached `classify` plus `adoptPreview` (§2.5; the cached `read()` could be stale after a remote batch),
  the live gate for `adopts && !R0.adopted` (refused with the §10.2 line while an editor member is in the room and the project
  is un-adopted: two peers adopting from their own derived views would union their flags, `sm` being a plain nested key that
  merges per path, `js/collab-path.js:262`, and a friend's lease would drop one clip's `sm/main` write while
  `project.sm.adopted` landed, `js/collab-host.js:833`, `:871`), the arriving-media refusal, the lease blockers, and one commit
  with `arr: true` and `meta.adopt` when it adopted. The runner only chooses the undo label and the editor tag; Full still never
  ripples, so a newly flagged clip that overlaps shows as an overlap chip and a removed one leaves a gap chip. Its adopting
  half is gated like any first edit on an un-adopted project (§3.6, Q13); on an adopted project it is a one-flag write and
  live. In Full's menu a refused item is greyed with the §10.2 line (or toasts it on tap), never falling through to a bare
  flag write. The menu picks its label from `R` (the derived main list), so a derived main clip offers **Make overlay**, and it
  works (a bare flag write would demote every other clip on an un-adopted project, or be a no-op). On a block it writes the
  flag on the block's picture members, never on the group layer (§2.3). Full users keep every option (#966).
- **Full timeline** (Phase 3, optional): a thin stripe along the bottom of a main clip's bar. Nothing else changes in Full.

### 4.5 The video ends where the clips end (decision D17)

`FM.autoFitDuration` sets the project length to the furthest end of any non-camera layer, sound included
(`js/app.js:852-876`), and nothing trims a new song to the video. So four 20 s clips plus a 3:12 song export as 3:12, and a
delete after the song was fitted leaves a black tail. (CapCut behaves the same, `research/capcut-mobile.md:113`; iMovie's
background music fits the movie, `research/pro-editors.md:331-335`.)

- **`sm.tail: true`** ("Ends with the video"), sanitised like the other flags, implies `sm.stay`. Copies and split heads do not
  inherit it: `onSplit` clears it on A (only the later piece can end with the video) and `onCopy` clears it on every copy
  (duplicate, duplicate in place, paste, AI clone, extract audio), keeping `sm.stay`; the tray switch is the one way to turn it
  back on on purpose.
- **Sound → Music**, when the main track is not empty: added at the playhead with `sm.stay` + `sm.tail`, trimmed so it ends
  at the main-track end (never below `MIN_LEN`), and `fadeOut = min(2, duration/4)` if it had none (`fadeOut` counts from the
  end, `js/scene.js:699`, so later fits keep the fade). **With an empty main track** it still gets `sm.stay` + `sm.tail` (and
  `tailEnd`), is left whole and draws no black band; the first arranging edit that makes the main track non-empty (Append, or
  New project's picked clips) fits it in the same step, with the fade if it had none. **The empty track is defined:** when
  `R.main` is empty, `trackEnd` is null, `R.tail = []`, and `adopt()` / `pinStrays` pin every unflagged non-caption,
  non-`fullOnly` unit as a hostless stray (`sm.stay`), so a song added before any clip is never read as a tail item and pushed
  after the clips (the "music first" flow).
- **Adoption** gives `sm.stay` + `sm.tail` to every unit that covers the whole main track (start ≤ first main start + eps and
  end ≥ last main end − eps): a watermark, a grade, a progress bar, a Full-made song. A 0..end item therefore never follows a
  long first clip and is never deleted with it. **Never to caption tracks or caption blocks** (their window follows the track end through `f`,
  §3.5), **the camera** (a start-0 camera is re-spanned by `autoFitDuration`, `js/app.js:869-872`; the camera gets `sm.stay`
  only through an explicit Stay put), `fullOnly`, `undecided` or `background` units, **or a video with audible sound** (a
  picture unit that is not muted and has an audio track: a talking-head take whose end must never be cut by a fit; it gets
  `sm.stay` alone), **or a unit `FM.spine.neverPinned(u, R)` excludes** (a rule-2 mover such as a Controller made with
  `FM.addNullLayer`, which spans 0..end by default, `js/app.js:3140`, `js/scene.js:691`; a unit whose link chain ends at one; a
  unit hosted through the link rule or rule 1b, such as a hidden helper used only by one clip): these get no `sm` key, so a
  reorder of all a Controller's children still moves it by `d`. **The referenced end of a coupling** (transform parent, matte
  source, Follow target, Audio Drive source) whose referenced value is time-varying gets `sm.stay` only, never `sm.tail`: the
  tray's Ends with the video switch is how to turn the fit on deliberately. A unit adoption pins with `sm.stay` (a stray or a
  long unit) that ends at the track end (± eps) also gets
  `sm.tail`: decided once and stored, so no later trim flips it, and its switch then shows on.
- **Every write of `sm.tail`** (adoption, `pinStrays`, the tray switch, Music) also writes **`sm.tailEnd`** = the end it was
  fitted or switched on at, and every fit rewrites it; `onSplit` and `onCopy` clear it with `tail`.
- **The runner fits tails** after the moves and before commit: for every unit with `sm.tail` **and only those**, and only when
  its current end is within eps of `tailEnd`. **A different end means he set its length on purpose** (Full's grip or D, the
  inspector's duration field, Ask's raw `duration` write, `js/ai-ops.js:117`, a Simple edge drag): the same step clears
  `sm.tail` and `tailEnd` (rider-only, exempt from locks), keeps `sm.stay`, and says *"‘the song’ keeps the length you gave it"*,
  instead of stretching it back on the next unrelated delete. The fit goes through `setUnitSpan` (§3.3), never moving the start:
  for a media unit (video or audio with a source) `r = FM.trimClipEdge(u, 'tail', trackEnd − (u.start + u.duration), srcDur)` and
  r's duration **and trimStart** are applied (a reversed item's trimStart moves by the source the tail consumed or regained,
  limited by trimStart ≥ 0; `FM.layerLocalTime` of a reversed layer depends on its duration, `js/scene.js:1074`, `:1078-1079`,
  so a duration-only fit re-timed its whole source, the bug queue 914.3 fixed in `clipTrimEnd`; a forward item is limited by
  `FM.maxDurForSource` as before); a sourceless unit (text, shape, group) gets its duration directly, floored at `MIN_LEN`; a
  block applies it to every member. `g` uses the **landed** `D′ = r.duration`; if it falls short of the track end (a reversed
  item already at trimStart 0, or a forward one out of source) the item is left short and the black band says so. **A bare null**
  (kind `fullOnly`, not the camera) whose end was ≥ the old `trackEnd − eps` is fitted with the `sm.tail` items (end = new
  `trackEnd`, start kept, keys through `g`) and stays unflagged, so it never keeps the video long and the band never shows
  for it. A Stay-put
  item with the switch off keeps its length; if a delete shrinks the video under it, it runs past and the black band offers
  **End with the video** (invariant 11 already allows it). Split-lineage guard, for split states already in the document (old
  builds, an old peer, Full on an old build): the `sm.tail` units are grouped by `splitOf` lineage and only the latest-starting
  one in each group is fitted; `setFlag(u, 'tail', false)` runs on the others in the same step. When the fit would be skipped
  (new end ≤ its start) the unit is not left running past silently: the black band shows (§5.4).
  **The fit re-times the item's animation** through one piecewise time map `g` from its old span `[s, s + D]` to `[s, s + D′]`,
  applied with `FM.spine.mapLayerKeys(layer, g)` (walks `FM.timedLists`, cue effects included, and skips the speed track, like
  `scaleLayerKeyframes`, `js/scene.js:405-414`): with `h = e = min(5 s, min(D, D′)/4)` (a symmetric function of the old and new
  lengths, so the fit `D → D′` and the fit `D′ → D` use the same anchors and their middle maps are exact inverses: an Append then
  a Delete of the same clip returns every key to its time within 1e-9; with `D/4` a key at 4 s of a 12 s title came back at
  5.111 s), keys in `[s, s + h]` keep their time (a fade-in
  stays a fade-in); keys in `[s + D − e, s + D]` move by `D′ − D` (a fade-out still ends on the last frame, and a progress bar
  still reaches full on it); keys between scale linearly between the two anchors (a 10-key progress bar stays in order);
  `h + e ≤ min(D, D′)/2 < D′`, so the old "plain scale when `D′ < h + e`" can no longer trigger and stays only as a guard for
  `D′ ≤ 0`. Audio (sound, music, voice) uses the same `g` for its volume keys
  except that the middle zone is the identity, so ducks stay at their absolute times (§3.10 rule 3); middle keys that end up
  at or past the moved end zone are dropped (Undo restores them). If the fit shortens an audio item that has no `fadeOut` and
  no falling end-zone volume keys, it also sets `fadeOut = min(2, D′/4)` so a Full-made song never cuts dead, and the line says
  so (*"… and the music fades out"*). The pre-flight counts the fit as a write to that item's own fields, so a leased song
  refuses the command the usual way (it is rider-only for the lock, §3.7), and `couplingsBroken` counts it for a referenced unit
  (§3.10 rule 4). Dropped audio middle keys are the one non-invertible case, and Undo restores them.
- **The tray:** Sound and Stay-put items show an **Ends with the video** switch, on by default for music. Switching it on
  fits at once, in one step (the same `g`). The black band (§5.4) gets a one-tap **End with the video**.

### 4.6 Sound taken out of a clip (sync twins)

`FM.extractAudio` (`js/app.js:1048-1072`) makes an exact duplicate (same start, duration, trimStart, speed, reversed), sets
`audioOnly` and opacity 0, and mutes the original; the karaoke tool renders a **new** file,
`safeName(layer.name) + ' (no vocals).wav'` (`js/audio-tools.js:163`), added through `FM.addMediaLayer` (`:170`) with the
clip's timing copied (`:177-184`) and `karaokeOf` set (`:177`). As a plain follower a twin loses sync on every trim, speed
change and split (a head trim advances `c.trimStart` but not the twin's; a tail trim leaves it playing over the next clip; a
split leaves B silent).

- **Recognised** by one predicate, `isTwinOf(t, c)`, used by the command plans, adoption and the drift chip. It is true when
  `t` is audio-only, the timing matches exactly (± eps: start, duration, trimStart, speed or ramp, reversed), **and** either
  (a) `t.karaokeOf === c.id` (a karaoke twin: no source-file test, since it is a rendered WAV by design; `karaokeOf` is
  remapped by `remapLayerRefs`, duplicate, paste and import `reId`, `js/app.js:4296`, `:4354`, `:4515-4517`,
  `js/storage.js:2078`), or (b) `t.sm.twin` is set and the source matches by **name + size + type** (not `lastModified`:
  `dataURLToFile` rebuilds a `File` with no `lastModified`, `js/storage.js:943`, and the import loop awaits each embed in turn,
  so a `.fmotion.json` round trip gave an extract twin and its clip different timestamps; exact timing already rules out false
  matches). `sm.twin` is written only by `extractAudio`; the karaoke tool needs none. Adoption also marks an unflagged match of
  kind (b). Optional hardening in the same phase: export writes `lm` into each media record and `dataURLToFile` passes
  `lastModified: md.lm`, mirroring `js/collab-media.js:1093`.
- **A twin belongs to its clip's unit**, like a group member: never a follower, so the D6 clamp, the speed-follower scaling and
  Make-overlay re-homing never apply to it. Every command that edits `c`'s source (both trims, speed, reverse, replace, split)
  applies the same call to its twins in the same plan; a split makes twin halves A′ and B′, so a reorder, delete, duplicate or
  Make overlay of B carries B′. **`karaokeOf` is repointed by the plan**: a split karaoke twin's B′ gets `karaokeOf = B.id`
  (`cloneLayer` keeps A's id, and the Karaoke toggle's restore sweep, `js/audio-tools.js:119`, would otherwise attach both
  halves to A while `FM.karaokeTwinOf(B)` returned null); a duplicated twin gets `karaokeOf = dupC.id`; `onCopy` does the same
  for any other route that copies a clip and its twin in separate calls.
- **Drift:** a layer that passes `isTwinOf` without the timing test, whose start is on `c` but whose timing no longer matches (a
  Full edit knocked it out of step), makes `c`'s tray show *"Sound out of step · Line up"*, which copies `c`'s timing onto it in
  one step. Simple never re-syncs without asking.
- **Take sound out** ships in the main-clip tray only in the same release as this section (Phase 2); if twins slip, the tool
  is held and only Volume / mute stay.

---

## 5. Opening any project in Simple, and back: a view, not a conversion

### 5.1 The principle
**There is nothing to turn.** That is the answer to his question *"whether we should allow you to turn a project that's already
in the After Effects version into the Premiere Pro version"* (INBOX.md:28). Every project opens in either editor, any time.
- **Full → Simple:** classify (pure), draw. Nothing is written.
- **Simple → Full:** draw the layers as today. Nothing is written. The `sm` keys are ignored by every Full screen apart from
  the optional stripe.

### 5.2 The classifier (M §5.2, corrected)

Pure (it reads only its `scene` argument, never `FM.scene`, §2.5), deterministic, O(n log n) by interval sweeps, never writes.

```js
FM.spine.classify = function (scene) {
  // 1. UNITS (§2.5): a top-level layer; a BLOCK group folded with its descendants; members of a transparent group each their
  //    own unit, the transparent group's own layer skipped; a transform-parented layer its own unit.
  // 2. MEDIA STATE: mediaState(u) = 'here' | 'arriving' | 'missing' (below)
  // 3. KIND (one table, below)
  kind(u) = u.type === 'camera'                                   ? 'fullOnly'    // rides as keyframes (§3.10)
          : u.type === 'null' && !R.linksAny(u)                   ? 'fullOnly'    // a controller with nothing to show; a
                                                                                  //   camera's parent is never a link (§3.10)
          : isBlockGroup(u) || u.type === 'null' || /^mask-/.test(u.blendMode || '') ? 'block'
          : u.type === 'adjustment'                               ? 'effect'
          : u.type === 'text' && Array.isArray(u.captions)        ? 'captions'    // any length, so an emptied track stays one
          : u.type === 'text'                                     ? 'text'
          : u.type === 'shape'                                    ? 'overlay'
          : audioOnly(u) === true                                 ? 'audio'
          : !drawsPicture(u)                                      ? (audible(u) ? 'audio' : 'overlay')   // opacity ~0 (below)
          : audioOnly(u) === 'unknown'                            ? 'undecided'   // media still ARRIVING (below)
          :                                                         'overlay';    // a picture: video or image
  // 4. MAIN TRACK: stored wins ONLY once project.sm.adopted; otherwise derive (a stray sm.main is ignored)
  if (adopted) main = units whose picture members carry sm.main and can be main: a picture, shape or non-caption text layer,
                      or a MAIN BLOCK (below); any other block holding main clips is a MIXED block. A stored sm.main on a
                      unit that turns out, by its media record, to draw no picture is ignored (kind 'audio') and listed as
                      a 'mainNoPicture' anomaly; the sanitiser never strips it (§2.3). A 'missing' unit with sm.main stays main.
  else {
    cands = picture units and main-block spine members, not inside another block, duration > 0, drawsPicture(u), fillsFrame(u)
    // pass A: visible candidates (layer.visible && !hiddenByGroup, §2.5)
    drop, as a BACKGROUND, a candidate S that spans two or more other candidates ONLY when all hold:            // kind
      (a) every spanned candidate is above S in the stack;                                                     // 'background'
      (b) the spanned candidates tile S's covered stretch: every seam between consecutive ones is a join, blend
          or overlap (no gap > eps where only S shows);
      (c) S carries no sound (an image, a solid, or a video that is muted or has no audio track).
      Otherwise S is kept: the bottom-first greedy takes it, and the spanned clips (which overlap it by more than the
      tolerance) become overlays that follow S. So an A-roll with B-roll cutaways is one main clip with connected
      cutaways, and deleting a cutaway deletes an overlay, with no ripple.
    IMPORT STACKS first: two or more full-frame, normal-blend, opaque, unkeyed candidates whose starts are within eps of each
      other form an import stack when they share one pick.b, OR when there are three or more of them (an old project with no
      stamp). A Full multi-file pick puts every file at one start (js/app.js:3040, :3074; handleFiles never moves the playhead
      between files, :5470-5476), and the stacked-take drop below turned four picked clips into ONE. An import stack is exempt
      from that drop: its members all go on the main track in pick order (pick.i, else lowest in the stack first, then id),
      drawn as one stack entry with an overlap chip and "Lay them end to end" (§5.4). Two unstamped clips at one start stay a
      stacked take (top wins)
    drop a candidate fully covered in time by a HIGHER full-frame candidate (a stacked take: top wins), UNLESS the upper
      one has a blendMode other than normal, any opacity below 1 (static or keyframed), a keying effect (chromakey,
      lumaKey, Remove a colour), or any enabled mask (legacy mask, pen masks, a penmask marker): then the LOWER one stays main
      and the upper is an overlay in front (a double exposure, a keyed clip over its plate, a masked face-cam over a screen
      recording)
    sort cands bottom of the stack first                                                      // the base picture (capcut §2.6)
    main = greedy: take a candidate if every taken clip t it overlaps has
             overlap(t, u) ≤ (isBlend(t, u) ? blendMax(t, u) : min(1 s, 0.5·min(t.duration, u.duration))),
           and it overlaps at most one taken clip                                               // hand crossfades up to half
    // pass B: hidden candidates (same fillsFrame, duration > 0, not in a block)
    add each hidden candidate that overlaps no taken main clip by more than eps               // a hidden clip in a seam gap
                                                                                               // is still on the track;
                                                                                               // a hidden alternate take
                                                                                               // under a visible clip is not
  }
  sort main by start, then lower in the stack, then id; then insert slot entries (§3.1)
  // 5. SEAMS (§3.1)  6. HOSTS (§4.1)  7. SIDES (§3.6.1)  8. COUPLINGS (§3.10)  9. TAIL (§4.3)  10. PRO LEVEL (§9.1)
  // 11. LANES (§8.6)  12. ANOMALIES
};
// mediaState(u), for a video or image layer:
//   'arriving' while hydrateSceneMedia / hydratePack is still running for this project (a new read,
//     FM.storage.hydrating(), of _hydrating, js/storage.js:440-449), or js/loading.js still lists the layer as pending
//     (before its 25 s GIVE_UP_MS, js/loading.js:36), or, in a session, the collab manifest lists its media with the bytes
//     or meta not yet landed (§10.7);
//   'missing' once none of those holds and there is still no usable record: hydration settled with the layer in `lacking`
//     (js/storage.js:458-459), the record failed to decode (:463-474), importObject finished with no obj.media entry
//     (an import over EMBED_LIMIT, 6 MB, js/storage.js:944, :1700-1739; a file saved before v16.33), or the store was cleared;
//   'here' otherwise. Hydration settling, import finishing and media landing all bump FM.docRev.
// audioOnly(u): true if u.audioOnly === true, or its media record has no width/height; for a 'missing' unit, decided from
//   document fields only: type 'image' → false; srcW/srcH stored → false; an audio extension (.mp3 .m4a .wav .aac) in
//   layer.name or in the import's omitted[].file → true; otherwise false (a picture). 'unknown' ONLY while 'arriving' with
//   no srcW/srcH and no manifest meta; false otherwise.
//   For a 'missing' unit, in this order: a record that exists but failed to decode → rec.file.type (audio/* → true,
//   image/* → false); then the NAME, case-insensitively, allowing a trailing " copy" or " copy N" (FM.cloneLayer appends it,
//   js/scene.js:818): .mp3 .m4a .aac .wav .webm .weba .ogg .opus .flac .aif .aiff .caf → true (voice recordings are named
//   .webm / .m4a / .ogg, js/voice-rec.js:45-51); an ambiguous name (.webm .mp4 .mov) or no extension with no other evidence →
//   'unknown': not a main candidate, drawn in place with the No footage badge. (The import's omitted[].file is NOT read: it
//   is built by name for the import toast only and never stored, js/storage.js:971, :976, :1726-1732.)
// drawsPicture(u): false when the effective opacity (FM.layerOpacity with behaviours, parent-group opacity multiplied in) is
//   ≤ 0.02 at its start, midpoint, end and every opacity key time in its span. Opacity 0 is Full's only route to a video's
//   sound without its picture (hiding a layer silences it, js/app.js:2210-2212, js/exporter.js:512; opacity 0 only skips the
//   draw, js/compositor.js:2807). Such a unit is kind 'audio' when its media has a sound track and it is not muted, else
//   'overlay', and never a main candidate before adoption, so an invisible music video at the bottom no longer becomes an
//   A-roll with every real clip an overlay; after adoption a stored sm.main on it is honoured (not a 'mainNoPicture' anomaly).
// fillsFrame: true when ANY of these holds at its start, midpoint or end (so a keyframed zoom-in from scale 0 passes):
//   (a) the drawn box in WORLD space covers ≥ 90% of the canvas width OR height and is centred within 10%;
//   (b) the part of its world box inside the canvas covers ≥ 90% of the canvas AREA, whatever its centre (a clip zoomed to
//       fill and panned to frame its subject: a canvas pan is a whole-animation shift, js/canvas-edit.js:659-661, so every
//       sample moves, and a 16:9 clip zoomed to fill a 9:16 frame failed (a) once panned ~108 px);
//   (c) (a) or (b) on its UNCROPPED box (FM.worldBox with the native size, the crop ignored): a crop changes what shows, not
//       which row the clip belongs in (FM.cropOf does not scale the content, js/compositor.js:16325-16339; FM.layerSize
//       returns the crop size, :16462-16467), so an 85% × 85% crop of a fitted clip stays main.
//   MASKS: for (a) and (b) the world box is first intersected with the enabled mask extent at the same sample time: a legacy
//   layer.mask when enabled and not inverted (its x/y/w/h through the layer's world matrix); the bounding box of each enabled
//   'add'-mode entry of layer.masks and of every mask a penmask marker names (evaluated paths, canvas space); subtract,
//   intersect and inverted masks leave the box unchanged (conservative). One helper exported beside FM.worldBox, shared with
//   the renderer, so a full-size face-cam with a circle pen mask in a corner is an overlay, not the main clip. World space = the native size
//   through the layer's own transform and crop, then through its parent chain exactly as applyParentChain composes it
//   (js/compositor.js:2375-2420: FM.clipAt(scene, pid, t) per parent, behaviour-resolved x/y/rotation/scale, a group's
//   scale/rotation about FM.groupPivot). One pure helper, FM.worldBox(layer, t, scene), exported from compositor.js and
//   sharing its matrix code with applyParentChain, so the classifier and the renderer cannot drift apart (a statically
//   scaled plain group is not a block, js/compositor.js:15611-15622, so its full-size members were judged full-frame).
//   The NATIVE size, in order: (a) the FM.media record when rec.width > 0 and (rec.rev ?? layer.mediaRev ?? 0) ===
//   (layer.mediaRev || 0); (b) srcW/srcH only when srcRev === (layer.mediaRev || 0); (c) the collab manifest's w/h at
//   the same rev; (d) otherwise unknown, never a stale srcW/srcH (an older build's replaceMedia bumps mediaRev,
//   js/app.js:4712, but writes no srcW). A 'missing' picture counts as full-frame before adoption when its transform is
//   centred within 10% (position only: import's fit ratio is unknown, js/app.js:3004-3005); after adoption its sm.main
//   decides. There is NO "transform scale ≥ 0.9" fallback: import sets scale to the fit ratio, so a 4K clip in a 1080p
//   project is 0.5 and a landscape clip in 9:16 is 0.5625, while an mp3 (width 0, fit Infinity) gets 1. The fallback made
//   the song the main track and real clips overlays.
```

| Kind | Section | Tray (§8.5) | Follows a clip | Deleted with its host |
|---|---|---|---|---|
| main (any picture unit on the main track) | Main | Main clip | never | — |
| overlay | Overlay (or **Behind**, the hatched section just above the clip row, when its side is `behind`, §3.6.1, §8.2) | Overlay | yes (start rule, link rule) | yes |
| text | Text | Text | yes | yes |
| captions | Captions | Caption track | rides (§3.5); **follows** if it lies inside one clip | no (yes if it lies inside one clip) |
| audio | Sound | Sound | follows unless it runs more than 1 s past its start clip (a song or voice-over, §4.1), or Stay put | yes, unless it stays put |
| effect | Effects (drawn in the overlay area; Behind when below every main clip it overlaps) | Effect segment | yes, clamped to its clip (§4.3) | yes |
| block | Overlay, hatched (a main block sits in the main row) | Block | yes, as one unit | yes |
| background | Behind, hatched | Overlay | no (`sm.stay` + `sm.tail` at adoption) | no |
| fullOnly (the camera, a bare null) | a *"More in Full ›"* segment in the tray row's nothing-selected line (§8.2) | — | camera: rides; null: never | never |
| undecided (media arriving) | the main row, in place, with a loading look | — | no | no |
| any kind with media `missing` | drawn in place in its row with the existing offline look and a **No footage** badge | its normal tray, with **Replace…** first | as its kind | as its kind |

- **Main blocks** (one rule before and after adoption). A block is a **main block** when its `fillsFrame` picture members, its
  **spine members**, are consecutive in main order, and every other member (titles, stickers, sound) starts and ends within
  `[min start − eps, max end + eps]` of those spine members. Before adoption the spine members are candidates in the normal
  greedy pass with the block as their unit; after adoption they are the members that carry `sm.main`. A main block ripples and
  reorders as one piece. **A main block with exactly one spine member M** (the others titles, stickers, mask shapes, sound: a
  clip framed by a rounded-rect in a masking group, or a clip and title under a group fade) gets Trim, Speed and Split through M
  (§9.2); any other main block refuses Trim, Split and Speed with the block line.
- **Wrapper blocks.** A block whose spine members are the **whole** derived main track (a clip-plus-title intro and
  "everything grouped with a fade-out" both look like this) is drawn and edited **as if transparent**: each member is its own
  unit, clips are main, titles follow their clips. The group layer becomes one whole-video look item with `sm.stay` +
  `sm.tail` behaviour: after every arranging command the runner sets its start to the members' min start and runs
  `FM.refitGroupsFor` (`js/app.js:869`); the group's own keys are re-timed with `FM.spine.mapLayerKeys(group, g)` using §4.5's
  piecewise map `g` from its old span `[s, s + D]` to the new `[s′, s′ + D′]` (fixed zones `h = e = min(5 s, min(D, D′)/4)`,
  middle keys scaled, shifted by `s′ − s` if the start moved), so a fade-in stays a fade-in, a fade-out still ends on the last
  frame and the keys stay in order (the old "last half shifts, first half stays" moved a key at 11 s of a 20 s wrapper to 6 s,
  before its key at 9 s, when a 5 s clip was deleted). Append and Insert parent new clips to the
  wrapper, so the look covers them. Until this ships (Phase 1 may defer it), a wrapper shows its clips read-only in the main
  row with the line *"This video is one group with its own look · Open in Full"*, and never falls back to "+ Add clips".
- **Mixed blocks** (Q6). A block group whose main members are not consecutive in main order, or whose other members start
  outside those members' span, is drawn hatched in the overlay section with *"This group mixes clips and other things — Open
  in Full"*. Its members are left out of `R.main`, the hole they leave is drawn as a **group notch** (no chip, no Close gap,
  no Fix), and a command that would ripple through it or reorder past it is refused with that line. Its members keep
  `sm.main`, so Full and a later ungroup restore them.
- **Undecided** units (media **arriving**) hold their place, never move between rows and count as neither main nor overlay for
  hosts. An arranging command, and so adoption, is refused with `waiting` only while an arriving unit overlaps the main row's
  time span (the runner and this rule now say the same thing; undecided units are never candidates, so "any main candidate is
  undecided" could not fire). **Missing** media never blocks: the unit is classified from document fields as above, draws the
  offline look, and **Replace…** (today's Replace media route) writes `srcW`/`srcH`/`srcRev`, which turns it back into a normal
  picture and bumps `FM.docRev`.

### 5.3 Adoption: the first arranging edit stores what was worked out

Until someone makes an **arranging** edit in Simple (or Full's Make overlay / Put in the clip row, which runs through the same
runner, §4.4), nothing is stored and the classifier re-derives on every change, so a Full user's changes show at once. The
first such command (not the switch, not a tap, not a look edit) runs `FM.spine.adopt` inside its own undo step:

```
adopt(R):                         (refused only while an arriving unit overlaps the main row, §5.2)
  project.sm.adopted = true; project.sm.v = SM_V
  sm.main on exactly the derived main units (on a main block, its spine members; never a group layer);
    REMOVE any stray sm.main                                                            // the set, not a union
  (each exclusion below is FM.spine.neverPinned(u, R), the predicate pinStrays uses, run with hostOf-with-links BEFORE the
   coverage test, so adopt(), adoptPreview() and pinStrays cannot drift apart)
  sm.stay + sm.tail + tailEnd on units covering the whole main track (§4.5), except caption tracks and caption blocks, the
    camera, fullOnly, undecided and background units, neverPinned units (no sm key), and a video with audible sound or a
    coupling's time-varying referenced end (sm.stay alone)
  sm.stay on non-main units that neverPinned does not exclude and that are not tail or slot members, whose adoption-preview
    host is null (before 0, in a gap, isLong, or the sound rule); + sm.tail when such a unit ends at the track end (± eps)
  sm.stay on lyric-shaped runs of texts over a stay-put sound (§4.1)
  sm.stay on a caption track only under §3.5's voice-over exception
  sm.twin on unflagged exact sound matches of a main clip (§4.6, kind (b))
  nothing else: no moves, no reordering of the stack
  returns the list of paths it wrote (P/sm/adopted, P/sm/v, and every sm/main, sm/stay, sm/tail, sm/twin set or removed)
```

From then on membership is stable: a Full user adding a full-frame clip does not silently join the main track; it shows as an
overlay with a one-tap **Put in the clip row**. **Solo**, undo right after the adopting edit removes the edit, the flags and
`project.sm.adopted` together. **Once anyone else has changed the project since, adoption is never undone by per-person undo**,
in a session and after it: the runner (and `setMembership`, and `preSessionStep` from `seedPreSession`'s metas) passes
`adopt()`'s paths as `meta.adopt` to `FM.history.commit`; `closeStep` stores them on the step. The session keeps a counter
`S.othersSeq`, bumped in `applyIncoming` (`js/collab-session.js:490`) for every applied op whose `by` is not `S.mid`;
`closeStep` (`:1103`) stamps `st.seq = S.othersSeq` and `preSessionStep` (`:1114`) stamps `seq = 0`. `runStep`
(`js/collab-session.js:1140`) drops every op whose path is in `st.adopt` **when `S.othersSeq > st.seq`, whether or not
`S.active`**, so the rule also holds during the Stop-sharing handover, while undo is still handed to the stopped session
(`js/collab-core.js:249`, `:266`, `:354-357`; `runStep` runs with `over = !S.active`, `:1195`). What matters is whether anyone
else wrote after the step, not who was present when it was recorded (an adopting step recorded before Sam joined, or a
pre-session step, is covered too). When nobody else wrote, the adopting step undoes whole, as solo. The edit the adoption rode on still undoes, and the line adds *"· the
main track stays as set up"*. `meta.adopt` is not copied onto the pushed redo step (redo would find adoption already in place).
Keeping it is safe: adoption moves nothing and the flags match the derived set at that moment. Without this, Ezra's ⌘Z after Sam
had made an overlay a main clip un-adopted the project on every device, demoted Sam's clip back to an overlay, and the next
arranging edit's "remove any stray `sm.main`" erased Sam's flag for good (`runStep` checks each path on its own, `:1140-1160`).

**No banner and no button** (M's zero-step reading beat U's "Make one from my clips" for a first-timer, ezra-fit §4). If the
classifier gets it wrong, **Make overlay** / **Put in the clip row** fix it in one tap.

**Reframing a clip adopts.** In Simple on an un-adopted project, a canvas drag, pinch or rotate, or a Crop Done, on a derived
main clip also adopts in the same undo step (through the runner, as the transition picker does, §3.6), only when adopting is
not gated; while others can edit in a live session it stays a plain look edit, and §5.2's widened `fillsFrame` keeps the clip in
the row. (Before, reframing or cropping a clip on a never-adopted project re-derived it out of the clip row with a gap chip under
an edit that only changed its look.)

### 5.4 What Simple shows that it did not make

| Found | Shown as | One-tap fix |
|---|---|---|
| A gap between main clips | a dark striped block with its length, `1.2s gap` (a gap narrower than its chip draws only the chip, §8.2) | **Close gap** |
| A gap before the first clip | the same block at 0:00 | **Close gap** |
| A slot (a card or anything else fills the gap, §3.1) | its contents, drawn in the main row | **Put in the clip row** (never Close gap; Close all gaps skips it) |
| A covered gap (a background shows through it, §3.1) | the background, drawn behind; no chip | none (never packed) |
| A hand-made crossfade (blend, §3.1) | the two clips overlapping, no chip | none needed; Phase 6: **Turn into a transition** |
| An overlap | a red notch at the cut with a ⚠ glyph (not colour alone) | **Fix** (slides the rest right) |
| A mixed group | a group notch (§5.2) | **Open in Full** |
| A wrapper block not yet editable (Phase 1) | its clips read-only in the main row, *"This video is one group with its own look · Open in Full"* | **Open in Full** |
| A main clip above a `mixed` overlay it overlaps, or above a `front` one after a Full edit (never for a `behind` item, §3.6.1) | a small ⚠ on the clip | **Put behind** |
| A first clip with a negative start (allowed today, `js/timeline.js:4109-4110`) | drawn cut off at 0 | **Fix** (shift the track to 0) |
| A clip whose media is still arriving (undecided) | a loading look, in place | — (arranging over it waits) |
| A clip whose footage is gone (missing, §5.2) | the offline look in place, a **No footage** badge; for solo users a *"No footage ›"* segment in the tray row's nothing-selected line (§8.2), which opens the first one's tray | **Replace…** |
| Several clips stacked at one start by a multi-file pick in Full (an import stack, §5.2) | one stack entry in the clip row with an overlap chip, *"4 clips are stacked at 0:00 · Lay them end to end"* | **Lay them end to end**: one arranging step that packs them from the stack's start in pick order (by `taken` when every member has one), ripples what follows by Σlen − max len, and adopts |
| A stored main clip that draws no picture (`mainNoPicture`) | drawn in the Sound section | **Put in the clip row** is not offered; **Make overlay** clears the flag |
| An item hidden in Full (`visible === false`) | dimmed, with an eye badge; selected, the tray's first line reads *"Hidden · Show"* (*"Hidden with its group · Open in Full"* when only its group is hidden, `FM.groupHidden`) | **Show** (one small non-arranging command: sets `visible = true`, one undo step; `roNow` still refuses a Viewer) |
| An item locked in Full | Full's padlock (`js/timeline.js:1358-1371`); selected, the tray line *"Locked · Unlock"* (*"Locked by Sam · Unlock"* in a session, reusing §3.11's `whoChanged`) | **Unlock** (sets `locked = false`, one undo step, as Full's toggle, `js/app.js:5180`; D7's Do it anyway still re-locks, an explicit Unlock is the lasting choice). Both lines live in the tray, not on the 13 px badge, so they meet T19's 32×32 rule; tapping the badge selects the item |
| A muted main clip | a speaker-off badge (never the eye, which means hidden) | cleared from **Volume** |
| Nothing qualifies as main, but the project has layers | a **normal-height** main row reading "+ Add clips" (tap = Append, §3.6); the playhead stays; other sections draw as usual | — |
| The project has no layers at all | the big empty state (§7.3) | — |
| Clips being added (the first pick draining, §7.3) | the full-width main track in its loading look, *"Adding 4 clips… (1 of 4)"*, not tappable, `aria-busy` | — |
| The video runs past the last clip (something else is longer) | a hatched band on the main row naming what overruns, e.g. *"Text “Hello” runs 3 s past the end"* (*"Black: 2.4s (2 things run past the end)"* for several) | **End with the video**: fits **every** overrunning layer `autoFitDuration` counts in one step, not only units (Stay-put and follower items through `setUnitSpan`, §3.3: media through `FM.trimClipEdge` tail, so a reversed video keeps its footage; end = `trackEnd`, floored at `MIN_LEN`, start never moved, keys re-timed by §4.5's `g`; a group row, empty group or bare null is named, *"Group ‘Titles’ runs 5 s past the end"*, and fitted as §2.5 / §4.5 do). "Runs past the end" means past `trackEnd + 1e-9`, so a 1-ulp overrun is never drawn as black; a tail item that starts at or after `trackEnd` cannot be fitted, so the band offers **Keep as end card** (writes nothing) or **Delete** |
| Solo on any layer | a *"Solo on ›"* segment in the tray row's nothing-selected line (§8.2), which reads *"Solo is on · Turn off"* (solo blanks every other layer, `js/compositor.js:16114`, `:16168`) | **Turn off** |

**Nothing is ever tidied automatically.** Opening and switching write nothing; a gap a Full user left is theirs.

---

## 6. The switch

### 6.1 Where it goes (decision D2, pictured and measured at 380 and 440 px before he picks)

**Not on the stage.** Its top-left holds the collab people chip on both layouts, and on the phone the LIVE pill and the
comments bubble sit right beside it (§0.3 row 13 [checked]). Its right edge holds the view rails. The phone top bar is full
(queue 139, ui §7).

**The play bar is the place, and 5 + 4 was measured: it does not fit at the play bar's 34 px buttons.** `#transport` is a
symmetric grid, `minmax(0,1fr) auto minmax(0,1fr)` (`styles.css:2488`); `.tbtn` is `min-width: 34px` (`:2865-2867`); the side
columns have `padding-right: 10px` (`:2576-2577`); the phone row pads 4px 12px (`:3950`); the 31 px and 28 px tiers apply only
at ≤ 360 and ≤ 340 px (`:2590-2603`). **Measured in the Browser pane on the working tree:** the time pill is 72.4 px showing
*"00:00:00"*; each side column is 141.8 px at 380 and 171.8 px at 440. Five buttons at 34 px need 180 and fit nowhere up to
440. Five at 31 px need 165, which fits only from ~427 px wide (2 × 165 + 72.4 + 24), so at 430 and 440 but not at 412 or 380.
Five at 28 px need 150 and do not fit at 380. So putting ⇄ in Full's row means taking a slot from an existing control, or
shrinking every play-bar button (option D2-C, below). (Today's four-button right group already overflows its column at 380 by
~4 px, into the row's padding, so T12's overflow clause is restated in §14.6.) **Simple's time pill is Full's `#time-readout`
unchanged** (*"00:00:00"*, no total): a current / total pill would be about twice as wide and undo every number above, so it
would go on the D2 sheet with its measured width first.

- **In Simple (phone):** **⋯ · ✂ · ⇄ · |◀** on the left. ⋯ stays in slot 1 in both editors, the queue 851 twin of ⛶ at the far
  end (`index.html:528-531`: "one pop-up opener at each end"), and ⇄ takes slot 3. So a thumb never meets the switch where it
  learned something else (`index.html:379-382`). Slot 2 is ⧉ in Full and ✂ in Simple: a mistaken ✂ is one undo, and it is
  refused within `MIN_LEN` of a clip edge (Full's own split, `#btn-split`, is hidden in `#transport-extra` on the phone,
  `index.html:576`, so there is no learned ✂ slot to conflict with). **✂ is in slot 2 from Phase 1**, dimmed and inert until
  Phase 2 (§15.1), so no control ever changes slot between phases (a Phase 1 row of ⋯ · ⇄ · |◀ taught ⇄ in slot 2, where
  Phase 2's ✂ then splits the clip). Simple's ⋯ holds **Close all gaps** (shown only when there
  is a gap, overlap or negative start it would fix) · **Sort by date taken** (shown only when two main clips carry a date) ·
  **Loop · Preview speed**. Mute clip sound has one home, the 🔈 on the main row (§8.2). ✂ is Split's one home (§8.5).
- **In Full (phone), D2 picks between:** **D2-A** ⇄ in slot 3 as well (⋯ · ⧉ · ⇄ · |◀), with the ◐ Add-row switch (queue 373)
  moving into ⋯ as a Top/Bottom row that shows its side as text, because the proportional knob position (`index.html:537-544`,
  the knob IS `FM.addAt / layers.length`) cannot be shown in a menu; or **D2-B** (recommended) Full's row untouched and ⇄ as the
  first item inside Full's ⋯, one extra tap, his control kept; or **D2-C**, on screens ≥ ~427 px wide, Full shows
  ⋯ · ⧉ · ⇄ · ◐ · |◀ with every play-bar button at 31 px and narrower phones fall back to D2-B. D2-C undoes a guarantee: the 31 px
  tier is gated at ≤ 360 on purpose (*"Gated at 360 so his own 440 phone and the common 375/390 are untouched"*,
  `styles.css:2590-2592`, quoting him: *"I don't want it to change apart from where I've specified"*), and his row would
  differ between phones; V12 draws it at 440 beside D2-B. Or **D2-D**: no switch on Full's play bar at all, only the cog's Editor
  row and Home's ⋯ (the back-to-Simple button still appears after a hop, as under D2-B). Either way the Simple row is the same.
- **Under D2-B (and D2-D) the way back from Full on the phone is always one visible tap** (⇄ sits beside ✂ in Simple, so a mis-tap into Full
  is likely, and Simple is meant to become the fresh-install default): (1) the first arrival in Full from Simple on a device,
  and every hop, shows a **non-interactive** `FM.toast(msg, 3000)` with no `onTap`, *"Full editor · the ‹ button on the play bar
  takes you back"*, which passes taps through (`#toast:not(.toast-tap){pointer-events: none}`, `styles.css:11045`) and never
  stays up (a tap pill sits at `bottom: 244px`, z 60, over the hop's inspector sheet at z 55, `styles.css:3838-3844`, `:3448`,
  so a stray tap mid-edit went back to Simple, and any of Full's other toasts replaced it anyway, §3.12 rule 6); (2) while
  `fm.editor.hop` is set, or while this tab arrived in Full from Simple for this project and has not left, **slot 3 shows an
  icon-only back button in place of ◐**: a 34 px `.tbtn` with the Simple glyph (D16) and a small ‹ chevron, a 2 px accent ring
  so it reads as temporary, `aria-label` and `title` *"Back to Simple editor"*. A text button could not fit: *"‹ Simple"*
  measures 44-46 px of text before padding, `.tbtn` has `font-size: 0` (`styles.css:2865-2867`, so plain text would not even
  show), and the row is already edge to edge at 380 (`:2963`). As a `.tbtn` it shrinks with the 31 and 28 px tiers. ◐ comes back
  the moment he returns, switches again or leaves the project, so his row changes only during a visit that started in Simple;
  (3) ⋯'s first row reads **Simple editor** with the Simple glyph. Under D2-A and D2-C, ⇄ keeps its icon and gains the same ‹
  chevron and accent ring during the visit; on PC, in `#t-home`, a text label *"‹ Simple"* may stay, because there is room.
- **On PC** it sits in `#t-home` after `‹` (`js/app.js:7594-7596`), using the recorded-origin mechanism so `pcTransportLayout`'s
  teardown puts it back (`js/app.js:7562` [checked]). ⋯ stays where Full puts it on PC, just inside ⛶ (queue 851,
  `js/app.js:7658`), so the PC left group is **‹ ✂ ⇄ |◀**: ✂ always comes before ⇄, on both layouts. This constraint is
  phone-only. The slot-by-slot table (Full and Simple; phone D2-A, phone D2-B and PC) goes on the V12 chrome check and the D2 sheet,
  so he sees the ⧉ → ✂ change before he picks. **The Simple row's order is D18**: ⋯ · ✂ · ⇄ · |◀ (recommended: ⇄ in slot 3
  in both editors, where D2-B's back button also sits) or ⋯ · ⇄ · ✂ · |◀ (⇄ where Full has ⧉). This section is written for the
  recommended order.

Also reachable from the cog's canvas dialog ("Editor: Simple · Full"), Home's ⋯ menu ("Open in Simple / Open in Full"), and
**E** on a keyboard (ignored while focus is in an editable target, the existing guard in the window keydown handler,
`js/app.js:8585ff`, so typing an e never switches).

The button's icon shows the editor you are **in** (a row of clips for Simple, stacked bars for Full; the glyph is D16), and
its `aria-label` and `title` name the **action**: *"Switch to Full editor"* / *"Switch to Simple editor"*. Tap switches.
Long-press or right-click opens a two-line menu that says what each one is. First-run help names the real way back, in each
direction, once per device: arriving in Full from Simple, the non-interactive toast above; arriving in Simple from Full, *"Simple
editor. The same button takes you back."* (no "⇄" in the words: the button shows the editor you are in, not ⇄).
**While the Settings preview switch is off** (Phases 1-2), every entry point is hidden: ⇄, E, the cog's Editor row and Home
⋯'s Open in Simple / Open in Full (§15.1).

### 6.2 What it does
- `FM.editor.set(mode)` (a **deliberate** switch: ⇄, the cog's Editor row, Home's ⋯, E): sets `body.ed-simple`, writes the
  index card's `editor`, re-renders the timeline panel and the inspector, sends presence `ed`. **No document write, no commit,
  no autosave, no collab op.** `FM.editor.apply(mode)` does the same **without** writing memory, and is what opening a project
  uses (§7.2). A **hop** (Open in Full from an item or a chip, §9.2) uses `apply` and sets the per-tab `fm.editor.hop` flag
  instead; while it is set, the **back-to-Simple** button shows (slot 3 on the phone under D2-B and D2-D; on ⇄ itself under D2-A and D2-C and on PC, §6.1),
  cleared when he uses it, switches deliberately or leaves the project. So one look at an item in Full does not change how the
  project opens next time.
- **Kept across the switch:** `FM.time`, playing or paused (playback keeps playing through the animation), the selection (one
  item or several, §8.5b; a member of a block maps to its block and back), undo and redo, time zoom and scroll (both editors
  share `pxPerSec` and the fixed centre line `#tl-centerline`, `index.html:609`), any collab session. **Focus** survives:
  `set()` records `document.activeElement`'s layer id or control role before the re-render and focuses the matching element
  in the new timeline, or ⇄ if there is none; never `<body>`.
- **Closed first:** the text editor is flushed so the typing is its own undo step; exclusive tools (mask, crop, points, graph
  editor) close, which releases their leases; Edit Group is exited; `#add-sheet` and Full's docked inspector sheet
  (`body.m-editing`) close. Simple's own tool sheet reopens only if a tool was open for the same single item.
- **Refused** (the button shakes once) only while (a) a timeline or canvas drag is live, read from app-owned flags set on the
  drag's pointerdown and cleared on pointerup / pointercancel (`FM.timeline.gestureLive()`, `FM.canvasGestureLive()`; not the
  suite seam `FM.timeline._dragState`), (b) an export is running (*"Wait for the export to finish"*), or (c) a Simple command is
  in flight (`FM.spine.running || FM.history.isMuted() || FM.jobDepth() > 0`, §3.7). Order: check (a)/(b)/(c) →
  flush the text editor → close exclusive tools → exit Edit Group → switch. **Not** `bridge.interacting()`
  (`js/collab-bridge.js:153-163`): that is the collab quiet window, true for 250 ms after every tap and key in a session
  (`C.LIMITS.QUIET`, `js/collab-core.js:46`; capture listeners at `js/collab-bridge.js:95-101`) and whenever the text editor or
  a tool is open, so it made the switch impossible in a live session and blocked exactly the cases this list flushes.
- **Target:** the new timeline's boxes are placed and moving within one frame of the tap; main-track thumbnails draw from
  `m.stripFrames` when cached, otherwise grey tiles that repaint when `FM.buildClipStrip` resolves (the `renderSlipGhost`
  pattern, `js/timeline.js:1036-1041`).

### 6.3 The animation (Phase 3; Phase 1 ships a 150 ms crossfade)

Because both editors share `pxPerSec`, the scroll mapping and the fixed centre line, **every clip keeps its x position and
width**. The morph is a FLIP animation keyed by layer id, and it is almost purely vertical (U §6.3):

```
FULL (one row per layer)                        SIMPLE (sections)
┌ Title          [▭▭ text ▭]               ┐    ┌ Text     [▭▭ text ▭]                  ┐
│ Overlay clip       [▒▒ pip ▒▒]           │ →  │ Overlay       [▒▒ pip ▒▒]             │
│ Clip 3                    [███ c3 ███]   │ ↘  │ [██ c1 ██][█ c2 █][███ c3 ███]  +     │  ← main clips drop into ONE row
│ Clip 2          [█ c2 █]                 │ ↘  │                                       │
│ Clip 1  [██ c1 ██]                       │ ↘  │ Sound [~~~~~~~ song ~~~~~~~~~~]        │
│ Song    [~~~~~~~ song ~~~~~~~~~~]        │    └                                       ┘
```

- 0–120 ms: row heads, keyframe dots and the Add row fade and shrink to the left edge.
- 0–320 ms: each clip box flies to its new place (`cubic-bezier(.2,.8,.2,1)`), keeping its colour (`clipColorOf`,
  `js/timeline.js:493`) so the eye can follow it; main clips round into one filmstrip.
- 180–320 ms: section labels and the `+` fade in; the Simple toolbar rises with his hinge (#612).
- Back to Full plays it in reverse. Reduced motion replaces every variant with a 120 ms crossfade.
- **Big projects:** (a) FLIP only boxes whose Full rect and Simple rect both intersect the timeline viewport; (b) a box that
  ends visible but whose Full row is scrolled away starts at the nearest viewport edge (y clamped, x unchanged) and fades in
  from 0; (c) a box visible at the start whose target is off-screen or in a folded section flies to that section's header line
  (or the edge) and fades out over the last 120 ms; (d) animate at most the boxes in the visible time range ± one screen (the
  set §14.5's rebuild draws) and snap the rest. Full's rows are 42 px, so in a 40-layer project on the phone most rows are
  off-screen.
- **With a selection on the phone.** Full's phone shows only the selected row when exactly one layer is selected
  (`body.m-editing`, `js/app.js:951`; `soloLayerId()`, `js/timeline.js:2838-2844`), so the other boxes have no Full target.
  Simple→Full with one item selected: the selected box flies to its solo row (x and width kept); the other boxes fade out in
  place over 0-200 ms without flying; the docked inspector sheet hinges up only after the 320 ms morph has settled. Full solo →
  Simple: `m-editing` is cleared before the morph is measured, the sheet drops first (0-120 ms), the other boxes fade in at their
  Simple rects while the selected one flies from its solo row. The fold and slide variants follow the same order. With several
  selected, or nothing selected, Full shows every row and nothing changes.
- **The stage height moves with it.** Simple's `--stage-h` clamp (§8.2) differs from Full's 40svh on small viewports (at
  375×553 it is 180 px against ~221 px) and the tray and tools rows appear or go, so `#app`'s `--stage-h` change transitions on
  the same 320 ms curve (by `grid-template-rows`, or by holding the old height and moving it in the FLIP's last frame). The
  FLIP's "Last" rects are measured after the new height and rows are in place, so boxes land where they will stay. Reduced
  motion and the Phase 1 crossfade switch the height instantly under the fade. (On his 440×956 PWA the clamp resolves to 40svh,
  so nothing moves there.)
- **All three are built, per his standing #974 answer** (*"make them all happen in the app but it's just random which one"*,
  REQUESTS.md:34016, applied the same way at :33197, :33430, :33687): **morph**, **fold** (the timeline hinges shut and opens as
  the other one) and **slide**, one picked at random per switch through `FM.variant("editorSwitch", ["morph","fold","slide"])`
  and logged to `fm.variantLog`. D11 only asks whether to keep the random pool until he names a keeper (recommended, his #974
  rule) or to pick one now from V1.
  Phase 1's 150 ms crossfade is a placeholder, not a pool member.

---

## 7. How a project starts

### 7.1 New project (`#hm-dialog`, `index.html:711-767`; `createFromDialog`, `js/home.js:2893`)

```
┌ New project ──────────────────────────────┐
│ ┌──────────────────┐ ┌──────────────────┐ │
│ │ ▭▭▭▭   Simple    │ │ ≡    Full        │ │   drawn icons, one line each (#294)
│ │ Clips one after  │ │ Layers anywhere, │ │
│ │ another          │ │ every option     │ │
│ └──────────────────┘ └──────────────────┘ │
│ Name          [ Beach day            ]    │
│ Aspect ratio  [9:16] 16:9  1:1  4:5 …     │   already here; sets the canvas FIRST (CapCut's "set the ratio
│ …                                         │   first" trap, capcut §13.9, cannot happen)
│                        [ Cancel ] [Create]│
```

- `FM.projects.create(opts)` (`js/storage.js:2540`) takes `opts.editor` and writes `project.sm = {v:1, home}` plus the index
  card's `editor`, the way it already copies `sizePicked` and `templateDraft` (`:2554-2595`). `useAsNew` and `importObject`
  pass `editor: pack.project.sm && pack.project.sm.home` (and the backup / `.fmotion.json` equivalent) into it.
- **Default (D3).** The cards ship in Phase 3, the same release that removes the preview (§14.2's `#hm-dialog` row, §15), so
  there is no "while a preview" window, and a missing `fm.editor.new` is true on every existing device, his own included.
  **A fresh install** therefore means `fm.editor.new` is absent **and** the project index `fm.projects` (`js/storage.js:14`) is
  empty or missing. On the first boot of the Phase 3 release, if `fm.editor.new` is absent and `fm.projects` lists at least one
  project, it writes `fm.editor.new = 'full'` once (a one-time migration stamped `fm.editor.newMig = 1`, so a later empty index
  does not flip it). Only a device that has never had a project pre-selects Simple; after that, every Create writes the picked
  card to `fm.editor.new`. So his + New project keeps opening on Full (his daily flow, buildability §5.3), and the ten
  dialog-driven tests in `tests/tests.js` seed `fm.editor.new = 'full'` in their setup (or the harness does).
- **With Simple picked**, the dialog shows the two cards, Name and Aspect ratio. Resolution, Frame rate, Background and Canvas
  size fold into one closed row that reads its current values, e.g. `More · 1080p · 30 fps · Black ›`; tapping it opens the
  same controls as today. The values still come from and save to `fm.newproj` exactly as today (`js/home.js:2860`, `:2897`),
  and the summary line keeps an inherited non-default visible (a shared device could otherwise hand a beginner 4K / 120 fps /
  green screen invisibly). Picking Full shows every field as now. `.hm-dlg-card` already caps at `min(88vh, 88dvh)` with only
  `.hm-dlg-scroll` scrolling (`styles.css:5440`, `:5455`), so Create stays on screen.
- **Full → Create** is exactly today's flow.

### 7.2 Which editor a project opens in
One function, `FM.editor.homeFor(card, project) = !state.simpleEditor ? 'full' : (card.editor || project.sm.home || 'full')`
while the preview switch exists (afterwards the first term goes; any `home` other than `'simple'` reads as `'full'`, §2.3), so
every old project opens in Full and nothing changes for work he already has; used by both the Home chip and the open, applied
with `FM.editor.apply` (no memory write). With the preview off, a project he had switched to Simple therefore opens in Full and
its chip reads Full, while the card's `editor` and `project.sm.home` are kept for when the preview comes back. Template use-as-new, import and backup restore call `this.open(id)` **before** `_adopt` / `applyScene`
replace the document (`js/storage.js:2594`, `:3167-3205`, `:1984-1995`), so `FM.editor.chooseFor(project)` runs once more at
the end of `_adopt` and `applyScene`; otherwise those projects opened in Full, and a memory write would have pinned it. The
last deliberate switch in any tab wins for the next open (localStorage is shared across tabs; the old "each tab reads its own
memory" was wrong).

### 7.3 The first ten seconds for someone who has never edited (visualizer V2 draws this at 380 px)

```
1. Home → New project → the Simple card → Create
2. The Create tap calls pickFiles(ACCEPT_ALL) SYNCHRONOUSLY, as its first statement, before any await, when nothing needs
   asking first (switchAsked() false, js/home.js:1346, and FM.storage.flushSync() succeeds). The chosen files go into a
   pending buffer (FM._pendingSimplePick), which drains into the main track (Append) once FM.projects.create resolves and
   the editor is open. If create returns false (Stay, or no room) the buffer is dropped and a toast says the clips were not
   added. If a question must be asked first, or the picker's `cancel` event fires, there is no auto-open.
   While the buffer drains, the empty state is NOT a button: the same full-width main track in its loading look reads
   "Adding 4 clips… (1 of 4)", with the tap disabled and aria-busy set, so the big "+ Add clips" cannot invite a second pick.
   The drain records pid = FM.startedIn() once the new project is open (after FM.projects.create resolves), never at pick
   time (the pick happens while the OLD project is open), and loads each file in pick order with the existing per-file
   loaders (FM.loadVideoFile / loadImageFile), running the same FM.stillIn(pid) checks handleFiles does (js/app.js:5466-5480):
   if he leaves the project mid-drain, the loaded records are let go with FM.letGoMedia and the existing 915.5B "not added"
   line shows; nothing lands in whatever project is open by then. Never addMediaLayer per file (that commits and saves per
   layer, js/app.js:3048-3051). While it loads, the row may show one DOM-only placeholder box per picked file, widened as
   that file's length arrives (loadedmetadata), with the counter advancing: never a scene, history or wire write (§3.8's
   pattern). Then it commits ONE Append plan with every loaded length: one history step, one Undo ("Added 4 clips"),
   playhead at 0.
   "Empty main track" is decided against the scene as it was when the drain STARTED: anything added while the clips load (a
   Text tap, a sticker, a sound; tool taps run at once then, because the runner is not yet running) does not trigger the
   "Behind everything / After what's here" ask, and the clips land from 0:00 in the main band below those items.
   Records that draw no picture (kind audio, or a loaded video whose record has width 0, the §2.2 audioOnly case) never go
   into the Append (ACCEPT_ALL is 'video/*,image/*,audio/*', js/addmenu.js:44, so a song can be picked here, and it used to
   hold a place in the T sequence without being main: a multi-minute gap on the clip row). Each becomes a Sound → Music add
   (§4.5) in the SAME plan (one step, one Undo): the first song starts at the first appended clip's start (T0 = R.trackEnd
   before the Append, 0:00 in a new project; the insert seam for After Clip N), further songs end to end, never stacked;
   after the Append sets the new track end each gets sm.stay + sm.tail + tailEnd, is trimmed to end there (never below
   MIN_LEN) and gets fadeOut = min(2, duration/4); a song starting at or after the new end is left whole and unflagged. With
   no picture records at all, the songs are added as §4.5 says for an empty track and the "+ Add clips" row stays. The label
   and line name both kinds ("Added 4 clips and 1 song"), and the loading row counts every file ("Adding 5 files… (1 of 5)").
   A file that fails is left out and one line names it ("1 clip could not be opened"); if every file fails, the normal empty
   state returns. If the one plan is refused for any reason (the gate shut during the load, busy, wait, locked, big), every
   loaded record is released with FM.letGoMedia before the line shows, and the line counts them ("4 clips not added · …" +
   the refusal's own buttons): nothing leaks until reload and no step or tx is made. The Clips tool's Add clips drains the
   same way (addMediaLayer gains {main, at, noCommit}, §14.2).
3. They land on the main track end to end from 0:00 (Append), the first frame showing, the playhead at 0.
4. One hint line in the tray row (§8.2), gone on the first tap anywhere, in the tray's own words and naming the one place
   Split lives:
   phone: "Tap a clip to change its speed or look · ✂ splits it at the line"
   PC:    "Click a clip to change its speed or look · ✂ or S splits it at the line"
   (picked by the same pointer test Full already uses for phone vs PC layout). While it shows, the play bar's ✂ gets one
   soft highlight (one cycle of the existing selection outline, no new animation style), ending when the hint is dismissed.
5. He taps clip 2 → the clip tray's row fills → Speed / Volume / Look / … / 🗑.
```

- **Why the picker is called inside the tap:** `createFromDialog` (`js/home.js:2893-2907`) awaits `leaveOk()` and
  `FM.projects.create` (IndexedDB) before handing over, and `pickFiles` is a bare `fi.click()` (`js/addmenu.js:58-67`). WebKit
  honours that only inside a live user gesture (the repo already knows: `js/ask.js:151`, `js/audio-health.js:113`), and the
  gesture does not survive those awaits, while desktop Chrome allows ~5 s. So a picker opened after Create would pass the suite
  and silently not open on his iPhone. Calling the normal change handler before the project exists would import into the old
  project; the buffer avoids that.
- **The hint** shows only when at least one main clip exists, at most once per device (`fm.sm.hint = 1` when dismissed), never
  in a project opened from a template or from Full.
- **Order:** a browser picker does not reliably report tap order (capcut §2.1). Clips land in the order the browser hands
  them over; the play bar's ⋯ has **Sort by date taken** (§3.6; shown only when at least two main clips carry `taken`);
  hold-and-drag reorders. **The capture date is stored as the plain layer field `taken`** (§2.2), written at add and at
  Replace, only for files the user picked. Its sources, always tried first on every platform, no library: **(1) video**
  (mp4 / mov / m4v): a first-~128 KB read cannot find `mvhd` in a moov-last file, which is exactly what an iOS recording and
  FreeMotion's own exports are (`js/media.js:352-354`; `fastStart: false`, `js/exporter.js:84`), so it reuses the top-level box
  walk in `FM.soundTrackInFile` (`js/media.js`, after `:857`), factored into one shared helper `FM.isoBoxes`: walk 16-byte box
  headers with `Blob.slice` until `moov` (handling `size == 1` largesize and `size == 0`, capped at 64 boxes), then read only
  `moov`; prefer `moov/meta` or `udta` `com.apple.quicktime.creationdate` (where iOS keeps the capture moment after a
  transcode), else `mvhd` `creation_time` (v0: u32 at +12, v1: u64 at +16; seconds since 1904, skipping 0 and the 1904 epoch).
  **(2) images:** JPEG APP1 Exif `DateTimeOriginal` (0x9003) with `OffsetTimeOriginal` when present, within the first 128 KB.
  HEIC / HEIF keep Exif as an item in the ISOBMFF `meta` box, not in APP1, so they are out of scope unless a `meta` / `iinf` /
  `iloc` Exif-item lookup is added through the same helper (iOS usually converts `image/*` picks to JPEG; a desktop HEIC falls to
  the fallback). **(3)** `File.lastModified` as the fallback. **One trust rule for every source:** a date counts only when it is
  more than 60 s before the import moment and satisfies 0 < n ≤ now + 1 day, so neither a transcode-time `mvhd` (iOS may
  transcode a video on pick) nor a pick-time `lastModified` is ever stored as `taken`. Q17(c) is now a device check of which
  source each kind of file yields, not a decision. Sort reads only `layer.taken`, never the media record, so a
  guest sees the same dates through the synced layer and an imported `.fmotion.json` (whose rebuilt `File`s are stamped with
  the load time, `js/storage.js:943`, `:975`) never sorts by load order. Copy routes keep it (duplicate, paste, split,
  template all carry it, like `srcW`). A track with fewer than two dated clips hides the entry rather than show a sort that
  does nothing.
- **Cancelled picker, or no auto-open:** the editor opens on the new project. **The big empty state shows only when the scene
  has no layers at all**, the same test as Full's (`!FM.scene.layers.length`, `js/timeline.js:2864`), applied from
  `FM.simpleTimeline.rebuild` on every draw: the main track **is** the button, full width, his moving colours (#398), playhead
  hidden (#354), "+ Add clips" (≤ 34 characters, `js/timeline.js:2795`); its own tap is a fresh gesture, so the picker opens.
  The moment any layer exists it drops to the normal-height row (§5.4), and the playhead shows.
- **Other easy doors:** "Insert your media" from a template (`js/template-fill.js:292`) opens in the template's
  `project.sm.home` and fills slots through Simple's Replace (§3.6); **Ask**, the Assistant (#856, `js/ai-chat.js`), is a
  project tool when a key is set, working through Simple's commands (§8.5a, D12).

### 7.4 Home
- **The card's first meta chip** shows the editor with the switch's icon: `▭▭▭ Simple · 9:16 · 1080p · 30fps · 12 clips`
  (Simple counts clips from the card's `clips`, which `touchCurrent`, `js/storage.js:2447-2465`, writes beside `layers` **only
  when the project is adopted or the tab is in Simple**, from the cached `FM.spine.read(FM.scene)`, never an uncached classify;
  otherwise it leaves `e.clips` as it was, so a Full-only project never pays for classifying on every save; the chip shows
  "N clips" only when `e.clips` is a number and "N layers" otherwise). Read from the index, so Home never opens the document (`projectCard`,
  `js/home.js:1351`, chips at `:1375-1379`).
- The card's ⋯ menu gets **Open in Simple** and **Open in Full**. Tapping the card opens it in the editor on the chip.

---

## 8. The Simple editor on phone and PC

### 8.1 Where it mounts
A sibling `<div id="sm-timeline">` beside `#timeline` inside `#timeline-panel` (`index.html:591`; ui §5 option A), shown by
`body.ed-simple`. `FM.timeline.rebuild()` (`js/timeline.js:5210`), `updatePlayhead()` (`:5355`) and `abortGestures(pred)`
(called from `FM.cancelGesturesOn`, §3.8) dispatch to `FM.simpleTimeline` while the class is on, so their ~90 callers need no
change. The stage, canvas handles, transport, centre line, text editor, effects/filter/audio browsers, export and canvas
dialog are shared, and so is **one filmstrip / waveform cache**: `FM.timeline.stripFor(layer, m, w, h, {pinch})`, backed by
Full's existing bounded `stripCache` (`js/timeline.js:546`, bound at `:2143-2144`, waveforms at `:2174-2175`; its comment at
`:2119-2121` names canvas re-allocation as the iOS memory problem), keyed `w|h|trimStart|duration|stripFrames.length|mediaRev`
with `w` capped at 8192 as at `:2135`, and the Map keyed by layer id plus height, so a clip at 32 px in Full and 56 px in Simple
is two entries at most. Both timelines share one bound (40 today; the Simple rebuild may raise it to cover the visible range ±
one screen, never above a fixed cap of about 60). During a pinch Simple reuses the cached strip at any width, as Full does.

### 8.2 Phone (≤ 700 px), drawn at 380 px

```
┌──────────────────────────────────────┐
│ ‹  Beach day        ?  ✎  ⚙  Export  │  #topbar-m, unchanged; ✎ only when nothing is selected (#171, #968)
├──────────────────────────────────────┤
│ (●Sam)(LIVE)                      ▐▌ │  the collab chips stay where they are
│      CANVAS  (clamped, see budget)   │  drag / pinch / rotate the selected item (js/canvas-edit.js)
├──────────────────────────────────────┤
│ ⋯  ✂  ⇄  |◀     00:00:03    ▶| ↶ ↷ ⛶ │  play bar: 4 + 4 (§6.1); the pill is Full's #time-readout
├──────────────────────────────────────┤
│ Cc Aa ▬▬ ▬ ▬▬  ▬▬▬     │             │  FOLDED BAND, one 32 px row: the folded sections' 32×32 openers
│ ◧+2        ▬▬▬         │             │    side by side, then one strip of their marks; the OPEN section
│ ▤ ░░░░░ background ░░░░│░░░░         │    below (32 px lanes, a count badge on its glyph); BEHIND last
│ 🔈[██ c1 ██][█ c2 █][███│ c3 ███] +  │  CLIP ROW: 56 px filmstrip (a twin = a thin strip along its bottom)
│ ♪ ~~~~~~~~~ song ~~~~~~│~~~~~~~      │  SOUND: one fixed 32 px row; lane 0 drawn, a count badge (§8.2)
│                        │ playhead    │
├──────────────────────────────────────┤
│ ⏩Speed 🔊Volume ⤒Lift off ◐Look ⬒Crop›🗑│  TRAY ROW, always there: the selection's tools, #sm-say's lines (§3.12), or
├──────────────────────────────────────┤     the hint, then a quiet "4 clips · 0:15" when nothing is selected
│ Clips Text Captions Sound Overlay Look-for-all Effects Ask │  PROJECT TOOLS: one row that never scrolls
└──────────────────────────────────────┘
```

- **Higher on screen = in front** (U): captions, text, overlays and effect segments above the clip row and sound below, in
  stacking order. The one stated exception is **Behind**: it is the sections box's lowest section, drawn hatched and labelled
  *"▤ Behind"* directly above the clip row, although its items draw under the clips (a Behind row of its own below the clips
  made the clip row's y depend on whether a friend or Full added a letterbox). CapCut draws overlays below the main row while they render on top (capcut §13.6); this fixes
  it, and the switch animation depends on it.
- **`#sm-timeline` is fixed rows, not one growing column:** ruler (18), a **sections box**, the clip row (56), sound (32):
  always exactly these four, whatever the project holds. All rows share one horizontal scroller; the clip row and sound are
  `position: sticky; bottom` (sound at `bottom: 0`, the clip row above it). **The sections box has a fixed height**: the
  timeline height minus 106 (ruler, clip row, sound): 64 px at the 170 px budget, the 32 px folded band plus one 32 px lane.
  Behind is a section inside it. Its content is bottom-aligned and scrolls vertically inside itself. So opening, closing or
  switching a section, and a behind item arriving or going, changes only what is inside that box, and **the clip row's y and the
  sound row's y are constants of the layout**, never depending on which section is open or what the project contains (opening a
  2- or 3-lane section above the clips used to push them down, the jump round 1 fixed for the tray).
- **Sections fold** on the phone (CapCut's one-open-category trick, capcut §2.7), but folded sections stay visible as
  labelled coloured lines, and selecting an item on the canvas opens its section by itself. Empty sections are not drawn.
  When a section opens, the box scrolls so the selected item is in view: the box's own `scrollTop` is set directly (never
  `scrollIntoView` on the whole timeline), and items carry `scroll-margin` equal to the ruler height (queue 409's lesson,
  `styles.css:2884-2887`, where `scrollIntoView` put a row under the sticky ruler). An open section shows at most 3 lanes; more
  are counted by a badge on the section's 32×32 glyph (*"Aa +2"*), and tapping the badge expands the section inside the box,
  scrolling vertically there (a separate +N row cost height the box did not have and could not be a 32 px target). **Which section is open:** (1) the section
  holding the current selection; (2) otherwise the one he opened last in this project (memory only, not saved); (3) otherwise,
  when a project opens, the first non-empty section above the clip row in stack order, or none. Clearing a selection never
  closes or switches the open section, so a deselect changes nothing on screen. On PC, sections scroll inside `--tl-h`.
- **The tray row is permanent on the phone.** With nothing selected it holds the first-run hint (§7.3), then one quiet line,
  the project's length and clip count (*"4 clips · 0:15"*) with 🗑 hidden and no tool buttons, followed by tappable segments for
  the project's **notices**, in this order: *"Solo on ›"*, *"No footage ›"*, *"More in Full ›"* (the camera and bare nulls, §9.1:
  with one such item it switches to Full with it selected; with two or more it opens a small list naming each with `itemWord`,
  each row switching to Full with that item selected), e.g. *"4 clips · 0:15 · Solo on ›"*. Each segment is at least 32×32; at
  `sm-tight-1` only the first shows, plus *"+1"*; with a selection, a dot badge on ⋯ lists them. They take no row and no chip of
  their own, so they never move the clip row (a chip "above the timeline" had no room at 375×553, where the stage is pinned at
  its minimum) (Add clips lives on the clip
  row's `+` and in the Clips tool; Close all gaps in ⋯; one home per control, §8.5). It also shows `#sm-say`'s lines (§3.12).
  Selecting only swaps its contents. So no row appears, disappears or moves under his thumb, and 🗑 stays in one place (a tray
  that rose on select made the timeline jump on every tap).
- **The phone's ✎ (notes) hides while anything is selected**, his #171 rule (`index.html:379-383`), which Full enforces only
  through `m-editing` / `sel-mode` (`styles.css:4028`, `:4048`), classes Simple does not set. In Simple
  `syncSelectionChrome` toggles `sm-has-sel` (n ≥ 1) as the one writer, and `body.ed-simple.sm-has-sel #m-notes { visibility:
  hidden; }`. **Visibility, not display:** the bar runs ‹ name ? ✎ ⚙ Export (`index.html:338-395`), so `display: none` would
  slide ? one slot on every tap, and nothing on this bar may move under the thumb. ?, ⚙ and Export stay.
- **Height budget, in real numbers from the code, against the small viewport (not the screen):** top bar
  `52 + env(safe-area-inset-top)` (`styles.css:4330`, not 44), play bar 40, tray 52, tools `56 + env(safe-area-inset-bottom)`
  (Full already pays the bottom inset, `styles.css:2883`): 200 fixed at zero insets. The Simple timeline needs 170 (clip row 56
  + sound 32 + ruler 18 + a folded band 32 + one open section of one 32 px lane). In Simple on the phone the stage becomes
  `--stage-h: clamp(180px, calc(100svh − <fixed rows> − 170px), 40svh)` instead of `40svh` (`styles.css:3838-3839`); it stays
  svh, so it does not jump when browser chrome hides (queue 429).

  | Viewport | Insets top/bottom | Timeline left with a 40svh stage | With the clamp |
  |---|---|---|---|
  | Safari tab, SE size, 375×553 svh (**estimate**, assuming the compact bottom Tab Bar; measure) | 0 / 0 | ~132 (no section can open) | **173** (stage pinned at 180; 173 − 138 = 35 → one lane, the rest on the glyph's badge) |
  | In-app browser (Instagram / Messenger, where an invite link can open), SE size, ~375×540 (**estimate**) | 0 / 0 | ~125 | ~160 (`sm-tight-1` on, `sm-tight-2` off; one lane) |
  | Installed PWA, 375×667 | 20 / 0 | ~180 | ~180 (one lane) |
  | His PWA, 440×956 | ~62 / 34 | ~278 | ~278 (three lanes) |

  **If it still does not fit**, the fallbacks switch on from the **viewport only, never from what is open**, so no row moves on
  select or on opening a section and there is no feedback loop: on load and on a debounced `resize` / `visualViewport` resize,
  compute `avail` = the small-viewport height (a `100svh` probe element) − top bar − play bar − tray 52 − tools − both insets −
  180 (the stage minimum), from constants and the insets, not by measuring `#sm-timeline`. **Fallback 1 is always on**, inside
  `#sm-timeline`'s own scroll box: lanes shown = `max(0, min(3, floor((timeline height − 138) / 32)))` (138 = ruler 18 + clip
  row 56 + sound 32 + folded band 32); with 0 lanes the open section is glyph-only with its count badge. `body.sm-tight-1` when `avail < 170`: the tray drops to icons only **and** a 40 px row (saving 12 px; icons-only
  alone saves no height). `body.sm-tight-2` when `avail < 158`: the ruler folds into the clip row's top edge. So 375×553 (avail
  173) sets neither class and shows one lane; ~375×540 (avail ~160) sets `sm-tight-1`; 375×520 (avail 140) sets both; below
  that, both stay on, the open section may be glyph-only, and every tool is still reachable (T19's floor case at 375×480). No tool ever disappears. This is the invite-link case (a friend in a Safari
  tab, #967), not an edge.
- **Touch sizes** (T19 asserts them with `elementFromPoint`): **the folded band is one 32 px row.** At its left end (sticky,
  like the clip row's 🔈) the folded sections' openers sit **side by side**, 32×32 each, in stacking order (≤ 4 = 128 px), each
  carrying §8.10 item 5's name as `aria-label` / `title`; to their right the folded sections' item marks are drawn in one
  combined strip in their section colours (Captions above Text within it, ≤ 10 px each visually), and a tap on the strip opens
  the section of the item nearest by x (ties to the section higher in stacking order) and selects nothing (stacked vertically in
  the band, two or three folded lines were ~10-16 px targets and 32×32 glyphs could not fit); lane items are 30 px tall on a
  32 px pitch; the sound row is a real 32 px row (a hit box "extending 8 px down" from a row sticky at `bottom: 0` of a
  scroller is clipped, and cannot extend up into the clip row); every seam chip is ≥ 32×32, centred on the cut, over the clip row's top edge,
  at every zoom, and a gap narrower than its chip draws only the chip; the clip tray also offers **Close gap / Fix** when a
  clip next to a seam is selected. **Trim grips reuse Full's selected-clip pattern:** 13 px caps **outside** the clip edges
  (`styles.css:3017-3019`), each with a hit width ≥ 24 px, so a short clip still has two grabbable caps; a clip narrower than
  24 px on screen is trimmed from the tray's **Length** row (§8.5) or after a pinch, and the tray hint says so.
- **The sound row stays one fixed row** (32 px, its y never changes, whatever its lane count). It draws lane 0 of its packed
  lanes (§8.6: the longest item first, so a whole-video song wins) at full height; where more sounds overlap in time, a small
  count badge (*"2"*) sits on the row over that stretch, and with 3 or more lanes a sticky **+N** chip (≥ 32×32) at its right
  edge opens a list sheet of every sound, named per §8.9 (*"the song"*, *"Voice 1"*, *"Sound effect 2"*), each selectable. A tap
  at time t selects the sound under the finger when exactly one covers t; when two or more do, it opens a small chooser docked
  above the tray, one ≥ 44 px row per sound at t (name, kind glyph, length), and never guesses by y. The selected sound draws on
  top at full height until the selection clears, and its trim grips (≥ 24 px) work on that drawing. **Sync twins (§4.6) are not
  drawn in the Sound row:** each draws as a 6 px waveform band along the bottom of its clip's filmstrip (through the shared
  `stripFor` cache), because it belongs to the clip's unit and has exactly its span (Take sound out on a project with music
  always overlapped the song). A tap there selects the clip; when the clip has a twin, the Main clip tray's Volume and Fade act
  on the twin (the original is muted by `extractAudio`), and the tray adds **Put sound back** (delete the twin, un-mute `c`, one
  step). A drifted twin (§4.6) is drawn in the Sound row like any other sound, beside its *"Sound out of step · Line up"* line.
  Behind items are a section with lanes, so they need no chooser.
- **Gestures:** tap selects; hold 350 ms and drag reorders a main clip (neighbours part) or moves an item in time (the same
  hold timing as Full, `js/timeline.js:2190-2240`), gated when it arms (§3.8), with edge auto-scroll (§3.8); edge grips trim
  with a length readout and a live preview; pinch zooms; swipe scrubs under the fixed playhead. Dragging a main clip up into
  the overlay section past the threshold (§3.8) lifts it; dragging an overlay down onto the clip row drops it. Both are also
  buttons, and every drag has a button route (§8.10).
- **Hidden** items draw dimmed with an eye badge in their section and **locked** items carry Full's padlock; both clear in one
  tap from the tray (§5.4). Muted clips carry a speaker-off badge, not the eye.
- **Tool panels** open as a sheet that rises from the toolbar with the hinge motion and the comic tail pointing at its button
  (#612, #548), in his small/big two sizes (#927, #975). They are built from the inspector's existing category builders
  through `FM.inspector.openCategory` (`js/inspector.js:6818` [checked]), with the exceptions in §8.5.

### 8.3 PC (≥ 701 px): the same pieces in his Studio band

```
┌──────────────────────────────────────────────────────────────────────────────┐
│ (●Sam)(LIVE)                     CANVAS                                   ▐▌ │
├───────────────────────────────┬──────────────────────────────────────────────┤
│ ┌───────────────────────────┐ │ ‹ ✂ ⇄ |◀    00:00:03     ▶| ↶ ↷  v ? ✎ ⚙ [Share] ⇪ ⋯ ⛶│
│ │ the open tool's panel     │ │ Cc  ▭▭ ▭▭▭    ▭▭                               │
│ │ (e.g. Speed: 0.5× 1× 2× …)│ │ Aa   [▭ title ▭]                              │
│ └───────────────────────────┘ │ ◧         [▒▒ pip ▒▒]                          │
│ [⏩Speed][🔊][⤒][◐]…[🗑]        │ 🔈[██ c1 ██][█ c2 █][███ c3 ███]  +             │
│ Clips Text Captions Sound …   │ ♪ [~~~~~~~~~~ song ~~~~~~~~~~~~]               │
└───────────────────────────────┴──────────────────────────────────────────────┘
  #inspector-panel (left band)     #timeline-panel → #sm-timeline
```

- **Same pieces, same names, same order, same icons** as the phone (INBOX.md:28 "you don't have to learn both"), read the same
  way from the bottom: project tools at the bottom edge, the clip tray above them, the open tool's panel above that (the band
  order is drawn in V1; decided with the recommended option, §17). ⋯ stays where Full puts it on PC, just inside ⛶ (queue 851, `js/app.js:7658`);
  Simple keeps the same `pcTransportLayout` list, and `#btn-share` rides it whenever collab is on. All sections open when the
  band is tall enough (`--tl-h`, `styles.css:6275-6293`); otherwise they fold and scroll exactly as on the phone. A phone held
  sideways gets this layout, as today (ui §1).
- **PC band budget** (from `styles.css:6276-6290`, `:2461-2462`, `:7914`). `body{--insp-w: clamp(300px, 24vw, 400px)}` is set on
  `body`, so it beats the `:root` value at `:2463`; the band is grid row 2 at `--tl-h`; below 1160 px the extra 40 px go to
  `#t-far` in the timeline panel, not to this band; the band also keeps its `.panel-title` row (`#proj-name-s`,
  `index.html:488`) above `#inspector`.

  | Window | Band width (`--insp-w`) | Band height (`--tl-h`) | Left for a panel today (− title ~30, tray 52, tools 56) |
  |---|---|---|---|
  | 900×700 | 300 | 272 | ~134 |
  | 1280×800 | 307 | 240 | ~100 |
  | 1920×1080 | 400 | 300 | ~160 |
  | 844×390 (phone sideways) | 300 | 150-179 | ~10-40 |

  Eight slots across ~276 usable px is ~34 px each, below the ~43 px §8.5 needs for icon over label, so `tilefit` would drop PC
  to icons only while the phone keeps words, breaking "same names". So on PC in Simple: (1) the band's width floor rises so the
  phone's 8-slot row fits with labels, `body.ed-simple { --insp-w: clamp(372px, 26vw, 420px) }` (348 px plus padding; set on
  `body` like `:6278`, so `:root` cannot beat it; the stage gives up ~70 px at 900); (2) the title row's project-name field folds
  into the band's top edge as a phone-style name, so the height goes to tools; (3) **where tool panels open is D20**: A. inside
  the band, scrolling; B. rising over the bottom of the stage as the same hinge sheet the phone uses (#612, #548), anchored to
  the band's top edge with the tail pointing at its tool, so the band holds only tray + project tools (~108 px) and panel height
  stops depending on `--tl-h`; but it covers the lower-left of the picture, which the phone's sheet does not (on the phone the
  sheet rises from the toolbar under the timeline and covers the timeline, research/fm-ui.md:168), and for Look, Adjust and
  Filters that is the frame being judged; **C. rising over the timeline panel, as on the phone (recommended)**: the same hinge
  sheet rises from the band's top-right corner across `#timeline-panel`, below the transport row (so play, undo and the time
  readout stay usable), capped at min(560 px, the panel's width), tail pointing down-left at its tool. Height is `--tl-h`
  minus the transport row (~232 / ~200 / ~260 px at 900×700 / 1280×800 / 1920×1080, about twice A's room); the stage is never
  covered; the timeline is hidden while the panel is open, exactly as on the phone. B's one remaining advantage is a height
  independent of `--tl-h`. **For every option, the sideways case:** when the stage is under 200 px or the band would leave
  under 120 px for a panel (a phone sideways, 844×390, where the band leaves ~10-40 px, less than one control row), the panel
  opens as a sheet over `#timeline-panel` (the right side of the band row), as wide as that panel and as tall as the band plus
  the bottom of the stage, up to `100dvh` minus the top bar, with the same hinge and tail; the band keeps its tray and project
  tools with their labels (same names); nothing docks and scrolls in the band at any size. V4 draws A, B and C at 900×700,
  1280×800, 1920×1080 and 844×390 with Look, Speed and Captions open, with the stage's visible area in each.
- The playhead is the same fixed centre line as Full on PC (`styles.css:3203-3208`, universal since `js/timeline.js:11`).
  A mouse drag moves or reorders at once (§3.8).
- **Keys by editor** (Full's `clipKeyAction`, `js/timeline.js:201-214`, has an off-clip branch that moves or extends a clip to
  the playhead; a gap-free main track has no meaning for that):

  | Key | Simple, main clip, playhead inside it | Simple, playhead off the selected clip, or nothing selected | Simple, overlay / text / caption item | Full |
  |---|---|---|---|---|
  | **A** | ripple trim start; the playhead lands on the new first frame (§3.6.2), unlike Full's A | acts on the main clip under the playhead (selecting it first) | as Full, no ripple | today's |
  | **S** | split (§3.6) | split the main clip under the playhead | split the item | today's |
  | **D** | ripple trim end | the main clip under the playhead | as Full | today's |
  | past the track end | *"No clip at the playhead"* | | | |
  | **Delete** | delete and close up (the Simple delete, never `FM.deleteLayer` directly) | — | delete the item | today's |
  | **⌘D** | the Simple Duplicate (§3.6) | — | duplicate in place within its band | today's |
  | **⌘C / ⌘V** | copied main clips paste as an Insert at the cut nearest the playhead, keeping `sm.main` | — | paste at the playhead through `FM.spine.insertAt` at the item's band slot (§3.6.1), which restores `FM.addAt`, never at the hidden Add row's index (`js/app.js:4456-4470`) | today's |
  | **Tab / ⇧Tab** | with focus on the Timeline group, an item, `#stage` or `<body>`: walk the read model's visible items (main clips in order, then sections), skipping hidden items and block members; with focus on any other control, native focus order (§8.10 item 4a) | | | today's |
  | **←/→, ↑/↓, Enter** | move the selection between main clips / between sections; Enter opens the clip tray | | | today's |
  | **Alt+← / Alt+→** | **Move earlier / Move later** (the tray's buttons, §8.5): one slot through Reorder, focus stays on the moved clip | — | — | free today (no Alt binding in `js/timeline.js` or `js/app.js`) |
  | **M** | add or remove a benchmark at the playhead (`FM.toggleMarkerAtPlayhead`, no autorepeat), as Full | same | same | today's |

  **Space** play · **E** switch editor · ⌘Z / ⌘⇧Z · +/− zoom · frame step · Home/End · Esc. Full's 1–5 Add-tab keys, Shift+1-4,
  digits with a selection and Shift+Home/End do nothing in Simple; `[ ] \` stay because the loop region stays in ⋯; **M** keeps
  Full's benchmark behaviour, because benchmarks are a music feature and Simple is the editor for cutting to music.
- **Benchmarks in Simple.** `#tl-headtap` (`index.html:609`) sits in the shared `#tl-centerline` and stays: a tap adds or removes
  a benchmark and a hold pins the thumbnail. Simple's ruler draws `project.markers` (benchmark lines and the smaller `thumb` pin)
  at `host().timeToX(m.t)`, reusing Full's `.tl-marker` classes, and the timecode chip's on-mark yellow (`updateReadout`) keeps
  working; marks past `P.duration` are not drawn (a music-anchored mark left past the end by a ripple is simply off the end of
  the video). Simple's trim grips, item drags and Insert drop points snap to benchmarks within 7 screen px, as Full's `snapMove`
  / `snapEdge` do (`js/timeline.js:649`, `:671`); ripple commands keep §3.1's no-snap rule for the shift itself. Benchmarks
  still stay absolute by default (D19 A, recommended, §13 #24; option B, anchored to a clip, is specified there in case he picks it).
  Duplicate and paste of main clips are arranging commands, gated in a live session. The `#key-rail`
  (`index.html:491-495`, `syncKeyRail` `js/timeline.js:5306`) shows in Simple only when a main clip is selected and the playhead
  is inside it, with "ripple" in its tooltips. Files dropped on the main track insert at the cut under the pointer.

### 8.4 Fixing CapCut's traps

| CapCut trap (research) | Simple's answer |
|---|---|
| Tools vanish when a clip is selected; "tap an empty area … then look again" (capcut §0.5, §13.7) | Two rows: project tools never go away and never scroll (D10). Tapping Text always adds text at the playhead and starts typing, selected clip or not |
| "Edit" appears twice (capcut §5.1) | No button is called "Edit" (U) |
| Nothing is attached on mobile; overlays, text, captions drift (capcut §13.4) | Things follow their clip; captions follow cue by cue; the link line shows it (§4) |
| Stacking order is hidden (capcut §13.6) | Higher on screen = in front (§8.2) |
| Main ↔ overlay is a buried trick (capcut §13.5) | A button in the first screen of the tray each way (the first five tools), and a drag |
| Only one category open at a time | Kept on the phone, but folded sections stay visible and tappable; the PC shows all |
| An overlay lane cap of 6 | No cap; performance measured instead (§14.5) |

### 8.5 The tools

**One home per control** (his #310, widened by his-prefs §14): **for every selection state, no two controls visible at the
same time share a face label, a title or a command id**, checked by T20. (The old wording, "every label appears in one
place", was broken by the design as drawn: the tray's ⤒Overlay sat right above the project tools' Overlay and did something
else, a ripple lift instead of an add, and Look and Effects each had two homes on screen at once.) Split lives on the play bar's
✂, Canvas on ⚙, Mute the clip row on the clip row's 🔈, Close all gaps in ⋯, Take sound out in the main-clip tray, and Add
clips on the clip row's `+` (the empty-state row is that same control) and in the Clips tool (whose first entry opens the same
picker under the same label, next to its extras).

**Project tools** (nothing needs to be selected; the order is ours, not CapCut's). **One row that never scrolls**: at most 8
slots across 380 − 32 = 348 px (~43 px each, icon over a label ≤ 10 px), using `js/tilefit.js`'s rung (stack → icon only,
the name kept as the title), measured on the element's box at 380 and 440 (and on PC at the band width of §8.3). If 8 do not
fit at 380, the last slot becomes **More** and Ask stays visible ahead of it. **Canvas is not here**: ⚙ in the top bar already
opens `FM.openCanvasDialog` (`js/app.js:7026-7057`), so it has one home (#310).

| Tool | Opens | Built from |
|---|---|---|
| **Clips** | **Add clips**: always **Append** (§3.6) by default. The picker sheet shows a two-choice line only when the playhead is strictly inside the main track (`FM.time > R.main[0].start + R.eps` and `< R.trackEnd − R.eps`): **At the end** (preselected) / **After Clip N** (**Before Clip 1** when `j = 0`), its label built from the same `j = FM.spine.insertIndexAt(FM.time)` the Insert plan uses, with `itemWord(R.main[j−1])`; while the sheet is open a 2 px insertion caret is drawn on the timeline at that seam, and label and caret follow `FM.time`. (A fixed "At the line" promised the playhead while Insert uses the nearest cut, up to half a clip away; splitting the clip under the line to insert exactly there stays out of Core: a destructive extra split, and CapCut also inserts at the nearest cut.) Otherwise it just appends (right after the first import the playhead is at 0, and "the cut nearest the playhead" would put the second batch before clip 1). In a live session, when the gate is shut (`FM.spine.canArrange(null)` non-null): After Clip N is always greyed with the §10.2 line, and **Add clips itself is greyed, with the picker never opened**, when `FM.spine.appendArranges(R)` is true (an end card, captions past the end, an `sm.tail` item whose fit would lengthen it for any positive D, an untagged whole-video item, or an un-adopted project), the same way Full's menu greys a refused item, so a friend-present pick is not loaded for seconds and then refused; At the end still works when the Append moves nothing (§10.2). · recent media · **Extras** (D21, from Phase 3): saved elements, shapes and templates, reusing addmenu's Elements, Shape and Template tab contents (`js/addmenu.js:238`, `:326`, `:517`) through the §14.2 `tabs` option, each pick running §12.2's insert command | `pickFiles`, `FM.mediaLib.use` (`js/medialib.js:168`), Append / Insert; files load with the §7.3 drain |
| **Text** | **Adds text at the playhead and starts typing** (clamped to the track end, §3.6); saved text styles live in that text's Style panel | `FM.addTextLayer` (`js/app.js:3072`) → `FM.textEdit.start` (`js/text-edit.js:698`) |
| **Captions** | Type captions · Find speech · Style | `FM.addCaptionLayer` (`js/app.js:3418`), `FM.captionsEditor.mount` (`js/captions.js:337`), `detectRow` (`:467`) |
| **Sound** | Music from your files · Sound effects · Record voice | Add menu's Audio tab, `FM.sfx.open`, `FM.voiceRec.open` (Take sound out lives only in the main-clip tray: it needs a selected clip anyway) |
| **Overlay** | A video or picture on top, at the playhead (the only control whose face says "Overlay") | `FM.addMediaLayer` (`js/app.js:3013`) in the overlay band |
| **Look for all** | The Look panel with **Use on every clip** preset on: it always acts on every clip (a different label from the trays' Look, which acts on the selection; filters are per layer, so a project-row "Look" with nothing selected had no target). V10 shows the face words for him to change | `FM.filters.*` (`js/filters.js:563-627`) |
| **Effects** | The effects browser making a **new whole-frame segment at the playhead**: only the tiles that can be a segment (`ADJ_OK`); every other tile carries *"Pick a clip first"* (§8.5c) | `FM.fxBrowser.open` in a new `simple` target mode, 3D, Keying and Repetition hidden |
| **Ask** (D12) | The Assistant, when a key is set, working through Simple's commands (§8.5a) | `js/ai-chat.js` |

**The clip tray** (left to right; the tools that define each kind in the first five; the row may scroll with a fade edge; 🗑
pinned at the right end). **Split is not in any tray**: the play bar's ✂ splits the selected item, or the main clip under the
playhead when nothing is selected, so it has one home (#310; key **S** is the PC equivalent).

| Selected | Tools |
|---|---|
| **Main clip** | Speed · Volume · **⤒ Lift off** (Make overlay) · Look · Crop · **Length** · **Move earlier / Move later** · Effects · Replace · Duplicate · Reverse · Take sound out (§4.6), or **Put sound back** when it has a twin (§8.2) · 🗑 |
| **Overlay** | **⤓ Into row** (Put in the clip row) · Blend · Volume · Look · Speed · Effects · Remove a colour · Crop · Forward / Back · Stay put · 🗑 |
| **Text** | Edit words · Style (with saved styles) · Animate (In / Out, the existing `textAnim` presets) · Effects · Duplicate · Stay put · 🗑 |
| **Caption track** | Edit lines · Style · Find speech · **Follows the clips / Stays with the sound** · 🗑 |
| **Sound** | Volume · Fade · **Ends with the video** · Speed · Voice · Stay put · 🗑 |
| **Effect segment** | Change effect · Strength · Stay put · 🗑 (length by dragging its edges) |
| **Block** | Open in Full · Duplicate · 🗑 (it moves with its clip); a main block with one spine member adds Speed and **Length** through it (§9.2). An `sm.unit` group made by an element or template insert is never a block (§2.5): its members show their own trays (a title gets Edit words, a bar gets Look) with *"Moves with ‘Hello’"* |
| **Slot** (a card between clips) | selects its contents; **Put in the clip row** (its own command, §3.6) · **Delete card** · hold-drag reorders it as one piece |
| **Transition ◇** (Phase 6) | the picker · Length · Use on every cut |
| **Nothing selected** | the first-run hint, then one quiet line: *"4 clips · 0:15"* with the notices *"Solo on ›"* · *"No footage ›"* · *"More in Full ›"* when they apply (§8.2; no tools; 🗑 hidden) |

- **Move earlier / Move later** move the clip one slot through the Reorder command (§3.6), disabled at the first or last slot,
  gated as arranging (§10.2), and announce *"Clip 2 moved to 3 of 5"* through `#sm-live` (§3.12: a line with no button never
  replaces the tray, so the pressed button keeps focus and can be pressed again at once). They are the
  button route for screen-reader and switch users, who cannot hold-drag; on PC Alt+←/→ run them (§8.3).
- **Length** is a readout of the clip's length with − and + buttons of one frame each (step up on hold) and a typed value; it
  commits a ripple tail trim through `FM.spine.edit` exactly as the D grip does (T2 compares the numbers). On a clip already at or
  under `MIN_LEN`, − refuses with *"This clip is already as short as it can go"* and + still works (§3.1). A **Trim start**
  variant does the same as a head trim. This is the "length readout" §8.2 points narrow clips at.

**Open in Full** is not on a plain clip (level `none`, where Simple can already do everything). It appears only where there
is something Full-only: the *"Has moves and effects"* line on ✦ items (§9.1), the Block tray, and the *"More in Full ›"*
notice (§8.2).

Crop, rotate and flip are one tool, **Crop**. Panels reuse the existing builders through `openCategory` (`volume`, `filters`,
`effects`, `blend`, `element`, `captions`), rendered with a `simple` flag that hides keyframe diamonds, easing and the rarely
used rows (`catsFor` filter hook, `js/inspector.js:3619` [checked]), with two rules:

- **Rows that write time go through the runner, or are hidden.** Any builder row that writes `start`, `duration`,
  `trimStart` or flat `speed` is hidden in Simple or routed through `FM.spine.edit`. **Speed** is Simple's own thin panel:
  presets **0.5× 1× 1.5× 2× 3×** and a slider from **0.25× to 4×** (always inside `sanitizeTiming`'s 0.05-100, `js/storage.js:1591`,
  so undo and reload never re-clamp speed; the inspector's `SPD_MAX` of 1000, `js/inspector.js:4142`, is not reused), and Smooth
  slow-mo (`frameBlend`). **There is deliberately no pitch switch:** *"A sped-up clip sounds sped up, in the preview and in the
  file"* (his #916 answer, REQUESTS.md:32384: `FM.pitchFollowsSpeed` sets `preservesPitch = false`, `js/media.js:84-99`, and
  `makeClipBuffer` resamples on export), so a Keep pitch control (it came in from CapCut research) could only do nothing or make
  the preview differ from the file, which his #392 rule forbids. The slider's upper stop is clamped live to
  `min(4, span / MIN_LEN)`, and to `span / (2·amt)` too for a clip on a blend seam (§3.1), so a drag simply stops
  there, and a preset above that stop is greyed with *"Too short to speed up that much"* (§3.6). While the finger moves, the
  slider changes only the Simple timeline's boxes and the preview's `playbackRate` (the DOM-only preview, §3.8); on release it
  commits one `FM.spine.edit('Speed', R => plan.speed(R, c, sp))`. The reused speed builder writes `speed`, `duration` and
  keyframes on every step with no ripple (`js/inspector.js:5852-5881`), and its two speed-to-playhead solve buttons (`spdSolve`,
  `:5788-5838`) write `start` directly, so they are hidden in Simple. A ramped clip's panel shows *"Speed changes over the clip"*
  and **Use one speed** (§3.6). (A Full-side follow-up, logged separately: the inspector's `SPD_MAX` 1000 exceeds the storage
  clamp of 100, which puts speed and duration out of step after an undo.)
- **A panel row never adds a keyframe in Simple.** `FM.setProp` upserts a key at the playhead whenever the property is
  already animated (`js/scene.js:602-609`), and volume (`js/inspector.js:5418`), effect params and Adjust (`:1154`),
  keyframable rows (`:1311`, `:1343`), crop (`:4447-4451`, `:4546-4547`, `js/crop-tool.js:157-164`), stroke (`:6548-6560`)
  and fill colour (`:3940`) all write through it, so with diamonds hidden Simple would add keys it cannot show or remove.
  When `FM.isAnimated(container[key])`, a **numeric** row writes through a new `FM.shiftProp(container, key, value, time)`
  beside `FM.shiftTransform` (`js/scene.js:347-369`): gain-like keys (volume, scale-like, opacity-like 0..N) are multiplied by
  `value / evalProp(p, time)` (adding the difference when the current value is below 1e-3, as `shiftTransform` does); other
  numbers (effect params, Adjust, crop x/y/w/h, stroke width) get `value − evalProp(p, time)` added; each key is clamped to the
  row's min/max; the key count never changes. **Colour and other non-numeric animated rows are read-only** in Simple, with one
  line under the row: *"This changes over time. Your change applies to the whole clip · Open in Full"* (numeric) or *"Changes
  over time ✦ · Open in Full"* (read-only). Canvas drag, pinch, scale and rotate already use `FM.shiftTransform` and move the whole
  animation (`js/canvas-edit.js:564-578`, `:635-636`, `:659-661` "a canvas drag moves the WHOLE animation, never adds a
  keyframe", `:677-691`); only the camera's wheel-zoom uses `setTransform` (`:779-781`), and the camera is hidden in Simple.

### 8.5a Ask in Simple

The Assistant's batch runs `FM.aiOps.applyOps` under one history mute (`js/ai-chat.js:18-20`, `:135`, `:141`), so today it
never meets the runner: its `speed` op sets `layer.speed` without changing the length, `start`/`duration`/`trimStart` are raw
writes (`js/ai-ops.js:114-117`), `deleteLayer` calls `FM.deleteLayer` (`:446-452`), and it can add a camera, null, mask or
wiggle (`:247-254`, `:301-330`). In a Simple project that leaves gaps, overlaps and ✦ badges he never made, and in a live
session it arranges past the §10.2 gate.

- **Simple mode.** When the editor is Simple, `js/ai-chat.js` passes `{simple: true}`. `sceneBlock` (`js/ai-chat.js:73-99`) adds
  `main: <1-based position>` for main clips, `stay: true`, and one sentence explaining the main track. `js/ai-manifest.js` sends
  a smaller vocabulary: setProject, addText, addShape, addCaptionTrack, addAdjustment (as an effect segment), setProp for looks,
  volume and fades, addEffect routed as §8.5c, setTextAnim, setColorGrade, deleteLayer, duplicateLayer, selectLayer, setTime,
  and three Simple verbs **deleteClip / trimClip / moveClip**. addCamera, addNull, setMask, setWiggle, setMotionBlur, setParent
  and addKeyframe report the existing drop reason *"only in the Full editor — tap Open in Full"*.
- **Timing ops on a main clip become Simple commands**, never raw writes: `duration` → tail trim, `trimStart` → head trim by the
  difference, `speed` → the Speed command, `start` → a reorder to the nearest slot (or dropped with *"Simple keeps clips end to
  end"*), deleteLayer → the ripple delete, duplicateLayer → the Simple duplicate. Other writes to overlays, text and sound keep
  the raw writes; attachments follow as in §4. **Add-type ops are intents too** in Simple (addText, addShape, addAdjustment,
  addCaptionTrack, and duplicateLayer of a non-main unit): `createLayer` inserts at `o.z` or index 0, the very top, starts at 0,
  defaults to min(5, `P.duration`) and grows `P.duration` (`js/ai-ops.js:153-169`), so an Ask-added title sat above the caption
  tracks, a grade landed over the titles, and a title near the end lengthened the video. `FM.spine.compose` runs them through
  the tray's Add plan builder: the §3.6.1 band slot when no explicit z, start = the op's start, else the playhead, clamped to
  the track end with the §3.6 Add rule (and the effect-segment length rule); only an explicit `start` + `duration` from the
  model skips the default, and it is still clamped.
- **One step, across an async boundary.** `applyTurn` is synchronous today (`js/ai-chat.js:126-141`: mute, `jobBegin`,
  `applyOps`, `jobEnd`, unmute, `refreshAll`, commit in one tick), and `applyOps` promises every caller it is synchronous
  (`js/ai-ops.js:453-462`), while the runner awaits. So:
  1. `FM.aiOps.applyOps(ops, refMap, {simple: true, intents: []})` stays synchronous and writes nothing for main-clip timing
     ops (duration, trimStart, speed, start, deleteLayer, duplicateLayer on a main clip, and deleteClip / trimClip / moveClip):
     it pushes `{op, ref, args, index}` onto `opts.intents` and reports them as queued. Every other op keeps today's raw write.
     Any op that names a `newRef` made by a queued duplicate is deferred as an intent too, so it runs after that id exists.
  2. In Simple, `applyTurn` becomes `async`: it takes the mute and `jobBegin('ai applyTurn')` as today, runs `applyOps`, and
     if there are intents `await FM.spine.compose(intents, refMap)` **while still holding the mute and the job**; only then
     `jobEnd`, unmute, `refreshAll` and one `FM.history.commit({label: 'Assistant', ed: 's', arr: anyArranged})`. The send
     button stays disabled (`setBusy`) until it returns.
  3. `FM.spine.compose(intents)` (§3.7) holds `running` for the whole batch. For each intent in order it re-runs `classify`
     (uncached), builds the plan against the current result and runs the same gate, lock, blockers and couplings checks. A
     failing intent is dropped with the runner's refusal text as its drop reason, the ones already done are kept, and it carries
     on; it never calls `ask()` and never `restorePreEdit` mid-batch. Only a `tooBig` or lease failure after the last apply
     reverts, and then the whole turn goes back to the pre-turn snapshot, look ops included. The runner's per-step commit,
     `landTime` and `say` are skipped inside; `landTime` runs once, for the last intent.
  4. The Director (`js/ai.js:211`, `:229`, `:266`, `:338`, `:387`) and templates (`js/ai-templates.js:85`) do not pass `simple`
     and keep today's synchronous Full behaviour (they still refuse video / image duplicate); in a Simple project they are
     reached only through Open in Full.
  One sentence stays one Undo step. Line: *"Assistant: trimmed clip 1, sped up clip 2"* + **[Undo]**.
- **Live sessions:** arranging ops meet the §10.2 gate and refuse with the tray's own line.
- The keyframe half of `js/ai-ops.js:116` (`start` moves without its keys) is an existing bug and is fixed in **Phase 1**, not 4a.
- **Phasing (D12):** Ask ships in Phase 3 only with all of the above; otherwise it waits.

### 8.5b Several at once

Simple has no row heads, so Phase 1 has no select mode of its own. A 2+ selection arrives only by switching from Full, from
shift/⌘-click or ⌘A on PC, or from a remote Select All.
- In Simple, `syncSelectionChrome` (`js/app.js:941-951`) sets neither `sel-mode` nor `sel-multi` (they hide the project name
  and show Group / Mask-group / the bin, `styles.css:4047-4053`, and turn `#m-back` into "Done selecting", `js/app.js:960-965`);
  it sets `sm-has-sel` (§8.2). The tray names the selection (*"3 selected"*); switching back to Full restores both classes.
- **Tray for 2+ items is the intersection:** Delete (for main clips, one ripple commit removing each with its followers,
  highest start first, cues mapped once per clip; *"Deleted 3 clips and 4 things on them"* + **[Undo]**), Duplicate (non-main
  only), Stay put (all), Volume and Look (each, one commit), and Open in Full to group or anything else. Speed, Move earlier /
  later, Make overlay / Put in the clip row and Replace show only for one item. A tap on any single item drops back to one
  selection.

### 8.5c The Effects flow (drawn in V3 at 380 px)

An adjustment layer can only carry 16 effects (`ADJ_OK`, `js/fx-registry.js:163-166`; `supportsLayer` refuses the rest,
`:663`), while the browser shows every tile and refuses at add time in Full's words (*"Adjustment layers only do colour, blur &
pixel grades — add this to the layer itself"*, `js/fx-browser.js:241-248`), and the flagship Shake presets are keyframed and not
in `ADJ_OK` (`js/fx-presets.js:19-26`). And `FM.addAdjustmentLayer` (`js/app.js:3406-3415`) creates the layer, seeds it with
brightness 1.15 and saturate 1.35 and commits before any pick, so a cancelled pick left a hidden colour grade behind. So:

1. **Pick first, create on pick.** The Effects tool opens `FM.fxBrowser` in the `simple` target mode with no layer yet. Nothing
   is written until a tile or preset row is chosen, and the create and the add are **one** history step; Cancel writes nothing.
   `FM.addAdjustmentLayer` is never called as it is today; a new `FM.addEffectSegment(effectInst, start, len)` builds the
   adjustment layer with `effects: [inst]` only.
2. **The project row's Effects makes segments only.** It opens the browser showing the tiles that can be a whole-frame segment
   (`ADJ_OK`), and every other tile carries *"Pick a clip first"* instead of being routed to a clip without a word (with a clip
   selected the project-row Effects and the tray's Effects were two homes for one command, visible together); a pick becomes an
   effect segment at the playhead (§4.3's length rule).
3. **Effects in the Main clip, Overlay and Text trays** open the same browser targeted at that layer, showing only the effects
   that layer supports: Simple filters the tiles with `supportsLayer(id, target)` instead of showing them and refusing at add
   time. A pick is added to that item as a clip effect through the existing `addEffect` path and travels with it; the line says
   *"Added Shake to Clip 2"*. Simple never shows the words "adjustment layer"; if a refusal is still reachable it reads *"This one goes on a clip —
   tap a clip first"*.
4. **Level.** A preset instance applied in Simple is marked as Simple-made (`inst.sm = 1`), and §9.1 counts keyframes on such
   an instance as level `none`, so a Shake from Simple never earns the ✦ line. The sanitiser keeps the marker (§2.3). Paste
   Style (`js/inspector.js:3203`), look presets and a Full-side param edit that adds a keyframe drop `inst.sm`: the effect then
   counts as Full-made.
5. §8.5a's Ask vocabulary (`addEffect`) routes the same way: onto the named or selected item when there is one, otherwise an
   `ADJ_OK` effect becomes a segment at the playhead and any other is dropped with *"Pick a clip first"*.

### 8.6 Lanes inside a section (view only)
Items of a section in stack order (front first); each goes in the first lane where it overlaps nothing in time (± eps); open a
new lane if none fits. The array stays the only stacking truth. The Sound row draws only lane 0 plus count badges, and sync
twins are left out of `lanes.audio` (they draw inside their clip's filmstrip, §8.2); Behind is a section with lanes. Lanes can reshuffle as items move; an optional `sm.row` hint
can be added later if that proves annoying (model §13.3).

### 8.7 Every CapCut feature, tiered (**Core** = the Simple editor's releases; **Later**; **Never**)

| CapCut | FreeMotion engine | Tier |
|---|---|---|
| Magnetic main track, append, insert, reorder, delete, trim, split | `FM.splitLayer`, trims + **`FM.spine` (new)** | **Core** |
| Speed (flat), smooth slow-mo | speed category, `frameBlend` | **Core**; curve presets **Later** |
| Keep pitch when speeding up | none: it needs a time-stretch in the exporter (`makeClipBuffer`) so the file matches the preview, and it conflicts with his #916 answer | **Later**, and only if he asks, shown to him as options first |
| Volume, mute all, fades | exists | **Core** |
| Duplicate, replace, reverse, extract audio | `js/app.js:4313`, `:4658`, `:5197`, `:1048` | **Core** |
| Crop, rotate, flip | `js/crop-tool.js`, transform, `FM.flipLayer` | **Core** (one Crop tool) |
| Filters + strength + use on every clip; Adjust | 56 filters; colour effects | **Core** (the Look tool) |
| Overlay, blend, opacity, forward/back, chroma key | the core model | **Core** |
| Main ↔ overlay | **new** | **Core**, visible both ways |
| Text, styles, In/Out animation | `js/text-edit.js`, `textAnim` | **Core** |
| Captions: type, find the timing, one style for all | caption tracks, `captions-vad.js` | **Core**. Honest label: it finds *when* people speak; you type the words |
| Captions that write the words | none (`js/captions-vad.js:4`) | **Later**, only if it runs on the device and is good (#152) |
| Sound: files, record voice, sound effects, voice effects | `sfx.js`, `voice-rec.js`, 24 audio effects | **Core** |
| Effects (3D, Keying, Repetition hidden) | 16 whole-frame grades as segments (`ADJ_OK`); the rest on the clip or item they are added to (§8.5c) | **Core** |
| Ratio, background colour, blur behind | canvas dialog, Fill Behind | **Core** |
| Templates (fill your clips in) | `js/template-fill.js` | **Core** (existing) |
| Transitions at each cut, use on every cut | **none** | **Core, Phase 6** (renderer) |
| Clip In/Out/Combo animations | **none** (text only) | **Core, Phase 6** |
| Freeze frame, stabilise, beat markers, SRT import, sticker and music libraries, keyframe diamond | missing or partial | **Later**, one by one with his go-ahead (freeze's model is the §3.6 freeze note: capture before the split with `FM.renderStill`, first / last frame at the edges) |
| Remove background, body effects, retouch, auto reframe, text-to-speech, AI avatars | none, or removed under #392 | **Never** for now |
| Overlay lane cap, watermark, branded ending, paywalls | — | **Never** |

### 8.8 Shared chrome in Simple

Every shared control, in each state (nothing selected, one, several; 380 and 1280). Full-only controls that stayed visible
would bypass the design's rules: `#btn-del-layer` and `#m-del` call `FM.deleteLayer` / `FM.deleteSelected` directly
(`js/app.js:8083-8088`, `js/mobile.js:206`), which leaves a hole on the main track, orphans followers and skips the live gate;
Group / Masking group can turn main clips into a block in one tap; Parent makes a clip a "look"; Add camera makes a hidden item
that moves the whole picture.

| Control | In Simple |
|---|---|
| View rail (`index.html:431-432`) | Fit, zoom, guides and safe area stay; `#vb-layers` and `#vb-camera` hidden (`body.ed-simple` rules) |
| Phone top bar on select | `syncSelectionChrome` sets neither `m-editing` nor `sel-mode` (`js/app.js:941`, `styles.css:4030`, `:4051-4055`), so `#m-dup`, `#m-del`, `#m-more`, `#m-group`, `#m-maskgroup` and `#clip-name-m` never show; the tray names the selection and owns the one bin |
| Phone notes (`#m-notes`) on select | hidden while anything is selected (his #171), via `body.ed-simple.sm-has-sel #m-notes { visibility: hidden; }`; `syncSelectionChrome` toggles `sm-has-sel` (n ≥ 1) in Simple as the one writer; visibility, not display, so ? does not slide (§8.2); ?, ⚙ and Export unchanged |
| PC `#t-sel` | `pcTransportLayout` (`js/app.js:7620`) does not move Parent, Delete, Group, Masking group or More in; they are hidden. From Phase 2 the tray's 🗑 is the only delete (Phase 1: §15.1) |
| Any Full delete path still reachable (the Delete key, a multi-select delete) | goes through the Simple delete command (Phase 1: §15.1) |
| `#tl-headtap` (`index.html:609`) | stays: a tap adds / removes a benchmark, a hold pins the thumbnail; its marks draw on the Simple ruler (§8.3) |
| Right-click on `#sm-timeline` | only the tray's own commands for the item; on empty timeline: Clips, Text, Captions, Sound. Never camera, controller, adjustment layer or sample (`js/timeline.js:4758-4760`); `FM.layerMenuItems` is not used in Simple |
| Keys | §8.3's table; the rest do nothing |
| The ? sheet (`js/shortcuts.js:29-58`) | a Simple list (Space, A/S/D, Delete ripples, E, M, Alt+←/→, ⌘Z/⌘⇧Z, +/−, Tab, frame step, Home/End, Esc), with no Full tips such as "Right-click timeline: Add camera…" |
| Export sheet | hides "Export just this layer" and "Selected clip only" (§12.1) |

### 8.9 Words

**One table gives every string shown on screen in either editor, once**, with the sections that use it: every tray, ⋯, chip,
refusal line (§3.11), `#sm-say` line (§3.12), toast, switch label and tooltip. The strings live in one object in
`js/spine-words.js`, which every renderer reads; T20 asserts that no Simple DOM text node, `aria-label` or `title` exists outside
that object (a deliberately hard-coded label is the positive control) and that, for every selection state (none, main clip,
overlay, text, caption track, sound, effect segment, block), no two controls visible at the same time share a face label, a
title or a command id (§8.5; a fixture rendering "Overlay" in both rows is the positive control). The table goes on V10 so he can change any word (his #454 / #967 rule: one name everywhere). **The command names in
§3.6 and §14 are code names and are never shown on screen.**

| Thing | Word (both editors) | Used in |
|---|---|---|
| The main track | **Clip row** (section label, the mute row, refusal lines, tooltips; "main track" stays a code and document term only) | §8.2, §3.11 |
| Main clip → overlay / overlay → clip row | **Make overlay** / **Put in the clip row** as the full names (`title`, `aria-label`, Full's layer menu, drag labels), with no "layer", right even for a picture-in-picture made in Full that was never on the clip row. **The tray faces never show the bare word "Overlay"** (which means only the project tool that adds a picture on top, and the section / tray kind): **⤒ Lift off** and **⤓ Into row**, with *"On top"* drawn as the alternative on V10 for him to pick. Full's layer menu uses the same two words, replacing "Take off / Put on main track". The non-recommended alternative on V10: *Move to top layer / Put back in line* | tray §8.5, Full menu §4.4, drag labels §3.8 |
| The follow switch | **Stay put** (on/off) in both editors (Full's "Stays put / Follows its clip" goes) | trays, Full menu |
| The caption-track switch | **Follows the clips / Stays with the sound** | Caption track tray |
| The end switch | **Ends with the video** | Sound / Stay-put trays |
| A gap | **Close gap** on the block; **Close all gaps** in ⋯ (replaces "Tidy"); **Fix** only on the overlap notch | chips, ⋯ |
| Mute | **Mute the clip row** (the 🔈 on the clip row) | §8.2 |
| Sound out of a clip | **Take sound out**; its drift chip *"Sound out of step · Line up"* | main-clip tray §4.6 |
| Ramped speed | *"Speed changes over the clip"* · **Use one speed** | Speed panel |
| The volume rider | *"Keep volume changes with the clips"* | Sound tray |
| Ordering | **Sort by date taken** · **Move earlier / Move later** · **Length** | ⋯, tray |
| Clips tool placement | **At the end** / **After Clip N** (**Before Clip 1**), with a caret at that seam | Clips tool |
| Project tools | **Clips · Text · Captions · Sound · Overlay · Look for all · Effects · Ask**; Clips › **Extras** (D21) | §8.5 |
| Sound and slot tray words | **Put sound back** · **Delete card** · **Lay them end to end** (an import stack) · **Keep on the music** (lyrics, §4.1) | trays, chips, lines |
| Collab line words | **Options ›** (Make Sam a Viewer · Open in Full) · **Make it my own** (**Mine** on a phone) · **Why? ›** · *"your phone"* / *"your computer"* for his own devices (`whoWord`) | §3.11 |
| Phase 1 lines | *"Deleting clips comes next · Open in Full"* · *"Closing gaps comes in the next update · Open in Full"* · *"Splitting comes in the next update · Open in Full"* | §15.1 |
| Other tray words | **Remove a colour** · **Blend** · **Forward / Back** · **Replace…** · **Effects** · **Show** · **Unlock** | trays |
| The black band | *"Text “Hello” runs 3 s past the end"* / *"Black: 2.4s (2 things run past the end)"* · **End with the video** · **Keep as end card** | §5.4 |
| The ✦ panel line | **Has moves and effects · Open in Full** (replaces "Also has: keyframes · 3D effect") | panels |
| Items only Full shows | **More in Full ›** in the tray's nothing-selected line (replaces "Full-editor items (2)" and the "2 more in Full" chip) | §8.2 |
| Missing footage | **No footage** badge · **No footage ›** in the tray's nothing-selected line | §5.4 |
| Hidden, locked, solo | *"Hidden · Show"* · *"Locked · Unlock"* · *"Solo is on · Turn off"* | §5.4 |
| The first-run hint | phone *"Tap a clip to change its speed or look · ✂ splits it at the line"*; PC *"Click a clip to change its speed or look · ✂ or S splits it at the line"* (one verb for ✂ everywhere: **split**, matching §3.6, the S key and the ✂ tooltip, never "cut") | tray §7.3 |
| Naming items in lines | *"Clip N"* for a main clip; a text's first words in quotes (≤ 16 characters + …); otherwise its kind (*"the sticker"*, *"the image"*, *"the video on top"*, *"the song"*, *"the voice-over"*, *"the effect"*); never `layer.name`. One helper, `FM.spine.itemWord(lid)` | §3.11 |
| The Settings preview | *"See any project as clips — still being tested."* (Phase 1); *"Edit clip after clip — still being tested."* (Phase 2) | §15.1 |
| Sound default | a sound that runs more than 1 s past the clip it starts on stays put, whoever made it; a shorter one follows (§4.1) | — |

**No line says where something was made** (*"made in Full"*, *"set in Full"*, *"Animated in Full"*): an animated element
inserted in Simple, an AI-generated template or a friend's edit were not, so those lines were false. A line says what the thing
is; "Full" appears only in actions (**Open in Full**, **More in Full ›**). T20 fails on those three substrings.

### 8.10 Accessibility (Phase 1 unless noted)
1. ⇄'s `aria-label` / `title` names its **action** (*"Switch to Full editor"*); the icon keeps showing the editor you are in.
2. Focus survives the switch (§6.2); it never falls to `<body>`.
3. Clips, section items and seam chips are real focus targets: `role=button`, `tabIndex` 0 on the selected item and −1 on the
   rest (roving tabindex); the container is `role=group`, `aria-label` "Timeline". Names read like *"Clip 2 of 5, 3.2 s, 2
   things follow it"*, *"1.2 second gap, Close gap"*, *"Overlap 0.3 s, Fix"*.
4. On PC, ←/→ move between main clips, ↑/↓ between sections, Enter opens the tray, Alt+←/→ move the selected clip; Delete keeps
   today's text-field guard.
4a. **Key scope in Simple.** The window keydown handler (`js/app.js:8664`) exempts a key only for INPUT, SELECT, TEXTAREA and
   contentEditable (`:8671`) and otherwise prevents it: Space toggles play (`:8775`), which also stops a focused `<button>` being
   pressed; Tab cycles layers (`:8831`) and never lets focus move; arrows nudge or step (`:8777-8808`); Delete deletes (`:8895`).
   So a Simple-only focus check, `FM.simpleKeyScope(target)`, runs right after the `inEdit` check: (a) with focus on the Timeline
   group or an item in it, on `#stage` or on `<body>`, the §8.3 keys work as listed (Tab / ⇧Tab walk items, arrows move the
   selection, Enter opens the tray, Space plays, Delete deletes); (b) with focus on any other focusable control (play bar,
   tray, project tools, `#sm-say`, panels), Tab and ⇧Tab are never prevented, so focus moves natively in DOM order: play bar →
   Timeline group (one tab stop, roving) → tray → project tools → `#sm-say`; arrows are left to the control; Space and Enter
   are left to the control when it matches `:focus-visible` (keyboard focus), while after a mouse click Space still means play
   (and Simple's tool buttons blur after a pointer press, so a clicked Split never takes Space); Delete and Backspace on a
   focused control do nothing; letter shortcuts (A/S/D/M/E, ⌘Z…) stay global; (c) Esc with focus in the tray or a panel sends
   focus back to the selected timeline item; (d) leaving the Timeline group with Tab does not change the selection.
5. No colour-only cues: the overlap notch carries ⚠; the folded band's openers carry each section's glyph and name.
6. **Every drag has a button route** (Phase 2): Move earlier / Move later and Length in the tray (§8.5), so a screen-reader or
   switch user can arrange clips; `#sm-live` (visually hidden, `role=status`, `aria-live=polite`, §3.12) announces every result
   without replacing the tray, including *"Clip 2 moved to 3 of 5"*, and focus stays on the pressed button.
7. **Reduced motion** (one `FM.reducedMotion()` helper, as the app's ~20 per-element `prefers-reduced-motion` blocks already do,
   e.g. `styles.css:850`, `:2017`, `:6221`, `js/fx-browser.js:1198`) covers the switch (§6.3) **and** the remote-ripple glide
   (snaps), the mover tint (a static outline plus the *"Sam moved 4 clips"* line), the drag glide-back (snaps) and the lift ghost
   (an outline, no rise).
8. Test T22 checks all of this at 380 and 1280 (§14.6).

---

## 9. Full-editor content in Simple

**The picture never lies:** Simple's preview and export render everything exactly as Full does (#392). Simple limits what can
be **changed**, and says where to change it, in one line. The preview is `FM.renderScene` (`js/compositor.js:15989`) whichever
editor is showing.

### 9.1 Levels

| Level | Examples | In Simple |
|---|---|---|
| **none** | a plain clip, text, image, overlay, adjustment layer; an effect preset applied in Simple (`inst.sm = 1`), keyframes and all (§8.5c) | fully editable |
| **look** | any keyframed property (transform, volume, crop, effect or Adjust params), a speed ramp, masks, behaviours, 3D / layer-referencing effects, a transform parent, audio-react | timing, volume, filters and delete still work (a numeric row on an animated property shifts the whole curve, a non-numeric one is read-only, §8.5); a small **✦** corner badge; the panel shows *"Has moves and effects · Open in Full"*; nothing Simple can't show is ever reset or silently keyed. A ramped clip's Speed tool shows *"Speed changes over the clip"* and **Use one speed** (keeps the length, §3.6) |
| **block** | a group that must render as one (§2.5), a null that parents other layers, a clipping mask, a masking group | one hatched item in its section: **Open in Full · Duplicate · 🗑**. No trim, no split, no look edits inside (a main block with exactly one spine member trims, speeds and splits through it, §9.2; an `sm.unit` group from an element or template insert is not a block at all, §2.5). It moves with its clip as a unit. A plain tidy-up group is **not** a block: its members are edited one by one |
| **fullOnly** | the camera, controllers with nothing to show (not a layer with `visible: false`, which is classified like any other and drawn dimmed, §5.4) | the *"More in Full ›"* notice in the tray's nothing-selected line (§8.2): with one such item it switches to Full with it selected; with two or more it first lists them by name (*"the camera"*, *"the controller"*). The camera still rides every command (§3.10) |

### 9.2 Protection
- Simple commands only ever write `start` (via `shiftUnit`), `duration`, `trimStart`, flat `speed`, volume, fades, `sm`, the
  looks it owns, and the fields of the panels it opens. A block's insides are only ever shifted as a whole.
- **A block on the main track:** if a Full user groups main clips into a group that must render as one
  (`FM.groupSelection`, `js/app.js:3897`), the members keep `sm.main` (never the group layer, §2.3), the group is the unit, and
  Simple shows one block in that slot of the main track that ripples and reorders as one piece (like a compound clip), provided
  it is a main block (§5.2); a wrapper block over the whole track is edited as if transparent; otherwise it is a mixed block.
  Its span is its members' span, never the group layer's own fields. **A single-spine block** (a main block whose spine has
  exactly one member M; the others are titles, stickers, mask shapes and sound) gets Trim, Speed and Split through M:
  (1) Trim and flat Speed apply to M exactly as to a plain main clip; the block's other members are M's followers under the
  clamp and slide-back rules (D6, §4.3); a mask shape or other member that spanned M's old span ± eps is set to M's new span;
  the runner then refits the group row (start = min member start, duration = max member end − start); the group's own keys are
  re-timed with the wrapper rule (§5.2's `g`), or scaled with M's `d` for Speed. (2) Split at `t` runs the existing `onSplit` on
  M and on every member crossing `t`; the group layer is duplicated for the second half (same fields, a new id, its keys divided
  at `t` by the same seam cut `FM.splitLayer` uses), the B halves and the members wholly after `t` are reparented to the copy,
  directly above the original in the stack, so the render order is unchanged, and each half is again a single-spine block.
  (Full itself cannot split a group, `js/app.js:4903`; its route is to split the member inside, which keeps the parent.)
  (3) A block with two or more spine members, a nested block group, a ramped M, or a group whose own transform is keyframed
  across the cut point keeps the block line (*"Open in Full to split this"*). A clip framed by a masking rounded-rect, or a clip
  and title under a group fade, therefore keeps its tools in Simple.
- **Open in Full** is a **hop** (§6.2): it switches with the item selected and its row scrolled into view, opens the inspector
  on the matching category, writes no editor memory, and leaves the **back-to-Simple** button (slot 3 on the phone under D2-B and D2-D; on ⇄
  itself under D2-A and D2-C and on PC, §6.1). The way back returns to Simple with the same selection.

---

## 10. Collaboration across the two editors

### 10.1 What changes on the wire in Phases 1–3: nothing new
- `sm`, `trIn` and `clipAnim` are plain layer keys; they sync as ordinary path ops with no collab code change (collab §2.1).
- A Simple command is one commit, so it is **one diff and one transaction** (§3.7).
- **No derived writer, no `KEYED`/`ATOMIC` change, no new op kind.** `SCHEMA_REV` goes 2 → 3 in Phase 1 because the sanitiser
  learns the `sm` shape and a room must not mix builds that disagree about invariants (collab §3) [checked: `C.SCHEMA_REV = 2`,
  `js/collab-core.js:29`]. **`SM_V` changes only together with a `SCHEMA_REV` bump; the fingerprint enforces it** (`SM_V` is
  hashed into `C.schemaFingerprint`, §14.2).
- **A guest's whole-tx refusal is no longer silent** (Q29, a collab change that covers Full too, Phase 2). Today a tx failing
  `validateTx` is answered `rej [['*','bad']]` with empty ops and fix (`js/collab-host.js:851-855`), step 11's repair skips
  `'*'` (`:902`), `forceRefused` skips it (`js/collab-session.js:945`), `onClash` ignores `'bad'` (`:971-990`) and `onHash`
  waits while anything is pending (`:1041`). Now: (1) in `onAck` (`:926-930`), any `'*'` refusal sends `{t: 'resync', seq:
  S.bs, h: S.baseHash()}` at once (the message `:929` already sends); `onSnap` reverts the refused ops, since the entry was
  spliced out of outstanding. (2) One line, generic because the ack carries no reason: *"That change couldn't be sent to your
  friends, so it was put back."* (3) `closeStep` records the cids its ops went out under; on a `'*'` refusal every undo or redo
  step whose cids include `ack.cid` is dropped, so an undo pressed during the window sends nothing and shows no misleading
  *"changed since"*. (4) `onClash` counts per-op `'limit'` refusals (`js/collab-host.js:638`, `:651`) and says *"Part of that
  change was too big to share, so it was put back"*; the host's step-11 fix already repairs the data.
- **The editor each person uses never syncs.**

### 10.2 Which Simple edits work in a live session, and when

| Kind of edit | Examples | Phases 2–3 | Phase 4 onward |
|---|---|---|---|
| **Look, text and sound edits** (one layer, like any Full edit) | filters, Adjust, volume, crop, text words and style, captions typed, add text / overlay / sound / effect segment, delete a non-main item, Stay put, Show / Unlock, Reverse, **split** (with the lease pre-check, §3.7), **append after the last clip on an adopted project with nothing after the end** (no end card, no Ends-with-the-video item, no untagged whole-video item, no captions past the end: it moves no existing layer; `FM.spine.appendArranges(R)` decides it at tap time, §8.5) | **Yes, live** | Yes |
| **Arranging** (moves other clips; `plan.arranges`, or adopting) | insert, delete a main clip, trims, reorder, speed, Make overlay / Put in the clip row, close gap, Close all gaps, Sort, duplicate / paste a main clip, a shorter replace, an Append that moves an end card, refits music or shifts captions, the first edit on an un-adopted project (including Full's Make overlay / Put in the clip row on it, §4.4) | **Off while someone else who can edit is in the session** (`othersCanEdit()`, §3.7): a friend with the Editor role who is connected, **or whose connection has closed, until they leave, are removed, or you choose Arrange anyway**; on a guest, always (the owner can always write); on a linked copy open with no session yet, too. Viewers and Commenters watching do not turn it off. The tray greys them with the `live` line (§3.11), which carries **[Options ›]** (Make Sam a Viewer · Open in Full) on the owner when one editor holds it; a seam chip still shows, and tapping it gives the same line instead of a dead button | **Yes, live**, while online **and while every editor is connected** (§10.4, the `away` term); offline, off until Phase 5 |

**Why the gate is structural, not a warning:** a ripple sent before Phase 4 carries many absolute starts plus whole keyframe
lists, and six of the ten conflict cases in collab §9.1 turn that into a wrong-but-consistent project nobody is told about. The
gate has **three doors**, and all three are guarded (his rule: *"every safe guard needs to be structural"*):
1. **The command** (the runner, §3.7).
2. **Undo and redo.** In a session `FM.history.undo` routes to `FM.collab.undo` (`js/history.js:325`, `js/collab-core.js:327`),
   which pops the session stack or falls back to `preSessionStep` over the owner's pre-session snapshots
   (`js/collab-session.js:1112-1127`, `:1232-1233`); neither looked at the gate. Now the runner commits with `arr: true`; the
   history snapshot stores it, `closeStep` copies it onto the session step (`:1103-1110`), `preSessionStep` returns the newer
   snapshot's `arr`, and the inverse `runStep` pushes keeps it (`:1221`). At the top of `runStep` (`:1140`): if `st.arr` and
   the gate is shut, show the gate line and put the step back unconsumed, the same restore the backstop refusal uses
   (`:1196-1199`), before any `pushLocal`/`flush`. Undo stays enabled, so the line explains itself; a look edit's undo is never
   gated. So *arrange solo → share → a friend joins → ⌘Z* can no longer send a ripple. **A third check, in two halves.**
   (a) **From Phase 2, for every undo and redo step while `S.active`**, arranging or not: after the per-op keep filtering and
   before `invertStep` / `applyLive`, `runStep` collects the layer ids the kept ops write (by `layerOf`, excluding 4b's exempt
   paths), and if the step has any `li` / `lr` op or writes more than one layer it runs the **lease half** of
   `FM.spine.blockersForLayers(ids)` (`PZ.heldByOther`). Split is live from Phase 2 and not arranging, so its undo never reached
   the old `st.arr` check: with a guest who had just opened Crop on B (a lease that has not written yet, so `runStep`'s `li`
   check passes), the owner's `H.local` refused the `lr B` per op and applied A's duration restore, so A grew back over B on
   every device and the step was used up; the Mute-clip-sound toggle, Use on every cut and a live clips-only Append have the
   same shape. A single-layer, non-structural step stays per-op as today. Because the check lives in `runStep`, it also covers
   Full's own split undo. (b) **From Phase 4 (with 4c)**, for `st.arr` steps, the drag half is added: a remote `ar.ids`,
   `act:'drag'` `af`/`sel` or `act:'kf'`. If anything blocks, the whole undo is refused with the busy line (*"Sam is
   editing ‘Clip 5’. Try again in a moment."*) and the step is put back unconsumed (`preIdx++` for a pre-session step, else
   pushed back onto its stack), before any `applyLive` / `pushLocal` / flush. Redo gets the same check. Without it, undoing a
   Simple head trim on a clip Sam has leased moved the later clips back while the host refused the leased clip's `trimStart`
   (`js/collab-host.js:834`): a gap, with a consumed step whose redo held ops that never landed. The owner branch at
   `js/collab-session.js:1212` also now handles `r.rej` with `refuseLocal`, as `pushLocal` does (`:278`), and drops the refused
   ops from the step it pushes to the other stack (a lease granted in the one-hop window stays a seam chip until Phase 5).
3. **The drag.** It is gated when it arms and cancelled at once if the gate shuts mid-drag (§3.8); nothing was written.

The same `othersCanEdit()` powers the drag arm check, so there is one predicate. Full's own edits are unchanged.

### 10.3 What people see (from Phase 1)
- **Presence says which editor each person is in:** `ed: 's' | 'f'` in `sample()`, `cleanPr()` and `hostRoster`
  (`js/collab-presence.js:236`, `:280`, `:509`). Old builds drop the unknown field, so no bump for this (collab §9.4 F). The
  people chip shows a tiny editor glyph on each face; the chip reads "Sam · Simple".
- **One timeline-host interface.** `FM.timeline.host()` returns whichever timeline is showing:
  `{ clipEl(lid), innerEl(), rulerEl(), scrollEl(), headW(), timeToX(t), xToTime(x) }`. Full answers with `#tl-inner`,
  `#tl-ruler`, `#timeline`, `.tl-headspace` and its `timeToX` (`HEAD_W + PAD + t·pxPerSec()`, `js/timeline.js:4359`); Simple
  answers with its own lane container, ruler, scroller and `pxPerSec`. Everything below draws through it, because all of it
  sits inside `#timeline`, which Simple hides:
  - remote playheads and edge chips (`paintHeads`, `js/collab-presence.js:1091-1110`) and its scroll listener (`:786`,
    re-bound to `host().scrollEl()` on each switch);
  - remote timeline taps and their row (`spawnTap`/`rowY`, `:990-1004`, which queried `#tl-tracks .clip` directly);
  - your own pointer time sent to others (`tlTime`, `:725-734`, which measured against Full's zoom and header);
  - the Watch-along follow scroll (`:1346-1353`, PC);
  - comment ruler marks (`CM.paintMarks`, `js/collab-comments.js:309-311`);
  - remote selections (`clipEl`, `:1012`, `:1020`; `js/collab-media.js:1325`).
  `FM.simpleTimeline.rebuild` fires the same `FM.timeline.onRebuilt` listeners (`js/collab-presence.js:788`,
  `js/collab-comments.js:574`), and `FM.editor.set` calls `paintHeads` and `paintMarks` after the switch.
- **In Simple**, an item a Full user holds (their lease, `pr.ls`) wears that person's colour ring. **In Full**, a main clip a
  Simple user is arranging is outlined with "Sam · main track", read from presence `ar.ids` (§3.8), not from `af`: a Simple drag
  writes nothing until release, so `af` is null throughout it. `act: 'arrange'` joins `ACTS` (`js/collab-presence.js:81`), and
  `cleanPr` (`:280-297`) keeps `ar` only when `act === 'arrange'`, `k` is one of the two words and `ids` is an `isId`-filtered
  array capped at 8. `ar` rides the 4a bump (Phase 4, §3.8); a guest on an older revision is refused at the door
  (`S.schemaGate`, `js/collab-signal.js:1557`).
- **Follow / Watch along** mirrors the playhead only, as today (`js/collab-presence.js:1274-1311`); it works across editors
  because time is shared. **Starting Watch along first closes open exclusive tools (mask, crop, points, graph editor) and
  flushes the text editor, releasing their leases**, exactly as the editor switch does, in the shared follow path
  (`C.presence.follow` / `startFollow`, `js/collab-ui.js:526-529`, where `closeAny()` today closes only the collab panels; the
  pointer-down that ends following skips `#collab-people` and `#collab-banner`, `js/collab-presence.js:1285`). Otherwise a
  follower's lease stayed held the whole time they watched and blocked other people's ripples.

### 10.4 Phase 4: "together", which lifts the gate

Phase 4 ships as these steps, in this order, each through `ship.sh`. **It starts only after his first real Mac ↔ iPhone test
has passed on today's wire** (collab is waiting on it, collab §1; buildability §3.3), because step 4a changes the wire.
**Every step that changes what crosses the wire or what the host accepts bumps `SCHEMA_REV`**, because the door check is exact
match only (`S.schemaGate`, `js/collab-signal.js:1557-1561`): builds sharing a revision are exactly the ones it lets into one
room, so "same revision" would *allow* a 4d guest beside a 4a host (a partial ripple the pre-flight promised could not happen),
or a 4d owner beside a 4a guest without 4b's start re-read. **4a: 3 → 4** (plus `PROTO` 2 for the stale compare, the `kr`
compare and the `mrev` compare); **4a′: 4 → 5**
(captions become KEYED); **4b: 5 → 6** (the host's lease exemptions, and T16's re-read on the receiving side); **4d: 6 → 7** (sets
`liveArrange`, which relies on 4b's host rule and 4c's pre-flight and authorship being on every device in the room); Phase 6
moves to 8. Made structural: `C.schemaFingerprint` (`js/collab-core.js:208-216`) also hashes `P.canon(KEYED)`,
`P.canon(ATOMIC)` (exported from `js/collab-path.js:251`, `:262`), `SM_V`, and a new `C.HOST_RULES` descriptor naming the lease
exemptions (`{leaseExempt: [...]}`) that the host's lease gate (`js/collab-host.js:834`, `:871`) reads instead of an inline
list. So any 4a′ or 4b change moves `SCHEMA_FP`, and the pinned-fingerprint test ("921 S1 SCHEMA_FP gate…") refuses the release
until `SCHEMA_REV` is bumped.

**4a. Clip time on the wire (C §3.3), with its three conditions (soundness §4).** The app keeps absolute keyframes in
`FM.scene`, so the ~888 `evalProp` call sites are untouched. Only what crosses the wire and sits in the collab base changes.
Keyframes are relative to a synced per-layer **keyframe base `kb`** (absent = `start`, so today's documents need no migration),
not to `start` itself (Q26 decided):

```
wire/base form of a layer's keyframe list:  t_rel = r6(t_abs − (layer.kb ?? layer.start))
wire/base form of a cue-effect keyframe:    t_rel = r6(t_abs − (layer.start + cue.start))   // the cue's ABSOLUTE start, not kb
live form (FM.scene):                       the inverse, with the receiver's own kb and cue.start
```

- **Why `kb`, not `start`.** A head edit (the head grip, A, extend-head, `trimLayerHead`, the head branch of `FM.extendClipTo`,
  Simple's head trim) moves `start` and keeps the animation on the same footage. Relative to `start`, that rewrote every
  relative list on the layer, so a head trim and a friend's keyframe add raced in **both** orders, and a compare on `start`
  caught only one: with the key add sequenced first, the trim's whole-list writes (`kf` is ATOMIC, `js/collab-path.js:262`),
  rebased from a base without the key, passed a compare on the unchanged pre-trim start and erased the key on every device, with
  no line. Relative to `kb`, **writers that move the animation** set `start` and `kb` by the same Δ in the same turn, and **head
  edits change `start` only** (materialising `kb = old start` first when it is absent), emitting start, duration and trimStart
  with no kf path, so they commute with any keyframe edit in either order. Simple's head trim (it never writes `start` and shifts
  `c`'s keys by −L, §3.6) nets to `kb −= L` with `start` unchanged. `applyLive` shifts live lists only on a `kb` change, never on a `start` change. `kb`
  joins the sanitiser (a finite number or absent), the persisted-base form stamp and T15's round trip; `sanitizeSm`'s neighbours
  keep it on every copy route that keeps `start`.
- **Speed still rewrites lists** (`scaleLayerKeyframes`), so a tx that rewrites relative lists (a speed change, a Simple speed,
  "speed so it starts at the playhead") is sent **with its before-values kept** (not `stripBefore`'d,
  `js/collab-session.js:352`, `:357-362`) on those list ops and on `kb`, flagged so that `H.receive` and `H.local` refuse the
  **whole** tx `'stale'` if any compare differs and apply none of it (the `all:1` rule of §10.5, limited to the stale case and
  pulled into 4a; per-op CAS on the lists alone would be wrong, because the host refuses per op, `js/collab-host.js:866-877`, so
  it would apply start and duration and refuse the lists: exactly the uniform shift 4a exists to prevent). The sender's backstop
  reverts the whole speed change with *"Sam just changed this clip's animation, so your change was undone. Try again."* It needs
  the `PROTO` bump beside `SCHEMA_REV` 4. If judged too big for 4a, Simple's speed tools stay off live until Phase 5 and §10.6
  says speed vs a keyframe add can lose the key until then (as it can today between two Full users).
- **The other order: a key written after the rewrite.** The before-value compare above sits only on the rewriting tx, and the
  host runs `cas()` only for `tx.q === 1` (`js/collab-host.js:873-877`; live sends are `stripBefore`'d,
  `js/collab-session.js:350-362`), so a friend's key write computed before a speed change and sequenced after it overwrote the
  scaled list with unscaled times, silently. So each layer gets a synced integer **`kr`** (keyframe revision) next to `kb`
  (sanitiser, form stamp, T15's round trip, `sanitizeSm`'s neighbours). Every tx that rewrites a layer's relative lists
  wholesale bumps that layer's `kr` to max + 1 in the same turn: speed, Simple speed, "speed so it starts at the playhead", a
  ripple rider's rewrite of the camera's or a caption track's keys, and the undo / redo inverse of any of these (monotonic, never
  restored by undo). Every tx that writes a `kf` list (inspector key add, delete, value edit or toggle; a diamond-drag tick and
  its release; a keyframe paste; a Simple key write; their undo and redo) carries only a before-value for that layer's `kr`,
  never the list, so no extra bytes go on the wire, and is flagged stale-compare: `H.receive` and `H.local` refuse the whole tx
  `'stale'` when `kr` differs. Key-vs-key edits do not bump `kr`, so they stay last-writer-wins as today. The sender reverts that
  key step with *"Ezra just changed this clip's speed, so your keyframe was undone. Try again."* (*"…just moved the camera's
  keys…"* for the camera and captions); a mid-drag refusal ends the drag at its restored position. It rides the same `PROTO`
  bump; if `kr` is judged too big for 4a, the fallback stays the one above (Simple's speed and rider tools off live until Phase
  5, said in §10.6).
- **A main-track structure stamp, `project.sm.mrev`** (an integer, absent = 0, through `sanitizeSm`). Split is live from Phase 2
  and writes only `A.duration` plus a clone `B` at an absolute `t` (`js/app.js:4905-4920`), so a split racing a friend's ripple
  of the same clip landed out of place in **either** arrival order (clip 5 = [20,40) split at 30 while clip 2's delete moves it
  −5: A = [15,25), B = [30,40), clip 6 = [35,…), a gap and an overlap, and B's titles on the wrong footage); neither the 4a
  compare nor Phase 5's `all:1` covered it. Every commit that changes the main track's structure bumps `mrev` by 1 in the same
  tx: every arranging plan (and an adoption), Split, a live Append, Make overlay / Make main clip, and the undo / redo inverse
  of any of these. The `s project/sm/mrev` op keeps its before-value and flags the tx with the whole-tx stale rule, so two
  structure edits built on the same base conflict in either order; the sender reverts from its before-values with *"Sam
  changed the clips at the same moment, so your split was undone. Try again."* (*"…your move was undone…"* for an arranging
  step). Split's plan builder also refuses up front while a remote batch is being applied. In Phase 5, Split's refusal re-runs its
  intent (`{op: 'split', id, t}` against the ack-corrected base, `t` mapped through the winning ripple's `f`) like any queued
  arranging intent; Split joins the one-in-flight queue for structure edits only, and stays live from Phase 2. The cost, stated:
  in Phase 4 this also turns "two people ripple different stretches" (§10.6) from a seam chip into a whole-step refusal with a
  line. If the `PROTO` part slips from 4a, §10.6 says so and today's behaviour stays until Phase 5.
- **One collector, so the sets cannot disagree:** `FM.timedLists(layer)` = today's `FM.animatedProps` lists **plus**
  `FM.fxListAnimatedProps(cue.effects)` for every cue in `layer.captions` (walking the cues directly, not all of
  `FM.eachRefFx`, which also revisits `layer.effects`). `FM.animatedProps` itself is **unchanged** (18 callers: clip diamonds,
  the keyframe clipboard, loop settings, split; cue effects have no address grammar there, `js/scene.js:483-500`).
  `shiftLayerKeyframes`, `scaleLayerKeyframes` (`js/scene.js:377`, `:405`) and the wire conversion all read `timedLists`. This
  lands in **Phase 1** (Q3), not 4a: it also fixes the Full bug where moving or re-speeding a caption track leaves animated cue
  effects behind (a deliberate Full behaviour change, logged in POLISH-LOG, with its own test that fails on HEAD). `splitAnimated`
  stays on `animatedProps`; a cue's effect keys travel with the cue into whichever half gets it. T15 asserts `timedLists` equals
  the generic "every `kf` under the layer" walk on a kitchen-sink fixture that includes a keyframed cue effect (also inside a
  filter container), a mask path, a point set, open-path trimStart/trimEnd and audioFx; its positive control drops the cue walk
  and must go red.
- **Cue-effect keys are relative to their cue's absolute start** (`layer.start + cue.start`), deliberately not tied to `kb`.
  Every head writer re-bases a cue's local time (`clipTrimStart` writes `l.start = FM.time` and calls `FM.shiftLayerCues`,
  `js/timeline.js:97`, `:104`; `FM.extendClipTo` does the same, `js/app.js:4893-4894`), so with a `kb + cue.start` base a head
  edit by Δ moved every cue-effect wire value by +Δ and emitted every cue-effect `kf` list (ATOMIC), breaking "a head edit sends no
  list" and bringing back, for cue effects, the key-add race `kb` removed; a friend holding the track with another tool then
  had its lists refused and every device converged with the cue effects Δ early. With the cue's absolute start as the base,
  head edits and window rebases leave it unchanged, while real moves (`shiftUnit`, `riderKeys`, a cue drag) move it and the keys
  by the same amount. **`applyLive` keeps two bases:** the layer's own lists (`FM.animatedProps`) shift only on a `kb` change;
  each cue's effect lists shift by the change in `layer.start + cue.start`, keyed by cue uid (by index before 4a′), computed
  from the values before and after the **whole batch**, not per op, so a head edit's `start +Δ` and cue-start `−Δ` net to zero
  with no transient shift. The `kb` shift never touches cue lists, or a move would shift them twice. `toWire` and `fromWire`
  make the same split. A cue shifted relative to its track is then only start/end ops (§3.5), which 4b lets past a typist's
  lease. A speed-scaled cue still rewrites its keys: a content write, handled in 4c.
- **One boundary, with a named roster, not a list of sites.** **`toWire` never caches:** keyframe writers mutate `k.t` / `k.v`
  in place (`FM.shiftLayerKeyframes`, `js/scene.js:377-380`; `scaleLayerKeyframes`, `:405-414`; `upsertKeyframe`'s `hit.v = v`
  or push-and-sort on the same array, `:308-318`; `FM.shiftTransform`, `:352-370`; the diamond drag's `kf.t = nt`,
  `js/timeline.js:4967-4969`), keeping the layer object, `start` and the array identity, and hot ticks run mid-gesture before
  any `FM.docRev` bump. An identity-keyed cache would hand the diff a stale copy and those edits would stop reaching peers (today
  `view()` passes the live `FM.scene.layers`, `js/collab-bridge.js:116`, which is why the diff sees them). So `toWire` rebuilds the
  relative lists on every call, only for layers that have a timed list and a nonzero base (a layer at base 0 passes through
  uncopied, its wire form equals its live form): for each list in `FM.timedLists(layer)` it emits `{...k, t: r6(k.t − base)}`,
  every other field shared by reference. The diff already walks every kf array every tick, so the copy is the same order of
  cost; it is measured in the existing "921 S8 500-layer project under a 4× CPU throttle" test and at the 2,000-layer cap. Only
  if that fails is a cache allowed, and then only keyed on a value fingerprint computed fresh each tick (length plus a running
  sum of `t`, `v` and `e` over the keys), never on object or array identity or `docRev`.
  **Reads through `toWire`:** `S.view()` (`js/collab-session.js:145`), `docOfSnapshot` (`:1124`, which feeds
  `preSessionStep`'s diff, `:1114-1123`), `release()`'s held-value compare (it compares `D.valueAt(toWire(doc()), p)` against
  `h.b`, the base value, which is wire form; comparing absolute live against it reasserted every rolled-back gesture over the
  friend's change, `:435`, `:369`, the failure the comment at `:400-406` exists to prevent), `C.share`'s base (`:1792-1793`,
  which built the host base from `A.view()` in absolute form, so the owner's first diff re-sent every list), and `fallbackLive`
  (`:1999-2006`). **Writes through `applyLive(op)`,** the existing function at `:538` extended to do the conversion, adding the
  receiver's own base to op values containing a timed list at any depth (so `s` / `li` / `ai` / `ar`-inverse / `d`-restore,
  including `diffKeyed`'s raw `ai` of a newly added keyed effect, audioFx or mask, `js/collab-diff.js:550-578`, `applyAi`
  `:295`): `release()`'s deferred and forced applies (`:441`, `:444`, which called `D.apply(doc(), …)` raw) and the owner's
  comment stamp (`:276`). `D.applyOrder` (`:446`) is order only and exempt. **Leaving collab:** a `fromWire(doc)` (add each
  layer's own base back) runs in `S.myVersion` before its clone (`:1392`) and at every `adapter.saveVersion` caller (the clash
  toast, `:989`; `js/collab-ui.js:4364`; `js/collab-bridge.js:211`), so a "Save my version as a copy" is an ordinary project whose
  animations are not shifted by −start. **Made structural:** a grep test in T15 fails on any `D.apply(doc()` or
  `D.valueAt(doc()` outside `applyLive` / `toWire`, and on any `A.view()` outside `view()`. `captions` is atomic on the wire
  until 4a′ (`js/collab-path.js:262`), so until then the conversion runs on the whole-layer copy before diffing, never by path.
  `collab-diff.js` itself is unchanged: it works on the wire form.
- **The persisted base carries its form.** `persist()` writes `{epoch, seq, cid, D}` with no schema stamp
  (`js/collab-session.js:1335`), and `recoverOutbox` (`:1348-1362`) diffs it before any hello, so a guest whose PWA was killed
  and relaunched on the new build would diff an absolute-form base against a relative view and flood clashes. `persist()` now
  stamps `{rev: C.SCHEMA_REV, form: 'rel'}`; in `C.reopen`, before `recoverOutbox`, a base with a different or missing rev is
  migrated through `toWire` (a pure function of the doc) or dropped, falling back to a snapshot request. `fallbackLive`
  (`:1999-2002`) builds its base the same way.
- **Every writer that moves `start` and means "the animation comes too" moves `kb` with it in the same synchronous turn.** Two
  did not even shift keys: the Full clip drag writes `start` per move and shifted keyframes only on release [checked:
  `js/timeline.js:4138-4146` vs `:5070-5075`], and the AI op's `start` case [checked: `js/ai-ops.js:116`, fixed in Phase 1,
  §8.5a]. **T14 is a named roster, not a generic fingerprint:**
  - **Moves the animation:** the Full clip drag (per hot tick), ai-ops `start`, the inspector start field
    (`js/inspector.js:3466`), `FM.moveLayerToPlayhead` (`js/app.js:5051`), paste / insert-at-playhead (`js/app.js:4468`,
    `js/storage.js:3343`, `:3619`), the timeline nudge (`js/timeline.js:163`), `shiftUnit`. Each, driven on an animated layer,
    must emit `start` and `kb` and no kf-bearing path.
  - **Keeps keyframes absolute** (a head edit: the animation stays on the same footage and project time): `FM.trimLayerHead` /
    `FM.trimClipEdge` head, the head grip, the head branch of `FM.extendClipTo` (`js/app.js:4819-4830`). Each must emit `start`
    (plus duration / trimStart) and **no kf-bearing path and no `kb` change** (beyond materialising it), and the receiver's
    absolute times must equal the sender's.
  - Any other `.start =` writer found by grep must join one list in the same release. `FM.refitGroupsFor` (duration only,
    `js/app.js:826-850`) and `sanitizeTiming` are not start writers in practice. Positive control first: remove the per-move
    shift from the clip drag and the "moves" list goes red.
- **Gestures hold keyframe times in clip time.** The diamond drag records absolute times at press (`orig: kfs.map(k => k.t)`,
  `js/timeline.js:2694`), writes `kf.t = orig + dx/pxPerSec` per move (`:4965-4969`) and restores `orig` on cancel (`:582`),
  so a remote shift landing mid-drag would put the held key back at its old absolute time (a start op is a sibling of the kf
  path, so `overlapsHeld` does not defer it, `js/collab-session.js:517`). Now it records `origRel = k.t − base`, writes
  `base + origRel + dx/pxPerSec`, and restores `base + origRel`. Any other writer that caches keyframe `t` across a gesture
  follows the same rule, and T14 covers them.
- **The one race `kb` does not remove, guarded.** A speed change on a layer races a friend's keyframe edit on the same layer.
  Guard (1): inspector keyframe add / delete / value edits on a keyframed property and the timeline diamond drag publish
  presence **`act: 'kf'`** with `af` = the layer, for the gesture plus ~300 ms (not a lease; it locks nobody out; read by
  `sample()` ahead of `'drag'`, §3.8); `FM.spine.blockers` and the Full speed paths refuse when the plan rewrites a layer's
  relative lists (speed, or a rider rewriting the camera's or a caption track's keys, §3.10) and someone else has `act: 'kf'`
  or `'drag'` on it (*"Sam is animating this clip."* / *"Sam is animating the camera."*), and the keyframe surfaces make the
  reverse check against another person's speed drag. Guard (2), the instant case in **either** order: the whole-tx stale
  compare above catches a key written **before** the rewrite, and the `kr` compare catches one written **after** it. A rider-rewritten list (the camera's, a caption track's own keys) is sent the same way, so a friend's camera
  key added at the same moment is refused as a clash and reverted with a line, never silently overwritten.
- **What it buys:** a move or a ripple sends `start` and `kb` only, never keyframe lists; a head trim sends no list either; a
  keyframe edit and a shift or head trim land on the right frame in either order; and a race that exists today between two Full
  users goes away (collab §9.4 B). **Worth shipping on its own even if Simple never did.**

**4a′. Keyed caption cues (Q2), `SCHEMA_REV` 4 → 5.** A caption track is one layer whose cues are one atomic value
(`js/collab-path.js:262`), and cue words are typed in the leased text editor (`js/collab-presence.js:193`), whose lease the
heartbeat renews for as long as it is open while ‹ › walk the cues (`js/text-edit.js:88-113`, `:754-760`). The host's lease
gate is per layer, whatever the path (`layerOf`, `js/collab-host.js:37-42`; `:834` owner, `:871` guest). So one person
captioning for minutes refused almost every arranging edit of the other ("try again in a moment" was untrue).
- Move `captions` from `ATOMIC` to `KEYED` as `captions: 'uid'`, rewriting the rule-2 comment (`:252-261`) to say it is
  deliberate. `stampIds` already mints and dedupes `uid` on declared arrays before every diff (`js/collab-path.js:315-345`,
  `js/collab-session.js:219`), so no cue-creation site changes (addCue, detect, splitLayer, the text editor's + and its
  auto-created cue, AI ops, templates); an array with a missing or duplicate uid falls back to atomic for that diff. The
  sanitiser keeps `uid` on cues; `normalize`'s sort (`js/captions.js:118`) is fine because keyed arrays carry order.
- The typing device rebinds its cue by uid after a remote batch (`js/text-edit.js:46-77`), and keep-my-frame moves `FM.time`
  by `dt` when the bound cue's start moves. The typist's cue uid rides presence next to `ls` (`cu`, from
  `FM.textEdit.typingCue()`, `js/text-edit.js:873`; old builds drop it).
- Rejected: a short focus lease on the cue list (it adds blocking and misses the grip, ✕, +, Find speech and cue-effect writers).

**4b. A lease protects a layer's content, not its place in time or its membership (C §10.4; Q11 decided), `SCHEMA_REV` 5 → 6.**
The host's lease gate (`js/collab-host.js:834`, `:871`), reading `C.HOST_RULES`, lets through, from anyone, on a layer someone
else has leased:
- `s L/<id>/start` and `s L/<id>/kb` with a finite number;
- `s` **and `d`** on `L/<id>/sm` and `sm/main`, `sm/stay`, `sm/tail`, `sm/twin`, `sm/muteByMode` (membership carries no
  content: a friend's crop on a derived main clip no longer makes adoption land half-way, and Make overlay, switching Stay put
  or Ends with the video off, and adoption clearing a stray main send `d` ops, `js/collab-diff.js:532`, which a `s`-only
  exemption refused);
- **any `{o: 'mv'}` whose `op.id` is leased** (stacking order is placement, not content, for the same reason Q11 gave for
  `start`; `mv` carries no value, only an anchor id; the exemption depends on the op kind, not on the plan, because the diff's
  LIS picks which layer gets the `mv`, `js/collab-diff.js:447-468`, so the refused `mv` could name the leased layer's neighbour).
  This also lets a Full layer-panel reorder and the undo order-restore (§11) move a leased layer, which is intended;
- **on a caption track** (base has `Array.isArray(captions)`), from 4a′: `ai`, `ar` and `am` on `L/<id>/captions`; `s` on
  `captions/<uid>/start|end`; a caption track's `s L/<id>/duration`; and any op whose path is a `kf` list under the track (its
  own timed lists or `captions/<uid>/effects/**/kf`) **only when the holder's presence tool is `text`**. Still refused: any op
  addressing the holder's own cue uid other than its start and end, all cue text and non-kf effect parameters. The owner is the
  host and already has the roster (`hostRoster`, `js/collab-presence.js:509`), so it reads the holder's `cu` and tool kind from
  presence (the lease table, `leases[lid] = mid`, `js/collab-host.js:333`, has no tool kind); with no `cu` known, an `ar` of a
  cue whose text is non-empty and meets the cut range stays refused. Plainly: a friend can add or remove **other** cues of a
  caption track being typed in, which is what a delete, an insert's straddler split (`ai`), a reorder's paste (`am`) and a
  dropped too-short cue (`ar`) need.

Length, trim, speed, content, other keyframe lists and delete (except the existing `lr f:1`) still hit the lease. There is no
"ripple-only" flag: the host cannot tell a ripple from a Full drag, a tx flag is set by the sender so any guest could claim it,
and after 4a and 4c the holder sees the same result whoever moved the clip. Leased tools that work in absolute time (motion
path, graph editor, points, mask; `LEASED`, `js/collab-presence.js:193-203`) re-read the layer's base after a remote batch (T16).

**4c. The pre-flight check, keep my frame, and other people's items.**
- `FM.spine.blockers(plan)` (§3.7) refuses the **whole** command, naming the person, if any layer whose **own fields** it
  would write (length, trim, speed, content, delete) is leased by someone else (from Phase 2), or is being dragged or animated
  by someone else (from here): a remote `pr.ar.ids` (a Simple drag, §3.8), a remote Full `act: 'drag'` with `af` on that layer
  (and, if that layer is in their `sel`, every id in `sel`, covering multi-clip Full drags without widening `af`, which carries
  only `h[0]`), or `act: 'kf'` (on the camera: *"Sam is animating the camera."*). A layer that is only **shifted in time**, an
  `sm` sub-key set or cleared, and any zMove do not block. **A caption track blocks** when the plan removes, splits or rewrites
  the effects of the holder's `cu` (a speed-scaled cue's keys included), or when its holder is **not** in the text editor (a
  graph, motion or other lease) and the plan changes the track's own timed lists or a cue effect's keys; then the command is
  refused whole, naming the holder (*"Sam is typing captions. Try again in a moment."*), and the host keeps refusing as a
  backstop. If `cu` is unknown, it blocks only when a cut range meets a non-empty cue. The runner's §3.7 assert then
  guarantees the host never refuses a piece of a plan the pre-flight passed.
- **Keep my frame** (C §10.5). Where: in `applyIncoming` (`js/collab-session.js:490`), before the loop, when the batch is not
  this device's own and it is not playing or following, snapshot the watched layer (the one a tool is open on, else the
  selection if `FM.time` is inside it): `{id, t: FM.time, src: FM.layerLocalTime(L, FM.time), start, kf0}` (`kf0` = the absolute
  time of its first timed-list key, or null), on `sum.frame`. Act on it in collab-bridge `afterApply` (`js/collab-bridge.js:252`),
  which every path reaches: the owner applying a guest's tx (`hostMessage 'tx'`, `js/collab-session.js:618-626`), the guest
  (`onBatch`, `:888-907`) and queued batches (`drainQueue`, `:1287`). (The old placement, `onBatch` only, never ran on the
  owner, who is usually Ezra.) What: a new pure `FM.sameFrameTime(before, L, t)` in `js/scene.js`: for a video, the `t′` in the
  new window whose `FM.layerLocalTime` equals `before.src` (closed form when flat, mirrored when reversed; bisected on a ramp,
  as `FM.speedAdvanceSolve` does); for a layer with no source, `t + (kf0′ − kf0)`; with no keys, `t + Δstart`; a frame that no
  longer exists clamps to the nearest remaining edge, and a deleted layer leaves `FM.time` alone. Write `FM.time` only when
  `|t′ − t| ≥` half a frame. So a remote Full **head trim** (start moves, the picture at each time does not) leaves the watcher
  where they were, and a remote Simple head trim (start still, source moves) keeps their frame. The remote-ripple glide trigger
  moves to `afterApply` too, keyed on `sum.by`. (The same `FM.sameFrameTime` inverse resolves comment pins, §13 #24.)
- **Other people's items are not deleted behind their back.** Solo, D5 stands. Authorship lives **in the document**, not the
  session (a per-session map was wrong on guests, whose own adds come back through `onAck` with no `by`,
  `js/collab-session.js:909-923`, `:495`, and whose starting document arrives as a snapshot with no attribution, `:996-1024`; and
  it was reseeded "all the owner's" on every `C.share` / resume, `:1786-1795`, `js/collab-ui.js:4890-4910`, with mids that
  change every session, `:4910`):
  1. **`L.by = {mid, name, color}`** (§2.2) is a **creation stamp**, and only a guest's layers carry one: `host.local` never
     writes `by`, and an absent `by` means the owner (or a device he marked as his own, item 4). For every guest `li` the host
     sets `v.by` **by rule, never by "new id"**, to the first of: the `by` already in base (an upsert or re-send; if base has
     none, it stays absent); the entry in the host's **`goneBy`** map; otherwise `authorOf(m)` (`js/collab-host.js:532`, `:555`).
     `goneBy` is a per-host-lifetime map, capped at 2,000 like comments' `gone` (`:429-441`, `:545-547`), recording `{by}` (or
     "none" for the owner's layers) for every layer id removed by any `lr`, owner or guest; when the owner re-inserts an id
     through `host.local`, the host restores the `by` from `goneBy`. So an undo or redo of a delete keeps the original author
     whoever presses it (`invertStep` turns the `lr` into an `li` with `rec.b`, `js/collab-diff.js:666`, which the old "stamp
     every new id" re-authored to whoever pressed undo). The B half of a split takes A's `by`: the host copies it onto a new id
     whose `splitOf` matches a live layer. The host overwrites any `by` a guest sends, validates by whitelist and `LIM.NAME`,
     and refuses as `bad` any guest `s` or `d` whose path is `L/*/by` or under it (a `d` or an `li` upsert without `by` would
     otherwise clear it, `patchObject` deleting missing keys, `js/collab-diff.js:95`). In `applyIncoming` with `own`, when an
     `li`'s `v.by` differs from live, just `L/x/by` is written into live even under a held or pending path, as `commentStamp`
     already does (`js/collab-session.js:507`), so the next diff never sends `d L/x/by` from a guest whose title editor is open.
     `runStep`'s `li` check compares with the ownership and placement fields masked out (§11), so the stamp arriving in the ack
     never makes a guest's own add un-undoable. Copy routes follow §12.2 (kept on keep-routes and split B, stripped on every
     copy route and on template / element save and export), with a whitelist test on every route.
  2. **"Made by me"**: on the owner there is **no set**: "mine" = `by` absent (or a `self` member's layer). On a guest it is a
     device-local set kept in IndexedDB through `FM.storage.collabPut('collab:mine:' + linkedId, [...])`, pruned to live layer
     ids on each save, recording every layer this device creates at `pushLocal` / commit time, before any ack, and surviving
     resumes and new mids. It is dropped, not remapped, on `duplicateFrom` / detach / Save my version, since those copies are no
     longer the linked project. (The old "the project's local metadata" was either the document, which syncs and exports, or
     the index card, which `touchCurrent` rewrites whole on every autosave, `js/storage.js:2447-2466`.)
  3. **"Made by another member"** is decided by **mid**, never by name (names are not unique): a Simple delete keeps a follower
     as `sm.stay` (same start, left out of the ripple) when it is not in the deleter's "mine" and `L.by` names a different mid
     that is not `self`, or when `L.by` is absent and the deleter is a guest without `self`. So a guest's Simple delete keeps the owner's pre-existing items (following D5's spirit: what is not
     yours is not deleted by your delete), and the owner's delete keeps any guest-made item. Solo, `by` is ignored and D5 stands.
     Snapshots, resyncs and resumes carry authorship automatically. The deleter's line: *"Deleted clip · kept Sam's title"* +
     **[Undo] [Show]** (Show selects it). Q24 is decided this way (keep without asking).
  4. **His own devices.** Each device keeps its own mid, and nothing modelled "the same person on another device"
     (`js/collab-ui.js:606`: the profile key is only a hint), so from Phase 4 his Mac and his iPhone treated each other's titles as
     another person's, both ways, in his main two-device test. The owner can mark a member row in the Share panel as
     **"This is me (my other device)"**, saved as `rec.self = true` on `hostRoom.members[rid]` beside `rec.mid` / `rec.role`, so it
     survives resumes and new mids; when a joiner's name matches the owner's, the row offers the mark but never sets it by itself.
     The host stamps no `by` on an accepted `li` from a `self` member, tells that guest `self: 1` in its welcome / role message,
     and the guest stores it on its linked-copy record. A `self` guest's delete follows D5 like the owner's, and the "your title
     was kept" line never fires between the owner and a `self` member. Lines name that member *"your phone"* (`whoWord`, §3.11).

**4d. Seeing it, and lifting the gate (`SCHEMA_REV` 6 → 7).**
- **Remote ripples glide** over 200 ms (the switch's FLIP code) and tint the moved clips in the mover's colour for a second,
  with one line: *"Sam moved 4 clips"* (+ *"including locked Clip 7"* when a Do-it-anyway ran); under reduced motion the glide
  snaps and the tint is a static outline (§8.10). No line for ordinary edits by others, **with one exception**: when a batch
  from another member removes, or sets `sm.stay` on, a layer in this device's `mine` set: *"Ezra deleted a clip — your title
  ‘Hello’ was kept (now Stay put)"*, or, if it was removed anyway (an old build), *"Ezra deleted your title ‘Hello’ — only Ezra
  can undo it"*.
- **On a device in Full** these lines have nowhere to go (`#sm-say` is Simple's tray, and the glide is Simple's FLIP helper), and
  the person who most needs *"your title was kept"* is usually Ezra, the owner, adding titles in Full while a guest arranges in
  Simple. So `FM.spine.say` routes to `FM.toast` when the editor is Full (the collab-bridge toast / `toastAction` path,
  `js/collab-bridge.js:185`, `:208`, `:244`; Full's layout, not Simple's, which is what §3.12's reasons were about): *"Sam moved 4
  clips"* (3.2 s, no button); the exception reads *"Sam deleted a clip — your title ‘Hello’ was kept (now Stay put)"*, and a tap
  selects the title (`toastAction`, 5.2 s: the one Full-side tappable toast, and it lives in Full's own layout). Full does not
  glide: its timeline rebuilds, and the moved clip boxes found through `FM.timeline.host()` get the mover-colour outline for 1 s,
  which is already the reduced-motion form (§8.10).
- **Own-add repair.** When this device's batch is acked and a layer it added in that step now sits outside its §3.6.1 slot
  (its z-anchor, the layer just above, was deleted at the same moment, so `resolveAnchor` returned null and `applyLi` spliced
  it at index 0, the top, `js/collab-diff.js:131-134`, `:458-465`), the runner re-issues that layer's `zMoves` once as a
  follow-up commit merged into the same local undo step, with no toast. It touches only layers this device just added.
- **A silently dead link does not take two ripples.** On a guest, `S.online` turns false only through `markOffline()`: link
  `onclose` (`js/collab-session.js:1439`), a failed `sendToHost` (`:352`), or `liveTick` after `LIM.OFFLINE_AFTER` 6 s
  (`:1490`, `js/collab-core.js:49`; only when `liveness` is set, `:133`, `:1465`, `:1483`). `sendToHost` returns true while
  `link.open` (`:154-157`), so a ripple committed into a dead link is marked sent and later replays `q:1` per op (`:1370`,
  `:345-353`). So (local only, no wire change) each outstanding entry stores `arr` (the runner already commits with `arr: true`);
  while any `arr` entry is unacked for more than ~1.5 s, the arranging tools grey with *"Reconnecting…"*, so a second ripple is
  not stacked into the dead window (Phase 5's 3 s rule, moved forward).
- Seam chips (§5.4) cover whatever still races.
- `FM.spine.liveArrange = true`: arranging works live **while online and while every counting editor is connected**
  (`FM.collab.editorsAllConnected()`, §3.7; otherwise the `away` line). Offline, arranging stays off until Phase 5, because the
  offline outbox replays per-op compare-and-set (`js/collab-session.js:344-355`, `:1363-1368`; `js/collab-host.js:350-387`,
  `:873-877`): a ripple replayed after a friend moved a later clip lands in part. A guest's gate is on whether or not a session
  is attached (a linked copy opened before the link is back counts, §3.7), so neither an offline outbox nor a `recoverOutbox`
  diff carries an arranging step or an adoption before Phase 5.
- The **measuring fuzz** (T11) runs in its `?only=` slice and reports the seam count per 1,000 rounds, per category (live
  race / offline replay / undo skip). That number decides whether Phase 5 comes before transitions.

### 10.5 Phase 5: all-or-nothing (U §10.2 rule 3, with its real size)
- A tx flag `all: 1` means: **if any op in the tx is refused for any reason** (bad, role, gone, lease, CAS clash, a stale
  start, or an `li` / `mv` whose non-null anchor no longer resolves), refuse the whole tx and apply nothing. It is honoured in
  `H.local` as well as `H.receive` (`js/collab-host.js:826-843`, `:866-877`, which today refuse per op and apply the rest; the
  owner's path has no CAS step at all): collect refusals first, call `applyAndFix` only when there are none. The `q:1` compare
  machinery exists (`:350-387`). The runner marks arranging commits with it.
- **One arranging step in flight per device.** While this device has an unacked `all:1` tx, the runner builds no new
  arranging plan: it queues the **intent** (`{op:'delete', id}`), not the ops, and the tray shows a spinner on the tool.
  Queued intents run oldest first, each against the base after the previous ack, so no sent step is ever built on an unconfirmed
  one. Look, text and sound edits are not queued.
- **Undo and redo wait on the same condition:** `S.undo` / `S.redo` return false without consuming a step while the newest
  undo entry (or any `all:1` entry) is unacked, and the buttons show busy. The undo inverse of an arranging step is sent as
  `all:1` with its before-values kept (not `stripBefore`d, `js/collab-session.js:344-361`), so an undo racing a third person's
  unseen change is refused whole (*"Can't undo — Sam changed it since"*) instead of overwriting them (today `runStep` judges
  against a base that already contains the unacked step, `:1140-1160`, `:1205-1211`).
- **On refusal of step N:** revert N from its recorded before-values (safe, since nothing later was built on it); drop it from
  undo; re-run its intent once against the ack-corrected base; then drain the queued intents in order. If the re-run is refused
  too: *"Someone just changed the clips. Try again."*, and the queued arranging intents are discarded and counted (*"2 more
  moves were not made"*). A look edit in flight on a path of N survives the revert.
- **Offline:** the outbox stores `all` per entry (`outstanding.push({cid, ops, all})`) and `flushOutstanding` sends it with the
  `q:1` replay. A refused replay is not re-run (the outbox keeps ops, not intents): that step is reverted, named in the clash
  toast, and the existing "save your version as a copy" offer stays (`:971-992`). **A reloaded guest's work is not made
  all-or-nothing wholesale.** `persist()` stores only `{epoch, seq, cid, D}` (`:1335`), and `S.recoverOutbox` rebuilds one entry
  from the base-vs-view diff (`:1348-1362`), so the step boundaries are gone; sending that as one `all:1` unit would let one
  clash on a Full nudge revert twenty of a Full friend's new titles. So: (1) `persist()` also stores, for each unacked
  outstanding entry with `all`, `{cid, all, paths}` (the canonical path keys of its ops only, not values, so it stays small);
  (2) on reload `recoverOutbox` still diffs base against view, then partitions the ops: an op whose path key is in some
  persisted `all:1` entry's path set joins that entry's group (one group per entry, in cid order), and every other op (the Full
  edits, look and text edits) goes out as today's per-op `q:1` entry; (3) each group is sent as its own `all:1` `q:1` entry, and
  a refusal reverts only that group and names it (*"Your move of 4 clips didn't land — Ezra changed them"*), with the copy
  offer kept; (4) if the persisted stamp is missing or unreadable (an older build, a failed persist), everything goes per-op
  with no `all:1`, today's behaviour (a possible seam chip rather than a wholesale revert). A Full nudge is not an arranging
  step. Unacked for more than ~3 s, arranging tools grey out with *"Reconnecting…"* (4d already does this at ~1.5 s for `arr`
  entries). With this in place the `.online` term leaves the gate; the `editorsAllConnected` term stays unless the optional
  repair below ships.
- **Optional, so the `away` term can later go: own-follower repair.** On the ack of a replayed outbox entry, the guest compares
  each unit it wrote against its pre-reconnect `hostOf` and offset; if the host clip still exists and the unit now sits
  elsewhere, it issues one follow-up move to `host.start + offset`, with the line *"Ezra rearranged while you were offline ·
  moved your title back onto Clip 3"* + **[Undo]**.
- Closes: two people rippling different stretches at once (collab §9.1 row 3), a split racing a ripple (with 4a's `mrev`), two concurrent adoptions (§0.3 row 3), a lease
  granted inside the pre-flight window, a z-anchor deleted under an add, and offline replays.
- A new tx field needs a `PROTO` bump (`C.PROTO = 1`, `js/collab-core.js:24` [checked]).
- Size: a host change on both paths, an async refusal path back to the command, the intent queue, a whole-step revert, undo
  surgery. Medium, not three lines (buildability §3.2).

### 10.6 What is left, said plainly

| Case | After Phase 4 | After Phase 5 |
|---|---|---|
| Ripple (a pure shift) vs a keyframe edit on a moved clip | **fixed** (clip time on the wire) | fixed |
| Head trim of a clip vs a friend's keyframe add / delete / toggle on that same clip | **fixed** in either order: a head edit changes `start`, not `kb`, and sends no list (§10.4 4a) | fixed |
| Speed of a clip vs a friend's keyframe edit on that same clip | refused naming them when presence shows it (`act:'kf'`); the instant case is refused **in either order**: the rewrite carries list before-values (a key written first), and every key write carries the layer's `kr` (a key written after), each reverted with a line (or, if the `PROTO` part slips from 4a, Simple's speed and rider tools are off live until Phase 5, and until then a speed-first order can put keys at unscaled times, as it can today between two Full users) | fixed |
| Ripple vs a friend's keyframe edit on the camera or a caption track's own keys | refused naming them when presence shows it (*"Sam is animating the camera"*); the instant case is refused as a clash and reverted with a line (or, if the compare slips, one list wins: rare, undoable) | fixed (`all:1`) |
| Ripple vs someone typing a caption | goes through; their words are untouched and their cue slides with its frame (4a′); a straddler split, a too-short cue dropped and the cue-effect keys moved all land (4b's caption clause). Refused whole, naming them, only if it would delete, split or rewrite the effects of the cue they are typing in, or if their tool is not the text editor and the track's own keys change | same |
| Caption timing edit vs ripple | merged per cue (4a′); only the same edge of the same cue is last-writer-wins | same |
| Ripple vs a lease visible in time | refused whole, naming them | same |
| Ripple vs a lease granted within the same round trip | the leased clip's own edit is refused, the rest moves: a seam chip (words safe) | refused whole |
| Simple delete of a clip carrying a friend's item (not in use) | the item is kept, Stay put, both people told (§10.4 4c) | same |
| Two people ripple different stretches at the same moment | one is refused whole by the `mrev` compare and reverted with a line (§10.4 4a; a gap or overlap chip if the `PROTO` part slips) | **fixed** (CAS + intent re-run) |
| Split of a clip vs a friend's ripple that moves it | refused whole in either order by the `mrev` compare, reverted with a line (§10.4 4a) | re-run on the new base |
| Per-person undo of a split, a Mute-clip-sound toggle or another multi-layer step vs a lease (from Phase 2) | refused whole with the busy line, step kept (§10.2 door 2, lease half) | same |
| A guest undoes its own add after the host stamped `by`, or after someone rippled or pinned it | undoes: the `li` check masks `by`, `start`, `kb` and the `sm` membership keys (§11) | same |
| Ripple vs a friend's move queued during the command's await | the friend's value wins on that clip; a seam chip and a *"Sam moved ‘Clip 7’ at the same time"* note (§3.7) | fixed |
| Arranged just before a drop, replayed `q:1` | rare: a ripple sent in the seconds before the link is known to be dead replays `q:1` per op on reconnect; clashing clips keep the friend's value, the rest move (seam chip + clash line). 4d greys arranging after ~1.5 s unacked, so a second ripple never stacks into the window | the step is refused whole, named, copy offered |
| Arranging while a friend is offline, then their offline adds and moves replay | refused while any editor is away (the `away` term, §3.7): followers have no stored host, so a replayed title would land over a different clip with no clash | same, unless the optional own-follower repair ships (§10.5) |
| A guest reloads after working offline in Full | today's per-op replay: their titles land, a clashing nudge is reported | unchanged: only persisted arranging groups are all-or-nothing (§10.5) |
| Per-person undo of an arranging step vs a lease or drag visible in time | refused whole, naming them, step kept (§10.2 door 2) | same |
| Per-person undo of the adopting step in a session | the edit undoes; adoption stays (§5.3) | same |
| A Simple add whose z-anchor is deleted at the same moment | lands on top of the stack, then the own-add repair puts it back (4d); a main clip shows ⚠ Put behind meanwhile | refused and re-run |
| Two people move the same clip | last to let go wins, as today; presence shows it coming (`ar`, `act:'drag'`) | same |
| Per-person undo after a friend moved one of the rippled clips | that path is soft-skipped with the soft-undo line (*"Undid, except what Sam changed"*, §11); a seam chip shows | the undo is refused whole |
| Per-person undo of an add or delete after a friend restacked | only this step's own layers go back to their places (§11); the friend's order stays | same |

Every case converges (the engine guarantees identical copies) and none loses a clip or typed words **without a named line**
(a friend's item is kept, not deleted; a delete that did remove it says so). If real sessions still show seams often,
**Phase 8** is C's derived layout, which makes seams impossible at the cost of changing Full. It is designed so it can be
added without touching Simple's UI: commands and screens talk to plans, not to where `start` comes from.

### 10.7 Roles, joining, switching mid-session
- Roles are unchanged. A Viewer's Simple tools are disabled exactly as Full's doors are (`roNow`, `js/timeline.js:2200`;
  `openAdd`'s guard, `js/mobile.js:399-402`). "Ask to edit" works in both editors; a grant turns the owner's arranging gate on
  from the next edit (§3.7).
- A guest opens the shared project in their own remembered editor, or `project.sm.home`. The owner cannot force an editor on
  anyone: it is a view.
- **Switching mid-session** is local, with the same refusal predicate as solo (§6.2): presence `ed` updates, open exclusive
  tools close (releasing their leases), the text editor flushes. The friend sees the glyph flip and nothing else.
- **A guest whose media has not arrived:** the media manifest entry now carries `w`, `h` and `dur` (`scanLocal` fills them from
  the media record; `wireEntry` sends them, `js/collab-media.js:359-363`; `takeEntry`, `:366-399`, keeps only finite numbers,
  0 < w,h ≤ 16384, 0 ≤ dur ≤ 86400, dropping the three fields, not the entry). The guest keeps a meta-only record per layer
  (`FM.media.meta(lid)`) that `fillsFrame` and `FM.maxDurForSource` read, so classification matches the owner's and
  extend-trims clamp to the real source length instead of `Infinity` (`js/timeline.js:2335`). Filmstrips appear when the bytes
  land. With neither record nor meta, while the manifest still lists the media as coming, a clip is undecided (arriving, §5.2).
- **His own Mac and iPhone in one session.** A link joiner who is not already a member gets `settings.linkRole || 'editor'`
  (`js/collab-ui.js:2501`, `:359`), so his own phone is an editor member and arranging greys on both devices in Phases 2-3.
  That is the gate working (the phone really can race); the fix is two deliberate taps: the owner's `live` line's **[Options ›]** menu holds **Make Sam a
  Viewer** (§3.11, `U.setMemberRole`), and the Share panel's "Whoever you give the link to… as an Editor" setting
  (`js/collab-ui.js:3170`, `:1724-1731`) is where he can make link joiners Viewers ahead of time. V6 and V12 draw this
  own-devices case at 380 and 1280 px. The `live` line names his phone *"your phone"* (`whoWord`, §3.11), and from Phase 4 he can
  mark it **"This is me (my other device)"** in the Share panel, so D5 treats it as his own (§10.4 4c item 4).

---

## 11. Undo

- **One history for both editors** (Resolve shares one stack, pro §4). Solo, it is the existing snapshot stack
  (`js/history.js:25-29`, 120 steps); `sm` is inside the snapshot, so it undoes for free.
- **One Simple command = one step**, including adoption, ripples, cue edits, follower deletes and a Do-it-anyway unlock. A drag
  is one step (written on release, §3.8).
- **Switching editors is not a step** and does not clear the stack. ⌘Z after a switch undoes the last edit made in either editor.
- **Labels say where an edit came from, in a session too** (C §11). `FM.history.commit(meta)` (`{label, ed, arr}`) passes `meta`
  to `FM.collab.afterCommit(meta)` → `S.afterCommit(meta)` → `closeStep(meta)` (`js/collab-core.js:321`,
  `js/collab-session.js:1102-1109`, `:1264`; today none takes an argument), which stores `label`, `ed` and `arr` on the step.
  `runStep` copies them onto the step it pushes (`:1221`), so redo keeps the name. `seedPreSession(snaps, metas)` takes the solo
  label array beside the snapshots, and `preSessionStep` attaches `metas[preIdx]`. **The return stays a plain boolean**:
  `S.undo` / `S.redo`, `C.undo` / `C.redo` and `FM.history.undo` / `redo` return true if a step ran and false otherwise (the solo
  path, which returns undefined today, `js/history.js:325-326`, now returns true / false too; every failure path, empty stack,
  `runStep`'s early exits and no session, `js/collab-session.js:1233`, `:1240`, `js/collab-core.js:327-328`, stays `false`). The
  step's metadata goes in `FM.history.lastStep = {label, ed, soft}`, set just before the return on every path (null on a false
  return); `S.undo` passes it up as `S.lastStep`, as `S.lastSoftPath` already works (`:1228`). No caller changes, and
  `if (!ok)` checks keep working (the one reader, `tests/tests.js:33539-33540`, gains an `ok === true` assert). **One line per
  undo:** when `soft` is set, `runStep` does not toast; the caller builds one `#sm-say` line (§3.12): *"Undid, except what Sam
  changed"* + **[Close gaps]** (the full wording, *"Undid: camera move · part left alone — Sam changed it
  since"*, in its `title`). Unlabelled steps say plain *"Undid"*. This also covers a stopped session still holding the
  handover until another project opens (`js/history.js:285-288`, `js/collab-core.js:243-267`, `:326`, `:354-357`). The line
  after a Simple edit names what Undo brings back: *"Deleted clip and 2 things on it"* + **[Undo]**.
- **Undo pressed while a command is running** is queued, never lost and never diffed half-way (§3.7): Split then ⌘Z inside the
  await commits the split as its own step and then undoes exactly that step.
- **Adoption is not undone once anyone else has changed the project since** (§5.3, `meta.adopt`, `S.othersSeq`), in a session
  or after one while undo is still handed to it: the edit it rode on undoes, adoption stays.
- **In collab** undo is per person (`js/collab-session.js:1140-1182`). After 4a, undoing a ripple is start values only. A
  soft-skipped path leaves a seam chip. Simple never tidies by itself. Arranging steps are gated like commands (§10.2 door 2),
  and from Phase 2 every multi-layer or structural step runs the lease half of the pre-flight (§10.2 door 2a).
- **Undo of an add survives placement changes.** An `li` rec stores `after: canon(L)`, the whole layer as one string
  (`js/collab-diff.js:462`), and `runStep` keeps the op only while `canon(cur) === rec.after` (`js/collab-session.js:1157-1160`),
  otherwise refusing and consuming the whole step (`:1177-1183`). Every ripple (`start`, `kb`), every pin (`sm.stay`), every
  adoption or Make overlay (`sm.main`), and the host's `by` stamp arriving in a guest's own ack (`:502-505`) broke that
  compare, so from Phase 4 an add became un-undoable the moment anyone arranged, and from 4c a guest could never undo its own
  add. So an `li` rec is compared with its **ownership and placement fields masked out on both sides**: `start`, `kb`, `by` and
  the `sm` membership keys (`main`, `stay`, `tail`, `tailEnd`, `twin`, `muteByMode`) are dropped from `canon(cur)` and from the
  stored `rec.after`, which is stored masked at diff time. When the masked values match, the op is kept and the layer removed; if
  the unmasked values differed, it counts as `soft` and sets `S.lastSoftPath`, so the line reads *"Undid (Sam had moved it)"*,
  or *"Undid, except what Sam changed"* when other paths were skipped. Only a content difference (text, crop, keys, effects,
  `trimStart`, `duration`, `src`) keeps today's hard fail and its *"Can't undo — Sam changed it since"*. Under Phase 5's
  `all:1`, the undo's `lr` is sent with the masked before-value, so the host's check uses the same mask.
- **Undo restores only its own layers' order.** Today any tick with an `li`, `lr` or `mv` records the whole base id list in
  `orders` (`js/collab-diff.js:469`), and `invertStep` pass 2 restates all of it from `a:null` (`:672-682`; `moveAfter` puts
  `a:null` at index 0, the top, `:135-141`). So Ezra's undo of a delete after Sam added a title on top sent Sam's title to the
  very bottom, behind every main clip, invisible on every device. Now pass 2 takes the first order statement in the step as
  `base`, and for each key the step moved (`mv`/`am`) or removed (`lr`/`ar`) emits a move placing it after the nearest earlier
  key of `base` that exists in live, `a:null` only if none; keys outside that set get nothing. Pass 1's `lr`/`ar` inverse uses
  `firstSurviving(rec.anchors)`, as `invert()` already does (`:613`). Solo this still rebuilds `base` exactly (the unmoved keys
  are already in order), and the Tier-1 property test over 200 seeded scenes must stay green. In `runStep` (`:1173`), a `mv`/`am`
  whose layer's current predecessor is not `rec.aAfter` (someone moved it since) is soft-skipped with the soft-undo line (above).
- Undo pressed mid-drag is ignored until release (as today). An arranging undo in a session runs the same lease / drag
  pre-flight as a command (§10.2 door 2).

---

## 12. Export, templates, captions

### 12.1 Export
- **Phases 1–5 add no render feature.** A Simple project is an ordinary project. The only render-path changes before Phase 6
  are Full fixes that help both editors: Follow and layer-reference effect sources resolved through the split lineage (Phase 1,
  §3.10 rule 1), Bounce ignoring boundary keys (Phase 2, §3.10 rule 3) and the de-click continuity fix below (Phase 2). A gap exports as the
  background colour, as today. The export sheet hides "Export just this layer" and "Selected clip only" in Simple.
- **One de-click fix, before any ripple ships (Phase 2).** `seamAt` treats any touching split siblings as continuous and skips
  both 45 ms ramps (`js/app.js:1901-1919`; `prerollAtSeam` `:1964-1966`; the exporter, `js/exporter.js:657-665`). Simple's trims,
  middle deletes and reorders routinely make split halves touch where the footage jumps, which pops (#148) in preview **and**
  export. `seamAt` now also requires continuity: same media and `mediaRev`, same `reversed`, and the earlier half's source
  out-point (`trimStart + FM.layerSourceAdvance(duration)`) equal to the later half's `trimStart` within one sample (1/48000 s),
  in the same order in time and in source. One change in app.js; the exporter already reads `FM.declickSeamAt` (§3.9 inv. 6).
- **Phase 6 adds two renderer features, used by both editors and the exporter** (so a Full user and the export see them too):
  - **Transitions that do not shorten clips** (U §12, D13): `trIn = {type, d}` on the incoming main clip. Over
    `[cut − d/2, cut + d/2]` the renderer draws the outgoing clip past its out-point and the incoming clip before its in-point,
    blended. **Clip times never change**, so the main-track maths is untouched. **The shared gates are not widened** (Q10):
    `FM.isLayerVisibleAt` (`js/scene.js:1127`) and `FM.layerLocalTime` (`:1068`) keep their exact windows, because hit-testing
    (`js/canvas-edit.js:245`, `:259`, `:805`), the play-start wait (`js/app.js:2546`), the thumbnail picker
    (`js/storage.js:2189`), camera / adjustment / mask lookup (`js/compositor.js:15746-16175`), the tracker, captions and every
    audio path rely on them (about ten callers rely on the `null` outside the window). Instead: `FM.transitionAt(t)` returns
    `{out, inc, p, type}` or null, and **owns validity**: it reads **stored flags only, never the classifier** (whose answer
    depends on media records and can differ on a guest before loading): it looks only at layers with both `sm.main` and `trIn`
    on a project where `project.sm.adopted` is true, through a small index rebuilt on `FM.docRev` inside the renderer,
    independent of `FM.spine.read`; the outgoing clip is the `sm.main` layer whose end is within eps of `inc.start` (the lowest
    in the stack if several). It returns null on an un-adopted project, before the first clip, and unless `out` and `inc` are
    consecutive main clips whose seam is a join (never across a gap, slot, overlap or blend), and uses
    `d_eff = min(trIn.d, 0.5·min(out.duration, inc.duration))`, so the windows on neighbouring cuts can never overlap (it is the
    owner of §13 #20). The stored `d` is never rewritten by a trim or speed change, so undoing a trim brings the old length
    back. The exporter uses the same function, so preview and export agree. `FM.handleLocalTime(layer, t)` returns the
    source time past the window, clamped to the source (a held first or last frame when there is no handle). Only three places
    use them: one transition pass in the render loop beside the cull (`js/compositor.js:16159-16167`), the exporter's frame path,
    and a picture-only seek in `setTime` / `seekAllVideos` (`js/app.js:2087`, `js/exporter.js:263-270`). `sanitize` drops `trIn`
    on adjustment, camera, group and audio layers. A canvas tap during a transition selects the clip whose own window holds `t`.
  - **Sound is picture-only in Phase 6:** audio hard-cuts at the cut exactly as today, with the de-click ramps; during the
    overhang the outgoing `<video>` is seeked for its picture but stays muted (the gate at `js/app.js:2163` keeps using
    `layerLocalTime`). Neither mixer changes (`js/audio-play.js`, `js/exporter.js:581-729`), so preview and export agree by
    construction. A matching audio crossfade (equal-power, in the one envelope `FM.declickSeamAt` and the exporter share) is a
    **Later** item with its own picture for him.
  - **In the overhang** the outgoing clip holds its state at the out-point (keyframes and `clipAnim` Out at their end) and the
    incoming clip holds its state at the in-point; an Out animation ending at opacity 0 just shows less of that clip. Full draws
    a ◇ on the join, so a picture past a bar is explained.
  - **`clipAnim`** In / Out / Combo on any visual layer: transient transform/opacity on the clip-local clock, the same shape as
    text's `textAnim` presets (`js/compositor.js:2592-2601`). Layer presets deliberately exclude `clipAnim`, as they already
    exclude `textAnim` (`js/inspector.js:561-583`).
  - **Turn into a transition** on a blend seam (§3.1): meets the two clips at the middle of the overlap with no ripple (tail
    trim of `a` to `b.start + amt/2`, head trim of `b` by `amt/2`), sets `b.trIn = {type:'crossfade', d: amt}`, in one step.
    Before trimming it records `hostMap`: every follower of `b` with `start < b.start + amt/2` moves to the new `b.start` (D6's
    slide-forward: that footage frame is gone, so it keeps its host); V9's strips say so. It removes the keys inside
    `[b.start, a.end]` from **every** property `isBlend` counted (transform opacity and a fade or dissolve effect's keyframed
    params), and removes a fade or dissolve effect entirely if it then has no keys left. **It never leaves `{kf: []}`**:
    `isAnimated` is true for any `{kf: [...]}`, even empty (`js/scene.js:43`), and `evalProp` returns 0 for an empty list
    (`:74`), so a plain two-key fade-in would draw `b` at opacity 0 for its whole length. A property with no keys left gets its
    static value back: the value `evalProp` gave just outside the overlap on that clip's own side (for `b`, its value at the old
    `a.end`; for `a`, at the old `b.start`).
  - **Transitions follow the clips they sit between.** Delete, Reorder, Make overlay and Make main clip drop `trIn` from every
    clip whose outgoing neighbour changed (the clip after the removed or moved one, the moved clip itself, and the clip that now
    follows it); the line adds *"· removed 1 transition"* (§3.6). `onSplit` drops `B.trIn`; `onCopy` drops `trIn` on every copied
    unit, and Simple's Duplicate / paste put back only `sm.main`, never `trIn` (§13 #16). The Transition picker, Length and Use on
    every cut are look-class rows in §3.6 (they adopt first on an un-adopted project); Turn into a transition arranges.
  - Split handles both (the `onSplit` hook). `SCHEMA_REV` bump, because old builds would not draw them, **and `SM_V` bumps with
    it** (and with any later phase that adds render fields), because `SCHEMA_REV` guards only live rooms: a Phase 6
    `.fmotion.json` or template opened on an older build would otherwise export hard cuts without a word. From Phase 1,
    `applyScene`, template use-as-new and the export sheet show one non-blocking line when `project.sm.v > SM_V`: *"Made with a
    newer FreeMotion. Transitions and clip animations may be missing — update first"*.
- A test renders every seam and animation boundary through `FM.renderScene` and the exporter's frame path and compares; in
  Phase 6 it also compares the export's audio against the preview's sounding set at `cut ± d/4`, and taps the canvas at
  `cut + d/4` (the incoming clip is selected; `layerLocalTime` still returns null past `end`).

### 12.2 Templates and elements
- A template pack keeps `sm` in its layers and `project.sm` (top-level keys survive `packFromProject`, model §9), so a Simple
  template opens in Simple with its main track intact.
- **Save stamps the opening editor on the copy.** `templates.save`, `templates.update` and project-file export set
  `pack.project.sm.home` (and `sm.v` if absent) on the **copy** from the saving device's `FM.editor.homeFor(card, project)`,
  never on the live document, so a switch still writes nothing and nothing syncs; a template built in Simple from a project
  created with the Full card then opens in Simple for whoever uses it (§7.1 writes `home` only at create).
- **Where media may be left behind, the output copy carries the native size.** `.fmotion.json` export when a file is omitted over
  `EMBED_LIMIT` (`js/storage.js:944`), template and element pack save, and the collab clone stamp `srcW` / `srcH` / `srcRev` from
  the live record, only when the revs match, into the **output copy**, never into the live scene, so an import or pack with
  omitted media still classifies correctly and no commit, undo step or guest tx carries a backfill (§14.2).
- **Copy routes: which keep `sm.main` and which strip it.** `FM.spine.onCopy(copies, route)` takes the copied units and walks
  group descendants (a duplicated group clones members with `cloneLayer(d, true)`, `js/app.js:4330-4337`); it is never called
  inside `reIdLayers` or `cloneLayer`, which serve both kinds of route.

  | Keep (the whole project moves) | Strip `sm.main`, `sm.tail` + `tailEnd`, `trIn`, `pick` and `by` (a copy at the same time would be a second main clip, a second tail, a transition nobody chose; whoever makes a copy owns it) | Packs: `onCopy(units, 'pack')` |
  |---|---|---|
  | import (`applyScene`, `js/storage.js:1698`), template use-as-new (`_adopt`, `:3203`), project duplicate / detach / Save my version / checkpoint restore (`duplicateFrom`, `:2631`), split (except `sm.tail` on the head A and `trIn` on B, §3.6; B keeps A's `by`, §10.4 4c) | duplicate, duplicate in place, paste (`js/app.js:4444-4453`), extract audio, AI clone (`js/ai-ops.js:467`); `sm.stay` and `sm.muteByMode` are kept. `by` is also stripped on template save / update and element save (`packFromProject` copies layers raw, `js/storage.js:3025-3026`, so friends' names and colours travelled in template files) | **one route, `FM.spine.onCopy(units, 'pack')`, called by both `templates.insertInto` and `elements.insert` in both editors**: strips `sm.main`, `sm.tail` and `tailEnd`, `sm.muteByMode` (keeping `muted`, so the host's mode turning off never un-mutes an inserted clip), `trIn`, `pick` and `by`, and for elements `sm.stay` too (`reIdLayers` keeps every top-level key, `js/storage.js:2044-2060`, and both inserts only re-id, shift and concat, `:3340-3347`, `:3614-3620`, so a pack song with `sm.tail` was stretched to the whole video on the next Simple arranging edit). Simple's template insert then re-flags the main units it splices and gives the pack's music `sm.stay` only. Element insert: **never main** |

  The Simple Duplicate and paste of main clips (§3.6, §8.3) are the one deliberate exception: they put `sm.main` back (never
  `trIn` or `sm.tail`) and say so. `karaokeOf` is repointed when a clip and its twin are copied in separate calls (§4.6).
- **Comment pins travel with their clip on every re-id route.** `reIdLayers` (`js/storage.js:2044-2060`) remaps parent,
  `splitOf` and behaviour ids but not comments, and `applyScene`, `duplicateFrom` and `_adopt` copy `project` raw
  (`:1702-1703`, `:2631-2641`, `:3197-3203`). So `FM.remapCommentPins(project, oldLayers, map)` runs in all three (they already
  hold `re.map`), before the project is installed: each comment's `lid = map[lid]` when mapped; when not mapped, `t` is baked to
  `CM.pinTime(c)` against `oldLayers` and `lid` / `lo` / `ls` are deleted. Listed in the keep-routes row as "comments remapped".
- **Inserting a template in Simple** runs through `FM.spine.edit` as an arranging command. Order inside the one command:
  (1) **classify the pack by itself**, through the same pure `classify` on the pack's own layer list, **before** re-id (so its
  group parents resolve inside the pack and a colliding id cannot pick up a group from the open project), with sizes read
  from the pack's own files (for each `pack.media[oldId].file`, the width and height from the same decode `hydratePack` does,
  `js/storage.js:2112-2119`, into a local size map passed to `classify`), because `insertInto` splices first and hydrates after
  (`:3345-3348`), so `FM.media` has no records for the new ids yet and an old pack with no `srcW` would be all undecided; a pack
  layer with no file in `pack.media` is **missing**, never undecided (§5.2). It uses `pack.project.sm.main` only when
  `pack.project.sm.adopted` is set, and derives against `pack.project`'s size otherwise. In the pack, a full-frame picture is
  **not** a main candidate when its `blendMode` is a non-mask, non-normal mode (screen, add, overlay…) or its static opacity is
  below 1 (keyframed opacity still counts, so hand crossfades work): a light leak, a full-canvas PNG frame or a one-video
  transition is placed as an overlay; (2) strip every incoming `sm.main` (`FM.spine.onCopy(units, 'insert')`); (3) splice the
  pack's main units at the cut nearest the playhead (Insert, with ripple and cue map; a blend seam there refuses as Insert does)
  and write `sm.main` back on exactly those units in the same step when the host project is adopted (otherwise the next adoption
  derives them). Every other unit is placed by the side-aware bands (§3.6.1), not concatenated at index 0 as today
  (`js/storage.js:3333-3347`, `:3608-3620`), with its offset kept relative to the spliced clips; **two or more members that are
  not audio-only and not caption tracks and share one start** are wrapped in a group carrying **`sm.unit: true`**, a
  moves-together group (§2.5: not a block, so each title stays editable from its own tray, and the template's text slots,
  which template-fill already knows, `js/template-fill.js`, can be retyped in Simple), which follows its anchor as one (§4.1). The
  pack's music, a caption track and a camera are never wrapped: the music takes `sm.stay` at the insert offset, and the caption
  track stays a separate caption track.
- **Inserting an element in Simple** never splices: every element layer loses `sm.main` in both editors and each element unit
  is placed by the §3.6.1 bands as overlay, text, effect or audio at the playhead; nothing ripples. An element with two or more
  visual layers (not audio-only, not caption tracks) is wrapped in an `sm.unit` moves-together group (§2.5), so a lower third's
  name and bar stay one piece on one host and each stays editable; an element with one visual layer plus sounds makes no group,
  and its sounds link to that layer as the anchor through the same rule. An element has no `project`, so it is never "adopted"
  (§2.3).
- **A pack's camera is always dropped in Simple.** `templates.insertInto` (`js/storage.js:3346`) and `elements.insert`
  (`:3617`) drop the pack's camera only when the scene already has one, and shift its keys to the playhead (`:3618-3619`), which
  in Simple would add a `fullOnly` item that moves the whole picture: the one route §8.8 and §8.5a left open. When the insert
  runs through `FM.spine.edit`, the camera is always dropped and the line adds *"· its camera move was left out (Open in Full
  to use it)"*. Full keeps today's rule.
- **Into Full:** the same `onCopy(units, 'pack')` strips inserted layers (`js/storage.js:3333`, `:3608`), so a second main
  track, a stretched pack song, a stale mute mode or a foreign author never arrives on top of the project.

### 12.3 Captions
- One caption track = one layer = one style for every line (CapCut's "apply to all" is free). In Simple it is the Captions
  section; it rides the main track cue by cue (§3.5). Not one track per clip (C §12): restyling "all my captions" would mean N
  tracks, against his #151.
- **Find speech** runs the existing detector, which finds *when* someone speaks and makes empty cues to type into
  (`js/captions-vad.js:4`). The sheet says so in one line. Writing the words is **Later**, not faked (#152).
- Stacked caption tracks all show (#574); several tracks are several lanes in the section.
- **A caption track stays with the sound it was timed from** (§3.5): Find speech on a stay-put voice-over or song marks the
  track Stay put in the same step, so captions never drift off the voice when clips are rearranged.

---

## 13. Edge cases

| # | Case | Handling |
|---|---|---|
| 1 | Keyframes across a split | `FM.splitLayer` already cuts every keyframed property (model §6); the `onSplit` hook adds only `trIn` / `clipAnim`, clearing `sm.tail` on A and repointing a karaoke twin's `karaokeOf` |
| 2 | Speed ramp on a main clip | a "look"; Speed shows *"Speed changes over the clip"* + **Use one speed** (keeps the length); ripples use the clip's real duration |
| 3 | Reversed clip | both trim commands go through `FM.trimClipEdge`, which swaps the head and tail source rules (§3.6); `splitLayer`, the grip, A/D and `extendClipTo` already branched, and now share it. (The old "nothing new" was true of the grip, false of `trimLayerHead` and the tail row) |
| 4 | Negative start on the first clip | drawn from 0; Simple never writes one; **Fix** / Close all gaps moves the track to 0 |
| 5 | Two or more main clips with the same start | before adoption only through the import-stack rule (§5.2), after it from a stray flag; drawn as a stack with an overlap chip (*"Lay them end to end"*), ordered by pick, then stack, then id; ripples choose by order, so they never swap (§3.4) |
| 6 | Main clip hidden, muted or solo | hidden: drawn dimmed with an eye badge, still on the track, ripples as normal, and **Show** in the tray clears it (§5.4); before adoption a hidden full-frame clip that fits a seam is derived as main (§5.2 pass B), and a hidden clip overlapping a visible main clip is a dimmed overlay; muted: a speaker-off badge (cleared from Volume); any solo shows the *"Solo is on"* chip (§5.4) |
| 7 | Locked layer a command would move or change | refused whole, naming how many by kind, with **Do it anyway** (D7): unlock, edit and re-lock in one step (§3.7). Rider-only writes (the tail fit, the camera and caption riders, `sm` flags, panel property writes) are exempt; a block with a locked member is locked as one. **Unlock** in the tray clears it for good (§5.4) |
| 8 | Main clip parented to a null | a "look"; still main (transform parenting does not fold it into a unit, §2.5); the null moves only when all its main children move together, else the couplings question (§3.10) |
| 9 | Behaviour or effect referencing another layer | a "look"; ids never change; a follower that references `v` takes `v`'s host, other broken timing asks first, and deleting a referenced layer is refused (§3.10) |
| 10 | Wiggle / oscillate behaviours on a moved clip | behaviours run on the project clock (`js/behaviors.js:138-154`, `:255-272`, `t` is scene time). Music stays put, so a behaviour timed to the song stays on the beat; a moved item may enter mid-swing instead of from rest. Canvas **effects** with the same names (Wiggle, Shake, Drift, Orbit…) run on the clip clock, `FM.fxLocalTime` (`js/scene.js:800-806`), and travel with their clip. Accepted (Q4 decided); a clip clock for behaviours would break music sync and re-render every Full project |
| 11 | Audio-react driven by the music | music stays put, so the timing it reacts to does not move |
| 12 | Camera | `fullOnly`; excluded from project length already (`js/app.js:852-870`); **its keyframes ride the main track** through each command's map with `FM.spine.riderKeys` (boundary keys built like `splitLayer`'s, clean steps at a cut, holds over inserted material, loop-aware, carried through Append), and its window moves too unless it starts at 0 (§3.10 rule 3); never given `sm.stay`/`sm.tail` at adoption; its `parent` is never a coupling. A camera set to Stay put keeps absolute times. A pack's camera is dropped on insert in Simple (§12.2) |
| 13 | Adjustment layer over several clips | one over two clips follows its start clip; one over three or more clips (`isLong`) is Stay put (with Ends with the video if it covers the whole track). One that sits below every main clip it overlaps is a `behind` item and keeps its place (§3.6.1). Effect segments are clamped to stay inside their clip (§4.3, Q5 decided) |
| 14 | Caption cue straddling a deleted clip | mapped through `f`; a cue covering the whole deleted span keeps its outside parts joined (§3.5) |
| 15 | A cue's own animated effects | carried by `FM.timedLists` when the track moves whole, by the cue's own affine map otherwise (§3.5) |
| 16 | Full duplicate / paste of a main clip | the copy loses `sm.main` (and `sm.tail` and `trIn`) and becomes an overlay (`onCopy`); Simple's ⌘D / ⌘V keep it on the main track, without a transition (§8.3) |
| 17 | Full split | `onSplit` runs inside `splitLayer`, so it is right in both editors |
| 18 | Extract audio / karaoke | a sync twin (`isTwinOf`: `karaokeOf`, or `sm.twin` plus the same name, size and type) that gets the same trim, speed, split and reverse as its clip, with `karaokeOf` repointed on split and duplicate; a drifted twin gets *"Sound out of step · Line up"* (§4.6); twins never build a reversed frame cache |
| 19 | Group made from main clips in Full | a main block on the main track if it must render as one and its main members are consecutive; a mixed block otherwise; a plain group is transparent (§2.5, §5.2) |
| 20 | Very short clips | `MIN_LEN = max(1 frame, 0.1 s)`, compared with 1e-6 slack, on every command, split and speed included; Full's split refuses halves under 0.1 s from Phase 1 (Q28); clips already under `MIN_LEN` follow §3.1's rule (acted on, never shortened further); transitions clamp to half the shorter neighbour at draw time, in `FM.transitionAt` (§12.1) |
| 21 | Source shorter than the slot (replace, template fill, missing file) | the length clamps and the difference ripples as a tail trim (§3.6); the picker always runs before the runner (§3.6 Replace); a missing file shows the existing offline look with **Replace…** and never blocks arranging (§5.2) |
| 22 | Still images | default length from Settings (`FM.defaultLayerDuration`, `js/app.js:2736`); extendable without limit |
| 23 | Project length | still `FM.autoFitDuration` (`js/app.js:852`); Simple keeps music and whole-video items on the main-track end with `sm.tail` (§4.5); the black band shows only what deliberately runs past it, with **End with the video** |
| 24 | Markers, loop in/out, comment pins | **Comment pins stay on their footage.** At `CM.add` (`js/collab-comments.js:138-141`), with **one anchor rule shared by both editors**: the anchor is (1) the selected layer if it covers `FM.time`, otherwise (2) the main clip under the playhead from the read model (`FM.spine.mainAt(t)`, the same `R.mainAt` the runner uses, `start − eps ≤ t < end − eps` over clips and slot entries), otherwise none (a gap, or past the track end: `t` only, absolute by design, like benchmarks). (`CM.add` took `lid` only from the selection, and its one caller is the comment card, `:431`; Simple's usual commenter, a Viewer tapping the video's bubble, has nothing selected, so most pins were absolute and drifted on the next ripple.) For the anchor it writes `ls = round3(FM.layerLocalTime(layer, t))` (source seconds, `js/scene.js:1068`) for a video with a source, otherwise `lo = round3(FM.fxLocalTime(layer, t))` (the clip clock, which already carries `fxTimeOffset`, `:800-806`). The host (`COMMENT_KEYS`, `js/collab-host.js:428`; not writable, `:81-83`) accepts either only with `lid`, finite and within 0..86400, and strips it otherwise. **One resolver, `CM.pinTime(c)`:** candidates are the `lid` layer plus every layer sharing its `splitOf` lineage (the `FM.clipAt` scan with its cheap `!p.splitOf` gate, `:786-797`; `FM.duplicateLayer` drops `splitOf`, so copies never match); with `ls`, the candidate whose source window (`[trimStart, trimStart + layerSourceAdvance(duration)]`, ordered for `reversed`) holds `ls`, returning the `t` where `layerLocalTime === ls` through the same `FM.sameFrameTime` inverse 4c uses (closed form when flat, mirrored when reversed, bisected on a ramp); with `lo`, the candidate whose `[fxTimeOffset, fxTimeOffset + duration)` holds `lo`, returning `start + lo − fxTimeOffset`; if none holds it (trimmed away), the nearest candidate edge; with no candidates left, `c.t`. Source time does not change under a split (A keeps the id, `js/app.js:4865-4876`), a head trim in either editor (`FM.trimLayerHead`, `js/timeline.js:4033-4046`) or speed, so a pin stays on its footage through all of them without a write; the card label, tap and layer name (`:508-515`), the ruler marks (`:282`, `:320-327`) and Simple's timeline all use it and name the resolved layer. `t` is never rewritten, and old comments without `ls`/`lo` stay absolute as today. Copy routes remap pins (§12.2). **Caption cues:** when the anchor is a caption track and a cue covers the playhead, `CM.add` also writes `cu` = that cue's uid (the 4a′ keyed uid) and `co = round3(localT − cue.start)`, clamped to the cue's length; the host's `COMMENT_KEYS` accepts `cu` (uid shape) and `co` (finite, 0..86400) only together with `lid`, and strips them otherwise; `CM.pinTime` resolves `cu` first (the cue by uid in the `lid` layer's captions → `layer.start + cue.start + min(co, cue.end − cue.start)`, through `fxTimeOffset` as `lo` is), falling back to `lo`, then `c.t`, if the cue is gone; `FM.remapCommentPins` keeps `cu` / `co` whenever `lid` is mapped. (A caption track's `lo` is on the track clock, and a ripple moves its cues while a spanning track keeps its window, so `lo` alone drifted off the cue.) **Benchmarks stay absolute** by default (D19 A, recommended): music stays put (D4) and benchmarks are most likely on beats (the playhead-top button is built for tapping beats while the song plays, `js/app.js:6737`, queue 690), and keeping `project.markers` (an atomic array) out of every ripple means a ripple never conflicts with a friend dropping one; Simple draws them and M adds them (§8.3). **Option B, specified in case he picks D19 B, "moments in clips" (V10 draws A and B side by side):** `FM.toggleMarkerAtPlayhead` (`js/app.js:1564`), when a main clip covers the marked time, also stores `lid` plus `ls` (source seconds, for a video with a source) or `lo` (clip clock), with the same fields, rounding and host whitelist as a comment pin; `m.t` is never rewritten, so a ripple still never writes `project.markers` and the no-conflict argument holds. `CM.pinTime` is generalised into one resolver, `FM.anchoredTime(obj)`, used by comments and markers, and every reader of `m.t` calls it: Simple's ruler, Full's ruler, `snapMove` / `snapEdge` (`js/timeline.js:649`, `:671`), `FM.timelineSnapPoints` (`js/app.js:1635`), `updateReadout`'s on-mark yellow, and the "already here?" test in `toggleMarkerAtPlayhead` (it compares resolved times, so a tap removes the mark he sees). The thumb pin stays absolute; old markers without `lid` stay absolute. Either way, V10's picture adds one line about marks of the other kind (under A: *"a mark you put on a moment in a clip stays at its time when clips before it are removed"*; under B: *"a mark you tap on a beat with no clip under it stays at its time"*), because under his usage B a benchmark left on the music after a Simple ripple would pull snaps and the skip buttons to the wrong frame. **The loop region follows its footage** (§3.6.2). The pinned-thumbnail marker (`thumb:true`, `js/app.js:1570-1590`) stays, since its image does not change |
| 25 | Canvas size change | the existing `FM.rescaleProjectContents`; `FM.docRev` bumps, so classification re-runs; the frame test re-runs |
| 26 | A 2,000-layer project (the collab cap, `js/collab-host.js:565`) | the classifier is O(n log n) and cached; the timeline draws only the visible time range; open sections cap at 3 lanes + N (§8.2) |
| 27 | An oversized ripple | one commit = one tx, never split (`js/collab-session.js:285-300`, `:344-355`); a guest tx over `TX_OPS` / `TX_BYTES` or any value over `OP_VALUE_BYTES` is rejected whole as `rej [['*','bad']]` (`js/collab-host.js:223`, `:235-241`, `:851-854`), never half-applied, and from Phase 2 the guest is told and resynced at once (§10.1, Q29). The runner measures the real diff and refuses first with a clear line (§3.7). Before Phase 4 a guest cannot arrange in a session at all (the gate refuses `live` before `tooBig` runs). From Phase 4 a ripple is about one `s` per moved item; whole cue and keyframe arrays still matter for the per-value check; the end-to-end case is a Phase 4 test (T16). (Q15 decided) |
| 28 | Old build in the room | `SCHEMA_REV` keeps it out. An old build editing offline syncs `sm` faithfully but does not strip it on copy; a stray `sm.main` is ignored until `project.sm.adopted` (§2.3), and after it shows as an overlap chip at worst. A newer `sm.v` opens read-only (§2.3) |
| 29 | Switching with the text editor open, drawing, Edit Group, playback | text flushed, tools closed, group exited, playback continues; a live drag or an export refuses the switch (§6.2) |
| 30 | Undo right after the adopting edit | solo: removes the edit, the flags and `project.sm.adopted` together, back to un-adopted; in a session the edit undoes and adoption stays (`meta.adopt`, §5.3) |
| 31 | Same project in two tabs, different editors | each tab shows the editor it chose; the last deliberate switch in any tab wins for the next open (localStorage is shared); the storage `rev` counter (`js/storage.js:50-133`) stops one overwriting the other |
| 32 | A `.fmotion.json` from someone else | carries `sm`; opens in `project.sm.home` on a device that never saw it (chosen again after `applyScene`, §7.2) |
| 33 | 20 photos picked | each gets the default length, end to end |
| 34 | Keyboard focus in a text field | A/S/D/E/Delete ignored, as today |
| 35 | Picker order on iOS | the browser's order; Sort by date taken (from `taken`, EXIF / `mvhd` first, §7.3); reorder (§3.6) |
| 36 | A Full-made item added after adoption that spans the whole video, or three or more clips | long (`isLong`): it does not follow at command time (§3.2 rule 4) and is pinned `sm.stay` in the same step (with `sm.tail` when its span then ends at the track end, §4.3); every Delete whose span it overlaps cuts that span out of it through the delete map (§3.6 cases i-iii; trims never cut it, §3.2 rule 4), trimming its source head to match and re-timing its keys (§3.6: *"kept 1 item that runs on, trimmed to match"*); a two-clip straddler is not long and follows its start clip (Q8 decided) |
| 37 | End card or logo after the last clip | a tail item: follows the end of the track (§4.3); Stay put pins it |
| 38 | Captions found from a voice-over or song | the track stays put with it (§3.5) |
| 39 | Hand-made crossfade from Full | a blend seam: kept by every command that keeps both clips beside each other, its owned keys moving with the seam; refused, or turned into a cut and said, otherwise (Insert, Reorder, Split and Speed refuse; Delete may close it to a join); trims stop at `2·amt`; never tidied, no chip (§3.1, §3.6) |
| 40 | First arranging edit while a friend holds a lease on a main clip or a long item | adoption lands whole: 4b exempts `sm` set and delete, and `mv` (§10.4) |
| 41 | A Full-made item sitting in a gap after adoption | pinned Stay put by the next arranging edit (§4.3, Q9 decided) |
| 42 | Effect phase integrals (Turbulent Displace, Fractal Warp, Starfield twinkle) on a moved clip | they integrate from project time 0 (`js/compositor.js:9683-9692`, `:5672`); a ripple by `dt` adds a constant to the phase, so ramps start and stop on the same footage frames and only the noise pattern differs; preview and export agree; Snow & Rain integrate from the clip's own start (`:10945-10949`). The same as a Full move today (Q7 decided) |
| 43 | A project with no full-frame clip (text and shapes) | an empty main row reading "+ Add clips"; Append asks *Behind everything* or *After what's here* (§3.6) |
| 44 | Clips with no media record | **arriving** (a guest still receiving, before hydration settles, under loading's 25 s): undecided, and arranging over it waits. **Missing** (omitted from an import over EMBED_LIMIT, never finished saving, a record that fails to decode, a cleared store): classified from document fields, drawn in place with the offline look and a **No footage** badge, **Replace…** in its tray, never blocks arranging (§5.2) |
| 45 | A plain "Titles" group spanning several clips | its own layer is bookkeeping: never a host, a follower or flagged; its members follow one by one; deleting a clip deletes only that clip's followers and the runner refits the group (§2.5) |
| 46 | A title card between two clips (a slot) | a slot entry in the main track: it ripples as one piece, its members follow it, Close gap never runs over it (§3.1) |
| 47 | A-roll with B-roll cutaways on top | the long base keeps its place as the main clip (it has sound, or the cutaways leave gaps), the cutaways are overlays that follow it; a silent still under clips laid end to end is a `background` (§5.2) |
| 48 | A letterbox background, the base of a double exposure, a keyed clip's plate, an adjustment or mask-include below the clips | `behind` items: never lifted by the z pass, drawn in the Behind section, never a `mainInFront` anomaly (§3.6.1); a blended or keyed upper take never displaces the base (§5.2) |
| 49 | A clip in a statically scaled plain group, or parented to a scaled null | `fillsFrame` measures the world box through the parent chain (`FM.worldBox`, §5.2), so a picture-in-picture made that way is an overlay |
| 50 | Everything grouped with a fade, or a clip + title intro in a sliding group | a wrapper block (edited as if transparent, its look re-fitted) or a main block (§5.2); never "+ Add clips" over one hatched block |
| 51 | A split song | only the later piece keeps Ends with the video; an old build's double flag is repaired on the next arranging edit (§4.5) |
| 52 | A 20-clip reorder on the phone | edge auto-scroll carries the drag past the first screen (§3.8); Move earlier / later do it without a drag (§8.5) |
| 53 | An exact join after many off-grid ripples | landed bit-exact, so no 1-ulp black frame reaches the export (§3.1, invariant 13) |
| 54 | Several files picked at once in Full | all start at one time (`js/app.js:3040`, `:3074`): an import stack, not a take; drawn as one stack with *"Lay them end to end"* (§5.2, §5.4). Simple's own `+` lays them end to end from Phase 1 (§15.1) |
| 55 | A positive gap under half a frame between two clips (a hairline) | drawn as a join, no chip; landed shut whenever a command moves it; Close all gaps closes it only when a frame time falls inside (§3.1) |
| 56 | Lyrics as separate text lines timed to a stay-put song | *"Moved 6 texts with their clips"* + **[Keep on the music]**; at adoption a lyric-shaped run gets `sm.stay` (§4.1) |
| 57 | A clip reframed or cropped in Full, or panned to frame its subject | still main: `fillsFrame` accepts a panned zoom-to-fill by area and a cropped clip by its uncropped box (§5.2); in Simple a reframe adopts (§5.3) |
| 58 | A video at opacity 0 kept for its sound, or a masked face-cam | not a main candidate (`drawsPicture`), kind audio when it has sound; a mask shrinks the box `fillsFrame` measures and keeps a masked upper take from winning (§5.2) |
| 59 | His own Mac and iPhone in one session | the phone is *"your phone"* in every line (`whoWord`); marked "This is me" it counts as the owner for D5 (§10.4 4c) |

---

## 14. Code plan

### 14.1 New files (plain `<script src>`, no build, global `FM`, each with a `?v=` buster)

| File | What | Size (est.) |
|---|---|---|
| `js/spine.js` | `FM.spine`: `classify` (pure, sweeps), `read` (cached), `adoptPreview`, `adopt` (returns its paths), `hostOf`, `isLong`, `ripple`, join re-seating, cue riders and the piecewise `g`, one plan builder per command (§3.6), `edit` runner (single flight + FIFO of 4 with undo/redo entries, gate, lease / drag blockers, couplings, `tooBig`, `pinStrays`, tail fit with `mapLayerKeys`, time landing), `compose`, `drain`, `blockers`, `blockersForLayers`, `canArrange`, `setFlag`, `setMembership`, `onCopy`, `onSplit`, `riderKeys`, `itemWord`, `say`, `MIN_LEN`. **No DOM**, so the suite drives it headless | ~900 |
| `js/editor-mode.js` | `FM.editor`: `mode`, `set(mode)` (body class, memory, dispatch, crossfade then morph), the play-bar button, key E, presence `ed` feed, the #974 animation pool | ~350 |
| `js/simple-timeline.js` | `FM.simpleTimeline`: `init`, `rebuild`, `updatePlayhead`, `abortGestures`, the fixed sections box and lanes (3 + N), the Behind section, main filmstrip (through the shared `stripFor` cache), slot entries, seam chips (≥ 32 px), link line, black band, benchmark marks, gestures (tap, hold-drag reorder and lift with edge auto-scroll, trim grips with DOM-only preview, pinch, fling), its own mid-gesture guard and `gesture()` feed, visible-range drawing, the FLIP helper shared with remote-ripple glides, its `host()` answer, roving-tabindex focus | ~1,600 |
| `js/simple-tools.js` | `FM.simpleTools`: project tools row, the permanent tray row with `#sm-say` (§3.12), panels (sheet on phone, band or rising sheet on PC, D20) through `openCategory`, the thin Speed panel, the Length and Move rows, `FM.shiftProp` rows, the Look tool (filter strip + Adjust), the Effects flow (§8.5c), empty and loading states and first-run hint | ~1,050 |
| `js/spine-words.js` | every string Simple shows, one object (§8.9) | ~150 |
| `styles.css` block | `body.ed-simple` rules at both breakpoints (phone `:3826+`, PC `:6275+`) | ~500 |

### 14.2 Changes to existing files

| File:line | Change | Phase |
|---|---|---|
| `index.html:591` `#timeline-panel` | `<div id="sm-timeline" hidden>` beside `#timeline`; `<nav id="sm-tools" hidden>` | 1 |
| `index.html:528-560` `#transport` | the `⇄` editor button at slot 3 (Simple, per D18), per D2 in Full | 1 |
| `index.html:711-767` `#hm-dialog` | the two editor cards; the folded `More ·` row | 3 |
| `index.html` script tags | the four new files (spine after `scene.js`, simple-timeline after `timeline.js`, simple-tools after `inspector.js`, editor-mode before `app.js`); every changed file's `?v=` bumped (ship.sh gate) | 1 |
| `styles.css` | `body.ed-simple`: hide `#vb-layers`, `#vb-camera` and the `#t-sel` layer actions; the stage clamp; touch sizes | 1 |
| `js/timeline.js:5210` `rebuild()`, `:5355` `updatePlayhead()`, `abortGestures` | first line dispatches to `FM.simpleTimeline` in Simple. Export `pxPerSec` (`:1096`), `drawFilmstrip` (`:990`), `drawWaveform` (`:961`), `clipColorOf` (`:493`), `snapT`, the fling code, `trimZonePx` (`:4276`). Add `FM.timeline.host()` (§10.3), `gestureLive()`, `FM.timeline.stripFor` over the one bounded `stripCache` (`:546`, `:2135-2175`, §8.1), and `FM.timeline.edgeScroll` factored out of `clipEdgeScroll` / `trimEdgeScroll` (`:4217-4300`) with its four brakes; Full's two loops call it (§3.8) | 1 |
| `js/timeline.js:3881-3960`, `:86-127`, `:4033-4046` | `FM.trimClipEdge` extracted from the grip, returning `fxShift`; the grip, `clipTrimStart` / `clipTrimEnd` and `FM.trimLayerHead` call it and write `fxShift` through `FM.shiftLayerFxClock` | 2 |
| `js/timeline.js:201-214`, `:5301` `clipKey`, `:5306` `syncKeyRail` | A/S/D per §8.3's table in Simple; the key rail's Simple rule | 2 |
| `js/timeline.js:1495`, `:4758` context menus | Simple's own items (§8.8) | 1 |
| `js/timeline.js:2694`, `:4965-4969`, `:582` `kfDrag` | hold keyframe times in clip time (`origRel`) | 4a |
| `js/timeline.js:4138-4146`, `:5070-5075` | the clip drag shifts keyframes per move from its origin; nothing at release | 4a |
| `js/mobile.js:271-294` `dockSheet`, `:48-90` `syncSheet`, `:398` `openAdd`, `:206` `#m-del` | dock to the Simple timeline's bottom edge in Simple; `openAdd` unchanged in Phase 1 (Full's Add sheet, §15.1) and routed to the Clips tool from Phase 2; `#m-del` never shows in Simple | 1 / 2 |
| `js/collab-presence.js:725-734`, `:786`, `:990-1004`, `:1012`, `:1020`, `:1091-1110`, `:1346-1353`; `js/collab-comments.js:309-311`, `:574`; `js/collab-media.js:1325` | draw through `FM.timeline.host()` | 1 |
| `js/collab-presence.js:81` `ACTS`, `:236` `sample`, `:243-248` `act`, `:280-297` `cleanPr`, `:509` `hostRoster`, `:366-371` `holderOf` | `ed` (1); `PZ.heldByOther` (2); `act:'arrange'` + `ar`, `act:'kf'`, `cu`, the holder's tool kind, and `sample()`'s fixed order export > type > kf > arrange > drag (4) | 1 / 2 / 4 |
| `js/collab-ui.js:526-529` `startFollow` | close exclusive tools and flush the text editor first | 1 |
| `js/collab-comments.js:138-141`, `:282`, `:320-327`, `:508-515`; `js/collab-host.js:81-83`, `:428`, `:524-530`; `js/storage.js:1702`, `:2641`, `:3203` | comment `ls` / `lo`, the lineage resolver `CM.pinTime`, `FM.remapCommentPins` on the three re-id routes | 2 |
| `js/app.js:878` `refreshAll` | `FM.simpleTools.sync()` inside the chain, not beside it (ui §5 hazard) | 1 |
| `js/app.js:941-965` `syncSelectionChrome` | in Simple: no `m-editing`, `sel-mode` or `sel-multi`; `sm-has-sel` instead (hides ✎ by visibility, #171); the phone top bar keeps the project name | 1 |
| `js/app.js:3595-3627` `FM.cancelGesturesOn` | also calls `FM.simpleTimeline.abortGestures` in Simple | 2 |
| `js/app.js:4976-5066` | `FM.seamKey(p, t) → {key, nextBez}` and `FM.divideSegment(p, t1, t2)`, factored out of `splitLayer`'s seam-key code (its `b.bez = mine` tail write included), every built key stamped `split: 1`; `splitLayer` keeps calling it (§3.10 rule 3a) | 2 |
| `js/behaviors.js:240` `followValue`; `:157-190` `bounceDelta` | Follow resolves its target through `FM.clipAt` at `t − delay` (§3.10 rule 1); Bounce filters `split` keys in its non-lineage path when ≥ 2 unmarked keys remain (§3.10 rule 3). Both Full changes with their own POLISH-LOG lines and proof tests | 1 / 2 |
| `js/compositor.js:8449`, `:8530`, `:8615`, `:8704`, `:8153` | one helper `refLayerAt(scene, srcId, t, selfId)` for every layer-reference effect source and the collide source (§3.10 rule 1); `applyParentChain` and `FM.worldBox` take the optional classify index | 1 |
| `js/app.js:4229-4276` `snapshotPNG` | `FM.renderStill({t, soloId, scale}) → Promise<Blob>` factored out; `snapshotPNG` = `renderStill` + download (§3.6 freeze note) | 7 |
| `js/history.js`; `FM.jobEnd` | `commitSeq`; `unmute()` drains (deferred with `queueMicrotask`) when `muteDepth` reaches 0 with no job; `FM.jobEnd` drains when it returns 0; queue entries stamped (§3.7) | 2 |
| `js/app.js:7562`, `:7620`, `:7658` `pcTransportLayout` | move ⇄ into `#t-home`; leave the `#t-sel` layer actions out in Simple; ⋯ stays in `#t-far` | 1 |
| `js/app.js:8585ff`, `:8656-8675`, `:8740-8820` keys | E, Tab, arrows, M, and `FM.simpleKeyScope` right after the `inEdit` check (`:8664`, `:8671`; §8.10 item 4a) (1); A/S/D/Delete, ⌘D/⌘C/⌘V, Alt+←/→ per §8.3 (2) | 1 / 2 |
| `js/app.js:8319` `openCanvasDialog` (published `:8424`) | the "Editor: Simple · Full" row, hidden while the preview switch is off | 1 |
| `js/app.js:1901-1919` `seamAt` / `declickGain` | continuity required before skipping the ramps (§12.1) | 2 |
| `js/app.js:3013` `addMediaLayer` (was cited `:2972`), `:2992-3005`; `:5470-5476` `handleFiles` | accept `{main: true, at: T, noCommit, noSave}` (placement from `FM.spine`; `{main}` is ignored when the media has no picture, the §2.3 rule at add time, and the caller routes the record to Music, §7.3); `handleFiles` takes `{at}` from Simple (Phase 1: each file at `T`, then `T +=` its length, §15.1) and stamps every layer of one pick `pick: {b, i}` (§5.2); write `srcW`/`srcH`/`srcRev` and `taken` (§7.3); `audioOnly: true` when the media has no picture. Same `audioOnly` in Add ▸ Audio, `FM.sfx`, `FM.voiceRec` | 1 / 2 |
| `js/app.js:4658` `replaceMedia`, `:4270` duplicate, `:4527` paste, `:4607` undo restore; `js/collab-media.js:1207` | split `replaceMedia` into `FM.pickReplacement` + `FM.swapInMedia({noSave})`; every route that sets a new media record writes `srcW`/`srcH`/`srcRev` beside the `mediaRev` bump (`:4712`) and sets `audioOnly` from that record (§2.2). `srcW` / `srcH` / `srcRev` are written **only** inside the step of a route that sets a media record (addMediaLayer, Add ▸ Audio, `FM.sfx`, `FM.voiceRec`, `swapInMedia`, duplicate / paste with their copied record) or inside a Simple command or adoption, for layers that step already touches. **Nothing backfills them into the live document**: an absent value is not a mismatch, a disagreeing local record wins at read time with no write (§5.2 order (a)), and output copies carry them (§12.2). (The old "a record that loads with a mismatch refreshes them on the next commit" wrote size fields onto every media layer of an old project inside an unrelated undo step, in Full too, and rode inside a guest's tx.) | 2 |
| `js/app.js:1648`, `:2566`; `js/storage.js:494` | `&& !l.audioOnly` in the reverse-cache guard and both warmers (§3.6 Reverse) | 2 |
| `js/app.js:2880` `insertLayer` | unchanged; Simple inserts only through `FM.spine.insertAt(layer, slot)`, which sets `FM.addAt`, inserts and restores it (§3.6.1) | 2 |
| `js/app.js:4855` `splitLayer`, `:4860`, `:4914-4930` | optional `t`; the edge guard raised from 0.02 s to 0.1 s (Q28, 1; `js/app.js:4905` in today's tree); after B is built `FM.spine.onSplit(A, B, t)`; the caption branch factored into `FM.captions.splitAt` | 1 / 2 |
| `js/app.js:4313` duplicate, paste (`:4444-4453`), `:1007` `extractAudio`, `js/ai-ops.js:467` clone | `FM.spine.onCopy(copies, route)` (§12.2 table: strips `sm.main`, `sm.tail`, `trIn`, a foreign `by`); `extractAudio` sets `sm.twin` (the karaoke tool needs none, `karaokeOf` is its link); `duplicateLayer` takes `{noSave}` | 1 / 2 |
| `js/app.js:3730`, `:3532-3545` `deleteLayer` | a `silent` flag (no toast, no `rehomeOrphans`) for the runner | 2 |
| `js/app.js:4783+` `extendClipTo` | calls `FM.trimClipEdge` | 2 |
| `js/ai-ops.js:116` `case 'start'` | shift keyframes with the start (an existing bug) | **1** |
| `js/ai-ops.js`, `js/ai-manifest.js`, `js/ai-chat.js:18-20`, `:73-99`, `:126-141` | Simple vocabulary, the three Simple verbs, `applyOps`' `intents` in Simple mode, `applyTurn` async in Simple, `FM.spine.compose` (§8.5a) | 3 |
| `js/app.js:5147` `layerMenuItems` | Make overlay / Put in the clip row; Stay put, through `FM.spine.setMembership`, which runs through the runner (§4.4) | 3 |
| `js/inspector.js:5850-5880` speed slider | extract the flat branch into `FM.setClipSpeed(layer, sp)` (same code); the slider calls it | 1 |
| `js/inspector.js:3619` `catsFor`; `:5788-5838` `spdSolve` | a `simple` filter hook; the solve buttons hidden in Simple | 2 |
| `js/fx-browser.js:241-248`, `js/fx-registry.js:163-166`, `:663`; `js/app.js:3406-3415` | the `simple` target mode (pick first, filter by `supportsLayer`, route by `ADJ_OK`), `FM.addEffectSegment`, `inst.sm` (§8.5c) | 3 |
| `js/scene.js:347-369` | `FM.shiftProp` beside `FM.shiftTransform` | 2 |
| `js/compositor.js:2375-2420` | `FM.worldBox(layer, t, scene)`, sharing its matrix code with `applyParentChain` (§5.2) | 1 |
| `js/storage.js:440-449`, `:458-474`, `:1700-1739`; `js/loading.js:28-36` | `FM.storage.hydrating()` and the `mediaState` facts (arriving / missing), each settling bumps `FM.docRev` (§5.2) | 1 |
| `js/inspector.js:6862` `refresh()`, `:6904-6919` no-selection branch | in Simple on PC, render `FM.simpleTools` instead of the Add menu; on the phone it stands down | 1 |
| `js/addmenu.js:219` `TABS`, `:966` `render` | a `tabs` / `exclude` option so Clips and Sound reuse the tab contents | 3 |
| `js/shortcuts.js:29-58` | a Simple list for the ? sheet | 1 |
| `js/settings.js:106`, `:550-568` | the "Simple editor" preview switch row (`state.simpleEditor`, in the saved-keys whitelist); its flip handler calls `FM.editor.apply('full')` on the open project when it goes off and `FM.editor.apply(homeFor(...))` when it comes back on (§15.1) | 1 |
| `js/storage.js:1633` `sanitizeImportedLayers`, `:899` load; `:1500-1502` `sanitizeEffects` | `sanitizeSm(l)` to the canonical form, reading document fields only (§2.3), also on the ordinary load; `srcW`/`srcH`/`srcRev`, `taken` (a constant bound, never `Date.now()`), `sm.tailEnd`, `pick`, `by`, `kb` and `kr` (4a); an effect instance's `sm` kept only when `=== 1`, top level and container children; `trIn` / `clipAnim` in Phase 6 (types from a list, durations clamped) | 1 |
| `js/storage.js:1028` `sanitizeProjectFields` | `project.sm`: `v` a finite integer clamped to [1, 1000] (never to `SM_V`), `adopted` true or dropped, `home` any string ≤ 32 characters (a non-string dropped), `muteClips` true or dropped, `mrev` a non-negative integer (4a), unknown plain keys kept (§2.3) | 1 |
| `js/collab-bridge.js:147` project invariant | clamps `project.sm.v` to the host's `SM_V` in a live room only (§2.3) | 1 |
| `js/storage.js:2447-2465` `touchCurrent` | writes `clips` only when adopted or in Simple, from the cached read (§7.4) | 3 |
| `js/storage.js:943`, `:975` export / `dataURLToFile` | optional: `lm` in each media record and `lastModified: md.lm` on rebuild (§4.6) | 2 |
| `js/storage.js:2540-2595` `FM.projects.create`; `:3167-3205` `_adopt`; `:1984-1995` `importObject` | `opts.editor` → `project.sm`, index `editor`; `FM.editor.chooseFor` after the document is final | 3 |
| `js/storage.js:3333`, `:3346`, `:3608`, `:3617` template / element insert; `:3025-3026` `packFromProject`; `:944` export | `FM.spine.onCopy(units, 'pack')` in both editors; `by` stripped and `project.sm.home` / `srcW` stamped on the saved copy only; in Simple, the pack insert command (§12.2): template classified purely from its own files before re-id, then strip and re-flag; elements never main; the pack's camera always dropped | 3 |
| `js/template-fill.js:261-270` | Replace through Simple's Replace in an adopted / `home: 'simple'` project | 3 |
| `js/captions.js:517-531` `detectRow` | mark the track Stay put when its source stays put (§3.5) | 3 |
| `js/home.js:2893` `createFromDialog`, `:1351` `projectCard` | the cards, the synchronous picker + pending buffer, the chip, ⋯ Open in Simple / Full | 3 |
| `js/history.js:272-277` `mute`, `:275` `commit()`, `:325-326` undo / redo | `beginEdit` / `restorePreEdit(pre)` in place (§3.7); `{label, ed, arr, adopt}` kept beside the snapshot and passed to collab; undo / redo queue themselves while muted or in a job; boolean returned, `{label, ed, soft}` on `FM.history.lastStep` (§11) | 2 |
| `js/scene.js:377`, `:405`, `:560-600` | `FM.timedLists(layer)` (with cue effects); `shiftLayerKeyframes` and `scaleLayerKeyframes` read it; `animatedProps` unchanged | **1** |
| `js/scene.js` | `FM.sameFrameTime` (also used by `CM.pinTime` from Phase 2) | 2 / 4c |
| `js/collab-core.js` next to `othersHere` | `othersCanEdit()` (the persisted roster via `U.roomEditors()`, `waived`, the guest `ended` guard, `C.isLinkedCopy`); `FM.collab.editorsAllConnected()` (4d) | 2 / 4 |
| `js/collab-ui.js:59`, `:2496-2507`, `:2534`, `:2868`, `:565-571` | expose `U.roomEditors()`; Arrange anyway (`waived`); the `live` line's Make Sam a Viewer | 2 |
| `js/collab-core.js:143-216` `SCHEMA_FIXTURE` / `DERIVED_FIXTURE`, `:208-216` `schemaFingerprint` | a layer with `sm: {main: 'yes', stay: true, row: 2, future: {a: 1}}` and a project with `sm: {v: 1, home: 'nope'}` (`home` kept; a second fixture with `home: 5` dropped); the fingerprint also hashes `SM_V`, and from Phase 4 `P.canon(KEYED)`, `P.canon(ATOMIC)` and `C.HOST_RULES`; re-pin `SCHEMA_FP` (so the '921 S1 SCHEMA_FP gate' test fails when the rules move); Phase 6 adds out-of-range `trIn` / `clipAnim` | 1 / 4 / 6 |
| `js/collab-session.js:145`, `:276`, `:369`, `:435-446`, `:538`, `:1124`, `:1335`, `:1348-1362`, `:1392`, `:1792`, `:1999-2006` | `toWire` (no cache) / `applyLive` / `fromWire` and the named roster; `kb`; cue-relative keys; the persisted base's `{rev, form}` (§10.4 4a) | 4a |
| `js/collab-session.js:1102-1110`, `:1112-1127`, `:1140`, `:1193`, `:1212`, `:1221`, `:1227ff`, `:1232-1233`, `:1264` | `arr`, labels and `adopt` on steps; the gate, the `st.adopt` filter and (4c) the blockers check in `runStep`; `busy()` guards in `S.undo` / `S.redo` / `runStep`; the owner branch's `r.rej` | 2 / 4c |
| `js/collab-session.js:926-930`, `:945`, `:971-990`, `:1103-1110` | Q29: `'*'` refusal → resync, one line, drop undo steps by cid; count `'limit'` refusals (§10.1) | 2 |
| `js/collab-session.js:1335`, `:1348-1362` | the persisted `{cid, all, paths}` stamps and the recovered-outbox partition (§10.5) | 5 |
| `js/collab-diff.js:469`, `:613`, `:672-682`; `js/collab-session.js:1173` | undo restores only its own layers' order (§11) | 4a |
| `js/collab-path.js:252-262` | `captions: 'uid'` keyed (4a′) | 4a |
| `js/collab-host.js:834`, `:871` | the lease gate reads `C.HOST_RULES`: `start`, `kb`, `sm` (set and delete), `mv`, and on a caption track `ai`/`ar`/`am` on the cues, cue `start`/`end`, the track's `duration` and (text-tool holder only) its kf lists (§10.4 4b) | 4b |
| `js/collab-host.js:532`, `:555`, host `li` path | stamp `L.by` on a guest's accepted `li` by rule (base's `by`, then `goneBy`, then `authorOf`); `goneBy` for every `lr`; refuse a guest's `s` / `d` on `L/*/by`; split B takes A's `by`; no stamp for a `self` member (§10.4 4c) | 4c |
| `js/collab-diff.js:462`; `js/collab-session.js:1157-1160`, `:502-507` | an `li` rec stored and compared with `start`, `kb`, `by` and the `sm` membership keys masked out, a placement-only difference soft (§11); the own-ack path writes `L/x/by` into live (§10.4 4c) | 2 / 4c |
| `js/collab-session.js:490`, `:1103`, `:1114`, `:1140` | `S.othersSeq`; `st.seq`; `runStep` drops `st.adopt` paths when `S.othersSeq > st.seq`, active or not (§5.3) | 2 |
| `js/collab-session.js:1448-1459` `helloMsg`; `js/collab-presence.js:509-521` `hostRoster` | hello `ob`; roster `ok` per member and `ab` for absent counting editors (§3.7) | 4d |
| `js/collab-ui.js:568`, `:640-646`, `:3292-3308`, member rows | `U.setMemberRole` (setPeerRole + noteRole + redraw); `U.leaveKeep`; the "This is me (my other device)" mark, `rec.self` | 2 / 4c |
| `js/collab-comments.js:138-141`; `js/collab-host.js:428` | `CM.add`'s anchor rule (selection, else `FM.spine.mainAt`), `cu` / `co` on caption cues, whitelisted with `lid` (§13 #24) | 2 |
| `js/ai-ops.js:153-169` `createLayer` | in Simple, add-type ops queue as intents through `compose` (§8.5a) | 3 |
| `js/media.js` (after `:857`) | `FM.isoBoxes`, the top-level box walk shared by `FM.soundTrackInFile` and the `taken` reader (§7.3) | 2 |
| `js/collab-session.js:490`, `js/collab-bridge.js:252` | keep my frame; remote-ripple glide trigger; the guest's `mine` set in IndexedDB; outstanding entries' `arr` and the ~1.5 s Reconnecting grey; the Full-side toast and outline (4d) | 4c / 4d |
| `js/collab-media.js:359-399` | manifest `w`, `h`, `dur`; `FM.media.meta` | 2 |
| `js/collab-host.js:350-387`, `:826-843`, `:847-934`; `js/collab-session.js:292-361` | `all:1` on both host paths; intent queue; the offline outbox's `all` | 5 |
| `js/collab-core.js:29`, `:24` | `SCHEMA_REV` 3 (Phase 1), 4 (4a), 5 (4a′), 6 (4b), 7 (4d), 8 (Phase 6); `PROTO` 2 (4a, for the stale compare; else Phase 5) | 1 / 4 / 6 |
| `js/scene.js:1127`, `:1068` (unchanged); `js/compositor.js:16159-16167`, `:2592-2601`; `js/exporter.js:263-270`; `js/app.js:2087` | `FM.transitionAt` (stored flags only, validity, `d_eff`), `FM.handleLocalTime`, the transition pass, clip animations | 6 |
| `tests/tests.js:68197-68208` (the brand-name guard, [checked]) | widen from effect labels to the editor button, New project cards, Home chip and every Simple label | 1 |
| `BEFORE-PUBLISHING.md` | list each Simple screen built from a CapCut or Premiere reference as it lands | each |

### 14.3 The dispatch seam

```
refreshAll ─▶ FM.inspector.refresh ─┬─ full:   Add menu / layer editor           (today)
                                    └─ simple: FM.simpleTools.render
           ─▶ FM.timeline.rebuild ──┬─ full:   buildTracks                         (today)
                                    └─ simple: FM.simpleTimeline.rebuild ─▶ FM.spine.read(scene)
tap a tool ─▶ (picker first, if any) ─▶ FM.spine.edit(label, plan) ─▶ single-flight/queue ▸ gate ▸ locked ▸ blockers ▸ couplings ▸ flush ▸ beginEdit ▸ adopt? ▸ pinStrays ▸ apply ▸ fit tails ▸ re-check ▸ size ▸ unmute ▸ refreshAll ▸ time ▸ commit ▸ drain
                                                                                                        └▶ collab diff → one tx
```

### 14.4 One helper per rule, so no site is forgotten
- `FM.spine.onCopy` is the only thing that touches `sm` on a copy; T6 drives every copy route.
- `FM.timedLists` is the only list of timed keyframe containers; the shift and the wire both use it (4a).
- `FM.timeline.host()` is the only way other modules find the timeline's boxes, scroller or time↔x.
- `FM.trimClipEdge` is the only edge-trim maths; `FM.setClipSpeed` the only flat speed; `FM.spine.setFlag` the only `sm` writer.
- `othersCanEdit()` is the only live-gate predicate (commands, drags and undo all read it); `FM.spine.blockersForLayers` the
  only lease / drag predicate (commands and undo).
- `FM.spine.riderKeys` is the only keyframe-rider procedure (camera, caption track keys, volume rider); `FM.seamKey` /
  `FM.divideSegment` the only boundary-key builders (split shares them).
- `FM.spine.neverPinned` is the only "never gets `sm.stay`" test (adopt, adoptPreview, pinStrays); `setUnitSpan` the only way a
  plan changes a unit's length outside a trim; `FM.spine.insertAt` the only Simple insert (it restores `FM.addAt`);
  `FM.spine.whoWord` the only way a line names a person; `refLayerAt` the only effect-source lookup.
- `FM.spine.itemWord` is the only way a line names an item; `js/spine-words.js` the only source of Simple's strings;
  `FM.spine.say` the only way Simple speaks (§3.12).
- `isTwinOf` is the only twin test; `isLong` the only "long things" test; `FM.worldBox` the only world-space box (the classifier
  and the renderer share it); `CM.pinTime` the only pin resolver.
- `FM.timeline.edgeScroll` is the only edge auto-scroll; `FM.timeline.stripFor` the only filmstrip cache.

### 14.5 Performance (measured at 380 px on his iPhone, not assumed)
- `FM.spine.read`: one pass, O(n log n) on a change (interval sweeps, no per-unit parent walks against `FM.scene`); target
  < 2 ms for 500 layers, and the 2,000-layer run under ~5× the 500-layer run, so quadratic growth fails (T1). On a cache miss
  in Simple at 2,000 layers, < 8 ms.
- Simple `rebuild`: only items in the visible time range ± one screen; filmstrips and waveforms through the one shared,
  bounded cache (§8.1); target < 8 ms at 200 items. **Measure** total filmstrip canvas bytes at 380 px on his iPhone with a
  60-clip project after 5 zoom changes and a full scroll in each editor: budget ≤ 64 MB for filmstrips and waveforms together.
- `touchCurrent` at 2,000 layers in Full adds < 1 ms (no classify, §7.4).
- 4a's `toWire` plus the diff on the 500-layer S8 fixture stays within the 100 ms tick budget under the 4× CPU throttle.
- A ripple over 60 clips: `shiftLayerKeyframes` is linear in keyframes; one commit, one snapshot.
- Full's `rebuild` with 500 pinned comments stays within its budget: `CM.paintMarks` resolves every pin through one index built
  per rebuild (the same `byId` and lineage index `classify` uses, §2.5), never a `CM.pinTime` scan per comment.
- Drags write nothing until release (§3.8), so collab stays quiet during a drag.

### 14.6 Tests (each must fail with its source reverted: `prove.sh`; run at desktop and 380 px)

| # | Test | Phase |
|---|---|---|
| T1 | Classifier over hand-built projects: plain track, picture-in-picture, letterbox, a 3840×2160 clip in 1080p (scale 0.5) and a landscape clip in 9:16 (0.5625), block and transparent groups, a mixed group (clip 3 + a title over clip 5), a non-contiguous group, a trimmed group, a caption track inside a plain group, a clip transform-parented to a null and to another clip, "everything grouped" before adoption, masks, camera, gaps, a slot (shape + text card over 0-3 s), a hidden clip in a seam, a scale-0 keyframed intro, negative start, overlaps, a three-clip hand-crossfade chain (incoming on top, and outgoing fading out), a background still under five clips, a take stacked over an older take, captions, music, an mp3 with no media record at the bottom of the stack, an import whose song and clips were omitted, a project opened before hydration, a guest with manifest meta only (matches the owner) and one with neither (undecided; adoption refused), empty, text-and-shapes only → expected kinds, main clips, seams and hosts. Plus: changing each classifier input alone (blendMode, first / last cue, audioOnly, transform, crop, media landing, canvas size) invalidates the cache, and a proxy lists every field `classify()` reads. **Round 2 fixtures, each with its expected result written down:** a 600 s A-roll with sound under 5 separated full-frame cutaways (main = [A-roll], cutaways are overlays following it, no slots or gaps) beside a silent still under five joined clips (a `background`, main = the five) and separated clips over a silent still (the still is main); a letterbox background under landscape clips in 9:16, a screen-blend double exposure, a chroma-keyed clip over a background still, an adjustment layer under main and a mask-include under main (each: `renderScene` pixels at sample times unchanged after adoption + Close gap and after deleting an unrelated clip, and no `mainInFront`); hidden clips: clips 1, 2, [3 hidden], 4 end to end → main = 1-4, all joins, 3 dimmed, Close gap never offered; a hidden lower take partly under visible clip 2 → main = 2, the take an overlay; a hidden text card alone in a 2 s gap → a slot; a clip in a hidden plain group in a seam → as the first; blocks: clip + title in a group that slides in → a main block, the title inside it, no slot; everything grouped with an opacity fade-out → a wrapper, every clip main, the fade still at the end after a Delete and after an Append; Put in the clip row on an overlay block writes `sm.main` on its members, never on the group, and the ripple's slot is filled; world box: a full-size clip in a plain group scaled 0.5 → overlay, the same at scale 1 → main (control), a clip parented to a null scaled 0.5 → overlay, a native 0.5-scale clip in a group scaled 2 → main; a layer with `srcW` 1080×1920 and `srcRev` 0 but `mediaRev` 1 and a 1920×1080 record is classified from the record; missing media: an import with one over-limit clip between two embedded ones arranges after hydration settles and the missing clip is main and ripples, an omitted .mp3 with no `audioOnly` is audio, a layer in hydrate's `lacking` list is missing not undecided, the same project before hydration settles is still refused `waiting` (positive control), an adopted project keeps a missing `sm.main` clip on the main row, a record that fails to decode is missing, and a solo project never shows `waiting` once loading has given up; crossfades: 5 s clips with 0.5 s, 1.5 s and 2.5 s (exactly half) opacity crossfades, incoming on top and outgoing fading out, derive every clip main with blend seams and no `sm.stay` after adoption, a 2.6 s fade gives both main with an overlap chip, and a non-blend 1.5 s overlap still makes the upper clip an overlay; links (Q27): a title parented to main clip 3, and one matted by it, keep host = clip 3 before adoption, after it and after two reorders, with no `sm.stay` and no ask (control: the old `return hostOf(v, R)` fails), a mutual Follow pair and a mutual matte pair make `classify` return with both in `R.couplings` and neither pinned, and a layer whose parent, matte and Follow point at three different hosts takes its parent's; plain groups: a "Titles" group with A (0-9 s over a 10 s clip 1) and B (over clip 2), delete clip 1 → A gone, B kept and rippled, the group refit to B; the same through delete of clip 2; a group spanning clips 1-5 through deletes of clips 1 and 5, never flagged at adoption; purity: a pack with a hidden group whose child sits in a gap is not a slot, and a proxy asserts `classify` never touches `FM.scene`; timing: 500 and 2,000 layers (many grouped, many gaps), < 2 ms at 500 and the 2,000 run under ~5× the 500 run. **Round 3:** import stacks built through `FM._handleFiles` in Full (four clips at 0, at a mid-track playhead and at the end; four photos of equal length; an unstamped three-clip stack from an old project → one stack entry, all main in pick / stack order; control: a two-clip unstamped take still gives the top one); an opacity-0 music video with sound at the bottom under four joined clips → main = the four, the video kind audio and Stay put; the same on top → still audio; control at opacity 1 → an A-roll main with cutaway overlays; a full-size face-cam with a circle pen mask in a corner over a same-length screen recording → recording main, face-cam an overlay (and with a legacy ellipse `mask`; control: an unmasked take on top wins), each with `renderScene` pixels unchanged after adoption; on a 9:16 project a 16:9 clip zoomed to fill and panned 30 % of the width stays main (control: scaled to 50 % and panned → overlay), an 85 % × 85 % crop of a fitted clip stays main, and the same clips reframed in Full before the project is first opened in Simple derive as main with no gap chip (mutation: drop rule (b) or (c) and its fixture goes red); an `sm.unit` group with no look classifies as a moves-together group whose members keep their own kinds; a caption track plus a box in a group with a shadow over clips 1-4 → a caption block: Delete clip 2 then Reorder 1 ↔ 3 keep every cue's offset to the speech and it has no `sm.tail` after adoption (control: the same pair in a plain group behaves identically); a 20 s wrapper with fade keys at 0-1 s and 19-20 s and middle keys at 9 and 11 s through Delete of a 5 s clip and Delete of all but one 4 s clip: every group key list sorted and ≥ the group start, the fade-in at the start, the fade-out ending on the new last frame (fails with the old half-span shift); missing media: an old-project Chrome `.webm` voice-over with no record lands in Sound, and a failed-decode record with `type: 'audio/mp4'` is audio; the timing fixture adds 1,000 transform-parented and Follow-linked layers and a 500-member scaled group | 1 / 2 |
| T2 | Every command over 200 seeded main tracks with off-grid lengths (11.21 s), a 0.012 s overlap (kept exactly by every command) and, separately, a 0.012 s gap placed off the frame grid (a hairline at 24 and 30 fps, a gap at 60, landed bit-exact whenever a command moves it, with invariant 13 holding; control: without the widened landing, invariant 13 fails on about gap × fps of the seeds, 36 % at 30 fps), 0.5 s and 3 s overlaps, a same-start pair, blends and off-grid group members: the §3.9 invariants (a small fixed-seed set in the main run, the 200 in an `?only=` slice). Plus fixed cases: trims on {flat, 0.5→2× ramp} × {forward, reversed} × {head in, head out past source, tail in, tail out past source, over-trim below `MIN_LEN`} keep the source time at a surviving frame (to ~1e-6) and the far edge still, and the grip, A/D and Simple trims give the same numbers; a 1 s clip with h = 1.5; split at 1 and 2 frames from each edge and at exactly `MIN_LEN` at 24/30/60 fps, paused and playing, then undo and redo; reorder a clip with followers forward and backward across three others; Make main clip of an overlay whose host starts on the seam; a text end card at the track end and after a 1 s gap through Append, insert-at-end, delete-last, tail-trim-last and speed-down (and a Stay-put control); 4×20 s clips + a 3:12 song → 80 s, delete clip 2 → 60 s; a Full-made 0..end title through delete of clip 1 (kept, no black band) and reorder of clip 1; a stray in a gap through Close gap, Close all gaps, delete-before and insert; the playhead landing for every command; two commands within one await → two steps. **Round 2 fixed cases:** float-noise joins: at 24, 30 and 60 fps over ≥ 2,000 seeds of the CapCut rhythm (an 11.21 s source, five snapped splits, a middle piece ripple-deleted), invariant 13 holds (positive control: a plain `+= d` with no re-seating fails in ~2 % of seeds); delete of long units: a 20 s picture-in-picture added with Simple's Overlay (no `sm` key, 4 s of it on clip 1), a Full-made 20 s sound starting on clip 1 and a text with keys at 8 and 11 over clips 1-3, through Delete of clip 1 with and without a 1 s gap after it: at every surviving time each media unit's `layerLocalTime` is unchanged (~1e-6), its end moves by exactly `dt`, every key list is sorted, a key at its old start sits at its new start (controls: a reversed clip and a 0.5→2× ramp); straddlers (replacing the old 60 % / 50 % control): a 2 s text split 40/60 across the cut between c and n keeps its offset to c through delete, head and tail trim and speed of an earlier clip and reorder of c, with controls that stay put (a title over three clips, and a whole-video title on a two-clip track, the Q8 guard); re-homing: c = [5,10], n = [10,20], a Full-made title [8,14]: tail-trim c to 7 and the title stays at 8 with `sm.stay`, then Delete n and it survives; the same with a speed-up of c and Make overlay of c; a control title [8,10.5] slides back under D6; tail fit: through Append 10 s, Delete of the last clip and End with the video, a two-key progress bar 0 → full over 0-20 s is full exactly at the new end, a 10-key progress bar stays monotonic, a whole-video title with fades at 0-1 s and 19-20 s keeps both 1 s fades ending at the new end, a Full-made song with a volume-key fade and a mid-song duck keeps the duck at its absolute time and ends its fade at the new end, and a song with no fade gets `fadeOut` on a shortening fit (fails under `prove.sh` with `mapLayerKeys` removed); Stay put vs Ends with the video: a Stay-put voice-over, switch off, trimmed to end exactly at the track end keeps its length through delete-clip-2 (the black band shows) and Append (no source regrowth), the same item with the switch on is fitted both times, and a Full-made 10 s..end title gets `sm.tail` at adoption; split song: a 3:12 tail song fitted to 4 × 20 s clips and split at 60 s, then Append a 20 s clip → A stays 0-60 and B ends at 100 with no overlap; Delete B then Append → A still ends at 60; an old-build split with both halves flagged → the next arranging edit fits only the later half and clears A's flag in one step; head trim: `fxTimeOffset` compared too across the grip, A and Simple head trims, and a Drift clip rendered at the same footage frame before and after a 1 s Simple head trim, flat and reversed, matches within the render jitter; adding text: play to the end then Text → `P.duration` unchanged and the text starts on the last clip; Text 2 s before the end → duration 2 s; a following title that overruns, then the black band's button → `P.duration === trackEnd`; slots: a mid-track shape-and-text card (10-13 s between clips 2 and 3) and a leading card (0-3 s) through delete of clip 1 and of clip 2 (the slot follows as the next entry), insert before each neighbour, reorder of each neighbour to index 0 and to the end, reorder of the slot itself, and Close gap / Close all gaps elsewhere: no card overlaps a main clip, no gap chip where the slot was, the adopting edit leaves the slot a slot (control: a card the user set to Stay put stays put); the runner: three commands within one await → three steps in tap order; Split → Delete → Speed gives all three with Delete acting on the clip selected at tap time; a fifth tap shows the wait line and writes nothing; Split with ⌘Z fired during a stubbed `reloadMediaTo` → the scene byte-equal to before the split, the split on the redo stack, ↷ brings back two halves meeting at the seam; Split → Delete (queued) → ⌘Z undoes the delete; the text card open on a title with unflushed words, then a seam chip or Split → two steps, one ↶ keeps the words (control: delete the two flush lines and the words go); locks: a locked whole-video watermark and a locked tail song through Append, Delete and a tail trim → no refusal, ends fitted, locks kept, one undo; a locked camera through Delete → no refusal, keys cut, lock kept; a Full group with one locked member dragged → *"That block is locked"* + Do it anyway moves the whole block and keeps the lock; Put behind on a locked main clip still refuses; refusal after apply: a forced `big` after Duplicate and after Replace leaves the IDB document and `FM.media` byte-identical, and a Replace whose picker never settles leaves `FM.spine.running` false and history unmuted; Clips tool: after §7.3's first import (playhead at 0) Add clips appends after the last clip and before any end card, and with the playhead mid-track, After Clip N splices at that cut; Sort by date: 5 shuffled clips with followers, a cue straddling two clips, a twin and an end card, sorted then undone byte-identical, a blend refuses, all-undated hides the entry, the playhead lands; Make overlay on a clip carrying a title and captions leaves both above the lifted clip and `renderScene` shows the title at its midpoint; the Length row trims exactly like the D grip. **Round 3:** **Reorder's slot length:** p[0,5) c[5,10), a 1 s gap, n[11,15) m[15,20), with c moved between n and m and back, and the same with c the outgoing clip of a 0.5 s overlap: for every clip `cue.start − clip.start` and each camera key − its clip start are unchanged to 1e-9, the track end is unchanged, and `c|n'` carries c's old trailing amount; the outgoing clip of a blend is refused; a Sort fixture with a plain 0.5 s overlap and a cue inside the overlap keeps that cue on the later clip. **Delete's key-less cut:** a volume key at 8 s on the Full-made 20 s sound lands at exactly 4, a key at 6 on a text starting at 1 inside clip 1 = [0, 4) lands at 2, and the text's Drift renders the same frame at every surviving time (control: shifting keys through `shiftUnit` as well fails). **Every overlapping long unit:** three 10 s clips with a Full-made 30 s narration, a 30 s whole-video title and a 20 s picture-in-picture video, each starting on clip 1, through Delete of clip 2 and of clip 3: each media unit's `layerLocalTime` unchanged at every surviving time (~1e-6), the title ends at the new track end with no black band, split halves meet bit-exactly at `a` (reversed and 0.5→2× ramp controls); a unit ending inside c (case ii); tail and head trims of clip 2 by 3 s leave the long unit byte-unchanged with `sm.stay` (positive control); a pre-pinned long unit through Delete of clip 2 stays whole (control); a long block through Delete is pinned, never cut. **Tails:** a whole-video title and watermark added in Full after adoption through Append ×2, Delete clip 1 and Delete clip 2 end at `trackEnd` every time with no band (control: a Stay-put-by-user item is not fitted); round trips of a 12 s title with keys at 1, 4, 8 and 11.5 s through Append 10 s then Delete of that clip (and at 8 s and 30 s, and a `sm.tail` song with a duck) return every key within 1e-9 apart from listed dropped audio middle keys; a Full trim of a tail song then a Delete leaves its end unchanged and its switch off (control: the untouched song is fitted); a reversed muted 0..end overlay with `sm.tail` through Append 10 s and Delete of the last clip keeps `layerLocalTime` within ~1e-6, flat and 0.5→2× ramp (fails with a duration-only fit); a bare Controller 0-20 s through Delete of clip 4 then clip 3 → `P.duration === trackEnd` both times and no band; an Add → Elements group 0-20 s holding titles on clips 1-2 through Delete of clip 4 → `P.duration === trackEnd`, pixels unchanged at 1 s and 8 s (control: the old touched-member filter fails); an empty New group through Delete of the last clip → end clamped; a keyed logo + text block with `sm.tail` through Delete of clip 4 → every member and the row end at `trackEnd`, last-frame keys moved by `D′ − D`. **Blends:** 5 s clips with a 1 s fade-out owned by a and a 1 s fade-in owned by b, through a tail trim of a and a head trim of b by 0.5 s and 2 s, inward and extending, Insert at the seam (refused) and its fallback, Duplicate of each owner, Reorder of each (refused), and Delete of an owner with a following clip: `isBlend` and `amt` after each, every key list sorted (control: without the owned-key rule the 2 s trims fail with an overlap chip); a 5 s / 2.5 s pair and a 5 s / 1.5 s pair: tail and head trims land at the `2·amt` limit on a drag and are refused with the fade line when typed, 2× speed of either is refused and the slider stops, Split inside and just outside the overlap, ✂ with nothing selected mid-overlap refused with the document byte-identical, Delete of a clip whose incoming seam is a blend leaves no overlap chip (control: the same trims on a plain overlap go through). **Landings:** ≥ 2,000 seeds per fps at 24 / 30 / 60 of head trims of snapped split halves, Insert and Duplicate at a snapped seam, Reorder forward and back, Make main clip and D6: `newA.start + newA.duration === newB.start` at every join and invariant 13 (control: `addMove(target − start)` instead of `addLand` fails at least one seed). **Short clips:** a 0.067 s main clip seeded by the pre-Phase-1 split rule through Delete, Duplicate, Length −, Length + and Speed 2×: the stated refusals and lines, nothing else changed, invariant 7 in its new form. **Placement:** a letterbox fixture, a background still under five clips and a text-and-shapes template with a full-canvas rect, each through Insert, Append, Append *Behind everything*, Duplicate, Make main clip and Add effect segment: the new clip's index is above the background's, and `renderScene` at its midpoint shows its colour, not the backdrop's (control: the old "below the lowest non-main visual" fails); Append 10 s to a project with a front tail watermark, a whole-video caption track and a whole-video adjustment layer (front, and separately behind): at the new clip's midpoint the watermark and caption show, the front grade applies and the behind grade stays behind (control: anchors from pre-plan spans fail); stacking units: Add sticker inside an `sm.unit`-free element block (picture member below a title member) → the title still above the sticker and the members contiguous; Forward / Back on a masking block keeps the mask the top-most member; Add text over a member of a "Titles" group never lands between the row and its members; a front mask-include through a Reorder keeps its index relative to what it overlapped (control: remove the mask exemption). **Single-spine blocks:** a clip + rounded-rect in a masking group and a clip + title under a group fade-out through Delete, Append, head and tail trim, Split mid-clip and 2× Speed: pixels at the sample times (the mask frames both halves, the fade ends at the clip's new end); control: a two-spine block still refuses. **Slots:** a shape + text card put in the row (shape main, text follows, no gap or overlap chip, the next clip does not move), a text-only card refuses, two full-frame members are wrapped with the first as anchor, Delete card closes the space in one step and one undo restores it (control: the literal Make main clip plan moves the text and opens a gap). **Sound rule and music first:** a Full-made 30 s song over clips 1-2 of 4 × 20 s through Reorder of clip 1 to the end and Delete of clip 1 keeps its start and survives with no *"and 1 thing on it"*; a 0.8 s whoosh starting 0.4 s before a cut follows its clip; a Simple recording and a Full-made voice-over get the same flag; New project → Sound → Music (3:12) → Append 4 × 20 s: the song stays at 0, is fitted to 80 s with a fade and never moves after the clips. **Lyrics:** four clips, a stay-put song and eight back-to-back 1.5 s text lines crossing cuts plus one 2 s title, Delete clip 2: the line counts 8, not 9; Keep on the music leaves the 8 at their absolute times in one step; the title follows its clip (control: no stay-put sound, no line). **The runner:** ⌘Z during a 4-clip `clipSplit` with a stubbed `reloadMediaTo` → one undo removes all four splits, the queue is empty and a following Simple edit is not undone; `[Split, ⌘Z, Delete]` inside one await runs in tap order; an entry stamped two commits back is dropped with its line; the same ⌘Z during Extract Audio (each fails under `prove.sh` with the unmute / jobEnd drain removed); with `reloadMediaTo` hung, Duplicate, then a synthetic canvas drag, a panel slider change and a ⇄ tap during the await: the drag and slider change nothing, ⇄ shakes, exactly one step lands; a forced `big` in a session leaves the scene byte-equal (control: without `sm-running` the drag merges into the Duplicate step). **Adding:** Text tapped during a stubbed slow first-pick load → no ask, clips at 0 below the text; Home mid-drain → nothing added to the next project; 3 × 10 s clips + a 3:12 mp3 picked from Create → clips at 0 / 10 / 20, the song at 0-30 with `sm.stay` + `sm.tail` and a 2 s fade, one step whose Undo leaves the project empty (control: without the split, a 192 s gap); an mp3-only pick → no main clip, the song whole at 0, the + Add clips row still shown; with the playhead at 40 % and 60 % of clip 2 the Clips label reads *"After Clip 1"* / *"After Clip 2"* and the clips land at that seam; Simple's `+` with 3 files in Phase 1 gives three joins end to end from `R.trackEnd` and no overlays | 2 |
| T3 | Keyframes: after every command, each moved unit's `FM.timedLists` keys (collected by the generic "every `kf` under the layer" walk, never by the collector under test) moved by its `d` (scaled for speed); Duplicate puts the copy's position and opacity keys at `c.end + offset`, gives it a media record and `sm.main`, one undo removes it; a camera push-in keyed over clip 3 moves with it after deleting clip 1 and the exported frame at clip 3's midpoint matches; a null with animated position parenting clip 3; a Follow targeting another clip; a Luma Matte whose source stays put (each with its positive control). **Round 2:** a camera push-in keyed over clip 3, reorder clip 3 to the front and then to the end: the exported frame at clip 3's new midpoint matches the frame before, and the pose at the old neighbours' midpoints is unchanged (control: the camera left at absolute times); rider keys, each with a control on the old rule: an ease-in-out push cut mid-move keeps the pose over `[k0, a)` to 1e-6 with a step at `a`; an Insert inside a camera move keeps the pose over the clip before the seam and holds over the inserted clip; a pingpong camera sway with a clip deleted after its last key keeps its loop period; an Append with a zoom keyed over the end card still lands on the card; a camera Full trimmed to `[3, 9)` through an Insert at 5 and a Delete of `[4, 6)`: `FM.cameraView` just before the new end is non-null and the exported frame matches; lineage: a clip with keyframed x is split and a sticker parented to it starts over B, then (a) B is reordered before A, (b) A is deleted, (c) B is deleted: the sticker's host is B, its evaluated x follows B's motion (not frozen at A's last key), nothing is deleted with A, and the ask fires when the lineage is separated from a sticker spanning the cut; a bouncing clip split with B reordered first leaves the ring silent without an error; a hidden helper matte on main clip 3 reordered twice keeps its offset with no ask (control: without rule 1b it fails), while a visible matte source asks first and writes nothing before the answer; a null parenting two main clips reordered together moves by `d` with no `sm.stay`. **Round 3:** Follow and effect sources through the lineage (Phase 1, each failing on HEAD): split a Follow target with keyframed x and the follower tracks B past the cut (control: frozen at A's last key); split a Luma Matte source and the matted layer still draws past the cut (control: blank); both at 380 px too. The lineage fixture adds a split Follow target and a split Luma Matte source, then B reordered to the front and A deleted: host and rendered pixels at the follower's new midpoint are right (control: the stored-id lookup fails); a sticker whose start equals the cut has host B; the hidden-helper case renders pixels to settle rule 1b's premise. Divided curves: an ease-in-out camera push over [2, 10] with Delete [4, 6): the pose at every t in [4, 8] equals the original at t + 2 (1e-6); Delete [5, 6) and [4, 7) inside one segment: the same after b; an Insert of D at 5: the pose over [5 + D, 10 + D] equals the original at t − D (each with a control that leaves `k1`'s `bez` untouched). Key counts: an edit outside [first key, last key] adds none, one inside adds ≤ 2, and 100 seeded deletes leave a keyed caption-track effect under 200 keys. Behaviours: a camera with Bounce plus a Follow of a main clip through Delete, Insert and Reorder: no ring at the cut, the authored ring unchanged, an orphaned split tail whose head was deleted handled (fails on HEAD without the `split` filter); a caption track with Bounce on its own keys through Delete; Delete of the camera's Follow target refused with its line. A camera trimmed to [3, 9) with keys, Reorder of [4, 6) to seam 12: the ask fires; after Do it anyway the frames over the moved clip keep their pose and [7, 10) renders like the pre-edit [9, 12) | 2 |
| T4 | Riders through `f`: delete, insert, speed and trims map both ends of every visible cue; no overlap after reorder; no cue under `MIN_CUE`; deleting the last clip under a full-length track leaves `project.duration` at the main end; a track starting inside a deleted clip; hidden cues after a tail trim stay hidden through delete and insert; a cue straddling an insert splits; the caption track's transform keys ride and a key inside a deleted span collapses to its start; a keyframed cue effect moved whole, speed-scaled and reordered moves exactly once; captions found from a stay-put voice do not move on Delete while ones found from a main clip do (positive control), and the scope = 'project' fallback that lands on a stay-put source also marks the track. **Round 2:** a 0..end caption track made by `FM.addCaptionLayer` beside a 0..end watermark: after adoption the track has no `sm` key and the watermark has stay + tail (control); delete clip 2 → clip 3's cues moved by −len and the window ends at the new main-track end; Make overlay of a clip with 3 cues keeps all 3 at the same absolute times with no "too short" line, and the cues of clips after it move by dt; Make main clip of an audible overlay over a muted main clip carries its cues to the seam (control: over an audible main clip they do not move); reorder with a clip-scope caption track whose window lies inside c (window and track keys move with c), a track straddling c.end, a cue straddling the destination seam (splits), and a loop region inside c (moves), inside P1 (shifts by −c.duration) and spanning a boundary (cleared with the line); a per-clip caption track through delete of its clip (removed and counted, no 0.1 s layer left), reorder of its clip (moves with it, window not stretched) and delete of an earlier clip (shifts by dt), with a spanning track as the rider control; Append with a cue straddling the track end splits it, nothing over the new clips; Freeze (Phase 7): a cue starting exactly at t moves to t + 3 s, one ending exactly at t stays, a straddler spans the hold; the cue-relative wire form survives a cue shift, a cue scale and a paste (4a). **Round 3:** a default caption track over clips with raw lengths 11.2104667 × 3 (the end rounding down) and a second set rounding up, through Append of a 5 s clip: the window end equals the new `trackEnd` to 1e-9 in both, and `addCue` at the playhead mid-way through the new clip lands there (control: without the snap the round-down set fails); a keyframed cue effect on a cue shifted by a Delete of an earlier clip while the track spans the cut moves by −len exactly once; a keyframed straddler split at a Reorder boundary keeps half 1's evaluated effect over its own span to 1e-6; a keyframed cue spanning a deleted clip moves its keys after b by −len and its value at the joined point equals `seamKey(b)` (each with a double-move control); Make overlay with a camera push-in keyed over c and a zoom over n: n's keys shift by dt, c's inside keys are gone behind a clean step at `c.start`, keys sorted, no interleaved duplicates; a cue on a ramped clip through Use one speed still sits over the same source time within 1e-6 | 2 |
| T5 | Adoption: the first arranging edit writes `project.sm.adopted`, `sm.v`, `sm.main` on exactly the derived main units (removing a stray), `sm.stay` on exactly the hostless non-tail items, `sm.stay` + `sm.tail` on whole-covering **non-caption** items, in the same undo step; a look edit writes none. A never-adopted project with one stray flagged clip still shows its derived track. Full's Put in the clip row on an overlay of an un-adopted project gives 4 main clips + an overlap chip and one undo returns to un-adopted; Make overlay on derived clip 2 gives a gap chip. `sm.v: 99` refuses every arranging command and writes nothing. Both fail with `setMembership` replaced by a bare flag write. **Round 2:** whole-covering **non-caption** items get stay + tail; a project with a default caption track (`addCaptionLayer`, two cues) and a default camera (`addCameraLayer`, a push-in keyed over clip 3), never adopted, then delete clip 1: adoption wrote neither `sm.stay` nor `sm.tail` on either, both cues and the window moved by −clip1.duration and the camera keys by the same (control: a 0..end watermark in the same project does get stay + tail and does not move); `setMembership`'s adoption uses the uncached `classify` (it catches a stale cached `read()` after a remote batch) and its undo is gated (`arr: true`) in a session; in a live session an Editor's `s P/sm/v 99` makes the host send a fix op back to `SM_V` and no member refuses `newer`. **Round 3:** a Controller made with `FM.addNullLayer` after 4 × 5 s main clips, parenting all four, with a punch-in keyed at 15-15.3 s, a second Controller parenting 3 stickers, and a whole-span hidden luma-matte helper used only by clip 3: after adoption the first Controller and the helper have no `sm` key and the sticker Controller has `sm.stay` without `sm.tail`; through Append 10 s, Delete of clip 2 and a reorder of all four, each child's world transform at its own footage frames is unchanged (~1e-6) and the punch-in is still over clip 4 (control: without the `adopt()` exclusion the Append case fails); with Ends with the video switched on for the sticker Controller, Append asks before writing | 2 |
| T6 | Copy routes, both directions: keep-routes (import, use-as-new, project duplicate, detach, Save my version, checkpoint restore, split) leave `sm` byte-identical apart from ids; strip-routes (duplicate, duplicate in place, paste one and several, a block duplicate, extract audio, AI clone) produce no second main unit; Simple ⌘D / ⌘V on a main clip land on the main track (the one route that sets `sm.main` back); a Full template, a Simple template and a three-layer element inserted 0.2 s before a cut. **Round 2:** paste and duplicate of a tail song leave the copy with `sm.stay` and no `sm.tail`, and the next arranging edit does not change the copy's duration; a camera-carrying element inserted in Simple into a project with no camera adds no camera (the same in Full adds one: control); a full-frame screen-mode video element and a full-canvas PNG element inserted in Simple leave `project.duration` and every main clip's start unchanged; a three-layer element with staggered starts inserted 0.2 s before a cut keeps all three on one host through a delete and a reorder of that clip; an inserted element layer never carries `sm.main` in either editor, while a Simple template's spliced main units do (fails with the re-flag step removed); an old template pack with no `srcW`/`srcH` inserted in Simple splices its clips as main; `L.by` survives share / resume and split B, and is stripped on duplicate, paste, extract audio, AI clone, template and element save and export. **Round 3:** a template and an element whose song carries `sm.tail`, inserted through Full and through Simple, then a Delete: the inserted song's end is unchanged, and an inserted clip carrying `sm.muteByMode` keeps `muted` but not the flag; every `by` route above, plus a guest's undo of the owner's delete and a guest's split (B keeps A's author); create in Full, switch to Simple, save as template, use-as-new on a cleared index → opens in Simple and the source project's `project.sm.home` is unchanged; a two-layer lower third (a text and a shape bar, staggered starts) inserted in Simple 0.2 s before a cut: its words edited from the Text tray and the bar recoloured from the Overlay tray, both stay on one host through a delete and a reorder of that clip; a template with title + subtitle + music at 0: title and subtitle each editable, the music in no group and carrying `sm.stay`; Full's Ungroup drops `sm.unit` (control); an element inserted through Clips › Extras lands by the same command | 1 / 3 |
| T7 | `sanitizeSm` refuses junk, keeps plain unknown sub-keys, and is a no-op on the canonical form, on every route (load, import, undo, template, element, collab clone); Make overlay then undo and redo is byte-identical and the host sends no fix op; `sm.row` survives Make main clip and Make overlay; `sm.main` is dropped from audio-only layers and caption tracks. **Round 2:** the sanitiser gives byte-identical output for the same document (an unflagged song carrying `sm.main`) before hydration, after hydration and as a guest with no media, and the host sends no fix op; an object-valued `sm.future: {a: 1}` and `project.sm.home: 'x'` survive load, host invariant, import and template untouched, and `home: 5` is dropped; `srcRev`, `taken` (kept only in range; survives `.fmotion.json`, template, element and collab clone), `by`, `kb` (4a), `sm.muteByMode` and `project.sm.muteClips` sanitise; Mute the clip row: on → append → on is idempotent, on → off restores his own earlier mutes exactly, a manual unmute while the mode is on survives off. **Round 3:** an effect instance with `sm: 1` survives load, undo / redo, import, template, element and the host clone, and one with `sm: 'x'` is dropped (control: without the keep line it fails); the sanitiser's output for `taken` is byte-identical with `Date.now` stubbed a day and a year either way, and a date two days ahead gets no host fix op; `sm.tailEnd`, `pick`, `kr` and `project.sm.mrev` sanitise; a song replaced with a video gets a filmstrip in Full, the full inspector, overlay kind in Simple, and Put in the clip row sticks with no fix op; a pre-change project with 50 media records and no `srcRev`: a title edit's commit diff holds only the title op, solo and as a guest (control: a Replace writes all three fields in its own step), an export omitting one clip still carries its `srcW` / `srcH` / `srcRev` and the source scene's hash is unchanged by the export; a project with `sm.v = SM_V + 1` shows the newer line on export and import; a moov-at-end file (a FreeMotion export) gets `taken` from `mvhd` through `FM.isoBoxes`, and a file whose only date is the import moment gets none | 1 |
| T8 | Switch: no document write, no history step, no collab op; `FM.time`, one and three selected ids (`sel-mode` off in Simple, back in Full) and zoom kept; every clip's x the same to ±1 px; focus not on `<body>`; ⇄'s accessible name names the target; a hop leaves the card's `editor` unchanged; in a live session (`withFakeNet921`) ⇄ and E switch within one frame; solo with the text editor open, ⇄ flushes into one step then switches; with the mask tool open in a session, ⇄ closes it and releases the lease; during a live clip drag ⇄ from a second pointer (or E) shakes; during an export ⇄ shakes; a 40-layer project at 380 px has no box starting outside the scroller at full opacity and starts within one frame with thumbnails uncached; template, import and backup restore open in Simple when home is simple. **Round 2:** preview on → ⇄ to Simple → preview off → the open project is in Full at once with no document write and the card's `editor` still `'simple'` → reopen → Full, chip reads Full → preview on → reopen → Simple (control: the switch left on opens in Simple); the x-invariance clause is asserted with nothing selected and with several selected; with one clip selected at 380×667 and 375×553, Simple→Full ends with that clip's x ±1 px in the solo row, `m-editing` set and no other box left at full opacity; Full solo→Simple ends with `m-editing` off and every main clip in the filmstrip; the stage height changes monotonically across the animation frames with no step larger than one frame's share; the Simple→Full arrival at 380 px under D2-B shows `#toast` **without** `.toast-tap`; with the hop's inspector sheet open, `elementFromPoint` at the toast's centre is not `#toast` and a synthetic tap there does not change the editor; the icon-only back button in slot 3 is present and returns to Simple with the same selection. **Round 3:** ⇄ shakes while a Simple command runs (`sm-running`) | 1 / 3 |
| T9 | Trim stranding: a title whose start frame is trimmed away stays with its clip (D6), including the playhead exactly on its first frame and pressing D at 24/30/60 fps, and a title at `newEnd − 0.4/fps`; the next reorder of that clip carries it. **Round 2:** the slid-back title carries a keyed scale / opacity pop-in on its first frame and the clamped effect segment carries keyed params: each keyframe's offset from its start is unchanged (inv. 3); c = [5,10], n = [10,20], a Full-made title [8,14] through a tail trim of c to 7: the title stays at 8 with `sm.stay` (inv. 2b) | 2 |
| T10 | Live gate: with an editor member present (connected, and dropped but still in the room) every gated command refuses with the line and changes nothing, look edits go through; with only a Viewer or Commenter present, append, trim and reorder work and send one tx each; granting that Viewer edit greys the tools and a drag in progress is refused at release; Append on an adopted project goes through live, on an un-adopted one refuses; two concurrent Appends end as one overlap chip; drags: a hold starts no preview, grips are absent, a session starting mid-drag cancels it with no write, no step and no tx; arrange solo → share → join → ⌘Z sends nothing and the step stays undoable after the guest leaves; owner alone in a live session arranges, a guest joins, ⌘Z and ⇧⌘Z both refused; a look edit's undo goes through; a guest crop lease on a main clip refuses a Simple split and a Full split whole with no `li(B)` sent, and a host-only lease (the lag window) leaves an overlap chip (Fix, or ↶ undoes the split). **Round 2:** hold an Editor's fake link down past `LINK_GRACE` (grace shortened via `C.link.grace`) until `link.onclose` fires: every gated command still refuses; stop and resume the owner's session with the Editor absent: refused again; the Editor sends `bye` `'paused'` → still refused, `'left'` → allowed; Arrange anyway → allowed, refused again after that Editor reconnects (positive control: a predicate reading only `host.members` fails the past-grace case); owner + one editor member → **[Options ›]** → **Make Sam a Viewer** → the next Append / trim goes through and sends one tx; on one owner + Editor-guest room the owner shows *"Sam can edit · clips stay put"* and the guest *"Clips stay put while you both edit"* exactly, neither containing "Only" or "sharing" (control: after Make Sam a Viewer the guest shows `view` and the owner's arranging goes through); on a guest the gate is off after `bye` `'ended'` and on after `bye` `'paused'`; an Editor guest with a full outbox gets the `outbox` line (not `view`); a linked copy open with no session: a Simple delete is refused `offline` and nothing throws, a title-text edit still goes through, and after `C.reopen` the recovered outbox holds the text op and no `start`, `sm`, `li` or `mv` op (control: without the card check a start op is in the outbox); Full's Make overlay / Put in the clip row on an un-adopted project with an editor present is refused and writes nothing, not even `project.sm.adopted`, and on an adopted project goes through live; the exact strings per phase (`live`, `live-guest`, `offline` by phase, `away`); the size check: a guest ripple of any size before Phase 4 is refused `live` and `tooBig` is not called; separately, with `liveArrange` forced true and a Viewer-only room simulated, a diff over 0.8 × `TX_OPS` (and one value over 0.8 × `OP_VALUE_BYTES`) is refused `big`, `restorePreEdit` leaves the scene hash unchanged and no tx is sent (control: the same diff with `C.active` false commits); this is a unit check of the runner's order (the end-to-end case moved to T16); a friend's delete of the clip being held mid-drag ends the gesture with no write; at release a reorder refuses if `p'` or `n'` is gone and a trim refuses if `c` changed since arming; Append on an adopted project with a text end card, and separately with fitted music, is refused with an editor present (clips-only Append still live), and solo it moves the end card and refits the song in one step; Q29: a Full guest's tx with 5,001 ops (and one with a malformed op) is reverted on the guest within one round trip, base hash equals the host's, one line shows, and ⌘Z does nothing and shows no line (control: without the resync the hashes differ); Q28: in a live session a Full split near an edge sends no invariant fix op that changes the halves' `duration`, and no overlap chip appears on a Simple device. **Round 3:** Make Sam a Viewer on a LINK-joined member (with a rid) sets `hostRoom.members[rid].role === 'viewer'`, and after a drop and a reconnect with the token Sam is still a Viewer (control: a button calling only `setPeerRole` leaves the next Append refused); demoting while Sam types shows the confirm and Not now changes no role; an owner profile *Ezra* with an editor member *"ezra "* on `dev: 'phone'` reads exactly *"Your phone can edit · clips stay put"* with *"Make it a Viewer"* (control: *Sam* reads *"Sam can edit · clips stay put"*); Phase 4, `liveArrange` true, an Editor dropped past `LINK_GRACE`: an Append is refused `away` and the line carries [Arrange anyway], a tap lets the next trim through as one tx, the gate is refused again after that Editor reconnects with an unacked outbox and allowed once they ack; a guest's `away` line has no Arrange anyway; a rejoiner whose hello has `ob: -1` is ready at once and one with an outstanding cid only after it is acked; a linked copy with no session: a Simple delete refuses `offline` with [Make it my own], and after the confirm the copy is its own project and the same delete commits as one step with an empty outbox (control: without the button no path to arranging); undo's lease half: Ezra splits clip 5, a guest opens Crop on B without changing anything, ⌘Z → the busy line, no op sent, A's duration unchanged, the step still on the stack, and after release ⌘Z undoes the split whole; the same for a Mute-clip-sound toggle with one clip leased (control: gated on `st.arr`, A overlaps B); the gate closing mid-drain refuses the Append, releases every loaded record (control: without `letGoMedia`, `_releaseMediaRecord` is never called), counts them in the line and makes no step or tx; an adopted project with fitted music and an Editor present greys Add clips and never calls `pickFiles`; a Full split 0.08 s from an edge is refused (Q28) | 2 / 4 |
| T11 | Collab fuzz (`921`-style, `withFakeNet921`, `tests/tests.js:36674`): a host and three guests (two Simple, one Full), 300 seeded rounds from both command sets, with seeded link drops and rejoins, Editor↔Viewer flips, open-tool leases (crop, the caption text editor) held across rounds, and per-person undo / redo. **Oracle:** every device keeps an intent log (each Simple command's `plan.removes` from its own document at that moment, each Full delete, each cue edit's `(trackId, cueId, text)`). **Asserts** (a) equal hashes; (b) every layer id created during the run and missing at the end is in some device's removes log; (c) every surviving layer has the timed lists it had at its last logged write and every keyframe value is one some device wrote; (d) every surviving cue's text equals text some device typed into that cue id, and every missing cue id was cut by a logged cut / lift or its track's delete. **Reports** the seam count per category (live race / offline replay / undo skip), overwritten edits and refusals. Positive control: a fault injector that drops one layer or one cue's text with no logged intent fails (b) or (d). C's T10 as its own test: a Simple guest offline for 20 edits including 3 ripples while a Full user moves clips; on reconnect no partial ripple lands (arranging was off), clashes are counted, and no new overlaps or gaps. **Round 2 oracle:** (1) each device logs every write it makes, keyed by the host seq that acks it: Simple plans, Full deletes, undo and redo inverses (the layer and cue ids each removes or restores), Full's cue ✕ and the text editor's blank-cue drops as cue removals, and the host's sanitiser fix ops as host-authored intents; (b) and (d) read "removed by some logged intent, including an undo, redo or fix op"; (2) (c) is in wire form: the log keeps each layer's timed lists as `toWire` at its last logged write that touched keys, `trimStart` or `kb`, and the final `toWire` lists are compared against that; every keyframe any device added is present at the end unless a logged delete, cut or undo removed it (compared by layer, list, value and clip time), with keyed camera and camera key edits from the Full guest in the mix; (e) **host stability**: each follower's derived host after every logged write is recorded, and every surviving follower ends with the same host as at its last logged write unless a later logged command moved or re-hosted it (Make main clip, Make overlay, Stay put, delete of its host with `sm.stay`), in the offline-replay sub-case too. Seeds include link drops past the grace window, a **silent drop** (`withFakeNet921` stops delivering but keeps `link.open` true for 5 s while a ripple is committed and the owner moves a later clip: counted under offline replay, with the seam chip and the clash line asserted), and a guest offline adding a title and moving a sticker while the owner deletes an earlier clip (refused `away`; control: drop the `editorsAllConnected` term and (e) goes red). Positive controls: a fault injector that drops a layer or a cue's text with no logged intent fails (b) or (d); a third fault that moves one follower onto a neighbouring clip with no logged intent fails (e); an undo of an Append with undo logging disabled fails (b), which proves the undo path is exercised. **Round 3:** the oracle is fixed where it was vacuous or falsely red: (e) runs per command on the committing device at commit time (every `R.followers` unit keeps its `hostOf` after apply), and globally each follower's final host is compared with its host at its own last logged write, a change allowed only when the follower itself was written by a logged op or a logged Full write changed the start or duration of the main clip it sat on, or of the clip now under it, at a later host seq; hosts are computed on the host's converged document at each acked seq, never on the sender's copy, and the log records every Full start / duration write on a main clip; (d) reads *"equals text typed into that uid, or text carried to it by a logged derivation chain"*, with `splitAt` halves, `FM.splitLayer`'s caption branch, duplicate / paste of a caption track, Find speech and AI-created cues logged as `(trackId, uid, text, from)` and a uid that `stampIds` re-mints logged against the cue it was copied from; an id counts as created only when an ack accepts it, and an op refused by role, `'*'`, lease or stale compare is logged as refused and left out of (b), (c) and (d) (the count stays in the report); new positive controls: re-minting a split half's uid with no derivation log fails (d), and moving a follower's host with no Full span write and no write to it fails (e). New seeds: owner Ezra, guests Sam and Mia, Mia's link held past `C.link.grace` while she adds a title offline and Sam, in Simple, deletes clip 1 → refused `away` on Sam's device, (e) green after Mia's replay (control: a guest predicate reading only the live roster rows lets the delete through and (e) goes red; an owner predicate using `ep.open` lets an arrange through in the silent-drop seed); Ezra splits clip 5 at 30 while Sam deletes clip 2, both orders → no seam chip, one side gets the `mrev` line, the other's edit landed whole (control: drop the `mrev` op and a gap and an overlap appear with B 5 s off A) | 4 |
| T12 | Chrome collision at 380×667, 440×956 and 1280: the editor button, people chip, LIVE pill, comments bubble and person+ door never overlap, in both editors; every `#transport` button's box lies inside `#transport`'s border box and inside the viewport, none intersects `#time-readout`, and the pill's centre is within 1 px of the row's centre (a positive control: a 40 px sixth button fails; the old "no `.t-left` / `.t-right` child overflows its column" fails at 380 today, with no Simple code, because the right group overflows into the row padding), and the queue 420 skip margins (`styles.css:2895-2912`) hold at 440. **T12b** (Phase 1), in Simple with a fake-net peer at 380 and 1280: a remote `.tl-peerhead` sits within 1 px of `host().timeToX(ph)`; an off-screen peer shows an edge chip; a comment mark renders on the Simple ruler; a remote tap lands in the Simple host; a local pointer at a known x reports the matching `t` in presence. **Round 2:** the left-group order is the same at 380 and 1280 px, ignoring ‹ and ⋯ (✂ before ⇄); the own-devices `live` line plus all its buttons fits one row at 380. **Round 3:** ⇄'s x in Simple is the same (±1 px) at 380, 440 and 1280 with ✂ inert (Phase 1) and live (Phase 2); under D2-B ⇄ in Simple and the back button in Full share slot 3's x; arrived in Full from Simple (a hop and a deliberate switch), under D2-B and D2-A, at 320, 380×667 and 440×956: no transport button overflows, the pill stays centred ±1 px, the back button is ≥ 28 px wide and named *"Back to Simple editor"* | 1 |
| T13 | Ripple ⟂ keyframe in both orders (C T2): the key sits at the same clip time on every device. **T13b** Full head trim ⟂ keyframe edit, **T13c** speed ⟂ keyframe edit, **T13d** Simple head trim ⟂ keyframe edit, both orders: either one is refused with the line, or every key sits at its intended time on every device; a uniform shift by `h` never happens. A diamond drag on clip X with a remote ripple shifting X by Δ, then released, and then cancelled: every key keeps its clip time. **Round 2 (both orders named, with `kb`):** order (i) the trim sequenced first, then the key edit; order (ii) the owner's key add through `H.local` first, then a guest's head trim computed without it, and guest-vs-guest: the key exists at its intended time on every device (a head trim sends no list); for speed, the same two orders: either every key sits at its intended time or the speed change is refused whole with the line; positive control: send the trim with the old relative-to-start lists and order (ii) goes red; a control with owner and guest swapped. **Round 3:** the speed race's other order through `kr`: (i) the key add sequenced first, then speed → the speed change is refused whole; (ii) the owner's speed through `H.local` first, then a guest's key add computed without it → the key add is refused with its line; guest-vs-guest and owner / guest swapped controls; the same pair for a ripple rider on the camera and for an undo of a speed step; positive control: drop the `kr` compare and order (ii) goes red with keys at unscaled times | 4a |
| T14 | The start-writer roster (§10.4 4a): each "moves the animation" writer emits `start` and no kf path; each "keeps keyframes absolute" writer emits `start` plus lists shifted by −Δ and the receiver matches; positive control first. With `kb`: each "moves the animation" writer emits `start` and `kb` and no kf path; each "keeps keyframes absolute" writer emits `start` (plus duration / trimStart) and no kf path and no `kb` change. **Round 3:** a caption track with a keyframed cue effect (also inside a container) head-trimmed through every head writer (`trimLayerHead`, the head grip, `extendClipTo` head, Simple's head trim, and a Simple rider window rebase from deleting the first clip) emits no kf-bearing path and the peer's absolute cue-effect times equal the sender's (control: a `kb + cue.start` base goes red) | 4a |
| T15 | `FM.timedLists` equals the generic `kf` walk on the kitchen-sink fixture (a keyframed cue effect, also in a container; a mask path; a point set; open-path trims; audioFx); control: drop the cue walk → red. Round trip live → `toWire` → `applyLive` with a new keyframed effect, audioFx param, animated mask path and point morph (and `kb` / `kr`); `FM.timedLists(layer, {cues: false})` equals the generic walk minus the cue lists; a pre-session undo of a keyframe edit on a clip not at 0 lands exactly; a reopen with a rev-2 persisted base produces zero outbox ops. **Round 2:** on a layer not at base 0, in a live session under `withFakeNet921`: (a) drag an existing diamond in place, (b) change an existing key's value through the inspector (the upsert hit path), (c) a Full speed change on an animated clip, (d) a Simple head trim (its −L key shift), (e) `FM.shiftTransform` on an animated layer (a canvas drag), each observed on a hot tick before release: each produces a kf-bearing (or `kb`) op within one tick and the peer's absolute times and values match (positive control: put an identity-keyed cache back and they go red); the grep test for `D.apply(doc()`, `D.valueAt(doc()` and `A.view()` outside the boundary; a diamond drag rolled back while a remote key edit arrives (the friend's value wins, nothing is sent); share a project with animated clips not at 0 (zero ops and no undo step on the owner's first tick); a Save my version after a clash renders frame-identical to the live project; `toWire` → `applyLive` of a cue-effect key after a cue start op | 1 / 4a |
| T16 | Ripple past a lease (C T4): a crop lease (and, separately, a graph editor or motion path) on a later clip no longer refuses; its crop and keys are untouched; the holder's `FM.time` stays on its frame (owner holder and guest holder); a remote Full head trim leaves `FM.time` still; a remote Simple head trim moves it so `layerLocalTime` is unchanged; a local edit does not trigger it; a key added after the move lands at the same clip time on both devices; a guest op on a leased layer that writes `trimStart` or keys is still refused; the first live arranging edit with a crop lease on a derived main clip and a text lease on a whole-video title adopts whole on every device; Sam holds the text editor on a caption track for the whole run while Ezra deletes, trims, reorders and speeds: all applied, Sam's text byte-identical, later cues moved by `dt`; a cue end edit races a ripple and both land; a ripple deleting the cue being typed is refused naming Sam; an old-build track without cue uids is stamped and diffs keyed; a lease granted during the owner's `await` refuses at the re-check, and one granted at the host while a guest's tx is in flight leaves a seam chip; starting Watch along with crop open releases the lease; a Simple delete of a clip carrying Sam's title keeps it (`sm.stay`, same start) on every device, names Sam in the deleter's line, shows Sam the line, and one undo restores the clip while the title is unchanged (solo control: the title goes). **Round 2:** caption leases: in the "Sam holds the text editor on a caption track" clause the fixture includes a cue inside the deleted clip, a straddler at an insert seam, a keyframed cue effect on a cue that moves relative to the track and a keyframed track: each lands identically on both devices while Sam's `cu` text stays byte-identical and no op is refused by the host (control: remove the caption-track exemption and the dropped cue keeps its old times); Sam holding the **graph editor** on the same track: the ripple is refused whole, naming Sam, and nothing moves; 4b: (a) Ezra reorders so a Stay-put title Sam is typing in needs the z pass → the title ends above the main clip on every device, no `mainInFront`; (b) Make overlay on a clip Sam is cropping → non-main everywhere, no overlap chip, Sam's crop byte-identical; (c) adoption clears a stray `sm.main` on a leased layer and lands whole; (d) control: take `d` out of the exemption and (b) goes red; authorship: a guest deleting a clip with a third member's pre-join title keeps it; a guest sees "your title was kept" for its own add; the owner deleting after a resume (Sam rejoined with a new mid) keeps Sam's title; each fails with the old per-session map; undo: Ezra head-trims clip 5 in Simple, Sam opens crop on clip 5, Ezra ⌘Z → nothing sent, no gap chip, the step still on the stack, and after Sam closes crop ⌘Z restores all clips (also for redo and a guest undoer; control: remove the check and a gap chip appears); presence: during a Simple hold-drag the sampled state has `act: 'arrange'` with the right ids, and during a diamond drag `act: 'kf'` with `af` = the layer; a Simple drag cancels when a remote batch writes one of its `ar.ids`; the end-to-end size case: with `liveArrange` on, a guest ripple past 4,000 ops is refused locally with the `big` line and the host never receives a `rej [['*','bad']]`. **Round 3:** a friend holding the graph editor on a caption track with keyed cue effects while Ezra head-trims it: nothing refused, keys identical on every device; the authorship case with the title's author in Full: the toast text is exact, a tap selects the title, the moved boxes carry the outline for ~1 s, and no `#sm-say` is written (control: with the route removed no line appears on the Full device); owner Mac + a self-marked iPhone: the Mac deletes a clip carrying a phone-made title → it goes (D5), one undo restores both, no line on the phone; the phone deletes a clip carrying a Mac-made title → it goes (control: without `self` it is kept); a guest adds a title with its editor open and no `d L/*/by` is ever sent; a guest's `d L/x/by`, `s L/x/by` and a `by`-less `li` upsert on an existing id are each refused or restored; Ezra deletes Sam's title and presses ⌘Z → `by` still Sam on every device; Sam deletes Ezra's pre-existing title and presses ⌘Z → `by` stays absent; the `big` size case: a 0..end caption track with 2,100 cues and a guest Delete of clip 1 with `liveArrange` on → the guest line and its button, no tx sent, the scene hash unchanged (controls: the same Delete by the owner commits and reaches the guest whole; 1,900 cues goes through) | 4b / 4c |
| T17 | All-or-nothing: a refused `all:1` tx (for any reason, on the owner's path and a guest's) changes nothing on any device; the intent re-run lands; two concurrent adoptions end with one main track; ripple A then B before A's ack, host refuses A: B is not sent until A resolves and the result equals A-re-run then B-re-run; ⌘Z before A's ack consumes nothing and a third person's change survives; a look edit in flight on a path of A survives the revert; an Append landing while the overlay above the main band is deleted ends in the main band on every device. **Round 2:** a guest offline in Full adds 20 titles and nudges one clip the owner also moves, then reloads and reconnects: the 20 titles land and only the nudge is reported as a clash; a Simple ripple plus titles: only the ripple group is refused whole. **Round 3:** a Split refused by the `mrev` compare re-runs as an intent on the ack-corrected base, `t` mapped through the winning ripple's `f` | 5 |
| T18 | Export parity: seam frames, and in Phase 6 transition and animation frames, preview vs exporter; a split half touching a non-continuous source is ramped in both (Phase 2); Phase 6 adds the audio set at `cut ± d/4` and a canvas tap at `cut + d/4`. **Round 2 (Phase 6):** an un-adopted project carrying a stray `trIn` renders no transition in preview or export; a Full duplicate of a clip with a transition, put back on the main track, shows none; Make overlay then Put in the clip row shows none; delete the middle of three clips with transitions leaves no transition from a new neighbour and the line counts it; a two-key fade-in turned into a transition leaves `b` at opacity 1 (control: the old key removal leaves `{kf: []}` and `b` at 0) | 1 / 2 / 6 |
| T19 | Phone layout at 380×667, 375×553 and 440×956: the main track, sound and one lane of the open section visible without scrolling; every project tool visible without scrolling; every tray tool reachable with Make overlay / Put in the clip row in the first five; the sheet docks under the Simple timeline; nothing off-screen; the main track and the tapped clip do not move by 1 px when a selection is made or cleared; every timeline control has an `elementFromPoint` hit area ≥ 32×32 (28×40 for play-bar buttons; a grip on a 0.3 s clip at the widest zoom-out ≥ 24 px), with a deliberately 10 px control as the positive control; the empty states (no layers: big, playhead hidden; text and shapes only: slim row, playhead shown). **Phases:** Phase 1 asserts the main track, sound and one lane visible, nothing off-screen, no 1 px move on select, hit areas ≥ 32×32 with the 10 px control, the empty states and the sheet docking; the project-tools and tray clauses are Phase 2 (so T19 is 1 / 2 / 3). **Round 2:** at 375×553, 380×667 and 440×956, select a canvas text while Text is folded and Overlay is open (plus a project that also has a behind background), select a main clip then clear the selection, switch from a 1-lane to a 3-lane section: the clip row's and sound row's `getBoundingClientRect().top` are identical before and after (0 px; control: a build where the sections box is `height: auto` fails), and the open section with nothing selected on open is the stated default; at 375×553 the timeline is 173 ± 1, exactly one 32 px lane shows (the rest on the glyph's badge) and neither `sm-tight` class is set; at 375×540 only `sm-tight-1` is set; at 375×520 both `sm-tight-1` and `sm-tight-2` are set and the tray row is 40 px; at 375×480 both stay set, the open section may be glyph-only with its badge, every tray tool is reachable and nothing is off-screen; `#sm-say` at 380×667, 440×956 and 1280 is no taller than the tray row for every §3.11 string, does not intersect `#sm-timeline` or the play bar, and with a line showing `elementFromPoint` at a main clip's centre returns that clip and a tap there selects it (control: point `say()` back at `FM.toast` and the overlap assertions fail); with a 20-photo main track and a held reorder of clip 1 parked in the right edge zone, the track scrolls, clip 1 lands last and the loop stops at the ceiling below the frame cap; a tail-trim grip parked there extends past the first screen and stops at `srcDur`; the same drags outside the zone do not scroll; the shared filmstrip cache stays within its bound after 5 zoom changes and a full scroll. **T19b (PC, Phase 1 / 2):** at 900×700, 1280×800, 1920×1080 and 844×390, every project tool and every tray tool in the first five shows its label with the same text as at 380; each open panel's first control row is visible without scrolling and at least 160 px tall; at 844×390 with Look, Speed and Captions open the panel is outside `#inspector-panel`, its first control row is fully visible without scrolling, every control is at least 28×28 by `elementFromPoint`, and every tray and project tool in the band keeps its label (control: a build that docks the panel in the band fails); with D20's C open the canvas rect does not intersect the panel rect; nothing overlaps `#t-far` or `#t-sel` (queue 801); every control has an `elementFromPoint` hit area ≥ 28×28 with a 10 px control as the positive control. **Round 3:** at 375×553 and 380×667, with 1, 2 and 3 folded sections, `elementFromPoint` at each folded opener's centre returns that opener, whose rect is ≥ 32×32 (control: openers stacked vertically in the band fail); every lane item, glyph + badge and the sound row give ≥ 32×32; a project with a 0..end song, two clips with Take-sound-out twins and a voice-over overlapping clip 2 (plus a letterbox, a behind adjustment and a mask-include under clip 1) at 375×553, 380×667 and 440×956: the clip row's and sound row's top and height are identical to a song-only project, a tap over the voice-over stretch opens the chooser listing exactly the song and the voice-over with every row ≥ 44 px, +N appears with a third overlapping sound, no twin is drawn in the Sound row and each clip shows its twin strip (control: a build that grows the row or stacks lanes in it fails); a project with a behind background, Solo on, one missing clip and a camera: the clip row's and sound row's top equal a plain project's (0 px), adding then deleting a behind layer through the fake net moves them 0 px, and each notice sits in the tray row at ≥ 32×32 (control: Behind drawn as its own row fails); every §3.11 / §3.12 string with its buttons and a 32-character name at 380×667 and 440×956: `scrollWidth ≤ clientWidth` on the text span and every button inside the row (control: the old owner `live` string fails); at 380×667 a locked clip with 🗑 tapped twice 80 ms apart at 🗑's centre stays and stays locked with its line shown, a clip with two titles tapped twice is deleted with the undo depth up by exactly 1, no line button overlaps 🗑's old rectangle, and Make Sam a Viewer needs its menu (control: without the arming delay the double tap undoes the delete). **Phase 1 clauses:** at 380×667 and 1280 a Delete on a main clip and a seam-chip tap each show their line in `#sm-say`, one row no taller than 52 px, not intersecting `#sm-timeline` or the play bar, `elementFromPoint` at a main clip's centre still returns that clip, and the clip row's top is unchanged (control: pointing `say()` at `FM.toast` fails) | 1 / 2 / 3 |
| T20 | The widened brand-name guard covers every Simple label, and §8.9's words table is the only source of labels. The strings live in one object (`js/spine-words.js`); no Simple DOM text node, `aria-label` or `title` exists outside it (a hard-coded label is the positive control), and no command label appears in two menus or trays (one home per control, §8.5). **Round 3:** for every selection state (none, main clip, overlay, text, caption track, sound, effect segment, block) no two visible controls share a face label, a title or a command id (control: a fixture rendering "Overlay" in both rows fails); no Simple text contains *"made in Full"*, *"set in Full"* or *"Animated in Full"*, and an animated element inserted in Simple shows the ✦ line without the word "made" | 1 |
| T21 | Shared chrome (§8.8), in Simple with 0, 1 and 2+ selected at 380 and 1280: none of `#vb-layers`, `#vb-camera`, `#m-dup`, `#m-del`, `#m-group`, `#m-maskgroup`, `#m-more`, `#btn-parent`, `#btn-del-layer`, `#btn-group`, `#btn-maskgroup`, `#btn-more-layer` is visible; Shift+1 and Tab onto a camera change nothing; right-click offers no camera or controller; the ? sheet has no "camera" or "Right-click timeline". Positive control: the same assertions fail in Full. **Round 2:** select one item and then three in Simple at 380: `#m-notes` is `visibility: hidden` and its box and ⚙'s and Export's do not move by 1 px; deselect and it is visible again; in Phase 1 no delete control shows and Delete on a main clip only shows the Phase 1 line, in `#sm-say`. **Round 3:** in Full park the Add row mid-stack (◐ at about 50 %), switch to Simple, add a text and append a clip, switch back: the Add row sits above the same layer and ◐'s proportion matches that position (control: drop the restore line and it goes red) | 1 |
| T22 | Accessibility (§8.10) at 380 and 1280. **Round 2:** Move earlier / later and Alt+←/→ (order changed, one undo step, live-gated), the Length row trimming exactly like the D grip, the `#sm-say` announcement, and a reduced-motion emulation run asserting no transitions on the ripple glide, the tint and the lift ghost. **Round 3:** press Move earlier three times in a row on clip 5 of 5, by pointer (`elementFromPoint` at the button's centre each time) and by keyboard (Enter ×3 with no refocus): the clip ends at slot 2, `document.activeElement` is still Move earlier, the tray's tool set is unchanged, and `#sm-live` read *"…moved to 2 of 5"* (control: route the line to `#sm-say` and it fails); a refusal line with focus inside it is still shown after 6 s; key scope at 1280: focus a timeline clip and Tab → the tray's first tool with the selection unchanged; keyboard-focus Move earlier and Space → one move, one step, not playing; click Split with the mouse then Space → playback, no second split; ⇧Tab from the tray's first tool → the selected clip; Tab reaches `#sm-say`'s Undo and Enter undoes (control: the unscoped handler fails the first two) | 1 |
| T23 | Simple panels never add a keyframe: volume keys [1, 0.3, 1] set to 50% at the middle key keep their count, scale by 0.5/0.3 and have no key at `FM.time`; the same for an animated Adjust param and an animated crop; a colour row on an animated fill is read-only; canvas drag / pinch / rotate change no kf array's length. Mutation: swap `shiftProp` back to `setProp` → red | 2 |
| T24 | Sync twins: take the sound out, then head trim, tail trim, 2× speed, split + reorder B, reverse; after each the twin's trimStart, duration, speed and reversed equal its clip's; Mute clip sound off never un-mutes an extracted original. **Round 2:** a karaoke twin (switch karaoke on for a stereo clip), then head trim, tail trim, 2× speed, split + reorder B and reverse: after each the twin's trimStart, duration, speed and reversed equal its clip's, `FM.karaokeTwinOf(B)` is B′, and the karaoke toggle on B removes B′ and un-mutes B; after an export → `.fmotion.json` import round trip the extract twin and the karaoke twin are both still recognised and still follow a trim; reverse: one undo step, no frame cache on the twin's media record, c's keyframe times and a follower's start unchanged, and `FM.history` not muted while the cache builds. **Round 3:** the twin is not in `lanes.audio`, draws inside its clip's filmstrip, a tap there selects the clip, the clip tray's Volume acts on the twin, and Put sound back deletes the twin and un-mutes the clip in one step | 2 |
| T25 | Simple Speed panel: on the middle of three main clips, drag to 2× and release: no seam chip, followers and cues scaled, one undo step, the scene untouched before release; with `othersCanEdit()` true, the release is refused even with the panel already open. **Round 2:** a 0.25 s clip at 3× is refused with *"Too short to speed up that much"* and the document is byte-identical afterwards; the positive control (0.25 s at 2× → 0.125 s) commits; after any accepted change `trimStart + duration·sp ≤ srcDur` and the source span is unchanged to 1e-6; the slider stops at `min(4, span / MIN_LEN)` | 2 |
| T26 | Ask in Simple: a scripted batch of trim, speed, delete and duplicate on main clips leaves no new gap or overlap and meets §3.9, as one undo step; a dropped pro op leaves the scene unchanged; both fail with the `simple` branch reverted. **Round 2:** one turn of [trim clip 1, speed clip 2, delete clip 3, duplicate clip 4 (a video), addText referencing the duplicate's `newRef`]: all five land, exactly one new history step, zero collab diffs sent between turn start and commit (spy on `beforeSnap`), and ⌘Z restores the pre-turn scene byte for byte; intent 2 locked → dropped with its reason, 1 and 3 still land, still one step; a tray tap during the await is refused, not queued; each fails with the `compose` branch reverted. **Round 3:** *"add a title at the end"* leaves `P.duration` unchanged and the title below the caption tracks; *"add a warm look"* lands in the effect band. **T26b (D3):** (a) with one project in `fm.projects` and no `fm.editor.new`, the first boot writes `'full'` and the dialog opens on the Full card; (b) with an empty index it opens on Simple; (c) control: with the migration removed (a) opens on Simple and fails; the ten dialog-driven tests seed `fm.editor.new = 'full'` | 3 |
| T27 | Undo order (fake net, `921 S2` style): Ezra adds a text in Simple, Sam brings an overlay forward, Ezra undoes: the text is gone and Sam's order kept; Ezra deletes a clip and its followers, Sam adds a title on top, Ezra undoes: the clip and followers are back and Sam's title is still at index 0; Ezra's Put behind, Sam moves the same clip, Ezra undoes: soft-skipped with the soft-undo line. Labels survive in a session and after Stop sharing, and redo keeps them. **Round 2 (adoption in a session):** (a) Ezra's first ripple adopts, Sam appends two clips, makes an overlay a main clip and reorders, Ezra ⌘Z: `project.sm.adopted` stays true on every device, Sam's flags are honoured, his clip is still main, and the next arranging edit removes no flag; (b) the same with Full's Put in the clip row as the adopting step; (c) solo control: one undo returns to un-adopted; positive control: remove the `st.adopt` filter and (a) goes red. **Round 3:** (d) Ezra's first ripple adopts, Sam puts an overlay in the clip row, Ezra stops sharing and presses ⌘Z through all his steps: `project.sm.adopted` stays true, Sam's `sm.main` survives, and the next arranging edit removes no flag; (e) Ezra adopts before sharing, Sam joins and makes a main clip, Ezra stops sharing and undoes into the pre-session step: the same (control: share, nobody joins, adopt, stop, ⌘Z → un-adopted; positive control: gate the filter on `S.active` and (d) goes red); masked undo of adds: a guest adds a title and undoes it with nobody else touching it → gone on every device (control: an unmasked compare goes red on the host's `by` stamp alone); Ezra appends 3 clips, Sam deletes clip 1 (a ripple rewrites their start and `kb`), Ezra's ⌘Z still removes the append; Sam adds a title in a gap, Ezra's Close gap pins it `sm.stay`, Sam's ⌘Z still removes it; negative control: Sam edits the title's text and Ezra's undo of the add is refused with the named line | 4a |
| T28 | Comment pins: pin a comment on clip 5, ripple-delete clip 2, tap the pin: the playhead lands inside clip 5 at the same offset and the ruler mark is drawn there; a comment with a forged `lo` and no `lid` is stripped by the host. **Round 2 (replacing the offset `lo` case):** pin on the second half of a clip, then a Simple split and a Full split before the pin → the pin stays on the same frame; delete half A → the pin stays on B; a Full head trim by 1 s and a Simple head trim by 1 s → the pin stays on the same source frame, checked by `layerLocalTime` at `pinTime`; 2× speed → same; a text-layer pin through split and head trim keeps `fxLocalTime`; a pin whose footage was trimmed away clamps to the edge; a guest split live keeps pins; export → import, Save my version and checkpoint restore, each after a ripple, keep the pin on the same frame of the same clip, and a pin whose layer was deleted before a duplicate lands at its baked `t`; a forged `ls` without `lid` is stripped by the host; control: a pin on a clip that is only moved lands where `start + offset` puts it. **Round 3:** with nothing selected, pin at the middle of clip 5, ripple-delete clip 2 → the pin lands at the same offset in clip 5 (control: without the `mainAt` fallback it lands at the old absolute t); a pin in a gap, then a ripple → it stays at t; a pin on a caption cue on a spanning track, then a Delete of an earlier clip that shifts the cue while the track's start stays → the pin stays at the same offset in that cue (control: `lo` alone drifts) | 2 |

Every negative test gets its positive control first (memory: "a negative test needs a control").

---

## 15. Phases (each ships on its own through `ship.sh`, proven before the next)

| Phase | What ships | He can hold it? | Size | Gate |
|---|---|---|---|---|
| **0. Decide** | the visualizers and the decision sheet (§17) | he sees it | — | his picks on D1–D21 ("do recommended" answers all); D15 says whether to start |
| **1. See any project as clips** | plumbing (`sanitizeSm` canonical and on load, `srcW`/`srcH` and `audioOnly` at add time, `onCopy` with the route table, `onSplit`, `FM.setClipSpeed` extraction, `FM.timedLists` with cue effects (Q3, a Full fix), the `ai-ops` start fix, Full's split guard raised to 0.1 s (Q28, a Full fix), Follow and layer-reference effect sources resolved through the split lineage (§3.10 rule 1, a Full fix), the effect-instance `sm` marker kept by the sanitiser, `FM.worldBox`, the media-state facts, exported timeline helpers, `FM.timeline.host()` and dock hooks, presence `ed`, `SCHEMA_REV` 3 with the fingerprint fixture, brand guard); `FM.spine` read side (classify with the corrected fillsFrame and kinds, `FM.docRev` cache, sections, lanes, seams incl. blend and slot); the Simple timeline **read-only** (select opens today's panels, docked; seam chips shown); shared chrome hidden (§8.8); the editor button with a crossfade; key E; accessibility basics; `#sm-say` / `FM.spine.say()` as a lines-only row and `#sm-live` (§15.1); ✂ in slot 2, dimmed and inert; Simple's `+` laying picked files end to end through `handleFiles`' `{at}`, with pick stamps (§15.1). **Behind a "Simple editor" switch row in Settings** (the same `switchRow` as "Work with friends", `js/settings.js:550`; hint *"See any project as clips — still being tested."* (it becomes *"Edit clip after clip — still being tested."* in Phase 2); its own untitled group directly above "Work with friends"; `state.simpleEditor` in the saved-keys whitelist at `js/settings.js:106`, the #688 trap; off by default; when off, every entry point is hidden and the open project returns to Full at once, §15.1; the word "Labs" appears nowhere on screen). The Phase 1 screen is §15.1. Works in live sessions (the Simple timeline is read-only; panel edits are ordinary one-layer edits). The switch glyph and seam chips ship only after D16 rows 1 and 5, or "do recommended" | **Yes, as a preview** | ~2,200 lines (the timeline renderer is most of it) | T1, T6, T7, T8, T12, T12b, T15 (collector part), T18, T19 (Phase 1 clauses), T19b, T21, T22; a 380 px screenshot sheet of the §15.1 screen, including the Settings row where it sits, the `#sm-say` row blank and with the Delete line, and the dimmed ✂; his picks on D1, D2, D9, D15, D16 and D18 |
| **2. Edit clip after clip** | `FM.trimClipEdge`; the runner and every command (§3.6) incl. single flight, the lease half of blockers, couplings, tail and pinStrays, playhead landing, Speed panel, `shiftProp` rows, sync twins, the de-click continuity fix; attachments and Stay put; adoption with `project.sm.adopted`; DOM-only drag preview with the arm gate and edge auto-scroll (`gesture()` a local-only feed; presence `ar` waits for Phase 4); Move earlier / later and Length; A/S/D/Delete/⌘D/⌘V per §8.3; the tray and project tools; Close gap / Fix / Close all gaps; comment `ls` / `lo` with the lineage resolver and the re-id remap; undo labels, the `arr` gate on undo and the lease half of undo's pre-flight for multi-layer steps, the undo queue during a run (the looping drain, `commitSeq`), the `sm-running` busy state; `#sm-say`'s Undo / Do-it-anyway / Options wiring with its arming delay; the Q29 whole-tx refusal fix; the persisted-roster `othersCanEdit`; manifest meta. Arranging off while an editor is in the session; look edits live | **Yes, as a preview** | ~2,000 | T2–T5, T9, T10, T23–T25, T28; his picks on D4–D8, D10, D14, D17 and D19 |
| **3. Make it look nice, and the way in** | Look (filters + Adjust), Captions with riders and Find speech (stays with its sound), Effects segments, Ask with Simple's vocabulary (§8.5a, or held per D12), New project cards and the folded settings (with the D3 migration, §7.1), Clips › Extras (D21), the synchronous picker, Home chip and ⋯, template routing and template-fill Replace, pack insert, Full's layer-menu items and stripe; the switch animation pool. **The preview switch removed** | **Yes** | ~1,200 | T6, T19, T26, T26b; his picks on D3, D11, D12, D20 and D21 |
| **4. Together** | 4a clip time on the wire (keyframes relative to `kb`, cue effects relative to their cue, the uncached `toWire` / `applyLive` / `fromWire` boundary with its named roster, the persisted base stamp, the drag and kfDrag fixes, the speed race's whole-tx stale compare, presence `ar` and `act:'kf'` with `sample()`'s order, undo order) → 4a′ keyed cues → 4b lease protects content, membership (`sm` set and delete), stacking (`mv`) and a typist's other cues → 4c pre-flight (drags, `act:'kf'`, the caption-lease rule, undo's blockers), keep my frame (`afterApply`, `sameFrameTime`), authorship in `L.by` and the `mine` set → 4d glide, "Sam moved 4 clips", own-add repair, the Reconnecting grey, the gate lifted while online and every editor connected, the measuring fuzz. **`SCHEMA_REV` bumps at 4a, 4a′, 4b and 4d**, enforced by the widened fingerprint. **Starts after his first real Mac ↔ iPhone test** | **Yes** | medium-large | T11, T13–T16, T27; a tier-3 run (real frames on `h.`/`a.`/`b.localhost`) |
| **5. All-or-nothing** | `all:1` on both host paths for any refusal; one arranging step in flight with an intent queue; undo waits and is CAS-checked; the offline outbox's `all`, with a reloaded guest's work partitioned by persisted path stamps so only arranging groups are all-or-nothing; the optional own-follower repair; `PROTO` bump (if not already in 4a). Before Phase 6 if the Phase 4 fuzz shows seams, after it otherwise | only as "no seams" | medium | T17 |
| **6. Transitions and clip animations** | ◇ at each cut, the picker, Use on every cut, Turn into a transition on blends; In/Out/Combo on clips; `FM.transitionAt` / `handleLocalTime` without widening the shared gates; sound picture-only; `SCHEMA_REV` bump; drawn options first (his design rule) | **Yes** | medium | T18; his pick on D13 |
| **7. Later list** | freeze (the §3.6 freeze note: `FM.renderStill`, capture before the split, first / last frame at the edges), stabilise, speed-curve presets, beat markers, SRT, keyframe diamond, sticker and text-style libraries, words for captions, an audio crossfade at transitions, onboarding (#855, held for launch) | item by item | per item | his go-ahead each |
| **8. Only if measured** | C's derived layout, if Phase 4–5 sessions still show seams often | maybe | large | C's T1–T16 |

No phase depends on a later one. Phases 1–2 cannot break a project: the `sm` keys are absent from everything that exists
today, and nothing is written until an arranging edit in Simple.

### 15.1 The Phase 1 screen (what he holds first; V11 draws it at 380 and 1280 px)

Phase 1 is read-only Simple, so the finished layouts of §8.2 / §8.3 do not describe it. Stated here so the builder never meets
a contradiction and the gate never lists a test that cannot pass:
- **Phone:** no project-tools row, and the tray row's slot ships as a **lines-only `#sm-say` row**: 52 px, always in the DOM,
  blank when idle, `role=status`, `aria-live=polite`, between `#sm-timeline` and the play bar (plus the hidden `#sm-live`). The
  stage clamp subtracts the top bar, the play bar and this row, so a line appearing or clearing moves nothing by 1 px, and Phase 2
  fills the same row with tools without changing any geometry. **PC:** the `#inspector-panel` band shows today's docked panel
  for the selection, with `#sm-say` in the tray strip's place and no tools strip. (§3.12 bans `FM.toast` for Simple's lines, and
  Phase 1 still has two lines to show; without this row a builder would reach for the three-row toast pill over the timeline.)
- **Every Phase 1 line goes through `FM.spine.say()`**, with one real `<button>` **Open in Full** of at least 44×32 px (§3.12
  rule 2); it clears by §3.12's rule for a line with a button (after 10 s, never while focus or the pointer is in it, or on a
  tap elsewhere), and the seam chip's accessible name and `title` carry the same words. The
  strings live in `js/spine-words.js` (§8.9), so T20 passes.
- **Adding:** `openAdd` opens Full's existing Add sheet unchanged for everything else (`js/mobile.js:398`), but **media files are
  laid end to end**: Phase 1 pulls §14.2's `addMediaLayer(rec, {at})` forward and `handleFiles` takes an `{at}` from Simple's `+`:
  the first file at `T = R.trackEnd` (0 when the main track is empty), each next at `T +=` its length, in the main band (§3.6.1),
  nothing existing moving. This is a plain add, with no moves, no adoption and no `sm.main`; a tail item simply stays over the
  new clips until Phase 2's Append takes over. (Full's import puts every file of one pick at one start, `js/app.js:3040`, `:3074`,
  so Phase 1's headline "+ 4 clips" would otherwise have shown one clip; each layer is stamped `pick: {b, i}`, §5.2.)
- **Deleting:** no delete control shows in Simple. Delete / Backspace on a main clip does nothing but say *"Deleting clips comes
  next · Open in Full"* (with ⇄); on a non-main item they call today's `FM.deleteLayer`, which cannot open a gap on the clip row.
- **✂ shows but is inert**: dimmed, `aria-disabled="true"` and still tappable; a tap, or A / S / D, shows one line, *"Splitting
  comes in the next update · Open in Full"* (with ⇄), like the seam-chip and Delete lines. So the phone's play-bar left group is
  ⋯ · ✂ · ⇄ · |◀ from Phase 1 on (D18's recommended order; under D18 B, ⋯ · ⇄ · ✂ · |◀ just as fixed), and PC's ‹ ✂ ⇄ |◀: no control changes slot between phases (hiding ✂ put ⇄ in slot 2, which
  Phase 2's ✂ would then take over). E, Tab, the arrows and M work.
- **Seam chips** draw with their accessible names; a tap selects the chip and shows one line, *"Closing gaps comes in the next
  update · Open in Full"*; no write.
- **Selecting** opens today's panels, docked (§8.2's sheet dock hook), which edit the layer as Full does (one-layer edits, so
  nothing ripples).
- **The Settings row** reads *"See any project as clips — still being tested."* It sits in its own untitled group directly
  above Work with friends (decided, §17). **Flipping it off** calls
  `FM.editor.apply('full')` on the open project (not `set`, so the card's `editor` and `project.sm.home` are kept for when it
  comes back), in §6.2's order (flush the text editor, close exclusive tools); it takes no refusal: if a drag or an export is
  live, the switch waits for it to end. Flipping it back on calls `FM.editor.apply(homeFor(...))`. While it is off, ⇄, E, the
  cog's Editor row and Home ⋯'s Open in Simple / Open in Full are hidden, and `homeFor` answers Full (§7.2).

---

## 16. Risks

| Risk | Size | What reduces it |
|---|---|---|
| Two people ripple the same stretch at once | medium likelihood in busy sessions, low harm | the live gate until Phase 4; pre-flight; from Phase 4 the `mrev` compare refuses the second one whole with a line; seam chips and Close all gaps; Phase 5 CAS and intent re-run; Phase 8 on measured need |
| Clip time on the wire is a protocol change to a shipped engine | medium | its own step (4a), after his first real test; one shared collector; T13–T15 detectors; `SCHEMA_REV` gate |
| The classifier picks the "wrong" main track on an odd Full project | medium | native size instead of the scale fallback; background, stacked-take and crossfade filters; undecided units; blend and slot seams; view only until the first arranging edit; one-tap Make overlay / Make main clip; T1 fixtures from his real projects |
| A copy route forgets `sm` (whitelist drift, four past bugs) | medium | one helper with a keep / strip route table, one test over every route in both directions; a stray flag is ignored until `project.sm.adopted` |
| Full-made work (camera moves, parents, mattes, hand crossfades) silently desyncs under a ripple | medium | couplings (§3.10), the camera as a rider, blends kept, the ask-first pre-flight |
| Two timelines to maintain | ongoing | Simple reuses helpers, browsers, inspector builders and the renderer; only the timeline and toolbars are new; the switch test compares x positions across both |
| Phone height with two toolbar rows | medium (a Safari tab on an SE-size phone was ~50 px short with a 40svh stage) | real sums in §8.2; the stage clamp in Simple; the permanent tray row; 3 lanes + N; icons-only **and** a 40 px row; measured at 375×553, 380×667 and 440×956 |
| Phone performance (filmstrips, lanes) | medium | visible-range drawing, folded sections, measured budgets |
| The derived link surprises someone (an item that ends on another clip) | low | the link line, Stay put, and every precedent works the same way |
| Captions disappoint without words | medium | say plainly "finds when people speak"; words are Later |
| Looks copied from CapCut | certain if unguarded | own words and order, the morph, BEFORE-PUBLISHING entries, the widened brand guard |
| Transitions cost the phone frames | medium | Phase 6 on its own; crossfade first; measured |
| Scope creep toward CapCut's whole list | medium | the Core / Later / Never table is the contract; Later items need his go-ahead one by one |

---

## 17. Decisions for Ezra

**This is the final list: D1–D21.** Each is one pick, answered with a letter, with the recommended option in bold and marked;
V10 draws every option. **"Do recommended" answers all of them.** Everything else in this file is a detail decided with the
recommended option, per his rule (the list under the table); he will say if one is wrong after he sees it.

| # | Question | Why it matters | Options |
|---|---|---|---|
| **D1** | What are the two editors called? | It is the word on the switch, the New project cards and every Home card. | **A. Simple / Full (recommended: your own word, and "Full" promises nothing is taken away)** · B. Quick / Full · C. Clips / Layers · D. Cut / Motion. ("Pro" is avoided: you use it for a paid version.) |
| **D2** | Where is the switch when you are in Full, on the phone? | Full's play bar is already full, so the switch either takes a button you use or sits one tap away. | A. Slot 3 of Full's play bar too; your ◐ Add-row switch moves into ⋯ as a Top/Bottom row and loses its knob · **B. The first item inside Full's ⋯ (one extra tap, your row untouched); after a switch or Open in Full, a back-to-Simple button (the Simple icon with ‹) stands in slot 3 until you go back, and a short note says so (recommended)** · C. On phones about 430 px wide and up (yours is 440), every play-bar button shrinks from 34 to 31 px so five fit; narrower phones use B (your row would change, and differ between phones) · D. Not on the play bar at all: only the ⚙ canvas settings and Home's ⋯ (the back-to-Simple button still appears after Open in Full). §6.1 calls these D2-A to D2-D; on PC the switch is always in the left group |
| **D3** | How does a new project choose its editor? | It decides what + New project does on your devices and on a friend's fresh install. | **A. Two cards in New project that remember your last pick; Full stays picked on any device that already has projects, Simple only on a brand-new install; picking Simple folds the rarely used settings into one line (recommended)** · B. Always start in Simple · C. Always start in Full |
| **D4** | Do text, stickers and overlays follow their clip? | It decides whether titles stay on their picture when you move or cut clips. | **A. Yes; music, voice-overs and long things stay put; anything can be set to Stay put; lyrics timed to the song are spotted and you are offered "Keep on the music" (recommended)** · B. Nothing follows (CapCut on the phone) · C. Ask each time |
| **D5** | Deleting a clip that has things on it | A deleted clip either takes its titles with it or leaves them floating over the wrong picture. | **A. They go too; a line says how many; Undo brings all back (recommended)** · B. They stay where they were |
| **D6** | Trimming away the part of a clip a title starts on | Without a rule the title would jump onto the next clip. | **A. The title slides back so it stays on its clip (recommended)** · B. The title is deleted too (Undo brings it back) · C. It comes off and stays where it was |
| **D7** | A locked clip is in the way of an edit | A lock would otherwise block every edit that has to slide the clip along. | **A. The edit stops and says how many are locked, with one tap to "Do it anyway": one step, and the lock stays on afterwards (recommended)** · B. It moves along in time anyway; only its contents stay locked |
| **D8** | Gaps in the main track | It decides whether Simple ever tidies gaps you left on purpose in Full. | **A. Simple never makes them; gaps made in Full show as a block you tap to close (recommended)** · B. Simple closes every gap when you switch (this rewrites the project) · C. A gaps on/off switch on PC (phone and PC would differ) |
| **D9** | An old project opened in Simple | It decides whether your existing projects need a setup step before Simple shows them. | **A. It opens as it is, the main track worked out for you, nothing written until you arrange clips (recommended)** · B. A "Make a main track" button first · C. Old projects stay Full-only |
| **D10** | When a clip is selected | CapCut's worst trap is the main toolbar vanishing when a clip is tapped. | **A. Its tools appear in a row above the main toolbar, which never disappears (recommended)** · B. Its tools replace the toolbar, with a "‹ Done" |
| **D11** | The switch animation | Your #974 answer builds all three (morph, fold, slide) and plays one at random; this only decides when you choose the keeper. | **A. Keep all three at random for now and name the keeper once you have lived with them (recommended)** · B. Pick one now from V1 and build only that |
| **D12** | The Assistant in Simple | It decides whether Ask is in Simple from the release that adds looks and captions. | **A. An "Ask" button in the project tools when you have a key set, which edits through Simple's own commands (no gaps, one Undo) (recommended)** · B. Not in that release: Ask waits until it is wired into Simple's commands |
| **D13** | Transitions | It decides whether adding a transition changes your video's length. | **A. They never make the video shorter (recommended)** · B. The two clips overlap, so the video gets shorter by the transition |
| **D14** | Friends and Simple | It decides how soon you and a friend can edit one project in different editors. | **A. Looks, text, captions and sound work together from the first release that edits; moving clips together comes in the "together" release (Phase 4) (recommended)** · B. Wait and ship both at once · C. Simple stays view-only while friends are in |
| **D15** | Build it? | The go-ahead; nothing is built until you say so. | **A. Build Phase 1 (see any project as clips, and the switch, behind a Settings switch you turn on) and show you (recommended)** · B. Keep planning · C. Not now |
| **D16** | Icons and marks, drawn big and at their real size (24 px in rows, ~14 px on badges and chips), rendered in place at 380 px through the app, none from CapCut or Alight Motion. Rows: (1) the switch glyph in both states (also on the New project cards and the Home chip); (2) the Captions / Text / Overlay section marks; (3) the ✦ badge; (4) the hatched block and the black band; (5) the gap and overlap chips and the *"More in Full ›"* notice; (6) the back-to-Simple button; (7) the project-tool and tray icons (they must read icons-only) | You will look at these every day, and none may be copied. | **A. The set marked recommended on the sheet (recommended)** · B. Pick per row |
| **D17** | Music longer than your clips | It decides whether a long song makes the video run on in black. | **A. It ends with the video (fading out, up to 2 s), and a switch lets it run on (recommended)** · B. The video runs on in black, as Full does today |
| **D18** | The order of Simple's play-bar buttons on the phone | It decides where ✂ and the switch sit under your thumb. | **A. ⋯ · ✂ · ⇄ · \|◀: the switch in slot 3, the same spot as D2-B's back button in Full (recommended)** · B. ⋯ · ⇄ · ✂ · \|◀: the switch where Full has ⧉ |
| **D19** | Benchmarks (the marks you tap on the beat) | It decides whether a mark stays on the song or moves with a clip when clips before it are removed. | **A. They stay on the music (recommended; music stays put too)** · B. A mark tapped over a clip sticks to that moment of the clip |
| **D20** | On a computer, where a tool's panel (Look, Speed, Captions) opens | It decides whether the panel covers the picture, the timeline, or squeezes into the left band. | A. Inside the left band, scrolling (at 1280×800 the band has ~100 px left for a panel) · B. Rising over the bottom of the picture as a sheet (it covers the lower-left of the picture you are judging) · **C. Rising over the timeline, exactly as on the phone: about twice A's room, and the picture is never covered (recommended)**. On a phone held sideways every option opens over the timeline (§8.3) |
| **D21** | Can you add shapes, saved elements and templates inside Simple? | Without it you switch to Full for every lower third or template. | **A. Yes, under Clips › Extras, and what you drop in stays editable piece by piece (recommended)** · B. Only in Full, with one line in the Clips tool: *"Shapes, elements and templates are in Full ›"* (then §12.2's two "Inserting … in Simple" routes and their T6 cases are built only once a door exists) |

**Numbering.** D1–D17, D20 and D21 kept their numbers through the three rounds. D18 and D19 are reused: the questions that
had those numbers in round 2 (where the Settings row sits; whether a dropped editor's hold lapses) are decided below, and the
numbers now belong to the Simple play-bar order (split out of D2, whose sheet already showed it) and to benchmarks (Q23,
promoted from §19 because both options are specified and only he can say how he uses the marks). The §20 log keeps the
numbers it was written with. D2's old option C, a small tab on the top edge of the timeline, was dropped: nothing in the
design describes or measures it.

The four #923 questions from 25 Sep are covered: names (D1), per project or per clip (per project and per device; not per clip,
because a clip behaving differently depending on which editor made it would be two rules for one thing, #454), who comes first
(the phone and someone who has never edited, with the same keys as Full for the fast expert; decided, not asked), and build
yet (D15).

**Decided with the recommended option, not on the sheet** (he will see each in a picture, and a wrong guess costs one tap): a
caption line cut by an inserted clip splits into two with the same words (V9); on a head trim, things on the clip stay on the
same footage (V9 draws the alternative, "same time into the clip", beside it, labelled "alternative, not chosen", Q1); the word
table (§8.9, with "Move to top layer / Put back in line" drawn as the non-recommended alternative, and the tray faces ⤒ Lift off /
⤓ Into row for him to change); Use one speed keeps the length; a friend's item on a clip someone deletes in a session is kept as
Stay put without asking (Q24; V10 draws it); the phone's ✎ hides while something is selected (his #171; V10 draws A hide / B
keep); a caption straddling a freeze stretches over the held still (§3.6); elements dropped in Simple never join the clip row
(§12.2); on PC the band reads from the bottom like the phone, project tools at the bottom edge (V1); **the Simple editor
preview row in Settings sits in its own untitled group directly above Work with friends** (round 2's D18; its hint already
says "still being tested"; V10 draws the untitled row beside "Try it early", labelled alternative, not chosen); **a friend with
the Editor role whose connection dropped keeps arranging off until they leave, you remove them, or you tap Arrange anyway or Make
Sam a Viewer; it does not lapse by itself** (round 2's D19: their offline changes are kept with no time limit, §3.7; V10 draws
the *"Sam is offline · clips stay put"* line with its button, with the 24 h lapse beside it, labelled alternative, not chosen);
followers keep their own length through a Speed change (only where they start scales, as Final Cut's connected clips do); a
Delete never cuts a block; there is no Keep pitch switch (#916); the sound rule's 1 s margin (§4.1). These are detail or
technical calls on a sheet he wants short (his-prefs §12 rules 7-8).

---

## 18. What the visualizers must show (step 4)

**The final list: V1–V12**, published together behind one hub page. Each is an interactive page built through the app's own rendering where it can be (memory: "render the sheet through the app"),
checked at 380 px and 1280 px, with sheets split for his phone if tall (memory: "tall images fail to reach his phone").

| # | Visualizer | What it demonstrates | Kind |
|---|---|---|---|
| V1 | **The switch** | A real-looking project in a phone frame and a PC frame. Tap the editor button: rows fold into sections and back; every clip keeps its x; the playhead and selection survive; the three animations (morph, fold, slide), playing at random as they will in the app (D11), each also playable on its own; the PC band order (tools at the bottom edge) | interactive prototype |
| V2 | **The first ten seconds** | New project → the two cards (Simple picked: the folded `More ·` line) → Create opens the picker → the "Adding 4 clips… (1 of 4)" loading row → four clips land end to end → the hint in the tray row (with ✂'s one soft highlight; §8.9's wording) → tap a clip → the tray row fills; the second batch through the Clips tool (playhead at 0: no choice shown; mid-track: At the end / After Clip N, with the caret at that seam); a mixed pick of clips and a song (the song lands as music, one Undo); and the other branch: Create → empty editor with the + Add clips track → tap → picker. At 380×667, with Create on screen without scrolling. Answers "what does a beginner see first" | interactive walk-through |
| V3 | **The Simple editor on a phone** | A playable main track: trim either edge (the rest closes up live), delete, split, hold-drag reorder, speed. Titles and a sticker ride with their clips; the link line; Stay put; a caption track shifting cue by cue; a gap block and Close gap; Undo; the "Deleted clip and 2 things on it" line in `#sm-say` with its [Undo] button; the Effects flow (§8.5c); edge auto-scroll on a long track, with the compact reorder view drawn beside it as an option only | interactive prototype |
| V4 | **Phone and PC, side by side** | The same project in both layouts, same tools, same order, same names; tapping a tool on one highlights it on the other. A size switch (900×700, 1280×800, 1920×1080, 844×390) shows the real band with Look, Speed and Captions open, laying out D20's A, B and C with the stage's visible area in each, and the sideways over-timeline sheet at 844×390. Answers "you don't have to learn both" | interactive comparison |
| V5 | **An old Full project opened in Simple** | A messy real-style project (picture-in-picture, a group, a camera, masks, gaps, a whole-video title, music) drawn in Full, then in Simple: which clips became the main track and why, ✦ badges, blocks, the *"More in Full ›"* notice in the tray line, gap blocks, and a counter showing **0 bytes written** until the first arranging edit | interactive diagram |
| V6 | **Two people, two editors, live** | Two phones side by side: Sam in Simple, Ezra in Full. Scripted cases from C §10.3 (a trim while Ezra animates the clip after it; a ripple while Ezra crops a later clip; a delete while Ezra types a title on it; a reorder vs Ezra's opacity drag; undo after a friend's move; Sam captions for minutes while Ezra deletes and trims earlier clips; undo after a friend adds a title; a delete of a clip carrying Sam's title). A toggle for **before Phase 4 / after 4a / after Phase 5** shows what each release fixes. Also his own Mac + iPhone in one session, with the *"Your phone can edit · clips stay put"* line, its Options › Make it a Viewer, and the "This is me" mark; the Full-side toast and outline when a Simple friend ripples. Presence glyphs, the glide, "Sam moved 4 clips", keep my frame, the refusal lines, the gate's line | interactive simulation |
| V7 | **How it is built** | One document in the middle; the Full view and the Simple view as two lenses; the runner (gate → locked → blockers → adopt → apply → one commit); where the collab diff sits; clip time on the wire drawn as the conversion at the wire edge only | diagram |
| V8 | **The data** | A small project's JSON with the new keys (`sm.main`, `sm.stay`, `sm.tail`, `project.sm`, and the plain helper fields of §2.2) highlighted and everything derived (order, hosts, offsets, sections, lanes, seams) greyed | annotated diagram |
| V9 | **The ripple maths** | Before/after strips for each command (delete, tail trim, head trim, speed, reorder, insert, make overlay, close gap), with keyframe dots, followers, caption cues (the time map, a split straddler) and the camera moving exactly; the D6 slide-back; a blend kept through a delete; an end card following the track end; the head trim both ways (same footage, chosen; same time into the clip); a title and a cue on a clip at 2×: the title keeps its length and moves to half its offset, the cue scales; a trim of each clip of a blend, the fade staying over the overlap; Turn into a transition (Phase 6), with the followers it moves | step-through diagram |
| V10 | **The decision sheet** | D1–D21 exactly as §17 words them, plus the §8.9 word table and the "decided with the recommended option" pictures (§17), each a small picture with the options drawn and one marked recommended, and one button that copies his answers (or "do recommended") as a message | interactive form (local only) |
| V11 | **The roadmap** | What he can hold after each phase, drawn as the screen he would see, with Phase 1 highlighted and drawn exactly as §15.1 (a lines-only `#sm-say` row, blank and with the Delete line; no tools; Full's Add sheet with clips laid end to end; ✂ dimmed) at 380 and 1280 px | diagram |
| V12 | **The chrome check** | The stage and play bar at 380 px and 1280 px, in both editors, solo and live: people chip, LIVE pill, comments bubble, person+ door, and the editor button in each D2 placement (D2-A and D2-B; D2-D has no play-bar button and shares D2-B's back-button pictures), at 380×667, 440×956 and 1280, with the slot-by-slot table and D18's two Simple orders; plus Full reached by a mis-tap from Simple and after Open in Full, at 380 and 440, for D2-A and D2-B (the icon-only back button in slot 3 at its real 34 px beside ◐'s normal state, and the non-interactive note), D2-C at 440 beside D2-B; plus the own-devices case with the *"Your phone can edit · clips stay put"* line and its Options menu, at 380 and 1280 | rendered screenshots |

---

## 19. Open questions for the hole-poking pass (step 3)

Rounds 1-3 of hole-poking (§20) answered most of these. Struck rows are decided, with where the answer now lives. What is
left is **device checks** only (Q17 on his iPhone; Q19's one-tap reading from his phone, plus an SE-size number his phone cannot
give); neither blocks a design choice. Q23 became decision **D19** in §17, the one place his choices live.

| # | Question | Why it is doubtful | Where to look |
|---|---|---|---|
| ~~Q1~~ | ~~D6 on real apps~~ | **Decided:** slide-back (D6, §3.6, §3.9 inv. 2). FCP's out-of-range stored link cannot be expressed in the derived model (§4.2), so D6 stays A/B/C. Head trim: followers stay on the same footage (§3.6 head row), which matches FCP's connection-point model, where connected clips remain attached and synced to a frame of the primary clip (`research/pro-editors.md:198-203`; the page does not show a head trim explicitly). V9 keeps the "same time into the clip" panel, labelled "alternative, not chosen", as §17 promises | optional: CapCut desktop Linkage and FCP on a device, as supporting evidence for D6's recommendation; no design dependency |
| ~~Q2~~ | ~~Caption timing edits in a live session~~ | **Decided:** keyed cues by `uid` (4a′, §10.4); the focus-lease option is rejected | §10.4 4a′ |
| ~~Q3~~ | ~~Cue effect keyframes on the absolute clock~~ | **Confirmed by reading and fixed in Phase 1:** `FM.timedLists` includes cue effects; T4 and T15 prove it by running | §3.5, §10.4 4a |
| ~~Q4~~ | ~~Wiggle and oscillate read absolute time~~ | **Decided: accept.** The premise was inverted: music stays put, so the project clock keeps behaviours on the beat; only the swing phase at entry changes. An opt-in per-behaviour offset (in the style of `fxTimeOffset`) only if he ever asks for motion timed to a clip's own sound | §13 #10 |
| ~~Q5~~ | ~~Adjustment layers and clipping masks over rippled clips~~ | **Decided:** effect segments stay inside their clip (created that way, clamped by every shortening command); crossing ones are left alone with a hint; clipping masks are blocks | §4.3 |
| ~~Q6~~ | ~~Groups with main clips and other members mixed~~ | **Decided:** plain groups are transparent; a block group is a main block only if its main members are consecutive, otherwise a mixed block with a group notch; transform parenting never folds a unit | §2.5, §5.2, §9.2 |
| ~~Q7~~ | ~~Effect phase integrals from 0~~ | **Decided: accept.** A ripple adds a constant to the phase: timing on the footage unchanged, only the pattern differs, same as a Full move | §13 #42 |
| ~~Q8~~ | ~~Full-made items added after adoption follow by start~~ | **Decided:** "long things don't follow" at command time (§3.2 rule 4); Delete cuts the span out of them; no new flag | §3.2, §3.6, §13 #36 |
| ~~Q9~~ | ~~Hostless items after Close gap~~ | **Decided:** the runner pins strays with `sm.stay` in every arranging edit; end cards are the tail and follow the track end | §4.3 |
| ~~Q10~~ | ~~Transitions widen `isLayerVisibleAt`~~ | **Decided:** the shared gates are not widened; one transition pass with `FM.transitionAt` / `handleLocalTime`; sound picture-only in Phase 6 | §12.1 |
| ~~Q11~~ | ~~4b changes what a lease means~~ | **Decided:** every `start` op is exempt, plus `sm` and (from 4a′) cue times; no ripple-only flag, because the host cannot tell them apart and a sender-set flag is no protection | §10.4 4b |
| ~~Q12~~ | ~~Keep my frame vs Watch along~~ | **Decided:** the followee's time wins (keep my frame is off while following; the copied playhead already includes their shift); starting Watch along closes tools and releases leases | §10.3 |
| ~~Q13~~ | ~~Concurrent adoption before Phase 5~~ | **Decided:** adoption happens only inside a gated edit, including Full's Make overlay / Put in the clip row (§4.4); a guest's gate is on whether or not a session is attached (a linked copy counts), so neither an offline outbox nor a `recoverOutbox` diff carries an arranging step or an adoption before Phase 5; the gate is `othersCanEdit()`, so a Viewer does not freeze the owner | §3.6, §3.7, §4.4 |
| ~~Q14~~ | ~~Guests without media~~ | **Decided:** no scale fallback; native size from `srcW`/`srcH`, the media record or the manifest's `w`/`h`/`dur`; undecided units block arranging; media arrival bumps `FM.docRev` | §5.2, §10.7 |
| ~~Q15~~ | ~~Oversized ripple before 4a~~ | **Decided:** the session never splits a tx; the host refuses an oversized one whole; the runner measures the real diff with the real limit names | §3.7, §13 #27 |
| ~~Q16~~ | ~~Split while live~~ | **Decided:** the lease half of the pre-flight runs from Phase 2 for every command, split included, and in Full's split too; the lag-window residual shows an overlap chip until Phase 5 | §3.7, §10.6 |
| Q17 | **iPhone device checks, non-blocking:** (a) does the synchronous `pickFiles` in the Create tap open the picker as built; (b) what order a 4-clip multi-pick arrives in, and, for four 4K Photos videos, two timings recorded separately: (i) tap Done → the input's `change` event (iOS's own preparing / compressing, which the page cannot see or shorten; note it only) and (ii) `change` → the one Append commit (the app's own time). If (ii) is over ~1 s the answer is still the §7.3 drain: nothing is written to the scene, history or wire until the single commit, and the only allowed extra is DOM-only (one placeholder per picked file inside the loading row, widened as each length arrives). (c) **a device check, not a decision**: in Safari and in the installed PWA, pick two Photos stills and two Photos videos (one a screen recording) and log which source each yields (EXIF / QuickTime creationdate / `mvhd` / `lastModified` / none) and whether any value falls within 60 s of the pick. Until then Sort stays hidden unless two main clips carry a trusted `taken` (§7.3) | only his phone can say; the design no longer depends on any of them | `js/home.js:2893`, `js/addmenu.js:58-67`; before V2 is signed off |
| ~~Q18~~ | ~~The 4 + 4 play bar in Full with a fifth button~~ | **Decided by measurement:** 5 + 4 cannot fit at the 34 px buttons; it fits at ≥ ~427 px only by shrinking every play-bar button to 31 px (measured: pill 72.4 px, sides 141.8 / 171.8 px at 380 / 440). The choice is D2 (D2-A moves ◐ into ⋯, D2-B keeps his row, D2-C shrinks the buttons on wide phones, D2-D keeps the switch off the play bar) | §6.1, D2 |
| Q19 | **Phone height, non-blocking.** The layout adapts at runtime from a `100svh` probe (§8.2), so no design choice waits on this; the round-3 fixes to the rows themselves (a 32 px sound row and lane pitch, the +N row replaced by a glyph badge, Behind inside the sections box, a 138 px fixed sum) were layout contradictions, not a Safari unknown. (a) **From him, one tap:** open a probe page in Safari on his 440×956 iPhone with the address bar at the bottom (Tab Bar) and at the top (Single Tab), and in the installed PWA, and send back the svh / lvh and inset readout. (b) **The SE-size number (375×~553) cannot come from his phone**: it needs a friend's small iPhone or an iOS simulator runtime download (several GB, his call; none is installed on the Mac). Until then the 553 row, and the ~540 in-app browser row, stay estimates | the Safari heights are estimates | §8.2, T19 |
| ~~Q20~~ | ~~A cue straddling an insertion point~~ | **Decided:** it splits into two with the same words (`FM.captions.splitAt`), shared with `splitLayer`; every other op maps both cue ends through one time map | §3.5 |
| ~~Q21~~ | ~~Minimum length vs the ramp~~ | **Decided:** `FM.trimClipEdge` with reversed and ramped branches; when the source cannot give `MIN_LEN` the trim is refused (*"Not enough footage"*), never floored past the source | §3.6 |
| ~~Q22~~ | ~~Old builds offline~~ | **Answered:** refused at the door, stray flags ignored until adopted, a newer `sm.v` read-only, and the owner's gate now reads the **persisted** room roster, so an old build's (or any) dropped editor keeps arranging off (§3.7); it does not lapse on its own (§3.7, §17's decided list) | §3.7 |
| ~~Q23~~ | ~~Benchmarks: on the music or on moments in clips?~~ | **Now D19 (§17).** Both options are specified (option B in §13 #24: an anchor on the clip, one resolver `FM.anchoredTime` for every reader), so either answer has a build behind it; V10 draws A and B side by side. Either way Simple draws them, M and the headtap add them, and Simple's trims and drops snap to them (§8.3) | §13 #24, `js/app.js:1545-1594` |
| ~~Q24~~ | ~~A friend's item on a clip Ezra deletes~~ | **Decided:** kept as Stay put at its old time without asking (asking interrupts a one-tap delete; the item can be deleted in one more tap); authorship now lives in `L.by` and the device's `mine` set, so it survives resumes, reconnects and snapshots | §10.4 4c |
| ~~Q25~~ | ~~Blend limit~~ | **Decided:** half the shorter clip, one `blendMax` shared by the seam, the trim clamp and the classifier's greedy, so a crossfade between 1 s and half a clip is a blend and never becomes a Stay-put overlay and a gap | §3.1, §5.2 |
| ~~Q26~~ | ~~`act:'kf'` vs a short lease~~ | **Decided:** presence plus a start compare caught only one order. Keyframes are now relative to a synced `kb`, so a head edit sends no list and commutes in either order; speed keeps a whole-tx stale compare in 4a | §10.4 4a |
| ~~Q27~~ | ~~Follow / matte sources that follow a different clip~~ | **Decided:** `hostOf` resolves a link to a main clip directly, carries a cycle guard, and a hidden helper whose only users sit on one clip takes that clip as host (§3.10 rule 1b); any other case asks first (rule 4) | §3.10, §4.1 |
| ~~Q28~~ | ~~Full's split sub-0.05 s hole~~ | **Decided:** Phase 1 raises Full's split guard to 0.1 s (every other Full floor, and `MIN_LEN` at ≥ 10 fps; above the sanitiser's 0.05), which also stops the live host's invariant fix ops growing a half into an overlap on every device | §3.6 Split row |
| ~~Q29~~ | ~~A guest's silent whole-tx refusal~~ | **Decided (Phase 2):** resync at once, one line, drop undo steps by cid, count `'limit'` refusals | §10.1 |

---

## §20 Hole-poking log

History, kept as written: names in it are the ones current at the time. Where it disagrees with §0-§19, those sections win.
In particular D18 and D19 below mean round 2's two questions, now decided (§17's list), and D2's A1 / A2 / A3 are §6.1's
D2-A / D2-B / D2-C.

### Round 1

Severity · title · where it was fixed in this file.

- serious · Simple's head and tail trims broke reversed clips · §3.6 `FM.trimClipEdge` and both trim rows; §13 #3; T2
- serious · The head-trim command was unclamped, so the ripple moved neighbours more than the clip shrank · §3.6 (`landed`, refusals), §3.9 inv. 2 and 12, §3.11; T2
- serious · Split could make clips shorter than `MIN_LEN` (judge flaw 4 back through undo) and read `FM.time` late · §3.6 Split row (pause, snap, `MIN_LEN`, `t` parameter), §0.3 row 4; T2; Q28
- serious · `ripple` chose clips by start time, so an overlap reordered the track · §3.4 (ripple by index, slot removal), §3.9 inv. 1; T2
- minor · `moves` had no rule for combining two ripples; Make main clip moved the overlay twice · §3.3 (`addMove`), §3.6 Reorder and Make main clip rows; T2
- serious · Hand-made crossfades became alternating main/overlay clips and Tidy/Fix wrecked them · §3.1 blend seam, §5.2 greedy tolerance, §5.4, §12.1 Turn into a transition, §13 #39; T1; Q25
- serious · "Take sound out" twins lost sync on trim, speed and split · §4.6, §3.2 rule 7, §3.6; T24
- serious · The reused Speed panel wrote start and duration directly, bypassing the runner · §8.5 (thin Speed panel, `spdSolve` hidden), §3.6 Use one speed row; T25
- serious · Caption-track bookkeeping made black tails, hid captions and revived trimmed ones · §3.5 (window through the map, hidden cues rigid); T4
- serious · Cues straddling an edit point were unspecified for cut, lift and scale · §3.5 (one time map, `splitAt`, `MIN_CUE` drop), §13 #14; T4
- serious · Cue-effect keyframes: `shiftUnit` missed them and §10.4 contradicted T15 · §3.5, §10.4 4a (`timedLists` + cue effects, Phase 1), §14.2; T15; Q3 struck
- minor · A caption track's own keyframes stayed behind while its cues rode · §3.5 `riderMapKeys`, §3.2 rule 3; T4
- serious · Captions timed to a stay-put voice-over became riders and drifted · §3.5, §12.3, §8.5 tray, §13 #38; T4
- serious · D6 slide-back missed a title starting exactly at the new tail · §3.6 tail row (`≥ newEnd − eps`), §3.9 inv. 2, §4.2; T9
- serious · Snapping only `start` desynced keyframes, cues and groups and turned joins into gaps · §3.1 rounding rule, §3.3 (no snap), §3.4, §3.9 inv. 1 and 3; T2
- serious · 4a's clip time on the wire created a head-trim / speed vs keyframe-edit race · §10.4 4a (the named race, `act:'kf'`, stale compare), §10.6; T13b-d; Q26
- serious · Time couplings (camera, animated parents, Follow, mattes) broke silently · §3.10, §13 #8 #9 #12, §3.9 inv. 9; T3; Q27
- serious · Comment pins named a clip and a time, and ripples made them disagree · §13 #24 (`lo`, `CM.pinTime`), §0.3 row 5, §14.2; T28
- serious · Duplicating a main clip moved the copy but not its animation · §3.6 Duplicate row; T3
- minor · Markers and the loop region stayed at absolute times · §3.6.2 (loop follows, toast), §13 #24 (benchmarks by choice); Q23
- minor · The playhead's landing after a local edit was unspecified · §3.6.2, §3.9 inv. 10, §8.3; T2
- minor · Q4 had the direction backwards · §13 #10; Q4 struck
- serious · Phase 6 transitions said nothing about audio and widened shared gates · §12.1; Q10 struck
- minor · A Simple slider on an animated property wrote a hidden keyframe · §8.5 (`FM.shiftProp`, read-only rows), §9.1; T23
- serious · Append landed new clips under an end card · §4.3 tail rule, §3.4, §3.6 Append, §13 #37; T2
- minor · Freeze frame had no model and the cut rule would move titles past it · §3.6 (freeze note), §8.7, §15 Phase 7
- serious · Close gap and Tidy ran over content the classifier left off the main track · §3.1 slot seam, §4.1 `slotAfter`, §5.2 candidates, §5.4; T1
- serious · Bottom-first greedy with no tolerance picked the wrong main track · §5.2 (background, stacked-take, overlap-tolerance filters); T1
- serious · fillsFrame's no-media fallback made the song the main track · §5.2 (no scale fallback, `audioOnly` definition, undecided), §2.2 (`srcW`/`srcH`, `audioOnly` at add time); T1
- serious · The read cache's signature missed classifier inputs (two findings) · §2.5 (`FM.docRev`, uncached before arranging); T1
- serious · Organisational groups froze their contents · §2.5 (transparent vs block groups), §5.2, §9.1; T1
- serious · Relationships other than group membership were ignored · §3.10 link rule and delete refusal, §4.1; T3
- serious · Companions only shifted, and Mute clip sound doubled extracted sound · §4.6, §3.6 Mute row (`sm.mutePrev`); T24
- serious · Band insertion ignored Full's real stacking order · §3.6.1 (time-overlap placement, z pass, `mainInFront` defined)
- serious · Camera keyframes and stay-put keys stayed put while clips moved · §3.10 rule 3 (camera rider, opt-in volume rider), §13 #12; T3
- serious · Whole-video items followed a long first clip; the project never shrank · §4.5 (`sm.tail`, adoption), §5.4 End with the video; D17; T2
- serious · Template and element inserts landed on top of the stack, ungrouped · §12.2 (pack insert command, grouping), §14.2; T6
- serious · Projects with nothing full-frame: Add clips landed on top at 0:00 · §3.6 Append (asks), §3.6.1 first main clip z, §13 #43; T1
- minor · Big projects: no lane height policy; the size guard could never fire · §8.2 (3 lanes + N), §3.7 `tooBig`
- minor · Caption riders: cues before the track start, emptied tracks, locked tracks · §3.5 (window rebase, `Array.isArray` kind, lock exemption), §5.2
- minor · Stored `sm.main` on a unit that cannot be main was undefined · §2.3 rule, §5.2; T7
- minor · Classifier kinds had no defined section; "hidden" defined two ways · §5.2 kind table, §3.7 (`silent` delete)
- minor · Unlock-and-do-it removed locks for good; hidden and solo invisible · §3.7 (unlock and re-lock in one step), D7, §8.2, §5.4 solo chip
- serious · The switch's refusal rule (`bridge.interacting`) made switching impossible live · §6.2 (own gesture flags), §6.1 (E guard); T8
- serious · Undo and redo bypassed the live gate · §10.2 door 2 (`arr` on steps, `runStep` check), §11; T10
- serious · Adoption wrote `sm` on leased layers and could land partially · §10.4 4b (`sm` exempt), §13 #40; T16
- serious · One caption track plus the text-editor lease locked friends out of arranging · §10.4 4a′ (keyed cues), 4b, 4c, §10.6; T16; Q2 struck
- minor · Split was classed as a one-layer live edit, but it is `li` plus trims · §3.7 blockers (lease half from Phase 2), §3.6 Split row; T10; Q16 struck
- serious · Deleting a clip silently deleted other people's items · §10.4 4c (`madeBy`, kept as Stay put), 4d notice, §10.6; T16; Q24
- serious · Remote playheads, taps, pointer time, follow scroll and comment marks drew into Full's hidden DOM · §10.3 `FM.timeline.host()`, §0.3 row 20, §14.2; T12b
- serious · A Simple drag was invisible to presence · §3.8 (`ar`), §10.3, §10.4 4c; T16
- serious · 4a's live start-shift rewrote a keyframe list under someone's finger · §10.4 4a (gestures in clip time); T13
- minor · §10.6 called ripple vs keyframe edit "fixed" while the edited clip still sent whole lists · §10.6 rows 1 and 2; T13c-d
- serious · 4a's conversion-site list missed keyed-array ops, pre-session undo and the persisted base · §10.4 4a (`toWire` / `applyLive` boundary, base stamp); T15
- serious · T15 contradicted the design (`timedLists` = `animatedProps`) · §10.4 4a, §14.6 T15
- minor · The T14 detector flagged legitimate writers · §10.4 4a (the two-list roster); T14
- serious · The pre-flight raced lease grants; Phase 5's `all:1` skipped the owner's path · §3.7 (re-check after apply), §10.5 (any refusal, both paths), §10.6; T16, T17
- serious · Phase 5's async refusal was unspecified for chains and undo before the ack · §10.5 (one step in flight, intent queue, undo waits); T17
- serious · After Phase 4 an offline guest could arrange and replay half-ripples; T11 lacked offline coverage · §3.7 gate (`.online`), §10.4 4d, §10.5 offline, §14.6 T11
- serious · Full's "Put on main track" on an un-adopted project collapsed the main track · §4.4 `setMembership`; T5
- minor · A main clip added while its z-anchor was deleted landed on top of the stack · §10.4 4d own-add repair, §10.5, §10.6; T17
- serious · Keep my frame shifted by Δstart and never ran on the owner · §10.4 4c (`applyIncoming` / `afterApply`, `FM.sameFrameTime`); T16
- minor · `refuse('big')` used a key that does not exist · §3.7 `tooBig`, §13 #27; Q15 struck
- minor · "A session started mid-drag completes locally first" contradicted the runner · §3.8 (cancel at once), §10.2 door 3; T10
- minor · The runner's await window let a second command plan against a half-applied scene · §3.7 (single flight, drain-before-diff note), §10.6; T2
- serious · Per-person undo of an add or delete restated the whole layer order · §11 (own layers only), §10.6; T27
- minor · 'Unlock and do it' silently overrode a friend's lock · §3.7 (one step), §3.11, §10.4 4d ("and unlocked Clip 7")
- minor · Append at the end was gated as arranging although it moves nothing · §3.6 (`arranges` vs `adopts`), §10.2; T10
- minor · Undo labels never reached collab steps; undo stayed with the session after Stop sharing · §11 labels; T27
- minor · T11's "nothing lost" had no oracle · §14.6 T11 (intent log), §0.3 row 12
- serious · D2's switch slot could not fit at 380 or 440 and took the slot his thumb knows · §6.1, D2 (A1 / A2), §8.2 sketch; T12; Q18 struck
- serious · The live gate blocked arranging whenever anyone was connected, even a Viewer · §3.7 `othersCanEdit()`, §10.2, §3.11 wording; T10
- serious · Drag gestures were not gated when they started · §3.8 (`canArrange` at arm, grips hidden); T10
- minor · No default editor on a fresh install; Simple still asked for resolution and frame rate · §7.1, D3
- minor · "The picker opens at once" would not happen on iOS · §7.3 step 2 (synchronous pick + buffer); Q17
- serious · The phone height budget used wrong numbers and the tray made the layout jump · §8.2 (real budget, permanent tray row, stage clamp); T19; Q19
- serious · Tap targets far below the app's own sizes · §8.2 touch sizes; T19
- serious · Full-only controls leaked into Simple through shared chrome · §8.8; T21
- serious · A panel change on a Full-animated item silently added hidden keyframes · §8.5 (`shiftProp` / read-only), §9.1; T23
- serious · Ask made Full-style edits in a Simple project · §8.5a, D12; T26
- minor · "Open in Full" was a one-way door · §6.2 hop, §8.5 (not on a plain clip), §9.2, D2 B note
- minor · PC parity: ⋯ jumped sides, notes hidden on the phone, playhead and mouse drag unspecified · §8.3, §8.2 sketch, §3.8
- minor · A/S/D and copy/paste were half-defined in Simple · §8.3 keys table, §12.2; T6
- minor · Tool rows overflowed at 380 · §8.5 (one non-scrolling row, Canvas dropped, Split's one home, first five), §6.1 (⋯ menu); T19
- minor · The empty main-track state was unclear when the project has content · §5.4, §7.3; T19
- minor · What a switch does to multi-selection and open sheets was dropped · §6.2, §8.5b; T8
- minor · Refusal and feedback messages were missing or untraceable · §3.11
- minor · "Settings → Labs" no longer exists as a place · §0.1, §0.3, §7.1, §15 Phase 1, D3, D15
- minor · No accessibility spec · §8.10, §6.1; T22
- minor · New icons were decided without drawn options · D16, §15 Phase 1 gate, §18 V10
- minor · Jargon and odd wording · §8.9, §4.1 voice default
- minor · The morph was unspecified for big projects; D11 contradicted the #974 pool · §6.3, D11; T8
- minor · A slightly upward reorder drag could make a main clip an overlay · §3.8 lift threshold
- serious · A song with no media record became the whole main track · §5.2 (undecided), §2.2 (`audioOnly` at add time); T1
- serious · One stray `sm.main` flag turned the project "adopted" · §2.3, §2.5, §5.3 (`project.sm.adopted`); T5
- minor · Projects from templates, imports and backups opened in the wrong editor · §6.2 (`apply` vs `set`), §7.1, §7.2; T8
- serious · Ripples made split halves touch where the footage jumps, and the de-click skipped the ramp · §12.1 (`seamAt` continuity), §3.9 inv. 6; T18
- serious · The live gate checked who is connected, but a dropped friend's offline edits replay later · §3.7 `othersCanEdit()` (room members, connected or not); T10
- minor · Whether a copy keeps `sm.main` depended on the caller; no table · §12.2 route table; T6
- minor · Template or element insert in Simple was undefined and two sections disagreed · §12.2, §14.2
- serious · Filling a template with shorter clips left gaps and stranded titles · §3.6 Replace row, §7.3; T2
- minor · The Assistant could not see the main track · §8.5a; T26
- minor · Commands and `sanitizeSm` disagreed about an empty `sm` and overwrote unknown sub-keys · §2.3 (`setFlag`, canonical form, run on load); T7
- minor · A caption track moved whole left its cue-effect keyframes behind, invisible to T3 · §3.3, §3.5, T3 (generic walk)
- minor · The schema fingerprint could not see the new keys · §14.2 `SCHEMA_FIXTURE` row
- minor · "Which editor" was stored in three places · §2.2 (one store), §7.2, §13 #31
- minor · `project.sm.v` was written but never read · §2.3 (newer `sm.v` read-only), §5.3; T5
- minor · Phase 6 missed a preset field list and the audio path · §12.1 (presets exclude `clipAnim`, sound picture-only)
- minor · Keyboard copy, paste and duplicate used Full's placement · §8.3 keys table; T6
- minor · The size check counted operations but not bytes · §3.7 `tooBig`
- serious · Q1: invariant 2 contradicted the trim plans; the slide-back boundary was off by eps · §3.9 inv. 2, §3.6 tail row, §19 Q1, V9
- serious · Q2: a friend typing captions blocked every arranging edit · §10.4 4a′; Q2 struck
- serious · Q3 confirmed and the design contradicted itself about it · §3.5, §10.4 4a, T15; Q3 struck
- minor · Q4 resolved: keep behaviours on the project clock · §13 #10; Q4 struck
- minor · Q5: effect segments crossing a cut grade a different clip after a ripple · §4.3, §3.9 inv. 8; Q5 struck
- serious · Q6: mixed groups and transform parenting broke the classifier · §2.5, §5.2, §13 #8 #19; T1; Q6 struck
- minor · Q7 resolved: phase integrals change the pattern, not the timing · §13 #42; Q7 struck
- serious · Q8: a whole-video title made after adoption was deleted with clip 1 · §3.2 rule 4, §3.6 Delete, §13 #36; T2; Q8 struck
- serious · Stay-put music and long items held the project length · §4.5, §5.4, D17, §3.9 inv. 11; T2
- minor · Q9: items in a gap attached to whatever slid under them · §4.3 `pinStrays`, §3.7; Q9 struck
- serious · Q10: widening the shared visibility gates leaked into hit-testing, playback and export · §12.1; Q10 struck
- minor · Q11 resolved: exempt every `start` op from the lease · §10.4 4b; Q11 struck
- minor · Q12 resolved: the followee's time wins; Watch along closes tools · §10.3; Q12 struck
- minor · Q13 resolved, and the gate no longer blocks the owner for a Viewer · §3.7 `othersCanEdit()`, §3.6 `adopts`; Q13 struck
- serious · Q14: the scale fallback is wrong and the cache never noticed media · §5.2, §10.7 manifest meta, §2.5; Q14 struck
- minor · Q15 resolved: the host refuses oversized txs whole · §3.7, §13 #27; Q15 struck; Q29
- serious · Q16: a live split half-applied against a lease · §3.7 blockers from Phase 2, §3.6, §10.6; T10; Q16 struck
- serious · Q17: the Create → picker hand-off could lose the tap on iOS; no plan B for dates · §7.3 (synchronous pick, EXIF / `mvhd` fallback); Q17 widened
- minor · Q18: 5 + 4 cannot fit, so D2-A meant moving his ◐ switch · §6.1, D2; Q18 struck
- serious · Q19: the height budget used the screen, and the fallback saved no height · §8.2 (stage clamp, +N, 40 px row); T19; Q19 rewritten
- serious · Q20: straddling cues, cues pushed before the track start, and voice-over captions · §3.5 (`splitAt`, window rebase, stays with its sound); T4; Q20 struck
- serious · Q21: `FM.trimLayerHead` was the wrong primitive; edge #3 was false · §3.6 `FM.trimClipEdge`, §13 #3; T2; Q21 struck

Choices made while folding (conflicting fixes): a straddling cue at an insert **splits** rather than stretching over the new
clip (§3.5); Do-it-anyway **keeps the lock** afterwards rather than leaving the clip unlocked (§3.7, D7); a panel row on an
animated number **shifts the curve**, and only non-numeric rows lock (§8.5); the whole-video / music-end flags are one flag,
`sm.tail` (§4.5); sync twins are recognised by `sm.twin` **and** an exact match (§4.6); Split's one home is the play bar's ✂,
so trays lose Split (§8.5); a camera cut inserts boundary keys rather than just dropping keys (§3.10).

### Round 2

Severity · title · where it was fixed in this file. Duplicates found by different probes are listed each time, pointing at the
same fix.

- serious · 4a's `toWire` cache was keyed on array identity, so in-place keyframe edits were never sent · §10.4 4a (`toWire` never caches; fingerprint-only fallback), §14.5; T15
- serious · Ripples opened 1-ulp gaps at exact joins, which export as a black frame · §3.1 (join re-seating, `MIN_LEN` slack), §3.9 inv. 1 and 13; T2
- serious · Every full-length caption track became Stay put at adoption and stopped following the clips · §3.5, §4.5, §5.3 adopt(); T4, T5
- serious · Move to top layer deleted the lifted clip's captions though its sound still plays there · §3.6 Make overlay row (lift / `paste(0)`), Make main clip row (audible overlay carries its cues); T4
- serious · Reorder had no time map, so the camera, track keys, volume rider and loop region were undefined · §3.5 (piecewise translation `g`), §3.6 Reorder row, §3.6.2, §3.10 rule 3; T3, T4
- serious · The camera's boundary keys collapsed, lost their curve, stretched on inserts and broke loops · §3.10 rule 3 (`riderKeys`, `FM.seamKey`, clean steps, insert holds, loop guard, Append), §3.5; T3
- serious · The tail fit changed a tail item's length but left its keyframes · §4.5 (`mapLayerKeys` with `g`, audio fade), §3.9 inv. 4b, §5.4 black band; T2
- serious · Delete's "cut like a cue" shifted and truncated video and sound and left keys unsorted · §3.6 Delete row (one delete map, source head-trim, `riderKeys`, `fxShift`); T2
- serious · Phase 4 rider keyframe rewrites raced friends and were refused piecemeal under a typist's lease · §10.4 4a (cue-relative keys, rider lists compared), 4b caption clause, 4c blockers, §3.7 lease assert, §10.6; T11, T16
- serious · Comment pins (`lo`) drifted on split, on head trims in either editor, and on speed · §13 #24 (`ls` / `lo`, lineage resolver `CM.pinTime`), §0.3 row 5, §14.2; T28
- minor · Simple's head trim left the effect clock behind, unlike Full's A · §3.2 rule 3, §3.6 (`trimClipEdge` returns `fxShift`; head row), §3.9 inv. 12; T2
- minor · A long item could re-home to the next clip after a tail trim · §3.2 rule 4, §4.3 `pinStrays` (long units pinned), §3.9 inv. 2b and 4, §4.2; T2, T9
- minor · The D6 slide-back and the effect-segment clamp wrote `start` without moving keys · §3.3 (no `start` through `sets`), §3.6 tail row, §4.3; T9
- minor · Speed had no `MIN_LEN` or footage rule · §3.6 Speed row, §8.5 (0.25×-4× slider, live stop), §3.11; T25
- minor · Reverse was a tray tool with no plan · §3.6 Reverse row (cache after commit, twins never cached), §14.2; T24
- minor · Stay-put items that happened to end at the track end were refit without asking · §4.5 (only `sm.tail` is fitted; adoption adds `sm.tail` once), §5.3; T2
- serious · Phase 6 transitions re-paired or orphaned on delete and reorder; Turn into a transition re-homed titles and left `{kf: []}` · §12.1 (`transitionAt` validity, `d_eff`, drop rules, followers, key removal, static fallback), §3.6 rows; T18
- minor · Freeze and Append shifted a straddling cue where Insert splits it · §3.5 map table and straddlers, §3.6 Append row and freeze note; T4
- serious · Couplings ignored the `splitOf` lineage that parents, Audio Drive and Bounce resolve through · §3.10 rules 1, 4, 5 (lineage `linkOf`, Audio Drive, repointing), §3.6 Delete row; T3
- blocker · The z pass lifted every layer that sits behind a main clip on purpose · §3.6.1 (sides, Behind section, `mainInFront` redefined), §5.2 stacked-take guard, §2.5, §5.4; T1
- minor · Move to top layer put the lifted clip above its own titles and captions · §3.6.1 band wording, §3.6 Make overlay row; T2
- blocker · A-roll with B-roll cutaways: the base was dropped as a background still · §5.2 background rule, §3.1 covered gap, §4.5 (no `sm.tail` on a video with sound), §5.4; T1, T2
- serious · Items straddling a cut were frozen Stay put at adoption and left behind by every ripple · §3.2 rule 4, §4.1 `isLong`, §5.3, §13 #13 #36; T2
- minor · A caption track on one clip rode instead of following and left an empty zombie track · §3.5, §4.1 `hostOf`, §5.2 kind table, §2.5 (block groups); T4
- serious · Slot contents could never follow a clip and turned into stranded Stay-put items · §3.1 (slot entries in `R.main`), §3.4, §4.1, §4.3, §3.6 Insert / Reorder `j = 0`, §3.9 inv. 1-2, §5.4; T2
- serious · Adoption made every full-length caption track and the camera Stay put · §4.5, §5.3, §3.5; T5
- serious · A plain group's own layer had no role, so deleting it deleted all its members · §2.5 (bookkeeping, refit, member-only removes), §5.2; T1
- minor · `fillsFrame` ignored the parent chain · §5.2 (`FM.worldBox`), §14.2; T1
- serious · A clip grouped with its title under a group look dropped off the main track; `sm.main` on a group was undefined · §2.3, §5.2 (main blocks, wrapper blocks), §9.2, §4.4; T1
- serious · A video with permanently missing media stayed undecided and blocked all arranging · §5.2 (`mediaState` arriving / missing), §3.7 `waiting`, §5.4, §13 #44; T1
- serious · A locked song, background, watermark or camera made every arranging edit refuse · §3.7 (`touched` / `riderOnly`, blocks as one), §3.11 lines by kind; T2
- serious · The karaoke twin was never recognised because its sound file is new · §4.6 `isTwinOf` (`karaokeOf`, repointing), §3.6 Split and Duplicate rows; T24
- minor · `sanitizeSm`'s audio-only rule depended on device-local media · §2.3 (document fields only); T7
- serious · Inserting an element or template could add a hidden camera, splice a light leak, and "one unit" contradicted transparent groups · §12.2 (camera dropped, blend / opacity not main, elements never main, `sm.unit`), §2.5; T6
- serious · A hidden clip in the middle of the track became a gap that Close gap destroyed · §5.2 pass B, §3.1 slot members (hidden count), kind `fullOnly`, §4.3, §9.1, §13 #6; T1
- minor · A Stay-put camera window was not mapped, and a camera rig asked on every edit · §3.10 rules 1 (camera parent never a coupling) and 3f (window); T3
- minor · `classify()` was neither pure nor O(n log n) as specified · §2.5 (`byId`, `hiddenByGroup`, sweeps), §5.2, §12.2, §14.5; T1
- serious · `othersCanEdit()` read `host.members`, which forgets a dropped friend exactly when their outbox matters · §3.7 (persisted roster, `waived`, Arrange anyway), §10.2, §17 decided list; T10, T11
- serious · From Phase 4 the owner arranged while a friend was offline, and the friend's replay put items on the wrong clips · §3.7 `editorsAllConnected` (`away`), §10.5 optional own-follower repair, §10.6; T11
- serious · Phase 5 made a reloaded guest's whole offline work all-or-nothing, Full edits included · §10.5 (persisted path stamps, partition), §10.6; T17
- minor · §10.6 said an arrange just before a drop "cannot happen" in Phase 4 · §10.6 row, §10.4 4d (Reconnecting after ~1.5 s); T11
- serious · Undo / redo during the runner's await was unguarded and sent a half-applied plan · §3.7 (queue, history guard, `runStep` `busy`), §11; T2, T10
- serious · 4b's host lease gate and 4c's pre-flight disagreed on caption tracks, so ripples landed partially · §10.4 4b caption clause, 4c blockers, §10.6; T16
- serious · 4a's stale compare caught only one order of the head-trim vs keyframe race · §10.4 4a (`kb`: head edits send no list; speed's whole-tx compare), §10.6; T13
- serious · `toWire`'s per-layer cache was keyed on kf-array identity (second finding) · §10.4 4a; T15
- serious · 4a's `toWire` / `applyLive` boundary missed `release()`, raw applies, `C.share`'s base and Save my version · §10.4 4a (named roster, `fromWire`, grep test); T15
- serious · `madeBy` attribution was wrong on guests and reset every session · §10.4 4c (`L.by` stamped by the host, device `mine` set), §2.2, §12.2; T16
- serious · Per-person undo of an adopting step un-adopted the project under everyone else's work · §5.3 (`meta.adopt`), §11, §10.6; T27
- serious · Undo and redo of an arranging step skipped the pre-flight and half-applied against leases · §10.2 door 2 (third check, owner `r.rej`), §10.6; T16
- serious · Full's Put on / Take off main track adopted with no live gate · §4.4 (through the runner), §10.2, §0.3 row 3, Q13; T5, T10
- minor · Remote structural changes did not reach the Simple timeline's DOM-only drag · §3.8 (`abortGestures`, release refusals), §8.1, §14.2; T10, T16
- minor · Concurrent live Appends raced the end card and music fit silently · §3.6 Append `arranges` condition, §10.2; T10
- serious · Phase 4's steps shipped as separate releases under one `SCHEMA_REV` · §10.4 (a bump per step, widened fingerprint, `C.HOST_RULES`), §10.3, §14.2, §15 Phase 4
- minor · The runner did not flush the text editor, so typing and a ripple shared one undo step · §3.7 (flush before `beginEdit`, resync after commit); T2
- minor · T11's intent-log oracle gave false reds with undo and could not see misplacement · §14.6 T11 (logged undo / cue / fix ops, wire-form (c), host-stability (e)), §0.3 row 12
- minor · The guest-side gate predicate and lines were wrong after the session ends, offline, and with a full outbox · §3.7 `othersCanEdit` (ended / paused guard), §3.11 (`outbox`, `offline` by phase); T10
- minor · Presence `act` had one slot with a fixed precedence, and the phasing disagreed · §3.8 (`sample()` order, `gesture()` local in Phase 2), §15 Phase 2 row; T16
- serious · Comment pins' `lo` was start-relative (second finding) · §13 #24 (`ls` / `lo`, lineage resolver); T28
- minor · His own Mac + iPhone session turned arranging off on both devices · §3.11 `live` line (Make Sam a Viewer), §10.7; T10, V6, V12
- minor · `project.sm.v` could be written by any Editor and was not tied to `SCHEMA_REV` · §2.3, §10.1, §14.2 (live clamp, `SM_V` in the fingerprint); T5
- minor · Single flight silently dropped the middle of three quick commands · §3.7 (FIFO of 4, intents at tap time, `wait` line); T2
- minor · `restorePreEdit()` was unspecified and could detach live objects in a session · §3.7 (`beginEdit` / in-place `restorePreEdit`)
- minor · T10's guest "big" case could not happen in Phase 2 · §14.6 T10 (order unit check) and T16 (end-to-end), §13 #27
- minor · Changing undo's return to an object made existing falsy checks dead · §11 (boolean kept, `FM.history.lastStep`), §14.2
- serious · Simple's Effects tool could apply only 16 of the ~188 effects and refused the rest in Full's jargon · §8.5, §8.5c (pick first, route by `ADJ_OK`, tray Effects, `inst.sm`), §8.7, §9.1
- serious · Refusals and Undo toasts were three lines tall, sat on the timeline, and the whole pill was the button · §3.12 (`#sm-say`), §3.11, §11; T19
- serious · A clip with lost footage was undecided forever with a false "waiting" line (second finding) · §5.2, §5.4, §13 #44; T1
- serious · Under D2's A2 a beginner who tapped ⇄ by accident landed in Full with no visible way back · §6.1 (toast, ‹ Simple in slot 3, ⋯ first row), §6.2, §9.2, D2; T8, V12
- serious · Adding text after watching the video made it 5 s longer, and the black band could not fix it · §3.6 Add row (clamp to the track end), §5.4 black band (fits every overrun); T2
- minor · Between the pick and the first clip landing, "+ Add clips" invited a second pick · §7.3 (loading row, one Append step), §5.4; V2, Q17
- serious · The one first-run hint promised "cut" from a clip tap, but cutting is not in the clip tray · §7.3 step 4, §8.9; V2
- serious · Phase 1 had no defined screen: its gate tested Phase 2 features and its hint promised editing · §15.1, §15 Phase 1 row, §8.8, §14.2, T19 phases, §17 decided list
- serious · Turning the Simple preview off left remembered projects opening in Simple with no switch · §7.2 `homeFor`, §15.1 flip handler, §6.1, §14.2; T8
- serious · On PC the tool panel, tray and project tools shared a ~300 × 240 px band that was never measured · §8.3 PC band budget, D20, V4; T19b
- serious · Selecting an item opened its section above the main track, which moved the main track · §8.2 (fixed sections box, sticky rows, default open section); T19
- minor · The play bar put ✂ on the slot where Full has a harmless menu, and the order differed on PC · §6.1, §8.3 sketch (‹ ✂ ⇄ \|◀), D2 sheet; T12
- minor · The switch morph ignored Full's phone solo view and the stage height change · §6.3; T8
- minor · §8.9's single word table contradicted the rest of the design and used Full's word "layer" · §8.9 (complete table, Make overlay / Put in the clip row, Clip row), §4.4, §5.4, §6.1, §8.5; T20
- minor · Several Simple controls had two to four homes, against his #310 · §8.5 one-home rule, §6.1 ⋯, §8.2 tray; T20
- minor · Hidden and locked items from Full had no way off in Simple · §5.4 (Show, Unlock, muted badge), §8.2; T21
- minor · Reordering and trimming were drag-only, so screen-reader and switch users could not arrange clips · §8.5 (Move earlier / later, Length), §8.3 Alt keys, §8.10 items 6-7; T22
- minor · Refusal lines left people stuck, promised things the runner does not do, and named items inconsistently · §3.11 (actions, phases, view / comment / outbox), §8.9 naming rule; T10
- minor · The Clips tool did not say whether new clips append or insert · §8.5 Clips row, §3.6 Append row; T2, V2
- minor · In Simple the notes button stayed up while something was selected, against his #171 · §8.2, §8.8 (`sm-has-sel`, visibility); T21
- serious · Reordering on a long track had no edge auto-scroll (his #115) · §3.8 (`FM.timeline.edgeScroll`), §14.2; T19
- serious · Split and paste copied `sm.tail` onto both halves, stretching the song over itself · §3.6 Split row (`onSplit` clears A), §4.5 (lineage guard, copies), §12.2; T2, T6
- serious · Adoption made a full-length caption track Stay put, contradicting §3.5 (third finding) · §4.5, §5.3; T5
- serious · Sync-twin recognition by name + size + lastModified never matched karaoke twins and broke after a `.fmotion.json` round trip · §4.6 (`isTwinOf`: `karaokeOf`, or name + size + type); T24
- serious · "Undecided" treated media that will never arrive as arriving, and packs were classified before their media existed · §5.2 (`mediaState`), §12.2 (sizes from the pack's own files); T1, T6
- serious · Ask's "compose" could not work: `applyTurn` / `applyOps` are synchronous while the runner is async · §8.5a (intents, async `applyTurn`, `FM.spine.compose`), §3.7; T26
- serious · 4a's `toWire` cache keyed on object identity (third finding) · §10.4 4a; T15
- serious · 4b's lease exemption covered only `s` ops, but Simple also emits `d` on `sm` and `mv` z-moves · §10.4 4b (`d` on `sm`, any `mv`); T16
- serious · The live gate did not cover a linked copy open with no session yet · §3.7 (`C.isLinkedCopy`, null-safe runner), §10.4 4d, Q13; T10
- serious · Full's Put on / Take off main track adopted with "no live gate" (second finding) · §4.4, §10.2, §0.3 row 3; T5, T10
- minor · Comment pins broke on every re-id route and piled up at the cut after a split · §12.2 (`FM.remapCommentPins`), §13 #24; T28
- minor · `sanitizeSm` / `project.sm` rules were not forward-compatible and their purity was unstated · §2.3 (JSON-plain bound, `home` kept, document-only), §14.2 fixture; T7
- minor · `fillsFrame` preferred a stale stored `srcW`/`srcH` over the live media record · §2.2 `srcRev`, §5.2 lookup order, §14.2 routes; T1
- minor · `sm.mutePrev` had no defined shape and the Mute mode was not stored · §3.6 Mute row (`project.sm.muteClips`, `sm.muteByMode`), §2.2; T7
- minor · Simple added a second, unbounded filmstrip cache · §8.1 (one shared bounded cache), §14.5; T19
- minor · Classifying on every save for the Home count ran the classifier in Full too · §7.4, §14.5
- minor · The runner's "refusal writes nothing" was false for saves, IndexedDB, the media registry and the picker · §3.7 (no picker, `noSave`, `restorePreEdit`), §3.6 Replace row; T2
- minor · Sort by date read `File.lastModified`, which file routes reset; the stored date had no name or sanitiser · §2.2 `taken`, §7.3; T7
- minor · Phase 6 did not say whether transitions read stored flags or the classifier, and `trIn` survived copies and Make overlay · §12.1, §3.6 rows, §12.2, §13 #16; T18
- minor · The element insert rule contradicted itself · §12.2 (elements never main; templates strip then re-flag); T6
- serious · Q22: `othersCanEdit()` read the live member table (second finding) · §3.7, §17 decided list; T10; Q22 struck
- serious · Q26: the stale compare caught only one order and T13 could not pass (second finding) · §10.4 4a (`kb`), §10.6; T13; Q26 struck
- serious · Q27: `hostOf` gave no host to anything linked to a main clip, and the link recursion had no cycle guard · §4.1 `hostOf`, §4.3, §3.10 rule 2; T1, T3; Q27 struck
- minor · Q27: carry or warn could be decided with a rule · §3.10 rule 1b; T3; Q27 struck
- serious · Q24: `madeBy` did not survive a resume or reconnect, and Q24 had no route to Ezra · §10.4 4c, §17 (decided with the recommended option); T16; Q24 struck
- serious · Q25: the classifier's crossfade tolerance disagreed with the blend seam · §3.1 `blendMax`, §5.2 greedy; T1; Q25 struck
- serious · Q17: Sort by date taken was a whole-track arranging command with no plan · §3.6 Sort row, §3.5, §3.6.2; T2
- minor · Q17(c): where the capture date is stored and what counts as a real date were undefined · §2.2, §7.3; Q17 reworded
- minor · Q23: benchmarks were dropped in Simple (M key, ruler, headtap, snapping) · §8.3, §8.8, §13 #24; Q23 kept as a default
- minor · Q19: the height table's Safari-tab row was wrong and the fallback triggers were unspecified · §8.2 (173 px, viewport-only triggers); T19; Q19 recast as a measurement
- minor · Q28 could be decided now, and in a live session it bites at once · §3.6 Split row, §15 Phase 1; T10; Q28 struck
- minor · Q29 could be decided now: a guest's refused tx was reverted later without a word · §10.1, §13 #27; T10; Q29 struck
- minor · Q1 no longer blocked anything, and Apple's documentation supports the design · §19 Q1, §17; Q1 struck

Choices made while folding round 2 (where two fixes disagreed): keyframes on the wire are relative to a synced `kb`, not to
`start`, so head edits need no guard at all, and only speed keeps a whole-tx stale compare (instead of refusing every
start-changing tx whole) (§10.4 4a); a typist's caption lease lets another member's ripple change the track's own keys and cue
effects when the holder is in the text editor, and blocks them only for other leased tools (instead of blocking whenever the
track's keys change) (§10.4 4b, 4c); authorship lives in the document as a host-stamped `L.by` plus a device-local `mine` set
(instead of a room record keyed by member id) (§10.4 4c); a dropped editor keeps arranging off until they leave, are removed,
or he taps Arrange anyway, with no automatic 24 h lapse, decided with the recommended option (§17 decided list, §3.7); missing media is classified from document
fields (so an import with omitted phone videos still has a main track) rather than never being a main candidate (§5.2); the
visible words are Make overlay / Put in the clip row and "Clip row", with Move to top layer / Put back in line as the drawn
alternative (§8.9); the runner's queue is a FIFO of 4 where nothing is replaced (instead of "a newer tap replaces it") (§3.7);
a Full-made song may still be shortened by the tail fit, with a fade added, while a video with audible sound never gets
`sm.tail` at adoption (instead of refusing every shortening fit of a unit with sound) (§4.5); a reorder's keyframe boundaries
are clean-step pairs at one time (instead of an outgoing key at seam − 1/fps) (§3.10); elements dropped in Simple never splice
into the clip row, while templates strip and then re-flag what they splice (§12.2); a slot's members count hidden units, while
"renders" elsewhere keeps the visible-only gate (§3.1, §2.5); a caption straddling a freeze stretches over the held still
rather than splitting (§3.6); the `live` line carries at most two buttons (Make Sam a Viewer · Open in Full) in `#sm-say`
(§3.11, §3.12).

### Round 3

Severity · title · where it was fixed in this file. Holes found by several probes point at the same fix.

- serious · Reorder's time map used `c.duration` while its ripple removed `n.start − c.start` · §3.5 (`g` with one slot length `L`, Sort pieces), §3.6 Reorder row, §3.9 inv. 1; T2, T4
- serious · Follow and layer-reference effects read the stored id, not the split lineage `linkOf` assumed · §3.10 rule 1 (`R.lineageAt`, Phase 1 Full fix, `refLayerAt`), rule 1b premise flagged, §14.2, §15 Phase 1; T3
- serious · Delete's cut of a long unit shifted its keyframes twice · §3.3 (key-less move), §3.6 Delete row (step 0, fxShift, blocks never cut), §3.9 inv. 3; T2
- minor · Boundary keys divided only the curve before the seam · §3.10 rule 3a (`seamKey → {key, nextBez}`, `FM.divideSegment`), 3c; §14.2; T3
- serious · Which long units a Delete cuts was undefined, and trims never said they do not cut · §3.2 rule 4, §3.6 Delete row (cases i-iii), §4.2, §3.9 inv. 4, §13 #36; T2
- serious · A long item pinned at command time lost "Ends with the video" · §4.3 pinStrays (`sm.tail`), §3.6 Append row (`untaggedWhole`), §3.9 inv. 4; T2
- minor · The tail fit's key zones depended on the current length, so Append then Delete did not undo itself · §4.5 (`min(D, D′)/4`), §3.9 inv. 4b, §5.2 wrapper; T2
- serious · Trims and adjacency edits stranded a crossfade's fade keys · §3.1 (owner, owned keys), §3.6 tail / head trim, Insert, Duplicate, Reorder, Delete rows, §3.9 inv. 1b, §13 #39; T2
- serious · Float re-seating and target landings were additive, so joins were not bit-exact · §3.1 (`addLand`, created seams), §3.3, §3.6 head row (never writes start), §4.3 and §5.4 (1e-9); T2
- serious · Gaps under half a frame drew as joins but exported a black frame · §3.1 seam table (`hairline`), landing, §3.6 Close all gaps, §3.9 inv. 1 and 13, §13 #55; T2
- minor · Default caption tracks ended a rounding error short and never covered appended clips · §3.5 track window (snap), Captions tool sizing; T4
- minor · `riderKeys` and the per-cue rule both moved cue-effect keys · §3.5 (`timedLists(track, {cues:false})`, one owner per case); T4, T15
- minor · 4a's cue-effect wire base went wrong once `kb` differed from `start` · §10.4 4a (base = the cue's absolute start, two bases in `applyLive`); T14, T16
- minor · Speed left followers on the old clock, unstated, and Use one speed drifted cues · §3.6 Speed and Use one speed rows (`φ`), §3.6.2, §4.1; T4; V9
- minor · Make overlay's camera and loop map was undefined · §3.5 f table and note, §3.6 Make overlay row, §3.6.2; T4
- minor · Comment pins made in Simple usually anchored to no clip · §13 #24 (anchor rule, `FM.spine.mainAt`, `cu` / `co`), §14.2; T28
- minor · The freeze model captured a blank still and could not freeze at an edge · §3.6 freeze note (`FM.renderStill`, capture first, edge frames), §8.7, §14.2, §15 Phase 7
- minor · The tail fit of a reversed item re-timed its whole source · §4.5 fit (`trimClipEdge` tail through `setUnitSpan`), §5.4 band; T2
- minor · `MIN_LEN` and Full's new split floor disagreed · §3.6 Split row (0.1 s), §3.1 (clips already short), §3.9 inv. 7, §13 #20, §14.2, Q28, §15; T2, T10
- serious · A multi-file pick stacked every clip at one start and the classifier kept one · §15.1 Adding (`{at}`), §2.2 `pick`, §5.2 import stacks, §5.4, §13 #5 and #54, §14.2, §12.2 strip; T1, T2
- serious · Adoption pinned Controller nulls and other link targets, and the tail fit re-timed their keys · §4.3 `neverPinned`, §4.5 adoption bullet, §5.3 adopt(), §3.10 rule 4 (fit counted); T5
- serious · Placement rules ignored "behind", so new clips and segments went under the background · §3.6.1 (B / F sets, backdrops, rule c), §3.6 Append row; T2
- serious · Append's stacking slot was worked out before the tail fit and caption stretch · §3.6.1 (final spans), rule (b) resizing; T2
- minor · Simple moved `FM.addAt` and never put it back · §3.6.1 (`FM.spine.insertAt`), §8.3 ⌘V, §14.2; T21
- serious · Stacking moves ignored group subtrees; a block draws at its bottom-most member · §3.6.1 "Stacking a unit", rule (b) mask exemption; T2
- serious · Group rows and unused nulls kept the video long, and how blocks change length was undefined · §2.5 (refit every group, empty-group clamp), §3.3 `setUnitSpan`, §4.5 (bare nulls), §5.4 band, §3.9 inv. 11; T2
- minor · Text timed to a stay-put song (lyrics) followed clips and drifted · §4.1 (`musicTimed`, Keep on the music), §5.3, §13 #56, §17 D4; T2
- serious · Multi-layer elements and template titles inserted from Simple became uneditable blocks · §2.5 (`sm.unit` = moves-together group), §4.1 anchor, §3.6.1, §8.5, §9.1, §12.2; T1, T6
- minor · A single-clip group (a fade or a masking shape) became a block that refused Trim, Split and Speed · §5.2 main blocks, §9.2 single-spine rule, §8.5 Block row; T2
- serious · `fillsFrame` ignored opacity 0 and masks · §5.2 (`drawsPicture`, mask extent, stacked-take exception), §2.5 cache fields, §13 #58; T1
- minor · The sound and Behind rows had no rule for overlapping items · §8.2 (one fixed sound row, badges, chooser, twins in the filmstrip; Behind a section), §8.6; T19, T24
- minor · Cameras do carry behaviours, and a camera's Follow target was no coupling · §3.10 (behaviours paragraph, `split: 1`, `bounceDelta`, camera couplings), §14.2; T3
- minor · A trimmed camera had no window rule under Reorder and Sort · §3.10 rule 3(g); T3
- serious · A title card between clips had no "Put in the clip row" rule and no one-step delete · §3.6 new rows (Put in the clip row for a slot, Delete card), §3.11, §8.5 Slot row; T2
- minor · The wrapper group's key re-timing could reorder keys · §5.2 wrapper blocks (§4.5's `g`, citation `:869`); T1
- minor · A caption track inside a long group stopped following the clips · §2.5 (caption block), §4.5, §5.3; T1
- serious · Host-stamped `L.by` broke undo of every add and re-authored undone deletes · §10.4 4c item 1 (stamp by rule, `goneBy`, `by` refusals, own-ack write), §11, §2.2; T16, T27
- serious · Undo of an add hard-failed once anyone rippled, pinned or restacked the layer · §11 (masked `li` compare, soft line), §14.2; T27
- serious · Speed and rider list rewrites vs a friend's key add were guarded in one order only · §10.4 4a (`kr`), guard (2), §10.6; T13
- serious · `editorsAllConnected` could not be computed as specified · §3.7 (hello `ob`, settled, roster `ok` / `ab`, `st` not `ep.open`), §14.2; T10, T11
- serious · Queued undo presses and edits went stale and fired after an unrelated commit · §3.7 queue (looping drain, `jobEnd` / `unmute` drains, `commitSeq`), `S.undo` queues, §14.2; T2
- serious · The runner's await left the canvas, panels, the switch and Share live, and their edits were swallowed · §3.7 (`sm-running` busy state, `restorePreEdit` assert), §6.2 refusal (c); T2, T8
- minor · A split racing a ripple of the same clip landed out of place, and Phase 5 did not close it · §10.4 4a (`project.sm.mrev`), §2.2, §10.5, §10.6; T11, T17
- minor · The undo pre-flight ran only for arranging steps, so undoing a split half-applied against a lease · §10.2 door 2 (lease half from Phase 2), §3.7, §10.6; T10
- minor · After Stop sharing, undo un-adopted a project friends had arranged · §5.3 (`S.othersSeq`), §11, §14.2; T27
- minor · Phase 4's `away` line removed the owner's Arrange anyway · §3.11 `away` rows, §3.7 (counting editors exclude `waived`, entry points); T10
- minor · Role changes offered from the gate were unguarded both ways · §3.11 owner `live` row (`U.setMemberRole`, typing confirm, dropped member), §10.7, §14.2; T10
- minor · 4c authorship treated his own iPhone as another person · §10.4 4c items 3-4 (by mid, `self` mark), §10.7; T16; V6
- minor · T11's oracle was vacuous or falsely red on legitimate mixed-editor play · §14.6 T11 Round 3
- minor · A Full device got no glide and no line for a remote Simple ripple · §10.4 4d (Full-side toast and outline), §3.12 rule 6; T16; V6
- minor · The `srcW` backfill "on the next commit" rode inside the user's step, oversized for guests · §14.2 replace row, §12.2 (output copies); T7
- minor · The `big` refusal was a dead end for a guest and wrong for deletes · §3.7 `tooBig`, §3.11 `big` row; T16
- minor · A linked copy whose owner never ended the session stayed gated with no way out · §3.11 `offline` row (Make it my own, `U.leaveKeep`); T10
- serious · `#sm-say` replaced the tools just pressed: Move earlier worked once, focus was lost, buttons timed out · §3.12 rule 1 (two kinds, `#sm-live`, focus, timeouts), §8.5, §8.10; T22
- serious · Folded sections shared one 32 px band, so each folded line was a ~10 px target · §8.2 touch sizes (openers side by side, marks strip), §3.8, §8.10; T19
- minor · Action buttons appeared under the finger, so a double tap on 🗑 undid the delete or overrode a lock · §3.12 rule 5 (arming, 🗑 slot kept clear), §3.11 Options menu; T19
- serious · Most §3.11 lines could not fit one 380 px row with their buttons · §3.11 (348 px rule, `nameWord`, measured rows, Options ›, Why ›), §3.12 rule 3, §3.10 rule 4; T19, T12
- minor · The guest's `live` line was false while it could show · §3.11 guest row; T10
- minor · Phase 1 taught ⇄ in slot 2, then Phase 2 put ✂ there · §15.1 (✂ inert), §6.1, §15 Phase 1; T12
- serious · The Full-arrival "tap here for Simple" was a tap pill over Full's phone timeline · §6.1 A2 (non-interactive toast), §3.12 rule 6; T8
- serious · D3's "Full while Simple is a preview" never happens, so every existing install would pre-select Simple · §7.1 (migration), §0.3 row 11, §17 D3, §15 Phase 3; T26b
- serious · Sound was one fixed 24 px row with nowhere to draw overlapping music, voice-over and twins · §8.2 (32 px row, badges, +N, chooser, twins in the filmstrip, Put sound back), §8.5, §8.6, §4.6 citation; T19, T24
- serious · Rows and chips that appear on some projects had no slot and moved the clip row · §8.2 (Behind inside the sections box, notices in the tray line), §5.2 table, §5.4, §9.1; T19
- serious · Look, Effects and "Overlay" appeared twice on screen, the two "Overlay"s doing different things · §8.2 sketch, §8.5 (project row, faces ⤒ Lift off / ⤓ Into row, Look for all), §8.5c, §8.9; T20
- serious · On an un-adopted project, reframing or cropping a clip made it jump out of the clip row · §5.2 `fillsFrame` (b) and (c), §5.3 (a reframe adopts), §13 #57; T1
- serious · The Speed panel promised Keep pitch, which the engine cannot do and #916 rejects · §8.5 Speed, §8.7 (a Later row); §17 decided list
- serious · Global Tab, Space and arrows fired on focused buttons · §8.10 item 4a (`FM.simpleKeyScope`), §8.3 Tab row, §14.2; T22
- serious · Simple had no way in to Elements, Shapes or Templates, and an inserted element could not be edited · §8.5 Clips › Extras, §17 D21 (with the sm.unit fix for editing), §15 Phase 3; T6
- minor · "At the line" put new clips at the nearest cut, up to half a clip away · §8.5 Clips row (After Clip N, caret, `insertIndexAt`), §3.6 Insert row, §8.9; T2; V2
- minor · While the first pick loaded, a Text tap turned the Append into a question, and the drain's project id was unspecified · §7.3 step 2 (empty decided at drain start, `pid` after create); T2
- minor · On his own Mac + iPhone the `live` line named his phone "Ezra" · §3.11 `whoWord`, §10.7; T10; V6, V12
- minor · D20 left out the option that matches the phone (over the timeline) · §8.3 point 3 (option C, recommended), §17 D20; T19b; V4
- minor · "Made in Full" / "set in Full" lines were false for inserts, templates and friends · §8.9 rule and table, §5.4, §8.5, §9.1, §3.10 rule 4, §11, §13 #2; T20
- minor · Phase 1's messages had nowhere to show · §15.1 (lines-only `#sm-say` row), §15 Phase 1 row, §8.9 strings; T19, T21; V11
- minor · D18 and D19 were detail or technical calls on a sheet he wants short · §17 (rows removed, decided list), §3.7, §15, §15.1, §19 Q22, earlier log lines
- minor · The "‹ Simple" text button could not fit the 34 px slot at 380 · §6.1 A2 (icon-only back button), §6.2, §9.2, §17 D2; T12; V12
- minor · A phone held sideways left 10-40 px for a tool panel · §8.3 (over-timeline sheet for every D20 option); T19b; V4
- serious · The Simple-made effect marker `inst.sm` was stripped on every load, undo, import and host check · §2.3 row, §8.5c item 4, §14.2; T7
- serious · Ends with the video silently undid a length he set on purpose · §4.5 (`sm.tailEnd` guard), §2.2, §3.6 toggle row; T2
- serious · Template and element inserts kept the pack's Ends with the video, Stay put, mute-mode and author flags · §12.2 (`onCopy(units, 'pack')`), §14.2; T6
- minor · The missing-media sound test read data that does not exist and missed the app's recording formats · §5.2 `audioOnly(u)`; T1
- minor · `audioOnly` became a stored fact Replace never updated · §2.2, §14.2 replace row; T7
- minor · Author stamps went to the wrong person through copies, undo and packs, and leaked into templates · §2.2, §12.2 table, §10.4 4c; T6
- minor · The device-local `mine` set had no defined home · §10.4 4c item 2 (none on the owner, IndexedDB on a guest); T16
- minor · `taken`'s sanitiser depended on the device clock · §2.2 (constant bound); T7
- minor · Ask's adds in Simple skipped the stacking order and the track-end clamp · §8.5a (add-type intents), §14.2; T26
- minor · Boundary keys piled up on the camera and caption tracks until the sanitiser cut an effect's animation · §3.10 rule 3b (only with keys on both sides, pruning); T3
- minor · Following links and measuring frames was linear per lookup, so big projects classified in quadratic time · §2.5 (classify index), §14.5 (pins budget); T1
- minor · Refreshing `srcW` "on the next commit" was a hidden write in unrelated undo steps (second finding) · §14.2 replace row; T7
- minor · Older builds exported newer projects without transitions and said nothing · §12.1 (`SM_V` with Phase 6, the newer line); T7
- minor · `project.sm.home` was written only at create, so templates and shared files opened in Full · §12.2 (stamped on the saved copy); T6
- serious · Music stayed put only when Simple flagged it or it covered three clips, while Q4, Q23 and §13 #11 assumed all music does · §4.1 (one sound rule), §4.5 (Music always stay + tail, the empty track defined), §3.6 Append and Add rows, §5.2 table, §8.9; T2
- serious · Q25 covered classifying a crossfade but not the commands that shorten a blended clip or cut inside it · §3.1 (no command leaves `blendMax < amt`), §3.6 trim, Speed, Split and Delete rows, §8.5 slider stop, §3.11; T2
- serious · Q19: the §8.2 rows could not meet the 32 px floor at 173 or 182 px, and Behind was missing from the budget · §8.2 (32 px lanes and sound, badge instead of the +N row, 138 fixed, 170 reserve, Behind inside the box), §19 Q19; T19
- minor · Q18 was struck on a wrong measurement, and T12 already failed at 380 in both editors · §6.1 (measured numbers, A3, the time pill), §0.3 row 13, §17 D2, §19 Q18, §8.2 / §8.3 sketches; T12
- minor · Q17(c) was marked decided, but the reader could not find `mvhd` in moov-last files, HEIC has no APP1, and export-time dates were unguarded · §7.3 (`FM.isoBoxes`, one trust rule), §14.2, §19 Q17; T7
- minor · Q17(b)'s "reserved slots" fallback contradicted §7.3's single drain · §19 Q17 (two timings, DOM-only placeholders), §7.3
- minor · The pick drain and Append said nothing about audio files in the batch · §7.3 step 2 (songs as Music in the same plan), §3.6 Append row, §14.2; T2; V2
- minor · The Clips tool promised "At the end still works" live, but most Simple projects' Append is gated · §8.5 Clips row (`appendArranges`, greyed before the picker), §7.3 (release on refusal), §10.2; T10
- minor · Q23 was kept as a confirm, but only option A was designed · §13 #24 (option B, `FM.anchoredTime`), §8.3, §19 Q23, §17; V10
- minor · Q19 was addressed to his iPhone, which cannot give the SE number, and omitted in-app browsers · §19 Q19, §8.2 table (in-app row, 375×520 and 375×480 cases); T19

Choices made while folding round 3 (where two fixes disagreed or a fix needed a pick): a `sm.unit` wrapper is a moves-together
group whose members stay editable, not a block, so the Extras probe's "insert-made block tray" is not needed and the slot fix
anchors its extra full-frame members to the flagged one instead of making a block (§2.5, §3.6); a Delete never cuts a block
(it is pinned, keeping §9.2's promise), while the tail fit and End with the video resize a block member by member through
`setUnitSpan` (§3.3, §3.6); Reorder of a clip on either side of a blend refuses, so the Reorder fix's "a trailing blend arrives
as an overlap chip" cannot happen (§3.6); hairlines are closed whenever a command moves them and by Close all gaps, not by
adoption, which still moves nothing (§3.1, §5.3); Behind moves into the sections box as its lowest section (one fixed layout
for every project) rather than staying a row that appears on some projects, and so needs no chooser (§8.2); the sound row
draws one lane with count badges and a chooser, not 12 px strips, so every sound target stays ≥ 32 px (§8.2); the refusal lines
were re-measured to 348 px, so the owner's `live` line carries one **[Options ›]** (Make Sam a Viewer · Open in Full) instead
of round 2's two buttons, which also makes a role change a deliberate second tap (§3.11, §3.12); the guest line became *"Clips
stay put while you both edit"* (short enough to fit, and true) rather than naming the owner; Look leaves the project row and
comes back as **Look for all**, which always acts on every clip, while Effects in the project row makes segments only
(§8.5); the Full-side collab line is the one tappable toast the design allows, in Full's layout (§3.12 rule 6, §10.4 4d);
D20's recommendation moves from B to the new C, and D18 / D19 leave the sheet for §17's decided list; `mrev` makes two
simultaneous ripples a refusal with a line from Phase 4 instead of a seam chip, which §10.6 now says (§10.4 4a); followers
keep their length through Speed (a taste call, decided with Final Cut's behaviour and put in §17's decided list, not asked).
