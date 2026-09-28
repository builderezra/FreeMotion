# Judge: buildability and testability

Step 2 of `STATUS.md`, judge panel. **Lens:** how incrementally each design can ship (is the first phase useful on its
own?), how big each phase is, what the existing suite and the `921` fake net can prove, how much existing code is reused,
and the risk of breaking the complex editor (and the shipped collab engine it depends on).

Judged: `design-model.md` (**M**), `design-ux.md` (**U**), `design-collab.md` (**C**). Written 29 Sep 2026 against the working
tree at `2d06a3f5`. Design only; nothing in the repo was changed except this file.

---

## 0. Verdict in five lines

1. **M and U share one core, and that core should win:** a per-layer flag for the main track, `start` stays the only
   stored time, order = order of `start`, and magnetism lives in the simple editor's commands (one commit each). No wire
   change, no derived writer, no renderer change until transitions.
2. **Rank: M (55/70) › U (54/70) ≫ C (28/70).** M and U are within a point; C is far behind on this lens.
3. **Build M's engine** (`FM.spine`: pure plan functions + one runner) **on U's phasing** (a visible, read-only first
   release) **with U's attachment rule** (derived from where an item starts, plus a stored "stay put" opt-out) and **U's
   collab gate** (no simple-editor edits while a session is live, until the collab phase).
4. **C is the best-tested idea and the worst thing to build first.** Its Phase 0 changes the wire format of a 253-test
   engine that is still waiting on Ezra's first real Mac↔iPhone test, and its Phase 1 changes how the Full editor's drags,
   trims and ~15 other start writers behave. Keep it as M's Phase 6 upgrade path, only if measured seam frequency calls for it.
5. **Each design misses something the others would also trip on** (the phone sheet docks to Full's rows, presence draws
   on Full's DOM, the New-project default touches the suite). They are listed in §5 so the synthesis carries them.

---

## 1. What I checked in the code (so the scores rest on facts, not the designs' own claims)

| Claim a design relies on | Checked | Result |
|---|---|---|
| A multi-step edit can be one undo step (M §3.6, U §3) | `js/history.js:270-278` | **True.** `mute()`/`unmute()` are re-entrant; `commit()` returns while muted. |
| …and one collab tx (M §10.1) | `js/collab-bridge.js:177`, `js/collab-session.js:207`, `:416`, `:817` | **True, and stronger than M says.** `busy()` is true while history is muted, so hot ticks stand down and incoming messages are queued for the whole muted run, even across `await` (`FM.splitLayer` is `jobWrapped`, `js/app.js:4855`). M's runner (mute → apply → unmute → refresh → commit) is one diff, one tx. |
| The Full clip drag shifts keyframes only at pointer-up (C §3.3) | `js/timeline.js:5070-5079` | **True.** C is right that clip time on the wire needs this changed. |
| Only a handful of places write a layer's `start` (C §14.2 lists ~8 sites) | `grep` for `.start =`, `+=`, `-=` over `js/` | **False.** About 30 sites in 8 files. Real writers C does not list: `extendClipTo` `js/app.js:4771`, head stretch `:4823`/`:4833`, `moveLayerToPlayhead` `:5074`, speed-to-playhead `js/inspector.js:5816`, clip ops `js/timeline.js:97` and `:163`, the AI ops `js/ai-ops.js:116`, `:164`, `js/audio-tools.js:178`. Under C every one of them is silently undone by the layout on a main or stuck clip. |
| Relative keyframes on the wire need ~5 conversion sites (C §3.3 table) | `js/collab-session.js` diff/apply sites | **Understated.** Diffs run in three directions: live→base (`:190`, `:1062`, `:1354`), base→live (`:1011` snapshot, `:1621` backstop revert), and the share-time tidy that applies to both (`:1745-1765`), plus deferred re-assert in `release` (`:441-444`) and the host's answers (`currentStateOps`). |
| C's layout can run as a host invariant on the base (C §10.2 rule 2) | C §3.1 `setStart` | **Inconsistent.** `setStart` always calls `FM.shiftLayerKeyframes`, but on the base the keyframes are clip-relative (C §3.3), so running the same function there would corrupt them. It needs a second, start-only variant. Fixable, but it is the kind of silent bug the fuzz would find late. |
| Unknown top-level layer/project keys survive every route | `js/storage.js:1633-1646`, `:1610-1632` | **True.** Nothing lists a layer's top-level keys; `sanitizeKeyframes` only filters and sorts, so relative or absolute lists both pass. |
| `sm`, `seq`, `main`, `stick` are free names on a layer | `grep` over `js/` | **True.** No layer field uses any of them. (`seq` is collab's batch counter and a member field at `js/storage.js:2717`: a naming echo, not a clash.) |
| The phone inspector can be reused as-is when a layer is selected in the simple timeline (U §15 Phase 1) | `js/mobile.js:271-294` `dockSheet` | **False as written.** It measures `#tl-tracks .track-row`; with Full's timeline hidden it measures nothing and docks the sheet near the top of the screen. Every design mounts a sibling timeline, so all three need a dock hook; only U's Phase 1 depends on it on day one. |
| Other modules read Full's timeline DOM | `grep` | `js/collab-presence.js:1012`, `:1020` (remote selections drawn on `#tl-tracks .clip[data-id]`), `js/collab-media.js:1325`, `js/exporter.js`, `js/mobile.js`. None of the designs lists presence/media: in the simple view the remote outlines would silently not draw. |
| A ripple may move collab comment pins (U §3.1 `shiftComments`) | `js/collab-host.js:58-70`, `:140-159` | **Refused in a session.** The host only lets a comment's author edit it (`ownsComment`). A ripple that shifts someone else's pin lands in part and toasts a refusal. M and C leave pins absolute, which is correct. |
| `SCHEMA_REV` is 2 and the fingerprint fixture has no main-track data | `js/collab-core.js:29`, `:177-188` | **True.** |
| Suite conventions the designs assume | `tests/tests.js:36674` `withFakeNet921`, 253 tests tagged `{ item: '921' }`, `atWideWidth` `:70`, brand guard `:68197` | **True.** 153 suite references to `#tl-tracks`/`.track-row`, 10 to the New project dialog, 168 direct `FM.projects.create` calls. |

---

## 2. Scores

Criteria, 1–10, higher is better:
- **A.** First phase useful on its own
- **B.** Phase sizes (small and even)
- **C.** Testable with the existing suite and the 921 fake net
- **D.** Reuse of existing code
- **E.** Safety of the complex editor (10 = its behaviour cannot change)
- **F.** Safety of the shipped collab engine
- **G.** Accuracy and completeness of the code plan

| | A | B | C | D | E | F | G | **Total** |
|---|---|---|---|---|---|---|---|---|
| **M. model-first** | 6 | 6 | 9 | 9 | 8 | 9 | 8 | **55** |
| **U. UX-first** | 8 | 7 | 8 | 9 | 9 | 7 | 6 | **54** |
| **C. collab-first** | 3 | 3 | 8 | 5 | 2 | 2 | 5 | **28** |

---

## 3. Each design

### 3.1 M: model-first (`FM.spine`, `sm.main` / `sm.on`)

**Why it scores well**
- **The most testable engine of the three.** Every command is a pure function `(R, args) → plan`
  (`{moves, rides, sets, adds, removes, zMoves}`, M §3.4), and one runner applies any plan (M §3.6). A plan can be asserted
  without touching the DOM, and M §3.7's six invariants turn directly into seeded tests (T2 over 200 random spines). This
  is the shape `prove.sh` rewards: a mutated plan builder fails a specific invariant.
- **One edit really is one step and one tx.** Verified in §1: the runner's `mute()` also stands the collab ticker down.
- **Drag previews move DOM boxes only, with no scene writes until release** (M §14.5). This is the detail U misses: nothing
  half-done ever reaches the diff, the undo stack or a peer.
- **Almost nothing in the Full editor changes behaviour.** The split hook acts only when `sm` exists; `onCopy` only strips
  or remaps `sm`; the speed extraction (`FM.setClipSpeed` from `js/inspector.js:5850-5880`) is a refactor with the same
  code. The renderer is untouched until Phase 4 (M §12.1).
- **One helper and one route test for every copy site** (M §14.3, T6), which answers the whitelist-drift memory
  structurally rather than by care.
- **Collab needs no engine change until an optional Phase 6.** The pre-flight `blockers` read data the roster already carries
  (`ls` in `hostRoster`, `js/collab-presence.js:509-530`) and presence `af`. What it cannot prevent shows up as a seam chip
  that one tap fixes.
- **Labs flag on the first visible phase** (M §15 Phase 2): the editor reaches his phone without changing anything for
  anyone else.

**Serious flaws**
- **The first thing he can hold arrives late, and all at once.** Phases 0–1 are invisible. Phase 2 is roughly 2,750 new
  lines (`editor-mode.js` 250, `simple-timeline.js` 1,600, `simple-tools.js` 900) plus about 20 edits to existing files, in
  one release. His "I want to feel and see progress" (20 Sep) argues against that shape.
- **Attachments have two code paths.** `sm.on` is stored when Quick creates an item and derived otherwise (M §4.3), so
  every command and fixture has to cover both, and the stored id needs remapping in `reIdLayers`, duplicate, paste,
  the AI-op clone, element and template insert (M §14.2). U's rule gets the same behaviour with neither.
- **"On a fresh install, Quick" as the New-project default** (M §7, D2). On the suite's fresh profile this sends the ten
  dialog-driven tests into the new editor, and it changes his own daily flow before he has chosen. Keep Full as the
  default until the Labs flag comes off.
- **T9 "reports, not asserts, anomalies".** `ship.sh` refuses a test that does not fail with its fix reverted. It needs an
  asserted half (convergence, no clip lost) with the seam count as a reported extra.
- **The classifier's `fillsFrame` needs media dimensions.** For a collab guest whose media has not arrived, it falls back to
  transform scale (M §5.2). That fallback needs its own fixture, or the main track changes shape as the media lands.

**Leaves out:** the presence/media DOM coupling (§1); the phone dock (it does list `dockSheet`, M §14.2); what happens to
Quick's derived main track pre-adoption when a Full peer edits during a live session (it re-derives per draw: fine, but
untested).

### 3.2 U: UX-first (`FM.seq`, `seq.main` / `seq.stay`)

**Why it scores well**
- **The most incremental plan.** Phase 1 is a read-only simple view, the switch and the morph, behind which nothing writes
  except the opt-in "Make one from my clips" (flags only, one undo step). It is visible, it is nearly impossible to break a
  project with, and it lets him judge the thing he cares most about (the switch and the timeline shape) before any ripple
  code exists.
- **The cheapest data model to keep correct.** Attachment is derived at edit time from where an item starts (U §4.1),
  with one stored opt-out (`seq.stay`). There is no id inside the metadata, so there are no remap sites and nothing goes
  stale. **This is deterministic in collab too.** C's objection that "inference can't be made deterministic across two
  devices" (C §4.2) does not apply: only the editing device infers, and what it sends is the resulting absolute values.
- **The fewest touches in the complex editor.** Strip `seq.main` on copy; one layer-menu toggle; a thin stripe. No Full
  behaviour changes.
- **A structural collab gate** (U §10.2 rule 7): while a session is live, the simple editor is look-and-select only, with one
  line saying why. That lets Phases 2–3 ship without solving concurrent ripples at all, instead of guarding them half-way.
  It is exactly his "safeguards must be structural" rule.
- **Testable switch invariants**: no document write, no history entry, `FM.time` unchanged, and every clip's x the same
  across the switch to ±1 px (U §14.3). Cheap to write, cheap to prove.

**Serious flaws**
- **Live drags write the scene on every pointer move** (U §3.3: restore the snapshot, re-apply, per move). Solo that is
  fine. In a session (Phase 4) the 100 ms hot tick would stream every intermediate ripple, many starts plus whole keyframe
  lists, before the "all-or-nothing" commit tx exists to protect it. Either mute for the whole gesture (which queues all
  incoming messages for its length) or use M's DOM-only preview.
- **Phase 4 is underestimated.** An all-or-nothing tx (`all: 1`) is a host change plus a `PROTO` bump, and "re-run the same
  intent once" after a refusal needs an async refusal path back to the command, a full local revert of a step that the
  backstop only reverts path by path (`js/collab-session.js:310-330`), and removal of the failed step from that person's undo.
  It is sketched in three lines (U §10.2 rules 3–4).
- **`shiftComments` is refused by the host** for anyone else's comment (§1). It would land in part and toast.
- **Phase 1 relies on "today's inspector" on the phone**, whose dock measures Full's rows (§1). Phase 1 has to include the
  dock hook, which U only lists in §14.2 as "return early in Quick", contradicting §15.
- **Phase 1 is not small.** It carries the whole new timeline renderer (`quick-timeline.js` ~1,500 lines) and the per-layer FLIP
  morph with two extra variants. Ship the morph as its own step; a crossfade is enough for the first cut.

**Leaves out:** a pre-flight lease check for solo-to-live transitions (a session starting while a ripple is mid-gesture);
the presence/media DOM coupling; a stated default for the New-project cards on a fresh install.

### 3.3 C: collab-first (`main.k`/`main.gap`, `stick`, derived `start`, clip-relative keyframes on the wire)

**Why it matters, and what to graft**
- **The strongest correctness story.** "The layout is total over any document" (C §3.1) and G1–G6 (C §10.9) are the right
  shape of guarantee, and cases A–Q (C §10.3) are the best list of cross-editor scenarios in the three designs.
- **The best test list.** T1–T16 (C §10.10) fit the `921` harness exactly, each names the mutation that should break it, and
  T2 (ripple ⟂ keyframe in both orders) and T12 (fuzz with a *validity* check, not only convergence) are worth porting to the
  winning design in a measuring form.
- **"Keep my frame"** (C §10.5): when a remote edit slides the clip you are working in, your playhead slides with it. Local
  view state only, cheap, and it helps any design.
- **Undo labels with the editor they came from** (`commit({label, ed})`, C §11).

**Fatal for this lens**
- **Phase 0 is a protocol change to a shipped engine before any simple-mode UI exists.** Keyframes become clip-relative on
  the wire; the conversion touches diff and apply in three directions, snapshots, join, the backstop and deferred
  re-assert (§1). Collab is behind Labs *waiting on Ezra's own first Mac↔iPhone test* (fm-collab §1). Changing its wire
  before that test is the highest-risk step available, and its benefit (fixing a move-vs-keyframe race he has not hit) is
  invisible.
- **Phase 1 changes the complex editor's behaviour.** Main-track clips in Full stop being free: drags and trims write
  `gap`/`k` and "push" (C §3.5). That is a change to "his" editor (#966: the complex side keeps every option), and it only
  works if **every** writer of `start` is rerouted. C lists about 8; there are about 30 sites and at least 9 real writers it
  misses (§1). Each missed one becomes a Full feature that silently does nothing on a main clip, because the layout puts
  `start` back on the next refresh.
- **The host invariant as written would corrupt keyframes** (the `setStart` inconsistency, §1).
- **Its own go-ahead recommends bundling Phases 0–2** (C §17 D9 "B") so the first thing he sees is the editor: the riskiest
  wire change, the Full push rules and the whole Simple UI in one release. That is the opposite of incremental.
- **Old-build safety needs a new `sig` hash on save** (C §5) because derived starts can be clobbered offline. More moving
  parts in storage.

**Leaves out:** the ~20 unlisted start writers and conversion sites; performance of running the layout on every
`refreshAll` for projects that use it (it skips cleanly for those that do not, C §3.1, which is good); how a Full user
learns that "push" exists at all.

---

## 4. Ranking and the architecture that should win

1. **M: model-first (55).** The engine to build. Its plan-and-runner shape is the most provable, it makes one edit one tx by
   construction, and it changes nothing Full users can feel.
2. **U: UX-first (54).** Close behind, and better than M on the two things M does worst: a visible first phase, and a
   cheaper attachment rule. Graft both.
3. **C: collab-first (28).** Right about where the collab problems are, wrong about when to pay for them. Its derived layout
   is the right Phase 6 upgrade *if* real sessions show seams often (M §10.6 already reserves the slot).

**Winning core:** M and U's shared core: a per-layer flag (`sm.main`), `start` as the only stored time, main-track order =
order of `start`, magnetism as explicit commands that each shift `start` and keyframes (`FM.shiftLayerKeyframes`,
`js/scene.js:377`) of exactly the clips they move, in one muted commit. It wins on this lens because:
- **the renderer, exporter, Full timeline, collab engine and schema fingerprint are untouched** until transitions;
- **every Full edit stays legal** (the worst it can do is leave a gap chip), so the complex editor cannot regress;
- **the engine is pure and headless-testable**, and the collab side needs only a pre-flight check that reads existing data;
- **it can be upgraded to C's derived layout later without touching the simple editor's UI**, because the commands
  and the UI talk to plans, not to where `start` comes from.

### Grafts, in one list

| From | Graft | Why |
|---|---|---|
| U | Phase 1 = read-only simple view + switch + select, behind Labs | visible progress with no document writes |
| U | derived attachment + `stay` opt-out; drop M's stored `sm.on` (keep it as a later upgrade if relinking surprises people) | one code path, no remap sites |
| U | no simple-editor edits while a session is live, until the collab phase | ships Phases 2–3 without solving concurrent ripples |
| U | the switch invariants (no write, no step, x ±1 px) | cheap, provable |
| M | plan functions + one runner; DOM-only drag preview | provable, one tx, nothing half-done on the wire |
| M | `onCopy` helper + the every-route test (T6) | structural against whitelist drift (needed only for `sm.main` once `sm.on` is dropped) |
| M | pre-flight `blockers` + seam chips + Tidy as the collab-phase lift condition (instead of U's `all:1` retry) | no engine change, no `PROTO` bump |
| C | "keep my frame" (C §10.5), undo labels with `ed`, T2 and T12 as measuring tests (assert convergence and no loss; report seam count) | cheap, and the seam count decides whether Phase 6 is ever needed |
| C | derived layout + order keys + clip-relative keyframes | only as the Phase 6 upgrade, only on measured need |

---

## 5. Things all three miss (the synthesis must carry these)

1. **The phone sheet dock** measures Full's rows (`js/mobile.js:271-294`). The simple timeline needs its own dock target
   before anything opens a sheet from it.
2. **Presence draws on Full's DOM** (`js/collab-presence.js:1012`, `:1020`), and so does `js/collab-media.js:1325`. In the
   simple view remote selections would silently not draw. One `clipEl(lid)` hook that asks whichever timeline is showing.
3. **The New-project default touches the suite** (10 dialog tests) and his daily flow. Full stays the default until the
   Labs flag comes off.
4. **Collab comment pins** stay absolute (the host refuses others' edits, §1). Say so; don't ripple them.
5. **`FM.timeline.rebuild()` dispatch bypasses its own gesture guard** (`js/timeline.js:5212-5220`) when it returns early.
   The simple timeline needs the same "no redraw mid-gesture" rule of its own, which only U mentions (U §3.3).
6. **Test cost.** The suite is 3–4 minutes and `ship.sh` runs it twice; seeded fuzz over hundreds of rounds belongs in the
   `?only=` slices, with a small fixed-seed version in the main run.

---

## 6. A build order this lens would sign off

Each step ships on its own through `tools/ship.sh`, proven by `prove.sh`, at both suite widths.

| Step | What | Visible? | Size | Main tests |
|---|---|---|---|---|
| 1 | Plumbing: `sm` shape check in `sanitizeImportedLayers`/`sanitizeProjectFields`, `onCopy` at every copy site, the split hook, `FM.setClipSpeed` extraction, export the timeline helpers, dock and presence hooks | No | small | copy-route test; sanitiser junk/keep; speed slider unchanged |
| 2 | `FM.spine` read side: classify, sections, lanes, seams | No | ~400 lines | 12 hand-built fixtures (M T1), incl. a guest without media |
| 3 | The simple view, read-only, behind Labs: switch pill, timeline draw, select (opens today's panels, docked), gap chips shown | **Yes** | ~1,500 lines | switch invariants; 380 px screenshot sheet |
| 4 | Commands through the runner: append, insert, delete, trims, split, reorder, speed, lift/drop, Tidy; derived attachments + Stay put; DOM-only drag preview. Disabled while a session is live | **Yes** | ~900 lines | M §3.7 invariants over seeded spines; keyframes and caption cues; undo byte-for-byte |
| 5 | The tools strip/band and panels (reusing `openCategory`), start flow cards, Home chip; Labs off | **Yes** | ~900 lines | 380 px reachability; brand guard widened |
| 6 | Collab lift: presence `ed`, pre-flight blockers, seam chips, keep-my-frame; measuring fuzz | **Yes** | small–medium | fake-net cases (C T2, T4-like), fuzz reports seam count |
| 7 | Transitions and clip animations (renderer) | **Yes** | medium | preview = export at every seam |
| 8 | Only if step 6's numbers say so: C's derived layout | Maybe | large | C T1–T16 |

The morph animation and its #974 random variants can ride any step after 3; they carry no model risk.
