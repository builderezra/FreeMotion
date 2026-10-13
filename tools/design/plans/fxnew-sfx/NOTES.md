# #966 B4 / B5 / B12 / B13 — four new sound packs (branch `hunt/fxnew-sfx`)

Backlog §B B4 (Cartoon), B5 (Beeps), B12 (Transitions & glitch), B13 (8-bit Game), in
`tools/design/plans/2026-09-29-idle-backlog/backlog.md`. Built on `8004fa16` (hunt/fx-land-on-fb2).

**Status: built, not picked, NOT RUN.** His #545 rule is that he hears new sounds and picks before anything ships; the
code did not wait for that. Everything here was written while the API builder was shipping, so nothing was run — no node,
no browser, not even `node --check`. The recipes, levels and every test threshold are reasoned from the recipes, not
measured. The first run is `prove.sh` (in the agent's scratchpad, see below), then the four tests in Chrome, then the
listen sheet.

Commits (local, not pushed): B4 `42f7c936`, B5 `7ce52565`, B12 `14c86531`, B13 `e318ef80`, a Bonk tweak `80ad5749`, and
the commit that adds this file, the probe and a variant-preview check in the B4 test.

## How the packs sit in `js/sfx.js`

All of it is one block between the end of the `SFX` array and `// ---- render + encode`, plus three lines after the
`FM.sfx = { … }` literal. Nothing in the shared path changed (renderBuffer, the cache, preview, add, the sheet).

- **`packSound(spec)`** builds an ordinary row (`id, name, cat, dur, render`, optional `level`) plus `tags` (search words,
  for backlog 9.1's search) and `choices` (what it can be asked for). Its `render(ctx, t0, d, out[, options])` is the sound
  as written when called with four arguments, which is how renderBuffer and every existing test call it.
- **Choices.** Pitch −12..+12 st (step 1), Variation 1–8 (1 = the recipe as written), Length 0.5–3× (a stretch, step
  0.05), and a sound's own (a bleep's Length in seconds and Tone, a countdown's Gap, a heart monitor's Flatline). A number
  is clamped and rounded; a listed value must be one of its values; anything else, or a default, is dropped.
- **`FM.sfx.variant(def, options)`** returns a sound of its own: id `boing|{"pitch":3,"variation":2}` (the options as JSON,
  so the render cache keeps it apart, and batch 9's cache code can parse it, see the merge notes), its length from the
  options, its name `Boing (+3 st, variation 2)` — which `add()` turns into the clip's file name. renderBuffer, preview and
  add take it exactly as they take a row. No options, nonsense or only defaults → the row itself (the same object).
- **`FM.sfx.packOptionsFor(def)`** — plain data for the options drawer (backlog 9.2, not drawn yet): `{ pitch: {min, max,
  step, def, unit}, variation: {…}, length: {…} }` or `{ gap: { values: [1, 0.5], def: 1 } }`. Null for the thirty older
  sounds and for a variant.
- **`FM.sfx.catIcon(cat)`** — a placeholder SVG for Cartoon and Game (null otherwise). Not shown anywhere: the sheet's
  headings are words, and the place for an icon is 9.1's category chips.
- **Seeding.** Noise goes through the file's `noiseSeed` (`packNoise`), so two buffers in one render are two noises (queue
  986, C11). Every other random choice is a stream seeded by the sound's id, its Variation and a salt (`packRnd`,
  `packJitter`; `j(spread)` is exactly 1 for Variation 1). No `Math.random`.
- **Written sounds.** The Record scratch, the Digital glitch and all six Game sounds are written sample by sample into one
  buffer played once (`packTrack`). The Game pack is quantised to 4 bits in JS (15 levels, one at zero) rather than through
  a WaveShaper: a shaper's curve is interpolated, so a sample landing on a step could round either way on two renders and
  queue 709's "renders the same twice" would be a coin flip.

## Every sound, its recipe and its options

| Pack | Row (id) | Recipe | Options | Level |
|---|---|---|---|---|
| B4 Cartoon | Boing (`boing`) 0.9 s | sine 400 → 150 Hz (exp, 0.6 s), a 12 Hz pitch wobble dying 220 → 6 cents, a 3× partial dying sooner | Pitch, Variation, Length | 1 |
| | Bonk (`bonk`) 0.45 s | hollow body 930 → 620 Hz in 60 ms (a fifth down), a 2.3× overtone, a 12 ms noise knock at 2.4 kHz | Pitch, Variation, Length | 1 |
| | Slide whistle up (`slide-whistle-up`) 0.85 s | sine 600 → 1800 Hz over 0.72 s, 6 Hz vibrato ±25–30 cents after the attack, seeded breath band-passed on the note | Pitch, Variation, Length | 1 |
| | Slide whistle down (`slide-whistle-down`) 0.85 s | the same, 1800 → 600 Hz | Pitch, Variation, Length | 1 |
| | Sad trombone (`sad-trombone`) 2.45 s | B♭3 A3 A♭3 (0.32 s each, 0.36 s apart) and G3 held 1.25 s; two saws ±5 cents per note through a Q 2 lowpass opening 350 → 1200 Hz and closing ("wah"); the last note's vibrato grows to 40 cents at 5.5 Hz | Pitch, Variation, Length | 1 |
| | Air horn (`air-horn`) 1.35 s | three saws on B♭4 (−14 / +3 / +11 cents), each blast scooping up 3 % in 30 ms; da (0.15 s) da (0.15 s) daaa (0.83 s) at 0 / 0.21 / 0.42 s; tanh drive, 240 Hz – 5.2 kHz | Pitch, Variation, Length | 0.8 (the backlog's) |
| | Wobble (`wobble`) 1.2 s | triangle 240 Hz + its octave; pitch swing ±260 → ±20 cents and a level pulse together, 11 → 5 Hz | Pitch, Variation, Length | 1 |
| B5 Beeps (under Interface) | Censor bleep (`censor-bleep`) 0.6 s | a pure sine, 5 ms edges | **Length 0.1–5 s** (0.6), **Tone 400–2000 Hz** (1000) | 0.75 |
| | Countdown (`countdown`) 3.45 s | 880 Hz × 0.12 s at 0, 1, 2 s, then 1760 Hz × 0.4 s at 3 s; each with a 12 % octave | **Gap 1 s / 0.5 s** (1.95 s long), Pitch | 0.8 |
| | Message ping (`message-ping`) 0.6 s | E6 1318.5 Hz + a 4× partial, struck twice 0.13 s apart | Pitch, Variation (moves the second ping: same, +5, +7, +12, −5, +4, +3, +9 st) | 0.8 |
| | Heart monitor (`heart-monitor`) 3.2 s | 1 kHz × 0.1 s every 0.8 s, four beats | **Flatline** (three beats, then the tone from 2.4 s to 4.35 s; 4.4 s long), Pitch | 0.8 |
| B12 Transitions & glitch (under Texture) | Record scratch (`record-scratch`) 0.56 s | a "record" (chord A2 E3 A3 C♯4 × 3 harmonics over a seeded noise bed lowpassed at 800 Hz of record time) read at the hand's position through four smooth pushes [back 0.15 s ×3.2, forward 0.13 s ×4.2, back 0.09 s ×5, forward 0.11 s ×2.6], muted at turnarounds; 140 Hz highpass | Pitch, Variation (another hand on another record; its length moves with it), Length | 1 |
| | Tape stop (`tape-stop`) 0.9 s | the backlog's: saw 220 → 20 Hz in a straight line over 0.8 s (+ a sine an octave under), lowpass closing 5 kHz → 180 Hz | Pitch, Length | 1 |
| | Radio tuning (`radio-tuning`) 1.6 s | static through a Q 3.5 band on a seeded random walk (400 Hz – 4.5 kHz, a step every 45 ms) + three whistles gliding past | Variation, Length | 0.8 |
| | Digital glitch (`digital-glitch`) 0.8 s | 20–60 ms slices: square bursts (80 Hz – 2.4 kHz), crushed sample-and-hold noise, stutters of the slice before (8–16 ms looped), and a hard gate every fourth slice | Variation, Length | 0.75 |
| B13 Game | Coin (`coin`) 0.6 s | square B5 for 80 ms then E6, linear fade by 0.5 s | Pitch, Variation (the interval: 4th, 5th, 3rd, octave, …), Length | 0.7 |
| | Jump (`jump`) 0.25 s | square 300 → 700 Hz (linear) over 0.15 s | Pitch, Variation, Length | 0.7 |
| | Power-up (`power-up`) 0.7 s | C5 E5 G5 C6 E6 G6 C7 at 60 ms on a 25 % pulse + a triangle an octave down; the top rings 0.2 s | Pitch, Variation (the chord: major, sus4, minor, 6th, fifths, sus2, aug, 4th+6th; and the speed ±20 %), Length | 0.7 |
| | Laser (`laser`) 0.35 s | square 1800 → 200 Hz (exp) over 0.3 s, a 30 Hz pitch shake ±0.1 octave | Pitch, Variation, Length | 0.7 |
| | Game over (`game-over`) 1.4 s | C5 G4 E♭4 C4 at 0.16 s (square + triangle an octave down), then C4 diving to C3 over 0.55 s with a 7 Hz wobble | Pitch, Variation, Length | 0.7 |
| | Extra life (`extra-life`) 0.65 s | G5 D6 A5 E6 B5 F♯6 G6 at 55 ms on a 25 % pulse (fifths zig-zagging up, written for this file — not any game's jingle) | Pitch, Variation (shifts the figure), Length | 0.7 |

Search words are on every row (`tags`), e.g. boing / spring / bounce, bonk / bop / knock, slide whistle, sad trombone /
wah wah / fail, air horn / airhorn / hype, bleep / censor / swear, countdown / 3 2 1, ping / notification, heart monitor /
ecg / flatline, record scratch / dj / turntable, tape stop / slow down / power down, radio / static / dial, glitch /
stutter, coin / pickup / 8-bit, jump / hop, power up / level up, laser / pew, game over / lose, extra life / 1-up. No
trademarked sound names. Names were checked against `tools/design/954-effect-names.md`: none is one of Alight Motion's 40
distinctive names; "Glitch" is one of our own effect names, and this row is "Digital glitch".

Sheet order: categories are listed by first appearance, so Cartoon and Game land after Nature; the beeps join the end of
Interface and the B12 four the end of Texture. The list grows from 30 to 51 rows.

## What the listen sheet must play for him

`render-probe.js` (this folder) renders each of these exactly as Add makes it and POSTs `NN-<name>.wav` plus `listen.json`
(order, names, why, length, peak) to a local receiver:

- **Cartoon:** Boing; Boing Variation 2; Boing −5 st · Bonk; Bonk +5 st · Slide whistle up; Slide whistle down; Slide whistle
  up at 2× length · Sad trombone; its Variation 2 · Air horn; Air horn +3 st · Wobble; its Variation 3.
- **Beeps:** Censor bleep; a 2 s bleep at 1500 Hz · Countdown; half a second apart · Message ping; its Variation 2 · Heart
  monitor; the flatline.
- **Transitions & glitch:** Record scratch; its Variation 2 · Tape stop; at 2× length · Radio tuning; its Variation 2 ·
  Digital glitch; its Variation 2.
- **Game:** Coin; its Variation 2 · Jump · Power-up; its Variation 3 (minor) · Laser · Game over · Extra life.
- **Beside their nearest older sounds**, so he can say whether a new one earns its row: Zap (vs Laser), Slide up (vs Slide
  whistle up), Vinyl crackle (vs Record scratch), Heartbeat (vs Heart monitor), Ding (vs Message ping), Error (vs Game over).

Running it (a browser slot; never beside a ship): serve this worktree (`tools/serve.sh`), start a receiver that writes each
POST body to a file (hunt/new-prep's `tools/design/plans/new-effects/recv.py` does), and run the probe through
`tools/shot.py --js-file` with `window.__recv = <the receiver's port, a number>;` put in front of it. The page he listens
on — one row per WAV with its reason, his pick beside each — is built from `listen.json` and sent to his phone.

## Questions for him (#545 — his picks)

1. **Which of the 21 to keep, and their names** — after the listen sheet. Bonk is an extra beyond the backlog's list.
2. **Headings.** The beeps sit under Interface and the transition / glitch sounds under Texture. Or a "Beeps" and a
   "Transitions" heading of their own?
3. **"Extra life" or "1-up"** as the row's name ("1-up" is in its search words either way).
4. **Slide whistle** as two rows (up, down — today) or one row with a Direction option?
5. **Loudness by ear:** Air horn 0.8 (the backlog's), the Game pack 0.7, the bleep 0.75, the rest 0.8–1.
6. **Icons for Cartoon and Game.** Placeholders (a spring with a ball; a game pad) in the audio browser's line style, not
   shown anywhere. The real ones are a #545 design item: draw options at 24 px for 9.1's chips, he picks.

## The tests (`tests/tests.js`, appended before the final `})();`)

Four, `'966 B4 …'`, `'966 B5 …'`, `'966 B12 …'`, `'966 B13 …'` (`{ item: '966' }`), with shared helpers named `…Sfx966`.
Each fails on 8004fa16 on its first check, which names the missing sounds ("The Cartoon pack (#966 B4) is not in the
sound-effect library: there is no Boing (boing), …") — not a TypeError.

Every sound gets `packSfx966`: in the library, in its category, with its name and its search words (at least three, lower
case, and the pack's must-have words); it renders at its stated length (`dur` + the 0.05 s tail, sample for sample as
renderBuffer sizes it); its peak is 0.89 × level (normalised, so it cannot clip); it is audible past the first third of
its length; it renders the same twice (≤ 1e-5, queue 709's tolerance); Variation 2, where offered, renders more than 0.05
away; no options or nonsense return the row itself; its ▶ plays the very buffer Add makes (queue 986 C10's measurement:
FM.audioCtx stubbed with an OfflineAudioContext, the preview's samples 441 later against renderBuffer, ≤ 1e-4 and peaks
within 1 %); it offers options.

Then:
- **B4** — Boing falls from ~400 Hz (zero count 0.02–0.08 s, reasoned ~360) to under 1/1.8 of that at 0.5–0.6 s (~163);
  +12 st reads 2× (±0.12); Length 2 is 1.8 s. Slide whistles rise / fall by > 1.8× (reasoned 2.4×). The sad trombone's notes
  are B♭3 A3 A♭3 G3 within 2 % (autocorrelation, 150–300 Hz, 160 ms of each). The air horn's blasts start at 0 / 0.21 / 0.42 s
  (±0.02). A variant is named `Boing (+3 st, variation 2)` and its ▶ is its clip. The Cartoon icon exists.
- **B5** — the bleep is 1000 Hz ±5 for 0.6 s; `{length: 2, tone: 1500}` is 1500 Hz, loud to 1.99 s, silent after 2.01 s and
  named `Censor bleep (2 s, 1500 Hz)`; `{length: 0.01, tone: 9000}` clamps to 0.1 s at 2000 Hz. Countdown onsets 0/1/2/3 s
  (±15 ms), 880 then 1760 Hz (±2 %); at Gap 0.5 onsets 0/0.5/1/1.5 and 1.95 s long. Message ping onsets 0 / 0.13 s, 1318.5 Hz
  ±3 %. Heart monitor onsets 0/0.8/1.6/2.4 s, 1 kHz ±25, silent 2.6–3.1 s; the flatline holds (RMS > 0.3 over 2.5–4.3 s).
- **B12** — Tape stop: zero count at 0.55–0.7 s under 0.6× that at 0.05–0.2 s (reasoned 0.34), and Length 2 is the same fall
  over twice the time. Record scratch (C11): with createBuffer / createBufferSource watched, no buffer played twice, none
  looping, no two alike; and the autocorrelation of its first difference stays under 0.6 at every lag 10–250 ms, with a
  CONTROL that 30 ms of it tiled reads over 0.9. Digital glitch: ≥ 3 gates of ≥ 15 ms exact silence. Radio tuning: its 0.1 s
  windows' zero counts span > 1.5×.
- **B13** — 4-bit: the 15 commonest sample values hold ≥ 85 % of the non-zero samples of every Game sound (by construction
  100 %), CONTROL: the Ding holds < 30 %. Coin: 988 Hz (±2 %) then 1318.5 Hz (±1.5 %). Jump rises > 1.4×; Laser falls under
  half. The Game icon exists.

The older tests that iterate every sound now see 51: 709 (renders each twice at 22.05 kHz from t0 = 0.01), 562 (each
audible and under full scale on the raw path: every new recipe's raw peak is reasoned ≤ ~1.1, the limit is ~1.52), 986 C10.
The Game, scratch and glitch tracks are written at the context's own sample rate, so 22.05 kHz renders work.

**Unsure until run:** the scratch's 0.6 autocorrelation ceiling (the chord is quasi-periodic near each push's top speed;
reasoned ~0.3–0.45); the sad trombone's 2 % (two detuned saws, measured by autocorrelation — should be well inside); the
tape stop's zero count late (a lowpassed saw over a sub sine: reasoned two crossings a cycle). Each failure message prints
the measured numbers.

## prove.sh (agent scratchpad: `agents/fxnew-sfx/prove.sh`, with `hs.js`)

Written, not run. It exits at once if `/home/ezra/FreeMotion/.ship-in-progress` exists and re-checks between stages.
1. `node --check` on every changed js (the probe wrapped in an async function, as shot.py runs it).
2. The four `966 B` tests from the tip's tests file on 8004fa16's js (all four must FAIL, naming the missing sounds) and
3. on the tip's js (all four must PASS) — through `hs.js`, a marked copy of fxnew-voice's `hv.js` (aud-red's node harness,
   rendering real audio through `aud-red/wa.js`) that also lifts the `…Sfx966` helpers and logs which tree it loaded (30
   sounds and no `variant` on the base, 51 and `variant` on the tip).
4. The older sound tests (709, 562, 563, the `sfx` one, 740, 986 C10/C11/C12, 482 3.1, the star test, the WAV writer, the
   glint) on both trees: verdict and message must match; 709, 986 C10 and C11 must PASS on the tip. `482 9.` tests are not
   on this branch (they are on hunt/fx-b9) — it says so.
5. The collab schema fingerprint (fx-all2/fp.js) on both trees: must not move (no registry params were added; C.SCHEMA_FP
   was left alone).
6. `treecheck.py 8004fa16 HEAD`, `drops.py 8004fa16 HEAD`, and no CRLF. Results in `agents/fxnew-sfx/prove-result.txt`.

Still owed after that: the four tests in Chrome at 900 and 380 (`?only=966%20B`), and the listen sheet.

## Merge notes — beside batch 9 (hunt/fx-b9: 1c389cdf 9.3 nature beds, 4a587538 9.4 rain with drops)

- **js/sfx.js merges without a conflict — checked** with `git merge-file` (base d55cabc8, the merge base; ours this
  branch; theirs 4a587538): 0 conflicts. Batch 9 changes lines near the top (its helpers after `expTo`), inside the
  Vinyl / Wind / Rain / Fire entries (their `bed` recipes), renderBuffer / renderBed, the render cache, preview / add /
  fileName, and keys inside the `FM.sfx = { … }` literal. This branch adds one block after the `SFX` array's `];` (17 lines
  below batch 9's nearest change, inside Fire's entry) and four lines after the literal's closing `};` (six unchanged lines
  below batch 9's last change in it). No shared line is edited.
- **index.html conflicts on the `js/sfx.js?v=` line** — 20 on fx-b9, 21 here (the same check shows other buster conflicts
  too, from changes between d55cabc8 and 8004fa16 that are not this branch's). Take a number above both that have been
  anywhere near a phone (22 is safe).
- **tests/tests.js conflicts at the end:** both append before the final `})();`. Keep both blocks whole, rebuilt by block
  (fx-b9's ends `// ── end 482 9.4 ──`, this one runs from `/* ═══ #966 B4 / B5 / B12 / B13` to `// ── end 966 B13 ──`) —
  never a union merge.
- **They work together as written.** fx-b9's `renderBuffer(def, opts)` ignores options for a sound without a `bed`, so every
  pack row renders as the row — its 9.3 CONTROL ("no options, {} or nonsense = today, for every sound in the list") holds for
  the 21 new ones too, and takes ~70 % longer with 51 sounds (its budget is 240 s; worth a glance). Its cache keys a variant
  by the variant's id, and its long-bed filter parses whatever follows `|` as JSON — which is why a variant's id carries its
  options as JSON: `JSON.parse('{"pitch":3}')` works and a pack sound has no bed, so it is never counted as long.
  `PREVIEW_MAX` (8 s) never cuts a pack sound (the longest, a 5 s bleep).
- **Two option paths after the merge** — beds take `(def, options)` through renderBuffer / preview / add / fileName /
  optionsFor; pack sounds take `variant(def, options)` and `packOptionsFor`. Left apart on purpose so neither branch edits the
  other's lines. When 9.2's drawer is built, make it one: `renderBuffer(def, o)` → `def.choices ? renderBuffer(variant(def, o))`,
  `optionsFor(def)` → `packOptionsFor(def)` for a pack sound, `fileName(def, o)` → `variant(def, o).name + '.wav'`, and give
  `markRow` the variant's `variantOf` so a variant's ▶ lights its row.
- **Collab:** no registry params, so `C.SCHEMA_FP` is untouched (prove.sh stage 5 checks the fingerprint does not move).
