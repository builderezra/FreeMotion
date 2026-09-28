# Judge: technical soundness and risk

Step 2 of `STATUS.md`, judge panel. Lens: **correctness against the real code, data integrity for existing projects,
keyframe and caption timing under ripple, collab convergence and non-interference, undo, performance.** Written
29 Sep 2026 against HEAD `2d06a3f5` (v17.11) plus the working tree. Design only; nothing in the repo was changed
except this file.

The three designs judged:
- **M** = `design-model.md` (Quick/Full, `sm` namespace, `start` stays stored, magnetism in commands).
- **U** = `design-ux.md` (Quick/Full, `seq` namespace, same core as M, derived attachments, collab read-only until Phase 4).
- **C** = `design-collab.md` (Simple/Full, `main{k,gap}` + `stick{to,off}`, **derived `start`**, keyframes clip-relative on
  the wire).

---

## 0. Verdict in five lines

1. **Winning core: M's.** `start` stays the one stored time, magnetism is a behaviour of the simple editor's commands,
   one optional namespaced key per layer, nothing written on open, the Full editor untouched. It has the smallest blast
   radius and the best solo timing maths of the three.
2. **Graft C's "clip time on the wire" (§3.3) onto it as a separate collab phase.** It is independent of C's derived
   starts: under M's command ripple, a moved clip's *relative* keyframes do not change, so a ripple would ship only
   `start` values and the atomic-keyframe race (fm-collab §9.1 row 2) goes away for M too. It also fixes a Full↔Full race
   that exists today.
3. **Graft U's collab stance:** simple-mode *editing* is off in a live session until the hardening lands (U §10.2 rule 7),
   then all-or-nothing CAS txs with an intent retry (U §10.2 rule 3).
4. **Do not adopt C's derived start now.** It is the only design whose main track is valid by construction in collab,
   but it rewrites the Full editor's drag/trim code, overrides ~35 `start` writers, changes the lease meaning, and its
   stuck-item and caption timing has holes (§3 below). Keep it as M's own "Phase 6 option E" upgrade path, as M says.
5. **Every design claims more than it proves somewhere** (listed per design). None of them is fatal to M's core.

---

## 1. Code facts I re-checked (the ones the designs lean on)

| Claim | Where | Verdict |
|---|---|---|
| Keyframes are absolute; `FM.shiftLayerKeyframes` shifts every container in `FM.animatedProps` | `js/scene.js:377-380`, `:560-600` | **True.** Note the list is hand-kept; `sanitizeKeyframes` deliberately walks *every* `{kf}` generically because "a hand-kept list is a second source of truth" (`js/storage.js:1596-1600`). Matters for C (§4.2). |
| The Full clip drag writes `start` on every move and shifts keyframes only at pointer-up | `js/timeline.js:4142-4144` (move), `:5071-5075` (release) | **True** (C §3.3 is right). |
| `history.mute()` makes inner `commit()`s no-ops | `js/history.js:272-277` | **True.** |
| A collab hot tick cannot interleave with a muted multi-step command | `js/collab-bridge.js:177` (`busy` includes `isMuted`), `js/collab-session.js:207`, `:625` (remote batches queued while busy) | **True**, and it is what makes M's "one commit, one tx" claim hold even across `splitLayer`'s `await` (`js/app.js:4855` is `jobWrapped`, `:5026` awaits). None of the designs cites this; M's claim is right for a reason it does not give. |
| A lease refuses every op on the layer, the owner's included; fix ops skip the lease gate | `js/collab-host.js:834`, `:871`; `:713` | **True.** |
| An editor may not write a comment's `t` | `js/collab-host.js:87-101` (`editorCommentOp`: only `text`/`resolved`) | **Contradicts U** (`shiftComments` in `rippleFrom`, U §3.1, edge 19). |
| `trimLayerHead` moves `start`, not keyframes; floors duration at 0.1 | `js/timeline.js:4033` region | **True.** |
| `sanitizeTiming` floors `duration` at 0.05 and runs on every undo | `js/storage.js:1580-1581`, `js/history.js:71` | True; affects every design's "clamp to one frame" (§5). |
| `evalProp` call sites | grep | **888** in `js/` (U is right; M's "674 in compositor" is 743). |
| Other `start` writers that do not shift keyframes | `js/ai-ops.js:116` (`case 'start'`) | **Contradicts C's "one does not"** (C §3.3). |
| Captions editor takes a lease | `js/collab-presence.js:193-203` (`LEASED`) | **Not listed** unless it runs through `textEdit` (UNVERIFIED which). Matters for M and U's whole-list caption ripples (§2.3, §3.3). |

---

## 2. Design M (model-first)

### Scores (1–10)

| Criterion | Score | Why |
|---|---|---|
| Correctness against the code | 8 | File:line refs check out; the split, trim-head, speed and mute behaviour are described exactly. Two overstatements (below). |
| Data integrity for existing projects | 9 | Nothing written on open or switch (§5.3); adoption inside the first command's own undo step; one `FM.spine.onCopy` helper with a test that drives every copy route (§14.3), which is the right answer to the whitelist-drift history; `sanitizeSm` refuses bad shapes. |
| Keyframe and caption timing under ripple | 8 | The most complete of the three: head trim keeps keyframes and followers on the same footage frame (§3.4), speed scales followers *and* caption cues (`scaleSpan`), reorder lifts and re-pastes cues (`cutSpan/pasteSpan`), split re-homes followers inside `splitLayer` so Full splits are right too. One real hole: derived links can flip (below). |
| Collab convergence and non-interference | 5 | Converges (the engine guarantees it), but a ripple is N absolute `start`s plus N whole keyframe lists plus a whole caption list: concurrent edits resolve to consistent-but-wrong documents. The lease/drag pre-check (§10.3) removes the half-refused-ripple case in the common path; the rest is left to seam chips. |
| Undo | 7 | Solo: perfect (snapshot). Collab: per-person soft-skip leaves seams; honestly stated. |
| Performance | 8 | Trim/reorder drags preview in the DOM only and commit once (§14.5): no scene writes and no collab traffic mid-drag. Cached classifier. Tx-size limit (5000 ops) flagged and measured before shipping (edge 26). |
| Blast radius / build risk | 8 | Additive: new files, dispatch at `rebuild`/`updatePlayhead`, hooks at copy/split/extract sites. The Full editor's behaviour does not change. |

### Best ideas to graft
- **`start` stays the stored truth; magnetism lives in commands** (§2.1 option F). Renderer, exporter and Full need no change.
- **One runner** (`FM.spine.edit`, §3.6): lock check, collab blockers, mute, adopt, apply, one commit, one toast. Refuses the
  whole command rather than partially applying it.
- **Adoption on the first simple-mode command, not on open** (§5.3), and "Tidy" as an explicit step only.
- **The rider model for captions** (`shift/removeSpan/cutSpan/pasteSpan/scaleSpan`, §3.4), so one caption track spanning
  the whole video stays in sync through delete, reorder and speed. Neither other design covers all four.
- **DOM-only drag preview, one commit on release** (§14.5).
- **`FM.spine.onCopy` as the only thing that touches `sm` on a copy, plus a test over every copy route** (§14.3).
- Invariant list for the suite (§3.7), including "no seam changes kind except at the edit point".

### Serious flaws (with evidence)
1. **"The failure is always a visible seam" is false** (§10.4 last paragraph, §0 point 10). Its own table lists
   "animation offset from its clip" for a ripple against a keyframe edit; that is invisible, no chip shows it. The same
   holds for a caption list: a ripple writes the whole `captions` array (atomic, `js/collab-path.js:262`), and a peer's
   cue text typed on a pre-ripple view can be overwritten, or the ripple's shift lost. If the caption editor is not a
   leased tool (`LEASED`, `js/collab-presence.js:193-203`), the pre-check does not see it. That is **typed words lost**,
   not a seam.
2. **Derived links can re-home silently.** A Full-made item has no `sm.on`; its host is "the main clip containing its start,
   ≥50% overlap" (§4.3). Tail-trim clip A (item stays, §3.4 "followers of c are anchored to its start"), the next clip B
   slides left under the item, and the item now derives B as its host; the next ripple of B moves it. The design says the
   derivation "gives the same answer afterwards" — that is true for moves, false for trims. Fix: write `sm.on` for the
   followers a command reads, in that command's step (cheap, one field each).
3. **Two concurrent adoptions** (two simple-mode users, each device classifying on its own view) union their `sm.main`
   flags and can produce overlapping main clips. Rare; a chip shows it.

### What it leaves out
- The collab tx carries every moved layer's keyframe lists; it never considers clip-relative keyframes on the wire as an
  alternative to its own Phase 6 option E (the graft in §0).
- No CAS/all-or-nothing until Phase 6, and editing is *on* in live sessions from Phase 2.
- Minimum length: "≥ 1 frame" is below `trimLayerHead`'s 0.1 and `sanitizeTiming`'s 0.05; the next undo re-sanitises it and
  makes an overlap (see §5).

---

## 3. Design U (UX-first)

### Scores

| Criterion | Score | Why |
|---|---|---|
| Correctness against the code | 7 | Refs mostly right (888 `evalProp` is correct). One code fact wrong: ripples shift comment pins (`shiftComments`), which the host refuses for every role (`editorCommentOp`, `js/collab-host.js:87-101`). Says "no `SCHEMA_REV` bump for phases 1-4" while adding sanitiser rules. |
| Data integrity | 8 | Nothing changes until "Make one from my clips" (one undoable, flags-only step). Strips `seq.main` on Full copies. But a ripple **moves a locked main clip** (edge 5), writing to a layer the person locked. |
| Keyframe and caption timing | 7 | Head trim and speed keep followers on their frame; cue-level ripple for ±delta is careful. But **reorder (`moveMain`) never touches caption cues**, so captions stay behind a reordered clip, and speed does not scale the cues over the re-timed clip. |
| Collab | 6 | The safest *interim* rule of the three: Quick is look-and-select only in a live session until Phase 4 (rule 7). Phase 4's all-or-nothing CAS with an intent retry and the held-keyframe rebase in `release()` are sound directions. It states the leftover race plainly (§10.3). |
| Undo | 7 | As M. |
| Performance | 6 | Live drag "restores the snapshot and re-applies the operation" on every pointermove (§3.3): scene writes of `start` and whole keyframe lists for every touched layer at pointer rate, and (once editing is on in sessions) the collab hot tick streams them as many non-atomic txs, which undercuts its own all-or-nothing rule (that rule marks *commits*, not ticks). |
| Blast radius | 8 | Same additive shape as M. |

### Best ideas to graft
- **Rule 7:** no simple-mode editing in a live session until the collab hardening ships. It is the only thing that keeps a
  half-guarded ripple off a shared project in the first releases.
- **All-or-nothing CAS tx (`all:1`) with one intent retry** (rule 3). The `q:1` CAS machinery already exists
  (`js/collab-host.js:350-387`); it closes M's concurrent-ripple seams on the simple side.
- **"Put behind" check** for a main clip Full moved above an overlay (§3.6) — the only design that notices z-order drift.
- `hostMap` taken once, before anything moves (§3 rule 4), so move order never changes who follows whom.
- Shared `pxPerSec`/scroll between the two timelines so the switch morph is almost purely vertical (§6.3).

### Serious flaws
1. **Comment pins in `rippleFrom`**: refused by the host in a session (role filter answers with the host value), so every
   ripple produces refusals and pins that move only solo. Drop it (M and C leave comment `t` absolute).
2. **Live drag writes the scene per pointermove** (§3.3): per-move keyframe rewrites of every follower cost the phone,
   and they reach collab as ticks. Use M's DOM-only preview.
3. **Reorder loses captions** (§3.2 `moveMain` has no cue handling).
4. **Locked clips are moved by ripples** (edge 5). M refuses the whole command instead, which is the safer rule.
5. **Derived attachment by start only** (§4.1) has the same trim re-home problem as M §2 flaw 2, and U never stores the link
   even for items Quick creates, so it cannot be fixed by writing links.

### What it leaves out
- Caption scaling under speed and caption handling on reorder.
- The tx-size ceiling for a big ripple (5000 ops).
- A test that a ripple never half-applies (it relies on Phase 4 for that).

---

## 4. Design C (collaboration-first)

### Scores

| Criterion | Score | Why |
|---|---|---|
| Correctness against the code | 7 | The collab reading is the sharpest of the three (drag-time keyframe shift confirmed, lease and fix-op lines right, anchor-to-top fallback right). But three claims are wrong or inconsistent (below). |
| Data integrity | 6 | Nothing changes for a project until adopt, and adopt moves nothing. But Phase 0 changes the wire format for every live session, the layout silently overrides every `start` writer for derived layers, and the old-build `sig` check re-adopts (writes) on open. |
| Keyframe and caption timing | 6 | Keyframes commute across people beautifully. But stuck items do not follow the footage on a head trim or a speed change, and a caption track spanning several clips has no cue-level ripple at all. |
| Collab | 9 | The only design with a validity guarantee (no overlap, no gap nobody made) under partial refusal, stale undo and old builds, because the layout is total. Leases stop blocking time moves they were never meant to block. The fuzz test asserts *semantic* invariants (G2–G4), which no `921` test does today (fm-collab §7). |
| Undo | 9 | A ripple is one field, so its undo is one field: no soft-skip holes; a reorder undo puts back one key, not the whole list. |
| Performance | 7 | Far fewer ops on the wire; layout memoised and skipped when unused; but it runs in `normalizeDerived` on every hot tick (100/125 ms) on every device. |
| Blast radius | 4 | Touches `collab-path`, `collab-diff`, `collab-session`, `collab-host`, the Full drag, both Full trims, the inspector's start field, the exporter and `refreshAll`. Phase 0, the riskiest change, is invisible to him. |

### Best ideas to graft
- **Clip time on the wire** (§3.3): keyframes cross the wire and sit in base as `t − layer.start`, converted at the diff and
  apply edges only; the app keeps absolute time. A move ships `start` only. This fixes the ripple-vs-keyframe race for M's
  architecture as well, and a Full↔Full race that exists today. **Condition:** the conversion must use the same collector
  as `shiftLayerKeyframes` (`FM.animatedProps`), not "every `kf` key under `L/<id>`", or the two disagree (flaw 2).
- **Fix the Full drag to shift keyframes per move** (`js/timeline.js:4142` vs `:5073`), with the T3 detector for any
  writer that moves `start` without its keyframes.
- **Lease semantics:** a lease protects a layer's content, not its time (§10.4). Worth adopting even under M: the ripple
  pre-check then refuses only when the command would edit a leased layer's own fields, not merely shift it.
- **"Keep my frame"** (§10.5): when a remote edit moves the clip you are working in, your playhead moves with it.
- **Semantic fuzz invariants** (§10.10 T12) and the per-case worked table (§10.3) as the collab test plan.
- `sm.home` / per-device editor memory (shared with M and U) and presence `ed`.

### Serious flaws (with evidence)
1. **Internal inconsistency about where the derived-start rule lives.** §10.2.1 says the *diff* stops emitting a derived
   `start`; §14.2 puts the rule in "`syncable`/`canon`/`clone`'s path filter". `syncable` is key-only
   (`js/collab-path.js:175`); if canon and clone drop a derived `start`, the hash stops covering it and base stops holding
   it, which breaks §4.4 (orphan repair reads "the item's start in the host's base") and §10.11 ("the hash covers base, and
   base includes the host-written derived starts"). Only the diff-only reading works, and then base and live disagree on
   `start` on every guest by design, which the code comment at `js/collab-path.js:162-173` warns is the path to "disagree
   forever" unless every consumer is audited.
2. **The keyframe conversion set is not the shift set.** Conversion is by key name (`kf` anywhere under the layer);
   `setStart`/apply-of-`start` shift only `FM.animatedProps` (`js/scene.js:560-600`), a hand-kept list that has already
   missed draw-on, point sets and crop in the past (its own comments). Any keyframed prop outside the list becomes a
   phantom keyframe edit on every move. Fix: convert exactly `FM.animatedProps(layer)`, and add a test that the two sets
   match on the kitchen-sink fixture.
3. **"Only one writer forgets the keyframes" is wrong**: `js/ai-ops.js:116` writes `start` with no shift. More broadly,
   there are ~35 layer `start` writers (`ai-ops`, `app.js:4467/4771/4823/4833/5074`, `inspector.js:3466/5816`,
   `storage.js:3343/3619`, `audio-tools.js:178`); for a derived layer the layout silently overrides every one of them on
   the next `refreshAll`. The design routes three of them (drag, trims, inspector); the rest would "snap back".
4. **Stuck items drift off their footage on a head trim.** Simple trim-start (§3.4) changes `trimStart`/`duration`/keyframes
   but not the items' `stick.off`; Full trim-start (§3.5) changes the host's `gap`, which moves the host's derived start and
   every stuck item with it. Today in Full, a head trim moves nothing else. Needs `off −= Δ` per stuck item, in both.
5. **Captions.** Existing caption tracks spanning several clips get stuck to the clip their start falls in (adopt, §5) and
   then move as one block: delete clip 2 and its cues stay, the later cues do not pull back. "One caption track per clip"
   (§12) proliferates layers in Full and still desyncs on a speed change (offsets are not scaled, edge 13).
6. **The Full editor changes behaviour** (push rules, no overlap between main clips) — against #966 "the complex side keeps
   every option", mitigated only by "Take off main track".

### What it leaves out
- Cue-level ripple for multi-clip caption tracks.
- A keyframe *drag* in progress while a remote ripple shifts that clip: the layout shifts the list under the graph editor's
  finger (the held/deferred rule protects values arriving over the wire, not a local derived writer).
- Rollout: Phase 0 changes every session's wire format before he sees anything.

---

## 5. What all three leave out (for step 3, hole-poking)

1. **Minimum clip length vs the sanitisers.** "Clamp to one frame" (M §3.4, U §3.2) is below `trimLayerHead`'s 0.1 s and
   `sanitizeTiming`'s 0.05 s (`js/storage.js:1581`), and `history.restore` re-sanitises every layer (`js/history.js:71`). At
   60 fps a 1-frame clip becomes 0.05 s on the next undo and overlaps its neighbour by 0.033 s, twice the ½-frame tolerance.
   Use `max(1 frame, 0.1 s)`.
2. **Behaviours and effect-phase integrals.** Behaviour time basis is unverified (fm-model §5), and some effects integrate
   keyframed params from 0 (`js/compositor.js:9684`). If either reads absolute time, a ripple shifts their phase.
3. **Caption cue effects' keyframes** live inside the atomic `captions` value; their clock is unverified. All three shift
   cues without saying what happens to those keyframes.
4. **The caption editor and leases.** Whether cue editing is a leased tool decides whether any ripple can clobber typed
   words. Measure it before choosing M/U's whole-list caption ripple for live sessions.
5. **Adjustment layers and clipping masks over rippled clips.** An adjustment layer "follows" one clip (≥50% or start rule)
   but grades everything below it; after a ripple it may grade a different clip. Pixel-level parity under ripple is not
   tested by any design.
6. **Group spans under ripple.** M shifts a whole unit (no refit needed); U calls `FM.refitGroupsFor`; C refits at commit.
   A group whose members are only partly moved (a follower shifted, its sibling not) is not covered by any.
7. **Old builds offline.** Only C addresses a stale PWA editing a shared project offline (`sig`). M/U rely on `SCHEMA_REV`,
   which does not cover local edits made later and reopened on a new build (they just show seams, which is acceptable).

---

## 6. Ranking and recommended core

| Rank | Design | Total (7 criteria) | One line |
|---|---|---|---|
| 1 | **M** | 53 | Soundest core, smallest blast radius, best solo timing; its collab weakness is fixable by grafts. |
| 2 | **U** | 49 | Same core, thinner maths, two code-level mistakes, but the safest interim collab rule. |
| 3 | **C** | 48 | Best collab by far and the best single idea (clip time on the wire), but its derived-start core has the highest risk and real timing holes. |

**Core architecture that should win: M's option F** — per-layer optional namespace (`sm.main`, `sm.on`), `start` stored,
ripple as one explicit, locked-checked, lease-checked, single-commit command, nothing written on open, the Full editor
untouched. It is the only core whose failure modes are local and whose build can be proven phase by phase without touching
the collab engine.

**Grafts, in build order:**
1. From M itself: write `sm.on` for any follower a command acts on (closes the derived-link re-home).
2. From U: simple-mode editing off in live sessions until step 4 below ships; drop comment-pin shifting; refuse on locked.
3. From C, as its own phase with its own `SCHEMA_REV` bump: clip time on the wire (conversion over `FM.animatedProps`
   exactly), the per-move keyframe shift in the Full drag and `ai-ops.js:116`, the T1/T3 tests. A ripple then ships
   `start` only.
4. From U: all-or-nothing CAS tx with one intent retry (`PROTO` bump). With 3 in place, the only remaining cross-person
   hazard is two people moving the same clip, which is today's last-to-let-go-wins.
5. From C: lease-means-content-not-time, "keep my frame", semantic fuzz invariants (G2–G4 as *reported* for M's model).
6. Keep C's derived layout as the named upgrade path only if real sessions show seam chips often.
