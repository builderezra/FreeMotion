# #966 B44 — Hum Remover, ported from the ChatGPT pile (2e1e8ed1)

Branch `hunt/pile-hum`, built on `hunt/fxnew-drums` 85b71929. Refers to #545 (he hears it before it ships). **WRITTEN
WITHOUT RUNNING ANYTHING** — on 15 Oct a release ship was running, so not even `node --check` ran (the only thing executed
was `bash -n` on the proof script, a parse). Every number in the tests is reasoned from the notch's own formula, worked in
each test's comment. The proof is `scratchpad/agents/pile-hum/prove.sh` (written, not run): run it in a quiet slot, then the
eight tests in Chrome at 900 and 380.

**When this lands, DROP 2e1e8ed1 (T06) from the pile** (`tools/design/chatgpt-tasks/pile/INVENTORY.md` T06), or there will be
a second `humremove` def with a drop-down Mains and notches that miss a drifted mains. Nothing else from that commit is wanted.

## What it is

An EQ / Filter effect, right after the Notch (it is a row of them). Mains hum is a steady tone at the mains frequency and its
whole-number multiples; a buzz is the same hum with strong upper ones.

- **Mains** — two buttons, **50 Hz** (to start: Australia, he is in Perth) and **60 Hz** (North America). Stores 50 / 60.
  A rebuild: the notches' frequencies are part of the graph.
- **Harmonics** — 1 to 8 (4 to start): how many of 50, 100, 150 … Hz are cut. Switches notches that are always built (each
  in a bypass pair, fading 20 ms on a drag), so a drag never rebuilds. Not keyframable — a count is not a glide (Slope's rule).
- **Width** — 0.5 to 10 Hz (2 to start), keyframable: how wide the cut is AT THE MAINS FREQUENCY; harmonic k is cut k times wider.
- **Amount** — 0 to 100 % (100 to start), keyframable: how deep, even in dB — 60 dB × Amount down, and 100 % cuts all of it.
  At 0 the effect is the clip sample for sample, and Mains, Harmonics and Width grey out and say so (DEAD0).
- Then **Output** and **Mix** from the shared wrapper (mixOutput), as on every effect. No latency (a biquad answers on the same
  sample), so Mix needs no dryLag. Stateless: nothing is kept between renders, and the preview and the export build the same
  nodes and set them to the same values.
- Found by hum, mains hum, electrical hum, buzz, ground loop, power line, remove hum, de-hum / dehum, 50 hz, 60 hz.
- No icon of its own: the browser falls back to the EQ category's glyph (`audio-fx-browser.js` CAT_FALLBACK). Drawing one is
  a design pick for him (#545), so none was drawn.

## What was taken from the pile, and what changed

Taken: the idea and the four controls (Mains 50 / 60 with 50 first, Harmonics 1–8 at 4, a width in Hz, an amount), a cascade
of biquad notches each in a bypass pair switched by the count, the guard against harmonics near Nyquist, the category, the
search words. Its `hint` became a one-line `desc` and notes under the rows.

Changed — each one a fault in the pile's code, not a taste call:

1. **WIDTH: one Q for every notch, so harmonic k is cut k × Width wide** (the pile: every notch Width Hz wide, Q = k × mains ÷
   Width). Mains is never exactly 50 Hz — it wanders a tenth of a hertz or two — and harmonic k wanders k times as far. At
   Width 2, a mains 0.1 Hz high: the pile still took 50 Hz 20 dB down but 400 Hz only 4 dB (|H|² = Δ² / (Δ² + (W/2)²), Δ 0.8,
   W/2 1); with one Q every harmonic loses the same 20 dB (Δ 0.8 against a half-width of 8). Width keeps its meaning in Hz,
   measured at the mains frequency, and its note says so.
   The range is 0.5–10 Hz rather than the pile's 0.5–20: with one Q, 20 Hz at 50 Hz would be 160 Hz wide at the 8th harmonic
   (Q 2.5), which takes the body out of a voice. Tested by measuring the notch's −3 dB edges (below); prove.sh puts the pile's
   formula back and shows that test failing.
2. **AMOUNT: even in dB, not the dry / wet blend.** The pile's Amount was `wetDry` — exactly what **Mix** already is on every
   effect here, and Mix cannot be dropped (the `482 8.1` test holds every effect but Gain and Vocal Remove to a Mix). So it
   would have been two sliders doing one thing, and a linear blend does almost nothing until its last tenth: 50 % left the hum
   only 6 dB down, 25 % 2.5 dB. Now the notched copy is blended in by `humCut(a) = 1 − 10^(−3a)` (exactly 1 at 100 %), so the
   hum is 60 dB × Amount down: 25 % is 15 dB, 50 % is 30 dB, 100 % all of it. Nothing anywhere is lifted (|(1 − g) + g·H| ≤ 1
   for any notch). At Amount 0 `humCut` is exactly 0: out = clip × 1 + notched × 0 — the clip sample for sample (the bypass-pair
   rule), proven with `===` on export and preview. prove.sh puts the linear blend back and shows the depth test failing.
3. **MAINS: two buttons, this tree's CHOICE** — not a slider-shaped `P` with an `options` list for eda6773b's `afxChoice`
   drop-down (LAND-LIST: "buttons like the visual effects instead of drop-downs"). No afxChoice came in. The key is `mains`,
   not the pile's `base` (the pile never landed, so nothing saved uses `base`). A rebuild, so the pile's per-frame setter that
   rewrote all eight frequencies and Qs on every preview frame is gone.
4. **THE GUARD: a harmonic at or over 0.45 × the sample rate is not built at all** (the pile built all eight, clamped the
   frequency to 0.45 × rate and held that pair off). 8 × 60 = 480 Hz is under it at any rate a context can have (3 kHz is the
   least), so it only guards a stray value; it is said so in the code. The test reaches it by handing the build a context that
   SAYS 800 Hz (the real one's node factories, bound) — the 8th harmonic (400 Hz) passes, the 7th (350) is cut — and one that
   says 3 kHz (all eight cut), calling the build directly because `buildAudioFxChain` swallows a throw. prove.sh takes the
   guard out and shows that test failing.
5. **No 0-harmonic case:** Harmonics is 1–8; a stored 0 or 12 is clamped by the sanitiser and by the build (`initNum`), and a
   keyed Harmonics (it cannot be keyed) opens at 4. "Off" is Amount 0 or the eye.
6. **No mains detection** — the pile claimed none and none was added: a guess half a hertz off cuts the wrong frequency.
   Question 3 below.
7. **The pile's test** was one `{ item: 'TBD' }` check (60 Hz cut by 4×, 440 Hz above 0.7×). Replaced by the eight below.

## The tests (`966 B44 …`, appended to tests/tests.js; each fails on 85b71929 on its first line, naming the missing effect)

How they measure: a hum is a handful of steady sines, so the statistic is each component's level, not an RMS of the lot (a
harmonic cut 60 dB barely moves the total beside the tones). One DFT bin per frequency (`b7Amp`, Goertzel's sum) over 2–3 s:
every frequency is a whole number of hertz, so one second holds whole cycles of each and the others are exactly orthogonal —
no window, no leakage — and the bin reads |H(f)| × what went in. The window starts at 2 s because a notch W Hz wide rings
down as e^(−πWt): at 2 Hz that is 109 dB down by then. The width is read from an impulse response instead, whose DTFT can be
taken at any frequency, so the −3 dB edges are bisected.

1. **Catalogue** — EQ, right after the Notch; keys `mains, harmonics, width, amount, output, mix`; every range, step, default,
   keyframable / rebuild flag; Mains' buttons read and store as fxSegment does; the three DEAD0 rows; the description; the
   search words (and the, low, round, ten never match); the signature moves on Mains only; a stored Mains 58 plays as 60;
   the sanitiser keeps / clamps / drops as it should.
2. **The notches** — 10 harmonics of 50 Hz at 0.04 under 440 Hz (0.2) and 1 kHz (0.1). Harmonics 3, then 8: every harmonic up
   to the count ≥ 60 dB down, every one above and both tones within 0.5 dB (worst: 440 Hz −0.24 dB with 8). Amount 50 % / 25 %:
   −30 / −15 dB within 0.5 (the pile: −6.02 / −2.50).
3. **Mains 60 moves the notches** — a hum of both series: at 60 Hz the 60-series ≥ 60 dB down and the 50-series within 0.5 dB
   (worst 200 Hz, −0.14), and the other way round at 50 (worst 180 Hz, −0.21).
4. **Width, measured** — an impulse, Harmonics 3: Width 1 is 1 Hz wide at 50 Hz and 3 at 150; Width 4 is 4 and 12, within 3 %.
   CONTROLS: 25 Hz within 0.1 dB of 0 dB, 50 Hz more than 40 dB down.
5. **Amount 0 is the clip** — `===` on every sample, stereo, export and preview, with Mains 60, Harmonics 8, Width 3.5.
   CONTROL: Amount 1 % moves it by more than 1e-4.
6. **The guard** — the context that says 800 Hz / 3 kHz, above.
7. **Preview = export** within 1e-6, every control moved, stereo; a second export the same (stateless).
8. **Panel** (Chrome only) — Mains is two buttons, 50 Hz lit, fitting at 390 and 1280 px; a tap on 60 Hz stores 60 and moves
   the signature; Harmonics, Width, Amount, Output, Mix are sliders that fit, the last four with diamonds.

## Questions for Ezra (#545)

1. **Hear it** on a clip with real hum (a guitar amp, a cheap mic near a laptop charger). The defaults are reasoned, not heard.
2. **Harmonics 4 to start?** (50–200 Hz.) A buzz needs 8; 8 also costs a voice a little more around 300–400 Hz.
3. **Do you want an "Auto" Mains button** that measures the clip and picks 50 or 60 (and could follow a drifting mains)? It is
   buildable offline the way Loudness Match measures, but it is a bigger job and a wrong guess is worse than the right button.
4. **An icon** for it (it borrows the EQ glyph now) — options to be drawn and shown, not picked by me.
5. Amount reads 0–100 % and means "how deep": 50 % is 30 dB. If you would rather see dB on that slider, say so.

## Merge notes

- **index.html**: `audio-fx.js?v=20 → 21`, the same bump noisegate, loudness, autowah and fxnew-geq made. Stacking them: one
  bump above the highest (take the base line, never a side — memory "index.html conflicts"), once per stack.
- **js/audio-fx.js** — three places, none shared with the other branches:
  - the HUM block (`HUM_MAX`, `HUM_DB`, `HUM_TOP`, `humCut`) just above `const DEFS = [];` (fxnew-geq's block is above "WHERE
    THE BASS…" ~40 lines further down; noisegate's / loudness's near the Dynamics section; autowah's at ~185–400 and ~1840);
  - the def after `filterDef('notch', …)` (fxnew-geq inserts after the 3-Band EQ's `},`, four unchanged lines above — two
    separate insertion points);
  - one TAGS line after `notch:` (geq's goes after `eq3:`, noisegate's after `limiter:`, autowah's in Character).
  No shared name: nothing called HUM_*, humCut, humremove or …966b44 exists on noisegate, loudness, autowah or fxnew-geq.
  `mixOutput`, `NO_MIX` and the `482 8.1` test's NOMIX list are untouched (the Hum Remover has its Mix).
- **tests/tests.js**: one block `// ── 966 B44 ──` … `// ── end 966 B44 ──` appended after `// ── end 966 B22 ──`, like every
  branch on 85b71929 — the appends conflict at the end of the file: rebuild by blocks, never a union merge.
- **The collab schema fingerprint moves** (a new type, six params): pin it once at the top of the chain with the other branches'.
- **Drop 2e1e8ed1 from the pile** when this lands (above).
