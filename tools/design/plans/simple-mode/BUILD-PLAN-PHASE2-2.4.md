# Simple mode: release 2.4 written in full ("riders, couplings and crossfades")

**For the BUILDER chat, after 2.3 has shipped.** This is the code `BUILD-PLAN-PHASE2.md` §6 listed as anchors and did not write.
Same method as 2.3 (`BUILD-PLAN-PHASE2-2.3.md`). It was written and run on a scratch copy of the 2.3 tip (`hunt/simple-2.3`, `974bc0fb`),
not a release. The finished code and tests are on branch **`hunt/simple-2.4`** (two commits on top of 2.3: `f4ab412e` and its rename
follow-up). This file is on `plans/simple-2.4`. Neither is merged into anything and neither touches `main`.

The exact hunks are **not retyped here**: they are `scripts-2.4/2.4-js.patch` (787 lines of `git diff`, six files, applies with
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

## 7. Written in §6 of the plan but NOT built here (deferred; each is small and listed so none is lost)

Rule 1b hidden helper · rule 2 null-parent mover · lineage resolution (rules 1/4/5) · tail-fit `couplingsBroken` · the opt-in volume rider · the camera
rest-pose hold pair · caption cue `cu`/`co` (needs Phase 4 uids) · `FM.remapCommentPins` · Sort by date · per-clip caption-follower window clamps on trims ·
the Bounce unit / FU2 case · a `SCHEMA_REV` re-check of the comment keys (the fingerprint test is green, but I did not bump `SCHEMA_REV`).
`FM.captions.splitAt` was not added: `captionRider` splits cues inline.

## 8. How to re-run

```bash
git fetch origin hunt/simple-2.4 && git worktree add /tmp/w24 origin/hunt/simple-2.4
cd /tmp/w24 && tools/serve.sh   # note its port
FM_CHROME=<chromium> python3 tests/_cdp.py --port <port> --width 1280 --url 'http://localhost:<port>/tests/run.html?only=simple%20P2.4'
```
`scripts-2.4/s2_run.sh` is the wrapper I used (it needs a throttle-capable driver copy; plain `tests/_cdp.py` works the same for these tests).
