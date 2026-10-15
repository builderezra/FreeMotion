# #966 B24 Reduce Noise — ported from the ChatGPT pile (refers to #545)

Branch `hunt/pile-reducenoise`, built on `hunt/fxnew-drums` **85b71929**. Written 15 Oct while a release ship was running,
so **nothing was run** — not node, not Chrome, not `node --check`. The proof is
`scratchpad/agents/pile-reducenoise/prove.sh` (written, not run); then the browser tests in Chrome at 900 and 380.

**The pile commit this replaces: `d59b8cfd` "Add on-device Reduce Noise audio tool" (T05, first of its two). DROP `d59b8cfd`
when this lands.** T05's other commit (Auto-duck music under speech, B25) is not ported here.

## Where it came from, and his part in it

- The backlog (tools/design/plans/2026-09-29-idle-backlog/backlog.md:1208): *"B24. Reduce Noise. Audio clip tool, L. amount
  0–1 (0.6), reduction 0–30 dB (12), sensitivity 0–1 (0.5), keep-voice toggle, "Listen to removed noise". How: an offline STFT
  spectral gate, with the profile taken from `FM.detectSpeech` non-speech frames. Output is a switchable WAV twin clip, like
  Remove vocals."*
- **The offer to him** (tools/design/plans/2026-09-29-idle-backlog/for-ezra.md:40, the page written for him on 29 Sep):
  *"Also on the list if any grab you: music visualiser bars, floating bokeh lights, skin smoothing, an iris wipe, 8-bit game
  sounds, drum hits, background noise removal, colour wheels."*
- LAND-LIST §3 Q6: *"Audio clean-up tools in the Volume panel: Reduce Noise and Auto-duck music under speech.
  **Recommended: yes to Reduce Noise first** (it was offered to you as background-noise removal); Auto-duck after it."*
- **His answer is not recorded.** `git show ssh/main:REQUESTS.md | grep -i "noise reduction|reduce noise|background noise|denoise|hiss"`
  finds only Temporal Denoise (video) entries; nothing in his words asks for audio noise removal. So this is built ahead of
  his yes, like the rest of §B, and per #545 he hears it before it ships.
- **Twin check:** no audio noise reducer on 85b71929 (`git grep -i "denois|reduceNoise|noise reduction|spectral gate"` on
  js/*.js finds only the VIDEO Temporal Denoise). The pile's Noise Gate (T06 `c63db8ef`) is a level gate, a different thing.

## What was ported

The tool itself, as the backlog and the pile have it: a Volume-card button **Reduce noise…** that opens Amount, Reduction (dB),
Sensitivity and Keep voice, **Listen to removed noise** and **Apply**; an offline STFT spectral gate whose noise profile comes
from the frames `FM.detectSpeech` leaves outside speech; a cleaned WAV copy that plays instead of the clip, made the way Remove
vocals makes its no-vocals track (`FM.loadVideoFile` → `FM.addMediaLayer`, the clip muted, its clock and mix copied), and
pressed again it puts the original back. Kept from the pile: the WAV twin, restoring the clip's own mute state
(`twinSourceWasMuted`), `FM.layerAudioBuffer` exported from audio-tools.js, making the sound context inside the tap for iOS,
the project-switch and deleted-clip guards.

Files: `js/noise-reduction.js` (new, 572 lines, about half of it comments), `js/audio-tools.js` (the shared link, below), `js/inspector.js` (the card),
`styles.css` (four rules), `index.html` (busters + the new script tag), `tests/tests.js` (12 tests).

## What was wrong in d59b8cfd, and what it is now

1. **"Reduction 12 dB" took about 4 dB off.** Its gate was `raw = mag > threshold ? 1 : max(floor, mag / threshold)` with the
   threshold at 2.5x the profile — a 1:1 expander that only reaches the floor for noise far under the profile, so ordinary
   noise was turned down ~8 dB at Amount 1 and ~4 dB at the default 0.6, whatever Reduction said. Its own probe shows it:
   *"measured a learned 192 Hz hum at 0.745 of its source amplitude"* (−2.6 dB at Reduction 24). **Now** a bin under the
   threshold falls over a 6 dB knee to exactly −Reduction dB, and Amount scales the dB: the noise in the pauses drops by
   Amount × Reduction.
2. **Musical noise.** The decision was per bin and per frame on the raw magnitude, and the gain jumped with it — the residue
   warbles. **Now** the decision reads a neighbourhood (5 bins × 3 frames, one frame of look-ahead), the gain moves with a
   5 ms attack and a 60 ms release, and is smoothed across 3 bins. A test measures the steadiness (`spread966b24`).
3. **Stereo image wander.** Each channel was gated on its own, so the noise leaned towards whichever side was talking.
   **Now linked**: one gain per bin from the channels' mean power serves every channel (two real channels share one complex
   transform, exact because the gain is real and the same for both). A centred sound stays centred.
4. **Keep voice barely reduced anything while someone talked** — it held every frequency at −2.5 dB at most (gain ≥ 0.75)
   during speech. **Now** it protects only the voice band (80 Hz – 8 kHz) and only down to −6 dB; above the band and in the
   pauses the full reduction applies.
5. **Reduction 0 went through the transform.** **Now** Reduction 0 or Amount 0 copies the clip, sample for sample. The
   transform itself is exact too: periodic Hann, hop N/4, the window applied twice and divided by 1.5 (its square summed over
   four hops is exactly 1.5 at every sample), float64 — within 1e-6 of the clip with nothing to remove (tested).
6. **No speech / all speech / no detector** were silent or fatal: no pauses → it used the quietest fifth without saying; a
   detector that threw failed the whole job. **Now**: no speech found → the whole clip is the profile ('no-speech'); too
   few pauses (all speech, or under ~0.2 s of them) or no detector → the quietest tenth of the clip ('quietest'); the
   pauses' loudest quarter is left out so a soft word the detector missed does not become "noise". He is told which in the
   toast after Apply.
7. **Two minutes, mono or stereo only, and the whole clip transformed to audition ten seconds.** **Now** any channel count,
   files up to **five minutes** (the clip, the result and the WAV are in a phone's memory at once), work done 128 frames
   at a time with a pause for the page, a progress toast he can **tap to stop** (the Apply button reads "Stop (42%)" too),
   and Listen transforms only the ten seconds it plays (half a second earlier on the same frame grid, so it is exactly what
   Apply would remove — tested to 1e-3).
8. **The twin was a second link (`noiseReducedOf`) that nothing else knew.** Split, duplicate, import, the history's retime
   sync and the magnetic timeline all carry `karaokeOf` and nothing else, so its copy went out of sync on a Speed change and
   pointed at the wrong clip after a duplicate — the "karaoke hardening" LAND-LIST asks T05's twins to have. **Now the copy
   rides on `karaokeOf` itself, tagged `twinKind: 'denoise'`**, so every one of those places carries it with no second list
   to drift (tested on the Speed change).
9. **Apply was two undo steps** — `addMediaLayer` commits on its own, so the first undo left the copy playing over the
   unmuted clip. **Now** the add is held (`FM.history.mute`) and Apply is one step; Restore too (`deleteLayer` commits on
   its own as well).
10. **The detector ran twice** (Listen, then Apply) and could disagree with itself. **Now** the speech found in a file is kept
    on its media record for that file, and only a real answer is kept (the Loudness Match port's null-cache rule).
11. Smaller: inline styles → CSS classes on the app's tokens; a non-finite setting fell to 0 (nothing done) → falls to its
    default; the clip stays selected after Apply (the pile selected the invisible copy).

## The twin clip and its storage

- The cleaned sound is a 16-bit WAV of the **whole file** (so trim, speed and reverse map exactly as the clip's), added through
  `FM.loadVideoFile` + `FM.addMediaLayer` — stored in IndexedDB like any imported clip and like Remove vocals' track. **His
  media is never written:** the clip's record, file and decoded buffer are only read (tested: same object, same file, same
  samples).
- The copy: `karaokeOf: <clip id>`, `twinKind: 'denoise'`, `denoise: {amount, reduction, sensitivity, keepVoice}` (what was
  applied), `twinSourceWasMuted`, the clip's start / duration / trim / reverse / speed / volume / fades / audio effects,
  opacity 0, hidden if the clip is. The clip is muted. The export plays the copy because it is an ordinary unmuted clip and
  the original is muted (tested through `FM.exporter.buildAudioMix`).
- **One audio copy per clip:** Remove vocals and Reduce noise refuse each other while one is on (a toast says which to turn
  off), and neither toggle claims the other's track.
- Memory: like Remove vocals, nothing decoded is kept (a buffer the export already cached is reused).

## Old projects

Unchanged. A track with `karaokeOf` and no `twinKind` is a no-vocals track exactly as before (`FM.karaokeTwinOf`,
`FM.karaokeState` and Remove vocals' restore only skip `twinKind === 'denoise'`; tested). No sanitiser or schema change: the
three new fields are plain values on the copy only, and nothing reads them unless `twinKind` is `'denoise'`. A junk
`twinKind` from an imported file just makes that track an ordinary no-vocals track.

## Tests — 12, appended after `// ── end 966 B22 ──` (`'966 B24 …'`, `{ item: '966' }`)

Each test's first line is `nr966b24()`, which on 85b71929 throws **"there is no Reduce Noise: FM.noiseReduction and
FM.reduceNoiseBuffer are missing (#966 B24)"** — the missing tool by name, never a TypeError. Fixture and statistics are
explained at the top of the block (tones for the voice, measured by quadrature projection; white noise for the noise,
measured by RMS in the pauses and by Welch band power under the voice). Every bound is reasoned, none measured.

| Test | What it pins | Why that statistic |
|---|---|---|
| at Reduction 0 or Amount 0 … | the copy is the clip sample for sample; with a silent profile the transform gives the clip back within 1e-6; the clip is only read | exactness is the claim, so compare samples |
| the noise in the pauses drops … | pauses −12 ± 1.5 dB (Amount 0.5: −6; Reduction 24: 21–26); tones within 1 dB; under the voice 3–7 and 10–14 kHz −12 ± 1.5; gain spread in a pause under 2.5 dB | RMS where the signal IS noise; tone amplitude for the voice; band power away from the tones; spread of the per-cell gain for musical noise |
| Keep voice … | under the voice 3–7 kHz −6 ± 1.5 (on) vs −12 (off); 10–14 kHz and pauses the full −12 | the cap is the floor in the band |
| Listen to removed noise … | removed + cleaned = clip within 1e-6; removed in a pause −2.5 dB; under 12 % of a tone; a ten-second stretch equals the whole run within 1e-3 | arithmetic identity; 1 − 10^(−12/20) |
| no speech found … | 'no-speech' and −12; all speech and no detector: 'quietest' and −12, tones within 1 dB; all speech + Keep voice: 3–7 kHz −6 (as documented) | the info field is what he is told |
| stereo is linked … | the right's 700–800 Hz is ≥ 8 dB louder while the left talks (reasoned +12; unlinked ~0), with a control; a centred sound comes back centred within 1e-6 | the gate opening on the silent side is what linking means |
| a long clip … | progress rises to exactly 1 (4 reports); Stop rejects with AbortError and no further report; MAX_SECS 300 | |
| the speech found in a file is kept … | a failed search is not kept, the next press asks again, a found answer is reused, another file searches afresh, two presses share one search | counts of detector calls |
| the cleaned copy rides on the Remove vocals link … | states for both kinds of copy; a Speed change moves the copy in the same step; an old no-vocals track is unchanged | |
| in the Volume card … (browser) | the button, the three sliders at 0.60 / 12 / 0.50, Keep voice ticked, Listen and Apply, buttons ≥ 32 px, nothing wider than the card, stays open on redraw | run at 380 too |
| Apply makes a cleaned copy … (browser) | the WAV equals the cleaned sound within 2/32768; linked copy, clip muted; ONE undo step and redo; media untouched; Remove vocals waits; Restore in one step, unmuted | |
| the export plays the cleaned copy … (browser) | the mix's pauses −12 ± 1.5 under the mix after Restore, with a control | the export's own mixer, the WAV decoded as an export does |

The three browser tests need the app (inspector, app.js, exporter.js) and fail in node on the harness — not on the missing
tool. They are owed a Chrome run at 900 and 380.

## Questions for Ezra (each with a recommendation)

1. **Do you want it?** LAND-LIST §3 Q6 has not been answered. *Recommended: yes* — it was offered to you as background-noise
   removal, and this one now does what its Reduction slider says.
2. **Hear it on your own voice first** (#545). The tests prove the arithmetic on tones and white noise, not how it sounds on a
   real recording with room tone, hum or wind. *Recommended:* one before / after on a clip of yours, sent as audio, before it
   ships.
3. **Five minutes is the longest file.** Longer ones are refused with the length in the message. *Recommended: keep* (a phone
   holds the clip, the result and its WAV at once); a chunked writer could lift it later.
4. **Keep voice on by default** (the pile's choice, kept): voice-band noise under speech is cut 6 dB instead of the full 12,
   so soft consonants survive. *Recommended: keep on.*
5. **One of Remove vocals / Reduce noise per clip.** *Recommended: fine* — one is for voices, the other for songs.

## Merge notes

- **Busters** (this tree's +1, never the pile's): `audio-tools.js` 8 → 9, `inspector.js` 422 → 423, `styles.css` 763 → 764,
  new `<script src="js/noise-reduction.js?v=1">` right after audio-tools.js. **pile-loudness also takes inspector.js
  422 → 423** — on merging both, take the base's line and +1 per release, never either side's number.
- **tests/tests.js**: one block between `// ── end 966 B22 ──` and `// ── end 966 B24 ──`; rebuild by blocks, never a union merge.
- **js/audio-tools.js**: `karaokeTwinOf`, `karaokeState` and `toggleKaraoke` (a guard at the top, and restore's sweep) now skip
  `twinKind === 'denoise'`; any other branch touching those lines must keep that.
- **sw.js**: nothing — it caches scripts as they are fetched; there is no list to add the new file to.
- No POLISH-LOG line, no version label: this is a branch, not a release.
- The prove script: `scratchpad/agents/pile-reducenoise/prove.sh` (node harness widened to lift the `…966b24` helpers and to
  load audio-tools.js and noise-reduction.js); its stage 4 puts back two of the pile's faults (the 1:1 gate law, the
  all-band Keep voice) and expects their tests to fail.

## Unsure

- Every number in the tests is reasoned, not measured. The partial-opening cost (reasoned ~0.5 dB at Reduction 12, ~1.2 at
  24) is the softest; if a bound misses, measure and set it from the measurement, writing both numbers in.
- The card was never seen at 380. `rangeRow` rows inside a padded box should fit (the test checks), but it needs a look.
- Listen plays the removed noise raw (not through the clip's volume or effects), as the pile did.
