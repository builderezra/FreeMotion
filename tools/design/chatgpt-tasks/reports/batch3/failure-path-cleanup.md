# Export failure and cancellation cleanup

Snapshot: `28104a3e83e01ac3880db3fac604a7444c7235aa`  
Branch: `chatgpt/failure-path-cleanup`

## Scope and method

I searched `REQUESTS.md` and `audits/*.json` first. The VideoEncoder/VideoFrame failure cleanup concern is already recorded under #671 (`REQUESTS.md:26753-26757`) and expressly marked unverified, so I do not repeat it as a new finding. The cancellation delay during audio encode (#916, `REQUESTS.md:32575-32577`) is already addressed. This is a source-path review, not fault injection or a heap profile. Byte estimates use allocation formulas and do not prove retained heap.

## Findings

### AudioEncoder and the current AudioData miss deterministic close on exceptional exits

**Confidence: high for missing close; medium for persistence.**

- `js/exporter.js:938-945` constructs/configures `AudioEncoder`.
- `js/exporter.js:954-958` creates the planar buffer and `AudioData`, then executes `enc.encode(ad); ad.close()`. If `encode` throws, `ad.close()` is skipped.
- `js/exporter.js:961-963` calls `enc.close()` only after successful `flush()`; no finally owns the encoder.
- Export caller catches a failed audio encode and continues without sound (`js/exporter.js:1352-1366`); the local encoder reference is inaccessible there. M4A similarly catches and returns failure (`1105-1111`).
- Rough amount per failure: one 1024-frame stereo Float32 input is about 8 KiB, plus inaccessible codec state. This is not a per-success leak. Browser implementation cleanup/GC may reclaim it; no runtime retention was measured.

This is separate from the already logged video codec caveat (#671): only the audio-side close path is described here.

### AAC priming probe codecs are not closed if an operation throws

**Confidence: high for the control flow; low-medium for lasting memory.**

- `js/exporter.js:866-903` creates a probe AudioEncoder and AudioDecoder. Each `.close()` is after successful flush (`896`, `900`); the catch at `903` returns zero without closing the object that failed.
- In the probe encode loop, a thrown `enc.encode(ad)` can also bypass `ad.close()` (`889-890`). Decoder output does have a `finally { ad.close(); }` path at `897`.
- The probe feeds 12×1024 stereo frames: about 96 KiB input PCM, plus encoded chunks and codec state. It only caches a result after success (`872-876`), so a repeated failing device may hit the exceptional path on each export. Exact retained memory is UNVERIFIED; no failure injection/heap run was done.

### Offline audio graph disposers are skipped when offline rendering rejects

**Confidence: high for control flow, medium for retained native memory.**

- `js/exporter.js:483-488` creates OfflineAudioContext and a local `chains` array of effect-chain disposers.
- `js/exporter.js:775-776` awaits `oac.startRendering()` before calling `chains.forEach(c => c.dispose())`; a rejection skips disposal.
- The caller catches a mixer error and continues video-only (`js/exporter.js:1276-1283`), but cannot access the local chains or context.
- Rough PCM allocation is `ceil(duration×48000)×2×4` bytes: ~23 MB/minute, ~92 MB for four minutes, plus per-clip buffers and graph nodes. The async function unwinds so JS objects can be garbage-collected; whether a browser retains native graph memory after rejection is UNVERIFIED. OfflineAudioContext has no explicit close call in this path.

### MessageChannel has no per-export teardown, but it is module-lifetime

**Confidence: medium; low expected impact.**

- `js/exporter.js:1000-1005` creates one channel at module load and queues each nextTick resolver in `_tickQ`; no export-finally closes the ports or clears the queue.
- Normal frame-loop awaits drain one queued tick at a time. If the document is suspended/discarded while a resolver is queued, its promise chain can remain pending until message delivery or page destruction. It is one shared channel, not one per export, so this is not cumulative channel creation per failed job.
- Rough impact: one queued resolver closure per pending tick. No repeated-export accumulation was measured.

## Cleanup paths found

- The outer exporter finally clears full-resolution caches and releases held video elements for success/cancel/error reaching that block (`js/exporter.js:1628-1633`).
- A successfully submitted video frame is closed immediately after `encoder.encode` (`1494-1498`); the separately recorded #671 exceptional cleanup concern is excluded above.
- Download URLs are revoked after four seconds (`js/exporter.js:47-53`); MP4 delivery URLs are created only after rendering.
- No `new Worker` appears in `exporter.js`, `export-resume.js`, `audio-tools.js`, or `audio-play.js`; the exporter uses the shared MessageChannel instead.
- Crash-resume parts are stored in IndexedDB; recorder shutdown is in the export finally (`1628-1633`).

## How to confirm

In a disposable browser harness, throw from AudioEncoder.configure, encode after creating AudioData, AudioEncoder.flush, AudioDecoder.decode, and OfflineAudioContext.startRendering. Count codec `close()` and AudioData `close()` calls, then compare browser heap/native media memory over repeated attempts. Not executed here; persistent leak quantities are not claimed.


### Karaoke processing rejection has no explicit OfflineAudioContext teardown

**UNVERIFIED as a persistent leak; high confidence that the failure path has no explicit teardown.**

- `js/audio-tools.js:70-92` creates an `OfflineAudioContext`, source, splitter, and gain/filter graph; it returns only after `octx.startRendering()` resolves. If that promise rejects, `js/audio-tools.js:161-162` catches it and reports “Could not process this audio”, but `vocalRemovedBuffer` has no `finally` that disconnects the nodes or otherwise releases the context.
- Trigger: use Audio → Remove vocals on a long stereo clip, with OfflineAudioContext rendering made to fail (for example, a device memory failure). The app reports the processing error; the code does not explicitly tear down the local graph. The UI busy flag is cleared separately in a `finally` (`js/audio-tools.js:204-207`).
- A four-minute stereo float PCM output at 48 kHz would be roughly `4 × 60 × 48000 × 2 × 4 = 92,160,000` bytes (~88 MiB; about 92 MB decimal), plus the source buffer and graph nodes. This is an allocation estimate from sample format and duration, not an observed retained amount. Since the context and nodes are local and no persistent reference is evident, garbage collection may release them after rejection; persistent native-memory retention is UNVERIFIED. The input AudioBuffer may already be cached by design (`js/audio-tools.js:20-29`).
- Focused skip check: the related REQUESTS/audit search found no entry specifically recording failed karaoke OfflineAudioContext teardown; existing karaoke items discuss re-entry/busy state, not this failure cleanup behavior.
