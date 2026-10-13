# #966 B11 — the Music Visualiser (hunt/fxnew-spectrum)

Backlog §B11 "Audio Spectrum (music visualiser)": bars, a line, a circle or dots that move to the project's sound. Built as ONE
generative effect, type `audiospectrum`, label **Music Visualiser**, in Generative. His #545 rule: he picks the LOOK before
anything ships — the code does not wait. Every variant the sheet shows is an option of the one effect, so his pick sets
DEFAULTS; nothing is rebuilt.

**Nothing was run** to make this branch (13 Oct: the API builder was shipping back to back) — not the suite, not node, not
`node --check`, not a browser. `prove.sh` (in the agent's scratchpad, `agents/fxnew-spectrum/`) is written and waits for a quiet
slot; `render-probe.js` (beside this file) waits for a browser slot.

## What it is

Put it on a rectangle (any shape, text, photo or clip with a picture): the bars are drawn inside **that layer's box**, so moving
and resizing the rectangle places the visualiser. A song itself has no picture (an mp3 is a 0x0 'video' layer), and the
inspector does not offer visual effects on it, so the visualiser always sits on something with a box.

| Control | Range (default) | What it does |
|---|---|---|
| Listens to | Whole soundtrack / any clip that can carry sound (Whole soundtrack) | a layer picker that lists only 'video' layers; a split clip's other halves count as the same clip |
| Style | Bars / Mirror bars / Line / Filled wave / Circle / Dots (Bars) | |
| Bands | 8–128 (32) | spaced evenly in pitch (log) |
| Lowest pitch / Highest pitch | 20–2000 Hz (40) / 500–20000 Hz (16000) | set backwards it reads the right way round |
| Sensitivity | 10–400 % (100) | a dB shift: 200 % = +6 dB |
| Treble lift | 0–100 % (50) | 0–6 dB per octave about 1 kHz — music is quieter the higher it goes |
| Rise time / Fall time | 0–500 ms (20) / 0–1000 ms (250) | the attack and release of the bars |
| Colour | From the layer / One colour / Gradient / Rainbow (From the layer) | From the layer = the bars cut out of the layer's own picture (a gradient-filled rectangle gives gradient bars) |
| Colour, Top colour | (#2fd0b5, #ff5ea8) | live only in One colour + Gradient / Gradient |
| Bar width | 10–100 % of each band's slot (70) | the rest is the gap; Bars, Mirror bars, Circle, Dots |
| Ends | Square / Rounded (Rounded) | Bars, Mirror bars, Circle, Dots |
| Line thickness | 1–40 px (6) | Line only; project px, scaled by the plate |
| Circle size | 10–90 % (40) | the hole in the middle; Circle only |
| Resting height | 1–30 % (3) | how tall a bar stands in silence (never 0, so silence never erases the layer — the queue 264 sweep) |

The bars REPLACE the layer's own picture (in From the layer they are cut out of it). Hidden, group-hidden, solo-suppressed and
muted clips are silent, as in the export.

## How the spectrum is computed — never a live analyser

An AnalyserNode answers "what is playing now": a different moment in a scrub, the preview and an export, and nothing while
paused. So the picture at time t is computed from the **decoded** sound at t (compositor.js, `#966 B11` block):

- **The same clips the exporter mixes** (`buildAudioMix`: video-type layers, the same hidden / solo gates), read through the
  exporter's own source mapping (`clipGeom` + `makeClipBuffer`: trim, static speed, ramped speed via `FM.layerSourceAdvance`,
  reverse, silence past the source), at a fractional sample with linear interpolation, channels averaged, scaled by
  `FM.layerVolume × FM.fadeMul` at the window's centre.
- **One window every 1/60 s of project time**: 2048 samples at 48 kHz (43 ms), periodic Hann, radix-2 FFT, magnitude normalised so
  a full-scale sine reads 0 dB. Each band takes the peak of the FFT bins inside it (a band narrower than a bin reads the spectrum
  at its centre), adds Sensitivity and Treble lift, and shows the 60 dB below 0 dB as 0..1. The grid is the PROJECT clock, not
  the frame rate, so a 24/30/60 fps export and a preview at any rate read the same windows; a frame between two windows is the
  straight line between them.
- **Rise and Fall are stateless**: the same one-pole follower Audio → keyframes uses (rise toward a louder value at the Rise
  constant, fall toward a quieter one at the Fall constant) is run over the windows from far enough back that its start no
  longer shows (5.55 time constants: under 1/256 of full height; at most 180 windows = 3 s), up to this frame — recomputed at
  every frame from its own time. Nothing is carried from the frame drawn before, so the same t draws the same bars after any
  scrub, in the preview and in the export.
- **Cached, never stale**: each window's spectrum (1025 floats) is kept in an LRU of 480 (eight seconds, about 2 MB) under a key
  naming every clip it hears — id, WHICH decoded buffer (a per-buffer serial), start, length, trim, reverse, speed, volume, mute,
  fades. An edit is a new key. Silence (no clip under the window, or all zeros) is one shared zero spectrum with no FFT.
- **Before the sound is decoded** it draws the RESTING bars — never the picture it drew before — and asks for the decode once,
  into the media record's own `audioBuffer` (the slot the exporter and Audio → keyframes fill; `FM.decodeAudio`), then
  `FM.requestRender()` when it lands. If ANY clip it listens to is still decoding, the whole picture rests (no partial mix).
- **The export decodes first**: `prepareCaches` (every export path awaits it) now calls `FM.audioSpectrum.prewarm(scene)`, which
  decodes every clip any enabled visualiser listens to, so a fresh session's export never starts at rest.

**Not modelled** (the bars show the clips as recorded): a clip's audio effects (EQ, reverb, pitch…), the 45 ms edge de-click, and
the export's mix limiter. See question 7.

## What a frame costs on a phone (reasoned, not measured)

- **Playing**: the grid advances 1/60 s per window, so a 30 fps preview needs about **two new FFTs a frame**. A 2048-point radix-2
  FFT is 11 × 1024 butterflies ≈ 110k flops plus 2048 interpolated reads per clip — roughly 0.2–0.5 ms in a phone's JIT, so
  ≤ 1 ms of FFT a frame. Re-running the follower over the look-back (84 windows at the default Fall, × ~680 bins of band peaks
  and 32 log10s each) is ~60k comparisons, ~0.3 ms. Drawing 32 bars is nothing next to the plate pass. **The dearest part is the
  exact alpha box** (a getImageData of the plate — 302 x 538 on his 0.28 phone plate, ~650 KB), the same price Glitter, Censor and
  Pop Art already pay, for the same reason: the bars are laid out by that box, and the fast scan's slack would put a reduced
  preview's bars somewhere other than the export's.
- **A cold seek** (a scrub to a new place): one FFT per look-back window — 86 at the default Fall time, ~25–45 ms once, then warm.
  At the slowest Fall (1 s) the look-back is capped at 180 windows.
- **Export**: the same per frame, plus the full-resolution box readback (~8 MB at 1080x1920).
- **Memory**: the spectrum cache ≤ 2 MB; the decoded sound is the exporter's own (a 3-minute stereo song at 48 kHz is ~69 MB —
  the same memory an export of that project already takes). "Whole soundtrack" decodes every clip with sound, including camera
  clips — see question 8. The tile in the effects browser plays a two-second synthetic beat (fx-thumbs `thumbSong`), not his clips.

## What the sheet shows (render-probe.js — next browser slot)

Rendered through the app's own `FM.renderScene` over `tests/_fixtures/vad/music-only.wav` on a picture-less song layer:

- **spectrum-styles.jpg** — one row per Style (plus the plain rectangle), a strip of four moments of the music each.
  Bars marked RECOMMENDED.
- **spectrum-options.jpg** — at the loudest moment: From the layer on a plain and on a gradient-filled rectangle
  (RECOMMENDED: plain), One colour, Gradient, Rainbow, Rainbow Circle, 16 / 64 / 128 bands, Bar width 100 % / 35 %, Square ends,
  Sensitivity 50 / 200 %, Treble lift 0 / 100 %, two pitch ranges, Circle size 20 / 70 %, Resting height 12 %, square Dots, and
  Fall time 0 vs 800 ms 0.15 s after the moment.
- Its summary also returns what a frame cost on that machine: cold ms and FFTs, playing ms and FFTs per frame.

## Questions for Ezra (his to answer on the sheet)

1. **Which Style should a new one open on?** Recommended: Bars.
2. **Colour default**: From the layer (recommended — the bars take the rectangle's own colour or gradient, so the existing fill
   tools style them), Gradient teal → pink, or Rainbow?
3. **The name**: "Music Visualiser" (recommended), "Sound Bars", or "Audio Spectrum"? Audio Spectrum is After Effects' own
   effect name, so it is only a search word here (#484 / #954: not a name we show). Not in either Alight Motion list in
   tools/design/954-effect-names.md.
4. Should the **layer stay visible behind the bars** (a card with bars on it)? Today the bars replace it.
5. A one-tap **"Add visualiser"** on the song's own card (makes a rectangle with this effect, listening to that song)?
6. **Peak caps** (a small marker that holds each bar's recent top and falls slowly) — the backlog's `peakhold`. Not built; it
   is one more stateless look-back. Want it?
7. Should a clip's **audio effects** (EQ, reverb) change the bars? Today they show the clip as recorded.
8. "Whole soundtrack" decodes **every** clip with sound, camera clips included — on a phone a long clip is a lot of memory. Keep,
   or make Whole soundtrack mean "music and sound clips only"?

## Tests (tests/tests.js, '966 B11 …', `{ item: '966' }`)

Every one fails on 8004fa16 by naming what is missing — `_b11k()` ("FM.audioSpectrum does not exist — the Music Visualiser is not
built") or `_986fx('audiospectrum')` ("no registry entry for audiospectrum") is asked before anything is measured. Their sounds
are plain AudioBuffer-shaped objects built in the test (sine tones at band centres), so they run in the node soft-canvas harness.

1. in the effects list: Generative, routed, found by visualiser / audio spectrum, described, defaults in range, the six Styles, the
   Listens to picker (first, Whole soundtrack, sound-only, no "Needs a setting" badge), Top colour live only in Gradient, Line
   thickness in px;
2. silence: every band 0, every bar a 1–5 px stub, nothing above; no sound at all draws the same bytes (CONTROL: a loud tone);
3. a pure tone at 1 kHz and at 4 kHz stands its own band up (level > 0.6, bar > 55 px) and leaves bands ≥ 3 away at rest;
4. louder is taller (three amplitudes → rising levels and bars), and Sensitivity 400 % lifts the quiet one;
5. the same instant draws the same bytes after other moments, and cold vs played-up-to (CONTROL: Fall is really acting at that
   moment, and Fall 0 is at rest); a repeated frame costs 0 FFTs, the next one ≤ 3;
6. before its sound is decoded: levels() says null, the picture is the resting one (also with a second, decoded clip — no partial
   mix), the decode is asked for once, and when it lands the picture is the sound's again;
7. Listens to: whole / one clip / the other half of a split clip; muted, hidden, solo-suppressed are silent (CONTROL: a clip not of
   the split's lineage);
8. a reduced preview plate (0.5, 0.28) draws every bar's top within 1.5 plate px of the export's (CONTROL: another moment's bars
   are caught), and Line thickness shrinks with the plate (CONTROL: an unscaled thickness is caught) — **the 1.5 px tolerance is
   reasoned (a row of rounding each side plus the box's anti-aliased edge), not measured**; prove.sh prints the tops;
9. the export: `FM.exporter.prepareCaches` decodes the clip, the exported frame stands the bar up and equals the preview at the
   same moment byte for byte (CONTROL: a fresh session without the pre-flight draws resting bars);
10. every Style draws its own picture inside the box, and the Colour modes colour it as named.

## What prove.sh checks (written, not run)

`agents/fxnew-spectrum/prove.sh` — refuses to start while `/home/ezra/FreeMotion/.ship-in-progress` exists and re-checks between
stages; everything at `nice -n 19`; results in `prove-result.txt`.

1. `node --check` on every changed js (from `git archive HEAD`), tests.js parses, the probe parses as an async function body;
2. the ten tests: on 8004fa16's js all FAIL naming the seam / entry (never a TypeError); on the tip all PASS — through
   `runs.js`, a MARKED copy of `fx-c/runc.js` that also loads `js/exporter.js` (test 9 drives `prepareCaches`);
3. the three NEW-row tests this branch edited — same verdicts on each tree with its own tests file, plus the tip's tests on the
   base js;
4. the neighbour generator tests ('482 11.'), E1 and 1116 — same verdicts on both trees;
5. the whole-catalogue sweeps '784' and '(queue 264)' — same verdicts on both trees (the tip's include the visualiser);
6. the collab fingerprint (`fx-all2/fp.js subset`): control fx-land (1856346714373782, match true), base (must match), tip
   (EXPECTED to move — see merge notes);
7. `treecheck.py 8004fa16 HEAD` and `drops.py`.

## Merge notes

- **Busters** (above 8004fa16's): compositor.js 219 → 220, fx-registry.js 27.32 → 27.33, fx-thumbs.js 55 → 56,
  inspector.js 418 → 419, exporter.js 128 → 129. Every other §B branch bumps the same lines — take the highest and bump once more.
- **C.SCHEMA_FP left alone**: the new registry params move the collab fingerprint (as every §B effect does); the integrator
  sets it once for all of them.
- **The NEW row is newest first**, and this effect is in it (CATEGORY_OF, batch 42 line after E1's). Three existing tests changed
  to match, the same way hunt/fxnew-echo changed them:
  - 'E1 the six new effects …' — the six must be one run in order with only §B's effects after them; the allowed list here is
    `['audiospectrum']` → when merged with fxnew-echo use the union (`timeecho`, `starglow`, `audiospectrum`, …);
  - '745: the featured carousel …' — pixelsort leaves the row; the checked batch-38 ids are compoundblur and matchgrade (echo
    made the same change for its two);
  - '913.8 Snow & Rain …' — leads with `audiospectrum`, weather at index ≤ 7. **Merged with echo, the newest batch line in
    CATEGORY_OF decides feat[0], and weather moves one place further per effect** — recount both numbers on the merged tree.
- compositor.js: the block sits between Pop Art and `FM._FX_TABLES`, the same place fxnew-echo inserted its block — keep both.
  The exact-bbox line in drawCanvasEffect gains `|| fx.type === 'audiospectrum'`.
- fx-registry.js `paramsOf`: two general, opt-in fields — `layerAudio` → the picker's `audio: true`, and `color2Gate` → the second
  colour's overriddenBy/liveWhen. Both are set only where declared, so every other effect's param objects are unchanged.
- inspector.js: the layer picker skips non-'video' layers when `p.audio` is set (one line).
- exporter.js `prepareCaches`: step (c), the visualiser pre-flight, after the audio-drive envelopes.
- fx-thumbs.js: `thumbSong()` (a synthetic two-second beat on '_fxthumbSong', pinned) + the `audiospectrum` OVERRIDE +
  `SUBJECT_OF.audiospectrum = 'card'`.

## Unsure

- None of it has been executed. The FFT, the follower and the drawing are written to be soft-canvas-safe (fills only; arcs, not
  roundRect; no stroke, no ctx.filter), but the first run may still find a slip.
- The plate test's 1.5 px tolerance and the bar-height thresholds in tests 2–4 are reasoned from the arithmetic above, not
  measured. A tone's abrupt start at 0 s splatters every band in the first windows; by 1 s it has fallen by e^-4 at the default
  Fall — the far-band threshold (0.02) relies on that.
- Whether `js/exporter.js` loads cleanly in the node vm (test 9 there); in Chrome it is loaded by the page.
- Other whole-catalogue sweeps in the suite (beyond 784 / 264) will include the effect; they have not been read one by one.
- Looking at his own layer in the effects browser (the "this changes nothing" probe, preset previews) can start the decode of his
  songs — the same decode an export does, cached on the record.
