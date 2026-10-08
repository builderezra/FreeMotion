# H57: the H51 memory stack on newest main, in three landable groups

**Result.** The 14 patches of `hunt/memory-stack` are now on `origin/main` **842a23de (v17.29 + notes)** as **`hunt/memory-stack-2`** (a NEW branch; `hunt/memory-stack` is untouched), as **three commits, lowest risk first, each carrying its own tests**. The `js/` of the finished tree is **byte-identical** to the H51 stack tree (`git diff origin/hunt/memory-stack HEAD -- js` is empty: v17.28 and v17.29 changed tools and notes only), so H51's full-suite result (same reds as the baseline at 1280 and 380, none new) still describes this code (Read, not re-run). Each group's tests are red on the tree before the group and green with it, at 1280 and 380 (Measured). Re-measured on the phone session **twice per tree**: the whole of the memory saving comes from **group C**, the riskiest group; A and B change nothing in this session.

## The three groups (`git log origin/main..hunt/memory-stack-2`)

| group | commit | patches (H51 file numbers) | what they touch | tests it carries |
|---|---|---|---|---|
| **A: export and storage cold paths** | `6e009ce6` | 0005 motion-flow state cleared after an export · 0006 audio mix frees its PCM · 0007 `_prevFiles` sweep · 0010 `_prevFiles` held weakly · 0011 its test · 0014 VideoFrame / AudioData closed on a failed export | `js/exporter.js`, `js/storage.js`, one line in `js/compositor.js` | 6 (H40 mflow, H40 audio mix, H40 prevfiles sweep, H44, 1011 ×2) |
| **B: caches that regenerate** | `a5121dd1` | 0003 effect-thumbnail stock capped · 0012 image fills freed from a previous project (#1009) · 0013 the no-GPU blur fallback buffers (#1010) | `js/fx-thumbs.js`, `js/compositor.js`, `js/storage.js` | 3 (H40 fx-thumbs, 1009, 1010) |
| **C: the compositor's pools** | `c94a50ee` | 0001 scratch pools trimmed (#1095) · 0002 its test · 0004 pools release after idle · 0008 filter-container plates · 0009 its test | `js/compositor.js` only | 3 (1095, H40 pool idle, H43) |

**Why this order (a judgement, labelled; nothing here is a measured risk).**
- **A runs only at the end of an export, on an export that failed, or when a replaced clip's undo file is swept.** No frame is drawn by anything in it, so a mistake costs a leak or an undo file freed too early, not a wrong picture. The one place to watch is 0007/0010: the file kept for undo of a replaced clip is dropped once the clip is unreachable and held weakly, so "Undo a Replace media" must still find its file (the group's own test asserts it is kept while the clip is in the scene or any snapshot).
- **B can change what is on screen, but only by regenerating**: an evicted effect tile is made again when it is mounted (a brief blank tile at worst), a fill picture is freed only after the project that used it was left (a wrongly freed one would draw nothing: the 1009 test also asserts the fills of the project he stays in are not decoded twice), and the CPU blur reuses scratch buffers (the 1010 test asserts it draws the same picture every time).
- **C sits in the render loop.** The pools are used by every effect stack on every frame and trimmed by a timer; a mistake shows as a flash, a re-creation cost every frame, or a wrong picture. Its tests assert the same picture before and after the trim, and that the floor entries are released after a full-size frame.
- **Independence (Measured):** the groups were applied in this new order (A, then B, then C), not the order H51 tested. The same 14 patches' `js/` hunks apply with no conflict in either order; only `tests/tests.js` conflicted (every test hunk wants the same append point), which `scripts` resolves by taking each commit's own hunks. Dependencies inside a group: 0002 needs 0001, 0009 needs 0008, 0011 needs 0010, 0014 comes after 0005 and 0006 (all kept in order).

## Tests per group (Measured, 1280 and 380; the runner's own `?only=`)

| group | on the tree BEFORE it, with its tests | on its own tree | cumulative (all 12 on the final tree) |
|---|---|---|---|
| A | **0/6** at 1280 and 380 | **6/6** at both | |
| B | **0/3** at both | **3/3** at both | |
| C | **0/3** at both | **3/3** at both | **12/12** at both |

How red-before was taken: the group's `tests/tests.js` is put on the previous commit's tree (main for A), the group's tests run, restored. **Be straight about what "red" means for four of the twelve:** they fail first because the seam the group's code adds is not there yet (`FM._mflowSize` for the H40 mflow test, `FM.fxThumbs.cacheBytes` for the fx-thumbs test, `FM._poolStats` for the pool-idle and the H43 test), not because a number is wrong. The other eight read the real behaviour on the old tree (for example *"a failed export made 3 VideoFrames and closed 2: 1 leaked"*, *"60 of the 63 fill pictures are still alive after the project that used them was left"*, *"three blurs of the same 160x120 plate made 6 new big Float32Arrays"*). The mutation proofs for each patch are in their own hunt docs (H40, H43, H44, H27); I did not re-run them.

## The phone session, twice per tree (Measured; `stack_session2.py`, 380 px, 1080×1920 project, 20 imported clips, one effects sweep, editing, one GIF export, 45 s idle)

Main = clean worktree of `842a23de`; stack = `hunt/memory-stack-2`. Run order alternated: main, stack, main, stack. Means are of the two runs (`h57_*.out`, `stack_session_*.json`; arithmetic done by a script, not by hand).

| stage | canvases main / stack | canvas Mpx | renderer VmData MB | renderer RSS MB |
|---|---|---|---|---|
| 0 boot | 3 / 3 | 0.3 / 0.3 | 710 / 725 | 213 / 213 |
| 1 after 20 clips | 61 / 63 | 4.9 / 4.9 | 927 / 930 | 528 / 516 |
| 2 after the effects sweep | 248 / 176 | 29.7 / 13.6 | 1607 / 1565 (-42) | 1047 / 981 (-65) |
| 3 after editing | 226 / 164 | 32.1 / 13.9 | 1480 / 1378 (-102) | 731 / 661 (-70) |
| 4 right after the GIF export | 207 / 145 | 81.5 / 63.3 | 1678 / 1577 (-101) | 871 / 795 (-76) |
| **5 after 45 s idle** | **207 / 128** | **81.5 / 27.9** | **1681 / 1450 (-231, -14%)** | **817 / 662 (-155, -19%)** |

**The noise band, which H51 could not give (one run per tree).** Canvas counts repeat to within 4 canvases per tree; Mpx repeats on the stack (27.9 both) but not on main's sweep and edit stages (27.9 vs 31.5, 30.7 vs 33.6). **RSS is not**: main's last row was 742 and 891 MB (a 150 MB spread), the stack's 667 and 656 MB. VmData is tighter (main 1666 / 1695, stack 1433 / 1467: about 30 MB). So read the **canvases and VmData** rows as the result and the RSS rows as direction only: the stack is lower in every run's idle RSS, but the size of the gap is somewhere between 75 and 235 MB. Stage 1 (no patch acting yet) is within +-2 canvases, +-12 MB RSS, which is that noise.

### Which group does it? (one run each, so a single sample, same script)

| tree | canvases at idle | canvas Mpx at idle | VmData at idle | RSS at idle |
|---|---|---|---|---|
| main (2 runs) | 207 / 207 | 80.1 / 83.0 | 1666 / 1695 | 742 / 892 |
| main + A | 207 | 79.5 | 1711 | 868 |
| main + A + B | 207 | 80.1 | 1637 | 781 |
| main + A + B + C (the stack; 2 runs) | 127 / 128 | 27.9 / 27.9 | 1433 / 1467 | 667 / 656 |

**Reading it:** A and B do nothing visible in this session (canvases and Mpx stay at main's; VmData and RSS differences are inside the noise band above). **Everything that shows up is group C**: 80 fewer canvases and 52 Mpx less at idle, about 200 MB of VmData. That is not a surprise for A (an export that fails, a replaced clip's undo file: this session does neither) but it is for B's thumbnail cap: **one pass over 12 categories (4 tiles each, 48 in all) probably never reaches the cap** (Guess: I did not read the cap's value against that count), so this session may not be able to show it. A longer browsing session would. This is the honest cost of landing lowest risk first: **the measurable saving arrives with the last, riskiest group.** Two ways to decide: land A and B anyway (they close real leaks this session does not reach), then C with its own review; or, if the phone is the priority, **split C**: its five patches are `compositor.js` only, and I did not measure which of 0001 / 0004 / 0008 carries the saving (that is the next measurement: three more sessions, about 17 minutes each).

## What I did not do
- **No full-suite run on this tree.** The `js/` is identical to the H51 tree (above), whose full suite at 1280 and 380 had the same reds as the baseline and none new; the group tests were re-run here. If the builder wants it re-proved on the branch itself, `memory-stack-suite/h51_slices.sh` on `hunt/memory-stack` is the method.
- No `ship.sh` / `prove.sh`, no mutation re-proof, no real iPhone, and no repeat beyond two runs per tree (one for the group attribution). Busters and POLISH-LOG are the builder's: this branch changes `js/compositor.js`, `js/exporter.js`, `js/storage.js`, `js/fx-thumbs.js`.

## Reproduce
```
git fetch origin hunt/memory-stack-2
git worktree add --detach /tmp/stk2 origin/hunt/memory-stack-2
git log --oneline origin/main..origin/hunt/memory-stack-2        # the three group commits
# the tests of one group:  tests/run.html?only=<names, one per line, as in memory-stack-2/h57_groups.sh>
# the session: serve main and the stack on two ports with an h44c00.webm at each root (ffmpeg line in hunts/memory-stack.md),
#   python3 memory-stack-2/stack_session2.py http://localhost:<port> <label> <cdp port> 1
```
`memory-stack-2/` holds the build script (`h57_build2.py`, which builds the groups from the H51 commits), the runners, the session outputs and every test JSON.
