# #966 B23 — Explosion & thunder (branch `hunt/fxnew-boom`)

Backlog §B B23 in `tools/design/plans/2026-09-29-idle-backlog/backlog.md`: "Explosion & thunder. SFX, S. Size small/big,
Length, Variation." Built on `47735673` (hunt/fxnew-clarity — the effects landing and every §B branch so far, including
hunt/fxnew-sfx's four sound packs, whose conventions this follows: `tools/design/plans/fxnew-sfx/NOTES.md`).

**Status: built, not picked, NOT RUN.** His #545 rule is that he hears new sounds and picks before anything ships. Everything
here was written while the API builder was in its lock run and ship, so nothing was run — no node, no browser, not even
`node --check`. The recipes, levels and every test bound are reasoned from the recipes, not measured. The first run is
`prove.sh` (agent scratchpad, `agents/fxnew-boom/prove.sh`), then the two tests in Chrome, then the listen sheet.

Not built before this: `REQUESTS.md` on main has no explosion or thunder request ("Boom SFX" at line ~9843 is a test clip's
name; the two "explosion" hits are a COST explosion), `POLISH-LOG.md` likewise, and `js/sfx.js` at 47735673 had neither.

## How it sits in `js/sfx.js`

- One block of its own, `EXPLOSION & THUNDER (B23)`, after the 8-bit Game pack and before the category icons. Two rows made
  with fxnew-sfx's `packSound`, so `FM.sfx.variant(def, options)`, `packOptionsFor`, the seeded streams (`packJitter`,
  `packRnd`) and `packNoise` (through `noiseSeed`, so two buffers in one render are two noises — #986 C11) all work as they
  do for the packs. No `Math.random`. The ▶ plays the very buffer Add makes (#986 C10) — nothing in the shared path changed.
- **Two lines changed in the pack machinery:** `packSound` takes an optional `levelFor(options)`, and `variant()` gives a
  variant that level instead of the row's. Needed because `renderBuffer` normalises every sound to 0.89 × its level: without
  a level of its own, Far thunder would land exactly as loud as Near and "far is softer" could not be true. The row keeps
  the defaults' level (Thunder 1). Every existing pack sound is unchanged (none has `levelFor`).
- Buster: `js/sfx.js?v=21` → `22`. No registry params, so `C.SCHEMA_FP` cannot move (prove.sh stage 5 checks).

## The two sounds

| Row (id) | Category | Recipe | Options | Level |
|---|---|---|---|---|
| Explosion (`explosion`) 3.2 s | Impact | a low **thump** (sine 85 → 26 Hz, gone by 1.1 s), a noisy **body** (seeded noise through a lowpass falling 2.6 kHz → 140 Hz over 1.6 s, fading by 2.2 s), a long **rumble tail** (noise lowpassed at 110 Hz, swelling to its top at 0.18 s and rolling away to the end) | **Size** small / big (big; Small is 150 → 48 Hz, 5.2 kHz → 380 Hz, a 220 Hz rumble, 1.6 s), Variation 1–8, Length 0.5–3× | 1 |
| Thunder (`thunder`) 3.6 s | Nature | the **crack**: three strikes of bright noise (lowpass 6.5 kHz) at 15 ms, ~85 ms and ~175 ms, the first the loudest; then the **roll**: a growl (lowpass 380 Hz) and a deep layer (90 Hz) under one gain that swells and sags every 0.22–0.47 s (seeded) on a fall to 2 % | **Distance** near / far (near), Variation 1–8, Length 0.5–3× (stretches the roll, not the delay) | 1; **Far 0.6** |

**Far thunder:** darker (crack lowpass 1.4 kHz, roll 200 / 70 Hz), softer (level 0.6, and its crack is a smaller part of
it), and half a second later — it is silent until 0.45 s, so a Far clip dropped on the frame where the lightning flashes
arrives the way thunder does. 4.1 s long. Variation moves every number a little (±10–35 %), the strike times, the roll's
pattern and every noise; Variation 1 is the recipe as written.

Variant names (they become the clip's file name on Add): `Explosion (small)`, `Explosion (small, variation 3)`,
`Explosion (2x length)`, `Thunder (far)`, `Thunder (far, variation 2)`.

Search words (`tags`, for backlog 9.1's search): Explosion — explosion, explode, boom, blast, bang, bomb, detonate, kaboom,
fireball, action. Thunder — thunder, thunderclap, thunderstorm, storm, lightning, rumble, crack, weather.

Names checked against `tools/design/954-effect-names.md`: neither "Explosion" nor "Thunder" is in it. **"Lightning" is one
of Alight Motion's 40 distinctive effect names** (row `lightning`, proposed "Bolts") — here it is only a search word on
Thunder, never a name. No trademarked names.

## The tests (`tests/tests.js`, appended before the final `})();`)

Two, `'966 B23 Explosion …'` and `'966 B23 Thunder …'` (`{ item: '966', budgetMs: 180000 }`), plus two helpers named
`…Sfx966` so fxnew-sfx's `hs.js` lifts them: `brightSfx966` (the RMS frequency, sr/π · asin(½ · rms(Δx) / rms(x)) — exact
for a sine, a spectral centroid with no FFT for noise) and `variantSfx966` (a variant held to its row's checks). Each test
**fails on 47735673 on its first check** — `packSfx966` throws "The Explosion (#966 B23) is not in the sound-effect library:
there is no Explosion (explosion)" (and the same for Thunder) — not a TypeError.

Both get every check the packs get (`packSfx966`: in the library under its category, its name, its search words — boom /
blast / bang, storm / lightning / rumble —, its stated length sample for sample, its peak at 0.89 × level so it cannot clip,
audible past a third of its length, the same samples twice within 1e-5, Variation 2 another take, no options or nonsense =
the row, the ▶ is the clip, it offers options). Then, with the reasoned numbers (each failure message prints the measured
ones):

- **Explosion** — the options are Size (small / big, big by default), Variation and Length; `Explosion (small)` is 1.6 s at
  level 1, seeded, its ▶ its clip; Length 2 is `Explosion (2x length)`, 6.4 s. **Big is lower**: its RMS frequency over the
  whole sound under 0.8 of Small's (reasoned ~550 against ~1300 Hz). **Big is longer**: more than 1.5× Small's samples
  (3.2 against 1.6 s). **The blast darkens**: Big's first 0.15 s more than 1.5× the RMS frequency of 0.8–1.2 s (reasoned
  ~700 against ~110 Hz). **The tail decays**: the last quarter's RMS under 0.25 of the first's, both sizes (reasoned ~0.04).
  **The tail is there**: Big's RMS over 55–65 % of its length above 1e-3 (reasoned ~0.02).
- **Thunder** — the options are Distance (near / far, near by default), Variation and Length; `Thunder (far)` is 4.1 s at
  **level 0.6**, seeded, its ▶ its clip; `Thunder (far, variation 2)` differs from Far by more than 0.05; Length 2 is 7.2 s.
  **Far is quieter**: its peak under 0.75 of Near's (0.534 against 0.89 by construction). **Far is darker**: its RMS
  frequency under 0.6 of Near's (reasoned ~0.1: ~220 Hz against ~2 kHz). **Far's crack is later**: RMS exactly 0 before
  0.3 s and its first onset more than 0.25 s after Near's, which is under 0.06 s. **Near cracks, then rolls**: its first
  0.2 s more than twice the RMS frequency of 1.5–2.5 s (reasoned ~10×). **The roll decays**: last quarter under 0.25 of the
  first, near and far (reasoned ~0.05 / ~0.07).

The older tests that iterate every sound now see 53: 709 (each twice at 22.05 kHz from t0 = 0.01 — every lowpass here is
under 7.5 kHz, below that rate's Nyquist), 562 (each audible and under full scale on the raw path, limit raw ≤ ~1.52: the
Explosion's raw peak is reasoned ~1.0 — a 0.55 thump plus the body's first noise — and Thunder's ~0.9, the crack plus the
roll's start), 986 C10.

**Unsure until run:** the brightness bounds rest on lowpassed white noise reading about its cutoff; the Near crack's first
onset assumes the crack, not the roll, is the loudest 2 ms (if the roll is louder the onset moves to ~0.05 s, still inside
0.06); 562's raw ceiling for two noise peaks landing together.

## prove.sh (agent scratchpad: `agents/fxnew-boom/prove.sh`)

Written, not run. Refuses to start (exit 7) and stops between stages while a ship, a lock run (`full-unchanged`) or a live
API-builder pid is present — scratchpad `gapcheck.sh`'s logic. Node at nice 19 only; python only for the two tree checks.

1. `node --check js/sfx.js`, tests.js parses, the probe parses as an async body, no CRLF, `git diff --check`, no mode change.
2. The two `966 B23` tests on 47735673's js through `agents/fxnew-sfx/hs.js` — must both FAIL naming the missing sound
   (hs says 51 sounds), none a TypeError.
3. The same on this branch — must both PASS (hs says 53 sounds).
4. `966 B4` / `B5` / `B12` / `B13`, 709, 562, 986 C10 / C11 / C12 on both trees — the same verdicts; the packs, 709, C10
   and C11 must PASS on the tip.
5. `fx-all2/fp.js` on both trees — the same `fp`.
6. `treecheck.py 47735673 HEAD`, `drops.py 47735673 HEAD`. Results in `agents/fxnew-boom/prove-result.txt`.

Still owed after that: the two tests in Chrome at 900 and 380 (`?only=966%20B23`), and the listen sheet.

## The listen sheet

`render-probe.js` (this folder, an async function body for `tools/shot.py --js-file`, `window.__recv` = the receiver's port as
a number) renders each of these as Add makes it and POSTs `NN-<name>.wav` and `listen.json` (order, names, why, level,
length, peak): Explosion (Big); Small; Big Variation 2 and 5; Small Variation 3; Big at Length 2×; Small at 0.6× · Thunder
(Near); Far; Near Variation 2 and 6; Far Variation 2; Near at 1.6× · beside them: Impact, Sub drop, Thud (Explosion's
neighbours), Rain and Wind (Thunder's).

## Questions for him (#545 — his picks, by ear)

1. **Keep both, and their names?** "Explosion" / "Thunder" — or "Boom", "Thunderclap"?
2. **Explosion's row: Big or Small?** The row is Big today and Small is the option. Or two rows ("Explosion", "Small
   explosion") — the way the slide whistle is two rows?
3. **Far thunder as an option or a row of its own** ("Distant thunder")? And **its half-second delay**: keep it (drop the
   clip on the flash and it arrives late, like real thunder), or start at once?
4. **Loudness by ear:** Far at 0.6 of Near; Small at the same level as Big (1) — should Small sit quieter too (0.8)?
5. **Thunder under Nature** (beside Wind, Rain, Fire crackle), or a "Weather" / "Storm" heading with Rain and Wind?
6. **"bang" in Explosion's search words** — a gunshot or a door slam would want it too, if one is ever added.

## Merge notes

- **js/sfx.js:** one new block between the Game pack's closing `);` and the icons' comment, plus two edited lines in
  fxnew-sfx's pack code (`packSound` gains a `levelFor` line; `variant()`'s `level:` reads it). A sibling §B sound branch
  (B22 Drums) appending its own block in the same place conflicts only by adjacency: keep both blocks whole.
- **index.html:** `js/sfx.js?v=22` (fx-b9 took 20, fxnew-sfx 21). Take a number above every one that has been near a phone.
- **tests/tests.js:** appended at the end, from `/* ═══ #966 B23` to `// ── end 966 B23 ──`; rebuild by block, never a union
  merge.
- **Beside batch 9 (hunt/fx-b9):** its `PREVIEW_MAX` (8 s) cuts the ▶ of an Explosion at Length ≥ 2.5× (Big) and a Thunder at
  Length ≥ 2.25× (Near) / ≥ 2.1× (Far) — the ▶ would stop before the end of the tail while Add keeps it all. Either raise the
  cap, or cap these two sounds' Length at 2× — his call when 9.2's drawer is drawn. Its "every sound renders as today with no
  options" control sees two more sounds (it takes a little longer).
- **Collab:** no registry params, so `C.SCHEMA_FP` is untouched.
