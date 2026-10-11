# PRE4b: cloud pre-flight of wip/v17.43-tree 1c333fef (Simple 2.5 on the rehearsal chain; 2489 tests)

**Verdict: the add/add `spine-edit.js` resolution is sound and all of 2.5's own tests are green; the same five Simple 2.4 tests are red in the full pass as on v17.44, and each is green alone, paired and on the predecessor tree v17.42.** Reference "main": d55cabc8 (v17.37). Method as in `preflight-v17.38.md` sections 7 and 9 (the tree's own `tests/_cdp.py`, slices, a stall watchdog, "paired" = `after=<the test two before>&upto=<the red>`). This sits on the rehearsal chain, not real main.

## 1. Static check on the add/add merge

- `js/spine-edit.js`: 0 conflict markers; no function declared twice (both sides of the add/add were kept without clashing names); `node --check` passes for every `js/*.js`.
- `index.html` against main: 0 script tags dropped, `js/spine-edit.js` and `js/simple-tools.js` added, 0 `?v=` lower than main's.

## 2. Counts
- **1280: 2491 ran, 54 red, 99 NOT RUN HERE.  380: 2491 ran, 54 red, 98 NOT RUN HERE.** (2489 tests plus the 2 driver-hang entries, the same two export tests as on every tree.)
- **2.5's own tests (`simple P2.5 · …`, `P2.5b · …`): 13 green and 3 NOT RUN HERE (the real-finger S3 and S8c tests) at each width; none red.**

## 3. The reds that are not "red on main alone too" (12 names)

| red | alone 1280/380 | paired 1280/380 | main alone | v17.42 alone | verdict |
|---|---|---|---|---|---|
| `simple P2.4 · T2 Keep on the music…`, `P2.4 · T3 Reorder with a trimmed camera…`, `P2.4 · T3 a link whose two ends the plan moves…`, `P2.4b · S7 the camera's hull…`, `P2.4b · S7 the tail fit counts…` | ok/ok | ok/ok | not on main | ok/ok | **red in the full pass at both widths, green everywhere else** (the same five as on v17.44; first messages `Do it anyway took 0 steps`, `Why? › did not say the whole sentence`, `Keep on the music did not put the texts back on the song: 1,2,3 (was 5,6,7)`, `Do it anyway did not fit it in one step: 12, 0`) |
| `690 replacing a clip twice then undoing twice brings his original back…` | ok/ok | **RED/RED** | ok/ok | ok/ok | the pair-dependent red first seen on v17.41; not new here |
| `home push: the press answers the tap…` | ok/ok | **RED/RED** (predecessor) | ok/ok | ok/ok | as every tree |
| `playhead…`, `921 S3 Stop sharing…`, `981 review: with less motion…`, `keyboard can edit numeric Volume…` (#1016, the pre-v17.37 leak still in this chain's base) | ok/ok | ok/ok | ok/ok | ok/ok | full-pass-only, as on v17.38/v17.39 |
| `690 opening the app in a second window only to look never stops the first window saving…` (380 only) | ok | ok | ok | ok | a one-off at 380; green alone, paired, on main and on v17.42 |

The other 41 reds are red on main alone too (no H.264/H.265, no camera, the 4× CPU throttle, Presets with no layer, clapper animation, Glow Scan, Motion Blur and Echo picture checks): the list in `preflight-v17.38.md` section 9. Not measured here: NOT RUN HERE tests, H.264 export, the 2 hangs.

**On the five 2.4 tests:** they also fail on v17.44 (`preflight-v17.44.md` section 4) and so are not 2.5's or 2.6's doing; whether they are red on v17.42's own full pass is the question the v17.42 report answers (running now).

DONE: PRE4b preflight-v17.43 — 1c333fef at 1280 and 380: 54/54 red; spine-edit.js add/add sound (static); 2.5's 13 tests green; five 2.4 tests red only in the full pass, nothing else new.
