# #966 B45 — De-esser, ported from the ChatGPT pile (081ee145), hunt/pile-deesser

Built on hunt/fxnew-drums **85b71929**. Refers to #545: he hears it before anything ships.

**⚠️ NOTHING HERE HAS BEEN RUN.** Written on 15 Oct while a release ship was running: no node, no python, no browser, not
even `node --check`. Every number below is worked from the filters' own formulas (the spec's RBJ biquads, with the bilinear
warp where it matters), not measured. The proof script is written and waiting: `scratchpad/agents/pile-deesser/prove.sh`
(node harness, quiet slot only), then the `966 B45` tests in Chrome at 900 and 380.

## What it is

An audio effect in **Dynamics, right after the Compressor** (where the pile put it): `deesser`, label **De-esser**. It turns
down the harsh "s" and "sh" of a voice, and nothing else.

| Control | Range | Default | Kind |
|---|---|---|---|
| Frequency | 3000 … 10000 Hz, step 100 | 6000 | keyframable — the centre of the band it works on |
| Threshold | −60 … 0 dB, step 0.5 | −30 | keyframable — how loud an s must be (its peak, in dBFS, at Frequency) to be caught |
| Reduction | 0 … 24 dB, step 0.5 | 6 | keyframable — how far a caught s is turned down (the pile's was 0–100 %, a ratio) |
| Listen | Off / On | Off | TOGGLE (tick box), not keyframable, not a rebuild — plays only what it takes out |
| Output | −24 … +12 dB | 0 | the shared wrapper (`mixOutput`) |
| Mix | 0 … 1 | 1 | its own: it scales the cut (so a blend has no dry copy and nothing to comb) |

- Description (`desc`): *"Turns down the harsh s and sh sounds in a voice, and leaves the rest of the voice as it was."*
- Notes under rows: Frequency (*"Where the s sounds are: about 5 to 8 kHz for most voices."*), Reduction (past ~12 dB a voice
  can sound lispy), Listen (*"…If you hear words and not just s sounds, raise Threshold or move Frequency."*).
- Search words: de-ess, deess, sibilance, sibilant, esses, harsh s, sharp s (plus its label and id). Checked against queue
  986 C13's rule: the, low, on, round and ten do not list it; and no `voice` tag (the Compressor's comment: one word of "robot
  voice" would list it).
- Tile icon: none of its own — the Dynamics glyph. A glyph is a picture, so it is his pick (#545).

## How it works

`out = x − Mix × depth × how far over × BP(x)`, where BP is a **0 dB-peak band-pass at Frequency, Q 1/√2**, and
`depth = 1 − 10^(−Reduction/20)`.

- **At Frequency, BP is exactly 1, in phase** (RBJ's band-pass is pre-warped there), so a caught s at Frequency comes out
  exactly Reduction down. Away from it the cut eases off, and **nowhere is anything turned up**: |1 − d/(1 + jy)| lies between
  1 − d and 1. About an octave wide where it cuts half its depth (at 12 dB). A 300 Hz voice under a 6 kHz band loses 0.02 dB
  while an s is being cut.
- **The level** (what Threshold is compared with): the band, through a Butterworth high-pass an octave under Frequency (so a
  loud voice cannot trip it — 300 Hz under a 6 kHz band reads 63 dB down), the louder of |left| and |right| (½(a + b + |a − b|),
  the Noise Gate's way; a mono clip up-mixed first), smoothed by a 100 Hz Butterworth, scaled so a sine at Frequency reads its
  own peak. A 6 kHz s peaking at −12 dBFS is 18 dB over a −30 dB Threshold.
- **How far over** (a WaveShaper curve, `DE_HOW`): exactly 0 up to Threshold, easing in (smoothstep in dB) to all of Reduction
  6 dB over it. Both ends are curve points, so under Threshold the band goes through × 0 and the sound is x + 0 = x — **the clip
  sample for sample**. Reduction 0 (depth exactly 0) and Mix 0 are the clip the same way.
- **Speed**: catches an s in about 1.5 ms (it crosses Threshold 0.8 ms in and is fully cut by 1.6 ms, on the test's s) and lets
  go about 4 ms after it ends, so the vowel after an s keeps its own top. An s lasts 50–150 ms.
- **Listen** plays −cut — exactly what it takes out — in a bypass pair with the de-essed sound: the two add up to the clip, and
  under Threshold Listen is silent. A live flip fades over 20 ms (`pairTargets`), never a rebuild.
- **No latency.** Band-passes, gains and curves with no oversampling answer on the same sample. Nothing in the app shifts an
  effect's latency back, and here there is none to shift: the sound stays exactly on the picture.
- **Preview = export**: one graph of native nodes, driven through the same AudioParams by `applyAt` (preview) and `schedule`
  (export). **Nothing is kept between renders.** Test 8 checks both, to 1e-6.

## What was wrong in the pile (081ee145), and what changed

The pile's own report says it was never run ("The saved OfflineAudioContext regression, actual sound and iPhone/browser behavior
remain unverified"). Read critically:

1. **The band turned the s UP.** It split off a 12 dB/octave Butterworth **high-pass** band, compressed it (a
   DynamicsCompressorNode) and added it back to `x − band` (both delayed 6 ms to match). But x minus a high-pass is not a
   low-pass: at the high-pass's own frequency the band is j/√2 (90° ahead), so taking any of it away turns that frequency **up**
   — |1 − (1 − g)·j/√2| = √(1 + (1 − g)²/2), **+1.76 dB with the band all gone**, +1.07 dB at what is now Reduction 12 — and an
   octave above it removing the whole band only takes 2.8 dB off. An s at "Sibilance at" got louder. Its own test (an s at 7 kHz
   over a 5 kHz band, wanted 4.4 dB down) **could not pass**: no setting takes that s more than 0.92 dB down.
   → Now a band-pass bell at Frequency: exactly Reduction at its centre, never a boost. (Not the "full-band reduction" fault —
   the pile did split the band — but a split whose complement is wrong.) prove.sh stage 4a puts the high-pass back.
2. **Reduction was a ratio** (1 + 19 × %), so how far an s went down depended on how loud it was, with no ceiling — a loud s
   18 dB over at the default 50 % (10.5:1) went down 16 dB. → Now Reduction is the depth in dB, reached 6 dB over Threshold.
3. **The whole sound was 6 ms late** (the compressor's look-ahead, 288 frames at 48 kHz; its dry copy was delayed to match, so
   its Mix did not comb, but the sound moved off the picture). → Now no latency at all.
4. **Reduction 0 was only roughly the clip**: a DynamicsCompressorNode at ratio 1 runs its gain maths anyway, and the output was
   6 ms late. → Now exactly the clip (test 7), and so is anything under Threshold (test 3).
5. **Listen played the whole band, unreduced** (the high-pass copy), not what was being removed. → Now what it takes out,
   exactly (test 6); stage 4b puts the pile's back. **Question 1.**
6. **Listen was a 0/1 slider with option labels** (`Object.assign(P('listen', …), { options: [[0, 'Off'], [1, 'Sibilance']] })`).
   → Now this tree's TOGGLE (the visual effects' tick box). Nothing from eda6773b's `afxChoice` drop-down.
7. **Speed**: the compressor's 1 ms attack (with its 6 ms look-ahead) was fast enough; its 80 ms release (Chrome's adaptive
   release on top) would hold the band down into the vowel after an s. → Now ~4 ms. Not given a control of the pile's way: the
   compressor's release is not a one-line swap.
8. **The detector** was the compressor's own, on the high-pass band — band-limited, so not the "detector hears the whole signal"
   fault. Kept band-limited, with the extra high-pass an octave under so a loud low voice cannot reach a low Threshold.
9. Its one test was `{ item: 'TBD' }`; nine tests now.

**Kept from the pile:** the idea and its five controls (Frequency, Threshold, Reduction, Listen, Mix); Frequency's range, step
and default (3–10 kHz, 100, 6000); Threshold's (−60…0, 0.5, −30); the place (after the Compressor); three of its five tags
(sibilance, harsh s; "ess" is found by the label); the hint's sense, now the `desc`.

**Not taken:** `outside/chatgpt/fixes/690-deesser.md` (its build report), its `?v=` (19), its test, its `hint` (this tree's
panel no longer draws hints), its tags `sharp voice` (would list it for "voice" and "robot voice") and `reduce s` (any "s"
search), the Reduction-as-% (a ratio), the DynamicsCompressorNode and its 6 ms delays.

## Tests (`tests/tests.js`, `966 B45 …`, appended before the final `})();`)

Each starts with `need966b45()`, so on 85b71929 every one fails on its first line with *"there is no De-esser:
FM.audioFxRegistry has no deesser (#966 B45 is not built)"* — never a TypeError. Helpers are top-level `function` / `const`
whose names end in `966b45` (prove.sh widens the harness's lifting rule to them).

**The statistics.** An s is a sine burst (6 kHz, or 4 / 9) and the voice a 300 Hz sine, so each one's LEVEL is read by one DFT
bin (`b7Amp`) over 100 ms: every frequency is a multiple of 10 Hz, so the window holds whole cycles and the components are
exactly orthogonal (no window, no leakage); windows sit in the steady middle of a burst, where the effect is a fixed linear
filter, so the bin reads |H(f)|. The ATTACK is read per 1 ms window as output over input power: 48 samples are six whole cycles
of 6 kHz, so it is the gain whatever the phase. "Sample for sample" is `===` against `Math.fround` of the signal.

1. **The effect** — Dynamics right after the Compressor; the six keys in order; each slider's range, step, default,
   keyframable, no rebuild; Listen a toggle (not options, not keyframable, no rebuild, Off); Output, Mix; no dryLag; one-line
   description; the search words and strays; Listen and every slider leave the signature alone; the sanitiser (20000 → 10000,
   −80 → −60, a keyed Reduction clamped to 0 and 24, Listen 1 kept, junk → default, a stray key gone, a keyed Listen → Off).
2. **A loud s over a voice** — 6 kHz at −12 dBFS over 300 Hz at 0.3: the s exactly Reduction down (6, then 12; want ±0.5), the
   voice under it within 0.5 dB (0.018 by the formula), the voice before it untouched. CONTROL: the input's bins read −12.00 and
   −10.46. The pile's high-pass band (stage 4a) reads +0.5 / +1.07 dB.
3. **Under Threshold nothing changes** — stereo, an s 4 dB under (the louder channel reads 0.83 dB high, the smoothing
   overshoots 0.37): the clip, `===`, export and preview. CONTROL: 6 dB over, it moves the clip by > 0.01.
4. **Frequency moves the band** — at 4 kHz a 4 kHz s is −12 (±0.5); at 9 kHz the same s is untouched (the detector sees it
   9.0 dB down, 2 dB under a −27 Threshold) and a 9 kHz s is −12.
5. **Fast enough** — a 60 ms s rising from a −45 dBFS tone: 12 dB down (±0.5) in every 1 ms window from 5 ms in to the end;
   every window before it, and from 10 ms after it, within 0.1 dB (exact by design). CONTROL: Reduction 0 reads 0 everywhere.
6. **Listen is what it takes out** — Listen on + Listen off = the clip within 1e-6, at Mix 1 and 0.5; Listen's s is
   20·log10(Mix × depth) (−2.51 / −8.53 dB, ±0.1), its 300 Hz ≥ 20 dB under (26 by the formula), silent before the s.
   CONTROL: one sample late is > 0.01 off. The pile's Listen (stage 4b) fails on the sum.
7. **Reduction 0 and Mix 0 are the clip; Mix 0.5 is halfway** — stereo, export and preview, `===`; Mix 0.5 within 1e-6 of
   halfway. CONTROLS: Reduction 12 moves the clip by > 0.05; halfway against a copy 288 samples late is > 0.01 off.
8. **Preview = export, nothing kept** — every control moved, stereo, Listen off and on: within 1e-6, and a second export equals
   the first. CONTROL: the export is > 0.01 from the clip turned down 3 dB (Output alone).
9. **On screen (browser only)** — Listen is a `.fx-tog-row` tick box (not a slider, not buttons) that fits at 390 and 1280 px,
   clear on a new one; a tap stores 1, ticks it and leaves the signature alone; Frequency, Threshold, Reduction, Output and Mix
   are sliders with keyframe diamonds that fit. In node it can only fail on the missing DOM; it proves something in Chrome.

1e-6 for preview = export, as the Hum Remover's: the same nodes at the same values should make the same samples; if Chrome's
summing order ever differs between the two paths, measure the jitter and the fault and put the bound between them, both numbers
in the test (the tolerance-from-measurement rule).

## Questions for Ezra (by ear, on his own recordings)

1. **Listen: what it takes out, or the whole band?** Built: what it takes out (you hear only the s sounds being removed; silent
   when nothing is caught). The pile played the whole band. **Recommended: keep "what it takes out"** — if words come through,
   the settings are catching too much.
2. **The band's width is fixed** (about an octave). Want a Width control, or a second mode that cuts everything above
   Frequency (the "split" kind)? **Recommended: try it first**; add one only if his s sounds spread wider than it catches.
3. **Reduction 0–24 dB, default 6; Threshold default −30.** Gentle enough to start?
4. **Speed is fixed** (catch ~1.5 ms, let go ~4 ms). Attack / Release controls? **Recommended: no**, unless he hears it flutter.
5. **"Frequency"** as the label (the pile said "Sibilance at").
6. **Where it sits** (after the Compressor) and **a tile icon** of its own — drawn options per #545 if he wants one.

## Merge notes

- Changes: `js/audio-fx.js` (the DE-ESSER block — `DE_Q`, `DE_SMOOTH_HZ`, `DE_RMAX`, `DE_CAL`, `DE_ABS`, `DE_HOW`, `deOver`,
  `deDepth` — right after `put`; the def after the Compressor; the TAGS line after `compressor:`), `index.html`
  (`audio-fx.js?v=20` → **21**), `tests/tests.js` (appended), this folder. Nothing else: no inspector, browser or live-preview
  change (Listen is the existing tick box, its `note` the existing row note), and **`mixOutput` is untouched** (no dryLag).
- **Busters**: sibling branches built from the same base (Noise Gate, Hum Remover, Loudness Match, Auto-Wah, …) bump
  `audio-fx.js` to 21 too; at land time take the base's line and renumber above the highest (the index.html conflict rule).
- **Names shared with siblings**: `DE_ABS` is the Noise Gate's `NG_ABS` and the Auto-Wah's `WAH_RECTIFY` (the same |x| curve,
  2049 points) — keep one when they land. The louder-of-two-channels detector (splitter, three |x|, ×0.5) is the Noise Gate's
  pattern, written out again here; a shared helper is worth it once both are in. No clash with the Hum Remover's `HUM_*` /
  `humCut` or Loudness Match's `LM_*` / `lm*`.
- **Dynamics order**: gain, compressor, **deesser**, limiter, (Noise Gate after the limiter; Loudness Match's hunk is between
  the gain and the compressor, not next to this one). The catalogue test pins "right after the Compressor"; nothing else in the
  suite pins the list.
- **TAGS**: inserted after `compressor:`; the Noise Gate inserts after `limiter:` — adjacent insertions, keep both.
- **The Noise Gate's `dryLag(ctx, inst)` change** to mixOutput does not touch this effect (it declares no dryLag and has its
  own Mix, so mixOutput adds only Output).
- **Collab fingerprint**: six new registry params move it. `C.SCHEMA_FP` is left alone on purpose (pinned once at the top of
  the chain); `921 S1 the schema fingerprint gate` goes red on this branch alone until then. prove.sh prints the number.
- **The pile: drop 081ee145 when T06 lands** (`tools/design/chatgpt-tasks/pile/INVENTORY.md` T06), or there will be a second
  `deesser` def — the one that turns an s up. It takes nothing from eda6773b (afxChoice).
