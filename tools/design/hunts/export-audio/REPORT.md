# AX1: "Export has no audio" (#215 / #604 / #677), what the container can and cannot say

Base: main v17.37 (`d55cabc8`). **No app change, no fix** (the PM's rule: none unless the cause is proven; the iPhone cause is not).

## What the container has (so what "the real export" means here)
Headless Chromium 141 on Linux: `AudioEncoder`: **no AAC** (`mp4a.40.2` unsupported), Opus yes. `VideoEncoder`: **no H.264/H.265**, VP9 and VP8 yes. The app's export is H.264 + AAC only (`exporter.js:974`, `:945`, `:1375-1376`), so it cannot run unmodified here (the suite marks these tests NOT RUN HERE). To run the app's own `FM.exporter.run` anyway, I rewrite only the codec names, in the page, at the three seams: `VideoEncoder.configure` (`avc1…` → `vp09.00.10.08`), `AudioEncoder.configure` (`mp4a.40.2` → `opus`), and the `Mp4Muxer.Muxer` options (`avc` → `vp9`, `aac` → `opus`). Everything else is the real code: `buildAudioMix`, the frame loop, the muxer, the report, the ready card. Scripts: `ax1-healthy.js`, `ax1-zero-chunks.js`, `ax1drv.py` (CDP driver), in this folder.
Project: 320×240, a 3 s VP9+Opus clip with a 440 Hz tone (video with sound, imported through `FM.loadVideoFile`) and a separate 4 s 880 Hz WAV song (also imported), exported 3 s at 10 fps.

## Result 1: the healthy path (the encoder works) ships a real, audible track
`ffprobe`: video vp9 30 frames; **audio opus, 48 kHz stereo, 151 packets, 3.02 s**. `ffmpeg` decode, mono: 144,648 samples, **peak 0.314, RMS 0.175**; in windows at 0.3–0.8 s, 1.5–2.0 s and 2.2–2.8 s **both tones are present** (a 440 Hz peak and an 880 Hz peak of the same size). So the mix (a clip's own sound plus a separate song), the encode and the mux are sound on this path. The report: `audio TRACK WRITTEN`, `dropped no`, `mix peak 0.221`, ready card `hasAudio true`.

## Result 2: §1a's finding 1 (empty audio track declared, "TRACK WRITTEN") is CONFIRMED as a code defect
With an `AudioEncoder` that accepts everything and never calls `output` (what the VERIFIED test stubs; the same project):
- the file has the **audio stream declared** (`opus`, `nb_frames=N/A`) and **zero samples**: decoding it gives 0 bytes of audio;
- the app says nothing is wrong: `ready.hasAudio = true`, `FM._audioTrackDropped = null`, no toast, and the report reads **`audio      TRACK WRITTEN`, `dropped    no`**, `mix peak 0.221`.
So every witness the app has says "sound ✓" while the file is mute. That matches his #677 words. **Whether his iPhone's Safari 26 encoder ever emits zero chunks without an error is NOT proven and cannot be tested here.**

## Each §1a cause
| cause | verdict |
|---|---|
| EA-V1 / NEW-1 / EA-11a: zero AAC chunks, track still declared and reported as written | **Confirmed as a defect in the code** (result 2). **Cannot test here** whether the iPhone produces it (needs iOS and its AAC encoder). |
| EA-2 priming-trim fallback (44 ms offset at worst) | **Cannot test here** (needs the WebKit AAC priming; this container's Opus priming is different). By the VERIFIED text it can only shift the audio, never silence it. |
| EA-9 CoreMedia drops ~2112 samples with no `edts` | **Cannot test here** (Apple's reader). Not silence. |
| EA-10 quiet audio or a wrong output | **Refuted on this path**: the real mix of a clip and a song is loud (mix peak 0.221, decoded peak 0.314, RMS 0.175) and both sources are in the file. His own 0.931 peak on 10 Sep says the same for his phone. |
| Photos treats the saved file differently (the #215 ask) | **Cannot test here.** Not reachable without Photos. |

## Which fields of `fm.lastExportReport` (Settings → Your last export → Copy) tell the remaining causes apart
Today's report has: `when`, `file` (name and KB), `video` (size, fps, seconds), `audio` (TRACK WRITTEN / NO TRACK), `dropped` (no, or one of `mix-failed`, `aac-unavailable`, `encode-failed`, `all-unreadable`, `all-suppressed`, `mix-silent`), `mix peak`, `drops`, `suppressed`, `AAC encode` (present or missing), `canvas fx`, `resumed`, `protected`, `device`.
- **`dropped` ≠ `no`** names a cause on his phone by itself (the app did not even try to write sound).
- **`audio TRACK WRITTEN` with `dropped no` is the case the current paste CANNOT split**: it is printed identically for "the file really has AAC frames" (cause: Photos or the player) and "the encoder gave zero frames" (cause: Safari's encoder, result 2). `mix peak` is measured before the encode, so it prints 0.9 in both. `file` KB is only a weak hint (VBR).
- What would split them is **not in the report yet**: the AAC chunk count (and bytes) after the encode, and a decoded peak (`AudioDecoder` is already used in `aacPriming`, `exporter.js:866-893`). The VERIFIED text's direction (a line `audio TRACK WRITTEN · N AAC frames · X KB · Y.YYs` and a `decoded peak` line) is the cheapest decisive diagnostic. Until it ships, a paste with `TRACK WRITTEN` + `dropped no` + `mix peak` high leaves {zero frames, Photos} undecided. With it: 0 frames → the encoder; N > 0 and decoded peak > 0 → the file has sound and the cause is on the import side.

## Not done, on purpose
No fix, no suite test (the VERIFIED test needs a video encoder this container lacks). If wanted, the count line plus the guard is a small change with its red-first test in the VERIFIED text's shape; it is a diagnostic and a guard, not a proven fix for his phone.

DONE: AX1. On the container's codec path the real export ships a mixed, audible track (clip + song both present, peak 0.314); §1a finding 1 is a CONFIRMED code defect (zero chunks still reports TRACK WRITTEN, hasAudio true, empty declared track), whether the iPhone does it is untestable here; the report cannot separate "zero frames" from "Photos" until a chunk count and a decoded peak are added; EA-10 refuted; EA-2, EA-9 and the Photos question cannot be tested here.
