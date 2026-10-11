# PRE4a: cloud pre-flight of wip/v17.42-tree 0ea7e93a (Simple 2.4 on the rehearsal chain; 2473 tests)

**Verdict: nothing in 2.4's own tests is red alone or in a pair, and nothing red is new apart from the five Simple 2.4 tests that go red only in the full pass. They are red on this tree already, so they were not introduced by 2.5 or 2.6; the polluter is `AU25-1` (see `preflight-bx.md`, BX1).** Reference "main": d55cabc8 (v17.37); predecessor tree: v17.41 (09358fd9), checked alone. Method as in `preflight-v17.38.md` sections 7 and 9. This sits on the rehearsal chain, not real main.

## 1. Static check

0 script tags dropped against main, `js/spine-edit.js` and `js/simple-tools.js` added, 0 `?v=` lower than main's, every `js/*.js` passes `node --check`, no conflict markers.

## 2. Counts
- **1280: 2475 ran, 53 red, 95 NOT RUN HERE.  380: 2475 ran, 53 red, 95 NOT RUN HERE.** The same 53 at both widths (2473 tests plus the 2 driver-hang entries, the same two export tests as on every tree).
- 2.4's tests: 23 green and the five below red in the full pass, at both widths.

## 3. The reds that are not "red on main alone too" (11 names)

| red | alone 1280/380 | paired 1280/380 | main alone | v17.41 alone | verdict |
|---|---|---|---|---|---|
| `simple P2.4 · T2 Keep on the music…`, `P2.4 · T3 Reorder with a trimmed camera…`, `P2.4 · T3 a link whose two ends the plan moves…`, `P2.4b · S7 the camera's hull…`, `P2.4b · S7 the tail fit counts…` | ok/ok | ok/ok | not on main | not on v17.41 | **red in the full pass at both widths, green alone and paired.** Polluter named: the slice from `AU25-1 a mouse release that never arrives…` (#1230) through each of the five is RED, the same slice without AU25-1 is green, for all five on this tree too |
| `690 replacing a clip twice then undoing twice brings his original back…` | ok/ok | **RED/RED** | ok/ok | ok/ok | the pair-dependent red first reported on v17.41 (predecessor `…phone storage full… Stay (a real tap)…`); not new here |
| `home push: the press answers the tap…` | ok/ok | **RED/RED** (predecessor) | ok/ok | ok/ok | as every tree |
| `playhead…`, `921 S3 Stop sharing…`, `981 review: with less motion…`, `keyboard can edit numeric Volume and Position values…` (#1016, the pre-v17.37 leak in this chain's base) | ok/ok | ok/ok | ok/ok | ok/ok | full-pass-only, as on v17.38 |

The other 42 reds are red on main alone too (no H.264/H.265, no camera, the 4× CPU throttle, Presets with no layer, clapper animation, Glow Scan, Motion Blur and Echo picture checks): the list in `preflight-v17.38.md` section 9. Not measured here: NOT RUN HERE tests, H.264 export, the 2 hangs.

DONE: PRE4a preflight-v17.42 — 0ea7e93a at 1280 and 380: 53/53 red, 5 are the AU25-1-polluted 2.4 tests (green alone and paired), the rest as v17.38; 2.4's other 23 tests green.
