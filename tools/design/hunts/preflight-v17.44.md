# PRE4c: cloud pre-flight of wip/v17.44-tree e551532c (Simple 2.6 on the rehearsal chain; 2499 tests)

**Verdict: the collab-session.js union holds. All of 921 S1–S8 at both widths show only reds that are red on main too (S4 splash.mp4, S6 "finds its owner by itself", both environment) or already known (S3 Stop sharing, full-pass-only); all 10 of 2.6's own S6 tests (S6a–S6i, S6d twice) and #1015's `offline guest edits made during reconnect still use clash checks, including Undo` are green at 1280 and 380. Five Simple 2.4 tests are red only inside the full pass; each is green alone, paired and on the predecessor tree, so they need a look at what runs before them (section 4).** This sits on the rehearsal chain, not real main (reference for "main": d55cabc8, v17.37; predecessor tree: v17.43 1c333fef, checked alone).

## 1. Static check on the union

- 0 conflict markers in `js/collab-session.js` or `js/spine-edit.js`; every `js/*.js` passes `node --check`.
- `js/collab-session.js` keeps every #1015 symbol of v17.37 (`rememberCatchup` 5 / `endCatchup` 3 / `queued` 16 occurrences, the same counts as on v17.37; both functions still defined once at lines 103 and 117) and adds 2.6's (`undoCids` 3, `step.cids` 3, `!star` 1; none on v17.37).
- `index.html`: 0 script tags dropped against main, `js/spine-edit.js` and `js/simple-tools.js` added, 0 `?v=` lower than main's.

## 2. Counts
- **1280: 2501 ran, 55 red, 99 NOT RUN HERE.  380: 2500 ran, 54 red, 98 NOT RUN HERE.** (2499 tests plus the 2 driver-hang entries, the same two export tests as on every tree. One 40-test chunk at 1280 was lost to a Chrome I killed by mistake and re-run on its own; the numbers above include it.)

## 3. 921 S1–S8 and 2.6's S6 tests
- **921 S1–S8: 247 ok, 3 red, 3 NOT RUN HERE at each width** (the same 3 at 1280 and 380): `921 S3 Stop sharing revokes the code…` (green alone, paired, on main, and on v17.43; red only in the full pass, as on every tree since v17.36 here, bisected on main to `921 S3 the Share panel and the Join sheet fit a 380px phone…`), `921 S4 splash.mp4, a PNG and a WAV all arrive…` (no H.264; red on main alone) and `921 S6 a shared copy finds its owner by itself…` (the re-offer comes 3 s after `here`, red on main alone too).
- **2.6's `simple P2.6 · S6a … S6i`: 10 of 10 green at 1280 and at 380** (S6f with its typographic quotes included).
- **#1015** `offline guest edits made during reconnect still use clash checks, including Undo (batch2 1b.3)`: green at both widths.

## 4. The reds that are not "red on main alone too" (13 names)

| red | alone 1280/380 | paired 1280/380 | main alone | v17.43 alone | verdict |
|---|---|---|---|---|---|
| `simple P2.4 · T2 Keep on the music: three back-to-back texts…` (`did not put the texts back on the song: 1,2,3 (was 5,6,7)`) | ok/ok | ok/ok | test not on main | ok/ok | **red only in the full pass, both widths; tree-specific** |
| `simple P2.4 · T3 Reorder with a trimmed camera whose window crosses a moved boundary ASKS…` (`Do it anyway took 0 steps`) | ok/ok | ok/ok | not on main | ok/ok | same |
| `simple P2.4 · T3 a link whose two ends the plan moves by different amounts is an ASK…` (`Why? › did not say the whole sentence`) | ok/ok | ok/ok | not on main | ok/ok | same |
| `simple P2.4b · S7 the camera's hull after Do it anyway holds its REST pose…` (`Do it anyway took 0 steps`) | ok/ok | ok/ok | not on main | ok/ok | same |
| `simple P2.4b · S7 the tail fit counts (couplingsBroken)…` (`Do it anyway did not fit it in one step: 12, 0`) | ok/ok | ok/ok | not on main | ok/ok | same |
| `690 replacing a clip twice then undoing twice brings his original back…` | ok/ok | **RED/RED** | ok/ok | ok/ok | the pair-dependent red already reported on v17.41 (predecessor chain `…microphone is open…` then `…phone storage full… Stay (a real tap)`); not new on this tree |
| `keyboard can edit numeric Volume and Position values…` (#1016) | ok/ok | ok/ok | ok/ok | ok/ok | full-pass-only; the pre-v17.37 `FM._mtMode` leak is still in this chain's base (as on v17.39 and v17.41) |
| `home push: the press answers the tap…` | ok/ok | **RED/RED** (predecessor) | ok/ok | ok/ok | same as every tree and main v17.36 |
| `playhead…`, `921 S3 Stop sharing…`, `981 review: with less motion…` | ok/ok | ok/ok | ok/ok | ok/ok | full-pass-only, as on v17.38 |
| `#668: replacing a clip's media survives a save, without rewriting blobs every autosave` (1280 only) and `preset previews: the CACHE follows the layer…` (1280 only) | ok | ok | ok | ok | one-offs at 1280; green everywhere when run alone or paired |

**The five Simple 2.4 tests** are the ones to look at. They exist only from 2.4 (v17.42) on, they pass alone, paired and on v17.43, and fail in the full pass at both widths, so something earlier in the suite leaves state they read (the "Do it anyway" step count, a link sentence, the Keep-on-music grouping). I could not pin the polluter: a bisect over the 400 tests before them stalled under load. I have not yet run v17.42 and v17.43's own full passes, which will say whether they are red there too (a v17.42 report follows; if they are red there, the leak is in 2.4 and not in 2.6's union).

The other 43 reds are red on main alone too (no H.264/H.265, no camera, the 4× CPU throttle, Presets with no layer, clapper animation, Glow Scan, Motion Blur and Echo picture checks), the same list as in `preflight-v17.38.md` section 9. Not measured here: NOT RUN HERE tests, H.264 export, the 2 hangs.

DONE: PRE4c preflight-v17.44 — e551532c at 1280 and 380: 55/54 red; union intact (static + 921 S1–S8 + 2.6 S6 x10 + #1015 all as on main/green); 5 Simple 2.4 tests red only in the full pass.
