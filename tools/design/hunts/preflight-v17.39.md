# PRE3b: cloud pre-flight of wip/v17.39-tree 44ba5f10 (Simple 2.2; 2407 tests)

**Verdict: one red that is this tree's own (`simple P2.2 · tray B …`, red alone and paired at both widths, absent on main), one the builder already explained (`keyboard can edit numeric Volume…`, the pre-v17.37 base), nothing else new.** Reference: main d55cabc8 (v17.37). Driver, slices, watchdog and triage exactly as in `preflight-v17.38.md` sections 7 and 9 (the tree's own `tests/_cdp.py`; "paired" = `after=<the test two before>&upto=<the red>` so the predecessor really runs).

## 1. Static check

0 script tags dropped against main, `js/spine-edit.js` and `js/simple-tools.js` added, 0 `?v=` lower than main's, no conflict markers; every `js/*.js` passes `node --check`.

## 2. Counts
- **1280: 2409 ran, 53 red, 96 NOT RUN HERE.  380: 2409 ran, 52 red, 95 NOT RUN HERE.** (2407 tests plus 2 driver-hang entries.) The two export tests `690 swiping the share sheet away after Save…` and `690 an export holds the screen awake…` hang the driver (no H.264) and are counted red-by-hang.
- 1280 and 380 differ only by `482 6.7 Glow Scan …` (red at 1280 only here; it is red on main alone too, so environment).

## 3. The reds that are not "red on main alone too" (6 of 51 names)

| red | alone 1280 / 380 | paired 1280 / 380 | main alone | verdict |
|---|---|---|---|---|
| **`simple P2.2 · tray B at 1280×800, 1280×720 and 960×700 every tool is on show…`** | **RED / RED** | **RED / RED** | test not on main | **this tree's own red** |
| `keyboard can edit numeric Volume and Position values…` (#1016) | ok / ok | ok / ok | ok / ok | red only in the full pass: the old-base leak (`FM._mtMode`, fixed in v17.37; this tree is pre-v17.37), as you said |
| `home push: the press answers the tap…` | ok / ok | **RED / RED** with its predecessor in front | ok / ok | predecessor-dependent; same on main v17.36 (bisected there); not new |
| `playhead: a rebuild during the return-to-home pop…` | ok / ok | ok / ok | ok / ok | full-pass-only; same on main v17.36 (bisected there to the home-push predecessor) |
| `921 S3 Stop sharing revokes the code…` | ok / ok | ok / ok | ok / ok | full-pass-only; same on main v17.36 (bisected there) |
| `981 review: with less motion the add menu arrives on its plain 220 ms slide…` | ok / ok | ok / ok | ok / ok | full-pass-only; not shown on main's own full pass |

### The one real red, in full
`simple P2.2 · tray B …` first message, alone, at 1280 and 380: `960×700: [5,4] duplicateClip lies outside the band (240–301 in 0–300) · delete lies outside the band (240–301 in 0–300) · the tray scrolls sideways (301 px in 299)`. At 960×700 the tray is 2 px wider than its band (301 in 299): the last two tools sit 1 px past the band edge and the tray scrolls sideways. 1280×800 and 1280×720 pass. **I cannot say whether it is the tree or my fonts:** the container has no SF Pro, and the fallback is narrower in some strings and wider in others (the suite's own font probe prints 446.45 against 450.9 here), so a 1-2 px overflow at one size is the kind of thing a font difference makes. It does reproduce on every run and the test is this tree's, so treat it as real until the laptop's own pass says it is green.

The other 45 reds are red on main alone too (no H.264/H.265, no real camera, a 4× CPU throttle the driver cannot give, Presets tests with no layer, clapper animation tests, Glow Scan, Motion Blur and Echo picture checks), the same list as in the v17.38 report section 9.

Not measured here: every NOT RUN HERE test (real finger, AAC, H.264), export correctness, the 2 hangs.

DONE: PRE3b preflight-v17.39 — 44ba5f10 at 1280 and 380: 53/52 red, 1 own (simple P2.2 · tray B at 960×700, 2 px overflow; may be fonts), 1 old-base (#1016), the rest same as v17.38/main.
