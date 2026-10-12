# Cloud helper handoff (12 Oct 2026, 10:50 UTC)

For: the laptop Builder, the next cloud helper, and Ezra. This chat is stopped and its loop cron is deleted.
Everything worth keeping is pushed. The container's scratch worktrees and servers are gone.

## Where things stand

- **main / live: v17.38 (a77db174).** Nothing new has shipped since 11 Oct.
- **No headless API builder activity seen.** No wip/* or hunt/land-* branch has moved since 11 Oct. So `tools/api-builder.sh`
  either was never started on the laptop or has not finished a release.
- Ezra's main subscription reset at 4pm Perth today (08:00 UTC), so the laptop Builder (Remote Control) can run again.
  **Run ONE builder on the laptop at a time**: the Remote Control Builder or `api-builder.sh`, never both. They work the same
  tree, and an exported `ANTHROPIC_API_KEY` breaks Remote Control.

## What this helper left for the builder (all pushed, none on main or a builder branch)

| branch | head | what | builder action |
|---|---|---|---|
| `hunt/v17.39-fixes` | 208aaec1 | Fixes for Simple 2.2 (`wip/v17.39-tree` 726bb6d): leaving Simple never redrew Full's inspector (HIGH), plus the MEDIUM scroll and category ones. Report: `hunt/preflight-v17.39` | Merge into wip/v17.39-tree before shipping 2.2 |
| `hunt/simple-firstuser-fixes` | 0f4c6500 | On top of v17.39-fixes (contains it). (1) The playhead line shows after Simple adds the first clips to a project that was empty in Full; this is LIVE on v17.38 too. (2) The time readout follows the playhead after a Simple command moves it: the same line as S10a (644e5bc5 / 3ccb2938), so a later merge meets identical text. Each red-first, mutation CAUGHT. `?only=simple%20` 93/93 and `?only=980%20` 23/23 at 380 and 1280 | Take this instead of v17.39-fixes alone |
| `hunt/simple-more-dock` | 7c01fcb6 | The above PLUS More's panel docked under the project tools and More pressed again closes it | **Do not merge without Ezra's call** (see decision 1) |
| `hunt/labs-on-fixes` | c96f4849 | LAB1: 6 tests that assumed Labs off fixed; one real pre-existing bug fixed (a swap code made for project A handed out again by project B). Report: `hunt/preflight-labs-on` | Take instead of `hunt/labs-on` |
| `hunt/fix-land-b3` | f3116e64 | LAB2: 8 commits on land-b3 45a97e1 (Unsharp Protect colour default 0 + SCHEMA_REV 9, RGB Split floor, F1 integer-count epsilon at 12 keyed sites, three tests made real). Every fix proven red-first; `?only=482` reds identical to land-b1. Report and **suggested POLISH wording**: `hunt/preflight-land-b3` | Take instead of `hunt/land-b3` |
| `hunt/simple-firstuser` | bb23ea58 | SU1: Simple used like a first-time phone user, 21 ranked problems | Read; items left are below |
| `claude/laughing-euler-5lq4ml` | (this file) | `tools/api-builder.sh`, the headless builder loop for the API credit, plus this handoff | See "API builder" |
| `helper/done` | | One DONE line per job | |

**SCHEMA_REV 9 warning (from LAB2):** three groups of unlanded branches each set REV 9 with different fingerprints
(fix-land-b3: 1932349802248846; e1-land / new-effects-1 / audit-integrated-3: 5698315735221935; simple-tip /
simple-transitions / p27-dry / p28-dry: 6484757361590586). Whichever lands second takes REV 10, the third REV 11, and
re-pastes the FP the 921 S1 gate prints.

## Decisions waiting on Ezra

1. **More's panel in Simple.** Today it covers Clips / Text / Sound / Overlay and won't close from More. Docking it under
   the tools (`hunt/simple-more-dock`) keeps that row reachable, but the sheet shrinks from 195 px to 138 px at 380x800,
   so no category card is fully visible. At 380x667 it hits the 120 px floor. At 375x553 it still covers the row, and at
   1280 a second click on More misses because the tray collapses and More moves. Options: take it as is; take only the
   "More pressed again closes it" half; or give the sheet room some other way (a smaller stage, or a full-height sheet
   that hides the tools while it is open). Draw options first (his design rule).
2. **Radial Wipe at Progress 0 erases the layer** (queue 264). This is the one land-b3 red the fix branch leaves alone.
3. **The first title is cut off.** Text starts at 160 pt (Full's default, in Simple too), so "My Summer Trip" runs past
   both edges of a 9:16 frame. Shrink, fit to frame, or wrap? Simple-only or both editors?
4. SU1 items marked by design / not planned that a beginner hits: music runs on into black (D17 B), ✂ refuses when
   the playhead is over a different clip, and Speed is hidden under Audio.
5. Whether to start the API builder at all (below).

## Next helper work (queued, not started)

- **SU1 #9: the tray and label go stale after typing a title** (they show an overlay's tools and "Text"; 3/3). Check whether
  BX1d's tray-signature fix (`hunt/bx1d`, simple-tools.js sig) already covers Simple's own Text path. If not, reproduce
  and fix red-first on top of `hunt/simple-firstuser-fixes`.
- **SU1 #12: after reopening, an off-screen clip is still selected**, so the tray's Delete acts on a clip he can't see.
  Reproduce and fix the same way.
- **tests/_cdp.py hang:** here, "690 swiping the share sheet away after Save…" and "690 an export holds the screen
  awake…" freeze the page on land-b1 too, and the driver waits forever past `--timeout`. The suspected cause, not
  proven, is an `alert()` for NO_VIDEO_CODEC that the driver never dismisses. Fix: handle `Page.javascriptDialogOpening`
  and put an overall deadline on `cdp.eval`. The laptop has H.264 so it may never see this. Low priority.
- Optional: Frame Stutter's keyed `duty + 2e-9` gives the wrong margin in Irregular mode below qLen 0.5 (practically
  unreachable). Cleaner form: `(phase - 1e-9 - qLo) / qLen > duty + 1e-9`.
- Re-pre-flight any wip/v17.4x-tree or hunt/land-* branch that moves.

**Lanes:** a helper never pushes to main or to the builder's branches (wip/*, hunt/land-*, hunt/labs-on). It publishes on
hunt/preflight-*, hunt/<topic> (fix branches named so they cannot match hunt/land-*), helper/done and its own claude/* branch.

## API builder (`tools/api-builder.sh` on this branch)

Ezra's $200 monthly API credit expires each billing cycle with no rollover. Only `claude -p` with an API key can spend it:
the interactive app, cloud sessions and Remote Control cannot. On the laptop (WSL), one paste:

```bash
curl -fsSL https://raw.githubusercontent.com/builderezra/FreeMotion/refs/heads/claude/laughing-euler-5lq4ml/tools/api-builder.sh -o ~/fm-api-builder.sh && bash ~/fm-api-builder.sh
```

It asks for the key once, stores it chmod 600 in `~/.fm-api-builder`, and never exports it or puts it on a command line.
It stops at a $160 total (each run capped at $20, with $6 kept back for a handover) or at its default stop time,
"2026-10-12 15:45 +0800". That time has **already passed**, so give it a new one when you run it, for example:

```bash
FM_STOP_AT="2026-10-13 15:45 +0800" bash ~/fm-api-builder.sh
```

(`FM_TOTAL_CAP`, `FM_RUN_CAP` and `FM_RESERVE` override the money limits the same way.) It writes its handover to
`.claude/api-handover.md` in the repo and prints it when it stops. Stop the Remote Control Builder first.
