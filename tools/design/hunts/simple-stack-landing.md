# S12: the Simple stack, landed on the builder's newest chain tip

Branch: `hunt/simple-stack-landing`. Labels: **Verified** = I ran it; **Read** = I read it.

## What the tip is (Verified, `git fetch` on 9 Oct)

The PM's text says "980-p22-r6 or later". **There is no `980-p22-r4`, `-r5` or `-r6` on origin.** The newest chain branch is `origin/980-p22-r3` (`a51b5e1d`, "980 chain r3 … NOT YET RUN"); `980-p22-r2`, `-r3` and `980-s12-r3` are the others. Every Simple branch was already built on it (`git merge-base` of each branch with it is `a51b5e1d`, and `git rev-list --count origin/<branch>..origin/980-p22-r3` is 0 for all of them), so there was nothing to move. What this branch does is put the stack in the **order the PM asked for** and prove it.

## The stack was not linear (Verified)

`hunt/simple-2.5b`, `-2.6` and `-r7-fixes` are built on **2.4**, not on **2.4b**: `git merge-base --is-ancestor origin/hunt/simple-2.4b origin/hunt/simple-r7-fixes` is false (2.4b came later, from S7). So "2.3, 2.4b, 2.5b, 2.6, r7 fixes" meant inserting 2.4b's two commits after 2.4's last one and replaying everything after them on top. Order on this branch (oldest first):

| Original | Here | What |
|---|---|---|
| `974bc0fb` | `974bc0fb` | 2.3 (speed, sound, replacing) |
| `f4ab412e`, `3b5a994e` | same | 2.4 |
| `07a07c0d`, `ba583173` | `6559946d`, `92539a05` | **2.4b, moved to here** (clean) |
| `f707dfc6`, `a96d363c`, `7fec1bda`, `8e9c2a4b` | `5625cc88`, `6a593cf3`, `5f1ad432`, `ba4dec6e` | 2.5 (**conflict**, below) |
| `e1efd842`, `5c94f81a` | `a6df85b8`, `594e34e0` | 2.5b (S8) |
| `6f13d073`, `83d62943`, `831e0f96` | `59238d73`, `b75d6c2e`, `3a1db7fe` | 2.6 |
| `644e5bc5`, `454f049e`, `0bb1da83` | `3ccb2938`, `bc11791f`, `6236aeda` | the three R7 fixes (S10) |
| the 7 commits of `hunt/simple-t10-fixes` | `34250ae8` … `d1e45892` | S4 (separate commits, **conflict** on the first) |
| `9472601d`, `b3af0ef5` of `hunt/simple-a1-e` | `54f671ab`, `e390f388` | option E, separate commits (**conflict** on the first). Not Ezra's pick yet: revert these two to land without it |
| NEW | `d98425a5` | the cache-buster fix, below |

## Every conflict and how it was resolved (Verified; all of them are tests/spine-edit "two blocks added at the same spot")

1. **`f707dfc6` (2.5 drags) on 2.4b**, `js/spine-edit.js` one hunk and `tests/tests.js` one hunk. 2.4b adds the Sort and Ride-volume planners and its S7 tests at the place where 2.5 adds the drag engine and its tests. Kept both (2.4b's first), closed 2.4b's last test by hand. Both files parse.
2. **`3ac87949` (S4's four tests)**, `tests/tests.js` two hunks. S4's tests were written to sit where 2.4's tests begin, and every release since has added there too. Kept S4's block first, then the chain's block; the second hunk is only the S10c test that ends the chain's block (kept).
3. **`9472601d` (option E)**, `tests/tests.js` two hunks, the same spot again. Kept E's helpers and first test first, then the chain's block, then S10c followed by E's last test.

No `js/` file other than `js/spine-edit.js` conflicted, and the one hunk there is two independent blocks. I did not have to choose between two versions of any line of app logic.

## A real finding: eleven files the chain changed without bumping `?v=` (Verified)

Compared with `980-p22-r3`, `behaviors.js`, `history.js`, `storage.js`, `collab-bridge.js`, `collab-comments.js`, `collab-core.js`, `collab-diff.js`, `collab-host.js`, `collab-presence.js`, `collab-session.js` and `collab-ui.js` have changed code and an unchanged `?v=` in `index.html`. `tools/ship.sh` would refuse each of them; as a branch of commits nothing did. A phone that already has the old file cached would keep serving it ("the code is right, the suite is green, the phone serves the OLD file"). `d98425a5` bumps each by one. **If the builder lands the chain release by release, each release must bump its own files**; this commit is only the end state.

## The whole Simple slice at both widths (Verified; `?only=simple P`, the repo's driver, a server from `tools/serve.sh`)

| Width | Result |
|---|---|
| 1280 | **155 of 158 pass**, 3 NOT RUN in the headless run (the finger tests) |
| 380 | **155 of 158 pass**, the same 3 |

The three finger tests (`P2.5 · S3 FINGER … hold of 350 ms`, `… two fingers pinching`, and `P2.5b · S8c FINGER … the click a finger's release makes`) **do run** when started the way CLAUDE.md says (`FM_TOUCH_PAGE=1 python3 tests/_cdp.py`, one finger test per browser): all three **pass at 380**, and the hold test also at 1280. So nothing in this stack is waiting on the laptop's real-touch pass any more.

## What happens when the chain meets today's `main` (Verified by a trial merge, aborted)

`origin/main` is at v17.31 and `980-p22-r3` is 8 commits behind it (and 8 ahead of the merge-base), so landing needs a merge or rebase regardless of Simple. A trial `git merge --no-commit` of this branch into `main` conflicts in **`index.html`, `tests/_cdp.py`, `tests/full-unchanged.html`, `tools/_fu_compare.py`, `tools/_fu_gate.py`, `tools/full-unchanged-plants.json`, `tools/full-unchanged.sh`, `tools/ship.sh`, `tools/test-port.sh`** and nothing else. A trial merge of `980-p22-r3` alone conflicts in the same files plus `tests/tests.js`. **So this stack adds no conflict file of its own to what the chain already has**, and the one extra file the chain has (`tests/tests.js`) merges cleanly with the stack on top. The `index.html` hunk is one line (the version label).

## What I did not do

- The full suite (about 35 minutes) and the Full-unchanged lock on `main` (v17.30/v17.31 added `tools/full-unchanged.sh`, which this stack has not been run against).
- The 921 slice on this branch. It was run on the transitions branch (same collab code): **247 of 253**, with the same four reds as on its parent, `hunt/simple-r7-fixes` (S0 duplicateFrom fixture, S3 Stop sharing in a slice, S4 splash.mp4 needs H.264, S6 re-offer timing) and 2 NOT RUN (BarcodeDetector).
