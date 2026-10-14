# #966 B36 — Everyday Foley pack (hunt/pile-foley), ported from ChatGPT's pile

Backlog §B B36 ("Everyday foley: knock, footsteps, tick-tock, vibrate, typing, ka-ching", SFX, M), LAND-LIST §B7 (sound packs,
T04). Built on the §B chain tip `85b71929` (hunt/fxnew-drums), **not** on the Ambience port (hunt/pile-ambience is a sibling,
merged later — see the merge notes). **Built, not picked** — his #545 rule: he hears them on the listen sheet before anything
ships. **Nothing was run**: the API builder was live (no node, no python, no browser, not even `node --check`). The proof is
written and owed: `scratchpad/agents/pile-foley/prove.sh`.

## Where it came from — and the pile commit to DROP when this lands

ChatGPT's pile commit **`ae637420` "Add synthesized everyday Foley sounds"** (on `05116900`, the pile's Ambience commit). Read
hunk by hunk and ported **by hand**; none of its `?v=` numbers copied (it had sfx 22 → 23). **Drop `ae637420` when this lands**
— everything worth keeping from it is here. Its report (`outside/chatgpt/fixes/690-foley-pack.md`) is not carried.

## Which sounds already existed

**None of the six.** Searched `js/sfx.js` on `85b71929` for knock / footstep / clock / tick / vibrate / buzz / keyboard /
typing / typewriter / cash / register / ching / coin. The nearest, all kept as they are:
- **Typewriter key** (Interface) — ONE key, 0.14 s. Typing is a run of keys in words; the row it sits nearest.
- **Ticking build** (Build) — ticks that speed up, a tension cue. Tick-tock is a clock: even, two pitches.
- **Bonk** (Cartoon, #966 B4) — a cartoon wood-block hit that carries the search word "knock". Door knock is a door.
- **Bell** and **Ding** (Interface) — a bell alone. Ka-ching's bell comes after the register's mechanical "ka".
- **Heartbeat** (Build) — a steady low pulse; nothing like a step but the nearest rhythm.
- **Coin** (Game) — the 8-bit pickup; Ka-ching is the real-world money sound.

REQUESTS.md and POLISH-LOG.md on `ssh/main`: none of these sounds was ever asked for in a specific way. The words hit only in
other senses ("knock-on", typing text, a drag "vibrating" the phone, #838). The ask is the backlog line alone.

## What was taken from the pile

The six sounds, their ids (`foley-knock`, `foley-footsteps`, `foley-clock`, `foley-vibrate`, `foley-typing`, `foley-kaching`),
names (Door knock, Footsteps, Tick-tock, Phone vibrate, Typing, Ka-ching), the Foley category, the rows' levels (0.68 / 0.58 /
0.43 / 0.48 / 0.45 / 0.65) and the shape of each recipe: a knuckle tap on a wood body; low thuds with a click; two alternating
clicks; a ~150 Hz saw in three pulses; a run of key clicks; a click then a bell.

## What was fixed or changed

| | The pile (`ae637420`) | Here |
|---|---|---|
| Seeding | `noiseBuffer` (seeded by length and colour only); hand-placed patterns; no Variation | `packNoise` through `noiseSeed` (C11), `packRnd` / `packJitter` by id and Variation — the same choices render the same samples, each Variation is another take (LAND-LIST: "seed per variation"); the ▶ is the clip (C10) |
| Options | none | Every sound has choices, Variation 1-8 on all six (below) |
| Small / Big | — | A softer choice really is quieter (its own `levelFor`, so Add lays it in lower): knock soft 0.4 / firm 0.68 / pound 1; footsteps hard 0.58 / soft floor 0.4 (running 1.2x); vibrate table 0.48 / pocket 0.3; typing laptop 0.45 / mechanical 0.6 |
| Door knock | 2 knocks, 0.26 s apart; a 160 Hz triangle under the tap | Knocks 1-6 (3 by default), ~0.17 s apart and a little uneven, the first the firmest; the door is two of a panel's modes (sines at ~180 Hz and 2.37x); Force soft / firm / pound |
| Footsteps | 5 brown-noise thuds 0.34 s apart (~3 a second: a jog) | each step a heel then a toe 50 ms later (30 ms running), feet alternating; walk ~1.9 steps a second (0.52 s) or run ~3.1 (0.32 s); Steps 2-16 (6); hard floor (with the heel's click) or soft |
| Tick-tock | 4 clicks 0.46 s apart (~2.2 a second) | **once a second** (or twice, on asking) — a clock: a click, a ring at the tick's ~2.6 kHz or the tock's ~1.9 kHz, the case answering low; Length 2-30 s (4) |
| Phone vibrate | three 0.22 s saw pulses at 145-155 Hz | the motor at ~175 Hz spinning up and down in buzzes of 0.38 s every 0.62 s; Buzzes 1-8 (3); on a table it rattles an octave up, in a pocket it is muffled |
| Typing | 11 clicks at fixed times, 1.65 s | words of 2-7 keys at an uneven typing rhythm, a space bar (lower, longer, with its rattle) and a pause between words; each key its own click and bottoming out; Length 1-20 s (3); steady (~6 keys a second) or fast (~10); laptop or mechanical keys |
| Ka-ching | a click, then three sines (870 / 1340 / 2050 Hz) for 1.2 s | the "ka" (the lever's clack, the drawer's clunk and thump), then the "ching": a bell at ~2.2 kHz with partials at 2.32x and 4.1x and a twin a hair sharp (the shimmer); Pitch and Length (the ring) |
| Test | renders each: "not silent, not clipped" | eight tests of what makes each sound itself (below) |

**Shared path — untouched.** Only new rows pushed after the Drums block, three small helpers (`foleyTap`, `foleyThud`,
`foleyRing`), five tables (`KNOCK`, `FOLEY_STEP`, `FOLEY_FLOOR`, `FOLEY_BUZZ`, `FOLEY_KEYS`) and one icon line. Every older sound
renders exactly as before — prove.sh stage 4b hashes every older row and a few variants on both trees to show it. A placeholder
**Foley icon** for `FM.sfx.catIcon` (a door, its handle and the knock's two marks; the real one is #545's). Buster: **sfx 24**
(this tree had 23). No registry param, so `C.SCHEMA_FP` cannot move.

## The tests — and why each fails on 85b71929

All eight are titled `966 B36 …`, `{ item: '966' }`, appended after `// ── end 966 B22 ──`. Each fails on `85b71929` on its
first line — `packSfx966` (the catalogue test) or `folNeedSfx966` — with *"The Everyday Foley pack (#966 B36) is not in the
sound-effect library: there is no Door knock (foley-knock), Footsteps (foley-footsteps), …"* (or the one sound a test is about),
never a TypeError. The statistics, and why each was chosen:

- **Everyday Foley** — packSfx966 on all six rows; what each offers (packOptionsFor, exactly); 16 variants with their names,
  stated lengths and levels (variantSfx966); a softer choice quieter, a harder one louder; Variation 3 the same samples twice
  and Variation 4 another take, on all six; the icon.
- **Door knock** — *N sharp onsets in a low-mid band*: onsets (onsetsSfx966 at 0.3) = Knocks (3, 1, 5; 3 for Variation 2),
  0.13-0.22 s apart; SHARP: each knock's first 15 ms over 4x its 50-80 ms (reasoned ~25x: a knock, not a thud or a tone);
  LOW-MID: 60 % or more of the energy under a one-pole 1 kHz split (reasoned ~93 %: the door carries it) and the RMS frequency
  200-1500 Hz (reasoned ~600); soft and pound darker than firm (under 0.85x).
- **Footsteps** — *a steady step rate, heel and toe*: steps (hitsSfx966, 80 ms quiet before each so a heel and its toe count
  once) = Steps (6, 10); walking 0.45-0.6 s apart, running 0.27-0.37; the gaps' spread under 0.06 of their mean (reasoned ~0.02);
  HEEL THEN TOE: the RMS where the toe lands (52-68 ms) over 2.5x the dip before it (26-42 ms) on five steps of six (reasoned
  ~15x); 45 % or more under 1 kHz; a soft floor darker (under 0.8x).
- **Tick-tock** — *alternating two pitches at 1 Hz*: onsets 1 s apart within 0.02, spread under 0.01 s (a clock is exact; 0.5 s
  at twice a second); the ring's pitch (half its zero crossings 4-20 ms after each onset, when the ring is the only thing left)
  alternating up and down by 1.15x or more (reasoned 2600 / 1900 = 1.37), the tick 2.2-3 kHz, the tock 1.6-2.2; each tick short
  (silence until the next); Length 8 = 8 ticks.
- **Phone vibrate** — *a buzz ~150-250 Hz in pulses*: pulses (20 ms frames over half the loudest) = Buzzes (3, 5), each
  0.25-0.5 s; the motor's pitch by autocorrelation (120-400 Hz, so a saw's harmonics and its octave rattle cannot fool it) 150-250
  Hz (reasoned 175); steady inside each pulse (within 1.5x); in a pocket darker (under 0.75x).
- **Typing** — *many short clicks at an irregular rate*: onsets 3.5-9 a second (reasoned ~5.5); UNEVEN: the gaps' spread over
  0.2 of their mean (reasoned 0.36; a clock's is ~0.002); SHORT: 2 ms frames over half the loudest under 15 % of the time
  (reasoned ~2 %); fast 1.3x the keys or more (1.67); 6 s 1.6-2.6x the keys of 3 s (2.07); higher than a knock (over 2x).
- **Ka-ching** — *a bell-like high partial after a mechanical onset*: onsets under 15 ms and at 0.11-0.15 s; the ka (3-90 ms)
  45 % or more under 1 kHz (reasoned ~67 %) with no sine near the bell's pitch over 0.15 of it (noise: ~0.01); the bell's pitch
  1.85-2.6 kHz by autocorrelation, under 30 % of its energy under 1 kHz (~15 %), its strongest sine 0.35 or more of 0.2-0.26 s
  (~0.6); ringing and dying (0.45-0.6 s at 0.05-0.6 of 0.15-0.3 s); Length 2 audible 1.5x longer (~1.8x); Pitch +5 st 1.25-1.42x.
- **Foley on the sound sheet** — the Foley heading holds its six rows in order, each row 32 px or taller at the suite's width
  (it runs at 900 and 380). Needs a DOM: on 85b71929 it fails on its first line naming the six, like the rest; on this build
  it fails in the node harness too (no DOM) — prove.sh expects that, prints its message, and leaves it to Chrome.

Every bound is reasoned from the recipe and written beside it in tests.js — none measured. If a bound is wrong it will say what
it measured; widen it from the measurement, not by guess.

## The 32 px check (LAND-LIST §B7: "Phone controls must be at least 32px tall")

**This pack adds no choice controls to the sheet**, because on this chain the sheet shows none: `FM.sfx.packOptionsFor` is data
for the options drawer, and the drawer is backlog 9.2, not built ("Nothing offers them yet", sfx.js). LAND-LIST's 32 px fix was
for the pile's own drawer in `30a75961` (a `<select>` and a range input), which this chain does not carry. When 9.2 is built,
its controls must be 32 px or taller at 380.

What the pack does add is six ordinary rows (`.sfx-row`, styles.css 7954-7976): padding 5 px top and bottom around a 30 x 30 ▶,
the name (14 px text with 6 px padding), the length, a 30 x 30 ★ and Add (`.btn`, 6 px padding). So **each row is ~40 px tall
— it meets 32** — and the new test measures it at 900 and 380. **But the ▶ and ★ circles are 30 px**, 2 px under. That is every
row in the sheet, not this pack's; making them 32 moves every row (a visual change he has not seen, #545) — so it is a question
below, not a change here. Measured from the CSS, not in a browser (nothing was run).

## Questions for Ezra (on the listen sheet: `render-probe.js`, next browser slot)

1. **Keep, change or veto** each of the six (one word each is enough).
2. **The defaults:** 3 knocks (the pile had 2 — a "knock-knock"; 2 is one tap away), Tick-tock once a second (the pile ticked
   about twice a second; twice is one tap away), 6 walking steps, 3 buzzes, 3 s of typing. Recommended: as built.
3. **Overlaps:** Typing beside Typewriter key, Tick-tock beside Ticking build, Ka-ching beside Bell — keep both of each?
   Recommended: yes, they are different sounds; the older ones stay byte for byte.
4. **The sheet's ▶ and ★ are 30 px** (32 is the phone rule). Make them 32 on every row? Recommended: yes, with 9.2's drawer,
   drawn and shown first.
5. **More choices?** ("as much choice as possible", #966): a knock rhythm ("shave and a haircut"), footstep surfaces (gravel,
   wood, high heels), coins after the ka-ching, a typewriter's bell at the end of a line. Each is a small option on these recipes.

## Merge notes

- **Ambience (`hunt/pile-ambience`, #966 B35)** is a sibling on the same base. Where the two meet, keep both, Ambience first:
  - `js/sfx.js`: both insert a block after the Drums `SFX.push(…);` and before the icons, and both add one line to
    `SFX_CAT_ICON` after `Drums:` — adjacent inserts; keep both blocks and both lines. Category order follows push order, so
    Ambience then Foley in the sheet. No name is shared: this branch's are `foleyTap` / `foleyThud` / `foleyRing`, `KNOCK`,
    `FOLEY_*`; Ambience's are `AMB*` / `ambFold`. Ambience's `renderBuffer` / `variant()` lines (the `def.loop` tail and
    fold) leave these six as they are (none has `loop`).
  - `tests/tests.js`: both append after `// ── end 966 B22 ──`. **Rebuild by blocks, never union-merge**: the B35 block (to
    `// ── end 966 B35 ──`), then this block (to `// ── end 966 B36 ──`). The helpers are distinct (`fol…Sfx966` here against
    `needSfx966`, `framesSfx966`, `pctSfx966`, `medianSfx966`, … there); `folNeedSfx966` is this branch's own copy of
    `needSfx966` — when both have landed it can become a call to `needSfx966` (or stay; it is one line).
  - `index.html`: both bump sfx to 24 — take one bump.
- **Landing**: bump sfx's `?v=` once from live's value (main has 20 today), not this chain's 24. Log one REQUESTS.md entry per
  batch (LAND-LIST §2) and retag these tests with it; the twins (B22 / B23 / B35) carry `{ item: '966' }` the same way.
- **Batch 9 (`hunt/fx-b9`)** rewrites `renderBuffer(def, opts)`; these six use only the no-options path (a variant is an
  ordinary def), so they ride on whichever `renderBuffer` lands.
- **Drop `ae637420`** from the pile when this lands.
- Simple mode Phase 2: `FM.sfx.open()` shows these rows in Simple too (LAND-LIST §B7).
- Collab: no schema bump — a sound effect is not a registry param.
