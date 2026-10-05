# Export failure and cancellation cleanup

Snapshot: `28104a3e83e01ac3880db3fac604a7444c7235aa`  
Branch: `chatgpt/failure-path-cleanup`

## Scope and method

I searched the existing audit JSON and `REQUESTS.md` first. The known video `VideoEncoder` / `VideoFrame` cleanup concern is already recorded under request #671 (REQUESTS.md:26753-26757): it was explicitly marked **not reproduced**, so I do not re-present it as a new finding. The slow-cancel-audio path (#916 / REQUESTS.md:32575-32577) is already addressed in this snapshot and is not repeated.

This report is a source-path audit, not a fault-injection or memory-profile run. Amount estimates are allocation sizes from code formulas, not retained-heap measurements.

## Findings

### 1. AudioEncoder and the in-flight AudioData are not closed when encode/configure/flush throws

**Confidence: high for the missing close path; medium for persistent browser memory.** `encodeAudio` calls `close()` only after its normal `flush()`; there is no `finally` guarding either the encoder or a just-created AudioData:

- `js/exporter.js:938-945`: constructs and configures `AudioEncoder`.
- `js/exporter.js:954-958`: allocates one planar `Float32Array`, constructs `AudioData`, then calls `enc.encode(ad); ad.close()`. If `encode` throws, that `AudioData.close()` is skipped.
- `js/exporter.js:961-963`: `enc.close()` is reached only when `flush()` resolves.
- The main MP4 caller catches AAC errors and continues video-only at `js/exporter.js:1352-1366` (the call/catch is after encoder setup); the local encoder variable has gone out of scope and the catcher cannot close it. The audio-only M4A catch at `js/exporter.js:1105-1111` likewise returns a failure result without an encoder handle.
- **Rough amount:** the submitted source buffer is one 1024-frame planar chunk, about `1024 × channels × 4` bytes (8 KiB at stereo), plus codec-internal state that WebCodecs does not expose. This recurs once per encode failure, not per successful export. It may be released by implementation cleanup/GC, but deterministic close is not established by these paths; no browser measurement was run.

This is the audio-side analogue of the already-recorded #671 video cleanup note; the request log describes video only, so this finding is limited to the separately implemented AudioEncoder path.

### 2. AAC priming probe leaks its probe encoder/decoder on exceptional exits

**Confidence: high for missing explicit close on throw; low-medium for persistent memory.** The priming probe is best-effort and returns 0 from its catch, but it does not close whichever codec object exists when a configure/encode/decode/flush call throws:

- `js/exporter.js:866-903`: `aacPriming` creates an `AudioEncoder` at `892` and closes it only after successful `flush` (`896); creates an `AudioDecoder` at `897) and closes it only after successful decoder flush (`900)); the outer catch at `903` returns 0.
- A throwing encoder encode can also skip `ad.close()` at `889-890`; a decoder-output callback does use `finally { ad.close(); }` at `897), which is the protected path.
- **Rough amount:** the probe submits 12 × 1024 stereo frames: about 96 KiB of planar PCM data total (plus encoded probe chunks and codec state); the two-click `heard` accumulation is about 96 KiB for decoded stereo? The code copies only plane 0 into each output array, so the actually retained decoded samples are roughly 48 KiB for that mono plane, plus chunk overhead. Each failed first probe per encoder-config can leave this transient payload/codec state pending until implementation cleanup. Exact retained bytes are not observable from this code; no fault injection or heap profile was run.
- The probe is cached by encoder constructor/configuration only after it succeeds, so a repeatedly failing device could revisit this branch on subsequent exports (`js/exporter.js:872-876`).

### 3. Offline audio graph disposal is skipped if offline rendering rejects

**Confidence: high for the control flow; medium for user-visible memory retention.** The OfflineAudioContext graph disposers run after successful rendering, but not in a `finally`:

- `js/exporter.js:483-488`: constructs the offline context and accumulates effect-chain disposers in `chains`.
- `js/exporter.js:775-776`: `startRendering()` is awaited before `chains.forEach(c => c.dispose())`; rejection skips the disposal line.
- The outer MP4 export catches any mix exception and deliberately continues without a mix (`js/exporter.js:1276-1283`). No code on that catch path retains or disposes the chain list, which is local to `buildAudioMix`.
- **Rough amount:** the offline rendered PCM itself is `ceil(duration × 48000) × 2 × 4` bytes (about 23 MB/minute, 92 MB for four minutes), plus per-clip buffers/graph nodes. If `startRendering` rejects, these objects become eligible for GC only after the async function unwinds; no explicit OfflineAudioContext close API is used here. Whether the browser retains native graph memory after rejection is not measurable from source; no heap/native-memory profile was run.

### 4. Export MessageChannel and pending tick queue have no teardown

**Confidence: medium; low expected impact per failure.** The module creates one long-lived channel at load and its queued promises are resolved only when `port1.onmessage` runs:

- `js/exporter.js:1000-1005`: one `MessageChannel` is created and `nextTick` appends a resolver to `_tickQ), then posts to the second port. There is no `close()` or queue reset in the export `finally`.
- Normal/cancel frame-loop awaits yield and drain the queue. If an export exits between `nextTick` queueing and delivery because the document is suspended/discarded, one pending resolver can remain until the channel event runs or the page is destroyed. The channel itself is intentionally module-lifetime; it is not created per export, so this is not one leaked worker/channel per failure.
- **Rough amount:** one pending resolver closure per queued tick (normally one per frame-loop iteration); each retains its promise chain/locals until delivery. No repeated-export accumulation was observed or measured.

## Resources that have explicit cleanup on ordinary paths

- Video elements held for export are released in the outer `finally` at `js/exporter.js:1628-1633`; export frame caches are also cleared there. These protections apply to cancellation and thrown errors reaching that `finally`.
- Each successfully encoded video frame is closed immediately after `encoder.encode` at `js/exporter.js:1494-1498`; the separately logged #671 error-path caveat is excluded above.
- Download object URLs are revoked after 4 seconds at `js/exporter.js:47-53`; project-file download does the same at `js/storage.js:1794-1800`. The MP4 URL is created only in `deliver` after rendering, so cancellation before delivery creates none.
- I found no `new Worker` / `Worker.terminate()` lifecycle in `js/exporter.js`, `js/export-resume.js`, `js/audio-tools.js`, or `js/audio-play.js`; these paths use a module-lifetime `MessageChannel`, not a Web Worker.
- Crash-resume's recorder is stopped from the outer cleanup at `js/exporter.js:1628-1633`; its part buffers are IndexedDB data rather than live workers/URLs.

## Measurement to confirm

Inject one failure at a time in a disposable browser harness: make AudioEncoder.configure throw; make encode throw after one AudioData is created; reject flush; make AudioDecoder.configure/decode throw during priming; and reject OfflineAudioContext.startRendering. Count `close()` calls on instrumented fake codec instances and `AudioData`; then compare browser heap/native media memory after repeated attempts. This was not run, so no persistent leak size is claimed.

