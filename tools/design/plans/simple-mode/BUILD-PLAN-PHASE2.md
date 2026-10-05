# Simple mode: the build plan for Phase 2, "editing, clip after clip"

**For the BUILDER chat, after Phase 1 has shipped** (BUILD-PLAN.md: the FU group, step 1.2, step 1.3; step 1.4 optional).
This is a planning file: nothing in it is in the app. DESIGN.md says *why* (§3 the ripple and the runner, §4 attachments,
§8.5 the tools, §10.2 the live gate, §11 undo, §15 Phase 2); this file says *how*, as exact code on quoted anchors, with
the tests that prove each piece and what he sees. Written 1 Oct 2026 against **v17.21 (HEAD `28104a3e`, `SCHEMA_REV 6`)
with BUILD-PLAN.md's Phase 1 applied on top** (§11 lists every Phase 1 anchor that had to be fixed to get there).

**His rules this plan obeys** (DESIGN §0.4, §17; his words of 1 Oct): the original editor (**Full**) does not change in
design or function, so every release passes the FU "Full unchanged" group against HEAD and ships alone; **D4 A** (things
follow the clip they start on, music and long things stay); **D5 A** (a deleted clip takes what is on it, counted, one
Undo); **D6 A** (a title whose first frame is trimmed away slides back onto its clip); **D7 A** (a locked clip stops the
edit with Do it anyway, the lock kept); **D8 A** (Simple never makes gaps; Full's show as a chip you tap to close);
**D10 A** (the selection's tools in a row above a project-tools row that never goes away); **D14, first half, A** (looks,
text, captions and sound work with a friend in; moving clips waits); **D17 B** (music is never trimmed or faded; the video
runs on in black, as in Full); **D19 A** (benchmarks stay on the music); **D20 A** (on a PC, panels inside the left band);
names **Simple / Full**. **Still open, and designed around, not decided:** D3, D14b, D18, D22, D23, D24 (§10).

## How this was checked, and how far

| Check | Result |
|---|---|
| Phase 1 (BUILD-PLAN.md 1.2 + 1.3, minus the cog block 1.3.18–1.3.19 and the D22 B rows) applied by script to a scratch copy of HEAD | 35 hunks, every anchor found exactly once after **two** fixes (§11); `simple P1` **17/17 at 1280 and 17/17 at 380** after one Phase 1 test fix (§11); `921 S1` **24/24** with `SCHEMA_FP` re-measured |
| Release 2.1 (§3) applied on top, by script | 34 hunks + one new file, every anchor found exactly once |
| 2.1's 14 tests on the tree **before** 2.1 (Phase 1 only) | **0/13 at 1280 and 0/13 at 380**, T2b 0/1; 9 fail by **behaviour** (Phase 1 answers the key with its "comes next" line), 5 because a module is absent (§3.7 quotes each) |
| 2.1's tests on the tree **after** 2.1 | **13/13 at 1280 and 13/13 at 380**, T2b 1/1; the two Phase 1 tests 2.1 replaces go red until their §3.6 edits, then green |
| Behavioural mutations (seams kept, one rule broken) | 2.1: **13 of 14 caught**, the survivor caught by the test written for it (§3.8); 2.2: **10 of 11 caught**, the same (§4.9) |
| Release 2.2 (§4) applied on top | 19 hunks + one new file; its 9 tests **0/9 before at 1280 and at 380**, **9/9 after**; **all 39 Simple tests (16 Phase 1 + 14 + 9) green at 1280 and at 380** on the finished tree; 8 screens at 380×667 and 1280×800 looked at (§4.10) |
| Releases 2.3–2.6 (§5–§8) | **specified with anchors, code NOT written, NOT run** |
| The FU group | **not run**: it does not exist yet (BUILD-PLAN §3.2 builds it before step 1.2). Every Phase 2 release must pass it; §2.3 lists what each release adds to FU2 |
| `tools/ship.sh` / `tools/prove.sh` | not run (the same before/after comparison was run by hand through `tests/_cdp.py`, as BUILD-PLAN did) |
| The whole suite with Phase 2 applied | **not run** (only the `simple P`, `921 S1` slices) |
| His iPhone, Safari | not run (Chrome headless only) |
| **Independent review (1 Oct evening, §14)** | rebuilt literally from this file; every anchor once; 3 bugs and 1 Full-containment test gap found and **fixed in this file**; `simple P` **42/42 at 1280 and 380** on the rebuilt tree |

The rehearsal's trees, scripts and results live in this session's scratchpad (`phase2/`), not in the repo, and will not
outlive the session; everything they established is written here.

---

## 1. The builder's checklist

1. **Only after Phase 1 has shipped** (the FU group, 1.2, 1.3) and only when `./tools/next.sh` hands out #980, or he says
   now. Each release below is logged **`queue 980 (partial)`** (it advances #980, closes nothing) and ships **alone**: no
   other queue item in it, so any difference from HEAD is Simple's and a rollback takes one release back on its own.
2. Before each release: `./tools/tick.sh`, a clean `git status`, then that release's preflight (§2.5): every line prints `1`.
3. Apply the release's hunks **in the order written** (later hunks quote text earlier ones wrote), add its new file(s),
   bump the `?v=` of every file it changes (§2.3; `ship.sh` refuses a changed file whose buster did not move), append its
   tests at the end of `tests/tests.js` before the final `})();`, and make its listed edits to earlier tests (§3.6, §4.7).
4. Prove: each new test fails on HEAD and passes on the tree, at `--width 1280` and `--width 380` (`tools/prove.sh` does
   this inside `ship.sh`); repeat that release's mutation table with `tools/mutate.sh`, because the tests marked "module
   absent" prove presence only; run the FU group (`tools/full-unchanged.sh`) with that release's additions (§2.4).
5. `tools/ship.sh "…"` with `timeout: 600000`. If it lands in the background, read its output; never re-run it.
6. Send him one line and, for 2.2, the screenshot sheet first (§4.10: no visual ships unseen).

## 2. Phase 2 at a glance

DESIGN §15 ships Phase 2 as one ~2,000-line release. This plan ships it as **six releases**, in an order where each is
useful on its own and each leaves nothing half-built: the engine and the keys first, then the tools that make it usable
on a phone, then the rest.

| Release | What ships | He sees / holds | Files | Tests | Status in this plan |
|---|---|---|---|---|---|
| **2.1 The engine and the keys** | `js/spine-edit.js` (new): the runner `FM.spine.edit` (one edit = one undo step = one collab transaction; single flight + a queue of four; the live gate; locks with Do it anyway; adoption; Stay put for strays; the picture tail fit; exact landing of joins), `FM.trimClipEdge`, and the commands **delete, trim tail, trim head, split, close gap / fix overlap, duplicate**; the undo door in a live session; ⌘Z during a command waits; the `sm.cut` de-click; `#sm-say`'s lines with real buttons that wait for the finger | **On a PC (keyboard):** Delete / A / D / S / ⌘D on a clip in Simple do the clip-after-clip thing; **everywhere:** ✂ splits, a gap or overlap chip closes when tapped. Lines say what happened; Undo brings it back in one step | 1 new (~1,100 lines) + spine-words, spine, simple-timeline, editor-mode, history, collab-core, collab-session, collab-presence, collab-ui, app, index.html, styles.css (~330) | 15 (14 + 1 added by the review) | **exact code, rehearsed** (§3) |
| **2.2 The tools (D10)** | `js/simple-tools.js` (new): the **tray row** (the selected clip's tools: Length, Move earlier / later, Lift off, Duplicate, Crop, Close gap, More, Delete; an overlay's Into row, Forward / Back, Stay put; a title's Edit words) and the **project tools** (Clips, Text, Sound, Overlay), under the timeline on a phone and at the bottom of the band on a PC (D20 A); the commands **append, insert, reorder, lift off, put in the clip row, Stay put, z, close all gaps (Simple's ⋯), End with the video**; the **black band** (D17 B); Alt+← / → | **On the phone:** select a clip, its tools appear in one row, the project tools never go away; delete, move, lift, lengthen, add clips, text, music and overlays without a keyboard | 1 new (~250) + spine-edit, spine-words, simple-timeline, editor-mode, app, mobile, inspector, index.html, styles.css (~600) | 11 (9 + 2 added by the review) | **exact code, rehearsed** (§4) |
| **2.3 Speed, sound, replace** | Speed panel (`FM.setClipSpeed` extracted), Volume / Fade through `FM.shiftProp`, Replace (`FM.pickReplacement` + `FM.swapInMedia`), Reverse, Take sound out / Put sound back (sync twins), Mute clip sound, `sm.snd` on Replace | speed and sound on a clip; a shorter replacement closes up | — | T23, T24, T25 + | **specified, NOT written** (§5) |
| **2.4 Riders and couplings** | caption cues ride every command (§3.5), `riderKeys` for the camera and cut items, crossfades' owned keys, the couplings ask, Keep on the music, comment anchors (B25), Bounce skips `sb` (B5) | 2.1–2.3's "comes along in the next update" refusals go | — | T3, T4, T28 | **specified, NOT written** (§6) |
| **2.5 Drags** | hold-drag reorder, lift and put in by dragging, trim grips, pinch, edge auto-scroll (a copy, §0.4 I9), the arm gate | the clips move under the finger | — | T10 (drag), §13 #52 | **specified, NOT written** (§7) |
| **2.6 The live session, finished** | Arrange anyway, Make Sam a Viewer, Make it my own, undo labels and the soft line, the lease half of undo's pre-flight, Q29, the `li` mask, `othersSeq` | with a friend in: the way out of "clips stay put" | — | T10, T5 (live), FU4 | **specified, NOT written** (§8) |

**2.1 needs no answer from him and 2.2 needs only that he sees the sheet**; 2.3–2.6 need none either. D14b (open) only
decides Phase 4; until then 2.1's gate is the "moving clips waits while a friend can edit" of his D14 A.

### 2.1 Script order in `index.html` after 2.2

```
js/scene.js
js/spine-words.js?v=3      (Phase 1 new; 2.1 and 2.2 bump)
js/spine.js?v=2            (Phase 1 new; 2.1 bumps)
js/spine-edit.js?v=2       NEW in 2.1 (v=1), 2.2 bumps — after spine.js: it extends FM.spine
…
js/timeline.js, js/simple-timeline.js?v=3 (Phase 1 new; 2.1 and 2.2 bump)
js/inspector.js            (2.2 bumps)
js/simple-tools.js?v=1     NEW in 2.2 — after inspector.js
…
js/history.js, js/storage.js, …
js/editor-mode.js?v=3      (Phase 1 new; 2.1 and 2.2 bump)
js/app.js                  (2.1 and 2.2 bump)
js/mobile.js               (2.2 bumps)
js/collab-*.js             (2.1 bumps core, session, presence, ui)
```

### 2.2 The `?v=` bumps (+1 on whatever the tree has then)

| Release | Bump | New tags |
|---|---|---|
| 2.1 | `spine-words.js`, `spine.js`, `simple-timeline.js`, `editor-mode.js`, `history.js`, `collab-core.js`, `collab-session.js`, `collab-presence.js`, `collab-ui.js`, `app.js`, `styles.css` | `js/spine-edit.js?v=1` right after `js/spine.js` |
| 2.2 | `spine-edit.js`, `spine-words.js`, `simple-timeline.js`, `editor-mode.js`, `app.js`, `mobile.js`, `inspector.js`, `styles.css` | `js/simple-tools.js?v=1` right after `js/inspector.js` |

Plus every release: the version label, its POLISH-LOG line, the REQUESTS.md summary stamp (ship.sh gates). **No
`SCHEMA_REV` bump in 2.1 or 2.2**: the two new `sm` keys they write (`cut`, `snd`) are `true`, a plain value Phase 1's
sanitiser already keeps as an unknown key, so its output does not change (2.4 checks whether the key sanitiser keeps `sb`).

### 2.3 What each release adds to the FU group (DESIGN §0.4.5)

| Release | Shared code it touches | What FU must show unchanged |
|---|---|---|
| 2.1 | `history.commit(meta)` and the undo queue; `collab-session` `closeStep` / `preSessionStep` / `runStep`; `seamAt`; `duplicateLayer`'s `opts` | FU2: Full's ⌘Z / ⇧⌘Z, duplicate, split, a split pair's audio at the seam (no Full step carries a meta; `FM.spine.running` is never true in Full); FU4: Full's tx stream and undo in a session; FU3: Delete / A / S / D / ⌘D in Full |
| 2.2 | `addMediaLayer`'s `opts.noSave`; `syncSelectionChrome`; mobile `syncSheet`; inspector `refresh`; the `#sm-bar` markup | FU1: Full's phone sheet on select, the band's Add menu and layer editor, the ⋯ strip (Simple's ⋯ handler returns at once in Full); FU2: an add |

### 2.4 Preflight (run from the repo root before each release; every line must print `1`)

```bash
# 2.1 (on the tree after Phase 1)
grep -cF -- "    lines: {" js/spine-words.js
grep -cF -- "  const FLAGS = ['main', 'stay', 'tail', 'twin', 'muteByMode', 'unit'];" js/spine.js
grep -cF -- "  function armClear() {" js/simple-timeline.js
grep -cF -- "        chip.addEventListener('click', ev => { ev.stopPropagation(); FM.spine.say('gapNext', { full: true }); });" js/simple-timeline.js
grep -cF -- "    onKey(e) {" js/editor-mode.js
grep -cF -- '<button id="btn-sm-split" class="tbtn sm-only" type="button" aria-disabled="true"' index.html
grep -cF -- '  <script src="js/spine.js?v=1"></script>' index.html
grep -cF -- "    commit() {" js/history.js
grep -cF -- "    undo() { if (FM.flushPendingCommit) FM.flushPendingCommit();" js/history.js
grep -cF -- "  C.afterCommit = function () { const s = US(); if (s) s.afterCommit(); };" js/collab-core.js
grep -cF -- "  C.othersHere = function () {" js/collab-core.js
grep -cF -- "    let preSnaps = null, preIdx = -1;" js/collab-session.js
grep -cF -- "    function closeStep() {" js/collab-session.js
grep -cF -- "    function runStep(st, intoRedo) {" js/collab-session.js
grep -cF -- "    S.afterCommit = function () { closeStep(); };" js/collab-session.js
grep -cF -- "  PZ.holderName = function (lid) {" js/collab-presence.js
grep -cF -- "  U._forgetRid = forgetRid;" js/collab-ui.js
grep -cF -- "      if (touches && soundingAt(l, edgeT, ls)) return true;" js/app.js
grep -cF -- "  FM.duplicateLayer = FM.jobWrapped('duplicateLayer', async function (id, inPlace) {" js/app.js
# 2.2 (on the tree after 2.1)
grep -cF -- "  S.undoGate = function () { return S.arrangeGate(); };" js/spine-edit.js
grep -cF -- "      case 'cutShort': text = line('cutShort', o.name); buttons = [full]; break;" js/spine-edit.js
grep -cF -- "  function clearSay() { clearTimeout(sayT); if (sayEl) sayEl.textContent = ''; }" js/simple-timeline.js
grep -cF -- '        <div id="sm-say" role="status" aria-live="polite"></div>' index.html
grep -cF -- "      if (!has) { insp.style.top = ''; insp.style.maxHeight = ''; close(); userClosed = false; return; }" js/mobile.js
grep -cF -- "      if (navChanged && root.scrollTop) root.scrollTop = 0;" js/inspector.js
grep -cF -- "    document.body.classList.toggle('sm-has-sel', simple && n >= 1);" js/app.js
grep -cF -- '  <script src="js/inspector.js?v=' index.html
```

---

## 3. Release 2.1: the engine and the keys

**POLISH-LOG line (template):** `- vX.YY — queue 980 (partial) — the Simple editor edits clip after clip: ✂ splits at the
line, a gap or overlap chip closes when tapped, and on a keyboard Delete / A / D / S / ⌘D on a clip delete, trim, split and
duplicate it with everything after it closing up (D5: what is on a deleted clip goes with it; D6: a title whose first frame
is trimmed away slides back onto its clip; D7: a locked clip stops it with Do it anyway). Each is one undo step; ⌘Z pressed
mid-edit waits for it. With a friend who can edit in the session, moving clips waits (D14) and undo will not send one;
splitting still works live. Music is never trimmed (D17 B). Full is unchanged.`

**He sees:** in Simple, ✂ is no longer dimmed and splits; tapping a seam chip closes the gap; on his Mac, Delete / A / D /
S / ⌘D on a clip; a line in the row under the timeline after a delete that took things with it (*"Deleted clip and 2
things on it"* + **Undo**), and a line for every refusal. **On his phone in 2.1** only ✂ and the chips are new (the tray
with 🗑, Length and Move is 2.2), so say so in the release line he gets. **D's:** D4–D8 A, D14 first half A, D17 B. **Full:**
unchanged, FU group green.

### 3.1 What it does (the design, in this code)

- **The runner** (`FM.spine.edit`, DESIGN §3.7): single flight; a fifth tap during a run says *"One moment — still
  finishing the last edit."*; each queued tap keeps its target and playhead from when it was pressed. Order of checks:
  read-only role → newer file → **classify uncached** → the plan → the live gate (arranging or adopting) → media still
  arriving → locks (D7) → someone else's lease → flush the pending canvas commit and the text editor → pause → snapshot +
  mute → (unlock) → **adopt** (first arranging edit) → **pin strays** → apply → re-classify → **tail fit** (picture items
  with `sm.tail` only, D17 B) → pin tails → refit transparent groups → mark `sm.cut` → (re-lock) → unmute → refresh →
  land the playhead → **one `history.commit({label, ed: 's', arr})`** → speak. Anything that throws inside puts the
  document back from the snapshot and says *"That didn’t work, so nothing changed"*.
- **The ripple** moves by main-track ORDER (§3.4), never re-packs, and **lands** every float-noise join, every hairline in
  the moved range and every seam the command creates **bit-exact** on the new end before it (§3.1): the next start is
  computed from what `apply` will actually write (assigned start or `old + d`, plus the stored duration), not `e.end + d`,
  which rounds differently. T2b measures it: without the landing 99 of 2,100 seeded deletes left a black frame; with it 0.
- **Refusals instead of half-work** (§3.2 rule 6), each with a line: a rider (a caption track running past the edit), the
  camera's keys or window after it, a cut item with keys, a crossfade whose fade belongs to the clip being trimmed or
  deleted, and a time link the command would pull apart (parent, Follow, matte, karaoke) — 2.4 turns the first four into
  maps and the last into an ask. A locked clip in the way: *"That clip is locked"* + **Do it anyway** (one step, the lock
  kept, D7).
- **The live gate** (D14 first half, §10.2): `FM.collab.othersCanEdit()` — on the owner, a connected member with the
  Editor role or one still in the room's member table; on a guest, always; with no session, a linked copy not yet left.
  Viewers and Commenters never count. Arranging and adopting refuse with *"Sam can edit · clips stay put"* (owner) or
  *"Clips stay put while you both edit"* (guest) + **Open in Full**; split, which moves nothing else, goes live after the
  lease check. **The undo door:** the runner tags its arranging steps `arr`; collab's `runStep` puts such a step back
  unconsumed while the gate is shut, before anything is applied or sent (in Simple with the gate's line, in Full with
  Full's existing *"Can't undo — it has changed since"*, §0.4 N4).
- **Containment** (§0.4): `history.commit(meta)` stores a meta Full never passes; undo / redo queue only while
  `FM.spine.running`; `seamAt` asks for continuity only of a pair whose later half carries `sm.cut` (written only by
  Simple's runner); `FM.duplicateLayer(id, inPlace, opts)` skips its own save only for `{noSave}`. Each is inert in Full.

### 3.2 New file `js/spine-edit.js` (whole file, as it ships in 2.1)

```js
/* FreeMotion — FM.spine's WRITE side: the runner and the arranging commands (Simple mode Phase 2, DESIGN.md §3, §4, §5.3).
 *
 * WHAT THIS IS. js/spine.js (Phase 1) READS a project as clips. This file CHANGES it the way a clip-after-clip editor
 * does: delete a clip and the rest close up, trim one and the rest follow, split, close a gap, duplicate. Every command
 * is one plan built against the read model, applied by ONE runner, as ONE undo step and ONE collab transaction.
 *
 * ONLY SIMPLE CALLS ANYTHING HERE (DESIGN.md §0.4). Full's delete, trims, split and drags are not touched: they never
 * ripple, and nothing in Full reaches FM.spine.edit. The few shared seams this release adds (history meta, the undo
 * queue while `FM.spine.running`, `sm.cut` in the de-click rule, `{noSave}` on duplicate) are each inert unless a
 * Simple command is running or a Simple-made mark is in the document; the FU group proves Full equals HEAD.
 *
 * WHAT RELEASE 2.1 REFUSES INSTEAD OF DOING (BUILD-PLAN-PHASE2.md §3, each with its own line and Open in Full): a
 * command that would have to move caption cues, camera keys or a cut item's keys (the rider maps, release 2.4), a blend
 * whose fade belongs to the clip being trimmed or deleted (2.4), and a time link the command would pull apart (2.4's
 * ask). Refusing is DESIGN §3.2 rule 6: refuse, never half-apply.
 *
 * No DOM except body.sm-running and the one sink FM.spine.say (js/simple-timeline.js). The suite drives it headless.
 */
window.FM = window.FM || {};
(function (FM) {
  'use strict';
  const S = FM.spine = FM.spine || {};
  const words = () => FM.spineWords || {};
  const line = (k, a, b, c) => { const v = (words().lines || {})[k]; return typeof v === 'function' ? v(a, b, c) : (v || ''); };
  const fps = () => (FM.scene && FM.scene.project && FM.scene.project.fps) || 30;
  const MINLEN = () => S.minLen(fps());
  const SLACK = 1e-6;
  const isAnim = p => !!(p && typeof p === 'object' && Array.isArray(p.kf));

  /* ═══ THE KEYFRAME MOVERS (§0.4 B2). Simple's own copies over FM.timedLists, so cue-effect keys move too; Full's
     FM.shiftLayerKeyframes / scaleLayerKeyframes stay on animatedProps exactly as before. */
  S.shiftKeys = function (layer, d) {
    if (!layer || !d || !isFinite(d)) return;
    (FM.timedLists ? FM.timedLists(layer) : FM.animatedProps(layer)).forEach(p => p.kf.forEach(k => { k.t += d; }));
  };
  S.keyCount = function (layer) {
    let n = 0;
    (FM.timedLists ? FM.timedLists(layer) : FM.animatedProps(layer)).forEach(p => { if (p !== layer.speed) n += p.kf.length; });
    return n;
  };
  /* The §4.5 tail-fit map: old span [s, s+D] → [s, s+D2]. Keys in the first h keep their time, keys in the last e move by
     D2 − D, keys between scale linearly. h = e = min(5, min(D, D2)/4): symmetric, so a fit there and back is exact. */
  S.fitMap = function (s, D, D2) {
    const h = Math.min(5, Math.min(D, D2) / 4), e = h;
    return function (t) {
      if (!(D > 0) || !(D2 > 0)) return t;
      if (t <= s + h) return t;
      if (t >= s + D - e) return t + (D2 - D);
      const a0 = s + h, a1 = s + D - e, b1 = s + D2 - e;
      return a0 + (t - a0) * (b1 - a0) / (a1 - a0);
    };
  };
  S.mapLayerKeys = function (layer, g) {
    (FM.timedLists ? FM.timedLists(layer) : FM.animatedProps(layer)).forEach(p => {
      if (p === layer.speed) return;   // the ramp describes the re-timing (scene.js scaleLayerKeyframes)
      p.kf.forEach(k => { k.t = g(k.t); });
    });
  };

  /* ═══ FM.trimClipEdge (§3.6): the grip's maths (js/timeline.js applyTrim), minus the frame snap and the drag, as a PURE
     function. Returns { start, duration, trimStart, landed, fxShift } and writes nothing (the speed integrals lay a
     temporary window on the layer and restore it, as FM.speedAdvanceOver always has). Used by Simple only: Full's grip,
     A / D and FM.trimLayerHead keep their own code (§0.4 B7); T2 compares the numbers with the grip's. */
  FM.trimClipEdge = function (layer, edge, delta, srcDur) {
    const s0 = +layer.start || 0, d0 = +layer.duration || 0, tr0 = +layer.trimStart || 0;
    const isVid = layer.type === 'video';
    const rev = isVid && !!layer.reversed;
    const ramped = !!(FM.isAnimated && FM.isAnimated(layer.speed));
    const sp = FM.speedAt ? FM.speedAt(layer, s0) : 1;
    const sd = (isFinite(srcDur) && srcDur > 0) ? srcDur : Infinity;
    const floor = Math.min(MINLEN(), d0);
    const keepTrim = isVid ? undefined : layer.trimStart;
    if (edge === 'tail') {
      let nd = Math.max(floor, d0 + delta), tr = tr0;
      if (rev && ramped) {
        if (nd > d0) { nd = Math.max(floor, FM.speedAdvanceSolve(layer, d0, nd, tr0)); tr = Math.max(0, tr0 - FM.speedAdvanceOver(layer, d0, nd)); }
        else tr = tr0 + FM.speedAdvanceOver(layer, nd, d0);
      } else if (rev) {
        let nt = tr0 - (nd - d0) * sp;
        if (nt < 0) { nd = Math.max(floor, d0 + tr0 / sp); nt = 0; }
        tr = nt;
      } else if (isVid && sd < Infinity) {
        nd = Math.min(nd, FM.maxDurForSource(layer, sd - tr0, nd));
      }
      return { start: s0, duration: nd, trimStart: isVid ? tr : keepTrim, landed: nd - d0, fxShift: 0 };
    }
    let dl = delta;
    if (d0 - dl < floor) dl = d0 - floor;
    if (rev) {
      if (sd < Infinity) { const maxDur = (sd - tr0) / sp; if (d0 - dl > maxDur) dl = d0 - maxDur; }
      return { start: s0 + dl, duration: d0 - dl, trimStart: tr0, landed: dl, fxShift: dl };
    }
    if (!isVid) return { start: s0 + dl, duration: d0 - dl, trimStart: keepTrim, landed: dl, fxShift: dl };
    const srcOf = d => ramped ? FM.headSourceDelta(layer, d) : d * sp;
    let srcD = srcOf(dl);
    if (tr0 + srcD < 0) {
      if (!ramped) dl = -tr0 / sp;
      else { let lo = dl, hi = 0; for (let i = 0; i < 30; i++) { const mid = (lo + hi) / 2; if (FM.speedAdvanceOver(layer, mid, 0) > tr0) lo = mid; else hi = mid; } dl = hi; }
      srcD = srcOf(dl);
    }
    return { start: s0 + dl, duration: d0 - dl, trimStart: Math.max(0, tr0 + srcD), landed: dl, fxShift: dl };
  };

  /* ───────────────────────────── read-model helpers ───────────────────────────── */
  const srcDurOf = l => { const m = FM.media && FM.media.get && FM.media.get(l.id); return (m && m.duration > 0) ? m.duration : Infinity; };
  function byIdMap() { return new Map(FM.scene.layers.map(l => [l.id, l])); }
  function unitLayers(id, map) {
    const l = map.get(id); if (!l) return [];
    if (l.type === 'group' && FM.groupDescendants) return [l].concat(FM.groupDescendants(id).filter(Boolean));
    return [l];
  }
  function mainIdx(R, id) { for (let i = 0; i < R.main.length; i++) if (!R.main[i].slot && R.main[i].id === id) return i; return -1; }
  /* The main entry under t: start − eps ≤ t < end − eps, a cut going to the clip AFTER it (§4.1). Clips only. */
  S.mainAtTime = function (R, t) {
    for (let i = R.main.length - 1; i >= 0; i--) { const e = R.main[i]; if (!e.slot && e.start - R.eps <= t && t < e.end - R.eps) return e; }
    return null;
  };
  const isFloatJoin = (R, i) => i > 0 && R.main[i].seam && (R.main[i].seam.kind === 'hairline' || (R.main[i].seam.kind === 'join' && Math.abs(R.main[i - 1].end - R.main[i].start) < 1e-9));
  /* The upper of two overlapping main clips owns a blend (§3.1): it carries the opacity keys inside the overlap. */
  function blendOwner(a, b, map) { const la = map.get(a.id), lb = map.get(b.id), z = id => FM.scene.layers.findIndex(l => l.id === id); return z(a.id) < z(b.id) ? la : lb; }

  /* ═══ isTwinOf (§4.6): the sound taken out of a clip. Audio-only, the clip's exact timing, and either the karaoke link
     or the same source file (name + size + type: an extracted twin's record is re-read from the clip's own File). */
  S.isTwinOf = function (t, c, eps) {
    if (!t || !c || t === c || t.type !== 'video') return false;
    if (!(t.audioOnly === true || (t.sm && t.sm.snd === true))) return false;
    const e = eps == null ? 0.5 / fps() : eps, near = (a, b) => Math.abs((+a || 0) - (+b || 0)) <= e;
    if (!(near(t.start, c.start) && near(t.duration, c.duration) && near(t.trimStart, c.trimStart) && !!t.reversed === !!c.reversed)) return false;
    if (JSON.stringify(t.speed == null ? 1 : t.speed) !== JSON.stringify(c.speed == null ? 1 : c.speed)) return false;
    if (t.karaokeOf === c.id) return true;
    const a = FM.media && FM.media.get(t.id), b = FM.media && FM.media.get(c.id), fa = a && a.file, fb = b && b.file;
    return !!(fa && fb && fa.name === fb.name && fa.size === fb.size && fa.type === fb.type);
  };
  function twinsOf(R, c, map) { return (R.followers[c.id] || []).map(id => map.get(id)).filter(t => S.isTwinOf(t, map.get(c.id), R.eps)); }

  /* ═══ neverPinned (§4.3): the ONE "never gets sm.stay" test, shared by adopt() and pinStrays(). */
  S.neverPinned = function (id, R) {
    const u = R.units[id]; if (!u) return true;
    if (u.kind === 'main' || u.kind === 'captions' || u.kind === 'fullOnly' || u.kind === 'undecided') return true;
    if (R.tail.indexOf(id) >= 0) return true;
    if (u.host && String(u.host).indexOf('slot:') === 0) return true;
    return false;
  };
  /* A picture item whose end may follow the video (§4.5, D17 B): never a sound, a caption track, the camera, a Full-only
     or undecided unit, a background, or a video that carries audible sound. */
  function tailOk(l, u) {
    if (!l || !u) return false;
    if (u.kind === 'audio' || u.kind === 'captions' || u.kind === 'fullOnly' || u.kind === 'undecided' || u.kind === 'background') return false;
    if (l.audioOnly === true || (l.sm && l.sm.snd === true) || l.type === 'camera') return false;
    if (l.type === 'video' && !l.muted) { const m = FM.media && FM.media.get(l.id); if (!(m && m.hasAudio === false)) return false; }
    return true;
  }
  function setTail(l, end) { if (S.setFlag(l, 'tail', true)) l.sm.tailEnd = end; }

  /* ═══ ADOPTION (§5.3): the first arranging edit stores what was worked out, in its own undo step. Writes the main set
     (exactly, removing strays), Stay put on hostless, long and whole-covering items, and the tail flag on whole-covering
     PICTURE items. Moves nothing. Returns the paths it wrote (the collab meta for §5.3's adoption rule, release 2.6). */
  S.adopt = function (R) {
    const P = FM.scene.project, paths = ['P/sm/adopted', 'P/sm/v'];
    if (!P.sm || typeof P.sm !== 'object' || Array.isArray(P.sm)) P.sm = {};
    P.sm.adopted = true; P.sm.v = FM.SM_V;
    const mainIds = new Set(R.main.filter(e => !e.slot).map(e => e.id));
    FM.scene.layers.forEach(l => {
      if (mainIds.has(l.id)) { if (!(l.sm && l.sm.main)) { S.setFlag(l, 'main', true); paths.push('L/' + l.id + '/sm/main'); } }
      else if (l.sm && l.sm.main) { S.setFlag(l, 'main', false); paths.push('L/' + l.id + '/sm/main'); }
    });
    paths.push.apply(paths, pinUnits(R, true));
    return paths;
  };
  /* Both adopt() and pinStrays(): Stay put on every non-main unit neverPinned does not exclude, with no flag of its own,
     whose pre-edit host is null (before 0, in a gap, long, or the one sound rule) or that covers the whole main track.
     `whole` items that are pictures get the tail flag too (decided once, stored, so no later trim flips it). */
  function pinUnits(R, adopting) {
    const map = byIdMap(), out = [];
    const first = R.main.filter(e => !e.slot)[0];
    Object.keys(R.units).forEach(id => {
      const u = R.units[id], l = map.get(id);
      if (!l || S.neverPinned(id, R)) return;
      if (l.sm && (l.sm.stay || l.sm.main)) return;
      const s = +l.start || 0, e = s + (+l.duration || 0);
      const whole = !!first && s <= first.start + R.eps && e >= R.trackEnd - R.eps;
      if (!(whole || u.host == null)) return;
      S.setFlag(l, 'stay', true); out.push('L/' + id + '/sm/stay');
      if (tailOk(l, u) && first && Math.abs(e - R.trackEnd) <= R.eps) { setTail(l, e); out.push('L/' + id + '/sm/tail'); }
      if (!adopting) S._pinnedNow.push(id);
    });
    return out;
  }
  S._pinnedNow = [];
  S.pinStrays = function (R) { S._pinnedNow = []; return pinUnits(R, false); };

  /* ═══ THE TAIL FIT (§4.5, D17 B): every item carrying sm.tail whose end still equals the end it was fitted at follows
     the new main-track end, keys re-timed by fitMap. A different end means he set its length on purpose: the flag goes
     (Stay put kept) and the line says so. Sound never carries the flag, and the runner clears a stray one. Only the
     latest-starting piece of one split lineage keeps it (an old build's double flag is repaired here). */
  S.fitTails = function (R2, plan) {
    const end = R2.trackEnd, notes = [], map = byIdMap();
    if (!R2.main.some(e => !e.slot)) return notes;
    const lineage = new Map();
    FM.scene.layers.forEach(l => {
      if (!(l.sm && l.sm.tail)) return;
      const u = R2.units[l.id];
      if (!tailOk(l, u || { kind: 'overlay' })) { S.setFlag(l, 'tail', false); return; }
      const k = l.splitOf || l.id;
      const prev = lineage.get(k);
      if (!prev || (+l.start || 0) > (+prev.start || 0)) { if (prev) S.setFlag(prev, 'tail', false); lineage.set(k, l); }
      else S.setFlag(l, 'tail', false);
    });
    lineage.forEach(l => {
      const s = +l.start || 0, D = +l.duration || 0, e = s + D;
      const fitted = typeof l.sm.tailEnd === 'number' ? l.sm.tailEnd : e;
      if (Math.abs(e - fitted) > R2.eps && !(plan && plan.resized && plan.resized.has(l.id))) { S.setFlag(l, 'tail', false); S.setFlag(l, 'stay', true); notes.push(line('keepsLength', S.itemWord(l, R2))); return; }
      if (Math.abs(e - end) <= 1e-9) { l.sm.tailEnd = end; return; }
      if (!(end > s + 1e-9)) return;                                    // cannot be fitted: the black band names it
      let D2 = end - s, tr = l.trimStart;
      if (l.type === 'video') { const r = FM.trimClipEdge(l, 'tail', D2 - D, srcDurOf(l)); D2 = r.duration; tr = r.trimStart; }
      else D2 = Math.max(MINLEN(), D2);
      const g = S.fitMap(s, D, D2);
      S.mapLayerKeys(l, g);
      if (plan && plan.touched) plan.touched.add(l.id);
      l.duration = D2; if (l.type === 'video') l.trimStart = tr;
      l.sm.tailEnd = s + D2;
    });
    return notes;
  };

  /* Transparent groups follow their members (§2.5): start = min member start, duration = max end − start, exact (Full's
     refitGroupsFor rounds to the millisecond and only walks up from one layer). An emptied group is removed with the
     delete that emptied it; one with no members never holds the video past the new end. */
  function refitTransparentGroups(R) {
    const L = FM.scene.layers, byParent = new Map();
    L.forEach(l => { if (l.parent) { if (!byParent.has(l.parent)) byParent.set(l.parent, []); byParent.get(l.parent).push(l); } });
    const depth = g => { let n = 0, p = g.parent, m = byIdMap(); while (p && n < 64) { n++; const q = m.get(p); p = q ? q.parent : null; } return n; };
    L.filter(g => g.type === 'group' && !R.units[g.id]).sort((a, b) => depth(b) - depth(a)).forEach(g => {
      const kids = byParent.get(g.id) || [];
      if (!kids.length) {
        const ge = (+g.start || 0) + (+g.duration || 0);
        if (R.trackEnd > 0 && ge > R.trackEnd + 1e-9) g.duration = Math.max(MINLEN(), R.trackEnd - (+g.start || 0));
        return;
      }
      const s = Math.min.apply(null, kids.map(k => +k.start || 0));
      const e = Math.max.apply(null, kids.map(k => (+k.start || 0) + (+k.duration || 0)));
      g.start = s; g.duration = Math.max(MINLEN(), e - s);
    });
  }

  /* ═══ sm.cut (§12.1, §0.4 B6): two halves of one split that a command made touch over a jump in the footage get the
     de-click ramps back. app.js seamAt checks continuity only for a pair whose later half carries this mark, so a
     Full-made project sounds exactly as today. */
  function markCuts(touched) {
    const L = FM.scene.layers, sib = new Map();
    L.forEach(l => { if (l.splitOf) { if (!sib.has(l.splitOf)) sib.set(l.splitOf, []); sib.get(l.splitOf).push(l); } });
    sib.forEach(list => {
      list.sort((a, b) => (+a.start || 0) - (+b.start || 0));
      for (let i = 1; i < list.length; i++) {
        const a = list[i - 1], b = list[i];
        if (!touched.has(a.id) && !touched.has(b.id)) continue;
        if (Math.abs((+a.start || 0) + (+a.duration || 0) - (+b.start || 0)) >= 1e-3) continue;
        if (!S.continuous(a, b)) S.setFlag(b, 'cut', true);
      }
    });
  }
  S.continuous = function (a, b) {   // a plays before b in time; is b's first source frame a's next one?
    if ((a.mediaRev || 0) !== (b.mediaRev || 0) || !!a.reversed !== !!b.reversed) return false;
    const adv = l => FM.layerSourceAdvance ? FM.layerSourceAdvance(l, +l.duration || 0) : (+l.duration || 0);
    return a.reversed ? Math.abs((+b.trimStart || 0) + adv(b) - (+a.trimStart || 0)) <= 1 / 48000
                      : Math.abs((+a.trimStart || 0) + adv(a) - (+b.trimStart || 0)) <= 1 / 48000;
  };

  /* ═══ THE PLAN. moves add (addMove), a landing assigns (addLand: l.start = t exactly, keys by t − old). writes run before
     the moves (trims, key shifts on a clip that keeps its start), pre are async steps that make layers (split, duplicate),
     post run after the moves. `touched` is every unit the lock rule (D7) and the lease rule look at. */
  function newPlan(label) {
    return { label: label, moves: new Map(), lands: new Map(), keyless: new Set(), removes: new Set(), touched: new Set(),
             resized: new Set(), writes: [], pre: [], post: [], arranges: true, adopts: true, time: null, live: null, say: null, sayButtons: null, counts: {} };
  }
  function addMove(p, id, d) { p.moves.set(id, (p.moves.get(id) || 0) + d); p.touched.add(id); }
  function addLand(p, id, t) { p.lands.set(id, t); p.touched.add(id); }
  const refusePlan = (kind, o) => ({ refuse: kind, refuseOpts: o || {} });

  /* THE ONE RIPPLE (§3.4), by main-track ORDER, with exact landings (§3.1): entries from `from` move by dt; a seam that was a
     float-noise join or a hairline, and the first seam when `landFirst`, lands bit-exact on the new end before it, and
     every later entry, follower and the tail take that correction too. Returns the total displacement of the last entry. */
  function ripple(p, R, from, dt, skip, prevEnd, landFirst) {
    let acc = 0, last = null;
    const map = byIdMap();
    for (let i = from; i < R.main.length; i++) {
      const e = R.main[i];
      if (skip.has(e.id)) continue;
      let d = dt + acc, landAt = null;
      const wantLand = !S._noLanding && prevEnd != null && ((i === from && landFirst) || isFloatJoin(R, i));   // _noLanding: T2b's positive control only
      if (wantLand) { const prop = e.start + d; if (Math.abs(prevEnd - prop) <= R.eps + 1e-9) { landAt = prevEnd; acc += prevEnd - prop; d = prevEnd - e.start; } }
      if (e.slot) { e.members.forEach(m => { if (!skip.has(m)) addMove(p, m, d); }); prevEnd = e.end + d; }
      else {
        if (landAt != null) addLand(p, e.id, landAt); else addMove(p, e.id, d);
        (R.followers[e.id] || []).forEach(f => { if (!skip.has(f)) addMove(p, f, d); });
        /* the end the NEXT seam lands on is the one apply() will produce, bit for bit: the new start (assigned, or old + d)
           plus the stored duration — never e.end + d, which rounds differently (§3.1) */
        const l = map.get(e.id), ns = landAt != null ? landAt : (+l.start || 0) + d;
        prevEnd = ns + (+l.duration || 0);
      }
      last = d;
    }
    return { last: last, acc: acc };
  }
  /* The tail (§4.3) moves by the change of trackEnd; one that sat bit-exact on the old end lands on the new one. */
  function tailMove(p, R, newEnd, map) {
    const d = newEnd - R.trackEnd;
    if (!d) return;
    R.tail.forEach(id => { const l = map.get(id); if (!l) return; if (Math.abs((+l.start || 0) - R.trackEnd) < 1e-9) addLand(p, id, newEnd); else addMove(p, id, d); });
  }

  /* Release 2.1 does not move riders, camera keys or a cut item's keys yet (2.4): a command that would is refused. `from` is
     the earliest project time the command changes; a rider or the camera with anything at or after it would need a map. */
  function riderBlock(R, from, map) {
    for (let k = 0; k < R.riders.length; k++) {
      const l = map.get(R.riders[k]); if (!l) continue;
      const end = (+l.start || 0) + (+l.duration || 0);
      if (end > from + R.eps) return { kind: 'riders', name: S.itemWord(l, R) };
    }
    for (let k = 0; k < R.fullOnly.length; k++) {
      const l = map.get(R.fullOnly[k]); if (!l || l.type !== 'camera' || (l.sm && l.sm.stay)) continue;
      const keyed = (FM.timedLists ? FM.timedLists(l) : FM.animatedProps(l)).some(pp => pp.kf.some(kk => kk.t >= from - R.eps));
      const windowed = (+l.start || 0) > 0 && (+l.start || 0) + (+l.duration || 0) > from + R.eps;
      if (keyed || windowed) return { kind: 'camera' };
    }
    return null;
  }

  /* The displacement a layer gets from this plan (null = removed). A unit's members share its d. */
  function dispOf(p, map) {
    const out = new Map();
    const set = (id, d) => unitLayers(id, map).forEach(l => out.set(l.id, d));
    p.moves.forEach((d, id) => set(id, d));
    p.lands.forEach((t, id) => { const l = map.get(id); if (l) set(id, t - (+l.start || 0)); });
    p.removes.forEach(id => unitLayers(id, map).forEach(l => out.set(l.id, null)));
    return out;
  }
  /* §3.10 rule 5 and rule 4, the 2.1 form: a survivor that references a removed layer refuses the command, naming both;
     a reference whose two ends this plan moves by different amounts refuses too (2.4 makes that an ask). The referenced
     end counts only when it varies in time (keys, a video, a behaviour); a still parent can be left behind harmlessly. */
  function refsOf(l) {
    const out = [];
    if (l.parent) out.push({ id: l.parent, via: 'parent' });
    (l.behaviors || []).forEach(b => { if (b && b.params) ['targetId', 'sourceId'].forEach(k => { if (b.params[k]) out.push({ id: b.params[k], via: 'follow' }); }); });
    if (FM.eachRefFx) FM.eachRefFx(l, fx => { if (fx && fx.params && fx.params.source) out.push({ id: fx.params.source, via: 'matte' }); });
    if (l.karaokeOf) out.push({ id: l.karaokeOf, via: 'twin' });
    return out;
  }
  const timeVarying = l => !!l && (l.type === 'video' || (FM.animatedProps && FM.animatedProps(l).length > 0) || (l.behaviors || []).some(b => b && b.enabled !== false));
  function couplingBlock(p, R, map) {
    const disp = dispOf(p, map);
    for (let i = 0; i < FM.scene.layers.length; i++) {
      const x = FM.scene.layers[i];
      const dx = disp.has(x.id) ? disp.get(x.id) : 0;
      if (dx === null) continue;
      const refs = refsOf(x);
      for (let k = 0; k < refs.length; k++) {
        const y = map.get(refs[k].id); if (!y) continue;
        if (refs[k].via === 'parent' && y.type === 'group') continue;   // membership, not a link (§2.5)
        const dy = disp.has(y.id) ? disp.get(y.id) : 0;
        if (dy === null) {
          if (refs[k].via === 'twin') continue;   // a karaoke twin is a follower: it is removed with its clip
          return { kind: 'attached', a: S.itemWord(x, R), b: S.itemWord(y, R) };
        }
        if (Math.abs(dx - dy) > 1e-9 && timeVarying(y)) return { kind: 'slip', via: refs[k].via };
      }
    }
    return null;
  }

  /* ───────────────────────────── the commands (§3.6) ───────────────────────────── */

  /* DELETE A MAIN CLIP (D5: what follows it goes too, counted, one Undo). n slides to where c started; the seam p|c becomes
     p|n with its old amount. Long items over [a, b) are cut through the delete map; a block is never cut. */
  S.planDelete = function (R, id) {
    const map = byIdMap(), i = mainIdx(R, id);
    if (i < 0) return refusePlan('gone');
    const c = R.main[i], p = R.main[i - 1] || null, n = R.main[i + 1] || null, L = map.get(c.id);
    const plan = newPlan('Delete clip');
    let a = c.start, b = n ? n.start : c.end;
    let dt = -(b - a);
    /* blends (§3.1, §3.6 Delete row): c's blend with n goes with c. A fade-in c owns over p goes too: n lands at p.end.
       A fade p owns over c would need its keys stripped to a static value (release 2.4): refused. */
    if (p && c.seam && c.seam.kind === 'blend') {
      const own = blendOwner(p, c, map);
      if (own === L) { if (n) dt = p.end - n.start; plan.counts.fade = 1; }
      else return refusePlan('fadeOwned', { a: S.itemWord(map.get(p.id), R), b: S.itemWord(L, R) });
    }
    const rb = riderBlock(R, a, map); if (rb) return refusePlan(rb.kind, rb);
    const removes = [c.id].concat(R.followers[c.id] || []);
    removes.forEach(x => { unitLayers(x, map).forEach(l => plan.removes.add(l.id)); plan.touched.add(x); });
    plan.counts.followers = (R.followers[c.id] || []).filter(x => !S.isTwinOf(map.get(x), L, R.eps)).length;
    /* (i)–(iii) long items cut through the delete map, keys refused until 2.4 */
    const ml = MINLEN(), len = b - a;
    const cut = Object.keys(R.units).filter(uid => {
      const u = R.units[uid], l = map.get(uid);
      if (!l || !u.long || u.kind === 'captions' || u.kind === 'fullOnly' || u.kind === 'block' || u.kind === 'main') return false;
      if (R.tail.indexOf(uid) >= 0 || (l.sm && l.sm.stay) || l.type === 'group') return false;
      const s = +l.start || 0, e = s + (+l.duration || 0);
      return e > a + 1e-9 && s < b - 1e-9;
    });
    for (let k = 0; k < cut.length; k++) {
      const l = map.get(cut[k]), s = +l.start || 0, e = s + (+l.duration || 0);
      if (S.keyCount(l) > 0) return refusePlan('cutKeys', { name: S.itemWord(l, R) });
      const media = l.type === 'video';
      if (s >= a - 1e-9) {                                   // (i) starts inside the deleted span
        if (e - b < ml - SLACK) return refusePlan('cutShort', { name: S.itemWord(l, R) });
        plan.keyless.add(l.id); addLand(plan, l.id, a);
        plan.writes.push(() => {
          if (media) { const r = FM.trimClipEdge(l, 'head', b - s, srcDurOf(l)); l.duration = r.duration; l.trimStart = r.trimStart; FM.shiftLayerFxClock(l, r.fxShift); }
          else { l.duration = Math.max(ml, e - b); FM.shiftLayerFxClock(l, b - s); }
        });
      } else if (e <= b + 1e-9) {                             // (ii) ends inside it
        if (a - s < ml - SLACK) return refusePlan('cutShort', { name: S.itemWord(l, R) });
        plan.touched.add(l.id);
        plan.writes.push(() => { l.duration = Math.max(ml, a - s); });
      } else if (!media) {                                    // (iii) a middle cut of something with no source clock
        plan.touched.add(l.id);
        plan.writes.push(() => { l.duration = Math.max(ml, l.duration - len); });
      } else {                                                // (iii) a middle cut of a video or sound: split, then trim B
        if (a - s < ml - SLACK || e - b < ml - SLACK) return refusePlan('cutShort', { name: S.itemWord(l, R) });
        plan.touched.add(l.id);
        plan.pre.push(async () => {
          const t0 = FM.time; FM.time = a;
          try { await FM.splitLayer(l.id); } finally { FM.time = t0; }
          const B = FM.scene.layers.find(x => x !== l && x.splitOf && x.splitOf === l.splitOf && Math.abs((+x.start || 0) - a) < 1e-6);
          if (!B) throw new Error('the cut item did not split');
          const r = FM.trimClipEdge(B, 'head', len, srcDurOf(B));
          B.duration = r.duration; B.trimStart = r.trimStart; FM.shiftLayerFxClock(B, r.fxShift);
          S.setFlag(B, 'stay', true); S.setFlag(l, 'stay', true);
        });
      }
      plan.resized.add(l.id);
      plan.counts.cut = (plan.counts.cut || 0) + 1;
    }
    const prevEnd = p ? p.end : null;
    const landFirst = !!(p && (isFloatJoin(R, i) || plan.counts.fade));
    const rp = ripple(plan, R, i + 1, dt, new Set([c.id]), prevEnd, landFirst);
    /* the new main-track end: the last clip moved by the ripple, or (c last) the clip before it, or c's start when c was alone */
    const lastClipIdx = (() => { for (let k = R.main.length - 1; k >= 0; k--) if (!R.main[k].slot && k !== i) return k; return -1; })();
    const newEnd = lastClipIdx > i ? R.main[lastClipIdx].end + (rp.last == null ? dt : rp.last) : (lastClipIdx >= 0 ? R.main[lastClipIdx].end : a);
    tailMove(plan, R, newEnd, map);
    const cb = couplingBlock(plan, R, map); if (cb) return refusePlan(cb.kind, cb);
    plan.time = n ? a : Math.max(0, newEnd);
    plan.selectNone = true;
    const nf = plan.counts.followers;
    plan.say = nf ? line('deletedWith', nf) : null;
    plan.live = nf ? null : line('deleted');
    if (plan.counts.cut) plan.say = (plan.say || line('deleted')) + ' · ' + line('keptRunsOn', plan.counts.cut);
    if (plan.counts.fade) plan.say = (plan.say || line('deleted')) + ' · ' + line('fadeWent');
    plan.sayUndo = !!plan.say;
    return plan;
  };

  /* TRIM THE TAIL of a main clip to newDur (D, the Length row). Things on the part cut away slide back onto the clip (D6). */
  S.planTrimTail = function (R, id, newDur, o) {
    o = o || {};
    const map = byIdMap(), i = mainIdx(R, id);
    if (i < 0) return refusePlan('gone');
    const c = R.main[i], n = R.main[i + 1] || null, L = map.get(c.id), ml = MINLEN();
    const d0 = +L.duration || 0;
    if (newDur < d0 - 1e-9 && d0 < ml - SLACK) return refusePlan('alreadyShort');
    if (newDur < ml - SLACK) return refusePlan(o.key ? 'trimEdge' : 'alreadyShort');
    if (n && n.seam && n.seam.kind === 'blend') {
      if (newDur < 2 * n.seam.amt - SLACK) return refusePlan('fadesNext');
      if (blendOwner(c, n, map) === L) return refusePlan('fadeOwned', { a: S.itemWord(L, R), b: S.itemWord(map.get(n.id), R) });
    }
    const r = FM.trimClipEdge(L, 'tail', newDur - d0, srcDurOf(L));
    if (o.typed && Math.abs(r.duration - newDur) > 1 / fps()) return refusePlan(newDur > d0 ? 'shortSource' : 'nothingMore');
    const dt = r.duration - d0;
    if (Math.abs(dt) < 1e-9) return refusePlan(newDur > d0 ? 'shortSource' : 'nothingMore');
    const rb = riderBlock(R, c.start + Math.min(d0, r.duration), map); if (rb) return refusePlan(rb.kind, rb);
    const plan = newPlan('Trim clip'); plan.touched.add(c.id);
    const twins = twinsOf(R, c, map), twinIds = new Set(twins.map(t => t.id));
    plan.writes.push(() => {
      [L].concat(twins).forEach(x => { x.duration = r.duration; if (x.type === 'video') x.trimStart = r.trimStart; });
    });
    twins.forEach(t => plan.touched.add(t.id));
    const newEnd = c.start + r.duration;
    (R.followers[c.id] || []).forEach(fid => {
      if (twinIds.has(fid)) return;
      const f = map.get(fid), u = R.units[fid]; if (!f) return;
      const fs = +f.start || 0, fd = +f.duration || 0;
      if (dt < 0 && fs >= newEnd - R.eps) {                       // D6: its first frame is cut away — back onto the clip
        const s2 = Math.max(c.start, newEnd - fd);
        addLand(plan, fid, s2);
        if (u && u.kind === 'effect' && fs + fd <= c.end + 1e-9) plan.writes.push(() => { f.duration = Math.max(ml, Math.min(fd, newEnd - s2)); });
      } else if (dt < 0 && u && u.kind === 'effect' && fs + fd <= c.end + 1e-9 && fs + fd > newEnd + 1e-9) {
        plan.touched.add(fid); plan.writes.push(() => { f.duration = Math.max(ml, newEnd - fs); });   // §4.3: stays inside its clip
      }
    });
    const rp = ripple(plan, R, i + 1, dt, new Set([c.id].concat(twins.map(t => t.id))), newEnd, false);
    tailMove(plan, R, R.trackEnd + (rp.last == null ? dt : rp.last), map);
    const cb = couplingBlock(plan, R, map); if (cb) return refusePlan(cb.kind, cb);
    plan.live = line('trimmed', S.itemWord(L, R));
    plan.pulse = [c.id];
    return plan;
  };

  /* TRIM THE HEAD of a main clip by h (A; + cuts in, − extends back). The clip keeps its slot: its start never moves, its
     footage does (keys −L, effect clock +L), and things on it stay on the same footage frame, clamped at its start. */
  S.planTrimHead = function (R, id, h, o) {
    o = o || {};
    const map = byIdMap(), i = mainIdx(R, id);
    if (i < 0) return refusePlan('gone');
    const c = R.main[i], p = R.main[i - 1] || null, L = map.get(c.id), ml = MINLEN();
    const d0 = +L.duration || 0;
    if (h > 0 && d0 < ml - SLACK) return refusePlan('alreadyShort');
    if (d0 - h < ml - SLACK) return refusePlan(o.key ? 'trimEdge' : 'alreadyShort');
    if (p && c.seam && c.seam.kind === 'blend') {
      if (d0 - h < 2 * c.seam.amt - SLACK) return refusePlan('fadesBefore');
      if (blendOwner(p, c, map) === L) return refusePlan('fadeOwned', { a: S.itemWord(map.get(p.id), R), b: S.itemWord(L, R) });
    }
    const r = FM.trimClipEdge(L, 'head', h, srcDurOf(L));
    const Lnd = r.landed;
    if (o.typed && Math.abs(Lnd - h) > 1 / fps()) return refusePlan(h < 0 ? 'videoStart' : 'nothingMore');
    if (Math.abs(Lnd) < 1e-9) return refusePlan(h < 0 ? 'videoStart' : 'nothingMore');
    const rb = riderBlock(R, c.start, map); if (rb) return refusePlan(rb.kind, rb);
    const plan = newPlan('Trim clip'); plan.touched.add(c.id);
    const twins = twinsOf(R, c, map), twinIds = new Set(twins.map(t => t.id));
    plan.writes.push(() => {
      [L].concat(twins).forEach(x => {
        x.duration = r.duration; if (x.type === 'video') x.trimStart = r.trimStart;
        FM.shiftLayerFxClock(x, r.fxShift); S.shiftKeys(x, -Lnd);
      });
    });
    twins.forEach(t => plan.touched.add(t.id));
    const newEnd = c.start + r.duration;
    (R.followers[c.id] || []).forEach(fid => {
      if (twinIds.has(fid)) return;
      const f = map.get(fid), u = R.units[fid]; if (!f) return;
      const fs = +f.start || 0, fd = +f.duration || 0;
      const s2 = Math.max(c.start, fs - Lnd);
      addLand(plan, fid, s2);
      if (u && u.kind === 'effect' && fs + fd <= c.end + 1e-9 && s2 + fd > newEnd + 1e-9) plan.writes.push(() => { f.duration = Math.max(ml, newEnd - s2); });
    });
    const rp = ripple(plan, R, i + 1, -Lnd, new Set([c.id].concat(twins.map(t => t.id))), newEnd, false);
    tailMove(plan, R, R.trackEnd + (rp.last == null ? -Lnd : rp.last), map);
    const cb = couplingBlock(plan, R, map); if (cb) return refusePlan(cb.kind, cb);
    plan.time = c.start;
    plan.live = line('trimmed', S.itemWord(L, R));
    plan.pulse = [c.id];
    return plan;
  };

  /* SPLIT at the playhead (✂, S). Not arranging: nothing else moves, so it works with a friend in (the lease is checked).
     Full's own split guard is not changed (§0.4 B1): MIN_LEN is enforced here. A sound twin splits at the same time. */
  S.planSplit = function (R, id, t) {
    const map = byIdMap(), L = map.get(id);
    if (!L) return refusePlan('gone');
    const u = R.units[id];
    if ((u && u.kind === 'block') || ['video', 'image', 'text', 'shape'].indexOf(L.type) < 0) return refusePlan('splitBlock');
    t = FM.snapFrame ? FM.snapFrame(t) : t;
    const s = +L.start || 0, e = s + (+L.duration || 0), ml = MINLEN();
    if (t < s || t >= e) return refusePlan('splitOff');
    if (t - s < ml - SLACK || e - t < ml - SLACK) return refusePlan('splitEdge');
    for (let k = 1; k < R.main.length; k++) {
      const sm = R.main[k].seam;
      if (!sm || (sm.kind !== 'blend' && sm.kind !== 'overlap')) continue;
      const lo = R.main[k].start, hi = R.main[k - 1].end;
      if (t >= lo - R.eps && t <= hi + R.eps) return refusePlan('splitFade');
    }
    const i = mainIdx(R, id);
    if (i >= 0) {
      const nb = R.main[i + 1], pb = R.main[i - 1];
      if (nb && nb.seam && nb.seam.kind === 'blend' && e - t < 2 * nb.seam.amt - SLACK) return refusePlan('splitFade');
      if (pb && R.main[i].seam && R.main[i].seam.kind === 'blend' && t - s < 2 * R.main[i].seam.amt - SLACK) return refusePlan('splitFade');
    }
    const plan = newPlan('Split'); plan.arranges = false; plan.adopts = false;
    const twins = i >= 0 ? twinsOf(R, R.main[i], map) : [];
    plan.touched.add(id); twins.forEach(x => plan.touched.add(x.id));
    plan.pre.push(async () => {
      const t0 = FM.time;
      const halves = [];
      for (const x of [L].concat(twins)) {
        FM.time = t;
        try { await FM.splitLayer(x.id); } finally { FM.time = t0; }
        const B = FM.scene.layers.find(y => y !== x && y.splitOf && y.splitOf === x.splitOf && Math.abs((+y.start || 0) - t) < 1e-6);
        if (!B) throw new Error('split did not happen');
        halves.push(B);
        if (x.sm && x.sm.tail) S.setFlag(x, 'tail', false);   // only the later piece can end with the video (§4.5)
      }
      const B0 = halves[0];
      halves.slice(1).forEach(Bt => { if (Bt.karaokeOf === L.id) Bt.karaokeOf = B0.id; });
      plan.selectId = B0.id;
    });
    plan.live = line('split');
    return plan;
  };

  /* CLOSE A GAP or FIX AN OVERLAP: tap its chip. Everything from that clip on moves by the gap, landing the seam shut. */
  S.planSeam = function (R, entryId) {
    const map = byIdMap(), j = R.main.findIndex(e => e.id === entryId);
    if (j < 0) return refusePlan('gone');
    const e = R.main[j], sm = e.seam;
    if (!sm || (sm.kind !== 'gap' && sm.kind !== 'overlap') || sm.covered) return refusePlan('noSeam');
    const dt = sm.kind === 'gap' ? -sm.amt : sm.amt;
    const prevEnd = j > 0 ? R.main[j - 1].end : 0;
    const rb = riderBlock(R, Math.min(e.start, prevEnd), map); if (rb) return refusePlan(rb.kind, rb);
    const plan = newPlan(sm.kind === 'gap' ? 'Close gap' : 'Fix overlap');
    const rp = ripple(plan, R, j, dt, new Set(), prevEnd, true);
    tailMove(plan, R, R.trackEnd + (rp.last == null ? dt : rp.last), map);
    const cb = couplingBlock(plan, R, map); if (cb) return refusePlan(cb.kind, cb);
    const t = FM.time || 0, lo = Math.min(prevEnd, e.start), hi = Math.max(prevEnd, e.start);
    if (t > lo && t < hi) plan.time = prevEnd;
    plan.live = line(sm.kind === 'gap' ? 'gapClosed' : 'overlapFixed');
    return plan;
  };

  /* DUPLICATE a main clip: the copy lands right after it on the clip row, everything after moves along. Things on the
     clip are not copied (as the phone editors do); its sound twin is. */
  S.planDuplicate = function (R, id) {
    const map = byIdMap(), i = mainIdx(R, id);
    if (i < 0) return refusePlan('gone');
    const c = R.main[i], p = R.main[i - 1] || null, n = R.main[i + 1] || null, L = map.get(c.id);
    if (L.type === 'group') return refusePlan('splitBlock');
    if ((n && n.seam && n.seam.kind === 'blend' && blendOwner(c, n, map) === L) || (p && c.seam && c.seam.kind === 'blend' && blendOwner(p, c, map) === L))
      return refusePlan('fadeOwned', { a: S.itemWord(L, R), b: S.itemWord(map.get((n || p).id), R) });
    const len = +L.duration || 0, target = (+L.start || 0) + len;
    const rb = riderBlock(R, target, map); if (rb) return refusePlan(rb.kind, rb);
    const plan = newPlan('Duplicate clip'); plan.touched.add(c.id);
    const twins = twinsOf(R, c, map);
    plan.pre.push(async () => {
      const dupId = await FM.duplicateLayer(L.id, false, { noSave: true });
      const dup = dupId && FM.layerById(FM.scene, dupId);
      if (!dup) throw new Error('duplicate refused');
      S.setFlag(dup, 'main', true);                         // put back after onCopy stripped it: the one route that does (§12.2)
      const d = target - (+dup.start || 0); dup.start = target; S.shiftKeys(dup, d);
      for (const t of twins) {
        const tid = await FM.duplicateLayer(t.id, true, { noSave: true });
        const td = tid && FM.layerById(FM.scene, tid);
        if (!td) continue;
        const dd = target - (+td.start || 0); td.start = target; S.shiftKeys(td, dd);
        if (td.karaokeOf === L.id) td.karaokeOf = dupId;
      }
      plan.selectId = dupId;
    });
    const rp = ripple(plan, R, i + 1, len, new Set(), target + len, false);
    tailMove(plan, R, R.trackEnd + (rp.last == null ? len : rp.last), map);
    const cb = couplingBlock(plan, R, map); if (cb) return refusePlan(cb.kind, cb);
    plan.time = target;
    plan.live = line('duplicated');
    return plan;
  };

  /* ───────────────────────────── applying a plan ───────────────────────────── */
  function removeLayers(ids) {
    ids.forEach(id => { try { if (FM.cancelGesturesOn) FM.cancelGesturesOn(id); } catch (e) {} try { if (FM.teardownLayerPlayback) FM.teardownLayerPlayback(id); } catch (e) {} });
    FM.scene.layers = FM.scene.layers.filter(l => !ids.has(l.id));
    if (FM.restartAudioIfPlaying) FM.restartAudioIfPlaying();
  }
  S._applyPlan = function (plan) { return applyPlan(plan); };   // suite seam (T2b): a plan applied to a scene on its own
  async function applyPlan(plan) {
    for (const op of plan.pre) await op(plan);
    const map = byIdMap();
    plan.writes.forEach(w => w(map));
    const done = new Set();
    new Set([...plan.moves.keys(), ...plan.lands.keys()]).forEach(id => {
      if (plan.removes.has(id)) return;
      const head = map.get(id); if (!head) return;
      const land = plan.lands.has(id) ? plan.lands.get(id) : null;
      const d = land != null ? land - (+head.start || 0) : plan.moves.get(id);
      if (!d && land == null) return;
      unitLayers(id, map).forEach(l => {
        if (done.has(l.id)) return; done.add(l.id);
        if (l === head && land != null) l.start = land; else l.start = (+l.start || 0) + d;
        if (d && !plan.keyless.has(l.id)) S.shiftKeys(l, d);
      });
    });
    if (plan.removes.size) removeLayers(plan.removes);
    plan.post.forEach(f => f(map));
  }

  /* ═══ beginEdit / restorePreEdit (§3.7). A JSON copy of the document, then mute; a refusal after apply puts it back. */
  function beginEdit() {
    const pre = JSON.stringify({ project: FM.scene.project, layers: FM.scene.layers }, FM.jsonReplacer);
    FM.history.mute();
    return pre;
  }
  function restorePreEdit(pre) {
    const s = JSON.parse(pre), was = FM.scene.selectedId;
    FM.scene.project = s.project; FM.scene.layers = s.layers;
    if (FM.history._afterExternalChange) FM.history._afterExternalChange(was, { pause: false });
    FM.refreshAll();
    if (FM.storage && FM.storage.autosave) FM.storage.autosave();
  }

  /* ═══ THE GATES (§3.7, §10.2). D14, first half: looks, text, captions and sound work with a friend in; anything that
     moves clips waits while someone else who can edit is in the session (on a guest, always; on a linked copy, too). */
  S.roReason = function () {
    const C = FM.collab;
    if (!C || !C.readOnly || !C.readOnly()) return '';
    const r = C.myRole ? C.myRole() : '';
    return r === 'viewer' ? 'view' : r === 'commenter' ? 'comment' : 'outbox';
  };
  S.arrangeGate = function () {
    const C = FM.collab;
    if (!C || !C.othersCanEdit || !C.othersCanEdit()) return '';
    const s = C.session;
    if (!s || !C.active) return 'offline';                 // a linked copy with no session yet
    if (s.online === false) return 'offline';
    return 'live';
  };
  S.newerSchema = function () { const P = FM.scene && FM.scene.project; return !!(P && P.sm && typeof P.sm.v === 'number' && P.sm.v > FM.SM_V); };
  S.blockers = function (plan) {
    const PZ = FM.collab && FM.collab.presence;
    if (!PZ || !PZ.heldByOther || !(FM.collab.active)) return null;
    const ids = Array.from(plan.touched);
    for (let k = 0; k < ids.length; k++) { const h = PZ.heldByOther(ids[k]); if (h) return { id: ids[k], name: (PZ.holderName && PZ.holderName(ids[k])) || '' }; }
    return null;
  };
  function lockedOf(plan, map) {
    const out = [];
    plan.touched.forEach(id => { if (unitLayers(id, map).some(l => l.locked)) out.push(id); });
    return out;
  }

  /* ═══ WHERE SIMPLE SPEAKS (§3.11, §3.12): every refusal has a line; buttons only where there is something to do. */
  function lockedLine(ids, R, map) {
    if (ids.length > 1) return R && ids.every(id => R.isMain(id)) ? line('lockedClips', ids.length) : line('lockedItems', ids.length);
    const id = ids[0], u = R && R.units[id], l = map.get(id);
    if (R && R.isMain(id)) return line('lockedClip');
    if (u && u.kind === 'audio') return u.long ? line('lockedMusic') : line('lockedSound');
    if (u && (u.kind === 'text' || u.kind === 'captions')) return line('lockedText');
    if (u && u.kind === 'block') return line('lockedBlock');
    return l ? line('lockedClip') : line('lockedItems', 1);
  }
  function refuse(kind, o, R) {
    o = o || {};
    const full = { label: line('openFull'), fn: () => { if (FM.editor && FM.editor.request) FM.editor.request('full'); } };
    let text = '', buttons = [];
    switch (kind) {
      case 'locked': text = lockedLine(o.ids || [], R, byIdMap()); if (o.retry) buttons = [{ label: line('doAnyway'), fn: o.retry }]; break;
      case 'live': {
        const C = FM.collab, s = C && C.session;
        if (s && !s.isOwner) { text = line('liveGuest'); buttons = [full]; break; }
        const H = s && s.host, eds = H && H.members ? Object.keys(H.members).filter(m => m !== H.ownerMid && H.members[m] && H.members[m].role === 'editor') : [];
        text = eds.length === 1 ? line('liveOwner1', S.nameWord(H.members[eds[0]].name)) : line('liveOwnerN', Math.max(2, eds.length));
        buttons = [full]; break;
      }
      case 'offline': text = (FM.collab && FM.collab.isLinkedCopy && FM.collab.isLinkedCopy()) ? line('offlineCopy') : line('offlineOwner'); break;
      case 'view': text = line('view'); break;
      case 'comment': text = line('comment'); break;
      case 'outbox': text = line('outbox'); break;
      case 'newer': text = line('newer'); break;
      case 'waiting': text = line('waiting'); break;
      case 'busy': text = line('busy', o.name ? S.nameWord(o.name) : '', o.id ? S.itemWord(byIdMap().get(o.id), R) : ''); break;
      case 'attached': text = line('attached', o.a, o.b); buttons = [full]; break;
      case 'slip': text = line('slip', o.via); buttons = [full]; break;
      case 'riders': text = line('ridersNext'); buttons = [full]; break;
      case 'camera': text = line('cameraNext'); buttons = [full]; break;
      case 'cutKeys': text = line('cutKeysNext', o.name); buttons = [full]; break;
      case 'fadeOwned': text = line('fadeOwned', o.a, o.b); buttons = [full]; break;
      case 'cutShort': text = line('cutShort', o.name); buttons = [full]; break;
      default: text = line(kind) || line('failed');
        if (kind === 'splitBlock') buttons = [full];
    }
    S.say(text, { buttons: buttons, refusal: kind, ids: o.ids });
    S.lastRefusal = kind;
    return false;
  }
  S.nameWord = function (name) { const n = String(name || '').trim(); return n.length > 10 ? n.slice(0, 10) + '…' : (n || line('someone')); };
  S._refuse = refuse;

  /* ═══ THE RUNNER (§3.7): one edit = one undo step = one collab transaction. Single flight, then a FIFO of four that
     stores each tap's intent; never coalesced. */
  S.running = false;
  S.queue = [];
  const seq = () => (FM.history && FM.history._commitSeq) ? FM.history._commitSeq() : 0;
  S.queueStep = function (kind) {
    if (S.queue.length >= 4) { S.say(line('wait')); return false; }
    /* stamped with the commits it will legitimately wait behind: the running command's, plus one per edit already queued
       ahead of it, so [Split, Delete, ⌘Z] undoes the Delete (DESIGN §3.7) and only an unrelated commit makes it stale */
    S.queue.push({ kind: kind, seq: seq() + S.queue.filter(q => q.kind === 'edit').length });
    return false;
  };
  S.drain = function () {
    while (S.queue.length && !S.running) {
      if (FM.history && FM.history.isMuted && FM.history.isMuted()) return;
      if (FM.jobDepth && FM.jobDepth() > 0) { setTimeout(S.drain, 30); return; }
      const e = S.queue.shift();
      if (e.kind !== 'edit' && seq() - e.seq > 1) { S.say(line('skipped')); continue; }   // an edit is an intent, re-planned now (§3.7)
      if (e.kind === 'edit') { S.edit.apply(null, e.args); return; }
      if (e.kind === 'undo') FM.history.undo(); else if (e.kind === 'redo') FM.history.redo();
    }
  };
  S.edit = async function (label, makePlan, opts) {
    opts = opts || {};
    if (S.running) {
      if (S.queue.length < 4) S.queue.push({ kind: 'edit', args: [label, makePlan, opts], seq: seq() });
      else S.say(line('wait'));
      return false;
    }
    S.running = true; document.body.classList.add('sm-running');
    let muted = false;
    try {
      const ro = S.roReason(); if (ro) return refuse(ro);
      if (S.newerSchema()) return refuse('newer');
      const R = S.classify(FM.scene);                                    // uncached (§2.5)
      const plan = makePlan(R);
      if (!plan) return false;
      if (plan.refuse) return refuse(plan.refuse, plan.refuseOpts, R);
      const gated = !!(plan.arranges || (plan.adopts && !R.adopted));
      if (gated) { const g = S.arrangeGate(); if (g) return refuse(g, {}, R); }
      if (gated && R.anomalies.some(a => a.kind === 'undecided')) return refuse('waiting', {}, R);
      const map = byIdMap();
      const lk = lockedOf(plan, map);
      if (lk.length && !opts.unlock) return refuse('locked', { ids: lk, retry: () => S.edit(label, makePlan, Object.assign({}, opts, { unlock: true })) }, R);
      const b = S.blockers(plan); if (b) return refuse('busy', b, R);
      if (FM.flushPendingCommit) FM.flushPendingCommit();
      if (FM.textEdit && FM.textEdit.flush) FM.textEdit.flush();
      if (FM.playing && FM.pause) FM.pause();
      const pre = beginEdit(); muted = true;
      const sel0 = FM.scene.selectedId;
      let ok = false, notes = [];
      try {
        if (opts.unlock) lk.forEach(id => unitLayers(id, map).forEach(l => { if (l.locked) { l.locked = false; l._smRelock = true; } }));
        if (!R.adopted && plan.adopts) S.adopt(R);
        if (gated) S.pinStrays(R);
        await applyPlan(plan);
        const R2 = S.classify(FM.scene);
        if (gated) { notes = S.fitTails(R2, plan); pinTailsAfter(R2); refitTransparentGroups(R2); }
        markCuts(plan.touched);
        FM.scene.layers.forEach(l => { if (l._smRelock) { l.locked = true; delete l._smRelock; } });
        ok = true;
      } catch (e) {
        if (FM.reportError) { try { FM.reportError('Simple edit failed: ' + label, e); } catch (x) {} }
      } finally { FM.history.unmute(); muted = false; }
      if (!ok) { FM.scene.layers.forEach(l => { delete l._smRelock; }); restorePreEdit(pre); return refuse('failed'); }
      if (plan.selectNone) { FM.scene.selectedId = null; FM.scene.selectedIds = []; }
      else if (plan.selectId && FM.layerById(FM.scene, plan.selectId)) { FM.scene.selectedId = plan.selectId; FM.scene.selectedIds = [plan.selectId]; }
      else if (sel0 && FM.layerById(FM.scene, sel0)) { FM.scene.selectedId = sel0; FM.scene.selectedIds = [sel0]; }
      FM.refreshAll();
      if (plan.time != null && !FM.playing) { const P = FM.scene.project; FM.time = Math.max(0, Math.min(P.duration || 0, plan.time)); if (FM.seekVideosToTime) FM.seekVideosToTime(); if (FM.timeline && FM.timeline.updatePlayhead) FM.timeline.updatePlayhead(); }
      FM.history.commit({ label: label, ed: 's', arr: gated });
      if (FM.textEdit && FM.textEdit.resync) FM.textEdit.resync();
      speakDone(plan, notes);
      return true;
    } finally {
      if (muted) FM.history.unmute();
      S.running = false; document.body.classList.remove('sm-running');
      S.drain();
    }
  };
  /* §4.3: a unit pinned in this step whose span now ends at the new track end follows it from here on (pictures only). */
  function pinTailsAfter(R2) {
    const map = byIdMap();
    (S._pinnedNow || []).forEach(id => {
      const l = map.get(id), u = R2.units[id];
      if (!l || !(l.sm && l.sm.stay) || l.sm.tail || !tailOk(l, u)) return;
      if (Math.abs((+l.start || 0) + (+l.duration || 0) - R2.trackEnd) <= R2.eps) setTail(l, R2.trackEnd);
    });
    S._pinnedNow = [];
  }
  function speakDone(plan, notes) {
    let text = plan.say, live = plan.live;
    if (notes && notes.length) text = (text || live || '') + ' · ' + notes.join(' · ');
    if (text) S.say(text, { buttons: plan.sayUndo ? [{ label: line('undo'), fn: () => FM.history.undo() }] : [] });
    else if (live) S.say(live, { live: true, pulse: plan.pulse });
  }

  /* ═══ TAP-TIME INTENTS: the target and the playhead are read when the key or button is pressed, never at run time. */
  S.cmd = {
    del(id) { return S.edit('Delete clip', R => S.planDelete(R, id)); },
    trimTail(id, t, o) { t = t == null ? FM.time : t; return S.edit('Trim clip', R => { const L = FM.layerById(FM.scene, id); return L ? S.planTrimTail(R, id, t - (+L.start || 0), o || { key: true }) : refusePlan('gone'); }); },
    trimHead(id, t, o) { t = t == null ? FM.time : t; return S.edit('Trim clip', R => { const L = FM.layerById(FM.scene, id); return L ? S.planTrimHead(R, id, t - (+L.start || 0), o || { key: true }) : refusePlan('gone'); }); },
    split(id, t) { t = t == null ? FM.time : t; return S.edit('Split', R => { const target = id || (S.mainAtTime(R, t) || {}).id; return target ? S.planSplit(R, target, t) : refusePlan('noClipHere'); }); },
    closeSeam(entryId) { return S.edit('Close gap', R => S.planSeam(R, entryId)); },
    duplicate(id) { return S.edit('Duplicate clip', R => S.planDuplicate(R, id)); }
  };
  S.undoGate = function () { return S.arrangeGate(); };
  /* runStep's refusal of an arranging step while someone else can edit (§10.2 door 2). In Simple it is the gate's line;
     in Full it is Full's existing undo-refusal toast, word for word (§0.4 N4): no new words in Full. */
  S.undoRefused = function (why) {
    if (FM.editor && FM.editor.isSimple && FM.editor.isSimple()) refuse(why || 'live');
    else if (FM.toast) FM.toast("Can't undo — it has changed since");
  };
})(window.FM);
```

### 3.3 Changes to existing files (apply in this order; each Find is found exactly once)

#### 2.1.1 `js/spine-words.js`

Find (exactly once):

```js
    lines: {
      openFull: 'Open in Full',
      deleteNext: 'Deleting clips comes next',
      gapNext: 'Closing gaps comes in the next update',
      splitNext: 'Splitting comes in the next update',
      dupNext: 'Duplicating clips comes next',
      newer: 'Made with a newer FreeMotion. Update to edit clips here',
```

Replace with:

```js
    lines: {   // Phase 2 (BUILD-PLAN-PHASE2.md): the Phase 1 "comes next" lines are gone with the commands they stood in for
      openFull: 'Open in Full', undo: 'Undo', doAnyway: 'Do it anyway', someone: 'Someone else',
      deleted: 'Deleted clip',
      deletedWith: n => 'Deleted clip and ' + n + (n === 1 ? ' thing on it' : ' things on it'),
      keptRunsOn: n => 'kept ' + n + (n === 1 ? ' item that runs on' : ' items that run on') + ', trimmed to match',
      fadeWent: 'the fade went with it',
      trimmed: name => 'Trimmed ' + name, split: 'Split', duplicated: 'Duplicated clip',
      gapClosed: 'Gap closed', overlapFixed: 'Overlap fixed',
      keepsLength: name => name + ' keeps the length you gave it',
      wait: 'One moment — still finishing the last edit.',
      skipped: 'Undo skipped — something else changed first',
      lockedClip: 'That clip is locked', lockedMusic: 'The music is locked', lockedSound: 'That sound is locked',
      lockedText: 'That text is locked', lockedBlock: 'That block is locked',
      lockedClips: n => n + ' clips are locked', lockedItems: n => n + ' items are locked',
      liveOwner1: name => name + ' can edit · clips stay put', liveOwnerN: n => n + ' others edit · clips stay put',
      liveGuest: 'Clips stay put while you both edit',
      offlineOwner: 'You’re offline · text, captions and looks still work', offlineCopy: 'Offline · text and looks still work',
      view: 'View only', comment: 'You can comment here', outbox: 'Too many offline changes',
      waiting: 'Waiting for clips to arrive',
      busy: (name, item) => name + ' is editing ' + (item || 'that clip') + ' · try again soon',
      attached: (a, b) => a + ' is attached to ' + b,
      slip: via => '1 ' + ({ parent: 'parent', follow: 'follow', matte: 'matte', twin: 'sound' }[via] || 'link') + ' will slip',
      ridersNext: 'Captions here move with clips in the next update',
      cameraNext: 'The camera move here comes along in the next update',
      cutKeysNext: name => name + ' has moves · trims around it come next',
      fadeOwned: (a, b) => a + ' and ' + b + ' fade into each other',
      cutShort: name => name + ' would be too short',
      splitBlock: 'Open in Full to split this', splitOff: 'Move the playhead onto the clip to split',
      splitEdge: 'Too close to the edge of the clip. Trim instead?', splitFade: 'Move the playhead out of the crossfade to split it',
      trimEdge: 'Too close to the edge of the clip',
      nothingMore: 'Nothing more to trim', videoStart: 'That’s the start of the video', shortSource: 'Not enough footage',
      fadesNext: 'That clip fades into the next one', fadesBefore: 'That clip fades into the one before',
      alreadyShort: 'This clip is already as short as it can go',
      noClipHere: 'No clip at the playhead', gone: 'That clip was just deleted', noSeam: 'Nothing to close here',
      deleteOne: 'Delete one clip at a time', failed: 'That didn’t work, so nothing changed',
      newer: 'Made with a newer FreeMotion. Update to edit clips here',
```

#### 2.1.2 `js/spine.js`

Find (exactly once):

```js
  const FLAGS = ['main', 'stay', 'tail', 'twin', 'muteByMode', 'unit'];
  S.setFlag = function (layer, key, on) {
    if (!layer || FLAGS.indexOf(key) < 0) return false;
```

Replace with:

```js
  /* Phase 2 adds `cut` (the de-click mark, §12.1) and `snd` (Simple's own sound-only fact, §0.4 B8). The sanitiser keeps both
     as plain unknown keys (`true` is plain), so its output does not change and no SCHEMA_REV bump is needed for them. */
  const FLAGS = ['main', 'stay', 'tail', 'twin', 'muteByMode', 'unit', 'cut', 'snd'];
  S.setFlag = function (layer, key, on) {
    if (!layer || FLAGS.indexOf(key) < 0) return false;
    /* D17 B (his pick): a sound never ends with the video — music, a voice-over, a recording run on in black as in Full */
    if (on && key === 'tail' && (layer.audioOnly === true || (layer.sm && layer.sm.snd === true))) return false;
```

#### 2.1.3 `js/simple-timeline.js`

Find (exactly once):

```js
  let sayT = 0;
  function wireSay() {
    if (!sayEl || sayEl._wired) return;
    sayEl._wired = true;
    document.addEventListener('pointerdown', e => { if (sayEl.textContent && !sayEl.contains(e.target)) clearSay(); }, true);
  }
```

Replace with:

```js
  let sayT = 0, ptrDown = false;
  function wireSay() {
    if (!sayEl || sayEl._wired) return;
    sayEl._wired = true;
    document.addEventListener('pointerdown', e => { ptrDown = true; if (sayEl.textContent && !sayEl.contains(e.target)) clearSay(); }, true);
    document.addEventListener('pointerup', () => { ptrDown = false; }, true);
    document.addEventListener('pointercancel', () => { ptrDown = false; }, true);
  }
```

#### 2.1.4 `js/simple-timeline.js`

Find (exactly once):

```js
  function armClear() {
    clearTimeout(sayT);
    sayT = setTimeout(function again() {
      if (sayEl && (sayEl.matches(':hover') || sayEl.contains(document.activeElement))) { sayT = setTimeout(again, 1000); return; }
      clearSay();
    }, 10000);
  }
  function sayLine(text, opts) {
    if (!sayEl) return;
    sayEl.textContent = '';
    sayEl.appendChild(el('span', 'sm-say-t', text));
    if (opts && opts.full) {
      const b = el('button', 'sm-say-b', (W().lines || {}).openFull || 'Open in Full');
      b.type = 'button';
      b.addEventListener('click', () => { clearSay(); if (FM.editor) FM.editor.set('full'); });
      sayEl.appendChild(b);
    }
    if (liveEl) liveEl.textContent = text;
    armClear();
  }
```

Replace with:

```js
  function armClear(ms) {
    clearTimeout(sayT);
    sayT = setTimeout(function again() {
      if (sayEl && (sayEl.matches(':hover') || sayEl.contains(document.activeElement))) { sayT = setTimeout(again, 1000); return; }
      clearSay();
    }, ms || 10000);
  }
  /* A pulse on the clip a button-less line is about (§3.12 rule 1a): the line itself goes to #sm-live only, so the tool
     that was pressed keeps its place and its focus. */
  function pulse(ids) {
    (ids || []).forEach(id => {
      const n = root && root.querySelector('.sm-item[data-id="' + (window.CSS && CSS.escape ? CSS.escape(id) : id) + '"]');
      if (!n) return;
      n.classList.remove('sm-pulse'); void n.offsetWidth; n.classList.add('sm-pulse');
      setTimeout(() => n.classList.remove('sm-pulse'), 700);
    });
  }
  /* THE LINE (§3.12). opts.live: screen readers and a pulse only, the row is not taken. Otherwise the row shows the text
     and at most two real buttons, which ignore every press until 400 ms have passed AND the press that raised the line
     has been let go (rule 5), reading aria-disabled meanwhile; a line with buttons stays 10 s, one without 4 s. */
  function sayLine(text, opts) {
    opts = opts || {};
    if (opts.live) { if (liveEl) liveEl.textContent = text; pulse(opts.pulse); return; }
    if (!sayEl) return;
    sayEl.textContent = '';
    const tx = el('span', 'sm-say-t', text); tx.title = text; sayEl.appendChild(tx);
    const btns = (opts.buttons || []).slice(0, 2);
    if (opts.full && !btns.length) btns.push({ label: (W().lines || {}).openFull || 'Open in Full', fn: () => { if (FM.editor) FM.editor.request('full'); } });
    const t0 = performance.now(); let up = !ptrDown;
    if (!up) document.addEventListener('pointerup', () => { up = true; }, { once: true, capture: true });
    const armed = () => up && performance.now() - t0 >= 400;
    btns.forEach(bd => {
      const b = el('button', 'sm-say-b', bd.label); b.type = 'button'; b.setAttribute('aria-disabled', 'true');
      b.addEventListener('pointerdown', ev => { if (!armed()) { ev.preventDefault(); ev.stopPropagation(); } });
      b.addEventListener('click', ev => { ev.stopPropagation(); if (!armed()) { ev.preventDefault(); return; } clearSay(); try { bd.fn(); } catch (e) {} });
      sayEl.appendChild(b);
    });
    sayEl.classList.toggle('sm-say-has-b', btns.length > 0);
    if (btns.length) setTimeout(function arm() { if (!sayEl.isConnected || !sayEl.querySelector('.sm-say-b')) return; if (!armed()) { setTimeout(arm, 60); return; } sayEl.querySelectorAll('.sm-say-b').forEach(b => b.setAttribute('aria-disabled', 'false')); }, 400);
    if (liveEl) liveEl.textContent = text;
    armClear(btns.length ? 10000 : 4000);
  }
```

#### 2.1.5 `js/simple-timeline.js`

Find (exactly once):

```js
        chip.addEventListener('click', ev => { ev.stopPropagation(); FM.spine.say('gapNext', { full: true }); });
```

Replace with:

```js
        chip.addEventListener('click', ev => { ev.stopPropagation(); if (FM.spine.cmd) FM.spine.cmd.closeSeam(e.id); });   // Phase 2: Close gap / Fix
```

#### 2.1.6 `js/editor-mode.js`

Find (exactly once):

```js
    onKey(e) {
      if (mode !== 'simple' || e.altKey) return false;
      const mod = e.metaKey || e.ctrlKey;
      const S = FM.spine;
      const ids = FM.selectionIds ? FM.selectionIds() : [];
      const R = (S && S.read) ? S.read(FM.scene) : null;
      const onMain = !!R && ids.some(id => R.isMain(id));
      if (!mod && (e.code === 'KeyA' || e.code === 'KeyS' || e.code === 'KeyD')) { e.preventDefault(); if (!e.repeat && S) S.say('splitNext', { full: true }); return true; }
      if (!mod && (e.code === 'Backspace' || e.code === 'Delete') && onMain) { e.preventDefault(); if (S) S.say('deleteNext', { full: true }); return true; }
      if (mod && (e.key === 'd' || e.key === 'D') && onMain) { e.preventDefault(); if (S) S.say('dupNext', { full: true }); return true; }
      return false;
    },
```

Replace with:

```js
    onKey(e) {
      /* PHASE 2 (DESIGN.md §8.3's table). A / D ripple-trim a main clip with the playhead inside it, else the main clip under
         the playhead (selected first); S splits the selected item, else that main clip; Delete and ⌘D on one main clip are
         Simple's delete and duplicate. An overlay, text or caption item keeps Full's own A / D / Delete / ⌘D (no ripple). */
      if (mode !== 'simple' || e.altKey) return false;
      const mod = e.metaKey || e.ctrlKey;
      const S = FM.spine;
      if (!S || !S.cmd) return false;
      const lines = (FM.spineWords && FM.spineWords.lines) || {};
      const ids = FM.selectionIds ? FM.selectionIds() : [];
      const R = S.read(FM.scene);
      const one = ids.length === 1 ? ids[0] : null;
      const t = FM.time || 0;
      const inside = id => { const l = FM.layerById(FM.scene, id); return !!l && t > (+l.start || 0) + 1e-4 && t < (+l.start || 0) + (+l.duration || 0) - 1e-4; };
      const mainTarget = () => {
        if (one && R.isMain(one) && inside(one)) return one;
        const m = S.mainAtTime(R, t);
        if (m && FM.selectLayer && FM.scene.selectedId !== m.id) FM.selectLayer(m.id);
        return m ? m.id : null;
      };
      if (!mod && (e.code === 'KeyA' || e.code === 'KeyD' || e.code === 'KeyS')) {
        if (one && !R.isMain(one) && e.code !== 'KeyS') return false;
        e.preventDefault();
        if (e.repeat) return true;
        if (e.code === 'KeyS' && one && !R.isMain(one)) { S.cmd.split(one); return true; }
        const id = mainTarget();
        if (!id) { S.say(lines.noClipHere || 'No clip at the playhead'); return true; }
        if (e.code === 'KeyA') S.cmd.trimHead(id); else if (e.code === 'KeyD') S.cmd.trimTail(id); else S.cmd.split(id);
        return true;
      }
      if (!mod && (e.code === 'Backspace' || e.code === 'Delete')) {
        const mains = ids.filter(id => R.isMain(id));
        if (!mains.length) return false;
        e.preventDefault();
        if (ids.length > 1) { S.say(lines.deleteOne || 'Delete one clip at a time'); return true; }
        S.cmd.del(mains[0]);
        return true;
      }
      if (mod && (e.key === 'd' || e.key === 'D') && one && R.isMain(one)) { e.preventDefault(); S.cmd.duplicate(one); return true; }
      return false;
    },
```

#### 2.1.7 `js/editor-mode.js`

Find (exactly once):

```js
    if (sp && !sp._edWired) { sp._edWired = true; sp.addEventListener('click', () => { if (FM.spine) FM.spine.say('splitNext', { full: true }); }); }
```

Replace with:

```js
    /* Phase 2: ✂ splits the selected item, or the main clip under the playhead when nothing is selected (§8.5: one home) */
    if (sp && !sp._edWired) { sp._edWired = true; sp.addEventListener('click', () => { if (!FM.spine || !FM.spine.cmd) return; const ids = FM.selectionIds ? FM.selectionIds() : []; FM.spine.cmd.split(ids.length === 1 ? ids[0] : null); }); }
```

#### 2.1.8 `index.html`

Find (exactly once):

```html
<button id="btn-sm-split" class="tbtn sm-only" type="button" aria-disabled="true" aria-label="Split at the line" title="Split at the line (S)">
```

Replace with:

```html
<button id="btn-sm-split" class="tbtn sm-only" type="button" aria-label="Split at the line" title="Split at the line (S)">
```

#### 2.1.9 `index.html`

Find (exactly once):

```html
  <script src="js/spine.js?v=1"></script>         <!-- Simple mode P1: FM.spine, the read side — after scene.js, before compositor/storage -->
```

Replace with:

```html
  <script src="js/spine.js?v=2"></script>         <!-- Simple mode P1: FM.spine, the read side — after scene.js, before compositor/storage -->
  <script src="js/spine-edit.js?v=1"></script>    <!-- Simple mode P2: FM.spine.edit, the runner and the commands — after spine.js -->
```

#### 2.1.10 `js/history.js`

Find (exactly once):

```js
  const stack = [];
  let index = -1;
```

Replace with:

```js
  const stack = [];
  /* Simple mode P2 (DESIGN.md §11): each step's {label, ed, arr} beside its snapshot, index for index. Full never passes one,
     so a Full step's meta is null; only collab's undo gate reads `arr` (§10.2 door 2), and only Simple's runner writes it. */
  const metas = [];
  let commitSeq = 0;   // bumped on every real push: a tap Simple queued during a run is stamped with it (§3.7)
  let index = -1;
```

#### 2.1.11 `js/history.js`

Find (exactly once):

```js
    commit() {
      if (suppress) return;
```

Replace with:

```js
    commit(meta) {
      if (suppress) return;
```

#### 2.1.12 `js/history.js`

Find (exactly once):

```js
      if (index >= 0 && stack[index] === s) { if (cb) FM.collab.afterCommit(); return; }
```

Replace with:

```js
      if (index >= 0 && stack[index] === s) { if (cb) FM.collab.afterCommit(meta); return; }
```

#### 2.1.13 `js/history.js`

Find (exactly once):

```js
      stack.splice(index + 1);          // drop redo tail
      stack.push(s);
      index = stack.length - 1;
      if (stack.length > 120) { stack.shift(); index--; discarded = true; }
```

Replace with:

```js
      stack.splice(index + 1);          // drop redo tail
      stack.push(s);
      metas.splice(index + 1); metas.push(meta && typeof meta === 'object' ? meta : null); commitSeq++;   // Simple mode P2
      index = stack.length - 1;
      if (stack.length > 120) { stack.shift(); metas.shift(); index--; discarded = true; }
```

#### 2.1.14 `js/history.js`

Find (exactly once):

```js
      while (bytes > 48000000 && stack.length > 8) { bytes -= stack[0].length; stack.shift(); index--; discarded = true; }
```

Replace with:

```js
      while (bytes > 48000000 && stack.length > 8) { bytes -= stack[0].length; stack.shift(); metas.shift(); index--; discarded = true; }
```

#### 2.1.15 `js/history.js`

Find (exactly once):

```js
      if (cb) FM.collab.afterCommit();   // queue 921 S0: close this person's undo step (see beforeSnap above)
```

Replace with:

```js
      if (cb) FM.collab.afterCommit(meta);   // queue 921 S0: close this person's undo step (see beforeSnap above); Simple mode P2: with its meta
```

#### 2.1.16 `js/history.js`

Find (exactly once):

```js
    reset() {
      stack.length = 0; index = -1; this.commit();
```

Replace with:

```js
    reset() {
      stack.length = 0; metas.length = 0; index = -1; this.commit();
```

#### 2.1.17 `js/history.js`

Find (exactly once):

```js
    _snapshotsUpTo() { return stack.slice(0, index + 1); },
```

Replace with:

```js
    _snapshotsUpTo() { return stack.slice(0, index + 1); },
    /* Simple mode P2: the metas beside those snapshots (collab's pre-session steps carry `arr`, §10.2 door 2), the meta of the
       step the document stands on, and the push counter. Read-only. */
    _metasUpTo() { return metas.slice(0, index + 1); },
    _metaHere() { return index >= 0 ? metas[index] : null; },
    _commitSeq() { return commitSeq; },
```

#### 2.1.18 `js/history.js`

Find (exactly once):

```js
    undo() { if (FM.flushPendingCommit) FM.flushPendingCommit();
```

Replace with:

```js
    /* Simple mode P2 (§3.7, §0.4 B15): pressed while Simple's runner is mid-command, undo and redo wait in its queue and run
       right after that command commits, never half-way through it. `FM.spine.running` is only ever true inside Simple's
       runner, so in Full this line never fires. */
    undo() { if (FM.spine && FM.spine.running && FM.spine.queueStep) return FM.spine.queueStep('undo'); if (FM.flushPendingCommit) FM.flushPendingCommit();
```

#### 2.1.19 `js/history.js`

Find (exactly once):

```js
    redo() { if (FM.flushPendingCommit) FM.flushPendingCommit();
```

Replace with:

```js
    redo() { if (FM.spine && FM.spine.running && FM.spine.queueStep) return FM.spine.queueStep('redo'); if (FM.flushPendingCommit) FM.flushPendingCommit();
```

#### 2.1.20 `js/collab-core.js`

Find (exactly once):

```js
  C.afterCommit = function () { const s = US(); if (s) s.afterCommit(); };
```

Replace with:

```js
  C.afterCommit = function (meta) { const s = US(); if (s) s.afterCommit(meta); };   // Simple mode P2: the step's {label, ed, arr}
```

#### 2.1.21 `js/collab-core.js`

Find (exactly once):

```js
  C.othersHere = function () {
    const s = C.session;
    if (!s || !C.active || s.ended || s.active === false) return false;
    return s.isOwner ? !!(s.peerIds && s.peerIds().length) : true;
  };
```

Replace with:

```js
  C.othersHere = function () {
    const s = C.session;
    if (!s || !C.active || s.ended || s.active === false) return false;
    return s.isOwner ? !!(s.peerIds && s.peerIds().length) : true;
  };
  /* ═══ SIMPLE MODE P2: THE ONE LIVE-GATE PREDICATE (DESIGN.md §3.7, §10.2; his D14: moving clips waits while someone else
     who can edit is in). Read by Simple's runner and by undo's gate, never by Full. True on a guest (the owner can always
     write); on the owner, while a member with the Editor role is connected OR is still in the room's member table (a dropped
     editor's offline changes would replay at their old times); with no session, on a linked copy that has not been left.
     Viewers and Commenters never count. (Arrange anyway and Make Sam a Viewer are release 2.6.) */
  C.isLinkedCopy = function (pid) {
    pid = pid || (FM.storage && FM.storage.openProjectId ? FM.storage.openProjectId() : null);
    let card = null;
    try { card = pid && FM.projects && FM.projects.list ? (FM.projects.list() || []).find(p => p.id === pid) : null; } catch (e) { card = null; }
    return !!(card && card.collab && !card.collab.ended);
  };
  C.othersCanEdit = function () {
    const s = C.session;
    if (!s || !C.active || s.ended || s.active === false) return C.isLinkedCopy();
    if (!s.isOwner) return true;
    const H = s.host, m = H && H.members;
    if (m && Object.keys(m).some(mid => mid !== H.ownerMid && m[mid] && m[mid].role === 'editor')) return true;
    return !!(C.ui && C.ui.roomEditors && C.ui.roomEditors().length);
  };
```

#### 2.1.22 `js/collab-session.js`

Find (exactly once):

```js
    let preSnaps = null, preIdx = -1;
```

Replace with:

```js
    let preSnaps = null, preIdx = -1, preMetas = null;   // preMetas: Simple mode P2, history's {label, ed, arr} beside each snapshot
```

#### 2.1.23 `js/collab-session.js`

Find (exactly once):

```js
    function closeStep() {
      if (!step.ops.length) { step = newStep(); return; }
      undoStack.push({ ops: step.ops, recs: step.recs, orders: step.orders });
```

Replace with:

```js
    function closeStep(meta) {
      if (!step.ops.length) { step = newStep(); return; }
      const st = { ops: step.ops, recs: step.recs, orders: step.orders };
      if (meta && meta.arr === true) st.arr = true;   // Simple mode P2: an arranging Simple step (§10.2 door 2); Full's steps carry none
      undoStack.push(st);
```

#### 2.1.24 `js/collab-session.js`

Find (exactly once):

```js
      const to = docOfSnapshot(preSnaps[preIdx]);
      const from = docOfSnapshot(preSnaps[preIdx - 1]);
      preIdx--;
      if (!to || !from) return null;
      const res = D.diffDoc(from, to);
      res.recs.forEach(function (r, i) { if (res.ops[i].o === 's') r.after = clone(res.ops[i].v); });
      return { ops: res.ops, recs: res.recs, orders: res.orders, pre: true };
```

Replace with:

```js
      const to = docOfSnapshot(preSnaps[preIdx]);
      const from = docOfSnapshot(preSnaps[preIdx - 1]);
      const meta = preMetas ? preMetas[preIdx] : null;   // Simple mode P2
      preIdx--;
      if (!to || !from) return null;
      const res = D.diffDoc(from, to);
      res.recs.forEach(function (r, i) { if (res.ops[i].o === 's') r.after = clone(res.ops[i].v); });
      const st = { ops: res.ops, recs: res.recs, orders: res.orders, pre: true };
      if (meta && meta.arr === true) st.arr = true;
      return st;
```

#### 2.1.25 `js/collab-session.js`

Find (exactly once):

```js
    function runStep(st, intoRedo) {
      if (A.flushPendingCommit) { try { A.flushPendingCommit(); } catch (e) {} }
```

Replace with:

```js
    function runStep(st, intoRedo) {
      /* SIMPLE MODE P2 — THE UNDO DOOR (DESIGN.md §10.2 door 2, his D14). Undoing or redoing a step that moved clips would send
         a ripple while someone else can edit — exactly what the runner refuses. Put back unconsumed, as the backstop refusal
         below does, before anything is applied or sent. Only steps Simple's runner tagged `arr` ever reach this. */
      if (st.arr && window.FM && FM.spine && FM.spine.undoGate) {
        const why = FM.spine.undoGate();
        if (why) {
          if (st.pre) preIdx++;
          else (intoRedo ? undoStack : redoStack).push(st);
          if (FM.spine.undoRefused) FM.spine.undoRefused(why);
          return false;
        }
      }
      if (A.flushPendingCommit) { try { A.flushPendingCommit(); } catch (e) {} }
```

#### 2.1.26 `js/collab-session.js`

Find (exactly once):

```js
        res.recs.forEach(function (r, i) { if (res.ops[i].o === 's') r.after = clone(res.ops[i].v); });
        (intoRedo ? redoStack : undoStack).push({ ops: res.ops, recs: res.recs, orders: res.orders });
```

Replace with:

```js
        res.recs.forEach(function (r, i) { if (res.ops[i].o === 's') r.after = clone(res.ops[i].v); });
        const inv = { ops: res.ops, recs: res.recs, orders: res.orders };
        if (st.arr) inv.arr = true;   // Simple mode P2: redoing an arranging step is arranging too
        (intoRedo ? redoStack : undoStack).push(inv);
```

#### 2.1.27 `js/collab-session.js`

Find (exactly once):

```js
    S.seedPreSession = function (snaps) { preSnaps = snaps || null; preIdx = preSnaps ? preSnaps.length - 1 : -1; };
```

Replace with:

```js
    S.seedPreSession = function (snaps, metas) { preSnaps = snaps || null; preMetas = metas || null; preIdx = preSnaps ? preSnaps.length - 1 : -1; };
```

#### 2.1.28 `js/collab-session.js`

Find (exactly once):

```js
    S.afterCommit = function () { closeStep(); };
```

Replace with:

```js
    S.afterCommit = function (meta) { closeStep(meta); };
```

#### 2.1.29 `js/collab-session.js`

Find (exactly once):

```js
    if (FM.history && FM.history._snapshotsUpTo) S.seedPreSession(FM.history._snapshotsUpTo());
```

Replace with:

```js
    if (FM.history && FM.history._snapshotsUpTo) S.seedPreSession(FM.history._snapshotsUpTo(), FM.history._metasUpTo ? FM.history._metasUpTo() : null);
```

#### 2.1.30 `js/collab-presence.js`

Find (exactly once):

```js
  PZ.holderName = function (lid) {
```

Replace with:

```js
  /* Simple mode P2 (DESIGN.md §3.7): WHO else holds a layer — their mid, or null — for the lease half of Simple's pre-flight.
     holderName answers null for an unknown name too, which would read as "nobody holds it". Read-only. */
  PZ.heldByOther = function (lid) {
    if (!S || !isId(lid)) return null;
    const h = holderOf(lid);
    return (h && h !== myMid) ? h : null;
  };
  PZ.holderName = function (lid) {
```

#### 2.1.31 `js/collab-ui.js`

Find (exactly once):

```js
  U._forgetRid = forgetRid;
```

Replace with:

```js
  U._forgetRid = forgetRid;
  /* Simple mode P2 (DESIGN.md §3.7 (b)): the room's REMEMBERED editors — a member keeps its row (and its offline changes) after
     its connection drops, until it leaves or is removed. Read-only; FM.collab.othersCanEdit is its one reader. */
  U.roomEditors = function () {
    if (!hostRoom || !hostRoom.members) return [];
    if (hostRoomPid && FM.projects && FM.projects.currentId && hostRoomPid !== FM.projects.currentId()) return [];
    return Object.keys(hostRoom.members).filter(rid => { const m = hostRoom.members[rid]; return !!m && m.role === 'editor'; });
  };
```

#### 2.1.32 `js/app.js`

Find (exactly once):

```js
      if (touches && soundingAt(l, edgeT, ls)) return true;
    }
    return false;
  }
```

Replace with:

```js
      if (touches && soundingAt(l, edgeT, ls) && simpleCutContinuous(layer, l)) return true;
    }
    return false;
  }
  /* SIMPLE MODE P2 (DESIGN.md §12.1, §0.4 B6). Simple's trims, deletes and reorders can butt two halves of one split together
     where the footage JUMPS, which the seam rule above would leave un-ramped — a pop (#148). Simple's runner marks the later
     half of such a pair `sm.cut`; only for a marked pair is continuity required (same media and rev, same direction, the
     first half's source out-point equal to the second's in-point within one sample). Unmarked pairs — every pair Full ever
     makes — keep today's rule exactly, so a Full-made project sounds as it does today. */
  function simpleCutContinuous(a, b) {
    const first = (a.start || 0) <= (b.start || 0) ? a : b, later = first === a ? b : a;
    if (!(later.sm && later.sm.cut === true)) return true;
    return !!(FM.spine && FM.spine.continuous && FM.spine.continuous(first, later));
  }
```

#### 2.1.33 `js/app.js`

Find (exactly once):

```js
  FM.duplicateLayer = FM.jobWrapped('duplicateLayer', async function (id, inPlace) {
```

Replace with:

```js
  FM.duplicateLayer = FM.jobWrapped('duplicateLayer', async function (id, inPlace, opts) {   // opts.noSave (Simple mode P2): the runner's one commit saves
```

#### 2.1.34 `js/app.js`

Find (exactly once):

```js
    if (FM.storage && FM.storage.save) FM.storage.save();   // persist the duplicated layer's media blob immediately
    return copy.id;
```

Replace with:

```js
    if (FM.storage && FM.storage.save && !(opts && opts.noSave)) FM.storage.save();   // persist the duplicated layer's media blob immediately
    return copy.id;
```


### 3.4 `styles.css`: append at the end of the file

```css
/* ═══ SIMPLE MODE, PHASE 2.1 — the lines' buttons, the pulse, the busy state (BUILD-PLAN-PHASE2.md §3) ═════════════════════
   Every rule is keyed on an element or a class only Simple makes (#sm-say, .sm-item, body.sm-running), so Full matches none. */
#sm-say .sm-say-b[aria-disabled="true"] { opacity: .55; }
#sm-say .sm-say-b + .sm-say-b { margin-left: -2px; }
#sm-say .sm-say-t { white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
@media (max-width: 700px) { #sm-say.sm-say-has-b { padding-right: 56px; } }   /* §3.12 rule 5: 🗑's 56 px stay free of buttons */
.sm-item.sm-pulse { animation: sm-pulse .6s ease; }
@keyframes sm-pulse { 0% { box-shadow: inset 0 0 0 2px #fff, 0 0 0 0 rgba(255,255,255,.7); } 100% { box-shadow: inset 0 0 0 2px #fff, 0 0 0 10px rgba(255,255,255,0); } }
@media (prefers-reduced-motion: reduce) { .sm-item.sm-pulse { animation: none; outline: 2px solid #fff; } }
/* While a Simple command runs (§3.7) nothing else can write: the canvas, the timeline and the open panel are inert */
body.sm-running #sm-timeline, body.sm-running #stage, body.sm-running #inspector-panel { pointer-events: none; }
```

### 3.5 `?v=` bumps

`js/spine-words.js`, `js/spine.js` (2.1.9 writes it), `js/simple-timeline.js`, `js/editor-mode.js`, `js/history.js`,
`js/collab-core.js`, `js/collab-session.js`, `js/collab-presence.js`, `js/collab-ui.js`, `js/app.js`, `styles.css`; new
`js/spine-edit.js?v=1` (2.1.9).

### 3.6 Tests (append at the end of `tests/tests.js`, before the final `})();`), and the two Phase 1 tests 2.1 changes

```js
  /* ═══ SIMPLE MODE, PHASE 2 RELEASE 2.1 — EDITING CLIP AFTER CLIP: the runner, delete, both trims, split, close gap,
     duplicate, the live gate and the undo door (queue 980 (partial); BUILD-PLAN-PHASE2.md §3) ═══════════════════════════
     Every test drives the REAL key, chip or button path in a THROWAWAY project (his own project is never written), with
     the real undo history. Each fails on the tree before 2.1 by what it does, not by a missing name, where a UI path
     exists: Phase 1 answers those keys with a "comes next" line and changes nothing. */

  async function smP2(build, fn, opts) {
    opts = opts || {};
    const sleep = ms => new Promise(r => setTimeout(r, ms));
    const orig = FM.projects.currentId(), wasHome = !!(FM.home && FM.home.isOpen && FM.home.isOpen()), made = [];
    const W = opts.W || 320, H = opts.H || 240;
    const ls0 = {}; ['fm.editor.last', 'fm.editor.hint'].forEach(k => { try { ls0[k] = localStorage.getItem(k); } catch (e) {} });
    const saved = [];
    try {
      if (wasHome) FM.home.close();
      made.push(await FM.projects.create({ name: 'FX980 P2', width: W, height: H }));
      const proj = Object.assign({ name: 'FX980 P2', width: W, height: H, fps: opts.fps || 30, duration: 0, background: '#000000' }, opts.project || {});
      await FM.storage.applyScene({ project: proj, layers: build(W, H), selectedId: null, selectedIds: [] });
      FM.history.reset(); FM.selectLayer(null); FM.time = opts.time || 0;
      const L = n => FM.scene.layers.find(l => l.name === n) || null;
      (opts.media || []).forEach(m => { const l = L(m.name); if (l) { FM.media.set(l.id, m.rec); saved.push(l.id); } });
      if (!opts.full && FM.editor) FM.editor.set('simple');
      FM.refreshAll(); await sleep(40);
      const idle = async () => { for (let i = 0; i < 400 && FM.spine && FM.spine.running; i++) await sleep(10); await sleep(30); };
      const doc = () => JSON.stringify({ project: FM.scene.project, layers: FM.scene.layers }, FM.jsonReplacer);
      return await fn({ L: L, sleep: sleep, idle: idle, doc: doc, W: W, H: H,
        steps: () => FM.history._steps().len,
        say: () => smSayText(),
        key: (code, k, mod) => window.dispatchEvent(new KeyboardEvent('keydown', { code: code, key: k || code, metaKey: !!mod, ctrlKey: false, bubbles: true }))
      });
    } finally {
      saved.forEach(id => { try { FM.media.remove(id); } catch (e) {} });
      try { if (FM.editor) FM.editor.apply('full', { force: true, quiet: true }); } catch (e) {}
      Object.keys(ls0).forEach(k => { try { if (ls0[k] === null) localStorage.removeItem(k); else localStorage.setItem(k, ls0[k]); } catch (e) {} });
      await q915aCleanup(made, orig, wasHome, [], [], []);
    }
  }
  /* What Simple is SAYING: from 2.2 the row also holds the tray, so the line is read from its own .sm-line when there is one */
  function smSayText() { const s = document.getElementById('sm-say'), ln = s && s.querySelector('.sm-line'); return ((ln || s || {}).textContent) || ''; }
  /* A full-frame clip with its native size stored (Phase 1 writes srcW at add), muted unless asked, named for lookup. */
  function smV(name, start, dur, W, H, o) {
    const l = FM.makeLayer('video', { name: name, x: W / 2, y: H / 2, start: start, duration: dur });
    l.srcW = W; l.srcH = H; l.srcRev = 0; l.muted = true;
    return Object.assign(l, o || {});
  }
  function smT(name, start, dur, W, H, o) { const l = FM.makeLayer('text', { name: name, text: name, x: W / 2, y: H * 0.2, start: start, duration: dur }); return Object.assign(l, o || {}); }
  function smSong(name, start, dur, W, H, o) { const l = FM.makeLayer('video', { name: name, x: W / 2, y: H / 2, start: start, duration: dur }); l.audioOnly = true; return Object.assign(l, o || {}); }
  const smKf = (pairs) => ({ kf: pairs.map(p => ({ t: p[0], v: p[1], e: 'linear' })) });
  function smNeedP2() { if (!FM.spine || !FM.spine.edit || !FM.spine.cmd) throw new Error('FM.spine.edit is missing — js/spine-edit.js did not load'); }

  test('simple P2.1 · Delete on a main clip closes the gap and takes what is on it (D5): one undo step, the join bit-exact, Full’s delete unchanged', { item: '980', budgetMs: 60000 }, async function () {
    await smP2((W, H) => [
      smT('On B', 4.5, 1, W, H), smT('On C', 8, 1, W, H, { transform: Object.assign(FM.makeLayer('text', {}).transform, { opacity: smKf([[8, 0], [8.5, 1]]) }) }),
      smV('C', 7.2, 4.0104667, W, H), smV('B', 3.7, 3.5, W, H), smV('A', 0, 3.7, W, H)
    ], async function (v) {
      const A = v.L('A'), B = v.L('B'), C = v.L('C');
      const doc0 = v.doc(), n0 = v.steps();
      FM.selectLayer(B.id);
      v.key('Backspace'); await v.idle();
      if (v.L('B')) throw new Error('Backspace on main clip B in Simple left it in place (it said: “' + v.say() + '”)');
      if (v.L('On B')) throw new Error('the title on B was not deleted with it (D5)');
      if (C.start !== A.start + A.duration) throw new Error('C did not land exactly on A’s end: ' + C.start + ' vs ' + (A.start + A.duration) + ' (a 1-ulp gap exports a black frame, §3.1)');
      const oc = v.L('On C');
      if (Math.abs(oc.start - 4.5) > 1e-9) throw new Error('the title on C did not move with C: ' + oc.start + ' (want 4.5)');
      const ks = oc.transform.opacity.kf.map(k => +k.t.toFixed(9)).join(',');
      if (ks !== '4.5,5') throw new Error('the title’s keys did not move with it: ' + ks + ' (want 4.5,5)');
      if (v.steps() !== n0 + 1) throw new Error('the delete took ' + (v.steps() - n0) + ' undo steps, not 1');
      const m = FM.history._metaHere();
      if (!m || m.ed !== 's' || m.arr !== true) throw new Error('the step is not tagged as a Simple arranging step: ' + JSON.stringify(m));
      if (!(FM.scene.project.sm && FM.scene.project.sm.adopted === true)) throw new Error('the first arranging edit did not adopt the project (§5.3)');
      if (!(A.sm && A.sm.main && C.sm && C.sm.main)) throw new Error('adoption did not flag the main clips');
      if (!/Deleted clip and 1 thing on it/.test(v.say())) throw new Error('the line is wrong: “' + v.say() + '”');
      FM.history.undo(); await v.sleep(30);
      if (v.doc() !== doc0) throw new Error('one undo did not put the document back byte for byte (§3.9 invariant 5)');
      /* CONTROL — FULL IS UNCHANGED: Full's own delete of the same clip leaves C where it was */
      FM.editor.apply('full', { force: true, quiet: true });
      FM.deleteLayer(v.L('B').id);
      if (v.L('C').start !== 7.2) throw new Error('CONTROL: Full’s delete moved C to ' + v.L('C').start + ' — Full must never ripple');
    });
  });

  test('simple P2.1 · D trims the tail and a title cut off slides back onto its clip (D6); A trims the head and the clip keeps its slot', { item: '980', budgetMs: 60000 }, async function () {
    await smP2((W, H) => [
      smT('T', 3, 1, W, H, { transform: Object.assign(FM.makeLayer('text', {}).transform, { scale: smKf([[3, 0.5], [3.2, 1]]) }) }),
      smV('B', 5, 5, W, H), smV('A', 0, 5, W, H)
    ], async function (v) {
      const A = v.L('A'), B = v.L('B'), T = v.L('T');
      const n0 = v.steps();
      FM.selectLayer(A.id); FM.time = 2.5;
      v.key('KeyD', 'd'); await v.idle();
      if (Math.abs(A.duration - 2.5) > 1e-9) throw new Error('D did not trim A to the playhead: ' + A.duration + ' (it said “' + v.say() + '”)');
      if (B.start !== A.start + A.duration) throw new Error('B did not close up onto A: ' + B.start);
      if (Math.abs(T.start - 1.5) > 1e-9) throw new Error('the title whose first frame was cut away did not slide back onto A (D6): ' + T.start + ' (want 1.5)');
      const ks = T.transform.scale.kf.map(k => +k.t.toFixed(9)).join(',');
      if (ks !== '1.5,1.7') throw new Error('the slid title’s pop-in keys did not come with it: ' + ks);
      if (Math.abs(FM.time - 2.5) > 1e-9) throw new Error('D moved the playhead: ' + FM.time);
      /* A, 1 s into B: B keeps its start, loses a second of footage from the head, the effect clock carries on */
      FM.selectLayer(B.id); FM.time = 3.5;
      v.key('KeyA', 'a'); await v.idle();
      if (B.start !== 2.5 || Math.abs(B.duration - 4) > 1e-9) throw new Error('A did not trim B’s head keeping its slot: ' + B.start + ' / ' + B.duration);
      if (Math.abs((B.trimStart || 0) - 1) > 1e-9 || Math.abs((parseFloat(B.fxTimeOffset) || 0) - 1) > 1e-9) throw new Error('the head trim did not advance trimStart and the effect clock by 1: ' + B.trimStart + ' / ' + B.fxTimeOffset);
      if (Math.abs(FM.time - 2.5) > 1e-9) throw new Error('A should land the playhead on B’s first kept frame, its start (§3.6.2): ' + FM.time);
      if (v.steps() !== n0 + 2) throw new Error('two trims should be two undo steps, got ' + (v.steps() - n0));
      /* CONTROL — FULL IS UNCHANGED: Full's D on the same clip (undone first) does not ripple */
      FM.history.undo(); FM.history.undo(); await v.sleep(30);
      FM.editor.apply('full', { force: true, quiet: true });
      FM.selectLayer(v.L('A').id); FM.time = 2.5; FM.timeline.clipKey('d');
      if (v.L('B').start !== 5 || v.L('T').start !== 3) throw new Error('CONTROL: Full’s D rippled or moved the title (B at ' + v.L('B').start + ', T at ' + v.L('T').start + ')');
    });
  });

  test('simple P2.1 · S and ✂ split at the playhead with the clip’s sound twin; too near an edge says so and writes nothing', { item: '980', budgetMs: 60000 }, async function () {
    await smP2((W, H) => [smSong('K', 0, 4, W, H), smV('A', 0, 4, W, H), smV('Z', 4, 2, W, H)], async function (v) {
      const A = v.L('A'), K = v.L('K');
      K.karaokeOf = A.id;   // a karaoke twin: the app's own link (js/audio-tools.js)
      const n0 = v.steps(), count0 = FM.scene.layers.length;
      FM.selectLayer(A.id); FM.time = 2;
      v.key('KeyS', 's'); await v.idle();
      if (FM.scene.layers.length !== count0 + 2) throw new Error('S did not split the clip and its twin: ' + (FM.scene.layers.length - count0) + ' new layer(s) (it said “' + v.say() + '”)');
      const B = FM.scene.layers.find(l => l !== A && l.splitOf && l.splitOf === A.splitOf);
      const KB = FM.scene.layers.find(l => l !== K && l.audioOnly && l.splitOf && l.splitOf === K.splitOf);
      if (!B || Math.abs(B.start - 2) > 1e-9 || Math.abs(A.duration - 2) > 1e-9) throw new Error('the halves are wrong: A ' + A.duration + ', B at ' + (B && B.start));
      if (!KB || KB.karaokeOf !== B.id) throw new Error('the twin’s second half does not point at the clip’s second half (karaokeOf ' + (KB && KB.karaokeOf) + ')');
      if (v.steps() !== n0 + 1) throw new Error('a split with its twin should be one step, got ' + (v.steps() - n0));
      if (FM.scene.project.sm && FM.scene.project.sm.adopted) throw new Error('a split is not arranging and must not adopt (§3.6)');
      /* ✂ 0.05 s into a clip: refused, nothing written */
      const d1 = v.doc(), n1 = v.steps();
      FM.selectLayer(v.L('Z').id); FM.time = 4.05;
      document.getElementById('btn-sm-split').click(); await v.idle();
      if (!/Too close to the edge of the clip/.test(v.say())) throw new Error('✂ near an edge said “' + v.say() + '”');
      if (v.doc() !== d1 || v.steps() !== n1) throw new Error('a refused split changed the document or took a step');
      /* CONTROL: ✂ on Z at 5 does split it */
      FM.time = 5; document.getElementById('btn-sm-split').click(); await v.idle();
      if (v.steps() !== n1 + 1) throw new Error('CONTROL: ✂ in the middle of Z did not split it');
    });
  });

  test('simple P2.1 · tapping a gap chip closes it exactly and an overlap chip fixes it; what follows moves along', { item: '980', budgetMs: 60000 }, async function () {
    await smP2((W, H) => [smT('On B', 6, 1, W, H), smV('C', 8.6, 3.4, W, H), smV('B', 5.2, 3.8, W, H), smV('A', 0, 4, W, H)], async function (v) {
      const A = v.L('A'), B = v.L('B'), C = v.L('C'), T = v.L('On B');
      FM.time = 0; FM.refreshAll(); await v.sleep(30);
      const gap = document.querySelector('#sm-main .sm-chip-gap');
      if (!gap) throw new Error('no gap chip for the 1.2 s gap');
      gap.click(); await v.idle();
      if (B.start !== A.start + A.duration) throw new Error('the gap chip did not close the gap exactly: B at ' + B.start + ' (it said “' + v.say() + '”)');
      if (Math.abs(T.start - 4.8) > 1e-9 || Math.abs(C.start - 7.4) > 1e-9) throw new Error('what follows did not move by the gap: title ' + T.start + ', C ' + C.start);
      FM.refreshAll(); await v.sleep(30);
      const ov = document.querySelector('#sm-main .sm-chip-overlap');
      if (!ov) throw new Error('no overlap chip for B/C’s 0.4 s overlap');
      ov.click(); await v.idle();
      if (C.start !== B.start + B.duration) throw new Error('the overlap chip did not land C on B’s end: ' + C.start + ' vs ' + (B.start + B.duration));
      FM.refreshAll(); await v.sleep(30);
      if (document.querySelector('#sm-main .sm-chip')) throw new Error('a chip is still drawn after both were fixed');
    });
  });

  test('simple P2.1 · ⌘D duplicates a main clip right after itself with its keys; what follows moves along; one undo removes it', { item: '980', budgetMs: 60000 }, async function () {
    await smP2((W, H) => [smV('B', 3, 3, W, H), (() => { const a = smV('A', 0, 3, W, H); a.transform.x = smKf([[1, 160], [2, 170]]); return a; })()], async function (v) {
      const A = v.L('A'), B = v.L('B'), doc0 = v.doc(), n0 = v.steps();
      FM.selectLayer(A.id);
      v.key('KeyD', 'd', true); await v.idle();
      const copy = FM.scene.layers.find(l => l !== A && l.type === 'video' && l !== B);
      if (!copy) throw new Error('⌘D on a main clip made no copy (it said “' + v.say() + '”)');
      if (copy.start !== 3 || B.start !== 6) throw new Error('the copy is not right after A with B after it: copy ' + copy.start + ', B ' + B.start);
      if (copy.transform.x.kf.map(k => k.t).join(',') !== '4,5') throw new Error('the copy’s keys did not move with it: ' + copy.transform.x.kf.map(k => k.t));
      if (!(copy.sm && copy.sm.main)) throw new Error('the copy is not a main clip');
      if (FM.scene.selectedId !== copy.id) throw new Error('the copy is not selected');
      if (v.steps() !== n0 + 1) throw new Error('duplicate took ' + (v.steps() - n0) + ' steps');
      FM.history.undo(); await v.sleep(30);
      if (v.doc() !== doc0) throw new Error('one undo did not remove the copy and put B back exactly');
    });
  });

  test('simple P2.1 · a locked clip in the way stops the edit with Do it anyway, which waits for the finger and keeps the lock (D7)', { item: '980', budgetMs: 60000 }, async function () {
    await smP2((W, H) => [smV('C', 6, 3, W, H, { locked: true }), smV('B', 3, 3, W, H), smV('A', 0, 3, W, H)], async function (v) {
      const C = v.L('C'), doc0 = v.doc(), n0 = v.steps();
      FM.selectLayer(v.L('B').id);
      v.key('Backspace'); await v.idle();
      if (!/That clip is locked/.test(v.say())) throw new Error('the locked line is missing: “' + v.say() + '”');
      if (v.doc() !== doc0 || v.steps() !== n0) throw new Error('a refused edit wrote something');
      const btn = Array.from(document.querySelectorAll('#sm-say .sm-say-b')).find(b => b.textContent === 'Do it anyway');
      if (!btn) throw new Error('no Do it anyway button');
      btn.click(); await v.idle();
      if (!v.L('B')) throw new Error('§3.12 rule 5: Do it anyway fired before it was armed (a double tap would have deleted the clip)');
      await v.sleep(450);
      btn.click(); await v.idle();
      if (v.L('B')) throw new Error('Do it anyway did not delete B');
      if (C.start !== 3 || C.locked !== true) throw new Error('C should have moved to 3 and stayed locked: ' + C.start + ' / ' + C.locked);
      if (v.steps() !== n0 + 1) throw new Error('unlock, delete and re-lock should be one step, got ' + (v.steps() - n0));
    });
  });

  test('simple P2.1 · Delete cuts what runs on across the deleted clip (cases i–iii) and pins it; a title on the clip goes with it', { item: '980', budgetMs: 60000 }, async function () {
    await smP2((W, H) => [
      smT('Whole', 0, 14, W, H), smT('Starts on B', 6, 7, W, H), smT('Short on B', 5, 1, W, H), smSong('Song', 2, 8, W, H),
      smV('D', 12, 2, W, H), smV('C', 8, 4, W, H), smV('B', 4, 4, W, H), smV('A', 0, 4, W, H)
    ], async function (v) {
      FM.selectLayer(v.L('B').id);
      v.key('Backspace'); await v.idle();
      if (v.L('B')) throw new Error('B was not deleted (it said “' + v.say() + '”)');
      if (v.L('Short on B')) throw new Error('the short title on B was not deleted with it (D5)');
      const W0 = v.L('Whole');
      if (W0.start !== 0 || Math.abs(W0.duration - 10) > 1e-9) throw new Error('(iii) the whole-video title was not cut by 4 s: ' + W0.start + '..' + (W0.start + W0.duration));
      const S1 = v.L('Starts on B');
      if (Math.abs(S1.start - 4) > 1e-9 || Math.abs(S1.start + S1.duration - 9) > 1e-9) throw new Error('(i) the title starting on B did not land at 4 ending at 9: ' + S1.start + '..' + (S1.start + S1.duration));
      const songs = FM.scene.layers.filter(l => l.audioOnly).sort((a, b) => a.start - b.start);
      if (songs.length !== 2 || Math.abs(songs[0].start - 2) > 1e-9 || Math.abs(songs[0].duration - 2) > 1e-9 || Math.abs(songs[1].start - 4) > 1e-9 || Math.abs(songs[1].duration - 2) > 1e-9 || Math.abs((songs[1].trimStart || 0) - 6) > 1e-9)
        throw new Error('(iii) the song was not split at 4 with its second half trimmed by 4 s: ' + JSON.stringify(songs.map(s => [s.start, s.duration, s.trimStart])));
      [W0, S1].concat(songs).forEach(l => { if (!(l.sm && l.sm.stay)) throw new Error('a cut item was not pinned Stay put: ' + l.name); });
      if (!(W0.sm.tail && Math.abs(W0.sm.tailEnd - 10) < 1e-9)) throw new Error('the whole-video title should end with the video at 10: ' + JSON.stringify(W0.sm));
      if (songs.some(s => s.sm.tail)) throw new Error('a song carries sm.tail — D17 B: music never ends with the video');
      if (!/kept 3 items that run on, trimmed to match/.test(v.say())) throw new Error('the line does not say what was cut: “' + v.say() + '”');
    });
  });

  test('simple P2.1 · ⌘Z pressed while a command is still running waits and undoes exactly that command; in Full ⌘Z is immediate', { item: '980', budgetMs: 60000 }, async function () {
    const png = await new Promise(res => { const c = offscreen(16, 16), x = c.getContext('2d'); x.fillStyle = '#0f0'; x.fillRect(0, 0, 16, 16); c.toBlob(b => res(new File([b], 'g.png', { type: 'image/png' })), 'image/png'); });
    const img = await FM.loadImageFile(png);
    await smP2((W, H) => [(() => { const l = FM.makeLayer('image', { name: 'P', x: W / 2, y: H / 2, start: 0, duration: 4 }); l.srcW = W; l.srcH = H; l.srcRev = 0; return l; })()], async function (v) {
      const n0 = v.steps(), count0 = FM.scene.layers.length;
      FM.selectLayer(v.L('P').id); FM.time = 2;
      v.key('KeyS', 's');                                     // the split awaits the image reload…
      const r = FM.history.undo();                            // …and ⌘Z lands inside that await
      if (!FM.spine || !FM.spine.running) throw new Error('the split was not running when ⌘Z was pressed — nothing to queue (it said “' + v.say() + '”)');
      if (r !== false) throw new Error('undo during the run returned ' + r + ' instead of waiting');
      await v.idle(); await v.sleep(50);
      if (FM.scene.layers.length !== count0) throw new Error('the queued undo did not undo the split: ' + FM.scene.layers.length + ' layers');
      if (!FM.history.canRedo()) throw new Error('the split should be on the redo stack');
      /* CONTROL — FULL: with no Simple command running, undo acts at once, exactly as today */
      FM.editor.apply('full', { force: true, quiet: true });
      FM.history.redo(); await v.sleep(30);
      if (FM.scene.layers.length !== count0 + 1) throw new Error('CONTROL: redo did not bring the split back');
      const r2 = FM.history.undo();
      if (FM.scene.layers.length !== count0 || r2 === false) throw new Error('CONTROL: in Full undo did not act immediately');
    }, { media: [{ name: 'P', rec: img }] });
  });

  test('simple P2.1 · with a friend who can edit in the session, moving clips waits (D14), a split still goes live, and undo cannot send a ripple', { item: '980', budgetMs: 90000 }, async function () {
    const C = FM.collab;
    if (!C || !C.share) throw new Error('setup: FM.collab is not loaded');
    smNeedP2();
    const full = (n, s, d) => layer921(n, { start: s, duration: d, shape: 'rect', x: 160, y: 120, shapeW: 320, shapeH: 240, sm: { main: true } });
    await withCollab921([full('A', 0, 3), full('B', 3, 3), full('C', 6, 3)], async function (c) {
      FM.scene.project.sm = { adopted: true, v: 1 }; FM.history.commit();
      const id = n => FM.scene.layers.find(l => l.name === n).id;
      const g = c.addGuest({ role: 'editor', name: 'Sam' });
      const sent = c.sentTo(g.loop), batches = () => sent.filter(m => m.t === 'b').length;
      FM.editor.set('simple');
      const d0 = JSON.stringify(FM.scene.layers);
      const ok = await FM.spine.cmd.del(id('B'));
      const say = smSayText();
      if (ok !== false || JSON.stringify(FM.scene.layers) !== d0) throw new Error('a delete went through with an editor in the session');
      if (!/^Sam can edit · clips stay put/.test(say)) throw new Error('the live line is wrong: “' + say + '”');
      if (batches()) throw new Error('a refused delete sent ' + batches() + ' batch(es)');
      FM.time = 1.5;
      if (!(await FM.spine.cmd.split(id('A')))) throw new Error('a split (not arranging) was refused live: “' + smSayText() + '”');
      if (batches() !== 1) throw new Error('a live split should send exactly one batch, sent ' + batches());
      /* make Sam a Viewer: arranging opens up; one delete is one batch */
      c.S.setPeerRole(g.mid, 'viewer'); sent.length = 0;
      if (!(await FM.spine.cmd.del(id('B')))) throw new Error('with only a Viewer in, the delete was refused: “' + smSayText() + '”');
      if (batches() !== 1) throw new Error('one Simple delete should be one batch, got ' + batches());
      /* Sam can edit again: undoing that ripple must not be sent (§10.2 door 2) */
      c.S.setPeerRole(g.mid, 'editor'); sent.length = 0;
      const d1 = JSON.stringify(FM.scene.layers);
      const u = FM.history.undo();
      if (u !== false || JSON.stringify(FM.scene.layers) !== d1 || batches()) throw new Error('undoing an arranging step with an editor in went through (sent ' + batches() + ')');
      if (!FM.collab.canUndo()) throw new Error('the refused undo used the step up — it should stay for later');
      /* CONTROL — a Full-made step is never gated: rename a layer in Full and undo it with Sam still in */
      FM.editor.apply('full', { force: true, quiet: true });
      const A = FM.scene.layers.find(l => l.name === 'A'); A.name = 'A2'; FM.history.commit();
      if (FM.history.undo() !== true || !FM.scene.layers.some(l => l.name === 'A')) throw new Error('CONTROL: a Full step’s undo was refused');
    });
  });

  test('simple P2.1 · FM.trimClipEdge gives the numbers Full’s A and D give, flat and ramped, forward and reversed, and an extend keeps the surviving frame', { item: '980' }, function () {
    smNeedP2();
    const mk = (rev, ramp) => { const l = FM.makeLayer('video', { name: 't', start: 2, duration: 4 }); l.trimStart = 1.5; l.reversed = rev; if (ramp) l.speed = { kf: [{ t: 2, v: 0.5, e: 'linear' }, { t: 6, v: 2, e: 'linear' }] }; return l; };
    const P0 = FM.scene; FM.scene = scene([], { project: { width: 320, height: 240, fps: 30, duration: 10, background: '#000' } });
    const t0 = FM.time;
    try {
      [[false, false], [true, false], [false, true], [true, true]].forEach(cfg => {
        const tag = (cfg[0] ? 'reversed' : 'forward') + (cfg[1] ? ' ramp' : ' flat');
        /* head: Full's A at 3.25 */
        const a = mk(cfg[0], cfg[1]), r = FM.trimClipEdge(a, 'head', 1.25, 20);
        FM.scene.layers = [a]; FM.scene.selectedId = a.id; FM.scene.selectedIds = [a.id]; FM.time = 3.25; FM.timeline.clipKey('a');
        if (Math.abs(r.duration - a.duration) > 1e-9 || Math.abs((r.trimStart || 0) - (a.trimStart || 0)) > 1e-6) throw new Error(tag + ' head: trimClipEdge ' + [r.duration, r.trimStart] + ' vs Full’s A ' + [a.duration, a.trimStart]);
        /* tail: Full's D at 4.5 */
        const d = mk(cfg[0], cfg[1]), rt = FM.trimClipEdge(d, 'tail', -1.5, 20);
        FM.scene.layers = [d]; FM.scene.selectedId = d.id; FM.scene.selectedIds = [d.id]; FM.time = 4.5; FM.timeline.clipKey('d');
        if (Math.abs(rt.duration - d.duration) > 1e-9 || Math.abs((rt.trimStart || 0) - (d.trimStart || 0)) > 1e-6) throw new Error(tag + ' tail: trimClipEdge ' + [rt.duration, rt.trimStart] + ' vs Full’s D ' + [d.duration, d.trimStart]);
        /* an extend keeps the source frame at a surviving time (Simple keeps the start: the frame moves by `landed`) */
        const e = mk(cfg[0], cfg[1]), src = FM.layerLocalTime(e, 4), re = FM.trimClipEdge(e, 'head', -0.5, 20);
        const e2 = Object.assign(JSON.parse(JSON.stringify(e)), { start: re.start, duration: re.duration, trimStart: re.trimStart });
        if (Math.abs(FM.layerLocalTime(e2, 4) - src) > 1e-3) throw new Error(tag + ' head extend moved the frame at t=4: ' + src + ' → ' + FM.layerLocalTime(e2, 4));
      });
      /* past the source: a forward head pulled back further than trimStart lands at the first frame, never before it */
      const f = mk(false, false), rf = FM.trimClipEdge(f, 'head', -5, 20);
      if (Math.abs(rf.trimStart) > 1e-9 || Math.abs(rf.landed + 1.5) > 1e-9) throw new Error('a head pulled back 5 s with 1.5 s of source before it landed ' + rf.landed + ' at trimStart ' + rf.trimStart);
      const g = mk(false, false), rg = FM.trimClipEdge(g, 'tail', 50, 7);
      if (Math.abs(rg.duration - 5.5) > 1e-9) throw new Error('a tail grown past the source should stop at 5.5 s, got ' + rg.duration);
    } finally { FM.scene = P0; FM.time = t0; }
  });

  test('simple P2.1 · a split pair Simple butted together over a jump in the footage gets its de-click back; an unmarked pair is today’s seam', { item: '980' }, function () {
    const mk = (s, d, tr, cut) => { const l = FM.makeLayer('video', { name: 'h', start: s, duration: d }); l.trimStart = tr; l.splitOf = 'lin1'; if (cut) l.sm = { cut: true }; return l; };
    const a = mk(0, 2, 0), jump = mk(2, 2, 5, true), cont = mk(2, 2, 2, true), plain = mk(2, 2, 5, false);
    const P0 = FM.scene;
    try {
      FM.scene = scene([a, plain]);
      if (!FM.declickSeamAt(plain, 2, [a, plain])) throw new Error('CONTROL (Full unchanged): an unmarked touching pair should be exempt from the ramps, as today');
      if (FM.declickSeamAt(jump, 2, [a, jump])) throw new Error('a marked pair whose footage jumps (2 → 5 s) is still exempt: it pops (#148)');
      if (!FM.declickSeamAt(cont, 2, [a, cont])) throw new Error('a marked pair whose footage carries straight on lost its exemption');
    } finally { FM.scene = P0; }
  });

  test('simple P2.1 · the live-gate predicate: an Editor counts, a Viewer does not, a remembered Editor does, a guest always, a linked copy does', { item: '980' }, function () {
    const C = FM.collab;
    if (!C || typeof C.othersCanEdit !== 'function') throw new Error('FM.collab.othersCanEdit is missing');
    const s0 = C.session, a0 = C.active, ui0 = C.ui && C.ui.roomEditors, list0 = FM.projects.list;
    const host = mem => ({ isOwner: true, active: true, host: { ownerMid: 'o', members: Object.assign({ o: { role: 'owner' } }, mem) } });
    try {
      C.active = true;
      if (C.ui) C.ui.roomEditors = () => [];
      C.session = host({ m1: { role: 'viewer' } });
      if (C.othersCanEdit()) throw new Error('a Viewer turned the gate on');
      C.session = host({ m1: { role: 'editor' } });
      if (!C.othersCanEdit()) throw new Error('a connected Editor did not turn the gate on');
      C.session = host({});
      if (C.ui) C.ui.roomEditors = () => ['r1'];
      if (!C.othersCanEdit()) throw new Error('an Editor still in the room’s member table (dropped, outbox alive) did not count');
      C.session = { isOwner: false, active: true };
      if (!C.othersCanEdit()) throw new Error('a guest can always be raced by the owner');
      C.session = null; C.active = false;
      FM.projects.list = () => [{ id: FM.storage.openProjectId(), collab: { v: 1 } }];
      if (!C.othersCanEdit()) throw new Error('a linked copy opened with no session did not count');
      FM.projects.list = () => [{ id: FM.storage.openProjectId(), collab: { v: 1, ended: 'left' } }];
      if (C.othersCanEdit()) throw new Error('a copy he has left still counted');
    } finally { C.session = s0; C.active = a0; if (C.ui) C.ui.roomEditors = ui0; FM.projects.list = list0; }
  });

  /* ═══ §3.9 INVARIANTS OVER SEEDED RANDOM MAIN TRACKS (T2). Off-grid lengths (11.21 s), float-noise joins, hairlines,
     0.012 s and 0.3 s overlaps, gaps, titles with keys on the clips, a whole-video watermark and a stay-put song. Each
     command runs through the REAL runner; after each: other seams unchanged, joins bit-exact, followers on their host at the
     same offset with their keys moved by the same d, stay-put items still, no clip under MIN_LEN, no black frame at any
     frame time that is not in a gap, and one undo restores the document byte for byte. The checker's own positive control
     breaks one join by 1e-9 s and must see it. */
  function smRand(seed) { let s = seed >>> 0; return () => { s = (s * 1664525 + 1013904223) >>> 0; return s / 4294967296; }; }
  function smTrack(seed, W, H) {
    const r = smRand(seed), n = 3 + Math.floor(r() * 4), out = [], lens = [11.21, 2.5, 0.8, 3.3333333, 1.04, 4.0104667];
    let t = r() < 0.2 ? 0.6 : 0;
    for (let i = 0; i < n; i++) {
      const d = lens[Math.floor(r() * lens.length)] * (0.6 + r() * 0.8);
      const c = smV('c' + i, t, d, W, H);
      out.push(c);
      if (r() < 0.6) out.push(smT('t' + i, t + d * r() * 0.6, Math.min(0.9, d * 0.3), W, H, { transform: Object.assign(FM.makeLayer('text', {}).transform, { opacity: smKf([[t + 0.05, 0], [t + 0.2, 1]]) }) }));
      const k = r();
      t = t + d + (k < 0.45 ? 0 : k < 0.6 ? 1e-12 : k < 0.7 ? 0.012 : k < 0.8 ? -0.012 : k < 0.9 ? 0.7 : -0.3);
    }
    const end = Math.max.apply(null, out.filter(l => l.type === 'video').map(l => l.start + l.duration));
    out.push(FM.makeLayer('shape', { name: 'WM', shape: 'rect', x: 20, y: 20, shapeW: 12, shapeH: 8, fill: '#fff', start: out[0].start, duration: end - out[0].start }));
    out.push(smSong('Song', 0, end + 3, W, H, { sm: { stay: true } }));
    return out.reverse();
  }
  function smSnapshot(R) {
    const by = new Map(FM.scene.layers.map(l => [l.id, l]));
    const keys = l => (FM.timedLists(l)).map(p => p.kf.map(k => k.t));
    return {
      main: R.main.filter(e => !e.slot).map(e => ({ id: e.id, start: by.get(e.id).start, dur: by.get(e.id).duration })),
      seams: R.main.filter(e => !e.slot).map((e, i, a) => i ? by.get(a[i - 1].id).start + by.get(a[i - 1].id).duration - by.get(e.id).start : null),
      fol: Object.keys(R.units).filter(id => R.units[id].host && R.units[id].kind !== 'main' && by.has(R.units[id].host) && by.has(id)).map(id => ({ id: id, host: R.units[id].host, off: by.get(id).start - by.get(R.units[id].host).start, keys: keys(by.get(id)), start: by.get(id).start })),
      pairs: (() => { const m = new Map(), c = R.main.filter(e => !e.slot); for (let i = 1; i < c.length; i++) { const a = by.get(c[i - 1].id), b = by.get(c[i].id); m.set(a.id + '|' + b.id, { diff: a.start + a.duration - b.start, as: a.start, bs: b.start }); } return m; })(),
      stay: FM.scene.layers.filter(l => l.sm && l.sm.stay).map(l => ({ id: l.id, start: l.start }))
    };
  }
  function smBlackFrames(R) {
    const by = new Map(FM.scene.layers.map(l => [l.id, l])), fps = FM.scene.project.fps || 30, clips = R.main.filter(e => !e.slot);
    if (!clips.length) return [];
    const bad = [], gaps = R.main.filter(e => e.seam && e.seam.kind === 'gap');
    for (let f = Math.ceil(clips[0].start * fps); f / fps < R.trackEnd; f++) {
      const t = clips[0].start + 0 + (f / fps - clips[0].start);
      if (gaps.some(e => { const i = R.main.indexOf(e); const lo = i ? R.main[i - 1].end : 0; return t >= lo - 1e-12 && t < e.start; })) continue;
      if (!clips.some(e => FM.isLayerVisibleAt(by.get(e.id), t))) bad.push(+t.toFixed(6));
    }
    return bad;
  }

  test('simple P2.1 · T2 the §3.9 invariants hold for delete, both trims, split, close gap and duplicate over 12 seeded random main tracks', { item: '980', budgetMs: 240000 }, async function () {
    smNeedP2();
    const fails = [];
    let ran = 0, controlSeen = false;
    for (let seed = 1; seed <= 12; seed++) {
      await smP2((W, H) => smTrack(seed * 7919, W, H), async function (v) {
        const r = smRand(seed);
        const cmds = ['del', 'trimTail', 'trimHead', 'split', 'seam', 'dup'];
        for (const cmd of cmds) {
          const R = FM.spine.classify(FM.scene), clips = R.main.filter(e => !e.slot);
          if (!clips.length) return;
          const pick = clips[Math.floor(r() * clips.length)], L = FM.layerById(FM.scene, pick.id);
          const before = smSnapshot(R), doc0 = v.doc(), black0 = smBlackFrames(R).length;
          let ok, seamAt = null;
          if (cmd === 'del') ok = await FM.spine.cmd.del(pick.id);
          else if (cmd === 'trimTail') ok = await FM.spine.cmd.trimTail(pick.id, L.start + L.duration * (0.3 + r() * 0.5), { typed: false });
          else if (cmd === 'trimHead') ok = await FM.spine.cmd.trimHead(pick.id, L.start + L.duration * (0.1 + r() * 0.4), { typed: false });
          else if (cmd === 'split') ok = await FM.spine.cmd.split(pick.id, L.start + L.duration * (0.3 + r() * 0.4));
          else if (cmd === 'seam') { const e = R.main.find(x => x.seam && (x.seam.kind === 'gap' || x.seam.kind === 'overlap') && !x.seam.covered); if (!e) continue; seamAt = e.id; ok = await FM.spine.cmd.closeSeam(e.id); }
          else ok = await FM.spine.cmd.duplicate(pick.id);
          if (!ok) continue;   // a refusal is legal (a blend, a short clip): it wrote nothing — checked below
          ran++;
          const R2 = FM.spine.classify(FM.scene), by = new Map(FM.scene.layers.map(l => [l.id, l]));
          const tag = 'seed ' + seed + ' ' + cmd + ' on ' + L.name;
          /* inv 4: nothing that had sm.stay before moved */
          before.stay.forEach(s => { const l = by.get(s.id); if (l && l.start !== s.start) fails.push(tag + ': stay-put ' + l.name + ' moved ' + s.start + ' → ' + l.start); });
          /* inv 1: a seam between two clips the command did not edit keeps its diff to 1e-9; one whose clips MOVED and that was a
             float-noise join is now bit-exact; a seam the command created that reads as a join is bit-exact too */
          const after = R2.main.filter(e => !e.slot);
          for (let i = 1; i < after.length; i++) {
            const a = by.get(after[i - 1].id), b = by.get(after[i].id), diff = a.start + a.duration - b.start;
            const was = before.pairs.get(a.id + '|' + b.id), moved = !was || was.as !== a.start || was.bs !== b.start;
            if (a.id === pick.id || b.id === pick.id || b.id === seamAt) { if (moved && Math.abs(diff) < 1e-9 && diff !== 0) fails.push(tag + ': a seam at the edit is ' + diff + ' s off bit-exact (' + a.name + '|' + b.name + ')'); continue; }
            if (was && Math.abs(was.diff) >= 1e-9 && Math.abs(diff - was.diff) > 1e-9) fails.push(tag + ': the seam ' + a.name + '|' + b.name + ' changed ' + was.diff + ' → ' + diff);
            if (moved && Math.abs(diff) < 1e-9 && diff !== 0) fails.push(tag + ': a moved join is ' + diff + ' s off bit-exact (' + a.name + '|' + b.name + ')');
          }
          /* inv 2 + 3: followers of untouched hosts kept host and offset; their keys moved with their start */
          before.fol.forEach(f => {
            const l = by.get(f.id), h = by.get(f.host); if (!l || !h || f.host === pick.id) return;
            const off = l.start - h.start;
            if (Math.abs(off - f.off) > 1e-9) fails.push(tag + ': ' + l.name + ' lost its offset on ' + h.name + ' (' + f.off + ' → ' + off + ')');
            const d = l.start - f.start, ks = FM.timedLists(l).map(p => p.kf.map(k => k.t));
            ks.forEach((list, i) => list.forEach((t, j) => { if (Math.abs(t - (f.keys[i][j] + d)) > 1e-9) fails.push(tag + ': a key of ' + l.name + ' moved by ' + (t - f.keys[i][j]) + ', not its d ' + d); }));
          });
          /* inv 7: no clip under MIN_LEN */
          after.forEach(e => { const l = by.get(e.id); if (l.duration < FM.spine.minLen(30) - 1e-6 && !before.main.some(m => m.id === l.id && m.dur < FM.spine.minLen(30))) fails.push(tag + ': ' + l.name + ' is ' + l.duration + ' s, under MIN_LEN'); });
          /* inv 13: no new black frame */
          const black = smBlackFrames(R2);
          if (black.length > black0) fails.push(tag + ': ' + (black.length - black0) + ' new black frame(s), first at ' + black[0]);
          /* inv 5: one undo restores byte for byte */
          FM.history.undo(); await v.sleep(5);
          if (v.doc() !== doc0) fails.push(tag + ': one undo did not restore the document byte for byte');
          FM.history.redo(); await v.sleep(5);
        }
        /* POSITIVE CONTROL for the checker: push one joined clip 1e-9 s late at a frame time — the black-frame check must see it */
        if (!controlSeen) {
          const R = FM.spine.classify(FM.scene), clips = R.main.filter(e => !e.slot);
          for (let i = 1; i < clips.length && !controlSeen; i++) {
            const a = FM.layerById(FM.scene, clips[i - 1].id), b = FM.layerById(FM.scene, clips[i].id);
            if (a.start + a.duration !== b.start) continue;
            const s0 = b.start, n0 = smBlackFrames(R).length, f = Math.ceil(b.start * 30) / 30;
            b.start = f + 1e-9; a.duration = f - a.start;   // a 1e-9 s gap sitting on a frame time
            const n1 = smBlackFrames(FM.spine.classify(FM.scene)).length;
            b.start = s0; a.duration = s0 - a.start;
            if (n1 > n0) controlSeen = true;
          }
        }
      });
    }
    if (ran < 30) throw new Error('only ' + ran + ' commands ran over 12 tracks — the fixture is refusing too much to prove anything');
    if (!controlSeen) throw new Error('CONTROL: the black-frame checker never saw a planted 1e-9 s gap on a frame time');
    if (fails.length) throw new Error(fails.length + ' invariant failure(s): ' + fails.slice(0, 4).join(' · '));
  });

  test('simple P2.1 · T2b a middle piece of a clip cut five times is deleted over 2,000 seeds at 24, 30 and 60 fps with no black frame; without the landing some seeds get one', { item: '980', budgetMs: 120000 }, async function () {
    smNeedP2();
    if (!FM.spine.planDelete || !FM.spine._applyPlan) throw new Error('FM.spine.planDelete / _applyPlan seams are missing');
    const P0 = FM.scene, t0 = FM.time;
    const run = async (fps, seed, noLand) => {
      const r = smRand(seed), src = 11.21, cuts = [];
      while (cuts.length < 5) { const t = Math.round((0.3 + r() * (src - 0.6)) * fps) / fps; if (cuts.every(c => Math.abs(c - t) > 0.2)) cuts.push(t); }
      cuts.sort((a, b) => a - b);
      const bounds = [0].concat(cuts, [src]), layers = [];
      for (let i = 0; i + 1 < bounds.length; i++) {
        const l = FM.makeLayer('video', { name: 'p' + i, x: 160, y: 120, start: 0, duration: 1 });
        l.start = bounds[i]; l.duration = bounds[i + 1] - bounds[i]; l.srcW = 320; l.srcH = 240; l.srcRev = 0; l.muted = true; l.sm = { main: true };
        layers.push(l);
      }
      FM.scene = scene(layers.slice().reverse(), { project: { width: 320, height: 240, fps: fps, duration: src, background: '#000', sm: { adopted: true, v: 1 } } });
      const R = FM.spine.classify(FM.scene), mid = R.main[1 + Math.floor(r() * (R.main.length - 2))];
      FM.spine._noLanding = !!noLand;
      try { const plan = FM.spine.planDelete(R, mid.id); if (plan.refuse) return 'refused'; await FM.spine._applyPlan(plan); }
      finally { FM.spine._noLanding = false; }
      const R2 = FM.spine.classify(FM.scene), clips = R2.main.map(e => FM.layerById(FM.scene, e.id));
      for (let f = 0; f / fps < R2.trackEnd - 1e-12; f++) if (!clips.some(l => FM.isLayerVisibleAt(l, f / fps))) return 'black at frame ' + f;
      return '';
    };
    try {
      let bad = [], ctl = 0, n = 0;
      for (const fps of [24, 30, 60]) for (let seed = 1; seed <= 700; seed++) {
        const a = await run(fps, seed * 31 + fps, false); n++;
        if (a && a !== 'refused') bad.push(fps + 'fps seed ' + seed + ': ' + a);
        if (seed <= 300 && (await run(fps, seed * 31 + fps, true))) ctl++;
      }
      if (bad.length) throw new Error(bad.length + ' of ' + n + ' deletes left a black frame: ' + bad.slice(0, 3).join(' · '));
      if (!ctl) throw new Error('CONTROL: with the landing switched off not one of 900 seeds left a black frame — this fixture cannot tell the two apart');
    } finally { FM.scene = P0; FM.time = t0; }
  });

  test('simple P2.1 · three commands tapped inside one await land as three steps in tap order, and a ⌘Z queued behind them undoes the last of them', { item: '980', budgetMs: 60000 }, async function () {
    smNeedP2();
    await smP2((W, H) => [smV('B', 6, 3, W, H), smV('A', 0, 6, W, H)], async function (v) {
      const n0 = v.steps(), A = v.L('A');
      FM.spine.cmd.split(A.id, 2);                               // runs: its split awaits the media reload…
      FM.spine.cmd.split(null, 4); FM.spine.cmd.del(v.L('B').id); // …so these two wait in the queue, in tap order
      const r = FM.history.undo();                               // …and this ⌘Z waits behind them (DESIGN §3.7)
      for (let i = 0; i < 8; i++) { await v.idle(); await v.sleep(80); }
      if (r !== false) throw new Error('⌘Z pressed during the run did not wait: it returned ' + r);
      const pieces = FM.scene.layers.filter(l => l.type === 'video' && (+l.start || 0) < 6 - 1e-9).length;
      if (v.steps() !== n0 + 3) throw new Error('three tapped commands gave ' + (v.steps() - n0) + ' step(s), not 3 (it said “' + v.say() + '”)');
      if (pieces !== 3) throw new Error('A should be in three pieces after two splits, it is in ' + pieces);
      if (!v.L('B')) throw new Error('the queued ⌘Z did not undo the last command (the delete of B)');
      if (!FM.history.canRedo()) throw new Error('the delete should be on the redo stack');
    });
  });
```

**Edits to Phase 1's tests in 2.1** (they asserted the inert Phase 1 behaviour 2.1 replaces): T19's ✂ clause flips, and
"the Phase 1 lines" test is removed (its four clauses are now the P2.1 delete, split, chip and lock tests):

#### 2.1.T1 `tests/tests.js`

Find (exactly once):

```js
        if (sp.getAttribute('aria-disabled') !== 'true' || !(parseFloat(getComputedStyle(sp).opacity) < 0.6)) throw new Error('✂ is not dimmed and aria-disabled in Phase 1');
```

Replace with:

```js
        if (sp.getAttribute('aria-disabled') === 'true' || !(parseFloat(getComputedStyle(sp).opacity) > 0.9)) throw new Error('✂ is still dimmed or aria-disabled — it splits from Phase 2.1');
```

#### 2.1.T2 `tests/tests.js`

Remove the whole test that starts `  test('simple P1 · the Phase 1 lines: Delete on a main clip, ✂, S and a seam chip each say their line with Open in Full and change nothing', { item: '980' }, async function () {` and ends at its closing `  });` (the line before `  /* T21 (DESIGN §8.8)`), and put in its place:

```js
  /* Phase 2.1 RETIRED "the Phase 1 lines" test: Delete, ✂, S and the seam chip now do their command; the P2.1 tests
     (delete, split, gap chip) assert what each does, and that Full's own keys are unchanged. */

```


#### 2.1.T3 `tests/tests.js` (added by the review, §14: the whole suite at 1280 was red here)

`921 S2 the collab core is inert until a session is attached…` pins every key of `FM.collab`, and 2.1.21 adds two read-only
answers. Without this edit the suite is red with *"FM.collab gained isLinkedCopy, othersCanEdit"* and `ship.sh` refuses.

Find (exactly once):

```js
      'runPendingReload', 'leaving'];
    const extra = Object.keys(C).filter(function (k) { return allowed.indexOf(k) < 0; });
```

Replace with:

```js
      'runPendingReload', 'leaving',
      /* Simple mode P2 (queue 980): the live gate's one predicate and the linked-copy test it uses — answers, not state;
         with no session they read the project list only and change nothing. Full never calls them. */
      'isLinkedCopy', 'othersCanEdit'];
    const extra = Object.keys(C).filter(function (k) { return allowed.indexOf(k) < 0; });
```

#### 2.1.T4 `tests/tests.js` (added by the review, §14)

`921 S0 nothing leaves the device…` reads `js/history.js` for its collab seams, and 2.1.12 / 2.1.15 pass the step's meta to
`afterCommit`. Without this edit: *"1 of the 11 collab seams are missing or no longer guarded: history.commit → afterCommit"*.

Find (exactly once):

```js
        ['../js/history.js', /if \(cb\) FM\.collab\.afterCommit\(\)/, 'history.commit → afterCommit'],
```

Replace with:

```js
        ['../js/history.js', /if \(cb\) FM\.collab\.afterCommit\((meta)?\)/, 'history.commit → afterCommit'],   // Simple mode P2: with the step's meta
```

### 3.7 How each test fails on the tree before 2.1 (Phase 1 only), at 1280 and at 380 (same message at both)

| Test | Fails before as | Kind |
|---|---|---|
| simple P2.1 · Delete on a main clip closes the gap and takes what is on it (D5): one undo step, the join bit-exact, Full’s delete unchanged | Backspace on main clip B in Simple left it in place (it said: “Deleting clips comes nextOpen in Full”) | behaviour |
| simple P2.1 · D trims the tail and a title cut off slides back onto its clip (D6); A trims the head and the clip keeps its slot | D did not trim A to the playhead: 5 (it said “Splitting comes in the next updateOpen in Full”) | behaviour |
| simple P2.1 · S and ✂ split at the playhead with the clip’s sound twin; too near an edge says so and writes nothing | S did not split the clip and its twin: 0 new layer(s) (it said “Splitting comes in the next updateOpen in Full”) | behaviour |
| simple P2.1 · tapping a gap chip closes it exactly and an overlap chip fixes it; what follows moves along | the gap chip did not close the gap exactly: B at 5.2 (it said “Closing gaps comes in the next updateOpen in Full”) | behaviour |
| simple P2.1 · ⌘D duplicates a main clip right after itself with its keys; what follows moves along; one undo removes it | ⌘D on a main clip made no copy (it said “Duplicating clips comes nextOpen in Full”) | behaviour |
| simple P2.1 · a locked clip in the way stops the edit with Do it anyway, which waits for the finger and keeps the lock (D7) | the locked line is missing: “Deleting clips comes nextOpen in Full” | behaviour |
| simple P2.1 · Delete cuts what runs on across the deleted clip (cases i–iii) and pins it; a title on the clip goes with it | B was not deleted (it said “Deleting clips comes nextOpen in Full”) | behaviour |
| simple P2.1 · ⌘Z pressed while a command is still running waits and undoes exactly that command; in Full ⌘Z is immediate | the split was not running when ⌘Z was pressed — nothing to queue (it said “Splitting comes in the next updateOpen in Full”) | behaviour |
| simple P2.1 · with a friend who can edit in the session, moving clips waits (D14), a split still goes live, and undo cannot send a ripple | FM.spine.edit is missing — js/spine-edit.js did not load | module absent (presence only) |
| simple P2.1 · FM.trimClipEdge gives the numbers Full’s A and D give, flat and ramped, forward and reversed, and an extend keeps the surviving frame | FM.spine.edit is missing — js/spine-edit.js did not load | module absent (presence only) |
| simple P2.1 · a split pair Simple butted together over a jump in the footage gets its de-click back; an unmarked pair is today’s seam | a marked pair whose footage jumps (2 → 5 s) is still exempt: it pops (#148) | behaviour |
| simple P2.1 · the live-gate predicate: an Editor counts, a Viewer does not, a remembered Editor does, a guest always, a linked copy does | FM.collab.othersCanEdit is missing | module absent (presence only) |
| simple P2.1 · T2 the §3.9 invariants hold for delete, both trims, split, close gap and duplicate over 12 seeded random main tracks | FM.spine.edit is missing — js/spine-edit.js did not load | module absent (presence only) |
| simple P2.1 · T2b a middle piece of a clip cut five times is deleted over 2,000 seeds at 24, 30 and 60 fps with no black frame; without the landing some seeds get one | FM.spine.edit is missing — js/spine-edit.js did not load | module absent (presence only) |
| simple P2.1 · three commands tapped inside one await land as three steps in tap order, and a ⌘Z queued behind them undoes the last of them (added by the review, §14) | three tapped commands gave 2 step(s), not 3 (it said “Splitting comes in the next updateOpen in Full”) on Phase 1; **on the 2.1 tree as first written**: “gave 2 step(s) … Undo skipped — something else changed first” (the bug it was written for) | behaviour |

### 3.8 Mutation proofs (each seam kept, one rule broken; run alone at 1280 on the finished 2.1 tree)

| # | File | The rule broken | Test | Result |
|---|---|---|---|---|
| M1 | `js/spine-edit.js` | `if (landAt != null) addLand(p, e.id, landAt); else addMove(p, e.id, d);` → `addMove(p, e.id, d);` | simple P2.1 · T2 the | **survived** |
| M2 | `js/spine-edit.js` | `if (!C \|\| !C.othersCanEdit \|\| !C.othersCanEdit()) return '';` → `return '';` | simple P2.1 · with a friend | **caught**: FAILsimple P2.1 · with a friend who can edit in the session, moving clips waits (D14), a split still goes live, and undo cannot send a ripple — a delete went through with an editor in the session |
| M3 | `js/collab-session.js` | `if (st.arr && window.FM && FM.spine && FM.spine.undoGate) {` → `if (false) {` | simple P2.1 · with a friend | **caught**: FAILsimple P2.1 · with a friend who can edit in the session, moving clips waits (D14), a split still goes live, and undo cannot send a ripple — undoing an arranging step with an editor in went through |
| M4 | `js/history.js` | `undo() { if (FM.spine && FM.spine.running && FM.spine.queueStep) return FM.spine.queueStep` → `undo() {` | simple P2.1 · ⌘Z pressed | **caught**: FAILsimple P2.1 · ⌘Z pressed while a command is still running waits and undoes exactly that command; in Full ⌘Z is immediate — undo during the run returned undefined instead of waiting |
| M5 | `js/spine-edit.js` | `if (dt < 0 && fs >= newEnd - R.eps) {` → `if (false) {` | simple P2.1 · D trims | **caught**: FAILsimple P2.1 · D trims the tail and a title cut off slides back onto its clip (D6); A trims the head and the clip keeps its slot — the title whose first frame was cut away did not slide back onto A |
| M6 | `js/app.js` | `if (!(later.sm && later.sm.cut === true)) return true;` → `return true;` | simple P2.1 · a split pair | **caught**: FAILsimple P2.1 · a split pair Simple butted together over a jump in the footage gets its de-click back; an unmarked pair is today’s seam — a marked pair whose footage jumps (2 → 5 s) is still exempt: |
| M7 | `js/collab-core.js` | `m[mid] && m[mid].role === 'editor')) return true;` → `m[mid] && m[mid].role !== 'owner')) return true;` | simple P2.1 · the live-gate predicate | **caught**: FAILsimple P2.1 · the live-gate predicate: an Editor counts, a Viewer does not, a remembered Editor does, a guest always, a linked copy does — a Viewer turned the gate on |
| M8 | `js/spine-edit.js` | `else tr = tr0 + FM.speedAdvanceOver(layer, nd, d0);` → `else tr = tr0 - FM.speedAdvanceOver(layer, nd, d0);` | simple P2.1 · FM.trimClipEdge | **caught**: FAILsimple P2.1 · FM.trimClipEdge gives the numbers Full’s A and D give, flat and ramped, forward and reversed, and an extend keeps the surviving frame — reversed ramp tail: trimClipEdge 2.5,-1.078125 |
| M9 | `js/spine-edit.js` | `if (lk.length && !opts.unlock) return refuse(` → `if (false) return refuse(` | simple P2.1 · a locked clip | **caught**: FAILsimple P2.1 · a locked clip in the way stops the edit with Do it anyway, which waits for the finger and keeps the lock (D7) — the locked line is missing: “” |
| M10 | `js/spine-edit.js` | `const removes = [c.id].concat(R.followers[c.id] \|\| []);` → `const removes = [c.id];` | simple P2.1 · Delete on a main clip | **caught**: FAILsimple P2.1 · Delete on a main clip closes the gap and takes what is on it (D5): one undo step, the join bit-exact, Full’s delete unchanged — the title on B was not deleted with it (D5) |
| M11 | `js/simple-timeline.js` | `const armed = () => up && performance.now() - t0 >= 400;` → `const armed = () => true;` | simple P2.1 · a locked clip | **caught**: FAILsimple P2.1 · a locked clip in the way stops the edit with Do it anyway, which waits for the finger and keeps the lock (D7) — §3.12 rule 5: Do it anyway fired before it was armed (a double tap wou |
| M12 | `js/spine-edit.js` | `const r = FM.trimClipEdge(B, 'head', len, srcDurOf(B));` → `const r = FM.trimClipEdge(B, 'head', 0, srcDurOf(B));` | simple P2.1 · Delete cuts | **caught**: FAILsimple P2.1 · Delete cuts what runs on across the deleted clip (cases i–iii) and pins it; a title on the clip goes with it — (iii) the song was not split at 4 with its second half trimmed by 4 s:  |
| M13 | `js/spine-edit.js` | `if (gated) { const g = S.arrangeGate(); if (g) return refuse(g, {}, R); }` → `(removed)` | simple P2.1 · with a friend | **caught**: FAILsimple P2.1 · with a friend who can edit in the session, moving clips waits (D14), a split still goes live, and undo cannot send a ripple — a delete went through with an editor in the session |
| M1b | `js/spine-edit.js` | `if (landAt != null) addLand(p, e.id, landAt); else addMove(p, e.id, d);` → `addMove(p, e.id, d);` | simple P2.1 · T2b | **caught**: FAILsimple P2.1 · T2b … — 99 of 2100 deletes left a black frame: 24fps seed 1: black at frame … |
| Q1 (review) | `js/spine-edit.js` | `if (e.kind !== 'edit' && seq() - e.seq > 1)` → `if (seq() - e.seq > 1)` (the stamp applied to edits again) | simple P2.1 · three commands tapped | **caught at 380**: three tapped commands gave 2 step(s), not 3 |
| Q2 (review) | `js/spine-edit.js` | `seq: seq() + S.queue.filter(q => q.kind === 'edit').length` → `seq: seq()` | simple P2.1 · three commands tapped | **caught at 1280**: the queued ⌘Z did not undo the last command (the delete of B) |
| G1 (review, Full containment) | `js/app.js` | `if (!(later.sm && later.sm.cut === true)) return true;` → removed (continuity demanded of every pair, Full's too) | simple P2.1 · a split pair | **caught at 1280 and 380**: CONTROL (Full unchanged): an unmarked touching pair should be exempt from the ramps, as today |
| G4 (review, Full containment) | `js/collab-session.js` | `if (meta && meta.arr === true) st.arr = true;` → `st.arr = true;` (every step, Full's too, behind the gate) | simple P2.1 · with a friend | **caught at 1280**: CONTROL: a Full step’s undo was refused |

**The "module absent" five** (the D14 test, the trimClipEdge test, the predicate test, T2 and T2b fail before only because
`FM.spine.edit` / `FM.collab.othersCanEdit` are missing): M2, M3, M7, M8, M13 and M1b are their behaviour proofs. **M1
survived T2's 12 seeds** (a `+= d` without landing rarely lands on a frame time in so few seeds), which is why T2b exists;
M1b is the same mutation against T2b, caught. The builder repeats this table with `tools/mutate.sh` and records it in #980.

---

## 4. Release 2.2: the tools (D10)

**POLISH-LOG line (template):** `- vX.YY — queue 980 (partial) — the Simple editor's tools: tap a clip and its tools fill
one row under the timeline (Length, Move earlier, Move later, Lift off, Duplicate, Crop, Close gap, More, Delete; an
overlay's Into row, Forward, Back, Stay put; a title's Edit words), and the row under that never goes away: Clips, Text,
Sound, Overlay (D10). On a computer both rows sit at the bottom of the left panel and a tool's panel opens above them
(D20). The + and Clips add clips end to end before an end card; Clips can put them after the clip at the playhead; Simple's
⋯ has Close all gaps; a black band shows what runs past the last clip, with End with the video for a picture (a song runs
on, D17 B). Alt+← / → move a clip. Full is unchanged.`

**He sees** (pictures in §4.10): on the phone, tapping a clip no longer raises today's panel: its tools fill the row under
the timeline and the project tools sit under that; **More** raises today's panel for everything else (until 2.3 and Phase 3
give Simple its own Speed, Volume, Look, Effects panels). On the PC the same two rows are at the bottom of the left band.
**D's:** D10 A, D17 B, D20 A, D16 A (the V10 icons). **Full:** unchanged (the phone sheet, the band's Add menu and layer
editor, the ⋯ strip are exactly today's; each Simple branch returns at once when Simple is not on screen).

### 4.1 What it does

- **One wrapper, two homes** (`#sm-bar` = `#sm-say` holding `#sm-tray` + the line, and `#sm-tools`): `FM.simpleTools`
  moves it under the Simple timeline on a phone and to the bottom of `#inspector-panel` on a PC (at the 700 px crossing
  too), so each tool has one element. The tray row is the same 52 px row Phase 1 reserved for `#sm-say`, so no row moves:
  a line takes the row for a moment and a selection change dismisses it (§3.12 rule 1b).
- **Selection no longer raises a panel in Simple** (D10): `js/mobile.js` `syncSheet` and `js/inspector.js` `refresh` each
  ask `FM.simpleTools` first; both answers are false whenever Simple is not on screen.
- **The commands** (all through 2.1's runner, so each is one step, gated, lockable): **Append** (the +, Clips › At the end;
  arranging only when it moves an end card, so a clips-only append works live on an adopted project), **Insert** (Clips ›
  After Clip N, at `insertIndexAt`'s nearest cut), **Reorder** (Move earlier / later and Alt+← / →: one slot, the clip
  carrying its trailing seam, laid out in the new order with exact landings), **Lift off** (the clip leaves the row and goes
  up into the overlay band under its own titles, which stay put), **Into row**, **Stay put**, **Forward / Back** (z, never
  across the clip row), **Close all gaps**, **End with the video** (pictures only), and the adds **Text** (at the playhead,
  held inside the video, opens for typing), **Overlay**, **Sound › Music** (Stay put, whole, D17 B). Files are read
  **before** the runner (`S.readPicked`), so a picker or a slow decode never sits inside an undo step; sound files in a
  Clips pick go in as music, never onto the clip row (§7.3).

### 4.2 New file `js/simple-tools.js` (whole file)

```js
/* FreeMotion — FM.simpleTools: the Simple editor's two rows (Simple mode Phase 2, DESIGN.md §8.2, §8.3, §8.5; his D10).
 *
 * THE TRAY ROW (#sm-tray, inside #sm-say): the selected item's tools; with nothing selected, one quiet line ("4 clips ·
 * 0:15"). #sm-say's lines take the same 52 px row for a moment (§3.12), so nothing appears, disappears or moves.
 * THE PROJECT TOOLS ROW (#sm-tools): Clips · Text · Sound · Overlay — it never goes away (D10 A). Phase 3 adds Captions,
 * Look for all, Effects and Ask to the same row.
 * Phone: both rows sit under the Simple timeline; a tool that needs a panel opens today's panel docked under the tray
 * (js/mobile.js dockSheet). PC: both rows sit at the bottom of the left band, the panel above them (D20 A, his pick).
 *
 * One home per control (§8.5, his #310): Split is the play bar's ✂, Close all gaps is Simple's ⋯, Add clips is the clip
 * row's + and Clips. Every command goes through FM.spine.cmd, so it is one undo step and refuses with a line when it must.
 * Built with createElement / textContent; the icons are fixed SVG strings (the D16 A set, tools/design/.../vis/kit.js).
 */
window.FM = window.FM || {};
(function (FM) {
  'use strict';
  const ICON = {
    clips: '<rect x="3" y="5" width="18" height="14" rx="2"/><path d="M7.5 5v14M16.5 5v14M3 9.7h4.5M3 14.3h4.5M16.5 9.7H21M16.5 14.3H21"/>',
    text: '<path d="M6.4 18.6L12 5.2l5.6 13.4"/><path d="M8.5 14.2h7"/>',
    music: '<path d="M9 17.5V6l10-2v11.5"/><circle cx="6.5" cy="17.5" r="2.5"/><circle cx="16.5" cy="15.5" r="2.5"/>',
    overlay: '<rect x="3" y="3" width="13" height="13" rx="2"/><rect x="8" y="8" width="13" height="13" rx="2" fill="currentColor" fill-opacity=".22"/>',
    length: '<path d="M3.5 5v14M20.5 5v14M7 12h10M10 9l-3 3 3 3M14 9l3 3-3 3"/>',
    earlier: '<rect x="12" y="6" width="8.5" height="12" rx="2"/><path d="M8.5 9l-3.5 3 3.5 3M5 12h5"/>',
    later: '<rect x="3.5" y="6" width="8.5" height="12" rx="2"/><path d="M15.5 9l3.5 3-3.5 3M19 12h-5"/>',
    lift: '<path d="M12 15V5M8 9l4-4 4 4M5 19.5h14"/>',
    drop: '<path d="M12 5v10M8 11l4 4 4-4M5 19.5h14"/>',
    duplicate: '<rect x="3" y="13" width="8" height="8" rx="1.5"/><rect x="13" y="3" width="8" height="8" rx="1.5"/><path d="M7 13V9a2 2 0 0 1 2-2h4"/>',
    crop: '<path d="M6.5 3v14.5H21M3 6.5h14.5V21"/>',
    delete: '<path d="M4 7h16M9 7V5h6v2M6 7l1 13h10l1-13M10 11v6M14 11v6"/>',
    pin: '<path d="M9 3.5h6l-.8 5.5 3.3 3.2H6.5L9.8 9z"/><path d="M12 12.2V20.5"/>',
    forward: '<rect x="3.5" y="10" width="10" height="10" rx="2"/><rect x="10.5" y="4" width="10" height="10" rx="2" fill="currentColor" fill-opacity=".28"/>',
    backward: '<rect x="10.5" y="4" width="10" height="10" rx="2"/><rect x="3.5" y="10" width="10" height="10" rx="2" fill="currentColor" fill-opacity=".28"/>',
    editwords: '<path d="M4 6h11M9.5 6v12M18 7v11M16 7h4M16 18h4"/>',
    more: '<circle cx="5" cy="12" r="1.4"/><circle cx="12" cy="12" r="1.4"/><circle cx="19" cy="12" r="1.4"/>',
    check: '<path d="M5 12.5l4.5 4.5L19 7.5"/>',
    minus: '<path d="M5 12h14"/>', plus: '<path d="M12 5v14M5 12h14"/>',
    editor: '<rect x="3" y="4" width="10" height="4" rx="1.3"/><rect x="8" y="10" width="13" height="4" rx="1.3"/><rect x="5" y="16" width="9" height="4" rx="1.3"/>',
    back: '<path d="M15 5l-7 7 7 7"/>'
  };
  const svg = n => '<svg viewBox="0 0 24 24" class="sm-ico" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">' + (ICON[n] || ICON.more) + '</svg>';
  const W = () => (FM.spineWords && FM.spineWords.tools) || {};
  const phone = window.matchMedia ? window.matchMedia('(max-width: 700px)') : { matches: false };
  let bar = null, sayEl = null, tray = null, tools = null, menu = null;
  let panelFor = null, lengthFor = null, lengthEdge = 'end', lastSig = '', lastSel = null;
  const isSimple = () => !!(FM.editor && FM.editor.isSimple && FM.editor.isSimple());
  function el(tag, cls, text) { const d = document.createElement(tag); if (cls) d.className = cls; if (text != null) d.textContent = text; return d; }

  /* The two rows live in ONE wrapper (#sm-bar), moved between layouts: phone → under the Simple timeline's rows; PC → the
     bottom of the left band. One element, so the tools have one home on both. */
  function place() {
    if (!bar) return;
    const host = phone.matches ? document.getElementById('sm-timeline') : document.getElementById('inspector-panel');
    if (!host) return;
    if (phone.matches) { const sc = document.getElementById('sm-scroll'); if (bar.parentNode !== host || bar.previousElementSibling !== sc) host.insertBefore(bar, sc ? sc.nextSibling : host.firstChild); }
    else if (bar.parentNode !== host || host.lastElementChild !== bar) host.appendChild(bar);
  }
  function mount() {
    if (bar) return true;
    bar = document.getElementById('sm-bar'); sayEl = document.getElementById('sm-say');
    tray = document.getElementById('sm-tray'); tools = document.getElementById('sm-tools');
    if (!bar || !tray || !tools) { bar = null; return false; }
    if (phone.addEventListener) phone.addEventListener('change', () => { place(); lastSig = ''; FM.simpleTools.sync(); });
    buildTools();
    /* Simple's ⋯ (§8.2): Close all gaps when there is one, then everything else in Full's own ⋯ strip. Capture phase, and
       only while Simple is on screen, so Full's ⋯ is exactly today's. */
    const opts = document.getElementById('btn-opts');
    if (opts) opts.addEventListener('click', e => { if (!isSimple() || FM._smOptsPass) return; e.stopImmediatePropagation(); e.preventDefault(); optsMenu(opts); }, true);
    document.addEventListener('pointerdown', e => { if (menu && !menu.contains(e.target)) closeMenu(); }, true);
    return true;
  }
  function tool(t) {
    const b = el('button', 'sm-tool' + (t.pin ? ' sm-pin' : ''));
    b.type = 'button'; b.dataset.tool = t.id;
    b.innerHTML = svg(t.icon);                                        // a fixed string, never user data
    b.appendChild(el('span', 'sm-tool-l', t.label));
    b.title = t.title || t.label; b.setAttribute('aria-label', t.title || t.label);
    if (t.pressed != null) b.setAttribute('aria-pressed', t.pressed ? 'true' : 'false');
    if (t.disabled) b.setAttribute('aria-disabled', 'true');
    b.addEventListener('click', e => { e.stopPropagation(); if (b.getAttribute('aria-disabled') === 'true') { if (t.why && FM.spine) FM.spine.say(t.why); return; } closeMenu(); t.run(b); });
    return b;
  }

  /* ═══ THE PROJECT TOOLS (§8.5): nothing needs to be selected. ═══ */
  function pick(accept, multiple, cb) {
    const inp = el('input'); inp.type = 'file'; inp.accept = accept; inp.multiple = !!multiple;
    inp.addEventListener('change', () => { const f = Array.from(inp.files || []); if (f.length) cb(f); });
    inp.click();
  }
  function clipsTool() {
    const S = FM.spine, R = S.read(FM.scene), w = W(), t = FM.time || 0, clips = R.main.filter(e => !e.slot);
    const inside = clips.length && t > clips[0].start + R.eps && t < R.trackEnd - R.eps;
    if (!inside) { pick('video/*,image/*,audio/*', true, f => S.cmd.append(f)); return; }
    const j = S.insertIndexAt(R, t);
    const after = j === 0 ? w.beforeFirst : (w.afterClip || 'After ') + S.itemWord(FM.layerById(FM.scene, R.main[j - 1].id), R);
    S.say(w.addWhere || 'Add clips', { buttons: [
      { label: w.atEnd || 'At the end', fn: () => pick('video/*,image/*,audio/*', true, f => S.cmd.append(f)) },
      { label: after, fn: () => pick('video/*,image/*,audio/*', true, f => S.cmd.insert(f, j)) }
    ] });
  }
  function soundTool(b) {
    const w = W();
    openMenu(b, [
      { label: w.music || 'Music from your files', run: () => pick('audio/*,video/*', true, f => FM.spine.cmd.addMusic(f)) },
      { label: w.sfx || 'Sound effects', run: () => { if (FM.sfx && FM.sfx.open) FM.sfx.open(); } },
      { label: w.voice || 'Record voice', run: () => { if (FM.voiceRec && FM.voiceRec.open) FM.voiceRec.open(); } }
    ]);
  }
  function buildTools() {
    const w = W();
    tools.textContent = '';
    [{ id: 'clips', label: w.clips || 'Clips', icon: 'clips', run: clipsTool },
     { id: 'text', label: w.text || 'Text', icon: 'text', run: () => FM.spine.cmd.addText() },
     { id: 'sound', label: w.sound || 'Sound', icon: 'music', run: soundTool },
     { id: 'overlay', label: w.overlay || 'Overlay', icon: 'overlay', run: () => pick('video/*,image/*', true, f => FM.spine.cmd.addOverlay(f)) }
    ].forEach(t => tools.appendChild(tool(t)));
  }

  /* ═══ THE TRAY (§8.5): the selected item's tools, the tools that define its kind first, 🗑 pinned at the right end. ═══ */
  function trayFor(R, id) {
    const S = FM.spine, w = W(), l = FM.layerById(FM.scene, id), u = R.units[id];
    if (!l) return [];
    const del = { id: 'delete', label: w.delete || 'Delete', icon: 'delete', pin: true, run: () => { if (R.isMain(id)) S.cmd.del(id); else if (FM.deleteLayer) FM.deleteLayer(id); } };
    const stayOn = !!(l.sm && l.sm.stay);
    const stay = { id: 'stay', label: w.stay || 'Stay put', icon: 'pin', pressed: stayOn, run: () => S.cmd.stay(id, !stayOn) };
    const more = { id: 'more', label: w.more || 'More', icon: 'more', title: w.moreTitle, run: () => FM.simpleTools.openPanel(id) };
    const crop = { id: 'crop', label: w.crop || 'Crop', icon: 'crop', run: () => { if (FM.cropTool && FM.cropTool.start) FM.cropTool.start(id); } };
    if (R.isMain(id)) {
      const i = R.main.findIndex(e => e.id === id), sb = R.main[i].seam, na = R.main[i + 1], sa = na && na.seam;
      const out = [
        { id: 'length', label: w.length || 'Length', icon: 'length', run: () => FM.simpleTools.openLength(id) },
        { id: 'earlier', label: w.earlier || 'Move earlier', icon: 'earlier', disabled: S.moveIndexFor(R, id, -1) < 0, run: () => S.cmd.move(id, -1) },
        { id: 'later', label: w.later || 'Move later', icon: 'later', disabled: S.moveIndexFor(R, id, 1) < 0, run: () => S.cmd.move(id, 1) },
        { id: 'lift', label: w.lift || 'Lift off', icon: 'lift', title: w.liftTitle, run: () => S.cmd.lift(id) },
        { id: 'duplicateClip', label: w.duplicate || 'Duplicate', icon: 'duplicate', run: () => S.cmd.duplicate(id) },
        crop
      ];
      /* §8.2: a clip next to a gap or an overlap offers Close gap / Fix too (the seam chip's command) */
      const seamTool = (e, s) => ({ id: 'seam', label: s.kind === 'gap' ? (w.closeGap || 'Close gap') : (w.fix || 'Fix'), icon: 'check', run: () => S.cmd.closeSeam(e.id) });
      if (sb && (sb.kind === 'gap' || sb.kind === 'overlap') && !sb.covered) out.push(seamTool(R.main[i], sb));
      else if (sa && (sa.kind === 'gap' || sa.kind === 'overlap') && !sa.covered) out.push(seamTool(na, sa));
      out.push(more, del);
      return out;
    }
    const k = u ? u.kind : '';
    if (k === 'text') return [{ id: 'editwords', label: w.editWords || 'Edit words', icon: 'editwords', run: () => { if (FM.textEdit && FM.textEdit.start) FM.textEdit.start(id, { selectAll: true }); } }, stay, more, del];
    if (k === 'captions') return [more, del];
    if (k === 'audio') return [stay, more, del];
    if (k === 'effect') return [stay, more, del];
    if (k === 'block' || k === 'fullOnly') return [{ id: 'openFull', label: w.openFull || 'Open in Full', icon: 'editor', run: () => FM.editor && FM.editor.request('full') }, del];
    if (k === 'undecided') return [];
    return [   // overlays, stickers, pictures, a background
      { id: 'into', label: w.into || 'Into row', icon: 'drop', title: w.intoTitle, run: () => S.cmd.intoRow(id) },
      crop,
      { id: 'forward', label: w.forward || 'Forward', icon: 'forward', run: () => S.cmd.z(id, 1) },
      { id: 'backward', label: w.backward || 'Back', icon: 'backward', run: () => S.cmd.z(id, -1) },
      stay, more, del];
  }
  /* LENGTH (§8.5): the clip's length with − and + of one frame each and a typed value; it commits a ripple trim exactly as
     D does. The row itself is the panel (a thin one), so the timeline above it never moves. "Start" trims the head. */
  function lengthRow(R, id) {
    const S = FM.spine, w = W(), l = FM.layerById(FM.scene, id), fps = FM.scene.project.fps || 30;
    const row = [];
    const back = tool({ id: 'lenBack', label: w.done || 'Done', icon: 'back', run: () => { lengthFor = null; lastSig = ''; FM.simpleTools.sync(); } });
    const which = tool({ id: 'lenEdge', label: lengthEdge === 'end' ? (w.lenEnd || 'End') : (w.lenStart || 'Start'), icon: 'length', pressed: lengthEdge === 'start', run: () => { lengthEdge = lengthEdge === 'end' ? 'start' : 'end'; lastSig = ''; FM.simpleTools.sync(); } });
    const step = sign => tool({ id: sign < 0 ? 'lenMinus' : 'lenPlus', label: sign < 0 ? (w.minusFrame || '−1 frame') : (w.plusFrame || '+1 frame'), icon: sign < 0 ? 'minus' : 'plus', title: sign < 0 ? (w.shorter || 'One frame shorter') : (w.longer || 'One frame longer'),
      run: () => { const L = FM.layerById(FM.scene, id); if (!L) return; if (lengthEdge === 'end') S.cmd.length(id, L.duration + sign / fps); else S.cmd.trimStartBy(id, -sign / fps); } });
    const val = el('input', 'sm-len-v'); val.type = 'text'; val.inputMode = 'decimal'; val.value = l ? l.duration.toFixed(2) : '';
    val.setAttribute('aria-label', w.lengthLabel || 'Length in seconds');
    val.addEventListener('keydown', e => { if (e.key !== 'Enter') return; e.preventDefault(); const v = parseFloat(val.value); const L = FM.layerById(FM.scene, id); if (!isFinite(v) || !L) return; if (lengthEdge === 'end') S.cmd.length(id, v); else S.cmd.trimStartBy(id, L.duration - v); val.blur(); });
    row.push(back, which, step(-1), val, step(1));
    return row;
  }

  function quietLine(R) {
    const clips = R.main.filter(e => !e.slot), sum = (FM.spineWords && FM.spineWords.summary) ? FM.spineWords.summary(clips.length, R.trackEnd || 0) : '';
    const p = el('div', 'sm-quiet', sum);
    return p;
  }

  /* ═══ Simple's ⋯ and the Sound tool's choices: a small list above the button, one ≥ 44 px row per choice. ═══ */
  function closeMenu() { if (menu) { menu.remove(); menu = null; } }
  function openMenu(anchor, items) {
    closeMenu();
    menu = el('div', 'sm-menu'); menu.setAttribute('role', 'menu');
    items.forEach(it => { const b = el('button', 'sm-menu-i', it.label); b.type = 'button'; b.setAttribute('role', 'menuitem'); b.addEventListener('click', e => { e.stopPropagation(); closeMenu(); it.run(); }); menu.appendChild(b); });
    document.body.appendChild(menu);
    const r = anchor.getBoundingClientRect(), mr = menu.getBoundingClientRect();
    const left = Math.max(8, Math.min(window.innerWidth - mr.width - 8, r.left));
    const top = r.top - mr.height - 6 >= 8 ? r.top - mr.height - 6 : r.bottom + 6;
    menu.style.left = left + 'px'; menu.style.top = top + 'px';
    const first = menu.querySelector('button'); if (first) first.focus({ preventScroll: true });
  }
  function optsMenu(btn) {
    const S = FM.spine, R = S.read(FM.scene), w = W();
    const anyGap = R.main.some(e => e.seam && !e.seam.covered && (e.seam.kind === 'gap' || e.seam.kind === 'overlap'));
    const items = [];
    if (anyGap) items.push({ label: w.closeAll || 'Close all gaps', run: () => S.cmd.closeAll() });
    items.push({ label: w.moreOpts || 'Loop and preview speed…', run: () => { const o = document.getElementById('btn-opts'); if (o && FM.editor) { FM._smOptsPass = true; o.click(); FM._smOptsPass = false; } } });
    openMenu(btn, items);
  }

  FM.simpleTools = {
    /* Called by the Simple timeline's rebuild and by syncSelectionChrome: re-draws the tray only when what it shows changed */
    sync() {
      if (!mount()) return;
      place();
      if (!isSimple()) { closeMenu(); return; }
      const S = FM.spine, R = (FM.simpleTimeline && FM.simpleTimeline.read && FM.simpleTimeline.read()) || S.read(FM.scene);
      const ids = FM.selectionIds ? FM.selectionIds() : [];
      /* §3.12 rule 1b: a line dismisses on a selection change, so the new selection's tools are never hidden behind it */
      const selKey = ids.join(',');
      if (selKey !== lastSel) { if (lastSel !== null && FM.simpleTimeline && FM.simpleTimeline.clearSay) FM.simpleTimeline.clearSay(); lastSel = selKey; }
      if (panelFor && (ids.length !== 1 || ids[0] !== panelFor)) panelFor = null;
      if (lengthFor && (ids.length !== 1 || ids[0] !== lengthFor || !R.isMain(lengthFor))) lengthFor = null;
      const one = ids.length === 1 ? ids[0] : null, l = one && FM.layerById(FM.scene, one);
      const sig = [ids.join(','), lengthFor, lengthEdge, panelFor, l ? [l.start, l.duration, l.locked, JSON.stringify(l.sm || null)].join('|') : '', R.main.map(e => e.id + (e.seam ? e.seam.kind : '')).join(','), R.trackEnd].join('#');
      if (sig === lastSig) return;
      lastSig = sig;
      tray.textContent = '';
      tray.classList.toggle('sm-tray-len', !!lengthFor);
      if (lengthFor) { lengthRow(R, lengthFor).forEach(n => tray.appendChild(n.nodeType ? n : tool(n))); return; }
      if (!ids.length) { tray.appendChild(quietLine(R)); return; }
      if (ids.length > 1) {   // §8.5b: the intersection — Stay put on all, Delete (one main clip at a time in 2.2)
        const w = W();
        tray.appendChild(el('div', 'sm-quiet', (w.selected || (n => n + ' selected'))(ids.length)));
        const all = ids.every(id => !R.isMain(id));
        if (all) tray.appendChild(tool({ id: 'stay', label: w.stay || 'Stay put', icon: 'pin', run: () => ids.forEach(id => S.cmd.stay(id, true)) }));
        tray.appendChild(tool({ id: 'delete', label: w.delete || 'Delete', icon: 'delete', pin: true, run: () => { if (all) { if (FM.deleteSelected) FM.deleteSelected(); } else S.say((FM.spineWords.lines || {}).deleteOne || 'Delete one clip at a time'); } }));
        return;
      }
      trayFor(R, one).forEach(t => tray.appendChild(tool(t)));
    },
    /* "More": today's panel for the selection, docked under the tray (phone) or in the band above it (PC) */
    openPanel(id) { panelFor = id; lastSig = ''; FM.refreshAll(); },
    closePanel() { if (!panelFor) return; panelFor = null; lastSig = ''; FM.refreshAll(); },
    openLength(id) { lengthFor = id; lengthEdge = 'end'; lastSig = ''; this.sync(); },
    panelFor: () => panelFor,
    /* js/mobile.js asks before raising the sheet for a selection; js/inspector.js before drawing the band */
    sheetHeld(id) { return isSimple() && panelFor !== id; },
    bandIdle(layer) { return isSimple() && !(layer && panelFor === layer.id); },
    _reset() { panelFor = null; lengthFor = null; lastSig = ''; closeMenu(); },   // suite seam
    _menu: () => menu,
    ICON: ICON
  };
})(window.FM);
```

### 4.3 Changes to existing files (apply in this order on the tree after 2.1)

`2.2.1` appends the 2.2 commands to `js/spine-edit.js` (the block shown in full in 4.4).

#### 2.2.1 `js/spine-edit.js`

Find (exactly once):

```js
  S.undoGate = function () { return S.arrangeGate(); };
```

Replace with: **§4.4's block**, then that same line.

#### 2.2.2 `js/spine-edit.js`

Find (exactly once):

```js
      if (FM.textEdit && FM.textEdit.resync) FM.textEdit.resync();
      speakDone(plan, notes);
```

Replace with:

```js
      if (FM.textEdit && FM.textEdit.resync) FM.textEdit.resync();
      if (plan.after) { try { plan.after(); } catch (e) {} }          // 2.2: e.g. Text opens for typing once its step is in
      speakDone(plan, notes);
```

#### 2.2.3 `js/spine-edit.js` (added by the review, §14: 2.2's `insertFade` line takes the two clip numbers)

Find (exactly once):

```js
      case 'cutShort': text = line('cutShort', o.name); buttons = [full]; break;
```

Replace with:

```js
      case 'cutShort': text = line('cutShort', o.name); buttons = [full]; break;
      case 'insertFade': text = line('insertFade', o.a, o.b); break;   // 2.2: the two clip numbers (DESIGN §3.11)
```

(2.2.4 is not used.)

#### 2.2.5 `js/spine-words.js`

Find (exactly once):

```js
      deleteOne: 'Delete one clip at a time', failed: 'That didn’t work, so nothing changed',
```

Replace with:

```js
      deleteOne: 'Delete one clip at a time', failed: 'That didn’t work, so nothing changed',
      added1: 'Added clip', addedN: n => 'Added ' + n + ' clips', nothingAdded: 'Nothing could be added',
      moved: (name, i, n) => name + ' moved to ' + i + ' of ' + n, noMove: 'That clip is already there',
      atStart: 'That’s the first clip', atEnd: 'That’s the last clip',
      lifted: 'Lifted off the clip row', intoRow: 'Put in the clip row', cannotMain: 'That can’t go in the clip row',
      stays: 'Stays put', follows: 'Follows its clip', forward: 'Moved forward', backward: 'Moved back',
      atTop: 'Already in front', atBottom: 'Already as far back as it goes',
      insertFade: (a, b) => 'Clips ' + a + ' and ' + b + ' fade into each other · pick another cut',
      sortFade: 'Some clips fade into each other · move them by hand',
      gapsClosed: n => 'Closed ' + n + (n === 1 ? ' gap' : ' gaps'), noGaps: 'No gaps to close',
      fitted: n => n === 1 ? 'Now ends with the video' : n + ' things now end with the video', nothingToFit: 'Nothing to fit',
      textAdded: 'Text added', overlayAdded: 'Overlay added', musicAdded: 'Music added · it stays where it is',
      blackBand: (s, n) => 'Black ' + s.toFixed(1) + 's' + (n > 1 ? ' · ' + n + ' things run past' : ''),
      runsPast: (name, s) => name + ' runs ' + s.toFixed(1) + ' s past the end',
      songRuns: (name, s) => name + ' runs ' + s.toFixed(1) + ' s past the last clip',
      morePast: n => n + ' things run past the end', endWith: 'End with the video', keptEnd: 'kept as an end card',
```

#### 2.2.6 `js/spine-words.js`

Find (exactly once):

```js
    a11y: {
```

Replace with:

```js
    tools: {   // Phase 2 (D10): the tray row and the project tools; one name each, never "Edit" (§8.4)
      clips: 'Clips', text: 'Text', sound: 'Sound', overlay: 'Overlay',
      length: 'Length', earlier: 'Move earlier', later: 'Move later', lift: 'Lift off', liftTitle: 'Lift off the clip row (make it an overlay)',
      into: 'Into row', intoTitle: 'Put in the clip row', duplicate: 'Duplicate', crop: 'Crop', more: 'More', moreTitle: 'More settings for this',
      delete: 'Delete', stay: 'Stay put', editWords: 'Edit words', forward: 'Forward', backward: 'Back', openFull: 'Open in Full',
      closeGap: 'Close gap', fix: 'Fix', done: 'Done', lenEnd: 'End', lenStart: 'Start', shorter: 'One frame shorter', longer: 'One frame longer', minusFrame: '−1 frame', plusFrame: '+1 frame',
      lengthLabel: 'Length in seconds', addWhere: 'Add clips', atEnd: 'At the end', afterClip: 'After ', beforeFirst: 'Before Clip 1',
      music: 'Music from your files', sfx: 'Sound effects', voice: 'Record voice', closeAll: 'Close all gaps', moreOpts: 'Loop and preview speed…',
      selected: n => n + ' selected', bandHint: 'Tap a clip to see its tools', bandHintSel: 'Its tools are below · More opens the rest'
    },
    a11y: {
```

#### 2.2.7 `js/simple-timeline.js`

Find (exactly once):

```js
  function clearSay() { clearTimeout(sayT); if (sayEl) sayEl.textContent = ''; }
```

Replace with:

```js
  /* Phase 2.2: #sm-say is the TRAY ROW (§8.2): its .sm-line takes the row while Simple speaks, #sm-tray shows otherwise */
  const lineOf = () => (sayEl && sayEl.querySelector('.sm-line')) || sayEl;
  function clearSay() { clearTimeout(sayT); const ln = lineOf(); if (ln) ln.textContent = ''; if (sayEl) sayEl.classList.remove('sm-saying', 'sm-say-has-b'); }
```

#### 2.2.8 `js/simple-timeline.js`

Find (exactly once):

```js
    document.addEventListener('pointerdown', e => { ptrDown = true; if (sayEl.textContent && !sayEl.contains(e.target)) clearSay(); }, true);
```

Replace with:

```js
    document.addEventListener('pointerdown', e => { ptrDown = true; const ln = lineOf(); if (ln && ln.textContent && !sayEl.contains(e.target)) clearSay(); }, true);
```

#### 2.2.9 `js/simple-timeline.js`

Find (exactly once):

```js
    if (!sayEl) return;
    sayEl.textContent = '';
    const tx = el('span', 'sm-say-t', text); tx.title = text; sayEl.appendChild(tx);
```

Replace with:

```js
    if (!sayEl) return;
    const ln = lineOf();
    ln.textContent = ''; sayEl.classList.add('sm-saying');
    const tx = el('span', 'sm-say-t', text); tx.title = text; ln.appendChild(tx);
```

#### 2.2.10 `js/simple-timeline.js`

Find (exactly once):

```js
      b.addEventListener('click', ev => { ev.stopPropagation(); if (!armed()) { ev.preventDefault(); return; } clearSay(); try { bd.fn(); } catch (e) {} });
      sayEl.appendChild(b);
```

Replace with:

```js
      b.addEventListener('click', ev => { ev.stopPropagation(); if (!armed()) { ev.preventDefault(); return; } clearSay(); try { bd.fn(); } catch (e) {} });
      ln.appendChild(b);
```

#### 2.2.11 `js/simple-timeline.js`

Find (exactly once):

```js
      add.addEventListener('click', ev => { ev.stopPropagation(); FM.simpleTimeline.pickFiles(); });
      mainEl.appendChild(add);
```

Replace with:

```js
      add.addEventListener('click', ev => { ev.stopPropagation(); FM.simpleTimeline.pickFiles(); });
      mainEl.appendChild(add);
      /* THE BLACK BAND (DESIGN §5.4, his D17 B): when something runs past the last clip the video runs on in black there.
         The band says so; a tap names what runs past, with End with the video for pictures (a song is left as it is). */
      const P0 = scene.project, past = (P0.duration || 0) - R.trackEnd;
      if (R.trackEnd > 0 && past > 1e-9 && FM.spine.overrun) {
        const o = FM.spine.overrun(R), n = o.pictures.length + o.sounds.length + o.ends.length;
        const band = el('button', 'sm-band'); band.type = 'button';
        band.style.left = (xOf(R.trackEnd) + 52) + 'px'; band.style.width = Math.max(40, past * p - 52) + 'px';
        const t = ((W().lines || {}).blackBand || (s => 'Black ' + s.toFixed(1) + 's'))(past, n);
        band.appendChild(el('span', 'sm-band-t', t)); band.title = t; band.setAttribute('aria-label', t);
        band.addEventListener('click', ev => { ev.stopPropagation(); FM.simpleTimeline.explainBand(); });
        mainEl.appendChild(band);
      }
```

#### 2.2.12 `js/simple-timeline.js`

Find (exactly once):

```js
      else secEl.scrollTop = secEl.scrollHeight;   // bottom-aligned: the sections nearest the clips show first
      this.updatePlayhead();
    },
```

Replace with:

```js
      else secEl.scrollTop = secEl.scrollHeight;   // bottom-aligned: the sections nearest the clips show first
      this.updatePlayhead();
      if (FM.simpleTools && FM.simpleTools.sync) FM.simpleTools.sync();   // Phase 2.2: the tray follows what it shows
    },
    /* the black band's line: what runs past, by name; End with the video when a picture does */
    explainBand() {
      const L = W().lines || {}, R0 = R || FM.spine.read(FM.scene), o = FM.spine.overrun(R0), P = FM.scene.project;
      const past = l => (+l.start || 0) + (+l.duration || 0) - R0.trackEnd;
      const all = o.pictures.concat(o.ends, o.sounds);
      if (!all.length) return;
      let text;
      if (all.length === 1) { const l = all[0]; text = (o.sounds.length ? L.songRuns : L.runsPast)(FM.spine.itemWord(l, R0), past(l)); if (o.ends.length) text += ' · ' + L.keptEnd; }
      else text = L.morePast(all.length);
      sayLine(text, { buttons: o.pictures.length ? [{ label: L.endWith || 'End with the video', fn: () => FM.spine.cmd.endWithVideo() }] : [] });
    },
```

#### 2.2.13 `index.html`

Find (exactly once):

```html
        <div id="sm-say" role="status" aria-live="polite"></div>
```

Replace with:

```html
        <!-- Simple mode P2.2: the tray row (#sm-say: the selection's tools in #sm-tray, Simple's lines in .sm-line) and the
             project tools (#sm-tools). One wrapper, moved by js/simple-tools.js: under the timeline on a phone, the bottom of
             the left band on a PC (D10, D20 A). -->
        <div id="sm-bar">
          <div id="sm-say" role="status" aria-live="polite"><div id="sm-tray" role="toolbar" aria-label="Clip tools" aria-live="off"></div><div class="sm-line"></div></div>
          <div id="sm-tools" role="toolbar" aria-label="Add"></div>
        </div>
```

#### 2.2.14 `js/app.js`

Find (exactly once):

```js
    if (FM.storage && FM.storage.save) FM.storage.save();   // write the new media blob to IDB now, not on the 600ms debounce → survives a quick tab background/close
```

Replace with:

```js
    if (FM.storage && FM.storage.save && !(opts && opts.noSave)) FM.storage.save();   // write the new media blob to IDB now, not on the 600ms debounce → survives a quick tab background/close (Simple mode P2: {noSave} — its runner's one commit saves)
```

#### 2.2.15 `js/app.js`

Find (exactly once):

```js
    document.body.classList.toggle('sm-has-sel', simple && n >= 1);
```

Replace with:

```js
    document.body.classList.toggle('sm-has-sel', simple && n >= 1);
    if (simple && FM.simpleTools && FM.simpleTools.sync) FM.simpleTools.sync();   // Simple mode P2.2: the tray shows the selection's tools
```

#### 2.2.16 `js/mobile.js`

Find (exactly once):

```js
      if (!has) { insp.style.top = ''; insp.style.maxHeight = ''; close(); userClosed = false; return; }
```

Replace with:

```js
      if (!has) { insp.style.top = ''; insp.style.maxHeight = ''; close(); userClosed = false; return; }
      /* SIMPLE MODE P2.2 (D10): in Simple a selection shows its tools in the tray row; the sheet rises only for a tray tool
         that has a panel ("More"). simpleTools.sheetHeld is false whenever Simple is not on screen, so Full is today's. */
      if (FM.simpleTools && FM.simpleTools.sheetHeld && FM.simpleTools.sheetHeld(id)) { insp.style.top = ''; insp.style.maxHeight = ''; close(); return; }
```

#### 2.2.17 `js/inspector.js`

Find (exactly once):

```js
      if (navChanged && root.scrollTop) root.scrollTop = 0;
      if (!layer) {
```

Replace with:

```js
      if (navChanged && root.scrollTop) root.scrollTop = 0;
      /* SIMPLE MODE P2.2 (DESIGN.md §8.3, D10, his D20 A): in Simple the band shows a panel only when a tray tool asked for
         one ("More"); otherwise it stays clear above the tray and the tools. bandIdle is false whenever Simple is not on
         screen, so Full's Add menu and layer editor are exactly today's. */
      if (FM.simpleTools && FM.simpleTools.bandIdle && FM.simpleTools.bandIdle(layer)) {
        lastLayerId = null;
        if (title) title.textContent = '';
        const tw = (FM.spineWords && FM.spineWords.tools) || {};
        root.appendChild(el('div', 'sm-band-hint', layer ? (tw.bandHintSel || 'Its tools are below · More opens the rest') : (tw.bandHint || 'Tap a clip to see its tools')));
        return;
      }
      if (!layer) {
```

#### 2.2.18 `index.html`

> Match the tag **by its path**: `?v=408` is v17.21's number and the tree moves it (the working tree of 1 Oct evening already
> has `?v=410`, so the literal line below is found 0 times there). Keep whatever number is there in the line you keep; the new
> line goes right after it. §2.4's preflight line checks the path only.

Find (exactly once, by path):

```html
  <script src="js/inspector.js?v=408"></script>
```

Replace with:

```html
  <script src="js/inspector.js?v=408"></script>
  <script src="js/simple-tools.js?v=1"></script>   <!-- Simple mode P2.2: FM.simpleTools, the tray row and the project tools (D10) — after inspector.js -->
```

#### 2.2.19 `js/editor-mode.js`

Find (exactly once):

```js
      if (mode !== 'simple' || e.altKey) return false;
      const mod = e.metaKey || e.ctrlKey;
      const S = FM.spine;
      if (!S || !S.cmd) return false;
```

Replace with:

```js
      /* Phase 2.2 (§8.3): Alt+← / Alt+→ are Move earlier / Move later on one selected main clip (free keys in Full) */
      if (mode === 'simple' && e.altKey && !(e.metaKey || e.ctrlKey) && (e.code === 'ArrowLeft' || e.code === 'ArrowRight') && FM.spine && FM.spine.cmd && FM.spine.cmd.move) {
        const sel = FM.selectionIds ? FM.selectionIds() : [];
        if (sel.length === 1 && FM.spine.read(FM.scene).isMain(sel[0])) { e.preventDefault(); if (!e.repeat) FM.spine.cmd.move(sel[0], e.code === 'ArrowLeft' ? -1 : 1); return true; }
      }
      if (mode !== 'simple' || e.altKey) return false;
      const mod = e.metaKey || e.ctrlKey;
      const S = FM.spine;
      if (!S || !S.cmd) return false;
```

#### 2.2.20 `js/simple-timeline.js`

Find (exactly once):

```js
    pickFiles() {
      const inp = el('input'); inp.type = 'file'; inp.multiple = true; inp.accept = 'video/*,image/*,audio/*';
      inp.addEventListener('change', () => {
        const files = Array.from(inp.files || []);
        if (files.length && FM.importFiles) FM.importFiles(files, { at: R ? R.trackEnd : 0 });
      });
      inp.click();
    },
```

Replace with:

```js
    /* Phase 2.2: the + is Append (§3.6): one step that lays the clips end to end BEFORE an end card, which moves along.
       `given` lets the suite hand it files (a picker cannot be driven). */
    pickFiles(given) {
      if (given && given.length) return FM.spine.cmd.append(Array.from(given));
      const inp = el('input'); inp.type = 'file'; inp.multiple = true; inp.accept = 'video/*,image/*,audio/*';
      inp.addEventListener('change', () => { const files = Array.from(inp.files || []); if (files.length) FM.spine.cmd.append(files); });
      inp.click();
    },
```

#### 2.2.21 `js/simple-timeline.js`

Find (exactly once):

```js
    read: () => R,
    _say: sayLine
```

Replace with:

```js
    read: () => R,
    clearSay: clearSay,   // Phase 2.2: a selection change dismisses a line (§3.12 rule 1b)
    _say: sayLine
```


### 4.4 The block 2.2.1 adds to `js/spine-edit.js` (inserted before `  S.undoGate = function () {`)

```js
  /* ═══════════════════════ RELEASE 2.2: the rest of the commands the tray and the tools need ═══════════════════════ */

  /* WHERE A NEW THING GOES IN THE STACK (§3.6.1), the 2.2 subset: the array is z-order, index 0 on top. `insertAt` puts a
     layer at a slot and gives Full's Add row its place back (§3.6.1 "one insert helper"), synchronously. */
  S.insertAt = function (layer, slot) {
    const keep = FM.clampAddAt();
    FM.addAt = Math.max(0, Math.min(slot, FM.scene.layers.length));
    FM.insertLayer(layer);
    FM.addAt = keep + (FM.addAt <= keep ? 1 : 0);
    FM.clampAddAt();
    return layer;
  };
  const overlaps = (a, s, e) => (+a.start || 0) < e - 1e-9 && (+a.start || 0) + (+a.duration || 0) > s + 1e-9;
  const isCap = l => l.type === 'text' && Array.isArray(l.captions);
  /* The slot ABOVE every layer `test` accepts that overlaps [s, e) (the top-most such layer's index), or `fallback`. */
  function slotAbove(s, e, test, fallback, skip) {
    const L = FM.scene.layers;
    for (let i = 0; i < L.length; i++) { const l = L[i]; if (skip && skip.has(l.id)) continue; if (test(l) && overlaps(l, s, e)) return i; }
    return fallback;
  }
  /* text: directly above the top-most non-caption layer it overlaps; overlay: directly above the top-most layer it overlaps
     that is not text, captions or a sound. Returns that layer's id (moveLayers' beforeId puts a layer just ABOVE it), or
     null when it overlaps nothing of that kind (then it stays where the add put it). */
  S.bandAnchor = function (kind, s, e, skip) {
    const test = kind === 'text' ? (l => !isCap(l) && l.type !== 'camera' && !(l.audioOnly === true))
                                 : (l => l.type !== 'text' && l.type !== 'camera' && !(l.audioOnly === true) && !(l.sm && l.sm.snd === true));
    const i = slotAbove(s, e, test, -1, skip);
    return i >= 0 ? FM.scene.layers[i].id : null;
  };
  /* §3.6 Add row: a new text, overlay or sticker is clamped to the TRACK end (never lengthens the video). */
  S.clampToTrack = function (R, start, len) {
    const ml = MINLEN(), clips = R.main.filter(e => !e.slot);
    if (!clips.length) return { start: start, duration: len };
    const last = clips[clips.length - 1];
    let s = start;
    if (s >= R.trackEnd - ml) s = Math.max(last.start, R.trackEnd - len);
    return { start: s, duration: Math.max(ml, Math.min(len, R.trackEnd - s)) };
  };

  /* The cut nearest t (§3.6 Insert, §8.5 "After Clip N"): an exact tie at a clip's midpoint goes AFTER it. Returns the
     index j of the entry the new clips go before (R.main.length = the end). */
  S.insertIndexAt = function (R, t) {
    if (!R.main.length) return 0;
    let best = 0, bd = Infinity;
    for (let j = 0; j <= R.main.length; j++) {
      const cut = j === 0 ? R.main[0].start : R.main[j - 1].end;
      const d = Math.abs(t - cut);
      if (d < bd - 1e-9 || (Math.abs(d - bd) <= 1e-9 && j > best)) { bd = d; best = j; }
    }
    return best;
  };

  const mediaKindOf = f => { const t = String((f && f.type) || ''), n = String((f && f.name) || '').toLowerCase();
    if (/^video\//.test(t) || /\.(mp4|mov|m4v|webm)$/.test(n)) return /^audio\//.test(t) ? 'audio' : 'video';
    if (/^image\//.test(t) || /\.(jpe?g|png|gif|heic|webp)$/.test(n)) return 'image';
    if (/^audio\//.test(t) || /\.(mp3|m4a|aac|wav|ogg|opus|flac|aiff?|caf)$/.test(n)) return 'audio';
    return ''; };
  /* Read the picked files BEFORE the runner (§3.7: no picker and no long decode inside a step that a refusal could undo):
     the records, in pick order, with the length each clip will get. Sound files are kept apart: they never enter the clip
     row (§7.3), they go in as music. */
  S.readPicked = async function (files) {
    const pickedIn = FM.startedIn ? FM.startedIn() : null, out = { clips: [], sounds: [], skipped: 0 };
    for (const f of files || []) {
      const k = mediaKindOf(f);
      try {
        const rec = k === 'image' ? await FM.loadImageFile(f) : (k === 'video' || k === 'audio') ? await FM.loadVideoFile(f) : null;
        if (!rec) { out.skipped++; continue; }
        if (FM.stillIn && !FM.stillIn(pickedIn)) { FM.letGoMedia(rec); out.skipped++; continue; }
        const picture = rec.kind === 'image' || (rec.width > 0 && rec.height > 0);
        const len = rec.kind === 'video' ? Math.max(0.1, rec.duration || 5) : FM.defaultLayerDuration();
        (picture ? out.clips : out.sounds).push({ rec: rec, len: len });
      } catch (e) { out.skipped++; if (FM.reportError) FM.reportError('reading “' + (f && f.name) + '”', e); }
    }
    return out;
  };
  function addRecs(recs, at, pickB, map) {
    const made = [];
    let t = at;
    recs.forEach((it, i) => {
      const l = FM.addMediaLayer(it.rec, { at: t, pick: recs.length > 1 ? { b: pickB, i: i } : null, noSave: true });
      if (!l) return;
      if (it.rec.kind !== 'image' && !(it.rec.width > 0 && it.rec.height > 0)) S.setFlag(l, 'snd', true);   // §0.4 B8: Simple's own sound-only fact
      made.push(l); t = (+l.start || 0) + (+l.duration || 0);
    });
    return made;
  }
  const newPickB = () => 'pk' + Date.now().toString(36).slice(-6) + Math.floor(Math.random() * 1296).toString(36);

  /* APPEND (the clip row's +, Clips › At the end): the clips go end to end from the track end, BEFORE an end card, which
     moves along. Arranging only when it moves something (a tail item) or the project is not adopted yet (§3.6 Append row):
     a plain clips-only Append works with a friend in. Cues or a window that cross the track end refuse until 2.4. */
  S.planAppend = function (R, picked) {
    const map = byIdMap(), clips = picked.clips;
    if (!clips.length && !picked.sounds.length) return refusePlan('nothingAdded');
    const T = R.main.some(e => !e.slot) ? R.trackEnd : 0;
    const sum = clips.reduce((a, c) => a + c.len, 0);
    for (const id of R.riders) { const l = map.get(id); if (l && (+l.start || 0) < T - R.eps && (+l.start || 0) + (+l.duration || 0) > T + R.eps) return refusePlan('riders'); }
    const plan = newPlan(clips.length > 1 ? 'Add ' + clips.length + ' clips' : 'Add clip');
    /* §3.6 Append row: arranging (so gated, pinned and tail-fitted in this same step) when it moves an end card, when an
       sm.tail item will be refitted to the new end, or when a whole-video picture added in Full after adoption carries no
       flag yet (pinStrays tags it, the tail fit takes it to the new end). Otherwise not: a plain Append works live. */
    const first0 = R.main.filter(e => !e.slot)[0];
    const wholeUntagged = id => { const l = map.get(id), u = R.units[id];
      if (!l || !first0 || (l.sm && (l.sm.stay || l.sm.main || l.sm.tail)) || S.neverPinned(id, R) || !tailOk(l, u)) return false;
      const s = +l.start || 0; return s <= first0.start + R.eps && s + (+l.duration || 0) >= R.trackEnd - R.eps; };
    plan.arranges = R.tail.length > 0 || (clips.length > 0 && (FM.scene.layers.some(l => l.sm && l.sm.tail === true) || Object.keys(R.units).some(wholeUntagged)));
    R.tail.forEach(id => addMove(plan, id, sum));
    const lastMain = (() => { const m = R.main.filter(e => !e.slot); return m.length ? m[m.length - 1].id : null; })();
    plan.pre.push(async () => {
      const made = addRecs(clips, T, newPickB(), map);
      made.forEach(l => S.setFlag(l, 'main', true));
      if (made.length && lastMain && FM.layerById(FM.scene, lastMain)) FM.moveLayers(made.map(l => l.id), lastMain);   // just above the clip before (§3.6.1)
      const snd = addRecs(picked.sounds, Math.max(0, Math.min(FM.time || 0, T)), newPickB(), map);
      snd.forEach(l => { S.setFlag(l, 'stay', true); FM.moveLayers([l.id], null); });   // music: Stay put, left whole (D17 B); sound sits at the end of the stack
      plan.selectId = made.length ? made[0].id : (snd[0] && snd[0].id);
      plan.made = made.length;
    });
    plan.time = T;
    plan.live = clips.length > 1 ? line('addedN', clips.length) : line('added1');
    return plan;
  };
  /* INSERT at the cut j (Clips › After Clip N): the new clips go in there, everything from j on moves along by their
     length. A crossfade at that cut refuses (its fade would end up spanning the new clips). */
  S.planInsert = function (R, picked, j) {
    const map = byIdMap(), clips = picked.clips;
    if (!clips.length) return S.planAppend(R, picked);
    if (j >= R.main.length) return S.planAppend(R, picked);
    const e = R.main[j];
    if (e.seam && e.seam.kind === 'blend') return refusePlan('insertFade', { a: j, b: j + 1 });
    const at = j === 0 ? R.main[0].start : R.main[j - 1].end;
    const rb = riderBlock(R, at, map); if (rb) return refusePlan(rb.kind, rb);
    const sum = clips.reduce((a, c) => a + c.len, 0);
    const plan = newPlan(clips.length > 1 ? 'Add ' + clips.length + ' clips' : 'Add clip');
    const rp = ripple(plan, R, j, sum, new Set(), null, false);
    tailMove(plan, R, R.trackEnd + (rp.last == null ? sum : rp.last), map);
    const cb = couplingBlock(plan, R, map); if (cb) return refusePlan(cb.kind, cb);
    const before = j > 0 ? R.main[j - 1] : null;
    plan.pre.push(async () => {
      const made = addRecs(clips, at, newPickB(), map);
      made.forEach(l => S.setFlag(l, 'main', true));
      if (made.length) FM.moveLayers(made.map(l => l.id), before ? before.id : e.id);
      /* the first clip after the new ones lands on their end exactly (a seam the command creates, §3.1) */
      if (made.length && !e.slot) { const last = made[made.length - 1]; plan.lands.set(e.id, (+last.start || 0) + (+last.duration || 0)); }
      plan.selectId = made.length ? made[0].id : null;
      const snd = addRecs(picked.sounds, Math.max(0, FM.time || 0), newPickB(), map);
      snd.forEach(l => { S.setFlag(l, 'stay', true); FM.moveLayers([l.id], null); });
    });
    plan.time = at;
    plan.live = clips.length > 1 ? line('addedN', clips.length) : line('added1');
    return plan;
  };

  /* REORDER c to before entry j (Move earlier / Move later, §3.6 Reorder row). One slot length L = n.start − c.start (c's
     trailing seam travels with it), both halves against the ORIGINAL read model; c and its followers get ONE move to their
     new place. A clip on a crossfade refuses. Exact landings at the two seams the move creates. */
  S.planReorder = function (R, id, j) {
    const map = byIdMap(), i = mainIdx(R, id);
    if (i < 0) return refusePlan('gone');
    if (j === i || j === i + 1 || j < 0 || j > R.main.length) return refusePlan('noMove');
    const c = R.main[i], n = R.main[i + 1] || null, L = map.get(c.id);
    const fades = k => R.main[k] && R.main[k].seam && R.main[k].seam.kind === 'blend';
    if (fades(i) || fades(i + 1) || (j < R.main.length && fades(j))) return refusePlan('sortFade');
    const len = n ? n.start - c.start : (+L.duration || 0);
    const S0 = new Set([c.id].concat(R.followers[c.id] || []));
    const lo = Math.min(c.start, j < R.main.length ? R.main[j].start : R.trackEnd);
    const rb = riderBlock(R, lo, map); if (rb) return refusePlan(rb.kind, rb);
    const plan = newPlan('Move clip');
    /* new positions, walked in the NEW order: every entry keeps its own seam amount except at the two edit points */
    const order = R.main.map((e, k) => k).filter(k => k !== i);
    const at = j > i ? j - 1 : j;
    order.splice(at, 0, i);
    const dOf = k => (k > i && k < j) ? -len : (k >= j && k < i) ? len : 0;   // forward: (i, j) move −L; backward: [j, i) move +L
    let prevEnd = null, acc = 0, cStart = null;
    order.forEach((k, pos) => {
      const e = R.main[k];
      let ns;
      if (k === i) ns = pos === 0 ? R.main[0].start : prevEnd;                  // c lands exactly where its slot opens (§3.6 seam')
      else {
        const prop = e.start + dOf(k) + acc;
        const gap = prevEnd == null ? null : prop - prevEnd;
        if (gap != null && ((Math.abs(gap) < 1e-9 && gap !== 0) || (gap > 0 && gap <= R.eps && e.seam && e.seam.kind === 'hairline'))) { acc += prevEnd - prop; ns = prevEnd; }
        else if (pos > 0 && order[pos - 1] === i && Math.abs(gap) <= R.eps) { acc += prevEnd - prop; ns = prevEnd; }   // the seam after c is new: land it
        else ns = prop;
      }
      const d = ns - e.start;
      if (e.slot) e.members.forEach(m => { if (d) addMove(plan, m, d); });
      else {
        if (k === i || ns !== e.start + dOf(k)) addLand(plan, e.id, ns); else if (d) addMove(plan, e.id, d);
        (R.followers[e.id] || []).forEach(f => { if (d) addMove(plan, f, d); });
        if (k === i) cStart = ns;
      }
      prevEnd = e.slot ? e.end + d : ns + (+map.get(e.id).duration || 0);
    });
    plan.touched.add(c.id);
    const cb = couplingBlock(plan, R, map); if (cb) return refusePlan(cb.kind, cb);
    plan.time = cStart;
    const newIndex = order.filter(k => !R.main[k].slot).indexOf(i) + 1;
    plan.live = line('moved', S.itemWord(L, R), newIndex, R.main.filter(e => !e.slot).length);
    plan.pulse = [c.id];
    return plan;
  };
  S.moveIndexFor = function (R, id, dir) {
    const i = mainIdx(R, id); if (i < 0) return -1;
    if (dir < 0) { let k = i - 1; while (k >= 0 && R.main[k].slot) k--; return k < 0 ? -1 : k; }
    let k = i + 1; while (k < R.main.length && R.main[k].slot) k++;
    return k >= R.main.length ? -1 : k + 1;
  };

  /* LIFT OFF (Make overlay, §3.6): c keeps its time but leaves the clip row; what comes after closes up under it; the
     things on it stay with it, Stay put; it goes up into the overlay band, under its own titles. */
  S.planLift = function (R, id) {
    const map = byIdMap(), i = mainIdx(R, id);
    if (i < 0) return refusePlan('gone');
    const c = R.main[i], p = R.main[i - 1] || null, n = R.main[i + 1] || null, L = map.get(c.id);
    if ((n && n.seam && n.seam.kind === 'blend') || (p && c.seam && c.seam.kind === 'blend')) return refusePlan('sortFade');
    const rb = riderBlock(R, c.start, map); if (rb) return refusePlan(rb.kind, rb);
    const plan = newPlan('Lift off');
    const fol = R.followers[c.id] || [];
    const dt = n ? -(n.start - c.start) : 0;
    const prevEnd = p ? p.end : null;
    const rp = ripple(plan, R, i + 1, dt, new Set([c.id].concat(fol)), prevEnd, !!(p && isFloatJoin(R, i)));
    if (n) tailMove(plan, R, R.trackEnd + (rp.last == null ? dt : rp.last), map);
    else { const lastClip = R.main.filter(e => !e.slot && e.id !== c.id).pop(); tailMove(plan, R, lastClip ? lastClip.end : c.start, map); }
    plan.touched.add(c.id);
    plan.post.push(() => {
      S.setFlag(L, 'main', false);
      fol.forEach(fid => { const f = map.get(fid); if (f && !S.isTwinOf(f, L, R.eps)) S.setFlag(f, 'stay', true); });
      /* overlay band: directly above the top-most layer it overlaps that is not text, captions or itself */
      const s = +L.start || 0, e = s + (+L.duration || 0), skip = new Set([L.id].concat(fol));
      const idx = slotAbove(s, e, l => l.type !== 'text' && l.type !== 'camera' && !(l.audioOnly === true) && !fol.includes(l.id), -1, skip);
      if (idx >= 0) { const above = FM.scene.layers[idx]; if (above && above.id !== L.id) FM.moveLayers([L.id], above.id); }
    });
    const cb = couplingBlock(plan, R, map); if (cb) return refusePlan(cb.kind, cb);
    plan.live = line('lifted');
    plan.pulse = [c.id];
    return plan;
  };
  /* INTO ROW (Make main clip, §3.6): an overlay goes into the clip row at the cut nearest its start; the clips from there on
     move along by its length; it lands exactly on that cut. */
  S.planIntoRow = function (R, id) {
    const map = byIdMap(), o = map.get(id), u = R.units[id];
    if (!o || !u || R.isMain(id)) return refusePlan('gone');
    if (!(o.type === 'video' || o.type === 'image' || o.type === 'shape' || (o.type === 'text' && !isCap(o)))) return refusePlan('cannotMain');
    if (o.audioOnly === true || (o.sm && o.sm.snd === true)) return refusePlan('cannotMain');
    const j = S.insertIndexAt(R, +o.start || 0);
    if (j < R.main.length && R.main[j].seam && R.main[j].seam.kind === 'blend') return refusePlan('insertFade', { a: j, b: j + 1 });
    const seam = j === 0 ? (R.main[0] ? R.main[0].start : 0) : R.main[j - 1].end;
    const len = +o.duration || 0;
    const rb = riderBlock(R, seam, map); if (rb) return refusePlan(rb.kind, rb);
    const plan = newPlan('Put in the clip row');
    const rp = ripple(plan, R, j, len, new Set([id]), seam + len, true);
    tailMove(plan, R, R.trackEnd + (rp.last == null ? len : rp.last), map);
    addLand(plan, id, seam);
    plan.post.push(() => {
      S.setFlag(o, 'main', true); S.setFlag(o, 'stay', false);
      const before = j > 0 ? R.main[j - 1] : null;
      if (before) FM.moveLayers([o.id], before.id);   // main band: just above the clip before it
    });
    const cb = couplingBlock(plan, R, map); if (cb) return refusePlan(cb.kind, cb);
    plan.time = seam;
    plan.live = line('intoRow');
    plan.pulse = [id];
    return plan;
  };
  /* STAY PUT (a flag; nothing moves). */
  S.planStay = function (R, id, on) {
    const map = byIdMap(), l = map.get(id);
    if (!l || R.isMain(id)) return refusePlan('gone');
    const plan = newPlan(on ? 'Stay put' : 'Follow clip'); plan.arranges = false; plan.adopts = false;
    plan.post.push(() => { S.setFlag(l, 'stay', !!on); if (!on) S.setFlag(l, 'tail', false); });
    plan.live = on ? line('stays') : line('follows');
    return plan;
  };
  /* FORWARD / BACK for an overlay or text (z one step among the items it overlaps; it never crosses the clip row, §3.6.1). */
  S.planZ = function (R, id, dir) {
    const map = byIdMap(), l = map.get(id);
    if (!l || R.isMain(id)) return refusePlan('gone');
    const L = FM.scene.layers, i = L.indexOf(l), s = +l.start || 0, e = s + (+l.duration || 0);
    let k = i + (dir > 0 ? -1 : 1);
    while (k >= 0 && k < L.length && !(overlaps(L[k], s, e) && L[k].type !== 'camera')) k += (dir > 0 ? -1 : 1);
    if (k < 0 || k >= L.length || R.isMain(L[k].id)) return refusePlan(dir > 0 ? 'atTop' : 'atBottom');
    const plan = newPlan(dir > 0 ? 'Forward' : 'Back'); plan.arranges = false; plan.adopts = false; plan.touched.add(id);
    const target = L[k];
    plan.post.push(() => { if (dir > 0) FM.moveLayers([id], target.id); else { const nx = FM.scene.layers[FM.scene.layers.indexOf(target) + 1]; FM.moveLayers([id], nx ? nx.id : null); } });
    plan.live = line(dir > 0 ? 'forward' : 'backward');
    return plan;
  };
  /* CLOSE ALL GAPS (Simple's ⋯): every gap and overlap and every hairline a frame falls into, left to right, landed shut,
     one step. Blends, slots and covered gaps are left alone. */
  S.planCloseAll = function (R) {
    const map = byIdMap(), fps0 = fps();
    const rb = riderBlock(R, R.main.length ? R.main[0].start : 0, map); if (rb) return refusePlan(rb.kind, rb);
    const plan = newPlan('Close all gaps');
    let prevEnd = null, acc = 0, closed = 0;
    R.main.forEach((e, k) => {
      let d = acc, ns = e.start + acc;
      const sm = e.seam;
      const frameIn = sm && sm.kind === 'hairline' && Math.floor((k ? R.main[k - 1].end : 0) * fps0 + 1e-9) !== Math.floor(e.start * fps0 + 1e-9);
      const fix = sm && !sm.covered && (sm.kind === 'gap' || sm.kind === 'overlap' || frameIn || (sm.kind === 'join' && Math.abs((k ? R.main[k - 1].end : e.start) - e.start) < 1e-9 && prevEnd != null));
      if (fix) { const target = prevEnd != null ? prevEnd : 0; if (sm.kind !== 'join') closed++; acc += target - ns; d = acc; ns = target; }
      if (e.slot) { e.members.forEach(m => { if (d) addMove(plan, m, d); }); prevEnd = e.end + d; return; }
      if (fix) addLand(plan, e.id, ns); else if (d) addMove(plan, e.id, d);
      (R.followers[e.id] || []).forEach(f => { if (d) addMove(plan, f, d); });
      prevEnd = ns + (+map.get(e.id).duration || 0);
    });
    if (!closed) return refusePlan('noGaps');
    tailMove(plan, R, prevEnd, map);
    const cb = couplingBlock(plan, R, map); if (cb) return refusePlan(cb.kind, cb);
    plan.live = line('gapsClosed', closed);
    return plan;
  };
  /* END WITH THE VIDEO (the black band, §5.4, D17 B): every PICTURE item that runs past the last clip is fitted to it —
     media through the tail trim, keys re-timed like the tail fit. A sound is named and left running (his D17 B). */
  S.overrun = function (R) {
    const out = { pictures: [], sounds: [], ends: [] };
    if (!R.main.some(e => !e.slot)) return out;
    FM.scene.layers.forEach(l => {
      if (l.type === 'camera') return;
      const s = +l.start || 0, e = s + (+l.duration || 0);
      if (e <= R.trackEnd + 1e-9) return;
      const u = R.units[l.id] || {};
      if (u.kind === 'audio' || l.audioOnly === true || (l.sm && l.sm.snd === true)) out.sounds.push(l);
      else if (s >= R.trackEnd - 1e-9) out.ends.push(l);
      else if (l.type !== 'group') out.pictures.push(l);
    });
    return out;
  };
  S.planEndWithVideo = function (R) {
    const o = S.overrun(R);
    if (!o.pictures.length) return refusePlan('nothingToFit');
    const plan = newPlan('End with the video'); plan.arranges = false; plan.adopts = false;
    o.pictures.forEach(l => plan.touched.add(l.id));
    plan.writes.push(() => o.pictures.forEach(l => {
      const s = +l.start || 0, D = +l.duration || 0;
      let D2 = R.trackEnd - s, tr = l.trimStart;
      if (l.type === 'video') { const r = FM.trimClipEdge(l, 'tail', D2 - D, srcDurOf(l)); D2 = r.duration; tr = r.trimStart; }
      D2 = Math.max(MINLEN(), D2);
      S.mapLayerKeys(l, S.fitMap(s, D, D2));
      l.duration = D2; if (l.type === 'video') l.trimStart = tr;
      if (l.sm && l.sm.tail) l.sm.tailEnd = s + D2;
    }));
    plan.live = line('fitted', o.pictures.length);
    return plan;
  };
  /* ADD TEXT / OVERLAY (the project tools, §3.6 Add row): at the playhead, clamped to the TRACK end, in its band. The text
     opens for typing. Not arranging: it moves nothing that exists, so it works with a friend in. */
  S.planAddText = function (R) {
    const plan = newPlan('Add text'); plan.arranges = false; plan.adopts = false;
    plan.pre.push(async () => {
      const P = FM.scene.project, c = S.clampToTrack(R, Math.max(0, FM.time || 0), FM.defaultLayerDuration());
      /* today's text defaults (js/app.js addTextLayer), placed by Simple: no commit, no editor opened mid-step */
      const t = FM.makeLayer('text', { name: 'Text', x: P.width / 2, y: P.height / 2, fontSize: FM.defaultTextSize(), start: c.start, duration: c.duration });
      const anchor = S.bandAnchor('text', c.start, c.start + c.duration, null);
      S.insertAt(t, anchor ? FM.scene.layers.findIndex(l => l.id === anchor) : 0);
      plan.selectId = t.id; plan.typeInto = t.id;
    });
    plan.after = () => { if (plan.typeInto && FM.textEdit && FM.textEdit.start) FM.textEdit.start(plan.typeInto, { selectAll: true }); };
    plan.live = line('textAdded');
    return plan;
  };
  S.planAddOverlay = function (R, picked) {
    const items = picked.clips;
    if (!items.length) return refusePlan('nothingAdded');
    const plan = newPlan('Add overlay'); plan.arranges = false; plan.adopts = false;
    plan.pre.push(async () => {
      const t0 = Math.max(0, FM.time || 0), made = addRecs(items, t0, newPickB(), null);
      made.forEach(l => {
        const c = S.clampToTrack(R, +l.start || 0, +l.duration || 0);
        l.start = c.start;
        if (c.duration < l.duration) { if (l.type === 'video') { const r = FM.trimClipEdge(l, 'tail', c.duration - l.duration, srcDurOf(l)); l.duration = r.duration; l.trimStart = r.trimStart; } else l.duration = c.duration; }
        const anchor = S.bandAnchor('overlay', l.start, l.start + l.duration, new Set([l.id]));
        if (anchor) FM.moveLayers([l.id], anchor);
      });
      plan.selectId = made.length ? made[0].id : null;
    });
    plan.live = line('overlayAdded');
    return plan;
  };
  S.planAddMusic = function (R, picked) {
    const items = picked.sounds.concat(picked.clips.filter(c => c.rec.kind === 'video'));
    if (!items.length) return refusePlan('nothingAdded');
    const plan = newPlan('Add music'); plan.arranges = false; plan.adopts = false;
    plan.pre.push(async () => {
      const made = addRecs(items, Math.max(0, FM.time || 0), newPickB(), null);
      made.forEach(l => { S.setFlag(l, 'stay', true); if (!(l.sm && l.sm.snd)) l.muted = false; FM.moveLayers([l.id], null); });   // music: Stay put, whole (D17 B)
      plan.selectId = made.length ? made[0].id : null;
    });
    plan.live = line('musicAdded');
    return plan;
  };

  Object.assign(S.cmd, {
    append(files) { return (async () => { const picked = await S.readPicked(files); return S.edit('Add clips', R => S.planAppend(R, picked)); })(); },
    insert(files, j) { return (async () => { const picked = await S.readPicked(files); return S.edit('Add clips', R => S.planInsert(R, picked, j)); })(); },
    move(id, dir) { return S.edit('Move clip', R => { const j = S.moveIndexFor(R, id, dir); return j < 0 ? refusePlan(dir < 0 ? 'atStart' : 'atEnd') : S.planReorder(R, id, j); }); },
    lift(id) { return S.edit('Lift off', R => S.planLift(R, id)); },
    intoRow(id) { return S.edit('Put in the clip row', R => S.planIntoRow(R, id)); },
    stay(id, on) { return S.edit(on ? 'Stay put' : 'Follow clip', R => S.planStay(R, id, on)); },
    z(id, dir) { return S.edit(dir > 0 ? 'Forward' : 'Back', R => S.planZ(R, id, dir)); },
    closeAll() { return S.edit('Close all gaps', R => S.planCloseAll(R)); },
    endWithVideo() { return S.edit('End with the video', R => S.planEndWithVideo(R)); },
    addText() { return S.edit('Add text', R => S.planAddText(R)); },
    addOverlay(files) { return (async () => { const picked = await S.readPicked(files); return S.edit('Add overlay', R => S.planAddOverlay(R, picked)); })(); },
    addMusic(files) { return (async () => { const picked = await S.readPicked(files); return S.edit('Add music', R => S.planAddMusic(R, picked)); })(); },
    length(id, newDur) { return S.edit('Trim clip', R => S.planTrimTail(R, id, newDur, { typed: true })); },
    trimStartBy(id, h) { return S.edit('Trim clip', R => S.planTrimHead(R, id, h, { typed: true })); }
  });
```

### 4.5 `styles.css`: append at the end of the file

```css
/* ═══ SIMPLE MODE, PHASE 2.2 — the tray row and the project tools (D10), Simple's ⋯ menu and the black band ══════════════
   (BUILD-PLAN-PHASE2.md §4). Every rule hangs on an element only Simple builds (#sm-bar, #sm-tray, #sm-tools, .sm-menu,
   .sm-band, .sm-band-hint) or on body.ed-simple, so Full matches none of them. */
#sm-bar { display: none; }
body.ed-simple #sm-bar { display: flex; flex-direction: column; flex: 0 0 auto; background: var(--panel); }
#sm-say { padding: 0; }
#sm-say .sm-line { display: none; flex: 1 1 auto; min-width: 0; align-items: center; gap: 10px; padding: 0 12px; height: 100%; }
#sm-say.sm-saying .sm-line { display: flex; }
#sm-say.sm-saying #sm-tray { display: none; }
#sm-tray { display: flex; align-items: stretch; flex: 1 1 auto; min-width: 0; height: 100%; overflow-x: auto; overflow-y: hidden; scrollbar-width: none; }
#sm-tray::-webkit-scrollbar { display: none; }
.sm-tool { position: relative; flex: 0 0 auto; min-width: 54px; padding: 0 6px; display: flex; flex-direction: column; align-items: center; justify-content: center; gap: 3px;
  border: 0; background: transparent; color: var(--text); font: 600 10px/1.1 system-ui, sans-serif; cursor: pointer; -webkit-tap-highlight-color: transparent; }
.sm-tool .sm-ico { width: 22px; height: 22px; flex: none; }
.sm-tool .sm-tool-l { white-space: nowrap; }
.sm-tool[aria-disabled="true"] { opacity: .38; }
.sm-tool[aria-pressed="true"] { color: var(--accent); }
.sm-tool.sm-pin { position: sticky; right: 0; margin-left: auto; padding-left: 16px; background: linear-gradient(90deg, rgba(0,0,0,0), var(--panel) 14px); }
.sm-quiet { display: flex; align-items: center; padding: 0 12px; font: 600 12.5px/1 system-ui, sans-serif; color: var(--text-dim); white-space: nowrap; }
#sm-tray.sm-tray-len { align-items: center; }
.sm-len-v { flex: none; width: 72px; height: 36px; margin: 0 4px; border-radius: 8px; border: 1px solid var(--line); background: var(--panel-2); color: var(--text);
  font: 700 14px/1 system-ui, sans-serif; text-align: center; }
#sm-tools { display: flex; align-items: stretch; flex: 0 0 56px; border-top: 1px solid var(--line); padding-bottom: env(safe-area-inset-bottom, 0px); box-sizing: content-box; }
#sm-tools .sm-tool { flex: 1 1 0; min-width: 0; }
.sm-menu { position: fixed; z-index: 120; min-width: 210px; padding: 6px; border-radius: 12px; background: var(--panel-2); border: 1px solid var(--line);
  box-shadow: 0 16px 40px rgba(0,0,0,.5); display: flex; flex-direction: column; }
.sm-menu-i { min-height: 44px; text-align: left; padding: 0 14px; border: 0; border-radius: 8px; background: transparent; color: var(--text); font: 600 14px/1 system-ui, sans-serif; cursor: pointer; }
.sm-menu-i:hover, .sm-menu-i:focus-visible { background: rgba(255,255,255,.07); }
.sm-band { position: absolute; top: 2px; height: 52px; border-radius: 6px; border: 1px dashed #5a667a; color: #aeb8c8; cursor: pointer; overflow: hidden; white-space: nowrap;
  background: repeating-linear-gradient(135deg, #0b0f16 0 6px, #141a24 6px 12px); font: 600 10px/1 system-ui, sans-serif; display: flex; align-items: center; padding: 0 8px; }
.sm-band-hint { padding: 16px; color: var(--text-dim); font: 600 13px/1.4 system-ui, sans-serif; }
@media (max-width: 700px) { #sm-say.sm-say-has-b { padding-right: 0; } #sm-say.sm-say-has-b .sm-line { padding-right: 56px; } }
@media (min-width: 701px) {
  body.ed-simple #tl-centerline { bottom: 0; }                                  /* #sm-say left the timeline for the band */
  #inspector-panel > #sm-bar { border-top: 1px solid var(--line); }
  body.ed-simple #sm-say { flex-basis: 52px; border-top: 0; }
}
```

### 4.6 `?v=` bumps

`js/spine-edit.js`, `js/spine-words.js`, `js/simple-timeline.js`, `js/editor-mode.js`, `js/app.js`, `js/mobile.js`,
`js/inspector.js`, `styles.css`; new `js/simple-tools.js?v=1` right after `js/inspector.js` (2.2.18).

### 4.7 Tests, and the Phase 1 test 2.2 changes

```js
  /* ═══ SIMPLE MODE, PHASE 2 RELEASE 2.2 — THE TRAY ROW AND THE PROJECT TOOLS (D10), and the commands they carry: Append,
     Insert, Move earlier / later, Lift off, Into row, Length, Stay put, Simple's ⋯ (Close all gaps) and the black band
     (D17 B) (queue 980 (partial); BUILD-PLAN-PHASE2.md §4) ═══════════════════════════════════════════════════════════ */
  const smPng = (color, name) => new Promise(res => { const c = offscreen(32, 32), x = c.getContext('2d'); x.fillStyle = color; x.fillRect(0, 0, 32, 32); c.toBlob(b => res(new File([b], name || color.slice(1) + '.png', { type: 'image/png' })), 'image/png'); });
  const smTool = id => document.querySelector('#sm-tray .sm-tool[data-tool="' + id + '"]') || document.querySelector('#sm-tools .sm-tool[data-tool="' + id + '"]');
  const smTops = ids => ids.map(id => { const e = document.getElementById(id); return e ? Math.round(e.getBoundingClientRect().top) : NaN; });

  async function smTrayCheck(width) {
    await (width <= 700 ? atPhoneWidth : atWideWidth)(async function () {
      await smP2((W, H) => [smT('On B', 3.5, 1, W, H), smV('C', 5, 3, W, H), smV('B', 3, 2, W, H), smV('A', 0, 3, W, H)], async function (v) {
        const rows = width <= 700 ? ['sm-main', 'sm-sound', 'sm-say', 'sm-tools'] : ['sm-main', 'sm-sound'];
        const y0 = smTops(rows);
        FM.selectLayer(v.L('B').id); await v.sleep(120);
        document.getAnimations().forEach(a => { try { a.finish(); } catch (e) {} });
        const want = ['length', 'earlier', 'later', 'lift', 'duplicateClip', 'crop', 'more', 'delete'];
        const got = Array.from(document.querySelectorAll('#sm-tray .sm-tool')).map(b => b.dataset.tool);
        if (want.some(t => got.indexOf(t) < 0)) throw new Error(width + ' px: the main clip tray is ' + JSON.stringify(got) + ', want ' + JSON.stringify(want));
        const tools = Array.from(document.querySelectorAll('#sm-tools .sm-tool')).map(b => b.dataset.tool).join(',');
        if (tools !== 'clips,text,sound,overlay') throw new Error(width + ' px: the project tools are ' + tools);
        if (smTops(rows).some((y, i) => Math.abs(y - y0[i]) > 0.5)) throw new Error(width + ' px: selecting moved a row: ' + y0 + ' → ' + smTops(rows));
        const tray = document.getElementById('sm-tray').getBoundingClientRect(), tb = document.getElementById('sm-tools').getBoundingClientRect();
        if (tray.height < 44 || tb.height < 44) throw new Error(width + ' px: a row is under 44 px tall (tray ' + tray.height + ', tools ' + tb.height + ')');
        Array.from(document.querySelectorAll('#sm-tools .sm-tool')).forEach(b => { const r = b.getBoundingClientRect(); if (r.width < 44 || r.right > innerWidth + 0.5) throw new Error(width + ' px: tool ' + b.dataset.tool + ' is ' + Math.round(r.width) + ' px wide or off screen'); });
        const bin = smTool('delete').getBoundingClientRect();
        if (bin.right > innerWidth + 0.5 || bin.width < 44) throw new Error(width + ' px: 🗑 is not on screen at the right end: ' + JSON.stringify([bin.left, bin.width]));
        const insp = document.getElementById('inspector-panel');
        if (width <= 700) {
          if (insp.classList.contains('open')) throw new Error('380 px: selecting a clip raised today’s panel — the tray is the selection’s home (D10)');
          smTool('more').click(); await v.sleep(200);
          document.getAnimations().forEach(a => { try { a.finish(); } catch (e) {} });
          if (!insp.classList.contains('open')) throw new Error('380 px: More did not raise today’s panel');
          if (insp.getBoundingClientRect().top < document.getElementById('sm-say').getBoundingClientRect().bottom - 0.5) throw new Error('380 px: the panel covers the tray');
        } else {
          const bar = document.getElementById('sm-bar');
          if (bar.parentNode !== insp) throw new Error('1280 px: the tray and tools are not in the left band');
          if (!document.querySelector('#inspector .sm-band-hint')) throw new Error('1280 px: the band shows Full’s editor for a selection nobody asked a panel for');
          smTool('more').click(); await v.sleep(120);
          if (document.querySelector('#inspector .sm-band-hint')) throw new Error('1280 px: More did not open today’s panel in the band (D20 A)');
        }
        /* CONTROL — Full: a selection in Full raises today's panel (phone) and draws today's layer editor in the band (PC), and
           no Simple row shows. A, whose More was never pressed, so a panel Simple left open cannot answer for Full (the
           review's G2 / G3: with B here, removing isSimple() from sheetHeld or bandIdle survived). */
        FM.editor.apply('full', { force: true, quiet: true }); FM.selectLayer(null); FM.selectLayer(v.L('A').id); await v.sleep(120);
        if (width <= 700 && !insp.classList.contains('open')) throw new Error('CONTROL: in Full selecting a clip no longer raises its panel');
        if (document.querySelector('#inspector .sm-band-hint')) throw new Error('CONTROL: in Full the band shows Simple’s hint instead of the layer editor');
        if (getComputedStyle(document.getElementById('sm-bar')).display !== 'none' && document.getElementById('sm-bar').getClientRects().length) throw new Error('CONTROL: the Simple rows show in Full');
      });
    }, width);
  }
  test('simple P2.2 · at 380 a selected clip’s tools fill the tray row under the timeline, the project tools stay below it, nothing moves, More raises today’s panel', { item: '980', budgetMs: 60000 }, async function () { await smTrayCheck(380); });
  test('simple P2.2 · at 1280 the tray and the project tools sit at the bottom of the left band and a panel opens above them only from More (D20 A)', { item: '980', budgetMs: 60000 }, async function () { await smTrayCheck(1280); });

  test('simple P2.2 · Move later and Move earlier reorder a clip one slot with what is on it; the other seams keep their amounts; Alt+← moves it back', { item: '980', budgetMs: 60000 }, async function () {
    await smP2((W, H) => [smT('On B', 3.5, 0.5, W, H), smT('On D', 10.5, 1, W, H), smV('D', 10, 2, W, H), smV('C', 5, 4, W, H), smV('B', 3, 2, W, H), smV('A', 0, 3, W, H)], async function (v) {
      const n0 = v.steps(), doc0 = v.doc();
      FM.selectLayer(v.L('B').id); await v.sleep(60);
      const later = smTool('later');
      if (!later) throw new Error('no Move later in the tray (it reads “' + v.say() + '”)');
      later.click(); await v.idle();
      const A = v.L('A'), B = v.L('B'), C = v.L('C'), D = v.L('D');
      if (C.start !== 3 || B.start !== C.start + C.duration || D.start !== 10) throw new Error('Move later did not give A C B · D: C ' + C.start + ', B ' + B.start + ', D ' + D.start);
      if (Math.abs(v.L('On B').start - 7.5) > 1e-9 || v.L('On D').start !== 10.5) throw new Error('the title on B did not travel with it, or the one on D moved: ' + v.L('On B').start + ', ' + v.L('On D').start);
      if (v.steps() !== n0 + 1) throw new Error('a move should be one step');
      /* Alt+← takes it back one slot */
      v.key('ArrowLeft', 'ArrowLeft'); /* no alt: does nothing new */
      window.dispatchEvent(new KeyboardEvent('keydown', { code: 'ArrowLeft', key: 'ArrowLeft', altKey: true, bubbles: true })); await v.idle();
      /* B carries its own trailing seam (the 1 s gap that was after it) back with it, as every reorder does (§3.6) */
      if (v.L('B').start !== 3 || v.L('C').start !== 6 || v.L('D').start !== 10) throw new Error('Alt+← did not give A B · C D: B ' + v.L('B').start + ', C ' + v.L('C').start + ', D ' + v.L('D').start);
      FM.history.undo(); FM.history.undo(); await v.sleep(30);
      if (v.doc() !== doc0) throw new Error('two undos did not restore the document');
    });
  });

  test('simple P2.2 · Lift off makes a clip an overlay above what slides under it and its title stays with it; Into row puts it back at the nearest cut', { item: '980', budgetMs: 60000 }, async function () {
    await smP2((W, H) => [smT('On B', 4, 1, W, H), smV('C', 6, 3, W, H), smV('B', 3, 3, W, H), smV('A', 0, 3, W, H)], async function (v) {
      FM.selectLayer(v.L('B').id); await v.sleep(60);
      smTool('lift').click(); await v.idle();
      const B = v.L('B'), C = v.L('C'), T = v.L('On B');
      if (B.start !== 3 || (B.sm && B.sm.main)) throw new Error('Lift off moved B or left it on the clip row: ' + B.start + ' ' + JSON.stringify(B.sm));
      if (C.start !== 3) throw new Error('C did not close up under B: ' + C.start);
      if (T.start !== 4 || !(T.sm && T.sm.stay)) throw new Error('the title on B should stay at 4 with Stay put: ' + T.start + ' ' + JSON.stringify(T.sm));
      const z = id => FM.scene.layers.findIndex(l => l.id === id);
      if (!(z(B.id) < z(C.id))) throw new Error('the lifted clip is under the clip that slid beneath it');
      if (!(z(T.id) < z(B.id))) throw new Error('the lifted clip went above its own title');
      FM.selectLayer(B.id); await v.sleep(60);
      smTool('into').click(); await v.idle();
      if (!(B.sm && B.sm.main) || B.start !== 3 || C.start !== 6) throw new Error('Into row did not put B back at 3 with C after it: B ' + B.start + ' ' + JSON.stringify(B.sm) + ', C ' + C.start);
    });
  });

  test('simple P2.2 · Length: + and − change the clip by one frame and what follows moves; a typed length trims; Start trims the head', { item: '980', budgetMs: 60000 }, async function () {
    await smP2((W, H) => [smV('B', 3, 3, W, H), smV('A', 0, 3, W, H)], async function (v) {
      const A = v.L('A'), B = v.L('B');
      FM.selectLayer(A.id); await v.sleep(60);
      smTool('length').click(); await v.sleep(40);
      if (!smTool('lenPlus')) throw new Error('Length did not open its row');
      smTool('lenPlus').click(); await v.idle();
      if (Math.abs(A.duration - (3 + 1 / 30)) > 1e-9 || B.start !== A.start + A.duration) throw new Error('+ did not lengthen A by a frame with B following: ' + A.duration + ' / ' + B.start);
      const inp = document.querySelector('#sm-tray .sm-len-v');
      inp.value = '2'; inp.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', bubbles: true })); await v.idle();
      if (Math.abs(A.duration - 2) > 1e-9 || B.start !== 2) throw new Error('typing 2 did not trim A to 2 s with B at 2: ' + A.duration + ' / ' + B.start);
      smTool('lenEdge').click(); await v.sleep(30);
      smTool('lenMinus').click(); await v.idle();
      if (Math.abs(A.duration - (2 - 1 / 30)) > 1e-9 || A.start !== 0 || Math.abs((A.trimStart || 0) - 1 / 30) > 1e-9) throw new Error('Start − did not trim A’s head by a frame keeping its slot: ' + [A.start, A.duration, A.trimStart]);
    });
  });

  test('simple P2.2 · the + appends end to end BEFORE an end card, which moves along; Clips › After Clip 1 inserts at that cut', { item: '980', budgetMs: 60000 }, async function () {
    const files = await Promise.all(['#ff0000', '#00ff00'].map(c => smPng(c)));
    await smP2((W, H) => [smT('End', 6, 2, W, H), smV('B', 3, 3, W, H), smV('A', 0, 3, W, H)], async function (v) {
      const n0 = v.steps();
      await FM.simpleTimeline.pickFiles(files); await v.idle();
      const imgs = FM.scene.layers.filter(l => l.type === 'image').sort((a, b) => a.start - b.start);
      if (imgs.length !== 2) throw new Error('the + added ' + imgs.length + ' clips (it said “' + v.say() + '”)');
      const d = imgs[0].duration;
      if (imgs[0].start !== 6 || imgs[1].start !== 6 + d) throw new Error('the clips are not end to end from 6: ' + imgs.map(l => l.start));
      if (Math.abs(v.L('End').start - (6 + 2 * d)) > 1e-9) throw new Error('the end card did not move after the new clips: ' + v.L('End').start);
      if (!imgs.every(l => l.sm && l.sm.main)) throw new Error('the appended clips are not on the clip row');
      if (v.steps() !== n0 + 1) throw new Error('an append should be one step, got ' + (v.steps() - n0));
      const z = id => FM.scene.layers.findIndex(l => l.id === id);
      if (!(z(imgs[0].id) < z(v.L('B').id)) || !(z(v.L('End').id) < z(imgs[0].id))) throw new Error('the new clips are not just above the clip before them (and under the title)');
      /* Insert: at 2.2 s the nearest cut is A|B (3 s) */
      const more = await smPng('#0000ff');
      await FM.spine.cmd.insert([more], FM.spine.insertIndexAt(FM.spine.classify(FM.scene), 2.2)); await v.idle();
      const ins = FM.scene.layers.filter(l => l.type === 'image' && imgs.indexOf(l) < 0)[0];
      if (!ins || ins.start !== 3 || v.L('B').start !== 3 + ins.duration) throw new Error('the insert did not land at 3 with B after it: ' + (ins && ins.start) + ' / ' + v.L('B').start);
    });
  });

  test('simple P2.2 · Text adds at the playhead held inside the video; Overlay lands above the clip, under titles', { item: '980', budgetMs: 60000 }, async function () {
    const pic = await smPng('#ffffff', 'logo.png');
    await smP2((W, H) => [smT('Title', 0, 6, W, H), smV('A', 0, 6, W, H)], async function (v) {
      FM.time = 6;   // the playhead parked at the end, where playback leaves it (§3.6 Add row)
      smTool('text').click(); await v.idle();
      const t = FM.scene.layers.find(l => l.type === 'text' && l.name === 'Text');
      if (!t) throw new Error('Text added nothing (it said “' + v.say() + '”)');
      if (t.start + t.duration > 6 + 1e-9) throw new Error('the new text runs past the end of the video: ' + t.start + '+' + t.duration);
      if (Math.abs(t.duration - Math.min(6, FM.defaultLayerDuration())) > 1e-9) throw new Error('a text added at the very end should slide back and keep its whole length, got ' + t.duration + ' s at ' + t.start);
      if (FM.textEdit && FM.textEdit.isActive && !FM.textEdit.isActive()) throw new Error('the new text did not open for typing');
      if (FM.textEdit && FM.textEdit.stop) FM.textEdit.stop();
      FM.time = 1;
      await FM.spine.cmd.addOverlay([pic]); await v.idle();
      const o = FM.scene.layers.find(l => l.type === 'image');
      const z = id => FM.scene.layers.findIndex(l => l.id === id);
      if (!o || !(z(o.id) < z(v.L('A').id)) || !(z(v.L('Title').id) < z(o.id))) throw new Error('the overlay is not between the clip and the title in the stack: ' + FM.scene.layers.map(l => l.name).join(' / '));
      if (o.start + o.duration > 6 + 1e-9) throw new Error('the overlay runs past the end of the video');
    });
  });

  test('simple P2.2 · Simple’s ⋯ offers Close all gaps, which closes every gap and overlap in one step; Full’s ⋯ is untouched', { item: '980', budgetMs: 60000 }, async function () {
    await smP2((W, H) => [smV('C', 7.4, 2, W, H), smV('B', 4, 3.8, W, H), smV('A', 0, 3, W, H)], async function (v) {
      const n0 = v.steps();
      document.getElementById('btn-opts').click(); await v.sleep(60);
      const item = Array.from(document.querySelectorAll('.sm-menu .sm-menu-i')).find(b => /Close all gaps/.test(b.textContent));
      if (!item) throw new Error('Simple’s ⋯ has no Close all gaps');
      item.click(); await v.idle();
      const A = v.L('A'), B = v.L('B'), C = v.L('C');
      if (B.start !== A.start + A.duration || C.start !== B.start + B.duration) throw new Error('not every seam was closed: B ' + B.start + ', C ' + C.start);
      if (v.steps() !== n0 + 1) throw new Error('Close all gaps should be one step');
      /* CONTROL — Full's ⋯ opens Full's own strip, no Simple menu */
      FM.editor.apply('full', { force: true, quiet: true });
      document.getElementById('btn-opts').click(); await v.sleep(60);
      if (document.querySelector('.sm-menu')) throw new Error('CONTROL: Simple’s menu opened from Full’s ⋯');
      document.getElementById('btn-opts').click(); await v.sleep(30);
    });
  });

  test('simple P2.2 · the black band names what runs past the last clip: End with the video fits a title, a song is named and left (D17 B)', { item: '980', budgetMs: 60000 }, async function () {
    await smP2((W, H) => [smT('Whole', 0, 9, W, H), smSong('Song', 0, 12, W, H), smV('B', 3, 3, W, H), smV('A', 0, 3, W, H)], async function (v) {
      const band = document.querySelector('#sm-main .sm-band');
      if (!band) throw new Error('no black band while a title and a song run past the last clip');
      band.click(); await v.sleep(30);
      if (!/2 things run past the end/.test(v.say())) throw new Error('the band’s line is wrong: “' + v.say() + '”');
      await v.sleep(450);
      const b = Array.from(document.querySelectorAll('#sm-say .sm-say-b')).find(x => /End with the video/.test(x.textContent));
      if (!b) throw new Error('no End with the video while a picture runs past');
      b.click(); await v.idle();
      if (Math.abs(v.L('Whole').start + v.L('Whole').duration - 6) > 1e-9) throw new Error('the title was not fitted to the end of the video: ' + (v.L('Whole').start + v.L('Whole').duration));
      if (v.L('Song').duration !== 12) throw new Error('the song was trimmed — D17 B: music runs on in black');
      document.querySelector('#sm-main .sm-band').click(); await v.sleep(30);
      if (!/the song runs 6.0 s past the last clip/.test(v.say()) || document.querySelector('#sm-say .sm-say-b')) throw new Error('the song’s line is wrong or offers to trim it: “' + v.say() + '”');
    });
  });

  test('simple P2.2 · a crossfade stops Move, Lift off and Clips › After Clip 1 with its own words and writes nothing; a clip off the fade still moves', { item: '980', budgetMs: 60000 }, async function () {
    const png = await smPng('#0a0', 'x.png');
    await smP2((W, H) => [
      (() => { const b = smV('B', 4, 5, W, H); b.transform.opacity = smKf([[4, 0], [5, 1]]); return b; })(),
      smV('D', 13, 2, W, H), smV('C', 9, 4, W, H), smV('A', 0, 5, W, H)
    ], async function (v) {
      const R0 = FM.spine.read(FM.scene), sb = R0.main[1] && R0.main[1].seam;
      if (!sb || sb.kind !== 'blend') throw new Error('CONTROL: the fixture is not a crossfade between A and B: ' + JSON.stringify(sb));
      const doc0 = v.doc(), n0 = v.steps();
      FM.selectLayer(v.L('B').id); await v.sleep(60);
      smTool('later').click(); await v.idle();
      if (!/Some clips fade into each other · move them by hand/.test(v.say())) throw new Error('Move later on a crossfaded clip said “' + v.say() + '” (DESIGN §3.11: “Some clips fade into each other · move them by hand”)');
      smTool('lift').click(); await v.idle();
      if (!/Some clips fade into each other · move them by hand/.test(v.say())) throw new Error('Lift off on a crossfaded clip said “' + v.say() + '”');
      await FM.spine.cmd.insert([png], 1); await v.idle();
      if (!/^Clips 1 and 2 fade into each other · pick another cut/.test(v.say())) throw new Error('Clips › After Clip 1 at a crossfade said “' + v.say() + '” (want “Clips 1 and 2 fade into each other · pick another cut”)');
      if (v.doc() !== doc0 || v.steps() !== n0) throw new Error('a refused command wrote to the document or took a step');
      /* CONTROL: D, nowhere near the fade, moves earlier past C in one step */
      FM.selectLayer(v.L('D').id); await v.sleep(60);
      smTool('earlier').click(); await v.idle();
      if (v.L('D').start !== 9 || v.L('C').start !== 11 || v.steps() !== n0 + 1) throw new Error('CONTROL: Move earlier on D did not give A B D C: D ' + v.L('D').start + ', C ' + v.L('C').start + ' (it said “' + v.say() + '”)');
    });
  });

  test('simple P2.2 · on an adopted project the + still takes a whole-video title and a watermark added in Full to the new end (§4.5, §3.6 Append row)', { item: '980', budgetMs: 60000 }, async function () {
    const files = await Promise.all(['#ff0000', '#00ff00', '#0000ff', '#ffff00'].map(c => smPng(c)));
    await smP2((W, H) => [smT('Whole', 0, 6, W, H), smV('B', 3, 3, W, H), smV('A', 0, 3, W, H)], async function (v) {
      const end = l => (+l.start || 0) + (+l.duration || 0);
      await FM.simpleTimeline.pickFiles([files[0]]); await v.idle();          // the first append adopts the project
      const R1 = FM.spine.read(FM.scene);
      if (!(FM.scene.project.sm && FM.scene.project.sm.adopted)) throw new Error('CONTROL: the first append did not adopt the project');
      if (Math.abs(end(v.L('Whole')) - R1.trackEnd) > 1e-9) throw new Error('CONTROL: the first append did not take the whole-video title to the new end: ' + end(v.L('Whole')) + ' vs ' + R1.trackEnd);
      /* 1. an sm.tail title on an adopted project: the next append must refit it */
      await FM.simpleTimeline.pickFiles([files[1]]); await v.idle();
      const R2 = FM.spine.read(FM.scene);
      if (!(R2.trackEnd > R1.trackEnd + 0.5)) throw new Error('the second append added nothing (it said “' + v.say() + '”)');
      if (Math.abs(end(v.L('Whole')) - R2.trackEnd) > 1e-9) throw new Error('the whole-video title stopped at ' + end(v.L('Whole')) + ' while the clips now run to ' + R2.trackEnd + ' — the new clips export without it (§4.5)');
      /* 2. no sm.tail anywhere, and a watermark added in Full after adoption (no flag) covering the whole clip row */
      FM.deleteLayer(v.L('Whole').id);
      FM.scene.layers.unshift(smT('Mark', 0, R2.trackEnd, v.W, v.H)); FM.history.commit(); FM.refreshAll(); await v.sleep(30);
      await FM.simpleTimeline.pickFiles([files[2], files[3]]); await v.idle();
      const R3 = FM.spine.read(FM.scene), M = v.L('Mark');
      if (!(R3.trackEnd > R2.trackEnd + 0.5)) throw new Error('the third append added nothing (it said “' + v.say() + '”)');
      if (Math.abs(end(M) - R3.trackEnd) > 1e-9 || !(M.sm && M.sm.tail)) throw new Error('the watermark added in Full after adoption was not tagged and fitted: it ends at ' + end(M) + ', the clips at ' + R3.trackEnd + ', sm ' + JSON.stringify(M.sm || null));
    });
  });
```

**Edit to Phase 1's T19 in 2.2** (a selection no longer raises the panel; More does):

#### 2.2.T1 `tests/tests.js`

Find (exactly once):

```js
        FM.selectLayer(v.c2.id); await v.sleep(120);
```

Replace with:

```js
        FM.selectLayer(v.c2.id); await v.sleep(60);
        if (FM.simpleTools && FM.simpleTools.openPanel) FM.simpleTools.openPanel(v.c2.id);   // Phase 2.2 (D10): a panel opens from the tray's More, not on select
        await v.sleep(120);
```


### 4.8 How each test fails on the tree before 2.2 (2.1 applied), at 1280 and 380 (same at both)

| Test | Fails before as | Kind |
|---|---|---|
| simple P2.2 · at 380 a selected clip’s tools fill the tray row under the timeline, the project tools stay below it, nothing moves, More raises today’s panel | 380 px: the main clip tray is [], want ["length","earlier","later","lift","duplicateClip","crop","more","delete"] | behaviour |
| simple P2.2 · at 1280 the tray and the project tools sit at the bottom of the left band and a panel opens above them only from More (D20 A) | 1280 px: the main clip tray is [], want ["length","earlier","later","lift","duplicateClip","crop","more","delete"] | behaviour |
| simple P2.2 · Move later and Move earlier reorder a clip one slot with what is on it; the other seams keep their amounts; Alt+← moves it back | no Move later in the tray (it reads “”) | behaviour |
| simple P2.2 · Lift off makes a clip an overlay above what slides under it and its title stays with it; Into row puts it back at the nearest cut | Cannot read properties of null (reading 'click') | tool absent (presence only) |
| simple P2.2 · Length: + and − change the clip by one frame and what follows moves; a typed length trims; Start trims the head | Cannot read properties of null (reading 'click') | tool absent (presence only) |
| simple P2.2 · the + appends end to end BEFORE an end card, which moves along; Clips › After Clip 1 inserts at that cut | the + added 0 clips (it said “”) | behaviour |
| simple P2.2 · Text adds at the playhead held inside the video; Overlay lands above the clip, under titles | Cannot read properties of null (reading 'click') | tool absent (presence only) |
| simple P2.2 · Simple’s ⋯ offers Close all gaps, which closes every gap and overlap in one step; Full’s ⋯ is untouched | Simple’s ⋯ has no Close all gaps | behaviour |
| simple P2.2 · the black band names what runs past the last clip: End with the video fits a title, a song is named and left (D17 B) | no black band while a title and a song run past the last clip | behaviour |
| simple P2.2 · a crossfade stops Move, Lift off and Clips › After Clip 1 with its own words and writes nothing; a clip off the fade still moves (review) | before 2.2: Cannot read properties of null (reading 'click') (tool absent); **on 2.2 as first written**: Move later on a crossfaded clip said “That didn’t work, so nothing changed” | behaviour (on 2.2 as first written) |
| simple P2.2 · on an adopted project the + still takes a whole-video title and a watermark added in Full to the new end (review) | before 2.2: the + added nothing; **on 2.2 as first written**: the whole-video title stopped at 11 while the clips now run to 21 — the new clips export without it (§4.5) | behaviour (on 2.2 as first written) |

### 4.9 Mutation proofs (run alone at 1280 on the finished 2.2 tree)

| # | File | The rule broken | Test | Result |
|---|---|---|---|---|
| N1 | `js/simple-tools.js` | `sheetHeld(id) { return isSimple() && panelFor !== id; },` → `sheetHeld(id) { return false; },` | simple P2.2 · at 380 | **caught**: FAILsimple P2.2 · at 380 a selected clip’s tools fill the tray row under the timeline, the project tools stay below it, nothing moves, More raises today’s panel — 380 px: selecting a clip raised today |
| N2 | `js/spine-edit.js` | `const dOf = k => (k > i && k < j) ? -len : (k >= j && k < i) ? len : 0;` → `const dOf = k => 0;` | simple P2.2 · Move later | **caught**: FAILsimple P2.2 · Move later and Move earlier reorder a clip one slot with what is on it; the other seams keep their amounts; Alt+← moves it back — Move later did not give A C B · D: C 5, B 9, D 10 |
| N3 | `js/spine-edit.js` | `S.setFlag(L, 'main', false);` → `(removed)` | simple P2.2 · Lift off | **caught**: FAILsimple P2.2 · Lift off makes a clip an overlay above what slides under it and its title stays with it; Into row puts it back at the nearest cut — Lift off moved B or left it on the clip row: 3 {"m |
| N4 | `js/spine-edit.js` | `R.tail.forEach(id => addMove(plan, id, sum));` → `(removed)` | simple P2.2 · the + appends | **caught**: FAILsimple P2.2 · the + appends end to end BEFORE an end card, which moves along; Clips › After Clip 1 inserts at that cut — the end card did not move after the new clips: 6 |
| N5 | `js/spine-edit.js` | `if (s >= R.trackEnd - ml) s = Math.max(last.start, R.trackEnd - len);` → `(removed)` | simple P2.2 · Text adds | **survived** |
| N6 | `js/spine-edit.js` | `if (u.kind === 'audio' \|\| l.audioOnly === true \|\| (l.sm && l.sm.snd === true)) out.sounds.` → `if (false) out.sounds.push(l);` | simple P2.2 · the black band | **caught**: FAILsimple P2.2 · the black band names what runs past the last clip: End with the video fits a title, a song is named and left (D17 B) — the song was trimmed — D17 B: music runs on in black |
| N7 | `js/simple-tools.js` | `if (anyGap) items.push(` → `if (false) items.push(` | simple P2.2 · Simple’s ⋯ | **caught**: FAILsimple P2.2 · Simple’s ⋯ offers Close all gaps, which closes every gap and overlap in one step; Full’s ⋯ is untouched — Simple’s ⋯ has no Close all gaps |
| N8 | `js/simple-tools.js` | `S.cmd.length(id, L.duration + sign / fps);` → `S.cmd.length(id, L.duration + 2 * sign / fps);` | simple P2.2 · Length | **caught**: FAILsimple P2.2 · Length: + and − change the clip by one frame and what follows moves; a typed length trims; Start trims the head — + did not lengthen A by a frame with B following: 3.066666666666667  |
| N9 | `js/simple-tools.js` | `bandIdle(layer) { return isSimple() && !(layer && panelFor === layer.id); },` → `bandIdle(layer) { return false; },` | simple P2.2 · at 1280 | **caught**: FAILsimple P2.2 · at 1280 the tray and the project tools sit at the bottom of the left band and a panel opens above them only from More (D20 A) — 1280 px: the band shows Full’s editor for a selection  |
| N10 | `js/spine-edit.js` | `const rp = ripple(plan, R, j, len, new Set([id]), seam + len, true);` → `const rp = ripple(plan, R, j, 0, new Set([id]), null, false)` | simple P2.2 · Lift off | **caught**: FAILsimple P2.2 · Lift off makes a clip an overlay above what slides under it and its title stays with it; Into row puts it back at the nearest cut — Into row did not put B back at 3 with C after it:  |
| N5b | `js/spine-edit.js` | `if (s >= R.trackEnd - ml) s = Math.max(last.start, R.trackEnd - len);` → `(removed)` | simple P2.2 · Text adds | **caught**: FAILsimple P2.2 · Text adds at the playhead held inside the video; Overlay lands above the clip, under titles — the new text runs past the end of the video: 6+0.1 |
| X1 (review) | `js/spine-edit.js` | the 2.2.3 `insertFade` case → removed | simple P2.2 · a crossfade stops | **caught at 1280 and 380**: Clips › After Clip 1 at a crossfade said “Clips undefined and undefined fade into each other · pick another cut” |
| A1 (review) | `js/spine-edit.js` | planAppend's `arranges` → `R.tail.length > 0` (as first written) | simple P2.2 · on an adopted project | **caught at 1280 and 380**: the whole-video title stopped at 11 while the clips now run to 21 |
| A2 / A3 (review) | `js/spine-edit.js` | `arranges` without its `wholeUntagged` half / without its `sm.tail` half | simple P2.2 · on an adopted project | **both caught**: A2 at 1280 (the watermark added in Full after adoption was not tagged and fitted), A3 at 380 (the whole-video title stopped at 11 while the clips now run to 21) |
| G2 (review, Full containment) | `js/simple-tools.js` | `sheetHeld(id) { return isSimple() && …` → without `isSimple()` (Full's phone sheet never rises) | simple P2.2 · at 380 | **survived the control as first written** (it re-selected B, whose More had set `panelFor`); **caught** with the control on A: CONTROL: in Full selecting a clip no longer raises its panel |
| G3 (review, Full containment) | `js/simple-tools.js` | `bandIdle(layer) { return isSimple() && …` → without `isSimple()` (Full's band shows Simple's hint) | simple P2.2 · at 1280 | **survived every Simple test as first written (40/40)**; **caught** with the new band clause: CONTROL: in Full the band shows Simple’s hint instead of the layer editor |

**N5 survived the first version of the Text test** (the playhead 0.1 s before the end, where the clamp alone keeps the title
inside the video); the test now parks the playhead at the very end and asks for the whole default length, and N5b is caught.
The three "tool absent" rows of §4.8 fail before only because the tray has no such button: N3, N5b, N8 and N10 are their
behaviour proofs.

### 4.10 The screens (through the real app with `tools/shot.py`, 380×667 and 1280×800)

A four-photo portrait project (1080×1920) added through Simple's own Append, a title added with the Text tool. Saved in
the session scratchpad (`phase2/shots/`), not the repo; **send him these before 2.2 ships** (his rule: no visual unseen).

| Shot | What it shows | Measured |
|---|---|---|
| `p22-380-idle` | nothing selected: the tray row reads *"4 clips · 0:20"*; the project tools Clips · Text · Sound · Overlay under it | tray top 444 (50 tall inside its borders), tools top 495, 57 tall; stage 180 |
| `p22-380-selected` | Clip 2 selected: Length · Move earlier · Move later · Lift off · Duplicate · Crop · … · 🗑 pinned right, the row scrolling under it; no panel raised; nothing moved | the same tops as idle |
| `p22-380-length` | Length open: Done · End · −1 frame · 5.00 · +1 frame | — |
| `p22-380-opts` | Simple's ⋯ with no gap: *"Loop and preview speed…"* (Close all gaps appears only when there is one) | — |
| `p22-1280-idle`, `-selected`, `-length`, `-opts` | the same rows at the bottom of the left band, the band above them clear (*"Its tools are below · More opens the rest"*) | tray top 691, tools 743 in a 240 px band |

**Seen, and left as stated:** Phase 1's first-arrival toast sits over the clip row for 2.6 s on the first switch; with the
tray scrolled to its end the last tool's label can show under 🗑's fade (the fade is 14 px); the band's header still carries
Full's small "LAYER" caption above the clear area on PC.

---

## 5. Release 2.3: speed, sound and replacing (specified with anchors; code NOT written, NOT run)

**What he sees:** the main-clip tray gains **Speed · Volume · Replace · Reverse · Take sound out** (or **Put sound back**), the
overlay tray **Volume · Speed**, the sound tray **Volume · Fade · Speed**; the 🔈 at the head of the clip row mutes every
clip's own sound (Mute clip sound). "More" stays for everything else. **What he holds:** a 2× speed-up that closes up
the clips after it, a Replace with a shorter clip that closes up too, a voice taken out of a clip that stays in step
through every trim, split and speed change. **POLISH-LOG template:** `- vX.YY — queue 980 (partial) — Simple: Speed,
Volume, Replace, Reverse and Take sound out on a clip; Mute clip sound on the clip row; a panel in Simple never adds a
keyframe. Full is unchanged.`

| Piece | Where (anchor, quoted, found once in v17.21 + Phase 1 + 2.1 + 2.2) | What |
|---|---|---|
| `FM.setClipSpeed(layer, sp)` (§0.4 I8) | `js/inspector.js` the speed slider's flat branch, `          const durBefore = layer.duration;                   // measured BEFORE, so the keyframes below scale by what ACTUALLY happened` … `          if (end > FM.scene.project.duration) FM.scene.project.duration = end;` | move the lines between those two anchors, unchanged, into `FM.setClipSpeed = function (layer, sp) { … }` in `js/inspector.js` (module scope), and call it from the slider. FU2 drives the slider on HEAD and on the tree (identical document) |
| `S.planSpeed(R, id, sp)` | `js/spine-edit.js`, before `  S.undoGate = function () {` | §3.6 Speed row: refuse `span / sp < MIN_LEN − 1e-6` (*"Too short to speed up that much"*), the same on each twin, and a new length under `2·amt` of a blend; else in `writes`: `FM.setClipSpeed(c, sp)` on c and each twin, then `S.scaleKeysCueFx(c, k)` (the cue-effect lists `animatedProps` leaves out, over `FM.timedLists(c)` minus `FM.animatedProps(c)`); followers `addMove(f, (f.start − c.start)·(k − 1))`; effect followers clamped; `ripple(i+1, new − old)`; time per §3.6.2 |
| the Speed panel | `js/simple-tools.js`, `trayFor` | an inline row like Length: presets 0.5× 1× 1.5× 2× 3× and a 0.25–4× slider whose upper stop is `min(4, span / MIN_LEN)` (and `span / (2·amt)` on a blend); the slider changes only the boxes and `playbackRate` while it moves (DOM-only preview), and commits ONE `S.cmd.speed` on release. A ramped clip shows *"Speed changes over the clip"* + **Use one speed** (§3.6) |
| `FM.shiftProp(container, key, value, time)` (§8.5) | `js/scene.js`, after `  FM.shiftTransform = function (layer, key, value, time) {`'s closing `};` | numeric animated rows: gain-like keys multiplied by `value / evalProp`, others shifted by the difference, each key clamped, the key count never changes. Volume and Fade rows in Simple write through it; colour rows on an animated value are read-only with *"Changes over time ✦ · Open in Full"* (T23) |
| Simple's Volume / Fade | `js/simple-tools.js` | an inline row (0–200 %, the existing `FM.layerVolume` scale) committing through a non-arranging `S.edit` plan that calls `FM.shiftProp(layer, 'volume', v, FM.time)` (or a plain write when not animated); on a clip with a twin it acts on the twin (the original is muted) |
| `FM.pickReplacement(id)` + `FM.swapInMedia(id, nrec, {noSave})` (§3.6 Replace) | `js/app.js` `  FM.replaceMedia = function (id) {` | split today's body at its decode: `pickReplacement` = the picker + decode (resolves `null` when dismissed, never left pending), `swapInMedia` = stash the old record, swap, fit, `mediaRev++`, `rec.rev`, write `srcW`/`srcH`/`srcRev` and, on Simple's route, `sm.snd` from the record; `FM.replaceMedia(id)` = `pickReplacement` then `swapInMedia` (Full's ⋯ behaves exactly as today; FU2's Replace step) |
| `S.planReplace(R, id, nrec)` | `js/spine-edit.js` | the slot is kept; a shorter source becomes `planTrimTail`'s plan in the same step; `swapInMedia` in `pre`; the picker runs at the tap, before `S.edit` |
| Reverse | `js/spine-edit.js` | §3.6 Reverse row: `sets reversed` on c and every twin, nothing else moves; after commit `FM.ensureReverseCache(c)` (never for a twin, §0.4 B9), `FM.reconcileAudio()` |
| Take sound out / Put sound back (§4.6) | `js/spine-edit.js` (**not** `FM.extractAudio`: review §14, contained) | Simple's Take sound out calls `FM.extractAudio(c)` inside a non-arranging `S.edit` step, finds the layer it made by diffing `FM.scene.layers` ids around the call (`extractAudio` returns nothing), and sets `sm.twin` on it itself with `S.setFlag(dup, 'twin', true)`. Full's `extractAudio` is not edited, so Full's Extract Audio writes exactly HEAD's document and FU2 needs no `sm.twin` mask for it (a Full-made twin is still found by `S.isTwinOf`: `karaokeOf` or the same source file); Put sound back deletes the twin and un-mutes c in one step. The twin draws as a 6 px waveform band along the bottom of its clip in `js/simple-timeline.js` and leaves the Sound row (`R.lanes.audio` filters `S.isTwinOf`) |
| Mute clip sound (§3.6 Mute row) | `js/simple-timeline.js` the clip row's head | the 🔈 toggles `project.sm.muteClips` through a non-arranging `S.edit`: on = `muted` + `sm.muteByMode` on every main clip not already muted; off = un-mute only those still carrying the flag and still muted, never one with a twin |
| `sm.snd` at add (§0.4 B8) | already written by 2.2's `addRecs`; 2.3 adds it on `swapInMedia`'s Simple route | — |

**Tests to write first (each failing before 2.3):** T23 (volume keys [1, 0.3, 1] set to 50 % keep their count and scale by
0.5 / 0.3, no key at `FM.time`; mutation: `shiftProp` → `setProp` goes red), T24 (twins through head trim, tail trim, 2×,
split + reorder of B, reverse: timing equal to the clip after each; the karaoke toggle on B; Mute clip sound off never
un-mutes an extracted original), T25 (the Speed panel: 2× on the middle of three clips closes up with one step and the
scene untouched before release; 0.25 s at 3× refused byte-identical; 0.25 s at 2× commits), a Replace-shorter test (slot
kept, the gap closed, one step, Undo restores the old file through `restoreReplacedMedia`), and FU2's speed-slider and
Replace steps on HEAD and the tree.

## 6. Release 2.4: riders, couplings and crossfades (specified; NOT written, NOT run)

**What he sees:** none of 2.1–2.3's *"…comes along in the next update · Open in Full"* refusals any more: captions follow
their clips cue by cue, a camera move rides the clips, a crossfade made in Full survives a trim, a matte or parent link asks
once (*"1 parent will slip"* + **Do it anyway** + **Why? ›**), and titles timed to a song offer **Keep on the music**.

| Piece | Where | What |
|---|---|---|
| the cue maps (§3.5) | `js/spine-edit.js`: replace `riderBlock`'s caption half | one piecewise map `f` per command (Delete, Insert/Append, trims, Speed, Close gap) and the piecewise translation `g` (Reorder, Sort), applied to both ends of every visible cue, the window (ends snapped to `trackEnd` / the first clip within `R.eps`), hidden cues rigidly, cues under `MIN_CUE` dropped and counted; `FM.captions.splitAt(cues, T)` factored out of `FM.splitLayer`'s caption branch (`js/app.js`, the block starting `    if (Array.isArray(layer.captions)) {` inside `FM.splitLayer`), which keeps calling it (§0.4 I8, FU2's caption split) |
| `FM.seamKey` / `FM.divideSegment` (§3.10 rule 3a) | **a copy** of `splitLayer`'s `easeBezOf` / `splitBez` (the block starting `    const EASE_AS_BEZ = {`) in `js/spine-edit.js`, so Full's split is not touched (the copy approach of §0.4 I9; DESIGN asked for a factor-out, which would be a Full refactor) | boundary keys built like the split's seam key, each stamped `split: 1` **and** `sb: 1` |
| `FM.spine.riderKeys(layer, map)` | `js/spine-edit.js` | Cut(a, b) pairs, insert-form holds, loop guard; used for the camera (keys and window, rule 3f/3g), the caption track's own keys, the cut items of Delete (replacing 2.1's `cutKeys` refusal) and a crossfade's owned keys (§3.1, replacing 2.1's `fadeOwned` refusal) |
| Bounce skips `sb` (§0.4 B5) | `js/behaviors.js` `  function bounceDelta(layer, key, params, t) {` | in the non-lineage path, skip keys carrying `sb` when ≥ 2 unmarked keys remain; FU2's Bounce-on-split-keys case pins Full's output byte for byte. The key sanitiser (`safeKfProp`, `js/storage.js`) must keep `sb: 1` (check at build time; if it strips unknown key fields this needs a `SCHEMA_REV` bump) |
| the couplings ask (§3.10 rule 4) | `js/spine-edit.js` `couplingBlock` | returns the list instead of refusing; the runner asks once (*"1 parent will slip"* + **Do it anyway** + **Why? ›**) before writing anything; rule 1 (link-hosting through the stored id, B4), rule 1b (a hidden helper goes with its only user, after the premise check DESIGN flags), rule 2 (a null parenting main clips moves when all its children move by one `d`) |
| Keep on the music (§4.1) | `js/spine-edit.js` | `plan.musicTimed` and the replace-in-place re-plan |
| comment anchors (§13 #24, §0.4 B25) | `js/collab-comments.js` `  CM.add = function (text, opts) {`; `js/collab-host.js` `COMMENT_KEYS` | `ls` / `lo` / `cu` only for pins made while Simple is on screen; `CM.pinTime` returns `c.t` for every other pin (Full's marks are today's); `FM.remapCommentPins` on anchored pins only (T28) |

**Tests:** T3, T4, T9's round-2 key clauses, T28, and FU2's caption, Follow, matte and Bounce cases on HEAD and the tree.

## 7. Release 2.5: drags (specified; NOT written, NOT run)

Hold 350 ms and drag a main clip to reorder it (neighbours part, DOM only), up into the overlay section to lift it, an
overlay down onto the clip row to put it in; trim grips (13 px caps outside the edges, ≥ 24 px hit) with a length readout;
pinch to zoom; edge auto-scroll from a **copy** of `clipEdgeScroll` / `trimEdgeScroll`'s four brakes (`js/timeline.js`,
§0.4 I9: Full's two loops untouched); the arm gate `FM.spine.canArrange(id)` (the 2.1 gate, the lock, the read-only role)
read when a hold arms and again on release; a remote structural op ends the drag through
`FM.simpleTimeline.abortGestures(pred)`, called from `FM.cancelGesturesOn` (`js/app.js`
`    if (FM.timeline && FM.timeline.abortGestures && FM.timeline.abortGestures(same)) hit = true;` gains a Simple line after
it, inert in Full). Every drag commits through the same `S.cmd` as its button, so 2.2's tests already cover the result;
2.5's own tests are the arm gate (T10's drag clauses), the stale-gesture recovery, and a 20-clip reorder with edge scroll at
380 px (§13 #52), each with the synthetic-pointer caveat recorded in memory (capture-dependent touch behaviour needs a real
pointer path or `tools/shot.py`).

## 8. Release 2.6: the live session, finished (specified; NOT written, NOT run)

| Piece | Where | What |
|---|---|---|
| Arrange anyway | `js/collab-ui.js` beside 2.1's `U.roomEditors` | `waived` rids for this session (§3.7); the `live` line's **Options ›** (Make Sam a Viewer through `U.setMemberRole`, factored from the People menu's action at `js/collab-ui.js:568`, which then calls it) and *"Sam is offline · clips stay put"* + **Arrange anyway** |
| `U.leaveKeep(pid)` | `js/collab-ui.js` the Leave route (`LEAVE_KEEP` confirm, `patchCollab(pid, {ended: 'left'})`, `FM.projects.detachLinked`) | the `offline` line's **Make it my own** on a linked copy |
| undo labels and the soft line (§11) | `js/history.js` `lastStep`, `js/collab-session.js` `runStep` | `{label, ed, soft}`; in Simple one `#sm-say` line, in Full today's toast exactly (§0.4 B18) |
| the lease half of undo's pre-flight (§10.2 door 2a, §0.4 B22) | `js/collab-session.js` `runStep`, after the 2.1 door | for `ed: 's'` steps with an `li` / `lr` op or more than one layer written |
| Q29 (§10.1, §0.4 B21) | `js/collab-session.js` `    function onAck(ack) {` | a `'*'` refusal of a Simple-tagged tx resyncs at once with one line and drops undo steps by cid |
| the `li` mask (§11, §0.4 B19) | `js/collab-diff.js` the `li` rec; `js/collab-session.js` `runStep`'s `li` compare | `kb`, `by` and the `sm` membership keys masked on both sides; `start` still compared |
| `S.othersSeq` / `st.adopt` (§5.3) | `js/collab-session.js` `applyIncoming`, `closeStep`, `runStep` | adoption is never undone once anyone else wrote since |
| the host clamps `project.sm.v` | `js/collab-bridge.js` `project: function (p) { FM.storage._clampProjectDims(p); },` | `if (p.sm && p.sm.v > FM.SM_V) p.sm.v = FM.SM_V;` (also Phase 1's step 1.4) |

**Tests:** T10 in full (the past-grace case, `bye` paused / left, Arrange anyway, Make Sam a Viewer, the outbox line, the
linked copy), T5's live clauses, and FU4 (Full in a live session equals HEAD's tx stream) for every one of them.


## 9. What was run, and what was not

All runs: `tests/_cdp.py` against `tools/serve.sh` serving a scratch copy (a random sentinel file fetched back first), each
waiting for the repo's idle gate (no ship / mutation / spot-check, load < 8). Trees: **P1** = HEAD + Phase 1; **P2.1** = P1
+ release 2.1; **P2.2** = P2.1 + release 2.2.

| Run | Tree | 1280 | 380 |
|---|---|---|---|
| `simple P1` (17 Phase 1 tests, T8 fixed) | P1 | **17/17** | **17/17** |
| `921 S1` (schema and sanitiser, with the new `SCHEMA_FP`) | P1 | **24/24** | — |
| `simple P2.1` (14) before 2.1 | P1 | **0/13** + T2b 0/1 | **0/13** |
| `simple P2.1` after 2.1 | P2.1 | **13/13**, T2b **1/1** | **13/13** |
| `simple P2.2` (9) before 2.2 | P2.1 | **0/9** | **0/9** |
| `simple P` (all Phase 1 and Phase 2 tests) | P2.2 | **38/40** → the 2 reds are the Phase 1 tests 2.1 retires and edits; after the §3.6 / §4.7 test edits `simple P1` **16/16** | **38/40** → after the edits **16/16** |
| `simple P2.2` after 2.2 | P2.2 | **9/9** | (inside `simple P` above: **9/9**) |
| `921 S1` | P2.2 | — | **24/24** |
| Mutations 2.1 | P2.1 | **13 of 14 caught**; M1 survives T2's 12 seeds and is caught by T2b (M1b) | — |
| Mutations 2.2 | P2.2 | **10 of 11 caught**; N5 survived the first Text test (playhead 0.1 s before the end) and is caught by the strengthened one (N5b, playhead at the end) | — |
| **Final: `simple P` (16 Phase 1 after the edits + 14 P2.1 + 9 P2.2)** | **P2.2** | **39/39** | **39/39** |
| Screens | P2.2 | 4 shots, looked at | 4 shots, looked at |

**Not run:** the FU group (it is built before step 1.2 and does not exist yet; §2.3 lists what each release adds to it);
`tools/ship.sh` and `tools/prove.sh`; the whole suite with Phase 2 applied (only the slices above; Phase 2 touches
`history.js`, `collab-session.js`, `mobile.js` and `inspector.js`, so the builder's whole-suite run is the first full check of
them, and its reds must be paired on HEAD before they are believed); Safari and his iPhone; 375×553, 440×956 and the
sideways sizes; releases 2.3–2.6 (not written). The cog block (BUILD-PLAN 1.3.18–1.3.19) was not applied, so nothing here
exercised the switch through the cog; the tests switch with `FM.editor.set` / `apply`.

## 10. The open decisions, and where each touches Phase 2

**What he has to answer before the Simple editor is in his hands** (the question he asked on 1 Oct). Phase 2 itself needs
**no new answer**: every pick it uses is in (D4–D8 A, D10 A, D14 first half A, D17 B, D19 A, D20 A). What blocks is Phase 1's
step 1.3, the release that puts Simple on screen at all, and Phase 2 builds on it:

| D | The question, in short | Blocks | Touches Phase 2 | What this plan uses meanwhile |
|---|---|---|---|---|
| **D24** | his phone held sideways: where the cog's Editor tile goes (it is off screen today) — options drawn (`cog/d24-*.jpg`) | **step 1.3 does not ship until picked** | no | — |
| **D18** | the order of Simple's play-bar buttons on a phone: ⋯ · ✂ · (gap) · \|◀ (recommended) or packed | step 1.3 (one CSS rule) | ✂ is live from 2.1 in whichever slot D18 gives it; 2.2's Simple ⋯ menu hangs on the same ⋯ | A |
| **D22** | a Settings row gating the cog block, or none (recommended: none) | step 1.3 (`GATED`) | no: under B, Phase 2's tools appear only while the row is on, like the rest of Simple | A |
| **D23** | does the cog close after a switch (recommended: yes, unless Canvas has unapplied picks or Friends is open) | step 1.3 (one line) | no | A |
| **D3** | how a new project picks its editor (re-asked: A adds nothing to New project) | nothing in Phase 2 (Phase 3's Create picker only) | no | — |
| **D14b** | moving clips together while a friend who can edit is connected (Phase 4; changes Full in a session) | Phases 4–5 only | **2.1's live gate is the answer "not yet"**: arranging waits while someone else can edit, under either answer. Under B, Phase 4 lifts it; under A it stays | the gate (A) |

"Do recommended" answers all six. **D16 row 7** (the project-tool and tray icons, which must read icons-only) was answered
with D16 A; 2.2 ships exactly the paths V10 drew as recommended (`vis/kit.js` `ICONS`), so no new picture is needed for it,
but **the tray and the tools rows are a visual change he has not seen in the app**: his standing design rule is that
nothing visual ships unseen, so the builder sends the 380 and 1280 screenshot sheet (§4.10) before 2.2 ships, and changes
an icon or a word in one place (`ICON` in `js/simple-tools.js`, `tools` in `js/spine-words.js`) if he asks.

## 11. Fixes to BUILD-PLAN.md (Phase 1)

Found by applying BUILD-PLAN.md's Phase 1 hunks by script to `git archive HEAD` (v17.21, `28104a3e`) and running its tests:

| # | Where in BUILD-PLAN.md | What was wrong | Fix |
|---|---|---|---|
| P1 | **1.3.6** `index.html` | the Find text is `  <script src="js/app.js?v=467"></script>`; v17.21 has **`?v=468`**, so the anchor is found 0 times (the note above it says to match by path, but the quoted line carries the number) | Find `  <script src="js/app.js?v=468"></script>`; better, make §2.4's preflight line and the hunk match `js/app.js?v=` by path, as 1.2.22's note intends |
| P2 | **1.2.12** `js/collab-core.js` | `C.SCHEMA_FP = <printed by the gate>;` is a placeholder (by design) | measured on v17.21 + Phase 1 (scratch): **`C.SCHEMA_FP = 1486177182544587;`** — `921 S1 the schema fingerprint gate` printed it and then passed with it, and all 24 `921 S1` tests pass. Re-measure if any effect or the sanitiser changes before 1.2 ships (BUILD-PLAN §4.4) |
| P3 | **§5.6 T8** (`tests/tests.js`) | `JSON.stringify(FM.scene) !== doc0` compares the whole scene, which carries `selectedId` / `selectedIds`, and the test itself calls `FM.selectLayer(null)` between the two reads: red with *"switching back wrote to the document or took a step"* on a correct build | compare the document only: `const docOf = () => JSON.stringify({ project: FM.scene.project, layers: FM.scene.layers });` and use `docOf()` in the three places (**the exact hunks are §11.1 below**; the earlier text pointed at §3.6's list, which never had them). After it: T8 green at 1280 and 380 |
| P4 | **1.3.16** | its Find text is the text 1.2.17 writes, so it only matches after 1.2.17 | not a bug (the order is 1.2 then 1.3); worth one line in §2.4's preflight so a builder running 1.3's preflight on a pre-1.2 tree is not alarmed |
| P5 | **1.3.18, 1.3.19** (the cog block, the two getters) | written as prose plus a partial block (`cvPendingFp`, `cvOpenFp` and the pair table are described, not written), so they cannot be applied by script | not applied in this rehearsal; Phase 2 does not depend on them (the tests switch through `FM.editor.set` / `apply`). They remain NOT RUN, as BUILD-PLAN says |
| P6 | **1.3 `js/simple-timeline.js`** `sayLine`'s Open in Full | calls `FM.editor.set('full')`, which skips `request()`'s guard (an unapplied crop would make `apply()` refuse in silence) | Phase 2's 2.1.4 hunk replaces it with `FM.editor.request('full')`; if 1.3 ships alone, make the same one-word change there |

### 11.1 The T8 fix as hunks (BUILD-PLAN §5.6, `tests/tests.js`; apply with step 1.3's tests, before 1.3 ships)

Three Find / Replace pairs, each found exactly once in the T8 test (`simple P1 · T8 the switch writes nothing…`):

Find (exactly once):

```js
        const doc0 = JSON.stringify(FM.scene), hist0 = JSON.stringify(FM.history._steps()), z0 = FM.timeline.getZoom(), t0 = FM.time, commits0 = v.commits();
```

Replace with:

```js
        /* the DOCUMENT only: this test itself moves the selection between the two reads (selectLayer(null) to measure x),
           and FM.scene carries selectedId / selectedIds, so a whole-scene compare failed on the test's own tap */
        const docOf = () => JSON.stringify({ project: FM.scene.project, layers: FM.scene.layers });
        const doc0 = docOf(), hist0 = JSON.stringify(FM.history._steps()), z0 = FM.timeline.getZoom(), t0 = FM.time, commits0 = v.commits();
```

Find (exactly once):

```js
        if (JSON.stringify(FM.scene) !== doc0) throw new Error('the switch wrote to the document');
```

Replace with:

```js
        if (docOf() !== doc0) throw new Error('the switch wrote to the document');
```

Find (exactly once):

```js
        if (JSON.stringify(FM.scene) !== doc0 || v.commits() !== commits0) throw new Error('switching back wrote to the document or took a step');
```

Replace with:

```js
        if (docOf() !== doc0 || v.commits() !== commits0) throw new Error('switching back wrote to the document or took a step');
```

**And under D22 A, leave out the one test BUILD-PLAN §5.6 marks `D22 B ONLY`** (`simple P1 · the Settings row: …`): it is in the
same code block and fails on a D22 A build by design. This rehearsal and the review both dropped it; the Phase 1 counts here
(17, then 16 after 2.1) are without it.

Everything else in Phase 1 applied as written: all other 33 anchors were found exactly once, every file parsed, and the
Phase 1 tests ran green at both widths (BUILD-PLAN's own table predates its 1 Oct revision; this is the first run of the
revised 1.2 and 1.3, minus the cog block).

## 12. Where this plan differs from DESIGN.md

| DESIGN says | This plan does | Why |
|---|---|---|
| everything in `js/spine.js` (§14.1) | the write side is its own file, `js/spine-edit.js` | Phase 1's `spine.js` is the pure read side its tests hold to "never writes, never reads FM.scene"; the runner writes. One `FM.spine` object either way |
| `FM.trimClipEdge` in `js/timeline.js` (§14.2) | in `js/spine-edit.js` | used by Simple only (§0.4 B7); keeping it out of a shared file means `timeline.js` is not touched at all in 2.1 |
| `FM.history.beginEdit` / `restorePreEdit` in place through `diffDoc` (§3.7) | the runner's own snapshot, restored by assignment + `_afterExternalChange`, as `history.restore` does | the only post-apply refusals that need it are collab ones (a lease landing mid-await, a too-big diff), which 2.1 refuses before writing; assignment is exactly what undo already does. 2.6 moves to the in-place form when it adds the post-apply lease re-check |
| `onSplit` inside `FM.splitLayer` (§0.4 N3) | Simple's split clears `sm.tail` on A itself; Full's split is not touched; the tail fit's split-lineage guard repairs a Full-made double flag | removes the one N-row (an uncontainable Full change) Phase 2 would have added |
| `FM.deleteLayer(id, {silent})` for the runner (§14.2) | the runner removes layers itself (tools stopped via `FM.cancelGesturesOn`, playback via `FM.teardownLayerPlayback`) | `deleteLayer` stays untouched; rule 5 refuses a delete a survivor references, so `rehomeOrphans` is never needed |
| `FM.splitLayer(id, t)` with a new `t` (§3.6) | Simple sets `FM.time` for the call and puts it back | `splitLayer` reads `FM.time` once, synchronously; no signature change in Full |
| couplings ask, riders mapped, owned keys moved (§3.5, §3.10) | **2.1–2.3 refuse** those cases with a line and Open in Full; 2.4 does them | each refusal is §3.2 rule 6 (never half-apply); it lets the engine and the tools ship before the hardest maps |
| `othersCanEdit` with `waived` and the roster's `ok` / `ab` (§3.7) | 2.1: connected editors + the room's member table + guests + linked copies; Arrange anyway and Make Sam a Viewer in 2.6 | the safe half first: 2.1 can only be stricter than DESIGN, never looser |
| tool panels as sheets that rise from the toolbar with a tail (§8.2) | 2.2: Length is an inline row in the tray; "More" raises today's panel docked under the tray (phone) or in the band (PC) | Simple's own panels (Speed, Volume, Look, Effects) are 2.3 / Phase 3; until then More is the honest way to the rest, and the row never moves |
| Close all gaps in Simple's ⋯ (§8.2) | yes; the ⋯ menu's other item passes through to Full's own ⋯ strip for Loop and Preview speed | one home each, and Full's strip is not touched |
| Simple's ⋯ also has Sort by date taken (§3.6) | not in Phase 2's six releases | `taken` is written only by Phase 3's Create picker (§7.3); nothing carries a date yet |
| the Clips tool's sheet shows the At the end / After Clip N choice with a caret (§8.5) | the choice is a line with two buttons, then the picker | a picker cannot carry our own UI; the line is the same two choices, from a tap (iOS needs the picker opened from one) |
| Delete on 2+ selected main clips: one ripple commit (§8.5b) | 2.2 refuses with *"Delete one clip at a time"* | the multi-delete plan is a loop over `planDelete` against one `R`; left for 2.3 |

## 13. Known gaps (honest list)

- 2.3–2.6 are specified, not written: until 2.4, any project with a caption track over the clips, a keyed camera, a Full
  crossfade or a parent / matte link refuses the arranging commands that would touch it (with Open in Full).
- The invariants test covers delete, both trims, split, close gap and duplicate over 12 seeds in the main run (the 2,000-seed
  join test covers delete only); reorder, lift and append are covered by their fixed tests, not by seeded ones.
- No pinch, no drags, no trim grips until 2.5 (every command has a button or a key).
- The tray's Crop opens today's crop tool, whose Done is Full's (a one-layer edit, no ripple): correct, but not checked
  through the cog guard (1.3.18 is not applied here).
- Lines in Simple are checked for words, not for the 348 px width rule of §3.11 (T19's ellipsis clause is not written).
- A friend's pointer and selection are still drawn on Full's hidden timeline until Phase 1's step 1.4 ships.
- Simple's ⋯ intercept is a capture listener on `#btn-opts`; if Full's ⋯ handler ever moves to `pointerdown`, the intercept
  must follow it (FU1's ⋯ step would show it).

---

## 14. Review (1 Oct, evening): a skeptical pass, rebuilt from this file

**Verdict: 2.1 and 2.2 READY AFTER THE FIXES BELOW, which are now applied in this file** (§3.2, §3.6, 2.1.T3, 2.1.T4, 2.2.3,
2.2.5, 2.2.18, §4.4, §4.7, §11.1, §5). 2.3–2.6 are NOT READY by design (specified, not written). Phase 2 as a whole still cannot start
until Phase 1 ships, and Phase 1's step 1.3 waits on D18, D22, D23 and D24 (§10).

### 14.1 How it was checked

- **Rebuilt independently, literally.** `git archive HEAD` (`28104a3e`, v17.21) into a scratch copy, then a script that reads
  the Find / Replace blocks and code blocks **of these two files** (not the writer's own scripts): Phase 1 per BUILD-PLAN.md
  (1.1.3, 1.2.1–1.2.22, 1.3.2/4/5/6, 1.3.10–1.3.17, the four new files, §5.5's first CSS block, §4.5 + §5.6 tests) with §11's
  P1 and P2 values, P3 and the D22-B-only test left out (§11.1); then 2.1; then 2.2. **Every anchor was found exactly once at
  its step** (Phase 1: 35; 2.1: 34 + `js/spine-edit.js` + 2.1.T1 + 2.1.T2; 2.2: 20 incl. the new 2.2.3 + `js/simple-tools.js`
  + 2.2.T1), and both §2.4 preflight blocks print all `1`. After the fixes the whole rebuild was repeated from this file; its
  code is byte-identical to the tree the fixes were tested on (only one test's position in `tests.js` and a comment differ).
- **Served** with `tools/serve.sh <port> <scratch dir>` on 8793–8799 (8792 was another session's), each checked with a
  random file fetched back; every run waited for the repo's idle gate. All servers and Chromes stopped at the end.

| Run | Tree | 1280 | 380 |
|---|---|---|---|
| `simple P1` | P1 | 17/17 | — |
| `921 S1` | P1, P2.2 | 24/24, 24/24 | — |
| 2.1's 14 tests before 2.1 | P1 + 2.1's tests | **0/14** (9 by behaviour, 5 module absent: exactly §3.7) | **0/14** |
| 2.2's 9 tests before 2.2 | P2.1 + 2.2's tests | **0/9** (exactly §4.8's messages) | **0/9** |
| `simple P` as first written | P2.2 | **39/39** | **39/39** |
| the review's 3 new tests on the tree as first written | P2.2 | **0/3** (the bugs below) | **0/3** where run (crossfade, append) |
| `simple P` with the fixes | P2.2 fixed | **42/42** | **42/42** |
| `simple P`, rebuilt from this file after the edits | final | **42/42** | **42/42** |
| whole suite, the first 1,896 of 2,298 tests (up to `690 the Colouring Opacity slider…`, where an overnight run had hung; that test passes alone on this tree and on HEAD) | final, before 2.1.T3 / T4 | **1886/1896: two reds are Phase 2's** (fixed: 2.1.T3, 2.1.T4); the other eight are not paired on HEAD yet (§14.6) | not run |

Mutations run (each one rule broken in a scratch copy, the named test alone): **2.1** M10 caught at 1280 and 380; G1 (Full
containment, `seamAt`) caught at both; G4 (Full containment, every collab step tagged `arr`) caught at 1280; Q1, Q2 caught.
**2.2** N6 caught at both; X1, X2, A1, A2, A3 caught; **G2 and G3 (Full containment) SURVIVED as first written**, caught after
the control fix. All are in §3.8 / §4.9's tables, marked "(review)".

### 14.2 What was wrong, and what was done (all fixed in place)

1. **2.1, the runner's queue dropped real taps (bug).** Each queued entry was stamped with `commitSeq` and dropped at drain when
   two commits had passed, edits included. So three taps inside one await gave **two** steps and the line *"Undo skipped —
   something else changed first"* for an edit, and `[Split, Delete, ⌘Z]` lost both the Delete and the ⌘Z. DESIGN §3.7 / T2
   want three steps in tap order and the ⌘Z undoing the Delete. Fix (§3.2): only undo / redo entries are checked for staleness
   (an edit is an intent re-planned at run time, refused normally if its target is gone), and an undo's stamp counts the edits
   queued ahead of it. New test *"three commands tapped inside one await…"*; Q1 and Q2 prove both halves.
2. **2.2, Append left whole-video titles and watermarks behind (bug, DESIGN §4.5 and the §3.6 Append row).** `planAppend` was
   arranging only when an end card existed, so on an adopted project the tail fit never ran: a whole-video title stopped at
   the old end (11 s, with the clips running to 21 s) and the new clips exported without it, with no black band to say so,
   which is exactly the failure DESIGN's Append row was rewritten to prevent. Fix (§4.4): arranging also when an `sm.tail`
   item will be refitted, or a whole-video picture added in Full after adoption has no flag yet (DESIGN's
   `tailFitWrites || untaggedWhole`). Consequence, as DESIGN says: such an Append waits while a friend who can edit is in.
   New test; A1, A2, A3 each catch one half.
3. **2.2, two refusal lines were wrong (bug).** Move earlier / later and Lift off on a crossfaded clip refused with `sortFade`,
   which had no words, so he read *"That didn’t work, so nothing changed"* (a failure that did not happen); DESIGN's line *"Some
   clips fade into each other · move them by hand"* is added to 2.2.5. Clips › After Clip N at a crossfade said *"Clips
   undefined and undefined fade into each other"*: `refuse()` never passed the numbers; new hunk **2.2.3**. New test; X1, X2.
4. **2.2, Full containment was not proven (test gap).** The two Full-file hunks (`js/mobile.js` `syncSheet`, `js/inspector.js`
   `refresh`) are inert in Full only through `isSimple()` inside `sheetHeld` / `bandIdle`. Removing `isSimple()` from either
   **survived every Simple test (40/40)**: the 380 control re-selected the clip whose More had set `panelFor`, and the 1280
   control never looked at the band. The control now selects another clip and checks the band (§4.7); G2 and G3 are caught.
5. **§11 P3 pointed at a hunk that did not exist** ("in §3.6's list of test edits"). Written out as §11.1, with the note that
   BUILD-PLAN §5.6's `D22 B ONLY` test is left out under D22 A (the counts here assume it).
6. **2.2.18 quoted `inspector.js?v=408`.** The working tree of this evening (another session's batch) already has `?v=410`, so the
   literal Find is found 0 times there. Now matched by path, like Phase 1's script tags. Every other non-Simple anchor of 2.1
   and 2.2 still matches that working tree exactly once.
7. **2.1 turned two EXISTING suite tests red (blocker for `ship.sh`, found by the whole-suite run).** `921 S2 the collab core
   is inert…` pins every key of `FM.collab` and failed with *"FM.collab gained isLinkedCopy, othersCanEdit"* (2.1.21);
   `921 S0 nothing leaves the device…` reads `js/history.js` for its collab seams and failed with *"history.commit →
   afterCommit"* missing (2.1.12 / 2.1.15 pass the meta). Neither is a Full behaviour change (two new read-only answers on
   `FM.collab`; the same hook called with one more argument), so the right fix is the tests' expectations: **2.1.T3** and
   **2.1.T4**, both found once on the rebuilt tree; the new regex matches both `afterCommit(meta)` calls, and the S2 test's
   only extra keys were these two. **The two tests were not re-run after the edit** (the Mac sat at load 25–65 from other apps):
   run `?only=921%20S2%20the%20collab%20core%20is%20inert` and `?only=921%20S0%20nothing%20leaves` first. The plan had never run the whole suite, so nothing had seen it.
8. **2.3 (spec) edited Full's `FM.extractAudio`** to write `sm.twin` (DESIGN §0.4 I5, "invisible"). Not needed: Simple's own Take
   sound out step now flags the layer it made, so Full's Extract Audio writes exactly HEAD's document (§5).

### 14.3 Full is untouched (his 1 Oct rule): every shared hunk, read against the code

| Hunk | Full path | Why it is inert in Full | Proof |
|---|---|---|---|
| 2.1.10–2.1.17 `history.js` `commit(meta)`, `metas`, `commitSeq` | every commit | no Full caller passes an argument (all 9 call sites checked); `metas` only mirrors `stack`'s splice / shift / reset | G4, FU2 (builder) |
| 2.1.18–19 undo / redo queue | ⌘Z, ↶ | only while `FM.spine.running`, set only inside Simple's runner | M4, the ⌘Z test's Full control |
| 2.1.20–29 collab `afterCommit(meta)`, `closeStep`, pre-session metas, `runStep`'s door | Full's undo in a session | `st.arr` exists only on steps Simple's runner committed; in Full the refusal is Full's own toast, word for word (`collab-session.js:1181`) | G4 (caught by the D14 test's "a Full step's undo" control), M3 |
| 2.1.21, 2.1.30, 2.1.31 `othersCanEdit`, `isLinkedCopy`, `heldByOther`, `roomEditors` | — | new read-only functions, no Full caller | — |
| 2.1.32 `seamAt` | split-pair audio | continuity demanded only of a pair whose later half carries `sm.cut`, written only by Simple's runner | G1 (caught at both widths) |
| 2.1.33–34, 2.2.14 `{noSave}` | duplicate, add media | every Full caller passes 1–2 arguments | — |
| 2.1.8, 2.2.13 `index.html` | — | `#btn-sm-split` and `#sm-bar` live inside Simple-only, hidden-in-Full elements | the tray tests' "no Simple row shows" controls |
| 2.2.15 `syncSelectionChrome` | selection | guarded by `simple` | — |
| 2.2.16 `mobile.js`, 2.2.17 `inspector.js` | phone sheet, band | `sheetHeld` / `bandIdle` are false when Simple is not on screen | G2, G3 (caught after fix 4) |
| CSS 3.4, 4.5 | — | every selector names a Simple-only element, `body.ed-simple` or `body.sm-running` | — |
| `simple-tools.js` listeners | Full's ⋯ | the capture listener on `#btn-opts` returns at once unless Simple is on screen | the ⋯ test's Full control |

**One residue, not a behaviour change:** after a visit to Simple on a PC, the hidden `#sm-bar` stays a child of
`#inspector-panel` in Full (`display: none`, so FU1's layout record, which lists visible elements, sees nothing). If FU1 ever
records the DOM tree itself, move `place()` after the `isSimple()` check in `FM.simpleTools.sync`.
**Whole suite** at 1280 on the final tree, first 1,896 tests: the only reds Phase 2 caused are the two source / surface
pins of finding 8 (fixed). The other eight reds are `921 S6` QR read-back, `921 S8` 4× CPU timing, `921 S8` Scan QR camera,
`783` dark intro, two `690` flick-glide tests and two `690` 30 fps export-frame tests: none touches a file 2.1 or 2.2 changes
except through Full's normal render and timeline paths, the timing one is load-sensitive (the Mac's load was 8–100 from other
apps through the run), and **they are NOT yet paired on HEAD** (§14.6).

### 14.4 His picks and the open decisions

Checked against the code: **D4 A** (followers from Phase 1's classifier; sounds stay put), **D5 A** (delete takes its
followers, counted, one Undo), **D6 A** (M5), **D7 A** (Do it anyway, lock kept, M9 / M11), **D8 A** (no command opens a gap;
reorder carries a clip's own trailing seam, as DESIGN says), **D10 A** (tray over a project-tools row that never goes away),
**D14 first half A** (arranging and adopting gated, split / text / overlay / music live), **D17 B** (no sound ever gets
`sm.tail`; End with the video names a song and leaves it, N6), **D19 A** (nothing in 2.1–2.2 touches markers), **D20 A**
(PC rows and panels in the left band), names **Simple / Full**, **D11** (Morph) untouched by Phase 2. **No open decision is
decided here**: D18 (✂'s slot), D22, D23, D24 are Phase 1's; D3 is Phase 3's; D14b is untouched (the gate holds under
either answer).

**One thing worth saying to him, not decided here (DESIGN's own rule, §4.3 "Delete cuts first and then pins"):** on a project
Simple has never arranged, the FIRST Delete cuts a long Full-made song through the deleted span (keeping it in step with the
pictures) and pins it; after that, and for any song added in Simple, deletes never cut it and the video runs on in black.
With D17 B in his words ("music is never trimmed"), he may read that first cut as a trim. If he wants the song never cut, the
fix is one exclusion in `planDelete`'s `cut` filter (`u.kind !== 'audio'`) and the (iii) clause of the "Delete cuts" test.

### 14.5 Where this plan still differs from DESIGN (add to §12)

- Insert / Into row at a crossfade refuses without DESIGN's one-tap fallback ("· the fade became a cut"): 2.4's owned-key work.
- Append's extra line *"· the watermark now runs to the new end"* is not written (the fit itself is).
- Append does not shift caption cues lying wholly after the track end (DESIGN's `cuesAfter` term); a caption track straddling
  the end is refused (`riders`). 2.4's cue maps.
- `insertFade` numbers clips by `R.main` index, so a slot (a card between clips) before the cut makes "Clips 3 and 4" read one
  high. Cosmetic.

### 14.6 Remaining gaps (not fixed here)

- **2.3–2.6 are not ready**: specified, not written or run. Their anchors were checked on the P2.2 tree (all found once) except
  2.6's `js/history.js` `lastStep`, which does not exist (a new function to write), and 2.6's `js/collab-ui.js:568`, a line
  number, not a quoted anchor. 2.3's `setClipSpeed` / `pickReplacement` and 2.4's `splitAt` / Bounce are refactors of Full code
  paths (DESIGN §0.4 I8, B5) and need FU2 on HEAD and the tree, as written.
- **The FU group does not exist yet** (Phase 1 builds it); §2.3's per-release FU additions are prose the builder turns into
  steps. Until it runs, "Full unchanged" rests on §14.3's reading, G1–G4, and the whole-suite run.
- **Pair the eight unexplained whole-suite reds on HEAD** before believing or dismissing them (CLAUDE.md: a slice red is
  paired, never assumed), and run the last 402 tests (`?after=690%20the%20Colouring%20Opacity%20slider…`), which were not
  reached: the Mac stayed at load 25–65 from other apps for over 20 minutes and the run was stopped. `ship.sh`'s own suite
  run covers both; until then "Full unchanged" is proven for the 1,896 that ran, the 42 Simple tests and G1–G4, not the rest.
- Not run: the whole suite at 380, `ship.sh` / `prove.sh`, Safari and his iPhone, the cog (1.3.18–19, not appliable), §4.10's
  screenshots (not re-taken; with the fixes nothing visible moved).
