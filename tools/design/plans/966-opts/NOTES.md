# #966 opts — more choice on eight effects he already has (hunt/966-opts)

His standing request #966: *"you can polish other effects just giving them more features and making them work a bit better and
have more customisation … more choices always better … this is the complex version we want as much choice as possible"*.

Branch `hunt/966-opts`, based on `hunt/v61` 1cade9b2 (v17.60 + the unshipped hunt/966-new batch). **Code only, 17 Oct: nothing was
run but `node --check`** (compositor.js, collab-core.js, tests/tests.js all OK). No browser, no suite, no tools/*.sh runner.

## 1. Twin check (done before any code)

Effects were picked for being visible in short phone edits (transitions, glows, title looks, motion, text) and thin next to
AE / Premiere / CapCut / Alight Motion. Every candidate option was checked five ways:

| Check | How | Result |
|---|---|---|
| 1. Already in the code? | the EFFECTS row of each effect in this worktree, and `git grep` for the kernel's reads | none of the new keys existed on these eight rows |
| 2. Idle backlog | `tools/design/plans/2026-09-29-idle-backlog/backlog.md` §A batches 1–15, §B, §C — grep for each effect's type and label | **none of the eight is in it.** (§A polished glow, light/soft/dark glow, lens flare, streaks, glow scan, pulse/swing/orbit/drift, Type-On/Scramble/Timecode… but not Zoom Blur, Spin Blur, Neon Outline, Glow Inward, Sunburst, Number Roll, Breathe or Spin. Number Roll and Breathe got their #904 rows — Thousands/Your text, Phase — which this does not repeat.) |
| 3. ChatGPT pile | `tools/design/chatgpt-tasks/pile/LAND-LIST.md`, plus the effect rows on `ssh/codex/690-aac-peak-browser-gate` and `ssh/codex/freemotion-takeover` | no new controls on any of the eight. **Overlap to note:** LAND-LIST B2 lands "keyframed Speed is integrated" for **Spin** (`1a780ccb`) and **Breathe** (`53756221`) — both already integrate on this base; Turns and Wave sit beside that code, not in it |
| 4. POLISH-LOG / REQUESTS | grep each label and type in /home/ezra/FreeMotion | only history (v8.97 aim points for Zoom/Spin Blur, #692 bounding, #904 Number Roll / Breathe rows, the #954 renames). Nothing planned for these options |
| 5. Unmerged branches | the EFFECTS row of all eight on `ssh/hunt/fx-polish-all`, `ssh/plans/482-canvasfx`, `ssh/hunt/1068-b8`, `ssh/hunt/912-filters`, `ssh/hunt/pile-overdrive`, then every `ssh/hunt/*`, `plans/*`, `codex/*`, `*pile*`, `*fx*` ref (403 refs) | every branch carries the same rows as this base — no twin |

Also checked: Card Flip (`fliplayer`) already turns a layer in perspective by a keyframed angle; Spin's Turns is a *continuous*
coin-spin at a speed, seen straight on (no perspective) — related, not a twin. Odometer Roll has no easing either (left alone).

## 2. What was built — 8 effects, 18 new controls

| Effect (type) | Key | Label | Range / choices | Default | What it does |
|---|---|---|---|---|---|
| Zoom Blur (`zoomblur`) | `dir` | Zooms | Outward / Inward / Both ways | Outward (0) | Inward drags what lies further out in towards the centre; Both ways smears to both sides of each pixel (same span) |
| | `clear` | Clear centre | 0–100 %, keyframable | 0 | a sharp circle round the centre (sharp to 0.6 R, the blur from R, smoothstep between; R = share of the distance to the farthest corner) |
| Spin Blur (`spinblur`) | `dir` | Smears | Both ways / Clockwise / Anticlockwise | Both ways (0) | one-way: the whole arc (2 x span) behind a turn in that direction |
| | `clear` | Clear centre | 0–100 %, keyframable | 0 | as Zoom Blur's |
| Neon Outline (`edgeglow`) | `rainbow` | Rainbow | 0–720 °/s, keyframable (integrated) | 0 | the glow colour turns round the hue wheel; keeps the colour's saturation/brightness; white/grey runs the full rainbow from red |
| | `flicker` | Flicker | 0–100 %, keyframable | 0 | neon buzz: a roll every 1/24 s, ~1 in 4 a drop-out to 0–40 % of Amount (at 100 %), the rest within a sixth |
| | `seed` | Pattern | 0–99, live only above Flicker 0 | 0 | another sign's own buzz |
| Glow Inward (`innerglow`) | `blend` | Blend | Screen / Normal / Multiply | Screen (0) | Normal paints the colour in (dark colour = inner shadow), Multiply darkens through it |
| | `distance` | Distance | 0–60 px (unit px: pxToPlate + crop margin), keyframable | 0 | pushes the glow to one side |
| | `angle` | Angle | 0–360°, live only above Distance 0 | 135° | Drop Shadow's convention (135° = down-left) |
| Sunburst (`rays`) | `spin` | Spin speed | −360–360 °/s, keyframable (integrated) | 0 | turns the rays continuously |
| | `edges` | Ray edges | Soft / Hard | Soft (0) | Hard: clean wedges, antialiased over ~1 px (cos(Nθ)·r/N is the pixel distance from an edge) |
| | `fade` | Fade out | 0–100 % | 0 | rays dim with distance from the source, to nothing at the farthest corner at 100 % |
| Number Roll (`counter`) | `ease` | Easing | Linear / Ease Out / Ease In / Ease In-Out | Linear (0) | cubic curve on Progress; exactly 0 and 1 at the ends |
| Breathe (`pulseopacity`) | `wave` | Wave | Sine / Triangle / Heartbeat / Flash | Sine (0) | Triangle even fade; Heartbeat = Pulse's lub-dub upside down (rests faded, two beats up); Flash = all there on the beat, fades as 1 − (1 − f)² |
| Spin (`spin`) | `axis` | Turns | Flat / Flip ↔ / Flip ↕ | Flat (0) | a coin spin: width (↔) or height (↕) x cos(angle) about the pivot, mirrored past 90°, nothing exactly edge-on |

All helpers are module functions beside `wCx` in js/compositor.js, with suite seams `FM._zoomBlur966`, `FM._spinBlur966`,
`FM._rainbow966`, `FM._neonFlicker966`, `FM._breatheWave966`.

## 3. Why each default is exact (byte-identical pixels)

- **No `legacy` anywhere:** every new key's `def` IS today's look, so the render-time fill (queue 784, `fxFillValue`) writing the
  default into a saved project's absent key changes nothing. Each kernel reads its key with a literal fallback equal to `def`
  (`p.dir == null ? 0`, `fparam(p, 'angle', 135, t)`, …) — the very literal the fill reads off the kernel source — and test 793
  (inspector shows what an absent key renders) holds for every new row.
- **Zoom Blur / Spin Blur:** the kernel computes its new keys and, only when one is off its default, hands off to
  `zoomBlur966` / `spinBlur966` and returns. At Outward/Both ways and 0 % the old lines run untouched (including the #692 bounds).
  The helpers reuse the old tap expressions to the bit (`1 - kf[k] * amt * 0.35`; `(k - half) / half * span`), so with Clear
  centre on, the blurred zone IS the old blur — a test checks that byte for byte.
- **Neon Outline:** colour and Amount are only touched inside `if (egRb !== 0 || egRbDeg !== 0)` and `if (egFl > 0)`.
- **Glow Inward:** the mask loop runs its old line when both offsets round to 0; Normal/Multiply are `continue` branches before
  the old Screen line.
- **Sunburst:** `raysPh` is `(raysTurn === 0 ? raysPhD : raysPhD + raysTurn) * Math.PI / 180`, the same expression as the old
  `(phase) * Math.PI / 180` when the turn is 0 (also −0); the per-pixel Hard/Fade work sits in `if (raysNew)`.
- **Number Roll / Breathe / Spin:** the new key is read, and Progress / `po_phase` / the draw are replaced only for a non-zero
  value; at 0 nothing after the read changes (Spin's Flat path is the old lines below the new `if`).
- **Arity unchanged** for every kernel (zoomblur, spinblur, innerglow, rays, pulseopacity still declare 5 parameters), so
  pxToPlate's choice (scale `unit:'px'` keys or not) is the same as before.
- **Could not make exact / not exact by design:** nothing at the defaults. Off the default: Sunburst Hard edges are a ~1 plate px
  ramp (so the phone preview's edge is a little wider in project px than the export's — the same trade every px-pattern kernel
  makes); Spin Turns at exactly edge-on draws nothing for that frame.

## 4. Busters and schema

- `index.html`: `js/compositor.js?v=223 → 224`, `js/collab-core.js?v=36 → 37`. (fx-registry, inspector, fx-thumbs and
  audio-fx are untouched — the registry derives the rows, the inspector draws them from it.)
- `js/collab-core.js`: `C.SCHEMA_REV = 17` with a Rev 17 note. **`C.SCHEMA_FP` is still rev 16's number**, under a
  `/* FP TO PIN (966 opts) */` marker — the builder measures it with fp.js; `921 S1 the schema fingerprint gate` fails until then.

## 5. Tests (tests/tests.js, one block between `// ── 966 opts (hunt/966-opts) ──` and `// ── end 966 opts ──`)

All `{ item: '966' }`, each failing on 1cade9b2 on its first line by naming the missing control or seam (`_opNeed`).

1. `966 opts every new control at its default draws what the effect drew without it — all eight effects through the compositor…` (1:1 and half-size plate, two moments; CONTROL each effect changes its layer)
2. `966 opts Zoom Blur has Zooms (Outward, Inward, Both ways) and Clear centre…` (rows, new instance, fill, sanitiser, kernel identity, CONTROL)
3. `966 opts Zoom Blur Zooms: Outward streaks a bright dot away from the centre…` (dot fixture, worked tap by tap in the comment)
4. `966 opts Zoom Blur Clear centre keeps a sharp circle round the centre…` (sharp = source byte for byte; past R = old blur byte for byte; ring is a blend; follows Centre; CONTROL)
5. `966 opts Zoom Blur and Spin Blur with Zooms, Smears or Clear centre on: skipping what the blur cannot reach…` (bounded vs whole plate, 72 runs; CONTROL)
6. `966 opts Spin Blur has Smears (Both ways, Clockwise, Anticlockwise) and Clear centre…`
7. `966 opts Spin Blur Smears: a dot’s trail lies behind a clockwise turn…` (7x7 dot, worked tap by tap)
8. `966 opts Spin Blur Clear centre keeps a sharp circle round the centre…` (Both ways and a one-way smear)
9. `966 opts Neon Outline has Rainbow (0–720 °/s), Flicker (0–100 %) and Pattern…`
10. `966 opts Neon Outline Rainbow turns the glow round the colour wheel at its speed…` (exact colours outside the block; keyed hold)
11. `966 opts Neon Outline Flicker buzzes like a neon tube…` (48 rolls; stateless; Pattern; CONTROL at 0)
12. `966 opts Glow Inward has Blend (Screen, Normal, Multiply), Distance (0–60 px, scaled to the preview plate) and Angle…` (incl. `_pxParamKeys` and `_pxToPlate` at ps 0.5)
13. `966 opts Glow Inward Blend: Normal and Multiply in black make the inner shadow Screen never could…`
14. `966 opts Glow Inward Distance pushes the glow to one side…` (0°, 180°, 90°; CONTROL at 0 px)
15. `966 opts Glow Inward with Distance on the phone’s cropped readback…` (`FM._cropIdentity` — Glow Inward is in CROP_FX)
16. `966 opts Sunburst has Spin speed (−360–360 °/s, keyframable), Ray edges (Soft, Hard) and Fade out…`
17. `966 opts Sunburst Spin speed turns the rays: 90 °/s at 1 s is Rotation 90° byte for byte…` (7 rays; keyed flat and held)
18. `966 opts Sunburst Ray edges Hard cuts each ray clean…`
19. `966 opts Sunburst Fade out dims the rays away from the source…`
20. `966 opts Number Roll has Easing (Linear, Ease Out, Ease In, Ease In-Out), Linear by default…`
21. `966 opts Number Roll Easing: from 0 to 1000 half way through Ease Out reads 875…` (plus the text layer on screen)
22. `966 opts Breathe has Wave (Sine, Triangle, Heartbeat, Flash), Sine by default…`
23. `966 opts Breathe Wave: at 1 Hz and full Depth Triangle fades evenly…`
24. `966 opts Spin has Turns (Flat, Flip ↔, Flip ↕), Flat by default…`
25. `966 opts Spin Turns: Flip ↔ narrows a layer like a coin turning on its edge…`

**Tolerances — MEASURED on the first run (17 Oct, the builder; 1280 and 380 gave identical numbers):** ring blend 3476 of 3508
(99 %, floor 90 %); bound sweep 66 of 72 runs move the layer (floor 80 %); keyed Rainbow exactly 255,255,0 (±1); Flicker 12 of 48
dropped / 36 held (floors 6 / 30), never above steady; keyed Sunburst 0 px off flat and off 45°, 18557 off 135° (bound 4); Hard
93 % at an end / Soft 29 % (bounds 80 % / 50 %). Exact (`=== 0` / byte for byte) wherever the arithmetic is shared. First run:
'966 opts' 25/25, '921 S1 the schema fingerprint gate', 482 visible, the inert sweep, 784 and 913.5 green at 1280 and 380;
SCHEMA_FP pinned 5703583655858754 (fp.js, rev 17).

**Shared tests edited: none.** No existing test pins the param list, slider count or labels of these eight effects (searched
tests.js for each type id and label: `fx-radial` checks only its own legacy keys, `692` bounds runs PARAMS without the new keys,
`904`/`690` Breathe and Number Roll tests read their own keys, the 482 sweeps derive from the registry).
Sweeps the new rows enter and were reasoned through: `effects: no effect slider is completely inert` (every new slider moves its
fixture; Pattern and Angle are unlocked through their `liveAbove` gates), `793`, `482: every effect does something visible at its
own defaults`, the ruler-notch test (new ranges are ≤ 144 notches).

## 6. #545 before/after sheet (owed — for him to pick or veto)

Render through the app (`FM.renderScene` in a tests/ probe), at phone size (≈ 380 px wide frame), each option at 2–3 values
beside today's default:
- **Zoom Blur** on a photo with a face mid-frame: Outward / Inward / Both ways at Amount 0.6; Clear centre 0 / 30 / 60 %.
- **Spin Blur** on a car wheel or a spinning logo: Both ways / Clockwise / Anticlockwise; Clear centre 0 / 40 %.
- **Neon Outline** on a white title over dark footage: Rainbow 0 / 90 / 240 °/s as a 3-frame strip (0, 0.5, 1 s); Flicker 0 / 60 /
  100 % as a 6-frame strip.
- **Glow Inward** on a big title: Screen (today) / Normal in black (inner shadow) / Multiply in navy; Distance 0 / 8 / 16 at 135°.
- **Sunburst** behind a title on a solid card: Soft / Hard; Fade out 0 / 50 / 100 %; Spin speed as a 3-frame strip.
- **Number Roll** "Subscribers: 0 → 10,000" as a strip at Progress 0.25 / 0.5 / 0.75 for Linear / Ease Out / Ease In-Out.
- **Breathe**: a 1-beat opacity graph per Wave (Sine / Triangle / Heartbeat / Flash) plus 4 frames each.
- **Spin**: a logo at 0 / 45 / 90 / 135 / 180° for Flat / Flip ↔ / Flip ↕.
Names to put to him on the sheet (#954 / "options, recommended next to the best"): Zooms, Smears, Clear centre, Rainbow, Flicker,
Ray edges, Fade out, Easing, Wave, Turns (Flip ↔ / Flip ↕).

## 7. Risks and what is unsure

- **Nothing was run.** Every claim in the tests is reasoned; the first run may well move a threshold (marked) or expose a
  reasoning slip in a probe position (each is worked through in the test's comment so a red can be checked quickly).
- **Segment widths at 380 px:** Easing (4 longer labels — "Ease In-Out"), Wave (4) and Smears (3 incl. "Anticlockwise", the same
  three labels Radial Wipe already shows) — check they wrap rather than run off the panel (#545 / the fractalridges lesson).
- **Spin Turns is orthographic** (no perspective) — a coin seen from far away. If he wants depth, Card Flip's mesh path could
  be reused; logged here, not built.
- **Spin Turns near edge-on** asks moverSource for an expanded plate when the layer reaches past the frame (the inverse of a
  near-zero squash is huge) — capped by `expand` at 60 % of the comp, so it degrades rather than allocates without bound, but
  it is a per-frame cost on those frames for a full-frame clip.
- **Neon Outline Rainbow on a white glow starts red at 0 s** (white has no hue to turn) — said in the row's note; he may prefer
  white-and-back. Flicker reuses Light Leak's `llHash`.
- **Number Roll easing is cubic** (the keyframe menu's Ease Out is quadratic) — chosen for a visible slow-down on a count-up.
- **LAND-LIST B2** (pile) touches the Spin and Breathe kernels' speed lines; whoever lands second rebases by hand (the new code
  sits after those lines, not in them).

## 8. Owed by the builder

1. First run of the 25 tests at 900 and 380 (`?only=966%20opts`), set the six marked tolerances from measurement.
2. Measure and pin `C.SCHEMA_FP` (fp.js), replacing the FP TO PIN marker.
3. Full suite (the sweeps in §5), prove.sh, then the #545 sheet in §6 before the release that ships it.
