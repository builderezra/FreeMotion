# Simple mode: the build plan for Phase 0 and Phase 1

**For the BUILDER chat, to run once Ezra says "build it" (D15 A, or "do recommended").** This is a planning file. Nothing in it
is in the app yet. `DESIGN.md` says *why* (§14 code plan, §14.6 tests, §15 phases, §15.1 the Phase 1 screen, §17 decisions).
This file says *how*: every change as exact code, anchored on quoted text, with the tests that prove it and what he will see.

**Revised 1 Oct to his rules (REQUESTS #980; DESIGN.md §0.4, §6):** the original editor must not change in design or
function, the switch is a third block in the ⚙ cog, and a swap that would lose un-undoable work warns first. So: **step 1.1
("four Full fixes") is withdrawn** (§3; its one new function moves to 1.2); **step 1.3's play-bar ⇄, ⋯ item, back button,
E key and Settings row are replaced by the cog block** (1.3.18) and the guard in `js/editor-mode.js` (§5.3); and **a "Full
unchanged" group against HEAD gates every Simple release** (§3.2). Everything marked **NOT RUN** or **RE-ANCHORED, NOT RE-RUN**
was written on 1 Oct and has not been executed; the rehearsal results below are the 29 Sep version's.

**His answers of 1 Oct are folded in** (DESIGN.md §17 quotes him in full): D15 A is the go-ahead for Phase 1, from this revised
plan only; D1 A (Simple / Full on every visible word); D11 B, the morph only; D17 B, music runs on in black as in Full; D20 A,
PC panels inside the left band; everything else he picked is the recommended option. D3 and D14b are re-asked (his A on each
would change Full), and D18, D22, D23 and D24 are still open. **§1.1 says what can be built now.** **Step 1.2 was re-anchored
on 1 Oct** against v17.21 (HEAD `28104a3e`, `SCHEMA_REV 6`): every anchor was found exactly once except three in
`js/collab-core.js`, which batches 1-5 of #482 had moved (1.2.8, 1.2.11, 1.2.12, rewritten below); the hunks were re-found by
text, NOT re-applied or re-run.

**The tree it was written and checked against:** HEAD `ea1ff320` (v17.12) **plus the uncommitted working tree at v17.13**
(29 Sep 2026, ~12:30 AWST: `index.html`, `js/app.js`, `js/timeline.js`, `styles.css`, `tests/tests.js` and others were
modified and not yet committed by the builder). Every anchor below was found **exactly once** in that tree. Line numbers drift
as the builder ships other work, so **match on the quoted text, never the line number**; §2.4 is a one-paste check.

**How it was checked.** Every hunk and new file was applied, step by step, to a **copy** of that tree in a scratch folder
(never the repo), as one commit per step. Each tree was served with `tools/serve.sh` on its own port and driven with
`tests/_cdp.py`, exactly as `tools/prove.sh` does: the step's new tests on the tree **before** the step (prove.sh's "reverted"
side) and all new tests on the finished tree, at `--width 1280` and `--width 380`. Screens were taken with `tools/shot.py`
through the real app at 380×667 and 1280×800. (The rehearsal's scripts, trees and results live in this session's scratchpad,
`build/`, `trees/`, `proof/` and `simple-mode-qa/`, not in the repo, and will not outlive the session; everything they
established is written down below.)

| Check | Result |
|---|---|
| The 23 new tests on the finished copy | **23/23 pass at 1280, 23/23 pass at 380** (and 3 more runs of all 23 at 380, all green); the review (29 Sep) re-ran all **24** (one added) on a fresh copy of the v17.13 tree: 24/24 at 1280 and at 380 |
| Each step's tests on the tree before that step | **step 1.1: 0/6 pass, step 1.2: 0/10, step 1.3: 0/7**, at both widths (every one fails; §7.1 quotes how); re-run by the review at 1280 with the same result, and the added test 0/1 before 1.3 |
| Behavioural mutations (seams kept, one rule broken) | **12 of 12 caught** (§7.2), plus M13 from the review |
| `921 S1` (24 schema and sanitiser tests) with `SCHEMA_REV 3` and the re-pinned `SCHEMA_FP` | 24/24 pass |
| The whole suite on the finished copy, at 1280 | **1280: 2,138 / 2,140** and **380: 2,133 / 2,141**; every red re-run alone on both the patched copy and the base: **one real** (`967 B4 1 one name`, fixed, §8), the rest pass alone on both trees (§8) |
| Screens, 380×667 and 1280×800 | taken and looked at (§5.8); three defects found in the earlier draft of step 1.3 and fixed before this file was written |

**Since 1 Oct the table above describes the 29 Sep version**, not this one: step 1.1's six tests are gone (T15 moved to
1.2), five 1.3 tests are re-anchored or replaced, and the cog block, the guard and the FU group have never run. Re-prove the
whole of step 1.3 and the FU group before trusting any number here.

**Not verified, said again where each comes up:** step 1.4 (live sessions) is anchors and a plan, not written or tested code;
nothing ran on his iPhone or in Safari (Chrome headless only); 375×553 and 440×956 were not shot; `tools/ship.sh` and
`tools/prove.sh` themselves were not run (the same comparison was run by hand); `SCHEMA_FP` is only right for the tree it was
measured on (§4.4 says how to re-measure); the whole-suite runs of §8 were made beside the builder's own runs, so their
load-sensitive reds were judged by pairing, not by a quiet machine.

**Where this came from.** An earlier attempt at this plan (same day, same scratch folder) wrote most of the code below against
HEAD alone and stopped before the full-suite run and the screens. This file re-bases it on the current tree, re-proves every
test, and fixes what the screens and a review found (§11 lists each change).

---

## 0. The builder's checklist

1. **Only after he says so.** #980 is logged "PLAN (do NOT build)" with `BUILT OUT UNTIL HE says to build the simple mode`.
   **He said it on 1 Oct: D15 A**, from this revised plan (DESIGN §17 has his words). Paste his words into #980 verbatim,
   add `HE ANSWERED` (so the classifier lifts the hold), record his D answers there, and add the three step clauses below as a numbered checklist to tick one per release.
   **Oldest first still applies:** `queue 980 (partial)` closes nothing, so ship.sh's order gate will NOT stop a jump. Build
   a step only when `./tools/next.sh` hands #980 out, unless his go-ahead says now ("asap", "right now"); in that case write
   `JUMPED: he said build the simple mode now (<date>)` into each lower workable entry, as CLAUDE.md asks.
2. `./tools/tick.sh`, a clean `git status`, then the **preflight** for the step (§2.4): every line must print `1`.
3. **First, the "Full unchanged" group and its `ship.sh` gate (§3.2).** Then **ship two releases in order, 1.2 → 1.3**
   (1.1 is withdrawn, §3), each one `tools/ship.sh` run, each passing the FU group against HEAD, with its own POLISH-LOG line saying
   **`queue 980 (partial)`** (so ship.sh's close-and-order gates treat it as advancing #980, not closing it), its own `?v=`
   bumps and its own tests appended at the end of `tests/tests.js`, before the final `})();`. Do not batch them, and ship no
   other queue item in the same release: any difference from HEAD must be Simple's, and a rollback must take one back alone.
4. After 1.3 ships, send him the 380 screenshot sheet (§5.8, split with `tools/phonepages.py` if tall) and one line: *"Tap ⚙, then
   the Simple ⇄ Full switch in the new Editor block."*
5. **Step 1.4** (friends see each other in Simple) is planned, not written (§6). Build it with the same method before
   Phase 2, or ship 1.3's line saying presence is not drawn in Simple yet.
6. Phases 2–8 are outlines (§10). Each needs its own build plan, written against the tree of its day.

---

## 1. Phase 0: decide (no code)

**What ships:** nothing in the app. He opens the design pages and the decision sheet
(<https://claude.ai/artifact/9TWddZCGHH1aNyJDiXZbZB>: V10 is the sheet, V11 draws the Phase 1 screen). **What he holds:**
nothing new. **The gate:** his picks. **He answered on 1 Oct** (DESIGN §17, verbatim): D15 = A, from this revised plan only.

Phase 1 needs eight of the 24 (D2 is settled by his 1 Oct words: the cog). The rest wait for the phase that uses them, so nothing is decided behind his back:

| D | What it decides in Phase 1 | "Do recommended" uses | Where it lives in this plan | His answer (1 Oct) |
|---|---|---|---|---|
| **D15** | starting at all | **A: build Phase 1, Full untouched, the switch in the ⚙ cog** | this whole file | **A, decided** (*"D15 A"*) |
| **D1** | the two names on every Simple word | **A: Simple / Full** | `js/spine-words.js` only (`editor`, `settings`); change the words there and nowhere else | **A, decided** (*"Names: Simple / Full."*) |
| **D2** | where the switch sits | **SETTLED 1 Oct by his words: the ⚙ cog's third block**; nothing in Full's play bar or ⋯ | 1.3.18, §5.5's cog rules | settled (*"D2 ?"*: not picked) |
| **D18** | Simple's play-bar order on a phone (rewritten: no switch on it) | **A: ⋯ · ✂ · (gap) · \|◀**, ◐'s slot kept invisible | one CSS rule on `#btn-addside` (§5.7) | **open** (rewritten after he answered *"D18 ?"*) |
| **D22** | a Settings row gating the cog block | **A: no Settings row** | `GATED` in `js/editor-mode.js`; 1.3.7–1.3.9 only under B | **open** (new) |
| **D23** | does the cog close after a switch | **A: it closes, unless Canvas holds unapplied picks or Friends is big** | one `setTimeout(cvClose)` in 1.3.18 | **open** (new) |
| **D24** | short and sideways screens: where the Editor tile goes when the small column has no room (DESIGN §21) | **B (recommended; drawn 1 Oct, DESIGN §6.5, `cog/d24-*.jpg`: the switch and "What should you use?" sit on the cog's own row; Canvas and Friends unchanged)**, once he picks: step 1.3 does not ship until it is, because today's design puts the switch off screen on his phone held sideways | the PC grid rules in §5.5 and one measure in `cvPlace` | **open** (new; options drawn first) |
| **D16** rows 1 and 5 | the cog block's icon and its two option pictures; the gap and overlap chips | **A: the set marked recommended on V10** (three clips side by side = Simple, three staggered layer bars = Full; round `1.2s` / `⚠ 0.4s` chips) | `ED_ICON` / `ED_PIC` in 1.3.18; `.sm-chip-*` | **A, decided**, applied to the revised rows (row 1 is shown to him with the open decisions before 1.3 ships) |
| **D9** | old projects in Simple | **A: open as they are, nothing written** | Phase 1 never writes a flag at all | **A, decided** |

**Later phases, with his answers:** Phase 2: D4–D8 A, D10 A, D14 first half A, **D17 B** (music runs on in black, no switch),
D19 A, all answered. Phase 3: **D11 B** (the morph only), D12 A, **D20 A** (PC panels inside the left band), D21 A, answered;
**D3 re-asked**. Phase 4–5: **D14b re-asked** (held unless he says B). Phase 6: D13 A, answered. **If he picks something other
than recommended on D18, D22 or D23, only one CSS rule, `GATED` or one line changes; the engine does not.**

### 1.1 What can be built now (1 Oct, after his answers)

His D15 A is the go-ahead for Phase 1 from this revised plan. What it unblocks, in order:

| Piece | Can it be built now? | Waiting on |
|---|---|---|
| **The "Full unchanged" group and its `ship.sh` gate** (§3.2) | **Yes, first.** It needs no decision and guards everything after it | nothing |
| **Step 1.2, the engine** (§4; nothing on screen, Full identical) | **Yes, right after the FU group.** No decision touches it; re-anchored 1 Oct (`SCHEMA_REV` 6 → 7, `SCHEMA_FP` measured at build time, §4.4) | nothing |
| **Step 1.3, the view he holds** (§5) | **Can be written and proven now; it does not ship until four more are answered.** D1, D9 and D16 are in | **D18** (Simple's play-bar order), **D22** (a Settings gate or not), **D23** (does the cog close after a switch), **D24** (the switch is off screen on his phone held sideways: options drawn first). Each is one CSS rule, `GATED`, one line or the §5.5 grid; build with the recommended option and change that one place if he picks otherwise |
| **Step 1.4, friends see each other in Simple** (§6) | **Its build plan can be written now**; no decision touches it | its own plan, then the same method |
| **Phase 2, editing** | **After Phase 1.** Every pick it needs is in (D4–D8, D10, D14 first half, D17 B, D19); D14b does not hold it, because under either answer arranging stays off while a friend who can edit is in | Phase 1 shipped; its own build plan |
| **Phase 3, looks and the way in** | After Phase 2. D11 B, D12, D20 A and D21 are in | **D3** (re-asked), for its Create-picker item only; the rest can go without it |
| **Phases 4–5, moving clips with a friend in** | **No.** Held under his 1 Oct rule | **D14b** (re-asked): built only under B |
| **Phase 6, transitions** | After Phase 3 (Phases 4–5 are held). D13 A is in | drawn options first (his design rule) |

**D3 and D14b do not hold anything in Phase 1.** D18, D22, D23 and D24 hold only step 1.3's release.

---

## 2. Phase 1 at a glance

DESIGN §15 ships Phase 1 as one ~2,200-line release. This plan ships it as **three releases plus a planned fourth**, so each
is small enough to review, prove and roll back on its own. **Since 1 Oct none of them changes Full**: each passes the FU group
against HEAD (§3.2), and the old step 1.1 ("four Full fixes") is withdrawn (§3).

| Step | What ships | He sees / holds | Files | New tests | D's |
|---|---|---|---|---|---|
| ~~**1.1 Full fixes**~~ | **withdrawn 1 Oct** (§3): all four changed Full (DESIGN §0.4 B1–B4). Its one new function, `FM.timedLists`, ships in 1.2 | — | — | — | — |
| **before 1.2: the FU group** | `tests/full-unchanged.html`, `tools/full-unchanged.sh`, the `ship.sh` gate for `queue 980` (§3.2) | nothing; a lock | 2 new files + ship.sh | its self-test | none |
| **1.2 The engine** | `FM.timedLists` (§3.1, a new function nothing in Full calls); the `sm` sanitiser (layer, project, an effect's marker, `srcW/srcH/srcRev`, `pick`) on every load, import, undo and live batch; `SCHEMA_REV` 6 → 7; a copy is never a second main clip; native size and the pick stamp written at add time (not "sound only": §11); `handleFiles(files, {at})`; `FM.worldBox`, `FM.groupNeedsUnit`, `FM.storage.hydrating`; **`js/spine.js`** (the classifier) and **`js/spine-words.js`** | nothing on screen, and nothing different in Full: a copy dropping `pick` (and `sm.main`, which nothing writes yet) is invisible (DESIGN §0.4 I3, I4), and FU proves it | 2 new files (~490 lines) + scene, storage, compositor, collab-core, app, ai-ops, index.html (~220) | 11 + FU | none |
| **1.3 The view** | the ⚙ cog's third block (1.3.18) and two read-only getters (1.3.19); **`js/editor-mode.js`** (the one door `request()`, the guard and its warnings, per-device memory; no ⇄, no E); under D22 B only, the Settings row; **`js/simple-timeline.js`** (the read-only Simple timeline, `#sm-say`, seam chips, the `+` that lays picks end to end); one dispatch in `FM.timeline.rebuild/updatePlayhead`; the CSS block | **Yes, as a preview** (§5.1) | 2 new files (~480 lines) + CSS (~200) + index, timeline, app (+~150 for the cog), mobile, crop-tool, touchup-tool (~260); settings only under D22 B | 8 re-anchored + cog T1–T15 + FU | answered: D1 A, D16 A (r1/r5); **open: D18, D22, D23, D24** |
| **1.4 Friends** (planned) | `FM.timeline.host()` so presence, comment marks and media bars draw on Simple's boxes; presence `ed` (drawn in Simple only); the host clamps `project.sm.v` (Watch along is unchanged, DESIGN §0.4 B24) | a friend's pointer and selection on the right clip whichever editor each is in | collab-presence, -comments, -media, -ui, -bridge (~150, **not written or run here**) | T8 live, T12 | none |

### 2.1 What is visible, and the gate (D22)

**Under D22 A (recommended): no Settings row.** The only thing a person in Full sees is the ⚙ cog's third block (DESIGN §6.1),
the one change he asked for. Everything else visible in step 1.3 is in Simple, which appears only when he taps the switch:
the Simple timeline, `#sm-say`, ✂ in slot 2. **"Full means Full"** replaces the old "off means off": with Simple never chosen,
not one new CSS rule matches outside the cog block (every rule is keyed on `body.ed-simple`, `#canvas-dialog.cv-ed-on` or
`#cv-editor`), `FM.editor.onKey` answers nothing in Full, every project opens in Full until this device switches it, and the
FU group proves Full's chrome and edits equal HEAD's (§3.2). **Under D22 B** a "Simple editor" row in Settings (hint *"See any
project as clips — an early look."*, its own untitled group directly above *Work with friends*, off by default, in the
settings whitelist, the #688 trap) gates the cog block: off, the cog is today's two blocks exactly. **Step 1.2 is not behind
anything**: it is plumbing with nothing on screen (a rev-6 and a rev-7 build refuse to share a live room, by design).

### 2.2 Script order in `index.html` after 1.1–1.3

```
js/settings.js      (1.3 bumps only under D22 B)
js/collab-core.js   (1.2 bumps: SCHEMA_REV 6 → 7)
js/statusbar.js, js/screen.js
js/scene.js         (1.2 bumps: FM.timedLists)
js/spine-words.js?v=1   NEW (1.2) — the words; spine.js reads it lazily, so their order is not load-bearing
js/spine.js?v=1         NEW (1.2) — after scene.js; only calls FM.evalProp / FM.animatedProps at classify time
js/eases.js, js/masks.js, js/behaviors.js, js/media.js, …   (crop-tool.js, touchup-tool.js: 1.3 bumps, the getters)
js/compositor.js    (1.2 bumps)
…
js/timeline.js      (1.3 bumps)
js/simple-timeline.js?v=1  NEW (1.3) — after timeline.js
… js/storage.js (1.2 bumps) …
js/editor-mode.js?v=1      NEW (1.3) — before app.js; wires its buttons at DOMContentLoaded or at once
js/app.js           (1.2 and 1.3 each bump)
… js/mobile.js (1.3 bumps) … js/ai-ops.js (1.2 bumps)
```

### 2.3 The `?v=` bumps per step (+1 on whatever the tree has then; `ship.sh` refuses a changed file whose `?v=` did not move)

| Step | Bump | New tags |
|---|---|---|
| ~~1.1~~ | withdrawn | — |
| 1.2 | `scene.js`, `storage.js`, `collab-core.js`, `compositor.js`, `app.js`, `ai-ops.js` | `spine-words.js?v=1`, `spine.js?v=1` right after `scene.js` |
| 1.3 | `timeline.js`, `app.js`, `mobile.js`, `crop-tool.js`, `touchup-tool.js`, `styles.css` (`styles.css` is the `<link>` in the head); `settings.js` only under D22 B | `simple-timeline.js?v=1` after `timeline.js`; `editor-mode.js?v=1` right before `app.js` |

Plus, every release: `index.html`'s version label, its POLISH-LOG line, and the REQUESTS.md summary stamp (ship.sh gates).

### 2.4 Preflight: run the step's block from the repo root; every line must print `1`

These are the first unique line of each anchor. `0` means the tree moved: find the anchor by its quoted text in the step's
hunks, adapt, and say so in #980. `2` means it is no longer unique: widen it with the next quoted line.

```bash
# step 1.1: WITHDRAWN (1 Oct). Its one surviving anchor (FM.timedLists, §3.1) is checked with step 1.2:
# step 1.2   (re-anchored 1 Oct on v17.21, HEAD 28104a3e: all 23 print 1; the collab-core three are SCHEMA_REV 6's)
grep -cF -- '  /* Generic versions of the above that target ANY container object + key (e.g. an effect'\''s' js/scene.js
grep -cF -- '      l.fillGradient.angle = Math.max(0, Math.min(360, +l.fillGradient.angle || 0));' js/storage.js
grep -cF -- '    if ('\''thumbPinned'\'' in p && typeof p.thumbPinned !== '\''boolean'\'') p.thumbPinned = false;' js/storage.js
grep -cF -- '      const out = keepUid(f, { type: f.type, enabled: f.enabled !== false, params: params });' js/storage.js
grep -cF -- '  FM.storage._sanitizeLayers = sanitizeImportedLayers;   // read by the suite, and by history.restore' js/storage.js
grep -cF -- '  function layerAABB(l, t, scene) {' js/compositor.js
grep -cF -- '  FM._layerAABB = layerAABB;   // suite seam (queue 539)' js/compositor.js
grep -cF -- '  function collectGroupUnits(scene, t) {' js/compositor.js
grep -cF -- '  C.SCHEMA_REV = 6;' js/collab-core.js
grep -cF -- '      effects: [{ type: '\''blur'\'', enabled: true, params: { radius: 3 } }],' js/collab-core.js
grep -cF -- '    const L = C.SCHEMA_FIXTURE();' js/collab-core.js
grep -cF -- '    return P.cyrb53(P.canon(L) + '\''|'\'' + P.canon(defs) + '\''|'\'' + P.canon(adefs) + '\''|'\'' + P.canon(C.OP_GRAMMAR) + '\''|'\'' + der + '\''|r'\'' + C.SCHEMA_REV);' js/collab-core.js
grep -cF -- '  C.SCHEMA_FP = 836365476955739;' js/collab-core.js
grep -cF -- '  FM.addMediaLayer = function (rec) {' js/app.js
grep -cF -- '    const start = first ? 0 : Math.min(FM.time, P.duration || 0);' js/app.js
grep -cF -- '    const fit = Math.min(P.width / rec.width, P.height / rec.height);' js/app.js
python3 -c "import sys;print(open(sys.argv[1]).read().count(sys.argv[2]), sys.argv[1])" js/app.js '    }
  }

  FM.addTextLayer = function () {'
grep -cF -- '  FM._handleFiles = function (files) { return handleFiles(files); };' js/app.js
grep -cF -- '  async function handleFiles(files) {' js/app.js
python3 -c "import sys;print(open(sys.argv[1]).read().count(sys.argv[2]), sys.argv[1])" js/app.js '    const idx = FM.scene.layers.findIndex(l => l.id === id);
    FM.scene.layers.splice(Math.max(0, idx), 0, ...inserts);'
grep -cF -- '    FM.relinkSplitCopies(copies.map(c => ({ src: c.entry.snapshot, copy: c.copy })));   // queue 914.8' js/app.js
grep -cF -- '            var copy = FM.cloneLayer(layer);' js/ai-ops.js
grep -cF -- '  <script src="js/scene.js?v=' index.html
# step 1.3   (1 Oct: the #opt-bar and #btn-tostart anchors went with the ⋯ item and the play-bar ⇄; the cog anchors are v17.21's)
grep -cF -- '          <button id="btn-layermenu" class="tbtn" title="Layer actions">' index.html
grep -cF -- "      const cvFrBar = document.getElementById('cv-fr-bar');" js/app.js
grep -cF -- "      const cvPairLast = () => {" js/app.js
grep -cF -- "      const cvPairBig = () => (cvDialog.classList.contains('cv-fr-big') ? 'friends' : 'canvas');" js/app.js
grep -cF -- "      const cvPairSwap = (to) => {" js/app.js
grep -cF -- "      const openCanvasDialog = (opts) => {" js/app.js
grep -cF -- "      const cvClose = () => {" js/app.js
grep -cF -- '      <div id="timeline">' index.html
grep -cF -- '  <script src="js/timeline.js?v=' index.html
grep -cF -- '  <script src="js/app.js?v=' index.html
# the next three: only under D22 B (a Settings row)
grep -cF -- '    collabLabs: false,' js/settings.js
grep -cF -- '      ['\''demoMode'\'', '\''showTouches'\'', '\''systemFonts'\'', '\''homeLight'\'', '\''collabLabs'\'', '\''collabCursors'\'', '\''collabSelections'\'', '\''collabCodesOnly'\''].forEach(k => { if (typeof saved[k] === '\''boolean'\'') state[k] = saved[k]; });' js/settings.js
python3 -c "import sys;print(open(sys.argv[1]).read().count(sys.argv[2]), sys.argv[1])" js/settings.js '    if (FM.collab && FM.collab.ui) {
      const ui = FM.collab.ui;'
grep -cF -- '    rebuild() {' js/timeline.js
grep -cF -- '      const shown = !!n && view === '\''home'\'' && !inBrowser;' js/timeline.js
grep -cF -- '    updatePlayhead() {' js/timeline.js
grep -cF -- '    timeToX: function (t) { return HEAD_W + PAD + (t || 0) * pxPerSec(); },' js/timeline.js
grep -cF -- '      if (mod && (e.key === '\''z'\'' || e.key === '\''Z'\'')) {' js/app.js
grep -cF -- '    document.body.classList.toggle('\''sel-multi'\'', n >= 2);' js/app.js
grep -cF -- '  FM._handleFiles = function (files, opts) { return handleFiles(files, opts); };' js/app.js
grep -cF -- '    function dockSheet() {' js/mobile.js
```

---

## 3. Step 1.1: withdrawn (1 Oct), and what goes first instead

**His rule, 1 Oct:** *"i dont want the original editor changing in design and function … dont do that"* (DESIGN.md §6.0
has the whole message). Step 1.1 was titled "four Full fixes" and this file's own checklist said *"1.1 and 1.2 change Full"*.
Every one of the four changes what Full does, so **step 1.1 is withdrawn** (DESIGN §0.4, `AUDIT-FULL-UNTOUCHED.md` §2a). Its
code and tests are removed from this file (the 29 Sep version is in git history). If he ever wants one of these Full bugs
fixed, it is its own queue item with his own yes, never a rider on Simple.

| Was | What it did to Full | Now (DESIGN §0.4) |
|---|---|---|
| 1.1.1, 1.1.2 `shiftLayerKeyframes` / `scaleLayerKeyframes` read `FM.timedLists` | moving or re-speeding a caption track in Full moved its animated cue effects (a "deliberate Full behaviour change") | **B2**: both stay on `animatedProps`. Simple gets its own `FM.spine.shiftKeys` / `scaleKeys` (Phase 2, with the runner) |
| 1.1.3 `FM.timedLists` (a new function) | nothing: no Full code calls it | **kept**, and ships with step 1.2 (§3.1 below) |
| 1.1.4 `ai-ops` `case 'start'` shifts keys | Full's Assistant moving a clip moved its animation | **B3**: only with `applyOps(…, {simple: true})`, Ask in Simple (Phase 3) |
| 1.1.5 Full's split guard 0.02 → 0.1 s | a split Full makes today was refused | **B1**: dropped; Simple's ✂ enforces `MIN_LEN` in its own plan builder (Phase 2) |
| 1.1.6–1.1.12 Follow and layer-reference effect sources through the split lineage (`refLayerAt`) | Full's preview and export rendered differently | **B4**: dropped; Simple's link rule reads the stored id for good (DESIGN §3.10 rule 1) |
| tests: caption cue effects move, ai-ops start, split floor, luma matte, Follow | asserted the four Full changes | removed with them. T15 (the collector) moves to step 1.2 |

### 3.1 What survives: `FM.timedLists`, shipped as the first hunk of step 1.2

A new function that nothing in Full calls; `animatedProps`, `shiftLayerKeyframes` and `scaleLayerKeyframes` are not touched.
Bump `scene.js`'s `?v=` in step 1.2.

#### 1.1.3 `js/scene.js` (line 602 at the start of this step; v17.13 tree, re-find by the quoted text)

Find (exactly once):

```js
  /* Generic versions of the above that target ANY container object + key (e.g. an effect's
   * params), so effect parameters / future props are keyframe-able just like transform. */
```

Replace with:

```js
  /* ═══ EVERY TIMED KEYFRAME LIST ON A LAYER — animatedProps PLUS each caption cue's own effects (Simple mode
   * Phase 1, DESIGN.md §10.4 "one collector", Q3). A cue's effect keyframes are evaluated at raw project time
   * (compositor effectiveFx concatenates cue.effects and reads them with FM.evalProp(p, t)), so they are on the
   * same absolute clock as every other key — but animatedProps never listed them.
   * NOTHING IN FULL CALLS THIS (DESIGN.md §0.4 B2): Full's shiftLayerKeyframes / scaleLayerKeyframes stay on
   * animatedProps exactly as before. Simple's own shift (FM.spine.shiftKeys, Phase 2) and the wire form read it.
   * animatedProps itself is unchanged on purpose: its 18 callers (clip diamonds, the keyframe clipboard, loop
   * modes, splitAnimated) address keys through grammars that have no form for a cue effect.
   * `{cues: false}` gives animatedProps' lists only (the Phase 2 rider procedure needs that split). */
  FM.timedLists = function (layer, opts) {
    const out = FM.animatedProps(layer);
    if (opts && opts.cues === false) return out;
    const cues = (layer && Array.isArray(layer.captions)) ? layer.captions : [];
    for (let i = 0; i < cues.length; i++) {
      const c = cues[i];
      if (c && Array.isArray(c.effects) && c.effects.length) FM.fxListAnimatedProps(c.effects).forEach(p => out.push(p));
    }
    return out;
  };

  /* Generic versions of the above that target ANY container object + key (e.g. an effect's
   * params), so effect parameters / future props are keyframe-able just like transform. */
```

#### Its test (append with step 1.2's tests, at the end of `tests/tests.js`, before the final `})();`)

```js
  /* ═══ SIMPLE MODE, PHASE 1 — THE ONE KEYFRAME COLLECTOR (queue 980 (partial); BUILD-PLAN.md §3.1). A new function only:
     Full's own shifters do not read it (DESIGN.md §0.4 B2). */

  /* The generic walk the collector is checked against: EVERY {kf:[…]} container anywhere under the layer. It is
     deliberately not a copy of the collector — it knows nothing about which fields exist — so a list the collector
     forgets shows up as a difference. */
  function smAllKfLists(root) {
    var out = [], seen = new Set();
    (function walk(v, depth) {
      if (!v || typeof v !== 'object' || depth > 12 || seen.has(v)) return;
      seen.add(v);
      if (!Array.isArray(v) && Array.isArray(v.kf) && v.kf.length && v.kf.every(function (k) { return k && typeof k.t === 'number'; })) { out.push(v); return; }
      Object.keys(v).forEach(function (k) { walk(v[k], depth + 1); });
    })(root, 0);
    return out;
  }
  function smKitchenSink() {
    var kf = function (a, b) { return { kf: [{ t: a, v: 0, e: 'linear' }, { t: b, v: 1, e: 'linear' }] }; };
    var L = FM.makeLayer('text', { name: 'SM_SINK', text: '', x: 50, y: 50 });
    L.start = 1; L.duration = 6;
    L.transform.x = kf(1, 2);
    L.volume = kf(1, 3);
    L.effects = [{ type: 'blur', enabled: true, params: { radius: kf(2, 3) } },
                 { type: 'filter', enabled: true, params: { strength: kf(2, 4) }, effects: [{ type: 'blur', enabled: true, params: { radius: kf(3, 4) } }] }];
    L.audioFx = [{ type: 'reverb', enabled: true, params: { mix: kf(1, 5) } }];
    L.masks = [{ id: 'smm1', mode: 'add', path: { kf: [{ t: 1, v: [[0, 0], [8, 0], [8, 8]], e: 'linear' }, { t: 2, v: [[0, 0], [9, 0], [9, 9]], e: 'linear' }] } }];
    L.captions = [
      { start: 0, end: 2, text: 'one', effects: [{ type: 'blur', enabled: true, params: { radius: kf(1.5, 2.5) } }] },
      { start: 2, end: 4, text: 'two', effects: [{ type: 'filter', enabled: true, params: {}, effects: [{ type: 'blur', enabled: true, params: { radius: kf(3.5, 4.5) } }] }] }
    ];
    return L;
  }

  test('simple P1 · T15 FM.timedLists lists exactly the keyframe containers a generic walk finds (cue effects included)', { item: '980' }, function () {
    var L = smKitchenSink();
    /* `(FM.timedLists || FM.animatedProps)`: with the collector missing, the SHIPPED collector is what gets
       checked, so this fails on HEAD by what it leaves out rather than by a missing seam. */
    var collect = FM.timedLists || FM.animatedProps;
    var got = collect(L), want = smAllKfLists(L);
    var missing = want.filter(function (p) { return got.indexOf(p) < 0; });
    var extra = got.filter(function (p) { return want.indexOf(p) < 0; });
    if (missing.length || extra.length) throw new Error('the collector and the generic walk disagree: ' + missing.length + ' list(s) missed (first: ' + JSON.stringify(missing[0] && missing[0].kf[0]) + '), ' + extra.length + ' extra — on HEAD the two cue-effect lists are the missed ones');
    if (want.length !== 9) throw new Error('the fixture should hold 9 keyed lists, the walk found ' + want.length + ' — the fixture changed, so this proves less than it says');
    /* POSITIVE CONTROL: the same layer with its cues' effects removed — the walk and animatedProps must then agree,
       or the walk is simply counting something different and the check above means nothing. */
    var C = smKitchenSink(); C.captions.forEach(function (c) { delete c.effects; });
    var a = FM.animatedProps(C), w = smAllKfLists(C);
    if (a.length !== w.length || w.some(function (p) { return a.indexOf(p) < 0; })) throw new Error('CONTROL: without cue effects the generic walk (' + w.length + ') and animatedProps (' + a.length + ') still disagree — the walk is not a fair judge');
    if (FM.timedLists && FM.timedLists(L, { cues: false }).length !== FM.animatedProps(L).length) throw new Error('timedLists(layer, {cues:false}) is not animatedProps');
    /* FULL IS UNTOUCHED (DESIGN.md §0.4 B2): Full's own shift still moves exactly animatedProps' lists, so a caption
       track moved in Full leaves its cue effects where they were, as on HEAD. */
    var F = smKitchenSink(), cueKey = F.captions[0].effects[0].params.radius.kf[0];
    FM.shiftLayerKeyframes(F, 3);
    if (Math.abs(F.transform.x.kf[0].t - 4) > 1e-9) throw new Error('CONTROL: Full’s shift did not move the transform key — the shift itself is broken');
    if (Math.abs(cueKey.t - 1.5) > 1e-9) throw new Error('Full’s shiftLayerKeyframes now moves cue effects (' + cueKey.t + ', want 1.5 as on HEAD) — a Full behaviour change, DESIGN §0.4 B2');
  });
```

(Its "fails before" message is the 29 Sep one, §7.1. The last clause passes on HEAD by design: it pins Full's behaviour, and
the mutation that would make it fail is exactly the withdrawn 1.1.1.)

### 3.2 Before step 1.2 ships: the "Full unchanged" group and its gate (DESIGN §0.4.5)

Nothing in step 1.2 is visible, but it touches shared files (`storage.js`, `compositor.js`, `collab-core.js`, `app.js`,
`ai-ops.js`), so the group must exist before it ships. **Written as a plan here; none of it is written or run yet.**

1. **`tests/full-unchanged.html`** (new; plain page in the suite's folder, loads the app in an iframe exactly as
   `tests/run.html` does). It builds the FU fixture project through the real app (3 clips from in-memory canvases, a text, a
   song, a caption track with an animated cue effect, a group), then runs FU1–FU7 (DESIGN §0.4.5) and writes one JSON record
   per screen: the layout record (every visible element's id / class path, rect rounded to 0.5 px, text, `aria-label`,
   `title`, and display, visibility, opacity, color, background-color, font-size, transform), and, for FU2–FU5, the state after
   each step (the project JSON with only `FU_INVISIBLE` masked, history depth, the toast text, the selection, `FM.time`, frame
   hashes at three times). Synthetic pointer events only on attached elements (re-acquire after anything that rebuilds).
2. **`tools/full-unchanged.sh`** (new): waits for the builder to be idle (no `.ship-in-progress`, `.mutation-in-progress`,
   `.spotcheck-in-progress`); `git archive HEAD | tar -x -C "$TMP/head"` (no worktree, no stash); two free ports in
   8790–8799 (checked with `lsof`); `tools/serve.sh` on each; `tests/_cdp.py` on each at `--width 380` (380×800) and
   `--width 1280` (1280×800) with `?only=` the probe; compares the records (exact) and the PNGs (tolerance measured first by
   rendering HEAD against itself twice; both numbers written into the script); prints PASS or the first differences by name;
   kills both servers and every Chrome it started on a trap. **Self-test on every run:** a scratch copy with a 1 px margin added
   to `#transport`, one toast word changed, and `js/app.js`'s split floor moved to 0.1 s must each turn it red, or it will not
   print PASS. `FU_INVISIBLE` (the only document keys allowed to differ after a Full edit) is one list at the top of the
   script, each entry citing its DESIGN §0.4.3 row: `srcW`, `srcH`, `srcRev` (I2), `pick` (I3), `sm.twin` (I5); and by name
   `SCHEMA_REV` / `SCHEMA_FP` (N1). **The same list, and only it, masks the op payloads FU4 compares** (an `li` op carries the
   whole layer, so a Full add now carries `srcW`; without the mask FU4 is red for an invisible field, and the temptation is to
   loosen it by hand: DESIGN §21 F9). FU6 runs at every size in DESIGN §0.4.5 FU6 (§21 added the short and sideways ones).
3. **`tools/ship.sh`**: when the newest POLISH-LOG line says `queue 980`, **or the diff against HEAD touches a Simple-owned file
   (`js/spine.js`, `js/spine-words.js`, `js/simple-timeline.js`, `js/editor-mode.js`, `js/simple-tools.js`) or adds a line
   matching `isSimple|ed-simple|FM\.editor|FM\.spine|simpleTimeline|cv-ed|cv-editor|sm-` to any other `js/*.js`,
   `styles.css` or `index.html`** (DESIGN §21 F10: a Simple fix logged under a hunt or a later queue number would otherwise
   skip the lock), refuse unless `tools/full-unchanged.sh` printed PASS
   on this tree (cache the PASS by a hash of the sources, as `tools/mutate.sh` caches its green tree), and refuse if that line
   names any other `queue NNN` (a Simple release ships alone, so any difference from HEAD is Simple's).

**What he sees:** nothing; it is a lock. **Proof that the lock works:** its own self-test, plus one deliberate run of
step 1.2 with the withdrawn 1.1.5 applied (a 0.1 s split floor) that must be refused, recorded in #980.

---

## 4. Step 1.2: the engine (nothing on screen)

**POLISH-LOG line (template):** `- vX.YY — queue 980 (partial) — the Simple editor's engine, with nothing on screen yet:
FM.spine reads any project as a main track of clips (js/spine.js, js/spine-words.js; FM.timedLists, a collector nothing in
Full calls); the sanitiser keeps the Simple
editor's keys in one shape on every load, import, undo and live batch (SCHEMA_REV 7: your phone and your Mac both need this
version before you next share live); a duplicate, paste or Assistant copy is never a second main clip; a clip remembers its
size at add time and a pick of several files remembers it was one pick.`

**He sees:** nothing, and Full behaves exactly as on HEAD (the FU group, §3.2, must pass). **D's:** none. **Behind the
switch:** no. **Also in this release:** §3.1's `FM.timedLists` hunk and its T15 test, applied first.

**The one thing that needs care: `SCHEMA_REV` 6 → 7** (+1 on whatever the tree has; each #482 polish batch has bumped it). A v17.x phone and this build will refuse to share a live room (the
existing "update to join" path, `921 S7`). That is the gate working, but **both of his devices must be on the new build before
he next shares live**. The template line says so.

### 4.1 Changes

#### 1.2.1 `js/storage.js` (line 1542 at the start of this step)

Find (exactly once):

```js
      l.fillGradient.angle = Math.max(0, Math.min(360, +l.fillGradient.angle || 0));
      if (['linear', 'radial', 'angular'].indexOf(l.fillGradient.type) < 0) l.fillGradient.type = 'linear';
    }
  }
  FM.storage_sanitizeUnsafeValues = sanitizeUnsafeValues;   // seam: the suite drives the real function
```

Replace with:

```js
      l.fillGradient.angle = Math.max(0, Math.min(360, +l.fillGradient.angle || 0));
      if (['linear', 'radial', 'angular'].indexOf(l.fillGradient.type) < 0) l.fillGradient.type = 'linear';
    }
    sanitizeSmLayer(l);   // Simple mode P1: runs wherever this does — load, import, undo restore, the collab clone, export
  }
  FM.storage_sanitizeUnsafeValues = sanitizeUnsafeValues;   // seam: the suite drives the real function

  /* ═══ THE SIMPLE EDITOR'S KEYS (Simple mode Phase 1, DESIGN.md §2.2–§2.3) ═══════════════════════════════════════
   * `layer.sm` and `project.sm` are the only things the Simple editor stores, plus four plain layer fields. Each rule
   * below is a past failure: whitelist drift dropped fields four times, so UNKNOWN plain sub-keys are KEPT (a newer
   * build's `sm.row` survives this one); a sanitiser that consulted media records gave different answers on the owner
   * and on a guest with no media, so this reads DOCUMENT FIELDS ONLY; and the output is canonical — sanitising a valid
   * document changes nothing, byte for byte, or every redo and every host fix op would rewrite it. Key order is left
   * as it came: only invalid keys are removed, so a second pass finds nothing to do.
   * "Plain" is defined, not guessed: null, a boolean, a finite number, a string up to 200 characters, or an array /
   * object of those, at most 3 deep, at most 24 keys per object, at most 2 KB serialised. Anything else is dropped
   * WHOLE, never truncated. */
  const SM_FLAGS = ['main', 'stay', 'tail', 'twin', 'muteByMode', 'unit'];
  function smPlain(v, depth) {
    if (v === null || typeof v === 'boolean') return true;
    if (typeof v === 'number') return isFinite(v);
    if (typeof v === 'string') return v.length <= 200;
    if (typeof v !== 'object' || depth >= 3) return false;
    const ks = Object.keys(v);
    if (ks.length > 24) return false;
    if (!Array.isArray(v) && Object.getPrototypeOf(v) !== Object.prototype) return false;
    for (let i = 0; i < ks.length; i++) {
      if (!Array.isArray(v) && (ks[i].charAt(0) === '_' || ks[i] in Object.prototype)) return false;
      if (!smPlain(v[ks[i]], depth + 1)) return false;
    }
    return true;
  }
  function smKeepUnknown(o, k) {
    if (k.charAt(0) === '_' || k in Object.prototype) return false;
    const v = o[k];
    if (!smPlain(v, 0)) return false;
    try { return JSON.stringify(v).length <= 2048; } catch (e) { return false; }
  }
  function isPlainObj(o) { return !!o && typeof o === 'object' && !Array.isArray(o) && Object.getPrototypeOf(o) === Object.prototype; }
  function sanitizeSmLayer(l) {
    if (!l || typeof l !== 'object') return;
    // the plain helper fields (§2.2): native size and the mediaRev it describes, and the pick a clip came from
    ['srcW', 'srcH'].forEach(k => { if (k in l && !(typeof l[k] === 'number' && l[k] > 0 && l[k] <= 16384)) delete l[k]; });
    if ('srcRev' in l && !(Number.isInteger(l.srcRev) && l.srcRev >= 0)) delete l.srcRev;
    if ('pick' in l) {
      const p = l.pick;
      const ok = isPlainObj(p) && typeof p.b === 'string' && p.b.length > 0 && p.b.length <= 32 && Number.isInteger(p.i) && p.i >= 0 && p.i <= 9999;
      if (!ok) delete l.pick;
      else if (Object.keys(p).length !== 2) l.pick = { b: p.b, i: p.i };
    }
    if (!('sm' in l)) return;
    const sm = l.sm;
    if (!isPlainObj(sm)) { delete l.sm; return; }
    Object.keys(sm).forEach(k => {
      if (SM_FLAGS.indexOf(k) >= 0) { if (sm[k] !== true) delete sm[k]; }
      else if (k === 'tailEnd') { if (!(typeof sm.tailEnd === 'number' && isFinite(sm.tailEnd) && sm.tailEnd >= 0)) delete sm.tailEnd; }
      else if (!smKeepUnknown(sm, k)) delete sm[k];
    });
    // sm.main only on a member layer that DRAWS A PICTURE: never on audio-only, a caption track or a group (§2.3)
    if (sm.main && (l.audioOnly === true || l.type === 'group' || (l.type === 'text' && Array.isArray(l.captions)))) delete sm.main;
    if (sm.main) { delete sm.stay; delete sm.tail; delete sm.tailEnd; }   // main wins; a main clip is never a tail item
    if (sm.tail && !sm.stay) sm.stay = true;                            // tail implies stay
    if (!Object.keys(sm).length) delete l.sm;
  }
  function sanitizeSmProject(p) {
    if (!p || !('sm' in p)) return;
    const sm = p.sm;
    if (!isPlainObj(sm)) { delete p.sm; return; }
    Object.keys(sm).forEach(k => {
      const v = sm[k];
      if (k === 'v') {                         // clamped to [1, 1000] and NEVER to SM_V: the newer-file guard reads it (§2.3)
        if (typeof v !== 'number' || !isFinite(v)) delete sm.v;
        else { const n = Math.max(1, Math.min(1000, Math.round(v))); if (n !== v) sm.v = n; }
      }
      else if (k === 'adopted' || k === 'muteClips') { if (v !== true) delete sm[k]; }
      else if (k === 'home') { if (!(typeof v === 'string' && v.length <= 32)) delete sm.home; }   // any string: an older build must not erase a newer value
      else if (k === 'mrev') { if (!(Number.isInteger(v) && v >= 0)) delete sm.mrev; }
      else if (!smKeepUnknown(sm, k)) delete sm[k];
    });
    if (!Object.keys(sm).length) delete p.sm;
  }
  FM.storage._sanitizeSm = sanitizeSmLayer;          // suite seams: the real rules, not a copy
  FM.storage._sanitizeSmProject = sanitizeSmProject;
```

#### 1.2.2 `js/storage.js` (line 1063 at the start of this step)

Find (exactly once):

```js
    if ('thumbPinned' in p && typeof p.thumbPinned !== 'boolean') p.thumbPinned = false;
```

Replace with:

```js
    if ('thumbPinned' in p && typeof p.thumbPinned !== 'boolean') p.thumbPinned = false;
    sanitizeSmProject(p);   // Simple mode P1 (§2.3): project.sm — v, adopted, home, muteClips, mrev, unknown plain keys kept
```

#### 1.2.3 `js/storage.js` (line 1500 at the start of this step)

Find (exactly once):

```js
      const out = keepUid(f, { type: f.type, enabled: f.enabled !== false, params: params });
```

Replace with:

```js
      const out = keepUid(f, { type: f.type, enabled: f.enabled !== false, params: params });
      if (f.sm === 1) out.sm = 1;   // Simple mode P1: "added in Simple" (§8.5c) — kept only as exactly 1, top level and children alike
```

#### 1.2.4 `js/storage.js` (line 1655 at the start of this step)

Find (exactly once):

```js
  FM.storage._sanitizeLayers = sanitizeImportedLayers;   // read by the suite, and by history.restore
```

Replace with:

```js
  FM.storage._sanitizeLayers = sanitizeImportedLayers;   // read by the suite, and by history.restore
  /* Simple mode P1 (DESIGN.md §5.2 media state): is this project's media still being read back from the device? While
     it is, a clip with no record is 'arriving' (drawn in place, never classified as sound), not 'missing'. */
  FM.storage.hydrating = function () { return !!_hydrating; };
```

#### 1.2.5 `js/compositor.js` (line 14823 at the start of this step; re-anchored 1 Oct: the size is now the crop at `t`, `layerSizeAt`)

Find (exactly once):

```js
  function layerAABB(l, t, scene) {
    const sz = layerSizeAt(l, t); if (!sz) return null;
```

Replace with (every existing caller passes three arguments, so Full's boxes are unchanged):

```js
  function layerAABB(l, t, scene, size) {
    const sz = size || layerSizeAt(l, t); if (!sz) return null;
```

#### 1.2.6 `js/compositor.js` (line 14840 at the start of this step)

Find (exactly once):

```js
  FM._layerAABB = layerAABB;   // suite seam (queue 539)
```

Replace with:

```js
  FM._layerAABB = layerAABB;   // suite seam (queue 539)
  /* THE WORLD BOX (Simple mode P1, DESIGN.md §5.2 fillsFrame): a layer's axis-aligned box in project px at `t`, through
     its whole parent chain (the compositor's own CTM), for an explicit native `size` — so the classifier and the renderer
     cannot drift apart. `size` omitted = layerSizeAt(l, t) (the crop at t), exactly what layerAABB returns today. */
  FM.worldBox = function (layer, t, scene, size) { return layerAABB(layer, t, scene, size); };
```

#### 1.2.7 `js/compositor.js` (line 17863 at the start of this step)

Find (exactly once):

```js
  function collectGroupUnits(scene, t) {
```

Replace with:

```js
  FM.groupNeedsUnit = groupNeedsUnit;   // Simple mode P1: a group that composites as ONE piece is a block (§2.5) — one rule, shared
  function collectGroupUnits(scene, t) {
```

#### 1.2.8 `js/collab-core.js` (line 42 at the start of this step; re-anchored 1 Oct, v17.21)

Find (exactly once; the line closes the comment block that logs batches 1-5's bumps, which stays as it is):

```js
  C.SCHEMA_REV = 6;
```

Replace with (if a later batch has moved it past 6, use +1 on what is there and say so in the comment):

```js
  /* Bumped to 7 by Simple mode Phase 1 (DESIGN.md §2.3, §14.2): the sanitiser now puts `layer.sm`, `project.sm`, an
     effect's `sm` marker and the plain helper fields (srcW/srcH/srcRev, pick) in canonical form. A rev-6 build keeps them
     untouched, so the two would normalise one project to two documents; the fixture below carries each, and SM_V is hashed in. */
  C.SCHEMA_REV = 7;
```

#### 1.2.9 `js/collab-core.js` (line 162 at the start of this step)

Find (exactly once):

```js
      effects: [{ type: 'blur', enabled: true, params: { radius: 3 } }],
      audioFx: [{ type: 'reverb', enabled: true, params: {} }],
      behaviors: [{ type: 'wiggle', prop: 'x', enabled: true, params: {} }],
      speed: { kf: [{ t: 0, v: 1, e: 'linear' }, { t: 2, v: 2, e: 'easeIn' }] }
    }];
  };
```

Replace with:

```js
      effects: [{ type: 'blur', enabled: true, params: { radius: 3 } }, { type: 'blur', enabled: true, sm: 1, params: { radius: 2 } }, { type: 'blur', enabled: true, sm: 'x', params: { radius: 1 } }],
      audioFx: [{ type: 'reverb', enabled: true, params: {} }],
      behaviors: [{ type: 'wiggle', prop: 'x', enabled: true, params: {} }],
      speed: { kf: [{ t: 0, v: 1, e: 'linear' }, { t: 2, v: 2, e: 'easeIn' }] },
      // Simple mode (SCHEMA_REV 7): junk, a plain unknown sub-key and a newer build's object sub-key, side by side
      sm: { main: 'yes', stay: true, row: 2, future: { a: 1 } }, srcW: 1920, srcH: -4, srcRev: 0, pick: { b: 'pk1', i: 2, x: 1 }
    }];
  };
  /* …and a project carrying Simple's project keys (SCHEMA_REV 7): `home` any string ≤ 32 is kept, `v` clamped, junk dropped. */
  const SCHEMA_PROJECT_FIXTURE = function () {   // not on C: the S0 test pins FM.collab's exports
    return { width: 320, height: 240, fps: 30, duration: 4, background: '#000000',
             sm: { v: 1.4, home: 'nope', adopted: 'yes', mrev: -1, later: { a: [1, 2] } } };
  };
```

#### 1.2.10 `js/collab-core.js` (line 221 at the start of this step)

Find (exactly once):

```js
    const L = C.SCHEMA_FIXTURE();
    FM.storage._sanitizeLayers(L);
```

Replace with:

```js
    const L = C.SCHEMA_FIXTURE();
    FM.storage._sanitizeLayers(L);
    const PJ = SCHEMA_PROJECT_FIXTURE();
    if (FM.storage._clampProjectDims) FM.storage._clampProjectDims(PJ);
```

#### 1.2.11 `js/collab-core.js` (line 236 at the start of this step; re-anchored 1 Oct: batch 3 added the audio-effect term `adefs`)

Find (exactly once):

```js
    return P.cyrb53(P.canon(L) + '|' + P.canon(defs) + '|' + P.canon(adefs) + '|' + P.canon(C.OP_GRAMMAR) + '|' + der + '|r' + C.SCHEMA_REV);
```

Replace with (the `adefs` term stays exactly where it is):

```js
    return P.cyrb53(P.canon(L) + '|' + P.canon(defs) + '|' + P.canon(adefs) + '|' + P.canon(C.OP_GRAMMAR) + '|' + der + '|r' + C.SCHEMA_REV +
                    '|p' + P.canon(PJ) + '|smv' + (FM.SM_V || 0));   // SM_V moves only with a SCHEMA_REV bump (§2.3)
```

#### 1.2.12 `js/collab-core.js` (line 241 at the start of this step; re-anchored 1 Oct)

Find (exactly once; match on `  C.SCHEMA_FP = `, since the number and its comment are whatever the last batch pinned):

```js
  C.SCHEMA_FP = 836365476955739;   // #482 polish batch 5 (SCHEMA_REV 6): eight grading effects gained controls
```

Replace with the number §4.4's gate prints on the patched tree (the 29 Sep value, `4276424858841693`, was for v17.13 at
SCHEMA_REV 3 and is wrong now; there is no measured value for v17.21 yet, so do not paste one from this file):

```js
  C.SCHEMA_FP = <printed by the gate>;   // Simple mode P1 (SCHEMA_REV 7): measured by `921 S1 the schema fingerprint gate` on the tree shipped
```

#### 1.2.13 `js/app.js` (line 3028 at the start of this step)

Find (exactly once):

```js
  FM.addMediaLayer = function (rec) {
```

Replace with:

```js
  FM.addMediaLayer = function (rec, opts) {   // opts (Simple mode P1): { at: seconds, pick: {b, i} } — Simple's + lays a pick end to end
```

#### 1.2.14 `js/app.js` (line 3055 at the start of this step)

Find (exactly once):

```js
    const start = first ? 0 : Math.min(FM.time, P.duration || 0);
    const layer = FM.makeLayer(rec.kind, {
```

Replace with:

```js
    const at = (opts && typeof opts.at === 'number' && isFinite(opts.at)) ? Math.max(0, opts.at) : null;
    const start = at != null ? at : (first ? 0 : Math.min(FM.time, P.duration || 0));   // an explicit `at` is where the clip goes, even past the end (the next one of a pick)
    const layer = FM.makeLayer(rec.kind, {
```

#### 1.2.15 `js/app.js` (line 3060 at the start of this step)

Find (exactly once):

```js
    const fit = Math.min(P.width / rec.width, P.height / rec.height);
    layer.transform.scale = (isFinite(fit) && fit > 0) ? fit : 1;
    FM.media.set(layer.id, rec);
```

Replace with:

```js
    const fit = Math.min(P.width / rec.width, P.height / rec.height);
    layer.transform.scale = (isFinite(fit) && fit > 0) ? fit : 1;
    /* SIMPLE MODE P1 (DESIGN.md §2.2): what the clip IS, written where it is known — its native size and the mediaRev that
       size describes, so a device (or a guest) with no media record still knows a picture. A Replace bumps mediaRev, so a
       stale size is never read (FM.spine checks srcRev). `audioOnly` is NOT written here in Phase 1: Full treats it as
       final (timeline.js hasPicture, inspector isAudioOnly), so without DESIGN's matching write on every Replace route a
       song replaced with a video would keep a waveform in Full. It lands in Phase 2 with those routes (BUILD-PLAN §11). */
    if (rec.width > 0 && rec.height > 0 && rec.width <= 16384 && rec.height <= 16384) { layer.srcW = rec.width; layer.srcH = rec.height; layer.srcRev = layer.mediaRev || 0; }
    if (opts && opts.pick && typeof opts.pick.b === 'string') layer.pick = { b: opts.pick.b.slice(0, 32), i: Math.max(0, Math.min(9999, opts.pick.i | 0)) };
    FM.media.set(layer.id, rec);
```

#### 1.2.16 `js/app.js` (line 3125 at the start of this step)

Find (exactly once):

```js
    }
  }

  FM.addTextLayer = function () {
```

Replace with:

```js
    }
    return layer;   // Simple mode P1: the layer that landed — handleFiles' {at} advances by it; every other caller ignores it
  }

  FM.addTextLayer = function () {
```

#### 1.2.17 `js/app.js` (line 5473 at the start of this step)

Find (exactly once):

```js
  FM._handleFiles = function (files) { return handleFiles(files); };
```

Replace with:

```js
  FM._handleFiles = function (files, opts) { return handleFiles(files, opts); };
```

#### 1.2.18 `js/app.js` (line 5489 at the start of this step)

Find (exactly once):

```js
  async function handleFiles(files) {
    // Consumed here, once, for THIS batch — see audioImport in js/addmenu.js.
    const wantAudio = !!FM._wantAudioOnly; FM._wantAudioOnly = false;
    const pickedIn = FM.startedIn(), notAdded = [];   // queue 690 (hunt 5): see FM.stillIn above
    const add = function (rec, file) {
      if (!FM.stillIn(pickedIn)) { FM.letGoMedia(rec); notAdded.push(file); return false; }
      FM.addMediaLayer(rec);
      return true;
    };
```

Replace with:

```js
  async function handleFiles(files, opts) {
    // Consumed here, once, for THIS batch — see audioImport in js/addmenu.js.
    const wantAudio = !!FM._wantAudioOnly; FM._wantAudioOnly = false;
    const pickedIn = FM.startedIn(), notAdded = [];   // queue 690 (hunt 5): see FM.stillIn above
    /* SIMPLE MODE P1 (DESIGN.md §15.1, §5.2 import stacks). Every layer of one pick carries `pick: {b, i}`, so the Simple
       view can tell "four clips picked together" from a stacked take. With `opts.at` (Simple's +) the files are laid END
       TO END from there, each at the end of the one before; without it nothing about placement changes. */
    const pickB = 'pk' + Date.now().toString(36).slice(-6) + Math.floor(Math.random() * 1296).toString(36);
    let pickI = 0, at = (opts && typeof opts.at === 'number' && isFinite(opts.at)) ? Math.max(0, opts.at) : null;
    const add = function (rec, file) {
      if (!FM.stillIn(pickedIn)) { FM.letGoMedia(rec); notAdded.push(file); return false; }
      const got = FM.addMediaLayer(rec, { at: at, pick: files.length > 1 ? { b: pickB, i: pickI++ } : null });
      if (at != null && got) at = got.start + got.duration;
      return true;
    };
```

#### 1.2.19 `js/app.js` (line 4417 at the start of this step)

Find (exactly once):

```js
    const idx = FM.scene.layers.findIndex(l => l.id === id);
    FM.scene.layers.splice(Math.max(0, idx), 0, ...inserts);
```

Replace with:

```js
    if (FM.spine && FM.spine.onCopy) FM.spine.onCopy(inserts, 'duplicate');   // Simple mode P1: a copy is not a second main clip
    const idx = FM.scene.layers.findIndex(l => l.id === id);
    FM.scene.layers.splice(Math.max(0, idx), 0, ...inserts);
```

#### 1.2.20 `js/app.js` (line 4517 at the start of this step)

Find (exactly once):

```js
    FM.relinkSplitCopies(copies.map(c => ({ src: c.entry.snapshot, copy: c.copy })));   // queue 914.8
```

Replace with:

```js
    FM.relinkSplitCopies(copies.map(c => ({ src: c.entry.snapshot, copy: c.copy })));   // queue 914.8
    if (FM.spine && FM.spine.onCopy) FM.spine.onCopy(copies.map(c => c.copy), 'paste');   // Simple mode P1 (§12.2)
```

#### 1.2.21 `js/ai-ops.js` (line 467 at the start of this step)

Find (exactly once):

```js
            var copy = FM.cloneLayer(layer);
            FM.insertLayer(copy);
```

Replace with:

```js
            var copy = FM.cloneLayer(layer);
            if (FM.spine && FM.spine.onCopy) FM.spine.onCopy(copy, 'aiClone');   // Simple mode P1 (§12.2): never a second main clip
            FM.insertLayer(copy);
```

#### 1.2.22 `index.html` (line 1055 at the start of this step)
> `?v=` numbers here are the tree's on 29 Sep (re-anchored 1 Oct to v17.21's `?v=118`; the +1 bump is §2.3's). Match the tag by its path and keep the rule: the file this step changes gets +1 on whatever is there; a new file starts at `?v=1`.


Find (exactly once):

```html
  <script src="js/scene.js?v=118"></script>
```

Replace with:

```html
  <script src="js/scene.js?v=118"></script>
  <script src="js/spine-words.js?v=1"></script>   <!-- Simple mode P1: every word the Simple editor shows (DESIGN.md §8.9) -->
  <script src="js/spine.js?v=1"></script>         <!-- Simple mode P1: FM.spine, the read side — after scene.js, before compositor/storage -->
```

### 4.2 New file `js/spine-words.js` (whole file)

```js
/* FreeMotion — every word the Simple editor shows, in one object (Simple mode, DESIGN.md §8.9).
 *
 * One table, read by every renderer, so "one name everywhere" (his #454 / #967 rule) is a property of the code and not of
 * remembering. The command names in DESIGN.md §3.6 / §14 are code names and never appear here. The editor names are D1
 * (recommended A: Simple / Full); change them HERE and nowhere else.
 * Plain script, no build: loaded before js/spine.js, which reads it lazily (FM.spineWords) so the order is not load-bearing.
 */
window.FM = window.FM || {};
(function (FM) {
  'use strict';
  FM.spineWords = {
    editor: {   // the ⚙ cog's third block (DESIGN.md §6; 1 Oct: no ⇄ in any play bar, no ⋯ item, no back button)
      simple: 'Simple', full: 'Full', title: 'Editor',
      toSimple: 'Switch to Simple editor', toFull: 'Switch to Full editor',   // the switch names its ACTION (§8.10 item 1)
      liveSimple: 'Simple editor', liveFull: 'Full editor',                   // the polite live region after a switch
      what: 'What should you use?', youreIn: 'You’re in ', here: 'You’re here',
      simpleText: 'Clips one after another, with text, captions and music. Gaps close up by themselves. Best for a quick video, or if you’ve never edited.',
      fullText: 'Everything FreeMotion does: layers anywhere, keyframes, masks, 3D and every effect. For animation, and anything Simple can’t do.',
      note: 'Same project in both. Nothing is converted, and you can switch back any time.',
      firstSimple: 'Simple editor. Switch back any time from the ⚙ cog.',     // Simple only; arriving in Full shows nothing (§0.4 V4)
      refuse: { export: 'Wait for the export to finish', recording: 'Close the recorder first', busy: 'One moment…', drag: '', unsettled: 'Finish or close the open tool first' },
      warn: {   // DESIGN §6.4: a switch that would lose un-undoable work asks first
        title: 'Switch to ',
        crop: 'Your crop isn’t applied yet. Switching closes the crop tool, and Undo can’t bring the box back.',
        touchup: 'Your touch-up isn’t applied yet. Switching closes it, and Undo can’t bring the box back.',
        pen: 'Your drawing isn’t finished. Switching closes the pen, and Undo can’t bring the points back.',
        penShort: 'Your drawing has only 2 points, so it can’t be kept. Switching throws it away.',
        redo: function (n) { return 'Switching saves what you just did as a step, so Redo can’t bring back the ' + (n === 1 ? 'step' : n + ' steps') + ' you undid.'; },
        ok: { crop: 'Apply crop and switch', touchup: 'Apply touch-up and switch', pen: 'Finish drawing and switch', redo: 'Switch anyway' },
        okAnyway: 'Switch anyway', okSeveral: 'Apply them and switch', stay: 'Stay'
      }
    },
    settings: {   // only under D22 B (a Settings row gating the cog block)
      label: 'Simple editor',
      hint: 'See any project as clips — an early look.'   // NOT 'still being tested': #967's rule keeps that phrase on Work with friends alone (test 967 B4 1). Phase 2: 'Edit clip after clip — an early look.'
    },
    sections: {
      captions: 'Captions', text: 'Text', overlay: 'Overlay', effect: 'Effects', behind: 'Behind',
      main: 'Clip row', audio: 'Sound'
    },
    lines: {
      openFull: 'Open in Full',
      deleteNext: 'Deleting clips comes next',
      gapNext: 'Closing gaps comes in the next update',
      splitNext: 'Splitting comes in the next update',
      dupNext: 'Duplicating clips comes next',
      newer: 'Made with a newer FreeMotion. Update to edit clips here',
      pro: 'Has moves and effects',
      moreInFull: 'More in Full ›',
      noFootage: 'No footage'
    },
    a11y: {
      timeline: 'Timeline',
      split: 'Split at the line',
      add: 'Add clips to the end',
      clip: function (i, n, len, follow) {
        return 'Clip ' + i + ' of ' + n + ', ' + len.toFixed(1) + ' s' + (follow ? ', ' + follow + (follow === 1 ? ' thing follows it' : ' things follow it') : '');
      },
      gap: function (s) { return s.toFixed(1) + ' second gap, Close gap'; },
      overlap: function (s) { return 'Overlap ' + s.toFixed(1) + ' s, Fix'; }
    },
    items: {   // FM.spine.itemWord: never layer.name (§8.9 "Naming items in lines")
      clip: 'Clip', sticker: 'the sticker', image: 'the image', videoTop: 'the video on top', song: 'the song',
      sound: 'the sound', effect: 'the effect', captions: 'the captions', block: 'the group', shape: 'the shape', text: 'the text'
    },
    summary: function (clips, secs) {
      const m = Math.floor(secs / 60), s = Math.round(secs - m * 60);
      return clips + (clips === 1 ? ' clip' : ' clips') + ' · ' + m + ':' + (s < 10 ? '0' : '') + s;
    }
  };
})(window.FM);
```

### 4.3 New file `js/spine.js` (whole file)

```js
/* FreeMotion — FM.spine, the Simple editor's engine: READ SIDE ONLY (Simple mode Phase 1, DESIGN.md §2, §5.2, §14.1).
 *
 * WHAT THIS IS. The Simple editor is a second VIEW over the same {project, layers} document. This file answers one
 * question, purely: "drawn the way CapCut shows a project, what is this document?" — which clips make the main track,
 * in what order, with what seams between them, what every other item is (text, captions, overlay, sound, effect, a
 * block), which clip it follows, and which lane it sits in. It never writes the document, never reads FM.scene inside
 * classify (it is handed a scene), and has no DOM, so the suite drives it headless.
 *
 * WHAT IS NOT HERE YET (Phase 2+, BUILD-PLAN.md "Phase 1 scope"): the edit runner and every command, adoption, the
 * link rule through the split lineage (parents / mattes / Follow as links), moves-together anchors, main BLOCKS, the
 * mask extent inside fillsFrame, the group-opacity product inside drawsPicture, caption blocks, the docRev cache.
 * `read()` classifies on every call: it is only called from the Simple timeline's rebuild, never per frame, and T1's
 * timing test holds it to its budget. A cache keyed on a hand-picked field hash is exactly what §2.5 forbids.
 */
window.FM = window.FM || {};
(function (FM) {
  'use strict';

  /* The version of the `sm` rules this build writes. Changes ONLY with a collab SCHEMA_REV bump — collab-core.js hashes it
     into the schema fingerprint, so a build that moved one without the other cannot join a room (§2.3). */
  FM.SM_V = 1;
  const S = FM.spine = FM.spine || {};
  S.SM_V = FM.SM_V;
  const words = () => FM.spineWords || {};

  /* MIN_LEN = max(1 frame, 0.1 s), compared with 1e-6 slack everywhere (§3.1). */
  S.minLen = function (fps) { return Math.max(1 / (fps || 30), 0.1); };

  /* ═══ THE ONE `sm` WRITER (§2.3). Merges into layer.sm, deletes the sub-key when off, deletes `sm` once empty. No code
     assigns `sm` whole (that would wipe a newer build's sub-keys). Refuses what the sanitiser would strip, so a write can
     never be undone by the next load. Returns whether the layer now carries the flag as asked. */
  const FLAGS = ['main', 'stay', 'tail', 'twin', 'muteByMode', 'unit'];
  S.setFlag = function (layer, key, on) {
    if (!layer || FLAGS.indexOf(key) < 0) return false;
    if (on && key === 'main' && (layer.audioOnly === true || layer.type === 'group' || (layer.type === 'text' && Array.isArray(layer.captions)))) return false;
    if (on && key === 'unit' && layer.type !== 'group') return false;
    if (on) {
      if (!layer.sm || typeof layer.sm !== 'object') layer.sm = {};
      layer.sm[key] = true;
      if (key === 'main') { delete layer.sm.stay; delete layer.sm.tail; delete layer.sm.tailEnd; }
      if (key === 'tail') { if (layer.sm.main) { delete layer.sm.tail; return false; } layer.sm.stay = true; }
      if (key === 'stay' && layer.sm.main) { delete layer.sm.stay; return false; }
    } else if (layer.sm) {
      delete layer.sm[key];
      if (key === 'stay') { delete layer.sm.tail; delete layer.sm.tailEnd; }   // tail implies stay
      if (!Object.keys(layer.sm).length) delete layer.sm;
    }
    return !!(layer.sm && layer.sm[key]) === !!on;
  };

  /* ═══ THE ONE THING THAT TOUCHES `sm` ON A COPY (§12.2 route table, T6). Keep-routes (import, use-as-new, project
     duplicate, detach, Save my version, checkpoint restore, split) keep every byte, so they never call this. Strip-routes
     (duplicate, paste, extract audio, AI clone) make a copy that is NOT a second main clip and NOT a second track-end
     item: `sm.main` and `sm.tail` go (a copied watermark keeps `sm.stay`), and `pick` goes (a copy was not in the pick).
     (A song never carries `sm.tail`: D17 B, music runs on in black as in Full.)
     Returns the copies, for chaining. */
  S.STRIP_ROUTES = ['duplicate', 'paste', 'extract', 'aiClone'];
  S.onCopy = function (copies, route) {
    if (S.STRIP_ROUTES.indexOf(route) < 0) return copies;
    (Array.isArray(copies) ? copies : [copies]).forEach(c => {
      if (!c) return;
      delete c.pick;
      if (c.sm && typeof c.sm === 'object') {
        delete c.sm.main; delete c.sm.tail; delete c.sm.tailEnd;
        if (!Object.keys(c.sm).length) delete c.sm;
      }
    });
    return copies;
  };

  /* ═══ HOW A LINE NAMES AN ITEM (§8.9): "Clip N", a text's first words, else its kind — never layer.name. */
  S.itemWord = function (layer, R) {
    const w = words().items || {};
    if (!layer) return '';
    if (R && R.index && R.index.has(layer.id)) return (w.clip || 'Clip') + ' ' + (R.index.get(layer.id) + 1);
    if (layer.type === 'text' && Array.isArray(layer.captions)) return w.captions || 'the captions';
    if (layer.type === 'text') { const t = String(layer.text || '').trim().replace(/\s+/g, ' '); return t ? '“' + (t.length > 16 ? t.slice(0, 16) + '…' : t) + '”' : (w.text || 'the text'); }
    const u = R && R.units && R.units[layer.id];
    const k = u ? u.kind : '';
    if (k === 'audio') return u.long ? (w.song || 'the song') : (w.sound || 'the sound');
    if (k === 'effect') return w.effect || 'the effect';
    if (k === 'block') return w.block || 'the group';
    if (layer.type === 'shape') return w.shape || 'the shape';
    if (layer.type === 'image') return w.image || 'the image';
    return w.videoTop || 'the video on top';
  };

  /* ═══ WHERE SIMPLE SPEAKS (§3.12): one sink, set by the Simple timeline. FM.toast is banned for Simple's lines. */
  let sink = null;
  S._setSink = function (fn) { sink = typeof fn === 'function' ? fn : null; };
  S.say = function (key, opts) {
    const L = words().lines || {};
    const text = (typeof key === 'string' && L[key]) ? L[key] : String(key || '');
    if (sink) { try { sink(text, opts || {}); } catch (e) {} }
    return text;
  };

  /* ───────────────────────────────── the classifier (§5.2) ───────────────────────────────── */

  const AUDIO_EXT = /\.(mp3|m4a|aac|wav|webm|weba|ogg|opus|flac|aif|aiff|caf)( copy( \d+)?)?$/i;   // .webm: voice recordings (§5.2)
  const PIC_EXT = /\.(mp4|mov|m4v|jpg|jpeg|png|gif|heic|webp)( copy( \d+)?)?$/i;
  const KEYING = /^(chromakey|lumakey|removecolor|colorkey)$/i;

  function isAnim(p) { return !!(p && typeof p === 'object' && Array.isArray(p.kf) && p.kf.length); }
  function evalP(p, t) { return FM.evalProp ? FM.evalProp(p, t) : (typeof p === 'number' ? p : 0); }

  S.classify = function (scene) {
    const L = (scene && Array.isArray(scene.layers)) ? scene.layers : [];
    const P = (scene && scene.project) || {};
    const W = P.width || 1080, H = P.height || 1920, fps = P.fps || 30, eps = 0.5 / fps;
    const adopted = !!(P.sm && P.sm.adopted === true);
    const byId = new Map(), z = new Map();
    L.forEach((l, i) => { if (l && l.id != null) { byId.set(l.id, l); z.set(l.id, i); } });
    const hydrating = !!(FM.storage && FM.storage.hydrating && FM.storage.hydrating());
    const media = id => (FM.media && FM.media.get) ? FM.media.get(id) : null;

    // ── 1. UNITS (§2.5): walk each layer to its group ancestors once, memoised, cycle-capped at 64 hops ──
    const isBlockGroup = g => !!g && g.type === 'group' && (
      !!(FM.groupNeedsUnit && FM.groupNeedsUnit(g, g.start || 0)) || !!g.maskGroup ||
      (!(g.sm && g.sm.unit) && !!g.transform && Object.keys(g.transform).some(k => isAnim(g.transform[k]))));
    const anc = new Map();   // id -> { block: outermost block-group ancestor id | null, hidden: bool }
    function ancestry(l) {
      if (anc.has(l.id)) return anc.get(l.id);
      let block = null, hidden = false, pid = l.parent, hops = 0;
      while (pid && hops++ < 64) {
        const p = byId.get(pid);
        if (!p || p.type !== 'group') break;   // a non-group parent is TRANSFORM parenting: not membership (§2.5)
        if (p.visible === false) hidden = true;
        if (isBlockGroup(p)) block = p.id;     // keep walking: the OUTERMOST block wins
        pid = p.parent;
      }
      const r = { block: block, hidden: hidden };
      anc.set(l.id, r);
      return r;
    }
    const units = [];                        // { id, l, start, end, z, visible, members }
    const membersOf = new Map();
    L.forEach(l => {
      if (!l || l.id == null) return;
      const a = ancestry(l);
      if (a.block) { if (!membersOf.has(a.block)) membersOf.set(a.block, []); membersOf.get(a.block).push(l); return; }
      if (l.type === 'group' && !isBlockGroup(l)) return;   // a transparent group's own layer is bookkeeping, not a unit
      units.push({ id: l.id, l: l, start: +l.start || 0, end: (+l.start || 0) + Math.max(0, +l.duration || 0), z: z.get(l.id),
                   visible: l.visible !== false && !a.hidden, members: null });
    });
    units.forEach(u => { if (membersOf.has(u.id)) u.members = membersOf.get(u.id); });

    // ── 2. MEDIA STATE and 3. KIND ──
    const isMedia = l => l.type === 'video' || l.type === 'image';
    function mediaState(l) {
      if (!isMedia(l)) return 'here';
      if (media(l.id)) return 'here';
      return hydrating ? 'arriving' : 'missing';
    }
    function nativeSize(l, st) {
      const rec = media(l.id), rev = l.mediaRev || 0;
      if (rec && rec.width > 0 && rec.height > 0 && ((rec.rev != null ? rec.rev : rev) === rev)) return { w: rec.width, h: rec.height };
      if (l.srcW > 0 && l.srcH > 0 && (l.srcRev || 0) === rev) return { w: l.srcW, h: l.srcH };
      return null;   // never a stale srcW/srcH (§5.2)
    }
    function audioOnlyOf(l, st) {
      if (l.audioOnly === true) return true;
      if (l.type !== 'video') return false;
      const rec = media(l.id);
      if (rec) return !(rec.width > 0 && rec.height > 0);
      if (l.srcW > 0 && l.srcH > 0) return false;
      if (st === 'missing') {
        const nm = String(l.name || '');
        if (AUDIO_EXT.test(nm)) return true;
        if (PIC_EXT.test(nm)) return false;
      }
      return 'unknown';
    }
    function opacityAt(l, t) { return FM.layerOpacity ? FM.layerOpacity(l, t) : evalP(l.transform && l.transform.opacity, t); }
    function drawsPicture(l) {
      const s = +l.start || 0, d = Math.max(0, +l.duration || 0);
      const ts = [s, s + d / 2, s + Math.max(0, d - 1e-3)];
      const op = l.transform && l.transform.opacity;
      if (isAnim(op)) op.kf.forEach(k => { if (k.t >= s && k.t <= s + d) ts.push(k.t); });
      return ts.some(t => opacityAt(l, t) > 0.02);
    }
    const kinds = new Map(), states = new Map(), aoMap = new Map();
    const referenced = new Set();   // ids something is transform-parented to
    L.forEach(l => { if (l && l.parent && byId.has(l.parent) && byId.get(l.parent).type !== 'group') referenced.add(l.parent); });
    units.forEach(u => {
      const l = u.l, st = mediaState(l); states.set(u.id, st);
      let k;
      if (l.type === 'camera') k = 'fullOnly';
      else if (l.type === 'null' && !referenced.has(l.id)) k = 'fullOnly';
      else if (l.type === 'group' || l.type === 'null' || /^mask-/.test(l.blendMode || '')) k = 'block';
      else if (l.type === 'adjustment') k = 'effect';
      else if (l.type === 'text' && Array.isArray(l.captions)) k = 'captions';
      else if (l.type === 'text') k = 'text';
      else if (l.type === 'shape') k = 'overlay';
      else {
        const ao = audioOnlyOf(l, st); aoMap.set(u.id, ao);
        if (ao === true) k = 'audio';
        else if (!drawsPicture(l)) k = (l.type === 'video' && !l.muted) ? 'audio' : 'overlay';
        else if (ao === 'unknown') k = 'undecided';
        else k = 'overlay';
      }
      kinds.set(u.id, k);
    });

    // ── fillsFrame (§5.2 (a), (b) and (c): the UNCROPPED native box through the parent chain; masks are Phase 2) ──
    function fillsFrame(u) {
      const l = u.l, size = nativeSize(l);
      const cx0 = W / 2, cy0 = H / 2;
      if (!size) {   // unknown size (missing media): full-frame when its position is centred within 10% (§5.2)
        const x = evalP(l.transform && l.transform.x, u.start), y = evalP(l.transform && l.transform.y, u.start);
        return Math.abs(x - cx0) <= 0.1 * W && Math.abs(y - cy0) <= 0.1 * H;
      }
      if (!FM.worldBox) return false;
      const d = u.end - u.start, samples = [u.start, u.start + d / 2, u.start + Math.max(0, d - 1e-3)];
      for (let i = 0; i < samples.length; i++) {
        let b = null;
        try { b = FM.worldBox(l, samples[i], scene, size); } catch (e) { b = null; }
        if (!b) continue;
        const bw = b.x1 - b.x0, bh = b.y1 - b.y0, cx = (b.x0 + b.x1) / 2, cy = (b.y0 + b.y1) / 2;
        const a = (bw >= 0.9 * W || bh >= 0.9 * H) && Math.abs(cx - cx0) <= 0.1 * W && Math.abs(cy - cy0) <= 0.1 * H;
        const iw = Math.max(0, Math.min(W, b.x1) - Math.max(0, b.x0)), ih = Math.max(0, Math.min(H, b.y1) - Math.max(0, b.y0));
        if (a || iw * ih >= 0.9 * W * H) return true;
      }
      return false;
    }
    // "anything that makes the upper clip see-through or cut out" (§5.2 stacked take): the lower one stays main
    function seeThrough(l) {
      if (l.blendMode && l.blendMode !== 'normal') return true;
      const op = l.transform && l.transform.opacity;
      if (isAnim(op) || (typeof op === 'number' && op < 1)) return true;
      if ((l.effects || []).some(f => f && f.enabled !== false && (KEYING.test(f.type || '') || f.type === 'penmask'))) return true;
      if (l.mask && l.mask.enabled !== false && l.mask.enabled) return true;
      if ((l.masks || []).some(m => m && m.enabled !== false)) return true;
      return false;
    }
    const hasOpacityKeyIn = (l, a, b) => { const op = l.transform && l.transform.opacity; return isAnim(op) && op.kf.some(k => k.t >= a - eps && k.t <= b + eps); };
    // a hand-made crossfade: the upper of the two has opacity keys inside the overlap (§3.1)
    function isBlend(a, b) {   // a starts first
      const up = a.z < b.z ? a : b;
      return hasOpacityKeyIn(up.l, b.start, a.end);
    }
    const blendMax = (a, b) => 0.5 * Math.min(a.end - a.start, b.end - b.start);
    const overlap = (a, b) => Math.min(a.end, b.end) - Math.max(a.start, b.start);
    const hasSound = l => l.type === 'video' && !l.muted && !(media(l.id) && media(l.id).hasAudio === false);

    // ── 4. THE MAIN TRACK ──
    const byUid = new Map(units.map(u => [u.id, u]));
    const anomalies = [];
    let mainUnits = [];
    const background = new Set();
    if (adopted) {
      units.forEach(u => {
        const members = u.members || [u.l];
        const flagged = members.some(m => m.sm && m.sm.main === true);
        if (!flagged) return;
        const k = kinds.get(u.id);
        if (k === 'audio') { anomalies.push({ kind: 'mainNoPicture', ids: [u.id] }); return; }
        if (k === 'overlay' || k === 'text' || k === 'undecided' || k === 'block') mainUnits.push(u);
      });
    } else {
      const cand = units.filter(u => kinds.get(u.id) === 'overlay' && isMedia(u.l) && u.end - u.start > 0 && fillsFrame(u));
      let vis = cand.filter(u => u.visible);
      const hid = cand.filter(u => !u.visible);
      // (i) BACKGROUND: a still under a tiled run of clips above it, carrying no sound
      vis.forEach(s => {
        const spanned = vis.filter(o => o !== s && o.start >= s.start - eps && o.end <= s.end + eps).sort((a, b) => a.start - b.start);
        if (spanned.length < 2) return;
        if (!spanned.every(o => o.z < s.z)) return;                      // (a) every spanned clip is above it
        for (let i = 1; i < spanned.length; i++) if (spanned[i].start - spanned[i - 1].end > eps) return;   // (b) they tile
        if (hasSound(s.l)) return;                                       // (c) no sound
        background.add(s.id);
      });
      vis = vis.filter(u => !background.has(u.id));
      // (ii) IMPORT STACKS: 2+ with one pick, or 3+ unstamped, starting together, full-frame, normal, opaque, unkeyed
      const stackMember = new Set();
      const plain = vis.filter(u => !seeThrough(u.l) && !FM.animatedProps(u.l).length);
      const groups = [];
      plain.slice().sort((a, b) => a.start - b.start).forEach(u => {
        const g = groups.length ? groups[groups.length - 1] : null;
        if (g && Math.abs(u.start - g[0].start) <= eps) g.push(u); else groups.push([u]);
      });
      groups.forEach(g => {
        if (g.length < 2) return;
        const picks = new Set(g.map(u => u.l.pick && u.l.pick.b).filter(Boolean));
        const onePick = picks.size === 1 && g.every(u => u.l.pick && u.l.pick.b);
        if (onePick || g.length >= 3) g.forEach(u => stackMember.add(u.id));
      });
      // (iii) STACKED TAKE: a candidate fully covered by a HIGHER full-frame one — top wins, unless the top is see-through
      const drop = new Set();
      vis.forEach(lo => {
        if (stackMember.has(lo.id)) return;
        vis.forEach(up => {
          if (up === lo || stackMember.has(up.id) || up.z >= lo.z) return;
          if (!(up.start <= lo.start + eps && up.end >= lo.end - eps)) return;
          if (seeThrough(up.l)) drop.add(up.id); else drop.add(lo.id);
        });
      });
      // (iv) GREEDY, bottom of the stack first; hand crossfades up to half the shorter clip
      const taken = [];
      vis.filter(u => stackMember.has(u.id)).forEach(u => taken.push(u));
      vis.filter(u => !drop.has(u.id) && !stackMember.has(u.id)).sort((a, b) => b.z - a.z).forEach(u => {
        const hits = taken.filter(t => overlap(t, u) > eps);
        if (hits.length > 1) return;
        if (hits.length === 1) {
          const t = hits[0], a = t.start <= u.start ? t : u, b = a === t ? u : t;
          const lim = isBlend(a, b) ? blendMax(a, b) : Math.min(1, 0.5 * Math.min(t.end - t.start, u.end - u.start));
          if (overlap(t, u) > lim) return;
        }
        taken.push(u);
      });
      // (v) PASS B: a hidden clip in a seam is still on the track; a hidden take under a visible clip is not
      hid.forEach(u => { if (!taken.some(t => overlap(t, u) > eps)) taken.push(u); });
      mainUnits = taken;
      const stackIds = Array.from(stackMember);
      if (stackIds.length) anomalies.push({ kind: 'importStack', ids: stackIds });
    }
    const pickI = u => (u.l.pick && Number.isInteger(u.l.pick.i)) ? u.l.pick.i : null;
    mainUnits.sort((a, b) => (a.start - b.start) || ((pickI(a) != null && pickI(b) != null) ? pickI(a) - pickI(b) : 0) || (b.z - a.z) || (a.id < b.id ? -1 : a.id > b.id ? 1 : 0));
    const mainSet = new Set(mainUnits.map(u => u.id));

    // ── 5. SEAMS and SLOTS (§3.1) ──
    const slotCand = units.filter(u => !mainSet.has(u.id) && kinds.get(u.id) !== 'audio' && kinds.get(u.id) !== 'fullOnly' &&
                                       kinds.get(u.id) !== 'captions' && kinds.get(u.id) !== 'background' && !background.has(u.id) &&
                                       !(u.l.sm && u.l.sm.stay));
    const stretchMembers = (a, b) => slotCand.filter(u => u.start >= a - eps && u.start < b - eps);
    const coveredBy = (a, b) => units.some(u => background.has(u.id) && u.start <= a + eps && u.end >= b - eps);
    const main = [];
    let prev = null;
    mainUnits.forEach((u, i) => {
      let seam;
      if (!prev) {
        if (u.start > eps) {
          const mem = stretchMembers(0, u.start);
          if (mem.length) { main.push({ id: 'slot:' + mem[0].id, slot: true, start: 0, end: u.start, members: mem.map(m => m.id), seam: { kind: 'join', amt: 0 } }); seam = { kind: 'join', amt: 0 }; }
          else seam = { kind: 'gap', amt: u.start, covered: coveredBy(0, u.start) };
        } else if (u.start < -eps) { seam = { kind: 'join', amt: 0 }; anomalies.push({ kind: 'negativeStart', ids: [u.id], amt: -u.start }); }
        else seam = { kind: 'join', amt: 0 };
      } else {
        const diff = prev.end - u.start;
        if (diff >= -1e-9 && diff <= eps) seam = { kind: 'join', amt: 0 };
        else if (diff < -1e-9 && diff >= -eps) { seam = { kind: 'hairline', amt: -diff }; anomalies.push({ kind: 'hairline', ids: [prev.id, u.id], amt: -diff }); }
        else if (diff < -eps) {
          const mem = stretchMembers(prev.end, u.start);
          if (mem.length) { main.push({ id: 'slot:' + mem[0].id, slot: true, start: prev.end, end: u.start, members: mem.map(m => m.id), seam: { kind: 'join', amt: 0 } }); seam = { kind: 'join', amt: 0 }; }
          else { seam = { kind: 'gap', amt: -diff, covered: coveredBy(prev.end, u.start) }; if (!seam.covered) anomalies.push({ kind: 'gap', ids: [prev.id, u.id], amt: -diff }); }
        } else if (diff <= blendMax(prev, u) && isBlend(prev, u)) seam = { kind: 'blend', amt: diff };
        else { seam = { kind: 'overlap', amt: diff }; anomalies.push({ kind: 'overlap', ids: [prev.id, u.id], amt: diff }); }
      }
      main.push({ id: u.id, start: u.start, end: u.end, seam: seam });
      prev = u;
    });
    const clipsOnly = main.filter(e => !e.slot);
    const trackEnd = clipsOnly.length ? clipsOnly[clipsOnly.length - 1].end : 0;
    const index = new Map(clipsOnly.map((e, i) => [e.id, i]));

    // ── 6. HOSTS: the start rule, the sound rule and "long things stay" (§4.1). The LINK rule is Phase 2. ──
    const starts = main.map(e => e.start);
    function mainAt(t) {   // start − eps ≤ t < end − eps, over clips AND slot entries; exactly on a cut → the clip after
      let lo = 0, hi = main.length - 1, hit = -1;
      while (lo <= hi) { const m = (lo + hi) >> 1; if (starts[m] - eps <= t) { hit = m; lo = m + 1; } else hi = m - 1; }
      for (let i = hit; i >= 0 && i >= hit - 2; i--) { const e = main[i]; if (e.start - eps <= t && t < e.end - eps) return { e: e, i: i }; }
      return null;
    }
    function isLong(u, i) {
      if (!clipsOnly.length) return false;
      const whole = u.start <= clipsOnly[0].start + eps && u.end >= trackEnd - eps;
      const pastNext = i + 1 < main.length && u.end > main[i + 1].end + eps;
      return whole || pastNext;
    }
    const slotOf = new Map();
    main.forEach(e => { if (e.slot) e.members.forEach(id => slotOf.set(id, e.id)); });
    const R = {
      rev: 0, adopted: adopted, eps: eps, main: main, trackEnd: trackEnd, index: index, units: {}, followers: {},
      tail: [], riders: [], fullOnly: [], anomalies: anomalies,
      lanes: { captions: [], text: [], overlay: [], behind: [], audio: [] },
      isMain: id => mainSet.has(id)
    };
    main.forEach(e => { R.followers[e.id] = []; });
    units.forEach(u => {
      const k = mainSet.has(u.id) ? 'main' : (background.has(u.id) ? 'background' : kinds.get(u.id));
      const rec = { kind: k, media: states.get(u.id), host: null, side: 'none', pro: 'none', long: false, section: null, hidden: !u.visible };
      if (k === 'main') rec.section = 'main';
      else if (k === 'fullOnly') R.fullOnly.push(u.id);
      else {
        const stay = !!(u.l.sm && (u.l.sm.stay || u.l.sm.main));
        if (slotOf.has(u.id)) rec.host = slotOf.get(u.id);
        else if (!stay && k !== 'undecided' && k !== 'background') {
          const hit = mainAt(u.start);
          if (k === 'captions') {
            // a track inside one clip follows it; a spanning track RIDES the time map (§3.5)
            if (hit && !hit.e.slot && u.end <= hit.e.end + eps) rec.host = hit.e.id; else R.riders.push(u.id);
          } else if (hit) {
            const soundRuns = k === 'audio' && !(u.l.sm && u.l.sm.twin) && u.end > hit.e.end + 1.0;   // the one sound rule
            rec.long = soundRuns || (!hit.e.slot && isLong(u, hit.i));
            if (!rec.long) rec.host = hit.e.id;
          } else if (u.start >= trackEnd - eps && clipsOnly.length) R.tail.push(u.id);
        }
        if (rec.host && R.followers[rec.host]) R.followers[rec.host].push(u.id);
        // side: z against the main clips it overlaps (index 0 = the TOP of the stack)
        const over = clipsOnly.filter(e => Math.min(e.end, u.end) - Math.max(e.start, u.start) > eps);
        if (over.length) {
          const zs = over.map(e => byUid.get(e.id).z);
          rec.side = zs.every(zz => u.z > zz) ? 'behind' : (zs.every(zz => u.z < zz) ? 'front' : 'mixed');
        }
        rec.section = k === 'captions' ? 'captions' : k === 'text' ? 'text' : k === 'audio' ? 'audio'
          : k === 'background' ? 'behind' : k === 'undecided' ? 'main'
          : (rec.side === 'behind' ? 'behind' : 'overlay');   // overlay, effect and block: Behind when under every clip it meets
      }
      // what Simple cannot edit renders as it is, with a ✦ (§9.1)
      if (k === 'block') rec.pro = 'block';
      else if (FM.animatedProps && FM.animatedProps(u.l).length) rec.pro = 'look';
      else if ((u.l.behaviors || []).some(b => b && b.enabled !== false)) rec.pro = 'look';
      if (states.get(u.id) === 'missing' && isMedia(u.l)) anomalies.push({ kind: 'missing', ids: [u.id] });
      if (k === 'undecided') anomalies.push({ kind: 'undecided', ids: [u.id] });
      R.units[u.id] = rec;
    });

    // ── 11. LANES (§8.6): packed at read time, never stored; sound puts the longest first so a whole-video song wins ──
    Object.keys(R.lanes).forEach(sec => {
      const items = units.filter(u => R.units[u.id].section === sec && sec !== 'main');
      items.sort(sec === 'audio' ? ((a, b) => (b.end - b.start) - (a.end - a.start) || a.start - b.start) : ((a, b) => a.start - b.start || a.z - b.z));
      const lanes = [];
      items.forEach(u => {
        let placed = false;
        for (let i = 0; i < lanes.length && !placed; i++) {
          if (lanes[i].every(o => o.end <= u.start + eps || o.start >= u.end - eps)) { lanes[i].push(u); placed = true; }
        }
        if (!placed) lanes.push([u]);
      });
      R.lanes[sec] = lanes.map(ls => ls.map(u => u.id));
    });
    R.undecidedIds = units.filter(u => kinds.get(u.id) === 'undecided').map(u => u.id);
    return R;
  };

  /* Phase 1 has no cache (header): the timeline calls this once per rebuild. */
  S.read = function (scene) { return S.classify(scene || FM.scene); };
})(window.FM);
```

### 4.4 Re-measure `SCHEMA_FP` on the tree you ship

`4276424858841693` was measured on the 29 Sep scratch copy (v17.13 + 1.1 + 1.2, `SCHEMA_REV 3`) and is **stale**: batches 1-5 of
#482 added effect and audio parameters and moved the revision to 6. There is no value for v17.21 + 1.2; measure it. It hashes the sanitiser's output on a
fixture, **every registered effect's parameter definitions**, the op grammar and the derived writers, so an effect added or
changed before 1.2 ships gives a different number. Run the gate alone and paste the number its failure prints (never the
other way round):

```bash
python3 tests/_cdp.py --url 'http://localhost:8777/tests/run.html?only=921%20S1%20the%20schema%20fingerprint%20gate'
```

### 4.5 Tests

```js
  /* ═══ SIMPLE MODE, PHASE 1 STEP 1.2 — THE ENGINE (invisible): sanitiser, copy routes, schema, FM.spine.classify ═══ */

  /* A tiny project builder for the classifier. Every clip gets a real media record (native size), removed afterwards. */
  function smRig(W, H) {
    var made = [];
    var rig = {
      clip: function (id, start, dur, o) {
        o = o || {};
        var L = FM.makeLayer(o.type || 'video', { name: o.name || id, x: o.x != null ? o.x : W / 2, y: o.y != null ? o.y : H / 2, start: start, duration: dur, scale: o.scale != null ? o.scale : 1 });
        L.id = id;
        if (o.visible === false) L.visible = false;
        if (o.opacity != null) L.transform.opacity = o.opacity;
        if (o.muted) L.muted = true;
        if (o.pick) L.pick = o.pick;
        if (o.blend) L.blendMode = o.blend;
        if (o.audioOnly) L.audioOnly = true;
        if (o.nw !== 0) { FM.media.set(id, { kind: o.type === 'image' ? 'image' : 'video', width: o.nw || W, height: o.nh || H, duration: dur, hasAudio: o.silent ? false : undefined }); made.push(id); }
        return L;
      },
      text: function (id, start, dur, words) { var T = FM.makeLayer('text', { text: words || 'Hello', x: W / 2, y: H / 2, start: start, duration: dur }); T.id = id; return T; },
      scene: function (layers) { return scene(layers, { project: { width: W, height: H, fps: 30, duration: 0, background: '#000000' } }); },
      done: function () { made.forEach(function (id) { FM.media.remove(id); }); }
    };
    return rig;
  }
  function smMain(R) { return R.main.map(function (e) { return e.id; }).join(','); }
  function smNeedSpine() { if (!FM.spine || !FM.spine.classify) throw new Error('FM.spine.classify is missing — js/spine.js did not load'); return FM.spine; }

  test('simple P1 · T7 sanitiser: layer.sm and project.sm come out canonical, keep plain unknown keys, and a second pass changes nothing', { item: '980' }, function () {
    var mk = function (sm, extra) { return Object.assign({ id: 'smz', type: 'video', start: 0, duration: 2, transform: { x: 0, y: 0, scale: 1, rotation: 0, opacity: 1 }, effects: [], sm: sm }, extra || {}); };
    var run = function (l) { FM.storage._sanitizeLayers([l]); return l; };
    var a = run(mk({ main: 'yes', stay: true, row: 2, future: { a: 1 }, _secret: 1, junk: function () {} }));
    if (!a.sm || a.sm.main !== undefined) throw new Error('sm.main:"yes" survived the sanitiser: ' + JSON.stringify(a.sm));
    if (a.sm.stay !== true || a.sm.row !== 2 || !a.sm.future || a.sm.future.a !== 1) throw new Error('a valid flag or a plain unknown sub-key was dropped (whitelist drift): ' + JSON.stringify(a.sm));
    if ('_secret' in a.sm || 'junk' in a.sm) throw new Error('an underscore key or a function survived: ' + JSON.stringify(Object.keys(a.sm)));
    var once = JSON.stringify(a); run(a);
    if (JSON.stringify(a) !== once) throw new Error('a second pass changed a canonical layer: ' + once + ' → ' + JSON.stringify(a));
    var b = run(mk({ main: true, stay: true, tail: true }));
    if (JSON.stringify(b.sm) !== '{"main":true}') throw new Error('main must win over stay and tail: ' + JSON.stringify(b.sm));
    var c = run(mk({ tail: true }));
    if (!(c.sm && c.sm.tail === true && c.sm.stay === true)) throw new Error('tail must imply stay: ' + JSON.stringify(c.sm));
    var d = run(mk({ main: true }, { audioOnly: true }));
    if (d.sm) throw new Error('sm.main survived on an audio-only layer: ' + JSON.stringify(d.sm));
    var e = run(mk({ main: true }, { type: 'text', captions: [] }));
    if (e.sm) throw new Error('sm.main survived on a caption track');
    var f = run(mk({ main: true }, { srcW: 1920, srcH: -4, srcRev: 1.5, pick: { b: 'pk1', i: 2, x: 9 } }));
    if (f.srcW !== 1920 || 'srcH' in f || 'srcRev' in f) throw new Error('srcW/srcH/srcRev not sanitised: ' + JSON.stringify([f.srcW, f.srcH, f.srcRev]));
    if (JSON.stringify(f.pick) !== '{"b":"pk1","i":2}') throw new Error('pick not canonical: ' + JSON.stringify(f.pick));
    var g = run(mk('not an object'));
    if ('sm' in g) throw new Error('a non-object sm survived');
    /* THE ORDINARY LOAD PATH runs sanitizeEffects + sanitizeUnsafeValues (js/storage.js load), not _sanitizeLayers. */
    var h = mk({ main: 'x', row: 3 });
    FM.storage_sanitizeUnsafeValues(h);
    if (JSON.stringify(h.sm) !== '{"row":3}') throw new Error('the load path did not sanitise sm: ' + JSON.stringify(h.sm));
    /* An effect instance keeps its Simple-made marker only as exactly 1. */
    var fxl = mk(undefined, { effects: [{ type: 'blur', enabled: true, sm: 1, params: { radius: 2 } }, { type: 'blur', enabled: true, sm: 'x', params: { radius: 2 } }] });
    delete fxl.sm; run(fxl);
    if (fxl.effects[0].sm !== 1) throw new Error('an effect instance lost its sm:1 marker (the Simple-made flag would turn Full-made on the next undo)');
    if ('sm' in fxl.effects[1]) throw new Error('an effect instance kept sm:"x"');
    /* project.sm: home keeps any string ≤ 32, a non-string home goes, v is clamped (never to SM_V), junk is dropped. */
    var P = { width: 320, height: 240, fps: 30, duration: 4, sm: { v: 99999, home: 'x', adopted: 'yes', mrev: 3, later: { a: [1] } } };
    FM.storage._clampProjectDims(P);
    if (JSON.stringify(P.sm) !== '{"v":1000,"home":"x","mrev":3,"later":{"a":[1]}}') throw new Error('project.sm not canonical: ' + JSON.stringify(P.sm));
    var P2 = { width: 320, height: 240, fps: 30, duration: 4, sm: { home: 5 } };
    FM.storage._clampProjectDims(P2);
    if ('sm' in P2) throw new Error('project.sm with only a numeric home should be dropped whole: ' + JSON.stringify(P2.sm));
    /* CONTROL: a layer with no sm and no helper fields comes out byte-identical — the sanitiser adds nothing. */
    var n = mk(undefined); delete n.sm; var n0 = JSON.stringify(n); run(n);
    if (JSON.stringify(n) !== n0) throw new Error('CONTROL: a layer with no Simple keys was changed by the sanitiser');
  });

  test('simple P1 · T6 copy routes: duplicate, paste and the Assistant clone never make a second main clip or a second end watermark', { item: '980' }, async function () {
    var fx = importFixture();
    try {
      var A = FM.makeLayer('shape', { shape: 'rect', x: 50, y: 50, shapeW: 20, shapeH: 20, fill: '#fff' });
      A.id = 'sm6_main'; A.start = 0; A.duration = 2; A.sm = { main: true, row: 2 }; A.pick = { b: 'pk9', i: 0 };
      var S = FM.makeLayer('shape', { shape: 'rect', x: 50, y: 50, shapeW: 20, shapeH: 20, fill: '#0f0' });
      S.id = 'sm6_mark'; S.start = 0; S.duration = 9; S.sm = { stay: true, tail: true, tailEnd: 9 };
      FM.scene.layers.push(A, S); FM.scene.project.duration = 9;
      var before = new Set(FM.scene.layers.map(function (l) { return l.id; }));
      var fresh = function () { return FM.scene.layers.filter(function (l) { return !before.has(l.id); }); };
      var check = function (route, copy, want) {
        var got = copy.sm ? JSON.stringify(copy.sm) : 'none';
        if (got !== want) throw new Error(route + ': the copy carries sm ' + got + ', want ' + want + ' — a copy of a main clip must not be a second main clip');
        if ('pick' in copy) throw new Error(route + ': the copy kept the pick stamp — it was not in that pick');
      };
      await FM.duplicateLayer(A.id);            check('duplicate', fresh()[0], '{"row":2}'); fresh().forEach(function (l) { before.add(l.id); });
      await FM.duplicateLayer(A.id, true);      check('duplicate in place', fresh()[0], '{"row":2}'); fresh().forEach(function (l) { before.add(l.id); });
      await FM.duplicateLayer(S.id);            check('duplicate of the end watermark', fresh()[0], '{"stay":true}'); fresh().forEach(function (l) { before.add(l.id); });
      FM.scene.selectedIds = [A.id]; FM.scene.selectedId = A.id;
      FM.copySelection(); await FM.pasteClipboard();
      check('paste', fresh()[0], '{"row":2}'); fresh().forEach(function (l) { before.add(l.id); });
      var r = FM.aiOps.applyOps([{ op: 'duplicateLayer', ref: A.id }]);
      var ai = fresh()[0];
      if (!ai) throw new Error('the Assistant duplicate made no copy: ' + JSON.stringify(r && r.dropped));
      check('Assistant clone', ai, '{"row":2}');
      /* CONTROL: the ORIGINALS keep every byte — the strip is on the copy only. */
      if (JSON.stringify(A.sm) !== '{"main":true,"row":2}' || !A.pick) throw new Error('CONTROL: the original main clip lost its flags: ' + JSON.stringify(A.sm));
      if (JSON.stringify(S.sm) !== '{"stay":true,"tail":true,"tailEnd":9}') throw new Error('CONTROL: the original watermark lost its flags');
    } finally { fx.restore(); }
  });

  test('simple P1 · T1 classifier: a plain track, a picture-in-picture, native-size fitting, gaps, overlaps and a crossfade', { item: '980' }, function () {
    var SP = smNeedSpine(), g = smRig(1920, 1080);
    try {
      /* plain track + PiP + a 4K clip at 0.5 + a landscape clip letterboxed in 9:16 (in its own project) */
      var c1 = g.clip('c1', 0, 4), c2 = g.clip('c2', 4, 3, { nw: 3840, nh: 2160, scale: 0.5 }), c3 = g.clip('c3', 7, 5);
      var pip = g.clip('pip', 5, 1.5, { scale: 0.4, x: 1500, y: 300 });
      var R = SP.classify(g.scene([pip, c3, c2, c1]));
      if (smMain(R) !== 'c1,c2,c3') throw new Error('main should be c1,c2,c3 (a 4K clip at scale 0.5 fills a 1080p frame), got ' + smMain(R));
      if (R.units.pip.kind !== 'overlay' || R.units.pip.host !== 'c2') throw new Error('the picture-in-picture should be an overlay following c2: ' + JSON.stringify(R.units.pip));
      if (R.main.some(function (e) { return e.seam.kind !== 'join'; })) throw new Error('end-to-end clips should all be joins: ' + JSON.stringify(R.main.map(function (e) { return e.seam; })));
      if (Math.abs(R.trackEnd - 12) > 1e-9) throw new Error('trackEnd ' + R.trackEnd + ', want 12');
      var g9 = smRig(1080, 1920);
      try {
        var land = g9.clip('land', 0, 4, { nw: 1920, nh: 1080, scale: 0.5625 });
        var R9 = SP.classify(g9.scene([land]));
        if (smMain(R9) !== 'land') throw new Error('a landscape clip fitted to a 9:16 frame (scale 0.5625) should be main, got ' + smMain(R9));
      } finally { g9.done(); }
      /* a gap, an overlap and a hand-made crossfade (opacity keys on the upper clip inside the overlap) */
      var a = g.clip('ga', 0, 4), b = g.clip('gb', 5.5, 4), c = g.clip('gc', 9, 4), d = g.clip('gd', 12, 4);
      d.transform.opacity = { kf: [{ t: 12, v: 0, e: 'linear' }, { t: 13, v: 1, e: 'linear' }] };
      var R2 = SP.classify(g.scene([d, c, b, a]));
      var seams = R2.main.map(function (e) { return e.id + ':' + e.seam.kind; }).join(' ');
      if (seams !== 'ga:join gb:gap gc:overlap gd:blend') throw new Error('seams wrong: ' + seams + ' (want ga:join gb:gap gc:overlap gd:blend)');
      if (Math.abs(R2.main[1].seam.amt - 1.5) > 1e-9) throw new Error('the gap should measure 1.5 s: ' + R2.main[1].seam.amt);
      if (!R2.anomalies.some(function (x) { return x.kind === 'gap'; }) || !R2.anomalies.some(function (x) { return x.kind === 'overlap'; })) throw new Error('the gap and the overlap are not listed as anomalies');
      if (R2.anomalies.some(function (x) { return x.kind === 'overlap' && x.ids.indexOf('gd') >= 0; })) throw new Error('a crossfade was listed as an overlap — it must show no chip');
    } finally { g.done(); }
  });

  test('simple P1 · T1 classifier: stacked takes, a background still, an A-roll with cutaways and an import stack', { item: '980' }, function () {
    var SP = smNeedSpine(), g = smRig(1920, 1080);
    try {
      /* a take stacked over an older take: top wins — unless the top is see-through, then the bottom stays main */
      var lo = g.clip('lo', 0, 5), up = g.clip('up', 0, 5);
      var R = SP.classify(g.scene([up, lo]));
      if (smMain(R) !== 'up') throw new Error('a stacked take: the top should win, got ' + smMain(R));
      up.transform.opacity = 0.5;
      R = SP.classify(g.scene([up, lo]));
      if (smMain(R) !== 'lo' || R.units.up.kind !== 'overlay') throw new Error('a half-transparent take on top: the lower clip should stay main and the top be an overlay, got ' + smMain(R) + ' / ' + R.units.up.kind);
      /* a silent background still under five joined clips → a background; the five are main */
      var bg = g.clip('bg', 0, 10, { type: 'image' });
      var five = [0, 1, 2, 3, 4].map(function (i) { return g.clip('j' + i, i * 2, 2); });
      R = SP.classify(g.scene(five.slice().reverse().concat([bg])));
      if (smMain(R) !== 'j0,j1,j2,j3,j4' || R.units.bg.kind !== 'background') throw new Error('a background still: main ' + smMain(R) + ', bg ' + R.units.bg.kind);
      /* an A-roll WITH SOUND under separated cutaways → one main clip, the cutaways are overlays that follow it */
      var aroll = g.clip('aroll', 0, 60);
      var cuts = [5, 15, 25, 35, 45].map(function (t, i) { return g.clip('cut' + i, t, 3); });
      R = SP.classify(g.scene(cuts.concat([aroll])));
      if (smMain(R) !== 'aroll') throw new Error('an A-roll with cutaways: main should be the A-roll, got ' + smMain(R));
      if (cuts.some(function (k) { return R.units[k.id].kind !== 'overlay' || R.units[k.id].host !== 'aroll'; })) throw new Error('the cutaways should be overlays following the A-roll: ' + JSON.stringify(cuts.map(function (k) { return R.units[k.id]; })));
      /* an import stack: four clips of one pick at one start all go on the main track in pick order */
      var pk = [0, 1, 2, 3].map(function (i) { return g.clip('p' + i, 0, 3, { pick: { b: 'pkA', i: i } }); });
      R = SP.classify(g.scene(pk.slice().reverse()));
      if (smMain(R) !== 'p0,p1,p2,p3') throw new Error('an import stack of one pick should be four main clips in pick order, got ' + smMain(R));
      /* CONTROL: two UNSTAMPED clips at one start are still a stacked take — the top one wins */
      var u1 = g.clip('u1', 0, 3), u2 = g.clip('u2', 0, 3);
      R = SP.classify(g.scene([u2, u1]));
      if (smMain(R) !== 'u2') throw new Error('CONTROL: two unstamped clips at one start should be a stacked take (top wins), got ' + smMain(R));
    } finally { g.done(); }
  });

  test('simple P1 · T1 classifier: what follows which clip — on a cut, long things, the sound rule, captions, hidden clips, camera', { item: '980' }, function () {
    var SP = smNeedSpine(), g = smRig(1920, 1080);
    try {
      var c1 = g.clip('k1', 0, 5), c2 = g.clip('k2', 5, 5), c3 = g.clip('k3', 10, 5), c4 = g.clip('k4', 15, 5);
      var t1 = g.text('t_in', 1, 2), t2 = g.text('t_cut', 5, 2), tLong = g.text('t_long', 2, 12);
      var song = g.clip('song', 0, 8, { nw: 0, audioOnly: true });
      var whoosh = g.clip('whoosh', 4.6, 0.8, { nw: 0, audioOnly: true });
      var caps = g.text('caps', 0, 20); caps.captions = [{ start: 0, end: 2, text: 'a' }]; caps.text = '';
      var cam = FM.makeLayer('camera', { start: 0, duration: 20 }); cam.id = 'cam';
      var hid = g.clip('hid', 20, 3, { visible: false });
      var R = SP.classify(g.scene([t1, t2, tLong, caps, cam, whoosh, song, c4, c3, c2, c1, hid]));
      if (smMain(R) !== 'k1,k2,k3,k4,hid') throw new Error('main should be k1..k4 plus the hidden clip in the seam after them, got ' + smMain(R));
      if (!R.units.hid.hidden) throw new Error('the hidden main clip should be marked hidden (drawn dimmed)');
      if (R.units.t_in.host !== 'k1') throw new Error('a title inside clip 1 should follow clip 1: ' + R.units.t_in.host);
      if (R.units.t_cut.host !== 'k2') throw new Error('a title starting exactly on the cut should follow the clip AFTER it: ' + R.units.t_cut.host);
      if (R.units.t_long.host !== null) throw new Error('a title over three clips is long and stays put: ' + R.units.t_long.host);
      if (R.units.song.kind !== 'audio' || R.units.song.host !== null) throw new Error('a song running on past its clip stays put: ' + JSON.stringify(R.units.song));
      if (R.units.whoosh.host !== 'k1') throw new Error('a 0.8 s whoosh starting 0.4 s before a cut follows the clip it starts on: ' + R.units.whoosh.host);
      if (R.riders.indexOf('caps') < 0 || R.units.caps.kind !== 'captions') throw new Error('a caption track over the whole video rides the time map: ' + JSON.stringify(R.units.caps));
      if (R.units.cam.kind !== 'fullOnly' || R.fullOnly.indexOf('cam') < 0) throw new Error('the camera is Full-only: ' + JSON.stringify(R.units.cam));
      if (R.followers.k1.indexOf('t_in') < 0 || R.followers.k1.indexOf('whoosh') < 0) throw new Error('followers of clip 1 wrong: ' + JSON.stringify(R.followers.k1));
      /* lanes: the two short titles share a lane, the long one needs its own */
      if (R.lanes.text.length !== 2) throw new Error('three titles (two back to back, one long) should pack into 2 lanes: ' + JSON.stringify(R.lanes.text));
      /* nothing but text and shapes → no main track at all; an empty project → nothing */
      var only = SP.classify(g.scene([g.text('lone', 0, 3)]));
      if (only.main.length || only.trackEnd !== 0) throw new Error('text only should have no main track');
      if (SP.classify(g.scene([])).main.length !== 0) throw new Error('an empty project has a main track');
    } finally { g.done(); }
  });

  test('simple P1 · T1 classifier: media still arriving is undecided, a missing clip with a known size is still a picture, and classify never reads FM.scene', { item: '980' }, function () {
    var SP = smNeedSpine(), g = smRig(1920, 1080);
    var hyd0 = FM.storage.hydrating;
    try {
      var known = g.clip('mk', 0, 4, { nw: 0 }); known.srcW = 1920; known.srcH = 1080; known.srcRev = 0;
      var blind = g.clip('mb', 4, 4, { nw: 0 });
      FM.storage.hydrating = function () { return true; };
      var R = SP.classify(g.scene([blind, known]));
      if (R.units.mb.kind !== 'undecided' || R.units.mb.media !== 'arriving') throw new Error('a clip with no record and no size while media is loading should be undecided/arriving: ' + JSON.stringify(R.units.mb));
      if (smMain(R) !== 'mk') throw new Error('a clip whose record has not landed but whose srcW/srcH are stored is a picture and main, got ' + smMain(R));
      /* a stale srcW (it describes an older mediaRev) is never trusted */
      known.mediaRev = 2;
      FM.storage.hydrating = function () { return false; };
      R = SP.classify(g.scene([known]));
      if (R.units.mk.media !== 'missing') throw new Error('with hydration over and no record the clip is missing: ' + R.units.mk.media);
      /* PURITY: classify reads its argument, never FM.scene (a pack is classified on its own list, §12.2) */
      var pure = g.scene([g.clip('pz1', 0, 3), g.clip('pz2', 3, 3), g.text('pzt', 1, 1)]);   // built BEFORE the probe: makeLayer reads FM.scene
      var real = FM.scene, touched = 0;
      Object.defineProperty(FM, 'scene', { configurable: true, get: function () { touched++; return real; }, set: function (v) { real = v; } });
      try { SP.classify(pure); }
      finally { delete FM.scene; FM.scene = real; }
      if (touched) throw new Error('classify read FM.scene ' + touched + ' time(s) — it must read only the scene it is given');
    } finally { FM.storage.hydrating = hyd0; g.done(); }
  });

  test('simple P1 · T1 classifier timing: 500 layers within budget, and 2,000 is not quadratic', { item: '980', budgetMs: 60000 }, function () {
    var SP = smNeedSpine(), g = smRig(1920, 1080);
    try {
      var build = function (n) {
        var ls = [];
        for (var i = 0; i < n; i++) {
          if (i % 10 === 0) ls.push(g.clip('tc' + n + '_' + i, i * 0.4, 4));   // a main-track candidate every tenth layer
          else { var t = g.text('tt' + n + '_' + i, i * 0.4, 1.2); ls.push(t); }
        }
        return g.scene(ls.reverse());
      };
      var s5 = build(500), s20 = build(2000);
      SP.classify(s5);                                   // warm
      var t0 = performance.now(); for (var k = 0; k < 3; k++) SP.classify(s5); var m5 = (performance.now() - t0) / 3;
      t0 = performance.now(); SP.classify(s20); var m20 = performance.now() - t0;
      if (m5 > 60) throw new Error('classify took ' + m5.toFixed(1) + ' ms for 500 layers (budget 60 ms in the suite frame; the phone target is §14.5)');
      if (m20 > Math.max(12 * m5, 40)) throw new Error('2,000 layers took ' + m20.toFixed(1) + ' ms against ' + m5.toFixed(1) + ' ms for 500 — growth is quadratic, not O(n log n)');
    } finally { g.done(); }
  });


  test('simple P1 · Simple’s + lays four picked photos end to end from the end of the clip row, one pick', { item: '980' }, async function () {
    const png = color => new Promise(res => { const c = offscreen(32, 32), x = c.getContext('2d'); x.fillStyle = color; x.fillRect(0, 0, 32, 32); c.toBlob(b => res(new File([b], color.slice(1) + '.png', { type: 'image/png' })), 'image/png'); });
    const files = await Promise.all(['#ff0000', '#00ff00', '#0000ff', '#ffff00'].map(png));
    const fx = importFixture({ project: { width: 320, height: 240, fps: 30, duration: 5, background: '#000000' } });
    const lib0 = FM.mediaLib && FM.mediaLib.add;
    try {
      const A = FM.makeLayer('shape', { shape: 'rect', x: 160, y: 120, shapeW: 320, shapeH: 240, fill: '#888' });
      A.start = 0; A.duration = 5; FM.scene.layers.push(A);
      FM.time = 1;   // the playhead is NOT at the end: Full would put all four at 1 s
      const add = FM.importFiles || FM._handleFiles;
      await add(files, { at: 5 });
      const got = FM.scene.layers.filter(l => l.type === 'image').sort((a, b) => a.start - b.start);
      if (got.length !== 4) throw new Error('expected four photos, got ' + got.length);
      const d = got[0].duration;
      const starts = got.map(l => +l.start.toFixed(6));
      const want = [5, 5 + d, 5 + 2 * d, 5 + 3 * d].map(x => +x.toFixed(6));
      if (starts.join() !== want.join()) throw new Error('the photos were not laid end to end from 5 s: ' + starts.join(', ') + ' (want ' + want.join(', ') + ')');
      const b = got[0].pick && got[0].pick.b;
      if (!b || got.some((l, i) => !l.pick || l.pick.b !== b || l.pick.i !== i)) throw new Error('the four are not stamped as one pick in order: ' + JSON.stringify(got.map(l => l.pick)));
      if (got.some(l => !(l.srcW === 32 && l.srcH === 32 && l.srcRev === 0))) throw new Error('native size not written at add: ' + JSON.stringify(got.map(l => [l.srcW, l.srcH, l.srcRev])));
      /* CONTROL: without `at` nothing about placement changes — a single photo lands at the playhead, unstamped */
      FM.time = 2;
      await add([files[0]]);
      const one = FM.scene.layers.filter(l => l.type === 'image' && got.indexOf(l) < 0)[0];
      if (!one || Math.abs(one.start - 2) > 1e-6 || one.pick) throw new Error('CONTROL: a plain import moved (' + (one && one.start) + ') or was stamped');
    } finally { if (FM.mediaLib) FM.mediaLib.add = lib0; fx.restore(); }
  });

  test('simple P1 · T20 no company name in any word the Simple editor shows, and the scan catches one', { item: '980' }, function () {
    const BRANDS = /\b(Apple|Alight ?Motion|After ?Effects|Adobe|Premiere|Final ?Cut|CapCut|Instagram|TikTok|DaVinci|Resolve|iMovie|LumaFusion)\b/i;
    const scan = function (o, path, out) {
      if (typeof o === 'string') { if (BRANDS.test(o)) out.push(path + ': "' + o + '"'); return out; }
      if (typeof o === 'function') { try { scan(String(o.length >= 4 ? o(2, 5, 3.2, 2) : o.length === 1 ? o(1.5) : o(4, 15)), path + '()', out); } catch (e) {} return out; }
      if (o && typeof o === 'object') Object.keys(o).forEach(k => scan(o[k], path + '.' + k, out));
      return out;
    };
    if (!FM.spineWords) throw new Error('FM.spineWords is missing — js/spine-words.js did not load');
    const hits = scan(FM.spineWords, 'spineWords', []);
    if (hits.length) throw new Error('another company’s name is in Simple’s words: ' + hits.join(' · '));
    const n = scan({ a: 'Lay them out like CapCut' }, 'control', []);
    if (n.length !== 1) throw new Error('CONTROL: the scan did not catch a planted brand name');
    const ids = ['btn-sm-split', 'sm-timeline', 'sm-say', 'cv-editor'];   // 1 Oct: the switch is the cog's (#cv-editor, built when the cog opens)
    const dom = ids.map(id => document.getElementById(id)).filter(Boolean).map(e => e.textContent + ' ' + (e.getAttribute('aria-label') || '') + ' ' + (e.title || '')).join(' ');
    if (BRANDS.test(dom)) throw new Error('a company name is in the Simple editor’s controls: ' + dom.match(BRANDS)[0]);
  });


  test('simple P1 · the collab fingerprint carries the sm rules — its fixture holds sm keys that come out canonical, and SM_V moves it', { item: '980' }, function () {
    const C = FM.collab;
    if (!C || typeof C.schemaFingerprint !== 'function' || typeof C.SCHEMA_FIXTURE !== 'function') throw new Error('setup: FM.collab.schemaFingerprint is not loaded');
    const L = C.SCHEMA_FIXTURE();
    FM.storage._sanitizeLayers(L);
    const sm = L[0] && L[0].sm;
    if (JSON.stringify(sm) !== '{"stay":true,"row":2,"future":{"a":1}}') throw new Error('the fingerprint fixture carries sm ' + (sm === undefined ? 'nothing at all' : JSON.stringify(sm)) + ' after sanitising (want {"stay":true,"row":2,"future":{"a":1}}) — two builds that read sm differently would hash the same');
    const got = C.schemaFingerprint();
    if (got === null) throw new Error('setup: the fingerprint could not be computed');
    const v0 = FM.SM_V;
    let moved;
    try { FM.SM_V = (v0 || 0) + 1; moved = C.schemaFingerprint(); } finally { if (v0 === undefined) delete FM.SM_V; else FM.SM_V = v0; }
    if (C.schemaFingerprint() !== got) throw new Error('CONTROL: the fingerprint did not come back after SM_V was restored');
    if (moved === got) throw new Error('a build with a different SM_V has the same fingerprint — SM_V must only change with SCHEMA_REV, and the gate cannot tell');
  });
```

**Existing tests 1.2 could break:** `921 S1 the schema fingerprint gate` until `SCHEMA_FP` is re-pinned (that is its job);
a test that compares a freshly added media layer's JSON with a fixed shape (it now carries `srcW`, `srcH` and `srcRev`); a test asserting a pasted or duplicated layer equals its source minus the id (a copy
now drops `pick`). §8 has what the whole suite said.

---

## 5. Step 1.3: the view he holds

**POLISH-LOG line (template):** `- vX.YY — queue 980 (partial) — the Simple editor, as a preview: the ⚙ cog has a third
block, Editor — a Simple ⇄ Full switch and "What should you use?", which opens it big like Canvas settings and Friends. The
switch shows any project as clips — the clip row, text and overlays above it, sound below it, a chip wherever clips don't
meet — without changing the project, and asks first if switching would lose an unapplied crop, touch-up or drawing.
Full is unchanged. Tap anything to edit it in the usual
panels. Splitting, deleting and closing gaps say "comes in the next update · Open in Full". The + at the end of the clips
lays new files end to end. (A friend's pointer is not drawn in Simple yet.)`

**D's used:** D1 A, D16 rows 1 and 5 A, D18 A, D22 A, D23 A (D2 is settled: the cog). **Behind the switch:** everything in
Simple; the cog block itself is visible in Full (under D22 B, only once the Settings row is on).

### 5.1 What he sees and holds (phone at 380 px; the PC has the same pieces)

- **In Full:** today's app exactly, plus the ⚙ cog's third block: small, it is the **Simple ⇄ Full** switch and **What should
  you use?**; Canvas settings and Friends sit where they sit today (DESIGN §0.4 gives the one measured cost on short phones).
  One tap on the switch, and the cog closes onto Simple.
- **In Simple:** the play bar's left group reads **⋯ · ✂ · (gap) · |◀** (D18 A: no switch on it), ✂ dimmed. Under it, fixed rows: the ruler, the
  sections box (captions, text, overlays, Behind lowest; higher on screen = in front), the **clip row** (56 px filmstrips),
  the **sound** row, and the 52 px **`#sm-say`** row where Simple speaks, blank when idle. The picture is a little smaller
  than in Full on a small phone (the stage clamp keeps room for a panel; 180 px tall at 380×667). Every clip sits at the same
  x it had in Full. Gaps and overlaps show a round chip on the cut (`1.2s`, `⚠ 0.4s`).
- **Tapping** selects and opens today's panel; on a phone it docks **under `#sm-say`**, so the clip row, the sound row and any
  line stay in view, and no row moves by a pixel.
- **Delete / Backspace on a main clip, ✂, A / S / D, ⌘D on a main clip, a seam chip:** one line in `#sm-say` with a real
  **Open in Full** button, nothing changed. Delete on anything that is not a main clip is today's delete.
- **`+` at the end of the clip row:** the picker; the files land end to end from the end of the main track.
- **After Simple → Full** (the cog, or Open in Full): plain Full; the cog's switch takes him back.

### 5.2 Changes to existing files

#### 1.3.1 ~~`index.html`: the Simple editor item in Full's ⋯ strip~~ — WITHDRAWN 1 Oct

It put a new item in Full's `#opt-bar` (DESIGN §0.4 V1). Full's ⋯ strip stays exactly as it is; FU1 checks it against HEAD.

#### 1.3.2 `index.html` (line 537 at the start of this step)

Find (exactly once):

```html
          <button id="btn-layermenu" class="tbtn" title="Layer actions">
```

Replace with:

```html
          <!-- Simple mode P1: ✂ in slot 2 of Simple's row, dimmed and inert until Phase 2 (D18 A: ⋯ · ✂ · (gap) · |◀); hidden in Full -->
          <button id="btn-sm-split" class="tbtn sm-only" type="button" aria-disabled="true" aria-label="Split at the line" title="Split at the line (S)"><svg viewBox="0 0 24 24" class="tco" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><circle cx="6" cy="6" r="3"/><circle cx="6" cy="18" r="3"/><line x1="20" y1="4" x2="8.5" y2="15.5"/><line x1="8.5" y1="8.5" x2="20" y2="20"/></svg></button>
          <button id="btn-layermenu" class="tbtn" title="Layer actions">
```

#### 1.3.3 ~~`index.html`: the play-bar ⇄ `#btn-editor`~~ — WITHDRAWN 1 Oct

The switch is the ⚙ cog's third block in both editors (1.3.18; DESIGN §6.1). No switch is added to the play bar, so slot 3
of Simple's row is ◐'s slot kept invisible (D18 A, §5.5).

#### 1.3.4 `index.html` (line 597 at the start of this step)

Find (exactly once):

```html
      <div id="timeline">
        <div id="tl-inner">
          <div id="tl-rulerrow"><div class="tl-headspace"></div><div id="tl-ruler"></div></div>
          <div id="tl-tracks"></div>
          <div id="tl-playhead"></div>
        </div>
      </div>
```

Replace with:

```html
      <div id="timeline">
        <div id="tl-inner">
          <div id="tl-rulerrow"><div class="tl-headspace"></div><div id="tl-ruler"></div></div>
          <div id="tl-tracks"></div>
          <div id="tl-playhead"></div>
        </div>
      </div>
      <!-- Simple mode P1 (DESIGN.md §8.1): the Simple editor's timeline, over #timeline (which stays laid out, hidden, so both
           views share one pxPerSec). Read-only in Phase 1. #sm-say is the one place Simple speaks (§3.12); #sm-live is for screen readers. -->
      <div id="sm-timeline" role="group" aria-label="Timeline">
        <div id="sm-scroll"><div id="sm-inner">
          <div id="sm-ruler" aria-hidden="true"></div>
          <div id="sm-sections"></div>
          <div id="sm-main"></div>
          <div id="sm-sound"></div>
        </div></div>
        <div id="sm-say" role="status" aria-live="polite"></div>
        <div id="sm-live" class="sm-vh" role="status" aria-live="polite"></div>
      </div>
```

#### 1.3.5 `index.html` (line 1088 at the start of this step)
> `?v=` numbers here are the tree's on 29 Sep. Match the tag by its path and keep the rule: the file this step changes gets +1 on whatever is there; a new file starts at `?v=1`.


Find (exactly once):

```html
  <script src="js/timeline.js?v=261"></script>
```

Replace with:

```html
  <script src="js/timeline.js?v=261"></script>
  <script src="js/simple-timeline.js?v=1"></script>   <!-- Simple mode P1: FM.simpleTimeline, read-only; after timeline.js -->
```

#### 1.3.6 `index.html` (line 1134 at the start of this step)
> `?v=` numbers here are the tree's on 29 Sep. Match the tag by its path and keep the rule: the file this step changes gets +1 on whatever is there; a new file starts at `?v=1`.


Find (exactly once):

```html
  <script src="js/app.js?v=467"></script>
```

Replace with:

```html
  <script src="js/editor-mode.js?v=1"></script>   <!-- Simple mode P1: FM.editor — the one door the cog uses, the guard, per-device memory; before app.js -->
  <script src="js/app.js?v=467"></script>
```

**1.3.7–1.3.9 are built only under D22 B** (a Settings row gating the cog block; DESIGN §0.4 V7). Under D22 A (recommended)
skip them: `js/settings.js` is not touched, and `GATED` stays `false` in `js/editor-mode.js`.

#### 1.3.7 `js/settings.js` (line 58 at the start of this step)

Find (exactly once):

```js
    collabLabs: false,
```

Replace with:

```js
    collabLabs: false,
    /* Simple mode P1, D22 B only (DESIGN.md §6.1): the Simple editor gate. OFF is a promise: with it off the cog has no
       Editor block and every project opens in Full. In the saved-keys whitelist below from day one — the #688 trap. */
    simpleEditor: false,
```

#### 1.3.8 `js/settings.js` (line 109 at the start of this step)

Find (exactly once):

```js
      ['demoMode', 'showTouches', 'systemFonts', 'homeLight', 'collabLabs', 'collabCursors', 'collabSelections', 'collabCodesOnly'].forEach(k => { if (typeof saved[k] === 'boolean') state[k] = saved[k]; });
```

Replace with:

```js
      ['demoMode', 'showTouches', 'systemFonts', 'homeLight', 'collabLabs', 'collabCursors', 'collabSelections', 'collabCodesOnly', 'simpleEditor'].forEach(k => { if (typeof saved[k] === 'boolean') state[k] = saved[k]; });
```

#### 1.3.9 `js/settings.js` (line 480 at the start of this step)

Find (exactly once):

```js
    if (FM.collab && FM.collab.ui) {
      const ui = FM.collab.ui;
      const me = ui.getProfile();
```

Replace with:

```js
    /* SIMPLE EDITOR PREVIEW (Simple mode P1, DESIGN.md §15.1, decided in §17): its own untitled group directly above Work
       with friends (D22 B only). The word "Labs" appears nowhere. Flipping it off goes through FM.editor.request (the guard:
       it asks before closing a tool that holds work, never discards) and puts the open project in Full (its card untouched). */
    if (FM.editor) {
      const sw = (FM.spineWords && FM.spineWords.settings) || {};
      const smg = group(toggleRow(sw.label || 'Simple editor', sw.hint || 'See any project as clips — an early look.', 'simpleEditor'));
      smg.id = 'set-simple';
      body.appendChild(smg);
    }

    if (FM.collab && FM.collab.ui) {
      const ui = FM.collab.ui;
      const me = ui.getProfile();
```

#### 1.3.10 `js/timeline.js` (line 5665 at the start of this step)

Find (exactly once):

```js
    rebuild() {
      if (!tracksEl) return;
```

Replace with:

```js
    rebuild() {
      if (!tracksEl) return;
      /* SIMPLE MODE P1 (DESIGN.md §8.1, §14.3): ONE DISPATCH, so the ~90 callers of rebuild() need no change. The project
         that just opened gets its own editor first; in Simple the derived writers still run exactly as below, and
         Simple draws instead of buildTracks. Full's rows are rebuilt when the switch comes back to Full. */
      if (FM.editor && FM.editor.syncProject) FM.editor.syncProject();
      if (FM.editor && FM.editor.isSimple && FM.editor.isSimple() && FM.simpleTimeline) {
        if (FM.syncAddSwitch) FM.syncAddSwitch();
        FM.timeline.inheritLoopModes();
        if (FM.autoFitDuration) FM.autoFitDuration();
        FM.simpleTimeline.rebuild();
        fireRebuilt();
        return;
      }
```

#### 1.3.11 `js/timeline.js` (line 5786 at the start of this step)

Find (exactly once):

```js
      const shown = !!n && view === 'home' && !inBrowser;
```

Replace with:

```js
      const shown = !!n && view === 'home' && !inBrowser && !(FM.editor && FM.editor.isSimple && FM.editor.isSimple());   // Simple mode P1: Simple has no A/S/D keycaps (✂ is inert until Phase 2)
```

#### 1.3.12 `js/timeline.js` (line 5822 at the start of this step)

Find (exactly once):

```js
    updatePlayhead() {
      if (!tracksEl) return;
      FM.timeline.syncKeyRail();   // queue 765 + 772: the rail on the seam replaced the two floating groups
```

Replace with:

```js
    updatePlayhead() {
      if (!tracksEl) return;
      FM.timeline.syncKeyRail();   // queue 765 + 772: the rail on the seam replaced the two floating groups
      if (FM.editor && FM.editor.isSimple && FM.editor.isSimple() && FM.simpleTimeline) { FM.simpleTimeline.updatePlayhead(); return; }   // Simple mode P1
```

#### 1.3.13 `js/timeline.js` (line 4813 at the start of this step)

Find (exactly once):

```js
    timeToX: function (t) { return HEAD_W + PAD + (t || 0) * pxPerSec(); },
```

Replace with:

```js
    timeToX: function (t) { return HEAD_W + PAD + (t || 0) * pxPerSec(); },
    /* Simple mode P1: the ONE time scale both timelines draw with (Full's #timeline stays laid out under Simple's), and
       whether a Full gesture is live (the editor switch refuses — shakes — rather than tear a drag out from under a finger). */
    pxPerSec: function () { return pxPerSec(); },
    gestureLive: function () { return !!(clipMove || trimDrag || kfDrag || slipDrag || cueDrag || reorderActive || headPan); },
```

#### 1.3.14 `js/app.js` (line 8850 at the start of this step)

Find (exactly once):

```js
      if (mod && (e.key === 'z' || e.key === 'Z')) {
        if (inEdit) return; // let field text-undo
```

Replace with:

```js
      /* SIMPLE MODE P1: in Simple, the arranging keys with no Simple command yet say so rather than do Full's thing to a
         main clip (DESIGN.md §15.1). In Full it answers NOTHING: there is no E key (DESIGN.md §0.4 B14). */
      if (!inEdit && FM.editor && FM.editor.onKey && FM.editor.onKey(e)) return;
      if (mod && (e.key === 'z' || e.key === 'Z')) {
        if (inEdit) return; // let field text-undo
```

#### 1.3.15 `js/app.js` (line 990 at the start of this step)

Find (exactly once):

```js
    document.body.classList.toggle('sel-multi', n >= 2);
    document.body.classList.toggle('sel-mode', selOwns);
    document.body.classList.toggle('m-editing', phone && n === 1 && !selOwns);
```

Replace with:

```js
    /* SIMPLE MODE P1 (DESIGN.md §8.2): Simple sets none of Full's three — its timeline never goes solo and the phone's top
       bar keeps the project name — and `sm-has-sel` instead, which hides ✎ by VISIBILITY (#171) so nothing slides. */
    const simple = !!(FM.editor && FM.editor.isSimple && FM.editor.isSimple());
    document.body.classList.toggle('sel-multi', !simple && n >= 2);
    document.body.classList.toggle('sel-mode', !simple && selOwns);
    document.body.classList.toggle('m-editing', !simple && phone && n === 1 && !selOwns);
    document.body.classList.toggle('sm-has-sel', simple && n >= 1);
```

#### 1.3.16 `js/app.js` (line 5472 at the start of this step)

Find (exactly once):

```js
  FM._handleFiles = function (files, opts) { return handleFiles(files, opts); };
```

Replace with:

```js
  FM._handleFiles = function (files, opts) { return handleFiles(files, opts); };
  FM.importFiles = function (files, opts) { return handleFiles(files, opts); };   // Simple mode P1: the + on Simple's clip row (opts.at)
```

#### 1.3.17 `js/mobile.js` (line 271 at the start of this step)

Find (exactly once):

```js
    function dockSheet() {
      if (!isPhone() || !document.body.classList.contains('m-editing')) { insp.style.top = ''; insp.style.maxHeight = ''; return; }
```

Replace with:

```js
    function dockSheet() {
      /* SIMPLE MODE P1 (§14.2): in Simple the sheet docks under #sm-say, the row below the Simple timeline, so the sections,
         the clips, the sound and any line stay in view above it (Full docks under its one solo row, which Simple never shows). */
      const smDock = !!(FM.editor && FM.editor.isSimple && FM.editor.isSimple() && FM.simpleTimeline && document.body.classList.contains('sm-has-sel') && (FM.selectionIds ? FM.selectionIds().length === 1 : true));
      if (isPhone() && smDock) {
        const b = FM.simpleTimeline.dockBottom();
        if (b > 0) { insp.style.top = Math.min(Math.round(b + 4), window.innerHeight - 120) + 'px'; insp.style.maxHeight = 'none'; return; }   // Simple's stage clamp leaves ≥ 200 px here on a screen ≥ 694 px tall; below that its 180 px floor wins (168 px at 380×667)
      }
      if (!isPhone() || !document.body.classList.contains('m-editing')) { insp.style.top = ''; insp.style.maxHeight = ''; return; }
```

#### 1.3.18 `js/app.js`: the ⚙ cog's third block (DESIGN §6.1; COG-DESIGN.md §2–§6, §9.2) — NEW 1 Oct, NOT RUN

This replaces the withdrawn 1.3.1 / 1.3.3 (Full's ⋯ item and the play-bar ⇄). The layout and the words were rendered in the
real app at v17.21 by a throwaway prototype injected through `tools/shot.py` (COG-DESIGN §12; pictures in
`tools/design/plans/simple-mode/cog/`); **this code was written from that prototype and from reading `js/app.js:8340-8630` at
v17.21, and has not been run.** Anchors are v17.21's; re-find each by its quoted text. Built with `createElement` and
`textContent` only; the two pictures and the icon are fixed SVG strings (no user data ever reaches `innerHTML`).

**(a) After** `const cvFrBar = document.getElementById('cv-fr-bar');` **add** the block, built only when `FM.editor.enabled()`
(always, under D22 A) and dropped when it is not:

```js
      /* THE THIRD BLOCK (Simple mode, his rule of 1 Oct: "the option to switch between the two editors should be in the settings
         cog, making a third section in there … stays small unless you want the explanation"). Small: one switch and a "What should
         you use?" button. Big: the explanation. Same pair rule: one block big, the others small (DESIGN.md §6.1). */
      let cvEd = null, cvEdBar = null, cvEdBody = null, cvEdSwitched = false;
      const cvEdOn = () => !!(FM.editor && FM.editor.enabled && FM.editor.enabled());
      const ED_ICON = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="5" width="18" height="14" rx="2"/><path d="M3 10h18M8 14h5M8 10v9"/></svg>';
      const ED_PIC = { simple: '<svg viewBox="0 0 64 34" aria-hidden="true"><rect x="1" y="13" width="19" height="11" rx="2" fill="currentColor" opacity=".9"/><rect x="22" y="13" width="14" height="11" rx="2" fill="currentColor" opacity=".9"/><rect x="38" y="13" width="25" height="11" rx="2" fill="currentColor" opacity=".9"/><rect x="5" y="4" width="22" height="6" rx="3" fill="currentColor" opacity=".45"/><rect x="1" y="27" width="62" height="5" rx="2.5" fill="currentColor" opacity=".3"/></svg>',
                       full: '<svg viewBox="0 0 64 34" aria-hidden="true"><rect x="16" y="1" width="30" height="6" rx="2" fill="currentColor" opacity=".55"/><rect x="4" y="9" width="24" height="6" rx="2" fill="currentColor" opacity=".9"/><rect x="26" y="17" width="34" height="6" rx="2" fill="currentColor" opacity=".9"/><rect x="10" y="25" width="40" height="6" rx="2" fill="currentColor" opacity=".7"/></svg>' };
      const el = (tag, cls, text) => { const n = document.createElement(tag); if (cls) n.className = cls; if (text != null) n.textContent = text; return n; };
      const edW = () => (FM.spineWords && FM.spineWords.editor) || {};
      const edSwitch = big => {
        const w = edW(), b = el('button', 'ed-sw' + (big ? ' big' : ''));
        b.type = 'button';
        b.append(el('span', 'ed-k'), el('span', 'ed-l ed-l-s', w.simple || 'Simple'), el('span', 'ed-x', '⇄'), el('span', 'ed-l ed-l-f', w.full || 'Full'));
        b.querySelector('.ed-k').setAttribute('aria-hidden', 'true'); b.querySelector('.ed-x').setAttribute('aria-hidden', 'true');
        /* A tap on the switch never opens or swaps the block (as #cv-mini-app at :7138); it asks FM.editor (§6.4). */
        b.addEventListener('click', async e => {
          e.stopPropagation();
          const to = FM.editor.mode() === 'simple' ? 'full' : 'simple';
          if (!(await FM.editor.request(to, { from: 'cog' }))) return;
          cvEdPaint(); cvEdSwitched = true;
          /* D23 A: close, so he sees the new editor — unless Canvas holds picks he has not applied, or Friends is the big block
             (he is in the middle of something there; closing would unmount it). DESIGN §21 F3: compare EVERY pending value with
             the snapshot taken at open — cvSummary() leaves the background out, so a background pick was thrown away. */
          const pending = cvPendingFp() !== cvOpenFp;
          if (!pending && cvPairBig() !== 'friends') setTimeout(() => { if (!cvDialog.classList.contains('hidden')) cvClose(); }, 260);
        });
        return b;
      };
      const cvEdBuild = () => {
        if (cvEd) return;
        const w = edW();
        cvEd = el('div'); cvEd.id = 'cv-editor'; cvEd.setAttribute('role', 'group'); cvEd.setAttribute('aria-label', w.title || 'Editor');
        cvEdBar = el('div', 'cv-mini'); cvEdBar.id = 'cv-ed-bar';
        const ico = el('span', 'cv-mini-ico'); ico.setAttribute('aria-hidden', 'true'); ico.innerHTML = ED_ICON;   // fixed string
        /* ONE markup for both widths (DESIGN §21 F11): the block is built once and kept, and a window can cross 700 px while the cog
           is up (cvOnWidth) — a phone-built bar on a PC lost its title, a PC-built one on a phone overflowed 356 px and grew the
           bar, moving Canvas and Friends. The phone query hides `.cv-mini-t` inside #cv-ed-bar instead. */
        { const h = el('span', 'ed-head'); h.append(ico, el('span', 'cv-mini-t', w.title || 'Editor')); cvEdBar.append(h); }
        const what = el('button', 'ed-what', w.what || 'What should you use?'); what.type = 'button'; what.id = 'cv-ed-what'; what.setAttribute('aria-expanded', 'false');
        const why = el('div', 'ed-why'); why.id = 'cv-ed-why'; why.setAttribute('role', 'status'); why.setAttribute('aria-live', 'polite');
        cvEdBar.append(edSwitch(false), el('span', 'ed-gap'), what);
        cvEdBody = el('div'); cvEdBody.id = 'cv-ed-body';
        const now = el('div', 'ed-now'); now.append(edSwitch(true), Object.assign(el('span', 'ed-now-t'), { id: 'cv-ed-now' }));
        cvEdBody.append(el('div', 'export-title', w.what || 'What should you use?'), now);
        ['simple', 'full'].forEach(k => {
          const o = el('div', 'ed-opt'); o.dataset.k = k;
          const pic = el('span'); pic.innerHTML = ED_PIC[k];   // fixed string
          const t = el('div'); t.append(el('b', '', k === 'simple' ? (w.simple || 'Simple') : (w.full || 'Full')), el('p', '', k === 'simple' ? w.simpleText : w.fullText));
          o.append(pic.firstChild, t); cvEdBody.append(o);
        });
        cvEdBody.append(el('p', 'ed-note', w.note || ''), why);
        cvEd.append(cvEdBar, cvEdBody);
        cvDialog.appendChild(cvEd);
        cvEdBar.addEventListener('click', () => cvPairSwap('editor'));   // the bar away from the switch, and "What should you use?"
        cvEdPaint();
      };
      const cvEdDrop = () => { if (cvEd) { cvEd.remove(); cvEd = cvEdBar = cvEdBody = null; } cvDialog.classList.remove('cv-ed-on', 'cv-ed-big'); };
      const cvEdSync = () => { if (cvEdOn()) { cvEdBuild(); cvDialog.classList.add('cv-ed-on'); } else cvEdDrop(); };
      const cvEdPaint = () => {
        if (!cvEd) return;
        const w = edW(), m = FM.editor.mode(), to = m === 'full' ? (w.toSimple || 'Switch to Simple editor') : (w.toFull || 'Switch to Full editor');
        cvEd.querySelectorAll('.ed-sw').forEach(b => { b.dataset.mode = m; b.setAttribute('aria-label', to); b.title = to; });
        const now = document.getElementById('cv-ed-now'); if (now) now.textContent = (w.youreIn || 'You’re in ') + (m === 'full' ? (w.full || 'Full') : (w.simple || 'Simple'));
        cvEd.querySelectorAll('.ed-opt').forEach(o => {
          const here = o.dataset.k === m; o.classList.toggle('here', here);
          const b = o.querySelector('b'), t = b.querySelector('.ed-here'); if (t) t.remove();
          if (here) b.append(el('span', 'ed-here', w.here || 'You’re here'));
        });
      };
      if (FM.editor && FM.editor.onChange) FM.editor.onChange(cvEdPaint);
      /* A refusal is shown INSIDE the block, never as a toast under the dialog (the #921 S7 lesson, cvRoleNote below) */
      window.addEventListener('fm-editor-refuse', e => {
        if (!cvEd || cvDialog.classList.contains('hidden')) return;
        const why = document.getElementById('cv-ed-why'); if (why) why.textContent = (e.detail && e.detail.text) || '';
        cvEd.querySelectorAll('.ed-sw').forEach(b => { b.classList.remove('ed-shake'); void b.offsetWidth; b.classList.add('ed-shake'); });
      });
```

`cvPendingFp()` (beside `cvSummary`, read-only) joins every value Apply would write: `cvCompute()`'s `w` and `h`, the fps
`cvApply`'s caller reads (`fpsSel` / `fpsNum`), `cvBg`, `cvAspect`, and the custom W/H inputs. `openCanvasDialog` stores
`cvOpenFp = cvPendingFp()` as its **last** line, after it has seeded every control from the project, so "picks he has not
applied" is exactly `cvPendingFp() !== cvOpenFp`. (The earlier `cvSummaryOfProject()` compared the summary string, which has
no background in it and names the aspect by `cvDetect`'s rule; both made it miss or invent picks: DESIGN §21 F3.)

**(b) Each pair function gains its third case** (the rule is the pair's: one big, the rest small):

| Function (v17.21) | Today | Change |
|---|---|---|
| `cvAnchorBlock` `:8358` | side → `cvCard`; stacked → the big one of two | side → `cvCard` (Canvas stays in the right column in every state); stacked → `{canvas: cvCard, friends: cvFr, editor: cvEd}[cvPairBig()]` |
| `cvPairLast` `:8368` | `'friends'` or `'canvas'` | **unchanged** (DESIGN §21 F7: the Editor block is never remembered, so the cog opens as today) |
| `cvPairBig` `:8369` | reads `cv-fr-big` | `cv-ed-big` → `'editor'`, else `cv-fr-big` → `'friends'`, else `'canvas'` |
| `cvPairApply(big)` `:8381` | toggles `cv-fr-big`, `aria-expanded` on the two ⤢ | also toggles `cv-ed-big` (`big === 'editor'`) and sets `#cv-ed-what`'s `aria-expanded`; `cvEdPaint()`; **skips the `localStorage.setItem(CV_PAIR_KEY, …)` line when `big === 'editor'`** |
| `cvPairSettle` `:8397` | clears inline styles on `[cvCard, cvFr]` | `[cvCard, cvFr, cvEd].filter(Boolean)`; also `cvEdBar.style.top = ''` |
| `cvPairSwap(to)` `:8409` | FLIP of two blocks: one grows, one shrinks | FLIP of the blocks present (`[cvCard, cvFr, cvEd].filter(Boolean)`): the one becoming big **grows**, the big one **shrinks**, a third that was small and stays small **flies only** (its rect moves, its bar stays opaque, no content fade). Bars: `cvCard → cvMini`, `cvFr → cvFrBar`, `cvEd → cvEdBar`; content: `cvEd → [cvEdBody]`. `refocus` also knows `#cv-ed-what` |
| bar listeners `:8463-8464` | two | `cvEdBar` is wired in `cvEdBuild` (a), and the switch stops propagation |
| `openCanvasDialog(o)` `:8552` | `o.block` friends / last / canvas | `cvEdSync()` first (before `cvPairApply`); `o.block === 'last'` may now land on `'editor'`; no door passes `'editor'` (only the block's own button opens it big) |
| `cvClose` `:8582` | the one close | after the settle: `if (cvEdSwitched) { cvEdSwitched = false; if (FM.editor && FM.editor.afterCogClose) FM.editor.afterCogClose(); }` (§6.3: the held animation plays as the cog closes) |
| `FM.settings.onChange` `:8600` | re-hangs the pair | also, under D22 B only, `cvEdSync()` while the dialog is open, landing on Canvas if the Editor block was big |

`cvPlace`, `cvOnWidth` and `CV_SIDE_NEED` need **no change**: the small column fits today's width (COG-DESIGN §6.2).

#### 1.3.19 Two read-only getters (DESIGN §6.4) — NEW 1 Oct, NOT RUN

`js/crop-tool.js` (beside `FM.cropTool.isActive`, `:183` at v17.21): `changed()` returns true when the crop box differs from
the box it started with (compare the four edges the tool already holds, to 1e-6). `js/touchup-tool.js`: `changed()` the same
for the touch-up box. Neither writes anything or changes what Full does; without them an untouched box would warn for
nothing (cog T4). Bump both files' `?v=`.

### 5.3 New file `js/editor-mode.js` (whole file)

**Rewritten 1 Oct to his rules and NOT RUN.** The 29 Sep version was rehearsed on a scratch copy (§13); this one changes its
doors (no ⇄, no ⋯ item, no back button, no E, the cog is the one door) and adds the guard of DESIGN §6.4 (COG-DESIGN §7.3).
Every tool API named in `HOLDS` / `COMMITS` was measured at v17.21 by COG-DESIGN's probe, not by running this file: check each
against the tree first (the two marked `FIND AT BUILD TIME` are the pen's Done and the recorder's Add). cog T2 fails if a
canvas tool in collab-presence's `LEASED` table is in none of the three lists.

```js
/* FreeMotion — FM.editor: which editor this device shows for the open project (Simple mode Phase 1, DESIGN.md §6, §7.2).
 *
 * THE EDITOR IS A VIEW, NOT A DOCUMENT FACT. Switching writes nothing to the project, takes no undo step and sends nothing
 * to a live session (§6.2): it toggles `body.ed-simple`, and the timeline dispatches on that class. What this device last
 * chose lives on ITS project card (the index entry's `editor`) and in `fm.editor.last`, never in the document.
 *
 * ONE DOOR (his rule, 1 Oct): the ⚙ cog's third block calls request(). There is no play-bar button, no ⋯ item and no E key
 * (DESIGN.md §0.4 V1–V3, B14). request() works out what a switch would lose and ASKS first (§6.4). apply() never closes a tool
 * that holds unapplied work: it refuses instead, so no door — today's or a later one — can throw work away silently.
 *
 * D22: GATED false (recommended A) = no Settings row, enabled() is always true. Under D22 B set GATED true and add the
 * Settings row (BUILD-PLAN 1.3.7–1.3.9).
 */
window.FM = window.FM || {};
(function (FM) {
  'use strict';
  const GATED = false;                 // D22
  const W = () => (FM.spineWords && FM.spineWords.editor) || {};
  let mode = 'full';                   // what is on screen
  let lastPid = undefined;             // the project that mode was worked out for
  let pendingFx = false;               // a switch made from the cog: its crossfade waits for the cog to close (§6.3)
  const listeners = [];

  const body = () => document.body;
  const enabled = () => !GATED || !!(FM.settings && FM.settings.get && FM.settings.get('simpleEditor'));
  const openPid = () => (FM.storage && FM.storage.openProjectId) ? FM.storage.openProjectId() : null;
  const card = pid => { try { return ((FM.projects && FM.projects.list && FM.projects.list()) || []).find(p => p.id === pid) || null; } catch (e) { return null; } };
  const safe = f => { try { return !!f(); } catch (e) { return false; } };

  /* WHICH EDITOR A PROJECT OPENS IN (§7.2): this device's card for that project, else Full. project.sm.home is NEVER read
     (§0.4 B27). Phase 3, under D3 A (re-asked 1 Oct), gives a NEW project's card `editor` from fm.editor.last at create, in createFromDialog. */
  function homeFor(pid) {
    if (!enabled()) return 'full';
    const c = pid ? card(pid) : null;
    return (c && c.editor === 'simple') ? 'simple' : 'full';
  }
  function remember(pid, ed) {
    try { localStorage.setItem('fm.editor.last', ed); } catch (e) {}
    if (!pid || !FM.projects || !FM.projects.list || !FM.projects.saveIndex) return;
    const idx = FM.projects.list(), e = idx.find(p => p.id === pid);
    if (!e || e.editor === ed) return;
    e.editor = ed;
    FM.projects.saveIndex(idx);
  }

  /* THE GUARD'S THREE LISTS (§6.4). HOLDS: a tool that can hold work NOT yet in history — closing it would lose that work, so
     the switch asks first and then presses the tool's OWN Done (Full's Done, unchanged: the switch adds no new way to apply
     anything). COMMITS: a tool whose close is one ordinary undo step. QUIET: a tool whose close writes nothing. */
  const click = sel => { const b = document.querySelector(sel); if (!b) return false; b.click(); return true; };
  const HOLDS = [
    { id: 'crop',    live: () => FM.cropTool && FM.cropTool.isActive() && FM.cropTool.changed(),       keep: () => click('#crop-bar .cb-done') },
    { id: 'touchup', live: () => FM.touchupTool && FM.touchupTool.isOpen() && FM.touchupTool.changed(), keep: () => click('#touchup-bar .cb-done') },
    /* DESIGN §21 F1: the draw bar's Done is `#draw-bar .db-done` (js/draw-tool.js:788), not `.cb-done`; and under 3 points that
       Done only toasts "Tap at least 3 points" and stays open (finish(), :691-693), so "Switch anyway" — which the warning
       says throws the points away — must discard them itself, or apply() would see the pen still live and refuse in silence. */
    { id: 'pen',     live: () => FM.drawTool && FM.drawTool.active && FM.drawTool.mode === 'vector' && FM.drawTool.points.length > 0,
      keep: () => { if (FM.drawTool.points.length >= 3) return click('#draw-bar .db-done'); if (FM.drawTools) FM.drawTools.stop(); return true; } }
    /* No voice take here (§21 F2): the recorder is #vr-overlay, fixed, inset 0, z 190 — over the cog — and no switch path closes
       it, so a take is never lost by a switch. busyReason() refuses while it is open instead. */
  ];
  const COMMITS = [
    { id: 'text',   live: () => FM.textEdit && FM.textEdit.isActive && FM.textEdit.isActive(), close: () => FM.textEdit.stop() },
    { id: 'mask',   live: () => FM.maskTool && FM.maskTool.isActive && FM.maskTool.isActive(), close: () => FM.maskTool.stop() },
    { id: 'points', live: () => FM.pointEdit && FM.pointEdit.isActive && FM.pointEdit.isActive(), close: () => FM.pointEdit.stop() },
    { id: 'wheel',  live: () => FM.hasPendingCommit && FM.hasPendingCommit(), close: () => FM.flushPendingCommit() }
  ];
  const QUIET = [   // open but holding nothing: closing writes nothing (an untouched crop / touch-up box, motion path, graph)
    { id: 'crop',    live: () => FM.cropTool && FM.cropTool.isActive(),    close: () => FM.cropTool.stop() },
    { id: 'touchup', live: () => FM.touchupTool && FM.touchupTool.isOpen(), close: () => FM.touchupTool.close() },
    { id: 'path',    live: () => FM.motionPath && FM.motionPath.isActive && FM.motionPath.isActive(), close: () => FM.motionPath.stop() }
  ];
  /* STAYS: open across a switch, closed by nothing here, losing nothing. Sketching (freehand draw) commits each stroke as it
     lands, but its own ↷ (histFuture) would die with the tool, so it must never be added to QUIET (§21 F4). */
  const STAYS = ['draw-freehand'];
  FM.editorGuardLists = { HOLDS: HOLDS.map(h => h.id), COMMITS: COMMITS.map(c => c.id), QUIET: QUIET.map(q => q.id).concat(['graph', 'tracker']), STAYS: STAYS, REFUSED: ['voice'] };   // cog T2 reads this: every LEASED row (draw = pen + draw-freehand) and the recorder must be in one list

  /* What would stop a switch outright (§6.1 refusals). '' when nothing does. */
  function busyReason() {
    if (FM._exporting) return 'export';
    if (FM.voiceRec && FM.voiceRec.isOpen && FM.voiceRec.isOpen()) return 'recording';   // §21 F2: open at all, not only recording (refusal line: "Close the recorder first")
    if ((FM.spine && FM.spine.running) || body().classList.contains('sm-running')) return 'busy';
    if ((FM.timeline && FM.timeline.gestureLive && FM.timeline.gestureLive()) || (FM.canvasGestureLive && FM.canvasGestureLive())) return 'drag';
    return '';
  }

  /* THE PLAN: what this switch would write and what it would lose. The swap itself writes only this device's card and
     fm.editor.last; every HOLDS entry that is live would be lost; any step it makes while ↷ has steps loses the redo tail. */
  /* §21 F5: the ↷ the person SEES. In a live session undo and redo go through FM.collab (js/history.js:208, :325-326), and the
     local stack's canRedo() says nothing about it — the redo warning would be wrong in exactly the case with a friend in. */
  const canRedoNow = () => safe(() => (FM.collab && FM.collab.undoActive && FM.collab.undoActive()) ? FM.collab.canRedo() : FM.history.canRedo());
  function plan(to) {
    const p = { to: to, refuse: busyReason(), lose: [], steps: 0, writes: ['card.editor', 'fm.editor.last'] };
    HOLDS.forEach(h => { if (safe(h.live)) p.lose.push(h.id); });
    p.steps = COMMITS.filter(c => safe(c.live)).length + p.lose.length;   // applying a held thing is a step too
    if (p.steps && canRedoNow()) p.lose.push('redo');
    return p;
  }
  function warning(p) {
    const w = W().warn || {}, to = p.to === 'simple' ? (W().simple || 'Simple') : (W().full || 'Full');
    const lines = p.lose.map(id => id === 'pen' && FM.drawTool && FM.drawTool.points.length < 3 ? w.penShort : (id === 'redo' ? w.redo(FM.history.redoDepth ? FM.history.redoDepth() : 1) : w[id]));
    const one = p.lose.length === 1 ? p.lose[0] : null;
    return { title: (w.title || 'Switch to ') + to + '?', message: lines.join('\n'),
             ok: one ? ((one === 'pen' && FM.drawTool.points.length < 3) ? w.okAnyway : (w.ok[one] || w.okAnyway)) : w.okSeveral,
             cancel: w.stay || 'Stay' };
  }
  function refuse(kind) {
    const r = (W().refuse || {})[kind] || '';
    window.dispatchEvent(new CustomEvent('fm-editor-refuse', { detail: { kind: kind, text: r } }));   // the cog block shakes and shows it (§6.1)
    return false;
  }

  /* PUT AN EDITOR ON SCREEN, writing nothing. Every door reaches this. It NEVER closes a tool that holds work: with one live
     it refuses, so the only way past is request(), which asked. */
  function apply(next, opts) {
    next = next === 'simple' && enabled() ? 'simple' : 'full';
    opts = opts || {};
    if (next === mode && !opts.force) return true;
    if (busyReason() && !opts.force) return false;
    if (HOLDS.some(h => safe(h.live))) return false;
    COMMITS.forEach(c => { if (safe(c.live)) { try { c.close(); } catch (e) {} } });
    QUIET.forEach(q => { if (safe(q.live)) { try { q.close(); } catch (e) {} } });
    if (FM.exitEditGroup) { try { FM.exitEditGroup(); } catch (e) {} }
    const had = document.activeElement;
    mode = next;
    body().classList.toggle('ed-simple', mode === 'simple');
    if (opts.from === 'cog') pendingFx = true; else if (!opts.quiet) crossfade();
    if (FM.syncSelectionChrome) FM.syncSelectionChrome();
    if (!opts.noRebuild && FM.timeline && FM.timeline.rebuild) FM.timeline.rebuild();   // syncProject runs INSIDE a rebuild: no second one
    if (FM._dockSheet) requestAnimationFrame(FM._dockSheet);
    listeners.forEach(f => { try { f(mode); } catch (e) {} });
    /* focus never falls to <body> (§8.10 item 2): if what held it is gone from view, the cog it came from takes it */
    if (!opts.quiet && (!had || had === document.body || !had.isConnected || !had.getClientRects().length)) {
      const c = ['m-settings', 'btn-settings'].map(id => document.getElementById(id)).find(b => b && b.getClientRects().length);
      if (c) { try { c.focus({ preventScroll: true }); } catch (e) {} }
    }
    return true;
  }
  /* Phase 1: a 150 ms crossfade (§6.3); the morph (D11 B: the morph only, his pick) replaces it in Phase 3. From the cog it plays when the cog closes. */
  function crossfade() {
    const panel = document.getElementById('timeline-panel');
    if (!panel || (FM.reducedMotion && FM.reducedMotion())) return;
    panel.classList.remove('ed-xfade'); void panel.offsetWidth; panel.classList.add('ed-xfade');
    setTimeout(() => panel.classList.remove('ed-xfade'), 180);
  }

  /* THE DELIBERATE SWITCH: apply, then remember it on this device. Reached only through request() (and the suite). */
  function set(next, opts) {
    const from = mode;
    if (!apply(next, opts)) return false;
    remember(openPid(), mode);
    if (from !== mode) announce();
    return true;
  }
  function announce() {
    const w = W();
    /* §21 F12: #sm-live sits inside #sm-timeline, which is display:none in Full, so "Full editor" was never read out. One
       visually hidden live region at body level (built here, `ed-live`, outside both timelines) speaks for both. */
    let live = document.getElementById('ed-live');
    if (!live) { live = document.createElement('div'); live.id = 'ed-live'; live.className = 'sm-vh'; live.setAttribute('role', 'status'); live.setAttribute('aria-live', 'polite'); document.body.appendChild(live); }
    if (live) live.textContent = mode === 'simple' ? (w.liveSimple || 'Simple editor') : (w.liveFull || 'Full editor');
    /* First arrival in SIMPLE only, once per device (§6.1). Arriving in Full shows nothing (§0.4 V4). */
    if (mode === 'simple') {
      let seen = null; try { seen = localStorage.getItem('fm.editor.hint'); } catch (e) {}
      if (!seen && FM.toast) { FM.toast(w.firstSimple || 'Simple editor. Switch back any time from the ⚙ cog.', 2600); try { localStorage.setItem('fm.editor.hint', '1'); } catch (e) {} }
    }
  }

  /* THE ONE DOOR (§6.1, §6.4). Resolves true when the editor changed (or already was `to`). */
  async function request(to, o) {
    to = to === 'simple' ? 'simple' : 'full';
    o = o || {};
    if (to === mode) return true;
    const p = plan(to);
    if (p.refuse) return refuse(p.refuse);
    if (p.lose.length) {
      const ok = FM.ask ? await FM.ask(warning(p)) : false;      // Stay, Escape and the scrim answer falsy: nothing touched
      if (!ok) return false;
      const again = plan(to);                                    // the world may have moved while the pop-up was up
      if (again.refuse) return refuse(again.refuse);
      for (const id of again.lose) {
        const h = HOLDS.find(x => x.id === id);
        if (h && !h.keep()) return refuse('unsettled');          // the tool's own Done was not there: stay, lose nothing
      }
    }
    /* §21 F1: apply() refuses while any HOLDS tool is still live (a Done that settles later, a keep that did nothing). Say so in
       the block instead of returning a silent false that leaves the knob, the cog and him all waiting. */
    return set(to, { from: o.from }) || refuse('unsettled');
  }

  FM.editor = {
    mode: () => mode,
    isSimple: () => mode === 'simple',
    enabled: enabled,
    homeFor: homeFor,
    plan: plan,
    request: request,
    apply: apply,
    set: set,                                   // the suite's seam; the app's only caller is request()
    onChange: f => { if (typeof f === 'function') listeners.push(f); },
    /* The cog closed after a switch made from it (cvClose): play the held animation now that it can be seen (§6.3). */
    afterCogClose() { if (pendingFx) { pendingFx = false; crossfade(); } },
    /* Called first thing in every timeline rebuild: a project that just opened gets its own editor, silently. Only a real
       change runs apply, so a rebuild in Full never flushes the text editor or closes a tool (the "off means off" test). */
    syncProject() {
      const pid = openPid();
      if (pid === lastPid) return;
      const want = homeFor(pid);
      if (want === mode) { lastPid = pid; return; }
      if (apply(want, { quiet: true, force: true, noRebuild: true })) lastPid = pid;   // a held tool: retried on the next rebuild
    },
    /* D22 B only: the Settings row flipped. Off goes through the same guard (never a silent discard); if he stays, the row
       flips back on. On: the project returns to its own editor. */
    async onPreviewFlip() {
      if (!GATED) return;
      body().classList.toggle('sm-on', enabled());
      if (!enabled()) { if (mode !== 'full' && !(await request('full', { from: 'settings' }))) FM.settings.set('simpleEditor', true); }
      else { const want = homeFor(openPid()); if (want !== mode) apply(want, { force: true }); }
    },
    /* KEYS (§8.3, §15.1). In Full this answers NOTHING (no E, §0.4 B14). In Simple, the arranging keys that have no Simple
       command yet say so instead of doing Full's thing to a clip on the main track. */
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
    _state: () => ({ mode: mode, lastPid: lastPid, pendingFx: pendingFx })   // suite seam
  };

  function wire() {
    if (GATED) body().classList.toggle('sm-on', enabled());
    const sp = document.getElementById('btn-sm-split');
    if (sp && !sp._edWired) { sp._edWired = true; sp.addEventListener('click', () => { if (FM.spine) FM.spine.say('splitNext', { full: true }); }); }
    if (GATED && FM.settings && FM.settings.onChange) FM.settings.onChange(() => { if (!!enabled() !== body().classList.contains('sm-on')) FM.editor.onPreviewFlip(); });
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', wire); else wire();
})(window.FM);
```

**Names to confirm at build time** (each is used above and was not read for this rewrite): `FM.cropTool.isActive` / `.stop`,
`FM.touchupTool.isOpen` / `.close` (COG-DESIGN §7.2 measured these); `FM.drawTool.active` / `.mode` / `.points`;
`FM.voiceRec._state` (`js/voice-rec.js:706`); `FM.maskTool`, `FM.pointEdit`, `FM.motionPath` and how each says it is open;
`FM.hasPendingCommit` (if it does not exist, add a read-only `FM.hasPendingCommit` beside `FM.flushPendingCommit`,
`js/canvas-edit.js:743`, which changes nothing Full does); `FM.history.canRedo` / `redoDepth`; `FM.exitEditGroup`. Adapt the
name, never the rule: a tool that can hold unapplied work goes in `HOLDS`, full stop.

### 5.4 New file `js/simple-timeline.js` (whole file)

```js
/* FreeMotion — FM.simpleTimeline: the Simple editor's timeline, READ-ONLY (Simple mode Phase 1, DESIGN.md §8.1–§8.2, §15.1).
 *
 * WHAT HE HOLDS IN PHASE 1: any project drawn as clips. The main track as one filmstrip row, text / captions / overlays /
 * effects in their own sections above it (higher on screen = in front, Behind just above the clips), sound in one row
 * below, seam chips where the clips do not meet, and a + at the end that lays picked files end to end. Tapping anything
 * selects it and opens TODAY's panel for it, which edits it exactly as Full does. Nothing here moves a clip.
 *
 * GEOMETRY IS FULL'S, BY CONSTRUCTION. Full's #timeline stays laid out underneath (visibility: hidden), so
 * FM.timeline.pxPerSec() is the same number both views draw with, and a time t sits at the same screen x in both:
 * x = 50vw + (t − FM.time) · pps. That is the whole of "every clip keeps its x" across the switch (T8).
 *
 * NOT IN PHASE 1 (BUILD-PLAN.md): folding sections, lane caps and the +N badge, pinch, trim grips, drags, the link line,
 * the black band, the stage clamp and tight-height classes, and Simple's own key scope. Each is a Phase 2 row.
 */
window.FM = window.FM || {};
(function (FM) {
  'use strict';
  const W = () => FM.spineWords || {};
  const SECTIONS = ['captions', 'text', 'overlay', 'behind'];   // top → bottom inside the sections box (stacking order)
  const GLYPH = { captions: 'Cc', text: 'Aa', overlay: '◧', behind: '▤' };
  const RULER = 18, MAIN_H = 56, SOUND_H = 32, LANE = 32;
  let root = null, scroller = null, inner = null, rulerEl = null, secEl = null, mainEl = null, soundEl = null, sayEl = null, liveEl = null;
  let lastProg = -1, userScrollAt = 0, settleT = 0, R = null, strips = new Map();

  const pps = () => (FM.timeline && FM.timeline.pxPerSec) ? FM.timeline.pxPerSec() : 100;
  function origin() {   // screen-centre in #sm-inner coordinates at scrollLeft 0 (Full's HEAD_W + PAD)
    const panel = document.getElementById('timeline-panel');
    const left = panel ? panel.getBoundingClientRect().left : 0;
    return Math.max(0, window.innerWidth / 2 - left);
  }
  function el(tag, cls, text) { const d = document.createElement(tag); if (cls) d.className = cls; if (text != null) d.textContent = text; return d; }

  function ensureDom() {
    if (root) return true;
    root = document.getElementById('sm-timeline');
    if (!root) return false;
    scroller = root.querySelector('#sm-scroll'); inner = root.querySelector('#sm-inner');
    rulerEl = root.querySelector('#sm-ruler'); secEl = root.querySelector('#sm-sections');
    mainEl = root.querySelector('#sm-main'); soundEl = root.querySelector('#sm-sound');
    sayEl = document.getElementById('sm-say'); liveEl = document.getElementById('sm-live');
    // the playhead is FIXED at 50vw and the content scrolls under it, exactly as in Full
    scroller.addEventListener('scroll', () => {
      const sL = scroller.scrollLeft;
      if (Math.abs(sL - lastProg) < 1) return;   // our own write
      lastProg = sL; userScrollAt = performance.now();
      clearTimeout(settleT); settleT = setTimeout(() => { userScrollAt = 0; FM.simpleTimeline.updatePlayhead(); }, 160);
      const dur = (FM.scene.project && FM.scene.project.duration) || 0;
      const t = Math.max(0, Math.min(dur, sL / pps()));
      if (FM.scrubTime) FM.scrubTime(FM.snapFrame ? FM.snapFrame(t) : t);
    }, { passive: true });
    scroller.addEventListener('pointerdown', () => { if (FM.playing && FM.pause) FM.pause(); }, { capture: true });
    scroller.addEventListener('wheel', e => {   // ⌘/Ctrl + wheel zooms, as in Full (one zoom for both views)
      if (!(e.ctrlKey || e.metaKey)) return;
      e.preventDefault();
      const f = FM.wheelZoomFactor ? FM.wheelZoomFactor(e, 1.15) : (e.deltaY < 0 ? 1.15 : 1 / 1.15);
      if (f !== 1 && FM.timeline && FM.timeline.zoomBy) FM.timeline.zoomBy(f);
    }, { passive: false });
    inner.addEventListener('click', e => {   // a tap on empty timeline clears the selection, like Full's background
      if (e.target === inner || e.target === secEl || e.target === mainEl || e.target === soundEl || e.target.classList.contains('sm-lane')) {
        if (FM.selectLayer && FM.scene.selectedId) FM.selectLayer(null);
      }
    });
    wireSay();
    return true;
  }

  /* ─────────────── #sm-say: where Simple speaks (§3.12). A line with one real button; never FM.toast. ─────────────── */
  let sayT = 0;
  function wireSay() {
    if (!sayEl || sayEl._wired) return;
    sayEl._wired = true;
    document.addEventListener('pointerdown', e => { if (sayEl.textContent && !sayEl.contains(e.target)) clearSay(); }, true);
  }
  function clearSay() { clearTimeout(sayT); if (sayEl) sayEl.textContent = ''; }
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

  let laterRAF = 0;
  function later() { if (laterRAF) return; laterRAF = requestAnimationFrame(() => { laterRAF = 0; if (FM.editor && FM.editor.isSimple()) FM.timeline.rebuild(); }); }
  /* ─────────────── filmstrips and waveforms: one small bounded cache, the same frames Full builds ─────────────── */
  function stripFor(layer, m, cssW, h) {
    const bw = Math.max(8, Math.min(4096, Math.round(cssW)));   // iOS blanks very wide canvases; CSS stretches it back
    const key = bw + '|' + h + '|' + (layer.trimStart || 0) + '|' + layer.duration + '|' + (m.stripFrames ? m.stripFrames.length : -1) + '|' + (layer.mediaRev || 0);
    const hit = strips.get(layer.id);
    if (hit && hit.key === key) return hit.canvas;
    if (!(m.stripFrames && m.stripFrames.length)) {
      /* ONCE per record, and only for one that can decode (buildClipStrip answers an element-less record with an
         immediate resolve that sets nothing — re-asking on every rebuild would loop forever in microtasks). The
         rebuild it asks for is coalesced onto one frame. */
      if (m.el && m.stripFrames === undefined && !m._stripPending && !m._smAsked && !FM.playing && FM.buildClipStrip) {
        m._stripPending = true; m._smAsked = true;
        FM.buildClipStrip(m, 8).then(() => { m._stripPending = false; later(); }, () => { m._stripPending = false; });
      }
      return null;
    }
    const c = el('canvas', 'sm-strip'); c.width = bw; c.height = h;
    const g = c.getContext('2d'), aspect = (m.width || 16) / (m.height || 9), k = bw / cssW;
    const tileW = Math.max(12, Math.round(h * aspect * k));
    for (let x = 0, i = 0; x < bw; x += tileW, i++) { const f = m.stripFrames[i % m.stripFrames.length]; if (f) { try { g.drawImage(f, x, 0, tileW, h); } catch (e) {} } }
    strips.set(layer.id, { key: key, canvas: c });
    if (strips.size > 60) strips.delete(strips.keys().next().value);
    return c;
  }

  /* ─────────────── drawing ─────────────── */
  function badge(node, u) {
    if (u.pro !== 'none') { const b = el('span', 'sm-pro', '✦'); b.title = (W().lines || {}).pro || 'Has moves and effects'; node.appendChild(b); }
    if (u.media === 'missing') node.appendChild(el('span', 'sm-nofoot', (W().lines || {}).noFootage || 'No footage'));
    if (u.hidden) node.classList.add('sm-hidden');
    if (u.kind === 'undecided') node.classList.add('sm-loading');
  }
  function itemNode(layer, u, x, w, cls) {
    const n = el('div', 'sm-item ' + cls);
    n.dataset.id = layer.id;
    n.setAttribute('role', 'button');
    n.tabIndex = -1;
    n.style.left = x + 'px'; n.style.width = Math.max(4, w) + 'px';
    const name = FM.spine.itemWord(layer, R);
    n.setAttribute('aria-label', name); n.title = name;
    n.appendChild(el('span', 'sm-name', name));
    badge(n, u);
    n.addEventListener('click', e => { e.stopPropagation(); FM.selectLayer(layer.id); });
    n.addEventListener('keydown', e => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); e.stopPropagation(); FM.selectLayer(layer.id); } });
    return n;
  }
  function buildRuler(X, p, dur, width) {
    rulerEl.textContent = '';
    const step = p > 90 ? 1 : p > 40 ? 2 : p > 16 ? 5 : p > 6 ? 10 : 30;
    for (let s = 0; s <= dur + 1e-6; s += step) {
      const tick = el('div', 'sm-tick', (Math.floor(s / 60) ? Math.floor(s / 60) + ':' : '') + String(Math.round(s % 60)).padStart(Math.floor(s / 60) ? 2 : 1, '0') + (Math.floor(s / 60) ? '' : 's'));
      tick.style.left = (X + s * p) + 'px';
      rulerEl.appendChild(tick);
    }
  }

  FM.simpleTimeline = {
    rebuild() {
      if (!ensureDom() || !FM.spine || !FM.scene) return;
      const scene = FM.scene, layers = scene.layers, byId = new Map(layers.map(l => [l.id, l]));
      R = FM.spine.read(scene);
      const p = pps(), X = origin(), dur = Math.max(0, scene.project.duration || 0);
      const vw = scroller.clientWidth || window.innerWidth;
      inner.style.width = (vw + dur * p) + 'px';
      buildRuler(X, p, dur);
      const sel = new Set(FM.selectionIds ? FM.selectionIds() : []);
      const xOf = t => X + t * p;

      // ── sections box: every non-empty section's lanes, bottom-aligned (Behind lowest, right above the clips) ──
      secEl.textContent = '';
      const boxH = Math.max(LANE, (scroller.clientHeight || 170) - RULER - MAIN_H - SOUND_H);
      secEl.style.height = boxH + 'px';
      const stack = el('div', 'sm-secstack');
      SECTIONS.forEach(sec => {
        const lanes = R.lanes[sec] || [];
        if (!lanes.length) return;
        const box = el('div', 'sm-sec sm-sec-' + sec);
        box.dataset.sec = sec;
        const glyph = el('div', 'sm-glyph', GLYPH[sec]);
        glyph.setAttribute('aria-hidden', 'true');
        glyph.title = ((W().sections || {})[sec]) || sec;
        box.appendChild(glyph);
        lanes.forEach(ids => {
          const lane = el('div', 'sm-lane');
          ids.forEach(id => {
            const l = byId.get(id); if (!l) return;
            const n = itemNode(l, R.units[id], xOf(l.start), (l.duration || 0) * p, 'sm-k-' + R.units[id].kind);
            if (sel.has(id)) n.classList.add('sel');
            lane.appendChild(n);
          });
          box.appendChild(lane);
        });
        stack.appendChild(box);
      });
      secEl.appendChild(stack);

      // ── the clip row ──
      mainEl.textContent = '';
      const clips = R.main.filter(e => !e.slot);
      clips.forEach((e, i) => {
        const l = byId.get(e.id); if (!l) return;
        const u = R.units[e.id];
        const w = (e.end - e.start) * p;
        const n = itemNode(l, u, xOf(e.start), w, 'sm-clip');
        const clipC = (FM._clipColorOf ? FM._clipColorOf(l) : l.clipColor) || '#3a5a8c';
        n.style.background = clipC;
        const m = FM.media && FM.media.get(l.id);
        if (m && (m.width > 0)) { const c = stripFor(l, m, w, MAIN_H - 4); if (c) { c.style.width = w + 'px'; n.insertBefore(c, n.firstChild); } }
        const follow = (R.followers[e.id] || []).length;
        const aria = (W().a11y && W().a11y.clip) ? W().a11y.clip(i + 1, clips.length, e.end - e.start, follow) : ('Clip ' + (i + 1));
        n.setAttribute('aria-label', aria);
        if (sel.has(e.id)) n.classList.add('sel');
        mainEl.appendChild(n);
      });
      R.main.filter(e => e.slot).forEach(e => {   // a filled slot: its members draw in their sections; the row marks the stretch
        const s = el('div', 'sm-slot'); s.style.left = xOf(e.start) + 'px'; s.style.width = ((e.end - e.start) * p) + 'px'; mainEl.appendChild(s);
      });
      (R.undecidedIds || []).forEach(id => {   // media still arriving: drawn in place with a loading look
        const l = byId.get(id); if (!l) return;
        mainEl.appendChild(itemNode(l, R.units[id], xOf(l.start), (l.duration || 0) * p, 'sm-clip sm-loading'));
      });
      // seam chips: a gap or an overlap (never a blend, a covered gap or a hairline), ≥ 32×32, centred on the cut
      R.main.forEach((e, i) => {
        const s = e.seam;
        if (!s || (s.kind !== 'gap' && s.kind !== 'overlap') || s.covered) return;
        const prev = i > 0 ? R.main[i - 1] : null;
        const cutT = s.kind === 'gap' ? ((prev ? prev.end : 0) + e.start) / 2 : e.start + s.amt / 2;
        const chip = el('button', 'sm-chip sm-chip-' + s.kind, (s.kind === 'overlap' ? '⚠ ' : '') + s.amt.toFixed(1) + 's');
        chip.type = 'button';
        chip.style.left = xOf(cutT) + 'px';
        const words = W().a11y || {};
        const name = s.kind === 'gap' ? (words.gap ? words.gap(s.amt) : 'Gap') : (words.overlap ? words.overlap(s.amt) : 'Overlap');
        chip.setAttribute('aria-label', name); chip.title = name;
        chip.addEventListener('click', ev => { ev.stopPropagation(); FM.spine.say('gapNext', { full: true }); });
        mainEl.appendChild(chip);
      });
      // + at the end of the clip row: pick files, laid END TO END from the end of the main track (§15.1)
      const add = el('button', 'sm-add', '+');
      add.type = 'button';
      add.setAttribute('aria-label', (W().a11y || {}).add || 'Add clips to the end'); add.title = add.getAttribute('aria-label');
      add.style.left = (xOf(R.trackEnd) + 8) + 'px';
      add.addEventListener('click', ev => { ev.stopPropagation(); FM.simpleTimeline.pickFiles(); });
      mainEl.appendChild(add);

      // ── sound: lane 0 drawn, a count badge where more lanes exist ──
      soundEl.textContent = '';
      const sl = R.lanes.audio || [];
      (sl[0] || []).forEach(id => {
        const l = byId.get(id); if (!l) return;
        const n = itemNode(l, R.units[id], xOf(l.start), (l.duration || 0) * p, 'sm-snd');
        if (sel.has(id)) n.classList.add('sel');
        soundEl.appendChild(n);
      });
      if (sl.length > 1) {
        const more = el('div', 'sm-more', '+' + (sl.length - 1));
        more.title = (sl.length - 1) + ' more';
        soundEl.appendChild(more);
      }
      // selected items first for the roving tab stop (§8.10 item 3)
      const first = root.querySelector('.sm-item.sel') || mainEl.querySelector('.sm-item');
      if (first) first.tabIndex = 0;
      // the selected item's section scrolled into view inside the box (its own scrollTop, never scrollIntoView)
      const s = root.querySelector('#sm-sections .sm-item.sel');
      if (s) { const r = s.getBoundingClientRect(), b = secEl.getBoundingClientRect(); if (r.top < b.top || r.bottom > b.bottom) secEl.scrollTop += (r.top - b.top) - 4; }
      else secEl.scrollTop = secEl.scrollHeight;   // bottom-aligned: the sections nearest the clips show first
      this.updatePlayhead();
    },
    updatePlayhead() {
      if (!scroller) return;
      const target = Math.max(0, (FM.time || 0) * pps());
      if (userScrollAt && performance.now() - userScrollAt < 150) return;   // a finger owns the strip mid-swipe
      if (Math.abs(scroller.scrollLeft - target) > 0.5) scroller.scrollLeft = target;
      lastProg = scroller.scrollLeft;
    },
    /* The phone sheet docks UNDER #sm-say in Simple (§14.2 mobile row, T19): the sections, the clips, the sound row and any
       line Simple is saying all stay in view, and none of them moves when the sheet appears. */
    dockBottom() { const e = sayEl || mainEl; return e ? e.getBoundingClientRect().bottom : 0; },
    pickFiles() {
      const inp = el('input'); inp.type = 'file'; inp.multiple = true; inp.accept = 'video/*,image/*,audio/*';
      inp.addEventListener('change', () => {
        const files = Array.from(inp.files || []);
        if (files.length && FM.importFiles) FM.importFiles(files, { at: R ? R.trackEnd : 0 });
      });
      inp.click();
    },
    xOf(t) { return origin() + t * pps(); },   // #sm-inner coordinates, for the suite's x-invariance check
    read: () => R,
    _say: sayLine
  };
  if (FM.spine && FM.spine._setSink) FM.spine._setSink(sayLine);
})(window.FM);
```

### 5.5 `styles.css`: append this block at the END of the file

Last in the file so it wins without `!important` fights. **1 Oct:** every rule is scoped by `body.ed-simple` (Simple is
showing), by the cog block (`#canvas-dialog.cv-ed-on`, `#cv-editor`), or targets an element that only exists for Simple, so
in Full nothing here matches outside the cog's third block, the one change he asked for (FU1 and FU6 prove it). The rules
for ⇄, the ⋯ item and the back button are gone with them.

```css

/* ═══ SIMPLE MODE, PHASE 1 — the Simple editor (DESIGN.md §6, §8.1–§8.2, §15.1; BUILD-PLAN.md step 1.3) ═════════════════
   Everything below is scoped by `body.ed-simple` (Simple is showing) or by the cog's third block (`.cv-ed-on`, `#cv-editor`),
   so in Full nothing here matches outside that block: Full's play bar, ⋯ strip and stage are HEAD's (DESIGN.md §0.4). */
#btn-sm-split, #sm-timeline { display: none; }
/* SIMPLE. No switch on the play bar in either editor (the ⚙ cog is the one door, DESIGN §6.1). The phone's left group is
   ⋯ · ✂ · (gap) · |◀ (D18 A): ⧉ gives its slot to ✂, and ◐ keeps its slot INVISIBLE so |◀ sits where it sits in Full.
   PC: ‹ ✂ |◀. Under D18 B, make the #btn-addside rule `display: none !important` at every width. */
body.ed-simple #btn-layermenu, body.ed-simple #t-sel, body.ed-simple #key-rail { display: none !important; }
body.ed-simple #btn-addside { visibility: hidden !important; pointer-events: none; }
@media (min-width: 701px) { body.ed-simple #btn-addside { display: none !important; } }
/* Full-only doors in the view options (§8.8, T21): the Layers panel and Add camera (a camera is Full-only, §5.2) */
body.ed-simple #vb-layers, body.ed-simple #vb-camera { display: none !important; }
body.ed-simple #btn-sm-split { display: inline-flex; }
#btn-sm-split[aria-disabled="true"] { opacity: .38; }
#cv-editor .ed-sw.ed-shake { animation: ed-shake .36s ease; }
@keyframes ed-shake { 20% { transform: translateX(-4px); } 40% { transform: translateX(4px); } 60% { transform: translateX(-3px); } 80% { transform: translateX(2px); } }
/* ✎ hides while something is selected in Simple — by VISIBILITY, so ? never slides a slot (his #171) */
body.ed-simple.sm-has-sel #m-notes { visibility: hidden; }
/* the timeline: Full's stays laid out underneath (one pxPerSec), Simple's covers it exactly */
body.ed-simple #timeline { visibility: hidden; pointer-events: none; }
body.ed-simple #sm-timeline { display: flex; }
#sm-timeline {
  position: absolute; left: 0; right: 0; top: var(--tl-top, 40px); bottom: 0; z-index: 11;
  flex-direction: column; background: var(--panel); min-height: 0;
}
#timeline-panel.ed-xfade #sm-timeline, #timeline-panel.ed-xfade #timeline { animation: ed-xfade .15s ease; }
@keyframes ed-xfade { from { opacity: .25; } to { opacity: 1; } }
@media (prefers-reduced-motion: reduce) { #timeline-panel.ed-xfade #sm-timeline, #timeline-panel.ed-xfade #timeline { animation: none; } }
#sm-scroll { flex: 1 1 auto; min-height: 0; overflow-x: auto; overflow-y: hidden; touch-action: pan-x; overscroll-behavior: contain; scrollbar-width: none; }
#sm-scroll::-webkit-scrollbar { display: none; }
#sm-inner { position: relative; height: 100%; display: flex; flex-direction: column; }
#sm-ruler { position: relative; flex: 0 0 18px; font-size: 9px; color: #8b97ab; border-bottom: 1px solid var(--line); }
.sm-tick { position: absolute; top: 3px; transform: translateX(-50%); white-space: nowrap; pointer-events: none; }
#sm-sections { position: relative; flex: 0 0 auto; overflow-y: auto; overflow-x: hidden; display: flex; flex-direction: column; scrollbar-width: none; }
#sm-sections::-webkit-scrollbar { display: none; }
.sm-secstack { margin-top: auto; }
.sm-sec { position: relative; }
.sm-glyph { position: sticky; left: 0; z-index: 2; width: 26px; height: 16px; margin-bottom: -16px; font: 800 10px/16px system-ui, sans-serif; text-align: center; color: #0b0f16; border-radius: 0 6px 6px 0; }
.sm-sec-captions .sm-glyph { background: #ffce4a; } .sm-sec-text .sm-glyph { background: #b79cff; }
.sm-sec-overlay .sm-glyph { background: #5ac7ed; } .sm-sec-behind .sm-glyph { background: repeating-linear-gradient(135deg, #3a3350 0 4px, #2f2944 4px 8px); color: #cfc4f5; }
.sm-lane { position: relative; height: 32px; }
#sm-main { position: relative; flex: 0 0 56px; border-top: 1px solid var(--line); }
#sm-sound { position: relative; flex: 0 0 32px; border-top: 1px solid var(--line); }
.sm-item {
  position: absolute; top: 1px; height: 30px; border-radius: 6px; overflow: hidden; cursor: pointer; box-sizing: border-box;
  display: flex; align-items: center; gap: 4px; padding: 0 6px; font: 600 11px/1 system-ui, sans-serif; color: #0b0f16;
  outline: none; -webkit-tap-highlight-color: transparent;
}
.sm-item .sm-name { position: relative; z-index: 1; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
.sm-k-captions { background: #ffce4a; } .sm-k-text { background: #b79cff; } .sm-k-overlay, .sm-k-block { background: #5ac7ed; }
.sm-k-effect { background: #9be38a; } .sm-k-background { background: repeating-linear-gradient(135deg, #3a3350 0 5px, #2f2944 5px 10px); color: #cfc4f5; }
.sm-k-block { background: repeating-linear-gradient(135deg, #5ac7ed 0 5px, #4aa9cb 5px 10px); }
.sm-clip { top: 2px; height: 52px; color: #fff; text-shadow: 0 1px 2px rgba(0,0,0,.7); border: 1px solid rgba(0,0,0,.35); }
.sm-clip .sm-strip { position: absolute; left: 0; top: 0; height: 100%; pointer-events: none; }
.sm-snd { background: #2fae7a; color: #fff; }
.sm-item.sel { box-shadow: inset 0 0 0 2px #fff, 0 0 0 1px #000; z-index: 3; }
.sm-item:focus-visible { box-shadow: inset 0 0 0 2px var(--accent); }
.sm-hidden { opacity: .45; }
.sm-loading { background: repeating-linear-gradient(90deg, #26303f 0 12px, #2e3a4c 12px 24px) !important; color: #aeb8c8; }
.sm-pro { position: relative; z-index: 1; margin-left: auto; flex: 0 0 auto; font-size: 9px; padding: 1px 4px; border-radius: 3px; background: rgba(155,135,245,.9); color: #120c2a; }
.sm-nofoot { position: relative; z-index: 1; flex: 0 0 auto; font-size: 9px; padding: 1px 4px; border-radius: 3px; background: #2a1418; color: #ff8a8a; }
.sm-slot { position: absolute; top: 2px; height: 52px; border: 1px dashed #5a667a; border-radius: 6px; box-sizing: border-box; pointer-events: none; }
.sm-chip {
  position: absolute; top: -4px; transform: translateX(-50%); z-index: 4; min-width: 32px; height: 32px; padding: 0 6px;
  border-radius: 16px; font: 700 10px/1 system-ui, sans-serif; cursor: pointer;
}
.sm-chip-gap { background: #2a1f14; color: #ffb454; border: 1.5px solid #ffb454; }
.sm-chip-overlap { background: #2a1418; color: #ff6b6b; border: 1.5px solid #ff6b6b; }
.sm-add { position: absolute; top: 10px; width: 36px; height: 36px; border-radius: 10px; border: 1.5px dashed #8b97ab; background: transparent; color: #cfd6e2; font: 400 22px/1 system-ui, sans-serif; cursor: pointer; }
.sm-more { position: sticky; left: calc(100% - 40px); top: 0; float: right; margin-top: 4px; min-width: 32px; height: 24px; border-radius: 12px; background: #1d2533; color: #cfd6e2; font: 700 10px/24px system-ui, sans-serif; text-align: center; }
#sm-say { flex: 0 0 52px; display: flex; align-items: center; gap: 10px; padding: 0 12px; border-top: 1px solid var(--line); font: 600 12.5px/1.25 system-ui, sans-serif; color: #dfe6f0; box-sizing: border-box; }
#sm-say .sm-say-t { flex: 1 1 auto; min-width: 0; }
#sm-say .sm-say-b { flex: 0 0 auto; min-width: 44px; min-height: 32px; padding: 0 12px; border-radius: 9px; border: 0; background: var(--accent); color: #06231d; font: 700 12px/1 system-ui, sans-serif; cursor: pointer; }
.sm-vh { position: absolute !important; width: 1px; height: 1px; overflow: hidden; clip: rect(0 0 0 0); white-space: nowrap; }
@media (min-width: 701px) { #sm-say { flex-basis: 40px; } }
/* THE PHONE: FIXED ROWS, NOT A GROWING COLUMN (DESIGN §8.2, §15.1). Ruler 18 + sections 64 + clip row 56 + sound 32 = 170, then
   #sm-say's 52 directly under them; a selection's panel docks under #sm-say (js/mobile.js), so a line is never hidden by it and
   no row moves by a pixel when something is selected or cleared (T19). The stage is clamped in Simple so that panel keeps
   ≥ 200 px: 514 = top bar 52 + play bar 40 + 170 + 52 + 200. Below 694 px of height the 180 px floor wins and the panel gets
   less (measured 168 px at 380×667). Full keeps its 40svh stage. */
@media (max-width: 700px) {
  body.ed-simple { --stage-h: clamp(180px, calc(100svh - 514px - env(safe-area-inset-top, 0px) - env(safe-area-inset-bottom, 0px)), 40svh); }
  #sm-scroll { flex: 0 0 170px; }
  #sm-say { flex: 0 0 52px; border-bottom: 1px solid var(--line); }
  body.ed-simple #tl-centerline { bottom: auto; height: 170px; }   /* the playhead line spans the clip rows only, not #sm-say or the docked panel */
}
@media (min-width: 701px) { body.ed-simple #tl-centerline { bottom: 40px; } }   /* …and stops above PC's #sm-say */
```

**And the cog's third block (1.3.18), appended after it.** These rules are the prototype's, rendered in the real app at
v17.21 (COG-DESIGN §12, the pictures in `cog/`), with `.ed-why` and the shake added; **not run as shipped code**. Re-check
the pair's own class names against the tree first (`cv-pair`, `cv-side`, `cv-anchored`, `cv-up`, `cv-flying`, `cv-fr-big`,
`.cv-mini`, `.cv-mini-ico`, `.cv-mini-t`, `.export-card`, `.export-title`, `#cv-friends`, `#cv-mini`): every rule hangs on
`.cv-ed-on` or `#cv-editor`, which do not exist until the block is built.

```css
/* ═══ SIMPLE MODE, PHASE 1 — the ⚙ cog's third block, Editor (DESIGN.md §6.1; COG-DESIGN.md §3–§6) ════════════════════ */
/* ── width-free: show, style, state (all keyed on .cv-ed-on, set only while the Simple editor setting is on) ── */
#cv-editor { display: none; background: var(--panel); border: 1px solid var(--line); border-radius: 14px; box-shadow: 0 24px 70px rgba(0,0,0,.6); }
#canvas-dialog.cv-pair.cv-ed-on > #cv-editor { display: flex; flex-direction: column; overflow: hidden; position: relative; }
#canvas-dialog.cv-pair.cv-ed-on:not(.cv-ed-big) > #cv-editor { order: -2; }
#canvas-dialog.cv-pair.cv-ed-on:not(.cv-ed-big):not(.cv-flying) > #cv-editor > #cv-ed-body { display: none; }
#canvas-dialog.cv-pair.cv-ed-on:not(.cv-ed-big) > #cv-editor > #cv-ed-bar { display: flex; }
#canvas-dialog.cv-pair.cv-ed-big:not(.cv-flying) > #cv-editor > #cv-ed-bar { display: none; }
#canvas-dialog.cv-pair.cv-ed-big > #cv-editor { order: 1; }
#canvas-dialog.cv-pair.cv-ed-big:not(.cv-flying) > .export-card { padding: 0; }
#canvas-dialog.cv-pair.cv-ed-big:not(.cv-flying) > .export-card > :not(.cv-mini) { display: none; }
#canvas-dialog.cv-pair.cv-ed-big > .export-card > .cv-mini { display: flex; }
#cv-ed-bar { cursor: pointer; }
#cv-ed-body { display: flex; flex-direction: column; flex: 1 1 auto; min-height: 0; overflow-y: auto; padding: 20px 20px 16px; }
/* the switch: ONE button, both words, the current one in the knob */
.ed-sw { position: relative; flex: none; display: grid; grid-template-columns: 62px 18px 62px; align-items: center; height: 36px; padding: 0 3px;
  border-radius: 18px; border: 1px solid var(--line); background: var(--panel-2); color: var(--text-dim); font: 700 13px/1 inherit; cursor: pointer; }
.ed-sw::before { content: ''; position: absolute; inset: -7px -4px; }      /* a 50px-tall catch */
.ed-k { position: absolute; top: 3px; bottom: 3px; left: 3px; width: 62px; border-radius: 15px; background: var(--accent);
  transition: transform .22s cubic-bezier(.2,.8,.2,1); }
.ed-sw[data-mode="full"] .ed-k { transform: translateX(80px); }
.ed-l { position: relative; z-index: 1; text-align: center; transition: color .22s; }
.ed-x { position: relative; z-index: 1; text-align: center; font-size: 13px; opacity: .7; }
.ed-sw[data-mode="simple"] .ed-l-s, .ed-sw[data-mode="full"] .ed-l-f { color: #06231d; }
.ed-sw.big { grid-template-columns: 96px 22px 96px; height: 44px; border-radius: 22px; font-size: 15px; }
.ed-sw.big .ed-k { width: 96px; border-radius: 19px; }
.ed-sw.big[data-mode="full"] .ed-k { transform: translateX(118px); }
.ed-what { position: relative; flex: none; border: 1px solid var(--line); background: var(--panel-2); color: var(--text); font: 700 12px/1.15 inherit;
  border-radius: 12px; padding: 6px 10px; cursor: pointer; text-align: center; }
.ed-what::before { content: ''; position: absolute; inset: -6px; }
#cv-ed-bar .ed-gap { flex: 1; }
/* the explanation */
#cv-ed-body .export-title { margin-bottom: 12px; }
.ed-now { display: flex; align-items: center; gap: 12px; margin-bottom: 14px; }
.ed-now-t { font-size: 13px; color: var(--text-dim); }
.ed-opt { display: grid; grid-template-columns: 64px 1fr; column-gap: 12px; align-items: start; padding: 12px; border: 1px solid var(--line);
  border-radius: 12px; margin-bottom: 10px; background: var(--panel-2); }
.ed-opt svg { width: 64px; height: 34px; color: var(--text-dim); margin-top: 2px; }
.ed-opt b { display: flex; align-items: center; gap: 8px; font-size: 15px; color: var(--text); }
.ed-opt p { margin: 4px 0 0; font-size: 13px; line-height: 1.4; color: var(--text-dim); }
.ed-opt.here { border-color: color-mix(in srgb, var(--accent) 70%, transparent); }
.ed-opt.here svg { color: var(--accent); }
.ed-here { font-size: 11px; font-weight: 800; color: #06231d; background: var(--accent); border-radius: 8px; padding: 2px 7px; }
.ed-note { font-size: 12.5px; line-height: 1.4; color: var(--text-dim); margin: 4px 2px 0; }
.ed-why { font-size: 12.5px; color: #ffb454; min-height: 0; }
/* ── the phone ── */
@media (max-width: 700px) {
  #canvas-dialog.cv-pair.cv-ed-on > #cv-editor { width: min(420px, calc(100vw - 24px)); flex: none; }
  #cv-ed-bar .cv-mini-t { display: none; }   /* one markup for both widths (DESIGN §21 F11): the phone bar has no title */
  /* Canvas and Friends keep their exact place: the column is centred in a box one bar shorter at the bottom, and where it
     does not fit it starts at the top reserve (a safe centre: two growing spacers, not justify-content: safe center). */
  #canvas-dialog.cv-pair.cv-ed-on { justify-content: flex-start; padding-bottom: calc(12px + 76px + env(safe-area-inset-bottom)); }
  #canvas-dialog.cv-pair.cv-ed-on::before, #canvas-dialog.cv-pair.cv-ed-on::after { content: ''; flex: 1 1 0; min-height: 0; }
  #canvas-dialog.cv-pair.cv-ed-on::before { order: -10; margin-top: -10px; }   /* cancels the column gap the spacer adds */
  #canvas-dialog.cv-pair.cv-ed-on::after { order: 10; margin-bottom: -10px; }
  #canvas-dialog.cv-pair.cv-ed-on > .export-card,
  #canvas-dialog.cv-pair.cv-ed-on.cv-fr-big > #cv-friends,
  #canvas-dialog.cv-pair.cv-ed-on.cv-ed-big > #cv-editor {
    max-height: calc(100svh - 260px - env(safe-area-inset-top) - env(safe-area-inset-bottom));
  }
}
/* ── a PC: the small column (side by side) ── */
@media (min-width: 701px) {
  #canvas-dialog.cv-pair.cv-ed-on > #cv-editor { width: 360px; flex: none; }
  body.cv-anchored #canvas-dialog.cv-pair.cv-ed-on > #cv-editor { animation: cv-grow 160ms cubic-bezier(.2, .8, .3, 1); transform-origin: top right; }
  body.cv-anchored #canvas-dialog.cv-pair.cv-side.cv-ed-on { grid-auto-flow: row; row-gap: 10px; grid-template-rows: 1fr auto;
    grid-template-columns: 176px 360px; grid-template-areas: "ed cv" "fr cv"; }
  body.cv-anchored #canvas-dialog.cv-pair.cv-side.cv-ed-on.cv-fr-big { grid-template-columns: 360px 176px; grid-template-areas: "fr ed" "fr cv"; }
  body.cv-anchored #canvas-dialog.cv-pair.cv-side.cv-ed-on.cv-ed-big { grid-template-columns: 360px 176px; grid-template-areas: "ed fr" "ed cv"; }
  body.cv-anchored:not(.cv-up) #canvas-dialog.cv-pair.cv-side.cv-ed-on { grid-template-rows: auto 1fr; grid-template-areas: "fr cv" "ed cv"; }
  body.cv-anchored:not(.cv-up) #canvas-dialog.cv-pair.cv-side.cv-ed-on.cv-fr-big { grid-template-areas: "fr cv" "fr ed"; }
  body.cv-anchored:not(.cv-up) #canvas-dialog.cv-pair.cv-side.cv-ed-on.cv-ed-big { grid-template-areas: "ed cv" "ed fr"; }
  #canvas-dialog.cv-pair.cv-side.cv-ed-on > .export-card { grid-area: cv; }
  #canvas-dialog.cv-pair.cv-side.cv-ed-on > #cv-friends { grid-area: fr; }
  #canvas-dialog.cv-pair.cv-side.cv-ed-on > #cv-editor { grid-area: ed; }
  #canvas-dialog.cv-pair.cv-side.cv-ed-on:not(.cv-ed-big) > #cv-editor { width: 176px; }
  #canvas-dialog.cv-pair.cv-side.cv-ed-big > .export-card { width: 176px; }
  body.cv-anchored.cv-up #canvas-dialog.cv-pair.cv-side.cv-ed-on:not(.cv-ed-big) > #cv-editor { align-self: end; }
  body.cv-anchored:not(.cv-up) #canvas-dialog.cv-pair.cv-side.cv-ed-on:not(.cv-ed-big) > #cv-editor { align-self: start; }
  #canvas-dialog.cv-pair.cv-side #cv-ed-bar { flex-wrap: wrap; }
  #canvas-dialog.cv-pair.cv-side #cv-ed-bar .ed-sw { width: 148px; grid-template-columns: 58px 18px 58px; }
  #canvas-dialog.cv-pair.cv-side #cv-ed-bar .ed-k { width: 58px; }
  #canvas-dialog.cv-pair.cv-side #cv-ed-bar .ed-sw[data-mode="full"] .ed-k { transform: translateX(76px); }
  #canvas-dialog.cv-pair.cv-side #cv-ed-bar .ed-what { align-self: stretch; white-space: nowrap; padding: 8px 6px; }
  #canvas-dialog.cv-pair.cv-side #cv-ed-bar { gap: 10px; }
  .ed-head { display: flex; align-items: center; gap: 10px; }
  #canvas-dialog.cv-pair.cv-side #cv-ed-bar .ed-gap { display: none; }
  /* stacked fall-back: the small ones sit away from the button */
  body.cv-anchored:not(.cv-up) #canvas-dialog.cv-pair.cv-ed-on:not(.cv-side):not(.cv-ed-big) > #cv-editor { order: 2; }
  body.cv-anchored:not(.cv-up) #canvas-dialog.cv-pair.cv-ed-on.cv-ed-big:not(.cv-side) > #cv-editor { order: -3; }
}
@media (prefers-reduced-motion: reduce) { .ed-k, .ed-l { transition: none; } body.cv-anchored #canvas-dialog.cv-pair.cv-ed-on > #cv-editor { animation: none; } }
.ed-why:empty { display: none; }
```

### 5.6 Tests

```js
  /* ═══ SIMPLE MODE, PHASE 1 STEP 1.3 — THE VIEW HE HOLDS: the switch (through the cog's one door), the read-only Simple timeline ═══
     1 Oct: re-anchored to the cog and the guard; NOT RE-RUN. The cog block's own tests are §5.6b. */

  /* A project on screen with three clips (real media records), a title and a song; everything put back.
     `fn(ctx)` gets the layers and a commit counter. History commits are COUNTED, not stubbed away, so "no undo step" is real. */
  async function smView(fn, opts) {
    opts = opts || {};
    const sleep = ms => new Promise(r => setTimeout(r, ms));
    const wasHome = !!(FM.home && FM.home.isOpen && FM.home.isOpen());
    if (wasHome) FM.home.close();
    const saved = { scene: FM.scene, time: FM.time, commit: FM.history.commit, save: FM.storage.save, zoom: FM.timeline.getZoom() };   // 1 Oct: no Settings preview (D22 A); under D22 B also save and set 'simpleEditor' here
    /* The switch remembers the editor on THIS device's card for the open project (FM.editor.set → the index entry's
       `editor`). The suite's own project is that project, so the card is put back exactly as found, or the next test
       would open in Simple. */
    const pid0 = FM.storage.openProjectId ? FM.storage.openProjectId() : null;
    const card0 = (FM.projects.list() || []).find(p => p.id === pid0);
    const ed0 = card0 ? card0.editor : undefined;
    /* the switch also writes this device's fm.editor.last and, on a first arrival in Simple, fm.editor.hint: put both back */
    const ls0 = {}; ['fm.editor.last', 'fm.editor.hint'].forEach(k => { try { ls0[k] = localStorage.getItem(k); } catch (e) {} });
    let commits = 0;
    FM.history.commit = function () { commits++; };
    FM.storage.save = function () {};
    const g = smRig(1080, 1920);
    const c1 = g.clip('smv1', 0, 4, { nw: 1080, nh: 1920 }), c2 = g.clip('smv2', 4, 3, { nw: 1080, nh: 1920 }), c3 = g.clip('smv3', 8, 4, { nw: 1080, nh: 1920 });
    const title = g.text('smvT', 1, 2, 'Beach day');
    const song = g.clip('smvS', 0, 12, { nw: 0, audioOnly: true });
    FM.scene = g.scene([title, c3, c2, c1, song]);
    FM.scene.project.duration = 12;
    FM.time = 2;
    try {
      FM.refreshAll(); await sleep(60);
      return await fn({ c1: c1, c2: c2, c3: c3, title: title, song: song, commits: () => commits, sleep: sleep });
    } finally {
      try { if (FM.editor) FM.editor.apply('full', { force: true }); } catch (e) {}
      try {
        const idx = FM.projects.list() || [], c = idx.find(p => p.id === pid0);
        if (c && c.editor !== ed0) { if (ed0 === undefined) delete c.editor; else c.editor = ed0; FM.projects.saveIndex(idx); }
      } catch (e) {}
      Object.keys(ls0).forEach(k => { try { if (ls0[k] === null) localStorage.removeItem(k); else localStorage.setItem(k, ls0[k]); } catch (e) {} });
      FM.history.commit = saved.commit; FM.storage.save = saved.save;
      FM.scene = saved.scene; FM.time = saved.time;
      g.done();
      try { FM.timeline.setZoom(saved.zoom); FM.refreshAll(); } catch (e) {}
      if (wasHome && !FM.home.isOpen()) FM.home.open();
      await sleep(30);
    }
  }
  function smVis(el) { return !!el && el.getClientRects().length > 0 && getComputedStyle(el).visibility !== 'hidden'; }
  function smNeedEditor() { if (!FM.editor || !FM.simpleTimeline) throw new Error('FM.editor / FM.simpleTimeline are missing — js/editor-mode.js or js/simple-timeline.js did not load'); }

  /* D22 B ONLY: build this test only if he picks a Settings gate. Under D22 A (recommended) there is no row, and cog T7–T9
     (§5.6b) test the block instead. */
  test('simple P1 · the Settings row: off by default, its own group right above Work with friends, and off hides every door', { item: '980' }, async function () {
    const sleep = ms => new Promise(r => setTimeout(r, ms));
    const was = FM.settings.get('simpleEditor');
    try {
      FM.settings.set('simpleEditor', false);
      FM.settings.open(); await sleep(0);
      const grp = document.getElementById('set-simple');
      if (!grp) throw new Error('Settings has no Simple editor row (#set-simple)');
      const label = grp.querySelector('.set-label'), hint = grp.querySelector('.set-hint'), sw = grp.querySelector('[role=switch]');
      if (!label || label.textContent !== 'Simple editor') throw new Error('the row is not called "Simple editor": ' + (label && label.textContent));
      if (!hint || !/See any project as clips/.test(hint.textContent) || /Labs|preview|session|still being tested/i.test(grp.textContent)) throw new Error('the hint is wrong, or says Labs / preview / session / still being tested (#967: that phrase belongs to Work with friends alone): ' + (hint && hint.textContent));
      if (grp.querySelector('.set-grouptitle')) throw new Error('the Simple editor group must be untitled');
      const friends = document.getElementById('set-friends');
      if (friends && grp.nextElementSibling !== friends) throw new Error('the Simple editor group is not directly above Work with friends');
      if (!sw || sw.getAttribute('aria-checked') !== 'false') throw new Error('the switch is not off by default');
      sw.click(); await sleep(0);
      if (FM.settings.get('simpleEditor') !== true || !document.body.classList.contains('sm-on')) throw new Error('turning it on did not set the preview (' + FM.settings.get('simpleEditor') + ')');
      let stored = null; try { stored = JSON.parse(localStorage.getItem('fm.settings') || '{}').simpleEditor; } catch (e) {}
      if (stored !== true) throw new Error('the switch is not saved — it would reset on the next launch (the #688 trap): ' + stored);
      sw.click(); await sleep(0);
      if (document.body.classList.contains('sm-on') || document.body.classList.contains('ed-simple')) throw new Error('turning it off left the Simple classes on');
      FM.settings.close(); await sleep(300);
      ['btn-sm-split', 'sm-timeline', 'cv-editor'].forEach(id => { if (smVis(document.getElementById(id))) throw new Error('#' + id + ' is visible with the gate OFF'); });
    } finally { FM.settings.set('simpleEditor', !!was); if (FM.settings.isOpen()) FM.settings.close(); await sleep(300); }
  });

  test('simple P1 · T8 the switch writes nothing, keeps time, selection and zoom, and every clip keeps its x', { item: '980' }, async function () {
    smNeedEditor();
    /* 1 Oct, RE-ANCHORED, NOT RE-RUN: through FM.editor.request (the cog's one door); no ⇄, no E, no preview flip. */
    await atWideWidth(async function () {
      await smView(async function (v) {
        FM.selectLayer(v.c2.id);
        const doc0 = JSON.stringify(FM.scene), hist0 = JSON.stringify(FM.history._steps()), z0 = FM.timeline.getZoom(), t0 = FM.time, commits0 = v.commits();
        FM.selectLayer(null);
        const fullX = {};
        [v.c1, v.c2, v.c3].forEach(c => { const e = document.querySelector('#tl-tracks .clip[data-id="' + c.id + '"]'); fullX[c.id] = e ? e.getBoundingClientRect().left : NaN; });
        FM.selectLayer(v.c2.id);
        if (!(await FM.editor.request('simple'))) throw new Error('the switch refused with nothing live');
        await v.sleep(40);
        if (!document.body.classList.contains('ed-simple') || !smVis(document.getElementById('sm-timeline'))) throw new Error('Simple is not on screen after the switch');
        if (JSON.stringify(FM.scene) !== doc0) throw new Error('the switch wrote to the document');
        if (v.commits() !== commits0 || JSON.stringify(FM.history._steps()) !== hist0) throw new Error('the switch took an undo step');
        if (FM.time !== t0 || FM.timeline.getZoom() !== z0 || FM.scene.selectedId !== v.c2.id) throw new Error('the switch lost the time, zoom or selection');
        if (document.body.classList.contains('m-editing') || document.body.classList.contains('sel-mode')) throw new Error('Full’s selection classes are on in Simple');
        FM.selectLayer(null); await v.sleep(20);
        const off = [];
        [v.c1, v.c2, v.c3].forEach(c => {
          const e = document.querySelector('#sm-main .sm-item[data-id="' + c.id + '"]');
          const x = e ? e.getBoundingClientRect().left : NaN;
          if (!(Math.abs(x - fullX[c.id]) <= 1)) off.push(c.id + ': Full ' + Math.round(fullX[c.id]) + ' vs Simple ' + Math.round(x));
        });
        if (off.length) throw new Error('clips moved across the switch: ' + off.join(' · '));
        if (document.activeElement === document.body) throw new Error('focus fell to <body> after the switch');
        /* back to Full through the same door: still nothing written; the switch's own words are cog T7/T10's (§5.6b) */
        if ((await FM.editor.request('full')) !== true || document.body.classList.contains('ed-simple')) throw new Error('the switch did not go back to Full');
        if (JSON.stringify(FM.scene) !== doc0 || v.commits() !== commits0) throw new Error('switching back wrote to the document or took a step');
        /* during an export the one door refuses (its line shows inside the cog block, cog T13) */
        FM._exporting = true;
        try { if ((await FM.editor.request('simple')) !== false || document.body.classList.contains('ed-simple')) throw new Error('the switch went through during an export'); }
        finally { FM._exporting = false; }
        /* NO E (DESIGN §0.4 B14): the key does nothing new in Full */
        window.dispatchEvent(new KeyboardEvent('keydown', { code: 'KeyE', key: 'e', bubbles: true }));
        await v.sleep(20);
        if (document.body.classList.contains('ed-simple')) throw new Error('E switched editor — Full must gain no key'); 
      });
    }, 1280);
  });

  test('simple P1 · T19 on a phone at 380 the Simple row reads ⋯ ✂ (gap) |◀ with |◀ where Full has it, the clip row is hit-testable, and ✎ hides by visibility', { item: '980' }, async function () {
    smNeedEditor();
    /* 1 Oct, RE-ANCHORED, NOT RE-RUN: no ⇄ on the play bar (D18 rewritten); ◐ keeps slot 3 invisible. */
    await atPhoneWidth(async function () {
      await smView(async function (v) {
        /* Full's own left group first: its four buttons sit flush, and at the narrowest widths they already overlap by a
           sub-pixel or so. Simple's row may overlap no more than Full's does at the same width (the control). */
        const fids = ['btn-opts', 'btn-layermenu', 'btn-addside', 'btn-tostart'];
        const fr = fids.map(id => document.getElementById(id).getBoundingClientRect());
        let fullOver = 0; for (let i = 1; i < fr.length; i++) fullOver = Math.max(fullOver, fr[i - 1].right - fr[i].left);
        FM.editor.set('simple'); await v.sleep(60);
        /* A shake (a refused switch in an earlier test) or the crossfade is a TRANSFORM, which getBoundingClientRect includes — finish
           every running animation so this measures the layout, not a frame of one. */
        document.getAnimations().forEach(a => { try { a.finish(); } catch (e) {} });
        const ids = ['btn-opts', 'btn-sm-split', 'btn-addside', 'btn-tostart'];   // ◐ (#btn-addside) holds slot 3, invisible (D18 A)
        const xs = ids.map(id => { const e = document.getElementById(id); return e && e.getClientRects().length ? e.getBoundingClientRect().left : NaN; });
        if (xs.some(isNaN) || !(xs[0] < xs[1] && xs[1] < xs[2] && xs[2] < xs[3])) throw new Error('the left group is not ⋯ ✂ (gap) |◀ in order: ' + ids.map((id, i) => id + '@' + Math.round(xs[i])).join(' '));
        ['btn-layermenu', 'btn-addside'].forEach(id => { if (smVis(document.getElementById(id))) throw new Error('#' + id + ' (Full’s) is visible in Simple'); });
        if (Math.abs(document.getElementById('btn-tostart').getBoundingClientRect().left - fr[3].left) > 1) throw new Error('|◀ moved between Full and Simple — D18 A keeps it in its slot');
        const r = ids.map(id => document.getElementById(id).getBoundingClientRect());
        for (let i = 1; i < r.length; i++) if (r[i - 1].right - r[i].left > fullOver + 0.5) throw new Error(ids[i] + ' overlaps ' + ids[i - 1] + ' by ' + (r[i - 1].right - r[i].left).toFixed(2) + ' px, more than Full’s own row does (' + fullOver.toFixed(2) + ' px)');
        const sp = document.getElementById('btn-sm-split');
        if (sp.getAttribute('aria-disabled') !== 'true' || !(parseFloat(getComputedStyle(sp).opacity) < 0.6)) throw new Error('✂ is not dimmed and aria-disabled in Phase 1');
        const clip = document.querySelector('#sm-main .sm-item[data-id="' + v.c2.id + '"]');
        if (!clip) throw new Error('clip 2 is not drawn in the Simple clip row');
        const cr = clip.getBoundingClientRect(), hit = document.elementFromPoint(Math.min(cr.left + 20, window.innerWidth - 10), cr.top + cr.height / 2);
        if (!hit || !hit.closest || !hit.closest('#sm-timeline')) throw new Error('a tap on the clip row lands on ' + (hit && (hit.id || hit.className)) + ', not the Simple timeline');
        const say = document.getElementById('sm-say'), sr = say.getBoundingClientRect();
        if (Math.round(sr.height) !== 52 || sr.bottom > window.innerHeight + 0.5) throw new Error('#sm-say is not a 52 px row on screen: ' + Math.round(sr.height) + ' px, bottom ' + Math.round(sr.bottom) + ' of ' + window.innerHeight);
        const song = document.querySelector('#sm-sound .sm-item[data-id="' + v.song.id + '"]');
        if (!song || !smVis(song)) throw new Error('the song is not in the Sound row');
        const title = document.querySelector('#sm-sections .sm-item[data-id="' + v.title.id + '"]');
        if (!title) throw new Error('the title is not in a section above the clips');
        if (!(title.getBoundingClientRect().bottom <= cr.top + 0.5)) throw new Error('the title is not ABOVE the clip row (higher on screen = in front)');
        /* NOTHING MOVES ON SELECT, AND THE PANEL DOCKS UNDER THE SIMPLE TIMELINE (DESIGN T19, Phase 1 clauses): the clip row, the
           sound row and #sm-say keep their y to the pixel, and today's panel starts below #sm-say with room to use. */
        const tops0 = ['sm-main', 'sm-sound', 'sm-say'].map(id => document.getElementById(id).getBoundingClientRect().top);
        FM.selectLayer(v.c2.id); await v.sleep(120);
        document.getAnimations().forEach(a => { try { a.finish(); } catch (e) {} });   // the panel RISES into place (a transition): measure where it lands
        const tops1 = ['sm-main', 'sm-sound', 'sm-say'].map(id => document.getElementById(id).getBoundingClientRect().top);
        if (tops0.some((t, i) => Math.abs(t - tops1[i]) > 0.5)) throw new Error('selecting a clip moved the Simple rows (clip row, sound, #sm-say tops ' + tops0.map(Math.round) + ' → ' + tops1.map(Math.round) + ')');
        const insp = document.getElementById('inspector-panel'), ir = insp && insp.getBoundingClientRect(), sayB = document.getElementById('sm-say').getBoundingClientRect().bottom;
        if (!ir || ir.height < 1) throw new Error('selecting a clip opened no panel');
        if (ir.top < sayB - 0.5) throw new Error('the docked panel (top ' + Math.round(ir.top) + ') covers the Simple timeline or #sm-say (bottom ' + Math.round(sayB) + ')');
        if (window.innerHeight - ir.top < 150) throw new Error('the docked panel has only ' + Math.round(window.innerHeight - ir.top) + ' px (under 150) — the stage clamp did not leave it room (panel top ' + Math.round(ir.top) + ', #sm-say bottom ' + Math.round(sayB) + ')');
        if (document.body.classList.contains('m-editing')) throw new Error('m-editing is on in Simple');
        const notes = document.getElementById('m-notes');
        if (notes && getComputedStyle(notes).visibility !== 'hidden') throw new Error('✎ still shows with something selected in Simple (#171)');
        if (notes && getComputedStyle(notes).display === 'none') throw new Error('✎ was hidden with display:none — the bar would slide');
        const c2b = document.querySelector('#sm-main .sm-item[data-id="' + v.c2.id + '"]');
        if (!c2b || !c2b.classList.contains('sel')) throw new Error('the selected clip is not marked in the Simple row');
      });
    }, 380);
  });

  test('simple P1 · the Phase 1 lines: Delete on a main clip, ✂, S and a seam chip each say their line with Open in Full and change nothing', { item: '980' }, async function () {
    smNeedEditor();
    await smView(async function (v) {
      FM.editor.set('simple'); await v.sleep(40);
      const say = document.getElementById('sm-say');
      const n0 = FM.scene.layers.length;
      FM.selectLayer(v.c1.id);
      window.dispatchEvent(new KeyboardEvent('keydown', { code: 'Backspace', key: 'Backspace', bubbles: true }));
      await v.sleep(10);
      if (FM.scene.layers.length !== n0) throw new Error('Delete on a main clip deleted it in Phase 1 (' + n0 + ' → ' + FM.scene.layers.length + ')');
      if (!/Deleting clips comes next/.test(say.textContent)) throw new Error('Delete on a main clip said nothing in #sm-say: "' + say.textContent + '"');
      const b = say.querySelector('button');
      if (!b || b.textContent !== 'Open in Full') throw new Error('the line has no Open in Full button');
      const br = b.getBoundingClientRect();
      if (br.width < 44 || br.height < 32) throw new Error('Open in Full is ' + Math.round(br.width) + '×' + Math.round(br.height) + ', under 44×32');
      /* CONTROL: Delete on something that is NOT a main clip is today's delete */
      FM.selectLayer(v.title.id);
      window.dispatchEvent(new KeyboardEvent('keydown', { code: 'Backspace', key: 'Backspace', bubbles: true }));
      await v.sleep(10);
      if (FM.scene.layers.some(l => l.id === v.title.id)) throw new Error('CONTROL: Delete on a title did not delete it — the key is being swallowed for everything');
      FM.selectLayer(v.c1.id); FM.time = 1;
      window.dispatchEvent(new KeyboardEvent('keydown', { code: 'KeyS', key: 's', bubbles: true }));
      await v.sleep(10);
      if (FM.scene.layers.filter(l => l.type === 'video').length !== 4) throw new Error('S split a clip in Phase 1');
      if (!/Splitting comes in the next update/.test(say.textContent)) throw new Error('S said nothing: "' + say.textContent + '"');
      say.textContent = '';
      document.getElementById('btn-sm-split').click();
      if (!/Splitting comes in the next update/.test(say.textContent)) throw new Error('✂ said nothing: "' + say.textContent + '"');
      const chip = document.querySelector('#sm-main .sm-chip-gap');
      if (!chip) throw new Error('the 1 s gap between clips 2 and 3 has no seam chip');
      const cr = chip.getBoundingClientRect();
      if (cr.width < 32 || cr.height < 32) throw new Error('the seam chip is ' + Math.round(cr.width) + '×' + Math.round(cr.height) + ', under 32×32');
      if (!/second gap/.test(chip.getAttribute('aria-label') || '')) throw new Error('the seam chip has no accessible name: ' + chip.getAttribute('aria-label'));
      chip.click();
      if (!/Closing gaps comes in the next update/.test(say.textContent)) throw new Error('the seam chip said nothing: "' + say.textContent + '"');
      say.querySelector('button').click(); await v.sleep(20);
      if (document.body.classList.contains('ed-simple')) throw new Error('Open in Full did not switch to Full');
      if (v.commits() !== 1) throw new Error('only the title delete should have committed, got ' + v.commits() + ' commits');
    });
  });


  /* T21 (DESIGN §8.8): the Full doors that edit the layer stack Simple does not show. One helper, two tests (one per width), so a
     width change inside one test cannot leave the transport half-rebuilt for the other. */
  async function smT21(w, ids, phone) {
    smNeedEditor();
    /* `rendered`: it has a box on screen (so a button inside a hidden group counts as hidden). The two view-menu items live in a
       menu that is closed in both editors, so for them (marked *) the item's OWN display is what Simple must turn off. */
    const shown = key => {
      const own = key.charAt(key.length - 1) === '*', e = document.getElementById(own ? key.slice(0, -1) : key);
      if (!e) return false;
      return own ? getComputedStyle(e).display !== 'none' : (e.getClientRects().length > 0 && getComputedStyle(e).visibility !== 'hidden');
    };
    await (phone ? atPhoneWidth : atWideWidth)(async function () {
      await smView(async function (v) {
        FM.selectLayer(v.c2.id); FM.refreshAll(); await v.sleep(60);
        // CONTROL: in Full these doors exist and are displayed (on the phone, with a clip selected)
        const inFull = ids.filter(id => !shown(id));
        if (inFull.length) throw new Error('CONTROL at ' + w + ': in Full these are not displayed, so their absence in Simple would prove nothing: ' + inFull.join(', '));
        FM.editor.set('simple'); await v.sleep(60);
        FM.selectLayer(v.c2.id); await v.sleep(40);
        const leak = ids.filter(shown);
        if (leak.length) throw new Error('at ' + w + ' px these Full doors show in Simple: ' + leak.join(', ') + ' — each one edits the layer stack Simple does not show');
      });
    }, w);
  }
  test('simple P1 · T21 at 380 in Simple none of Full’s layer doors show — ⧉, ◐, Layers, Add camera, the phone’s copy and delete — with one clip selected', { item: '980' }, async function () {
    await smT21(380, ['btn-layermenu', 'btn-addside', 'vb-layers*', 'vb-camera*', 'm-dup', 'm-del'], true);
  });
  test('simple P1 · T21 at 1280 in Simple the PC layer-action group (delete, parent, more) does not show with one clip selected', { item: '980' }, async function () {
    await smT21(1280, ['btn-del-layer', 'btn-parent', 'btn-more-layer'], false);
  });

  /* 1 Oct: the D2-B test (Full's ⋯ strip carries a Simple editor item) is WITHDRAWN with the item (DESIGN.md §0.4 V1).
     Its opposite now holds: FU1 checks that Full's ⋯ strip is HEAD's, element for element and pixel for pixel. */

  test('simple P1 · off means off: a project this device never switched opens in Full and runs nothing of the switch — no text-editor flush', { item: '980' }, function () {
    smNeedEditor();
    /* 1 Oct, RE-ANCHORED, NOT RE-RUN. "Off" is now "this device never chose Simple for the project" (DESIGN.md §7.2), and the
       control seeds the project's index card with editor 'simple' instead of project.sm.home, which homeFor no longer reads
       (DESIGN.md §0.4 B27). syncProject() runs inside EVERY timeline rebuild and a new project id reaches it on every open; the
       switch's apply() commits the text editor before it swaps. Spied, not stubbed away: the spy counts, and the control proves
       the same path does run when this device chose Simple. */
    const te = FM.textEdit, pid0 = FM.storage.openProjectId, list0 = FM.projects.list, P = FM.scene.project, had = 'sm' in P, sm0 = P.sm;
    const act0 = te && te.isActive, stop0 = te && te.stop;
    if (!te) throw new Error('setup: FM.textEdit is missing');
    let stops = 0, n = 0;
    try {
      te.isActive = function () { return true; }; te.stop = function () { stops++; };
      FM.storage.openProjectId = function () { return 'sm_offmeansoff_' + n; };
      FM.projects.list = function () { return [{ id: 'sm_offmeansoff_1' }, { id: 'sm_offmeansoff_2', editor: 'simple' }]; };
      P.sm = { home: 'simple' };   // a Simple-made file: it must NOT put a device that never chose Simple into Simple
      n = 1; FM.timeline.rebuild();
      if (stops) throw new Error('a project this device never switched flushed the text editor ' + stops + ' time(s) on open — the switch ran in Full');
      if (FM.editor.mode() !== 'full' || document.body.classList.contains('ed-simple')) throw new Error('project.sm.home "simple" put a device that never chose Simple into Simple (DESIGN §0.4 B27)');
      /* CONTROL: this device chose Simple for project 2 — the same open DOES switch, committing the text editor first */
      n = 2; FM.timeline.rebuild();
      if (FM.editor.mode() !== 'simple' || !stops) throw new Error('CONTROL: a project whose card says Simple opened in ' + FM.editor.mode() + ' with ' + stops + ' flush(es) — the spy is not on the path');
    } finally {
      te.isActive = act0; te.stop = stop0; FM.storage.openProjectId = pid0; FM.projects.list = list0;
      if (had) P.sm = sm0; else delete P.sm;
      try { FM.editor.apply('full', { force: true, quiet: true }); } catch (e) {}
      try { FM.timeline.rebuild(); } catch (e) {}
    }
  });
```

**Existing tests 1.3 could break:** tests that count the children of `#transport .t-left` (✂ exists in the DOM, hidden in
Full); tests that walk `#canvas-dialog`'s children or measure the pair at 380×800 with Friends open (the third block's
measured cost, DESIGN §0.4); tests of `syncKeyRail`'s exact condition; under D22 B only, tests that walk every `.set-group`.
`#opt-bar` gains nothing (the ⋯ item is withdrawn).

### 5.6b The cog block's tests (DESIGN §6.4, COG-DESIGN §10) — to write at build time, each failing first

Name them `980 cog T1` … `980 cog T15`, append them after §5.6's, run each at `--width 1280` and `--width 380`, and prove
each with `prove.sh` (its source reverted, it must fail). None is written yet.

| # | Asserts | Fails on |
|---|---|---|
| T1 | 10 switches both ways through the cog leave history depth, autosave calls, collab ops and every storage key unchanged except this device's card `editor` and `fm.editor.last`; no `sm` key moves; `fm.cvPair` unchanged | a commit, save, op or adoption sneaking into a switch |
| T2 | every canvas tool in collab-presence's `LEASED` table (`js/collab-presence.js:193-203`) is in `FM.editorGuardLists` (holds / commits / quiet / stays; `draw` as both `pen` and `draw-freehand`), and the voice recorder is in `REFUSED`; plus: a pen with 2 points + "Switch anyway" switches and leaves no pen open; a pen with 4 points + "Finish drawing and switch" adds one path layer (one step) and switches; Sketching open + a switch leaves it open with its own ↷ intact; the recorder open → refused with the line inside the block (DESIGN §21 F1, F2, F4) | a new tool the guard has never heard of; "Switch anyway" doing nothing; a wrong Done selector |
| T3 | a changed crop box + switch → `FM.ask` with §6.4's words; Stay leaves the crop open with the same box and the editor unchanged; "Apply crop and switch" makes exactly one undo step, ↶ restores the old crop, and the editor switched | the silent discard of the 29 Sep `apply()` loop (M14) |
| T4 | an untouched crop box + switch → no warning; the crop closes; no step | over-warning |
| T5 | Redo has steps + typing in the text editor → the redo warning; Redo has steps and nothing open → no warning, and ↷ still works after switching there and back; **the same two in a live session (`withFakeNet921`), where ↷ is `FM.collab.canRedo()`** (§21 F5) | the redo tail lost silently, alone or with a friend in |
| T6 | every other door is guarded: a project opening with a crop changed (and, under D22 B, the Settings row going off) refuses or asks, never discards | a second door |
| T7 | with the block small, every element of `#canvas-dialog` other than `#cv-editor` has HEAD's computed style (FU6 does the rects) | a rule leaking into the old two blocks |
| T8 | Canvas and Friends rects equal HEAD's with the block small at every FU6 size (DESIGN §0.4.5); the 380×800 Friends-open, 380×667, 375×553 and 320×568 costs equal DESIGN §0.4's numbers ±1 px; the Editor's switch is fully on screen and `elementFromPoint` finds it at every size (red at 956×440, 932×430, 844×390 until D24 is built); a window crossing 700 px with the cog open leaves the bar the height of its neighbours (§21 F11) | the pair moving; an unreachable switch; a bar built for the other width |
| T9 | all six swaps S1↔S2↔S3 land the right big block, `aria-expanded` right, the flight lands; `fm.cvPair` remembered for Canvas / Friends and never written for the Editor; closed on the Editor block, the cog reopens on the last of Canvas / Friends | a third case missing from one pair function; the explanation coming back unasked |
| T10 | a tap on the switch does not open the block; the bar elsewhere and "What should you use?" do; the switch's `aria-label` names the action | a switch tap opening the explanation |
| T11 | after a switch the cog closes (D23 A); with an unapplied aspect pick, a **background pick alone**, or Friends big, it stays open and the pick / the Friends block is still there | a quick switch throwing away canvas picks (the background is what `cvSummary()` misses, §21 F3) |
| T12 | every block on screen, Apply reachable, no sideways scroll, every control ≥ 44 px to hit, at 320×568, 375×553, 380×667, 380×800, 440×956 and 956×440 | phone fit, upright and sideways |
| T13 | an export running → the switch refuses with its line inside the block (`elementFromPoint` finds it, not a toast under z 100); a HOLDS tool whose Done leaves it live → "Finish or close the open tool first" in the block, never a silent no-op (§21 F1) | an invisible refusal |
| T14 | a Viewer in a live session (`withFakeNet921`) can switch, and no op is sent | switching treated as an edit |
| T15 | reduced motion: the knob and the swap are instant | motion for someone who asked for none | §8 has what the whole suite said.

### 5.7 Where each decision lives (for a non-recommended pick)

- **D2** is settled (his 1 Oct words: the cog). Nothing in the code chooses it.
- **Answered 1 Oct:** D1 A (the words in `js/spine-words.js` already say Simple / Full), D9 A, D15 A, D16 A (rows 1 and 5 as
  marked recommended). Nothing to change for them.
- **D18 B** (⋯ · ✂ · |◀ packed): `body.ed-simple #btn-addside { display: none !important; }` at every width; nothing else.
- **D16 row 1**: `ED_ICON` and `ED_PIC` in 1.3.18. **Row 5**: `.sm-chip-gap` / `.sm-chip-overlap`.
- **D22 B** (a Settings gate): `GATED = true` in `js/editor-mode.js`, steps 1.3.7–1.3.9, and the Settings row test.
- **D23 B** (the cog stays open after a switch): delete the `setTimeout(… cvClose …)` line in 1.3.18's switch handler.

### 5.8 The screens (checked at 380×667 and 1280×800, through the real app)

**1 Oct: these pictures are of the 29 Sep version** (⇄ on the play bar, the back button, the ⋯ item, the Settings row, all
withdrawn); retake the sheet after 1.3 ships with the shots listed under the recipe. Taken with `tools/shot.py` against the
finished scratch copy, a four-photo project (a 1.2 s gap before photo 4), a title and a song. Saved outside the repo, in the
session scratchpad's `simple-mode-qa/`:

| File | What it shows |
|---|---|
| `p1-380-idle.png` | Simple, nothing selected: ⋯ · ✂ (dimmed) · ⇄ · \|◀; the title above the clip row, the song below, `#sm-say` blank; the stage clamped to 180 px |
| `p1-380-selected.png` | clip 2 selected: today's panel docked under `#sm-say`, every Simple row where it was |
| `p1-380-deleteline.png` | Backspace on clip 1: *"Deleting clips comes next"* with **Open in Full**, above the docked panel |
| `p1-380-gapchip.png` | the 1.2 s gap chip on the cut, tapped: *"Closing gaps comes in the next update"* |
| `p1-380-settings.png` | Settings: the **Simple editor** row, its own group, directly above Work with friends |
| `p1-380-fullback.png` | Full after Simple → Full: the back-to-Simple button in ◐'s slot (D2-B) |
| `p1-380-fullmenu.png` | Full, ⋯ open: the Simple editor item at the top of the strip |
| `p1-1280-idle.png`, `p1-1280-selected.png`, `p1-1280-deleteline.png`, `p1-1280-fullback.png` | the same on PC: ‹ ✂ \|◀ in the play bar (no ⇄: the switch is the cog's, D2), today's panel in the band, `#sm-say` along the bottom |

**To take the sheet again after 1.3 ships (nothing to invent; re-checked by the review on the finished copy, 29 Sep).** Save
this as `sm-sheet.js` in your scratchpad (never the repo). Its first line is prepended per shot:

```js
/* The §5.8 screenshot sheet's project, built through the real app: four photos laid end to end by Simple's own +
   path (FM.importFiles with {at}), a 1.2 s gap before photo 4, a title over photo 1 and a song under everything.
   SHOT (set on the first line) picks the state: idle | selected | deleteline | gapchip | cog | cogopen | cogwarn.
   1 Oct: RE-ANCHORED, NOT RE-RUN. No Settings preview (D22 A); the fullback / fullmenu / settings shots are withdrawn with
   what they showed — Full is HEAD's, and FU1 checks it. */
const sleep = ms => new Promise(r => setTimeout(r, ms));
if (FM.home && FM.home.isOpen && FM.home.isOpen()) { FM.home.close(); await sleep(500); }
const P = FM.scene.project, W = P.width || 1080, H = P.height || 1920;
const png = c => new Promise(r => { const k = document.createElement('canvas'); k.width = W; k.height = H; const g = k.getContext('2d'); g.fillStyle = c; g.fillRect(0, 0, W, H); k.toBlob(b => r(new File([b], c.slice(1) + '.png', { type: 'image/png' })), 'image/png'); });
FM.scene.layers.slice().forEach(l => FM.scene.layers.splice(FM.scene.layers.indexOf(l), 1));
await FM.importFiles(await Promise.all(['#d9534f', '#5bc0de', '#5cb85c', '#f0ad4e'].map(png)), { at: 0 });
const photos = FM.scene.layers.filter(l => l.type === 'image').sort((a, b) => a.start - b.start);
photos[3].start += 1.2; if (FM.shiftLayerKeyframes) FM.shiftLayerKeyframes(photos[3], 1.2);
const T = FM.makeLayer('text', { text: 'Beach day', x: W / 2, y: H * 0.2, start: 1, duration: 2 }); FM.insertLayer(T);
const S = FM.makeLayer('video', { name: 'Song', x: W / 2, y: H / 2, start: 0, duration: photos[3].start + photos[3].duration });
S.audioOnly = true; FM.scene.layers.push(S); FM.media.set(S.id, { kind: 'video', width: 0, height: 0, duration: S.duration, hasAudio: true });
FM.selectLayer(null); FM.time = 2; FM.refreshAll(); await sleep(200);
const cog = () => { const b = [document.getElementById('m-settings'), document.getElementById('btn-settings')].find(x => x && x.getClientRects().length); if (b) b.click(); };
if (SHOT === 'cog' || SHOT === 'cogopen') { cog(); await sleep(700); if (SHOT === 'cogopen') { const w = document.getElementById('cv-ed-what'); if (w) w.click(); await sleep(600); } return SHOT; }
if (SHOT === 'cogwarn') { FM.cropTool.start(photos[1].id); await sleep(300); /* move the box, then */ cog(); await sleep(700); const s = document.querySelector('#cv-ed-bar .ed-sw'); if (s) s.click(); await sleep(500); return SHOT; }
FM.editor.set('simple'); await sleep(300);
if (SHOT === 'selected' || SHOT === 'deleteline') { FM.selectLayer(photos[1].id); await sleep(400); }
if (SHOT === 'deleteline') { FM.selectLayer(photos[0].id); await sleep(200); window.dispatchEvent(new KeyboardEvent('keydown', { code: 'Backspace', key: 'Backspace', bubbles: true })); await sleep(200); }
if (SHOT === 'gapchip') { const c = document.querySelector('#sm-main .sm-chip-gap'); if (c) c.click(); await sleep(200); }
const r = id => { const e = document.getElementById(id); if (!e) return null; const b = e.getBoundingClientRect(); return [Math.round(b.left), Math.round(b.top), Math.round(b.width), Math.round(b.height)]; };
return { shot: SHOT, simple: document.body.classList.contains('ed-simple'), say: (document.getElementById('sm-say') || {}).textContent || '', main: r('sm-main'), sound: r('sm-sound'), smSay: r('sm-say'), insp: r('inspector-panel'), stage: r('stage'), errors: (window.__fmErrors || []).length };
```

```bash
# with tools/serve.sh on a FREE port (lsof -iTCP:<port> -sTCP:LISTEN prints nothing) — 8790–8799 are shared with other chats
for st in idle selected deleteline gapchip cog cogopen; do
  (echo "const SHOT='$st';"; cat "$SCRATCH/sm-sheet.js") > "$SCRATCH/shot-$st.js"
  python3 tools/shot.py --port "$PORT" --width 380 --height 667 --js-file "$SCRATCH/shot-$st.js" --wait 900 --out "$SCRATCH/p1-380-$st.png"
done
for st in idle selected deleteline cog cogopen cogwarn; do
  python3 tools/shot.py --port "$PORT" --width 1280 --height 800 --js-file "$SCRATCH/shot-$st.js" --wait 900 --out "$SCRATCH/p1-1280-$st.png"
done
```

Each call prints the rows' boxes; at 380×667 they must read `stage` 180 tall, `smSay` top 443 and 52 tall, and (selected)
`insp` top 499. The seam chip sits at about 10 s, off screen at the default zoom: the `gapchip` shot shows its line, not the
chip.

What they showed, and what was fixed because of it:
- **Fixed — the docked panel covered the whole Simple timeline on a phone.** The earlier draft docked the panel under the clip
  row, clamped at 66 % of the screen; at 380×667 that put the panel over the clip row, the sound row and `#sm-say`, so a clip
  could not be seen while it was selected and **the Delete line was hidden under the panel**. Now: fixed rows (ruler, a 64 px
  sections box, clip row, sound, `#sm-say` = 222 px), the panel docks under `#sm-say`, and Simple clamps the stage (180 px at
  380×667) so the panel keeps ≥ 200 px on a screen ≥ 694 px tall (at 380×667 the 180 px floor wins: the panel measured 168 px,
  review 29 Sep). T19 asserts both (it holds the panel at ≥ 150 px), and M6 below proves the assertion.
- **Fixed — the playhead line ran down through `#sm-say` and the panel.** It now spans the Simple rows only.
- ~~**Fixed — D2-B's ⋯ item was cut to "Simple e".**~~ Withdrawn 1 Oct with the item itself (DESIGN §0.4 V1).
- **Seen, left for Phase 2:** on PC with nothing selected the band shows Full's Add menu, including Camera and New group
  (Phase 2 replaces it with Simple's tools; Phase 1 keeps "adding goes through today's Add", §15.1); no waveform in the sound
  row; no folded section band.

---

## 6. Step 1.4: friends see each other in Simple (planned; NOT written or run here)

DESIGN §10.3 and §14.2's Phase 1 collab rows. **Every anchor below was re-checked in the current tree; none of the code was
written or tested.** Build it with the same method (a failing test first, hunks on quoted anchors), then review it three
ways as #967 was.

| Change | Anchor in the current tree (quote) | What |
|---|---|---|
| `FM.timeline.host()` | `js/timeline.js:4813` `timeToX: function (t) { return HEAD_W + PAD + (t \|\| 0) * pxPerSec(); },` (step 1.3 adds `pxPerSec` and `gestureLive` right under it) | one object both timelines answer: `{ box(id) → DOMRect \| null, inner, ruler, scroller, headW, timeToX, xToTime }`; in Simple, `FM.simpleTimeline` answers it (its `timeToX` is `FM.simpleTimeline.xOf`) |
| presence draws through it | `js/collab-presence.js:1020` `function clipEl(lid) { return isId(lid) ? document.querySelector('#tl-tracks .clip[data-id="' + lid + '"]') : null; }`; `:1012` `const c = lid && document.querySelector('#tl-tracks .clip[data-id="' + lid + '"]');`; `:730` / `:996` / `:1093` `document.getElementById('tl-inner')` | each Full-only query becomes `FM.timeline.host()`: `host().box(lid)` for a clip, `host().inner` for where marks are drawn, `host().timeToX(t)` for x |
| comment marks | `js/collab-comments.js:278-283` and `:316-324` (`FM.timeline.timeToX(…)` against Full's ruler) | the same substitution |
| media progress bars | `js/collab-media.js:1325` `const tracks = document.getElementById('tl-tracks');` inside `M.paint` | paint on `host()`'s clip boxes |
| presence `ed` | `js/collab-presence.js:81` `const ACTS = ['drag', 'trim', 'type', 'scrub', 'export'];`, `:236` `function sample() {`, `:280` `function cleanPr(m) {` | `ed: 'simple' \| 'full'` in the presence sample and in `cleanPr`'s whitelist (unknown values dropped); **drawn in Simple only** ("Sam · Simple" in Simple's people list; Full's chip and list are HEAD's, DESIGN §0.4 V10). Presence is not a document op: no `SCHEMA_REV` bump |
| ~~Watch along flushes first~~ | `js/collab-ui.js:526` `function startFollow(mid, name) {` | **withdrawn 1 Oct** (DESIGN §0.4 B24): Watch along is unchanged; Simple's pre-flight names the follower who holds a lease instead |
| the host clamps `sm.v` | `js/collab-bridge.js:147` `project: function (p) { FM.storage._clampProjectDims(p); },` | then `if (p.sm && p.sm.v > FM.SM_V) p.sm.v = FM.SM_V;` (§2.3: only in a live room, so a file keeps its newer-build guard) |

**Tests to write first:** T8's live clauses (in `withFakeNet921`: the cog's switch works within one frame of the cog closing
and sends no op) and T12 (`921`-style: a remote selection outlines the Simple clip box; a remote playhead sits at the same x in
both editors; nothing new on the stage or the play bar in either editor at 380×667, 440×956 and 1280), plus FU4 (Full in a
live session equals HEAD's, presence aside from `ed`). **What he sees:** in a
session, a friend's pointer and selection on the right clip whichever editor each is in. **Until 1.4 ships:** Simple works in a
live session (it is read-only, and panel edits are ordinary one-layer edits) but the other person's outline and playhead are
drawn on Full's hidden timeline, so he does not see them in Simple.

---

## 7. The proof

### 7.1 How each step's tests fail on the tree before it (what prove.sh will print as "fails without the fix as")

| Step | Test | Fails before its step as | Kind |
|---|---|---|---|
| 1.2 (moved from 1.1) | T15 FM.timedLists lists exactly the keyframe containers a generic walk finds (cue effects included) | the collector and the generic walk disagree: 2 list(s) missed (first: {"t":1.5,"v":0,"e":"linear"}), 0 extra — on HEAD the two cue-effect lists are the missed ones | behaviour |
| ~~1.1~~ withdrawn | ~~moving or re-speeding a caption track carries its animated cue effects (a Full fix)~~ | a cue effect key stayed at 1.5 when its caption track moved 3 s (want 4.5): the blur plays before its words appear | behaviour |
| ~~1.1~~ withdrawn | ~~the Assistant moving a clip carries its keyframes (ai-ops start)~~ | the clip moved to 5 s but its slide stayed at [1, 3] (want [5, 7]) — the animation is left behind | behaviour |
| ~~1.1~~ withdrawn | ~~Full split refuses a half shorter than 0.1 s, and still splits inside (Q28)~~ | a split 0.05 s from the start made 2 layers — a 0.05 s half is below every other floor and the sanitiser will fight it | behaviour |
| ~~1.1~~ withdrawn | ~~a luma matte keeps reading its source past the cut after the source is split (a Full fix)~~ | past the cut the matted square vanished (255,255,255): the matte read the first half, whose window has ended | behaviour |
| ~~1.1~~ withdrawn | ~~a Follow keeps following its target past the cut after the target is split (a Full fix)~~ | past the cut the follower reads 100 (want 200): it froze on the first half’s last key | behaviour |
| 1.2 | T7 sanitiser: layer.sm and project.sm come out canonical, keep plain unknown keys, and a second pass changes nothing | sm.main:"yes" survived the sanitiser: {"main":"yes","stay":true,"row":2,"future":{"a":1},"_secret":1} | behaviour |
| 1.2 | T6 copy routes: duplicate, paste and the Assistant clone never make a second main clip or a second end watermark | duplicate: the copy carries sm {"main":true,"row":2}, want {"row":2} — a copy of a main clip must not be a second main clip | behaviour |
| 1.2 | T1 classifier: a plain track, a picture-in-picture, native-size fitting, gaps, overlaps and a crossfade | FM.spine.classify is missing — js/spine.js did not load | module absent (presence only) |
| 1.2 | T1 classifier: stacked takes, a background still, an A-roll with cutaways and an import stack | FM.spine.classify is missing — js/spine.js did not load | module absent (presence only) |
| 1.2 | T1 classifier: what follows which clip — on a cut, long things, the sound rule, captions, hidden clips, camera | FM.spine.classify is missing — js/spine.js did not load | module absent (presence only) |
| 1.2 | T1 classifier: media still arriving is undecided, a missing clip with a known size is still a picture, and classify never reads FM.scene | FM.spine.classify is missing — js/spine.js did not load | module absent (presence only) |
| 1.2 | T1 classifier timing: 500 layers within budget, and 2,000 is not quadratic | FM.spine.classify is missing — js/spine.js did not load | module absent (presence only) |
| 1.2 | Simple’s + lays four picked photos end to end from the end of the clip row, one pick | the photos were not laid end to end from 5 s: 1, 1, 1, 1 (want 5, 10, 15, 20) | behaviour |
| 1.2 | T20 no company name in any word the Simple editor shows, and the scan catches one | FM.spineWords is missing — js/spine-words.js did not load | module absent (presence only) |
| 1.2 | the collab fingerprint carries the sm rules — its fixture holds sm keys that come out canonical, and SM_V moves it | the fingerprint fixture carries sm nothing at all after sanitising (want {"stay":true,"row":2,"future":{"a":1}}) — two builds that read sm differently would hash the same | behaviour |
| 1.3 (D22 B only) | the Settings row: off by default, its own group right above Work with friends, and off hides every door | Settings has no Simple editor row (#set-simple) | behaviour |
| 1.3 | T8 the switch writes nothing, keeps time, selection and zoom, and every clip keeps its x | FM.editor / FM.simpleTimeline are missing — js/editor-mode.js or js/simple-timeline.js did not load | module absent (presence only) |
| 1.3 (re-anchored) | T19 on a phone at 380 the Simple row reads ⋯ ✂ (gap) \|◀ with \|◀ where Full has it, the clip row is hit-testable, and ✎ hides by visibility | FM.editor / FM.simpleTimeline are missing — js/editor-mode.js or js/simple-timeline.js did not load | module absent (presence only) |
| 1.3 | the Phase 1 lines: Delete on a main clip, ✂, S and a seam chip each say their line with Open in Full and change nothing | FM.editor / FM.simpleTimeline are missing — js/editor-mode.js or js/simple-timeline.js did not load | module absent (presence only) |
| 1.3 | T21 at 380 in Simple none of Full’s layer doors show — ⧉, ◐, Layers, Add camera, the phone’s copy and delete — with one clip selected | FM.editor / FM.simpleTimeline are missing — js/editor-mode.js or js/simple-timeline.js did not load | module absent (presence only) |
| 1.3 | T21 at 1280 in Simple the PC layer-action group (delete, parent, more) does not show with one clip selected | FM.editor / FM.simpleTimeline are missing — js/editor-mode.js or js/simple-timeline.js did not load | module absent (presence only) |
| ~~1.3~~ withdrawn | ~~D2-B in Full on a phone the ⋯ strip carries a Simple editor item that fits its column and switches~~ | FM.editor / FM.simpleTimeline are missing — js/editor-mode.js or js/simple-timeline.js did not load | module absent (presence only) |
| 1.3 (re-anchored) | off means off: a project this device never switched opens in Full and runs nothing of the switch — no text-editor flush | FM.editor / FM.simpleTimeline are missing — js/editor-mode.js or js/simple-timeline.js did not load | module absent (presence only); its behaviour proof is M13 |

**1 Oct:** the messages above are the 29 Sep run's. The re-anchored tests, the cog's T1–T15 (§5.6b) and the FU group
(§3.2) have no rows yet: fill them in from a real `prove.sh` run at build time, never from this table.

**About the "module absent" rows.** Thirteen of the 24 fail before their step only because a new module is not there yet
(`FM.spine`, `FM.spineWords`, `FM.editor`). That proves presence, not behaviour, and prove.sh will call each one plain CAUGHT:
its WEAK detector looks for "seam … missing", "is not a function" and "undefined", and these messages say "is missing" / "are
missing — … did not load", so they slip past it. **§7.2 is the behaviour proof for those modules.** The builder should repeat
those mutations with `tools/mutate.sh` (which adds the green-before and changed-something gates) and write each result into
the #980 entry, so the proof is in the repo's own record.

### 7.2 Mutation proofs on the finished copy (each seam kept, one rule broken, the named test must go red)

| # | File | The rule broken (every seam kept) | Test | Result |
|---|---|---|---|---|
| M1 | `js/spine.js` | stacked take: always drop the lower clip, even under a see-through top | T1 stacked takes… | **caught**: "a half-transparent take on top: the lower clip should stay main… got up / main" |
| M2 | `js/spine.js` | `mainAt`'s binary search prefers the clip BEFORE a cut (`starts[m] + eps < t`) | T1 what follows which clip… | **caught**: "a title starting exactly on the cut should follow the clip AFTER it: null" |
| M3 | `js/simple-timeline.js` | the time origin moved 6 px | T8 | **caught**: "clips moved across the switch: smv1: Full 292 vs Simple 298 …" |
| M4 | `js/storage.js` | the "no `sm.main` on audio / captions / groups" line deleted | T7 | **caught**: "sm.main survived on an audio-only layer" |
| M5 | `js/app.js` | `handleFiles` stops advancing `at` after each file | Simple’s + lays four photos… | **caught**: "the photos were not laid end to end from 5 s: 5, 5, 5, 5" |
| M6 | `js/simple-timeline.js` | the panel docks under the clip row again (`dockBottom` = clip row) | T19 (380) | **caught**: "the docked panel (top 481) covers the Simple timeline or #sm-say (bottom 561)" |
| M7 | `js/app.js` | `m-editing` set in Simple again (the `!simple &&` removed) | T19 (380) | **caught**: "m-editing is on in Simple" |
| M8 | `styles.css` | Layers / Add camera no longer hidden in Simple | T21 at 380 | **caught**: "these Full doors show in Simple: vb-layers*, vb-camera*" |
| M9 | `js/spine-words.js` | "Open in Full like CapCut" | T20 | **caught**: "another company’s name is in Simple’s words: spineWords.lines.openFull" |
| M10 | `js/editor-mode.js` | the switch commits a history step | T8 | **caught**: "the switch took an undo step" |
| M11 | `js/collab-core.js` | SM_V taken out of the fingerprint | the collab fingerprint carries the sm rules… | **caught**: "a build with a different SM_V has the same fingerprint" |
| ~~M12~~ | — | withdrawn 1 Oct with the ⋯ item | — | — |
| M13 | `js/editor-mode.js` | `syncProject` goes back to the earlier draft's unconditional `apply(…, {force: true})` (review, 29 Sep) | off means off | **caught** on 29 Sep against the preview-flag version; re-prove against the re-anchored test (card-seeded control) |
| M14 *(new, 1 Oct, not run)* | `js/editor-mode.js` | `apply()` closes every tool again with the 29 Sep loop (`cropTool.stop()` = cancel) instead of refusing on a live `HOLDS` | cog T3 | must go red: "the crop box was thrown away" |
| M15 *(new, not run)* | `js/editor-mode.js` | `onKey` answers bare E in Full again | T8 (the E clause) | must go red: "E switched editor — Full must gain no key" |
| M16 *(new, not run)* | `styles.css` | one cog rule loses its `.cv-ed-on` key | cog T7 / FU6 | must go red on the old two blocks' computed style |
| M17 *(new, not run)* | `js/app.js` | Full's split floor moved to 0.1 s (the withdrawn 1.1.5) | FU2 | must go red: the 0.05 s split differs from HEAD |

All twelve were caught (29 Sep; M12 has since been withdrawn and M14–M17 are new and not run), each run alone through the real suite page on the finished copy with the file restored after. The
builder should repeat at least M1, M2, M3, M6, M8, M12 and M13 with `tools/mutate.sh` (which adds the green-before and
changed-something gates), so the proofs are in the repo's own record and `tools/.weak-proofs.log` can be marked RESOLVED.

---

## 8. Existing tests: what the whole suite said

**1 Oct: these runs are the 29 Sep version's** (with step 1.1 and the play-bar switch). Re-run the whole suite at both widths
on the revised build before believing any line here.

Two whole-suite runs on the finished scratch copy through `tests/_cdp.py` (each ~42 minutes on this Mac with the builder's own
runs beside it; ship.sh's two passes will take about as long). Every red was then re-run **alone**, on the patched copy AND on
the base tree, which is how this repo tells a change from a slice or load artefact (memory: "classify a slice red by pairing on
HEAD").

| Run | Result | Reds | Paired alone: base / patched | Verdict |
|---|---|---|---|---|
| 1280 (before the last three fixes) | 2,138 / 2,140 | `967 B4 1 one name` | pass / **fail** | **real, caused by this plan**: the Settings hint said "still being tested", which #967 keeps for Work with friends alone. **Fixed** (the hint now reads *"See any project as clips — an early look."*); the pair re-run is green on both |
| 1280 | | `981 review: a real double-tap on the empty area …` | pass / pass | not this change: the new tests run AFTER it (appended last), and it passes alone on the patched copy |
| 380 (the final tree) | 2,133 / 2,141 | `967 1`, `967 1c`, `967 7b`, `967 7c`, `967 B4 4`, `971` ×2 (live-connection tests: "the two data channels never opened (ice new/new)", a join `timeout`), `981 review: a real double-tap …` | 8/8 pass / 8/8 pass | not this change: WebRTC and timing tests that go red under load (the builder was running its own suite on the same Mac at the time) and pass alone on both trees |

**So the existing tests this plan breaks: one, `967 B4 1 one name`, and the plan's own wording fixes it.** Plus, by design,
`921 S1 the schema fingerprint gate` goes red in step 1.2 until `SCHEMA_FP` is re-pinned (§4.4). The builder's own
`ship.sh` full runs are the final word; if one of the load-sensitive reds above shows up there, pair it on HEAD before
believing it (and check for orphaned `fm-cdp` Chrome processes first).

---

## 9. Risks, and how to roll back

| Risk | Size | What reduces it | If it goes wrong |
|---|---|---|---|
| `SCHEMA_REV 7` stops his phone and his Mac sharing live until both update | certain, brief | said in the 1.2 release line; the app already says "update to join" | update both; no data at risk |
| The sanitiser rewrites a field on every load of an old project | low | it touches only `sm`, `srcW/srcH/srcRev`, `pick` and an effect's `sm`, which no project has today; T7's control proves a layer without them comes out byte-identical | `tools/rollback.sh <version before 1.2>` |
| A Simple change leaks into Full (his rule, 1 Oct) | the risk he named | the FU group against HEAD on every `queue 980` release, enforced by `ship.sh`; Simple releases ship alone; the old step 1.1 withdrawn | `tools/rollback.sh <version before it>` |
| A switch throws away an unapplied crop or drawing | low | the guard: `apply()` refuses while a `HOLDS` tool is live; `request()` asks first and presses the tool's own Done (cog T3–T6) | — |
| Simple reads an odd Full project wrong (the wrong main track) | medium | it is a VIEW: nothing is written; Phase 1's classifier leaves out the link rule, masks in fillsFrame and main blocks (§11), so a masked face-cam or a keyed group can read as main; Open in Full is one tap | the cog's switch back to Full: that project opens in Full from then on, untouched (under D22 B, the Settings row off puts every project in Full) |
| The stage is smaller in Simple on a small phone (180 px instead of 267 at 380×667; about 346 instead of 382 at his 440×956, computed, not measured) | by design | keeps ≥ 200 px for the docked panel where the screen is ≥ 694 px tall (168 px at 380×667, measured); the design clamps the stage in Simple too (§8.2) | switch to Full, or off |
| A Simple rebuild costs the phone frames | low–medium | classify is measured (500 layers within 60 ms in the suite frame, 2,000 not quadratic); filmstrips reuse Full's frames through one bounded cache of 60, 4,096 px wide at most | switch off |
| A key that used to do something in Full does nothing in Simple | by design | only A/S/D, Delete on a main clip and ⌘D on a main clip are held, each with its line | — |
| The switch leaves the suite's own project in Simple for the next test | fixed in the tests | `smView` puts the project card's `editor` back exactly as found (found by T21 failing in the scratch run) | — |

**Rollback, in one line each** (`tools/rollback.sh` makes a NEW commit; it never rewrites history or force-pushes, keeps
REQUESTS.md / POLISH-LOG.md / INBOX.md as they are, and asks before publishing):
- *"Take the Simple editor out":* `tools/rollback.sh <version before 1.3>`. Keeps 1.2, which is invisible.
- *"Take all of it out":* `tools/rollback.sh <version before 1.2>`.
- `tools/rollback.sh` with no argument lists the releases, newest first, and changes nothing.
- What a rollback leaves behind, harmlessly: `fm.editor.last`, `fm.editor.hint` and `fm.cvPair = 'editor'` (an older build
  reads it as Canvas), `simpleEditor` in the settings under D22 B (an older build ignores unknown settings), `editor` on
  project cards (ignored), `srcW/srcH/srcRev` and `pick` on layers added meanwhile (an older build
  carries plain layer fields untouched). No project
  needs repairing. **Faster than any rollback for anything visible: the cog's switch back to Full** (under D22 B, Settings →
  Simple editor → off).

---

## 10. Phases 2–8 (one screen each; each needs its own build plan before it is built)

**Phase 2: Edit clip after clip.** *What:* `FM.trimClipEdge`; the runner (`FM.spine.edit`: single flight, the live gate,
locked, blockers, couplings, adoption, one commit, one undo step) and every §3.6 command (delete, both trims, split, reorder,
speed, insert, make overlay / main, close gap, duplicate); attachments and Stay put; adoption writing `project.sm.adopted`;
the DOM-only drag preview with edge auto-scroll; Move earlier / later and Length; A/S/D/Delete/⌘D/⌘V per §8.3; the tray row
and project tools (`js/simple-tools.js`) with the design's folded section band; comment pins `ls`/`lo`; undo labels and the
undo queue; `#sm-say`'s Undo / Do it anyway; the persisted-roster live gate (arranging off while an editor is in the session).
**Contained to Simple (DESIGN §0.4, 1 Oct):** `FM.trimClipEdge` used by Simple only (B7); Simple's own
`FM.spine.shiftKeys` / `scaleKeys` over `FM.timedLists` (B2); `sm.snd` at add and Replace on Simple's routes, never
`audioOnly` (B8); `sb` on the boundary keys `riderKeys` inserts, and Bounce skipping only those (B5); `sm.cut` and `seamAt`'s
continuity only on marked pairs (B6); the undo queue only while `FM.spine.running` (B15–B17); comment anchors only for pins
made in Simple (B25); Q29 and the lease pre-flight only for `ed: 's'` steps (B21, B22); no Watch-along change (B24). Every
one is proven by the FU group against HEAD as well as by its own test.
Also the pieces this plan moved out of Phase 1 (§11): `FM.setClipSpeed`, the `docRev` cache, the link rule, masks in
fillsFrame, main blocks. **D17 B (his pick):** music is added whole with `sm.stay` and never fitted or faded; the Sound tray has
no Ends with the video switch; `sm.tail` is written only by adoption and `pinStrays` on picture items, and `setFlag(u, 'tail',
true)` refuses a sound unit (`audioOnly` or `sm.snd`), with its T2 clause (DESIGN §4.5). *Size:* ~2,000 lines, the biggest
phase. *Gate:* T2–T5, T9, T10, T23–T25, T28; answered: D4–D8 A, D10 A, D14 first half A, D17 B, D19 A; FU1–FU7.

**Phase 3: Make it look nice, and the way in.** *What:* Look (filters + Adjust), Captions with riders and Find speech,
Effects segments, Ask with Simple's vocabulary (`applyOps(…, {simple: true})`, the only place the `start` key shift runs,
B3), Clips › Extras, the synchronous picker in Create when the device's editor is Simple (D3 A: the new card gets
`editor: 'simple'`; the dialog unchanged), template-fill Replace while Simple is on screen, pack insert, the switch animation
(**the morph only**, D11 B, played as the cog closes; no Fold, no Slide, no random pick); on PC each tool's panel docks inside
the left band and scrolls (**D20 A**, DESIGN §8.3; the over-timeline sheet only when the band leaves under 64 px, a phone held
sideways); under D22 B, the Settings gate removed. **Withdrawn 1 Oct** (DESIGN §0.4): New project cards
and the D3 migration (V6), the Home chip and ⋯ Open in Simple / Full (V5), template routing by `home` (B27), Full's
layer-menu items and stripe (V8, V9). *Size:* ~1,000. *Gate:* T6 (Phase 3 half), T19, T19b (the D20 A clauses), T26, T26b, FU1–FU7;
answered: D11 B, D12 A, D20 A, D21 A; **open: D3** (re-asked; only the Create-picker item waits on it).

**Phase 4: Together — HELD (1 Oct, DESIGN §0.4 B29–B37).** It changes how Full behaves in a live session and cannot be
contained piece by piece, so it is built only if he says yes knowing that (D14b, re-asked: his D14 A answered the old form, which included this phase). *What:* 4a clip time on the wire (keyframes relative to `kb`), 4a′ keyed caption cues, 4b the lease
protects content and membership, 4c pre-flight, keep my frame and authorship `L.by`, 4d the glide, "Sam moved 4 clips", the
gate lifted while every editor is connected. `SCHEMA_REV` bumps at 4a, 4a′, 4b and 4d. *Size:* medium-large. *Gate:* T11,
T13–T16, T27 and a tier-3 run on real frames; **starts only after his first real Mac ↔ iPhone test.**

**Phase 5: All-or-nothing — HELD with Phase 4.** *What:* `all:1` on both host paths, one arranging step in flight with an intent queue,
CAS-checked undo, the offline outbox partitioned by path stamps, `PROTO` bump. *Size:* medium. *Gate:* T17; before Phase 6
only if Phase 4's fuzz measures seams.

**Phase 6: Transitions and clip animations.** (DESIGN §0.4 N2: the picture shows in Full's preview and export too; no new
control in Full.) *What:* ◇ at each cut in Simple, the picker, Use on every cut, Turn into a transition on
blends, In/Out/Combo clip animations, `FM.transitionAt`, sound stays picture-only, a `SCHEMA_REV` bump; drawn options first.
*Size:* medium. *Gate:* T18 (export parity); D13.

**Phase 7: The later list.** Freeze (`FM.renderStill`), stabilise, speed-curve presets, beat markers, SRT, the keyframe
diamond, sticker and text-style libraries, words for captions, an audio crossfade at transitions, onboarding. *Size:* per
item. *Gate:* his go-ahead on each.

**Phase 8: Only if measured.** C's derived layout, only if Phase 4–5 sessions still show seams often. *Size:* large. *Gate:*
C's T1–T16.

---

## 11. Where this plan differs from DESIGN.md, and what changed since the earlier draft

| DESIGN / earlier draft says | This plan does | Why |
|---|---|---|
| **1 Oct:** step 1.1 "four Full fixes"; ⇄ on both play bars, the ⋯ item, the back button, E, the Settings row | 1.1 withdrawn (its `FM.timedLists` ships in 1.2); the ⚙ cog's third block is the one door, with the guard and its warnings; D22 decides any Settings gate; the FU group gates every Simple release | his rule: Full must not change in design or function; the switch lives in the cog; a swap that would lose un-undoable work warns first (DESIGN §0.4, §6) |
| Phase 1 is one release | two releases plus a planned third (1.2, 1.3, 1.4), after the FU group | each proven and rolled back alone, and each proven to leave Full as HEAD had it |
| `read()` cached on `FM.docRev` (§2.5) | no cache in Phase 1 | read runs only on rebuild; a cache is where staleness lives, and the forbidden alternative (a field hash) is the known bug; T1's timing test holds the cost. Add `docRev` with the Phase 2 runner |
| the full §5.2 classifier | Phase 1 has: units (block / transparent / `sm.unit` groups), kinds, media state, derived main (background, import stacks, stacked take with the see-through exception, greedy with blend tolerance, hidden pass B), adopted main, seams (join / hairline / gap / overlap / blend / covered), slots, hosts by the start rule + the sound rule + isLong, riders, sides, pro level, lanes, anomalies | the rest (the link rule through the split lineage, moves-together anchors, main blocks, caption blocks, masks in fillsFrame, the group-opacity product in drawsPicture, the wrapper block) only changes the answer for Full-made projects with parenting, masks or keyed groups, which Phase 1 draws read-only with ✦. Each gets its T1 fixture when it lands in Phase 2, before adoption can store anything |
| `.webm` both "audio" and "ambiguous" (§5.2) | `.webm` = audio | the round-3 T1 fixture says a Chrome `.webm` voice-over lands in Sound |
| `audioOnly: true` at add time (§2.2, §15 Phase 1) | **not written in Phase 1** (review, 29 Sep); it moves to Phase 2 together with §2.2's write on every route that installs a new media record (`replaceMediaWith`, template fill, `restoreReplacedMedia`, collab media landing) | Full treats `layer.audioOnly` as final (`js/timeline.js:2112` hasPicture, `js/inspector.js` isAudioOnly), and "Replace media…" is on every media layer's menu (`js/app.js:5215`): writing it at add time without the Replace half would leave a song replaced with a video drawn as a waveform with a sound-only inspector, in Full. Phase 1's classifier still knows a song on this device from its 0×0 record; a guest with no record sees it as undecided (drawn in place, loading look) until its media lands |
| `#sm-say` between the timeline and the play bar; on PC in the band's tray strip | directly under the Simple rows on the phone (the tray row's slot in §8.2's drawing, V11's #6); at the bottom of the Simple timeline on PC | one place per layout; the phone panel docks under it so a line is never covered |
| Phase 1 stage clamp: top bar, play bar and the say row | the same, plus 200 px kept for the docked panel | today's panel docks below the Simple rows in Phase 1; without the reserve it was 85 px at 380×667 |
| Phase 1 sections: folded band + one open section | a fixed 64 px sections box on the phone (two lanes, scrolls inside), filling the height on PC | folding is Phase 2's; the fixed box is what keeps the clip row's y constant |
| `FM.setClipSpeed` extracted in Phase 1 | moved to Phase 2 | its only caller is Phase 2's Speed panel; a refactor with no caller cannot be proven by prove.sh |
| T12 (chrome collision) in Phase 1 | in step 1.4 | nothing new is on the stage or the play bar (the switch is in the cog), so it cannot meet the stage's chips by construction; the live chips need 1.4's session tests |
| **Earlier draft:** panel docked under the clip row, clamped at 66 % | docks under `#sm-say` with Simple's stage clamp | at 380×667 the panel covered the timeline and hid the Delete line (§5.8) |
| **Earlier draft:** `addMediaLayer` handed its layer back through `FM._lastAddedLayer` | `addMediaLayer` returns the layer | a global side-channel is one more thing to keep in sync; callers that ignore the return are unchanged |
| **Earlier draft:** `C.SCHEMA_REV = 2;` then `= 3;` | one line, `= 3` | two assignments of one constant read as a mistake |
| **Earlier draft:** no T21, no fingerprint test | T21 at 380 and 1280; a fingerprint test that SM_V moves it | §15's Phase 1 gate lists T21; SM_V "only with SCHEMA_REV" needed a check |
| **Earlier draft:** Layers and Add camera stayed reachable in Simple | hidden in Simple (`#vb-layers`, `#vb-camera`) | §14.2 styles row; a camera is Full-only |
| the Settings hint *"See any project as clips — still being tested."* | *"See any project as clips — an early look."* | #967 (his one-name audit) made "still being tested" the Work-with-friends switch's phrase alone; `967 B4 1 one name` went red on it in the full run. Words are D1's file, so he can change it there |
| **Earlier draft:** ⋯'s Simple editor item carried its label | ~~icon only~~ the item is withdrawn (1 Oct) | his rule: nothing is added to Full's ⋯ strip |
| **Earlier draft:** `smView` left the project card in Simple | puts the card back | the next test opened in Simple (T21's control caught it) |
| §15's Phase 1 list includes `onSplit` | not in Phase 1; with the Phase 2 runner | it clears `sm.tail` on piece A (§4.5), and Phase 1 writes no `sm` at all, so there is nothing for it to clear yet (a split of a file from a newer build keeps its `sm.tail` on both halves until then) |
| §15's Phase 1 list includes `FM.timeline.host()`, the dock hooks and presence `ed` | step 1.4 (planned, §6) | they only matter with a friend in the session; §6 has the anchors |
| §15's Phase 1 gate lists T12b, T18, T19b and T22 | **not written in this plan** | T12b is 1.4's (a fake-net peer in Simple); T18 (export parity) has nothing to compare while Simple is read-only; T19b is the PC band budget of Phase 2's tools; T22's Phase 1 basics (the cog's switch names its action, focus never falls to `<body>`, 44×32 Open in Full, the chip's name) are asserted inside T8 and the Phase 1 lines test, not as a test of their own. Say so in 1.3's #980 clause rather than claim the gate |
| T21 (§14.6): 0, 1 and 2+ selected; `#m-group`, `#m-maskgroup`, `#m-more`, `#btn-group`, `#btn-maskgroup`; Tab onto a camera | one selection only, and the ids whose Full control is displayed with one clip selected | the other ids are hidden in Full with one clip selected too, so asserting them there proves nothing; Simple sets none of `m-editing` / `sel-mode` / `sel-multi`, which is what shows them. The 2+ case and Tab onto a camera wait for Phase 2's key scope |

## 12. Known gaps in Phase 1 (honest list)

- Presence, comment marks and media progress bars draw on Full's hidden timeline until 1.4.
- No pinch zoom on the Simple timeline (⌘/Ctrl + wheel and Full's zoom buttons work, one zoom for both views).
- No folded section band, lane cap badge or link line; the sound row draws lane 0 only with a `+N` count.
- A multi-selection on a phone in Simple gets no docked panel position (it opens where Full's sheet opens).
- The PC band shows Full's Add menu when nothing is selected, including Camera and New group (Phase 2 replaces it).
- Not measured on his iPhone: the stage clamp's real numbers under Safari's toolbars (§8.2's table is estimates).
- A song whose media record is not on this device (a guest before its media lands, or a missing blob) reads as *undecided*
  and draws in the clip row with the loading look: `audioOnly` is not written at add in Phase 1 (§11), and `AUDIO_EXT` never
  matches an app-added layer because `addMediaLayer` names the layer after the file WITHOUT its extension.
- `classify` reads only the scene it is given for plain layers (T1's purity test), but a layer with a Follow behaviour on
  opacity or position still reads `FM.scene` through `FM.layerOpacity` / `FM.worldBox` → `FM.behaviorValue`. Harmless while
  Phase 1 only ever classifies `FM.scene`; a Phase 2 pack classify must pass its own scene down.
- T20's stricter half (no Simple text outside `js/spine-words.js`) is not asserted: `simple-timeline.js` still writes the
  section glyphs, the ruler's `s` and the `+N` badge's `N more` title itself.
- (There is no E key since 1 Oct, so nothing to list on the ? sheet.) The cog block's layout is the prototype's, measured
  at v17.21 in Chrome only; not seen on his iPhone or in Safari.
- A guest's song still reads as undecided until Phase 2 writes `sm.snd` (Simple's own sound-only fact, DESIGN §0.4 B8) at add
  and Replace.

---

## 13. Review (29 Sep, ~15:00–16:00 AWST): a skeptical pass before the builder uses this

**1 Oct:** this review is of the 29 Sep version. Since then step 1.1 is withdrawn, 1.3's doors are replaced by the cog block,
`js/editor-mode.js` is rewritten around the guard, and the FU group is added; none of that has been reviewed or run. A fresh
review of the same kind (anchors applied by script, every new test failing first and passing after, at 1280 and 380, plus the
FU group's self-test) comes before the builder uses this file.

**How it was checked.** A fresh copy of the tree (HEAD `ea1ff320` plus the uncommitted v17.13 working tree, which the builder's
14:49 ship did not commit) was made in the review's scratchpad, never the repo. Every hunk was applied to it in plan order,
by script, with the `?v=` bumps of §2.3: **all 51 anchors were found exactly once, at the line this file states** (after the
fixes below). The three preflight blocks of §2.4 were run on the tree at the start of their step: every line printed `1`.
Every new and patched JS file, and `tests/tests.js`, parsed in JavaScriptCore (`new Function`, with a deliberately broken file
as the control). The tests ran through `tests/_cdp.py` against `tools/serve.sh` on a port **proved to be serving that copy**
(a random sentinel file fetched back first: the first attempt hit other chats' servers on 8793–8798 and reported nonsense):

| Run | Result |
|---|---|
| All 24 new tests on the finished copy | **24/24 at 1280, 24/24 at 380** |
| Step 1.1's tests on the tree before 1.1 | 0/6, each failing with the message §7.1 quotes |
| Steps 1.1 + 1.2 on the tree after 1.1 | 6/16: 1.1's six pass, 1.2's ten fail as §7.1 quotes |
| Steps 1.2 + 1.3 on the tree after 1.2 | 10/17 (1.2's ten pass, the seven original 1.3 tests fail); then all eight 1.3 tests alone: 0/8 |
| `921 S1` (24 tests, including the fingerprint gate) and `967 B4 1…` (3) on the finished copy | **27/27**: the pinned `SCHEMA_FP 4276424858841693` is still right for the v17.13 tree |
| The new test against the earlier `editor-mode.js` (M13) | red, as quoted in §7.2 |
| Screens at 380×667 and 1280×800 (§5.8's recipe) | taken and looked at: ⋯ · ✂ · ⇄ · \|◀, the Delete and gap lines with Open in Full, the panel docked under `#sm-say`, the back button in ◐'s slot, the Settings row above Work with friends. Saved in the scratchpad's `simple-mode-qa/review-*.png`, not the repo |

**What was changed in this file:**
1. **Line numbers.** 1.3.10–1.3.12 were one line early (the builder's `js/timeline.js` moved since the plan was written);
   1.2.16–1.2.20, 1.3.14 and 1.3.16 moved one line because of change 2.
2. **1.2.15 no longer writes `audioOnly` at add time.** Full treats `layer.audioOnly` as final (`js/timeline.js:2112`,
   `js/inspector.js` isAudioOnly) and "Replace media…" is on every media layer's menu, so a song replaced with a video would
   have kept a waveform and a sound-only inspector in Full: the exact bug DESIGN §2.2 prevents with a matching write on every
   Replace route, which this plan did not carry. It moves to Phase 2 with those routes (§11); §2, §4.5's note, §9 and §12
   now say so.
3. **"Off means off" is now structural in `js/editor-mode.js`.** `syncProject()` runs inside every timeline rebuild and
   called `apply(…, {force: true})` on every project open, with the preview off too, and `apply` flushes the text editor and
   closes the crop / mask / motion-path / touch-up tools. Now it and `onPreviewFlip()` run `apply` only when the editor on
   screen actually has to change. **A new test** (*"off means off…"*, the 24th, end of §5.6) spies the flush on a project
   open with the preview off, with a control that the same path does flush for a Simple-home project with it on; M13 in
   §7.2 proves it against the earlier code.
4. **§0 step 1:** `queue 980 (partial)` closes nothing, so ship.sh's order gate cannot stop a jump; oldest-first (or a
   written `JUMPED:`) is stated.
5. **The header** no longer says the whole suite at 380 was not run (§8 has that run).
6. **The docked panel's room** was claimed as "≥ 200 px"; measured at 380×667 it is **168 px** (the 180 px stage floor wins
   below 694 px of height). The CSS comment, the `dockSheet` comment, §5.8 and §9 now give the measured number (T19 holds it
   at ≥ 150 px, which it passes).
7. **§5.8 has the recipe** for re-taking the screenshot sheet (a setup script for `tools/shot.py` and the loop), so step 4
   of §0 leaves nothing to invent.
8. **§11 declares what DESIGN §15 lists for Phase 1 and this plan does not do:** `onSplit`, `FM.timeline.host()` / dock
   hooks / presence `ed` (1.4), the tests T12b, T18, T19b and T22, and T21's 0 / 2+ selections and extra ids.
9. **§12 gained four honest gaps**: a guest's song reads as undecided (change 2, and `AUDIO_EXT` never matches an app-added
   layer's name), classify's purity stops at a Follow behaviour, T20's stricter half, and E missing from the ? sheet.

**Checked and found right, unchanged:** the new files follow the repo's pattern (`window.FM = window.FM || {}` and one IIFE
over `FM`, plain `<script src>` with `?v=1`, no build, no precache list to update in `sw.js`); every function, variable
and element id the hunks and tests reference exists in the tree and is in scope (`FM.clipAt`, `FM.fxListAnimatedProps`,
`groupNeedsUnit`, `_hydrating`, `keepUid`, the seven gesture flags, `#t-sel`, `--stage-h`, `--tl-top`…); no new `FM`
member collides with an existing one; `sm`, `pick`, `srcW/srcH/srcRev` are unused today; ship.sh's gates treat
`queue 980 (partial)` as advancing, the busters are listed per step (and ship.sh bumps a missed one itself), no test is
removed, no POLISH-LOG template names another item as `queue NNN`; Phase 1 writes nothing to a project document except
`srcW/srcH/srcRev` and `pick` at add time (DESIGN §2.2 puts them there) and never an `sm` flag, and the editor pick lives on
the device's project card; every step 1.4 anchor in §6 is still found exactly once at the line quoted.

**Still open after this review:**
- Step 1.4 is a plan, not code (§6); until it ships a friend's pointer is drawn on Full's hidden timeline.
- Thirteen of the 24 tests fail before their step only because a module is absent: the mutations in §7.2 (repeat them with
  `tools/mutate.sh`, and record them in #980) are the behaviour proof.
- Not run by this review: `tools/ship.sh` / `tools/prove.sh` themselves, and a whole-suite run after changes 2 and 3 (§8's
  runs predate them; both changes remove behaviour from Full rather than add it, and the 24 new tests plus `921 S1` and
  `967 B4 1…` are green on the changed copy).
- `SCHEMA_FP` is right for the v17.13 tree; if an effect's parameters change before 1.2 ships, re-measure it (§4.4).
- Nothing ran on his iPhone or in Safari; 375×553 and 440×956 were not shot.
