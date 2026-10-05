# Test coverage map and high-value gaps

## How the counts were estimated

`tests/tests.js` contains **2,265 statically named `test('…')` declarations** in this checkout; the suite also has dynamically generated checks, so this is not the runner's exact case count. The estimates below count names containing feature terms (for example `audio|sound|volume|mute`), not request tags. Categories intentionally overlap: a test named “export: audio…” appears in both. A title search undercounts tests whose names omit the feature and may overcount broad integration tests. The suite itself describes its scenes as synthetic and runs in the app page context (`tests/tests.js:1-8`: “Tests use SYNTHETIC scenes only — never personal media”). Its phone/desktop helpers change an iframe's width (`tests/tests.js:34-60` and `63-79`), not the actual device/browser/media stack.

| Feature | Rough named-test count |
|---|---:|
| Timeline editing, scrubbing, trim, keyframes | 284 |
| Effects and filters | 435 |
| Text and text editing | 86 |
| Captions/subtitles | 43 |
| Audio, sound, volume and mute | 136 |
| Export | 157 |
| Save/load/import/storage | 156 |
| Home and project cards | 163 |
| Templates | 23 |
| Collaboration | 23 |
| Phone/mobile/touch layout | 170 |
| PC/desktop layout | 104 |

These counts indicate a broad regression suite, not that each feature is under-tested. Before composing this list I searched the audit and request records. I excluded defects or missing behaviors already written there, including the previously reported project-save races, silent-export investigations, the frame-boundary seek defect, picker-cancel state, collaboration reconnect concerns and accessibility findings. The remaining items below are proposed **coverage additions** for unrecorded real-input/device combinations; they are not claims that the app currently fails them. “Impact” means the consequence if a regression escaped; confidence is my confidence that this particular test is a worthwhile uncovered boundary after title/source review.

## Highest-value 25 gaps

Every real-device outcome below is **UNVERIFIED**: no iPhone, external media library or OS share-sheet run was available for this report. These are proposed coverage checks, not claims that the behaviors fail.

1. **Import an iPhone portrait photo with EXIF orientation.** Severity if it regresses: medium; gap confidence: high. `js/app.js:5516` says `else if (kind === 'image') add(await FM.loadImageFile(file), file);`. Test outline: use a real portrait JPEG whose pixel dimensions are landscape but whose EXIF orientation rotates it; pick it from Photos on iOS, then verify the editor canvas, Home thumbnail, template replacement and exported still/video all show the same upright framing. The existing synthetic scenes do not exercise an OS-decoded photo.

2. **Import HEIC/HEIF from the iOS Photos picker.** Severity if it regresses: medium; gap confidence: high. `js/app.js:5516` routes recognized images into `FM.loadImageFile(file)`. Test outline: pick a HEIC photo and a HEIC Live Photo still on current iOS, verify the picker offers them, the image decodes, and the project survives a close/reopen. Record the actual MIME, extension and dimensions so a failure is attributable to the input route, not guessed from an unsupported fixture.

3. **HEVC video with HDR metadata through preview and export.** Severity if it regresses: high; gap confidence: high. `js/app.js:5516` uses `FM.loadVideoFile(file)` for video. Test outline: import one HDR iPhone HEVC clip, compare a frame in Photos, editor preview and exported MP4 on the same display, and check whether highlights clip or color shifts. Include an SDR control from the same phone and capture the source's `colorSpace`/codec metadata.

4. **Variable-frame-rate phone video keeps audio in sync.** Severity if it regresses: high; gap confidence: medium. `js/app.js:5516` starts the normal video import path; `js/media.js:10` stores both the video element and its `duration`. Test outline: use a long screen recording or phone clip with visibly variable timestamps and a clap/beep at the beginning and end; compare preview sync and export sync at start, middle and end. A constant-frame-rate synthetic fixture cannot reveal cumulative VFR drift.

5. **Multiple high-resolution clips do not exhaust mobile decoders.** Severity if it regresses: high; gap confidence: medium. `js/media.js:10` keeps `{ kind, el, width, height, duration, file, url, audioBuffer? }` records per layer. Test outline: on one supported iPhone, load a small stepped ladder of 4K clips in one project, play/scrub, then remove them and repeat; record when playback stalls or the tab reloads. This is a device-capacity boundary, not a proposed universal clip limit.

6. **Animated GIF import, seek and project reopen.** Severity if it regresses: medium; gap confidence: medium. `js/media.js:59` calls `closeAnim(rec)` when releasing decoded frames. Test outline: import a real multi-frame GIF with a known frame order, scrub forward/backward, export a short section, close/reopen, and compare frame order plus memory recovery after removal. This checks the browser's real GIF decoder alongside the app's cached-frame path.

7. **Transparent PNG alpha parity across canvases and export.** Severity if it regresses: medium; gap confidence: medium. `js/app.js:5516` routes still images to `FM.loadImageFile(file)`. Test outline: import a PNG with semi-transparent edge pixels over a colored background; compare editor preview, a scaled thumbnail and exported frame at 100% and reduced preview resolution. Check halos and premultiplication differences with a pixel sample.

8. **Very wide/tall still-image downscaling remains usable.** Severity if it regresses: medium; gap confidence: medium. `js/storage.js:1004-1010` uses `const ev = n => Math.max(16, Math.min(7680, Math.round((+n || 0) / 2) * 2));` to clamp project dimensions, while image loading happens through the ordinary `loadImageFile` path. Test outline: load a high-megapixel panorama and an unusually tall phone capture on a real phone; verify import completes, the image can be positioned, and the project reopens without tab reload. Capture intrinsic dimensions and whether the browser produced a decoded bitmap.

9. **Input file MIME/UTI combinations from real Files providers.** Severity if it regresses: medium; gap confidence: high. `js/addmenu.js:51` defines the audio picker list as `audio/*,video/*,.mp3,.m4a,.aac,.wav,.flac,.ogg,.oga,.opus,.aif,.aiff,.caf,.wma,.amr,.mp4,.mov,.m4v`. Test outline: choose one valid audio sample from iCloud Drive, “On My iPhone”, and a third-party cloud provider; record `file.type`, filename and resulting layer kind for each. Keep this distinct from the already recorded picker-cancel/accept-list bug: the target is actual provider metadata and successful decoding.

10. **Audio-only extraction from a real video file on iOS.** Severity if it regresses: medium; gap confidence: medium. `js/app.js:5508` calls `FM.loadVideoFile(wav)` after extracting audio from a selected video. Test outline: choose a phone-recorded MOV with speech, use Add → Audio, and compare the resulting waveform/playback start and end to the original MOV. Test one portrait and one longer clip; do not infer success solely from a synthetic WAV.

11. **Voice recording with the system permission denied, then granted.** Severity if it regresses: medium; gap confidence: high. `js/voice-rec.js:155-163` checks `navigator.mediaDevices.getUserMedia` and requests `{ audio: true }`. Test outline: on a real phone, deny microphone permission once, verify the sheet explains the state and no live mic indicator remains, then grant permission in Settings and record a short take without reloading. Existing mocked streams cannot prove the OS permission UX.

12. **Voice recording interrupted by a call or Siri.** Severity if it regresses: high; gap confidence: medium. `js/voice-rec.js:613` declares `function start() {` and `js/voice-rec.js:650` declares `function stop(note) {`. Test outline: begin a 20-second take, trigger a real incoming call/Siri interruption after five seconds, return to the app, and verify the partial take is either saved with its measured duration or clearly discarded with no stuck recording/mic state. Record the device/OS and actual MediaRecorder event sequence.

13. **Microphone route changes during a take.** Severity if it regresses: medium; gap confidence: medium. `js/voice-rec.js:163` obtains the stream from `getUserMedia({ audio: true })`. Test outline: start recording on the phone microphone, connect/disconnect a wired or Bluetooth headset, stop, then play the take and inspect duration/level. Check that the app does not silently create a zero-length clip or retain a dead stream.

14. **Input audio at 44.1 kHz and mono from real files remains stable after reload.** Severity if it regresses: medium; gap confidence: medium. `js/app.js:5519` sends audio inputs through `FM.loadVideoFile(file)`. Test outline: import a mono 44.1-kHz WAV and an AAC/M4A at a different rate, save/reopen, and compare duration/channel playback against the source. This is specifically a real decoder/resampler round trip; it does not re-test the already covered muxer's sample tables.

15. **A broken/unsupported audio file does not poison the rest of a multi-file import.** Severity if it regresses: medium; gap confidence: medium. `js/app.js:5519-5521` dispatches files with `else if (kind === 'audio') add(await FM.loadVideoFile(file), file);`. Test outline: select one valid song, one zero-byte/corrupt audio file and another valid song together from a phone picker; verify the valid files become layers, the bad file gets a clear result, and order remains understandable. The suite's valid synthetic buffers do not model platform decoder rejection.

16. **Project reopen after browser eviction/refusal on actual iOS storage.** Severity if it regresses: high; gap confidence: medium. `js/storage.js:330-332` contains `navigator.storage.persisted().then(p => { if (!p) return navigator.storage.persist(); }).catch(() => {});`. Test outline: on an iPhone installed PWA, import enough media to approach the device's storage warning threshold, background/relaunch, and confirm whether project documents and media remain together. Record quota/persistence API results. The general data-loss scenario is already tracked; this test is limited to real WebKit persistence behavior, not another save-race analysis.

17. **Cold launch immediately after changing app version with offline cache present.** Severity if it regresses: medium; gap confidence: medium. `js/app.js:1371-1380` reads the marker with `c.match('served-stale-shell')` and checks the network via `FM.latestBuild()`. Test outline: install the PWA, leave one version cached, deploy a new test build, launch once offline and again online, then verify the version notice is accurate and the page eventually loads the new shell. Existing helper tests do not prove a real service-worker lifecycle on iOS.

18. **Actual app suspension during active preview playback.** Severity if it regresses: medium; gap confidence: medium. The suite exercises audio nodes in-page (for example `tests/tests.js:26600` creates `new (window.AudioContext || window.webkitAudioContext)()`). Test outline: play a video with a soundtrack in the installed app, lock the phone for 30 seconds, resume, and verify transport, audio and video recover without an extra stale sound. The PWA review covers platform risk separately; this entry proposes a focused repeatable regression protocol.

19. **Device rotation while the editor is open and playing.** Severity if it regresses: medium; gap confidence: high. `js/fx-browser.js:102-104` delegates the orientation/viewport changes to `FM.screen.watch(again)`. Test outline: open the editor at phone width, select a layer and open the inspector, rotate portrait→landscape→portrait while playing and while paused; verify preview aspect, timeline width, selected layer and scroll position remain coherent.

20. **System text zoom at 200% does not hide project actions.** Severity if it regresses: medium; gap confidence: medium. `js/home.js:1988-1990` appends `el('div', 'hm-name', t.name || 'Template')` and `aspectLabel(t.width, t.height)`. Test outline: enable browser text scaling/zoom to 200%, inspect Home project/template cards, editor inspector and export-ready card; verify names, delete/save actions and warnings remain visible and reachable. This proposal is distinct from the accessibility audit's findings about current semantics/contrast.

21. **Template media replacement preserves timing for a shorter real clip.** Severity if it regresses: medium; gap confidence: medium. `js/template-fill.js:8-10` says media replacement keeps “transform, keyframes, timing, effects and masks”; `js/app.js:4671-4675` clamps the trim to the new source duration. Test outline: build a template slot with nonzero trim, speed keyframes, effects and mask, replace a long media file with a shorter one, and verify no frozen tail, lost mask or shifted animation in the preview and reopened project.

22. **Template file exchanged between two devices keeps embedded media and fonts.** Severity if it regresses: medium; gap confidence: medium. `js/home.js:2001-2004` offers “Save template file…” and says it can be sent to anyone. Test outline: export a template containing a small image/video plus a custom embedded font, transfer the resulting file to a second browser/device, import it and compare rendered text, media playback and editable slots. Same-device pack tests do not prove a true cross-device file/decoder round trip.

23. **Template aspect-ratio behavior on phone and PC.** Severity if it regresses: low; gap confidence: medium. `js/home.js:1990` displays `aspectLabel(t.width, t.height)`. Test outline: fill a 9:16 template with landscape footage, then a 16:9 template with portrait footage; check crop/fit in the fill preview and in the editor at both 390px and 1280px. The test should assert the chosen crop behavior rather than assume one.

24. **Long Home library with real thumbnail decode and scrolling.** Severity if it regresses: medium; gap confidence: medium. `js/home.js:1982-1985` uses `img.src = t.thumb` and appends `el('span', 'hm-dur', fmtDur(t.duration))`. Test outline: on a modest phone, create a library with hundreds of projects/templates and real thumbnails, scroll to the bottom, search, return to all, and verify the last card is reachable, thumbnail decode does not leave blank placeholders permanently, and memory stabilizes after repeated tab changes. Avoid turning this into an unbounded benchmark; record one before/after memory snapshot.

25. **Save/reopen parity for uncommon project frame rates and dimensions with media.** Severity if it regresses: medium; gap confidence: medium. `js/storage.js:1011-1017` sets `p.fps = Math.max(1, Math.min(120, Math.round(+p.fps) || 30));` and clamps `p.duration`. Test outline: make short projects at 24, 25, 48, 50, 60 and 120 fps with one real clip, save, close, reopen, and verify project settings, layer duration and playhead timebase are unchanged. Existing unit assertions for FPS do not necessarily exercise a browser media element at each setting.

