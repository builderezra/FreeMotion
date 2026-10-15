# #966 B43 — Loudness Match, ported from the ChatGPT pile (288c20fc)

Branch `hunt/pile-loudness`, built on `hunt/fxnew-drums` 85b71929. Refers to #545 (he hears it and picks the labels before it
ships). **WRITTEN WITHOUT RUNNING ANYTHING** — on 15 Oct a release ship was running, so not even `node --check` ran. Every
number in the tests is reasoned from the maths it names. The proof is
`scratchpad/agents/pile-loudness/prove.sh` (written, not run): run it in a quiet slot, then the two browser tests in Chrome.

**When this lands, DROP 288c20fc (T06) from the pile.** Nothing else from that commit is wanted.

## What it is

A Dynamics effect, right after Gain / Boost (the other level control). It turns a clip up or down to a **Target** loudness:
−23 LUFS (TV, EBU R128), −16 (podcasts), −14 (YouTube, Spotify) or −9 (loud). **Peak guard** (on to start) turns the match
down if it would push the clip's loudest sample over **Peak ceiling** (−6…0 dB, −1 to start). Then Output and Mix from the
shared wrapper, as on every effect. Found by loudness, lufs, normalise / normalize, match volume, same volume, r128,
streaming, youtube, spotify (not "broadcast": that is the Radio voice's word).

The line under Target says what it is doing to this clip, in plain words:
- measured — "It measures −18.4 LUFS, its loudest sample at −6.0 dB: +2.4 dB brings it to −16.0 LUFS."
- guard holding — "… It needs +11.0 dB to reach −9.0 LUFS, but Peak guard holds it to +5.0 dB, so it reaches −15.0 LUFS."
- measuring, too big to measure before the export, no sound, could not be read, nothing over −70 LUFS — each says it plays
  at its own level and why.

## What was taken from the pile, and what changed

Taken: the four targets, the guard and its ceiling, the K-weighting coefficients (libebur128's bilinear forms — correct),
the 400 ms / 100 ms blocks, the two gates, the short-clip rule, the 24 kHz preview decode and its 64 MB file cap, the
hard clip at the ceiling while the guard is on, the export waiting for the measurement.

Changed:
1. **THE FIX — the null cache** (LAND-LIST: "the Loudness Match null cache"). Whenever there was nothing to measure — a
   file over 64 MB, a clip over 3 minutes with nothing decoded yet, a decode that returned null — the pile stored
   `{ lufs: null, peak: 0 }` (a truthy object) under that file and range, and every later call returned it. The clip was
   never measured again, not even after an export had decoded `media.audioBuffer`, the very buffer it needed. It played at
   its own level for the rest of the session and nothing said why. Now **only a real measurement is kept**. A decode in
   flight is kept as a promise (two callers share it) and dropped when it settles; one that fails leaves nothing behind, so
   the next build, export or open panel asks again. `last` only words the panel's line; it never stops a retry (except that
   the panel itself does not re-decode a file that just failed on every redraw — a build or an export does).
2. **Per file, then per range.** The pile measured per file AND range, decoding the file again for every new trim (and a
   trim drag is many). Here the file is K-weighted once into a *profile*: the weighted energy and sample peak of every 10 ms
   slice (12 bytes a slice; 1.4 MB for twenty minutes). A clip's loudness is then 40-slice sums over the slices its trim
   plays. So a trim, a speed change, a second clip of the same file: no decode, no filtering, exact, every frame.
3. **The live preview reads the measurement every frame** instead of the pile's hook in audio-fx-live.js that forced a
   rebuild (and a restart of the reversed voice) when it landed. The gain's setters run in applyAt, so the clip glides to the
   matched level over 50 ms on the frame the measurement lands — forward and reversed alike, no rebuild, no cut. The build
   starts the measurement; so does opening the panel. audio-fx-live.js is untouched.
4. **A mono clip is measured as it is heard** — on both speakers. BS.1770 measures the channels it is handed, so a mono file
   reads as one channel; but in this app it plays on two (the export is stereo; the speakers up-mix the preview), which reads
   3.01 LU louder. The pile measured one channel, so **a mono voice-over landed 3 dB over every Target**. Now the clip's
   measurement counts a mono file twice (dual mono). The bare meter (`FM.loudness.measure`) stays plain BS.1770.
5. **The gates are strictly "above"** (BS.1770: blocks with loudness > −70 LUFS, then > the relative gate); the pile kept
   blocks lying exactly on a gate (≥). Unobservable on real sound, but it is the Recommendation's rule.
6. **The peak reads every channel.** The pile skipped the LFE channel for the peak along with the loudness, so a 5.1 file's
   LFE could go over the ceiling.
7. **No 10-minute cap on a decoded buffer.** The pile refused to scan more than 10 minutes "on the UI thread" and returned
   null (which it then cached). The scan here runs 2^18 frames at a time with a pause between, so any length is fine.
8. **The preview decode's length cap is the FILE's length** (5 minutes), not the clip's: the decode holds the whole file, so a
   3-second clip of a 40-minute file must not decode 40 minutes. The pile capped the clip's duration (180 s).
9. **Target stores the LUFS number itself** (−23 / −16 / −14 / −9), not an index 0–3, through this tree's CHOICE helper; Peak
   guard is a TOGGLE. No afxChoice drop-down (eda6773b's) came in.
10. Output and Mix come from mixOutput like every effect; the pile had neither.

## The BS.1770 check

The meter is ITU-R BS.1770-5 integrated loudness: K weighting (+4 dB shelf, then the RLB high-pass), mean square per channel,
channels summed with weights 1 (L, R, C) and 1.41 (surrounds), LFE out; 400 ms blocks every 100 ms; absolute gate −70 LUFS;
relative gate −10 LU under the mean of what passed; loudness = −0.691 + 10 log10(mean). A 997 Hz sine at 0 dBFS on one
channel reads −3.01 LUFS. The suite checks it against **its own meter written from the Recommendation's published 48 kHz
coefficient table** (not the app's derivation of it) — sine, stereo sum, gated pink noise with a quiet stretch (relative gate)
and digital silence (absolute gate), a too-quiet clip (null), a clip shorter than one block.

## Where the measurement lives, and when it is thrown away

- On the media record, `media._loud = { src, prof, pending, last, memo }`, for the file the record holds (`media.file`, or
  the decoded buffer for a record with no file). **A different file** (a relink, a replaced clip) starts a fresh store.
- `prof` is per file (the profile). The clip's range is worked out from it on demand: `trimStart` to `trimStart +
  FM.layerSourceAdvance(duration)` — the export's own window; a reversed clip plays the same samples; a ramped speed is
  integrated by layerSourceAdvance. `memo` caches the last range's answer and is redone when the range or profile moves.
- Where the sound comes from: the record's decoded buffer if there is one (the export, a reversed clip and Audio →
  keyframes decode it at full rate), else a 24 kHz decode of its own, only for a file ≤ 64 MB that runs ≤ 5 minutes.
  The first to measure wins for the session, so the preview and the export use the same measurement.
- Never kept: an empty result (THE FIX). The export always has the decoded buffer, so it always measures.

## What it does before it is measured

Passes the clip untouched (× 1 exactly, the guard's path shut — tested ===, sample for sample) and says why under Target.
The export waits for the measurement (one `await` in exporter.js before the chain is built), so a file is always matched in
the export, and after an export the preview has that measurement too.

## Peak guard

A **sample-peak** guard, as in the pile — not a true (between-samples) peak. It caps the GAIN so the clip's measured loudest
sample lands on the ceiling (tested: the output is the clip times one number, to 1e-6, peaking at the ceiling). While it is
on, a hard clip at the ceiling catches what the measurement cannot see (an effect above it in the stack that adds level; a
preview measured at 24 kHz). The most it lifts is +36 dB (× 64, the pile's limit).

## Files

- `js/audio-fx.js` (?v=20 → 21): the entry after Gain / Boost, its tags, the LOUDNESS MATCH block before the registry,
  and `layer` passed through `def.build` (buildAudioFxChain) and the mixOutput wrapper — no other build takes a third
  argument, so no other effect can hear it.
- `js/exporter.js` (?v=129 → 130): the export measures before it builds the chain.
- `js/inspector.js` (?v=422 → 423): a `readout` may also declare `readoutWatch`, so its line is re-read when the effect says
  so (the measurement landing); the line drops itself once its row is gone.
- `tests/tests.js`: ten '966 B43' tests.

## The tests (each fails on 85b71929 on its first line: "there is no Loudness Match …")

1. catalogue — place, rows, CHOICE stores numbers, toggle, ceiling live only with the guard, tags, defaults, no rebuild,
   the sanitiser.
2. the meter is BS.1770 — −23.01 for −20 dBFS, −3.01 for 0 dBFS, +3.01 for both channels, gated pink noise against the
   tests' own ITU-table meter (CONTROL: the gates move it > 1 LU), null under −70, a short blip, a mono clip measured as
   heard.
3. it lands on each Target (±0.2 LU, guard off), turns a loud clip down, lifts +36 dB at most and says so.
4. Peak guard is a gain, not a limiter — peak on the ceiling, the clip × one number, under the Target, says so (CONTROL:
   guard off peaks > 1.5).
5. **THE FIX** — a decode that fails once is tried again and measures; a too-big file is measured once the export decoded
   it; two calls share one decode. CONTROL: the pile's own caching (pile966b43) on the same stubs keeps its null.
6. untouched until measured, export and preview, with the reason under Target for four cases (CONTROL: once measured the
   clip changes).
7. a trim is measured over what it plays; speed 2; one decode for everything; a different file decodes again.
8. preview = export to 1e-6, guard on (holding, clip path in) and off, stereo; a second export is the first.
9. (browser) the panel at 390 and 1280: four buttons fit, −16 lit, the line comes to say what the song measures, −9 stores
   −9 without a rebuild, clearing Peak guard greys out Peak ceiling.
10. (browser) the real export (FM.exporter.buildAudioMix) of a never-measured song lands on −16 (CONTROL: the song alone is
    > 3 LU away).

prove.sh's stage 4 puts the pile's null caching back into the app (two lines) and expects test 5 to fail saying "the empty
result was kept".

## For Ezra (#545)

1. **The Target buttons.** Now "−23 LUFS · −16 LUFS · −14 LUFS · −9 LUFS" with a note under them ("−23 TV · −16 podcasts ·
   −14 YouTube and Spotify · −9 loud"). Would words read better on the buttons ("TV", "Podcast", "YouTube", "Loud")? Draw
   both and let him pick.
2. **The start value**: −16 (the pile's). −14 is what YouTube and Spotify play at, which may suit his videos better.
3. **Volume after the match.** The match measures the clip's own sound; the clip's Volume and fades (and its other effects)
   still change the level from there — so Volume 50 % puts it 6 dB under the Target. Is that what he wants, or should
   Loudness Match ignore Volume (match what is heard)? The hint says so plainly either way.
4. **Long files in the preview.** A file over 64 MB or 5 minutes is not measured until it is exported (memory on a phone);
   the line says so. Worth a picture of that line.
5. A listen, as with every audio effect.

## Merge notes

- **Names shared with the Noise Gate (hunt/pile-noisegate) and Auto-Wah (hunt/pile-autowah) branches**, all on 85b71929:
  - `index.html`: all three take `js/audio-fx.js?v=20 → 21`. On landing, one bump above the highest.
  - `mixOutput`: the Noise Gate changes the `dryLag` line inside it; this branch changes the `d.build = function (ctx,
    inst, layer)` wrapper line under it. Different lines.
  - `TAGS`: the Noise Gate adds `noisegate:` after `limiter:`; this adds `loudnessmatch:` after `gain:` (two lines apart).
  - DEFS: the Noise Gate goes after the Limiter, this after Gain / Boost; the Auto-Wah is in Character.
  - helper blocks: the Noise Gate's sits just before `/* ---- Dynamics ---- */`, this one just before
    `/* ---- registry ---- */`; the Auto-Wah changes shop/lfo/arm near the top.
  - `tests/tests.js`: all three append before the final `})();` — **rebuild by blocks** ('966 B42', '966 B48', '966 B43'),
    never a union merge. Helper names are suffixed …966b42 / …966b48 / …966b43, so none collide.
- `js/exporter.js` and `js/inspector.js` are only touched here among the three; check the busters against anything else
  landing with them.
- The collab schema fingerprint moves (five new registry params). `C.SCHEMA_FP` is left alone, as on the other two: pin it
  once, at the top of the chain.
- `FM.loudness` is a new name (prepare, state, gainOf, uses, measure). Nothing else in the tree uses it.
