# PRE3d: cloud pre-flight of wip/v17.41-tree 09358fd9 (Simple 2.3 + his option E, chained onto 2.2; 2423 tests)

**Verdict: one red that is new on this tree and pair-dependent (`690 replacing a clip twice then undoing twice brings his original back…`), plus the old-base #1016 leak; everything else is the v17.38/v17.39 list.** Reference: main d55cabc8 (v17.37) and the predecessor tree v17.39 (44ba5f10). Method as in `preflight-v17.38.md` sections 7 and 9 (the tree's own `tests/_cdp.py`, slices, a stall watchdog; "paired" = `after=<the test two before>&upto=<the red>`).

## 1. Static check

0 script tags dropped against main, `js/spine-edit.js` and `js/simple-tools.js` added, 0 `?v=` lower than main's, every `js/*.js` passes `node --check`. (Earlier trees' `storage.js` 60→59 slip is gone.)

## 2. Counts
- **1280: 2425 ran, 52 red, 96 NOT RUN HERE.  380: 2425 ran, 53 red, 95 NOT RUN HERE.** (2423 tests plus the 2 driver-hang entries, the same two export tests as on every tree: `690 swiping the share sheet away after Save…`, `690 an export holds the screen awake…`.)
- 380 has one more red than 1280: `690 Save project file on another project from Home writes that project…`; it is green alone and paired at 380, green on main and on v17.39, so it is a one-off of the full pass, not a finding.

## 3. The reds that are not "red on main alone too" (7 names)

| red | alone 1280 / 380 | paired 1280 / 380 | main alone | v17.39 | verdict |
|---|---|---|---|---|---|
| **`690 replacing a clip twice then undoing twice brings his original back, on screen and on disk, and redo brings the last pick back`** | ok / ok | **RED / RED** | ok / ok | alone ok / ok, paired ok | **new on this tree, pair-dependent** |
| `keyboard can edit numeric Volume and Position values…` (#1016) | ok / ok | ok / ok | ok / ok | — | red only in the full pass: the old-base `FM._mtMode` leak (fixed in v17.37), as you said |
| `home push: the press answers the tap…` | ok / ok | RED / RED with its predecessor | ok / ok | same | same as v17.38/v17.39 and main v17.36 |
| `playhead: a rebuild during the return-to-home pop…`, `921 S3 Stop sharing revokes the code…`, `981 review: with less motion…` | ok / ok | ok / ok | ok / ok | same | full-pass-only; the first two also red in my full pass on main v17.36 (bisected there) |
| `690 Save project file on another project from Home…` | ok / ok (380) | ok (380) | ok | ok | one-off at 380, see section 2 |

### The new one in detail
The failure message, in the pair and in the full pass, at 1280 and 380: `control: ONE undo of a replace (the queue 829 case) no longer brings the previous file back — it shows q915a-hfORIGINAL-….png`. The pair that makes it red is its predecessor chain: `690 while the microphone is open the app leaves the audio session to WebKit, and asks for…` then `690 with the phone storage full, leaving the project asks first — Stay (a real tap) keeps…` (NOT RUN HERE: it needs a real tap) then the target. The SAME pair on main d55cabc8 and on v17.39 (44ba5f10) is GREEN, and the target alone is green on all three, so something 2.3 / option E changed makes the Replace-media undo test depend on what ran before it (a predecessor that is only half-run here, because its real tap cannot be driven). I cannot tell whether that is a leak in the predecessor on this tree or a real order-dependence in the new Replace code; on the laptop the predecessor runs to its end, which may be why it passes there. **Worth one look at what 2.3 changed around Replace media and its undo.**

The other 45 reds are red on main alone too (no H.264/H.265, no camera, a 4× CPU throttle, Presets with no layer, clapper animation, Glow Scan, Motion Blur and Echo picture checks), the same list as in the v17.38 report section 9. Not measured here: NOT RUN HERE tests, H.264 export, the 2 hangs.

DONE: PRE3d preflight-v17.41 — 09358fd9 at 1280 and 380: 52/53 red, 1 new and pair-dependent (replace media undo), 1 old-base (#1016), the rest as v17.38.
