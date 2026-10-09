# AU6: audit of js/exporter.js on main v17.31 (1,809 lines)

Against `origin/main` 7125ecff. Branch `hunt/audit-exporter`. **Measured** = I ran it here (headless Chromium, the suite's own driver, 1280 and 380), **Read** = I read the code and did not run it, **Guess** = I did not check.

## What this container can and cannot run (said plainly first)

Measured here: `VideoEncoder` supports VP9, VP8 and AV1 and **not** H.264 (`avc1.*`) or HEVC; `AudioEncoder` supports **Opus and not AAC** (`mp4a.40.2`). So on a stock encoder:

- **`run()` (the MP4 path) cannot finish here**: `pickVideoCodec` throws `NO_VIDEO_CODEC` (only avc candidates), and the AAC probe drops the sound.
- **Not run, anywhere in this audit:** a real H.264 render; a real AAC soundtrack and the AAC warm-up trim on a real AAC stream (`aacPriming` and `dropPriming`: Read only); `encodeM4A` beyond its "AAC unavailable" answer; the OS share sheet in `deliver`; crash-resume after a real reload (the store is exercised in-page only); playing any file this produced.
- **What I did instead, and it is a stand-in, not the real thing:** two tests put a **spy in front of `VideoEncoder` / `AudioEncoder`** that hands the export a codec this browser CAN encode (VP9, Opus) under the name the exporter asks for. Everything else in `run()` (the frame loop, the muxer, the sink, the card, the cleanup) is the real code, and on this container it runs to the end (20 frames, a 1.4 KB file) and takes the Cancel and error exits. The output is a VP9 stream in an MP4 box: it proves the control flow and the cleanup, **not** that the file plays, and not that H.264 behaves the same.
- **Run for real, no spy:** `runGif` and `runFrames` (frame count, names, cancel, mid-run throw, flags), the pure functions, `buildAudioMix`.

## Fixed: red on main, green with the fix (1280 and 380), seven mutations CAUGHT

| # | Where | What happens | Repro test | Fix |
|---|---|---|---|---|
| AU6-1 | `run()`, the frame loop and its `finally` | **An MP4 export that fails part-way leaves its video encoder configured.** The encoder is a `const` inside the `try`, and only the two Cancel branches (`if (FM._exportCancel) { encoder.close(); … }`) close it, so any other throw (a layer that will not draw, the muxer refusing a chunk, the encoder erroring) leaves a live hardware encoder until the page goes. Measured with the spy: render fails on frame 6, `run()` rejects, `encoder.state` is `configured` (a Cancel gives `closed`). The next try then builds a second one; phones allow few at once. The frame handed to `encode()` is also never closed when `encode()` throws. | `AU6-1` (controls: a clean export is 20 frames and closes its encoder; a Cancel closes it) | the encoder is hoisted next to `recorder` and closed in the `finally` (guarded on `state`); `frame.close()` moves into a `finally` around `encode` |
| AU6-2 | `encodeAudio` and `aacPriming` | **The same leak on the soundtrack side.** A throw between `new AudioEncoder` and the flush (a bad `AudioData`, the codec closing under it) leaves the encoder configured, and the `AudioData` in hand is not closed; the export then drops its sound and carries on with the encoder held. The warm-up probe (`aacPriming`, run once per sample rate) has the same shape for its encoder and decoder: any throw before its closes is swallowed by `catch → return 0` with both still open. | `AU6-2` (control: a clean encode closes its encoder; the probe case checks the soundtrack still encodes when the probe fails) | both closed in a `finally`; the `AudioData` closed in a `finally` around `encode` |

Mutations (all CAUGHT, `au6_mut.log`): encoder not closed in the `finally` (A1), frame not closed on a throw (A2; my first A2 was a syntax error, which every test "catches", so it was rewritten and re-run), audio encoder not closed (B1), `AudioData` not closed (B2), probe codecs not closed (B3), and two that prove the arithmetic guard can fail: the limiter's carried release state off by one sample at a block edge (C1), the sink applying patches out of arrival order (C2). Busters bumped: `exporter.js?v=127`.

**A trap I fell into, worth knowing:** a failed export deliberately KEEPS its saved render for crash-resume, and the next export with the same settings resumes from it. My first AU6-1 run failed its own setup because the previous failure's parts were still in the store, so the frame I injected a failure at was never reached. The test now clears `FM.exportResume` before each run. Anyone writing an export test that fails on purpose needs the same.

## Guards that found nothing (green on main, kept so they cannot rot): `AU6-3`

- **The mix limiter equals a plain two-pass reference** (8 random buffers of 70 to 150 thousand samples, mono and stereo, bursts placed across its 32,768-sample block edges), and the loudest output sample is 0.99500006, never over the 0.995 ceiling. The block carry (`rel`) is exactly right: a mutation one sample off is caught.
- **The streaming MP4 sink reproduces a dense reference buffer byte for byte** over 200 random write sequences (appends, zero-filled holes, patches wholly behind the end, patches straddling it).
- **`exportFitRect` always fits** (2,000 random sizes: inside the output, aspect kept to 1e-6).

## Measured and fine

`runFrames` and `runGif` (no spy needed): a 2 s, 10 fps project gives 20 PNGs named `_0000` to `_0019`, progress ends at 1; a Cancel on frame 5 gives `CANCELLED`, no download, `FM._exporting` and `FM._exportTransparent` false; a render that throws on frame 4 does the same; a GIF cancelled mid-way the same. The project time is untouched after every one of them.

## Read, not run (no claim stronger than that)

- A range with `to` before `from`, or `from` past the project's end, exports **one frame** rather than refusing (`totalFrames = max(1, …)`; measured on `runFrames`: it makes a one-frame zip at a time past the end). The dialog's `exportRange()` is where it should be stopped and I did not trace whether it always is.
- The crash-resume signature is computed with `audio: !!mix` BEFORE the soundtrack is encoded; if the encode then fails and `mix` is dropped, a later export of the same project signs `audio: false` and cannot resume this one. A missed resume, not a corrupt file (**Guess**: only for a project whose audio encode fails twice).
- `deliver()` and the `download()` revoke 4 s after the click are unchanged; `#1088` (audio-only download and revoke) is in P22.

## What I read, and how closely

Line by line: `exportFitRect`, `deliver`, `createMp4Sink`, `seekVideo`, `clipGeom`, `makeClipBuffer`, `srcSampleAt`, `exportSay`/`exportInfo`, `limitMix`, `pickVideoCodec`, `aacPriming`, `dropPriming`, `encodeAudio`, `encodeM4A`, the whole of `run()` from its start to its `finally` (1165 to 1650), `runGif`, `runFrames`.

**Not read closely, no claim either way:** `buildAudioMix` (477 to 865, about 390 lines: only its gain and limiter tail), `prepareCaches` (1018 to 1087), `holdVideoElements` / `seekAllVideos` beyond how they are called, and the ready-card report text.

## Neighbouring tests

A slice of the export-related titles (`916`, `669`, `215`, `AAC`, `muxer`, `export ready`, `limiter`; 24 tests) at 1280: **19 pass, 2 NOT RUN HERE, 5 red, and the five reds are identical on main** (I ran `215` on main and on the fix: the same 5 titles red, the same 4 green): they call `FM.exporter.run()` on a stock encoder and stop at `NO_VIDEO_CODEC` because this container has no H.264 (the queue-215 audio-warning tests, the "no AAC" test and the "soundtrack fails to encode" test). They need the laptop's pass. I tried the whole `xport` title slice first and stopped it by hand after 32 minutes without a result, so nothing wider than the slice above is claimed. Files: `au6_export_1280.txt`, `au6_export_main_215.txt`, `au6_export_fix_215.txt`.
