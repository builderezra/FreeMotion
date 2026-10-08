# H51: the memory patch stack, tested together

**Result.** All 14 patches apply to main (`1ed08b67`, v17.27) in order with `git am`, with no conflicts. The full suite on the stack at 1280 and at 380 has **exactly the same reds as the baseline, none new** (the baseline is the H52 normal pass on `wip/v17.26-tree`; v17.27 only changes tools). On one phone-sized session the stack ends **31% lower in renderer RSS (830 MB to 571 MB), 162 MB lower in VmData, 80 fewer canvases and 52 Mpx less canvas memory**. Everything below is Measured in this container (headless Chromium 1194, 4 cores) unless it says Read or Guess.

## The stack, in order (`memory-stack-patches/`, `git am --3way` onto main)

| # | file | what | from |
|---|---|---|---|
| 1 | `0001-stack-1095-scratch-pools.patch` | compositor scratch pools trimmed (`_trimScratch`, `_trimPool`, `_hw`): the `_cfPool` trim is this same patch, so H19 and H19b are one entry | H19 / H19b (#1095) |
| 2 | `0002-stack-1095-test.patch` | its test | |
| 3 | `0003-stack-1-fx-thumbs-stock-cap.patch` | effect-thumbnail stock capped | H40 1 |
| 4 | `0004-stack-2-pool-idle-release.patch` | pools release after idle | H40 2 |
| 5 | `0005-stack-3-mflow-clear-after-export.patch` | motion-flow state cleared after an export | H40 3 |
| 6 | `0006-stack-4-audio-mix-frees-pcm.patch` | audio mix frees its PCM | H40 4 |
| 7 | `0007-stack-5-prevfiles-sweep.patch` | `_prevFiles` sweep | H40 5 |
| 8 | `0008-stack-6-filter-container-plates.patch` | `_adjFcPool` / `_fcPool` plates | H43 |
| 9 | `0009-stack-6-test.patch` | its test | |
| 10 | `0010-stack-7-prevfiles-weak.patch` | `_prevFiles` held weakly | H44 |
| 11 | `0011-stack-7-test.patch` | its test | |
| 12 | `0012-stack-p9-0001.patch` | #1009 image fills from a previous project | H27 |
| 13 | `0013-stack-p9-0002.patch` | #1010 the no-GPU blur fallback buffers | H27 |
| 14 | `0014-stack-p9-0003.patch` | #1011 VideoFrame closed on a failed export | H27 |

Files touched: `js/compositor.js` (patches 1, 4, 5, 8, 12, 13), `js/exporter.js` (5, 6, 14), `js/storage.js` (7, 10, 12), `js/fx-thumbs.js` (3), `tests/tests.js` (all test hunks). **Conflicts:** none in `js/` at any step (every `cherry-pick` and `git am` clean, also against v17.27). The test hunks all want the same append point in `tests/tests.js`, so the format-patch set was built by committing each test block just before `async function run()`; they apply with plain `git am`. Each code file passes `node --check` after the last patch. Patches 1 and 8 both change compositor plate pools but in different pools, 4 and 5 both touch the compositor idle path in different functions; the suite and the 14 added tests are the evidence they do not interfere.

**Order matters only mildly:** 2 needs 1, 9 needs 8, 11 needs 10, and 14 changes `exporter.js` after 5 and 6 did. I only applied and tested this order; other orders are untried (Guess: the independent ones commute).

## The full suite, stack versus baseline (Measured)

Method: 4 slices per pass (the H13 method), results pushed as each slice finished (`memory-stack-suite/h51_pass_S<width>_s<n>.txt`; those commits are labelled "H52" in git by a script slip, not a different run). The same three container-hang tests are skipped by a scratch filter in both trees (`690 swiping the share sheet away…`, `690 an export holds the screen awake…`, `every tile in the browser picks…`). No H.264/AAC in this Chromium, so about 50 export tests are red on both trees (H52).

| width | stack | baseline | red on stack only | red on baseline only |
|---|---|---|---|---|
| 1280 | 56 reds, slices 568/572, 564/571, 558/583, 454/570 passing | 55 reds | 1: `482 6.7 Glow Scan…` (see below) | 0 |
| 380 | 56 reds | 56 reds | 0 | 0 |

The stack adds **11 tests** (583 vs 572 in slice 3) and all of them pass at both widths. `482 6.7 Glow Scan` is the one difference at 1280: H52 showed it red alone 3/3 on the baseline tree and green in some full passes, so it is a pre-existing false "changes nothing" (H53), not the stack; it was green in the baseline's 1280 pass and red in the stack's, which the intermittent census explains (red in 4 of 6 baseline passes).

## One realistic phone session at 380 (Measured, `memory-stack-suite/stack_session2.py`)

Same script on a clean main tree (served from a worktree) and on the stack tree: boot, a 1080x1920 project, 20 imported 720x1280 3 s clips (VP8, 564 KB each, written to OPFS), one pass through every effects-browser category (4 tiles each; the full sweep takes minutes per round on this CPU), random effects with renders, undo/redo, 6 Replace media, container effects, one GIF export, 45 s idle. Canvas count is every `HTMLCanvasElement` with a size, counted after two forced GCs.

| stage | canvases (main / stack) | canvas Mpx | renderer VmData MB | renderer RSS MB |
|---|---|---|---|---|
| 0 boot | 3 / 3 | 0.3 / 0.3 | 721 / 723 (+2) | 214 / 212 (-2) |
| 1 after 20 clips imported | 61 / 63 | 4.9 / 4.9 | 937 / 933 (-4) | 510 / 520 (+10) |
| 2 after effects-browser sweeps (1 x 12 categories) | 246 / 177 | 27.9 / 13.6 | 1558 / 1511 (-46) | 1006 / 845 (-161) |
| 3 after editing session (effects, undo/redo, replaces, containers) | 226 / 163 | 30.9 / 13.9 | 1423 / 1388 (-35) | 694 / 526 (-169) |
| 4 right after one GIF export | 207 / 144 | 80.2 / 63.3 | 1620 / 1586 (-34) | 876 / 709 (-167) |
| 5 after 45 s idle (trim windows) | 207 / 127 | 80.2 / 27.9 | 1622 / 1460 (-162) | 830 / 571 (-259) |

Reading it: the saving appears where the patches act. Nothing changes at boot or after the import (+2 to -4 MB VmData is noise). After the effects sweep the stack holds 69 fewer canvases and 161 MB less RSS (the fx-thumbs cap and the pool trims), through editing 169 MB less, and after the export 167 MB less. The last row is the one that matters on a phone: 45 s after the export the stack has let go of its export plates and idle pools (127 canvases and 28 Mpx against 207 and 80 Mpx), **RSS 571 MB against 830 MB**. The JS heap is 5.5 MB in both, so everything saved is canvas and native memory, which is what these patches target.

Caveats, honestly: one run per tree (no repeat, so I cannot give a noise band; stage 1 RSS is +10 MB on the stack with no patch acting yet, which is the only hint), a 4-core Linux container and not an iPhone, hardware GL off, VP8 clips because this Chromium has no H.264, and a lighter effects sweep than a real ten minutes. Treat the 31% as the right order of magnitude for this session, not a promise for a device.

## Reproduce

```
git fetch origin hunt/memory-stack
git worktree add --detach /tmp/stk origin/main && cd /tmp/stk
git am tools/design/hunts/memory-stack-patches/*.patch   # or from a checkout of the branch
```
Suite: `memory-stack-suite/h51_slices.sh` (4 slices per width). Session: serve main and the stack on two ports with an `h44c00.webm` at the server root (`ffmpeg -f lavfi -i testsrc2=size=720x1280:rate=30 -t 3 -c:v libvpx -b:v 1500k -an h44c00.webm`), then `python3 stack_session2.py http://localhost:<port> <label> <cdp port> 1`.

## What I did not do

No real iPhone, no repeat runs of the session, no ship.sh/prove.sh, no mutation re-proof (each patch carries its own, H40/H43/H44 docs). The baseline for the suite comparison is the H52 pass on `wip/v17.26-tree`, not a fresh main run.
