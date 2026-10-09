# Simple mode: release 2.4 written in full ("riders, couplings and crossfades")

**For the BUILDER chat, after 2.3 has shipped.** This is the code `BUILD-PLAN-PHASE2.md` §6 listed as anchors and did not write.
Same method as 2.3 (`BUILD-PLAN-PHASE2-2.3.md`). It was written and run on a scratch copy of the 2.3 tip (`hunt/simple-2.3`, `974bc0fb`),
not a release. The finished code and tests are on branch **`hunt/simple-2.4`** (two commits on top of 2.3: `f4ab412e` and its rename
follow-up). This file is on `plans/simple-2.4`. Neither is merged into anything and neither touches `main`.

The exact hunks are **not retyped here**: they are `scripts-2.4/2.4-js.patch` (970 lines of `git diff`, six files, applies with
`git apply` on the 2.3 tip, no conflicts there) and `scripts-2.4/2.4-tests.patch`. A hand-copied hunk is a place for a typo, so the patch
is the source of truth and this file says what each piece is for and how to prove it. If the builder's tree is not the 2.3 tip, `git apply
--3way` and read every rejected hunk against §3.

**Not bumped, on purpose:** `index.html`'s version, the `?v=` busters and POLISH-LOG are NOT in the branch. The builder must bump the buster
of every changed file (`js/behaviors.js`, `js/collab-comments.js`, `js/collab-host.js`, `js/spine-edit.js`, `js/spine-words.js`) or `ship.sh`
refuses. POLISH-LOG line template: `- vX.YY — queue 980 (partial) — Simple: captions, the camera and a clip's own keys now move WITH their
clips through Delete, Insert, Reorder, Speed and the + (they used to refuse); a link that would slip asks first; a crossfade made in Full
survives edits; comments stay on their footage. Full is unchanged.`

## 1. What he sees

- Commands that used to say *"Captions here move with clips in the next update"* or *"The camera move here comes along in the next update"* now just
  work: the captions, the camera keys and any clip's keys ride the same edit as the clips.
- Delete says how many captions were too short to keep (*"1 caption too short to keep"*), that the camera moves, and that a crossfade was removed.
- A command that would pull a linked pair out of step **asks** (*"1 parent will slip"* with **Do it anyway** and **Why? ›**) instead of refusing.
  A camera whose window straddles a Reorder boundary asks the same way (*"1 camera move will slip"*); **Do it anyway** takes the hull.
- After a cut that moved three or more texts over a stay-put song, the line says *"Moved 3 texts with their clips"* with **Keep on the music** (one
  step: undo and run again with those texts pinned) and **Undo**. A lone title is not offered it.
- A comment pin made while Simple is on screen stays on its footage through a trim, split or speed change.

## 2. The method: one piecewise time map per command (§3.5)

`js/spine-edit.js` (new block, before "the commands (§3.6)"): `tmMake/tmOps/tmShift/tmCut/tmScale/tmPieces` (exported as `S.tm`). A map is pieces of
original time with an image `i0` and slope `k` (1 shift, 0 collapse, other = scale). A start goes through **R**, an end through **L**, which is what
lets one cue straddle an Insert (it splits, halves meet the new clips' edges) or a Delete (outside parts join). Reorder is a piecewise
translation (`translation: true`). Every command builds ONE map and calls `riderPlan(R, map, m).attach(plan)`: caption tracks (`captionRider`),
the camera (`cameraRider`: keys through the map, window through R/L or the hull), the loop region (`loopRider`), track and cut-item keys
(`S.riderKeys`, with boundary keys `split: 1, sb: 1` built by `S.seamKey` / `S.divideSegment`, a copy of `splitLayer`'s ease division so Full is
untouched), and owned crossfade keys (`stripOwned` = the static fallback, never `{kf: []}`). Maps per command:

| command | map |
|---|---|
| Delete | `tmCut(ca, b)` (plus the p-owns-fade branch) |
| TrimTail / TrimHead / Replace | `tmShift` (TrimHead: cut from the landing point, owned-head exemption) |
| Seam | `tmCut` for a gap, `tmShift` for an overlap |
| Duplicate / Insert / Append / IntoRow | `tmShift` (Duplicate also strips owned keys) |
| Reorder | `tmPieces` built after the loop from `cStart`, `len`, `s0` |
| Lift | `tmCut` |
| CloseAll | `tmOps` |
| Speed | `tmScale`, and caption followers scale (the 'riders' refusal is gone) |

`couplingBlock` pushes to `plan.asks` for a slip (still refuses for 'attached'). The runner has `R.anyway`, `ask()`, `opts.stayIds`,
`musicTimedOf()` → `plan.musicTimed`, and `speakDone` appends the cue / camera / loop extras. `js/spine-words.js` has the new lines.
`js/behaviors.js` `bounceDelta` skips `sb` keys when two unmarked remain (§0.4 B5; a Full document has no `sb`, so it renders bit for bit as before).
`js/collab-comments.js` `anchorPin` (Simple only) writes `lid` plus `ls` (video with a source) or `lo`; `CM.pinTime` is the one resolver (bisection,
nearest edge); `js/collab-host.js` keeps `ls`/`lo` only with `lid` (finite, 0..86400). `CM._anchorPin` is exposed for the test.

## 3. Tests: 13 new, 2 rewritten (all in `tests/tests.js`, `{ item: '980' }`)

| # | test (starts with `simple P2.4 ·`) | proves |
|---|---|---|
| 1 | T4 Delete of the middle clip maps both ends of every cue… | cues `[0.5,3.5],[3.8,4],[4,4.5],[5,7]`, 1 dropped and counted, window, 1 undo step |
| 2 | T4 Insert splits a cue… / Speed scales cues… | split at the seam, window grows; 2× gives `[0.25,1.75],[1.9,2.6]…` |
| 3 | T4 Reorder is a piecewise translation… | straddling cue splits, no overlap, loop travels or is cleared and said |
| 4 | T4 a caption track lying on a clip rides Speed… | used to refuse; hidden cues stay hidden |
| 5 | T3 a camera push-in rides Delete of an earlier clip | keys −len, pose over C unchanged; Stay put keeps absolute times |
| 6 | T3 rider keys keep the curve | ease-in-out cut mid-move keeps the pose to 1e-6; Insert inside a move holds the pose |
| 7 | T3 the + with a zoom keyed over the end card | zoom rides with the card; pinned camera does not |
| 8 | T3 Reorder with a trimmed camera ASKS | ask line, Do it anyway = hull (then the app stretches a camera starting at 0 to the project end, `js/app.js:925`, so it reads `[0,12]`), one step, Undo |
| 9 | T3 a link whose two ends move by different amounts is an ASK | "1 parent will slip", Why? ›, Do it anyway, one step |
| 10 | T9 a crossfade made in Full survives its owner's trim | fade keys move with the seam; Delete keeps / removes the blend and says so; Duplicate strips owned keys |
| 11 | T2 Keep on the music | said, one step, texts pinned; a lone title is not offered |
| 12 | T28 a comment pin… | `ls`/`lo` anchor, survives head trim and 2×, Full pin stays absolute |
| 13 | B5 Bounce skips `sb` keys | ring present with `sb`, masked without (control) |

Rewritten: **P2.1 "Delete never leaves a cut song's speed ramp behind its sound"** (was "refused until 2.4"; now passes because the ramp rides the cut) and
**P2.2 "the + moves the end card WITH a zoom keyed onto it"** (was "refuses until 2.4"; pinned case now asserts the keys stay at 6, 8).

## 4. What was run (Measured, in this container, Chromium 141)

| run | result |
|---|---|
| the 13 new tests on the **2.3 tip** (red before), 1280 | **0/13** pass: every one fails by what it does (e.g. *"Captions here move with clips in the next update"*, keys stay at 8,12) |
| the 13 on the 2.4 tree, 1280 and 380 | **13/13** and **13/13** |
| `?only=simple` (112 tests incl. the 13), 1280 and 380 | **112/112** both |
| `?only=comment` (20), 1280 | 19/20 + 1 NOT RUN HERE (967 B5 needs real touch) |
| `921 S1 schema fingerprint`, `921 S7 review`, `921 S3` (50), 1280 | 49/50: `921 S3 Stop sharing revokes the code…` is red **identically on the 2.3 tip** (Measured: same run, same message), so it is not this release |

**Mutations** (`tools/mutate.sh --only`, baseline green first, all CAUGHT): M1 `bounceDelta` threshold 2→3 (caught by B5); M2 camera hull
`if (!anyway)`→`if (false)` (caught by Reorder-asks); M3 `stripOwned` rest value first/last swapped (A rests at 0, caught by T9); M4 slip ask
disabled (caught by the link test); M5 `pinTime` source match disabled (caught by T28, pin on source 3.999999 not 2); M6 `loopRider` split test
disabled (caught by Reorder, loop not cleared). Script: `scripts-2.4/s2_mut.sh`.

## 5. What could NOT be run here

- **The Full-unchanged (FU) lock** (his rule: Full does not change): not runnable in this container. Read, not Measured: the only Full-reachable
  edits are `bounceDelta` (guarded by `k.sb`, which Full never writes), `COMMENT_KEYS` (additive, sanitiser keeps `ls`/`lo` only with `lid`) and
  `anchorPin` (returns at once unless Simple is on screen). The laptop's FU pass must run before this ships.
- Export tests are red everywhere here (Chromium 141 has no H.264/AAC). Not touched by this release.
- Nothing in 2.4 needs real touch (drags are 2.5), so no test here reports NOT RUN for that reason.

## 6. Ambiguous points (decide before building, or accept my call)

1. **The 1 ms seam nudge for the Cut pair** (`SEAMNUDGE = 1e-3`): the head seam sits 1 ms after the cut so the key pair does not tie. Alternative: exact tie and let `evalProp` pick the later. I kept the nudge; it costs 3 ms in the speed-ramp integral, which is why the ramp test computes `trimClipEdge` before mapping keys and uses `fromCut`.
2. **Delete with a fade `p` owns over `c`**: I keep the blend only if `p` is above `n` in z and the amount is within half the shorter clip; otherwise `n` lands at `p.end`, owned keys are stripped to the static value and the line says "removed 1 crossfade". §6 says "refused until 2.4"; it does not say which of the two to do.
3. **Reorder window hull**: a camera window crossing a boundary takes the hull of the images after Do it anyway; the alternative is a split camera, which Full cannot represent.
4. **A camera starting at 0 is stretched to the project end by the app** (`js/app.js:919-925`), so a hull `[0,10]` reads `[0,12]`. Existing behaviour, not mine; the test says so.
5. **Make overlay cue form for spanning tracks** and **effect-key handling for cue effects**: left as the 2.3 behaviour.

## 7. What 2.4 left out, and where it went (UPDATED for 2.4b: see §9)

The first cut of 2.4 left twelve things out. Ten are now built on **`hunt/simple-2.4b`** (§9), one is a finding that needs no build, and **one waits for Phase 4**:
`cu` / `co` (a caption cue's identity in a comment pin) needs the **keyed cue uid of the 4a′ schema step**, and this tree has no cue uid at all (`grep uid js/captions.js` is empty, and no collab file reads one on a cue). It waits for **whoever builds Phase 4's 4a′** (the collab schema owner: the same step bumps `SCHEMA_REV` 4 to 5 and adds the cue uid); `CM.pinTime` already falls back from `cu` to `lo` to `t`, so nothing breaks until then, and a pin on a caption track keeps `lo` (the track clock) meanwhile.

## 8. How to re-run

```bash
git fetch origin hunt/simple-2.4 && git worktree add /tmp/w24 origin/hunt/simple-2.4
cd /tmp/w24 && tools/serve.sh   # note its port
FM_CHROME=<chromium> python3 tests/_cdp.py --port <port> --width 1280 --url 'http://localhost:<port>/tests/run.html?only=simple%20P2.4'
```
`scripts-2.4/s2_run.sh` is the wrapper I used (it needs a throttle-capable driver copy; plain `tests/_cdp.py` works the same for these tests).

## 9. Release 2.4b: the rules 2.4 did not build (branch `hunt/simple-2.4b`, one commit stack on `hunt/simple-2.4`; patches in `scripts-2.4b/`)

`scripts-2.4b/2.4b-code.patch` (544 lines, six files plus the tray and the storage sanitiser) and `2.4b-tests.patch` (311 lines) apply with `git apply` to the 2.4 tip. Every item below has a test that is **red on the 2.4 tip** (or, for the four LOCKS, green on both on purpose), at 1280 and 380, and at least one mutation that the test catches (`scripts-2.4b/s7_mut.sh`: 21 mutations, **21 caught**; M9 first survived and its test was strengthened).

| # | rule (DESIGN §) | what was built | test (`simple P2.4b · S7 …`) |
|---|---|---|---|
| 1 | per-clip caption follower window clamps on trims (§3.6 Trim rows, §4.3) | a caption track lying inside a clip is clamped to the clip's new end by a tail or head trim, like an effect segment (the window is cut; cues past it are hidden by the window rule in `js/captions.js`, none rewritten) | a caption track lying inside a clip… (tail and head) |
| 2 | `FM.remapCommentPins` (§12.2, B25) | `js/collab-comments.js`; called from `applyScene`, `duplicateFrom` and `_adopt` (`js/storage.js`) before the project is installed; anchored pins only; mapped `lid` follows, an unmapped one bakes `t` through `CM.pinTime(c, oldLayers)`. `CM.pinTime` takes an optional layer list | FM.remapCommentPins (the pure function, import, duplicate) |
| 3 | the camera's rest-pose hold pair (§3.10 rule 3g) | the hull's uncovered stretches get a boundary pair of hold keys at scale 1, rotation 0, x/y at the centre, so those frames read as camera-less. **Measured premise:** an identity camera renders pixel-identical to no camera (test below); a camera with a dolly (`transform.z`) is the one case it does not hold, so it refuses with *"Open in Full to move this with its camera"* (rule 3g's own fallback) | the camera's hull… ; an identity camera… (the premise) |
| 4 | the opt-in volume rider (§3.10 rule 3) | `sm.rideVol` (a plain `sm` key: kept by the sanitiser, so **no SCHEMA_REV bump**), `S.cmd.rideVol`, a **Follow clips** tool on a stay-put sound that has a volume curve; the rider carries volume and opacity keys through the same time map; the song itself never moves | the volume rider; Follow clips |
| 5 | the link rule and rule 1b (§3.10 rules 1, 1b) | `R.couplings`, `R.lineageAt` (half-open), `rec.linked`; a unit parented to / Follow-targeting / Audio-Drive-sourcing another takes that unit's host; a hidden helper goes with its only user; neither gets an `sm` key (`neverPinned`). **Measured premise for 1b:** a hidden *matte source* is not drawn as a matte (the layer is cut out whole), so 1b covers parents and Follow targets only and a hidden matte source keeps rule 4's ask | the LINK RULE; rule 1b |
| 6 | rule 2: a Controller that parents main clips (§3.10 rule 2, §4.3) | `rec.mover`; `addNullMovers` (at the top of `couplingBlock`, so every command gets it) moves it, keys and all, by the one d its main-clip children share; never pinned | rule 2 |
| 7 | lineage resolution in rules 4 and 5 (§3.10) | `refEnds`: a parent or an Audio Drive source is the set of lineage members covering the follower's span; deleting the half a follower is stored on repoints it at the surviving half that covers its start inside the same plan (a plain parent still refuses, *"X is attached to Y"*) | rules 1, 4 and 5 through the split lineage |
| 8 | the tail fit counts: `couplingsBroken` (§3.10 rule 4, §4.5) | `S.fitTails(R2, plan, {anyway})` returns `notes.broken`; a tail unit that something is tied to and whose keys the fit would move makes the runner restore the document and ask once (*"1 parent will slip"*); Do it anyway fits it | the tail fit counts |
| 9 | Sort by date taken (§3.6 Sort row, §2.2 `taken`) | `S.planSort` / `S.cmd.sortByDate`, in Simple's ⋯ only when two main clips carry `taken`; packed in date order from the first start, each keeping its length, gaps closed (and said), followers and cues ride the piecewise translation, one step; *"Already in date order"* writes nothing; a crossfade, slot or block refuses. The sanitiser keeps `taken` as a plain layer field (finite, ≥ 0). **Not built: reading `taken` out of a picked file (EXIF / `mvhd`, §7.3): it belongs to the picker work.** | Sort by date taken |
| 10 | the Bounce unit / FU2 case (§0.4 B5) | LOCK: a layer Full splits rings across the cut exactly as before (no `sb` is ever written by Full), and the key sanitiser keeps `sb` / `split` on transform and volume keys | LOCK Bounce…; LOCK the key sanitiser… |
| 11 | the schema fingerprint / `SCHEMA_REV` re-check of the comment keys (§14.7) | **No bump needed, and here is why:** `schemaFingerprint()` hashes the layer sanitiser, the effect parameter definitions, the op grammar and the derived writers: not the host's comment sanitiser, which is where `ls` / `lo` live. LOCK: the host keeps `ls` / `lo` only with `lid`, finite and within 0..86400, and the fingerprint is unmoved. `sm.rideVol` and `taken` do not enter the fingerprint's fixtures | LOCK the host keeps a comment pin's ls / lo… |
| — | caption cue `cu` / `co` | **waits** (above) | — |

### Findings worth the builder's eye
- **Effect-parameter keys lose their `sb` / `split` marks on every sanitise** (`safeKfProp` rebuilds each key from the schema). Transform and volume keys keep them (the LOCK pins that). So a cut item's *effect* keys that `riderKeys` marked as boundary keys come back unmarked after a reload, Undo or host fix op: harmless for Bounce (it reads transform keys only) and for the later redundant-boundary clean-up (an unmarked boundary key is simply kept). Not fixed: widening `safeKfProp` would change what Full loads.
- **`Bounce` on a layer Full splits** stops ringing at the cut when the second half has only the seam key (it has fewer than two keys, so `bounceDelta` returns 0 before the lineage path): a Full behaviour today, not touched.
- **A hidden matte source cuts its layer out whole** (measured, §9 row 5). That is a Full behaviour too.

### Regression (Measured, Chromium 1194)
`?only=simple`: **127/127 at 1280 and at 380** (112 earlier Simple tests plus the 15 new). A wider slice (comment, duplicate, import, template, 921 S1 and S7, sanitis, orphan, volume, camera, sort, parent; 197 tests, 1280): **189/197 + 6 NOT RUN HERE**; the two reds (`effects: the Favourites browser sorts…`, `690 an MP4 of a project with a transparent background…`) are red on the 2.4 tip too. Not run: the Full-unchanged lock; a real device.

### Ambiguous points added by 2.4b
1. **Link rule scope:** it skips a unit that is Stay put, long, a tail item, in a slot, or a caption track; it does not read the matte source (rendered through the stored id, §3.10).
2. **Rule 2 mover** is `type === 'null'` only (a Controller). A group is membership, not a mover.
3. **A mover moving by d** can leave a Controller starting before 0 (a Controller that spans 0..end and moves back). Nothing clamps it.
4. **Sort's gaps** after a clip travel with that clip's cues (a translation has no way to collapse a stretch); the plan's *"cues over closed gaps collapse as in Delete"* is not built.
5. **The ask for a tail fit** restores the whole step and asks, so the tied unit's keys are never half-moved; the plan's *"without Do it anyway it gets only the duration change"* is the state it is in until the ask is answered.
